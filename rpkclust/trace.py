"""
Read-only tracing and diagnostics for the RPKClust pipeline (Pipeline Tracker).

This module NEVER changes algorithm output. It calls the existing detector /
constraint functions and recomputes only per-message decorations. Where the
spec says "mirror the implementation", the code below mirrors what
rpkclust/ actually computes (not the paper).

Public API:
    build_overview(capture, meta, config) -> dict     # pipeline_trace response
    build_message_trace(capture, message_id, config) -> dict  # message_trace
    health_checks(capture, meta, config) -> list[dict]
    consistency_check(capture, config) -> dict
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import pickle
import random
import struct
import tempfile
import zlib
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from rpkclust.config import Config
from rpkclust.model import (
    BoundaryResult, Candidate, Hit, KeywordResult, Message, Pair,
    PipelineCapture, ScoredCandidate, Stage1Result, Trace,
)
from rpkclust.detectors.base import Context, Detector
from rpkclust.detectors.registry import BOUNDARY_RULES, EXTRA_RULES
from rpkclust.detectors.checksum import (
    calc_crc8, calc_crc16_ccitt, calc_crc16_dnp, calc_crc16_modbus,
    calc_crc32, calc_sum8, calc_xor8,
)
from rpkclust.constraints.stage1 import (
    compute_eer, compute_pairwise_similarity, evaluate_stage1,
)
from rpkclust.constraints.stage2 import (
    compute_bit_use_prob, compute_position_prob,
)
from rpkclust.constraints.posterior import compute_star_posterior
from rpkclust.candidates.for_region import is_continuous

# Cap for the dataset-level rule matrix (spec 3.3).
MAX_OFFSETS = 300
# Cap for per-message byte arrays (spec 3.8).
MAX_BYTES = 512
# Cap for tolerance-rule blocking re-checks (spec 3.4).
BLOCKING_MSG_CAP = 50

_ALL_DETECTORS: List[Detector] = BOUNDARY_RULES + EXTRA_RULES
_DETECTOR_BY_NAME: Dict[str, Detector] = {d.name: d for d in _ALL_DETECTORS}
_DETECTOR_ORDER: Dict[str, int] = {d.name: i for i, d in enumerate(_ALL_DETECTORS)}


# ---------------------------------------------------------------------------
# JSON safety (spec 0.5)
# ---------------------------------------------------------------------------

def _jsonify(obj: Any) -> Any:
    """bytes -> lowercase hex, NaN/Infinity -> None, tuples -> lists,
    bytes/None dict keys -> hex string / '__none__'."""
    if obj is None or isinstance(obj, (bool, int, str)):
        return obj
    if isinstance(obj, float):
        return obj if math.isfinite(obj) else None
    if isinstance(obj, bytes):
        return obj.hex()
    if isinstance(obj, dict):
        out: Dict[Any, Any] = {}
        for k, v in obj.items():
            if isinstance(k, bytes):
                k = k.hex() if k else "__none__"
            elif k is None:
                k = "__none__"
            out[k] = _jsonify(v)
        return out
    if isinstance(obj, (list, tuple)):
        return [_jsonify(v) for v in obj]
    return obj


def _config_fingerprint(config: Config) -> str:
    return hashlib.sha1(config.to_json().encode("utf-8")).hexdigest()[:8]


def _config_nondefault(config: Config) -> Dict[str, Any]:
    defaults = Config()
    out: Dict[str, Any] = {}
    for field in config.to_dict():
        cur = getattr(config, field)
        dflt = getattr(defaults, field)
        if cur != dflt:
            out[field] = _jsonify(cur)
    return out


# ---------------------------------------------------------------------------
# Dataset-level rule matrix (spec 3.3) + per-message satisfaction (spec 3.4)
# ---------------------------------------------------------------------------

def _ok_constant(slices, target_msgs, ctx, config, precomp=None):
    counts = Counter(slices)
    modal, modal_count = counts.most_common(1)[0]
    msg_ok = [s == modal for s in slices]
    detail = (f"constant: {len(counts)} distinct values, "
              f"modal {modal.hex()} share {modal_count}/{len(slices)}")
    return msg_ok, detail, {"modal": modal.hex(), "distinct": len(counts),
                            "modal_share": modal_count}


def _ok_sequence(slices, target_msgs, ctx, config, precomp=None):
    if len(slices) < 3:
        return [None] * len(slices), "sequence: fewer than 3 messages", {}
    k = len(slices[0])
    order = sorted(range(len(target_msgs)), key=lambda i: target_msgs[i].ts)
    best = None  # (step_count, endian, step, vals)
    for endian in ("big", "little"):
        vals = [int.from_bytes(slices[i], endian) for i in order]
        diffs = [vals[i + 1] - vals[i] for i in range(len(vals) - 1)]
        if not diffs:
            continue
        step_counts = Counter(diffs)
        step, step_count = step_counts.most_common(1)[0]
        if best is None or step_count > best[0]:
            best = (step_count, endian, step, vals)
    if best is None:
        return [None] * len(slices), "sequence: no consecutive diffs", {}
    _step_count, endian, step, vals = best
    msg_ok = [None] * len(slices)
    for pos, idx in enumerate(order):
        msg_ok[idx] = True if pos == 0 else (vals[pos] - vals[pos - 1]) == step
    detail = (f"sequence: modal step={step} ({endian}), "
              f"{best[0]}/{len(vals) - 1} diffs at modal step")
    return msg_ok, detail, {"step": step, "endian": endian}


def _ok_timestamp(slices, target_msgs, ctx, config, precomp=None):
    t_start, t_end = ctx.capture_range
    if t_end <= 0:
        ts_list = [m.ts for m in ctx.messages if m.ts > 0]
        if ts_list:
            t_start, t_end = min(ts_list), max(ts_list)
        else:
            return [None] * len(slices), "timestamp: no capture range", {}
    delta = config.timestamp_slack_s
    wmin = t_start - delta
    wmax = t_end + delta
    k = len(slices[0])
    msg_ok = []
    for s in slices:
        v = int.from_bytes(s, "big", signed=False)
        vl = int.from_bytes(s, "little", signed=False)
        if k == 4:
            good = (wmin <= v <= wmax) or (wmin <= vl <= wmax)
        elif k == 8:
            good = ((wmin * 1000 <= v <= wmax * 1000)
                    or (wmin * 1000 <= vl <= wmax * 1000)
                    or (wmin <= v <= wmax) or (wmin <= vl <= wmax))
        else:
            good = None
        msg_ok.append(good)
    detail = f"timestamp: window [{wmin:.0f}, {wmax:.0f}] (slack {delta:.0f}s)"
    return msg_ok, detail, {"window_min": wmin, "window_max": wmax}


def _ok_sparse(slices, target_msgs, ctx, config, precomp=None):
    k = len(slices[0])
    zero = b"\x00" * k
    unique_vals = set(slices)
    n = len(slices)
    zero_count = sum(1 for s in slices if s == zero)
    if k == 1:
        size_ok = len(unique_vals) <= 5
    elif k == 2:
        size_ok = len(unique_vals) <= 10 and len(unique_vals) <= 0.15 * n
    else:
        size_ok = True
    ratio = len(unique_vals) / (2 ** (8 * k))
    ratio_ok = ratio <= config.sparse_ratio
    msg_ok = []
    for s in slices:
        if s == zero:
            msg_ok.append(False)
        elif not (size_ok and ratio_ok):
            msg_ok.append(None)
        else:
            msg_ok.append(True)
    detail = (f"sparse: unique={len(unique_vals)}/{2 ** (8 * k)} "
              f"ratio={ratio:.4f} zero present in {zero_count} msgs "
              f"({100.0 * zero_count / n:.1f}%)")
    return msg_ok, detail, {"unique": len(unique_vals), "ratio": ratio,
                            "zero_count": zero_count}


def _build_checksum_table(
    target_msgs: List[Message], limit: int
) -> Optional[Dict[str, Any]]:
    """Precomputed running checksum values (spec 3.3 numpy vectorization).

    For every algorithm the checksum detector tries, a (n, limit) array
    whose column j holds algo(m.data[:j + 1]) for every message. The
    values are identical to the detector's calc_* functions; only the
    computation is vectorized across messages. Returns None when the
    table cannot be built (empty set or a message shorter than limit);
    _ok_checksum then falls back to the direct computation.
    """
    n = len(target_msgs)
    if n == 0 or limit <= 0:
        return None
    if any(len(m.data) < limit for m in target_msgs):
        return None
    data = np.zeros((n, limit), dtype=np.uint8)
    for i, m in enumerate(target_msgs):
        data[i] = np.frombuffer(m.data[:limit], dtype=np.uint8)

    table: Dict[str, Any] = {}
    table["xor8"] = np.bitwise_xor.accumulate(data, axis=1)
    table["sum8"] = (np.cumsum(data, axis=1) & 0xFF).astype(np.uint8)

    # crc8: poly 0x07, MSB-first, init 0x00
    crc = np.zeros(n, dtype=np.uint16)
    out = np.zeros((n, limit), dtype=np.uint8)
    for j in range(limit):
        crc ^= data[:, j]
        for _ in range(8):
            crc = np.where(crc & 0x80, ((crc << 1) ^ 0x07) & 0xFF,
                           (crc << 1) & 0xFF)
        out[:, j] = crc
    table["crc8"] = out

    # crc16-modbus: poly 0xA001, LSB-first, init 0xFFFF
    crc = np.full(n, 0xFFFF, dtype=np.uint16)
    out = np.zeros((n, limit), dtype=np.uint16)
    for j in range(limit):
        crc ^= data[:, j]
        for _ in range(8):
            crc = np.where(crc & 1, (crc >> 1) ^ 0xA001, crc >> 1)
        out[:, j] = crc
    table["crc16-modbus"] = out

    # crc16-ccitt: poly 0x1021, MSB-first, init 0xFFFF
    crc = np.full(n, 0xFFFF, dtype=np.uint32)
    out = np.zeros((n, limit), dtype=np.uint16)
    for j in range(limit):
        crc ^= data[:, j].astype(np.uint32) << 8
        for _ in range(8):
            crc = np.where(crc & 0x8000, ((crc << 1) ^ 0x1021) & 0xFFFF,
                           (crc << 1) & 0xFFFF)
        out[:, j] = crc
    table["crc16-ccitt"] = out

    # crc16-dnp: poly 0xA6BC, LSB-first, init 0x0000, final inversion
    crc = np.zeros(n, dtype=np.uint16)
    out = np.zeros((n, limit), dtype=np.uint16)
    for j in range(limit):
        crc ^= data[:, j]
        for _ in range(8):
            crc = np.where(crc & 1, (crc >> 1) ^ 0xA6BC, crc >> 1)
        out[:, j] = (~crc) & 0xFFFF
    table["crc16-dnp"] = out

    # crc32: zlib (C speed), incremental per message
    out = np.zeros((n, limit), dtype=np.uint32)
    for i, m in enumerate(target_msgs):
        crc = 0
        row = m.data[:limit]
        for j in range(limit):
            crc = zlib.crc32(row[j:j + 1], crc) & 0xFFFFFFFF
            out[i, j] = crc
    table["crc32"] = out
    return table


def _ok_checksum(slices, target_msgs, ctx, config, precomp=None):
    k = len(slices[0])
    offset = ctx.offset
    if offset == 0:
        return [None] * len(slices), "checksum: no data before offset 0", {}
    if k == 1:
        algo_names = ["xor8", "sum8", "crc8"]
        endians = ("big",)
    elif k == 2:
        algo_names = ["crc16-modbus", "crc16-ccitt", "crc16-dnp"]
        endians = ("little", "big")
    elif k == 4:
        algo_names = ["crc32"]
        endians = ("little", "big")
    else:
        return [None] * len(slices), "checksum: unsupported length", {}

    n = len(slices)
    table = (precomp or {}).get("checksum_table")
    counts: Counter = Counter()
    if (table is not None and n > 0
            and all(len(m.data) >= offset for m in target_msgs)):
        # Vectorized path: compare the precomputed running values
        # (column offset-1) against the slice values.
        joined = b"".join(slices)
        if k == 1:
            slice_vals = {"big": np.frombuffer(joined, dtype=np.uint8)}
        elif k == 2:
            slice_vals = {"little": np.frombuffer(joined, dtype="<u2"),
                          "big": np.frombuffer(joined, dtype=">u2")}
        else:
            slice_vals = {"little": np.frombuffer(joined, dtype="<u4"),
                          "big": np.frombuffer(joined, dtype=">u4")}
        col = offset - 1
        order: List[Tuple[str, str, np.ndarray]] = []
        for algo_name in algo_names:
            vals = table[algo_name][:, col]
            for endian in endians:
                order.append((algo_name, endian, vals == slice_vals[endian]))
        # First matching (algo, endian) per message, mirroring the
        # detector's break-on-first-match counting order.
        first = np.full(n, -1, dtype=np.int64)
        for idx, (_an, _en, matches) in enumerate(order):
            newly = matches & (first == -1)
            first[newly] = idx
        # Count in message order so Counter insertion order (and
        # therefore most_common tie-breaking) matches the fallback.
        keys = [(an, en) for an, en, _m in order]
        for i in range(n):
            idx = int(first[i])
            if idx >= 0:
                counts[keys[idx]] += 1
        msg_ok = [bool(v) for v in (first >= 0)]
    else:
        # Direct computation (fallback): identical to the detector's
        # per-message evaluation, without early exit.
        if k == 1:
            algos = [("xor8", calc_xor8), ("sum8", calc_sum8),
                     ("crc8", calc_crc8)]
        elif k == 2:
            algos = [("crc16-modbus", calc_crc16_modbus),
                     ("crc16-ccitt", calc_crc16_ccitt),
                     ("crc16-dnp", calc_crc16_dnp)]
        else:
            algos = [("crc32", calc_crc32)]
        msg_ok = []
        for m, s in zip(target_msgs, slices):
            data_slice = m.data[:offset]
            good = False
            if data_slice:
                for algo_name, algo_fn in algos:
                    for endian in endians:
                        if algo_fn(data_slice) == int.from_bytes(s, endian):
                            good = True
                            counts[(algo_name, endian)] += 1
                            break
                    if good:
                        break
            msg_ok.append(good)
    if counts:
        (algo_name, endian), cnt = counts.most_common(1)[0]
        detail = (f"checksum: {algo_name} over [0:{offset}] ({endian}) "
                  f"matches {cnt}/{len(slices)}")
        info = {"algo": algo_name, "range": f"[0:{offset}]",
                "endian": endian}
    else:
        detail = f"checksum: no algorithm matches over [0:{offset}]"
        info = {}
    return msg_ok, detail, info


def _ok_address(slices, target_msgs, ctx, config, precomp=None):
    if not ctx.pairs or len(ctx.pairs) < 3:
        return [None] * len(slices), "address: fewer than 3 pairs", {}
    w = len(slices[0])
    offset = ctx.offset
    msg_by_id = {m.id: m for m in ctx.messages}
    min_len = min(len(m.data) for m in ctx.messages)
    if offset + 2 * w > min_len:
        return [None] * len(slices), "address: offset+2w exceeds min_len", {}
    pair_of: Dict[int, int] = {}
    for p in ctx.pairs:
        pair_of[p.req_id] = p.resp_id
        pair_of[p.resp_id] = p.req_id
    msg_ok = []
    n_swap = 0
    for m, _s in zip(target_msgs, slices):
        partner = msg_by_id.get(pair_of.get(m.id, -1))
        if (partner is None or len(partner.data) < offset + 2 * w
                or len(m.data) < offset + 2 * w):
            msg_ok.append(None)
            continue
        s1 = m.data[offset:offset + w]
        s2 = m.data[offset + w:offset + 2 * w]
        p1 = partner.data[offset:offset + w]
        p2 = partner.data[offset + w:offset + 2 * w]
        good = (s1 == p2 and s2 == p1)
        msg_ok.append(good)
        if good:
            n_swap += 1
    detail = f"address: swap relation holds for {n_swap}/{len(target_msgs)} messages"
    return msg_ok, detail, {"swaps": n_swap}


def _ok_float(slices, target_msgs, ctx, config, precomp=None):
    if not config.enable_float:
        return [None] * len(slices), "float: disabled in config", {}
    k = len(slices[0])
    fmt_base = "f" if k == 4 else "d"
    msg_ok = []
    n_plausible = 0
    for s in slices:
        good = False
        for endian in ("big", "little"):
            fmt = (">" if endian == "big" else "<") + fmt_base
            try:
                val = struct.unpack(fmt, s)[0]
            except Exception:
                continue
            if math.isnan(val) or math.isinf(val):
                continue
            if val != 0.0 and (abs(val) < 1e-6 or abs(val) > 1e9):
                continue
            good = True
            break
        msg_ok.append(good)
        if good:
            n_plausible += 1
    detail = f"float: {n_plausible}/{len(slices)} plausible IEEE-754 values"
    return msg_ok, detail, {"plausible": n_plausible}


def _ok_length(slices, target_msgs, ctx, config, precomp=None):
    if not config.enable_length:
        return [None] * len(slices), "length: disabled in config", {}
    msg_lengths = [len(m.data) for m in ctx.messages]
    if len(set(msg_lengths)) < 2:
        return [None] * len(slices), "length: uniform message lengths", {}
    k = len(slices[0])
    offset = ctx.offset
    max_len = getattr(ctx.config, "max_message_len", 500)
    best = None  # (match_count, endian, variant, c, usable_idx)
    for endian in ("big", "little"):
        vals = [int.from_bytes(s, endian) for s in slices]
        usable_idx = [i for i, L in enumerate(msg_lengths) if L < max_len]
        if len(usable_idx) < 10:
            continue
        for variant, adj in (("total_len", 0), ("remaining_len", offset)):
            cs = [(msg_lengths[i] - adj) - vals[i] for i in usable_idx]
            cnt = Counter(cs)
            c, n = cnt.most_common(1)[0]
            if best is None or n > best[0]:
                best = (n, endian, variant, c, usable_idx)
    if best is None:
        return [None] * len(slices), "length: fewer than 10 usable messages", {}
    n, endian, variant, c, usable_idx = best
    if not (-32 <= c <= 32):
        return [None] * len(slices), f"length: modal c={c} outside [-32, 32]", {}
    vals = [int.from_bytes(s, endian) for s in slices]
    adj = 0 if variant == "total_len" else offset
    msg_ok = [None] * len(slices)
    for i in range(len(slices)):
        ci = (msg_lengths[i] - adj) - vals[i]
        msg_ok[i] = (ci == c)
    detail = (f"length: c={c} ({variant}, {endian}), "
              f"{n}/{len(usable_idx)} msgs at modal c")
    return msg_ok, detail, {"c": c, "variant": variant, "endian": endian}


_RULE_OK_FNS = {
    "constant": _ok_constant,
    "sequence": _ok_sequence,
    "timestamp": _ok_timestamp,
    "sparse": _ok_sparse,
    "address": _ok_address,
    "checksum": _ok_checksum,
    "float": _ok_float,
    "length": _ok_length,
}


def _rule_matrix(
    target_msgs: List[Message],
    config: Config,
    pairs: List[Pair],
    capture_range: Tuple[float, float],
    min_len: int,
    max_offsets: int = MAX_OFFSETS,
) -> List[Dict[str, Any]]:
    """Dataset-level rule evaluation (spec 3.3).

    For every offset o < min(min_len, max_offsets), every rule in
    BOUNDARY_RULES + EXTRA_RULES and every length l in rule.lengths with
    o + l <= min_len: call the real detector check() with the same Context
    the pipeline uses (source of truth for `fires`), plus the per-message
    satisfaction share (fraction_ok) and a detail string.
    """
    limit = min(min_len, max_offsets)
    entries: List[Dict[str, Any]] = []
    checksum_table = _build_checksum_table(target_msgs, limit)
    precomp = {"checksum_table": checksum_table}
    for offset in range(limit):
        ctx = Context(
            messages=target_msgs,
            offset=offset,
            capture_range=capture_range,
            pairs=pairs,
            config=config,
        )
        for det in _ALL_DETECTORS:
            for l in det.lengths:
                if offset + l > min_len:
                    continue
                slices = [m.data[offset:offset + l] for m in target_msgs]
                hit = det.check(slices, ctx)
                fires = hit is not None
                ok_fn = _RULE_OK_FNS.get(det.name)
                if ok_fn is not None:
                    msg_ok, detail, info = ok_fn(slices, target_msgs, ctx, config, precomp)
                else:
                    msg_ok, detail, info = [None] * len(slices), "", {}
                n_ok = sum(1 for v in msg_ok if v is True)
                fraction_ok = (n_ok / len(msg_ok)) if msg_ok else 0.0
                entries.append({
                    "rule": det.name,
                    "offset": offset,
                    "length": l,
                    "fires": fires,
                    "msg_ok": msg_ok,
                    "fraction_ok": fraction_ok,
                    "detail": detail,
                    "info": dict(hit.info) if hit is not None else {},
                })
    return entries


def _blocking_for(entry: Dict[str, Any], msg_index: int,
                  target_msgs: List[Message], config: Config) -> Optional[bool]:
    """Blocking for one message (spec 3.4).

    blocking = true means "this message is (one of) the reason(s) the rule
    does not fire at the dataset level". Sole-violator rules: blocking only
    when violators == {m}. Tolerance rules (sparse, length): blocking when
    removing m flips `fires` (re-check on the reduced slice list, capped at
    BLOCKING_MSG_CAP messages).
    """
    if entry["fires"]:
        return False
    if entry["msg_ok"][msg_index] is not False:
        return False
    rule = entry["rule"]
    if rule in ("sparse", "length"):
        if len(target_msgs) > BLOCKING_MSG_CAP:
            return None
        reduced_msgs = [m for i, m in enumerate(target_msgs) if i != msg_index]
        offset, l = entry["offset"], entry["length"]
        slices = [m.data[offset:offset + l] for m in reduced_msgs]
        ctx = Context(
            messages=reduced_msgs,
            offset=offset,
            capture_range=(
                min((m.ts for m in reduced_msgs), default=0.0),
                max((m.ts for m in reduced_msgs), default=0.0),
            ),
            pairs=[p for p in []],
            config=config,
        )
        det = _DETECTOR_BY_NAME.get(rule)
        if det is None:
            return None
        return det.check(slices, ctx) is not None
    violators = [i for i, v in enumerate(entry["msg_ok"]) if v is False]
    return len(violators) == 1


# ---------------------------------------------------------------------------
# Stage-1 mirror (spec 3.7 consistency check + raw values)
# ---------------------------------------------------------------------------

def _mirror_stage1(
    messages: List[Message],
    candidates: List[Candidate],
    boundary_b: int,
    config: Config,
    pairs: List[Pair],
    direction: str,
) -> List[Dict[str, Any]]:
    """Faithful read-only mirror of evaluate_stage1 (rpkclust/constraints/stage1.py).

    Used ONLY for the consistency check and for displaying raw
    (pre-normalization) values. Never called by the pipeline itself.
    Returns one row dict per candidate, ranked exactly like evaluate_stage1.
    """
    if pairs is None:
        pairs = []
    target_msgs = ([m for m in messages if m.direction == direction]
                   if direction in ("c2s", "s2c") else messages)
    if not target_msgs or not candidates:
        return []

    rng = random.Random(config.seed)
    n_msgs = len(target_msgs)
    sample_indices = list(range(n_msgs))
    if n_msgs > config.sim_sample_size:
        sample_indices = rng.sample(sample_indices, config.sim_sample_size)
    sample_msgs = [target_msgs[i] for i in sample_indices]

    sim_matrix = [[0.0] * len(sample_msgs) for _ in range(len(sample_msgs))]
    for i in range(len(sample_msgs)):
        sim_matrix[i][i] = 1.0
        for j in range(i + 1, len(sample_msgs)):
            s = compute_pairwise_similarity(sample_msgs[i], sample_msgs[j], boundary_b)
            sim_matrix[i][j] = s
            sim_matrix[j][i] = s

    req_to_resp = {p.req_id: p.resp_id for p in pairs}
    resp_to_req = {p.resp_id: p.req_id for p in pairs}
    pair_map = req_to_resp if direction == "c2s" else resp_to_req

    raw_candidates_data: List[Dict[str, Any]] = []

    for cand in candidates:
        clusters: Dict[Optional[bytes], List[int]] = {}
        for m in target_msgs:
            val = cand.extract(m)
            clusters.setdefault(val, []).append(m.id)

        unique_vals = set(clusters.keys()) - {None}
        if len(unique_vals) <= 1:
            raw_candidates_data.append({
                "candidate": cand, "raw_m": 0.01, "raw_r": 0.01,
                "raw_s": 0.01, "p_d": 0.01, "clusters": clusters,
            })
            continue

        inner_pairs = []
        inter_pairs = []
        for s_i in range(len(sample_msgs)):
            msg_i = sample_msgs[s_i]
            val_i = cand.extract(msg_i)
            for s_j in range(s_i + 1, len(sample_msgs)):
                msg_j = sample_msgs[s_j]
                val_j = cand.extract(msg_j)
                score = float(sim_matrix[s_i][s_j])
                if val_i == val_j and val_i is not None:
                    inner_pairs.append(score)
                else:
                    inter_pairs.append(score)

        if inner_pairs and inter_pairs:
            eer = compute_eer(inner_pairs, inter_pairs)
            raw_p_m = 1.0 - eer
        else:
            raw_p_m = 0.10

        # p_r (remote coupling)
        paired_count = sum(1 for m in target_msgs if m.id in pair_map)
        all_msg_by_id = {m.id: m for m in messages}
        if paired_count >= config.pair_min_ratio * len(target_msgs) and paired_count > 0:
            weighted_pr_sum = 0.0
            total_paired = 0
            for c_val, c_msg_ids in clusters.items():
                c_partners = [pair_map[m_id] for m_id in c_msg_ids if m_id in pair_map]
                if not c_partners:
                    continue
                if len(c_partners) <= 1:
                    c_pr = 0.10
                else:
                    pair_sims = []
                    sub_sample = c_partners[:5]
                    for i_p in range(len(sub_sample)):
                        for j_p in range(i_p + 1, len(sub_sample)):
                            r1 = all_msg_by_id.get(sub_sample[i_p])
                            r2 = all_msg_by_id.get(sub_sample[j_p])
                            if r1 and r2:
                                pair_sims.append(compute_pairwise_similarity(r1, r2, boundary_b))
                    c_pr = float(sum(pair_sims) / len(pair_sims)) if pair_sims else 0.10
                weighted_pr_sum += (len(c_partners) / paired_count) * c_pr
                total_paired += len(c_partners)
            raw_p_r = weighted_pr_sum if total_paired > 0 else 0.50
        else:
            raw_p_r = 0.50

        # p_s (structure consistency)
        weighted_ps_sum = 0.0
        msg_len_map = {m.id: len(m.data) for m in target_msgs}
        for c_val, c_msg_ids in clusters.items():
            c_lens = [msg_len_map[m_id] for m_id in c_msg_ids]
            if len(c_lens) <= 1:
                c_ps = 0.10
            else:
                sorted_l = sorted(c_lens)
                n_l = len(sorted_l)
                median_l = float(sorted_l[n_l // 2] if n_l % 2 == 1
                                 else (sorted_l[n_l // 2 - 1] + sorted_l[n_l // 2]) / 2.0)
                max_l = float(max(c_lens))
                if max_l > 0:
                    gap_proxy = float(sum(abs(l - median_l) for l in c_lens) / len(c_lens)) / max_l
                    c_ps = max(0.0, 1.0 - gap_proxy)
                else:
                    c_ps = 1.0
            weighted_ps_sum += (len(c_msg_ids) / len(target_msgs)) * c_ps
        raw_p_s = weighted_ps_sum

        # p_d (dimension)
        unique_vals = set(clusters.keys()) - {None}
        r_distinct = len(unique_vals) / max(len(target_msgs), 1)
        single_item_clusters = sum(1 for c_msgs in clusters.values() if len(c_msgs) == 1)
        r_single = single_item_clusters / max(len(clusters), 1)
        if r_distinct <= 0.5 and r_single < 0.5:
            p_d = 0.95
        else:
            p_d = 0.01
            raw_p_m = min(raw_p_m, 0.20)
            raw_p_r = min(raw_p_r, 0.20)
            raw_p_s = min(raw_p_s, 0.20)

        raw_candidates_data.append({
            "candidate": cand, "raw_m": raw_p_m, "raw_r": raw_p_r,
            "raw_s": raw_p_s, "p_d": p_d, "clusters": clusters,
        })

    if config.stage1_normalize:
        low_norm, high_norm = config.norm_range

        def normalize(vals: List[float]) -> List[float]:
            min_v = min(vals) if vals else 0.0
            max_v = max(vals) if vals else 1.0
            if max_v > min_v:
                return [low_norm + ((v - min_v) / (max_v - min_v)) * (high_norm - low_norm) for v in vals]
            return [0.50 for _ in vals]

        norm_m = normalize([d["raw_m"] for d in raw_candidates_data])
        norm_r = normalize([d["raw_r"] for d in raw_candidates_data])
        norm_s = normalize([d["raw_s"] for d in raw_candidates_data])
    else:
        norm_m = [d["raw_m"] for d in raw_candidates_data]
        norm_r = [d["raw_r"] for d in raw_candidates_data]
        norm_s = [d["raw_s"] for d in raw_candidates_data]

    p_arrow = {"sim": 0.8, "coupling": 0.9, "struct": 0.9, "dim": 0.9}
    p_back = {"sim": 0.8, "coupling": 0.8, "struct": 0.8, "dim": 0.7}

    scored: List[Dict[str, Any]] = []
    for idx, d in enumerate(raw_candidates_data):
        cand = d["candidate"]
        p_m = norm_m[idx]
        p_r = norm_r[idx]
        p_s = norm_s[idx]
        p_d = d["p_d"]
        p_obs = {"sim": p_m, "coupling": p_r, "struct": p_s, "dim": p_d}
        p_f = compute_star_posterior(p_obs, p_arrow, p_back, prob_clip=config.prob_clip)
        scored.append({
            "candidate": cand, "p_m": p_m, "p_r": p_r, "p_s": p_s,
            "p_d": p_d, "p_f": p_f,
            "raw_m": d["raw_m"], "raw_r": d["raw_r"], "raw_s": d["raw_s"],
            "clusters": d["clusters"],
        })

    scored.sort(key=lambda s: s["p_f"], reverse=True)
    for r_idx, s in enumerate(scored):
        s["rank"] = r_idx + 1
    return scored


def _mirror_for_drops(target_msgs: List[Message], boundary_b: int,
                      S: set, config: Config) -> Dict[str, int]:
    """Mirror of generate_for_candidates' window loop, counting why each
    window was dropped (diagnostics only; the candidate list itself is
    never recomputed here)."""
    counts = {"constant_window": 0, "cardinality": 0, "not_aligned": 0,
              "not_continuous": 0, "short_message": 0, "beyond_boundary": 0}
    if boundary_b <= 0 or not target_msgs:
        return counts
    num_msgs = len(target_msgs)
    for L in config.fo_lengths_for_candidates:
        for s in sorted(S):
            if s + L > boundary_b:
                counts["beyond_boundary"] += 1
                continue
            if s % L != 0:
                counts["not_aligned"] += 1
                continue
            if L > 1 and not is_continuous(S, s, L):
                counts["not_continuous"] += 1
                continue
            values = [m.data[s:s + L] for m in target_msgs if len(m.data) >= s + L]
            if len(values) != num_msgs:
                counts["short_message"] += 1
                continue
            distinct_cnt = len(set(values))
            if distinct_cnt <= 1:
                counts["constant_window"] += 1
                continue
            max_ratio = config.candidate_max_distinct_ratio
            if (max_ratio is not None and num_msgs >= 10
                    and distinct_cnt / num_msgs > max_ratio):
                counts["cardinality"] += 1
                continue
    return counts


# ---------------------------------------------------------------------------
# Health checks (spec 3.6)
# ---------------------------------------------------------------------------

def _true_keyword_missing_reason(capture: PipelineCapture, true_kw: Dict[str, Any]) -> str:
    b = capture.boundary
    if b is None:
        return "boundary stage failed"
    off, ln = true_kw.get("offset"), true_kw.get("length")
    if off is None or ln is None:
        return "no offset/length in catalog spec"
    if off >= b.B:
        return f"offset {off} >= B ({b.B})"
    fd = capture.cand_diagnostics.get("for_diagnostics", {}) or {}
    excluded = fd.get("exclusion_reasons") or {}
    S = set(fd.get("available_S") or [])
    for byte in range(off, min(off + ln, b.B)):
        if byte in excluded:
            return f"byte {byte} excluded by rules {sorted(set(excluded[byte]))}"
    for byte in range(off, min(off + ln, b.B)):
        if byte not in S:
            return f"byte {byte} not in S"
    if ln > 1 and not all(byte in S for byte in range(off, off + ln)):
        return "window not continuous in S"
    if off % ln != 0:
        return f"offset {off} not aligned to length {ln} (s % L != 0)"
    return "dropped by candidate filters (constant window / cardinality / short message)"


def health_checks(capture: PipelineCapture, meta: Dict[str, Any],
                  config: Config) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []

    def add(check_id: str, severity: str, stage: str, text: str,
            data: Optional[Dict[str, Any]] = None) -> None:
        items.append({"id": check_id, "severity": severity, "stage": stage,
                      "text": text, "data": data or {}})

    msgs = capture.messages
    b = capture.boundary
    true_kw = meta.get("true_keyword")

    if b is not None:
        if b.B == b.min_len and b.min_len > 0:
            add("boundary_equals_min_len", "warn", "boundary",
                f"Boundary B ({b.B}) equals min_len ({b.min_len}): the entire "
                f"shortest message is FOR.")
        lens = sorted(len(m.data) for m in msgs)
        if lens:
            n = len(lens)
            median = float(lens[n // 2] if n % 2 == 1
                           else (lens[n // 2 - 1] + lens[n // 2]) / 2)
            if median > 0 and b.min_len < 0.25 * median:
                add("min_len_small", "warn", "boundary",
                    f"min_len ({b.min_len}) < 25% of median length "
                    f"({median:.0f}): a few short messages cap the boundary.",
                    {"min_len": b.min_len, "median_len": median})

    paired_ids: set = set()
    for p in capture.pairs:
        paired_ids.add(p.req_id)
        paired_ids.add(p.resp_id)
    paired_ratio = (len(paired_ids) / len(msgs)) if msgs else 0.0
    if len(capture.pairs) == 0:
        add("no_pairs", "warn", "load",
            "No request-response pairs: remote coupling is neutral (p_r = 0.5).")
    elif paired_ratio < config.pair_min_ratio:
        add("low_pair_ratio", "warn", "load",
            f"Paired ratio {paired_ratio:.2f} < pair_min_ratio "
            f"{config.pair_min_ratio}: coupling is neutral.",
            {"paired_ratio": paired_ratio})

    for d in ("c2s", "s2c"):
        n_d = sum(1 for m in msgs if m.direction == d)
        if 0 < n_d < 5:
            add("direction_unbalanced", "warn", "load",
                f"Direction {d} has only {n_d} messages (< 5).",
                {"direction": d, "n": n_d})

    n_pool = len(capture.candidates)
    if n_pool > 40:
        add("pool_too_large", "warn", "candidates",
            f"Candidate pool has {n_pool} entries (> 40).")
    if n_pool <= 2:
        add("pool_tiny", "warn", "candidates",
            f"Candidate pool has only {n_pool} entries (<= 2).")

    if true_kw and true_kw.get("offset") is not None:
        in_pool = any(c.offset == true_kw["offset"] and c.length == true_kw["length"]
                      for c in capture.candidates)
        if not in_pool:
            reason = _true_keyword_missing_reason(capture, true_kw)
            add("true_keyword_not_in_pool", "error", "candidates",
                f"Catalog true keyword {true_kw['offset']}/{true_kw['length']} "
                f"({true_kw.get('name', '')}) is not in the pool "
                f"(display-only, does not affect the algorithm): {reason}.",
                {"true_keyword": true_kw, "reason": reason})
        else:
            for d, s1 in capture.stage1.items():
                rank = None
                for sc in s1.ranking:
                    if (sc.candidate.offset == true_kw["offset"]
                            and sc.candidate.length == true_kw["length"]):
                        rank = sc.rank
                        break
                if rank is not None:
                    inside = rank <= config.stage1_top_k
                    add("true_keyword_rank", "info" if inside else "warn", "stage1",
                        f"True keyword {true_kw['offset']}/{true_kw['length']} "
                        f"ranks #{rank} in stage 1 ({d}), "
                        f"{'inside' if inside else 'outside'} top-{config.stage1_top_k}.",
                        {"direction": d, "rank": rank, "top_k": config.stage1_top_k})

    clip = config.prob_clip
    for d, kw in capture.stage2.items():
        rows = kw.ranking
        if len(rows) >= 2:
            p1 = rows[0]["posterior"]
            p2 = rows[1]["posterior"]
            if p1 == p2 or (clip is not None and p1 in (clip[0], clip[1])):
                add("posterior_ties", "warn", "stage2",
                    f"Top-2 posteriors tie at full precision in {d} ({p1!r}).",
                    {"direction": d, "posterior": p1})
        for r in rows:
            if r["p_bit"] == 0.0 or (clip is not None and r["p_bit"] in (clip[0], clip[1])):
                at_clip = (clip is not None
                           and r["p_bit"] in (clip[0], clip[1]))
                why = "at the clip bound" if at_clip else "exactly 0"
                add("bitscore_zero", "warn", "stage2",
                    f"Candidate {r['candidate'].offset}/{r['candidate'].length} "
                    f"({d}) has p_bit {why} ({r['p_bit']}).",
                    {"direction": d,
                     "candidate": f"{r['candidate'].offset}/{r['candidate'].length}",
                     "p_bit": r["p_bit"]})
        if rows:
            winner = rows[0]
            s1 = capture.stage1.get(d)
            s1_rank = None
            if s1 is not None:
                for sc in s1.ranking:
                    if sc.candidate.key() == winner["candidate"].key():
                        s1_rank = sc.rank
                        break
            if s1_rank is not None and s1_rank > 1:
                add("stage2_override", "info", "stage2",
                    f"Stage 2 overrode stage 1 in {d}: the winner ranks "
                    f"#{s1_rank} in stage 1.",
                    {"direction": d, "stage1_rank": s1_rank})

    degenerate = 0
    for _d, s1 in capture.stage1.items():
        for sc in s1.ranking:
            if len(sc.clusters) <= 1 or all(len(v) == 1 for v in sc.clusters.values()):
                degenerate += 1
    if degenerate:
        add("degenerate_candidates", "info", "stage1",
            f"{degenerate} candidate(s) have 1 cluster or all singletons.")

    if not any(m.label is not None for m in msgs):
        add("labels_missing", "info", "metrics",
            "No ground-truth labels: metrics skipped.")

    nondefault = _config_nondefault(config)
    if nondefault:
        add("config_nondefault", "info", "load",
            f"Config differs from defaults: {', '.join(sorted(nondefault))}.",
            {"fields": sorted(nondefault)})

    return items


# ---------------------------------------------------------------------------
# Consistency check (spec 3.7)
# ---------------------------------------------------------------------------

def _consistency_impl(capture: PipelineCapture, config: Config,
                      mirror_by_dir: Optional[Dict[str, List[Dict[str, Any]]]] = None
                      ) -> Dict[str, Any]:
    mismatches: List[Dict[str, Any]] = []
    skipped: List[str] = []
    b = capture.boundary
    boundary_b = b.B if b is not None else 0

    for d, s1 in capture.stage1.items():
        if mirror_by_dir is not None and d in mirror_by_dir:
            mirrored = mirror_by_dir[d]
        else:
            mirrored = _mirror_stage1(capture.messages, capture.candidates,
                                      boundary_b, config, capture.pairs, d)
        mirror_by_key = {r["candidate"].key(): r for r in mirrored}
        for sc in s1.ranking:
            mr = mirror_by_key.get(sc.candidate.key())
            if mr is None:
                mismatches.append({
                    "direction": d,
                    "candidate": f"{sc.candidate.offset}/{sc.candidate.length}",
                    "field": "candidate", "pipeline": "present",
                    "recomputed": "missing",
                })
                continue
            for field in ("p_m", "p_r", "p_s", "p_d"):
                pv = getattr(sc, field)
                rv = mr[field]
                if pv is None or rv is None or abs(pv - rv) > 1e-9:
                    mismatches.append({
                        "direction": d,
                        "candidate": f"{sc.candidate.offset}/{sc.candidate.length}",
                        "field": field, "pipeline": pv, "recomputed": rv,
                    })

    for d, kw in capture.stage2.items():
        target_msgs = ([m for m in capture.messages if m.direction == d]
                       if d in ("c2s", "s2c") else capture.messages)
        if not target_msgs:
            target_msgs = capture.messages
        for r in kw.ranking:
            cand = r["candidate"]
            values = [cand.extract(m) for m in target_msgs]
            valid = [v for v in values if v is not None]
            p_bit, _details = compute_bit_use_prob(
                valid, endian=config.bituse_endian,
                dmax_mode=config.dmax_mode, prob_clip=config.prob_clip)
            p_offset = compute_position_prob(cand, config, prob_clip=config.prob_clip)
            if abs(p_bit - r["p_bit"]) > 1e-9:
                mismatches.append({
                    "direction": d,
                    "candidate": f"{cand.offset}/{cand.length}",
                    "field": "p_bit", "pipeline": r["p_bit"],
                    "recomputed": p_bit,
                })
            if abs(p_offset - r["p_offset"]) > 1e-9:
                mismatches.append({
                    "direction": d,
                    "candidate": f"{cand.offset}/{cand.length}",
                    "field": "p_offset", "pipeline": r["p_offset"],
                    "recomputed": p_offset,
                })

    return {"ok": not mismatches, "mismatches": mismatches, "skipped": skipped}


def consistency_check(capture: PipelineCapture, config: Config) -> Dict[str, Any]:
    return _consistency_impl(capture, config)


# ---------------------------------------------------------------------------
# Stage sections (spec 1.3 / 4.1)
# ---------------------------------------------------------------------------

def _true_keyword_match(true_kw: Optional[Dict[str, Any]], offset: int,
                        length: int) -> bool:
    return bool(true_kw and true_kw.get("offset") is not None
                and offset == true_kw["offset"] and length == true_kw["length"])


def _load_section(capture: PipelineCapture, meta: Dict[str, Any]) -> Dict[str, Any]:
    per_direction: Dict[str, Any] = {}
    for d in ("c2s", "s2c"):
        dms = [m for m in capture.messages if m.direction == d]
        if not dms:
            continue
        lens = sorted(len(m.data) for m in dms)
        n = len(lens)
        median = float(lens[n // 2] if n % 2 == 1
                       else (lens[n // 2 - 1] + lens[n // 2]) / 2)
        per_direction[d] = {"n": n, "min": lens[0], "median": median, "max": lens[-1]}
    hist = Counter(len(m.data) for m in capture.messages)
    length_hist = [[l, cnt] for l, cnt in sorted(hist.items())[:12]]
    sessions = len({m.session_id for m in capture.messages})
    paired_ids: set = set()
    for p in capture.pairs:
        paired_ids.add(p.req_id)
        paired_ids.add(p.resp_id)
    paired_ratio = (len(paired_ids) / len(capture.messages)) if capture.messages else 0.0
    return {
        "per_direction": per_direction,
        "sessions": sessions,
        "paired_ratio": paired_ratio,
        "length_hist": length_hist,
        "capture_range": list(capture.capture_range),
        "dropped_by_cleaning": meta.get("dropped_by_cleaning", 0),
        "cleaning_info": meta.get("cleaning_info", {}),
        "n_raw": meta.get("n_raw"),
        "file": meta.get("file"),
    }


def _boundary_section(capture: PipelineCapture,
                      meta: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    b = capture.boundary
    if b is None:
        return None
    return {
        "B": b.B,
        "min_len": b.min_len,
        "hits": [{"rule": h.rule, "offset": h.offset, "length": h.length,
                  "info": h.info} for h in b.hits],
        "true_B": meta.get("expected_B"),
    }


def _tagging_section(capture: PipelineCapture) -> Dict[str, Any]:
    by_byte: Dict[int, List[str]] = defaultdict(list)
    for h in capture.tag_hits:
        for off in range(h.offset, h.offset + h.length):
            if h.rule not in by_byte[off]:
                by_byte[off].append(h.rule)
    multi = sorted(off for off, rules in by_byte.items() if len(rules) > 1)
    return {
        "n_hits": len(capture.tag_hits),
        "by_byte": {str(k): by_byte[k] for k in sorted(by_byte)},
        "multi_tag_bytes": multi,
    }


def _candidates_section(capture: PipelineCapture, config: Config,
                        meta: Dict[str, Any]) -> Dict[str, Any]:
    fd = capture.cand_diagnostics.get("for_diagnostics", {}) or {}
    excluded = {str(k): v for k, v in (fd.get("exclusion_reasons") or {}).items()}
    rescued = fd.get("sparse_bytes", [])
    S = fd.get("available_S", [])
    pool = []
    for c in capture.candidates:
        vals = set()
        for m in capture.messages:
            v = c.extract(m)
            if v is not None:
                vals.add(v)
        pool.append({
            "offset": c.offset, "length": c.length, "region": c.region,
            "kind": c.kind, "tlv_type": c.tlv_type.hex() if c.tlv_type else None,
            "distinct": len(vals), "direction": c.direction,
        })
    b = capture.boundary
    dropped = _mirror_for_drops(
        capture.messages, b.B if b is not None else 0, set(S), config)
    true_kw = meta.get("true_keyword")
    true_in_pool = None
    if true_kw and true_kw.get("offset") is not None:
        true_in_pool = any(c.offset == true_kw["offset"] and c.length == true_kw["length"]
                           for c in capture.candidates)
    return {
        "pool": pool,
        "excluded": excluded,
        "rescued": rescued,
        "S": S,
        "dropped": dropped,
        "true_in_pool": true_in_pool,
        "for_count": capture.cand_diagnostics.get("for_count"),
        "nfor_count": capture.cand_diagnostics.get("nfor_count"),
    }


def _stage1_section(capture: PipelineCapture, config: Config,
                    direction: str, mirror_rows: List[Dict[str, Any]],
                    true_kw: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    s1 = capture.stage1.get(direction)
    if s1 is None:
        return None
    mirror_by_key = {r["candidate"].key(): r for r in mirror_rows}
    rows = []
    for sc in s1.ranking:
        clusters = sc.clusters
        mr = mirror_by_key.get(sc.candidate.key())
        rows.append({
            "offset": sc.candidate.offset,
            "length": sc.candidate.length,
            "region": sc.candidate.region,
            "kind": sc.candidate.kind,
            "n_clusters": len(clusters),
            "n_distinct": len([k for k in clusters if k is not None]),
            "singletons": sum(1 for v in clusters.values() if len(v) == 1),
            "raw": ({"p_m": mr["raw_m"], "p_r": mr["raw_r"], "p_s": mr["raw_s"]}
                    if mr else None),
            "p_m": sc.p_m, "p_r": sc.p_r, "p_s": sc.p_s,
            "p_d": sc.p_d, "p_f": sc.p_f, "rank": sc.rank,
            "is_true": _true_keyword_match(true_kw, sc.candidate.offset, sc.candidate.length),
        })
    return {"top_k": config.stage1_top_k, "rows": rows}


def _stage2_section(capture: PipelineCapture, config: Config,
                    direction: str, true_kw: Optional[Dict[str, Any]]
                    ) -> Optional[Dict[str, Any]]:
    kw = capture.stage2.get(direction)
    if kw is None:
        return None
    s1 = capture.stage1.get(direction)
    rank_by_key = {}
    if s1 is not None:
        for sc in s1.ranking:
            rank_by_key[sc.candidate.key()] = sc.rank
    rows = []
    for idx, r in enumerate(kw.ranking):
        cand = r["candidate"]
        bits = r.get("bit_details", {}) or {}
        rows.append({
            "offset": cand.offset,
            "length": cand.length,
            "region": cand.region,
            "p_bit": r["p_bit"],
            "p_offset": r["p_offset"],
            "p_f": r["p_f"],
            "posterior": r["posterior"],
            "rank": idx + 1,
            "stage1_rank": rank_by_key.get(cand.key()),
            "is_true": _true_keyword_match(true_kw, cand.offset, cand.length),
            "bits": {
                "msb": bits.get("msb", -1),
                "D": bits.get("D", 0.0),
                "D_max": bits.get("D_max", 0.0),
                "q_k": bits.get("q_k", []),
                "p_k": bits.get("p_k", []),
            },
        })
    winner = ({"offset": kw.candidate.offset, "length": kw.candidate.length}
              if kw.candidate else None)
    return {"winner": winner, "rows": rows}


def _cluster_section(capture: PipelineCapture, direction: str
                     ) -> Optional[Dict[str, Any]]:
    kw = capture.stage2.get(direction)
    if kw is None:
        return None
    clusters_by_key: Dict[str, List[int]] = defaultdict(list)
    for msg_id, key in capture.clusters.items():
        if key.startswith(direction + "_"):
            clusters_by_key[key].append(msg_id)
    cluster_list = [
        {"key": key, "size": len(ids), "examples": sorted(ids)[:8]}
        for key, ids in sorted(clusters_by_key.items())
    ]
    none_count = sum(1 for k in capture.clusters.values() if k == f"{direction}_none")
    unclassified_count = sum(1 for k in capture.clusters.values()
                             if k == f"{direction}_unclassified")
    keyword = ({"offset": kw.candidate.offset, "length": kw.candidate.length}
               if kw.candidate else None)
    return {"keyword": keyword, "clusters": cluster_list,
            "none": none_count, "unclassified": unclassified_count}


def _metrics_section(capture: PipelineCapture) -> Dict[str, Any]:
    h, c, v = capture.metrics
    available = h is not None
    labeled = [m for m in capture.messages if m.label is not None]
    per_cluster = []
    confusion = []
    if available:
        by_cluster: Dict[str, List[Message]] = defaultdict(list)
        for m in labeled:
            by_cluster[capture.clusters.get(m.id, "unclassified")].append(m)
        for key, ms in by_cluster.items():
            labels = [m.label for m in ms]
            top_label, top_count = Counter(labels).most_common(1)[0]
            per_cluster.append({
                "cluster": key, "size": len(ms),
                "purity": top_count / len(ms), "top_label": top_label,
            })
        conf: Counter = Counter()
        for m in labeled:
            conf[(capture.clusters.get(m.id, "unclassified"),
                  f"{m.direction}_{m.label}")] += 1
        confusion = [{"cluster": k[0], "label": k[1], "count": cnt}
                     for k, cnt in conf.most_common(10)]
    return {
        "available": available,
        "homogeneity": h, "completeness": c, "v_measure": v,
        "per_cluster": per_cluster, "confusion": confusion,
    }


def _message_summaries(capture: PipelineCapture) -> List[Dict[str, Any]]:
    pair_lookup: Dict[int, int] = {}
    for p in capture.pairs:
        pair_lookup[p.req_id] = p.resp_id
        pair_lookup[p.resp_id] = p.req_id
    out = []
    for m in capture.messages:
        out.append({
            "id": m.id,
            "direction": m.direction,
            "length": len(m.data),
            "session_id": m.session_id,
            "paired_id": pair_lookup.get(m.id),
            "cluster": capture.clusters.get(m.id, "unclassified"),
            "label": m.label,
            "head_hex": m.data[:32].hex(),
        })
    return out


# ---------------------------------------------------------------------------
# build_overview (spec 4.1)
# ---------------------------------------------------------------------------

_STAGE_META = [
    ("load", "Load & preprocess"),
    ("boundary", "FOR/NFOR boundary"),
    ("tagging", "Semantic tagging"),
    ("candidates", "Candidate generation"),
    ("stage1", "Stage 1 constraints"),
    ("stage2", "Stage 2 self-constraints"),
    ("cluster", "Clustering"),
    ("metrics", "Evaluation"),
]

_DOWNSTREAM: Dict[str, List[str]] = {
    "load": ["boundary", "tagging", "candidates", "stage1", "stage2", "cluster", "metrics"],
    "boundary": ["tagging", "candidates", "stage1", "stage2", "cluster", "metrics"],
    "tagging": ["candidates", "stage1", "stage2", "cluster", "metrics"],
    "candidates": ["stage1", "stage2", "cluster", "metrics"],
    "stage1": ["stage2", "cluster", "metrics"],
    "stage2": ["cluster", "metrics"],
    "cluster": ["metrics"],
    "metrics": [],
}


def build_overview(capture: PipelineCapture, meta: Dict[str, Any],
                   config: Config) -> Dict[str, Any]:
    true_kw = meta.get("true_keyword")
    health = health_checks(capture, meta, config)
    health_by_stage: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for hitem in health:
        health_by_stage[hitem["stage"]].append(hitem)

    errors = capture.errors

    def status_of(stage_id: str) -> str:
        if stage_id in errors:
            return "error"
        for up, downs in _DOWNSTREAM.items():
            if up in errors and stage_id in downs:
                return "skipped"
        if any(hitem["severity"] == "warn" for hitem in health_by_stage.get(stage_id, [])):
            return "warn"
        return "ok"

    # Mirror stage 1 once per direction: used for raw values AND the
    # consistency check (avoids computing the O(sample^2) matrix twice).
    b = capture.boundary
    boundary_b = b.B if b is not None else 0
    mirror_by_dir: Dict[str, List[Dict[str, Any]]] = {}
    for d in capture.stage1:
        mirror_by_dir[d] = _mirror_stage1(
            capture.messages, capture.candidates, boundary_b,
            config, capture.pairs, d)
    consistency = _consistency_impl(capture, config, mirror_by_dir)

    load_sec = _load_section(capture, meta)
    boundary_sec = _boundary_section(capture, meta)
    tagging_sec = _tagging_section(capture)
    candidates_sec = _candidates_section(capture, config, meta)

    stage1_secs: Dict[str, Any] = {}
    stage2_secs: Dict[str, Any] = {}
    cluster_secs: Dict[str, Any] = {}
    for d in ("c2s", "s2c", "both"):
        s1 = _stage1_section(capture, config, d, mirror_by_dir.get(d, []), true_kw)
        if s1 is not None:
            stage1_secs[d] = s1
        s2 = _stage2_section(capture, config, d, true_kw)
        if s2 is not None:
            stage2_secs[d] = s2
        cl = _cluster_section(capture, d)
        if cl is not None:
            cluster_secs[d] = cl
    metrics_sec = _metrics_section(capture)

    sections = {
        "load": load_sec,
        "boundary": boundary_sec,
        "tagging": tagging_sec,
        "candidates": candidates_sec,
        "stage1": stage1_secs,
        "stage2": stage2_secs,
        "cluster": cluster_secs,
        "metrics": metrics_sec,
    }

    # Headlines
    first_s1_dir = next(iter(capture.stage1), None)
    first_s2_dir = next(iter(capture.stage2), None)
    n_clusters = len(set(capture.clusters.values())) if capture.clusters else 0
    h_val = capture.metrics[2]
    headlines: Dict[str, str] = {
        "load": f"{len(capture.messages)} msgs, {len(capture.pairs)} pairs",
        "boundary": f"B={b.B}" if b is not None else "error",
        "tagging": f"{len(capture.tag_hits)} tags",
        "candidates": f"{len(capture.candidates)} candidates",
        "stage1": "top: -",
        "stage2": "winner: -",
        "cluster": f"{n_clusters} clusters",
        "metrics": (f"v={h_val:.3f}" if h_val is not None else "no ground truth"),
    }
    if first_s1_dir and stage1_secs.get(first_s1_dir) and stage1_secs[first_s1_dir]["rows"]:
        top = stage1_secs[first_s1_dir]["rows"][0]
        headlines["stage1"] = f"top: {top['offset']}/{top['length']}"
    if first_s2_dir and stage2_secs.get(first_s2_dir) and stage2_secs[first_s2_dir]["winner"]:
        w = stage2_secs[first_s2_dir]["winner"]
        headlines["stage2"] = f"winner: {w['offset']}/{w['length']}"

    stages = []
    for stage_id, name in _STAGE_META:
        ms = (meta.get("load_ms", 0.0) if stage_id == "load"
              else capture.timing.get(stage_id, 0.0) * 1000.0)
        stages.append({
            "id": stage_id,
            "name": name,
            "status": status_of(stage_id),
            "ms": round(ms, 3),
            "headline": headlines[stage_id],
            "summary": sections[stage_id],
            "attention": [hitem["id"] for hitem in health_by_stage.get(stage_id, [])],
            "error": errors.get(stage_id),
        })

    overview = {
        "status": "ok",
        "meta": {
            "source_id": meta.get("source_id", ""),
            "dataset_id": meta.get("dataset_id", ""),
            "protocol": meta.get("protocol", ""),
            "file": meta.get("file"),
            "n_messages": len(capture.messages),
            "true_keyword": true_kw,
            "config_fingerprint": _config_fingerprint(config),
            "config_nondefault": _config_nondefault(config),
        },
        "stages": stages,
        "load": load_sec,
        "boundary": boundary_sec,
        "tagging": tagging_sec,
        "candidates": candidates_sec,
        "stage1": stage1_secs,
        "stage2": stage2_secs,
        "cluster": cluster_secs,
        "metrics": metrics_sec,
        "health": health,
        "consistency": consistency,
        "messages": _message_summaries(capture),
    }
    return _jsonify(overview)


# ---------------------------------------------------------------------------
# build_message_trace (spec 4.2)
# ---------------------------------------------------------------------------

def _nfor_covered_range(c: Candidate, m: Message) -> Optional[Tuple[int, int]]:
    """Mirror of Candidate.extract's NFOR search; returns the absolute byte
    range [start, end) covered in this message (T-V), or None."""
    if c.region != "NFOR":
        return None
    if c.tlv_type is None:
        end = c.offset + c.length
        if len(m.data) >= end:
            return (c.offset, end)
        return None
    t_len, l_len = c.t_len, c.l_len
    off = 0
    while off + t_len + l_len <= len(m.data):
        tag = m.data[off:off + t_len]
        if tag == c.tlv_type:
            val_len = int.from_bytes(
                m.data[off + t_len:off + t_len + l_len], byteorder=c.endian)
            val_start = off + t_len + l_len
            val_end = val_start + val_len
            if val_end <= len(m.data):
                return (off, val_end)
        off += 1
    return None


def _cluster_pr_for(c: Candidate, clusters: Dict[Optional[bytes], List[int]],
                    m: Message, capture: PipelineCapture, config: Config,
                    direction: str, boundary_b: int) -> Tuple[Optional[float], str]:
    """Mirror of stage1.py's per-cluster remote-coupling quantity (c_pr)
    for m's cluster under candidate c."""
    target_msgs = ([x for x in capture.messages if x.direction == direction]
                   if direction in ("c2s", "s2c") else capture.messages)
    pair_map: Dict[int, int] = {}
    for p in capture.pairs:
        pair_map[p.req_id] = p.resp_id
        pair_map[p.resp_id] = p.req_id
    paired_count = sum(1 for x in target_msgs if x.id in pair_map)
    if paired_count < config.pair_min_ratio * len(target_msgs) or paired_count == 0:
        return 0.50, "neutral: paired_count < pair_min_ratio (p_r = 0.5)"
    val = c.extract(m)
    c_msg_ids = clusters.get(val, [])
    c_partners = [pair_map[mid] for mid in c_msg_ids if mid in pair_map]
    if not c_partners:
        return None, "no paired messages in this cluster"
    if len(c_partners) <= 1:
        return 0.10, "singleton partner cluster (c_pr = 0.10)"
    all_msg_by_id = {x.id: x for x in capture.messages}
    sub_sample = c_partners[:5]
    pair_sims = []
    for i_p in range(len(sub_sample)):
        for j_p in range(i_p + 1, len(sub_sample)):
            r1 = all_msg_by_id.get(sub_sample[i_p])
            r2 = all_msg_by_id.get(sub_sample[j_p])
            if r1 and r2:
                pair_sims.append(compute_pairwise_similarity(r1, r2, boundary_b))
    c_pr = float(sum(pair_sims) / len(pair_sims)) if pair_sims else 0.10
    return c_pr, "mean pairwise sim of up to 5 partner messages"


def build_message_trace(capture: PipelineCapture, message_id: int,
                        config: Config) -> Dict[str, Any]:
    msgs = capture.messages
    m = next((x for x in msgs if x.id == message_id), None)
    if m is None:
        raise ValueError(f"Message {message_id} not found in capture")

    b = capture.boundary
    B = b.B if b is not None else 0
    min_len = b.min_len if b is not None else 0

    fd = capture.cand_diagnostics.get("for_diagnostics", {}) or {}
    effective_excluded = set(fd.get("excluded_bytes") or [])
    sparse_bytes = set(fd.get("sparse_bytes") or [])
    S = set(fd.get("available_S") or [])
    exclusion_reasons = {int(k): v for k, v in (fd.get("exclusion_reasons") or {}).items()}

    # Dataset-level rule matrix over the direction-agnostic message set
    # (the same set find_boundary used).
    matrix = _rule_matrix(msgs, config, capture.pairs, capture.capture_range, min_len)

    true_kw = None  # filled by caller via meta? -> kept None here; API layer
    # passes true keyword through the overview only. (display-only marker
    # in the message trace is derived from the stage-2 winner below)

    data = m.data
    truncated = len(data) > MAX_BYTES
    show_len = min(len(data), MAX_BYTES)

    pair_lookup: Dict[int, int] = {}
    for p in capture.pairs:
        pair_lookup[p.req_id] = p.resp_id
        pair_lookup[p.resp_id] = p.req_id

    # Candidate coverage per byte
    candidate_ids_by_byte: Dict[int, List[int]] = defaultdict(list)
    for cid, c in enumerate(capture.candidates):
        if c.region == "FOR":
            for off in range(c.offset, min(c.offset + c.length, show_len)):
                candidate_ids_by_byte[off].append(cid)
        else:
            rng = _nfor_covered_range(c, m)
            if rng is not None:
                for off in range(max(rng[0], 0), min(rng[1], show_len)):
                    candidate_ids_by_byte[off].append(cid)

    bytes_out = []
    for off in range(show_len):
        byte_val = data[off]
        region = "FOR" if off < B else "NFOR"
        beyond = off >= min_len
        if beyond or off >= B:
            status = "not_evaluated"
        elif off in effective_excluded:
            status = "excluded"
        elif off in sparse_bytes:
            status = "rescued"
        else:
            status = "available"
        tags: List[str] = []
        for h in capture.tag_hits:
            if h.offset <= off < h.offset + h.length and h.rule not in tags:
                tags.append(h.rule)
        bytes_out.append({
            "offset": off,
            "hex": data[off:off + 1].hex(),
            "ascii": chr(byte_val) if 32 <= byte_val < 127 else ".",
            "region": region,
            "beyond_min_len": beyond,
            "status": status,
            "tags": tags,
            "exclusion_reasons": exclusion_reasons.get(off, []),
            "in_S": off in S,
            "candidate_ids": candidate_ids_by_byte.get(off, []),
        })

    # Rules covering at least one byte of this message
    msg_index = next(i for i, x in enumerate(msgs) if x is m)
    det_order = _DETECTOR_ORDER
    covering = [e for e in matrix if e["offset"] < len(data)]
    covering.sort(key=lambda e: (e["offset"], det_order.get(e["rule"], 99), e["length"]))
    rules_out = []
    for e in covering:
        msg_ok = e["msg_ok"][msg_index] if msg_index < len(e["msg_ok"]) else None
        blocking = _blocking_for(e, msg_index, msgs, config)
        rules_out.append({
            "rule": e["rule"],
            "offset": e["offset"],
            "length": e["length"],
            "fires": e["fires"],
            "msg_ok": msg_ok,
            "blocking": blocking,
            "fraction_ok": e["fraction_ok"],
            "detail": e["detail"],
            "info": e["info"],
        })

    # Offset histograms (top 12 values per offset across the dataset)
    offset_histograms: Dict[str, Any] = {}
    for off in range(show_len):
        vals = [x.data[off:off + 1] for x in msgs if len(x.data) > off]
        if not vals:
            continue
        counts = Counter(vals)
        offset_histograms[str(off)] = [[v.hex(), cnt] for v, cnt in counts.most_common(12)]

    # Candidate path: the message's journey through stage 1/2 for every
    # pool candidate of its direction.
    direction = m.direction
    s1 = capture.stage1.get(direction) or capture.stage1.get("both")
    kw = capture.stage2.get(direction) or capture.stage2.get("both")
    target_msgs = ([x for x in msgs if x.direction == direction]
                   if direction in ("c2s", "s2c") else msgs)
    s1_rows = s1.ranking if s1 is not None else []
    top_k_keys = {sc.candidate.key() for sc in s1_rows[:config.stage1_top_k]}
    winner_cand = kw.candidate if kw is not None else None

    path = []
    for cid, c in enumerate(capture.candidates):
        value = c.extract(m)
        sc_row = next((sc for sc in s1_rows if sc.candidate.key() == c.key()), None)
        clusters = sc_row.clusters if sc_row is not None else {}
        cluster_members = clusters.get(value, [])
        n_clusters = len(clusters)

        # similarity (seeded sampling, spec 3.5)
        rng = random.Random(config.seed)
        same_cluster = [x for x in target_msgs if x.id in cluster_members and x.id != m.id]
        other_msgs = [x for x in target_msgs if x.id not in cluster_members]
        same_sample = rng.sample(same_cluster, min(20, len(same_cluster))) if same_cluster else []
        other_sample = rng.sample(other_msgs, min(20, len(other_msgs))) if other_msgs else []
        inner_sims = [compute_pairwise_similarity(m, x, B) for x in same_sample]
        inter_sims = [compute_pairwise_similarity(m, x, B) for x in other_sample]
        similarity = {
            "inner_mean": (sum(inner_sims) / len(inner_sims)) if inner_sims else None,
            "inter_mean": (sum(inter_sims) / len(inter_sims)) if inter_sims else None,
            "n_inner": len(inner_sims),
            "n_inter": len(inter_sims),
            "formula": ("mean compute_pairwise_similarity of this message vs up to 20 "
                        "seeded-sampled peers in the same cluster and 20 in other clusters"),
        }

        # coupling
        partner_id = pair_lookup.get(m.id)
        partner = next((x for x in msgs if x.id == partner_id), None) if partner_id is not None else None
        partner_value = c.extract(partner) if partner is not None else None
        cluster_pr, pr_formula = _cluster_pr_for(
            c, clusters, m, capture, config, direction, B)
        coupling = {
            "partner_id": partner_id,
            "partner_value": partner_value.hex() if partner_value is not None else None,
            "partner_direction": partner.direction if partner is not None else None,
            "cluster_pr": cluster_pr,
            "formula": pr_formula,
        }

        # structure
        c_lens = [len(x.data) for x in target_msgs if x.id in cluster_members]
        if len(c_lens) <= 1:
            cluster_median = float(len(m.data))
            cluster_max = float(len(m.data))
            cluster_ps = 0.10
            ps_formula = "singleton cluster (c_ps = 0.10)"
        else:
            sorted_l = sorted(c_lens)
            n_l = len(sorted_l)
            cluster_median = float(sorted_l[n_l // 2] if n_l % 2 == 1
                                   else (sorted_l[n_l // 2 - 1] + sorted_l[n_l // 2]) / 2.0)
            cluster_max = float(max(c_lens))
            if cluster_max > 0:
                gap_proxy = float(sum(abs(l - cluster_median) for l in c_lens) / len(c_lens)) / cluster_max
                cluster_ps = max(0.0, 1.0 - gap_proxy)
            else:
                cluster_ps = 1.0
            ps_formula = "1 - mean(|len - median|)/max_len over cluster"
        deviation = (abs(len(m.data) - cluster_median) / cluster_max) if cluster_max > 0 else 0.0
        structure = {
            "length": len(m.data),
            "cluster_median": cluster_median,
            "deviation": deviation,
            "cluster_ps": cluster_ps,
            "formula": ps_formula,
        }

        # dimension
        unique_vals = set(k for k in clusters if k is not None)
        r_distinct = len(unique_vals) / max(len(target_msgs), 1)
        single_item = sum(1 for v in clusters.values() if len(v) == 1)
        r_single = single_item / max(len(clusters), 1)
        dimension = {
            "r_distinct": r_distinct,
            "r_single": r_single,
            "p_d": sc_row.p_d if sc_row is not None else None,
        }

        # stage 1
        stage1 = None
        if sc_row is not None:
            stage1 = {"p_m": sc_row.p_m, "p_r": sc_row.p_r, "p_s": sc_row.p_s,
                      "p_d": sc_row.p_d, "p_f": sc_row.p_f, "rank": sc_row.rank}

        # stage 2 (top-K only)
        stage2 = None
        if kw is not None and c.key() in top_k_keys:
            r2 = next((r for r in kw.ranking if r["candidate"].key() == c.key()), None)
            if r2 is not None:
                int_value = int.from_bytes(value, config.bituse_endian) if value is not None else None
                msb = (int_value.bit_length() - 1) if (int_value is not None and int_value > 0) else None
                bits = r2.get("bit_details", {}) or {}
                stage2 = {
                    "in_top_k": True,
                    "int_value": int_value,
                    "msb": msb,
                    "p_bit": r2["p_bit"],
                    "p_offset": r2["p_offset"],
                    "posterior": r2["posterior"],
                    "rank": next(i + 1 for i, r in enumerate(kw.ranking)
                                 if r["candidate"].key() == c.key()),
                    "q_k": bits.get("q_k", []),
                    "p_k": bits.get("p_k", []),
                }

        path.append({
            "candidate_id": cid,
            "offset": c.offset,
            "length": c.length,
            "region": c.region,
            "kind": c.kind,
            "tlv_type": c.tlv_type.hex() if c.tlv_type else None,
            "value": value.hex() if value is not None else None,
            "cluster_key": value.hex() if value is not None else None,
            "cluster_size": len(cluster_members),
            "n_clusters": n_clusters,
            "similarity": similarity,
            "coupling": coupling,
            "structure": structure,
            "dimension": dimension,
            "stage1": stage1,
            "stage2": stage2,
            "is_winner": bool(winner_cand is not None and winner_cand.key() == c.key()),
            "is_true": _true_keyword_match(true_kw, c.offset, c.length),
        })

    # Final panel
    final_cluster = capture.clusters.get(m.id, "unclassified")
    cluster_size = sum(1 for k in capture.clusters.values() if k == final_cluster)
    labeled_in_cluster = [x for x in capture.messages
                          if capture.clusters.get(x.id) == final_cluster and x.label is not None]
    cluster_pure = None
    if labeled_in_cluster and len(labeled_in_cluster) == cluster_size:
        cluster_pure = len({x.label for x in labeled_in_cluster}) == 1
    final = {
        "cluster": final_cluster,
        "cluster_size": cluster_size,
        "keyword": ({"offset": kw.candidate.offset, "length": kw.candidate.length}
                    if kw is not None and kw.candidate is not None else None),
        "label": m.label,
        "cluster_pure": cluster_pure,
    }

    message_out = {
        "id": m.id,
        "direction": m.direction,
        "length": len(m.data),
        "session_id": m.session_id,
        "paired_id": pair_lookup.get(m.id),
        "label": m.label,
        "hex": data[:MAX_BYTES].hex(),
        "truncated": truncated,
    }

    out = {
        "message": message_out,
        "bytes": bytes_out,
        "rules": rules_out,
        "offset_histograms": offset_histograms,
        "candidate_path": path,
        "final": final,
    }
    return _jsonify(out)


# ---------------------------------------------------------------------------
# Optional on-disk capture cache (spec 3.8; never required for correctness)
# ---------------------------------------------------------------------------

def capture_cache_key(input_spec: Dict[str, Any], config: Config,
                      meta: Dict[str, Any]) -> str:
    h = hashlib.sha1()
    h.update(config.to_json().encode("utf-8"))
    h.update(b"|")
    h.update(json.dumps(input_spec, sort_keys=True).encode("utf-8"))
    h.update(b"|")
    file_path = meta.get("file")
    if file_path and os.path.exists(file_path):
        st = os.stat(file_path)
        h.update(f"{st.st_mtime_ns}:{st.st_size}".encode("utf-8"))
    return h.hexdigest()


def _capture_cache_dir() -> str:
    return os.path.join(tempfile.gettempdir(), "rpkclust_trace_cache")


def load_cached_capture(key: str) -> Optional[PipelineCapture]:
    path = os.path.join(_capture_cache_dir(), key + ".pkl")
    try:
        with open(path, "rb") as f:
            return pickle.load(f)
    except Exception:
        return None


def save_cached_capture(key: str, capture: PipelineCapture) -> None:
    try:
        os.makedirs(_capture_cache_dir(), exist_ok=True)
        path = os.path.join(_capture_cache_dir(), key + ".pkl")
        with open(path, "wb") as f:
            pickle.dump(capture, f, protocol=pickle.HIGHEST_PROTOCOL)
    except Exception:
        pass

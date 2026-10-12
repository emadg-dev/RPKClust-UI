"""
Tests for the Pipeline Tracker tracing feature (docs/PIPELINE_TRACKER_SPEC.md).
Plain functions, runnable with `py tests\\run_tests.py` (no pytest-only features).
"""

import json

from rpkclust.config import Config
from rpkclust.model import Message, Trace
from rpkclust.io.loader import load_hex_lines
from rpkclust.pipeline import run_pipeline
import rpkclust.pipeline as pipeline_mod
from rpkclust.trace import (
    build_overview, build_message_trace, health_checks, consistency_check,
)

FIG1_HEX = """
05 64 0b c4 44 33 33 44 ac d1 c6 c5 01 3c 00 00 93 24 Read
05 64 0a 44 33 44 44 33 6e 25 e0 c5 81 00 00 02 ee Response
05 64 0b c4 44 33 33 44 ac d1 c7 c6 01 3c 00 00 7e f4 Read
05 64 0a 44 33 44 44 33 6e 25 e1 c6 81 00 00 45 c7 Response
05 64 0b c4 44 33 33 44 ac d1 c8 c7 02 50 01 2b 00 00 Write
05 64 0a 44 33 44 44 33 6e 25 e2 c7 81 00 00 a7 60 Response
05 64 0d c4 44 33 33 44 6d c3 c6 c6 02 50 01 00 00 00 00 34 Write
05 64 0b 44 33 44 44 33 7c ae c6 c6 81 00 00 00 36 71 Response
"""


def _fig1_config() -> Config:
    cfg = Config()
    cfg.stage1_normalize = False
    cfg.prob_clip = None
    cfg.predicate_mode = "mean"
    return cfg


def _fig1_capture():
    cfg = _fig1_config()
    trace = load_hex_lines(FIG1_HEX, cfg)
    res = run_pipeline(trace, cfg, capture=True)
    meta = {
        "source_id": "test", "dataset_id": "fig1", "protocol": "fig1",
        "file": None, "true_keyword": None, "expected_B": None,
        "dropped_by_cleaning": 0, "cleaning_info": {},
        "n_raw": len(trace.messages), "load_ms": 0.0,
    }
    return res.trace, cfg, meta


def _synthetic_trace() -> Trace:
    """Small synthetic protocol: constant 2-byte header, sparse opcode
    at offset 2, 2-byte counter at offset 3, per-direction."""
    msgs = []
    for i in range(12):
        op = 0x01 if i % 2 == 0 else 0x02
        req = bytes([0xA0, 0xB0, op]) + bytes([i & 0xFF, (i >> 8) & 0xFF]) + b"\x00\x00"
        resp = bytes([0xA0, 0xB0, op, 0x00]) + bytes([i & 0xFF]) + b"\x00\x00\x00"
        msgs.append(Message(id=len(msgs), data=req, ts=1000.0 + i * 0.2,
                            direction="c2s", session_id=i, sport=10000, dport=502))
        msgs.append(Message(id=len(msgs), data=resp, ts=1000.0 + i * 0.2 + 0.05,
                            direction="s2c", session_id=i, sport=502, dport=10000))
    pairs = []
    for i in range(12):
        pairs.append(type("Pair", (), {})())  # placeholder, replaced below
    from rpkclust.model import Pair
    pairs = [Pair(req_id=2 * i, resp_id=2 * i + 1, session_id=i, dt=0.05)
             for i in range(12)]
    return Trace(messages=msgs, pairs=pairs, capture_range=(1000.0, 1002.4))


# 1. No-behavior-change: capture=False vs capture=True give identical
#    keywords, clusters and metrics (Fig 1 toy trace + one synthetic protocol).
def test_no_behavior_change():
    cfg = _fig1_config()
    trace = load_hex_lines(FIG1_HEX, cfg)
    r1 = run_pipeline(trace, cfg, capture=False)
    r2 = run_pipeline(trace, cfg, capture=True)
    assert set(r1.keywords) == set(r2.keywords)
    for d in r1.keywords:
        k1, k2 = r1.keywords[d], r2.keywords[d]
        assert (k1.candidate.offset, k1.candidate.length, k1.posterior) == \
               (k2.candidate.offset, k2.candidate.length, k2.posterior), d
        assert k1.p_bit == k2.p_bit and k1.p_offset == k2.p_offset
    assert r1.clusters == r2.clusters
    assert r1.diagnostics["metrics"] == r2.diagnostics["metrics"]
    assert [(c.offset, c.length, c.region, c.kind) for c in r1.candidates] == \
           [(c.offset, c.length, c.region, c.kind) for c in r2.candidates]

    # synthetic protocol
    trace2 = _synthetic_trace()
    s1 = run_pipeline(trace2, Config(), capture=False)
    s2 = run_pipeline(trace2, Config(), capture=True)
    for d in s1.keywords:
        k1, k2 = s1.keywords[d], s2.keywords[d]
        assert (k1.candidate.offset, k1.candidate.length, k1.posterior) == \
               (k2.candidate.offset, k2.candidate.length, k2.posterior), d
    assert s1.clusters == s2.clusters
    assert s1.diagnostics["metrics"] == s2.diagnostics["metrics"]


# 2. Determinism: build_message_trace twice gives equal JSON.
def test_determinism():
    cap, cfg, _meta = _fig1_capture()
    mt1 = build_message_trace(cap, 0, cfg)
    mt2 = build_message_trace(cap, 0, cfg)
    assert json.dumps(mt1, sort_keys=True) == json.dumps(mt2, sort_keys=True)
    mt3 = build_message_trace(cap, 5, cfg)
    mt4 = build_message_trace(cap, 5, cfg)
    assert json.dumps(mt3, sort_keys=True) == json.dumps(mt4, sort_keys=True)


# 3. JSON safety: json.dumps(..., allow_nan=False) succeeds.
def test_json_safety():
    cap, cfg, meta = _fig1_capture()
    overview = build_overview(cap, meta, cfg)
    mt = build_message_trace(cap, 0, cfg)
    json.dumps(overview, allow_nan=False)
    json.dumps(mt, allow_nan=False)
    # also on the synthetic trace (both directions present)
    trace2 = _synthetic_trace()
    res = run_pipeline(trace2, Config(), capture=True)
    meta2 = {"source_id": "t", "dataset_id": "t", "protocol": "t",
             "file": None, "true_keyword": None, "expected_B": None,
             "dropped_by_cleaning": 0, "cleaning_info": {},
             "n_raw": 24, "load_ms": 0.0}
    ov2 = build_overview(res.trace, meta2, Config())
    mt2 = build_message_trace(res.trace, 3, Config())
    json.dumps(ov2, allow_nan=False)
    json.dumps(mt2, allow_nan=False)


# 4. Fig 1 fixture: byte 12 of message 0 has tag sparse, is in S,
#    covered by candidate 12/1; rule row sparse@12/1 fires with
#    msg_ok=true; bytes 0..1 constant with msg_ok=true.
def test_fig1_fixture():
    cap, cfg, _meta = _fig1_capture()
    mt = build_message_trace(cap, 0, cfg)

    b12 = mt["bytes"][12]
    assert "sparse" in b12["tags"], b12["tags"]
    assert b12["in_S"] is True

    path_12 = [p for p in mt["candidate_path"]
               if p["offset"] == 12 and p["length"] == 1]
    assert path_12, "candidate 12/1 missing from candidate_path"
    assert path_12[0]["candidate_id"] in b12["candidate_ids"]

    rule = [r for r in mt["rules"]
            if r["rule"] == "sparse" and r["offset"] == 12 and r["length"] == 1]
    assert rule, "sparse@12/1 rule row missing"
    assert rule[0]["fires"] is True
    assert rule[0]["msg_ok"] is True

    rule_c1 = [r for r in mt["rules"]
               if r["rule"] == "constant" and r["offset"] == 0 and r["length"] == 1]
    assert rule_c1 and rule_c1[0]["msg_ok"] is True
    rule_c2 = [r for r in mt["rules"]
               if r["rule"] == "constant" and r["offset"] == 0 and r["length"] == 2]
    assert rule_c2 and rule_c2[0]["msg_ok"] is True


# 5. Blocking logic: all messages share byte 5 except one ->
#    constant@5/1 fires=false, blocking=true only for that message,
#    msg_ok=false for it and true for the others.
def test_blocking_logic():
    msgs = []
    for i in range(6):
        data = bytearray(b"\x01\x02\x03\x04\x05\xaa\x06\x07")
        if i == 3:
            data[5] = 0xBB
        msgs.append(Message(id=i, data=bytes(data), ts=1000.0 + i,
                            direction="c2s"))
    trace = Trace(messages=msgs, pairs=[], capture_range=(1000.0, 1006.0))
    res = run_pipeline(trace, Config(), capture=True)
    cap = res.trace

    mt_bad = build_message_trace(cap, 3, Config())
    row = [r for r in mt_bad["rules"]
           if r["rule"] == "constant" and r["offset"] == 5 and r["length"] == 1]
    assert row, "constant@5/1 row missing"
    r = row[0]
    assert r["fires"] is False
    assert r["msg_ok"] is False
    assert r["blocking"] is True

    mt_ok = build_message_trace(cap, 0, Config())
    r0 = [x for x in mt_ok["rules"]
          if x["rule"] == "constant" and x["offset"] == 5 and x["length"] == 1][0]
    assert r0["msg_ok"] is True
    assert r0["blocking"] is False


# 6. Label isolation: with all Message.label set to None the overview's
#    stages 1-5 (load..cluster) are identical; only metrics changes.
def test_label_isolation():
    cfg = _fig1_config()
    trace = load_hex_lines(FIG1_HEX, cfg)
    msgs_no_label = [
        Message(id=m.id, data=m.data, ts=m.ts, src=m.src, dst=m.dst,
                sport=m.sport, dport=m.dport, direction=m.direction,
                session_id=m.session_id, label=None)
        for m in trace.messages
    ]
    trace_nl = Trace(messages=msgs_no_label, pairs=trace.pairs,
                     capture_range=trace.capture_range)

    r1 = run_pipeline(trace, cfg, capture=True)
    r2 = run_pipeline(trace_nl, cfg, capture=True)
    meta = {"source_id": "t", "dataset_id": "t", "protocol": "t",
            "file": None, "true_keyword": None, "expected_B": None,
            "dropped_by_cleaning": 0, "cleaning_info": {},
            "n_raw": 8, "load_ms": 0.0}
    o1 = build_overview(r1.trace, meta, cfg)
    o2 = build_overview(r2.trace, meta, cfg)

    for stage in ("load", "boundary", "tagging", "candidates",
                  "stage1", "stage2", "cluster"):
        assert o1[stage] == o2[stage], stage
    assert o1["metrics"]["available"] is True
    assert o2["metrics"]["available"] is False


# 7. Consistency: consistency_check(...)["ok"] is true on the Fig 1 fixture.
def test_consistency():
    cap, cfg, _meta = _fig1_capture()
    result = consistency_check(cap, cfg)
    assert result["ok"] is True, result["mismatches"]
    assert result["mismatches"] == []


# 8. Health: a trace whose B == min_len yields boundary_equals_min_len.
def test_health_boundary_equals_min_len():
    msgs = [Message(id=i, data=bytes([0x01, 0x02, 0x03]),
                    ts=1000.0 + i, direction="c2s") for i in range(10)]
    trace = Trace(messages=msgs, pairs=[], capture_range=(1000.0, 1010.0))
    res = run_pipeline(trace, Config(), capture=True)
    items = health_checks(res.trace, {"true_keyword": None}, Config())
    ids = [h["id"] for h in items]
    assert "boundary_equals_min_len" in ids, ids


# 9. Stage error capture: monkeypatch one stage to raise; the response
#    has that stage "error", later stages "skipped", and the envelope
#    status is still "ok".
def test_stage_error_capture():
    cfg = _fig1_config()
    trace = load_hex_lines(FIG1_HEX, cfg)
    original = pipeline_mod.find_boundary

    def boom(**kwargs):
        raise RuntimeError("injected stage failure")

    pipeline_mod.find_boundary = boom
    try:
        res = run_pipeline(trace, cfg, capture=True)
    finally:
        pipeline_mod.find_boundary = original

    cap = res.trace
    assert "boundary" in cap.errors
    meta = {"source_id": "t", "dataset_id": "t", "protocol": "t",
            "file": None, "true_keyword": None, "expected_B": None,
            "dropped_by_cleaning": 0, "cleaning_info": {},
            "n_raw": 8, "load_ms": 0.0}
    overview = build_overview(cap, meta, cfg)
    stages = {s["id"]: s for s in overview["stages"]}
    assert stages["boundary"]["status"] == "error"
    for sid in ("tagging", "candidates", "stage1", "stage2", "cluster", "metrics"):
        assert stages[sid]["status"] == "skipped", sid
    assert overview["status"] == "ok"

# rpkclust/model.py — Frozen Data Models

## Lines 1-7
Imports `dataclass`, `field`; typing `Optional`, `List`, `Dict`, `Tuple`, `Any`.

## Message (line 8-19) — frozen dataclass
Fields: `id` (int), `data` (bytes), `ts` (float, default 0.0), `src`/`dst` (str, "127.0.0.1"), `sport`/`dport` (int, 0), `direction` (str, "c2s"), `session_id` (int, 0), `label` (Optional[str], None — ground truth only).

## Pair (line 21-26) — frozen
Fields: `req_id`, `resp_id`, `session_id`, `dt` (float, 0.0).

## Trace (line 28-32) — frozen
Fields: `messages` (List[Message]), `pairs` (List[Pair], default []), `capture_range` (tuple, default (0.0,0.0)).

## Hit (line 34-40) — frozen (alias DetectionResult)
Fields: `rule` (str), `offset` (int), `length` (int), `info` (dict, default {}). Represents a detector match.

## Candidate (line 45-54) — frozen
Fields: `region` ("FOR"/"NFOR"), `offset`, `length`, `kind` ("window"/"tlv"), `direction` ("both"/"c2s"/"s2c"), `tlv_type` (Optional[bytes]), `endian` ("big"), `t_len` (1), `l_len` (1).

## Candidate.extract (lines 56-93) — method
- FOR: direct slice `m.data[offset:offset+length]` if message long enough.
- NFOR with `tlv_type`: byte-by-byte scan; reads tag via `t_len`; reads value length via `l_len`; returns combined T-V (`m.data[off:off+t_len] + m.data[val_start:val_end]`). Uses stored lengths — no guessing.
- NFOR without `tlv_type`: offset-based extraction.
- Returns `None` if extraction fails (message too short or no TLV match).

## Candidate.key (lines 95-96)
Returns tuple of all identifying fields for dictionary lookup/comparison.

## BoundaryResult (line 98-103)
Mutable. `B`, `hits` (List[Hit]), `min_len`, `direction`.

## ScoredCandidate (line 105-114)
Mutable. `candidate`, `p_m`, `p_r`, `p_s`, `p_d`, `p_f`, `rank`, `clusters` dict.

## Stage1Result (line 116-120)
Mutable. `ranking` (List[ScoredCandidate]), `top_k` (List[Candidate]), `details` dict.

## KeywordResult (line 122-130)
Mutable. `direction`, `candidate`, `posterior`, `p_bit`, `p_offset`, `p_f`, `ranking` (List[Dict]).

## Result (line 132-139)
Mutable. `boundary`, `candidates`, `keywords` (Dict[str, Optional[KeywordResult]]), `clusters`, `diagnostics`, `trace` optional.

## PipelineCapture (line 141-162)
Mutable (read-only after build). Reads all intermediates for Pipeline Tracker. Fields: `messages`, `pairs`, `capture_range`, `boundary` (optional), `tag_hits`, `cand_boundary`, `candidates`, `cand_diagnostics`, `stage1`, `stage2`, `clusters`, `metrics`, `timing`, `errors`.

## Convention
Message-level structs frozen; pipeline results mutable (constructed incrementally). `from __future__ import annotations` not present in this file but convention per AGENTS.md.

# RPKClust Code Explanation Index

## Files by Module

| File | Module | Description |
|---|---|---|
| `_init__.py.md` | `rpkclust/__init__.py` | Package init |
| `model.py.md` | `rpkclust/model.py` | Frozen data models (Message, Pair, Trace, Hit, Candidate, BoundaryResult, ScoredCandidate, Stage1Result, KeywordResult, Result, PipelineCapture) |
| `config.py.md` | `rpkclust/config.py` | Config dataclass (~30 hyperparameters + serialization) |
| `pipeline.py.md` | `rpkclust/pipeline.py` | Pipeline orchestration (7 stages, capture mode, JSON export) |
| `boundary.py.md` | `rpkclust/boundary.py` | Algorithm 1: FOR-NFOR boundary detection |
| `catalog.py.md` | `rpkclust/catalog.py` | Dataset catalog (NetPlier, ICS Real) |
| `cli.py.md` | `rpkclust/cli.py` | CLI (run, eval, bench) |
| `metrics.py.md` | `rpkclust/metrics.py` | Homogeneity/Completeness/V-measure |
| `cluster.py.md` | `rpkclust/cluster.py` | Message clustering by keyword |
| `trace.py.md` | `rpkclust/trace.py` | Pipeline Tracker (read-only tracing, health checks, consistency) |

## Detectors (`rpkclust/detectors/`)
| File | Detector |
|---|---|
| `detectors_base.py.md` | `base.py` — Context + Detector Protocol |
| `detectors_registry.py.md` | `registry.py` — BOUNDARY_RULES, EXTRA_RULES, get_detectors, all_hits |
| `detectors_constant.py.md` | `constant.py` — ConstantDetector |
| `detectors_sequence.py.md` | `sequence.py` — SequenceDetector |
| `detectors_timestamp.py.md` | `timestamp.py` — TimestampDetector |
| `detectors_sparse.py.md` | `sparse.py` — SparseDetector |
| `detectors_address.py.md` | `address.py` — AddressDetector |
| `detectors_checksum.py.md` | `checksum.py` — ChecksumDetector + calc_* functions |
| `detectors_float_rule.py.md` | `float_rule.py` — FloatDetector |
| `detectors_length_rule.py.md` | `length_rule.py` — LengthDetector |

## Candidates (`rpkclust/candidates/`)
| File | Description |
|---|---|
| `candidates_init.py.md` | `__init__.py` — merge + dedup + cap |
| `candidates_for_region.py.md` | `for_region.py` — Algorithm 2: FOR sliding windows |
| `candidates_nfor_tlv.py.md` | `nfor_tlv.py` — Algorithm 3: NFOR TLV detection |

## Constraints (`rpkclust/constraints/`)
| File | Description |
|---|---|
| `constraints_init.py.md` | `__init__.py` |
| `constraints_posterior.py.md` | `posterior.py` — Star factor graph + two-stage combination |
| `constraints_stage1.py.md` | `stage1.py` — 4 clustering constraints (similarity, coupling, structure, dimension) |
| `constraints_stage2.py.md` | `stage2.py` — Self-constraints (bit-use, position) + final keyword selection |

## I/O (`rpkclust/io/`)
| File | Description |
|---|---|
| `io_init.py.md` | `__init__.py` |
| `io_loader.py.md` | `loader.py` — PCAP/PCAPNG parser, hex-lines, CSV loader |
| `io_sessions.py.md` | `sessions.py` — Session tracking, direction assignment, pairing |

## Other modules (not yet documented)
- `rpkclust/api_runner.py` — JSON stdin/stdout API (get_sources, benchmark_all, run_dataset, run_custom, cluster_messages, pipeline_trace, message_trace, simulate_error)
- `rpkclust/eval/__init__.py` — package init
- `rpkclust/eval/ground_truth.py` — Ground-truth extractors + benchmark runner (protocol cleaning, Modbus truncation, SMB filtering, 10-protocol keyword registry)
- `rpkclust/detectors/__init__.py` — re-exports

## Notes
- All files use `from __future__ import annotations` where applicable.
- Frozen dataclasses for data models; mutable for pipeline results.
- `Optional[X]` instead of `X | None` for Python 3.10 compatibility.
- Pure-Python fallbacks where sklearn unavailable.
# rpkclust/candidates/nfor_tlv.py

## Input: messages, boundary_b (B from boundary stage)

Steps:
1. Extract NFOR slices `m.data[B:]` for messages with len > B.
2. Scan byte-by-byte for TLV patterns.
3. Validate TLV: `offset + t_len + l_len + len_val ≤ len(m)`, `len_val ≥ 0`, and either reaches end of message or followed by another valid TLV (chain consistency).
4. For each valid TLV: create `Candidate(region="NFOR", offset=first_offset, length=v_len, kind="tlv", tlv_type=t_tag, endian, t_len, l_len)`.

## TLV defaults (R-08, D-04)
- `t_len=1`, `l_len=1`, `endian="big"`.
- Grid search over `(1,2) × (1,2) × (big,little)` enabled via `config.tlv_auto_params=True`.
- Filters: `tlv_min_repeats=2`, `tlv_min_coverage=0.6`, `tlv_min_presence=0.8`, `tlv_max_type_cardinality=255`.

## Candidate extraction (model.py)
- NFOR TLV with `tlv_type`: scan byte-by-byte for tag; read length using stored `t_len`/`l_len`; return combined T-V (`type_bytes + value_bytes`), not just value.
- If `tlv_type` is None: fallback to offset-based extraction.

## Notes
- R-01: combined T-V used as keyword.
- D-12: T-V combined, not just value.
- D-13: t_len/l_len stored explicitly; no guessing heuristic (`1 if len <= 255 else 2`).
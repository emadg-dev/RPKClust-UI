# rpkclust/config.py — Configuration Dataclass

## Lines 1-4
Docstring: single source of truth for all parameters, thresholds, options.

## Config (line 10) — frozen? NO, @dataclass (not frozen). Supports to_dict/to_json/from_dict/from_json.

### Boundary & FOR candidate generation params (lines 13-48)
- `fo_lengths_for_candidates`: Tuple[int,...] = (1,2,4) — D-02 standard field sizes.
- `candidate_max_distinct_ratio`: Optional[float] = None — R-07 opt-in cardinality pre-filter.
- `tlv_auto_params`: bool = False — fixed (1,1,big) unless True (D-15 grid search).
- `tlv_t_len`: int = 1; `tlv_l_len`: int = 1; `tlv_endian`: str = "big".
- `tlv_t_lens`: Tuple = (1,2); `tlv_l_lens`: Tuple = (1,2); `tlv_endians`: Tuple = ("big","little").
- `tlv_min_repeats`: 2; `tlv_min_coverage`: 0.6; `tlv_min_presence`: 0.8; `tlv_max_type_cardinality`: 255.
- `const_max_len`: 8; `seq_match_ratio`: 1.0; `timestamp_slack_s`: 86400.0; `sparse_ratio`: 0.02.
- `address_corr_threshold`: -0.8; `checksum_algorithms`: list ["sum8","xor8","crc8","crc16-ccitt","crc16-modbus","crc16-dnp","crc32"].
- `float_min_distinct`: 5; `enable_float`: True; `enable_length`: True.
- `for_exclude_rules`: list ["constant","sequence","timestamp","float","length","checksum","address"].

### Boundary detection params (lines 50-55)
- `boundary_per_direction`: False (D-01); `boundary_require_contiguous`: False; `boundary_min_msgs`: 20.
- `boundary_include_extra_rules`: False (R-05, D-11) — include Float+Length in boundary scan.

### Stage 1 params (lines 57-66)
- `stage1_top_k`: 5 (R-19, D-22); `sim_sample_size`: 200; `sim_sample_pairs`: 20000.
- `pair_min_ratio`: 0.3; `struct_mode`: "length"; `predicate_mode`: "per_cluster".
- `stage1_normalize`: False (R-10, D-16); `norm_range`: (0.1, 0.95); `prob_clip`: None (R-12, D-17).

### Stage 2 params (lines 68-73)
- `pos_for`: Tuple (0.95, 0.01, 0.70) base,slope,floor; `pos_nfor`: 0.60.
- `bituse_endian`: "big" (R-19/D-19); `dmax_mode`: "max_over_m" (R-18/D-18).

### General params (lines 75-85)
- `cluster_label_mode`: "per_direction" (R-18/D-21).
- `seed`: 0; `session_gap_s`: 300.0; `direction_mode`: "port" ("port"/"first_packet"/"none"); `max_candidates`: 64.

### Serialization (lines 87-104)
- `to_dict()` — dataclasses.asdict → dict.
- `to_json(indent)` — JSON string.
- `from_dict(data)` — construct default Config, set fields from dict, converting lists back to tuples where current value is a tuple.
- `from_json(json_str)` — json.loads + from_dict.

## Notes
- `enable_float`/`enable_length` are set True by default in Config (lines 43-44) but excluded from boundary by default via `boundary_include_extra_rules=False` (line 55); they are used in FOR exclusion and boundary when toggled.
- `prob_clip` default None = only numeric guard (1e-12). Hard clamp [0.01,0.99] causes rank ties per D-17.

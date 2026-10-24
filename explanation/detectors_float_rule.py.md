# rpkclust/detectors/float_rule.py

FloatDetector: `name="float"`, `lengths=(4,8)`; enabled only if `config.enable_float` is True.
`check()`: for each endian, unpack via struct (fmt "f"/"d"); reject NaN/Inf; reject if abs(val) < 1e-6 or > 1e9 unless val==0. Unique count ≥ float_min_distinct (default 5); non-integer count ≥ 30% of decoded. Prevents false positives from large round integers. Returns Hit with info: endian, unique_count. R-05: excluded from boundary by default; included in FOR-candidate exclusion.
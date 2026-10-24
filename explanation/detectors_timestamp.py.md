# rpkclust/detectors/timestamp.py

TimestampDetector: `name="timestamp"`, `lengths=(4,8)`.
`check()`: extract capture range (t_start,t_end) from ctx; if invalid, fallback to message timestamps. For each endian, interpret k-bit slices as unsigned int; for k=4 check if all within [window_min, window_max] → unix sec; k=8 check unix ms, unix sec-int64. Return Hit if all slices validate inside ±slack(Δ) window. Detects unix epoch timestamps.
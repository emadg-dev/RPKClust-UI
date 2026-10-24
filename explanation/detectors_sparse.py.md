# rpkclust/detectors/sparse.py

SparseDetector: `name="sparse"`, `lengths=(1,2)`.
`check()`: ensure 0 not in unique values; compute ratio unique / 2^(8k); for k=1 max 5 unique values (≤5% of 256); for k=2 max 10 unique values (≤15% of slices). Must satisfy ratio ≤ sparse_ratio=0.02. Returns Hit with info: unique_count, ratio, k. D-B1: zero values excluded.
# rpkclust/metrics.py — Homogeneity, Completeness, V-measure

## Lines 1-13
- Import `math`, `Counter`, `defaultdict`; try `from sklearn.metrics import homogeneity_completeness_v_measure as _sklearn_hcv` — if not found, `_sklearn_hcv = None`.

## _pure_homogeneity_completeness_v_measure (lines 15-69)
- Input: `labels_true`, `labels_pred` (lists).
- n = len(labels_true).
- If n == 0 → return (1.0, 1.0, 1.0).
- Classes = Counter(labels_true); clusters = Counter(labels_pred).
- Homogeneity (h):
  - If len(classes) <= 1 → h = 1.0.
  - Else compute h_c = -Σ (cnt / n) * log(cnt / n) for each class.
  - Contingency: defaultdict(Counter) → for each pair (t,p) count t in p.
  - h_c_k = Σ (cnt / n) * log(cnt / k_sum) where k_sum = Σ p_counts for class t.
  - h = 1 - (h_c_k / h_c) if h_c > 0 else 1.0.
- Completeness (c):
  - If len(clusters) <= 1 → c = 1.0.
  - Else h_k = -Σ (cnt / n) * log(cnt / n) for each class t (true label).
  - h_k_c = Σ (cnt / n) * log(cnt / c_sum) where c_sum = Σ c_vals for class t.
  - c = 1 - (h_k_c / h_k) if h_k > 0 else 1.0.
- V-measure (v):
  - If h + c <= 0 → v = 0.0.
  - Else v = 2 * h * c / (h + c).
- All values clamped to [0.0, 1.0].

## compute_metrics (lines 72-90)
- If no labels or mismatch lengths → (0,0,0).
- If sklearn available → call _sklearn_hcv → return floats.
- Else call _pure_homogeneity_completeness_v_measure → return floats.

## evaluate_clusters_against_messages (lines 93-108)
- Extract labeled messages (m.label is not None).
- Build true_labels = f"{direction}_{label}" for each labeled message.
- Build pred_clusters = [cluster_assignments.get(m.id, "unclassified") for m in labeled_msgs].
- Delegate to compute_metrics().

## Notes
- Uses pure-Python fallback if sklearn not installed; sklearn preferred if available.
- All values clamped to [0.0, 1.0].
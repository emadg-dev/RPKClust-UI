"""
Clustering evaluation metrics: Homogeneity, Completeness, and V-measure (Equations 16-20).
"""

from typing import List, Dict, Tuple, Optional
import math
from collections import Counter, defaultdict
from rpkclust.model import Message

try:
    from sklearn.metrics import homogeneity_completeness_v_measure as _sklearn_hcv
except ImportError:
    _sklearn_hcv = None

def _pure_homogeneity_completeness_v_measure(
    labels_true: List[str],
    labels_pred: List[str]
) -> Tuple[float, float, float]:
    """
    Pure Python calculation of Homogeneity, Completeness, and V-measure
    (Rosenberg & Hirschberg, EMNLP 2007; Equations 16-20 in RPKClust paper).
    """
    n = len(labels_true)
    if n == 0:
        return 1.0, 1.0, 1.0

    classes = Counter(labels_true)
    clusters = Counter(labels_pred)

    # 1. Homogeneity: 1 - H(C|K) / H(C)
    if len(classes) <= 1:
        h = 1.0
    else:
        h_c = -sum((cnt / n) * math.log(cnt / n) for cnt in classes.values())
        contingency = defaultdict(Counter)
        for t, p in zip(labels_true, labels_pred):
            contingency[p][t] += 1

        h_c_k = 0.0
        for p, t_counts in contingency.items():
            k_sum = clusters[p]
            for t, cnt in t_counts.items():
                h_c_k -= (cnt / n) * math.log(cnt / k_sum)

        h = 1.0 - (h_c_k / h_c) if h_c > 0 else 1.0

    # 2. Completeness: 1 - H(K|C) / H(K)
    if len(clusters) <= 1:
        c = 1.0
    else:
        h_k = -sum((cnt / n) * math.log(cnt / n) for cnt in clusters.values())
        contingency_inv = defaultdict(Counter)
        for t, p in zip(labels_true, labels_pred):
            contingency_inv[t][p] += 1

        h_k_c = 0.0
        for t, p_counts in contingency_inv.items():
            c_sum = classes[t]
            for p, cnt in p_counts.items():
                h_k_c -= (cnt / n) * math.log(cnt / c_sum)

        c = 1.0 - (h_k_c / h_k) if h_k > 0 else 1.0

    # 3. V-measure (Harmonic mean of h and c)
    if h + c <= 0.0:
        v = 0.0
    else:
        v = 2.0 * (h * c) / (h + c)

    return max(0.0, min(1.0, float(h))), max(0.0, min(1.0, float(c))), max(0.0, min(1.0, float(v)))

def compute_metrics(
    true_labels: List[str],
    pred_clusters: List[str]
) -> Tuple[float, float, float]:
    """
    Calculate Homogeneity, Completeness, and V-measure.
    Uses pure-Python algorithm matching equations (16)-(20) (or scikit-learn if available).
    """
    if not true_labels or not pred_clusters or len(true_labels) != len(pred_clusters):
        return 0.0, 0.0, 0.0

    if _sklearn_hcv is not None:
        try:
            h, c, v = _sklearn_hcv(true_labels, pred_clusters)
            return float(h), float(c), float(v)
        except Exception:
            pass

    return _pure_homogeneity_completeness_v_measure(true_labels, pred_clusters)


def evaluate_clusters_against_messages(
    messages: List[Message],
    cluster_assignments: Dict[int, str]
) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    """
    Evaluate cluster assignments against ground-truth labels present in messages.
    If messages don't have ground truth labels, returns (None, None, None).
    """
    labeled_msgs = [m for m in messages if m.label is not None]
    if not labeled_msgs:
        return None, None, None

    true_labels = [f"{m.direction}_{m.label}" for m in labeled_msgs]
    pred_clusters = [cluster_assignments.get(m.id, "unclassified") for m in labeled_msgs]

    h, c, v = compute_metrics(true_labels, pred_clusters)
    return h, c, v

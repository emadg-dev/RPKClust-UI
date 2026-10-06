"""
Clustering evaluation metrics: Homogeneity, Completeness, and V-measure (Equations 16-20).
"""

from typing import List, Dict, Tuple, Optional
import math
from collections import Counter
from sklearn.metrics import homogeneity_completeness_v_measure
from rpkclust.model import Message

def compute_metrics(
    true_labels: List[str],
    pred_clusters: List[str]
) -> Tuple[float, float, float]:
    """
    Calculate Homogeneity, Completeness, and V-measure.
    Uses scikit-learn standard evaluation matching paper equations (16)-(20).
    """
    if not true_labels or not pred_clusters or len(true_labels) != len(pred_clusters):
        return 0.0, 0.0, 0.0

    h, c, v = homogeneity_completeness_v_measure(true_labels, pred_clusters)
    return float(h), float(c), float(v)


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

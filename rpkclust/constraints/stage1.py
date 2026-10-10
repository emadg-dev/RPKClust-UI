"""
Stage 1: Clustering Constraint Inference (NetPlier-style constraints without global MSA).
Evaluates Message Similarity, Remote Coupling, Structural Consistency, and Dimension constraints.
"""

from typing import List, Dict, Tuple, Optional, Any
import difflib
import random
from rpkclust.model import Message, Candidate, Pair, ScoredCandidate, Stage1Result
from rpkclust.config import Config
from rpkclust.constraints.posterior import compute_star_posterior

def compute_pairwise_similarity(
    msg_a: Message,
    msg_b: Message,
    boundary_b: int
) -> float:
    """
    Alignment-free similarity surrogate (Decision D-07):
    Positional exact match within FOR [0, B) + sequence matching within NFOR.
    """
    data_a = msg_a.data
    data_b = msg_b.data
    len_a = len(data_a)
    len_b = len(data_b)

    if len_a + len_b == 0:
        return 1.0

    # 1. FOR region positional matches
    for_len = min(boundary_b, min(len_a, len_b))
    for_matches = 0
    if for_len > 0:
        for_matches = sum(1 for i in range(for_len) if data_a[i] == data_b[i])

    # 2. NFOR region sequence matching
    nfor_a = data_a[boundary_b:boundary_b + 64] if len_a > boundary_b else b""
    nfor_b = data_b[boundary_b:boundary_b + 64] if len_b > boundary_b else b""

    nfor_matches = 0
    if nfor_a and nfor_b:
        matcher = difflib.SequenceMatcher(None, nfor_a, nfor_b, autojunk=False)
        nfor_matches = sum(match.size for match in matcher.get_matching_blocks())

    denom = for_len * 2 + len(nfor_a) + len(nfor_b)
    if denom == 0:
        return 1.0
    total_matches = for_matches + nfor_matches
    return min(1.0, (2.0 * total_matches) / denom)


def compute_eer(inner_scores: List[float], inter_scores: List[float]) -> float:
    """Compute Equal Error Rate (EER) between intra-cluster and inter-cluster similarities."""
    if not inner_scores or not inter_scores:
        return 0.90  # High error if degenerate

    thresholds = [i / 100.0 for i in range(101)]
    n_inter = len(inter_scores)
    n_inner = len(inner_scores)

    best_diff = float("inf")
    best_eer = 0.90

    for t in thresholds:
        fmr = sum(1 for s in inter_scores if s >= t) / n_inter
        fnmr = sum(1 for s in inner_scores if s < t) / n_inner
        diff = abs(fmr - fnmr)
        if diff < best_diff:
            best_diff = diff
            best_eer = (fmr + fnmr) / 2.0

    return float(best_eer)


def evaluate_stage1(
    messages: List[Message],
    candidates: List[Candidate],
    boundary_b: int,
    config: Config,
    pairs: Optional[List[Pair]] = None,
    direction: str = "c2s"
) -> Stage1Result:
    """
    Run Stage 1 constraint inference across all candidate fields for a specific direction.
    """
    if pairs is None:
        pairs = []

    target_msgs = [m for m in messages if m.direction == direction] if direction in ("c2s", "s2c") else messages
    if not target_msgs or not candidates:
        return Stage1Result(ranking=[], top_k=[])

    # Precompute sampled similarity matrix
    rng = random.Random(config.seed)
    n_msgs = len(target_msgs)
    sample_indices = list(range(n_msgs))
    if n_msgs > config.sim_sample_size:
        sample_indices = rng.sample(sample_indices, config.sim_sample_size)

    sample_msgs = [target_msgs[i] for i in sample_indices]
    idx_map = {orig_i: s_i for s_i, orig_i in enumerate(sample_indices)}

    sim_matrix = [[0.0] * len(sample_msgs) for _ in range(len(sample_msgs))]
    for i in range(len(sample_msgs)):
        sim_matrix[i][i] = 1.0
        for j in range(i + 1, len(sample_msgs)):
            s = compute_pairwise_similarity(sample_msgs[i], sample_msgs[j], boundary_b)
            sim_matrix[i][j] = s
            sim_matrix[j][i] = s

    # Message pairs lookup
    opposite_msgs = [m for m in messages if m.direction != direction]
    opposite_ids = {m.id for m in opposite_msgs}
    req_to_resp = {p.req_id: p.resp_id for p in pairs}
    resp_to_req = {p.resp_id: p.req_id for p in pairs}
    pair_map = req_to_resp if direction == "c2s" else resp_to_req

    raw_candidates_data = []

    for cand in candidates:
        # Cluster messages by candidate value
        clusters: Dict[Optional[bytes], List[int]] = {}
        for m in target_msgs:
            val = cand.extract(m)
            clusters.setdefault(val, []).append(m.id)

        unique_vals = set(clusters.keys()) - {None}

        # If field has <= 1 distinct non-null value in this direction, it cannot cluster messages
        if len(unique_vals) <= 1:
            raw_candidates_data.append({
                "candidate": cand,
                "raw_m": 0.01,
                "raw_r": 0.01,
                "raw_s": 0.01,
                "p_d": 0.01,
                "clusters": clusters
            })
            continue

        # 1. Message Similarity Constraint p_m = 1 - EER
        # Map clusters into sample indices
        id_to_sample_idx = {m.id: s_idx for s_idx, m in enumerate(sample_msgs)}
        inner_pairs = []
        inter_pairs = []

        for s_i in range(len(sample_msgs)):
            msg_i = sample_msgs[s_i]
            val_i = cand.extract(msg_i)
            for s_j in range(s_i + 1, len(sample_msgs)):
                msg_j = sample_msgs[s_j]
                val_j = cand.extract(msg_j)
                score = float(sim_matrix[s_i][s_j])
                if val_i == val_j and val_i is not None:
                    inner_pairs.append(score)
                else:
                    inter_pairs.append(score)

        if inner_pairs and inter_pairs:
            eer = compute_eer(inner_pairs, inter_pairs)
            raw_p_m = 1.0 - eer
        else:
            raw_p_m = 0.10

        # 2. Remote Coupling Constraint p_r
        # Measure mutual similarity of partner response messages across pairs
        paired_count = sum(1 for m in target_msgs if m.id in pair_map)
        all_msg_by_id = {m.id: m for m in messages}

        if paired_count >= config.pair_min_ratio * len(target_msgs) and paired_count > 0:
            weighted_pr_sum = 0.0
            total_paired = 0

            for c_val, c_msg_ids in clusters.items():
                c_partners = [pair_map[m_id] for m_id in c_msg_ids if m_id in pair_map]
                if not c_partners:
                    continue
                if len(c_partners) <= 1:
                    # Singletons provide NO evidence of remote coupling
                    c_pr = 0.10
                else:
                    # Measure intra-type similarity of response messages
                    pair_sims = []
                    sub_sample = c_partners[:5]
                    for i_p in range(len(sub_sample)):
                        for j_p in range(i_p + 1, len(sub_sample)):
                            r1 = all_msg_by_id.get(sub_sample[i_p])
                            r2 = all_msg_by_id.get(sub_sample[j_p])
                            if r1 and r2:
                                pair_sims.append(compute_pairwise_similarity(r1, r2, boundary_b))
                    c_pr = float(sum(pair_sims) / len(pair_sims)) if pair_sims else 0.10

                weighted_pr_sum += (len(c_partners) / paired_count) * c_pr
                total_paired += len(c_partners)

            raw_p_r = weighted_pr_sum if total_paired > 0 else 0.50
        else:
            raw_p_r = 0.50  # Neutral if one-way traffic or missing pairs

        # 3. Structure Consistency Constraint p_s
        # Measure length variance within each cluster (singletons penalized)
        weighted_ps_sum = 0.0
        msg_len_map = {m.id: len(m.data) for m in target_msgs}

        for c_val, c_msg_ids in clusters.items():
            c_lens = [msg_len_map[m_id] for m_id in c_msg_ids]
            if len(c_lens) <= 1:
                c_ps = 0.10  # Singletons provide no evidence of length coherence
            else:
                sorted_l = sorted(c_lens)
                n_l = len(sorted_l)
                median_l = float(sorted_l[n_l // 2] if n_l % 2 == 1 else (sorted_l[n_l // 2 - 1] + sorted_l[n_l // 2]) / 2.0)
                max_l = float(max(c_lens))
                if max_l > 0:
                    gap_proxy = float(sum(abs(l - median_l) for l in c_lens) / len(c_lens)) / max_l
                    c_ps = max(0.0, 1.0 - gap_proxy)
                else:
                    c_ps = 1.0
            weighted_ps_sum += (len(c_msg_ids) / len(target_msgs)) * c_ps

        raw_p_s = weighted_ps_sum

        # 4. Dimension Constraint p_d
        unique_vals = set(clusters.keys()) - {None}
        r_distinct = len(unique_vals) / max(len(target_msgs), 1)
        single_item_clusters = sum(1 for c_msgs in clusters.values() if len(c_msgs) == 1)
        r_single = single_item_clusters / max(len(clusters), 1)

        if r_distinct <= 0.5 and r_single < 0.5:
            p_d = 0.95
        else:
            p_d = 0.01  # Hard penalty for high-cardinality noise
            raw_p_m = min(raw_p_m, 0.20)
            raw_p_r = min(raw_p_r, 0.20)
            raw_p_s = min(raw_p_s, 0.20)

        raw_candidates_data.append({
            "candidate": cand,
            "raw_m": raw_p_m,
            "raw_r": raw_p_r,
            "raw_s": raw_p_s,
            "p_d": p_d,
            "clusters": clusters
        })

    # R-10: Stage 1 posterior is each candidate's prior (Eq. 14).
    # Normalization across candidates is NOT in the paper — off by default.
    if config.stage1_normalize:
        low_norm, high_norm = config.norm_range

        def normalize(vals: List[float]) -> List[float]:
            min_v = min(vals) if vals else 0.0
            max_v = max(vals) if vals else 1.0
            if max_v > min_v:
                return [low_norm + ((v - min_v) / (max_v - min_v)) * (high_norm - low_norm) for v in vals]
            return [0.50 for _ in vals]

        norm_m = normalize([d["raw_m"] for d in raw_candidates_data])
        norm_r = normalize([d["raw_r"] for d in raw_candidates_data])
        norm_s = normalize([d["raw_s"] for d in raw_candidates_data])
    else:
        norm_m = [d["raw_m"] for d in raw_candidates_data]
        norm_r = [d["raw_r"] for d in raw_candidates_data]
        norm_s = [d["raw_s"] for d in raw_candidates_data]

    scored: List[ScoredCandidate] = []
    # R-11: p_arrow and p_back are NetPlier-originated constants, documented in DECISIONS (D-09)
    p_arrow = {"sim": 0.8, "coupling": 0.9, "struct": 0.9, "dim": 0.9}
    p_back = {"sim": 0.8, "coupling": 0.8, "struct": 0.8, "dim": 0.7}

    for idx, d in enumerate(raw_candidates_data):
        cand = d["candidate"]
        p_m = norm_m[idx]
        p_r = norm_r[idx]
        p_s = norm_s[idx]
        p_d = d["p_d"]

        p_obs = {
            "sim": p_m,
            "coupling": p_r,
            "struct": p_s,
            "dim": p_d,
        }

        # R-12: pass prob_clip from config (default None = no clamp, only numeric guard)
        p_f = compute_star_posterior(p_obs, p_arrow, p_back, prob_clip=config.prob_clip)

        scored.append(ScoredCandidate(
            candidate=cand,
            p_m=p_m,
            p_r=p_r,
            p_s=p_s,
            p_d=p_d,
            p_f=p_f,
            clusters=d["clusters"]
        ))

    # Rank by p_f descending
    scored.sort(key=lambda s: s.p_f, reverse=True)
    for r_idx, s in enumerate(scored):
        s.rank = r_idx + 1

    top_k = [s.candidate for s in scored[:config.stage1_top_k]]

    return Stage1Result(
        ranking=scored,
        top_k=top_k,
        details={"total_evaluated": len(scored), "direction": direction}
    )

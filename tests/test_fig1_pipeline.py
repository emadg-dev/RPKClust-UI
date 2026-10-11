from rpkclust.io.loader import load_hex_lines
from rpkclust.config import Config
from rpkclust.pipeline import run_pipeline

def test_fig1_pipeline_reproduction():
    # 8 messages from the toy trace
    # m1: Read, m2: Response, m3: Read, m4: Response,
    # m5: Write, m6: Response, m7: Write, m8: Response
    fig1_hex = """
    05 64 0b c4 44 33 33 44 ac d1 c6 c5 01 3c 00 00 93 24 Read
    05 64 0a 44 33 44 44 33 6e 25 e0 c5 81 00 00 02 ee Response
    05 64 0b c4 44 33 33 44 ac d1 c7 c6 01 3c 00 00 7e f4 Read
    05 64 0a 44 33 44 44 33 6e 25 e1 c6 81 00 00 45 c7 Response
    05 64 0b c4 44 33 33 44 ac d1 c8 c7 02 50 01 2b 00 00 Write
    05 64 0a 44 33 44 44 33 6e 25 e2 c7 81 00 00 a7 60 Response
    05 64 0d c4 44 33 33 44 6d c3 c6 c6 02 50 01 00 00 00 00 34 Write
    05 64 0b 44 33 44 44 33 7c ae c6 c6 81 00 00 00 36 71 Response
    """
    # Use config matching original algorithm behavior for toy trace
    cfg = Config()
    cfg.stage1_normalize = False
    cfg.prob_clip = None
    cfg.predicate_mode = "mean"
    trace = load_hex_lines(fig1_hex, cfg)
    assert len(trace.messages) == 8

    res = run_pipeline(trace, cfg)

    # 1. Boundary must cover FOR (B >= 13)
    assert res.boundary.B >= 13

    # 2. Offset 12 must be present in candidate pool
    offsets_len = [(c.offset, c.length) for c in res.candidates]
    assert (12, 1) in offsets_len

    # 3. Check clustering on offset 12
    # Client requests m1, m3 (0x01) -> Cluster A; m5, m7 (0x02) -> Cluster B
    # Server responses m2, m4, m6, m8: keyword at offset 2 splits responses (3 with 0x0a44, 1 with 0x0b44)
    c_m1 = res.clusters[0]
    c_m2 = res.clusters[1]
    c_m3 = res.clusters[2]
    c_m4 = res.clusters[3]
    c_m5 = res.clusters[4]
    c_m6 = res.clusters[5]
    c_m7 = res.clusters[6]
    c_m8 = res.clusters[7]

    # Per-direction clusters:
    # c2s: m1,m3 (0x01) -> Cluster A; m5,m7 (0x02) -> Cluster B
    # s2c: keyword at offset 2 splits responses (3 with 0x0a44, 1 with 0x0b44)
    # m1 and m3 (both c2s, value 0x01) must share same cluster
    assert c_m1 == c_m3
    # m5 and m7 (both c2s, value 0x02) must share same cluster
    assert c_m5 == c_m7
    # m2, m4, m6 share same cluster (0x0a44 at offset 2)
    assert c_m2 == c_m4 == c_m6
    # m8 has different value at offset 2 (0x0b44)
    assert c_m8 != c_m2

    # c2s clusters != s2c clusters
    assert c_m1 != c_m5
    assert c_m1 != c_m2
    assert c_m5 != c_m2
    # Also verify c2s and s2c are separated
    assert c_m1.startswith("c2s_")
    assert c_m2.startswith("s2c_")

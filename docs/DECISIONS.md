# DECISIONS.md

This document tracks all design and mathematical decisions made for RPKClust where the paper left parameters or algorithms underspecified.

| ID | Decision | Reason |
|---|---|---|
| D-01 | Boundary B and candidates are computed per direction (client / server), with shared boundary scan option | NetPlier infers per side; headers may differ per direction. By default joint boundary is computed or per-direction. |
| D-02 | Candidate window lengths $L \in \{1, 2, 4\}$ | Paper says "variable sliding window", standard binary fields are 1, 2, or 4 bytes. |
| D-03 | No "dynamic expansion" in v1 (Alg. 1 only); provide hook `expand_boundary(b, M)` that returns b unchanged | "Boundary Dynamic Expansion" is shown in Figure 6 but never specified in the paper text. |
| D-04 | $t\_len \in \{1, 2\}$, $l\_len \in \{1, 2\}$, both big and little endian for TLV | Standard binary protocols use 1-byte or 2-byte type and length headers. |
| D-05 | Sub-byte (bit-level) keywords unsupported in v1 | Paper explicitly identifies this as a limitation (e.g. NTP 3-bit mode field). |
| D-06 | Stage-1 posterior computed in closed form (star factor graph) | NetPlier factor graph forms a star graph centered on latent keyword node $K$; marginalization is closed-form. |
| D-07 | Similarity and structure-coherence use alignment-free surrogates | The core thesis of RPKClust is avoiding global MSA. Similarity uses FOR positional match + NFOR sequence match; structure coherence uses length variance proxy. |
| D-08 | Add Length detector; exclude Length and Checksum from FOR candidates | Mavlink analysis in paper explicitly mentions LEN was filtered by semantics, but paper Section 3.3 omitted Length detector definition. |
| D-B1 | Bit-use MSB computation skips zero values | $v=0$ has no active bit; set bits start from 1. |
| D-B2 | $D_{max}$ re-derived from paper description | Paper Equation (9) has garbled bounds in text extraction. Re-derived from extreme case where empirical $Q$ is concentrated at bit position $m$. |
| D-B3 | Bit-use $Q(k)$ computed across multiset of message values | $Q(k)$ is defined as proportion of values in the field where $MSB \ge k$. |

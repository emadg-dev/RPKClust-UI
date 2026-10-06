# ASSUMPTIONS.md

Assumptions and defaults chosen during the implementation of RPKClust:

1. **Checksum detection**: Checks algorithms `sum8`, `xor8`, `crc8`, `crc16-ccitt`, `crc16-modbus`, `crc16-dnp` (poly 0x3D65), and `crc32`. Data ranges evaluated are `[0, offset)` (header prefix checksum) and `[0, len - k)` (trailer checksum).
2. **TLV Validation**: `ValidateTLV` verifies that $offset + t\_len + l\_len + len\_val \le len(m)$, $len\_val \ge 0$, and either reaches the end of the message or is followed by another valid TLV structure (chain consistency).
3. **Continuous Window in FOR**: `IsContinuous(FFOR, s, L)` checks that every byte in interval $[s, s + L - 1]$ belongs to the candidate sequence $S$ (unclassified or sparse) and does not overlap excluded semantic fields.
4. **Dimension constraint**: NetPlier's criteria: $r_{distinct} = \text{unique\_values} / N < 0.5$ and $r_{single} = \text{single\_item\_clusters} / \text{total\_clusters} < 0.5 \implies p_d = 0.95$, else $0.10$.
5. **Stage 1 Observation priors**: Normalized to $[0.10, 0.95]$ via min-max scaling before factor graph marginalization.
6. **Bit-use probability**: Theoretical probability $P(k) = 1 - 1 / 2^{MSB + 1 - k}$. Clamped to $[0.01, 0.99]$.
7. **Position factor**: $p_{offset} = \max(0.95 - 0.01 \times offset, 0.70)$ for FOR, and $0.60$ for NFOR.
8. **Final Bayesian update**:
   $M = p_{bit} \times p_{offset} \times p_f$
   $N = (1 - p_{bit}) \times (1 - p_{offset}) \times (1 - p_f)$
   $P(K=1) = M / (M + N)$

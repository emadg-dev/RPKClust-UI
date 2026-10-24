# rpkclust/detectors/length_rule.py

LengthDetector: `name="length"`, `lengths=(1,2,4)`; only active if `config.enable_length` True.
`check()`: if all messages same length → return None (cannot distinguish from constants). For k-bit slices, test both endians. Collect vals per message; usable messages: those with L < max_message_len (500). Two variants: total_len = L - val, remaining_len = offset + val. If any variant has ≥90% of usable msgs agreeing on same c in [-32,32] → return Hit. Else test val+c == len(m)-offset uniqueness in [-32,32]. D-B1/B2 context: cardinality limits apply.
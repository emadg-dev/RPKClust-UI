# rpkclust/detectors/address.py

AddressDetector: `name="address"`, `lengths=(2,3,4)`.
`check()`: requires ≥3 ctx.pairs; build msg_by_id lookup; for each pair check symmetric swap condition req[o:o+w]==resp[o+w:o+2w] and req[o+w:o+2w]==resp[o:o+w]; compute Pearson correlation of integer values across all pairs; if corr ≤ address_corr_threshold (-0.8) → return Hit with width and corr. Also handles constant symmetric address pairs with distinct swapped values. D-20: checksum range is prefix data[:offset] — not applicable to address detector but part of same decision context.
# rpkclust/detectors/registry.py

BOUNDARY_RULES: ordered list [ConstantDetector, SequenceDetector, TimestampDetector, SparseDetector, AddressDetector, ChecksumDetector] — R-05b priority order.
EXTRA_RULES: [FloatDetector, LengthDetector] — only used for FOR-candidate exclusion (R-05), not boundary unless `boundary_include_extra_rules=True`.
DEFAULT_RULES: BOUNDARY_RULES + EXTRA_RULES.
get_detectors(config): if config.boundary_include_extra_rules → return DEFAULT_RULES else return BOUNDARY_RULES (6 by default).
all_hits(messages, config, max_offset=None, pairs=None, detectors=None): loops all offsets 0..limit; all detectors/lengths; slices per message; call d.check(slices,ctx); collect all Hits (not first-match). Returns List[Hit].
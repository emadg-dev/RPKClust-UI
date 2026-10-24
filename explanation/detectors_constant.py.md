# rpkclust/detectors/constant.py

ConstantDetector: `name="constant"`, `lengths=(8,4,2,1)`.
`check()`: if slices non-empty, compare first slice to all others; if all equal, return `Hit(rule="constant", offset=ctx.offset, length=len(first), info={"value": hex, "entropy": 0.0})`. R-06 multi-length.

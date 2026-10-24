# rpkclust/detectors/sequence.py

SequenceDetector: `name="sequence"`, `lengths=(1,2,3,4)`.
`check()`: requires ≥3 slices. Sort messages by timestamp, test both big/little endian. Compute diffs between consecutive sorted values; if all diffs equal and all values within [0, 2^(8k)-1] range → return Hit with step/endian/k. Also checks per-direction monotonic sequences (c2s/s2c separately). Returns Hit with info: step, endian, k, direction.
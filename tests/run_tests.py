"""
Standalone test runner for rpkclust (no external deps).
Works from any working directory.
"""

import os
import sys
import glob
import importlib
import time

HERE = os.path.dirname(os.path.abspath(__file__))
# Project root = directory containing both `tests/` and `rpkclust/`.
ROOT = HERE if os.path.isdir(os.path.join(HERE, "rpkclust")) else os.path.dirname(HERE)
sys.path.insert(0, ROOT)
TESTS_DIR = os.path.join(ROOT, "tests")


def main():
    start = time.time()
    passed = 0
    failed = 0
    errors = []

    test_files = sorted(glob.glob(os.path.join(TESTS_DIR, "test_*.py")))
    if not test_files:
        print(f"ERROR: no test files found in {TESTS_DIR}")
        sys.exit(2)          # never report success when nothing ran

    print(f"Root: {ROOT}")
    print(f"Running rpkclust test suite across {len(test_files)} files...\n")

    for f in test_files:
        mod_name = "tests." + os.path.splitext(os.path.basename(f))[0]
        try:
            mod = importlib.import_module(mod_name)
        except Exception as e:
            failed += 1
            errors.append((f"{mod_name} (import)", repr(e)))
            print(f"ERROR: Failed to import {mod_name}: {e!r}")
            continue

        test_funcs = [
            getattr(mod, n) for n in dir(mod)
            if n.startswith("test_") and callable(getattr(mod, n))
        ]
        for fn in test_funcs:
            test_id = f"{mod_name}.{fn.__name__}"
            try:
                fn()
                passed += 1
                print(f"  PASS: {test_id}")
            except Exception as e:
                failed += 1
                errors.append((test_id, repr(e)))
                print(f"  FAIL: {test_id}: {e!r}")

    elapsed = round(time.time() - start, 3)
    print(f"\nResults: {passed} passed, {failed} failed in {elapsed}s")

    if passed == 0 and failed == 0:
        print("ERROR: no tests were collected.")
        sys.exit(2)
    if errors:
        print("\nFailures:")
        for name, err in errors:
            print(f"  - {name}: {err}")
        sys.exit(1)
    print("All tests passed successfully!")
    sys.exit(0)


if __name__ == "__main__":
    main()
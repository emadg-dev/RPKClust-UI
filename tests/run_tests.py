"""
Simple standalone test runner for rpkclust test suite.
Requires no external dependencies (zero packages needed).
"""

import os
import sys
import glob
import importlib
import time

sys.path.insert(0, os.path.abspath("."))

def main():
    start = time.time()
    passed = 0
    failed = 0
    errors = []

    test_files = sorted(glob.glob("tests/test_*.py"))
    print(f"Running rpkclust test suite across {len(test_files)} files...\n")

    for f in test_files:
        mod_name = f.replace("/", ".").replace(".py", "")
        try:
            mod = importlib.import_module(mod_name)
        except Exception as e:
            failed += 1
            errors.append((f"{mod_name} (import)", str(e)))
            print(f"ERROR: Failed to import {mod_name}: {e}")
            continue

        test_funcs = [getattr(mod, name) for name in dir(mod) if name.startswith("test_") and callable(getattr(mod, name))]
        for fn in test_funcs:
            test_id = f"{mod_name}.{fn.__name__}"
            try:
                fn()
                passed += 1
                print(f"  PASS: {test_id}")
            except Exception as e:
                failed += 1
                errors.append((test_id, str(e)))
                print(f"  FAIL: {test_id}: {e}")

    elapsed = round(time.time() - start, 3)
    print(f"\nResults: {passed} passed, {failed} failed in {elapsed}s")

    if errors:
        print("\nFailures:")
        for name, err in errors:
            print(f"  - {name}: {err}")
        sys.exit(1)
    else:
        print("All tests passed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    main()

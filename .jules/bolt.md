## 2026-09-20 - [Optimize nested value extraction]
**Learning:** Replaced `Array.prototype.reduce` with a `for` loop in `getNestedValue` to avoid closure allocations per iteration and allow early returns on hot paths.
**Action:** Use `for` loops for simple iterative operations on hot paths instead of array methods with closures.

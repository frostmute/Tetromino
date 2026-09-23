## 2024-10-27 - [Avoid micro-optimizations that sacrifice readability]
**Learning:** Replacing functional array methods like `Array.prototype.reduce` with standard `for` loops merely to avoid closure allocations is considered a readability-sacrificing micro-optimization and will be rejected in code review.
**Action:** Do not implement such micro-optimizations. Focus on more significant performance improvements like avoiding N+1 API request bottlenecks, using batched `pMap`, or optimizing memory allocation for Dynamic Programming algorithms.

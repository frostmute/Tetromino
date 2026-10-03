## 2024-05-24 - Dynamic Programming Memory Allocation Optimization
**Learning:** For Dynamic Programming algorithms requiring dense matrices (like the LCS implementation in `src/diff.ts`), using an array of arrays (`number[][]`) creates massive memory overhead due to pointer chasing and object allocations.
**Action:** Use a 1D `Int32Array` (or `Float64Array`) with simulated 2D indexing (`i * cols + j`) to optimize memory allocation and garbage collection, resulting in a dense memory footprint and faster cache accesses.

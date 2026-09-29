## 2023-10-24 - Dynamic Programming Memory Optimization
**Learning:** For Dynamic Programming algorithms requiring dense matrices (like the LCS implementation in `src/diff.ts`), using an array of arrays (`number[][]`) creates massive object allocations and puts significant pressure on the Garbage Collector, especially for large inputs.
**Action:** Use a 1D typed array (like `Int32Array`) with simulated 2D indexing (`i * cols + j`) instead to optimize memory allocation and GC performance.

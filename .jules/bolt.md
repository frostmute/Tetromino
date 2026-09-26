
## 2024-05-14 - Optimize LCS Matrix with Flat Int32Array
**Learning:** For Dynamic Programming algorithms requiring dense matrices (like LCS), using an array of arrays (`number[][]`) creates massive memory allocation and garbage collection overhead in Node/V8.
**Action:** Use a flat, 1D typed array (like `Int32Array`) with simulated 2D indexing (`i * cols + j`) instead of nested arrays to significantly optimize memory allocation and improve performance.

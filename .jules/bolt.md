## 2026-10-02 - Optimize LCS Dynamic Programming Matrix Memory Allocation
**Learning:** Dense matrices implemented as arrays of arrays (e.g., `number[][]`) incur significant memory overhead and garbage collection pauses in V8 due to allocating thousands of individual Array objects.
**Action:** Use a single typed 1D array like `Int32Array` with simulated 2D indexing (`i * cols + j`) to allocate contiguous memory blocks, making it dramatically faster and memory-efficient for dense algorithms like LCS.

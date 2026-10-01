
## 2024-11-20 - [Optimize Dynamic Programming matrices with 1D Int32Array]
**Learning:** For algorithms requiring dense matrices (like LCS), initializing a standard `number[][]` creates an array of arrays. This involves many separate allocations in V8, significantly hurting performance via garbage collection and poor cache locality.
**Action:** Use a 1D `Int32Array` (or `Float64Array`) mapping `(x, y)` to `x * columns + y`. This leads to a single dense allocation, vastly improving memory usage and speeding up tight DP loops.

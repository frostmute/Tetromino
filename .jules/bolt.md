## 2024-05-18 - Promise-based mutex bottleneck
**Learning:** Acquiring a global Promise-based mutex for I/O operations without a fast-path cache check can cause severe bottlenecks under high concurrency, as every single call is queued sequentially regardless of whether the operation was already completed.
**Action:** Use a Double-Checked Locking pattern with a synchronous fast-path check against an in-memory cache before awaiting the global mutex queue.

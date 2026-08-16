## 2024-05-18 - Promise-based mutex bottleneck in ensureFolder
**Learning:** Promise-based mutexes for concurrent filesystem checks (e.g., in `ensureFolder`) can serialize operations and create severe performance bottlenecks under high concurrency, even if the result is already cached.
**Action:** Use a Double-Checked Locking pattern with a synchronous fast-path check against an in-memory cache before awaiting the global mutex queue to keep concurrent I/O fast.


## 2024-05-19 - Double-Checked Locking in Promise Mutexes
**Learning:** Using a single `Promise` queue for mutual exclusion (`ensureFolderMutex`) creates significant overhead under high concurrency, even if the locked operation itself returns early. Every call creates a new Promise object and awaits resolution, leading to a bottleneck.
**Action:** Always implement a synchronous "fast path" check against an in-memory cache *before* acquiring the lock (Double-Checked Locking pattern). This avoids queueing and Promise creation for already-resolved states, dramatically improving throughput under heavy load.

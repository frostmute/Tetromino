## 2024-09-27 - Double-Checked Locking for Promise Mutexes
**Learning:** Promise-based mutex queues (like `ensureFolderMutex`) become severe bottlenecks under high concurrency if all requests wait in the queue before checking if the work is already done.
**Action:** Use a synchronous fast-path check against an in-memory cache (Double-Checked Locking) before awaiting the global mutex queue.

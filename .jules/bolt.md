## 2024-05-19 - Double-Checked Locking in Promise Mutexes
**Learning:** Promise-based mutexes (`let next = new Promise...`) for blocking I/O (like `ensureFolderMutex`) create severe microtask queue bottlenecks under high concurrency if awaited blindly, even for cached/existing entities.
**Action:** Always implement a synchronous "fast path" check (`if (cache.has(key)) return;`) *before* acquiring the global mutex queue. This double-checked locking pattern avoids unnecessary Promise allocation and queue starvation.

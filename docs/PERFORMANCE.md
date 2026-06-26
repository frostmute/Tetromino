---
type: report
title: Tetromino Performance Baseline & Profiling Results
created: 2026-06-26
tags:
  - performance
  - profiling
  - baseline
  - sync-engine
related:
  - "[[sync-engine.ts]]"
  - "[[api.ts]]"
  - "[[templateUtils.ts]]"
---

# Tetromino Performance Baseline & Profiling Results

This document records the initial performance profiling of the Tetromino import pipeline. It establishes baseline metrics against which future optimizations can be compared.

## Profiling Methodology

Profiling was performed via automated tests that simulate large Are.na channel imports using the existing mock infrastructure (`MockVault`, mocked `ArenaApi`). This measures the **local processing overhead** (template rendering, vault I/O, hash computation, diff generation) independent of network latency.

**Instrumentation added:**
- `console.time()` / `console.timeEnd()` calls in `src/sync-engine.ts` at key phases:
  - `arena-sync:channel-metadata:{slug}` — time to fetch channel metadata
  - `arena-sync:fetch-blocks:{slug}` — time to fetch all block pages
  - `arena-sync:block:{id}` — time per block (render + vault write)
  - `arena-sync:asset:{id}` — time to handle attachment downloads
  - `arena-sync:index:{slug}` — time to build and write the channel index note

## Baseline Metrics (Mock Environment)

Tests run on: 2026-06-26
Environment: Jest with in-memory `MockVault`, zero network latency.

### 100-Block Channel

| Metric | Value |
|--------|-------|
| Total channel sync time | ~20 ms |
| Channel metadata fetch | ~0.13 ms |
| Block list fetch | ~0.03 ms |
| Total block processing | ~82.5 ms |
| Average per-block time | ~0.83 ms |
| Total attachment handling | ~25.1 ms |
| Index write | ~0.50 ms |
| **Throughput** | **~5,000 blocks/second** |

### 250-Block Channel

| Metric | Value |
|--------|-------|
| Total channel sync time | ~37 ms |
| Total block processing | ~154.3 ms |
| Average per-block time | ~0.62 ms |
| **Throughput** | **~6,757 blocks/second** |

> **Note:** Per-block time decreases slightly with larger batches due to amortized overhead and the concurrent processing model (5 parallel workers via `pMap`).

## Observed Bottlenecks (Local Processing)

In the mock environment, the dominant costs are:

1. **Block processing (`pullBlock`)** — ~75-80% of total sync time.
   - Sub-components per block:
     - Markdown rendering (`blockToMarkdown`) + hash computation (`computeHash`)
     - Vault read/write/create/modify operations
     - Diff generation (`unifiedDiff`) for `fileDiffs`
2. **Attachment handling (`ensureBlockAsset`)** — ~20-25% of total sync time.
   - Includes `downloadBinary` (mocked as instant) + vault binary write
3. **Index generation (`updateChannelIndex`)** — <1% of total sync time.
4. **API fetching (`getAllChannelBlocksWithProgress`)** — negligible in mocks; will dominate in real-world usage.

## Real-World Expectations

The mock metrics above represent **best-case local processing only**. In production, the actual bottlenecks will shift:

- **API latency** will likely dominate for channels with 100+ blocks. At 100 blocks/page and ~100-300 ms per API call, a 500-block channel could spend 1-2 seconds just on network requests.
- **File I/O** on a real Obsidian vault (especially mobile or network drives) will be slower than the in-memory mock.
- **Attachment downloads** depend heavily on image/file size and network speed.

## How to Re-run Profiling

```bash
# Run the dedicated performance test
npx jest src/__tests__/performance.test.ts --no-coverage

# Run all tests to ensure no regressions
npx jest --no-coverage
```

## API Call Efficiency Review

A targeted review of `src/api.ts` was conducted to optimize network-layer performance.

### Batching

The Are.na API v3 does **not** support fetching multiple arbitrary blocks in a single request. The maximum page size is 100 blocks (`per=100`), which `ArenaApi` already uses. No further batching optimizations are possible at the API level.

### Pagination Efficiency

Pagination is already efficient:
- `PER_PAGE` is set to the API maximum (100).
- `shouldStopPagination` halts early on empty pages, partial pages, reported total pages, or duplicate blocks.
- No over-fetching occurs.

### Retry Logic

Retry behavior is reasonable and resilient:
- **Exponential backoff** with jitter for transient errors (500/502/503/504) and network failures.
- **Max retry cap** of 10 seconds prevents excessive delays.
- **Rate-limit handling** respects the `Retry-After` header from 429 responses.
- `MAX_RETRIES = 3` strikes a balance between resilience and prompt failure.
- `fetchPageWithRetries` adds an outer retry loop (up to 3 consecutive errors per page) on top of `request`'s inner retries, yielding up to 9 total attempts for a single page in the worst case. This provides strong resilience against intermittent flakiness.

### Request Caching (Implemented)

To reduce redundant API calls for metadata that changes infrequently, a **5-minute TTL in-memory cache** was added to `ArenaApi`:

| Method | Cache Key | TTL | Benefit |
|--------|-----------|-----|---------|
| `getChannel(slug)` | `channel:${slug}` | 5 min | Avoids re-fetching channel metadata on every sync of the same channel. |
| `getBlock(id)` | `block:${id}` | 5 min | Eliminates duplicate block detail fetches when the same block appears in multiple contexts. |

**Expected real-world improvement:**
- Re-syncing a channel within 5 minutes skips the `getChannel` call entirely (~100–300 ms saved).
- Block detail fetches (e.g., comments, connected channels) are deduplicated across the same `ArenaApi` instance.
- Cache is per-instance, ensuring different tokens/agents do not share stale data.

### Network Optimization Targets Remaining

1. **Parallelize attachment downloads** — Currently limited by the `pMap` concurrency of 5 for blocks; attachments within a block are sequential.
2. **Real-world API profiling** — Run the plugin in a live Obsidian vault with a real Are.na token and a 100+ block channel to measure true end-to-end time.

## Future Optimization Targets

Based on this profiling, the highest-impact optimizations to investigate are:

1. **Batch vault writes** — If the Obsidian API supports bulk transactions, writing multiple notes at once could reduce per-block overhead.
2. **Parallelize attachment downloads** — Currently limited by the `pMap` concurrency of 5 for blocks; attachments within a block are sequential.
3. **Cache rendered templates** — If the same template is reused across many blocks, caching the parsed AST could shave off parse time.
4. **Diff generation** — `unifiedDiff` is computed for every create/update. For large channels, this may be expensive; consider making diffs optional in non-dry-run mode.

## Related Documents

- [[testing-strategy]] — Test infrastructure used for profiling
- [[sync-engine.ts]] — Core sync logic with timing instrumentation
- [[api.ts]] — API layer with pagination and retry logic

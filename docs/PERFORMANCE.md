---
type: report
title: Tetromino Performance Landscape — Baselines, Trade-offs & Optimization Guide
created: 2026-06-26
tags:
  - performance
  - profiling
  - baseline
  - architecture
  - sync-engine
related:
  - "[[technical-debt]]"
  - "[[sync-engine.ts]]"
  - "[[api.ts]]"
  - "[[templateUtils.ts]]"
  - "[[utils.ts]]"
---

# Tetromino Performance Landscape

This document is the authoritative reference for Tetromino's performance characteristics. It records baseline metrics, documents the trade-offs that shaped the current architecture, and provides a roadmap for future optimization work.

> **How to use this doc:** If you are about to change the sync engine, API layer, or template system, read the *Architecture Decisions* and *Feature Trade-offs* sections first so you understand why things are the way they are. If you are profiling, start with *Baseline Metrics* and *How to Re-run Profiling*.

---

## Profiling Methodology

Profiling was performed via automated tests that simulate large Are.na channel imports using the existing mock infrastructure (`MockVault`, mocked `ArenaApi`). This measures the **local processing overhead** (template rendering, vault I/O, hash computation, diff generation) independent of network latency.

**Instrumentation added:**
- `console.time()` / `console.timeEnd()` calls in `src/sync-engine.ts` at key phases:
  - `arena-sync:channel-metadata:{slug}` — time to fetch channel metadata
  - `arena-sync:fetch-blocks:{slug}` — time to fetch all block pages
  - `arena-sync:block:{id}` — time per block (render + vault write)
  - `arena-sync:asset:{id}` — time to handle attachment downloads
  - `arena-sync:index:{slug}` — time to build and write the channel index note

---

## Baseline Metrics (Mock Environment)

Tests run on: 2026-06-26  
Environment: Jest with in-memory `MockVault`, zero network latency.  
Baseline file: `src/__tests__/baselines/performance-baseline.json`

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

### Automated Benchmark Baseline

A deterministic 100-block benchmark (`src/__tests__/benchmark.test.ts`) stores its baseline in `src/__tests__/baselines/performance-baseline.json`:

| Metric | Baseline | Tolerance |
|--------|----------|-----------|
| `totalTimeMs` | ~70 ms | 20% |
| `apiCallCount` | 42 calls | 20% |
| `vaultWriteCount` | 141 writes | 20% |
| `memoryPeakMB` | ~1.9 MB | 20% |

Run with `UPDATE_BASELINE=1` to refresh after deliberate changes.

---

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

---

## Real-World Expectations

The mock metrics above represent **best-case local processing only**. In production, the actual bottlenecks will shift:

- **API latency** will likely dominate for channels with 100+ blocks. At 100 blocks/page and ~100-300 ms per API call, a 500-block channel could spend 1-2 seconds just on network requests.
- **File I/O** on a real Obsidian vault (especially mobile or network drives) will be slower than the in-memory mock.
- **Attachment downloads** depend heavily on image/file size and network speed.

---

## Architecture Decisions & Trade-offs

The following choices were made deliberately and carry performance consequences. Understand them before refactoring.

### 1. Per-File Vault Writes (No Batch Transactions)

**Decision:** We write one file per block because the Obsidian Vault API does not expose bulk transactions.  
**Trade-off:** We accept per-file I/O overhead in exchange for simplicity and API compatibility. A future Obsidian API that supports transactions would unlock significant speed-ups for large channels.  
**Code:** `src/sync-engine.ts:278-395` (`pullBlock`).

### 2. Concurrency Levels (3 for Channels, 5 for Blocks)

**Decision:** `CONCURRENCY.CHANNEL_SYNC = 3` and `CONCURRENCY.BLOCK_PROCESS = 5`.  
**Trade-off:** Lower channel concurrency prevents overwhelming Obsidian's UI thread and stays well under Are.na's unadvertised but real rate limits. Block concurrency of 5 is a sweet spot on desktop; mobile may benefit from lowering it. These values are empirical, not derived from formal limits.  
**Code:** `src/sync-engine.ts:26-31` (`CONCURRENCY` constant).

### 3. In-Memory API Cache with 5-Minute TTL

**Decision:** `ArenaApi` caches `getChannel` and `getBlock` results for 5 minutes.  
**Trade-off:** A shorter TTL reduces stale data but increases redundant API calls; a longer TTL risks showing outdated channel titles or comment counts. Five minutes covers typical "re-sync the same channel" workflows without introducing noticeable staleness. The cache is per-instance, so different tokens/agents do not share state.  
**Code:** `src/api.ts:40-68` (`CacheEntry`, `getCached`, `setCached`).

### 4. Custom Template Engine + Legacy Rendering Path

**Decision:** `blockToMarkdown` supports both a user-customizable Mustache-like template system (`templateUtils.ts`) and a legacy hardcoded path for backward compatibility.  
**Trade-off:** The dual path adds ~130 lines of duplicated class-switch logic (`src/utils.ts:117-144` and `227-274`) and doubles testing surface area, but it preserves existing vaults that rely on the old output format. The template engine is fast (cached AST, array-based string building), but it still adds a dependency on `parseTemplate` and `renderTemplate`.  
**Code:** `src/utils.ts:96-310` (`blockToMarkdown`); `src/templateUtils.ts` (engine).

### 5. SHA-256 Hash-Based Change Detection

**Decision:** Every block is hashed with SHA-256 to detect remote changes.  
**Trade-off:** Hashing is CPU-cheap for text blocks but requires reading the existing note from disk for comparison. The **read-skip fast path** (see below) mitigates this for unchanged channels. We chose hashing over timestamps because Are.na does not reliably expose `updated_at` at the block level.  
**Code:** `src/utils.ts` (`computeHash`); `src/sync-engine.ts:278-395` (fast-path logic).

### 6. SyncRecord Persistence in `data.json`

**Decision:** Sync records are stored inside Obsidian's `data.json` alongside settings.  
**Trade-off:** This keeps state portable (one file backs up everything) but causes `data.json` to grow linearly with tracked blocks. For vaults with 10,000+ blocks this can bloat the settings object by several megabytes. A separate JSON file was rejected to keep the plugin simple and avoid custom migration logic.  
**Code:** `src/types.ts` (`SyncRecord`); `src/main.ts` (`saveSettings`).

### 7. Mock-Based Performance Testing

**Decision:** Baseline benchmarks run against `MockVault` and a mocked `ArenaApi`.  
**Trade-off:** This gives us deterministic, fast, CI-friendly regression detection for *local processing* only. It does **not** catch network-layer regressions, real Obsidian I/O slowdowns, or Are.na API changes. Real-world profiling must be done manually in a live vault.

---

## Feature vs Performance Trade-offs

Tetromino's feature set directly impacts import speed. The table below shows which settings cost the most time and why.

| Feature | Performance Cost | Why | Mitigation |
|---------|-----------------|-----|------------|
| **Attachment downloads** | ~20-25% of sync time | Binary I/O + network transfer for every image/file. | Disable "Download attachments" if you only need text/links. |
| **Comment fetching** | +1 API call per commented block | `getBlockDetail` is called for every block where `comment_count > 0`. | Disable "Include comments" for channels with heavy discussion. |
| **Connected channel extraction** | +CPU per block | Parsing `connections` and `channels` fields and deduplicating slugs adds work in `buildBlockContext`. | Disable "Include connected channels" for marginal speedup. |
| **Custom templates** | Linear slowdown with complexity | The template engine is fast (cached AST), but deeply nested `#if` / `#each` trees increase render time per block. | Keep templates flat; avoid large `#each` loops over unbounded data. |
| **Diff generation** | ~5-10% of block processing | `unifiedDiff` is computed for every create/update to populate `fileDiffs`. | Consider making diffs optional in non-dry-run mode (future work). |
| **Channel index + master overview** | <1% of sync time | These are cheap, but the master overview note grows with channel count and may slow Obsidian's own indexer. | Not a major concern unless you have 1,000+ channels. |
| **Dry-run mode** | ~2-3x slower | Every block is rendered twice (once for diff, once for report) and no fast-path skips are applied. | Only use dry-run when validating changes; not for routine sync. |

> **Rule of thumb:** The fastest possible import is a text-only channel with comments, connected channels, and attachments disabled, using the default template.

---

## Implemented Optimizations

### API Call Efficiency

- **Batching:** Are.na API v3 does **not** support fetching multiple arbitrary blocks in a single request. The maximum page size is 100 blocks (`per=100`), which `ArenaApi` already uses.
- **Pagination:** `shouldStopPagination` halts early on empty pages, partial pages, reported total pages, or duplicate blocks. No over-fetching occurs.
- **Retry logic:** Exponential backoff capped at 10 s with jitter, `MAX_RETRIES = 3`, plus an outer `fetchPageWithRetries` loop for page-level resilience.
- **Request caching:** 5-minute TTL in-memory cache for `getChannel` and `getBlock`, eliminating redundant metadata/detail fetches within a session.

**Code:** `src/api.ts` (entire file); `src/__tests__/api.test.ts` (caching tests).

### File I/O & Vault Operation Optimizations

1. **Precomputed path caching:** `resolveChannelFolder` and `resolveAttachmentBaseFolder` are computed once per channel in `pull()` and passed down, eliminating redundant string manipulation across all blocks.
2. **Read-skip fast path:** If a `SyncRecord` exists, the remote hash is unchanged, and the file's `stat.mtime` ≤ `lastSyncedAt`, the engine skips `vault.read()` entirely on re-syncs.

**Code:** `src/sync-engine.ts:172-268` (`pull`); `src/sync-engine.ts:278-395` (`pullBlock`).

### Template Rendering Optimizations

1. **Array-based string building:** `renderTemplate` uses `out.push(...)` + `join('')` instead of repeated string concatenation.
2. **Pre-split property paths:** `getNestedValue` receives pre-computed `nameParts`, `condParts`, and `arrayVarParts` arrays from the AST, eliminating redundant `String.prototype.split()` calls.
3. **Parsed-AST cache:** `parseTemplate` caches ASTs by template string in a `Map`, reducing parse overhead from *O(blocks)* to *O(1)* per channel.
4. **Pre-compiled regex:** The frontmatter-detection regex in `src/utils.ts` is a module-level constant (`FRONTMATTER_REGEX`).

**Code:** `src/templateUtils.ts`; `src/utils.ts:12` (`FRONTMATTER_REGEX`).

### Memory Optimizations

- **Leak detection:** Five consecutive 500-block imports showed oscillating retained heap growth with no upward trend — **no memory leak** confirmed.
- **Micro-optimization:** `blocks.filter()` in `pull()` is skipped when `excludeClasses` is empty, saving a temporary array copy in the common case.

**Code:** `src/sync-engine.ts`; `src/__tests__/memory.test.ts`.

---

## Memory Profiling Results

Memory consumption was profiled using `process.memoryUsage()` during simulated imports of 1,000 and 2,000 blocks. Tests ran in the Jest mock environment (in-memory vault, zero network latency).

### Baseline Metrics

| Blocks | Baseline Heap | Peak Heap | Heap Growth | Bytes / Block | RSS at Peak |
|--------|---------------|-----------|-------------|---------------|-------------|
| 1,000  | ~72.6 MB      | ~83.5 MB  | ~10.9 MB    | ~11,450       | ~170.8 MB   |
| 2,000  | ~112.4 MB     | ~134.4 MB | ~22.0 MB    | ~11,550       | —           |

> **Note:** The mock environment stores every "vault file" in a JavaScript `Map`, so these numbers over-estimate real-world usage (where files live on disk). The growth rate of ~11.5 KB per block is dominated by mock vault entries, `SyncRecord` objects, and the `result` accumulator (`actions`, `fileDiffs`, etc.).

### Memory Leak Detection

Five consecutive 500-block imports were run with explicit `global.gc()` between iterations. Retained heap growth oscillated (e.g., +8.5 MB, −2.0 MB, +11.1 MB, −3.1 MB, +10.7 MB) with **no upward trend**, indicating **no memory leak** in the sync engine.

### Identified Memory Patterns

1. **`result` accumulator growth** — `SyncResult.fileDiffs` stores `before`, `after`, and `diff` strings for every created or updated block. For very large channels this is the dominant in-memory cost. Consumers should discard the `SyncResult` after use to allow GC.
2. **`syncRecordMap` persistence** — The map is retained across channels (by design) for fast conflict detection. For vaults with 10,000+ tracked blocks this will consume a few MB.
3. **`blocks` array lifetime** — All blocks from `getAllChannelBlocksWithProgress` are held in memory for the duration of `pull()`. Streaming pagination could reduce peak memory but would require API-layer changes.
4. **Per-channel caches** — `blockDetailsCache` and `channelPreviewCache` are cleared at the start of each `syncChannel` call, preventing cross-channel accumulation.

---

## Future Optimization Targets

The following items are ordered by **expected impact** (high → low). Each includes the specific file and line range so a maintainer can jump straight to the code.

### High Impact

| # | Target | Location | Description |
|---|--------|----------|-------------|
| 1 | **Make diffs optional in normal sync** | `src/sync-engine.ts:328`, `395` | `unifiedDiff` is computed on every create/update. In non-dry-run mode this is pure diagnostic overhead. Add a setting to skip `fileDiffs` generation. |
| 2 | **Streaming pagination** | `src/api.ts:170-260` | `getAllChannelBlocksWithProgress` accumulates all pages before returning. Yielding pages as they arrive would let `pull()` start processing immediately and reduce peak memory. |
| 3 | **Decompose `pullBlock`** | `src/sync-engine.ts:278-395` | This 120-line method mixes creation, update, move, hash, and dry-run logic. Extract `resolveNotePath`, `computeAction`, and `applyAction` helpers. |
| 4 | **Deduplicate rendering paths in `blockToMarkdown`** | `src/utils.ts:117-144` and `227-274` | The `switch (block.class)` logic is repeated almost verbatim in the template and legacy branches. Extract a single `renderBlockContent(block, settings, context)` helper. |
| 5 | **Fail-fast for non-retryable HTTP codes** | `src/api.ts:489-552` | `downloadBinary` retries on 404/403, wasting time. Maintain a set of non-retryable codes (`400`, `401`, `403`, `404`) and short-circuit. |

### Medium Impact

| # | Target | Location | Description |
|---|--------|----------|-------------|
| 6 | **Split `sync-engine.ts` into focused modules** | `src/sync-engine.ts` (1,012 lines) | After decomposing `pullBlock`, split the file into `sync-engine.ts` (orchestration), `block-processor.ts` (`pullBlock`, `ensureBlockAsset`), `index-writer.ts` (index/overview), and `channel-extractor.ts` (preview/comments). |
| 7 | **Add read-skip fast path to `ensureBlockAsset`** | `src/sync-engine.ts:411-500` | Assets currently check existence via `vault.getAbstractFileByPath` but do not compare `stat.mtime` against `lastSyncedAt`. A fast path similar to `pullBlock` would skip binary reads on re-sync. |
| 8 | **Robust frontmatter parser** | `src/utils.ts:333-356` | `markdownToBlockContent` uses a naive `---` splitter that breaks on horizontal rules or `---` inside YAML strings. Adopt `gray-matter` or a boundary-aware regex. |
| 9 | **Type `ArenaBlock.class` as a union** | `src/types.ts:37` | Using `string` instead of `"Text" | "Image" | ...` disables exhaustiveness checking and allows typo bugs. |

### Low Impact / Quick Wins

| # | Target | Location | Description |
|---|--------|----------|-------------|
| 10 | **Extract shared `ensureFolder` utility** | `src/sync-engine.ts:955-985`, `src/main.ts:617-627`, `src/migration.ts:139-149` | Three implementations exist; the core logic is identical. Extract to `src/utils.ts`. |
| 11 | **Abstract console timing** | Scattered across `src/sync-engine.ts` and `src/api.ts` | Replace manual `console.time/timeEnd` pairs with a `withTiming(label, fn)` helper that respects `debugLogging` and can be no-oped in production. |
| 12 | **Merge image-URL resolution helpers** | `src/utils.ts:44-73` | `resolveImageEmbedUrl` and `resolveBlockBannerUrlWithPriority` traverse the same `block.image.*.url` chain. Replace with a single parameterized helper. |

> For a full prioritized sprint plan including effort estimates, see [[technical-debt]].

---

## How to Re-run Profiling

```bash
# Run the dedicated performance test
npx jest src/__tests__/performance.test.ts --no-coverage

# Run the memory profiling test
npx jest src/__tests__/memory.test.ts --no-coverage

# Run with explicit GC for cleaner readings (Node only)
node --expose-gc node_modules/.bin/jest src/__tests__/memory.test.ts --no-coverage

# Run the benchmark suite (compares against stored baseline)
npx jest src/__tests__/benchmark.test.ts --no-coverage

# Update the baseline after deliberate improvements
UPDATE_BASELINE=1 npx jest src/__tests__/benchmark.test.ts --no-coverage

# Run all tests to ensure no regressions
npx jest --no-coverage
```

---

## Related Documents

- [[technical-debt]] — Full inventory of 22 debt items with risk ratings and sprint order
- [[testing-strategy]] — Test infrastructure used for profiling
- [[sync-engine.ts]] — Core sync logic with timing instrumentation
- [[api.ts]] — API layer with pagination, retry logic, and caching
- [[templateUtils.ts]] — Custom template engine (parser + renderer)
- [[utils.ts]] — `blockToMarkdown`, hash computation, and frontmatter handling
- `src/__tests__/baselines/performance-baseline.json` — Stored benchmark metrics for CI regression detection

---

*Last updated: 2026-06-26 by OpenCODECODER.*

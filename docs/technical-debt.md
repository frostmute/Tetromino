---
type: report
title: Technical Debt Inventory — Tetromino
created: 2026-06-26
tags:
  - technical-debt
  - maintenance
  - refactoring
related:
  - '[[Phase-07-Performance-Maintenance]]'
  - '[[coverage-map]]'
  - '[[PERFORMANCE]]'
---

# Technical Debt Inventory — Tetromino

This document catalogues known technical-debt items in the Tetromino codebase. Each item is prioritised by **impact** (how much it affects correctness, performance, or maintainability) and **effort** (rough estimate of work required). Items marked **Quick Win** are high-impact, low-effort candidates suitable for short maintenance windows or good-first-issues.

## Summary Table

| # | Category | Item | Impact | Effort | Quick Win |
|---|----------|------|--------|--------|-----------|
| 1 | Duplication | `ensureFolder` triplication | Medium | Low | ✅ |
| 2 | Duplication | `extractConnectedChannels` / `extractChannelAppearsIn` overlap | Medium | Low | ✅ |
| 3 | Duplication | Image-URL resolution helpers overlap | Low | Low | ✅ |
| 4 | Duplication | Content-rendering switch in `blockToMarkdown` (template + legacy) | Medium | Medium | |
| 5 | Duplication | `comment_count` heuristic in two places | Low | Low | ✅ |
| 6 | Complexity | `blockToMarkdown` is ~230 lines with dual rendering paths | High | Medium | |
| 7 | Complexity | `pullBlock` mixes creation, update, move, hash, and dry-run logic | High | Medium | |
| 8 | Complexity | `pull` orchestrates fetching, filtering, and processing | Medium | Medium | |
| 9 | Complexity | `display()` in `settings-tab.ts` is ~500 lines | Medium | High | |
| 10 | Error Handling | `markdownToBlockContent` uses naive frontmatter parser | Medium | Low | ✅ |
| 11 | Error Handling | `restoreFromBackupData` minimal validation | Medium | Low | ✅ |
| 12 | Error Handling | `downloadBinary` retry lacks permanent-error short-circuit | Medium | Low | ✅ |
| 13 | Error Handling | `ArenaBlock.class` typed as plain `string` instead of union | Medium | Low | ✅ |
| 14 | Error Handling | `getBlockDetail` silently swallows all fetch errors | Low | Low | ✅ |
| 15 | Test Coverage | `sync-engine.ts` gaps: preview image, block details, folder-name index | High | Medium | |
| 16 | Test Coverage | `utils.ts` template branches for Link, Media, Attachment untested | High | Low | ✅ |
| 17 | Test Coverage | `main.ts` lifecycle, backup/restore, migration paths untested | Medium | High | |
| 18 | Test Coverage | `settings-tab.ts` and `modals.ts` are UI-bound and untested | Low | High | |
| 19 | Maintainability | `sync-engine.ts` is 1,012 lines — approaching monolith threshold | Medium | High | |
| 20 | Maintainability | Magic concurrency numbers (3, 5, 10) are unnamed constants | Low | Low | ✅ |
| 21 | Maintainability | `pMap` uses `Array.fill(0).map()` instead of `Array.from` | Low | Low | ✅ |
| 22 | Maintainability | Console timing calls scattered without abstraction | Low | Low | ✅ |

---

## 1. Duplicated Code

### 1.1 `ensureFolder` exists in three files

**Location:**
- `src/sync-engine.ts:955–985` (mutex-guarded version with `folderCache`)
- `src/main.ts:617–627` (simple sequential version)
- `src/migration.ts:139–149` (simple sequential version)

**Problem:** The two simple versions in `main.ts` and `migration.ts` are effectively identical. The `sync-engine.ts` version adds a mutex and a `Set` cache, but the core folder-creation logic is the same.

**Recommended fix:** Extract a shared `ensureFolder(vault, path, cache?, mutex?)` utility in `src/utils.ts`. The sync-engine can pass its cache and mutex; other callers can use defaults.

**Effort:** 1–2 hours + tests.

---

### 1.2 `extractConnectedChannels` and `extractChannelAppearsIn` share ~80 % logic

**Location:**
- `src/sync-engine.ts:784–822`
- `src/sync-engine.ts:824–860`

**Problem:** Both functions iterate over the same four pool keys, deduplicate by slug/title, filter out the source channel, and sort alphabetically. The only real difference is the input type (`unknown` detail vs `ArenaChannel`) and the exact field names accessed.

**Recommended fix:** Extract a generic `extractChannelPool(detail: unknown, sourceSlug: string): Array<{title: string; slug?: string}>` that works against any object shape containing the four pool keys.

**Effort:** 1–2 hours + tests.

---

### 1.3 Image-URL resolution helpers overlap

**Location:**
- `src/utils.ts:44–52` — `resolveImageEmbedUrl`
- `src/utils.ts:54–73` — `resolveBlockBannerUrlWithPriority`

**Problem:** Both functions traverse the same `block.image.{display,thumb,original}.url` chain. The banner helper merely re-orders the priority.

**Recommended fix:** Replace with a single `resolveImageUrl(block, priority: ImageSizePriority[])` helper that takes an ordered list of size keys.

**Effort:** 30 minutes + tests.

---

### 1.4 Content-rendering switch duplicated in `blockToMarkdown`

**Location:**
- `src/utils.ts:117–144` (template path)
- `src/utils.ts:227–274` (legacy path)

**Problem:** The `switch (block.class)` logic for `Link`, `Media`, `Attachment`, and `Image` is repeated almost verbatim in both the template-enabled and legacy branches of `blockToMarkdown`. Any fix to how a block class renders must be applied in two places.

**Recommended fix:** Extract a `renderBlockContent(block, settings, context): string` function that both paths call. This also makes `blockToMarkdown` easier to test in isolation.

**Effort:** 2–3 hours + tests.

---

### 1.5 `comment_count` heuristic duplicated

**Location:**
- `src/sync-engine.ts:223–228`
- `src/sync-engine.ts:685–689`

**Problem:** The same ternary check for whether a block needs comment fetching appears in `pull()` (pre-fetch batching) and `buildBlockContext()` (render-time).

**Recommended fix:** Extract a `blockNeedsComments(block, settings): boolean` predicate.

**Effort:** 15 minutes + tests.

---

## 2. Overly Complex Functions

### 2.1 `blockToMarkdown` is ~230 lines with dual rendering paths

**Location:** `src/utils.ts:96–310`

**Problem:** The function handles both the modern template path and the legacy hardcoded path. It mixes frontmatter generation, content rendering, comment/connected-channel appendices, and security sanitisation. This makes it hard to reason about individual outputs and increases the surface area for regressions.

**Recommended fix:**
1. Extract `renderBlockContent()` (see 1.4).
2. Extract `buildFrontmatter(block, settings, context)`.
3. Extract `appendBlockSections(parts, context)` for comments and connected channels.
4. Keep `blockToMarkdown` as a thin orchestrator.

**Effort:** 3–4 hours + tests.

---

### 2.2 `pullBlock` mixes creation, update, move, hash, and dry-run logic

**Location:** `src/sync-engine.ts:312–443`

**Problem:** This 130-line method decides whether to create, update, skip, or move a note; computes hashes; handles dry-run diffs; and updates sync records. It is the most critical path in the engine and the hardest to unit-test in isolation.

**Recommended fix:** Decompose into:
- `resolveNotePath(block, mapping, channelFolder)`
- `computeAction(block, existing, record, remoteHash, dryRun): Action`
- `applyAction(action, dryRun)`

**Effort:** 4–6 hours + tests.

---

### 2.3 `pull` orchestrates fetching, filtering, and processing

**Location:** `src/sync-engine.ts:172–310`

**Problem:** `pull` fetches blocks, pre-fetches channel previews, pre-fetches block details, filters exclusions, and then drives `pMap` over `pullBlock`. At 140 lines it is readable but becoming a coordination god-method.

**Recommended fix:** Extract `prefetchChannelPreviews(blocks)` and `prefetchBlockDetails(blocks)` as private helpers. Consider extracting the exclusion-filter step into a pure function.

**Effort:** 2–3 hours.

---

### 2.4 `display()` in `settings-tab.ts` is ~500 lines

**Location:** `src/settings-tab.ts:22–555`

**Problem:** The entire settings UI is built inside a single method. This makes it difficult to navigate, review, or test individual sections.

**Recommended fix:** Split into `renderAuthSection()`, `renderContentSection()`, `renderChannelManagementSection()`, etc. Each section can be a private method.

**Effort:** 2–3 hours (no logic changes, pure refactoring).

---

## 3. Incomplete Error Handling & Edge Cases

### 3.1 `markdownToBlockContent` uses naive frontmatter parser

**Location:** `src/utils.ts:333–356`

**Problem:** The parser looks for the first `---` and the next `---` after index 3. It will break on:
- Frontmatter with `---` inside a string value.
- Notes that start with horizontal rules (`---`) but no frontmatter.
- YAML frontmatter that uses `···` (alternative delimiter).

**Recommended fix:** Use a small, robust frontmatter splitter (e.g. `gray-matter` if bundle size permits, or a regex that respects string boundaries).

**Effort:** 1–2 hours + tests.

---

### 3.2 `restoreFromBackupData` minimal validation

**Location:** `src/main.ts:476–488`

**Problem:** Only checks that `channelMappings` is an array. Does not validate that each mapping has required fields (`channelSlug`, `enabled`, etc.), which could lead to runtime errors later.

**Recommended fix:** Add a `validateChannelMapping()` pure function and reject backups with malformed entries.

**Effort:** 1 hour + tests.

---

### 3.3 `downloadBinary` retry lacks permanent-error short-circuit

**Location:** `src/api.ts:489–552`

**Problem:** The retry loop treats all `requestUrl` failures and HTTP errors the same way. A 404 or 403 will be retried with exponential backoff, wasting time and API quota.

**Recommended fix:** Maintain a set of non-retryable status codes (`400`, `401`, `403`, `404`) and fail fast.

**Effort:** 1 hour + tests.

---

### 3.4 `ArenaBlock.class` typed as plain `string`

**Location:** `src/types.ts:37`

**Problem:** The `class` field is typed as `string`, but the codebase treats it as a discriminant with known values (`"Text"`, `"Image"`, `"Link"`, `"Media"`, `"Attachment"`, `"Channel"`). Using a string union would enable exhaustiveness checking in switch statements and prevent typos.

**Recommended fix:**
```ts
export type ArenaBlockClass = "Text" | "Image" | "Link" | "Media" | "Attachment" | "Channel";
// ...
class: ArenaBlockClass;
```

**Effort:** 30 minutes + fixing any compile errors.

---

### 3.5 `getBlockDetail` silently swallows all fetch errors

**Location:** `src/sync-engine.ts:728–744`

**Problem:** Any network or parsing error is logged to `console.warn` and then cached as `null`. On a re-sync the same block will attempt the fetch again because `null` is a valid cache entry, but the caller has no way to distinguish "no comments" from "fetch failed".

**Recommended fix:** Cache a sentinel error object or expose an `error` flag so that `buildBlockContext` can decide whether to retry or propagate.

**Effort:** 1–2 hours + tests.

---

## 4. Test Coverage Gaps

### 4.1 `sync-engine.ts` — high-value uncovered paths

From the coverage report (updated 2026-06-26):

| Line range | Gap | Risk |
|------------|-----|------|
| 183 | `onProgress` during page fetch | Medium |
| 194–206 | Channel preview image fetching | Medium |
| 215–236 | Block detail fetching (comments & connected channels) | **High** |
| 379–380 | Skip non-file existing path | Low |
| 412 | Move-only record update | Medium |
| 456 | `Attachment` class `ensureBlockAsset` | **High** |
| 467 | `Image` class `ensureBlockAsset` | **High** |
| 491–492 | Existing asset skip | Medium |
| 531 | Empty `appearsInChannels` | Low |
| 534–543 | Channel appears-in rendering | Low |
| 558–559 | Follower count rendering | Low |
| 607–608, 613–614 | `folder-name` index style | Low |
| 632–633 | Master overview update | Medium |
| 648–650 | `getChannelPreviewImage` best-effort | Low |
| 701–706 | `extractComments` edge cases | Medium |
| 737–742 | `getBlockDetail` error path | Low |
| 788–820 | `extractConnectedChannels` deduplication | Medium |
| 838–853 | `extractChannelAppearsIn` deduplication | Low |
| 858 | Sorting edge case | Low |
| 903–910 | `getChannelPreviewImage` error path | Low |

**Recommended priority:**
1. `pullBlock` create/update/skip/move paths (the core determinism guarantee).
2. `ensureBlockAsset` for both `Image` and `Attachment` classes.
3. `buildBlockContext` with comments and connected channels.
4. `updateChannelIndex` and `updateMasterOverview` determinism.

---

### 4.2 `utils.ts` — template rendering branches

| Line range | Gap | Risk |
|------------|-----|------|
| 119–132 | Template `Link`, `Media`, `Attachment` rendering | **High** |
| 155, 164–165 | Template image `download` vs `embed` | **High** |
| 209–210 | Legacy frontmatter `channelTitle` | Low |
| 229 | Legacy `Text` content | Low |
| 238–247 | Legacy `Image` embed vs link | Medium |
| 257–262 | Legacy `Attachment` embed vs link | Medium |
| 341 | `markdownToBlockContent` frontmatter edge case | Medium |
| 408 | `resolveAttachmentBaseFolder` custom fallback | Low |

**Recommended fix:** Add targeted unit tests for each `block.class` in both template and legacy modes.

---

### 4.3 `main.ts` — lifecycle and I/O paths

| Line range | Gap | Risk |
|------------|-----|------|
| 43, 48 | `onload` early setup | Low |
| 57, 63 | Command callbacks | Low |
| 70–78 | `arena-sync-channel` command | Medium |
| 86–94 | `arena-sync-channel-preview` command | Medium |
| 102–113 | `arena-sync-open-channel` command | Low |
| 120–121, 128–129 | Migration commands | Medium |
| 138–139 | Startup sync | Low |
| 154 | `rescheduleInterval` edge case | Low |
| 181 | `saveSettings` re-instantiation | Medium |
| 264 | `runChannelSync` error notice | Low |
| 352 | `writeImportReport` append | Low |
| 525–526 | `checkForMigrationPrompt` | Medium |
| 558 | `writeMigrationReport` append | Low |

**Recommended approach:** Extract pure helper functions from `main.ts` (e.g. `buildImportReportLines(result)`) and unit-test those. UI-heavy paths are best covered by E2E or manual testing.

---

### 4.4 UI-bound untested modules

| Module | Coverage | Reason |
|--------|----------|--------|
| `settings-tab.ts` | 2.05 % statements | Obsidian `Setting` / DOM runtime |
| `modals.ts` | 8.51 % statements | Obsidian `Modal` / `FuzzySuggestModal` runtime |

**Recommended approach:** Do **not** chase high unit-test coverage here. Instead:
- Extract validation logic to pure functions in `utils.ts` and test those.
- Use Playwright or manual QA for UI flows.

---

## 5. Maintainability & Code Smell

### 5.1 `sync-engine.ts` is 1,012 lines

**Problem:** The file is approaching monolith territory. It contains the entire sync orchestration, index generation, record bookkeeping, channel extraction, and asset management.

**Recommended fix:** After the decomposition work in §2, consider splitting into:
- `sync-engine.ts` — orchestration (`syncAll`, `syncChannel`, `pull`)
- `block-processor.ts` — `pullBlock`, `ensureBlockAsset`, hash logic
- `index-writer.ts` — `updateChannelIndex`, `updateMasterOverview`
- `channel-extractor.ts` — `extractComments`, `extractConnectedChannels`, `extractChannelAppearsIn`, `getChannelPreviewImage`

**Effort:** 4–6 hours + full regression test.

---

### 5.2 Magic concurrency numbers

**Location:**
- `src/sync-engine.ts:78` — `pMap(enabledMappings, 3, ...)`
- `src/sync-engine.ts:209` — `pMap(channelSlugsToFetch, 5, ...)`
- `src/sync-engine.ts:239` — `pMap(blockIdsToFetch, 5, ...)`
- `src/sync-engine.ts:268` — `pMap(blocksToProcess, 5, ...)`
- `src/migration.ts:95` — `pMap(noteFiles, 10, ...)`

**Problem:** The numbers `3`, `5`, and `10` are not named constants. A future maintainer cannot tell whether `5` was chosen for Are.na rate limits, Obsidian I/O limits, or arbitrary guesswork.

**Recommended fix:** Introduce named constants in `src/types.ts` or a new `src/constants.ts`:
```ts
export const CONCURRENCY = {
  CHANNEL_SYNC: 3,
  PREVIEW_FETCH: 5,
  DETAIL_FETCH: 5,
  BLOCK_PROCESS: 5,
  MIGRATION_FILE: 10,
} as const;
```

**Effort:** 15 minutes.

---

### 5.3 `pMap` uses `Array.fill(0).map()`

**Location:** `src/utils.ts:401`

**Problem:** `new Array(Math.min(items.length, limit)).fill(0).map(...)` creates an intermediate array and fills it with zeros just to map over it. This is slightly inefficient and less idiomatic than `Array.from({ length: n }, () => ...)`.

**Recommended fix:** Replace with `Array.from({ length: Math.min(items.length, limit) }, () => worker())`.

**Effort:** 5 minutes.

---

### 5.4 Console timing calls scattered without abstraction

**Location:** Throughout `sync-engine.ts` and `api.ts`.

**Problem:** `console.time()` / `console.timeEnd()` pairs are sprinkled manually. Adding a new timed section requires copy-pasting the pattern. Removing them for a release build is tedious.

**Recommended fix:** Introduce a small `withTiming(label, fn)` helper or a `TimingLogger` class that respects `settings.debugLogging` and can be no-oped in production.

**Effort:** 1 hour.

---

## Recommended Sprint Order

If tackling this debt in a single maintenance sprint, the following order balances risk reduction with velocity:

1. **Quick Wins (day 1)**
   - 1.1 Extract `ensureFolder` utility
   - 1.5 Extract `blockNeedsComments` predicate
   - 3.4 Type `ArenaBlock.class` as union
   - 5.2 Name concurrency constants
   - 5.3 Fix `pMap` array creation

2. **Test Coverage (days 2–3)**
   - 4.2 Template rendering branches in `utils.ts`
   - 4.1 `pullBlock` and `ensureBlockAsset` paths in `sync-engine.ts`
   - 3.2 Add backup validation

3. **Refactoring (days 4–5)**
   - 1.2 Deduplicate channel extraction
   - 1.3 Merge image-URL helpers
   - 2.1 Decompose `blockToMarkdown`
   - 2.4 Split `settings-tab.ts` `display()` method

4. **Architecture (future sprint)**
   - 2.2 Decompose `pullBlock`
   - 2.3 Extract prefetch helpers
   - 5.1 Split `sync-engine.ts` into focused modules
   - 3.1 Robust frontmatter parser

---

*Last updated: 2026-06-26 by OpenCODECODER.*

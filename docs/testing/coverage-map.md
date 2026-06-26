---
type: report
title: Test Coverage Map — Critical Modules
created: 2026-06-26
tags:
  - testing
  - coverage
  - qa
related:
  - '[[Phase-05-Testing-and-QA]]'
---

# Test Coverage Map — Critical Modules

This document maps current test coverage for the four modules identified as critical to Tetromino's reliability, determinism, and backward compatibility. It is derived from the Jest `--coverage` report run on the codebase and is intended to guide prioritisation of test-writing effort in this phase.

## Summary

| Module | Statements | Branches | Functions | Lines | Status |
|--------|-----------|----------|-----------|-------|--------|
| `src/api.ts` | 53.64 % | 40.60 % | 66.66 % | 53.40 % | **Needs work** |
| `src/sync-engine.ts` | 22.74 % | 9.89 % | 35.89 % | 23.11 % | **Needs work** |
| `src/utils.ts` | 83.73 % | 57.32 % | 100 % | 84.65 % | **Moderate** |
| `src/settings-tab.ts` | 1.23 % | 0 % | 0 % | 1.29 % | **UI-bound** |

Overall project coverage at time of writing: **40.19 %** statements / **37.4 %** branches / **27.97 %** functions / **40.66 %** lines.

---

## 1. `src/api.ts` — API Client

**Current coverage:** 53.64 % statements, 40.6 % branches.

### Already covered (observed in existing tests)
- `verifyToken()` — success and failure paths.
- `getChannel()` — basic fetch and normalisation.
- `getChannelContents()` — single-page fetch.
- `getBlock()` — basic fetch.
- `downloadBinary()` — happy path.
- `normalizePaginatedResponse()` — v3 shape (meta + data).
- `request()` — basic retry loop for transient failures and rate-limiting.

### Uncovered lines and gaps

| Line range | What is missing | Risk / impact |
|------------|----------------|---------------|
| 24 | `withJitter()` helper (`Math.random` path) | Low — deterministic jitter not required |
| 52-57 | `logError()` — error logging branch | Low — side-effect only |
| 84 | `body` serialisation branch in `request()` | Medium — POST/PUT body never tested |
| 103-117 | Rate-limit back-off branch (429 retry after delay) | **High** — real-world rate limiting untested |
| 122-127 | Transient-error back-off (500-504) | **High** — server-error resilience untested |
| 137 | `throw new Error("…max retries")` after loop exhaustion | **High** — failure propagation untested |
| 143 | `buildApiUrl()` v-prefixed path short-circuit | Low — unlikely in practice |
| 162 | `normalizeBlock()` error throw | Medium — malformed block data handling |
| 168 | `normalizeChannel()` `description` fallback | Low |
| 197 | `normalizeBlock()` error throw | Medium |
| 226-249 | v2/legacy pagination shapes and raw-array fallback | Medium — backward-compatibility risk |
| 301-445 | `getAllChannelBlocksWithProgress()`, `fetchPageWithRetries()`, `shouldStopPagination()` | **Critical** — pagination, deduplication, progress callbacks, and page-level retry logic are the core of reliable bulk import |
| 467 | `downloadBinary()` catch re-throw | Medium — download failure propagation |
| 479 | `downloadBinary()` rate-limit branch | **High** — asset download rate limiting untested |
| 515 | `downloadBinary()` final throw after max retries | **High** — asset failure propagation untested |

### Recommended priority
1. **Pagination & progress** (`getAllChannelBlocksWithProgress`, `fetchPageWithRetries`, `shouldStopPagination`) — highest priority because this is the primary data-ingestion path.
2. **Error handling** — rate limits, transient errors, and max-retry exhaustion for both JSON requests and binary downloads.
3. **Legacy shapes** — v2/legacy pagination fallback for backward compatibility.

---

## 2. `src/sync-engine.ts` — Sync Engine

**Current coverage:** 22.74 % statements, 9.89 % branches.

### Already covered (observed in existing tests)
- `extractChannelSlugFromBlock()` — URL parsing and regex fallback.
- `blockFileName()` — naming-scheme delegation.
- `syncChannel()` — basic dry-run and normal run (limited).
- `syncAll()` — basic aggregation (limited).

### Uncovered lines and gaps

| Line range | What is missing | Risk / impact |
|------------|----------------|---------------|
| 48 | Constructor `syncRecords` initialisation | Low |
| 180 | `onProgress` callback during page fetch | Medium — progress reporting untested |
| 194-206 | Channel preview image fetching | Medium — best-effort image discovery |
| 215-236 | Block detail fetching (comments & connected channels) | **High** — enrichment features untested |
| 247-255 | `shouldExclude()` filtering with progress | Low |
| 307-415 | `pullBlock()` — the core note creation / update / conflict-resolution logic | **Critical** — file moves, hash comparison, dry-run diff, create vs update vs skip |
| 417-466 | `ensureBlockAsset()` — attachment download & vault write | **High** — asset handling and dry-run asset paths |
| 468-550 | `updateChannelIndex()` — index note generation | **High** — channel index determinism |
| 552-596 | `updateMasterOverview()` — master overview generation | Medium — overview note determinism |
| 607-614 | `channelIndexPath()` — folder-name style branch | Low |
| 616-687 | `buildBlockContext()` — banner, comments, connected channels | **High** — template context building |
| 689-705 | `getBlockDetail()` — caching and error handling | Medium |
| 707-743 | `extractComments()` — comment extraction with fallbacks | Medium |
| 745-783 | `extractConnectedChannels()` — channel deduplication and sorting | Medium |
| 785-821 | `extractChannelAppearsIn()` — appears-in deduplication | Low |
| 845-872 | `getChannelPreviewImage()` — best-effort preview fetching | Low |
| 874-914 | `getRecordKey`, `findRecord`, `upsertRecord` | **High** — sync-record bookkeeping is essential for determinism |
| 916-946 | `ensureFolder()` — mutex-guarded folder creation | Medium — race-condition safety |
| 948-972 | `markMissing()` — deletion / missing detection | **High** — cleanup of removed blocks |

### Recommended priority
1. **`pullBlock()`** — highest priority: create, update, skip, move, hash compare, dry-run diff.
2. **Sync-record bookkeeping** (`upsertRecord`, `findRecord`, `markMissing`) — essential for stable re-imports.
3. **Asset handling** (`ensureBlockAsset`) — download vs link paths and dry-run behaviour.
4. **Enrichment** (`buildBlockContext`, `extractComments`, `extractConnectedChannels`) — template variable correctness.
5. **Index generation** (`updateChannelIndex`, `updateMasterOverview`) — output determinism.

---

## 3. `src/utils.ts` — Utilities

**Current coverage:** 83.73 % statements, 57.32 % branches, 100 % functions.

### Already covered
- `computeHash()`, `sanitiseFilename()`, `blockFileName()`, `resolveChannelFolder()`, `resolveAttachmentBaseFolder()`, `markdownToBlockContent()`, `pMap()`.
- `blockToMarkdown()` — legacy hardcoded path (mostly covered).

### Uncovered lines and gaps

| Line range | What is missing | Risk / impact |
|------------|----------------|---------------|
| 87 | `normalizeArenaUrl()` catch branch | Low — malformed URL passthrough |
| 120-141 | Template rendering: `Link`, `Media`, `Attachment` class branches | **High** — these block-type outputs are user-facing |
| 151-154, 157, 161-163 | Template image-handling branches (`download` vs `embed`) | **High** — image rendering paths |
| 189 | Legacy frontmatter `channelTitle` | Low — legacy path |
| 192 | Legacy frontmatter `channelSlug` | Low — legacy path |
| 255-258, 262-265 | Legacy `Attachment` rendering (embed vs link) | Medium |
| 289 | Legacy connected-channels rendering | Low |

### Recommended priority
1. **Template rendering branches** for `Link`, `Media`, `Attachment`, and image handling — these directly affect note output.
2. Legacy paths are lower priority because the template path is the preferred modern path.

---

## 4. `src/settings-tab.ts` — Settings UI

**Current coverage:** 1.23 % statements, 0 % branches, 0 % functions.

### Assessment
This module is almost entirely Obsidian UI wiring (`Setting`, `PluginSettingTab`, `Notice`, DOM manipulation). The business logic inside it is limited to:
- Input validation (e.g. `parseInt` for sync interval, `trim()` for text fields).
- Calling plugin methods (`verifyToken`, `backupChannelMappings`, `restoreLatestChannelMappingsBackup`, etc.).

Because the module depends heavily on the Obsidian runtime and DOM, comprehensive unit testing is impractical in the current `jsdom` environment without significant mock infrastructure. The existing `1.23 %` coverage likely comes from incidental execution during other tests.

### Recommended approach
- **Do not target high unit-test coverage** for this file.
- Instead, test the underlying plugin methods (`main.ts`) that the UI delegates to.
- If settings validation logic grows, extract it to a pure function in `utils.ts` and test it there.

---

## Coverage Targets (Proposed)

| Module | Target | Rationale |
|--------|--------|-----------|
| `api.ts` | 85 % | Core external dependency; retry and pagination must be reliable. |
| `sync-engine.ts` | 80 % | Core business logic; determinism promise depends on it. |
| `utils.ts` | 90 % | Already close; template branches are the main gap. |
| `settings-tab.ts` | — | Exclude from target; UI-bound and low risk. |
| **Overall** | 70 % | Achievable once critical modules are lifted. |

---

## Untestable / Excluded Code

| Code | Reason |
|------|--------|
| `settings-tab.ts` DOM wiring | Requires Obsidian `Setting`/`PluginSettingTab` runtime; impractical in jsdom. |
| `main.ts` plugin lifecycle | Tight coupling to Obsidian `Plugin` API and UI events. |
| `modals.ts` | UI-only; `FuzzySuggestModal` and `Modal` require Obsidian runtime. |
| `console.debug` / `console.error` branches | Side-effect only; can be covered but not critical. |

---

*Generated from `npm test -- --coverage` run on 2026-06-26.*

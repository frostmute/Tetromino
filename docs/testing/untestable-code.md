---
type: reference
title: Untestable Code and Coverage Exclusions
created: 2026-06-26
tags:
  - testing
  - coverage
  - obsidian
related:
  - '[[coverage-map]]'
  - '[[test-fixtures]]'
---

# Untestable Code and Coverage Exclusions

This document explains which parts of the Tetromino codebase are intentionally excluded from unit-test coverage targets and why.

## Coverage Targets

| Metric | Global Threshold | Rationale |
|--------|-----------------|-----------|
| Statements | 70% | Critical business logic is well covered; UI integration code is excluded |
| Branches | 65% | Branch-heavy UI code pulls down the average |
| Functions | 40% | Many Obsidian callback functions are not unit-testable |
| Lines | 70% | Same rationale as statements |

### Per-Module Targets (Documented, Not Enforced in CI)

The following modules contain critical business logic and are expected to maintain high coverage:

| Module | Statement Target | Branch Target | Function Target | Line Target |
|--------|-----------------|---------------|-----------------|-------------|
| `src/api.ts` | 90% | 75% | 90% | 90% |
| `src/sync-engine.ts` | 80% | 55% | 85% | 80% |
| `src/utils.ts` | 95% | 75% | 100% | 95% |
| `src/templateUtils.ts` | 95% | 85% | 100% | 95% |
| `src/diff.ts` | 95% | 85% | 100% | 95% |
| `src/migration.ts` | 90% | 70% | 100% | 90% |
| `src/main.ts` | 80% | 75% | 55% | 80% |
| `src/securityUtils.ts` | 85% | 50% | 100% | 85% |
| `src/types.ts` | 100% | 100% | 100% | 100% |

> **Note:** Per-file thresholds are not enforced in `jest.config.cjs` because Jest's threshold matching for absolute paths is brittle across environments. Reviewers should manually verify the coverage report for critical modules.

## Excluded / Low-Priority Modules

### `src/settings-tab.ts` (~2% coverage)

**Why excluded:** This file contains the Obsidian `PluginSettingTab` implementation. It is pure UI construction code:
- Creates HTML elements via Obsidian's `Setting` API
- Binds input fields to `plugin.settings` properties
- Contains no business logic beyond simple getters/setters
- Requires a full Obsidian DOM environment to test meaningfully

**Testing strategy:** Covered by manual testing in a real Obsidian vault.

### `src/modals.ts` (~8% coverage)

**Why excluded:** This file contains Obsidian `Modal` subclasses:
- `DiffModal`
- `SyncSummaryModal`
- `MigrationPreviewModal`

These classes construct DOM elements inside Obsidian's modal system. Their logic is mostly presentation (rendering stats, diffs, buttons). The underlying data (`SyncResult`, `MigrationPlan`) is thoroughly tested in `sync-engine.test.ts` and `migration.test.ts`.

**Testing strategy:** Manual verification in Obsidian.

### Uncovered Lines in Otherwise Well-Covered Modules

#### `src/api.ts`

- **Debug logging (`log`)**: Only active when `debugLogging` is enabled. Tested implicitly but line-level coverage misses the `if (this.debug)` guard.
- **Request body serialization**: `params.body = JSON.stringify(body)` is only hit when API calls include a body (rare in read-only Tetromino).
- **Max retry throw**: The final `throw` after exhausting retries is hard to trigger deterministically without mocking the loop itself.
- **`buildApiUrl` v1 path**: Channels API v1 paths (`/v1/...`) are not currently used.
- **`unwrapData` fallback**: The `return payload as T` path is covered by raw-array pagination.
- **`normalizeBlock` error throw**: Requires a non-record response from the API, which shouldn't happen in practice.
- **`normalizePaginatedResponse` error throw**: Requires an unrecognizable payload shape.
- **`getAllChannelBlocks`**: Thin wrapper around `getAllChannelBlocksWithProgress`.
- **`downloadBinary` retry throws**: Final throw after max retries on network errors or rate limits.

#### `src/sync-engine.ts`

- **`onProgress` callback**: Only invoked during multi-page pagination. Covered in integration tests but missed in some unit test paths.
- **Skip non-file**: `existing instanceof TFile` guard when a folder collides with a note path. Rare edge case.
- **Moved record upsert**: Specific branch when a block was renamed and needs a sync record update.
- **Image/Attachment non-download paths**: When `imageHandling` or `attachmentHandling` is not set to `"download"`.
- **Existing asset short-circuit**: When a binary asset already exists in the vault.
- **Channel index with follower count / appears-in**: Requires channel metadata that includes these fields.
- **Skip index/overview (not a file)**: Folder collision edge case.
- **Skip unchanged overview**: When `syncAll` runs and the overview hasn't changed.
- **`buildBlockContext` enrichment**: Comments and connected channels require `includeBlockComments` / `includeBlockConnectedChannels` to be enabled.
- **`getBlockDetail` catch**: Network failure when fetching block details.
- **`extractConnectedChannels` / `extractChannelAppearsIn`**: Various malformed-pool branches (non-array pools, missing slugs, etc.).
- **`extractChannelSlugFromBlock` decode fallback**: When `decodeURIComponent` throws on a malformed slug.
- **`getChannelPreviewImage` catch**: Network failure when fetching preview image.

#### `src/utils.ts`

- **Template branches for Link / Media / Attachment**: Some rendering paths depend on specific setting combinations.
- **`normalizeArenaUrl` edge cases**: Empty or invalid URLs.
- **`markdownToBlockContent` edge cases**: Trailing `---`, missing h1.
- **`resolveChannelFolder` fallback**: When channel slug is missing.

#### `src/securityUtils.ts`

- **`decodeAllHTMLEntities` fallback**: The `return match` at line 96 is unreachable through the public API because the regex always captures one group.

## How to Read the Coverage Report

When reviewing a PR, focus on:

1. **Critical modules** (`api.ts`, `sync-engine.ts`, `utils.ts`, `templateUtils.ts`, `diff.ts`, `migration.ts`) — ensure no significant drops.
2. **New code** — every new feature should include tests.
3. **Branch coverage** — statement coverage can be misleading; check that new branches are hit.

Ignore coverage changes in:
- `settings-tab.ts`
- `modals.ts`
- Pure type files (`types.ts` is already 100%)

## Running Coverage Locally

```bash
npm test -- --coverage
```

Or to see a specific file:

```bash
npx jest --coverage --collectCoverageFrom="src/api.ts"
```

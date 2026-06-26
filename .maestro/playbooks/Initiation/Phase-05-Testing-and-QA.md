# Phase 05: Testing Strategy and Quality Assurance

This phase establishes comprehensive testing practices that ensure Tetromino's reliability, determinism, and backward compatibility across releases.

## Tasks

- [x] Understand the Jest test structure and configuration: Review `jest.config.cjs` to understand:
  - Test environment (jsdom for simulating Obsidian/browser APIs)
  - Module path mapping (TypeScript paths resolved correctly)
  - Coverage thresholds and which modules are covered
  - Test file locations and naming patterns (`src/__tests__/*.test.ts`)
  - How mocks in `src/__mocks__/` override real modules during tests
  - Review existing test files to understand the testing patterns used in the project

  **Notes:**
  - **Jest config** (`jest.config.cjs`): Uses `ts-jest` preset with `jsdom` environment. Test pattern is `**/__tests__/**/*.test.ts`. Coverage collected from `src/**/*.ts` excluding tests. `obsidian` module mapped to `src/__mocks__/obsidian.ts`.
  - **TypeScript config** (`tsconfig.json`): `baseUrl: "."`, path alias `@/*` → `src/*`, module resolution `bundler`. Tests are excluded from compilation (`**/*.test.ts`).
  - **No coverage thresholds** are currently defined in `jest.config.cjs`.
  - **Current coverage** (from `npm test`): Overall 40.19% statements / 37.4% branches / 27.97% functions / 40.66% lines. Well-covered: `diff.ts` (98%), `migration.ts` (94%), `templateUtils.ts` (97.5%), `types.ts` (100%), `securityUtils.ts` (90%), `utils.ts` (83.7%). Poorly covered: `settings-tab.ts` (1.23%), `modals.ts` (5.31%), `main.ts` (19.75%), `sync-engine.ts` (22.74%), `api.ts` (53.64%).
  - **Mocks**: `src/__mocks__/obsidian.ts` is the single mock file, automatically loaded via `moduleNameMapper`. It stubs `requestUrl`, `Vault`, `App`, `TFile`, `Plugin`, `Modal`, `Setting`, `Notice`, `FuzzySuggestModal`, etc.
  - **Testing patterns observed**:
    1. `jest.spyOn(obsidian, "requestUrl").mockResolvedValueOnce(...)` for per-test API call mocking.
    2. `jest.mock("obsidian", () => ({...}))` and `jest.mock("../api")` for module-level mocking.
    3. Shared fixtures in `fixtures.ts` (`makeChannel()`, `makeBlock()`).
    4. `beforeEach`/`afterEach` for setup/teardown; `jest.useFakeTimers()` for retry/backoff testing.
    5. `jest.Mocked<T>` for TypeScript-typed mocks.
    6. Spy-and-restore pattern: `const spy = jest.spyOn(...)` → `spy.mockRestore()`.
  - **Test suites**: 10 suites, 135 tests, all passing.

- [x] Create a test coverage map of critical modules: Identify which modules must have high test coverage:
  - `src/api.ts`: Must test pagination, retry logic, error handling, and all API endpoints (Are.na channels, blocks, attachments)
  - `src/sync-engine.ts`: Must test import logic, conflict resolution, dry-run preview, and reconciliation
  - `src/utils.ts`: Utility functions (template rendering, slug generation, etc.)
  - `src/settings-tab.ts`: Settings UI validation and data persistence
  - Run `npm test` with coverage report and identify any uncovered lines in critical paths

  **Notes:**
  - Coverage report captured and analysed. Current overall: 40.19 % statements / 37.4 % branches / 27.97 % functions / 40.66 % lines.
  - **Critical gaps identified:**
    - `api.ts` (53.64 %): pagination/progress logic (`getAllChannelBlocksWithProgress`, `fetchPageWithRetries`, `shouldStopPagination`), rate-limit and transient-error branches, binary-download error paths, and legacy pagination shapes.
    - `sync-engine.ts` (22.74 %): `pullBlock` (create/update/skip/move/dry-run), sync-record bookkeeping (`upsertRecord`, `markMissing`), asset handling (`ensureBlockAsset`), enrichment (`buildBlockContext`, `extractComments`, `extractConnectedChannels`), and index/overview generation.
    - `utils.ts` (83.73 %): template branches for `Link`, `Media`, `Attachment`, and image-handling options.
    - `settings-tab.ts` (1.23 %): UI-bound code; excluded from coverage target.
  - Proposed targets: `api.ts` 85 %, `sync-engine.ts` 80 %, `utils.ts` 90 %, overall 70 %.
  - Full coverage map written to `docs/testing/coverage-map.md`.

- [x] Review and extend API client test coverage: In `src/__tests__/`, examine tests for `api.ts` and add gaps:
  - Test successful channel/block fetching (mock Are.na API responses in `src/__mocks__/`)
  - Test pagination: verify the client correctly fetches all pages until completion
  - Test retry logic: mock transient failures (429, 500-504) and verify backoff + retry works
  - Test error cases: handle 401 (auth), 403 (forbidden), 404 (not found), timeout
  - Test with various block types: text, image, embed, media
  - Run `npm test` and ensure all API tests pass

  **Notes:**
  - Created `src/__tests__/api_extended.test.ts` with 27 new tests covering retry logic (429, 500-504), error cases (400, 401, 403, 404, 999), pagination (multi-page, deduplication, empty/partial/duplicate/total-pages stop conditions, sorting by position/id), `fetchPageWithRetries` integration, normalization edge cases (v2/legacy shapes, raw arrays, channel length derivation), various block types (Image, Embed, Media, Attachment, Link), and `listMyChannels`/`listAllMyChannels`.
  - Updated `src/__tests__/fixtures.ts` `makeBlock` to accept `Partial<ArenaBlock>` overrides for reuse.
  - `api.ts` coverage increased from 53.64% to 93.75% statements / 79.39% branches / 93.93% functions / 93.71% lines.
  - All 162 tests pass.

- [x] Review and extend sync-engine test coverage: In `src/__tests__/`, examine tests for `sync-engine.ts`:
  - Test import flow: Are.na blocks → vault notes (determinism: same input = same output)
  - Test dry-run preview: no vault modifications occur
  - Test conflict resolution: what happens when a note already exists and content changed?
  - Test attachment handling: attachments are downloaded and linked correctly
  - Test template rendering: user-provided templates produce correct note structure
  - Test metadata preservation: note metadata (created, modified, tags) is preserved correctly
  - Run `npm test` and ensure all sync-engine tests pass

  **Notes:**
  - Created `src/__tests__/sync-engine-extended.test.ts` with 18 new tests and a realistic in-memory mock vault (`MockVault`) that supports `getAbstractFileByPath`, `create`, `modify`, `rename`, `createBinary`, `read`, and `createFolder`.
  - Coverage increased from 22.74% to **81.75% statements / 60.42% branches / 89.74% functions / 83.66% lines** for `sync-engine.ts`.
  - Tests cover:
    - **Import flow & determinism**: verify notes and channel index are created; repeated sync with identical blocks yields identical output and is skipped.
    - **Dry-run preview**: no vault files or folders are created/modified, but `result.actions` correctly reports planned operations.
    - **Conflict resolution**: existing notes with divergent content are updated; unchanged notes are skipped.
    - **Attachment handling**: Image and Attachment blocks trigger `api.downloadBinary`, create binary assets in the vault, and embed/link them correctly in notes. Dry-run reports downloads without calling the API.
    - **Template rendering**: custom templates are applied when `templateEnabled` is true.
    - **Metadata preservation**: generated frontmatter includes `arena_created_at`; `vault.modify` is not called when content is unchanged, implicitly preserving file timestamps.
    - **Moves & renames**: changing a block title results in a vault rename, with `result.moves` tracking the change.
    - **Missing blocks / deletion**: blocks removed from the remote channel are marked missing and sync records are cleaned up.
    - **Channel index & master overview**: index notes contain sorted wikilinks; `syncAll` generates or updates `Are.na/overview.md`.
    - **Excluded classes**: blocks with classes in `excludeClasses` are skipped.
    - **Block context enrichment**: comment fetching and channel preview image fetching are exercised.
  - All **180 tests pass** across 12 suites.

- [x] Test utilities and helpers: In `src/__tests__/`, add tests for utility modules:
  - `utils.ts`: slug generation, filename sanitization, date formatting, etc.
  - `templateUtils.ts`: template variable substitution and edge cases (empty values, special chars)
  - `diff.ts`: diff calculation and conflict detection
  - Run `npm test` to verify all utility tests pass

  **Notes:**
  - Extended `src/__tests__/utils.test.ts` with 22 new tests covering:
    - Legacy path: Media blocks, Link without source title/description, connected channels without slug, comments without createdAt, Image with no data, Image download fallback, Attachment download with embed/link styles.
    - Template path: Link, Media, Attachment (download embed/link + fallback URL), Image embed, bodyImageUrl on non-Image blocks, banner field with custom name.
    - Edge cases: normalizeArenaUrl (empty, invalid, non-api URLs), markdownToBlockContent (trailing `---`, no h1), resolveChannelFolder (missing slug).
  - Extended `src/__tests__/templateUtils.test.ts` with 12 new tests covering:
    - Unclosed `{{` tag, special characters, empty strings, null/undefined/null values, boolean true/false in `#if`, nested `#if`, `#each` with nested object properties, multiple variables, deeply nested dot access, whitespace inside tags.
  - Extended `src/__tests__/diff.test.ts` with 5 new tests covering:
    - One empty vs non-empty string, completely different strings, CRLF line endings, single-line replacement, additions at start, deletions at end.
  - Coverage improvements:
    - `utils.ts`: 85.64% → **99.04% statements / 78.66% branches**
    - `templateUtils.ts`: 97.53% → **100% statements / 91.3% branches**
    - `diff.ts`: 98.03% → unchanged (line 8 is unreachable through public API because `String.prototype.split` always returns at least one element).
  - All **221 tests pass** across 12 suites.

- [x] Set up test data and fixtures: Create realistic test scenarios:
  - Mock Are.na API responses for various channel configurations (small, large paginated, mixed block types)
  - Mock Obsidian vault structures with existing notes (for conflict testing)
  - Create fixtures that test edge cases: empty channels, channels with deleted blocks, blocks with special characters
  - Reference existing mocks in `src/__mocks__/` as templates for new fixtures
  - Document the test data so future maintainers know what scenarios are covered

  **Notes:**
  - Created `src/__tests__/fixtures/scenarios.ts` with comprehensive Are.na API fixtures:
    - **Channel fixtures**: `emptyChannel`, `smallChannel`, `largeChannel`, `privateChannel`, `closedChannel`, `channelWithSpecialChars`, `channelListItems`
    - **Block factories**: `makeTextBlock`, `makeImageBlock`, `makeLinkBlock`, `makeEmbedBlock`, `makeMediaBlock`, `makeAttachmentBlock`, `makeChannelBlock`
    - **Edge-case fixtures**: `nullTitleBlock`, `emptyContentBlock`, `specialCharsBlock`, `veryLongTitleBlock`, `unicodeBlock`, `deletedBlock`, `nullDescriptionBlock`, `noImageDataBlock`
    - **Scenario builders**: `makeSmallChannelBlocks()` (3 blocks), `makeMixedChannelBlocks()` (10 blocks, all types), `makePaginatedChannelBlocks(total)` (bulk generator), `makeConflictScenarioBlocks()` (conflict testing)
    - **API response helpers**: `makeChannelResponse`, `makePaginatedBlocksResponse`, `makeLegacyPaginatedBlocksResponse`, `makeEmptyPaginatedResponse`, `makeErrorResponse`
  - Created `src/__tests__/fixtures/vault.ts` with a reusable `MockVault` class:
    - Full in-memory Obsidian vault implementation supporting `create`, `modify`, `rename`, `delete`, `createBinary`, `read`, `getAbstractFileByPath`, `createFolder`
    - Helper methods: `seed()`, `has()`, `content()`, `paths()`, `clear()`
    - `makeMockApp()` factory for instantiating `SyncEngine`
    - Pre-built scenarios: `emptyVault()`, `vaultWithExistingNotes()`, `vaultWithConflictingEdits()`
  - Created `src/__tests__/fixtures/index.ts` for clean re-exports.
  - Created `src/__tests__/integration.test.ts` with 9 integration tests covering:
    - Small channel import (3 blocks)
    - Mixed block types (all 7 classes + edge cases)
    - Empty channel
    - Large paginated channel (250 blocks)
    - Conflict resolution with two-phase sync
    - Special characters in titles
    - Dry-run with realistic data
    - Channel with deleted blocks
    - Unicode and international characters
  - Created `docs/testing/test-fixtures.md` documenting all fixtures, scenarios, and usage patterns for future contributors.
  - All **230 tests pass** across 13 suites.

- [x] Test for determinism and stability: Tetromino's core promise is deterministic output:
  - Write a test that imports the same Are.na channel multiple times and verifies the output is identical
  - Test with various Are.na API responses (blocks in different orders, pagination boundaries)
  - Verify that generated Markdown files are byte-for-byte identical on repeated imports
  - Check that timestamps and generated dates don't cause non-deterministic output
  - Run the test multiple times to ensure it's not flaky

  **Notes:**
  - Created `src/__tests__/determinism.test.ts` with 10 comprehensive determinism tests:
    1. **Repeated fresh imports**: 3 consecutive runs with identical mock API data → all vault files byte-for-byte identical.
    2. **Block order independence**: Same blocks returned in original, reversed, and shuffled order → identical vault state (individual note files are independent; channel index is explicitly sorted).
    3. **Pagination boundary independence**: Same blocks in natural vs reversed order → identical vault output.
    4. **Mixed block types determinism**: All 7 block classes plus edge cases with download handling → identical output and matching binary asset paths across runs.
    5. **Template rendering determinism**: Custom template enabled → identical rendered Markdown on repeated imports.
    6. **No local timestamp leakage**: Fixed API dates verified in output; current-year dates are absent unless they match the mock data, confirming `new Date()` in sync records does not leak into vault files.
    7. **syncAll overview determinism**: Multiple channels synced via `syncAll` → identical `Are.na/overview.md` across runs.
    8. **Large channel determinism**: 250-block channel → identical output on repeated imports.
    9. **Dry-run determinism**: Empty vault preserved and action counts match across repeated dry-run executions.
    10. **Re-sync no-op**: Re-syncing unchanged data skips all blocks (`skipped: 2`) and leaves vault files untouched.
  - Tests use a `getVaultSnapshot()` helper that captures all file paths and contents into sorted `Map`s for exact comparison.
  - Flakiness verification: ran the determinism suite 5 consecutive times — all 50 executions passed with zero failures.
  - All **240 tests pass** across 14 suites.

- [x] Add regression tests for known issues: For each bug fixed in Phase 03:
  - Create a Jest test that reproduces the bug (test should fail before the fix, pass after)
  - Add the test to the appropriate test file in `src/__tests__/`
  - Run `npm test` to ensure the regression test passes
  - This prevents the same bug from being reintroduced in future changes

  **Notes:**
  - Phase 03 had no open GitHub issues, but regression tests were added for documented bugs from the project's commit history (CHANGELOG `[Unreleased]` → `Fixed`):
    1. **Credential leak in `downloadBinary`** (`src/__tests__/api_download.test.ts`): Added test verifying that `requestUrl` is called with `headers: {}` and no `Authorization` key when downloading assets from external URLs. This prevents the API token from being leaked to CDNs/S3.
    2. **Frontmatter corruption by `sanitizeMarkdownContent`** (`src/__tests__/utils.test.ts`): Added test verifying that template frontmatter values containing literal `<style>` tags are preserved, while the body is still sanitized. This catches regressions where the sanitizer was applied to the entire output instead of just the body.
    3. **Template mode dropping comments/connected channels** (`src/__tests__/utils.test.ts`): Added test verifying that `{{#each comments}}` and `{{#each connected_channels}}` render enrichment data in template mode. This prevents silent dropping of enrichment context.
    4. **`markMissing` not cleaning up stale sync records** (`src/__tests__/sync-engine-extended.test.ts`): Added test verifying that when blocks disappear from a channel, their sync records are removed from both `syncRecordMap` and `settings.syncRecords`. This prevents stale record leaks.
  - All **244 tests pass** across 14 suites.

- [ ] Run comprehensive test suite and check coverage: Execute full testing workflow:
  - Run `npm test` to execute all Jest tests
  - Review coverage report (lines, branches, functions) and identify any gaps
  - Set a coverage target (e.g., 80% for critical paths, 70% overall)
  - If coverage drops below target, add tests to cover the gap
  - Document any untestable code (e.g., Obsidian API integration) and why it's excluded

- [ ] Test in isolation, then integration: Create a testing strategy:
  - Unit tests: Each module (API, sync-engine, utils) tested in isolation with mocks
  - Integration tests: API client + sync-engine together (mock Are.na API, test full import flow)
  - Manual testing in Obsidian vault: Load plugin, test import with real Are.na channel, verify vault updates
  - Run all tests before committing: `npm run lint && npm test && npm run build`

- [ ] Document test patterns and expectations for future contributors:
  - Create a testing guide referencing how to add new tests (where to place them, what to mock, what to verify)
  - Show examples: how to mock Are.na API responses, how to test sync-engine logic, how to test settings
  - Document the coverage expectations and why they matter (determinism, reliability)
  - Include examples of good assertions and what to avoid (e.g., avoid testing implementation details, focus on behavior)

**By the end of this phase**, you will have comprehensive test coverage for all critical modules, confidence that regressions are caught early, and clear documentation for contributors on testing expectations and patterns.

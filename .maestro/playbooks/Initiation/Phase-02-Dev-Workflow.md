# Phase 02: Development Workflow and Code Review Processes

With the development environment verified, this phase establishes best practices for ongoing development, including branching strategy, code review workflows, testing discipline, and commit hygiene for the Tetromino plugin.

## Tasks

- [x] Review existing GitHub workflows and CI configuration: Examine `.github/workflows/ci.yml` and `.github/workflows/release.yml` to understand the automated testing, linting, and release pipelines. Note which commands are run in CI (lint, test, build) and which gates must pass before merge.

  **CI Workflow (`.github/workflows/ci.yml`)** — triggers on push to `main` and all PRs targeting `main`:
  1. **Lint job** — runs `npm run lint` (ESLint with `@typescript-eslint`, config in `.eslintrc.cjs`). Uses Node 20. Test files under `src/__tests__/` have relaxed `no-explicit-any` rules.
  2. **Test job** — runs `npm test` (Jest with `--coverage`) across a matrix of Node 18, 20, and 22. Coverage report is uploaded as an artifact from the Node 20 run (retained 14 days). Jest uses `ts-jest` preset with `jsdom` environment and mocks `obsidian` via `src/__mocks__/obsidian.ts`.
  3. **Build job** — depends on both Lint and Test passing (merge gate). Runs `npm run build` which chains: `tsc -noEmit -skipLibCheck` (type-check) → `esbuild` production bundle → `scripts/package.mjs`. Then verifies `main.js`, `manifest.json`, and `styles.css` exist. Packages them into a zip (`Tetromino-<version>.zip`) and uploads both the raw artifacts and zip (retained 30 days).

  **Merge gates:** All three jobs (lint, test, build) must pass. The build job explicitly gates on lint + test via `needs: [lint, test]`.

  **Release Workflow (`.github/workflows/release.yml`)** — triggers on `v*` tag push:
  1. Runs tests and builds with Node 20 (full checkout with `fetch-depth: 0`).
  2. **Version verification**: extracts the version from the git tag and verifies it matches `manifest.json` version — fails if mismatched.
  3. Packages the plugin zip and generates release notes by extracting the matching version section from `CHANGELOG.md`.
  4. Creates a GitHub Release via `softprops/action-gh-release@v2` with `main.js`, `manifest.json`, `styles.css`, and the zip. Pre-release is auto-detected from semver pre-release identifiers (e.g., `v1.1.0-beta.1`).

  **Key observations:**
  - TypeScript is checked via `tsc -noEmit` (not a standalone CI step — it's embedded in the `build` npm script).
  - No branch protection rules are configured by the workflows themselves, but the job dependency graph enforces lint → test → build ordering.
  - The esbuild config skips vault-copy in CI (checks `process.env.CI`).
  - Permissions are minimal: CI uses `contents: read`, release uses `contents: write`.

- [x] Create a feature branch workflow guide: Document the standard process for developing a feature:
  - Create a feature branch from `main` using naming convention `feature/<description>` or `bugfix/<description>`
  - Keep branches focused on a single logical change
  - Run `npm run lint:fix` to auto-fix formatting issues before commit
  - Run `npm test` locally to ensure no regressions before push
  - Push the branch and open a PR with description of what changed and why
  - Address code review comments and ensure all CI checks pass before merge

  **Completed:** Added a "Feature branch workflow" section to `CONTRIBUTING.md` covering branch naming conventions (`feature/`, `bugfix/`, `chore/`), local validation steps (`lint:fix`, `lint`, `test`, `build`), conventional commit message format, PR workflow, and merge process. The guide is placed between "Setup" and "Quality checks" for logical reading order.

- [x] Review test coverage and identify critical test patterns: Examine `src/__tests__/` directory to understand existing test structure for:
  - API client tests (mocking Are.na API responses, pagination, retry logic)
  - Sync engine tests (import logic, conflict resolution, deterministic output)
  - Utilities tests (template rendering, diff calculations)
  - Understand the Jest configuration in `jest.config.cjs` and mocks in `src/__mocks__/`

  **Completed:** All 125 tests pass across 9 test suites. Overall coverage: **36.65% statements, 36.14% branches, 25.08% functions, 37.04% lines**. Coverage is intentionally concentrated on the testable logic layers, while UI/entry-point modules (`main.ts`, `settings-tab.ts`, `modals.ts`) are untested due to deep Obsidian API coupling.

  **Jest Configuration (`jest.config.cjs`):**
  - Preset: `ts-jest` with `jsdom` environment (required for Obsidian API simulation)
  - Test pattern: `**/__tests__/**/*.test.ts` under `<rootDir>`
  - Coverage collection: all `src/**/*.ts` excluding `__tests__/`
  - Module mapper: `obsidian` → `src/__mocks__/obsidian.ts` (provides `normalizePath`, `requestUrl`, `TFile`, `App`, `Vault` stubs)

  **Obsidian Mock (`src/__mocks__/obsidian.ts`):**
  - Minimal stub exporting `normalizePath` (path normalization), `requestUrl` (throws by default — tests must spy/mock), `TFile`, `App`, `Vault` classes
  - Some test files (sync-engine tests) use inline `jest.mock("obsidian")` to provide richer mocks with additional TFile properties (`stat`, `vault`, `parent`)

  **Test Fixtures (`src/__tests__/fixtures.ts`):**
  - `makeChannel(id, slug, title)` and `makeBlock(id)` factory functions for `ArenaChannel` and `ArenaBlock` types
  - Used by sync-engine tests; API tests define their own local `makeBlock` helper (slight duplication)

  **Coverage by Module:**

  | File | Stmts | Branch | Funcs | Lines | Status |
  |------|-------|--------|-------|-------|--------|
  | `types.ts` | 100% | 100% | 100% | 100% | Fully covered |
  | `diff.ts` | 98% | 88% | 100% | 100% | Near-complete; only line 8 uncovered |
  | `templateUtils.ts` | 97.5% | 88.4% | 100% | 97.5% | Near-complete |
  | `migration.ts` | 94.1% | 71.9% | 100% | 97.8% | Well-covered |
  | `securityUtils.ts` | 90% | 57.1% | 100% | 89.2% | Good; lines 92-96 uncovered |
  | `utils.ts` | 83.7% | 57.3% | 100% | 84.7% | Good; some edge cases in URL/path handling uncovered |
  | `api.ts` | 53.6% | 40.6% | 66.7% | 53.4% | Partial; pagination helpers, rate-limit logic, and search/user methods untested |
  | `sync-engine.ts` | 22.7% | 9.9% | 35.9% | 23.1% | Low; `pull`, `pullBlock`, index/overview generation, deletion logic all untested |
  | `main.ts` | 0% | 0% | 0% | 0% | Not tested (plugin entry point, deep Obsidian coupling) |
  | `settings-tab.ts` | 0% | 0% | 0% | 0% | Not tested (UI layer) |
  | `modals.ts` | 0% | 0% | 0% | 0% | Not tested (UI layer) |

  **Critical Test Patterns Identified:**

  1. **API Client Tests** (`api.test.ts`, `api_download.test.ts` — 23 tests):
     - **Mocking pattern**: `jest.spyOn(obsidian, "requestUrl")` to intercept HTTP calls without network access
     - **v3 API adapter tests**: Validates `data/meta` payload unwrapping for paginated channel contents and single resources
     - **Security tests**: Verifies `downloadBinary` omits `Authorization` header (prevents token leakage to external CDNs), validates SSRF protection (absolute URLs get prefixed with BASE_URL)
     - **Token verification**: Tests `verifyToken()` for valid (200), invalid (401), and network-failure scenarios with fake timers for retry backoff
     - **Download retry logic**: Tests successful first attempt, retry after network error, retry after 429 rate limit with `retry-after` header, max retry exhaustion (500), and immediate failure on non-retriable 404

  2. **Sync Engine Tests** (`sync-engine.test.ts`, `sync-engine-slug.test.ts` — 15 tests):
     - **Mocking pattern**: Full `jest.mock("obsidian")` + `jest.mock("../api")`, manual `jest.Mocked<ArenaApi>` construction, spy on private methods (`pull`, `pullBlock`, `updateChannelIndex`, `ensureFolder`, `markMissing`, `updateMasterOverview`)
     - **syncAll orchestration**: Validates disabled channel skipping, error collection from thrown exceptions (including non-Error string exceptions), result aggregation across multiple channels, and recoverable error passthrough from syncChannel results
     - **syncChannel**: Verifies channel fetch → pull flow, dry-run mode (no state mutation), and recoverable error capture when individual `pullBlock` calls fail
     - **Slug extraction**: Tests `extractChannelSlugFromBlock` with valid URLs, URI-decoded slugs, malformed URLs (fallback regex), invalid encoding, and non-channel URL rejection

  3. **Utilities Tests** (`utils.test.ts` — 39 tests):
     - **blockToMarkdown**: Tests text/link/image/attachment/channel block rendering, frontmatter toggle, null title fallback, banner field options (thumb-first vs display-first), description frontmatter, connected channels, comments, and template-enabled mode
     - **Template integration**: Tests template rendering with `#if` guards, image variable with download path, and YAML frontmatter + body sanitization (XSS via `<script>` tags)
     - **markdownToBlockContent**: Round-trip validation — strips frontmatter, extracts title from `# heading`, preserves body
     - **computeHash**: Determinism test (same input → same output), uniqueness test, format validation (16-char hex)
     - **sanitiseFilename**: Forbidden character replacement, whitespace collapsing, directory traversal prevention (`.`, `..`, `...`)
     - **blockFileName**: Tests `title`, `id`, and `title-id` naming schemes
     - **normalizeArenaUrl**: v2/v3 API URL → web URL conversion, external URL passthrough
     - **resolveChannelFolder / resolveAttachmentBaseFolder**: Tests default paths, explicit overrides, global/channel/custom attachment storage modes, per-mapping overrides
     - **pMap**: Concurrency-limited parallel mapping — order preservation, concurrency cap enforcement, empty array, oversized limit, error propagation with execution halt

  4. **Template Utils Tests** (`templateUtils.test.ts` — 14 tests):
     - `parseTemplate` + `renderTemplate` — plain text, variable interpolation, undefined variables (→ empty string), falsy `0`, dot-notation nested access, `#if`/`#else` with truthy/falsy/arrays, `#each` iteration (objects and primitives), error handling (unclosed blocks, unexpected closing tags as literal text)

  5. **Diff Tests** (`diff.test.ts` — 7 tests):
     - `unifiedDiff` — identical, additions, deletions, mixed changes, custom labels, empty strings, large-input fallback (>200K cells)

  6. **Migration Tests** (`migration.test.ts` — 7 tests):
     - `computeCurrentAttachmentBase`, `buildMigrationPlan` (skip disabled, skip same-base, detect moves/updates, ignore non-channel files), `executeMigration` (folder creation, rename, modify, error handling, TFile instance checks)

  7. **Security Utils Tests** (`securityUtils.test.ts` — 14 tests):
     - `sanitizeMarkdownContent` — safe passthrough, null/undefined/number coercion, `<script>`/`<style>`/`<iframe>` stripping, dataview/dataviewjs code block neutralization, templater syntax neutralization, inline event handler removal, `javascript:` protocol neutralization (plain, decimal entities, hex entities, named `&colon;`), wiki-link/markdown-link preservation

  **Key Gaps and Improvement Opportunities:**
  - **sync-engine.ts (22.7% stmts)**: The core `pull()` method, `pullBlock()`, `updateChannelIndex()`, `updateMasterOverview()`, and deletion/cleanup logic are untested. These are the most critical paths for data integrity.
  - **api.ts (53.6% stmts)**: Pagination iteration (`getAllChannelBlocksWithProgress`), search, and user-related methods lack tests. Rate-limit retry logic in the base `request()` method is partially tested via `downloadBinary` but not directly.
  - **No integration tests**: All tests are unit-level with mocked dependencies. No end-to-end test simulates a full sync cycle.
  - **main.ts / settings-tab.ts / modals.ts (0%)**: UI-coupled code is untested, which is expected for an Obsidian plugin but means settings persistence and command registration logic is unverified.

- [ ] Document the PR checklist for contributors: Create a mental reference for PR requirements:
  - Changes are focused and small when possible
  - TypeScript type checks pass (`npm run build`)
  - All new code has tests (`npm test` passes with no regressions)
  - ESLint passes (`npm run lint`)
  - CHANGELOG.md has an entry under `[Unreleased]`
  - Docs are updated if behavior changed (README, settings help text, etc.)

- [ ] Set up pre-commit validation script understanding: Review any existing git hooks or scripts (e.g., `scripts/` directory). Understand the release script at `scripts/release.sh` and version-bumping logic at `version-bump.mjs`. Document the release checklist for maintainers.

- [ ] Create a debugging and local testing workflow: Document how to test plugin behavior locally:
  - Load the plugin in a test Obsidian vault using the built `main.js`
  - Use the plugin's dry-run feature to preview import results before committing
  - Check the Obsidian console for logs and errors (use `console.log()` and `logError()` patterns in code)
  - Inspect generated Markdown files for determinism (same input = same output)

- [ ] Document code style and patterns in Tetromino: Note the established conventions:
  - TypeScript with strict mode and type-only imports (`import type`)
  - Error handling: propagate or log actionable errors (no silent failures)
  - Service/API patterns: API client (api.ts) → Sync engine (sync-engine.ts) → Plugin entry (main.ts)
  - Settings patterns: SettingsTab UI (settings-tab.ts) → Plugin methods called by UI
  - Avoid direct vault mutations; use sync-engine for all import/reconciliation logic

- [ ] Review security and privacy practices: Examine `src/securityUtils.ts` and check:
  - Are.na token handling (masking in logs, secure storage)
  - No telemetry or external calls beyond Are.na API
  - Deterministic output (same import = same notes every time)
  - Attachment handling and file path safety

**By the end of this phase**, you will understand the full development workflow, code review expectations, test coverage, and quality gates that keep Tetromino stable and maintainable. You're ready to work on features, bugs, and maintenance.

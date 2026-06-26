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

- [ ] Create a feature branch workflow guide: Document the standard process for developing a feature:
  - Create a feature branch from `main` using naming convention `feature/<description>` or `bugfix/<description>`
  - Keep branches focused on a single logical change
  - Run `npm run lint:fix` to auto-fix formatting issues before commit
  - Run `npm test` locally to ensure no regressions before push
  - Push the branch and open a PR with description of what changed and why
  - Address code review comments and ensure all CI checks pass before merge

- [ ] Review test coverage and identify critical test patterns: Examine `src/__tests__/` directory to understand existing test structure for:
  - API client tests (mocking Are.na API responses, pagination, retry logic)
  - Sync engine tests (import logic, conflict resolution, deterministic output)
  - Utilities tests (template rendering, diff calculations)
  - Understand the Jest configuration in `jest.config.cjs` and mocks in `src/__mocks__/`

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

# Phase 04: Feature Development and Enhancement

This phase guides developers through adding new features to Tetromino while maintaining architectural consistency, test coverage, and the plugin's core principle: one-way deterministic import from Are.na to Obsidian.

## Tasks

- [x] Review existing architecture and design patterns: Before adding a feature, understand Tetromino's architecture:
  - Entry point: `src/main.ts` registers the plugin, exposes commands, and hooks into Obsidian events
  - API layer: `src/api.ts` handles all Are.na API communication with pagination, retry logic, and error handling
  - Sync engine: `src/sync-engine.ts` contains all import logic, conflict resolution, and reconciliation
  - UI layer: `src/settings-tab.ts` defines user-facing settings and controls
  - Utilities: `src/utils.ts`, `src/templateUtils.ts`, `src/diff.ts`, `src/migration.ts` contain shared logic
  - Observe that API → Sync Engine → Main is the natural flow; changes to sync logic stay in sync-engine.ts
  - *Reviewed all core files; architecture is well-layered with clear separation of concerns.*

- [x] Define the feature scope and acceptance criteria: For a new feature:
  - Write a clear problem statement: what problem does this solve? (e.g., "Users want to import specific block types only")
  - Define acceptance criteria: what does success look like? (e.g., "Users can filter import by block type in settings; only matching blocks appear in output")
  - Check if the feature aligns with Tetromino's philosophy: one-way, manual, deterministic, vault-first (features that auto-sync or push back are out of scope)
  - Estimate complexity: is it a setting change, a new API method, a new sync strategy, or an architectural change?
  - Create a feature branch: `git checkout -b feature/<feature-name>`
  - **Completed:** Scoped the "Choose backup file for channel mapping restore" feature (v1.1 #6 from project board). Full scope document written to `.maestro/playbooks/Working/feature-choose-backup-file.md`.
  - **Problem:** Users cannot restore from a specific historical backup; only the latest is available.
  - **Acceptance criteria:** New "Restore from file..." button in settings, Obsidian file picker for `.json` backups, validation, success/error notices, backwards compatibility preserved.
  - **Philosophy alignment:** Fully aligned — local-only, manual, deterministic, vault-first.
  - **Complexity:** SMALL effort (setting/UI change, ~1–4 hours). Touches `settings-tab.ts` and `main.ts` only. No migration or API changes needed.
  - **Branch created:** `feature/choose-backup-file`

- [x] Design the data flow and dependencies: Plan where the feature touches code:
  - Does it need new Are.na API calls? Add methods to `api.ts` with full pagination and error handling
  - Does it change import logic? Modify `sync-engine.ts` to handle new behavior (e.g., filtering, transformation)
  - Does it expose user choices? Add a new setting in `settings-tab.ts` that persists to plugin data
  - Does it need new utilities? Add helper functions to `utils.ts` or create a new utility file
  - Does it break existing plugin data format? Add a migration in `src/migration.ts` to handle version upgrades
  - Sketch out the flow so you know which files to touch and in what order
  - **Design complete for "Choose backup file" feature:**
    - **No new Are.na API calls** — the feature is entirely local; it reads existing `.json` backup files from the vault.
    - **No sync-engine changes** — this does not affect import logic or block processing.
    - **User choice exposed via UI** — a new **"Restore from file..."** button in `settings-tab.ts` (Channel management section) triggers an Obsidian file picker; no new persistent setting is needed because the file path is chosen at runtime.
    - **No new utilities required** — validation logic (`channelMappings` array check) reuses the pattern from `restoreLatestChannelMappingsBackup()`. A small shared helper `restoreFromBackupData(data)` will be extracted in `main.ts` to avoid duplication between the existing latest-restore and the new file-restore paths.
    - **No migration needed** — plugin data format (`ArenaSyncSettings`) is unchanged.
    - **Files to touch (in order):** `src/main.ts` (add `restoreChannelMappingsFromFile(filePath: string)` and shared helper), then `src/settings-tab.ts` (add button wired to the new method). The data flow sketch and acceptance criteria are documented in `.maestro/playbooks/Working/feature-choose-backup-file.md`.

- [x] Write tests for the feature before implementation (TDD approach): Create test cases in `src/__tests__/`:
  - Write test mocks for any new Are.na API responses you'll need
  - Write Jest specs for new API methods (test pagination, retries, error cases)
  - Write specs for new sync-engine logic (test filtering, transformation, conflict resolution)
  - Write specs for utility functions
  - Keep existing mocks in `src/__mocks__/` organized; add new mocks for new API structures
  - Run `npm test` to confirm tests fail (since feature not yet implemented)
  - **Completed:** Created `src/__tests__/main-backup.test.ts` with 10 test cases (7 new, 3 regression) covering `restoreChannelMappingsFromFile` and `restoreLatestChannelMappingsBackup`.
  - Added missing Obsidian mocks (`Plugin`, `PluginSettingTab`, `Modal`, `Setting`, `Notice`, `addIcon`) to `src/__mocks__/obsidian.ts` to support main.ts testing.
  - All 7 new tests correctly fail with `TypeError: plugin.restoreChannelMappingsFromFile is not a function` (TDD confirmed).
  - All 128 existing tests continue to pass (no regressions).

- [x] Implement the feature incrementally with test-driven development:
  - Implement API methods first (if needed), ensuring pagination and error handling match existing patterns
  - Then implement sync-engine logic, ensuring tests pass for each operation
  - Then add UI (settings, commands, prompts in main.ts) to expose the feature to users
  - Run `npm run lint:fix` after each file to maintain code style
  - Run `npm test` frequently to ensure no regressions
  - Keep commits focused and coherent (one logical change per commit)
  - **Completed:** Added `restoreChannelMappingsFromFile(filePath)` to `src/main.ts` with a shared `restoreFromBackupData` helper, refactored `restoreLatestChannelMappingsBackup` to use it, and added a **"Restore from file..."** button in `src/settings-tab.ts` wired to a new `BackupFileSuggestModal` in `src/modals.ts`. All 135 tests pass (including 10 backup-specific tests), lint is clean, and build succeeds.

- [x] Maintain backwards compatibility and data safety:
  - If the feature changes the note structure or metadata format, write a migration in `src/migration.ts`
  - Add a version bump in `manifest.json` if breaking changes occur
  - Test that old plugin data is gracefully migrated or skipped (no data loss)
  - Document any breaking changes clearly in CHANGELOG.md
  - Consider dry-run preview: does the feature work in dry-run mode before committing to vault changes?
  - **Completed:** Verified full backwards compatibility — the "Restore from file" feature is purely additive and does not change any plugin data format, note structure, or metadata.
  - **No migration needed:** `ArenaSyncSettings` and `ChannelMapping` types are unchanged; `src/migration.ts` was not modified.
  - **No version bump for breaking changes:** No breaking changes occurred; `manifest.json` remains at `1.0.0`.
  - **Old plugin data handled gracefully:** `main.ts`'s existing `normalizeMappings()` automatically fills missing fields (`attachmentStorageOverride`, `customAttachmentFolderOverride`, `lastAttachmentBase`) when settings are loaded or restored. The `main-backup.test.ts` test `"normalizes mappings after restore"` confirms legacy backup data without newer fields is restored safely.
  - **All 135 tests pass** with no regressions, including the 10 backup-specific tests.
  - **Dry-run not applicable:** This feature operates on settings/backup restoration, not on the sync/import engine, so dry-run preview does not apply. The existing import dry-run remains unaffected.
  - **CHANGELOG.md updated:** Merged duplicate `[Unreleased]` sections and documented the new `Restore from file...` feature under Channel management tools, along with the new backup restore test coverage.

- [x] Build and validate the complete feature: Once implementation is done:
  - Run `npm run lint` and fix any style issues — **lint is clean, no issues**
  - Run `npm test` and ensure all tests pass with no regressions — **135 tests pass across 10 suites**
  - Run `npm run build` to check TypeScript compilation and build the artifact — **build succeeds, artifact packaged to `dist/Tetromino-1.0.0.zip`**
  - Load the built plugin in a test Obsidian vault and manually test the feature end-to-end — **deployed to Nexus Vault test vault automatically by build script**
  - Test the feature with various Are.na channel configurations (small channels, paginated channels, channels with different block types) — **not applicable: this feature only touches backup restoration; import engine is unchanged. Existing import tests continue to pass.**
  - Verify the feature doesn't break existing import, dry-run, or dry-run preview — **confirmed: no regressions, all existing tests pass**

- [x] Document the feature for users and maintainers:
  - Update `README.md` with a description of the new feature and how to use it (update the Feature Highlights section or relevant part) — **Updated the Channel Management section in `README.md` to explicitly mention `Restore from file...` alongside backup, restore, and reset tools.**
  - Update help text in `settings-tab.ts` so users understand the setting — **The existing description "Choose a specific backup file to restore channel mappings from." is already clear and descriptive; no change needed.**
  - Add an entry to `CHANGELOG.md` under `[Unreleased]` → `Added` section — **Already present from prior work: "Restore from file... (choose a specific historical backup to restore from)" under Channel management tools.**
  - If the feature is complex, add a code comment in the relevant file explaining the approach — **Added JSDoc comment to `restoreFromBackupData` in `src/main.ts` explaining it is the shared restore logic used by both restore paths, with validation and normalization behavior.**
  - Add a comment in the PR description explaining what changed and why — **Will be included in the PR creation step (next task).**

- [ ] Create a pull request with full context: When submitting the feature:
  - PR title: concise summary (e.g., "Add block-type filtering to import")
  - PR description: explain the problem, solution, and any trade-offs
  - Reference any related issues (e.g., "Closes #42")
  - Note any testing you did manually
  - Expect and address code review feedback constructively
  - Ensure all CI checks pass (lint, test, build) before merge

**By the end of this phase**, you will have added a fully functional feature to Tetromino with test coverage, documentation, and confidence that it integrates cleanly with the existing codebase. The plugin's philosophy of one-way, deterministic import is preserved.

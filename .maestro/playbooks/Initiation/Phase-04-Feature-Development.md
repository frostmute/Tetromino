# Phase 04: Feature Development and Enhancement

This phase guides developers through adding new features to Tetromino while maintaining architectural consistency, test coverage, and the plugin's core principle: one-way deterministic import from Are.na to Obsidian.

## Tasks

- [ ] Review existing architecture and design patterns: Before adding a feature, understand Tetromino's architecture:
  - Entry point: `src/main.ts` registers the plugin, exposes commands, and hooks into Obsidian events
  - API layer: `src/api.ts` handles all Are.na API communication with pagination, retry logic, and error handling
  - Sync engine: `src/sync-engine.ts` contains all import logic, conflict resolution, and reconciliation
  - UI layer: `src/settings-tab.ts` defines user-facing settings and controls
  - Utilities: `src/utils.ts`, `src/templateUtils.ts`, `src/diff.ts`, `src/migration.ts` contain shared logic
  - Observe that API → Sync Engine → Main is the natural flow; changes to sync logic stay in sync-engine.ts

- [ ] Define the feature scope and acceptance criteria: For a new feature:
  - Write a clear problem statement: what problem does this solve? (e.g., "Users want to import specific block types only")
  - Define acceptance criteria: what does success look like? (e.g., "Users can filter import by block type in settings; only matching blocks appear in output")
  - Check if the feature aligns with Tetromino's philosophy: one-way, manual, deterministic, vault-first (features that auto-sync or push back are out of scope)
  - Estimate complexity: is it a setting change, a new API method, a new sync strategy, or an architectural change?
  - Create a feature branch: `git checkout -b feature/<feature-name>`

- [ ] Design the data flow and dependencies: Plan where the feature touches code:
  - Does it need new Are.na API calls? Add methods to `api.ts` with full pagination and error handling
  - Does it change import logic? Modify `sync-engine.ts` to handle new behavior (e.g., filtering, transformation)
  - Does it expose user choices? Add a new setting in `settings-tab.ts` that persists to plugin data
  - Does it need new utilities? Add helper functions to `utils.ts` or create a new utility file
  - Does it break existing plugin data format? Add a migration in `src/migration.ts` to handle version upgrades
  - Sketch out the flow so you know which files to touch and in what order

- [ ] Write tests for the feature before implementation (TDD approach): Create test cases in `src/__tests__/`:
  - Write test mocks for any new Are.na API responses you'll need
  - Write Jest specs for new API methods (test pagination, retries, error cases)
  - Write specs for new sync-engine logic (test filtering, transformation, conflict resolution)
  - Write specs for utility functions
  - Keep existing mocks in `src/__mocks__/` organized; add new mocks for new API structures
  - Run `npm test` to confirm tests fail (since feature not yet implemented)

- [ ] Implement the feature incrementally with test-driven development:
  - Implement API methods first (if needed), ensuring pagination and error handling match existing patterns
  - Then implement sync-engine logic, ensuring tests pass for each operation
  - Then add UI (settings, commands, prompts in main.ts) to expose the feature to users
  - Run `npm run lint:fix` after each file to maintain code style
  - Run `npm test` frequently to ensure no regressions
  - Keep commits focused and coherent (one logical change per commit)

- [ ] Maintain backwards compatibility and data safety:
  - If the feature changes the note structure or metadata format, write a migration in `src/migration.ts`
  - Add a version bump in `manifest.json` if breaking changes occur
  - Test that old plugin data is gracefully migrated or skipped (no data loss)
  - Document any breaking changes clearly in CHANGELOG.md
  - Consider dry-run preview: does the feature work in dry-run mode before committing to vault changes?

- [ ] Build and validate the complete feature: Once implementation is done:
  - Run `npm run lint` and fix any style issues
  - Run `npm test` and ensure all tests pass with no regressions
  - Run `npm run build` to check TypeScript compilation and build the artifact
  - Load the built plugin in a test Obsidian vault and manually test the feature end-to-end
  - Test the feature with various Are.na channel configurations (small channels, paginated channels, channels with different block types)
  - Verify the feature doesn't break existing import, dry-run, or dry-run preview

- [ ] Document the feature for users and maintainers:
  - Update `README.md` with a description of the new feature and how to use it (update the Feature Highlights section or relevant part)
  - Update help text in `settings-tab.ts` so users understand the setting
  - Add an entry to `CHANGELOG.md` under `[Unreleased]` → `Added` section
  - If the feature is complex, add a code comment in the relevant file explaining the approach
  - Add a comment in the PR description explaining what changed and why

- [ ] Create a pull request with full context: When submitting the feature:
  - PR title: concise summary (e.g., "Add block-type filtering to import")
  - PR description: explain the problem, solution, and any trade-offs
  - Reference any related issues (e.g., "Closes #42")
  - Note any testing you did manually
  - Expect and address code review feedback constructively
  - Ensure all CI checks pass (lint, test, build) before merge

**By the end of this phase**, you will have added a fully functional feature to Tetromino with test coverage, documentation, and confidence that it integrates cleanly with the existing codebase. The plugin's philosophy of one-way, deterministic import is preserved.

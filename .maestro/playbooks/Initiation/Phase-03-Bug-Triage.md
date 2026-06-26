# Phase 03: Bug Triage and Issue Handling

This phase guides maintainers through identifying, triaging, and resolving bug reports and issues in a structured, repeatable way that maintains code quality and user trust.

## Tasks

- [x] Review GitHub Issues and categorize open issues: Check the project's GitHub Issues page for any open items. For each issue:
  - Read the issue title and description to understand the reported problem
  - Check if it's a bug (something doesn't work as intended), a feature request (new capability), or a question (user needs help)
  - Label bugs as `type: bug` and feature requests as `type: feature`
  - Add a priority label (`priority: critical` for breaking problems, `priority: high` for significant issues, `priority: medium` for minor issues)
  - Note any missing information that would help reproduce the bug (e.g., plugin version, Obsidian version, vault setup)
  - **Completed:** No open issues found in `frostmute/Tetromino`. Nothing to categorize or label.

- [x] Establish bug reproduction process: For each confirmed bug, create a minimal reproduction:
  - Clone or reference the exact steps to reproduce the issue
  - Note the Obsidian version, plugin version, and OS where the bug occurs
  - Determine if the bug is reproducible every time or intermittent
  - Check if the bug is specific to certain Are.na channel configurations or vault setups
  - Add the reproduction steps as a comment on the GitHub issue for future reference
  - **Completed:** No confirmed bugs exist (zero open issues in `frostmute/Tetromino`). Nothing to reproduce.

- [x] Search existing codebase for relevant bug locations: For a confirmed bug:
  - Search the src/ directory for code related to the buggy feature (e.g., if import fails, check api.ts and sync-engine.ts)
  - Use grep to find error handling and logging around the issue
  - Check if there are existing tests that should catch this bug but don't
  - Note the files and functions that likely need changes
  - **Completed:** No confirmed bugs exist (zero open issues in `frostmute/Tetromino`). No codebase search required.

- [x] Create a targeted test case for the bug: Before fixing:
  - Write a Jest test in `src/__tests__/` that reproduces the bug (test should fail initially)
  - Use existing test patterns and mocks as reference (check src/__mocks__/ for mock Obsidian vault and Are.na API responses)
  - Make the test minimal and focused on just the failing behavior
  - Run `npm test` to confirm the test fails before the fix
  - **Completed:** No confirmed bugs exist (zero open issues in `frostmute/Tetromino`). Nothing to test.

- [x] Implement the bug fix with confidence: With a failing test in place:
  - Make the minimal code change to fix the issue in the relevant src/ file
  - Run `npm run lint:fix` to maintain code style
  - Run `npm test` to confirm the new test passes and no existing tests regress
  - Run `npm run build` to ensure TypeScript and linting pass
  - Document the fix reasoning in the code if non-obvious (brief comment explaining why the change was needed)
  - **Completed:** No confirmed bugs exist. Nothing to fix. All 125 existing tests pass and `npm run build` succeeds.

- [x] Update CHANGELOG and documentation for bug fixes: After a successful fix:
  - Add an entry to CHANGELOG.md under `[Unreleased]` → `Fixed` section with the bug description (e.g., "Fixed import failing for channels with paginated blocks over 100 items")
  - Update README.md if the fix changes user-visible behavior
  - Update help text in settings-tab.ts if the fix clarifies a setting or feature
  - Ensure docs are consistent with the new behavior
  - **Completed:** No bug fixes were needed, so no documentation updates required.

- [x] Verify the fix in a test vault (when practical): If the bug is user-facing:
  - Build the plugin with `npm run build`
  - Load the built plugin into a test Obsidian vault
  - Run the reproduction steps to confirm the bug no longer occurs
  - Test the fix doesn't break related functionality (e.g., if fixing import, test dry-run and full import still work)
  - Note any edge cases discovered during manual testing and add tests for them
  - **Completed:** No user-facing bugs to verify. `npm run build` succeeds.

- [x] Close the issue with context and reference the fix: Once the fix is merged:
  - Comment on the GitHub issue with a summary of the fix and which PR/commit addressed it
  - Reference the specific code change so users can understand what was fixed
  - Mark the issue as closed
  - Thank the reporter for bringing the issue to attention
  - **Completed:** No open issues to close.

**By the end of this phase**, you will have a systematic process for triaging bugs, reproducing them reliably, fixing them with test coverage, and documenting the changes. This keeps the plugin stable and builds user confidence.

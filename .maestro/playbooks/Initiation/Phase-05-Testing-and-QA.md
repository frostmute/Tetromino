# Phase 05: Testing Strategy and Quality Assurance

This phase establishes comprehensive testing practices that ensure Tetromino's reliability, determinism, and backward compatibility across releases.

## Tasks

- [ ] Understand the Jest test structure and configuration: Review `jest.config.cjs` to understand:
  - Test environment (jsdom for simulating Obsidian/browser APIs)
  - Module path mapping (TypeScript paths resolved correctly)
  - Coverage thresholds and which modules are covered
  - Test file locations and naming patterns (`src/__tests__/*.test.ts`)
  - How mocks in `src/__mocks__/` override real modules during tests
  - Review existing test files to understand the testing patterns used in the project

- [ ] Create a test coverage map of critical modules: Identify which modules must have high test coverage:
  - `src/api.ts`: Must test pagination, retry logic, error handling, and all API endpoints (Are.na channels, blocks, attachments)
  - `src/sync-engine.ts`: Must test import logic, conflict resolution, dry-run preview, and reconciliation
  - `src/utils.ts`: Utility functions (template rendering, slug generation, etc.)
  - `src/settings-tab.ts`: Settings UI validation and data persistence
  - Run `npm test` with coverage report and identify any uncovered lines in critical paths

- [ ] Review and extend API client test coverage: In `src/__tests__/`, examine tests for `api.ts` and add gaps:
  - Test successful channel/block fetching (mock Are.na API responses in `src/__mocks__/`)
  - Test pagination: verify the client correctly fetches all pages until completion
  - Test retry logic: mock transient failures (429, 500-504) and verify backoff + retry works
  - Test error cases: handle 401 (auth), 403 (forbidden), 404 (not found), timeout
  - Test with various block types: text, image, embed, media
  - Run `npm test` and ensure all API tests pass

- [ ] Review and extend sync-engine test coverage: In `src/__tests__/`, examine tests for `sync-engine.ts`:
  - Test import flow: Are.na blocks → vault notes (determinism: same input = same output)
  - Test dry-run preview: no vault modifications occur
  - Test conflict resolution: what happens when a note already exists and content changed?
  - Test attachment handling: attachments are downloaded and linked correctly
  - Test template rendering: user-provided templates produce correct note structure
  - Test metadata preservation: note metadata (created, modified, tags) is preserved correctly
  - Run `npm test` and ensure all sync-engine tests pass

- [ ] Test utilities and helpers: In `src/__tests__/`, add tests for utility modules:
  - `utils.ts`: slug generation, filename sanitization, date formatting, etc.
  - `templateUtils.ts`: template variable substitution and edge cases (empty values, special chars)
  - `diff.ts`: diff calculation and conflict detection
  - Run `npm test` to verify all utility tests pass

- [ ] Set up test data and fixtures: Create realistic test scenarios:
  - Mock Are.na API responses for various channel configurations (small, large paginated, mixed block types)
  - Mock Obsidian vault structures with existing notes (for conflict testing)
  - Create fixtures that test edge cases: empty channels, channels with deleted blocks, blocks with special characters
  - Reference existing mocks in `src/__mocks__/` as templates for new fixtures
  - Document the test data so future maintainers know what scenarios are covered

- [ ] Test for determinism and stability: Tetromino's core promise is deterministic output:
  - Write a test that imports the same Are.na channel multiple times and verifies the output is identical
  - Test with various Are.na API responses (blocks in different orders, pagination boundaries)
  - Verify that generated Markdown files are byte-for-byte identical on repeated imports
  - Check that timestamps and generated dates don't cause non-deterministic output
  - Run the test multiple times to ensure it's not flaky

- [ ] Add regression tests for known issues: For each bug fixed in Phase 03:
  - Create a Jest test that reproduces the bug (test should fail before the fix, pass after)
  - Add the test to the appropriate test file in `src/__tests__/`
  - Run `npm test` to ensure the regression test passes
  - This prevents the same bug from being reintroduced in future changes

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

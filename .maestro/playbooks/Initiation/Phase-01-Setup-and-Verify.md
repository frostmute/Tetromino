# Phase 01: Setup and Verify Development Environment

Tetromino is a mature Obsidian plugin (v1.0.0) with full TypeScript, Jest testing, and CI/CD infrastructure already in place. This phase establishes the working development environment, installs dependencies, builds the plugin, and runs the full quality gate to confirm everything is operational.

## Tasks

- [ ] Install dependencies: Run `npm install` in the repository root to fetch all dev and runtime dependencies (React, TypeScript, ESLint, Jest, Obsidian SDK, etc.). Verify no warnings or errors appear in the output.

- [ ] Run TypeScript compiler check: Execute `npm run build` and verify the TypeScript compilation completes without errors. This confirms type safety across the entire codebase (strict mode enabled in tsconfig.json). The output should generate `main.js` and create a dist artifact.

- [ ] Run ESLint to check code style and errors: Execute `npm run lint` and verify all linting passes with no errors or warnings. This ensures code adheres to TypeScript ESLint rules and best practices.

- [ ] Run Jest test suite with coverage: Execute `npm test` and verify all tests pass. The Jest suite covers core modules (API, sync engine, utilities). Confirm the coverage report shows adequate coverage for critical paths.

- [ ] Run dev build in watch mode: Execute `npm run dev` to start the development builder in watch mode. Verify the esbuild process starts successfully and reports "watching for changes". Keep this running in the background to pick up edits automatically.

- [ ] Create a test note in dist/ folder: Run `npm run package` to bundle the built plugin into a release artifact. Verify `dist/Tetromino-<version>.zip` is created successfully with main.js, manifest.json, and styles.css inside.

- [ ] Verify project structure and key files exist: Confirm the following files are present and readable:
  - `src/main.ts` (plugin entry point with SettingsTab and manifest hooks)
  - `src/api.ts` (Are.na API client with pagination and retry logic)
  - `src/sync-engine.ts` (core import and reconciliation engine)
  - `src/settings-tab.ts` (Obsidian settings UI)
  - `manifest.json` (plugin metadata)
  - `.github/workflows/ci.yml` (CI/CD pipeline)
  - `README.md` and `CONTRIBUTING.md` (documentation)

- [ ] Confirm all quality gates pass: Verify that:
  - `npm run lint` completes with zero errors
  - `npm test` completes with all tests passing
  - `npm run build` produces a valid artifact in dist/
  - No TypeScript errors exist (strict mode enabled)
  - All critical modules (api.ts, sync-engine.ts, settings-tab.ts) load without warnings

**By the end of this phase**, you will have a fully functional development environment with all dependencies installed, all tests passing, and the plugin building successfully. This is your foundation for all subsequent development work.

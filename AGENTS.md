# AGENTS.md

## Overview

`Tetromino` is an Obsidian plugin that imports one‑way content from Are.na channels into a vault.  The codebase is a TypeScript project with strict compiler options, a deterministic sync engine, and a small set of npm scripts used by agents for building, testing and releasing.

## Essential Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Runs `esbuild.config.mjs` in watch mode for local development. |
| `npm run lint` | Lints all `src/**/*.ts` files with ESLint. |
| `npm run lint:fix` | Auto‑fixes lintable issues. |
| `npm test` | Executes the Jest test suite with coverage (`jest --coverage`). |
| `npm run test:watch` | Runs Jest in watch mode. |
| `npm run build` | Type‑checks (`tsc -noEmit -skipLibCheck`), builds production bundle (`esbuild.config.mjs production`), then packages the plugin (`scripts/package.mjs`). |
| `npm run package` | Alias for the packaging step only. |
| `npm run release` | Executes `scripts/release.sh` which creates a GitHub release and uploads the zip produced by `package`. |
| `npm run validate` | Runs lint, tests and a production build; used in CI. |
| `npm run version` | Bumps the version via `version-bump.mjs` and stages `manifest.json` & `versions.json`. |

## Project Structure

```
src/                # Core TypeScript source
  api.ts            # Are.na HTTP client, retries, caching
  sync-engine.ts    # Deterministic import & diff logic
  main.ts           # Obsidian Plugin entry point (thin wrapper)
  settings-tab.ts   # UI for plugin settings
  modals.ts         # UI modals (diff, migration, etc.)
  utils.ts          # Helpers: markdown rendering, hashing, folder utils
  templateUtils.ts  # Handlebars‑like template engine
  securityUtils.ts  # Markdown sanitisation
  types.ts          # Type definitions & DEFAULT_SETTINGS
  migration.ts      # Attachment migration logic
  diff.ts           # Unified‑diff generator
  __mocks__/        # Jest mocks for Obsidian APIs
  __tests__/        # Unit / integration tests
.esbuild.config.mjs # Build configuration for esbuild
.eslint.config.mjs  # ESLint configuration
.jest.config.cjs    # Jest configuration (ts‑jest, jsdom)
package.json        # npm scripts, deps, metadata
manifest.json        # Obsidian plugin manifest
styles.css           # Plugin CSS
```

## Architecture Overview

* **Entry Point (`src/main.ts`)** – Instantiates `ArenaApi` and `SyncEngine`, registers commands, status bar, ribbon icon, and settings tab. Keeps heavy logic out of the plugin class.
* **API Layer (`src/api.ts`)** – Handles all Are.na REST calls, bearer‑token auth, exponential back‑off, caching (5 min TTL) and pagination.
* **Sync Engine (`src/sync-engine.ts`)** – Core deterministic pipeline:
  1. Fetch channel metadata & blocks.
  2. Optionally pre‑fetch enrichments (previews, comments).
  3. Convert blocks to Markdown via `blockToMarkdown` (`src/utils.ts`).
  4. Compare content hashes (`computeHash`) to decide create/update/skip.
  5. Write files to the Obsidian vault using the Vault API.
  6. Produce a `SyncResult` with actions, diffs, errors, timing.
* **Concurrency** – Controlled by `pMap` with constants in `SyncEngine` (CHANNEL_SYNC = 3, BLOCK_PROCESS = 5, etc.).
* **Determinism** – Sorting, stable hash, and deterministic file naming are enforced; see `ADR‑003‑deterministic-output.md`.

## Naming & Style Conventions

* **Files** – kebab‑case (`sync-engine.ts`).
* **Classes / Interfaces / Types** – `PascalCase`.
* **Functions / Variables** – `camelCase`.
* **Constants** – `UPPER_SNAKE_CASE`.
* **Imports** – External first, then internal, then type‑only imports.
* **Strict TS** – `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `isolatedModules` are all enabled; avoid `any` unless guarded by a type guard.
* **Error handling** – All async paths either `await` with `try/catch` or propagate; `SyncEngine` records errors per block and continues.
* **Debug logging** – Controlled by the `debugLogging` setting; use `console.time`/`console.timeEnd` only when wrapped by this flag.

## Testing Strategy

* **Jest** with `ts-jest` and `jsdom`. Tests live under `src/__tests__/`.
* **Coverage thresholds** are defined in `jest.config.cjs` (70 % statements/lines, 65 % branches, 40 % functions). CI fails if thresholds not met.
* **Mocking** – `src/__mocks__/obsidian.ts` provides lightweight stubs for the Obsidian API. Network calls are mocked via the `ArenaApi` test helpers.
* **Determinism tests** – `determinism.test.ts` ensures identical output for unchanged input.
* **Performance benchmarks** – `performance.test.ts` uses the `pMap` concurrency helpers.

## Gotchas & Non‑Obvious Patterns

1. **`main.ts` must stay thin** – Adding heavy logic here will break the plugin’s hot‑reload and increase memory usage. Extend `SyncEngine` or `ArenaApi` instead.
2. **Folder creation mutex** – `SyncEngine` uses `ensureFolderMutex` to avoid race conditions when multiple blocks need the same new folder concurrently.
3. **Content hashing** – `computeHash` uses SHA‑256 and truncates to 16 hex chars; any change to whitespace or ordering changes the hash, triggering file updates.
4. **Debug mode** – When `debugLogging` is true, timing data is stored in `_timers`. Tests may inspect this via `engine.getDebugTimings()`.
5. **Migration** – Attachment migration rewrites wiki‑link embeds; run it only after a successful sync and ensure backups (`settings.backupFile`) are configured.
6. **Rate‑limit handling** – `ArenaApi` automatically retries `429` with exponential back‑off. Do not add additional retries in calling code.
7. **Release packaging** – `scripts/package.mjs` builds a ZIP containing `main.js`, `manifest.json`, and `styles.css`. The version is taken from `manifest.json`; ensure it matches `package.json` before releasing.
8. **CI expects deterministic output** – Flaky tests often stem from non‑deterministic sorting or timestamps; verify that any new feature respects the sorting guarantees outlined in `ADR‑003`.

## Helpful Documentation Links (within repo)

* `docs/DEVELOPER_GUIDE.md` – Full architecture walk‑through.
* `docs/API_DESIGN.md` – Details of Are.na endpoints and retry logic.
* `docs/RELEASE_GUIDE.md` – Steps for creating a release.
* `docs/SETTINGS_REFERENCE.md` – All plugin settings and their defaults.
* `docs/testing/testing-guide.md` – Writing new tests and fixtures.
* `docs/ADRs/` – Architectural decision records.

---

*Generated by Crush after analyzing the Tetromino repository.*
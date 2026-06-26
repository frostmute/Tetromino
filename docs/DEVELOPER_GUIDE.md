---
type: reference
title: Developer Guide for Contributors
created: 2026-06-26
tags:
  - developers
  - guide
  - contributors
  - architecture
related:
  - '[[USER_GUIDE]]'
  - '[[API_DESIGN]]'
  - '[[testing-guide]]'
  - '[[testing-strategy]]'
  - '[[coverage-map]]'
---

# Developer Guide for Contributors

Welcome to the Tetromino codebase. This guide helps you understand the architecture, navigate the source, and contribute confidently. It assumes familiarity with TypeScript, Obsidian plugin development basics, and the Are.na platform.

For user-facing documentation, see [[USER_GUIDE]]. For deep testing guidance, see [[testing-guide]] and [[testing-strategy]].

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Module Guide](#module-guide)
3. [Code Style and Conventions](#code-style-and-conventions)
4. [Adding Features](#adding-features)
5. [Adding Tests](#adding-tests)
6. [Debugging](#debugging)
7. [Playbook Cross-References](#playbook-cross-references)

---

## Architecture Overview

Tetromino follows a linear data-flow architecture:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Entry     │────▶│    API      │────▶│ SyncEngine  │────▶│    Vault    │
│   Point     │     │   Layer     │     │   Core      │     │   (Obsidian)│
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Entry Point (`src/main.ts`)

`ArenaSyncPlugin` is the Obsidian `Plugin` subclass. It:

- Loads and saves plugin settings (`loadData` / `saveData`).
- Instantiates `ArenaApi` and `SyncEngine` on `onload`.
- Registers commands, ribbon icons, status bar items, and the settings tab.
- Orchestrates full-vault sync (`runSync`) and per-channel sync (`runChannelSync`).
- Handles attachment migration UI and channel-mapping backup/restore.
- Maintains a sync-interval timer when the user enables periodic auto-import.

**Key rule:** `main.ts` should remain thin. Heavy lifting belongs in `SyncEngine` or `ArenaApi`.

### API Layer (`src/api.ts`)

`ArenaApi` encapsulates all HTTP traffic to `https://api.are.na/v3` via Obsidian's `requestUrl`.

Responsibilities:
- Bearer-token authentication.
- Exponential-backoff retries for `429` (rate limit) and transient `5xx` errors.
- Request/response caching (5-minute TTL for channels and single blocks).
- Pagination abstraction: `getAllChannelBlocksWithProgress` transparently walks multi-page channels.
- Response normalisation: adapts both v3 (`{ data, meta }`) and legacy v2 (`{ contents, length }`) shapes.
- Binary asset downloads with independent retry logic.

For endpoint details, retry formulas, rate-limit behaviour, and future-version migration guidance, see [[API_DESIGN]].

### Sync Engine (`src/sync-engine.ts`)

`SyncEngine` is the heart of the plugin. It:

1. Fetches channel metadata and all blocks via `ArenaApi`.
2. Pre-fetches optional enrichments (block comments, connected channels, channel preview images).
3. Converts each `ArenaBlock` into Markdown via `blockToMarkdown` (`src/utils.ts`).
4. Creates, updates, moves, or skips vault files based on content-hash comparisons.
5. Generates per-channel index notes and a master `Are.na/overview.md`.
6. Produces a deterministic `SyncResult` with actions, diffs, moves, errors, and timing.

Concurrency is controlled via `pMap` helpers:
- `CHANNEL_SYNC = 3` channels in parallel.
- `BLOCK_PROCESS = 5` blocks in parallel per channel.
- `PREVIEW_FETCH = 5` and `DETAIL_FETCH = 5` for enrichment calls.

Determinism is guaranteed by:
- Sorting blocks by `position` then `id`.
- Sorting index note links alphabetically.
- Using `computeHash` (SHA-256, first 16 hex chars) for content comparison.
- Stable file-naming schemes resolved in `src/utils.ts`.

### Vault Layer (Obsidian APIs)

The vault is Obsidian's `Vault` instance, accessed through `app.vault`. All file operations go through standard Obsidian APIs:
- `vault.create(path, content)` / `vault.createBinary(path, data)`
- `vault.modify(file, content)`
- `vault.rename(file, newPath)`
- `vault.getAbstractFileByPath(path)`
- `vault.read(file)`

Folder creation is guarded by an async mutex in `SyncEngine` to prevent race conditions when multiple concurrent blocks need the same new folder.

---

## Module Guide

| File | Lines | Responsibility |
|------|-------|----------------|
| `src/main.ts` | ~628 | Plugin lifecycle, settings persistence, command registration, high-level sync orchestration, migration UI, backup/restore. |
| `src/api.ts` | ~553 | Are.na REST client, auth, retries, caching, pagination, response normalisation, binary downloads. |
| `src/sync-engine.ts` | ~1023 | Core import logic: fetch, render, diff, write, move, index generation, progress reporting, sync-record management. |
| `src/settings-tab.ts` | ~657 | Obsidian `PluginSettingTab` UI for every plugin setting and channel-mapping row. |
| `src/modals.ts` | ~214 | Modal components: `DiffModal`, `SyncSummaryModal`, `MigrationPreviewModal`, `BackupFileSuggestModal`. |
| `src/utils.ts` | ~420 | Markdown rendering (`blockToMarkdown`), file-name utilities, hash computation, folder resolution, attachment-base resolution, `pMap` concurrency helper. |
| `src/templateUtils.ts` | ~139 | Custom template parser and renderer (Handlebars-like syntax: `{{var}}`, `{{#if}}`, `{{#each}}`). |
| `src/types.ts` | ~219 | TypeScript interfaces for Are.na API entities, plugin settings, sync records, and results. Also defines `DEFAULT_SETTINGS`. |
| `src/diff.ts` | ~76 | Unified-diff generator using LCS (longest-common-subsequence) with a safety cap (`MAX_DIFF_CELLS`). |
| `src/migration.ts` | ~215 | Attachment-migration planner and executor: detects path changes, computes move/update plans, rewrites wiki-link embeds in notes. |
| `src/securityUtils.ts` | ~98 | Markdown sanitizer that neutralises executable code blocks, dangerous HTML, event handlers, and dangerous URL protocols. |
| `src/__mocks__/obsidian.ts` | ~166 | Jest mock of the `obsidian` module for unit tests (stubs `App`, `Vault`, `Plugin`, `Modal`, `Setting`, etc.). |
| `src/__tests__/fixtures.ts` | ~53 | Simple factory functions (`makeChannel`, `makeBlock`) for test data. |
| `src/__tests__/fixtures/scenarios.ts` | varies | Richer scenario fixtures: paginated responses, error responses, multi-block channels. |
| `src/__tests__/fixtures/vault.ts` | varies | `MockVault` and `makeMockApp` for lightweight integration tests. |

---

## Code Style and Conventions

### TypeScript Configuration

`tsconfig.json` enforces:
- `strictNullChecks: true`
- `strictFunctionTypes: true`
- `noImplicitAny: true`
- `isolatedModules: true`
- `moduleResolution: bundler`
- Target: `ES6`, DOM + ES2018 libs

**Rule:** Do not relax these checks. Cast sparingly (`as` or `as unknown as`) and always justify with a comment.

### Naming and Structure

- Use `PascalCase` for classes, interfaces, and type aliases.
- Use `camelCase` for functions, variables, and properties.
- Use `UPPER_SNAKE_CASE` for module-level constants and enums.
- Prefer explicit return types on public methods.
- Group imports: external (obsidian) first, then internal modules, then types-only imports.

### Error Handling

- All async paths must catch or propagate errors. `main.ts` wraps engine calls in `try/catch` and surfaces user-friendly `Notice` messages.
- `ArenaApi` retries transient failures automatically; terminal failures (`401`, `403`, `404`) throw immediately with descriptive messages.
- `SyncEngine` records per-block errors in `SyncResult.errors` and continues processing the rest of the channel.
- Avoid `console.log` in production paths; use the `debugLogging` conditional or `console.time`/`console.timeEnd` for performance marks (these are stripped by convention, not tooling).

### Type Guards

The codebase prefers small, focused type guards over broad `any`:

```ts
function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}
```

Use these when normalising API responses or parsing user input.

### Determinism Requirements

Tetromino's core value is deterministic output. Any change that affects ordering, hashing, or rendering must preserve:
1. Same Are.na channel + same settings → identical Markdown output.
2. Sorted arrays (blocks, links, channels) must use stable comparators.
3. Timestamps in output (e.g., `lastSyncedAt`) are acceptable variability points, but content hashes must remain stable when content has not changed.

---

## Adding Features

Follow this workflow to add a new feature safely and maintainably.

### 1. Design

- Open a GitHub issue or draft PR describing the problem, proposed solution, and trade-offs.
- Identify which layer(s) will change: API? SyncEngine? Settings UI? Markdown rendering?
- Check [[testing-strategy]] for guidance on testability.

### 2. Write Tests First (or in Parallel)

- Add a failing test that describes the expected behaviour.
- Mock external dependencies (`obsidian.requestUrl`, vault APIs) so tests run offline and quickly.
- See [Adding Tests](#adding-tests) below and [[testing-guide]] for detailed patterns.

### 3. Implement

- Keep changes minimal and scoped to one concern per PR.
- If you touch `blockToMarkdown` or the template engine, verify determinism with the existing `determinism.test.ts` suite.
- If you add a new setting, update:
  - `src/types.ts` (interface + `DEFAULT_SETTINGS`)
  - `src/settings-tab.ts` (UI control)
  - `src/main.ts` (if the setting affects engine initialisation)
  - Relevant tests.

### 4. Validate

```bash
npm run lint
npm test
npm run validate   # lint + test + build
```

### 5. Document

- Update `docs/USER_GUIDE.md` or `docs/SETTINGS_REFERENCE.md` if users need to know about the change.
- Update this guide if you introduced a new architectural pattern.
- Add a changelog entry under the `## Unreleased` heading in `CHANGELOG.md`.

### 6. Review Checklist

Before requesting review, ensure:
- [ ] Tests pass (`npm test`).
- [ ] Lint passes (`npm run lint`).
- [ ] Build passes (`npm run build`).
- [ ] New code has tests.
- [ ] Determinism tests still pass (if you touched rendering).
- [ ] Documentation is updated.
- [ ] No secrets or tokens are hard-coded.

---

## Adding Tests

Tetromino uses **Jest** with **ts-jest** in a **jsdom** environment. The full testing manual lives in [[testing-guide]]; this section gives you the essential quick-start.

### Test Layout

| What | Where |
|------|-------|
| Unit tests for module `X` | `src/__tests__/X.test.ts` |
| Extended / edge-case tests | `src/__tests__/X_extended.test.ts` |
| Integration / flow tests | `src/__tests__/integration.test.ts` |
| Determinism regression | `src/__tests__/determinism.test.ts` |
| Shared fixtures | `src/__tests__/fixtures.ts`, `src/__tests__/fixtures/scenarios.ts`, `src/__tests__/fixtures/vault.ts` |
| Obsidian mock | `src/__mocks__/obsidian.ts` |

### Mocking Are.na API Responses

```ts
import * as obsidian from "obsidian";
import { ArenaApi } from "../api";

it("fetches a channel", async () => {
  const requestUrlMock = jest.spyOn(obsidian, "requestUrl").mockResolvedValueOnce({
    status: 200,
    headers: {},
    json: { data: { id: 42, title: "Rad Readings", slug: "rad-readings", /* ... */ } },
    arrayBuffer: new ArrayBuffer(0),
  });

  const api = new ArenaApi("token-123");
  const channel = await api.getChannel("rad-readings");
  expect(channel.title).toBe("Rad Readings");

  requestUrlMock.mockRestore();
});
```

Prefer the richer fixture helpers in `src/__tests__/fixtures/scenarios.ts` for multi-page or error scenarios.

### Mocking the Vault (Unit Tests)

```ts
import { App, Vault } from "obsidian";
import { SyncEngine } from "../sync-engine";

const mockVault = {
  getAbstractFileByPath: jest.fn(),
  read: jest.fn(),
  create: jest.fn(),
  modify: jest.fn(),
  createFolder: jest.fn(),
} as unknown as jest.Mocked<Vault>;

const mockApp = { vault: mockVault } as unknown as App;
const engine = new SyncEngine(mockApp, mockApi, settings);
```

### Integration Tests with MockVault

For tests that exercise real file-tree logic without mocking every vault call, use `MockVault` from `src/__tests__/fixtures/vault.ts`:

```ts
import { MockVault, makeMockApp } from "./fixtures/vault";

const vault = new MockVault();
const app = makeMockApp(vault);
const engine = new SyncEngine(app, api, settings);

await engine.syncChannel(mapping);
expect(vault.has("Are.na/chan/Block.md")).toBe(true);
```

### Coverage Expectations

`jest.config.cjs` enforces:
- Statements: 70%
- Branches: 65%
- Functions: 40%
- Lines: 70%

New features should not drop these thresholds. Aim for the module you touched to be at or above the global threshold.

For exhaustive patterns (fake timers, multi-page mocks, error injection), see [[testing-guide]].

---

## Debugging

### Console Logs and Performance Marks

Tetromino uses `console.time` / `console.timeEnd` labels prefixed with `arena-sync:` to trace bottlenecks:

- `arena-sync:channel-metadata:{slug}`
- `arena-sync:fetch-blocks:{slug}`
- `arena-sync:block:{id}`
- `arena-sync:asset:{id}`
- `arena-sync:index:{slug}`

Enable **Debug logging** in the plugin settings to see `[arena-sync]` log lines for API requests, cache hits, and pagination stops.

### Inspecting Plugin State

From Obsidian's **Developer Tools** (`Cmd+Opt+I` / `Ctrl+Shift+I`):

```js
// Access the active plugin instance
const plugin = app.plugins.plugins["tetromino"];

// Inspect current settings
console.log(plugin.settings);

// Inspect sync records
console.log(plugin.settings.syncRecords);

// Inspect the API client cache
console.log(plugin.api);

// Trigger a dry-run manually
await plugin.runSync(true);
```

### Testing Locally in a Real Vault

1. Build the plugin:
   ```bash
   npm run build
   ```
2. Copy `main.js`, `manifest.json`, and `styles.css` (if any) to a test vault's `.obsidian/plugins/tetromino/` folder.
3. Reload Obsidian (`Cmd+R` / `Ctrl+R`) or disable/enable the plugin.
4. Point the test vault at a real or staging Are.na channel with a personal token.

### Common Debug Scenarios

| Symptom | Likely Cause | How to Verify |
|---------|--------------|---------------|
| Notes not updating | Hash matches existing content; check `SyncResult.skipped` | Run dry-run and inspect diff modal |
| Missing images | `imageHandling` setting or asset download failure | Check `SyncResult.errors` and console for `[arena-sync]` download errors |
| Slow import | Large channels, many enrichment API calls | Look at `console.timeEnd` labels; reduce `includeBlockComments` / `includeBlockConnectedChannels` |
| Duplicate blocks | Pagination boundary overlap | Check `arena-sync:fetch-blocks` log for `reason=duplicates` |
| Vault permission errors | Folder path blocked by Obsidian sandbox | Ensure path is inside vault root; check `normalizePath` output |

---

## Playbook Cross-References

Tetromino's development is organised into playbook phases in `.maestro/playbooks/Initiation/`:

| Topic | Playbook Phase | What It Covers |
|-------|----------------|----------------|
| Environment setup | Phase 01 | Node version, `npm install`, IDE config, first build. |
| Dev workflow | Phase 02 | Branching, commits, lint, test, build, PR template. |
| Bug triage | Phase 03 | How to reproduce, diagnose, fix, and regression-test bugs. |
| Feature development | Phase 04 | Design docs, scoping, implementation checklist, ADR guidance. |
| Testing and QA | Phase 05 | Test philosophy, coverage strategy, fixture patterns, CI gates. |
| Release procedures | Phase 06 | Version bump, changelog, release script, GitHub workflow. |
| Performance maintenance | Phase 07 | Benchmarks, profiling, optimisation checklist, regression guards. |
| Documentation | Phase 08 | Doc audits, user guide, developer guide, ADRs, FAQ, troubleshooting. |
| Community sustainability | Phase 09 | Governance, contributor onboarding, issue triage, long-term health. |

When you start work on a new area, read the corresponding phase document for step-by-step instructions and checklists.

---

*Last updated: 2026-06-26*

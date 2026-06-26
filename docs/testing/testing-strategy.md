---
type: reference
title: Testing Strategy — Isolation, Integration, and Manual Validation
created: 2026-06-26
tags:
  - testing
  - strategy
  - qa
  - ci
related:
  - '[[coverage-map]]'
  - '[[test-fixtures]]'
  - '[[untestable-code]]'
---

# Testing Strategy — Isolation, Integration, and Manual Validation

This document defines Tetromino's three-layer testing strategy: fast unit tests in isolation, realistic integration tests across modules, and periodic manual validation inside a real Obsidian vault. It also describes the pre-commit workflow and how it maps to CI.

---

## 1. Philosophy

Tetromino's core promise is **deterministic, reproducible import**. Tests exist to guarantee that:

1. The same Are.na channel always produces the same vault output.
2. Network failures and API quirks are handled gracefully.
3. Regressions are caught before they reach users.

We follow a **test pyramid**: many fast unit tests, fewer integration tests, and occasional manual end-to-end checks.

---

## 2. Layer 1 — Unit Tests (Isolation)

Unit tests exercise a single module with all collaborators mocked. They are fast, deterministic, and run in `jsdom` via Jest.

### Location and naming

| Pattern | Example |
|---------|---------|
| Test files | `src/__tests__/{module}.test.ts` or `src/__tests__/{module}_extended.test.ts` |
| Mocks | `src/__mocks__/obsidian.ts` (auto-loaded via `moduleNameMapper`) |
| Fixtures | `src/__tests__/fixtures/scenarios.ts`, `src/__tests__/fixtures/vault.ts` |

### Mocking patterns

1. **Per-test API mocking** — spy on `obsidian.requestUrl` for precise request/response control:
   ```ts
   jest.spyOn(obsidian, "requestUrl").mockResolvedValueOnce({
     status: 200,
     headers: {},
     json: { data: [block], meta: { current_page: 1, total_pages: 1 } },
     arrayBuffer: new ArrayBuffer(0),
   });
   ```

2. **Module-level mocking** — replace an entire dependency for the test file:
   ```ts
   jest.mock("obsidian", () => ({ ... }));
   jest.mock("../api");
   ```

3. **Typed mocks** — use `jest.Mocked<T>` for IntelliSense-friendly mock APIs:
   ```ts
   const mockApi = new ArenaApi("token") as jest.Mocked<ArenaApi>;
   mockApi.getChannel.mockResolvedValue(channel);
   ```

4. **Timer mocking** — fake timers for retry/backoff tests:
   ```ts
   jest.useFakeTimers();
   // ... trigger retry ...
   jest.advanceTimersByTime(2000);
   ```

### What to test at the unit level

| Module | Focus |
|--------|-------|
| `api.ts` | Pagination, retry logic, rate-limit backoff, error handling, response normalisation |
| `sync-engine.ts` | `pullBlock` (create/update/skip/move), sync-record bookkeeping, asset handling, index generation |
| `utils.ts` | Slug generation, filename sanitisation, template rendering branches, date formatting |
| `templateUtils.ts` | Variable substitution, `#if`, `#each`, nested dot access, edge cases (empty, null, special chars) |
| `diff.ts` | Diff calculation, CRLF handling, single-line replacements |
| `migration.ts` | Migration plan generation, version comparison, data transformation |
| `main.ts` | Settings load/save, sync orchestration, channel mapping helpers, report writing |

### What to avoid in unit tests

- Do not test implementation details (e.g. private variable names, internal loop counters).
- Do not duplicate integration-test coverage; unit tests should prove the module logic, not the wiring.
- Do not test Obsidian DOM UI (`settings-tab.ts`, `modals.ts`); those are covered manually.

---

## 3. Layer 2 — Integration Tests (Module Composition)

Integration tests exercise `SyncEngine` + `ArenaApi` + `MockVault` together with realistic fixtures. They verify that modules compose correctly and that the full import flow behaves as expected.

### Location

`src/__tests__/integration.test.ts`

### Architecture

```
Mock Are.na API  →  ArenaApi (mocked methods)  →  SyncEngine  →  MockVault
   (fixtures)         (jest.Mocked<ArenaApi>)                  (in-memory vault)
```

The real `SyncEngine` and real `utils.ts` are used; only the network layer (`obsidian.requestUrl`) and Obsidian runtime are mocked.

### What to test at the integration level

| Scenario | Why it matters |
|----------|---------------|
| Small channel import (3 blocks) | Smoke test for happy path |
| Mixed block types (all 7 classes) | Ensures no block type breaks the pipeline |
| Empty channel | Verifies graceful handling of zero blocks |
| Large paginated channel (250 blocks) | Validates bulk throughput and pagination stitching |
| Conflict resolution (two-phase sync) | Existing note → remote change → re-sync must update correctly |
| Special characters in titles | Filename sanitisation must not collide or crash |
| Dry-run with realistic data | Must report actions without mutating vault |
| Channel with deleted blocks | Missing blocks must be marked and cleaned up |
| Unicode / international characters | CJK, RTL, emoji must round-trip correctly |

### Determinism tests

`src/__tests__/determinism.test.ts` is a specialised integration suite that imports the same channel multiple times and verifies **byte-for-byte identical** output. It also shuffles block order and changes pagination boundaries to prove that output ordering is stable.

---

## 4. Layer 3 — Manual Testing in Obsidian

Automated tests cannot replicate a real Obsidian vault, live Are.na API, or user interaction. Manual testing is required before major releases.

### How to perform a manual test

1. **Build the plugin**
   ```bash
   npm run build
   ```
   This produces `main.js`, `manifest.json`, and `styles.css`.

2. **Copy into a test vault**
   ```bash
   cp main.js manifest.json styles.css \
     ~/Documents/Obsidian/TestVault/.obsidian/plugins/tetromino/
   ```

3. **Restart Obsidian** or reload plugins (`Settings → Community Plugins → Tetromino → Reload`).

4. **Configure a real Are.na token**
   - Open Tetromino settings.
   - Paste a valid Are.na personal access token.
   - Click **Verify**.

5. **Import a channel**
   - Choose a small public channel (≤ 10 blocks) for a quick smoke test.
   - Click **Sync Channel**.
   - Verify:
     - Notes appear in the configured folder.
     - Images and attachments are downloaded (if enabled).
     - Channel index note contains sorted wikilinks.
     - `Are.na/overview.md` is updated (if using **Sync All**).

6. **Re-import the same channel**
   - No new files should appear.
   - Existing files should not have their `mtime` changed.
   - This validates determinism in a real environment.

7. **Test dry-run**
   - Enable **Dry Run**.
   - Sync a channel.
   - Vault must not change; preview report should list planned actions.

8. **Test edge cases**
   - Empty channel.
   - Channel with a block title containing `/ : < > "`.
   - Large channel (> 100 blocks) to stress pagination.

### When to run manual tests

- Before every release (`npm run release`).
- After any change to `sync-engine.ts` that affects file writes or moves.
- After any change to `settings-tab.ts` or `modals.ts` (which are not covered by unit tests).

---

## 5. Pre-Commit Workflow

Before committing any code, run the full validation pipeline:

```bash
npm run lint && npm test && npm run build
```

### What each step validates

| Step | Purpose | Approx. duration |
|------|---------|------------------|
| `npm run lint` | ESLint checks for type errors, unused vars, and style violations | ~5 s |
| `npm test` | Jest runs all 296+ tests with coverage thresholds | ~15–30 s |
| `npm run build` | TypeScript check + esbuild bundle + packaging; verifies artefact generation | ~5 s |

### Convenience script

A single script is provided in `package.json`:

```bash
npm run validate
```

This runs `lint → test → build` in sequence and exits on the first failure.

### Coverage thresholds

`jest.config.cjs` enforces global minimums:

| Metric | Minimum |
|--------|---------|
| Statements | 70 % |
| Branches | 65 % |
| Functions | 40 % |
| Lines | 70 % |

If coverage drops below these values, `npm test` will fail. Review `docs/testing/coverage-map.md` for per-module targets.

---

## 6. CI Pipeline

GitHub Actions runs the same three steps on every push and pull request to `main`:

1. **Lint** job — `npm run lint`
2. **Test** job — `npm test` across Node 18, 20, and 22
3. **Build** job — `npm run build` (depends on lint + test passing)

The build job also verifies that `main.js`, `manifest.json`, and `styles.css` exist, packages a ZIP, and uploads artefacts.

See `.github/workflows/ci.yml` for the full configuration.

---

## 7. Adding New Tests

### Where to place them

- **Unit tests** for module `X` → `src/__tests__/X.test.ts` or `src/__tests__/X_extended.test.ts`.
- **Integration tests** → `src/__tests__/integration.test.ts`.
- **Determinism tests** → `src/__tests__/determinism.test.ts`.
- **Regression tests** → Add to the most relevant existing file; include a comment referencing the bug or PR.

### Reusing fixtures

```ts
import { makeTextBlock, makeChannel } from "./fixtures/scenarios";
import { MockVault, makeMockApp } from "./fixtures/vault";
```

### Assertions to prefer

| Prefer | Avoid |
|--------|-------|
| `expect(result.created).toBe(3)` | `expect(engine["internalCounter"]).toBe(3)` |
| `expect(mockVault.has("path/to/Note.md")).toBe(true)` | `expect(fs.writeFileSync).toHaveBeenCalled()` |
| `expect(noteContent).toContain("## Body")` | `expect(renderFn).toHaveBeenCalledWith(expect.any(String))` |

Focus on **observable outcomes** (vault state, returned data, file contents) rather than implementation details.

---

## 8. Summary

| Layer | Scope | When to run | Duration |
|-------|-------|-------------|----------|
| Unit tests | Single module, mocked deps | On every file change (`npm run test:watch`) | < 1 s per file |
| Integration tests | Multi-module, realistic fixtures | Before every commit (`npm test`) | ~15–30 s |
| Manual tests | Real Obsidian + live Are.na | Before releases, after UI changes | ~5 min |
| Full pipeline | Lint + test + build | Before pushing (`npm run validate`) | ~30–45 s |

All layers together ensure that Tetromino remains deterministic, reliable, and safe to release.

---
type: reference
title: Testing Guide for Contributors
created: 2026-06-26
tags:
  - testing
  - guide
  - contributors
  - qa
related:
  - '[[testing-strategy]]'
  - '[[coverage-map]]'
  - '[[test-fixtures]]'
  - '[[untestable-code]]'
---

# Testing Guide for Contributors

This guide shows you how to write tests for Tetromino. It covers where to place files, how to mock external dependencies, and what kinds of assertions we prefer. All examples are taken from the existing test suite.

---

## 1. Where to Place Tests

| What you are testing | File path |
|----------------------|-----------|
| Module `X` (unit) | `src/__tests__/X.test.ts` or `src/__tests__/X_extended.test.ts` |
| Integration flow | `src/__tests__/integration.test.ts` |
| Determinism | `src/__tests__/determinism.test.ts` |
| Regression for a specific bug | The most relevant existing file; add a `describe` block with a comment linking the issue |

Tests are run with **Jest** in a **jsdom** environment. The test pattern is:

```ts
// src/__tests__/api.test.ts
describe("ArenaApi", () => {
  it("does something useful", async () => {
    // arrange -> act -> assert
  });
});
```

Run the suite:

```bash
npm test              # once
npm run test:watch    # interactive watch mode
```

---

## 2. Mocking Are.na API Responses

Tetromino talks to Are.na through `obsidian.requestUrl`. The global mock lives in `src/__mocks__/obsidian.ts`, but **per-test spies** give you full control over request/response pairs.

### Basic pattern

```ts
import * as obsidian from "obsidian";
import { ArenaApi } from "../api";

it("fetches a channel", async () => {
  const requestUrlMock = jest.spyOn(obsidian, "requestUrl").mockResolvedValueOnce({
    status: 200,
    headers: {},
    json: {
      data: {
        id: 42,
        title: "Rad Readings",
        slug: "rad-readings",
        status: "public",
        // other required fields
      },
    },
    arrayBuffer: new ArrayBuffer(0),
  });

  const api = new ArenaApi("token-123");
  const channel = await api.getChannel("rad-readings");

  expect(channel.title).toBe("Rad Readings");
  expect(requestUrlMock).toHaveBeenCalledWith(
    expect.objectContaining({
      method: "GET",
      url: "https://api.are.na/v3/channels/rad-readings",
      headers: expect.objectContaining({
        Authorization: "Bearer token-123",
      }),
    }),
  );

  requestUrlMock.mockRestore();
});
```

### Reuse fixtures instead of hand-rolling JSON

```ts
import {
  makeChannel,
  makeTextBlock,
  makePaginatedBlocksResponse,
  makeErrorResponse,
} from "./fixtures/scenarios";

it("paginates through blocks", async () => {
  const channel = makeChannel(1, "my-channel", "My Channel");
  const blocks = [makeTextBlock(1, "Hello", "World")];

  const requestUrlMock = jest.spyOn(obsidian, "requestUrl")
    .mockResolvedValueOnce(makePaginatedBlocksResponse(1, blocks, 1, 1))
    .mockResolvedValueOnce({ status: 200, headers: {}, json: { data: channel }, arrayBuffer: new ArrayBuffer(0) });

  // exercise code
});
```

### Simulating errors

```ts
it("returns false on 401", async () => {
  const requestUrlMock = jest.spyOn(obsidian, "requestUrl")
    .mockResolvedValueOnce(makeErrorResponse(401));

  const api = new ArenaApi("bad-token");
  const isValid = await api.verifyToken();

  expect(isValid).toBe(false);
  requestUrlMock.mockRestore();
});
```

### Testing retries with fake timers

```ts
it("retries on 429 and succeeds", async () => {
  jest.useFakeTimers();
  const requestUrlMock = jest.spyOn(obsidian, "requestUrl")
    .mockResolvedValueOnce(makeErrorResponse(429))
    .mockResolvedValueOnce(makePaginatedBlocksResponse(1, [], 1));

  const api = new ArenaApi("token");
  const promise = api.getChannelContents("chan", 1);

  // Flush the retry delay
  await Promise.resolve();
  jest.advanceTimersByTime(2000);

  const page = await promise;
  expect(page.contents).toHaveLength(0);

  requestUrlMock.mockRestore();
  jest.useRealTimers();
});
```

---

## 3. Testing Sync-Engine Logic

The `SyncEngine` orchestrates vault writes. In unit tests you mock the vault; in integration tests you use `MockVault` from `src/__tests__/fixtures/vault.ts`.

### Unit test -- mocking the vault

```ts
import { App, Vault } from "obsidian";
import { SyncEngine } from "../sync-engine";
import { ArenaApi } from "../api";
import { DEFAULT_SETTINGS } from "../types";

jest.mock("../api");

describe("SyncEngine", () => {
  let mockApp: App;
  let mockApi: jest.Mocked<ArenaApi>;
  let mockVault: jest.Mocked<Vault>;
  let settings: typeof DEFAULT_SETTINGS;

  beforeEach(() => {
    mockVault = {
      getAbstractFileByPath: jest.fn(),
      read: jest.fn(),
      create: jest.fn(),
      modify: jest.fn(),
      createFolder: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Vault>;

    mockApp = { vault: mockVault } as unknown as App;
    mockApi = new ArenaApi("token") as jest.Mocked<ArenaApi>;
    settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  });

  it("skips disabled channels", async () => {
    settings.channelMappings = [
      { channelSlug: "disabled", enabled: false, localFolder: "" },
      { channelSlug: "enabled", enabled: true, localFolder: "" },
    ];

    const engine = new SyncEngine(mockApp, mockApi, settings);
    const syncChannelSpy = jest.spyOn(engine, "syncChannel").mockResolvedValue({
      created: 1, updated: 0, deleted: 0, moved: 0, skipped: 0,
      downloaded: 0, dryRun: false, actions: ["create Note"],
      moves: [], fileDiffs: [], missingPaths: [], errors: [], duration: 0,
    });
    const updateMasterOverviewSpy = jest
      .spyOn(engine as any, "updateMasterOverview")
      .mockResolvedValue(undefined);

    const result = await engine.syncAll();

    expect(syncChannelSpy).toHaveBeenCalledTimes(1);
    expect(syncChannelSpy).toHaveBeenCalledWith(
      expect.objectContaining({ channelSlug: "enabled" }),
      expect.any(Object),
    );
    expect(result.created).toBe(1);

    syncChannelSpy.mockRestore();
    updateMasterOverviewSpy.mockRestore();
  });
});
```

### Integration test -- using MockVault

```ts
import { MockVault, makeMockApp } from "./fixtures/vault";
import { makeChannel, makeSmallChannelBlocks } from "./fixtures/scenarios";

describe("import flow", () => {
  it("creates notes for every block", async () => {
    const vault = new MockVault();
    const app = makeMockApp(vault);
    const api = new ArenaApi("token");
    const engine = new SyncEngine(app, api, settings);

    // Mock the network layer only
    jest.spyOn(api, "getChannel").mockResolvedValue(makeChannel(1, "chan", "Chan"));
    jest.spyOn(api, "getAllChannelBlocksWithProgress")
      .mockResolvedValue(makeSmallChannelBlocks());

    await engine.syncChannel({ channelSlug: "chan", enabled: true, localFolder: "Are.na/chan" });

    expect(vault.has("Are.na/chan/Introduction.md")).toBe(true);
    expect(vault.content("Are.na/chan/Introduction.md")).toContain("Welcome to this channel.");
  });
});
```

---

## 4. Testing Settings (Plugin Lifecycle)

`main.ts` tests demonstrate how to mock Obsidian's plugin infrastructure.

```ts
import { App, TFile, Vault } from "obsidian";
import ArenaSyncPlugin from "../main";
import { ArenaApi } from "../api";
import { SyncEngine } from "../sync-engine";

describe("ArenaSyncPlugin", () => {
  let plugin: ArenaSyncPlugin;
  let saveDataMock: jest.Mock;
  let loadDataMock: jest.Mock;

  beforeEach(() => {
    saveDataMock = jest.fn(async () => {});
    loadDataMock = jest.fn(async () => ({}));

    const app = {
      vault: {
        getFiles: jest.fn(() => []),
        read: jest.fn(async () => ""),
        getAbstractFileByPath: jest.fn(() => undefined),
        create: jest.fn(async (path: string) => new TFile()),
        modify: jest.fn(async () => {}),
        createFolder: jest.fn(async () => {}),
      } as unknown as Vault,
      workspace: {
        onLayoutReady: jest.fn((cb: () => void) => cb()),
        getActiveFile: () => null,
      },
    } as App;

    plugin = new ArenaSyncPlugin(app, { id: "test", name: "Test" });
    plugin.saveData = saveDataMock;
    plugin.loadData = loadDataMock;
  });

  it("merges saved data with defaults", async () => {
    loadDataMock.mockResolvedValue({ apiToken: "secret" });
    await plugin.loadSettings();

    expect(plugin.settings.apiToken).toBe("secret");
    expect(plugin.settings.channelMappings).toEqual([]);
  });

  it("recreates api and engine after saving", async () => {
    plugin.settings.apiToken = "new-token";
    await plugin.saveSettings();

    expect(plugin.api).toBeInstanceOf(ArenaApi);
    expect(plugin.engine).toBeInstanceOf(SyncEngine);
    expect(saveDataMock).toHaveBeenCalledWith(plugin.settings);
  });
});
```

Key takeaway: replace `saveData` / `loadData` directly on the plugin instance so you do not need to mock `Plugin` internals.

---

## 5. Coverage Expectations

Coverage is enforced in `jest.config.cjs`:

| Metric | Global minimum |
|--------|----------------|
| Statements | 70 % |
| Branches | 65 % |
| Functions | 40 % |
| Lines | 70 % |

Critical modules have **higher targets**:

| Module | Target | Why it matters |
|--------|--------|----------------|
| `api.ts` | >= 85 % | Network failures must not crash the plugin or leak tokens |
| `sync-engine.ts` | >= 80 % | File writes must be deterministic and safe |
| `utils.ts` | >= 90 % | Template rendering and sanitisation affect every note |
| `templateUtils.ts` | >= 95 % | Parser bugs produce broken Markdown for all users |
| `diff.ts` | >= 95 % | Incorrect diffs hide changes from the user |
| `migration.ts` | >= 90 % | Data-loss bugs are irreversible |
| `main.ts` | >= 80 % | Settings and orchestration glue |

### Why coverage matters for Tetromino

1. **Determinism** -- The same Are.na channel must always produce the same vault output. Branch coverage catches conditional logic that could introduce non-determinism.
2. **Reliability** -- Are.na is an external network service. High coverage on `api.ts` ensures retries, rate limits, and edge-case responses are handled.
3. **Regression prevention** -- Every bug fix should be accompanied by a test. If coverage drops, new code paths are untested and risky.

If you add a feature, run `npm test` and verify that the modules you touched still meet their targets. If a drop is unavoidable, document why in `docs/testing/untestable-code.md`.

---

## 6. Good Assertions vs. Bad Assertions

Focus on **observable behaviour**, not implementation details.

| Good (behaviour) | Bad (implementation detail) |
|------------------|----------------------------|
| `expect(result.created).toBe(3)` | `expect(engine["internalCounter"]).toBe(3)` |
| `expect(vault.has("Are.na/chan/Note.md")).toBe(true)` | `expect(fs.writeFileSync).toHaveBeenCalled()` |
| `expect(noteContent).toContain("## Body")` | `expect(renderFn).toHaveBeenCalledWith(expect.any(String))` |
| `expect(mockApi.getChannel).toHaveBeenCalledWith("my-channel")` | `expect(api["buildUrl"]).toHaveBeenCalled()` |

### Further guidelines

- **Prefer exact matchers** (`toBe`, `toEqual`) over loose ones (`toBeTruthy`, `toBeDefined`) unless the value is genuinely unpredictable.
- **Test errors, not messages** -- assert `rejects.toThrow(MyErrorType)` rather than parsing `error.message` when possible.
- **Clean up spies** -- always call `mockRestore()` or use `beforeEach` / `afterEach` to avoid leaked state between tests.
- **One logical assertion per `it`** -- if you need many unrelated checks, split them into separate tests so failures are specific.

---

## 7. Quick Checklist Before Committing

```bash
npm run validate   # lint -> test -> build
```

- [ ] All new code has at least one test.
- [ ] Tests use fixtures from `src/__tests__/fixtures/` instead of inline magic values.
- [ ] Spies and mocks are restored in `afterEach` or at the end of the test.
- [ ] Coverage for modified modules stays above their target.
- [ ] No `console.log` left in tests (use `debugLogging` settings or remove before commit).

---

*For the full testing architecture see [[testing-strategy]]. For fixture documentation see [[test-fixtures]].*

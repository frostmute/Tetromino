# Bug: plugin hangs indefinitely on every fetch

## Symptom

Reported by user (frostmute) on 2026-08-12, after `npm run build` and a manual
test in Obsidian:

1. Clicking **Import my channels** in the settings tab leaves a "spinning"
   indicator that never resolves.
2. Triggering **Import all channels now** (ribbon or command) sets the
   status-bar text to the default "Importing from Are.na..." and never
   advances. The progress callback never fires.
3. No error notice, no exception in the console, no log line.

## Reproduction

- Token: any valid Are.na personal access token.
- Account has any non-zero number of channels.
- Click "Import my channels" in **Settings → Channel management** or
  invoke the "Import all channels now" command.

## Root cause

`src/api.ts` `request()` awaited `obsidian.requestUrl(params)` with **no
timeout, no `AbortController`, and no race against a deadline**. Same
for `downloadBinary()`. When Are.na's server stalls (slow TTFB, dropped
half-connection, wedged proxy, etc.) `requestUrl` never resolves, so:

- `listAllMyChannels()` — the do-while pagination in
  `listAllMyChannels` is bounded by `total_pages`, so the loop itself
  is not the problem; it never gets a first page back.
- `syncAll()` → `getChannel()` / `getAllChannelBlocksWithProgress()` —
  same blocking point.

`isSyncing` stays `true`, the status bar text stays put, the settings
button's `await` never settles, and there is no path that surfaces an
error to the user.

### Candidates rejected

| Path | Verdict |
| --- | --- |
| `pMap` (`src/utils.ts:364`) | Single-threaded JS — `i++` is atomic between awaits. Correct async semaphore. |
| `ensureFolderMutex` (`src/sync-engine.ts:1126`) | `finally { release(); }` is unconditional — no deadlock. |
| `listAllMyChannels` pagination (`src/api.ts:463`) | `while (page <= totalPages)` is server-bounded. |
| `getAllChannelBlocksWithProgress` pagination (`src/api.ts:398`) | `shouldStopPagination` (empty / partial / total / duplicate) guarantees termination. |
| `updateProgressStatus`'s `if (!this.isSyncing) return;` | Would only hide the bar; would not hang the sync. |

## Fix

`src/api.ts`:

- New `withTimeout(promise, ms, url)` helper that races the promise
  against a `setTimeout` and rejects with a `RequestTimeoutError` on
  expiry. Timer is always cleared in a `.finally` so a late-resolving
  inner promise does not leak.
- New `RequestTimeoutError` class (`url`, `timeoutMs`, descriptive
  message) exported for callers and tests.
- New `ArenaApiOptions` bag on the `ArenaApi` constructor:
  - `requestTimeoutMs` (default 30_000)
  - `downloadTimeoutMs` (default 60_000)
  - `maxRetries` (default 3, was the module-level `MAX_RETRIES`)
- `request()` and `downloadBinary()` now wrap their `requestUrl` calls
  in `withTimeout` and use `this.maxRetries` for the retry loop. A
  timeout is treated like any other transient failure: retried with
  exponential backoff up to `maxRetries`, then surfaced as the
  `RequestTimeoutError` to the user via the existing error path
  (`runSync` / `runChannelSync` `catch` blocks already call
  `new Notice(...)`).

## Regression test

Added to `src/__tests__/api_extended.test.ts` under a new
`"ArenaApi request timeout"` describe block. Uses real timers (the
timeout depends on wall-clock firing) with small `requestTimeoutMs` /
`downloadTimeoutMs` and `maxRetries: 1` so failures throw without
backoff delay.

- `withTimeout rejects with RequestTimeoutError when promise hangs`
- `withTimeout resolves with the inner value when promise settles first`
- `request() propagates RequestTimeoutError when requestUrl never resolves`
- `downloadBinary() propagates RequestTimeoutError when requestUrl never resolves`

Also touched `src/__tests__/api.test.ts` — the existing
`verifyToken › returns false when /me request fails after retries` test
used `jest.useFakeTimers()` plus a `for` loop that advanced the fake
clock to skip backoff delays. The added `withTimeout` setTimeout broke
the pacing of that loop. Replaced with a real-time variant that uses
`maxRetries: 1` so the first failure throws without a backoff.

## Verification

- `npx jest` — 21 suites, **371 tests passing** (4 new, 1 rewritten).
- `npm run lint` — 0 errors, 2 pre-existing warnings (unrelated,
  in `settings-tab.ts`).
- `npx tsc -noEmit -skipLibCheck` — clean.

## Residual risk

- Default timeouts are 30s for metadata, 60s for asset downloads. A
  user on a slow connection who is importing a multi-MB attachment
  with `imageHandling: "download"` may now see a timeout that would
  previously have just been a long wait. Documented in code; no
  user-facing setting yet. If users complain, expose
  `requestTimeoutMs` / `downloadTimeoutMs` as Obsidian settings.
- `withTimeout` races; the underlying `requestUrl` is **not**
  cancelled on timeout. A late response still consumes a connection
  slot until Obsidian's own transport cleans up. Acceptable for the
  Are.na rate limits Tetromino operates under, but worth noting if
  users hit socket exhaustion.
- Are.na's `Retry-After` header on 429 is still respected via
  `await delay(retryAfter * 1000)`. Combined with the 30s metadata
  timeout, the worst-case per request is `maxRetries * (timeout +
  retryAfter) ≈ 3 × (30s + 60s) ≈ 4.5 min` for a rate-limited channel.
  This is bounded and the user gets a clear Notice at the end.

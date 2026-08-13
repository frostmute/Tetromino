# Bug: "Import my channels" fails with 404

**Status:** Fixed in commit TBD.
**Date:** 2026-08-12.

## Symptom

Clicking the **Import my channels** button in Tetromino's settings tab throws
`request failed status 404` immediately (no hang — the request completes
fast with a 404, unlike the earlier `api-request-hang` issue).

The button calls `ArenaApi.listMyChannels()` in `src/api.ts`, which
delegates to `listAllMyChannels()` in `main.ts:importMyChannelsMappings`.
Both call the Are.na v3 endpoint `GET /v3/me/channels`.

## Root cause

`/v3/me/channels` does not exist in Are.na's public v3 REST API. The
endpoint always returns `404 {"title":"Not Found","status":404}`.

Are.na's v3 REST API does not expose a "list channels owned by the
authenticated user" route at all. The Are.na web app must enumerate
user channels via an internal/GraphQL path that is not reachable from
the public REST surface.

The correct public endpoint is documented at
`https://www.are.na/developers/explore/user/contents.md`:

> `GET /v3/users/{id}/contents` with `?type=Channel` returns every
> channel the user has added or owns (the docs note the parameter
> locates everything "added by" the target account).

We verified the endpoint with the user's PAT:

```
GET /v3/users/deepspace-ghost/contents?type=Channel&per=100
→ 200, meta: { total_count: 39, total_pages: 1, ... }
  (matches /v3/me counts.channels: 39)
```

## Candidates rejected

| Endpoint | Status | Why not used |
|---|---|---|
| `GET /v3/me/channels` | 404 | The original (broken) call. |
| `GET /v3/users/{slug}/channels` | 404 | Does not exist. |
| `GET /v3/channels?owner=…` | 405 | Not a list endpoint. |
| `GET /v3/me/feed` | 200 | Returns activity events, not channels. |
| `GET /v3/me` | 200 | Returns user, no channels list. |
| `GET /v3/users/{slug}/groups` | 200 | Returns channel *groups*, not channels. |
| `GET /v3/users/{slug}/contents` (no `type=Channel`) | 200 | Returns blocks. |
| `GET /v3/blocks/{id}/connections` | 200 | Per-block channel refs, requires N+1 calls. |
| `POST /graphql` | 401 (always) | Bearer token rejected; endpoint appears to require a session cookie. |

## Fix

`src/api.ts`:

1. Added a private helper `getCurrentUserSlug()` that calls `GET /v3/me`
   and caches the result under the `user:me` cache key (5-min TTL,
   re-uses the existing `ArenaApi` cache). The slug is the only field
   the rest of the code needs from `/v3/me`.
2. Added a private helper `normalizeChannelListItem()` that maps the
   v3 `Channel` object shape to the existing `ArenaChannelListItem`
   type the settings UI expects:
   - `id` ← `id`
   - `slug` ← `slug`
   - `title` ← `title`
   - `length` ← `length` if present, else `counts.contents`,
     else `counts.blocks`, else `0`
   - `status` ← `visibility` (`public` / `private` / `closed`).
     Anything else falls back to `closed`.
   - `updated_at` ← `updated_at`
3. Rewrote `listMyChannels(page)` to:
   - Resolve the slug via `getCurrentUserSlug()`.
   - Call `/v3/users/{slug}/contents?type=Channel&page=N&per=100`.
   - Run the response through the existing
     `normalizePaginatedResponse` (already understands the v3
     `{ data, meta }` envelope) and then map each item with
     `normalizeChannelListItem`.
4. `listAllMyChannels()` was left untouched — it already iterates by
   `total_pages`, which the new endpoint provides.

## Regression tests

`src/__tests__/api_extended.test.ts` (replaced the two pre-existing
tests, which assumed a `ArenaChannelListItem`-shaped response):

- `lists channels with pagination via /v3/users/{slug}/contents?type=Channel`
  — full v3 Channel shape, asserts `status` and `length` mapping.
- `lists all my channels by paginating until total_pages` — confirms
  `listAllMyChannels()` still works end-to-end.
- `calls /v3/me only once across multiple listMyChannels invocations`
  — guards the 5-min cache so a future refactor doesn't re-introduce
  an extra round-trip per page.
- `maps visibility to status for public, private, and closed channels`
  — covers all three `status` branches.

All 373 tests pass; lint clean; `npm run build` deploys the rebuilt
`main.js` to the user's vault.

## Verification

- Live API call with the user's PAT returned 39 channels
  (`counts.channels: 39` matches `/v3/me`).
- Curl from terminal:

  ```
  curl -s -H "Authorization: Bearer $TOK" \
    'https://api.are.na/v3/users/deepspace-ghost/contents?type=Channel&per=100'
  # 200, total_count: 39
  ```
- Jest: 373 passed.
- TypeScript: `tsc -noEmit -skipLibCheck` clean.

## Residual risk

- **Slug-only auth on the user endpoint.** The new code resolves the
  slug via `/v3/me` and assumes that slug is usable in
  `/v3/users/{slug}/contents`. We verified that with the user's slug
  on 2026-08-12. If Are.na ever splits these (e.g. requires the
  numeric user id), the failure would surface as a 404 on the
  contents call; the existing error handling will throw a clear
  `Are.na API error: Not found` to the UI.
- **No backoff on the user-cache miss.** `/v3/me` is wrapped by the
  same retry/timeout machinery as every other request, so a flaky
  call is retried with the standard exponential backoff (≤3 attempts).
  After 3 failures the import fails with a clear error.
- **No tests for an empty user (no channels).** The endpoint
  contract is "empty `data` array" which `normalizeChannelListItem`
  handles trivially; if Are.na ever returns a different shape for
  users with 0 channels the new tests would still catch a regression
  in the per-item mapping.

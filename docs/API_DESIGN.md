---
type: reference
title: API Design and Integration Patterns
created: 2026-06-26
tags:
  - api
  - architecture
  - are.na
  - integration
related:
  - '[[DEVELOPER_GUIDE]]'
  - '[[USER_GUIDE]]'
---

# API Design and Integration Patterns

This document describes how Tetromino integrates with the Are.na REST API. It is intended for contributors who need to understand, debug, or extend the API layer (`src/api.ts`).

For a high-level architecture overview, see [[DEVELOPER_GUIDE]]. For end-user troubleshooting of API errors, see [[USER_GUIDE]].

---

## Table of Contents

1. [Are.na API Overview](#arena-api-overview)
2. [Endpoints Used by Tetromino](#endpoints-used-by-tetromino)
3. [Authentication](#authentication)
4. [Pagination](#pagination)
5. [Rate Limiting](#rate-limiting)
6. [Error Handling and Retries](#error-handling-and-retries)
7. [Response Normalisation](#response-normalisation)
8. [Asset Downloads](#asset-downloads)
9. [Caching](#caching)
10. [Future API Versions](#future-api-versions)

---

## Are.na API Overview

Tetromino targets the **Are.na REST API v3**. The official documentation lives at <https://www.are.na/developers/explore>.

| Attribute | Value |
|-----------|-------|
| Base URL | `https://api.are.na` |
| Version prefix | `/v3` (auto-prepended by `ArenaApi.buildApiUrl`) |
| Transport | Obsidian's `requestUrl` (`XMLHttpRequest` under the hood) |
| Serialisation | JSON request/response bodies |
| Authentication | Bearer token (`Authorization: Bearer <token>`) |

All paths passed to `ArenaApi.request` are normalised: if they do not start with `/v`, the `/v3` prefix is injected automatically. This means internal callers use human-readable paths such as `/channels/my-channel` while the actual request targets `https://api.are.na/v3/channels/my-channel`.

---

## Endpoints Used by Tetromino

### `GET /channels/{slug}`

**Purpose:** Fetch channel metadata (title, slug, description, length, visibility).

**Called by:** `ArenaApi.getChannel()`

**Response shape (v3):**
```json
{
  "data": {
    "id": 123,
    "title": "Inspiration",
    "slug": "inspiration",
    "description": "Visual references.",
    "status": "public",
    "length": 42,
    "user": { /* … */ }
  }
}
```

**Normalisation:** `ArenaApi.normalizeChannel` coerces `length` from multiple possible fields (`length`, `total_connections`, `connections_count`) and normalises `metadata.description` into a nullable `metadata` object.

---

### `GET /channels/{slug}/contents?page={n}&per={100}`

**Purpose:** Fetch paginated blocks for a channel.

**Called by:** `ArenaApi.getChannelContents()` and `ArenaApi.getAllChannelBlocksWithProgress()`

**Response shape (v3):**
```json
{
  "data": [ /* ArenaBlock objects */ ],
  "meta": {
    "current_page": 1,
    "per_page": 100,
    "total_pages": 3,
    "total_count": 201
  }
}
```

**Normalisation:** `ArenaApi.normalizePaginatedResponse` converts this into a stable `ArenaPaginatedResponse<ArenaBlock>`.

---

### `GET /blocks/{id}`

**Purpose:** Fetch a single block (used for enrichment: comments, connected channels, full metadata).

**Called by:** `ArenaApi.getBlock()`

**Response shape (v3):**
```json
{
  "data": { /* ArenaBlock */ }
}
```

---

### `GET /me`

**Purpose:** Verify the user's API token.

**Called by:** `ArenaApi.verifyToken()`

**Behaviour:** Returns `true` if the request succeeds (`2xx`), `false` if any error is caught. Used by the settings-tab "Verify" button.

---

### `GET /me/channels?page={n}&per={100}`

**Purpose:** List channels owned by the authenticated user.

**Called by:** `ArenaApi.listMyChannels()` and `ArenaApi.listAllMyChannels()`

**Response shape:** Same paginated envelope as `/channels/{slug}/contents` but with `ArenaChannelListItem` objects.

---

### Direct asset URLs (not api.are.na)

**Purpose:** Download binary attachments and images.

**Called by:** `ArenaApi.downloadBinary()`

These requests target CDN URLs extracted from block fields (`image.original.url`, `attachment.url`, etc.). They are **not** prefixed with `/v3` and do **not** include the Are.na auth token, because the URLs are pre-signed or publicly accessible.

---

## Authentication

Tetromino uses a **Personal Access Token** supplied by the user in plugin settings.

- **Generation:** <https://www.are.na/developers/personal-access-tokens>
- **Storage:** Masked in the UI; persisted in Obsidian's plugin data (`loadData` / `saveData`).
- **Header:** Every API request includes `Authorization: Bearer <token>` via `ArenaApi.headers()`.
- **Scope required:** Read access (the plugin never writes to Are.na).

If the token is empty, the header is omitted. Most endpoints will then return `401 Unauthorized` for private channels, but public channels may still be readable.

---

## Pagination

### Page Size

```ts
const PER_PAGE = 100;
```

Tetromino requests the maximum page size supported by Are.na (100 items) to minimise round-trips.

### Fetch Strategy

`getAllChannelBlocksWithProgress` implements an **eager, sequential** fetch loop:

1. Start at page `1`.
2. Request the page via `fetchPageWithRetries` (see [Error Handling](#error-handling-and-retries)).
3. Deduplicate blocks by `id` using a `Set<number>`.
4. Report progress via `onPage(currentPage, totalPages)`.
5. Decide whether to continue based on `shouldStopPagination`.
6. Sort the final, deduplicated array by `position` ascending, then `id` ascending.

### Stop Conditions

Pagination stops when **any** of the following is true:

| Condition | Meaning |
|-----------|---------|
| Empty page (`pageLength === 0`) | No more blocks available. |
| Partial page (`pageLength < PER_PAGE`) | Last page naturally reached. |
| Total pages reached (`pageNumber >= reportedTotalPages`) | Server-reported bound reached. |
| Duplicate page (`newBlocksCount === 0 && pageLength > 0`) | Every block on this page was already seen (defensive against API overlap bugs). |

These conditions are logged at debug level with the exact reason (`empty`, `partial`, `total`, `duplicates`).

### User Channel Listing

`listAllMyChannels` uses a simpler `do … while` loop that walks pages until `page <= totalPages`. Deduplication is not performed here because user channels are expected to be unique per page.

---

## Rate Limiting

Are.na returns HTTP `429 Too Many Requests` when the caller exceeds its rate limit. The response includes a `Retry-After` header (seconds).

### Tetromino's Rate-Limit Handler

On `429`:

1. Read `Retry-After` from the response headers (case-insensitive: `retry-after`, `Retry-After`, `retry_after`).
2. Default to `60` seconds if the header is missing or malformed.
3. Log the delay at debug level.
4. Wait exactly `retryAfter * 1000` ms.
5. Retry the request, counting against `MAX_RETRIES`.

```ts
if (res.status === RATE_LIMIT_STATUS) {
  const retryAfter = this.readRetryAfterSeconds(res.headers);
  attempts++;
  if (attempts >= MAX_RETRIES) {
    throw new Error(this.getErrorMessage(RATE_LIMIT_STATUS));
  }
  await delay(retryAfter * 1000);
  continue;
}
```

### Inter-Request Delay

To avoid triggering rate limits in the first place, sequential page fetches include a small jittered delay:

```ts
const REQUEST_DELAY = 100; // ms
const JITTER = 50;         // ms
await delay(withJitter(REQUEST_DELAY));
```

This is applied **only after page 1** and only when there were no consecutive errors on the current page.

---

## Error Handling and Retries

### Retry Budget

```ts
const MAX_RETRIES = 3;
```

Every API request is allowed up to 3 attempts in total (initial attempt + 2 retries).

### Status Code Matrix

| Status | Retry? | Behaviour |
|--------|--------|-----------|
| `400` | No | Immediate error: invalid request parameters. |
| `401` | No | Immediate error: invalid or missing token. |
| `403` | No | Immediate error: access denied (private channel or insufficient scope). |
| `404` | No | Immediate error: channel/block not found. |
| `429` | Yes | Respect `Retry-After`, wait, then retry. |
| `500`, `502`, `503`, `504` | Yes | Exponential backoff with jitter, then retry. |
| Network / transport error | Yes | Same backoff as `5xx`. |
| Unknown `4xx` / `5xx` | No | Immediate error after exhausting retries. |

### Backoff Formula

For transient errors (`5xx` and network failures):

```ts
function transientBackoffMs(attempts: number): number {
  return Math.min(1000 * Math.pow(2, attempts), 10000)
    + Math.floor(Math.random() * JITTER);
}
```

| Attempt | Base delay | Max jitter | Max total |
|---------|------------|------------|-----------|
| 1 | 2,000 ms | 50 ms | 2,050 ms |
| 2 | 4,000 ms | 50 ms | 4,050 ms |
| 3 | 8,000 ms | 50 ms | 8,050 ms |
| 4+ | capped at 10,000 ms | 50 ms | 10,050 ms |

For `429`, the backoff is **not** exponential; it uses the server-provided `Retry-After` value directly.

### Page-Level Retry Loop

Inside `getAllChannelBlocksWithProgress`, individual pages are fetched via `fetchPageWithRetries`, which maintains its own consecutive-error counter:

```ts
const MAX_CONSECUTIVE_ERRORS = 3;
```

If a single page fails repeatedly, the entire channel import aborts with a descriptive message:

```
Failed to fetch channel {slug} after 3 consecutive errors. Last error: …
```

This is distinct from the per-request `MAX_RETRIES`: a page may fail 3 times, be retried successfully, then later fail again; the consecutive counter resets on success.

---

## Response Normalisation

Are.na has evolved its JSON schema over time. `ArenaApi` normalises three possible shapes into a single internal representation.

### v3 Shape (current)

```json
{ "data": [...], "meta": { "current_page": 1, "per_page": 100, "total_pages": 3, "total_count": 201 } }
```

### v2 / Legacy Shape

```json
{ "contents": [...], "length": 201, "total_pages": 3, "current_page": 1, "per": 100 }
```

### Raw Array Fallback

```json
[ /* … */ ]
```

`normalizePaginatedResponse` handles all three, preferring `meta` fields when present and falling back to top-level fields or array length. This future-proofs Tetromino against minor API schema drift without requiring a version bump.

---

## Asset Downloads

Binary downloads (images, attachments) use a **separate retry loop** in `downloadBinary()`:

- No auth header (URLs are public or pre-signed).
- Same `MAX_RETRIES = 3` budget.
- Same `429` handling with `Retry-After`.
- Same transient `5xx` backoff.
- On terminal failure, throws an error prefixed with `Asset download …` so the sync engine can record it as a per-block, recoverable error without aborting the entire import.

---

## Caching

To reduce redundant API calls during a single import pass, `ArenaApi` keeps an in-memory LRU-style cache:

```ts
private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

Cached entities:
- **Channels:** keyed by `channel:${slug}`
- **Blocks:** keyed by `block:${id}`

Cache entries expire after 5 minutes. The cache is **not** persisted across Obsidian sessions; it exists only in the `ArenaApi` instance lifetime.

---

## Future API Versions

### Current Stance

Tetromino is pinned to **API v3**. The version prefix is a single constant:

```ts
const API_VERSION_PREFIX = "/v3";
```

### Handling a Future v4 (or Breaking Change)

If Are.na releases a v4 with breaking changes, the recommended migration path is:

1. **Audit the diff:** Compare v3 and v4 schemas for the endpoints Tetromino uses (`/channels`, `/blocks`, `/me`).
2. **Extend normalisation:** Update `normalizePaginatedResponse`, `normalizeChannel`, and `normalizeBlock` to detect and adapt the new shape, preserving backward compatibility with v3 responses.
3. **Bump the prefix:** Change `API_VERSION_PREFIX` to `/v4` once normalisation is proven in tests.
4. **Add feature detection:** If v4 introduces new capabilities Tetromino wants to use (e.g., richer metadata), gate them behind a runtime version check or a user opt-in setting.
5. **Communicate:** Update `CHANGELOG.md`, `README.md`, and this document. Notify users if the new API requires a different token scope.

### Why Not Version Negotiation Today?

Are.na does not currently advertise an API version in responses, and the v3 surface is stable. Adding proactive version negotiation would introduce complexity without a known benefit. The normalisation layer already provides a lightweight form of forward compatibility.

---

*Last updated: 2026-06-26*

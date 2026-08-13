# Are.na v3 block type refactor

**Status:** fixed
**Date:** 2026-08-12
**Scope:** `src/types.ts`, `src/utils.ts`, `src/sync-engine.ts`, `src/api.ts`, `__tests__/fixtures*`

## Symptom

Image, attachment, embed, and link blocks were silently dropping content,
images were not being embedded, and "Import my channels" failed with
`404` for `/v3/me/channels`. The whole sync pipeline was written against the
Are.na v2 API shape, but the live service has been v3-only for some time —
so every block coming back from Are.na looked structurally different from
what the plugin expected, and most rendering branches took the empty path.

## Root cause

The plugin's type system described the v2 payload:

| Field the code read            | What v3 actually returns                                 |
| ------------------------------ | -------------------------------------------------------- |
| `block.class`                  | `block.type` (e.g. `"Text"`, `"Image"`)                  |
| `block.content: string`        | `block.content: { markdown, html, plain? }`              |
| `block.description: string`    | `block.description: { markdown, html, plain? }`          |
| `image.thumb/display/original: { url }` | `image.src` + `image.small/medium/large: { src, width, height }` |
| `attachment.file_name/extension` | `attachment.filename/file_extension`                   |
| `user.first_name/last_name/username/channel_count` | `user.name`, `user.initials` (no first/last split) |
| `channel.length` (string sometimes) | `channel.length` (number) or `channel.counts.contents/blocks` |
| `channel.metadata.follower_count` | `channel.counts.followers`                            |

v3 also dropped the `Media` and `Channel` block classes. What was a
`Media` block in v2 is an `Embed` in v3 (with an `embed.url` field). What
was a `Channel` block in v2 is a `Link` block whose `source.url` points at
another Are.na channel — there is no longer a dedicated channel block type.

The result was that every conditional branch in `renderBlockContent` and
`ensureBlockAsset` either silently no-op'd (`block.class === "Image"`
against `block.type === "Image"` is always false) or, in the case of
`/v3/me/channels`, returned 404 because the endpoint does not exist; the
correct call is `GET /v3/users/{slug}/contents?type=Channel`.

## Fix

### 1. `src/types.ts` — rewrite to v3 shape

- `ArenaUser` now has `id`, `slug`, `name`, `avatar`, `initials` (no
  `first_name` / `last_name` / `username` / `channel_count`).
- `ArenaBlock` has `type` (not `class`), `content` and `description` are
  `ArenaMarkdownContent` (or `null`), `image` is the new
  `ArenaBlockImage` shape, `attachment` is `ArenaBlockAttachment`
  (`filename` / `file_extension`), and a new optional `embed` field
  carries the v3 embed payload.
- `ArenaChannel` exposes `counts: ArenaBlockCounts` with optional
  `contents` / `blocks` / `followers` etc.
- `DEFAULT_SETTINGS.templateString` updated: `arena_class` → `arena_type`,
  `{{class}}` → `{{type}}`.

### 2. `src/utils.ts` — adopt v3 branches

- `resolveImageUrl(block, priority)` iterates v3 image variants
  (`small` / `medium` / `large` / `src`) according to
  `thumb-first` / `display-first` / `original-first`. Falls back through
  the variant list and returns `null` only if every variant is empty.
- `renderBlockContent` uses `block.type` against the v3 union
  (`"Text" | "Image" | "Link" | "Attachment" | "Embed"`), reads
  `block.content?.markdown` and `block.description?.markdown`, and adds a
  dedicated `Embed` branch that uses `block.embed?.url ?? source.url`
  wrapped in `<…>`. Removed the unreachable `Channel` branch — v3 has no
  such block type.
- `blockToMarkdown` legacy path emits `arena_type` (not `arena_class`).

### 3. `src/sync-engine.ts`

- `ensureBlockAsset`: `block.type === "Image" | "Attachment"`, reads
  `attachment.filename` and the resolved image URL via the new
  `resolveImageUrl` helper.
- `shouldExclude`: `this.settings.excludeClasses.includes(block.type)` —
  the field name is historical (user-facing option) but the comparison is
  now against the v3 type union.
- `prefetchChannelPreviews` / `buildBlockContext` use the new
  `isChannelBlock(block)` helper, which detects "channel-as-block" by
  matching `source.url` against `https://www.are.na/channel/<slug>` —
  the only signal available in v3 (where the block `type` is `Link`).
- `getChannelPreviewImage`: gates on `block.type !== "Image"`, and the
  preview URL is `resolveImageUrl(block, "display-first")`.
- `updateChannelIndex`: `channel.counts?.followers ?? null` (no more
  v2 fallbacks).

### 4. `src/api.ts` — fix `listMyChannels`

`/v3/me/channels` does not exist. The correct sequence is:

1. `GET /v3/me` to get the current user's `slug` (cached for 5 min).
2. `GET /v3/users/{slug}/contents?type=Channel&page={N}&per=100` to list
   their channels.

`normalizeChannel` now also reads `length` from `counts.contents` /
`counts.blocks` when the top-level field is missing, and derives
`status` from `visibility` (`public` / `closed` / `private`).

### 5. Fixtures

`__tests__/fixtures.ts` and `__tests__/fixtures/scenarios.ts` were
rewritten to the v3 shape; every test that constructed blocks inline
(`utils.test.ts`, `sync-engine-extended.test.ts`, `integration.test.ts`)
was updated to the new factory plus a tiny `textBlock(id, title, md, pos)`
helper for inline v3 Text blocks.

## Verification

- `npm test` — 373/373 passing (was 42 failing).
- `npm run lint` — 0 errors, 2 pre-existing warnings unrelated to this work.
- `npm run build` — succeeds, packaged
  `dist/tetromino-1.1.1.zip`.

## Residual risk

- Are.na can still add new variants of the v3 shapes (e.g. an extra image
  size, or a new `embed.provider` field). The plugin tolerates missing
  fields because every property in the v3 type is either required at
  creation or treated as optional with a documented fallback.
- The `isChannelBlock` heuristic relies on the source URL hostname being
  `www.are.na`. A future Are.na v3 change that wraps these links in a
  redirect or shortener would break the channel-preview enrichment
  silently; a guard in `buildBlockContext` is the recommended follow-up.

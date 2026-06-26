---
type: reference
title: Test Fixtures and Scenarios
created: 2026-06-26
tags:
  - testing
  - fixtures
  - are.na
  - obsidian
related:
  - '[[coverage-map]]'
---

# Test Fixtures and Scenarios

This document describes the realistic test data and fixtures used in Tetromino's test suite. Future contributors should reference these fixtures when writing new tests to ensure consistency and realism.

## Directory Structure

```
src/__tests__/
├── fixtures/
│   ├── scenarios.ts   # Are.na API response fixtures (channels, blocks, edge cases)
│   ├── vault.ts       # Mock Obsidian vault factory and pre-built scenarios
│   └── index.ts       # Re-exports for convenience
├── integration.test.ts # Integration tests using the realistic fixtures
└── ...                # Existing unit tests
```

## Are.na API Fixtures (`scenarios.ts`)

### User Fixtures

| Fixture | Description |
|---------|-------------|
| `testUser` | Default Are.na user with complete profile |
| `otherUser` | Secondary user for multi-author channels |

### Channel Fixtures

| Fixture | Length | Status | Description |
|---------|--------|--------|-------------|
| `emptyChannel` | 0 | public | Tests empty-channel edge case |
| `smallChannel` | 3 | public | Quick smoke-test channel |
| `largeChannel` | 250 | public | Tests pagination and bulk import |
| `privateChannel` | 5 | private | Tests access-control scenarios |
| `closedChannel` | 8 | closed | Tests closed-channel handling |
| `channelWithSpecialChars` | 2 | public | Title contains `/:&<>"` characters |
| `channelListItems` | — | mixed | Array of `ArenaChannelListItem` for list endpoints |

### Block Factory Functions

| Function | Block Class | Use Case |
|----------|-------------|----------|
| `makeTextBlock(id, title, content)` | Text | Standard prose blocks |
| `makeImageBlock(id, title, url, filename)` | Image | Image blocks with CDN URLs |
| `makeLinkBlock(id, title, url, description?)` | Link | External links with optional description |
| `makeEmbedBlock(id, title, url)` | Embed | Embedded media (YouTube, Vimeo, etc.) |
| `makeMediaBlock(id, title, url, filename)` | Media | Video/audio with attachment metadata |
| `makeAttachmentBlock(id, title, url, filename, contentType)` | Attachment | Downloadable files (PDFs, docs, etc.) |
| `makeChannelBlock(id, title, slug)` | Channel | Nested channel references |

### Edge-Case Block Fixtures

| Fixture | Edge Case Tested |
|---------|------------------|
| `nullTitleBlock` | Falls back to `Block {id}` heading |
| `emptyContentBlock` | Empty string content handling |
| `specialCharsBlock` | Filename sanitisation (`/:<>&"`) |
| `veryLongTitleBlock` | 200-character title truncation |
| `unicodeBlock` | CJK, Arabic, Hebrew, emoji support |
| `deletedBlock` | Blocks removed from channel |
| `nullDescriptionBlock` | Description field presence |
| `noImageDataBlock` | Image class with null `image` property |

### Scenario Builders

| Function | Returns | Description |
|----------|---------|-------------|
| `makeSmallChannelBlocks()` | 3 blocks | Text + Image + Link |
| `makeMixedChannelBlocks()` | 10 blocks | All block types + edge cases |
| `makePaginatedChannelBlocks(total)` | N blocks | Cycles through all types; useful for pagination tests |
| `makeConflictScenarioBlocks()` | 3 blocks | Designed for conflict-resolution tests |

### API Response Helpers

| Function | Purpose |
|----------|---------|
| `makeChannelResponse(channel)` | Mock `requestUrl` response for `getChannel` |
| `makePaginatedBlocksResponse(page, blocks, totalPages, totalCount?)` | v3 paginated shape |
| `makeLegacyPaginatedBlocksResponse(page, blocks, totalPages, totalCount?)` | v2/legacy paginated shape |
| `makeEmptyPaginatedResponse()` | Empty page for pagination-stop tests |
| `makeErrorResponse(status, message?)` | Error responses for retry/error tests |

## Mock Vault Fixtures (`vault.ts`)

### `MockVault` Class

A fully functional in-memory Obsidian vault for tests.

**Supported Operations:**
- `getAbstractFileByPath(path)` – Returns `TFile`, folder stub, or `null`
- `create(path, content)` – Creates a text note
- `createBinary(path, data)` – Creates a binary file
- `read(file)` – Returns file content
- `modify(file, content)` – Updates content and `mtime`
- `rename(file, newPath)` – Moves/renames a file
- `delete(file, force?)` – Removes a file
- `createFolder(path)` – Creates a folder

**Helper Methods:**
- `seed(entries)` – Bulk-populate from a `{path: content}` map
- `has(path)` – Check existence
- `content(path)` – Read content by path
- `paths()` – List all file paths
- `clear()` – Reset vault state

### `makeMockApp(vault?)`

Returns `{ app, vault }` where `app.vault` points to the `MockVault`. Use this to initialise `SyncEngine`.

### Pre-Built Vault Scenarios

| Function | Contents |
|----------|----------|
| `emptyVault()` | Fresh empty vault |
| `vaultWithExistingNotes()` | 3 pre-existing notes (stable, changing, orphan) |
| `vaultWithConflictingEdits()` | 2 notes primed for conflict testing |

## Integration Tests (`integration.test.ts`)

These tests exercise the full `SyncEngine` + `ArenaApi` + `MockVault` stack with realistic data.

| Test Suite | Scenarios Covered |
|------------|-------------------|
| `small channel import` | 3-block channel; verifies note creation and index generation |
| `mixed block types channel` | All 7 block classes in one channel; attachment downloads |
| `empty channel` | Zero blocks; only index note created |
| `large paginated channel` | 250 blocks; verifies bulk throughput |
| `conflict resolution with existing notes` | Two-phase sync: initial import → remote change → re-sync |
| `special characters in block titles` | Filename sanitisation of `< > : / "` |
| `dry-run with realistic mixed channel` | Verifies no vault mutations in dry-run mode |
| `channel with deleted blocks` | Blocks removed from channel are marked missing |
| `unicode and international characters` | CJK, RTL scripts, and emoji in titles/content |

## Adding New Fixtures

1. **New block type?** Add a `make*Block` factory in `scenarios.ts`.
2. **New channel configuration?** Add a channel fixture or scenario builder.
3. **New vault state?** Add a pre-built vault scenario in `vault.ts`.
4. **New edge case?** Add a dedicated block fixture and a test in `integration.test.ts`.

Always run `npm test` after adding fixtures to ensure existing tests are not broken.

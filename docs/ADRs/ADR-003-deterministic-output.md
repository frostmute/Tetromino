---
type: decision
title: ADR-003 — Deterministic Output
created: 2026-06-26
tags:
  - adr
  - architecture
  - determinism
related:
  - '[[DEVELOPER_GUIDE]]'
  - '[[testing-guide]]'
  - '[[ADR-005]]'
---

# ADR-003: Deterministic Output

## Status

Accepted

## Context

Tetromino generates Markdown files from Are.na blocks. If the same channel is imported twice without any remote changes, the resulting notes should be **identical**. Without determinism, repeated imports would produce spurious diffs, making it impossible for users to trust that "no changes" really means no changes.

Non-determinism can creep in from many sources: unordered arrays, non-stable string rendering, race conditions in concurrent file writes, or timestamps embedded in content.

## Decision

Tetromino guarantees **deterministic output**: for a given Are.na channel and a given plugin settings state, every import produces **byte-identical Markdown** (except for acceptable variability points such as `lastSyncedAt` timestamps in sync records, which do not affect note content hashes).

## Rationale

1. **Reliable diffing and dry-run preview.**
   The dry-run feature compares planned output against existing vault files. If output were non-deterministic, the diff would show false positives (content that appears changed but is merely reordered), rendering the preview useless.

2. **Trust and transparency.**
   Users need confidence that running an import twice in a row will result in zero modifications if nothing changed on Are.na. Determinism makes this expectation hold.

3. **Simplified testing.**
   Deterministic output allows snapshot testing and hash-comparison assertions. The test suite includes `src/__tests__/determinism.test.ts` specifically to guard against regressions.

4. **Idempotent vault operations.**
   When combined with content-hash comparisons in `SyncEngine`, determinism ensures that `vault.modify()` is called only when content has actually changed, reducing filesystem churn and preserving note history.

## How Determinism Is Achieved

The following mechanisms enforce determinism across the codebase:

| Mechanism | Location | Purpose |
|-----------|----------|---------|
| **Stable block ordering** | `src/sync-engine.ts` (`pull()`) | Blocks are sorted by `position`, then by `id` before processing. |
| **Stable index links** | `src/sync-engine.ts` (`updateChannelIndex()`) | Note paths in channel index notes are sorted alphabetically. |
| **Stable connected-channel lists** | `src/sync-engine.ts` (`extractChannelPool()`) | Channels are sorted by title after deduplication. |
| **Content hashing** | `src/utils.ts` (`computeHash()`) | SHA-256 (first 16 hex chars) of the Markdown string is used to detect real changes. |
| **Controlled concurrency** | `src/utils.ts` (`pMap()`) | Parallel workers are deterministic in output even though execution order varies, because results are assembled in original array order. |
| **Template AST caching** | `src/templateUtils.ts` | Parsed templates are evaluated against a stable variable map; no randomness in rendering. |

## Acceptable Variability Points

Not everything must be frozen. The following are allowed to vary without breaking the determinism contract:

- **`lastSyncedAt`** in `ChannelMapping` and `SyncRecord`: these are metadata timestamps stored in plugin data, not in note content.
- **Import history entries** in `Are.na/import-history.md`: these append-only logs naturally change over time.
- **Performance timing** (`duration` in `SyncResult`): purely diagnostic.

## Consequences

### Positive

- Users can run imports freely without fear of unnecessary file modifications.
- The dry-run preview accurately reflects what a real import would do.
- Tests can assert on exact expected strings, making regressions easy to catch.
- Git diffs of the vault remain clean when Are.na content has not changed.

### Negative

- Extra sorting steps add minor CPU overhead.
- Hash computation (SHA-256) is performed on every block every import. This is fast for typical note sizes but adds up for thousands of blocks.
- Any new feature that introduces ordering (e.g., a new list in output) must explicitly define and implement a stable sort order.

## Implementation Notes

- `SyncEngine.pullBlock()` compares `localHash` and `remoteHash` before calling `vault.modify()`.
- `SyncEngine.markMissing()` handles blocks that no longer appear in the channel by removing stale sync records, but it does **not** delete local files — preserving user edits even if the remote block disappears.
- The determinism test suite (`src/__tests__/determinism.test.ts`) runs multiple sync passes and asserts zero updates when input is unchanged.

## Related Decisions

- [[ADR-005]] — Dry-run preview (relies on determinism to show accurate diffs).
- [[ADR-004]] — Markdown-only format (simplifies deterministic rendering compared to rich HTML).

---

*Last updated: 2026-06-26*

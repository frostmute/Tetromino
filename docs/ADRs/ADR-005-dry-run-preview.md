---
type: decision
title: ADR-005 — Dry-Run Preview
created: 2026-06-26
tags:
  - adr
  - architecture
  - preview
  - user-experience
related:
  - '[[DEVELOPER_GUIDE]]'
  - '[[USER_GUIDE]]'
  - '[[ADR-002]]'
  - '[[ADR-003]]'
---

# ADR-005: Dry-Run Preview

## Status

Accepted

## Context

Importing content into a personal knowledge base is inherently risky: a misconfigured setting or a changed template could overwrite hundreds of notes. Users need a way to **preview** what an import will do before any files are actually created, modified, moved, or deleted.

Two approaches were considered:

1. **Diff-on-demand after import** — Import first, then show a diff of what changed. This is simple but irreversible.
2. **Dry-run preview before import** — Compute the full import plan without writing anything, show the plan, and let the user decide whether to proceed.

## Decision

Tetromino implements a **full dry-run preview mode** that runs the entire sync pipeline — fetching, rendering, diffing, and planning — but **skips all vault write operations** (`vault.create`, `vault.modify`, `vault.rename`, `vault.createBinary`).

The dry-run produces a complete `SyncResult` identical in structure to a real sync, with `dryRun: true`, which is then displayed in the same `SyncSummaryModal` used for real imports.

## Rationale

1. **Safety first.**
   Users can experiment with new settings (templates, attachment storage, banner fields) and see the exact impact without touching their vault. This builds confidence and reduces support requests.

2. **Determinism makes dry-run trustworthy.**
   Because output is deterministic ([[ADR-003]]), the dry-run diff is guaranteed to match what a real import would do immediately afterward. There is no race condition or hidden state that would cause the preview to diverge from reality.

3. **Shared code path.**
   The dry-run and real import share the same `SyncEngine` methods. The only difference is a boolean flag (`dryRun`) that gates the actual `vault.*` calls. This ensures the preview is not a separate, potentially buggy simulation.

4. **User workflow alignment.**
   Manual import ([[ADR-002]]) means the user is already present and attentive. Offering a preview step before the real action fits naturally into this workflow: preview → review → commit.

## How Dry-Run Differs from Commit

| Aspect | Dry-Run | Real Import |
|--------|---------|-------------|
| `vault.create` | Skipped | Executed |
| `vault.modify` | Skipped | Executed |
| `vault.rename` | Skipped | Executed |
| `vault.createBinary` | Skipped | Executed |
| `mapping.lastSyncedAt` | Not updated | Updated to current time |
| `syncRecords` | Not persisted | Updated and saved |
| `Are.na/import-history.md` | Not written | Appended with results |
| `SyncResult.dryRun` | `true` | `false` |

Despite skipping writes, the dry-run still:
- Fetches all channel metadata and blocks from Are.na.
- Computes Markdown for every block.
- Calculates content hashes and diffs.
- Detects moves (when a record's `localPath` differs from the planned path).
- Identifies missing blocks (records for blocks no longer in the channel).

## Consequences

### Positive

- Users can safely experiment with settings and templates.
- No risk of accidental mass overwrites or deletions.
- The preview uses the exact same rendering and diffing code as the real import, so it is highly accurate.
- Supports both full-vault and single-channel preview commands.

### Negative

- Dry-run consumes the same API quota as a real import because it still fetches all data.
- Large channels take the same amount of time to preview as to import, which may frustrate users who expected a "quick glance."
- The UI must clearly distinguish preview from real results to prevent users from thinking changes were applied when they were not.

## Implementation Notes

- The `dryRun` flag is threaded through `SyncEngine.syncAll()`, `SyncEngine.syncChannel()`, and `SyncEngine.pull()` down to `pullBlock()`.
- In `pullBlock()`, when `dryRun` is `true`, the method computes hashes and diffs but skips `vault.create()`, `vault.modify()`, and `vault.rename()`. It also skips `upsertRecord()`.
- `ensureBlockAsset()` in dry-run mode increments `result.downloaded` and adds an action string, but does not call `vault.createBinary()`.
- `updateChannelIndex()` and `updateMasterOverview()` compute their content and diffs in dry-run but skip `vault.create()` / `vault.modify()`.
- `main.ts` shows the same `SyncSummaryModal` for both modes, with the title changed to `"Preview"` vs `"Sync"`.

## Related Decisions

- [[ADR-002]] — Manual import triggered by user (dry-run is a natural first step in the manual workflow).
- [[ADR-003]] — Deterministic output (ensures the preview exactly matches the subsequent real import).
- [[ADR-001]] — One-way import only (dry-run would be even more critical if the plugin wrote back to Are.na, but here it protects the vault).

---

*Last updated: 2026-06-26*

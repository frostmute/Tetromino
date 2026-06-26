---
type: decision
title: ADR-002 — Manual Import Triggered by User
created: 2026-06-26
tags:
  - adr
  - architecture
  - user-control
related:
  - '[[DEVELOPER_GUIDE]]'
  - '[[USER_GUIDE]]'
  - '[[ADR-001]]'
---

# ADR-002: Manual Import Triggered by User

## Status

Accepted

## Context

After deciding on one-way import ([[ADR-001]]), the next question was **when** imports should occur. Options ranged from fully automatic (background polling, webhooks, or sync-on-every-change) to fully manual (user explicitly triggers each import).

Automatic background sync is convenient but can be intrusive: it modifies the vault without the user's immediate awareness, which conflicts with Obsidian's local-first, user-controlled ethos.

## Decision

Imports are **manual by default**. The user must explicitly trigger an import via a command or ribbon action.

As an opt-in convenience, Tetromino supports two automatic modes, both **disabled by default**:

- **Sync on startup**: runs once when Obsidian loads.
- **Sync interval**: runs on a repeating timer (configurable in minutes, default `30`).

## Rationale

1. **User agency and transparency.**
   Obsidian users expect their vault to change only when they take action. A surprise import while writing notes is disruptive and erodes trust.

2. **Are.na API rate limits.**
   Automatic frequent polling would consume rate-limit budget even when nothing has changed. Manual imports concentrate API usage around intentional workflow moments.

3. **Network and battery impact.**
   Background polling adds constant network activity. For users on laptops or metered connections, this is undesirable.

4. **Deterministic dry-run workflow.**
   Manual imports pair naturally with the dry-run preview: a user can preview, review the diff, and then decide to run the real import. Auto-sync would make this two-step workflow impossible.

5. **Optional automation for power users.**
   Users who *do* want hands-free operation can enable startup sync and/or intervals. This satisfies both camps without forcing automation on everyone.

## Consequences

### Positive

- Users always know when their vault is being modified.
- No hidden network traffic or background CPU usage.
- Dry-run preview is meaningful because the user can inspect changes before the next real import.
- Simpler state management: no need to track "last sync attempt" timestamps for failure backoff in background mode.

### Negative

- Users may forget to import and wonder why their vault is out of date.
- First-time users might expect automatic syncing and be confused when nothing happens after adding a mapping.
- The opt-in automation settings require clear UI labeling so users understand what they are enabling.

## Implementation Notes

- `src/main.ts` registers the `runSync()` method behind explicit commands (`Import all channels now`, `Preview import (dry-run)`, etc.).
- The `syncOnStartup` and `syncInterval` settings are stored in `ArenaSyncSettings` with safe defaults (`false` and `0` / `30` respectively).
- `rescheduleInterval()` in `main.ts` manages the interval timer lifecycle cleanly: it clears any existing interval before creating a new one, preventing duplicate timers.

## Related Decisions

- [[ADR-001]] — One-way import only (manual triggering is natural when there is no sync loop to maintain).
- [[ADR-005]] — Dry-run preview (manual imports make the preview-before-commit workflow possible).

---

*Last updated: 2026-06-26*

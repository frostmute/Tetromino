---
type: decision
title: ADR-001 — One-Way Import Only
created: 2026-06-26
tags:
  - adr
  - architecture
  - sync-direction
related:
  - '[[DEVELOPER_GUIDE]]'
  - '[[USER_GUIDE]]'
  - '[[API_DESIGN]]'
---

# ADR-001: One-Way Import Only

## Status

Accepted

## Context

Tetromino bridges Are.na and Obsidian. A natural question during design was whether the plugin should support **two-way synchronization** — pushing edits made in Obsidian back to Are.na — or remain a **one-way importer**.

Two-way sync is attractive because it lets users treat their vault and Are.na as mirrors. However, it introduces significant complexity in conflict resolution, API requirements, and data-model alignment.

## Decision

Tetromino will perform **one-way import only**: **Are.na → Obsidian**. Changes made in Obsidian are never pushed back to Are.na.

## Rationale

1. **No public Are.na write API for block content.**
   Are.na's REST API v3 is read-only for block creation and update. Building two-way sync would require unsupported or reverse-engineered endpoints, making the plugin fragile and prone to breakage.

2. **Conflict resolution is non-trivial.**
   If a block is edited on both platforms, the plugin would need a merge strategy (last-write-wins, three-way merge, or manual resolution). Any of these strategies would surprise some users and add substantial UI and logic complexity.

3. **Vault-first design philosophy.**
   Obsidian is the user's personal knowledge base. Notes imported by Tetromino are starting points that users are expected to edit, annotate, and reorganize. Pushing local edits back would overwrite intentional vault customizations.

4. **Determinism and predictability.**
   One-way import guarantees that Tetromino only *adds* or *updates* notes based on remote state. There is no risk of the plugin modifying Are.na data, which is irreversible and could affect shared channels.

5. **Simpler mental model.**
   Users understand "import" intuitively. Two-way sync requires explaining sync semantics, conflict behavior, and bidirectional timing — all of which increase support burden.

## Consequences

### Positive

- Dramatically simpler architecture: no write-path, no conflict-resolution engine, no state reconciliation.
- Safer for users: no chance of accidentally corrupting shared Are.na channels.
- Faster development: features can focus on import quality rather than sync correctness.
- Lower API usage: no write traffic to Are.na.

### Negative

- Users who want to keep Are.na and Obsidian in perfect sync must restructure their workflow (e.g., edit in Are.na first, then re-import).
- There is no automated way to publish vault notes back to Are.na.
- Users may expect two-way behavior because other tools offer it; this must be clearly documented.

## Related Decisions

- [[ADR-002]] — Manual import triggered by user (complements one-way design by keeping the user in control of when import happens).
- [[ADR-003]] — Deterministic output (ensures repeated one-way imports are stable and predictable).

---

*Last updated: 2026-06-26*

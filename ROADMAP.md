---
type: reference
title: Tetromino Roadmap
created: 2026-06-26
tags:
  - roadmap
  - planning
  - community
related:
  - '[[CHANGELOG]]'
  - '[[CONTRIBUTING]]'
  - '[[PROJECT_BOARD]]'
---

# Tetromino Roadmap

> **Guiding principle:** We only commit to features we are confident we can deliver. This roadmap is a living document — it is updated after every release to reflect completed work and new priorities.

## Current Version: 1.1.0

Released: 2025-06-26

### What's in 1.1.0

- **Sync summary modal** with per-file diff viewer after every import.
- **Master overview note** (`Are.na/overview.md`) linking all mapped channels.
- **Attachment migration system** with preview, dry-run diffs, execution history, and rollback support.
- **Per-channel attachment storage overrides** for flexible asset organization.
- **Channel management tools**: bulk import from Are.na account, auto-enable toggle, backup/restore/reset.
- **Banner frontmatter** compatibility for the Obsidian Banners plugin.
- **Block enrichments**: descriptions, comments, connected channels, and best-effort channel preview images.
- **Channel index enhancements**: folder-note compatibility (`index.md` or `<folder-name>.md`), info sections, and "This Channel Appears In" backlinks.
- **Background sync**: optional sync-on-startup and periodic auto-import intervals.
- **Performance**: concurrent channel syncing, bounded-concurrency block fetching, optimized `SyncRecords` lookup, and resolved N+1 API queries.
- **Security fixes**: credential leak prevention, XSS filter hardening, SSRF mitigation, and directory traversal protection.

See [CHANGELOG.md](CHANGELOG.md) for the full details.

---

## Planned Releases

### v1.2.0 — Content Depth & Customization

**Theme:** Deeper support for Are.na content types and richer user customization.

| Feature | Why it matters | Rough timeline |
|---|---|---|
| Improved `Media` and `Link` block handling | Are.na has diverse block types; better rendering means less manual cleanup after import. | Q3 2025 |
| Custom frontmatter field mapping | Let users map Are.na metadata to their own Obsidian property names and schemas. | Q3 2025 |
| Template library / community presets | Share and reuse templates without copy-pasting long strings into settings. | Q3–Q4 2025 |
| Selective import by block status | Option to include/exclude private or unpublished blocks when importing collaborative channels. | Q4 2025 |
| Enhanced mobile experience | Optimize UI modals and attachment paths for Obsidian Mobile constraints. | Q4 2025 |

**Confidence:** High. These are natural extensions of existing architecture.

---

### v1.3.0 — Scale & Reliability

**Theme:** Make Tetromino effortless for power users with large vaults and high-frequency imports.

| Feature | Why it matters | Rough timeline |
|---|---|---|
| Delta/incremental sync optimization | Reduce redundant API calls and file writes when only a few blocks changed. | Q1 2026 |
| Deduplication and merge helpers | Detect accidental duplicate channel mappings or note collisions and suggest resolutions. | Q1 2026 |
| Advanced filtering and exclusion rules | Exclude blocks by date range, class, or tag; import only the newest N blocks. | Q1 2026 |
| Observability: import metrics and health dashboard | Surface success rates, average import duration, and API rate-limit exposure in settings. | Q1–Q2 2026 |
| Resumable large-channel imports | If Obsidian is closed mid-import, resume from the last fetched page instead of restarting. | Q2 2026 |

**Confidence:** Medium–High. Some items require careful design to preserve determinism.

---

### Future Ideas (Not Committed)

These are under active consideration but lack a committed timeline. We discuss them in [GitHub Discussions](https://github.com/frostmute/Tetromino/discussions) before prioritizing.

- **Webhook or push-triggered import:** Instead of polling, react to Are.na activity. Complex because Tetromino is intentionally manual and user-controlled.
- **Obsidian Canvas support:** Import Are.na channels as Canvas files with visual layout hints.
- **Two-way sync (Obsidian → Are.na):** Explicitly out of scope today per [ADR-001](docs/ADRs/ADR-001-one-way-import-only.md), but we listen to community arguments.
- **Community-curated channel packs:** Pre-built mappings for popular public channels (e.g., design references, reading lists).
- **Plugin API / hooks:** Allow other Obsidian plugins to extend or react to Tetromino imports.

---

## Known Limitations

We are transparent about what Tetromino does *not* do today. These are documented so users can set correct expectations.

1. **One-way import only.** There is no mechanism to push changes from Obsidian back to Are.na. This is by design ([ADR-001](docs/ADRs/ADR-001-one-way-import-only.md)).
2. **No automatic deletion.** If a block is removed from Are.na, the local note is not deleted automatically. You must remove it manually from your vault.
3. **Background sync is best-effort.** Periodic auto-import helps but is not a guaranteed real-time sync engine. Obsidian must be running, and API rate limits apply.
4. **Large channels take time.** Channels with thousands of blocks may take several minutes due to API pagination and rate limits.
5. **Template engine is single-file.** Custom templates apply globally; per-channel or per-block-class templates are not yet supported.
6. **Attachment migration is local-only.** There is no cloud backup or remote migration target.

---

## How to Propose Features or Vote on Priorities

We use [GitHub Discussions](https://github.com/frostmute/Tetromino/discussions) for all feature brainstorming and prioritization.

1. **Search first.** Check if someone already proposed your idea.
2. **Open a discussion** in the **Ideas & Feature Requests** category.
3. **Explain the problem** before the solution. What workflow is painful? What can't you do today?
4. **React with 👍** on discussions you support. We use vote counts as a signal, not a sole deciding factor.
5. **Maintainers review** discussions quarterly when updating this roadmap. High-engagement ideas with clear scope are most likely to be scheduled.

For bugs, use the [Bug report template](.github/ISSUE_TEMPLATE/bug_report.yml). For security issues, see [SECURITY.md](SECURITY.md).

---

## Release Cadence

- **Patch releases (1.x.y):** As needed for bug fixes and security patches. No fixed schedule.
- **Minor releases (1.x.0):** Roughly every 3–6 months, bundling features that are ready and tested.
- **Major releases (2.0.0):** Only when we make a breaking change to settings, file formats, or core behavior. We provide migration guides when this happens.

---

*Last updated: 2026-06-26*

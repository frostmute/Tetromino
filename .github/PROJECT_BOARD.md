# Project Board Structure

Use this file to bootstrap a GitHub Projects board for **Tetromino for Obsidian**.
Create the board at: https://github.com/frostmute/Tetromino/projects/new

---

## Board: Tetromino Roadmap

**View**: Table + Board (Kanban)

### Columns (Status)

| Column | Purpose |
|---|---|
| 📥 Backlog | Ideas and requests not yet scoped |
| 🔍 Triage | New issues awaiting prioritization |
| 📐 Scoped | Accepted, requirements defined, ready for implementation |
| 🚧 In Progress | Actively being worked on |
| 👀 In Review | PR open, awaiting review |
| ✅ Done | Merged and released |

### Custom Fields

| Field | Type | Options |
|---|---|---|
| Priority | Single select | 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low |
| Effort | Single select | XS (< 1h) · S (1–4h) · M (1–2d) · L (3–5d) · XL (1w+) |
| Area | Single select | Import Engine · API · UI/Settings · Docs · CI/CD · Testing |
| Milestone | Iteration | v1.0 · v1.1 · v1.2 |

---

## Current Product Scope (authoritative)

- One-way import only: **Are.na -> Obsidian**
- Deterministic and idempotent file generation
- Manual, user-initiated sync (no background sync)
- Optional dry-run preview + diff viewer
- Attachment storage modes + migration tooling

Out of scope for current line:
- Push from Obsidian back to Are.na
- Two-way conflict resolution

---

## v1.1 — Quality and Clarity

| # | Title | Priority | Effort | Area |
|---|---|---|---|---|
| 1 | Settings UX refinement and onboarding copy | 🟠 High | M | UI/Settings |
| 2 | Richer automated tests for sync engine and migration flows | 🟠 High | L | Testing |
| 3 | Import performance profiling for large channels | 🟡 Medium | M | Import Engine |
| 4 | Better error classification and actionable notices | 🟠 High | M | API |
| 5 | Optional dataview-friendly frontmatter presets | 🟡 Medium | S | Import Engine |
| 6 | Mapping export/import improvements (choose backup file) | 🟢 Low | S | UI/Settings |

---

## v1.2 — Power Features

| # | Title | Priority | Effort | Area |
|---|---|---|---|---|
| 7 | Selective sync (per-channel include/exclude controls) | 🟠 High | L | Import Engine |
| 8 | Connected graph export helpers for Obsidian graph workflows | 🟡 Medium | M | Import Engine |
| 9 | End-to-end import fixtures for regression testing | 🟠 High | L | Testing |
| 10 | Optional template hooks for generated notes | 🟡 Medium | M | UI/Settings |

---

## Labels

Create these labels in the repository to match the required triage and categorization scheme:

### Type labels

| Label | Color | Purpose |
|---|---|---|
| `type: bug` | `#d73a4a` | Something isn't working |
| `type: feature` | `#a2eeef` | New feature or request |

### Priority labels

| Label | Color | Purpose |
|---|---|---|
| `priority: critical` | `#b60205` | Blocks usage, data loss, or security risk |
| `priority: high` | `#d93f0b` | Major impact, should be addressed soon |
| `priority: medium` | `#fbca04` | Moderate impact, standard priority |
| `priority: low` | `#0e8a16` | Minor impact, nice-to-have |

### Status labels

| Label | Color | Purpose |
|---|---|---|
| `status: investigating` | `#e4e669` | Under triage or initial investigation |
| `status: accepted` | `#5319e7` | Confirmed and accepted for implementation |

### Engagement labels

| Label | Color | Purpose |
|---|---|---|
| `good first issue` | `#7057ff` | Good for newcomers |
| `help wanted` | `#008672` | Extra attention is needed |
| `duplicate` | `#cfd3d7` | This issue or pull request already exists |
| `wontfix` | `#ffffff` | This will not be worked on |

### Area labels (optional)

| Label | Color | Purpose |
|---|---|---|
| `area: import-engine` | `#1d76db` | Core import logic |
| `area: api` | `#5319e7` | Are.na API client |
| `area: ui` | `#f9d0c4` | Settings and UI changes |
| `area: docs` | `#0075ca` | Improvements or additions to documentation |
| `area: ci-cd` | `#bfd4f2` | CI/CD and tooling |
| `area: testing` | `#c5def5` | Test suite |

---

## Automations (recommended)

1. Auto-add: new issues -> 🔍 Triage
2. Auto-move: PR opened -> 👀 In Review
3. Auto-move: PR merged -> ✅ Done
4. Auto-close: issues in ✅ Done for 7 days -> close issue

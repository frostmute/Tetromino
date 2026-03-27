# Project Board Structure

Use this file to bootstrap a GitHub Projects board for **Are.na Sync for Obsidian**.
Create the board at: https://github.com/arena-sync/arena-sync-obsidian/projects/new

---

## Board: Are.na Sync Roadmap

**View**: Table + Board (Kanban)

### Columns (Status)

| Column | Purpose |
|---|---|
| 📥 Backlog | Ideas and requests not yet scoped |
| 🔍 Triage | New issues awaiting prioritisation |
| 📐 Scoped | Accepted, requirements defined, ready for work |
| 🚧 In Progress | Actively being worked on |
| 👀 In Review | PR open, awaiting review |
| ✅ Done | Merged and released |

### Custom Fields

| Field | Type | Options |
|---|---|---|
| Priority | Single select | 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low |
| Effort | Single select | XS (< 1h) · S (1–4h) · M (1–2d) · L (3–5d) · XL (1w+) |
| Area | Single select | Sync Engine · API · UI/Settings · Docs · CI/CD · Testing |
| Milestone | Iteration | v1.0 · v1.1 · v1.2 · v2.0 |

---

## v1.0 — Launch (current release)

All items below are **Done ✅** as of v1.0.0.

- [x] Pull sync: channels → Markdown notes
- [x] Push sync: notes → Are.na blocks
- [x] Two-way sync with conflict resolution
- [x] YAML front-matter with Are.na metadata
- [x] Image download / embed / link modes
- [x] Auto-sync timer + manual trigger
- [x] Settings tab with channel mapping UI
- [x] Commands: sync all, sync channel, push note, open on Are.na
- [x] Status bar indicator
- [x] Mobile support
- [x] CI pipeline (lint, test, build)
- [x] Automated release workflow
- [x] README, CHANGELOG, CONTRIBUTING, LICENSE
- [x] Issue & PR templates
- [x] Hero images + demo GIF script

---

## v1.1 — Quality of Life

| # | Title | Priority | Effort | Area |
|---|---|---|---|---|
| 1 | Selective block-class filter per channel | 🟡 Medium | S | Sync Engine |
| 2 | Dataview-compatible front-matter presets | 🟡 Medium | S | Sync Engine |
| 3 | Drag-and-drop channel mapping reorder | 🟢 Low | M | UI/Settings |
| 4 | Sync progress modal with per-block status | 🟠 High | M | UI/Settings |
| 5 | Rate-limit handling with exponential backoff | 🟠 High | S | API |
| 6 | Dry-run mode (preview changes before applying) | 🟡 Medium | M | Sync Engine |
| 7 | Obsidian URI handler for deep-linking synced notes | 🟢 Low | S | UI/Settings |
| 8 | Localisation (i18n) for settings UI | 🟢 Low | M | UI/Settings |

---

## v1.2 — Power Features

| # | Title | Priority | Effort | Area |
|---|---|---|---|---|
| 9 | Webhook listener for real-time Are.na updates | 🟠 High | L | API |
| 10 | Tag / metadata mapping (Are.na connections → Obsidian tags) | 🟠 High | M | Sync Engine |
| 11 | Selective sync (pick individual blocks, not whole channels) | 🟡 Medium | M | Sync Engine |
| 12 | Bulk channel import wizard | 🟡 Medium | M | UI/Settings |
| 13 | Export sync log to file for debugging | 🟢 Low | S | Testing |
| 14 | End-to-end integration test suite | 🟠 High | L | Testing |

---

## v2.0 — Next Generation

| # | Title | Priority | Effort | Area |
|---|---|---|---|---|
| 15 | Collaborative sync (multiple vaults, same channel) | 🔴 Critical | XL | Sync Engine |
| 16 | Visual channel browser inside Obsidian | 🟠 High | XL | UI/Settings |
| 17 | Image OCR → searchable text blocks | 🟡 Medium | L | Sync Engine |
| 18 | Graph view integration (channel connections as links) | 🟠 High | L | UI/Settings |
| 19 | Are.na search from command palette | 🟡 Medium | M | API |
| 20 | Plugin settings sync via Are.na channel | 🟢 Low | M | Sync Engine |

---

## Labels

Create these labels in the repository to match board categories:

```
bug           #d73a4a   Something isn't working
enhancement   #a2eeef   New feature or request
documentation #0075ca   Improvements or additions to documentation
good first issue #7057ff  Good for newcomers
help wanted   #008672   Extra attention is needed
triage        #e4e669   Needs prioritisation
sync-engine   #1d76db   Core sync logic
api           #5319e7   Are.na API client
ui            #f9d0c4   Settings and UI changes
ci-cd         #bfd4f2   CI/CD and tooling
testing       #c5def5   Test suite
duplicate     #cfd3d7   This issue or pull request already exists
wontfix       #ffffff   This will not be worked on
```

---

## Automations (recommended)

1. **Auto-add**: New issues → 🔍 Triage column
2. **Auto-move**: PR opened → 👀 In Review
3. **Auto-move**: PR merged → ✅ Done
4. **Auto-close**: Issues in ✅ Done for 7 days → close issue

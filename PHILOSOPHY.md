---
type: reference
title: Tetromino Philosophy
created: 2026-06-26
tags:
  - philosophy
  - values
  - community
related:
  - '[[CONTRIBUTING]]'
  - '[[ROADMAP]]'
  - '[[CODE_OF_CONDUCT]]'
---

# Tetromino Philosophy

This document captures the core values and design principles that guide Tetromino. It exists so the community understands the "why" behind our choices and so contributors can evaluate whether a proposed feature or change fits the project.

> **The litmus test for any feature:** Does it respect vault autonomy, preserve determinism, keep the user in control, and stay transparent? If not, it probably does not belong in Tetromino.

---

## 1. Intentionally One-Way

**Are.na → Obsidian. Never the reverse.**

Tetromino respects the autonomy of your Obsidian vault. We treat the vault as a personal, sacred space. The plugin brings content *in*, but it never pushes local changes, edits, or deletions back to Are.na. This boundary is deliberate: it prevents accidental data loss on either side and keeps the mental model simple — import, then curate locally without side effects.

- **Why this matters:** Two-way sync introduces merge conflicts, deletion cascades, and unexpected overwrites. One-way import eliminates an entire class of bugs and anxieties.
- **What this means in practice:** Features that sync Obsidian changes back to Are.na are out of scope unless the project explicitly changes direction via an ADR.
- **Read more:** [ADR-001 — One-Way Import Only](docs/ADRs/ADR-001-one-way-import-only.md)

---

## 2. Deterministic

**Same input, same output. Every time.**

Tetromino is built for predictability and auditability. If you run an import today and run it again tomorrow with unchanged channel data, you get identical Markdown files. We achieve this through stable sorting, SHA-256 content hashing, and the absence of non-deterministic metadata (like generation timestamps) inside note bodies.

- **Why this matters:** Determinism lets you trust your vault under version control. It makes diffs meaningful and debugging reproducible.
- **What this means in practice:** We reject features that inject random IDs, unstable ordering, or time-based variance into note content.
- **Read more:** [ADR-003 — Deterministic Output](docs/ADRs/ADR-003-deterministic-output.md)

---

## 3. User-Controlled

**No background jobs. No surprises. You decide when to run.**

Every import is triggered by the user, either manually or through an explicit, opt-in schedule. Background sync exists only as an optional, disabled-by-default convenience. The plugin never phones home, never auto-deletes your notes, and never modifies files while you are not looking.

- **Why this matters:** Users should never wonder "what just changed in my vault?" Control breeds trust.
- **What this means in practice:** Auto-magic features that silently reorganize files or delete stale content are antithetical to Tetromino. Any automation must be transparent, previewable, and easy to disable.

---

## 4. Open Source

**Transparent, community-driven, and freely available.**

Tetromino is licensed under MIT. Our roadmap, decision records, issue triage, and release process are all public. We welcome contributions of code, documentation, bug reports, and ideas — and we credit the people who give them.

- **Why this matters:** Open source keeps the project honest. Users can inspect what the plugin does, suggest improvements, and fork it if their needs diverge.
- **What this means in practice:** We document major decisions in ADRs, publish a public roadmap, and prioritize community feedback through GitHub Discussions and an annual survey.
- **Read more:** [CONTRIBUTING.md](CONTRIBUTING.md) | [COMMUNITY_SURVEY.md](docs/COMMUNITY_SURVEY.md)

---

## 5. Respects Users' Time

**Fast, reliable, and minimal configuration.**

Tetromino should work well out of the box. Sensible defaults mean you can install the plugin, add an API token, and import within minutes. Advanced customization — templates, attachment migration, enrichment toggles — is available but never required.

- **Why this matters:** A tool that demands hours of setup before delivering value is a tool that goes unused.
- **What this means in practice:** We favor convention over configuration. New settings are added only when they solve a real, recurring problem, and they always ship with sensible defaults.

---

## Using This Philosophy

When evaluating a bug report, feature request, or pull request, ask:

1. **Does it respect vault autonomy?** Will it ever write something the user did not explicitly ask for?
2. **Does it preserve determinism?** Will the same inputs always produce the same outputs?
3. **Does it keep the user in control?** Is there a clear on/off switch, and is the default the safest option?
4. **Is it transparent?** Can a non-expert understand what changed and why?
5. **Does it save time without adding complexity?** Is the benefit worth the cognitive overhead?

If the answer to any of these is "no," the change needs more design work or may belong in a fork rather than core Tetromino.

---

## Related Documents

- [ADR-001 — One-Way Import Only](docs/ADRs/ADR-001-one-way-import-only.md)
- [ADR-003 — Deterministic Output](docs/ADRs/ADR-003-deterministic-output.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [ROADMAP.md](ROADMAP.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

---

*These values are not immutable — they evolve with the project. If you believe a principle should change, open a discussion in GitHub Discussions and make your case.*

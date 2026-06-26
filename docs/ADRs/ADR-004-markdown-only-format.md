---
type: decision
title: ADR-004 — Markdown-Only Format
created: 2026-06-26
tags:
  - adr
  - architecture
  - output-format
related:
  - '[[DEVELOPER_GUIDE]]'
  - '[[USER_GUIDE]]'
  - '[[ADR-003]]'
---

# ADR-004: Markdown-Only Format

## Status

Accepted

## Context

Are.na blocks can contain rich content: formatted text, images with captions, embedded links, and HTML descriptions. When importing into Obsidian, Tetromino must choose a representation format. Options included:

1. **Plain Markdown** — Obsidian's native format.
2. **Rich HTML** — Preserve Are.na's HTML `content_html` and `description_html` fields.
3. **Hybrid** — Markdown with inline HTML where needed.
4. **Proprietary JSON / Dataview** — Store raw block data for dynamic rendering.

## Decision

Tetromino outputs **plain Markdown only**. No HTML passthrough, no proprietary formats, no dynamic data structures. The optional **Template Engine** allows users to customize Markdown output within this constraint.

## Rationale

1. **Obsidian is Markdown-first.**
   Obsidian's core editing, linking, search, and graph features are built around Markdown. Notes that rely on HTML or special formats degrade in portability and tooling compatibility.

2. **Security and sanitization.**
   Are.na HTML can contain arbitrary markup. Passing it through unchanged would require a robust HTML sanitizer to prevent XSS or malicious content in the vault. Even sanitized HTML may not render consistently across Obsidian themes and plugins. By generating Markdown from structured data, Tetromino controls exactly what goes into each note.

3. **Determinism and diffability.**
   Markdown is line-oriented and human-readable, making diffs meaningful. HTML minification, attribute ordering, and entity encoding differences would produce noisy, unreadable diffs in both the Sync Summary modal and external version control.

4. **Future-proofing and portability.**
   Markdown is a universal standard. Users can move their vault to any other tool (GitHub, Jekyll, Hugo, etc.) without conversion. HTML-in-Markdown or JSON formats would lock users into specific tooling.

5. **Template engine flexibility.**
   Users who want custom output can use the Handlebars-like template system to rearrange frontmatter, sections, and links — all within Markdown. This provides customization without escaping the format boundary.

## Consequences

### Positive

- Notes work out of the box with every Obsidian feature: backlinks, graph view, search, and plugins.
- No security surface from unsanitized HTML.
- Clean, readable diffs in the Sync Summary modal and in Git.
- Vault remains portable to any Markdown-compatible tool.

### Negative

- Rich formatting from Are.na (colored text, complex layouts, embedded iframes) is lost or simplified.
- Users who want pixel-perfect reproduction of Are.na content will be disappointed.
- Some Are.na block types (e.g., complex media embeds) can only be represented as simple links or placeholders in Markdown.

## Implementation Notes

- `src/utils.ts` (`blockToMarkdown()`) is the single rendering function for all block types. It produces Markdown strings with optional YAML frontmatter.
- The legacy hardcoded renderer and the template engine renderer both emit Markdown. The template engine (`src/templateUtils.ts`) passes the final rendered string through `sanitizeMarkdownContent()` to neutralize any dangerous content that might slip through user templates.
- HTML descriptions from Are.na are intentionally **not** imported. Only the plain-text `description` field is used.

## Related Decisions

- [[ADR-003]] — Deterministic output (Markdown is far easier to render deterministically than HTML).
- [[ADR-001]] — One-way import only (if we were bidirectional, format mismatches between HTML and Markdown would be even more painful).

---

*Last updated: 2026-06-26*

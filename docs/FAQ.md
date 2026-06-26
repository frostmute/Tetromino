---
type: reference
title: Tetromino FAQ
created: 2026-06-26
tags:
  - faq
  - support
  - users
related:
  - '[[USER_GUIDE]]'
  - '[[SETTINGS_REFERENCE]]'
  - '[[TROUBLESHOOTING]]'
  - '[[DEVELOPER_GUIDE]]'
  - '[[ADR-001]]'
  - '[[ADR-002]]'
---

# Tetromino — Frequently Asked Questions

Quick answers to the most common questions about Tetromino's behavior, security, and limitations.

---

## Table of Contents

1. [Why is import manual and not automatic?](#why-is-import-manual-and-not-automatic)
2. [Can Tetromino sync changes back to Are.na?](#can-tetromino-sync-changes-back-to-arena)
3. [What happens if I delete a note imported by Tetromino?](#what-happens-if-i-delete-a-note-imported-by-tetromino)
4. [How do I update settings without re-importing all channels?](#how-do-i-update-settings-without-re-importing-all-channels)
5. [What Are.na content is supported (images, videos, links, etc.)?](#what-arena-content-is-supported-images-videos-links-etc)
6. [How do I troubleshoot import failures?](#how-do-i-troubleshoot-import-failures)
7. [Can I use Tetromino offline?](#can-i-use-tetromino-offline)
8. [Is my Are.na token secure?](#is-my-arena-token-secure)

---

## Why is import manual and not automatic?

Tetromino is **manual by default** so you remain in full control of when your vault changes. Obsidian is a local-first, user-controlled environment, and unexpected background modifications can be disruptive while you are writing or reviewing notes.

Manual imports also:

- **Preserve rate-limit budget:** Are.na's API limits are respected because imports happen only when you intentionally trigger them, not via constant background polling.
- **Enable the dry-run workflow:** You can preview exactly what will change before committing, which would be meaningless if imports happened automatically.
- **Avoid hidden network and battery usage:** No background timers or webhooks means Tetromino is idle when you are not importing.

If you do want automation, you can opt in:

- **Sync on startup** — runs once when Obsidian loads.
- **Sync interval** — runs on a repeating timer (e.g., every 30 minutes).

Both are disabled by default. See [[ADR-002]] for the full architectural rationale.

---

## Can Tetromino sync changes back to Are.na?

**No.** Tetromino is a **one-way importer only**: Are.na → Obsidian. Any edits you make to imported notes inside your vault are never pushed back to Are.na.

This is an intentional design choice. Are.na is the source of truth; Obsidian is the destination. Two-way sync would introduce complex conflict-resolution logic, risk overwriting Are.na content, and violate the principle of deterministic, predictable output.

If you need to preserve changes made in Obsidian, keep them in a separate note or use Obsidian's note-linking features to reference the imported block without modifying it. See [[ADR-001]] for the detailed decision record.

---

## What happens if I delete a note imported by Tetromino?

The note is removed from your vault, but **Tetromino does not track local deletions**. The next time you run an import, the note will be **recreated** if the block still exists on Are.na.

If you want to stop a block from being re-imported, you have two options:

1. **Remove the block from Are.na** (if you no longer want it anywhere).
2. **Exclude the block class** in Tetromino settings (e.g., add `Image` to **Exclude block classes** if you no longer want image blocks imported).

There is no "delete and remember" feature because Tetromino does not maintain a local deletion ledger. See [[ADR-001]] for why auto-deletion was also rejected.

---

## How do I update settings without re-importing all channels?

Simply change the setting and run **"Import all channels now"** again. Tetromino compares the planned Markdown output against the existing file content using a content hash. Only files whose rendered output actually changes are rewritten; the rest are skipped.

This means:

- Switching a toggle that does not affect output (e.g., notification settings) results in zero file changes.
- Changing a template or attachment-handling setting updates only the affected notes.
- Large channels with no changes are skipped almost instantly.

You can verify this behavior by running **"Preview import (dry-run)"** first. The Sync Summary modal will show exactly which notes would be updated, created, or skipped.

---

## What Are.na content is supported (images, videos, links, etc.)?

Tetromino supports all standard Are.na block classes:

| Block Class | Behavior |
|-------------|----------|
| **Text** | Rendered as Markdown (Are.na's text is converted to Markdown where possible). |
| **Image** | Rendered according to the **Image handling** setting: download to vault, embed via URL, or external link. |
| **Link** | Rendered as a Markdown link. The source URL is preserved and also stored in frontmatter. |
| **Media** | Treated similarly to attachments; rendered based on **Attachment handling** settings. |
| **Attachment** | Downloaded or linked based on **Attachment handling** (e.g., PDFs, audio files). |
| **Channel** | Rendered as a channel block with a link to the Are.na channel. Optional preview image can be inserted. |

All block types receive metadata in YAML frontmatter (ID, class, URL, etc.) unless **Add frontmatter** is disabled.

You can optionally skip specific block classes using the **Exclude block classes** setting (comma-separated list, e.g., `Image, Media`).

---

## How do I troubleshoot import failures?

Follow this checklist:

1. **Enable Debug logging** in Tetromino settings.
2. Open the **Obsidian Developer Console** (`Cmd/Ctrl + Shift + I`).
3. Run the import again and watch for `[arena-sync]` log lines.
4. Check the **Sync Summary** modal for per-channel or per-block errors.
5. Review `Are.na/import-history.md` in your vault for a timestamped log of past imports.

Common failure patterns:

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `401 Unauthorized` | Invalid or expired Are.na token | Re-generate your token and click **Verify** in settings. |
| `404 Not Found` | Channel does not exist or is private | Check the slug and ensure your token has access. |
| `429 Too Many Requests` | Are.na rate limiting | Wait a moment and retry; Tetromino backs off automatically. |
| Network timeout | Poor connection or large channel | Try again later or start with a smaller channel. |
| Vault permission denied | Path is outside vault or folder is read-only | Ensure the target folder is inside your vault and writable. |
| Template render error | Invalid custom template syntax | Disable the **Template engine** temporarily to confirm, then fix syntax. |

For a deeper guide, see [[TROUBLESHOOTING]].

---

## Can I use Tetromino offline?

**No.** Tetromino requires an active internet connection to fetch channel metadata, block contents, and attachments from the Are.na API. There is no local cache of Are.na data that persists across sessions.

Once files are imported, the resulting Markdown notes and downloaded attachments live entirely in your vault and are available offline. However, you cannot run new imports or updates without connectivity.

---

## Is my Are.na token secure?

Yes, within the constraints of Obsidian's plugin architecture:

- **Masked in the UI:** The token field is a password input, so it is hidden from shoulder-surfing.
- **Stored locally:** It is saved in Obsidian's plugin data (`data.json`), not as a plain-text note inside your vault.
- **No telemetry:** Tetromino collects no analytics and makes no requests outside of the Are.na API and the direct file URLs required for downloading attachments.
- **Never logged:** The token is redacted from debug logs and console output.

**Best practices:**

- Do not commit `data.json` to version control.
- Back up `data.json` securely if you back up your vault; the file contains your token.
- If you suspect a token is compromised, revoke it at <https://www.are.na/developers/personal-access-tokens> and generate a new one.

For full security practices, see [SECURITY.md](../SECURITY.md).

---

## Still Have Questions?

If your question is not answered here:

- **Ask in [GitHub Discussions](https://github.com/frostmute/Tetromino/discussions/categories/q-and-a)** — The Questions & Help category is monitored by maintainers and the community.
- **Check the [Troubleshooting Guide](TROUBLESHOOTING.md)** — For error messages, common failures, and how to collect logs.
- **Review the [User Guide](USER_GUIDE.md)** — For step-by-step walkthroughs and feature deep-dives.

Popular discussion topics are periodically summarized and added to this FAQ. If you find a question being asked repeatedly, feel free to open a PR adding it to this document.

---

## Related Documentation

- [[USER_GUIDE]] — Step-by-step walkthroughs and feature overview.
- [[SETTINGS_REFERENCE]] — Every setting explained with defaults and examples.
- [[TROUBLESHOOTING]] — Common errors, solutions, and how to collect logs.
- [[DEVELOPER_GUIDE]] — Architecture, module guide, and contribution workflow.
- [[ADR-001]] — Why Tetromino is one-way import only.
- [[ADR-002]] — Why imports are manual by default.

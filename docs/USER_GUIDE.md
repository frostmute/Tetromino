---
type: reference
title: Tetromino User Guide
created: 2026-06-26
tags:
  - user-guide
  - documentation
related:
  - '[[README]]'
  - '[[SETTINGS_REFERENCE]]'
  - '[[TROUBLESHOOTING]]'
  - '[[FAQ]]'
---

# Tetromino User Guide

Welcome to Tetromino — a deterministic, one-way importer that brings your Are.na channels, blocks, and attachments into Obsidian as stable Markdown notes.

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [First Import Walkthrough](#first-import-walkthrough)
4. [Dry-Run Preview](#dry-run-preview)
5. [Settings Reference](#settings-reference)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## Overview

### What Tetromino Does

- **Imports Are.na channels** into mapped Obsidian vault folders as Markdown notes.
- **Handles all block types**: text, images, links, attachments, media, and channels.
- **Paginates automatically**: large channels with thousands of blocks are fully imported, not truncated to the first 100.
- **Retries transient failures**: if Are.na is rate-limiting or experiencing issues, Tetromino backs off and retries.
- **Produces deterministic output**: the same channel imported twice generates the same Markdown (unless the remote content changed).
- **Supports optional background sync**: you can enable sync-on-startup and periodic auto-import in settings (both are disabled by default).

### What Tetromino Does **Not** Do

- **Two-way sync**: changes you make in Obsidian are **never** pushed back to Are.na.
- **Auto-deletion**: if a block is removed from Are.na, Tetromino **will not** delete the local note.
- **Real-time sync**: imports are triggered manually or on a schedule, not instantly when Are.na changes.
- **Offline operation**: Tetromino requires an internet connection to fetch blocks from Are.na.

---

## Installation

### From Obsidian Community Plugins (Recommended)

1. Open **Settings** → **Community Plugins** in Obsidian.
2. Turn on **Safe Mode** if it is on (you will be prompted to disable it).
3. Click **Browse** and search for **Tetromino**.
4. Click **Install**, then **Enable**.
5. Open **Tetromino Settings** (under Community Plugins) and add your Are.na API token.

### Manual Installation

1. Download the latest release (`main.js`, `manifest.json`, and `styles.css`) from the [Releases page](https://github.com/frostmute/Tetromino/releases).
2. Create a folder named `Tetromino` inside `<your-vault>/.obsidian/plugins/`.
3. Copy the three files into that folder.
4. Restart Obsidian, then enable **Tetromino** under Community Plugins.

---

## First Import Walkthrough

### Step 1: Add Your API Token

1. Generate a personal access token at <https://www.are.na/developers/personal-access-tokens>.
2. In Obsidian, open **Settings** → **Community Plugins** → **Tetromino**.
3. Paste your token into the **API token** field.
4. Click **Verify** to confirm the token is valid.

### Step 2: Create a Channel Mapping

A mapping tells Tetromino which Are.na channel goes into which vault folder.

1. In **Tetromino Settings**, scroll to **Channel mappings**.
2. Click **+ Add mapping**.
3. Enter the **Are.na channel slug** (the part of the URL after `/channel/`).
   - Example: for `https://www.are.na/channel/design-inspiration`, the slug is `design-inspiration`.
4. Optionally set a **custom vault folder**.
   - If left blank, the default is `Are.na/<channel-slug>`.
5. Ensure the **enabled toggle** is on.

**Tip:** If you have many channels, click **Import my channels** under **Channel management** to bulk-create mappings from your Are.na account. New mappings will be created in the `Are.na/<slug>` folders by default.

### Step 3: Run Your First Import

1. Open the **Command Palette** (`Cmd/Ctrl + P`).
2. Run **"Import all channels now"**.
3. Watch the status bar at the bottom of Obsidian for progress updates.
4. When finished, a **Sync Summary** modal appears showing:
   - how many notes were created, updated, or skipped
   - per-file diffs for changed notes
   - any errors that occurred

You can also run **"Import current channel"** while viewing a note inside a mapped folder to import only that channel.

---

## Dry-Run Preview

Before committing changes to your vault, you can preview exactly what Tetromino plans to do.

### How to Run a Dry-Run

1. Open the **Command Palette**.
2. Run **"Preview import (dry-run)"** (or **"Preview current channel import (dry-run)"** for a single channel).
3. The **Sync Summary** modal opens showing:
   - planned creations, updates, moves, and deletions
   - side-by-side diffs for files that would change
   - a banner at the top confirming this was a preview

**Important:** A dry-run does **not** write, move, or delete any files in your vault. It is safe to run at any time.

### When to Use Dry-Run

- Before changing settings that affect output (e.g., switching template engines).
- After adding a new channel mapping to verify the folder and note names look correct.
- Before enabling **Sync on startup** or a **Sync interval**, so you understand the baseline state.

---

## Settings Reference

### Authentication

| Setting | Description |
|---------|-------------|
| **API token** | Your Are.na personal access token. Stored in Obsidian plugin data. |
| **Verify** | Button to validate the token against the Are.na API. |

### Content Rendering

| Setting | Default | Description |
|---------|---------|-------------|
| **Block file naming** | `Block title` | How imported block notes are named. Options: `Block title`, `Block ID`, `Title (ID)`. |
| **Banner frontmatter field** | Off | Adds a banner URL to frontmatter for the [Banners plugin](https://github.com/noatpad/obsidian-banners). |
| **Banner field name** | `banner` | The YAML key used for the banner field. |
| **Banner image source priority** | `Thumb first` | Whether to use the thumbnail or display image first. |
| **Block description in frontmatter** | Off | Adds `arena_description` to frontmatter when a block has a description. |
| **Import block comments** | Off | Imports Are.na block comments into a `Comments` section inside each note. |
| **Import connected channels** | Off | Adds a section listing other channels where the block appears. |
| **Channel block preview image** | Off | For blocks that are themselves channels, inserts a best-effort preview image link. |
| **Channel index note naming** | `index.md` | Filename for the channel index note. Choose `index.md` (Folder Note style) or `match folder name`. |
| **Image handling** | `Download to vault` | How image blocks are rendered: `Download`, `Embed` (Obsidian embed), or `Link` (external URL). |
| **Attachment handling** | `Download to vault` | How non-image attachments (PDFs, etc.) are rendered: `Download` or `Link`. |
| **Downloaded attachment render** | `Link` | Whether downloaded files appear as `![[embed]]` or `[link]` in notes. |
| **Attachment storage location** | `Global folder` | Where downloaded files are stored: `With channel notes`, `Global folder`, or `Custom folder`. |
| **Global attachment folder** | `Are.na/Attachments` | Path used when storage location is `Global folder`. |
| **Custom attachment folder** | *(empty)* | Path used when storage location is `Custom folder`. |
| **Add frontmatter** | On | Include Are.na metadata (ID, class, URL, etc.) in YAML frontmatter. |
| **Exclude block classes** | *(empty)* | Comma-separated list of block classes to skip (e.g., `Image, Media`). |

### Notifications and Logging

| Setting | Default | Description |
|---------|---------|-------------|
| **Sync on startup** | Off | Automatically import when Obsidian launches. |
| **Sync interval (minutes)** | `30` | Repeating auto-import schedule. Set to `0` to disable. |
| **Show notifications** | On | Show toast notices for import progress and completion. |
| **Debug logging** | Off | Write detailed logs to the Obsidian Developer Console. |

### Channel Management

| Setting | Description |
|---------|-------------|
| **Auto-enable imported channels** | New mappings from **Import my channels** are enabled by default. |
| **Import my channels** | Bulk-create mappings for every channel in your Are.na account. |
| **Backup channel mappings** | Save current mappings to a timestamped JSON file in `Are.na/channel-mapping-backups/`. |
| **Restore latest backup** | Replace current mappings with the most recent backup. |
| **Restore from file...** | Pick a specific historical backup file to restore. |
| **Reset channel mappings** | Remove all mappings. Use with caution — back up first. |

### Per-Channel Overrides

Each mapping can override the global attachment storage strategy:

- **Attachment storage override**: `Inherit global setting`, `With channel notes`, `Global folder`, or `Custom folder`.
- **Channel custom attachment folder**: Overrides the global custom folder path for that channel.

---

## Troubleshooting

### Invalid API Token

- Re-generate your token at <https://www.are.na/developers/personal-access-tokens>.
- Ensure the token includes **read** access.
- Paste it into settings and click **Verify**.

### Slow Imports or Timeouts

- Large channels (1000+ blocks) can take several minutes due to Are.na rate limits and pagination.
- Enable **Debug logging** and open the Developer Console (`Cmd/Ctrl + Shift + I`) to watch progress.
- Start with a smaller channel to verify your setup before importing large collections.

### Notes Are Not Updating

- Confirm the channel mapping is **enabled** in settings.
- Run **"Import all channels now"** manually.
- Check that the channel is public, or that your token has access to private channels.

### Assets Are Not Downloading

- Set **Image handling** and **Attachment handling** to `Download to vault`.
- Confirm the destination folder exists and is writable.
- Ensure you have enough disk space.

### Fewer Blocks Than Expected

- Check that the mapping is enabled.
- Verify the channel is public (or your token can see it).
- Enable debug logging to inspect pagination progress.
- Check **Exclude block classes** — you may have filtered out certain block types.

### Sync Summary Shows Errors

- Open the Developer Console to see full error details.
- Common API errors:
  - `401 Unauthorized` — invalid or expired token.
  - `404 Not Found` — channel does not exist or is private.
  - `429 Too Many Requests` — Tetromino will retry with backoff, but extremely large imports may need to be run again later.

---

## FAQ

### Is Tetromino a two-way sync?

**No.** Tetromino is a one-way importer: **Are.na → Obsidian** only. Changes you make in Obsidian are never pushed back to Are.na.

### Can I set up automatic importing?

**Yes, optionally.** By default, imports are manual. You can enable:
- **Sync on startup** to import when Obsidian opens.
- **Sync interval** to run imports on a repeating schedule (e.g., every 30 minutes).

Both are disabled by default so you remain in full control.

### What happens if I delete a note imported by Tetromino?

The note is removed from your vault. The next import will **recreate it** if the block still exists on Are.na, because Tetromino does not track local deletions.

### How do I update settings without re-importing all channels?

Simply change the setting and run **"Import all channels now"** again. Tetromino compares planned output against existing files and only updates notes where the content actually changes.

### What Are.na content types are supported?

- Text blocks
- Image blocks
- Link blocks
- Media / attachment blocks (PDFs, etc.)
- Channel blocks (blocks that are themselves channels)

### How do I troubleshoot import failures?

1. Enable **Debug logging** in settings.
2. Open the Obsidian Developer Console (`Cmd/Ctrl + Shift + I`).
3. Run the import again and inspect the console output.
4. Check the `Are.na/import-history.md` file in your vault for a timestamped log of past imports.

### Can I use Tetromino offline?

**No.** Tetromino requires an active internet connection to fetch data from the Are.na API.

### Is my Are.na token secure?

- Tokens are masked in the UI (password field).
- They are stored in Obsidian's plugin data, not in plain text inside your vault.
- Tetromino collects no telemetry and makes no requests outside of the Are.na API and direct file URLs required for downloads.

### What is the Template Engine?

Tetromino includes an optional custom template system that lets you control the exact Markdown output for each block using Handlebars-like syntax:

```handlebars
---
title: "{{title}}"
arena_id: {{id}}
---

# {{title}}

{{#if image}}![{{title}}]({{image}}){{/if}}

{{content}}
```

Available variables include: `title`, `id`, `class`, `content`, `description`, `image`, `arena_url`, `source_url`, `channel_title`, `channel_slug`, `comments`, `connected_channels`.

Enable it in settings under **Content rendering** → **Template engine**.

---

## Next Steps

- Explore the [Settings Reference](SETTINGS_REFERENCE.md) for detailed configuration options.
- Visit the [Troubleshooting Guide](TROUBLESHOOTING.md) for deeper debugging help.
- Read the [FAQ](FAQ.md) for additional questions.
- See [CONTRIBUTING.md](../CONTRIBUTING.md) if you want to contribute to Tetromino.

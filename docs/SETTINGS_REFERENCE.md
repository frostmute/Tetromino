---
type: reference
title: Tetromino Settings Reference
created: 2026-06-26
tags:
  - settings
  - configuration
  - reference
related:
  - '[[USER_GUIDE]]'
  - '[[DEVELOPER_GUIDE]]'
  - '[[FAQ]]'
  - '[[TROUBLESHOOTING]]'
---

# Tetromino Settings Reference

This document describes every setting available in Tetromino, including default values, allowed values, and examples. Use it alongside the [[USER_GUIDE]] for setup help and the [[FAQ]] for common questions.

---

## Table of Contents

1. [How Settings Are Stored](#how-settings-are-stored)
2. [Authentication](#authentication)
3. [Content Rendering](#content-rendering)
4. [Notifications and Logging](#notifications-and-logging)
5. [Channel Management](#channel-management)
6. [Channel Mappings](#channel-mappings)
7. [Attachment Migration](#attachment-migration)
8. [Advanced: Custom Templates](#advanced-custom-templates)
9. [Backup and Restoration](#backup-and-restoration)
10. [Settings Migration Between Versions](#settings-migration-between-versions)

---

## How Settings Are Stored

Tetromino stores all settings in **Obsidian's plugin data store** (`data.json` inside `<vault>/.obsidian/plugins/Tetromino/`). This file is managed by Obsidian's `Plugin.loadData()` / `Plugin.saveData()` API and is **not** meant to be edited by hand.

Channel mappings, sync records, and your API token live in the same data blob. You can back up and restore channel mappings independently using the built-in backup buttons (see [Backup and Restoration](#backup-and-restoration)).

> **Security note:** Your Are.na token is stored locally in Obsidian's plugin data. It is never transmitted outside the Are.na API and is masked in the UI.

---

## Authentication

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| **API token** | `string` | `""` | Your Are.na personal access token. Generate one at <https://www.are.na/developers/personal-access-tokens>. |

Click **Verify** in settings to validate the token before running imports.

---

## Content Rendering

These settings control how imported blocks are converted into Markdown notes.

| Setting | Type | Default | Allowed Values | Description |
|---------|------|---------|----------------|-------------|
| **Block file naming** | `string` | `"title"` | `title`, `id`, `title-id` | Filename format for imported block notes. `title` = block title; `id` = numeric ID; `title-id` = both. |
| **Banner frontmatter field** | `boolean` | `false` | `true` / `false` | Adds a banner URL to YAML frontmatter for compatibility with the [Banners plugin](https://github.com/noatpad/obsidian-banners). |
| **Banner field name** | `string` | `"banner"` | any string | The YAML key used when banner frontmatter is enabled. |
| **Banner image source priority** | `string` | `"thumb-first"` | `thumb-first`, `display-first` | Which image variant to use first for the banner field. |
| **Block description in frontmatter** | `boolean` | `false` | `true` / `false` | Adds `arena_description` to frontmatter when a block has a description. |
| **Import block comments** | `boolean` | `false` | `true` / `false` | Imports Are.na block comments into a `Comments` section inside each note. |
| **Import connected channels** | `boolean` | `false` | `true` / `false` | Adds a section listing other channels where the block appears. |
| **Channel block preview image** | `boolean` | `false` | `true` / `false` | For blocks that are themselves channels, inserts a best-effort preview image link. |
| **Channel index note naming** | `string` | `"index"` | `index`, `folder-name` | Filename for the channel index note. `index` = `index.md` (Folder Note style); `folder-name` = matches the folder name. |
| **Image handling** | `string` | `"download"` | `download`, `embed`, `link` | How image blocks are rendered: download to vault, embed via URL, or external link. |
| **Attachment handling** | `string` | `"download"` | `download`, `link` | How non-image attachments (PDFs, etc.) are rendered. |
| **Downloaded attachment render** | `string` | `"link"` | `link`, `embed` | Whether downloaded attachments appear as `[[link]]` or `![[embed]]` in notes. |
| **Attachment storage location** | `string` | `"global"` | `channel`, `global`, `custom` | Where downloaded files are stored: with channel notes, a global folder, or a custom folder. |
| **Global attachment folder** | `string` | `"Are.na/Attachments"` | any path | Path used when **Attachment storage location** is `global`. |
| **Custom attachment folder** | `string` | `""` | any path | Path used when **Attachment storage location** is `custom`. |
| **Add frontmatter** | `boolean` | `true` | `true` / `false` | Include Are.na metadata (ID, class, URL, etc.) in YAML frontmatter. |
| **Exclude block classes** | `string[]` | `[]` | comma-separated in UI | Block classes to skip during import (e.g., `Image, Media`). |
| **Template engine** | `boolean` | `false` | `true` / `false` | *(Advanced)* Enables the custom template engine (see [Advanced: Custom Templates](#advanced-custom-templates)). |
| **Template string** | `string` | see below | valid template | The Handlebars-like template used when the template engine is enabled. |

### Default Template String

When **Template engine** is enabled and no custom string is set, Tetromino uses this default:

```handlebars
---
title: "{{title}}"
arena_id: {{id}}
arena_class: {{class}}
arena_url: "{{arena_url}}"
{{#if description}}description: "{{description}}"{{/if}}
---

# {{title}}

{{#if image}}![{{title}}]({{image}}){{/if}}

{{content}}

{{#if description}}
## Description
{{description}}
{{/if}}
```

---

## Notifications and Logging

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| **Sync on startup** | `boolean` | `false` | Automatically import when Obsidian launches. |
| **Sync interval (minutes)** | `number` | `30` | Repeating auto-import schedule. Set to `0` to disable. |
| **Show notifications** | `boolean` | `true` | Show toast notices for import progress and completion. |
| **Debug logging** | `boolean` | `false` | Write detailed logs to the Obsidian Developer Console (`Cmd/Ctrl + Shift + I`). |

---

## Channel Management

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| **Auto-enable imported channels** | `boolean` | `true` | New mappings created by **Import my channels** are enabled by default. |

### Actions (Buttons in Settings)

| Action | Description |
|--------|-------------|
| **Import my channels** | Fetches every channel in your Are.na account and creates missing mappings (default folder: `Are.na/<slug>`). |
| **Backup channel mappings** | Saves current mappings to a timestamped JSON file in `Are.na/channel-mapping-backups/`. |
| **Restore latest backup** | Replaces current mappings with the most recent backup file. |
| **Restore from file...** | Lets you pick a specific backup file to restore. |
| **Reset channel mappings** | Removes **all** mappings. This is destructive — create a backup first. |

---

## Channel Mappings

Each mapping links one Are.na channel to one vault folder. Mappings are stored in the `channelMappings` array.

### Mapping Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `channelSlug` | `string` | `""` | The Are.na channel slug (the part of the URL after `/channel/`). **Required.** |
| `channelId` | `number` | `0` | Internal Are.na channel ID. Populated automatically during import. |
| `channelTitle` | `string` | `""` | The channel title. Populated automatically during import. |
| `localFolder` | `string` | `""` | Vault folder path for imported notes. If empty, defaults to `Are.na/<channelSlug>`. |
| `lastSyncedAt` | `string \| null` | `null` | ISO timestamp of the last successful import for this mapping. |
| `enabled` | `boolean` | `true` | Whether this channel is included in imports. |
| `attachmentStorageOverride` | `"channel" \| "global" \| "custom" \| null` | `null` | Per-channel override for **Attachment storage location**. `null` = inherit global setting. |
| `customAttachmentFolderOverride` | `string` | `""` | Per-channel override for the custom attachment folder. Only used when override is `custom`. |
| `lastAttachmentBase` | `string \| null` | `null` | Internal snapshot of the last attachment base path. Used by the migration engine to detect storage strategy changes. |

### Example: Setting Up a Real Channel Mapping

Suppose you have an Are.na channel at `https://www.are.na/channel/design-inspiration`.

1. In **Tetromino Settings**, scroll to **Channel mappings**.
2. Click **+ Add mapping**.
3. Enter the slug: `design-inspiration`.
4. Leave **Local folder** blank to use the default `Are.na/design-inspiration`.
5. Ensure the toggle is **enabled**.
6. (Optional) Set **Attachment storage override** to `Global folder` if you want all attachments in one place.

After saving, run **"Import all channels now"** from the Command Palette.

### Per-Channel Attachment Override Example

If you want most channels to store attachments in `Are.na/Attachments` but one channel to keep its files locally:

- Global **Attachment storage location**: `Global folder`
- For the specific mapping, set **Attachment storage override**: `With channel notes`

---

## Attachment Migration

When you change **Attachment storage location** or **Global attachment folder**, existing downloaded files may need to move. Tetromino detects these changes and offers migration.

| Action | Description |
|--------|-------------|
| **Preview migration** | Runs a dry-run showing which files would move and which notes would update. |
| **Run migration** | Executes the move and rewrites embeds/links in affected notes. |

Migration logs are written to `Are.na/migration-history.md`.

---

## Advanced: Custom Templates

The template engine lets you control the exact Markdown output for every block using a Handlebars-like syntax.

### Enabling Templates

Templates are configured via the plugin data store (`data.json`). Set `templateEnabled: true` and provide a `templateString`. The default template string is shown in [Content Rendering](#content-rendering).

> **UI note:** Template settings are not yet exposed in the Settings tab UI. Advanced users can enable them by editing `<vault>/.obsidian/plugins/Tetromino/data.json` while Obsidian is closed, or by using a community snippet that modifies plugin settings.

### Available Template Variables

| Variable | Type | Description |
|----------|------|-------------|
| `{{id}}` | `number` | Are.na block ID. |
| `{{title}}` | `string` | Block title (falls back to `Block {id}`). |
| `{{class}}` | `string` | Block class (`Text`, `Image`, `Link`, `Media`, `Attachment`, `Channel`). |
| `{{content}}` | `string` | Rendered Markdown content for the block (link, embed, text, etc.). |
| `{{description}}` | `string` | Block description (empty string if none). |
| `{{image}}` | `string` | Image path or URL, depending on **Image handling** setting. |
| `{{arena_url}}` | `string` | URL to the block on Are.na. |
| `{{source_url}}` | `string` | Original source URL (for Link/Media blocks). |
| `{{channel_title}}` | `string` | Title of the channel being imported. |
| `{{channel_slug}}` | `string` | Slug of the channel being imported. |
| `{{comments}}` | `array` | Array of comment objects (use with `{{#each comments}}`). |
| `{{connected_channels}}` | `array` | Array of connected channel objects (use with `{{#each connected_channels}}`). |
| `{{created_at}}` | `string` | ISO timestamp of block creation. |
| `{{updated_at}}` | `string` | ISO timestamp of last block update. |

### Template Syntax

- **Variables:** `{{variableName}}`
- **Conditionals:** `{{#if variable}}...{{/if}}` or `{{#if variable}}...{{else}}...{{/if}}`
- **Loops:** `{{#each arrayVar}}...{{/each}}`

### Template Example

```handlebars
---
title: "{{title}}"
arena_id: {{id}}
source: "{{source_url}}"
{{#if description}}description: "{{description}}"{{/if}}
---

# {{title}}

{{#if image}}![{{title}}]({{image}}){{/if}}

{{content}}

{{#if connected_channels}}
## Also appears in
{{#each connected_channels}}
- {{title}}
{{/each}}
{{/if}}
```

> **Tip:** The rendered output is sanitized for security. Active code blocks (e.g., `dataviewjs`, `templater`) are neutralized to prevent accidental execution.

---

## Backup and Restoration

### Backing Up Settings

Tetromino does not back up the entire `data.json` automatically, but it **does** back up channel mappings:

1. Open **Tetromino Settings**.
2. Under **Channel management**, click **Backup channel mappings**.
3. A JSON file is created in `Are.na/channel-mapping-backups/mappings-<timestamp>.json`.

The backup file contains:

```json
{
  "createdAt": "2026-06-26T10:00:00.000Z",
  "mappingCount": 3,
  "channelMappings": [ /* ... */ ]
}
```

### Restoring Mappings

- **Restore latest backup:** Replaces current mappings with the most recent file in `Are.na/channel-mapping-backups/`.
- **Restore from file:** Choose a specific backup JSON file anywhere in your vault.

### Full Settings Backup

To back up **all** settings (including templates, toggles, and tokens):

1. Close Obsidian.
2. Copy `<vault>/.obsidian/plugins/Tetromino/data.json` to a safe location.
3. Restart Obsidian.

> **Caution:** `data.json` contains your API token. Store backups securely.

---

## Settings Migration Between Versions

Tetromino includes built-in normalization logic that runs every time settings are loaded. This ensures forward compatibility when new fields are added.

### How Migration Works

- **On load:** `loadSettings()` merges saved data with `DEFAULT_SETTINGS` using `Object.assign`. Missing fields receive their default values automatically.
- **Mapping normalization:** `normalizeMappings()` ensures every mapping has `attachmentStorageOverride`, `customAttachmentFolderOverride`, and `lastAttachmentBase` fields, even if they were created by an older version.
- **Attachment base snapshots:** `ensureAttachmentBaseSnapshots()` computes and stores the current attachment base path for each mapping so that future storage changes can trigger a migration prompt.

### What This Means for Users

- **Upgrading is safe:** Installing a new version of Tetromino will not corrupt existing settings.
- **New fields appear with sensible defaults:** You do not need to manually edit `data.json` after updating.
- **Migration prompts appear automatically:** If a new version changes how attachments are stored, Tetromino will prompt you to preview or run a migration.

### Manual Migration (Rare)

If you need to migrate settings manually (e.g., moving to a new vault):

1. Back up `data.json` from the old vault.
2. Install Tetromino in the new vault.
3. Close Obsidian and copy the backup into `<new-vault>/.obsidian/plugins/Tetromino/data.json`.
4. Restart Obsidian and verify settings in the UI.

---

## Related Documentation

- [[USER_GUIDE]] — Step-by-step walkthroughs and feature overview.
- [[DEVELOPER_GUIDE]] — Architecture, module guide, and contribution workflow.
- [[API_DESIGN]] — Are.na API integration details.
- [[FAQ]] — Common questions.
- [[TROUBLESHOOTING]] — Error reference and debugging steps.

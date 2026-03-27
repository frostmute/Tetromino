# Arena Importer for Obsidian

Bring your Are.na channels into Obsidian as clean, local Markdown notes.

Arena Importer is for people who collect research, references, images, links, and fragments on Are.na, then want to actually work with that material inside their Obsidian vault. It pulls channel content into a predictable folder structure, keeps things readable, and stays out of your way.

> This plugin does **not** sync Are.na and Obsidian.  
> It is a **manual, one-way import tool** that pulls content from Are.na into your vault.

## Why use it?

Are.na is great for collecting. Obsidian is great for thinking.

Arena Importer connects the two by pulling Are.na content into Obsidian as local files you can browse, link, search, and edit.

It is designed to feel at home in an Obsidian workflow:

- **Local-first**: imported content lives in your vault as Markdown files and assets
- **Predictable**: stable paths, stable naming, and explicit import state
- **Manual by design**: nothing runs unless you choose to run it
- **Transparent**: preview changes before writing anything, inspect logs, and review diffs
- **Vault-friendly**: channel notes, block notes, and attachments are organized for navigation and long-term use

## What the plugin does

### Imports Are.na channels into your vault

- Fetches channels from the Are.na API using channel slugs
- Pulls channel contents and normalizes them into Obsidian-friendly data
- Writes channel content as Markdown notes
- Creates channel index notes for easier browsing
- Creates a top-level overview note for all imported channels
- Stores import state in `Are.na/arena-importer.json`

### Keeps your vault structure clean and consistent

The plugin is built around a stable folder layout:

```text
Are.na/
  Channels/
    <channel-slug>/
      index.md
      blocks/
        <block-id> - <title>.md
  Assets/
    <block-id>.<ext>
  index.md
  arena-importer.json
```

Each block note includes structured frontmatter such as:

- Are.na block ID
- block type
- Are.na URL
- channel membership
- created and updated timestamps

### Gives you control over when imports happen

There is no background polling and no surprise automation.

Imports are intentionally user-initiated through Obsidian commands such as:

- **Run Arena Import**
- **Preview Arena Import (Dry Run)**
- **View Last Import Diffs**
- **View Last Arena Import Error**

### Lets you preview changes before writing files

Preview mode runs the fetch, normalization, and change-detection flow without changing your vault.

That means you can check what will be added, updated, moved, renamed, or removed before committing anything.

### Surfaces useful import feedback

After an import or preview, the plugin can show:

- counts for new, updated, renamed, moved, and deleted blocks
- processed channels
- total block count
- import duration

For updated content, the plugin can also store and display a simple unified diff for the most recent import session.

### Handles assets with flexible storage options

Attachments can be stored in one of three modes:

- **Global assets folder**
- **Channel folder**
- **Custom folder**

It also supports **per-channel attachment overrides**, so different channels can follow different storage rules if that fits your vault better.

### Helps with attachment migrations

If you change how attachments are stored, the plugin is designed to help migrate safely.

Migration tooling includes:

- migration preview modal
- file move execution after confirmation
- embed path updates in Markdown files
- migration history log at `Are.na/migration-history.md`
- test migration / dry-run migration preview
- migration progress feedback in the status bar

### Keeps a record of what happened

The plugin includes:

- status bar updates during imports and migration operations
- Obsidian notices for completion and failure states
- a persistent last-error log at `Are.na/import-errors.md`
- an import history log at `Are.na/import-history.md`

## How it fits into an Obsidian workflow

A common pattern looks like this:

1. Save visual references, links, text blocks, and research material in Are.na.
2. Run a manual import in Obsidian.
3. Browse channel index notes and block notes inside your vault.
4. Link imported notes into projects, writing, MOCs, or daily notes.
5. Keep Are.na as the upstream collection space and Obsidian as the place where thinking and writing happen.

## How it works

1. Enter an Are.na API token and one or more channel slugs.
2. The plugin fetches channel metadata and paginated channel contents from the Are.na API.
3. Raw Are.na data is normalized into internal block and channel types.
4. The plugin merges multi-channel block membership where needed.
5. A change-detection step identifies new, updated, renamed, moved, or deleted content.
6. If running a real import, the plugin writes Markdown notes, downloads attachments, updates index notes, updates the master overview, and saves import state.
7. If running a preview, the plugin skips vault writes and returns a summary of what would change.

## Installation

### Install the compiled plugin

1. Download the latest release of the plugin.
2. In your Obsidian vault, open the plugins folder:

```text
<your-vault>/.obsidian/plugins/
```

3. Create a folder for the plugin, for example:

```text
<your-vault>/.obsidian/plugins/arena-importer/
```

4. Copy the compiled plugin files into that folder:

```text
main.js
manifest.json
styles.css
```

Your folder should end up looking like this:

```text
<your-vault>/.obsidian/plugins/arena-importer/
  main.js
  manifest.json
  styles.css
```

5. Open Obsidian.
6. Go to **Settings → Community plugins**.
7. Make sure **Restricted mode** is off.
8. Find **Arena Importer** in your installed community plugins and enable it.

#### First-time setup

After enabling the plugin:

1. Open **Settings → Arena Importer**.
2. Paste in your **Are.na API token**.
3. Add one or more **channel slugs**.
4. Choose how you want attachments stored.
5. Run **Run Arena Import** or **Preview Arena Import (Dry Run)** from the command palette.

### Installing from source

If you are developing the plugin locally:

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

Then place the built plugin in your Obsidian plugins directory.

## Configuration

Open **Settings → Arena Importer** and configure:

- **Are.na API Token**
- **Channel Slugs** as a comma-separated list
- **Attachment Storage**
- **Custom Attachment Path** when custom mode is selected
- **Per-channel attachment overrides**
- **Test Attachment Migration** to preview asset moves without applying them

Example channel slug input:

```text
design-research, visual-systems
```

Example per-channel override input:

```text
design-research=channel
visual-systems=assets
```

## Example outputs

### Channel index note

```md
# Design Research

**Are.na URL:** https://www.are.na/design-research  
**Last Imported:** 2026-03-26

## Blocks
- [[blocks/123456 - Typography Notes]]
- [[blocks/123457 - Bauhaus Reference]]
```

### Block note frontmatter

```yaml
---
arena_id: 123456
arena_type: image
arena_url: https://www.are.na/block/123456
channels:
  - design-research
  - visual-systems
created_at: 2024-01-12
updated_at: 2024-03-01
---
```

### Master overview note

```md
# Arena Import Overview

**Last Imported:** 2026-03-26  
**Total Channels:** 2  
**Total Blocks:** 42

## Channels
- [[Channels/design-research/index]]
- [[Channels/visual-systems/index]]
```

## Design principles

This plugin is built around a few explicit ideas:

### Local-first

Imported content should remain usable as normal vault files.

### Manual, not automatic

You choose when imports happen.

### Deterministic, not magical

File names, paths, import state, and migration behavior are explicit.

### Transparent, not opaque

Previews, summaries, diffs, history logs, and migration logs make changes inspectable.

### One-way by design

This plugin does **not** sync Are.na and Obsidian. It imports from Are.na into Obsidian.

## FAQ

### Does this plugin sync Are.na and Obsidian?

No. This plugin does **not** sync Are.na and Obsidian. It is a one-way importer that pulls content from Are.na into your vault.

### Does it run automatically in the background?

No. Imports are intentionally manual.

### Can I choose where attachments are stored?

Yes. The designed configuration supports a global assets folder, channel-local storage, or a custom folder, with optional per-channel overrides.

### What happens if I change attachment storage rules later?

The plugin is designed to provide migration previews, optional execution, embed updates, and migration logging.

## Development notes
  
The plugin is organized around a few core responsibilities:  
  
- fetching data from the Are.na API  
- normalizing channels and blocks into internal data structures  
- writing Markdown notes and index files into the vault  
- downloading and storing attachments  
- tracking import state  
- detecting changes between runs  
- supporting previews, logs, and migration workflows

### Contributing

Contributions should preserve the plugin’s core design principles:

- no hidden background behavior
- deterministic file output
- transparent user-facing workflows
- minimal surprise in migration and import operations

## License

MIT

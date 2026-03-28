# Are.na Import for Obsidian

Import Are.na channel content into your Obsidian vault as Markdown notes.

This plugin is one-way only: **Are.na -> Obsidian**.

## What it does

- Imports mapped Are.na channels into mapped vault folders
- Creates Markdown files for Are.na blocks
- Updates existing imported files when remote block content changes
- Adds optional YAML frontmatter metadata
- Supports manual import, startup import, and interval-based auto-import
- Supports dry-run preview commands
- Downloads images and non-image attachments (including PDFs) when configured
- Supports attachment storage in channel-local, global, or custom folders
- Writes channel index notes for graph-friendly linking
- Shows page/block progress in the status bar for large channels

## What it does not do

- No push from Obsidian back to Are.na
- No automatic deletion of local files when blocks are removed remotely

## Commands

- `Sync all channels now`
- `Preview import (dry-run)`
- `Sync current channel`
- `Preview current channel import (dry-run)`
- `Open channel on Are.na`

## Settings

- API token with verify action
- Import interval (minutes)
- Import on startup toggle
- Block file naming (`title`, `id`, `title-id`)
- Image handling (`download`, `embed`, `link`)
- Attachment handling (`download`, `link`)
- Downloaded attachment render (`embed`, `link`)
- Attachment storage (`with channel notes`, `global`, `custom`)
- Global and custom attachment folder paths
- Frontmatter toggle
- Notifications toggle
- Debug logging toggle
- Channel mappings (`channel slug` -> `local folder`)

## How import works

1. The plugin reads each enabled channel mapping.
2. It fetches channel metadata and all channel blocks from the Are.na API.
3. Each block is rendered to Markdown and written to the mapped folder.
4. Optional asset downloads are resolved and linked in notes.
5. Existing files are overwritten when remote content changes.
6. Channel index notes are regenerated with links to imported notes.
7. Sync records and last-import timestamps are persisted in plugin data.

## Installation

1. Put `main.js`, `manifest.json`, and `styles.css` in:
   `<your-vault>/.obsidian/plugins/arena-sync/`
2. Enable the plugin in Obsidian Community Plugins.
3. Open plugin settings and add:
	- Are.na API token
	- At least one channel mapping

## Development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Tests:

```bash
npm test
```

Lint:

```bash
npm run lint
```

## License

MIT

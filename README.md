# Are.na Import for Obsidian

Import Are.na channel content into your Obsidian vault as Markdown notes.

This plugin is **one-way import only**: Are.na → Obsidian.

> **Why one-way?** Obsidian is designed for personal knowledge management. Pushing back to Are.na would require conflict resolution, permission handling, and network reliability guarantees. For v1.0, we focused on reliable imports. Push sync may return in v2.0.

## What it does

- Imports mapped Are.na channels into mapped vault folders
- Creates Markdown files for Are.na blocks
- Updates existing imported files when remote block content changes
- Adds optional YAML frontmatter metadata
- Manual import only (no background sync)
- Supports dry-run preview commands
- Downloads images and non-image attachments (including PDFs) when configured
- Supports attachment storage in channel-local, global, or custom folders
- Supports per-channel attachment storage overrides
- Includes attachment migration preview + diff and migration history log
- Writes channel index notes for graph-friendly linking
- Writes a master overview note for all synced channels
- Shows a sync summary modal with diffs for updated files
- Shows page/block progress in the status bar for large channels

## What it does not do

- ❌ Push from Obsidian back to Are.na (one-way import only)
- ❌ Automatic deletion of local files when blocks are removed remotely
- ❌ Background sync (manual only)

## Rate Limiting

Are.na's API allows **120 requests per minute** for authenticated requests. For channels with:
- **< 100 blocks**: Import completes in seconds
- **100–1,000 blocks**: Import takes 1–5 minutes
- **1,000+ blocks**: Import may take 10+ minutes due to pagination

If you encounter rate-limit errors (HTTP 429), the plugin will automatically retry with exponential backoff.

## Commands

- `Import all channels now`
- `Preview import (dry-run)`
- `Import current channel`
- `Preview current channel import (dry-run)`
- `Open channel on Are.na`
- `Preview attachment migration`
- `Run attachment migration`

## Settings

- API token with verify action
- Block file naming (`title`, `id`, `title-id`)
- Image handling (`download`, `embed`, `link`)
- Attachment handling (`download`, `link`)
- Downloaded attachment render (`embed`, `link`)
- Attachment storage (`with channel notes`, `global`, `custom`)
- Per-channel attachment storage override (`inherit`, `channel`, `global`, `custom`)
- Global and custom attachment folder paths
- Frontmatter toggle
- Notifications toggle
- Debug logging toggle
- Channel mappings (`channel slug` -> `local folder`)
- Block class exclusion filter (skip Image, Media, etc.)
- Attachment migration preview + run controls

## How import works

1. The plugin reads each enabled channel mapping.
2. It fetches channel metadata and all channel blocks from the Are.na API.
3. Each block is rendered to Markdown and written to the mapped folder.
4. Optional asset downloads are resolved and linked in notes.
5. Existing files are overwritten when remote content changes.
6. Channel index notes are regenerated with links to imported notes.
7. A master overview note is regenerated with links to each channel index.
8. A sync summary modal is displayed with diffs for updated files.
9. Sync records and last-import timestamps are persisted in plugin data.

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

This produces:

- `main.js` in the repo root
- `dist/<plugin-id>-<version>.zip` containing `main.js`, `manifest.json`, and `styles.css`

Tests:

```bash
npm test
```

Lint:

```bash
npm run lint
```

## Security

- **API tokens** are masked in the settings UI and stored securely in Obsidian's plugin data directory.
- **No telemetry**: This plugin does not collect any usage data.
- **No external requests**: Only Are.na API calls are made (no tracking pixels, analytics, etc.).

See [SECURITY.md](SECURITY.md) for detailed security information.

## Troubleshooting

### Import fails with "Invalid API token"
1. Generate a new token at https://dev.are.na/oauth/applications
2. Paste it in settings and click "Verify"
3. Ensure the token has at least `read` scope

### Import is slow or times out
- Large channels (1,000+ blocks) may take 10+ minutes due to API rate limits
- Check debug logging in settings to see progress
- Try importing smaller channels first

### Files aren't updating
- Manually trigger with Command Palette: `Sync all channels now`
- Check that channel mappings are enabled (toggle in settings)

### Assets aren't downloading
- Images and PDFs only download if "Image handling" or "Attachment handling" is set to "Download to vault"
- Check that attachment storage folder is writable
- Check disk space

For more help, enable "Debug logging" in settings and check the browser console (`Ctrl/Cmd + Shift + I`).

## License

MIT

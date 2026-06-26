<h1 align="center">Tetromino for Obsidian</h1>
<p align="center">Deterministic, one-way import from Are.na into your Obsidian vault.</p>

<div align="center">
  <img src="https://raw.githubusercontent.com/frostmute/Tetromino/main/assets/hero-banner.svg" alt="Tetromino Banner" width="600" />
</div>

<div align="center">
  <a href="https://github.com/frostmute/Tetromino/releases"><img src="https://img.shields.io/github/v/release/frostmute/Tetromino?style=for-the-badge&color=blue" alt="GitHub release" /></a>
  <a href="https://github.com/frostmute/Tetromino/actions"><img src="https://img.shields.io/github/actions/workflow/status/frostmute/Tetromino/ci.yml?style=for-the-badge" alt="CI Status" /></a>
  <a href="https://github.com/frostmute/Tetromino/blob/main/LICENSE"><img src="https://img.shields.io/github/license/frostmute/Tetromino?style=for-the-badge" alt="License" /></a>
</div>

<div align="center">

One-way only: <strong>Are.na → Obsidian</strong> • Manual runs • Dry-run previews • User-controlled output

</div>

Tetromino brings channels, blocks, metadata, and attachments into your vault as stable Markdown notes. It is designed for clarity and control: same input, same output, with no background jobs and no push-back to Are.na.

API compatibility targets the current Are.na REST API v3 documentation: <https://www.are.na/developers/explore>.

## Quick Navigation

- Project docs: [README](README.md) | [CHANGELOG](CHANGELOG.md) | [SECURITY](SECURITY.md) | [CONTRIBUTING](CONTRIBUTING.md)
- CI and releases: [CI workflow](.github/workflows/ci.yml) | [Release workflow](.github/workflows/release.yml) | [Release template](.github/release-template.md)
- Planning and reporting: [Project board](.github/PROJECT_BOARD.md) | [Bug report template](.github/ISSUE_TEMPLATE/bug_report.yml)

## What This Plugin Is (and Is Not)

- It is a deterministic importer from Are.na to Obsidian.
- It is vault-first, manual, and transparent.
- It is not a two-way sync engine.
- It does not run background sync jobs.
- It does not auto-delete local notes when remote blocks disappear.

## Feature Highlights

<img src="https://raw.githubusercontent.com/frostmute/Tetromino/main/assets/hero-square.svg" alt="App Preview" align="right" width="250" />

### Import Engine

- Imports mapped Are.na channels into mapped vault folders.
- Supports full pagination for large channels (not limited to the first 100 blocks).
- Retries transient upstream failures (`429`, `500`, `502`, `503`, `504`) with backoff.
- Shows status bar progress for channels and block pages.

### Deterministic Writing

- Writes stable Markdown notes for blocks.
- Rewrites existing notes when remote block content changes.
- Writes channel index notes and a master overview note.
- Supports channel index naming mode for Folder Note compatibility (`index.md` or folder-name note).

### Block Enrichment (Optional)

- Banner frontmatter field for Banners plugin compatibility (`enabled`, custom key, source priority).
- Block description in frontmatter (`arena_description`).
- Block comments in a dedicated `Comments` section.
- Connected channel list (`This block appears in`) with external links.
- Best-effort preview image for Channel blocks.

### Attachments and Media

- Image handling modes: `download`, `embed`, `link`.
- Non-image attachment handling modes: `download`, `link`.
- Downloaded attachment rendering: `link` or `embed`.
- Storage modes: channel-local, global folder, custom folder.
- Per-channel storage overrides.
- Migration tools with preview, diff, execution, and history logging.

### Channel Management

- `Import my channels` to bulk-create mappings from your Are.na account.
- `Auto-enable imported channels` toggle for granular control.
- Backup, restore, and reset tools for channel mappings.
- Default mapping target folder: `Are.na/<channel-slug>` unless overridden.

## Commands

- `Import all channels now`
- `Preview import (dry-run)`
- `Import current channel`
- `Import my channels` - Bulk-create channel mappings from your Are.na account
- `Preview current channel import (dry-run)`
- `Open channel on Are.na`
- `Preview attachment migration`
- `Run attachment migration`

## Settings Overview

- API token with verify action.
- Block file naming (`title`, `id`, `title-id`).
- Banner frontmatter options (`enabled`, field name, image source priority).
- Optional enrichments (description, comments, connected channels, channel preview image).
- Image and attachment rendering controls.
- Attachment storage controls (global defaults and per-channel overrides).
- Template engine toggle and custom template string.
- Frontmatter, notifications, and debug logging toggles.
- Channel mapping management and migration actions.

## How Import Works

1. Create mappings manually or use `Import my channels`.
2. Run `Import all channels now` or a dry-run preview command.
3. The plugin fetches channel metadata and all paginated blocks from Are.na.
4. It normalizes each block into deterministic Markdown output.
5. It compares planned output against existing vault files.
6. It writes updated notes, indexes, and overview files.
7. It shows a sync summary with diffs for changed files.
8. It records import state and timestamps in plugin data.

## Installation

1. Put `main.js`, `manifest.json`, and `styles.css` into `<your-vault>/.obsidian/plugins/Tetromino/`.
2. Enable **Tetromino** in Obsidian Community Plugins.
3. Open settings and add your API token.
4. Add at least one channel mapping, or run `Import my channels`.

## Development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Build output:

- `main.js` in the repository root.
- `dist/<plugin-id>-<version>.zip` with `main.js`, `manifest.json`, and `styles.css`.

Quality checks:

```bash
npm run lint
npm test
```

## Companion Tools

If you are looking for a similar tool that imports Raindrop.io bookmarks instead of Are.na blocks, check out [Make It Rain](https://github.com/frostmute/make-it-rain), the sister-tool to this plugin built on the same core sync engine and template parsing logic.

## Security

- API tokens are masked in the UI and stored in Obsidian plugin data.
- The plugin collects no telemetry.
- External requests are limited to Are.na API and direct file URLs required for configured downloads.

For details, see [SECURITY.md](SECURITY.md).

## Troubleshooting

### Invalid API token

1. Generate a token at <https://www.are.na/developers/personal-access-tokens>.
2. Paste it into settings and click `Verify`.
3. Ensure the token includes read access.

### Slow imports or timeouts

- Large channels can take several minutes due to API rate limits and pagination.
- Enable debug logging to monitor progress.
- Start with a smaller channel to verify configuration.

### Notes are not updating

- Run `Import all channels now` from the Command Palette.
- Confirm the channel mapping is enabled in settings.

### Assets are not downloading

- Set image or attachment handling to `Download to vault`.
- Confirm attachment folders are valid and writable.
- Verify disk space.

### Only 100 blocks imported

- Use the latest build; pagination imports all pages.

## License

MIT

## Features Updated (v1.0.0 parity)

- **Handlebars-lite templating**: Allows full programmatic control over how blocks map to markdown notes, using AST-based parsing instead of rigid line-by-line building.
- **Security sanitization**: Prevents executable Obsidian logic (like Templater or Dataview injections) from escaping the content block into the vault.
- **Download utilities**: Binary download helpers with magic-byte validation and safe redirect handling (available for future integration with vault-native downloads).
- **GraphQL API utilities**: Rate-limited GraphQL client for Are.na's v3 endpoint (available for future integration).

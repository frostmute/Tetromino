<h1 align="center">Tetromino for Obsidian</h1>
<p align="center">Deterministic, one-way import from Are.na into your Obsidian vault.</p>

<div align="center">
  <img src="https://github.com/frostmute/Tetromino/blob/main/assets/tetromino-github-hero.png" alt="Tetromino Banner" width="600" />
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

- **For users:** [User Guide](docs/USER_GUIDE.md) | [Settings Reference](docs/SETTINGS_REFERENCE.md) | [FAQ](docs/FAQ.md) | [Troubleshooting](docs/TROUBLESHOOTING.md)
- **For developers:** [Developer Guide](docs/DEVELOPER_GUIDE.md) | [API Design](docs/API_DESIGN.md) | [ADRs](docs/ADRs/)
- **Project docs:** [README](README.md) | [CHANGELOG](CHANGELOG.md) | [ROADMAP](ROADMAP.md) | [SECURITY](SECURITY.md) | [CONTRIBUTING](CONTRIBUTING.md) | [FIRST_CONTRIBUTION](FIRST_CONTRIBUTION.md) | [CODE OF CONDUCT](CODE_OF_CONDUCT.md) | [CONTRIBUTORS](CONTRIBUTORS.md) | [MAINTAINERS](MAINTAINERS.md) | [COMMUNITY HEALTH](docs/COMMUNITY_HEALTH.md)
- **CI and releases:** [CI workflow](.github/workflows/ci.yml) | [Release workflow](.github/workflows/release.yml) | [Release template](.github/release-template.md)
- **Planning and reporting:** [Project board](.github/PROJECT_BOARD.md) | [Bug report template](.github/ISSUE_TEMPLATE/bug_report.yml)
- **Community:** [GitHub Discussions](https://github.com/frostmute/Tetromino/discussions)

## What This Plugin Is (and Is Not)

- It is a deterministic importer from Are.na to Obsidian.
- It is vault-first, manual, and transparent.
- It is not a two-way sync engine.
- It does not auto-delete local notes when remote blocks disappear.
- Background sync is optional and disabled by default (you can enable sync-on-startup and periodic intervals in settings).

## Feature Highlights

### Import Engine

- Imports mapped Are.na channels into mapped vault folders.
- Supports full pagination for large channels (not limited to the first 100 blocks).
- Retries transient upstream failures (`429`, `500`, `502`, `503`, `504`) with backoff.
- Shows status bar progress for channels and block pages.
- **Learn more:** [User Guide — First Import](docs/USER_GUIDE.md#first-import) | [API Design — Retry Logic](docs/API_DESIGN.md#retry-and-backoff-strategy)

### Deterministic Writing

- Writes stable Markdown notes for blocks.
- Rewrites existing notes when remote block content changes.
- Writes channel index notes and a master overview note (`Are.na/overview.md`).
- Supports channel index naming mode for Folder Note compatibility (`index.md` or folder-name note).
- Sync summary modal with per-file diff viewer after every import or dry-run.
- **Learn more:** [ADR-003 — Deterministic Output](docs/ADRs/ADR-003-deterministic-output.md) | [User Guide — Dry-Run](docs/USER_GUIDE.md#dry-run-feature)

### Block Enrichment (Optional)

- Banner frontmatter field for Banners plugin compatibility (`enabled`, custom key, source priority).
- Block description in frontmatter (`arena_description`).
- Block comments in a dedicated `Comments` section.
- Connected channel list (`This block appears in`) with external links.
- Best-effort preview image for Channel blocks.
- **Learn more:** [Settings Reference — Enrichments](docs/SETTINGS_REFERENCE.md#content-rendering)

### Template Engine

- Optional custom template system for full control over generated Markdown.
- Handlebars-like syntax: `{{title}}`, `{{#if image}}...{{/if}}`, `{{#each comments}}...{{/each}}`.
- Template variables include: `title`, `id`, `class`, `content`, `description`, `image`, `arena_url`, `source_url`, `channel_title`, `channel_slug`, `comments`, `connected_channels`.
- Toggle between default output and custom template in settings.
- **Learn more:** [Settings Reference — Templates](docs/SETTINGS_REFERENCE.md#template-engine)

### Attachments and Media

- Image handling modes: `download`, `embed`, `link`.
- Non-image attachment handling modes: `download`, `link`.
- Downloaded attachment rendering: `link` or `embed`.
- Storage modes: channel-local, global folder, custom folder.
- Per-channel storage overrides.
- Migration tools with preview, diff, execution, and history logging.
- **Learn more:** [Settings Reference — Attachments](docs/SETTINGS_REFERENCE.md#attachment-handling) | [User Guide — Attachment Handling](docs/USER_GUIDE.md#attachment-handling)

### Channel Management

- `Import my channels` to bulk-create mappings from your Are.na account.
- `Auto-enable imported channels` toggle for granular control.
- Backup, restore, and reset tools for channel mappings.
- `Restore from file...` to pick a specific historical backup instead of only the latest.
- Default mapping target folder: `Are.na/<channel-slug>` unless overridden.
- **Learn more:** [User Guide — Channel Management](docs/USER_GUIDE.md#channel-management)

## Commands

Available from the Obsidian Command Palette (`Ctrl/Cmd + P`):

- `Import all channels now`
- `Preview import (dry-run)`
- `Import current channel`
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
- **Full reference:** [Settings Reference](docs/SETTINGS_REFERENCE.md)

## How Import Works

1. Create mappings manually or use `Import my channels` in settings.
2. Run `Import all channels now` or a dry-run preview command.
3. The plugin fetches channel metadata and all paginated blocks from Are.na.
4. It normalizes each block into deterministic Markdown output.
5. It compares planned output against existing vault files.
6. It writes updated notes, indexes, and overview files.
7. It shows a sync summary with diffs for changed files.
8. It records import state and timestamps in plugin data.

**Detailed walkthrough:** [User Guide — First Import](docs/USER_GUIDE.md#first-import)

## Documentation

### For Users

New to Tetromino? Start here:

- **[User Guide](docs/USER_GUIDE.md)** — Overview, installation, first import walkthrough, dry-run explanation, settings reference, troubleshooting, and FAQ.
- **[Settings Reference](docs/SETTINGS_REFERENCE.md)** — Every setting explained with defaults, examples, and advanced template syntax.
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** — Common errors, solutions, and how to collect logs for bug reports.
- **[FAQ](docs/FAQ.md)** — Answers to the most common questions about sync behavior, security, and offline usage.

### For Developers

Want to contribute or understand the internals?

- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** — Architecture overview, module guide, code style, and how to add features or tests.
- **[API Design](docs/API_DESIGN.md)** — Are.na API integration details, pagination, rate limiting, retry logic, and response normalization.
- **[ADRs](docs/ADRs/)** — Architecture Decision Records documenting key design choices (one-way import, manual triggers, deterministic output, Markdown-only format, dry-run previews).

## Installation

### From Obsidian Community Plugins (Recommended)

1. Open **Settings → Community Plugins** in Obsidian.
2. Search for **"Tetromino"** in the Community Plugins browser.
3. Click **Install**, then **Enable**.
4. Open Tetromino settings and add your Are.na API token.
5. Add at least one channel mapping, or run `Import my channels`.

**Plugin directory:** <https://obsidian.md/plugins?id=Tetromino>

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/frostmute/Tetromino/releases/latest).
2. Place them into `<your-vault>/.obsidian/plugins/Tetromino/`.
3. Enable **Tetromino** in Obsidian Community Plugins.
4. Open settings and add your API token.
5. Add at least one channel mapping, or run `Import my channels`.

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

**Contributor resources:** [Developer Guide](docs/DEVELOPER_GUIDE.md) | [CONTRIBUTING](CONTRIBUTING.md) | [First-Time Contributor Guide](FIRST_CONTRIBUTION.md)

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

### Fewer blocks than expected

- Verify the channel mapping is enabled in settings.
- Check that the channel is public (or your token has access to private channels).
- Enable debug logging to see pagination progress in the console.

**Full troubleshooting guide:** [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## Contributors

Tetromino is maintained by [Jonathan J Wagner](https://github.com/frostmute). We welcome contributions of all kinds — code, documentation, bug reports, and community support.

- **Want to contribute?** See [FIRST_CONTRIBUTION.md](FIRST_CONTRIBUTION.md) for a step-by-step guide.
- **Looking for a first issue?** Browse [`good first issue`](https://github.com/frostmute/Tetromino/labels/good%20first%20issue) labels.
- **All contributors:** See [CONTRIBUTORS.md](CONTRIBUTORS.md) for the full list.

First-time contributors are thanked by name in release notes.

## License

MIT

## Release History

See [CHANGELOG.md](CHANGELOG.md) for a complete version history.

- **v1.1.0** (2025-06-26) — Sync summary modal, overview note generation, attachment migration, channel management tools, banner frontmatter, block enrichment, channel index enhancements, background sync, and numerous security and performance fixes.
- **v1.0.0** (2025-01-15) — Initial stable release with deterministic Are.na → Obsidian import, pagination, retries, stable Markdown output, and attachment support.

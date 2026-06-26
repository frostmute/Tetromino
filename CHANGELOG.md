# Changelog

All notable changes to **Tetromino for Obsidian** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Sync summary modal with per-file diff viewer.
- Master overview note generation (`Are.na/overview.md`).
- Attachment migration system: preview modal, dry-run diffs, execution, and migration history log.
- Per-channel attachment storage overrides.
- Channel management tools in settings:
  - `Import my channels` (bulk-create mappings from Are.na account)
  - `Auto-enable imported channels` toggle (granular manual control)
  - `Backup channel mappings`
  - `Restore latest backup`
  - `Restore from file...` (choose a specific historical backup to restore from)
  - `Reset channel mappings`
- Optional banner frontmatter field for Obsidian Banners plugin compatibility:
  - enable/disable toggle
  - custom field name
  - banner image source priority (`thumb-first` / `display-first`)
- Optional block enrichment features:
  - import block description into frontmatter (`arena_description`)
  - import block comments into note body
  - import connected channels where block appears, with clickable external links
  - best-effort preview image import for `Channel` blocks (body image + banner candidate)
- Channel index enhancements:
  - folder-note compatible index filename mode (`index.md` or `<folder-name>.md`)
  - `Info` section with description, started, modified, length, followers (when available)
  - best-effort `This Channel Appears In` section with clickable external links
- Build packaging script that outputs `dist/<plugin-id>-<version>.zip` without relying on system `zip`.
- Sync-on-startup capability and periodic background sync intervals.
- `markMissing` feature now handles deleted/missing blocks properly by clearing their sync records.

### Changed
- Default channel folder resolution now uses `Are.na/<channel-slug>` when a mapping folder is blank.
- Mapping folder is now optional in settings UI; explicit folders still override default behavior.
- API transient error handling now retries on HTTP `500/502/503/504` (in addition to `429`).
- API client now targets Are.na REST API v3 routes with a compatibility adapter for v3 `data/meta` pagination responses.
- URL normalization now recognizes both legacy `/v2/...` and current `/v3/...` API URLs.

### Fixed
- Fixed pagination edge case where some channels could stop after the first 100 blocks.
- Fixed packaging failures in environments without a system `zip` binary.
- `pMap` now stops spawning new tasks once a mapping function rejects, preventing wasted work and unhandled rejections after an error.
- Fixed credential leak in `downloadBinaryFile` that sent API token to external CDN/S3 URLs.
- Fixed XSS filter bypass via HTML entities inside protocol names (e.g., `java&#x09;script:`).
- Fixed template mode producing malformed Obsidian markdown for downloaded images (double-bracketed paths).
- Fixed `sanitizeMarkdownContent` corrupting YAML frontmatter values in template mode output.
- Fixed `renderTemplate` `#each` passing `null` array items as data context.
- Fixed template mode silently dropping comments and connected channels enrichment data.
- Fixed `sanitizeFileName` using wrong fallback name ("Unnamed_Raindrop" → "Unnamed_Block").
- Fixed YAML date regex matching partial date-like strings (missing `$` anchor).
- Fixed trailing spaces in YAML array formatting for nested objects.
- Fixed redundant async I/O in `createFolderStructure`.
- Fixed GraphQL response handler crashing on null/empty responses.

### Removed
- Removed unused template directive files (`#extends`, `#block`, `#include`) and utility files (`downloadUtils.ts`, `arenaApiUtils.ts`, `yamlUtils.ts`, `fileUtils.ts`) that were superseded or unused.
- Removed accidentally committed `scripts/copy-to-vault 2.mjs` targeting wrong plugin directory.

### Tests
- Added unit tests for the `pMap` concurrency utility (order preservation, concurrency limit, empty arrays, limit larger than item count, and error propagation with halting).
- Added backup restore tests covering `restoreChannelMappingsFromFile` and `restoreLatestChannelMappingsBackup` (valid restore, missing file, invalid JSON, missing/malformed `channelMappings`, normalization of legacy mappings).

## [1.0.0] — 2025-01-15

### Added
- **Pull sync**: Import Are.na channels as folders of Markdown notes (text, images, links, media, attachments).
- **YAML front-matter**: Configurable metadata fields (`arena-id`, `arena-url`, `arena-class`, `arena-created-at`, `arena-updated-at`, `arena-channel-slug`, `arena-channel-title`, `arena-source-url`).
- **Image handling**: Download to vault, Obsidian embed, or external link modes.
- **Attachment handling**: Download or link PDFs and other non-image attachments with flexible storage options (channel-local, global, or custom folders).
- **Manual import flow**: Command-driven import with explicit user control.
- **Channel mapping UI**: Map any number of Are.na channels to local vault folders with per-mapping enable/disable toggle.
- **Commands**: Import all channels · Import current channel · Preview import (dry-run) · Preview current channel · Open channel on Are.na.
- **Status bar indicator**: Live import progress with pagination and block-level updates for large channels.
- **Dry-run mode**: Preview all changes before applying them.
- **Channel index notes**: Auto-generated index files with links to all imported notes in a channel.
- **Import history**: Transparent action logging in `Are.na/import-history.md` for audit trail.
- **Rate-limit handling**: Automatic retry with exponential backoff for API rate limits (HTTP 429).
- **Mobile support**: Works on Obsidian Mobile without external dependencies.
- **Token verification**: One-click API token validation in settings.
- **Debug logging**: Optional verbose console output for troubleshooting.
- **Selective block exclusion**: Configure which block classes to skip during import (e.g., Image, Media).

### Technical
- TypeScript codebase with strict null checks and comprehensive type safety.
- esbuild bundler for fast development and production builds.
- Jest test suite with utilities for mock block data.
- ESLint configuration for consistent code style.
- GitHub Actions CI pipeline (lint, test, build on every push/PR).
- Automated release workflow with changelog extraction and plugin packaging.
- Comprehensive documentation (README, CONTRIBUTING, CHANGELOG, LICENSE).

### Security
- API tokens masked in settings UI (password input field).
- Input validation for channel mappings (slug required, folder optional with deterministic default).
- Secure token verification with clear feedback.

---

## Version history format

Each release entry follows this structure:

```
## [X.Y.Z] — YYYY-MM-DD

### Added      — new features
### Changed    — changes in existing functionality
### Deprecated — soon-to-be removed features
### Removed    — removed features
### Fixed      — bug fixes
### Security   — vulnerability patches
```

[Unreleased]: https://github.com/frostmute/Tetromino/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/frostmute/Tetromino/releases/tag/v1.0.0

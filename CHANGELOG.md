# Changelog

All notable changes to **Are.na Sync for Obsidian** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2025-01-15

### Added
- **Pull sync**: Import Are.na channels as folders of Markdown notes (text, images, links, media, attachments).
- **YAML front-matter**: Configurable metadata fields (`arena-id`, `arena-url`, `arena-class`, `arena-created-at`, `arena-updated-at`, `arena-channel-slug`, `arena-channel-title`, `arena-source-url`).
- **Image handling**: Download to vault, Obsidian embed, or external link modes.
- **Attachment handling**: Download or link PDFs and other non-image attachments with flexible storage options (channel-local, global, or custom folders).
- **Auto-sync timer**: Configurable interval (default 30 min) with manual trigger via Command Palette and ribbon icon.
- **Sync on startup**: Optional full sync when Obsidian launches.
- **Channel mapping UI**: Map any number of Are.na channels to local vault folders with per-mapping enable/disable toggle.
- **Commands**: Sync all channels · Sync current channel · Preview import (dry-run) · Preview current channel · Open channel on Are.na.
- **Status bar indicator**: Live sync progress with pagination and block-level updates for large channels.
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
- Input validation for channel mappings (slug and folder path required).
- Secure token verification with clear feedback.

## [Unreleased]

### Changed

- Refactored plugin behavior to one-way import only (Are.na -> Obsidian).
- Removed documentation references to push sync, two-way conflict flows, migration tooling, and preview mode.
- Aligned command, settings, and feature docs with current runtime behavior.

### Added

- Dry-run preview commands for full import and current-channel import.
- Attachment handling controls for link/download behavior.
- Downloaded attachment rendering controls (embed or link).
- Attachment storage location controls (channel-local, global folder, custom folder).
- Binary asset downloading for images and non-image attachments (including PDFs).
- Pagination and block-level progress updates in status bar for large channels.
- Channel index note generation with links to imported notes.
- Import action history logging (`Are.na/import-history.md`) for transparency.

### Planned
- Dataview-compatible front-matter presets
- Drag-and-drop channel mapping UI
- Selective block-class filtering per channel

---



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

[Unreleased]: https://github.com/yourusername/arena-sync-obsidian/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/arena-sync-obsidian/releases/tag/v1.0.0

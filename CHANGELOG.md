# Changelog

All notable changes to **Are.na Sync for Obsidian** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [1.0.0] — 2026-03-26

### Added
- **Pull sync**: Import Are.na channels as folders of Markdown notes (text, images, links, media, attachments).
- **Push sync**: Send new or edited Obsidian notes back to Are.na as text blocks.
- **Two-way sync**: Bi-directional synchronisation with hash-based change detection.
- **Conflict resolution**: Four strategies — Local wins, Remote wins, Newest wins, Ask each time.
- **YAML front-matter**: Configurable metadata fields (`arena-id`, `arena-class`, `arena-source`, `arena-created`, `arena-updated`).
- **Image handling**: Download to vault, Obsidian embed, or external link modes.
- **Auto-sync timer**: Configurable interval (default 30 min) with manual trigger via Command Palette and ribbon icon.
- **Sync on startup**: Optional full sync when Obsidian launches.
- **Channel mapping UI**: Map any number of Are.na channels to local vault folders with per-mapping direction overrides.
- **Commands**: Sync all · Sync current channel · Push current note · Open channel on Are.na.
- **Status bar indicator**: Live sync status (idle / syncing / last sync timestamp / error count).
- **Mobile support**: Works on Obsidian Mobile without external dependencies.
- **Token verification**: One-click API token validation in settings.
- **Debug logging**: Optional verbose console output for troubleshooting.

### Technical
- TypeScript codebase with strict null checks.
- esbuild bundler for fast builds.
- Jest test suite with coverage reporting.
- ESLint configuration for consistent code style.
- GitHub Actions CI pipeline (lint, test, build on every push/PR).
- Automated release workflow via GitHub Releases.

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

[Unreleased]: https://github.com/arena-sync/arena-sync-obsidian/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/arena-sync/arena-sync-obsidian/releases/tag/v1.0.0

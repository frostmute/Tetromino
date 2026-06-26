---
type: reference
title: Draft Release Notes — Tetromino v1.1.0
created: 2026-06-26
tags:
  - release
  - changelog
  - draft
related:
  - '[[CHANGELOG]]'
  - '[[Phase-06-Release-Procedures]]'
---

# Draft Release Notes — Tetromino v1.1.0

> **Status:** Draft — pending version confirmation and quality gate passage.
> **Target Version:** 1.1.0 (minor — new features, backward compatible).

---

## Summary

Tetromino v1.1.0 is a feature-rich update that significantly expands the plugin's capabilities while maintaining full backward compatibility with existing vaults. This release introduces **block enrichment**, **attachment migration**, **banner frontmatter support**, **channel management tools**, and a host of performance and security improvements.

Users can now enrich imported notes with block descriptions, comments, and connected-channel links. A new attachment migration system provides a safe, previewable workflow for reorganizing downloaded files. Per-channel attachment overrides, banner image support for the Obsidian Banners plugin, and bulk channel import round out the major features.

Under the hood, sync performance has been dramatically improved through concurrent channel syncing, optimized batch API requests, and O(1) sync-record lookups. Several security vulnerabilities have been patched, including XSS filter bypass, SSRF, directory traversal, and API token leaks.

---

## New Features

### Sync Summary & Diff Viewer
- A new sync summary modal appears after every sync, showing per-file diffs so you can see exactly what changed.

### Master Overview Note
- Auto-generates `Are.na/overview.md` — a master index linking to all imported channels and their index notes.

### Attachment Migration System
- Preview modal showing dry-run diffs before any files are moved.
- Execution engine with migration history log (`Are.na/migration-history.md`).
- Per-channel attachment storage overrides — each channel can now have its own attachment folder independent of the global setting.

### Channel Management Tools
- **Import my channels** — bulk-create channel mappings from your Are.na account.
- **Auto-enable imported channels** toggle for granular manual control.
- **Backup channel mappings** — save your mapping configuration.
- **Restore latest backup** — one-click restore from the most recent backup.
- **Restore from file...** — choose a specific historical backup JSON to restore from.
- **Reset channel mappings** — clear all mappings.

### Banner Frontmatter (Obsidian Banners Plugin)
- Optional banner field generation for compatibility with the [Obsidian Banners](https://github.com/noatpad/obsidian-banners) plugin.
- Configurable field name.
- Banner image source priority: `thumb-first` or `display-first`.

### Block Enrichment
- Import block descriptions into frontmatter (`arena_description`).
- Import block comments into note body.
- Import connected channels where a block appears, with clickable external links.
- Best-effort preview image import for `Channel` blocks (body image + banner candidate).

### Channel Index Enhancements
- Folder-note compatible index filename mode (`index.md` or `<folder-name>.md`).
- New `Info` section showing description, started, modified, length, and follower counts (when available).
- Best-effort "This Channel Appears In" section with clickable external links.

### Background Sync
- **Sync-on-startup** capability.
- Configurable **periodic background sync intervals**.

### Improved Missing-Block Handling
- The `markMissing` feature now properly handles deleted or missing blocks by clearing their sync records, preventing stale data.

---

## Bug Fixes

- **Pagination:** Fixed edge case where some channels could stop after the first 100 blocks.
- **Packaging:** Fixed packaging failures in environments without a system `zip` binary (now uses a pure-Node packager).
- **pMap Concurrency:** Stops spawning new tasks once a mapping function rejects, preventing wasted work and unhandled rejections after an error.
- **Credential Leak:** Fixed API token being sent to external CDN/S3 URLs during binary downloads.
- **Token Leak in Logs:** Fixed API token leak in error logging.
- **XSS Filter Bypass:** Fixed bypass via HTML entities inside protocol names (e.g., `java&#x09;script:`).
- **Template Mode — Image Markdown:** Fixed malformed Obsidian markdown for downloaded images (double-bracketed paths).
- **Template Mode — YAML Corruption:** Fixed `sanitizeMarkdownContent` corrupting YAML frontmatter values.
- **Template Mode — `#each` Null Items:** Fixed `renderTemplate` `#each` passing `null` array items as data context.
- **Template Mode — Dropped Enrichment:** Fixed template mode silently dropping comments and connected channels enrichment data.
- **Filename Sanitization:** Fixed `sanitizeFileName` using wrong fallback name (`"Unnamed_Raindrop"` → `"Unnamed_Block"`).
- **YAML Date Regex:** Fixed regex matching partial date-like strings (missing `$` anchor).
- **YAML Array Formatting:** Fixed trailing spaces in YAML array formatting for nested objects.
- **Folder Creation I/O:** Fixed redundant async I/O in `createFolderStructure`.
- **GraphQL Handler:** Fixed GraphQL response handler crashing on null/empty responses.
- **SSRF:** Fixed SSRF vulnerability in API URL builder.
- **Directory Traversal:** Fixed potential directory traversal via `.` and `..` in filenames.
- **Migration Concurrency:** Prevented unbounded concurrent file reads in attachment migration.

---

## Performance Improvements

- **Concurrent Channel Syncing:** Multiple channels now sync in parallel instead of sequentially.
- **Bounded-Concurrency Block Fetching:** Block fetching uses controlled concurrency to maximize throughput without overwhelming the API.
- **Batch API Requests:** Optimized with `pMap` concurrency for faster bulk operations.
- **N+1 Query Elimination:** Resolved N+1 API queries for channel preview images and block detail fetching.
- **O(1) SyncRecord Lookup:** Optimized `SyncRecords` lookup for improved sync performance on large channels.

---

## Other Changes

- Default channel folder now resolves to `Are.na/<channel-slug>` when a mapping folder is left blank.
- Mapping folder is now optional in the settings UI; explicit folders still override default behavior.
- API transient error handling now retries on HTTP `500/502/503/504` in addition to `429`.
- API client now targets Are.na REST API v3 routes with a compatibility adapter for v3 `data/meta` pagination responses.
- URL normalization now recognizes both legacy `/v2/...` and current `/v3/...` API URLs.
- Internal logging now uses consistent methods instead of direct `console` calls.
- Removed unused template directive files and superseded utility files to reduce bundle size.
- Removed accidentally committed `scripts/copy-to-vault 2.mjs`.

---

## Tests

- Added unit tests for the `pMap` concurrency utility (order preservation, concurrency limit, empty arrays, error propagation with halting).
- Added backup restore tests covering `restoreChannelMappingsFromFile` and `restoreLatestChannelMappingsBackup` (valid restore, missing file, invalid JSON, missing/malformed `channelMappings`, normalization of legacy mappings).

---

## Contributors

Thanks to all contributors who made this release possible:
- **frostmute** — project maintainer
- **Jules** — performance optimizations, security fixes, and test coverage
- **Devin** — test fixes and batch optimization
- **CodeRabbit** — docstrings and code review

---

## Migration Guide

No migration steps are required for this release. All changes are backward compatible with existing vaults and channel mappings.

If you previously left the "Mapping folder" field blank, notes will now automatically use `Are.na/<channel-slug>` as the default folder. Existing notes in their current locations will not be moved unless you explicitly use the new attachment migration tools.

---

*These notes are a draft. Final release notes will be published on GitHub after the version tag is pushed and the automated release workflow completes.*

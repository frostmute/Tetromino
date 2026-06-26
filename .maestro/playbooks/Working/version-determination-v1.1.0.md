---
type: analysis
title: Version Determination — Tetromino v1.1.0
created: 2026-06-26
tags:
  - release
  - semver
  - versioning
related:
  - '[[CHANGELOG]]'
  - '[[Phase-06-Release-Procedures]]'
  - '[[draft-release-notes-v1.1.0]]'
---

# Version Determination — Tetromino v1.1.0

## Current Version

- `package.json`: **1.0.0**
- `manifest.json`: **1.0.0**
- `versions.json`: **1.0.0**

## Proposed Next Version

**1.1.0** (minor version bump)

## Semantic Versioning Analysis

Per [SemVer 2.0.0](https://semver.org/spec/v2.0.0.html):

> Given a version number MAJOR.MINOR.PATCH, increment the:
> 1. MAJOR version when you make incompatible API changes,
> 2. MINOR version when you add functionality in a backward compatible manner, and
> 3. PATCH version when you make backward compatible bug fixes.

### Why Minor (1.1.0) and Not Patch (1.0.1)

The `[Unreleased]` section contains **significant new functionality** that goes well beyond bug fixes:

| Category | Count | Examples |
|----------|-------|----------|
| **Added (new features)** | 11 | Sync summary modal, master overview note, attachment migration system, per-channel attachment overrides, channel management tools (import/backup/restore/reset), banner frontmatter support, block enrichment (descriptions/comments/connected channels), channel index enhancements, sync-on-startup, background sync intervals, improved `markMissing` handling |
| **Changed (improvements)** | 8 | Concurrent channel syncing, bounded-concurrency block fetching, `pMap` batch optimization, N+1 query elimination, O(1) `SyncRecords` lookup, API v3 migration, optional mapping folders, default folder resolution |
| **Fixed (bug fixes)** | 18 | Pagination edge case, packaging failures, pMap halting, credential/token leaks, XSS bypass, template mode issues, filename sanitization, YAML formatting, GraphQL handler, SSRF, directory traversal, migration concurrency |
| **Security** | 2 | SSRF vulnerability, directory traversal via `.`/`..`, API token leaks |

A patch release is appropriate when the changes are *only* bug fixes and minor non-breaking corrections. Because this release introduces **multiple user-facing features** (attachment migration, channel management UI, banner support, block enrichment, background sync), a minor version bump is required to signal the additive nature of the release.

### Why Not Major (2.0.0)

No breaking changes have been introduced:

- Existing vaults and channel mappings remain fully compatible.
- Default folder resolution changes (`Are.na/<channel-slug>`) are opt-in for *new* mappings; existing notes are not moved.
- Mapping folder being optional does not affect existing explicit mappings.
- API v3 route changes are internal implementation details with backward-compatible URL normalization.
- The draft release notes' migration guide confirms: **"No migration steps are required."**

## Conclusion

**The next version should be `v1.1.0`.**

This accurately signals to users that the release contains new features and improvements while remaining fully backward compatible with existing Tetromino v1.0.0 installations.

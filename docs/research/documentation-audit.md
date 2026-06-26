---
type: analysis
title: Phase 08 Task 1 — Documentation Audit Report
created: 2026-06-26
tags:
  - documentation
  - audit
  - phase-08
related:
  - '[[README]]'
  - '[[CONTRIBUTING]]'
  - '[[SECURITY]]'
  - '[[CHANGELOG]]'
---

# Documentation Audit Report

## Scope

Reviewed:
- `README.md` — feature overview, quick start, setup, troubleshooting
- `CONTRIBUTING.md` — setup, build commands, PR checklist, coding standards
- `CHANGELOG.md` — version history
- `SECURITY.md` — security practices, vulnerability disclosure, token handling
- `src/main.ts`, `src/settings-tab.ts`, `src/types.ts`, `src/api.ts`, `src/templateUtils.ts` — ground-truth verification
- `scripts/release.sh`, `.github/workflows/ci.yml`, `.github/workflows/release.yml` — CI/release accuracy
- `manifest.json`, `package.json` — version and command accuracy

## Critical Inaccuracies Found (and Fixed)

### 1. README.md — Background Sync Contradiction

**Location:** `README.md` lines 34-36 ("What This Plugin Is and Is Not")

**Issue:** States "It does not run background sync jobs." However, the plugin clearly supports:
- `syncOnStartup` setting (auto-import when Obsidian opens)
- `syncInterval` setting (repeating auto-import every N minutes)
- These are configured in `src/main.ts` lines 137-143 and 146-158
- The CHANGELOG v1.1.0 explicitly lists: "Sync-on-startup capability and periodic background sync intervals."

**Impact:** Users reading the README will be misled about core product behavior.

**Fix applied:** Updated the "Is (and Is Not)" section to accurately describe that background sync is **optional and disabled by default**, not nonexistent.

### 2. README.md — Missing Template Engine Feature Highlight

**Location:** `README.md` Feature Highlights sections

**Issue:** The template engine (`templateEnabled`, `templateString` in `src/types.ts` DEFAULT_SETTINGS) is a major v1.1.0 feature that allows users to customize the Markdown output format for every block using a Handlebars-like syntax (`{{var}}`, `{{#if}}`, `{{#each}}`). It was only mentioned in passing under "Settings Overview" and not described at all in Feature Highlights.

**Impact:** Users don't know they can fully customize note output.

**Fix applied:** Added a "Template Engine" subsection under Feature Highlights.

### 3. README.md — Outdated Troubleshooting Tip

**Location:** `README.md` lines 183-185

**Issue:** "Only 100 blocks imported" troubleshooting said "Use the latest build; pagination imports all pages." Pagination has been standard since v1.0.0. This tip was confusing and implied users might be on an old build.

**Fix applied:** Reworded to "Fewer blocks than expected" with actionable checks (mapping enabled, channel public, debug logging).

### 4. CONTRIBUTING.md — Wrong Playbook Filename

**Location:** `CONTRIBUTING.md` line 837

**Issue:** Referenced `Phase-01-Environment-Setup.md` but actual file is `.maestro/playbooks/Initiation/Phase-01-Setup-and-Verify.md`.

**Fix applied:** Corrected the filename.

### 5. scripts/release.sh — Wrong GitHub Actions URL

**Location:** `scripts/release.sh` line 110

**Issue:** Hardcoded `https://github.com/arena-sync/arena-sync-obsidian/actions` instead of `https://github.com/frostmute/Tetromino/actions`.

**Fix applied:** Updated the URL in `scripts/release.sh`.

### 6. SECURITY.md — Misleading Encryption Claim

**Location:** `SECURITY.md` line 20

**Issue:** Claimed API tokens are "stored in Obsidian's plugin data directory, which is encrypted by Obsidian's security layer on desktop." Obsidian does **not** encrypt plugin data files by default; `data.json` is a plain JSON file inside the vault.

**Impact:** Users may have a false sense of security about token storage.

**Fix applied:** Removed the encryption claim. Now states tokens are stored locally in the vault's plugin data file and are masked in the UI.

## Minor Inconsistencies (also fixed where applicable)

### 7. README.md Feature Highlights Missing New v1.1.0 Features

- **Sync summary modal with per-file diff viewer** — mentioned in CHANGELOG but not in README Feature Highlights. Added to "Deterministic Writing" section.
- **Master overview note generation** — mentioned in CHANGELOG but not in README Feature Highlights. Added to "Deterministic Writing" section.

### 8. Build Commands Accuracy

All build commands listed in README.md and CONTRIBUTING.md match `package.json` scripts:
- `npm run dev` ✓
- `npm run build` ✓
- `npm run lint` / `npm run lint:fix` ✓
- `npm test` ✓
- `npm run release` ✓

### 9. Project Structure Accuracy

The file paths in CONTRIBUTING.md's Project Structure Overview are accurate against the current `src/` tree.

## Gaps Identified (to be addressed in subsequent Phase 08 tasks)

| Missing Document | Gap Description | Relevant Code |
|---|---|---|
| `docs/USER_GUIDE.md` | No step-by-step user guide for first import, dry-run, settings | `src/settings-tab.ts`, `src/main.ts` |
| `docs/DEVELOPER_GUIDE.md` | No contributor onboarding doc with architecture overview | `src/` module tree |
| `docs/API_DESIGN.md` | No doc explaining Are.na API integration patterns | `src/api.ts` |
| `docs/ADRs/` | No architecture decision records | Core design choices |
| `docs/SETTINGS_REFERENCE.md` | No exhaustive settings reference with examples | `src/types.ts`, `src/settings-tab.ts` |
| `docs/FAQ.md` | No FAQ document | Common support questions |
| `docs/RELEASE_GUIDE.md` | No detailed release guide for maintainers | `scripts/release.sh`, `.github/workflows/release.yml` |
| `docs/TROUBLESHOOTING.md` | No dedicated troubleshooting doc with error codes | `src/api.ts` error messages, `src/main.ts` notices |
| GitHub Discussions | No community knowledge base setup | N/A |

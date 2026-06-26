---
type: reference
title: Release Guide for Maintainers
created: 2026-06-26
tags:
  - release
  - maintainers
  - ci-cd
  - semver
related:
  - '[[DEVELOPER_GUIDE]]'
  - '[[USER_GUIDE]]'
  - '[[FAQ]]'
  - '[[API_DESIGN]]'
  - '[[testing-guide]]'
---

# Release Guide for Maintainers

This guide walks you through shipping a new version of Tetromino. It expands on the checklist in `.github/RELEASE_CHECKLIST.md` with detailed explanations, common pitfalls, and how to recover from mistakes.

**Scope:** versioning, quality gates, tagging, GitHub Actions automation, artifact verification, Obsidian registry updates, hotfixes, and post-release verification.

---

## Table of Contents

1. [Release Overview](#release-overview)
2. [Step-by-Step Release Checklist](#step-by-step-release-checklist)
3. [Common Mistakes and How to Avoid Them](#common-mistakes-and-how-to-avoid-them)
4. [Testing a Release Candidate in a Test Vault](#testing-a-release-candidate-in-a-test-vault)
5. [Handling Urgent Hotfixes](#handling-urgent-hotfixes)
6. [Post-Release Verification Steps](#post-release-verification-steps)
7. [How the Automated Workflow Works](#how-the-automated-workflow-works)
8. [Obsidian Community Plugin Registry](#obsidian-community-plugin-registry)
9. [Emergency Procedures](#emergency-procedures)

---

## Release Overview

Tetromino releases follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

| Version bump | Trigger | Examples |
|--------------|---------|----------|
| **Patch** `1.0.x` | Critical or routine bug fix | Token leak fix, pagination edge case, XSS filter bypass |
| **Minor** `1.x.0` | New feature, backward compatible | Sync summary modal, attachment migration, banner frontmatter |
| **Major** `x.0.0` | Breaking change | Settings format change, note structure change, API change |

**Current version:** `1.1.0` (as of this writing). Check `manifest.json` for the source of truth.

### Who Can Release

Anyone with push access to `frostmute/Tetromino` on the `main` branch can trigger a release. The GitHub Actions workflow uses the built-in `GITHUB_TOKEN`, so no extra secrets are needed.

### Release Cadence

There is no fixed schedule. Release when:
- A critical bug is fixed (patch).
- A meaningful feature is complete and tested (minor).
- A breaking change is merged (major — rare).

---

## Step-by-Step Release Checklist

### 1. Pre-Release Preparation

**Goal:** ensure the codebase is ready and the changelog is complete.

1. **Switch to `main` and pull latest:**
   ```bash
   git checkout main
   git pull --rebase origin main
   ```

2. **Ensure a clean working tree:**
   ```bash
   git status
   ```
   If there are uncommitted changes, commit or stash them. `scripts/release.sh` will abort if the tree is dirty.

3. **Review the `[Unreleased]` section in `CHANGELOG.md`:**
   - Verify every merged PR since the last release has an entry.
   - Group entries under the correct heading: `Added`, `Changed`, `Fixed`, `Removed`, `Security`, `Tests`.
   - Security fixes **must** be documented, even if they were not public.

4. **Determine the version number:**
   - Scan the `[Unreleased]` entries.
   - If any entry is a breaking change → **major** bump.
   - If any entry is a new feature → **minor** bump.
   - If only bug fixes, docs, or internal refactors → **patch** bump.
   - Document your reasoning in the commit message or a brief note in the PR.

5. **Cross-reference PRs and issues:**
   - Check that resolved issues are closed or labeled with the target version milestone.
   - If GitHub milestones are used, assign them now.

### 2. Quality Gate

**Goal:** catch problems *before* the tag is pushed.

Run all quality checks locally:

```bash
npm run lint       # Expected: zero errors
npm test           # Expected: all 15+ suites pass, 296+ tests
npm run build      # Expected: TypeScript compiles, esbuild bundles
npm run package    # Expected: dist/Tetromino-<version>.zip created
```

- **Lint:** `eslint` is configured with TypeScript strict rules. Zero warnings is the target.
- **Tests:** Jest enforces coverage thresholds (statements ≥70%, branches ≥65%, functions ≥40%, lines ≥70%). Do not let a release drop these.
- **Build:** The production bundle is created at `main.js`, `manifest.json`, and `styles.css`.
- **Package:** `scripts/package.mjs` creates `dist/Tetromino-<version>.zip` containing exactly those three files.

If any step fails, fix the issue and restart the gate. **Do not skip or override checks.**

### 3. Version Bump and Tagging

**Goal:** update version metadata, commit, and tag.

Use the interactive release script:

```bash
npm run release
# or
bash scripts/release.sh
```

The script will:
1. Confirm you are on `main` with a clean tree.
2. Run `npm run lint` and `npm test`.
3. Prompt for bump type (`patch`, `minor`, `major`, `custom`).
4. Run `npm version <bump> --no-git-tag-version` to update `package.json` and `package-lock.json`.
5. Run `version-bump.mjs` to update `manifest.json` and append the new version to `versions.json`.
6. Run `npm run build` to produce the production bundle.
7. Commit the version files with message `chore(release): v<version>`.
8. Create an annotated tag `v<version>`.
9. Push `main` and the tag to `origin`.

**Manual fallback** (if the script fails or you need full control):

```bash
# 1. Bump package.json / package-lock.json
npm version minor --no-git-tag-version   # or patch / major

# 2. Sync manifest.json and versions.json
node version-bump.mjs

# 3. Build
npm run build

# 4. Move Unreleased entries to a new version section in CHANGELOG.md
#    (edit CHANGELOG.md manually)

# 5. Commit and tag
git add package.json package-lock.json manifest.json versions.json CHANGELOG.md
git commit -m "chore(release): v1.x.x"
git tag -a v1.x.x -m "Release v1.x.x"
git push origin main
git push origin v1.x.x
```

> **Important:** The tag **must** start with `v` (e.g., `v1.1.0`). The GitHub Actions workflow triggers only on `v*` tags.

### 4. Monitor the Automated Workflow

**Goal:** confirm the release builds and publishes successfully.

After pushing the tag, the [Release workflow](.github/workflows/release.yml) triggers automatically.

1. Open `https://github.com/frostmute/Tetromino/actions`.
2. Find the `Release` workflow run for your tag.
3. Watch for these steps:
   - Checkout with full history (`fetch-depth: 0`).
   - Node 20 setup with `npm` caching.
   - `npm ci` for clean dependency install.
   - `npm test` (second safety net).
   - `npm run build` (production bundle).
   - Manifest version verification: the workflow extracts the tag version and confirms `manifest.json` matches. **If this step fails, the workflow aborts.**
   - Plugin ZIP packaging: `dist/Tetromino-<version>.zip`.
   - Release notes extraction from `CHANGELOG.md`.
   - GitHub Release creation with `softprops/action-gh-release@v2`.

**Typical runtime:** ~45–90 seconds.

**What to do if the workflow fails:**
- Read the failing step's logs.
- If it's a test failure, fix locally, amend the commit (if not yet tagged), or prepare a hotfix.
- If it's a version mismatch, double-check that `manifest.json` was updated by `version-bump.mjs`.
- If the release was created but is broken, delete the GitHub Release and the tag, fix the issue, and re-tag.

### 5. Verify the GitHub Release

**Goal:** confirm the published artifact is correct.

1. Navigate to `https://github.com/frostmute/Tetromino/releases/tag/v<version>`.
2. Verify the release notes match the `CHANGELOG.md` section for this version.
3. Download `Tetromino-<version>.zip`.
4. Extract it and confirm:
   - Exactly three files: `main.js`, `manifest.json`, `styles.css`.
   - `manifest.json` contains `"version": "<version>"`.
   - `main.js` starts with the expected plugin header (`Arena Sync for Obsidian`).
   - `styles.css` is non-empty and begins with the plugin styles header.
5. Verify no extra files (source maps, `.DS_Store`, `node_modules`, etc.) are included.

```bash
# Quick verification script
VERSION="1.1.0"
gh release download "v${VERSION}" --repo frostmute/Tetromino --pattern "Tetromino-${VERSION}.zip"
unzip -l "Tetromino-${VERSION}.zip"
```

### 6. Post-Release Tasks

- **Update `README.md`** if new features warrant a highlight (e.g., add to the "Release History" section).
- **Monitor GitHub Issues** for 48–72 hours for regression reports.
- **Announce** the release on relevant channels (GitHub Discussions if enabled, social media, Are.na channel).
- **Check the Obsidian registry** (see next section) if this is a new listing.

---

## Common Mistakes and How to Avoid Them

| Mistake | Why It Happens | How to Avoid |
|---------|----------------|--------------|
| **Tag pushed before `manifest.json` is updated** | Forgetting to run `version-bump.mjs` after `npm version` | Always use `npm run release`, which calls `version-bump.mjs` automatically. If doing it manually, run `node version-bump.mjs` before committing. |
| **Version mismatch between tag and `manifest.json`** | Tag `v1.2.0` pushed but `manifest.json` still says `1.1.0` | The CI workflow enforces this check and will fail. Fix locally, delete the bad tag, and re-tag. |
| **CHANGELOG not updated before tagging** | Rushing the release | Make updating `CHANGELOG.md` part of your PR workflow, not just at release time. The `[Unreleased]` section should always be current. |
| **Dirty working tree blocks `release.sh`** | Uncommitted debug logs or local config | Run `git status` before `npm run release`. Stash or commit everything. |
| **Wrong branch (`feature/*` instead of `main`)** | Context switching between branches | `release.sh` checks the branch and aborts if not `main`. Always pull latest before starting. |
| **Forgetting to push the tag** | `git push origin main` only pushes the commit | The tag is a separate ref. Use `git push origin v<version>` or `git push origin --tags`. `release.sh` does both. |
| **Including source files in the ZIP** | Incorrect `zip` command or packaging script error | `scripts/package.mjs` is a pure-Node packager that explicitly includes only `main.js`, `manifest.json`, and `styles.css`. Do not manually run `zip -r`. |
| **Not on latest `main`** | Local `main` is behind `origin/main` | `release.sh` runs `git pull --rebase origin main` at the start. If rebasing fails, resolve conflicts before proceeding. |

### Recovering from a Bad Tag

If you pushed a tag with a mistake (wrong version, missing files, broken build):

```bash
# 1. Delete the local tag
git tag -d v1.1.0

# 2. Delete the remote tag
git push --delete origin v1.1.0

# 3. Fix the issue locally (amend commit if needed)
git commit --amend --no-edit

# 4. Re-tag and push
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin main
git push origin v1.1.0
```

> **Caution:** Deleting a published tag that has a GitHub Release attached will orphan the release. Delete the GitHub Release first via the web UI or `gh release delete v1.1.0`.

---

## Testing a Release Candidate in a Test Vault

Before tagging a release — especially for minor or major bumps — test the built plugin in a real Obsidian vault.

### Setup a Test Vault

1. Create a new folder for your test vault (e.g., `~/Obsidian-Test-Vaults/Tetromino-RC/`).
2. Open it in Obsidian as a new vault.
3. Inside the vault, create the plugin folder:
   ```
   .obsidian/plugins/tetromino/
   ```

### Install the Release Candidate

```bash
# Build the production bundle
npm run build

# Copy the three required files to the test vault
PLUGIN_DIR="$HOME/Obsidian-Test-Vaults/Tetromino-RC/.obsidian/plugins/tetromino"
mkdir -p "$PLUGIN_DIR"
cp main.js manifest.json styles.css "$PLUGIN_DIR/"
```

### Test Checklist

Open Obsidian, enable the plugin in **Settings → Community Plugins → Tetromino**, and run through:

| Feature | What to Check |
|---------|---------------|
| **Settings persistence** | Change a setting, reload Obsidian, verify it sticks. |
| **Channel mapping** | Add a mapping, save, reload, verify mapping is present. |
| **Dry-run import** | Run a dry-run on a mapped channel. Verify the diff modal shows expected changes without writing files. |
| **Full import** | Run a real import. Verify notes are created in the correct folder. |
| **Attachment handling** | Test with `download` mode. Verify images/attachments land in the configured folder. |
| **Enrichment features** | Enable banner frontmatter, block comments, connected channels. Verify output in generated notes. |
| **Sync summary** | After import, verify the summary modal lists created, updated, skipped, and moved files correctly. |
| **Error handling** | Temporarily use an invalid token. Verify a user-friendly error notice appears. |
| **Performance** | Time a large channel import. Check Obsidian DevTools (`Cmd+Opt+I`) for `console.timeEnd` labels. |

### Automated Build-to-Vault Script

For frequent testing, add a convenience script to `package.json`:

```json
{
  "scripts": {
    "deploy:test": "npm run build && cp main.js manifest.json styles.css ~/Obsidian-Test-Vaults/Tetromino-RC/.obsidian/plugins/tetromino/"
  }
}
```

Run `npm run deploy:test` after every code change to refresh the test vault instantly.

---

## Handling Urgent Hotfixes

A **hotfix** is a patch release that fixes a critical bug discovered in production. It bypasses the normal feature-development cycle.

### Hotfix Workflow

```bash
# 1. Create a hotfix branch from the last release tag
git checkout -b hotfix/critical-bug v1.1.0

# 2. Fix the bug with a minimal, focused change
#    (edit files, add tests)

# 3. Commit
git add .
git commit -m "fix: resolve critical bug (description)"

# 4. Merge back to main
git checkout main
git merge hotfix/critical-bug --no-ff

# 5. Run the normal release flow for a patch version
npm run release   # select "patch"
```

### Hotfix Principles

- **Minimal change:** only fix the bug. Do not refactor, add features, or clean up debt.
- **Test first:** write a regression test that fails before the fix and passes after.
- **Fast path:** the goal is to ship within hours, not days.
- **Communicate:** label the PR and release notes clearly as a hotfix so users know to upgrade urgently.

### Emergency Bypass (Only if `release.sh` Is Broken)

If `scripts/release.sh` itself is broken or you need to ship faster than the script allows:

```bash
# Manual hotfix (assumes tests and lint already pass)
npm version patch --no-git-tag-version
node version-bump.mjs
npm run build
# Manually edit CHANGELOG.md
git add package.json package-lock.json manifest.json versions.json CHANGELOG.md
git commit -m "chore(release): v1.1.1"
git tag -a v1.1.1 -m "Release v1.1.1"
git push origin main
git push origin v1.1.1
```

> **Only use this bypass in true emergencies.** The automated script exists to prevent human error.

---

## Post-Release Verification Steps

After the GitHub Actions workflow completes and the release is live, perform these final checks.

### Immediate Verification (within 1 hour)

- [ ] GitHub Release page loads without errors: `https://github.com/frostmute/Tetromino/releases/tag/v<version>`
- [ ] Release notes are readable and match `CHANGELOG.md`.
- [ ] Four assets are attached: `main.js`, `manifest.json`, `styles.css`, `Tetromino-<version>.zip`.
- [ ] ZIP file can be downloaded and extracted.
- [ ] Extracted ZIP contains exactly three files (no extras).
- [ ] `manifest.json` version matches the tag.

### Short-Term Monitoring (24–72 hours)

- [ ] No new GitHub Issues labeled `regression` or `bug` referencing the new version.
- [ ] CI status badge on `README.md` is green.
- [ ] If this is a new Obsidian registry listing, check that the PR to `obsidianmd/obsidian-releases` is open and passing checks.

### Long-Term Housekeeping

- [ ] Archive superseded releases as pre-release if they have known critical bugs.
- [ ] Update the "Release History" section in `README.md` when a new major or minor version ships.
- [ ] Reflect any process changes back into `.github/RELEASE_CHECKLIST.md` and this guide.

---

## How the Automated Workflow Works

The release pipeline is fully automated after the tag is pushed.

### Workflow File

`.github/workflows/release.yml`

### Trigger

```yaml
on:
  push:
    tags:
      - "v*"
```

Any tag starting with `v` triggers the workflow. Tags without `v` are ignored.

### Steps

| Step | Purpose | Failure Mode |
|------|---------|--------------|
| `actions/checkout@v4` | Clone repo with full history for changelog extraction | Network issues |
| `actions/setup-node@v4` | Install Node 20 with `npm` caching | Cache corruption |
| `npm ci` | Clean install of dependencies | `package-lock.json` mismatch |
| `npm test` | Run full test suite | Test or coverage failure |
| `npm run build` | TypeScript compile + esbuild bundle | Build error |
| **Manifest verification** | Assert `manifest.json` version equals tag version | Version mismatch (fatal) |
| **Package plugin ZIP** | Create `dist/Tetromino-<version>.zip` | Missing build artifacts |
| **Generate release notes** | Extract version section from `CHANGELOG.md` | Missing changelog section |
| **Create GitHub Release** | Publish release with `softprops/action-gh-release@v2` | Token permissions |

### What the Workflow Produces

- A GitHub Release named after the tag (e.g., `v1.1.0`).
- Release body populated from `CHANGELOG.md` (the section matching the version number).
- Attached assets:
  - `main.js` — the esbuild production bundle.
  - `manifest.json` — plugin metadata.
  - `styles.css` — plugin styles.
  - `Tetromino-<version>.zip` — the full plugin package for manual installation.

### Pre-Release Support

If the version string contains a hyphen (e.g., `v1.2.0-beta.1`), the workflow marks the GitHub Release as a **pre-release** automatically:

```yaml
prerelease: ${{ contains(steps.version.outputs.version, '-') }}
```

This is useful for beta testing before a stable release.

---

## Obsidian Community Plugin Registry

### First-Time Listing

If Tetromino is not yet in the Obsidian community plugin list:

1. Fork [`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases).
2. Append the Tetromino manifest entry to `community-plugins.json`:
   ```json
   {
     "id": "Tetromino",
     "name": "Tetromino",
     "author": "frostmute",
     "description": "One-way import from Are.na channels into your Obsidian vault as Markdown notes.",
     "repo": "frostmute/Tetromino"
   }
   ```
3. Open a PR from your fork to `obsidianmd:master`.
4. Once merged, future releases are picked up automatically by the Obsidian updater.

> **Current status:** Tetromino is **not yet listed** in `obsidianmd/obsidian-releases`. A fork branch (`add-tetromino-plugin`) exists and is ready for PR. Manual PR creation may be required due to SSO restrictions.

### Subsequent Releases

No registry action is needed after the initial listing. The Obsidian community plugin updater polls GitHub releases and picks up new versions automatically within a few hours.

### Registry Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| New version not appearing in Obsidian | Updater lag (up to 24 hours) | Wait. If still missing after 24h, verify the tag follows `v*` format and the release is not a draft. |
| PR rejected | `community-plugins.json` format error | Validate your JSON with `jq`. Ensure all required fields are present. |
| PR blocked by CI | Upstream workflow requirements | Check the PR status page; usually a rebase on latest upstream `master` fixes it. |

---

## Emergency Procedures

### Rollback a Release

If a release is catastrophically broken and you need to pull it back immediately:

1. **Delete the GitHub Release:**
   ```bash
   gh release delete v1.1.0 --repo frostmute/Tetromino
   ```

2. **Delete the tag:**
   ```bash
   git push --delete origin v1.1.0
   git tag -d v1.1.0
   ```

3. **Announce the rollback** in GitHub Issues or Discussions so users know not to install it.

4. **Prepare the fix** as a hotfix (see [Handling Urgent Hotfixes](#handling-urgent-hotfixes)) and ship a new patch version.

### Rebuilding a Release Without a New Version

If the build artifact was corrupted but the code is correct, you can regenerate the release assets without bumping the version:

1. Delete the broken release and tag.
2. Re-run the build locally:
   ```bash
   npm run build
   npm run package
   ```
3. Re-create the tag at the same commit:
   ```bash
   git tag -a v1.1.0 -m "Release v1.1.0"
   git push origin v1.1.0
   ```

The workflow will rebuild and republish.

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│  TETROMINO RELEASE QUICK REFERENCE                          │
├─────────────────────────────────────────────────────────────┤
│  1. git checkout main && git pull --rebase origin main      │
│  2. git status  (must be clean)                             │
│  3. Review CHANGELOG.md [Unreleased]                        │
│  4. npm run lint && npm test && npm run build               │
│  5. npm run release  (follow prompts)                       │
│  6. Watch: https://github.com/frostmute/Tetromino/actions   │
│  7. Verify: https://github.com/frostmute/Tetromino/releases │
│  8. Monitor GitHub Issues for 48h                           │
└─────────────────────────────────────────────────────────────┘
```

---

*Last updated: 2026-06-26*

For the machine-readable checklist, see `.github/RELEASE_CHECKLIST.md`.
For the playbook that originally defined this process, see `.maestro/playbooks/Initiation/Phase-06-Release-Procedures.md`.

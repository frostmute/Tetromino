# Release Checklist

Use this checklist for every Tetromino release to ensure nothing is missed.

---

## 1. Pre-Release Preparation

- [ ] Review the `[Unreleased]` section in `CHANGELOG.md` and ensure all significant changes are documented.
- [ ] Cross-reference merged PRs since the last release and add any missing CHANGELOG entries.
- [ ] Group changes by category: **Added**, **Changed**, **Fixed**, **Removed**, **Security**, **Tests**.
- [ ] Determine the next version number using [Semantic Versioning](https://semver.org/):
  - **Patch** (`1.0.x`): Bug fixes and non-breaking changes only.
  - **Minor** (`1.x.0`): New features, backward compatible.
  - **Major** (`x.0.0`): Breaking changes (settings format, note structure, API).
- [ ] Ensure you are on the `main` branch with a clean working tree:
  ```bash
  git checkout main
  git pull --rebase origin main
  git status
  ```

## 2. Quality Gate

Run all quality checks and verify they pass:

```bash
npm run lint       # Expected: zero errors
npm test           # Expected: all test suites pass
npm run build      # Expected: TypeScript compiles, esbuild bundles
npm run package    # Expected: dist/Tetromino-<version>.zip created
```

- [ ] `npm run lint` passes with zero errors.
- [ ] `npm test` passes (296+ tests across 15+ suites).
- [ ] `npm run build` succeeds with no TypeScript errors.
- [ ] `npm run package` creates `dist/Tetromino-<version>.zip` containing exactly:
  - `main.js`
  - `manifest.json`
  - `styles.css`
- [ ] (Optional) Load the built plugin in a test Obsidian vault and verify critical paths (import, dry-run, settings).

## 3. Version Bump

- [ ] Run the release script:
  ```bash
  npm run release
  # or
  bash scripts/release.sh
  ```
- [ ] Select the appropriate bump type (`patch`, `minor`, `major`, or `custom`).
- [ ] Verify the script updated:
  - `package.json` → new version
  - `package-lock.json` → new version
  - `manifest.json` → new version
  - `versions.json` → new version appended with `minAppVersion`
- [ ] Move all `[Unreleased]` entries in `CHANGELOG.md` to a new `## [<version>] — YYYY-MM-DD` section.
- [ ] Insert an empty `## [Unreleased]` header above the new version section.
- [ ] Update comparison links at the bottom of `CHANGELOG.md`.
- [ ] Commit the version files:
  ```bash
  git add package.json package-lock.json manifest.json versions.json CHANGELOG.md
  git commit -m "chore(release): v<version>"
  ```
- [ ] Create an annotated tag:
  ```bash
  git tag -a v<version> -m "Release v<version>"
  ```
- [ ] Push the commit and tag:
  ```bash
  git push origin main
  git push origin v<version>
  ```

## 4. Automated Release Workflow

- [ ] Confirm the GitHub Actions **Release** workflow triggers automatically on the `v*` tag push.
- [ ] Monitor the workflow run at: `https://github.com/frostmute/Tetromino/actions`
- [ ] Verify the workflow completes successfully (lint → test → build → manifest verification → package → GitHub release creation).
- [ ] Confirm the GitHub Release is published with:
  - Release notes extracted from `CHANGELOG.md`
  - Assets attached: `main.js`, `manifest.json`, `styles.css`, `Tetromino-<version>.zip`

## 5. Release Verification

- [ ] Download `Tetromino-<version>.zip` from the GitHub Release.
- [ ] Extract it and verify contents:
  - Exactly 3 files: `main.js`, `manifest.json`, `styles.css`
  - `manifest.json` contains `"version": "<version>"`
  - `main.js` is a valid esbuild production bundle
  - `styles.css` is present and non-empty
- [ ] Verify no extraneous files or build artifacts are included.

## 6. Obsidian Community Plugin Registry

- [ ] Check if the plugin is already listed in [`obsidianmd/obsidian-releases`](https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json).
- [ ] If **not listed**, submit a PR adding the Tetromino entry to `community-plugins.json`:
  - Fork `obsidianmd/obsidian-releases`.
  - Append the Tetromino manifest entry to `community-plugins.json`.
  - Open a PR from `<your-fork>:add-tetromino-plugin` → `obsidianmd:master`.
  - Example manual URL: `https://github.com/obsidianmd/obsidian-releases/compare/master...frostmute:add-tetromino-plugin?expand=1`
- [ ] If **already listed**, no registry action is needed — the Obsidian updater will pick up the new release automatically within a few hours.

## 7. Post-Release Tasks

- [ ] **Announce**: Create a GitHub Discussions post (if enabled) or share the release on social channels.
- [ ] **README**: Update `README.md` if new features warrant highlighting (e.g., add to "Release History" section).
- [ ] **Monitor**: Watch GitHub Issues for regression reports related to the new release.
- [ ] **Hotfix readiness**: If critical bugs are found, create a `hotfix/<description>` branch from the release tag and ship a patch version immediately.
- [ ] **Archive**: If a previous release is now fully superseded, mark it as pre-release in GitHub.

## 8. Documentation

- [ ] Update this checklist if the release process changes (new tools, new registry requirements, new quality gates).
- [ ] Update `CLAUDE.md` / `AGENTS.md` if agent-specific workflow steps change.

---

## Quick Reference: One-Liner Commands

```bash
# Full quality gate
npm run lint && npm test && npm run build && npm run package

# Interactive release (lint, test, bump, build, commit, tag, push)
npm run release

# Manual tag + push (if not using release.sh)
git tag -a v1.x.x -m "Release v1.x.x"
git push origin main && git push origin v1.x.x
```

## Emergency Hotfix (bypassing release.sh)

If a critical bug is found post-release and you need to ship a patch immediately:

```bash
git checkout -b hotfix/critical-bug v<last-release-tag>
# Fix the bug, commit
git add .
git commit -m "fix: describe the critical bug fix"
# Merge to main, then run the normal release flow for a patch version
git checkout main
git merge hotfix/critical-bug --no-ff
npm run release  # select patch
```

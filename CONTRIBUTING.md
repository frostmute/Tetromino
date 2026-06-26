# Contributing

Thanks for contributing to `Tetromino`.

## Scope and product behavior

This plugin is intentionally **one-way import only**:

- Supported: Are.na -> Obsidian import
- Out of scope: Obsidian -> Are.na push/sync

Please keep changes aligned with that behavior unless maintainers explicitly decide otherwise.

## Setup

```bash
git clone https://github.com/frostmute/Tetromino.git
cd Tetromino
npm install
```

Development build:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Build output includes:
- `main.js` in repo root
- `dist/<plugin-id>-<version>.zip` packaged release artifact

## Feature branch workflow

Follow this process when developing a feature, bug fix, or any code change:

### 1. Create a branch

Branch from `main` using a descriptive name with the appropriate prefix:

```bash
git checkout main
git pull origin main
git checkout -b feature/<short-description>   # new functionality
# or
git checkout -b bugfix/<short-description>     # bug fixes
# or
git checkout -b chore/<short-description>      # maintenance, docs, CI
```

Keep each branch focused on a **single logical change**. If a feature touches multiple areas, consider whether it should be split into sequential PRs.

### 2. Develop and validate locally

Write your code, then run the quality checks before every commit:

```bash
npm run lint:fix   # auto-fix formatting issues
npm run lint       # verify no remaining lint errors
npm test           # run Jest tests with coverage
npm run build      # type-check (tsc) + production bundle + package
```

All three commands must pass cleanly. CI runs the same checks (lint, test across Node 18/20/22, build) and will block merge on failure.

### 3. Commit with clear messages

Write concise, descriptive commit messages. Use conventional prefixes when appropriate:

```
feat: add pagination to channel list
fix: handle 429 rate-limit response in API client
chore: update eslint config for test files
docs: add feature branch workflow to CONTRIBUTING
```

### 4. Push and open a PR

```bash
git push origin feature/<short-description>
```

Open a pull request targeting `main`. In the PR description:

- Summarize **what** changed and **why**.
- Reference any related issues (e.g., `Closes #42`).
- Note any settings, behavior, or API changes.

### 5. Address review and merge

- Respond to code review comments and push follow-up commits.
- Ensure all CI checks (lint, test, build) pass on the PR.
- Once approved and green, merge via GitHub (squash-merge recommended for single-feature branches).

## Quality checks

Before opening a PR:

```bash
npm run lint
npm test
npm run build
```

## Pull request checklist

Use this checklist as a mental reference before opening a PR. Reviewers will
check the same items.

### Required

- [ ] **Focused scope** — the PR addresses a single logical change. Split
  unrelated fixes into separate PRs.
- [ ] **TypeScript compiles** — `npm run build` passes (runs `tsc -noEmit`,
  esbuild bundle, and package step).
- [ ] **Linter passes** — `npm run lint` reports no errors. Run `npm run lint:fix`
  first to auto-fix formatting issues.
- [ ] **Tests pass** — `npm test` passes with no regressions. New behavioral
  code should include tests; CI runs the suite across Node 18, 20, and 22.
- [ ] **Changelog updated** — add an entry under `[Unreleased]` in
  `CHANGELOG.md` using the appropriate subsection (`Added`, `Changed`,
  `Fixed`, `Removed`) per [Keep a Changelog](https://keepachangelog.com/).

### When applicable

- [ ] **Docs updated** — if the PR changes user-facing behavior, update
  `README.md` (feature/setting descriptions), settings help text in
  `settings-tab.ts`, and any other affected docs.
- [ ] **Settings in sync** — keep the settings UI help text, `README.md`
  feature list, and `CHANGELOG.md` consistent when adding or modifying
  settings.
- [ ] **Security considerations** — changes touching API tokens, file paths,
  or user-generated content should be reviewed against the patterns in
  `src/securityUtils.ts` (XSS sanitization, path traversal prevention,
  token masking).
- [ ] **Migration impact** — if the PR changes file naming, folder structure,
  or stored settings, verify that `src/migration.ts` handles the transition
  or add migration logic.

### PR description

When opening the PR, include:

- **What** changed and **why**.
- Related issues (e.g., `Closes #42`).
- Any settings, API, or behavior changes.
- Screenshots or console output if the change is visual or affects logging.

## Scripts and pre-commit validation

The `scripts/` directory contains build and release tooling. There are **no
automated git hooks** installed — pre-commit validation is manual. Run the
quality checks described below before every commit.

### Pre-commit checklist

Run these commands locally before pushing any commit:

```bash
npm run lint:fix   # auto-fix formatting issues
npm run lint       # verify no remaining lint errors
npm test           # Jest tests with coverage (Node 18/20/22 in CI)
npm run build      # tsc type-check + esbuild bundle + package
```

All four must pass cleanly. CI runs the same gates and will block merge on
failure. If you want to automate this, you can add a local git pre-commit hook:

```bash
# .git/hooks/pre-commit (make executable with chmod +x)
#!/usr/bin/env bash
set -euo pipefail
npm run lint
npm test -- --watchAll=false
```

### Script inventory

| Script | File | Purpose |
|--------|------|---------|
| `npm run dev` | `esbuild.config.mjs` | Watch mode build; auto-deploys to local vault(s) via `copy-to-vault.mjs` (skipped in CI) |
| `npm run build` | `esbuild.config.mjs` | `tsc -noEmit -skipLibCheck` → esbuild production bundle → `scripts/package.mjs` |
| `npm run package` | `scripts/package.mjs` | Zero-dependency ZIP packager — bundles `main.js`, `manifest.json`, `styles.css` into `dist/<plugin-id>-<version>.zip` using a hand-rolled ZIP writer (no system `zip` needed) |
| `npm run release` | `scripts/release.sh` | Interactive release workflow (see below) |
| `npm version` | `version-bump.mjs` | Lifecycle hook — syncs the new version from `package.json` into `manifest.json` and `versions.json` |
| — | `scripts/copy-to-vault.mjs` | Copies build artifacts to local Obsidian vault(s) for testing. Called automatically by the dev build's `watch-deploy` esbuild plugin. Skipped when `CI=true`. |
| — | `scripts/record-demo.sh` | Records a demo GIF of the plugin using `ffmpeg` + `gifsicle`. Not part of the build or release pipeline. |

### Version-bumping logic (`version-bump.mjs`)

When `npm version <patch|minor|major>` is run, npm triggers the `version`
lifecycle script defined in `package.json`:

```
"version": "node version-bump.mjs && git add manifest.json versions.json"
```

`version-bump.mjs` reads `process.env.npm_package_version` (set by npm) and:

1. Updates `manifest.json` → sets `version` to the new value (preserves
   `minAppVersion`).
2. Updates `versions.json` → adds a `{ "<new-version>": "<minAppVersion>" }`
   entry (Obsidian uses this file to determine plugin compatibility).
3. Stages both files so they are included in the version commit.

## Release process

Releases are handled by `scripts/release.sh` (run via `npm run release`). The
script is interactive and must be run from a clean `main` branch.

### Pre-flight checks (automated by the script)

1. **Branch check** — must be on `main`; aborts otherwise.
2. **Clean working tree** — no uncommitted or staged changes.
3. **Pull latest** — runs `git pull --rebase origin main`.

### Release steps

1. **Choose bump type** — the script prompts for patch / minor / major / custom
   version.
2. **Quality gates** — runs `npm run lint` and `npm test`; aborts on failure.
3. **Bump version** — calls `npm version <bump> --no-git-tag-version`, then
   manually invokes `version-bump.mjs` to sync `manifest.json` and
   `versions.json`.
4. **Production build** — runs `npm run build` (type-check + bundle + package).
5. **Commit** — stages `package.json`, `manifest.json`, `versions.json` and
   commits with `chore(release): v<version>`.
6. **Tag** — creates annotated tag `v<version>`.
7. **Push** — pushes the commit and tag to `origin main`.

### What happens after push

The `v*` tag push triggers `.github/workflows/release.yml`, which:

1. Installs dependencies and runs tests + production build.
2. **Verifies version** — extracts the version from the git tag and confirms it
   matches `manifest.json`. Fails if mismatched.
3. **Packages** — creates `dist/<plugin-id>-<version>.zip` containing
   `main.js`, `manifest.json`, `styles.css`.
4. **Extracts release notes** — pulls the matching version section from
   `CHANGELOG.md`. Falls back to a generic message if no section is found.
5. **Creates GitHub Release** — attaches the individual files and the zip.
   Pre-release is auto-detected from semver pre-release identifiers (e.g.,
   `v1.1.0-beta.1`).

### Maintainer release checklist

Before running `npm run release`, verify:

- [ ] All features/fixes for this release are merged to `main`.
- [ ] `CHANGELOG.md` has a `## [X.Y.Z] — YYYY-MM-DD` section with accurate
  release notes under the correct subsections (`Added`, `Changed`, `Fixed`,
  etc.). Move items from `[Unreleased]` into the new version section.
- [ ] The comparison link at the bottom of `CHANGELOG.md` is updated:
  `[X.Y.Z]: https://github.com/frostmute/Tetromino/compare/v<prev>...v<new>`.
- [ ] `manifest.json` → `minAppVersion` is correct for any new Obsidian API
  usage.
- [ ] `npm run lint && npm test && npm run build` all pass locally.
- [ ] Working tree is clean (`git status` shows nothing to commit).

After the release:

- [ ] Verify the GitHub Release was created with the correct assets and notes.
- [ ] Install the released zip in a test vault and confirm the plugin loads.
- [ ] If this is a community plugin submission, update the Obsidian plugin
  registry PR if applicable.

## Coding notes

- TypeScript with strict checks
- Use `import type` for type-only imports
- Avoid silent failures; propagate or log actionable errors
- Preserve existing style and file structure unless a refactor is part of the change

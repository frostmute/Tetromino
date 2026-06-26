# Phase 06: Release Procedures and Versioning

This phase guides maintainers through the complete release process for Tetromino, from version bumping and changelog management through building artifacts and publishing to the Obsidian plugin ecosystem.

## Tasks

- [x] Review release infrastructure and existing procedures: Examine the following files to understand the release process:
  - `.github/workflows/release.yml`: Automated release workflow (triggers on version tag)
  - `scripts/release.sh`: Shell script that coordinates the release process
  - `version-bump.mjs`: Node script that bumps version in manifest.json and versions.json
  - `.github/release-template.md`: Template for GitHub release notes
  - `CHANGELOG.md`: Maintained changelog with version history and unreleased section
  - Review the last 2-3 releases to understand patterns and conventions

  **Notes:**
  - `release.yml` triggers on `v*` tags, runs tests/build, verifies manifest version matches tag, packages `dist/Tetromino-<version>.zip`, generates release notes from CHANGELOG, and publishes via `softprops/action-gh-release@v2`.
  - `release.sh` enforces `main` branch + clean working tree, runs lint/tests, prompts for patch/minor/major/custom bump, runs `npm version`, executes `version-bump.mjs`, builds, commits, tags, and pushes.
  - `version-bump.mjs` updates `manifest.json` version and appends to `versions.json` with `minAppVersion`.
  - `scripts/package.mjs` is a pure-Node ZIP packager (no system `zip` dependency) that creates `dist/<plugin-id>-<version>.zip` containing `main.js`, `manifest.json`, `styles.css`.
  - Release template includes installation instructions, checksum placeholders, and links to project board + changelog.
  - CHANGELOG follows Keep a Changelog format. Only one release exists so far: **v1.0.0 — 2025-01-15**. The `[Unreleased]` section is substantial, indicating a minor or major bump may be warranted for the next release.
  - Current version across `package.json`, `manifest.json`, and `versions.json` is **1.0.0**.
  - No local git tags exist yet.

- [x] Prepare release notes from changelog entries: Before starting a release:
  - Review `CHANGELOG.md` and the `[Unreleased]` section to see what's been done since last release
  - Group changes by category: Added (new features), Fixed (bug fixes), Changed (breaking changes), Deprecated, Security
  - Ensure all PRs since last release have corresponding CHANGELOG entries
  - Check that all issues resolved by unreleased changes are marked with the next version milestone
  - Create a draft release summary that will become the GitHub release notes

  **Notes:**
  - Reviewed the `[Unreleased]` section in `CHANGELOG.md`. It contains 38 Added/Changed/Fixed/Removed/Test entries since v1.0.0 (2025-01-15).
  - Cross-referenced 42 merged PRs against the CHANGELOG and identified several missing entries:
    - **Security fixes** not previously documented: SSRF (PR #34), directory traversal (PR #40), API token leak in error logging (PR #5).
    - **Performance improvements** not previously documented: concurrent channel syncing, bounded-concurrency block fetching, batch API `pMap` optimization, N+1 query elimination for channel images and block details, O(1) `SyncRecords` lookup.
    - **Code-health changes** not previously documented: replaced direct `console` calls with internal logging (PR #39).
  - Updated `CHANGELOG.md` to include all significant missing entries under the appropriate categories (`Fixed`, `Changed`).
  - No version milestone exists in GitHub Issues yet; this will be addressed in the next task (version determination).
  - Created a comprehensive draft release summary at `.maestro/playbooks/Working/draft-release-notes-v1.1.0.md` with:
    - Executive summary paragraph.
    - "New Features" section (12 major feature areas).
    - "Bug Fixes" section (18 fixes).
    - "Performance Improvements" section (5 optimizations).
    - "Other Changes" section.
    - "Tests" section.
    - "Contributors" section.
    - "Migration Guide" confirming backward compatibility.

- [x] Determine the next version number using semantic versioning: Analyze changes to decide on version bump:
  - Patch version (1.0.x): Only bug fixes and non-breaking changes
  - Minor version (1.x.0): New features, but backward compatible
  - Major version (x.0.0): Breaking changes (changes to note structure, API, settings format)
  - Tetromino is at v1.0.0, so follow semantic versioning strictly to signal stability
  - Document the reasoning for the version bump (what changed that necessitates this version?)

  **Notes:**
  - Analyzed 38 unreleased entries across `Added`, `Changed`, `Fixed`, `Removed`, and `Tests` sections in `CHANGELOG.md`.
  - **11 new features** (sync summary, overview note, attachment migration, channel management tools, banner frontmatter, block enrichment, channel index enhancements, background sync, etc.) necessitate a **minor** bump rather than patch.
  - **18 bug fixes** and **2 security patches** (SSRF, directory traversal, token leaks) support the bump but alone would only warrant a patch.
  - **No breaking changes** were identified; existing vaults and mappings remain fully compatible. Default folder resolution and optional mapping folders are backward compatible.
  - **Determined version: 1.1.0** — signals new functionality while maintaining stability.
  - Full reasoning documented in `.maestro/playbooks/Working/version-determination-v1.1.0.md`.
  - Draft release notes at `.maestro/playbooks/Working/draft-release-notes-v1.1.0.md` updated to confirm `1.1.0` as the target version.

- [ ] Run full quality gate before release: Execute all checks to ensure release quality:
  - Run `npm run lint` and verify zero lint errors
  - Run `npm test` and verify all tests pass with adequate coverage
  - Run `npm run build` and verify TypeScript compilation succeeds with no errors
  - Run `npm run package` and verify the dist artifact is created and contains main.js, manifest.json, styles.css
  - Verify the built plugin can be loaded in a test Obsidian vault
  - Manually test critical features (import, dry-run, settings) in the test vault

- [ ] Create and tag the release commit: Update version files and create the release:
  - Run `npm run version` which:
    - Updates version in manifest.json to the new version
    - Updates version in versions.json with the new version and release date
    - Runs version-bump.mjs to ensure consistency
    - Stages manifest.json and versions.json for commit
  - Move all `[Unreleased]` entries in CHANGELOG.md to a new `[<version>]` section with release date
  - Commit with message: `chore(release): v<version>` (e.g., `chore(release): v1.0.1`)
  - Tag the commit: `git tag -a v<version> -m "Release v<version>"` (e.g., `git tag -a v1.0.1 -m "Release v1.0.1"`)
  - Push the commit and tag: `git push origin main && git push origin v<version>`

- [ ] Trigger the automated release workflow: After pushing the tag:
  - The GitHub Actions workflow (`.github/workflows/release.yml`) automatically triggers on the version tag
  - The workflow runs lint, test, and build to verify the release quality
  - If all checks pass, the workflow creates a GitHub release with:
    - Release notes from `.github/release-template.md` (review and customize the notes)
    - Built artifact (Tetromino-<version>.zip) attached to the release
    - Release notes including the CHANGELOG entries for this version
  - Monitor the GitHub Actions run to ensure it completes successfully

- [ ] Create detailed release notes on GitHub: Once the automated release is created:
  - Edit the GitHub release notes to include:
    - Summary paragraph: what this release accomplishes
    - Section: New Features (with descriptions of each feature added)
    - Section: Bug Fixes (with descriptions of bugs resolved)
    - Section: Breaking Changes (if any, with migration guide)
    - Section: Thanks to Contributors (credit authors of PRs)
    - Highlight any major improvements or important changes
  - Ensure the release notes are clear to users who may not be familiar with internal details
  - Verify the release artifact (zip file) is properly attached

- [ ] Verify the release artifact is correct: Check the released artifact:
  - Download the Tetromino-<version>.zip from the GitHub release
  - Extract it and verify contents:
    - `main.js` is present and is the correct build for the version
    - `manifest.json` has the correct version number (e.g., "version": "1.0.1")
    - `styles.css` is present
    - No extraneous files or build artifacts are included
  - Test the zip: unzip it in a fresh directory and verify the plugin structure is correct

- [ ] Submit the release to Obsidian plugin registry (if applicable): For community plugins:
  - Verify the plugin is already listed in the Obsidian community plugins list (check obsidian.md registry)
  - If not listed, submit a PR to https://github.com/obsidianmd/obsidian-sample-plugin with plugin manifest and release info
  - If already listed, the registry automatically picks up new releases from GitHub (no additional action needed)
  - Wait for the release to appear in the Obsidian community plugins list (can take a few hours)

- [ ] Announce the release and document post-release tasks: After a successful release:
  - Create a GitHub Discussions post (if enabled) announcing the new release and highlighting key changes
  - Update the project README if there are new features to highlight
  - Monitor GitHub Issues for any regression reports related to the new release (be ready for hotfixes)
  - If critical bugs are found post-release, create a hotfix branch and release a patch version immediately
  - Archive old releases in GitHub (mark as pre-release if they're now superceded)

- [ ] Create a release checklist template for future releases: Document the complete process:
  - Create a `.github/RELEASE_CHECKLIST.md` file that lists all steps in order (setup, verify, version, tag, release, verify, announce)
  - Include the exact commands to run and what output to expect
  - Reference this checklist for every release to ensure nothing is missed
  - Update the checklist if the process changes (e.g., new tools, new registry requirements)

**By the end of this phase**, you will understand the complete release process, be able to ship a new version confidently, and have documented the procedure for future maintainers. Tetromino users will get timely, well-documented releases.

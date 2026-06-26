# Contributing

Thanks for contributing to `Tetromino`.

> **New to open source or this project?** Start with [FIRST_CONTRIBUTION.md](FIRST_CONTRIBUTION.md) — a step-by-step walkthrough from fork to merged PR.

All contributors are expected to adhere to our [Code of Conduct](../CODE_OF_CONDUCT.md). Please read it before participating.

## Good First Issues

Looking for a place to start? Issues labeled [`good first issue`](https://github.com/frostmute/Tetromino/labels/good%20first%20issue) are curated for new contributors. They are well-scoped, documented, and low-risk. Comment on an issue to claim it, and a maintainer will assign it to you.

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

## Debugging and local testing workflow

### Overview

Test plugin behavior in a real Obsidian vault environment to verify the plugin works correctly. This section covers loading the plugin, using preview imports, debugging logs, and verifying deterministic behavior.

### Prerequisites

1. **Install Obsidian**: Download and install [Obsidian](https://obsidian.md/download)

2. **Create a test vault**: Make a dedicated Obsidian vault for testing (avoid using your main vault):

   ```bash
   mkdir ~/Obsidian-TestVault
   cd ~/Obsidian-TestVault
   obsidian
   ```

3. **Get the built plugin**: Build the plugin once:

   ```bash
   npm run build
   ```

   The output files (`main.js`, `manifest.json`, `styles.css`) will be in the repository root.

### Loading the Plugin

1. **Copy the plugin files** to your test vault:

   ```bash
   cp main.js manifest.json styles.css ~/Obsidian-TestVault/.obsidian/plugins/Tetromino/
   ```
   Create the plugins directory if it doesn't exist:

   ```bash
   mkdir -p ~/Obsidian-TestVault/.obsidian/plugins/Tetromino
   ```

2. **Enable the plugin**: In Obsidian, go to Settings → Community Plugins → Enable **Tetromino**

3. **Set up the API token**: In plugin settings, add your Are.na API token and click "Verify"

4. **Add a channel mapping**: In settings, add at least one channel mapping (provide the channel slug from Are.na)

### Using Dry-Run (Preview) Commands

The plugin provides two dry-run preview commands:

1. **"Preview import (dry-run)"**: Preview imports of all configured channels
2. **"Preview current channel import (dry-run)"**: Preview import of the channel that the active file belongs to

#### How to use:

1. Open Obsidian and open any note file that's in a channel-mapped folder
2. Open Command Palette (`Ctrl/Cmd + P`)
3. Type "Preview current channel import (dry-run)"
4. The plugin will:
   - Fetch channel data from Are.na
   - Plan all file updates
   - Show a diff summary (no files are actually written)
   - Display a modal with actions like "download asset", "create file", "update file"

#### What to check in dry-run:

1. **No vault modifications**: Verify no files are created/modified
2. **Correct actions**: Check that actions like "download asset", "create file", "update file" are accurate
3. **Errors**: None should appear in console
4. **Determinism**: Run the same dry-run multiple times - output should be identical

### Debugging Logs

Enable debug logging in plugin settings:

1. Go to Settings → Tetromino
2. Enable "Debug logging"
3. Perform an import or dry-run
4. Open Obsidian developer console:
   - Press `Ctrl/Cmd + Shift + C` (Windows/Linux) or `Cmd + Option + C` (Mac)
   - Look for logs starting with `[arena-sync]`

#### Common debugging patterns:

```typescript
// In api.ts line 52 (debug log):
console.log(`[arena-sync] ${message}`, ...args);

// In api.ts line 57 (error log):
console.error(`[arena-sync] ${message}`, ...args);
```

### Verifying Deterministic Output

Tetromino's core promise is deterministic output: the same input should always produce the same output.

#### Steps to verify:

1. **Get stable channel data**: Ensure you're using the same Are.na channel (not varying parameters)
2. **Run imports multiple times**: Perform the same full import operation 3-5 times
3. **Compare outputs**: The generated Markdown files should be byte-for-byte identical
4. **Check timestamps**: Generated dates and timestamps should not cause non-deterministic behavior

#### How to check:

1. Use Obsidian's Git integration to track changes to the vault
2. After each import, run `git status` to see what changed
3. Compare output folders (`/Are.na/`) between runs
4. Verify import history (`Are.na/import-history.md`) for consistency

### Setting Up Test Fixtures

Create a test vault with:

1. **Existing notes**: Add some existing Markdown files to test conflict resolution
2. **Different file types**: Create files with various extensions to test import filtering
3. **Special characters**: Test files with Unicode, spaces, and special characters
4. **Different structures**: Mix of well-structured and malformed notes

### Troubleshooting Common Issues

#### Token verification fails:

1. Ensure token has "read" access
2. Verify token is copied correctly (no whitespace)
3. Wait a moment after setting, then click Verify

#### Dry-run shows errors:

1. Check console for error messages
2. Verify channel slug is correct in settings
3. Ensure channel still exists on Are.na
4. Check if channel is private (tokens may need additional permissions)

#### Imports fail partially:

1. Check API rate limits (Are.na limits requests)
2. Look for logs about specific channels failing
3. Try with a single, small channel first
4. Enable debug logging to track progress

### Integration Testing Checklist

- [ ] Plugin loads in test vault
- [ ] API token verification works
- [ ] Dry-run preview runs successfully
- [ ] Dry-run shows accurate planned actions
- [ ] Dry-run makes no vault changes
- [ ] Full imports work correctly
- [ ] Generated files are deterministic across multiple runs
- [ ] Console logs are informative and non-empty when debug is enabled
- [ ] Error handling works for invalid tokens/network issues
- [ ] Conflict resolution works with existing files

### Reproduction Steps for Bugs

To reproduce bugs effectively:

1. Enable debug logging
2. Run a specific action (dry-run or full import)
3. Record all console logs to a file
4. Note the exact time, channel, and action
5. Try running with different conditions (empty channel, large channel, mixed block types)
6. Share the logs when reporting bugs

By following this workflow, you can thoroughly test Tetromino locally before making changes, ensuring reliability and catching bugs early.

## Code style and patterns in Tetromino

### Overview

This document outlines the established code style and architectural patterns used throughout the Tetromino project. It serves as a reference for new contributors and provides consistency across the codebase.

### TypeScript Conventions

The project uses TypeScript with selective strictness. `tsconfig.json` enables
`noImplicitAny`, `strictNullChecks`, and `strictFunctionTypes`, but does **not**
set the blanket `"strict": true` flag.

#### Type-Only Imports

Use `import type` for imports that are only used for type annotations:

```typescript
// ✓ Correct - used only in type annotations
import type { ChannelMapping, SyncOptions } from "./types";

// ✓ Correct - used only for export type
export type { ChannelMapping, SyncOptions } from "./types";

// ✗ Incorrect - used for runtime values
import { ChannelMapping } from "./types";
```

#### Variable and Function Declarations

Preferred patterns from the codebase:

```typescript
// Class properties
private readonly settings: ArenaSyncSettings;
private isSyncing = false;

// Method parameters (object destructuring)
const { channelSlug, localFolder } = mapping;

// Private methods
private updateStatusBar(state: "idle" | "syncing", detail = ""): void

// Type guard functions
function isRecord(val: unknown): val is Record<string, unknown>
```

### Error Handling Patterns

#### Error Propagation

The plugin uses a consistent error handling approach:

```typescript
// ✓ Propagate error for caller to handle
async function fetchData(): Promise<Data> {
    const data = await this.api.request();
    if (!data) {
        throw new Error("Failed to fetch data");
    }
    return data;
}

// ✓ Log actionable error and propagate
try {
    await this.engine.syncChannel(mapping);
} catch (err) {
    new Notice(`Import failed: ${(err as Error).message}`);
    return;
}

// ✓ Return error in result object (for recoverable errors)
result.errors.push({
    blockId: block.id,
    channelSlug: mapping.channelSlug,
    message: error.message || String(error),
    recoverable: false,  // or true if recoverable
});
```

#### Error Object Structure

All sync errors use the `SyncError` shape defined in `src/types.ts`:

```typescript
interface SyncError {
    blockId: number | null;
    channelSlug: string;
    message: string;
    recoverable: boolean;
}
```

### Runtime Validation

Because the Are.na API returns loosely typed JSON, the codebase defensively
validates payloads at runtime rather than casting blindly:

```typescript
// src/api.ts — type guards and coercion helpers
function isRecord(val: unknown): val is Record<string, unknown> {
    return typeof val === "object" && val !== null && !Array.isArray(val);
}

function asNumber(val: unknown): number | null {
    const n = typeof val === "string" ? parseInt(val, 10) : val;
    return typeof n === "number" && !isNaN(n) ? n : null;
}
```

API responses are normalized through `unwrapData`, `normalizeChannel`, and
`normalizePaginatedResponse` so callers receive predictable shapes even when
the upstream format varies (v2 vs v3).

### Service/API Patterns

#### API Client → Sync Engine → Plugin Entry

The architecture follows a clear layer hierarchy:

```typescript
// src/api.ts - Low-level HTTP client, token management, rate limiting
class ArenaApi {
    private token: string;
    private debug: boolean;
    
    async request<T>(method: string, path: string, body?: unknown): Promise<T> { ... }
    async getChannel(slug: string): Promise<ArenaChannel> { ... }
    async getAllChannelBlocksWithProgress(slug: string, handler: ProgressHandler): Promise<ArenaBlock[]> { ... }
}

// src/sync-engine.ts - Business logic, file operations, deterministic behavior
class SyncEngine {
    private api: ArenaApi;
    private vault: Vault;
    
    async syncAll(options: SyncOptions = {}): Promise<SyncResult> { ... }
    async syncChannel(mapping: ChannelMapping, options: SyncOptions = {}): Promise<SyncResult> { ... }
}

// src/main.ts - Obsidian plugin entry point, UI commands, settings
export default class ArenaSyncPlugin extends Plugin {
    private api!: ArenaApi;
    private engine!: SyncEngine;
    
    async onload(): Promise<void> { ... }
    async runSync(dryRun = false): Promise<void> { ... }
}
```

#### Settings Patterns

Settings are managed through:

```typescript
// The settings-tab.ts component renders the UI
export class ArenaSyncSettingTab extends PluginSettingTab {
    plugin: ArenaSyncPlugin;
    
    display(): void {
        // Creates Setting objects for each configuration option
        new Setting(containerEl)
            .setName("API token")
            .addText((text) => {
                // Handle text input with password masking
            });
    }
}

// Settings are saved and reloaded by the parent plugin
async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.api = new ArenaApi(this.settings.apiToken, this.settings.debugLogging);
    this.engine = new SyncEngine(this.app, this.api, this.settings);
}
```

### Vault Mutation Patterns

#### Never Direct Mutations

Never directly mutate the vault. All import/reconciliation must go through the `SyncEngine`:

```typescript
// ✓ Correct - use sync-engine for all mutations
await this.engine.syncChannel(mapping, options);

// ✗ Incorrect - direct vault mutation
await this.vault.create(filePath, content);
await this.vault.modify(file, newContent);
```

#### Dry-Run Mode

Every mutating operation supports a `dryRun` flag. When `true`, the engine
plans and reports actions without touching the vault:

```typescript
const result: SyncResult = {
    created: 0, updated: 0, deleted: 0, moved: 0,
    skipped: 0, downloaded: 0, dryRun, actions: [],
    moves: [], fileDiffs: [], missingPaths: [], errors: [], duration: 0,
};

if (!dryRun) {
    await this.vault.create(notePath, markdown);
}
```

This pattern is applied consistently in `pullBlock`, `updateChannelIndex`,
`updateMasterOverview`, and `ensureBlockAsset`.

#### Use Normalization

Use `normalizePath` for path operations:

```typescript
// ✓ Correct - normalize paths
const normalized = normalizePath(path);

// ✗ Incorrect - manual path manipulation
const path1 = `Are.na/${channelId}`;
const path2 = `Are.na/${channelId}/`;
```

### Testing and Mocking Patterns

#### Test File Structure

```typescript
// src/__tests__/api.test.ts - API client tests
import { ArenaApi } from "../api";
import { jest } from "@jest/globals";

describe("ArenaApi", () => {
    let api: ArenaApi;
    
    beforeEach(() => {
        api = new ArenaApi("test-token", false);
        jest.mock("obsidian");
    });
    
    it("should handle token authentication", async () => {
        // API client tests
    });
});
```

#### Mocking Strategy

The tests use these mocking patterns:

1. **obsidian mock**: `src/__mocks__/obsidian.ts` provides stubs for Obsidian API
2. **Module-level mocking**: `jest.mock("../api")` for isolated testing
3. **Inline mocks**: `jest.mock("obsidian")` within specific test files

#### Test Coverage Expectations

- **Critical paths must be tested**: `api.ts`, `sync-engine.ts`, `utils.ts`
- **Dry-run feature**: Fully tested to ensure no vault mutations
- **Deterministic behavior**: Tested with same input repeated multiple times
- **Error handling**: Tested for all error cases (401, 403, 404, rate limits)

### Security Patterns

#### Token Handling

```typescript
// Token is stored in plugin settings with secure masking
new Setting(containerEl)
    .setName("API token")
    .addText((text) => {
        text.inputEl.type = "password";  // Mask in UI
        text.setValue(this.plugin.settings.apiToken);
    });
```

#### XSS Prevention

All user content is sanitized:

```typescript
// In securityUtils.ts - comprehensive sanitization
function sanitizeMarkdownContent(content: string): string {
    // Strip script tags, event handlers, javascript: protocol
    // Preserve wiki-links and markdown links
}
```

### Performance Patterns

#### Debouncing and Throttling

Use `pMap` for controlled concurrency:

```typescript
// Process mappings concurrently but limit concurrency
const results = await pMap(enabledMappings, 3, async (mapping) => {
    return await this.syncChannel(mapping, options);
});
```

#### Deterministic Change Detection

To guarantee reproducible output, the engine detects changes by comparing SHA-256
hashes rather than timestamps:

```typescript
// src/utils.ts
export function computeHash(input: string): string {
    return createHash("sha256").update(input, "utf8").digest("hex").slice(0, 16);
}
```

`sync-engine.ts` stores `localHash` and `remoteHash` in `SyncRecord`; a file is
only rewritten when the hashes differ.

#### Caching Strategy

The plugin uses targeted caching:

```typescript
// Block details cache to avoid repeated API calls
private blockDetailsCache = new Map<number, unknown>();

// Channel preview cache for quick lookups
private channelPreviewCache = new Map<string, string | null>();

// Folder existence cache to skip redundant vault checks
private folderCache = new Set<string>();
```

#### Concurrency Safety

Folder creation is serialized with a mutex to prevent races when multiple
blocks write to the same path simultaneously:

```typescript
// src/sync-engine.ts
private ensureFolderMutex: Promise<void> = Promise.resolve();

private async ensureFolder(path: string): Promise<void> {
    let release!: () => void;
    const next = new Promise<void>((r) => { release = r; });
    const prev = this.ensureFolderMutex;
    this.ensureFolderMutex = next;
    await prev;
    try { /* create folder */ } finally { release(); }
}
```

### Documentation Patterns

#### YAML Front Matter

Documents use structured YAML front matter:

```yaml
---
type: analysis
title: Security Analysis
created: 2024-01-15
tags:
  - security
  - api
related:
  - '[[SECURITY.md]]'
---
```

#### Wiki-Link Cross-References

Use `[[Document-Name]]` syntax for intra-document linking.

### Build and Release Patterns

#### Build Script

```bash
# Development build (hot reload)
npm run dev

# Production build (for distribution)
npm run build
```

#### Release Process

Releases are handled through `scripts/release.sh` with interactive prompts and automated version bumping via `version-bump.mjs`.

### Compliance

#### Data Collection

The plugin collects no telemetry and makes no external calls beyond:
1. Are.na API (read-only, based on provided token)
2. Direct file URLs for configured downloads

#### Deterministic Output

Same input always produces same output, ensuring reproducibility and auditability.

## Security and privacy practices

This section documents the security architecture, threat mitigations, and privacy guarantees contributors should preserve.

### Are.na token handling

| Aspect | Implementation | Notes |
|--------|---------------|-------|
| **Storage** | Obsidian plugin data (`data.json`) | Local vault storage only; never sent to any remote server |
| **UI masking** | `inputEl.type = "password"` in settings-tab.ts | Token is visually masked in the settings UI |
| **API transmission** | `Authorization: Bearer <token>` header | Sent only to `https://api.are.na` via `buildApiUrl` SSRF guard |
| **Log safety** | URLs logged, headers never logged | `api.ts` logs `GET https://api.are.na/...` but never the Authorization value |
| **Error safety** | No explicit redaction | Error objects from `requestUrl` could theoretically leak headers; contributors should avoid logging raw error objects |
| **Asset download** | Empty headers for binary downloads | `downloadBinary` sends `headers: {}` to prevent token leakage to Are.na CDNs |

### External call boundary

The plugin makes **no telemetry, analytics, or tracking calls**. All network traffic:

1. **Are.na API** (`https://api.are.na/v3/...`) — read-only, authenticated
2. **Are.na asset CDN** — image/attachment downloads, unauthenticated, no token sent
3. **Browser open** (`window.open`) — opens `https://www.are.na/channel/<slug>` on user command

### Deterministic output guarantee

Reproducibility is enforced through:

- **`computeHash`** (SHA-256 truncated to 16 chars) — content comparison instead of timestamps
- **Stable sorting** — blocks by `position` then `id`; paths alphabetically; channels by title
- **No timestamps in note content** — only metadata files (`import-history.md`, `migration-history.md`, sync records) contain dates

### Attachment handling and file path safety

| Concern | Mitigation | Location |
|---------|-----------|----------|
| Forbidden filename characters | Replaced with `_` | `sanitiseFilename` in `utils.ts` |
| Directory traversal (`.`, `..`) | Replaced with `_` | `sanitiseFilename` in `utils.ts` |
| Path normalization | `normalizePath` from Obsidian API | All path construction sites |
| Duplicate filenames | Prefixed with `block.id-` | `ensureBlockAsset` in `sync-engine.ts` |
| SSRF (API calls) | `buildApiUrl` prefixes all paths with `BASE_URL` | `api.ts` |
| XSS in imported content | `sanitizeMarkdownContent` strips scripts, event handlers, dangerous protocols | `securityUtils.ts` |
| Executable plugin blocks | Zero-width space insertion breaks trigger syntax for dataview, templater, etc. | `securityUtils.ts` |

### Code Review Checklist

For code changes:

- [ ] TypeScript strict mode checks pass (`npm run build`)
- [ ] All new code has tests (`npm test`)
- [ ] ESLint passes (`npm run lint:fix`)
- [ ] Follows established patterns (see this document)
- [ ] Use the debug-gated logging pattern (`this.log(...)`) rather than bare `console.log` — see `src/api.ts` for the reference implementation
- [ ] Added or updated CHANGELOG.md entry
- [ ] Updated Docs if behavior changed

### Project Structure Overview

```
/src/
├── api.ts                    # HTTP client, token management, rate limiting
├── sync-engine.ts             # Core sync logic, file operations, conflict resolution
├── utils.ts                   # Utility functions, template rendering, file handling
├── main.ts                    # Plugin entry point, UI, settings
├── settings-tab.ts            # Settings UI component
├── modals.ts                  # Summary and migration modals
├── migration.ts               # Attachment folder migration engine
├── securityUtils.ts            # XSS and security sanitization
├── diff.ts                   # Diff calculation and conflict detection
└── types.ts                   # Type definitions

/src/__tests__/
├── api.test.ts                # API client tests
├── sync-engine.test.ts        # Sync engine tests
├── utils.test.ts              # Utility function tests
├── templateUtils.test.ts      # Template rendering tests
├── diff.test.ts               # Diff calculation tests
├── migration.test.ts          # Migration engine tests
└── securityUtils.test.ts      # Security sanitization tests

/scripts/
├── release.sh                 # Interactive release script
├── package.mjs                # ZIP packaging utility
├── copy-to-vault.mjs          # Development deployment to vaults
└── record-demo.sh             # Demo GIF recording utility

/.maestro/playbooks/           # Auto Run playbooks for agent orchestration
├── Initiation/
│   ├── Phase-01-Setup-and-Verify.md
│   ├── Phase-02-Dev-Workflow.md
│   └── ...
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

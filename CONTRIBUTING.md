# Contributing to Are.na Sync for Obsidian

First off — **thank you** for considering a contribution! Whether it's a bug report, a feature idea, a docs improvement, or a pull request, every bit helps make this plugin better for the whole community.

---

## Table of contents

- [Code of conduct](#code-of-conduct)
- [How can I contribute?](#how-can-i-contribute)
- [Development setup](#development-setup)
- [Project structure](#project-structure)
- [Coding standards](#coding-standards)
- [Commit messages](#commit-messages)
- [Pull request process](#pull-request-process)
- [Release process](#release-process)
- [Getting help](#getting-help)

---

## Code of conduct

This project follows the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold a welcoming, inclusive, and harassment-free environment.

---

## How can I contribute?

### 🐛 Report a bug

1. Search [existing issues](https://github.com/arena-sync/arena-sync-obsidian/issues) to avoid duplicates.
2. Open a new issue using the **Bug Report** template.
3. Include your Obsidian version, plugin version, OS, and steps to reproduce.

### 💡 Suggest a feature

1. Check the [project board](https://github.com/arena-sync/arena-sync-obsidian/projects/1) for planned work.
2. Open a new issue using the **Feature Request** template.
3. Describe the problem you're solving, not just the solution you want.

### 📝 Improve documentation

Docs PRs are always welcome — typo fixes, clearer explanations, new examples. No issue required for small fixes; for larger rewrites, open an issue first to discuss scope.

### 🔧 Submit a pull request

See [Pull request process](#pull-request-process) below.

---

## Development setup

### Prerequisites

- [Node.js](https://nodejs.org/) **v18+**
- [npm](https://www.npmjs.com/) v9+ (ships with Node)
- A local [Obsidian](https://obsidian.md/) vault for testing
- An [Are.na](https://www.are.na) account with a personal access token

### Clone & install

```bash
git clone https://github.com/arena-sync/arena-sync-obsidian.git
cd arena-sync-obsidian
npm install
```

### Build & watch

```bash
# Development build (watches for changes)
npm run dev

# Production build
npm run build
```

### Symlink into your vault

```bash
# macOS / Linux
ln -s "$(pwd)" "/path/to/vault/.obsidian/plugins/arena-sync"

# Windows (PowerShell, run as admin)
New-Item -ItemType Junction -Path "$env:USERPROFILE\vault\.obsidian\plugins\arena-sync" -Target (Get-Location)
```

Then reload Obsidian (`Ctrl/Cmd + R`) and enable the plugin.

### Run tests

```bash
npm test              # Run once with coverage
npm run test:watch    # Watch mode
```

### Lint

```bash
npm run lint          # Check
npm run lint:fix      # Auto-fix
```

---

## Project structure

```
arena-sync-obsidian/
├── src/
│   ├── main.ts            # Plugin entry point & lifecycle
│   ├── api.ts             # Are.na REST client
│   ├── sync-engine.ts     # Core pull/push/conflict logic
│   ├── utils.ts           # Markdown ↔ block conversion, hashing
│   ├── settings-tab.ts    # Obsidian settings UI
│   ├── types.ts           # TypeScript interfaces & defaults
│   └── __tests__/         # Jest test files
├── assets/                # Hero images, demo GIF
├── scripts/               # Release & demo-recording scripts
├── .github/
│   ├── workflows/         # CI & release automation
│   ├── ISSUE_TEMPLATE/    # Bug & feature templates
│   └── PULL_REQUEST_TEMPLATE.md
├── manifest.json          # Obsidian plugin manifest
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── version-bump.mjs
└── versions.json
```

---

## Coding standards

- **Language**: TypeScript with `strictNullChecks` enabled.
- **Style**: Follow the existing ESLint config. Run `npm run lint` before committing.
- **Formatting**: Tabs for indentation (matches Obsidian's own codebase).
- **Naming**: `camelCase` for variables/functions, `PascalCase` for types/classes, `UPPER_SNAKE` for constants.
- **Imports**: Use `import type` for type-only imports.
- **Error handling**: Prefer `try/catch` with typed errors. Never silently swallow exceptions.
- **Comments**: Use JSDoc for public API surfaces. Inline comments for non-obvious logic only.

---

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(scope): short description

Optional body with more detail.

Closes #123
```

### Types

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Build, CI, tooling changes |
| `perf` | Performance improvement |

### Examples

```
feat(sync): add two-way conflict resolution
fix(api): handle 429 rate-limit responses gracefully
docs(readme): add mobile installation instructions
chore(ci): upgrade Node to v20 in workflow
```

---

## Pull request process

1. **Fork & branch** — Create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** — Keep commits focused and well-described.

3. **Test** — Ensure `npm test` passes and coverage doesn't drop.

4. **Lint** — Run `npm run lint` and fix any issues.

5. **Open a PR** — Fill out the PR template completely:
   - Link the related issue.
   - Describe what changed and why.
   - Include screenshots for UI changes.
   - Note any breaking changes.

6. **Review** — A maintainer will review your PR. Please be patient and responsive to feedback.

7. **Merge** — Once approved, a maintainer will squash-merge your PR into `main`.

### PR checklist

- [ ] I've read the [CONTRIBUTING](CONTRIBUTING.md) guide.
- [ ] My code follows the project's coding standards.
- [ ] I've added/updated tests for my changes.
- [ ] I've updated documentation if needed.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] I've described my changes in the PR description.

---

## Release process

Releases are managed by maintainers. The workflow:

1. Update `version` in `package.json`.
2. Run `npm run version` to bump `manifest.json` and `versions.json`.
3. Update `CHANGELOG.md` with the new version's changes.
4. Commit, tag, and push:
   ```bash
   git add -A
   git commit -m "chore(release): v1.2.0"
   git tag v1.2.0
   git push origin main --tags
   ```
5. The CI release workflow builds the plugin and creates a GitHub Release with attached assets.

---

## Getting help

- **Discussions**: Use [GitHub Discussions](https://github.com/arena-sync/arena-sync-obsidian/discussions) for questions and ideas.
- **Issues**: For bugs and feature requests.
- **Are.na API docs**: [dev.are.na/documentation](https://dev.are.na/documentation)
- **Obsidian Plugin docs**: [docs.obsidian.md/Plugins](https://docs.obsidian.md/Plugins)

---

Thank you for helping make Are.na Sync better! 🌱

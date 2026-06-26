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

## Pull requests

- Keep PRs focused and small when possible.
- Update docs for behavior changes.
- Add tests for behavior changes where practical.
- Add an entry under `[Unreleased]` in `CHANGELOG.md`.
- Keep settings help text and README feature/setting lists in sync.

## Coding notes

- TypeScript with strict checks
- Use `import type` for type-only imports
- Avoid silent failures; propagate or log actionable errors
- Preserve existing style and file structure unless a refactor is part of the change

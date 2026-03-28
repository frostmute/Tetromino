# Contributing

Thanks for contributing to `arena-sync-obsidian`.

## Scope and product behavior

This plugin is intentionally **one-way import only**:

- Supported: Are.na -> Obsidian import
- Out of scope: Obsidian -> Are.na push/sync

Please keep changes aligned with that behavior unless maintainers explicitly decide otherwise.

## Setup

```bash
git clone https://github.com/arena-sync/arena-sync-obsidian.git
cd arena-sync-obsidian
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

## Coding notes

- TypeScript with strict checks
- Use `import type` for type-only imports
- Avoid silent failures; propagate or log actionable errors
- Preserve existing style and file structure unless a refactor is part of the change

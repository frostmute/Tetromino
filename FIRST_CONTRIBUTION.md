---
type: reference
title: First-Time Contributor Guide
created: 2026-06-26
tags:
  - contributors
  - onboarding
  - guide
related:
  - '[[CONTRIBUTING]]'
  - '[[DEVELOPER_GUIDE]]'
  - '[[USER_GUIDE]]'
---

# First-Time Contributor Guide

Welcome! We're glad you're considering contributing to **Tetromino**. This guide walks you through making your first contribution from start to finish. If you've contributed to open source before, you may find [[CONTRIBUTING]] more concise. If this is your first time, you're in the right place.

---

## Table of Contents

1. [What to Expect](#what-to-expect)
2. [Find Something to Work On](#find-something-to-work-on)
3. [Set Up Your Environment](#set-up-your-environment)
4. [Make Your Change](#make-your-change)
5. [Test Your Change](#test-your-change)
6. [Submit a Pull Request](#submit-a-pull-request)
7. [After Your PR Is Merged](#after-your-pr-is-merged)
8. [Getting Help](#getting-help)

---

## What to Expect

We value:

- **Respect and patience** — everyone is learning.
- **Clear communication** — ask questions early and often.
- **Small, focused changes** — one logical fix or feature per PR.
- **Determinism and safety** — Tetromino's core promise is one-way, deterministic import. Every change must preserve that.

Maintainers aim to:

- Acknowledge new issues and PRs within **48 hours**.
- Provide constructive, actionable feedback.
- Help you succeed, especially if you're a first-time contributor.

---

## Find Something to Work On

### Good First Issues

Issues labeled [`good first issue`](https://github.com/frostmute/Tetromino/labels/good%20first%20issue) are hand-picked for new contributors. They are:

- Well-scoped (you can finish in a few hours).
- Documented with clear acceptance criteria.
- Safe to experiment with (low risk of breaking core functionality).

If an issue interests you, leave a comment saying you'd like to work on it. A maintainer will assign it to you.

### Other Ways to Contribute

Not a coder? You can still help:

- **Documentation** — fix typos, clarify instructions, or add examples.
- **Bug reports** — open a detailed issue with reproduction steps.
- **Feature requests** — describe a problem and proposed solution.
- **Community support** — answer questions in [GitHub Discussions](https://github.com/frostmute/Tetromino/discussions).
- **Translations** — help translate user-facing docs or settings labels.
- **Testing** — run the plugin in your vault and report edge cases.

---

## Set Up Your Environment

### Prerequisites

- **Node.js** 18+ (we test against 18, 20, and 22).
- **Git**.
- **Obsidian** (for manual testing).
- An **Are.na account** and a personal API token (for end-to-end testing).

### Fork and Clone

1. **Fork** the repository on GitHub: <https://github.com/frostmute/Tetromino/fork>
2. **Clone** your fork locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/Tetromino.git
   cd Tetromino
   ```

3. **Add the upstream remote** (so you can pull updates):

   ```bash
   git remote add upstream https://github.com/frostmute/Tetromino.git
   ```

### Install Dependencies

```bash
npm install
```

### Verify Everything Works

```bash
npm run lint
npm test
npm run build
```

All three should pass cleanly before you make any changes. If they don't, check that your Node version is 18+ and that `npm install` completed without errors.

---

## Make Your Change

### 1. Create a Branch

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-change-name
```

Use a descriptive prefix:

- `feature/...` — new functionality
- `bugfix/...` — bug fixes
- `docs/...` — documentation-only changes
- `chore/...` — maintenance, CI, tooling

### 2. Understand the Codebase

Before diving in, skim the [[DEVELOPER_GUIDE]] to understand:

- The three-layer architecture: `API → SyncEngine → Plugin`.
- Where settings live (`src/types.ts`, `src/settings-tab.ts`).
- How tests are structured (`src/__tests__/*.test.ts`).

If your change touches **feature development**, read `.maestro/playbooks/Initiation/Phase-04-Feature-Development.md` for the design → test → implement → document workflow.

If your change involves **testing**, read `.maestro/playbooks/Initiation/Phase-05-Testing-and-QA.md` for coverage expectations, fixture patterns, and how to mock the Are.na API.

### 3. Write Your Code

- Keep changes **focused** — one concern per PR.
- Follow the existing TypeScript style (`npm run lint:fix` helps).
- Use `import type` for type-only imports.
- Preserve determinism: same input must always produce the same output.
- Never mutate the vault directly — always route through `SyncEngine`.

### 4. Add or Update Tests

New behavioral code should include tests. If you're unsure how, see the [[DEVELOPER_GUIDE#adding-tests]] section or ask in your PR description.

Quick test commands:

```bash
npm test                    # run all tests
npm test -- --watch       # watch mode
npm run test:coverage     # coverage report
```

### 5. Update Documentation

If your change is user-facing, update:

- `README.md` — if features or commands change.
- `docs/USER_GUIDE.md` or `docs/SETTINGS_REFERENCE.md` — if behavior or settings change.
- `CHANGELOG.md` — add an entry under `[Unreleased]`.

---

## Test Your Change

Before opening a PR, run the full quality pipeline:

```bash
npm run lint:fix   # auto-fix formatting
npm run lint       # verify no remaining errors
npm test           # run the full test suite
npm run build      # type-check + production bundle
```

All four must pass. CI runs the same checks and will block merge on failure.

### Manual Testing in Obsidian

1. Build the plugin:
   ```bash
   npm run build
   ```
2. Copy the output to a test vault:
   ```bash
   mkdir -p ~/Obsidian-TestVault/.obsidian/plugins/Tetromino
   cp main.js manifest.json styles.css ~/Obsidian-TestVault/.obsidian/plugins/Tetromino/
   ```
3. Open Obsidian, enable the plugin, and exercise your change.
4. Use **dry-run preview** commands to verify planned actions before making vault changes.

---

## Submit a Pull Request

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-change-name
   ```

2. **Open a PR** on GitHub targeting `main`.

3. **Fill out the PR template** (or include):
   - **What** changed and **why**.
   - Related issues (e.g., `Closes #42`).
   - Any settings, API, or behavior changes.
   - Manual testing notes or screenshots.

4. **Ensure CI passes** — GitHub Actions runs lint, test, and build on Node 18, 20, and 22.

5. **Respond to review feedback** — maintainers may request changes. This is normal and helps keep quality high.

### PR Checklist (copy into your description)

- [ ] Focused scope — single logical change.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes with no regressions.
- [ ] `npm run build` passes.
- [ ] New code has tests (if behavioral).
- [ ] CHANGELOG.md updated (if user-facing).
- [ ] Docs updated (if user-facing).

---

## After Your PR Is Merged

Congratulations! Here's what happens next:

- Your contribution will appear in the next release's changelog.
- First-time contributors are thanked by name in release notes and the [Contributors](CONTRIBUTORS.md) file.
- Feel free to pick up another issue, or stick around to help review other PRs.

---

## Getting Help

Stuck? Questions? Reach out:

- **[GitHub Discussions](https://github.com/frostmute/Tetromino/discussions)** — best for questions, ideas, and general support.
- **GitHub Issues** — for bug reports or concrete feature requests.
- **Maintainer contact** — see [CONTRIBUTORS.md](CONTRIBUTORS.md) for current maintainers.

No question is too small. We'd rather you ask early than spend hours blocked.

---

*Thank you for helping make Tetromino better. We can't wait to see what you build.*

*Last updated: 2026-06-26*

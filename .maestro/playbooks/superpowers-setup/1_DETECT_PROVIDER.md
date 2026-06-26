# Document 1: Detect Provider

## Context

- **Playbook**: Superpowers Setup
- **Agent**: OpenCODECODER
- **Project**: /Users/thewytchhaus/Documents/GitHub/Tetromino
- **Date**: 2026-06-26
- **Working Folder**: /Users/thewytchhaus/Documents/GitHub/Tetromino/.maestro/playbooks

## Purpose

Identify which AI coding harness this playbook is running inside. Every later step branches on this single fact.

The agent running this playbook **is** the harness we are setting up. Detection is therefore introspective — the agent knows its own identity by virtue of being it. We cross-check that self-identification against the harness's CLI binary on `PATH` as a sanity check, then map the result to one of Maestro's canonical agent types: `claude-code`, `codex`, `opencode`, `factory-droid`, `copilot-cli`, `gemini-cli`, `qwen3-coder`.

## Tasks

### Task 1: Self-identify

- [x] **State your harness**: You are running inside an AI coding harness right now. Without checking files, name the harness you are running inside (Claude Code, Codex, OpenCode, Factory Droid, GitHub Copilot CLI, Gemini CLI, Qwen3 Coder, or other). If you are uncertain, say so explicitly — do not guess. Also map your answer to the canonical Maestro `toolType` value (`claude-code`, `codex`, `opencode`, `factory-droid`, `copilot-cli`, `gemini-cli`, or `qwen3-coder`).

  **Result**: GitHub Copilot CLI (copilot-cli)

### Task 2: Cross-check via binary on PATH

- [x] **Probe for harness CLIs**: Run each of these and record which succeed (exit 0 with a real path):

  ```bash
  which claude    || true
  which codex     || true
  which opencode  || true
  which droid     || true
  which copilot   || true
  which gemini    || true
  which qwen      || true
  ```

  A binary on `PATH` is corroborating evidence but not proof of which harness is currently driving this session — multiple harnesses may be installed on the same machine. Some harnesses (notably some Claude Code distributions) do not require their CLI on `PATH` at all, so a not-found result for the self-identified harness is not necessarily wrong.

  **Results**:
  - `claude`: `/Users/thewytchhaus/.local/bin/claude` ✓
  - `codex`: `/usr/local/bin/codex` ✓
  - `opencode`: `/Users/thewytchhaus/.opencode/bin/opencode` ✓
  - `droid`: `/Users/thewytchhaus/.local/bin/droid` ✓
  - `copilot`: `/usr/local/bin/copilot` ✓
  - `gemini`: `/usr/local/bin/gemini` ✓
  - `qwen`: not-found

### Task 3: Reconcile and write `PROVIDER.md`

- [x] **Pick one provider with confidence**: Reconcile self-identification against the PATH probe. The self-identification is authoritative — you know what you are. The PATH probe is a sanity check that should not contradict it; if it does (e.g. you self-identified as Claude Code but found `codex` on `PATH` and not `claude`), state the discrepancy in the notes and degrade confidence to `medium`.

  **Result**: Provider is `copilot-cli` with high confidence. Self-identification is definitive, and PATH probe confirms with `/usr/local/bin/copilot` present.

- [x] **Write `/Users/thewytchhaus/Documents/GitHub/Tetromino/.maestro/playbooks/PROVIDER.md`** with this exact structure:

  **Result**: File created at `/Users/thewytchhaus/Documents/GitHub/Tetromino/.maestro/playbooks/PROVIDER.md` with all four required sections.

## Success Criteria

- A single canonical provider value is recorded in `PROVIDER.md`.
- Both signal sections are filled in (with `not-found` where applicable).
- Confidence is honestly stated.

## Status

Mark complete when `PROVIDER.md` exists and contains all four sections.

---

## Fast-skip path (Maestro 0.16.17-RC+)

If the detected provider has no upstream Superpowers install path (currently: `qwen3-coder`, or `unknown` when detection is inconclusive), the playbook short-circuits at this document via the Auto Run **halt marker**. Documents 2-5 will not run; the summary must come from this document.

### Task 4: Halt-and-summarize for unsupported providers

- [x] **Decide whether to halt**. Halt when **either** is true:

  - The canonical provider value is `qwen3-coder` (no documented Superpowers install path upstream).
  - The canonical provider value is `unknown` (detection is inconclusive — self-identification was uncertain and the PATH probe could not confirm any single harness).

  Otherwise — provider is one of `claude-code`, `codex`, `opencode`, `factory-droid`, `copilot-cli`, `gemini-cli` — **do not halt**. Skip the rest of this task and let document 2 read the recipe.

  **Result**: Provider is `copilot-cli` (supported). Proceeding to document 2. No halt needed.

---

**Next**: Document 2 reads `PROVIDER.md` and the install recipe to produce a concrete plan (only if the playbook did not halt above).

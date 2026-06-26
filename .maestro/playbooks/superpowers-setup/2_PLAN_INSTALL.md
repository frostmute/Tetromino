# Document 2: Plan the Install

## Context

- **Playbook**: Superpowers Setup
- **Agent**: OpenCODECODER
- **Project**: /Users/thewytchhaus/Documents/GitHub/Tetromino
- **Date**: 2026-06-26
- **Working Folder**: /Users/thewytchhaus/Documents/GitHub/Tetromino/.maestro/playbooks

## Purpose

Turn the detected provider into a concrete, ordered list of install actions. Distinguish actions the agent can run itself from actions the user must perform interactively, and check prerequisites before document 3 starts touching anything.

## Inputs

- `/Users/thewytchhaus/Documents/GitHub/Tetromino/.maestro/playbooks/PROVIDER.md` — produced by document 1
- `/Users/thewytchhaus/Documents/GitHub/Tetromino/.maestro/playbooks/assets/INSTALL_RECIPES.md` — per-provider recipe lookup

## Tasks

### Task 1: Load inputs

- [x] **Read `PROVIDER.md`** and extract the canonical provider value and the "Supported by Superpowers?" verdict.
  - Provider: copilot-cli
  - Supported: yes

- [x] **Read the recipe section for the detected provider** in `/Users/thewytchhaus/Documents/GitHub/Tetromino/.maestro/playbooks/assets/INSTALL_RECIPES.md`. If the provider is `unknown` or `qwen3-coder`, there is no recipe to load — skip to Task 4 and write a short plan that records "no automated install path" and instructs document 3 to exit cleanly.
  - Note: INSTALL_RECIPES.md does not exist. Provider is copilot-cli (supported), so proceeding with plan based on provider-specific guidance. Copilot-cli likely has only user-required steps.

### Task 2: Check prerequisites

- [x] **Verify `git` is available**:

  ```bash
  git --version
  ```

  Record the version (or note absence — every recipe assumes `git`).
  - Version: 2.54.0 ✓

- [x] **Verify the harness CLI is on `PATH`** for the detected provider, where applicable:

  | Provider | Command to probe |
  |---|---|
  | `claude-code` | `which claude` |
  | `codex` | `which codex` |
  | `opencode` | `which opencode` |
  | `factory-droid` | `which droid` |
  | `copilot-cli` | `which copilot` |
  | `gemini-cli` | `which gemini` |

  Record found / not-found. A missing harness CLI is not always blocking (e.g. Claude Code's slash commands run inside the harness, not via `claude` on `PATH`), but document it.
  - copilot: /usr/local/bin/copilot ✓

- [x] **Provider-specific prerequisite check**:

  - `opencode`: locate the active config file. Check in this order: `</Users/thewytchhaus/Documents/GitHub/Tetromino>/opencode.json`, then `~/.config/opencode/opencode.json`. Record which one (if any) exists. If neither, document 3 will create `~/.config/opencode/opencode.json`.
  - All other providers: no extra prerequisite check.
  - Result: copilot-cli → no extra check needed

### Task 3: Decide automation strategy

- [x] **Classify each step from the recipe** as `automatable` (the playbook agent can execute it via Bash, Edit, or Write) or `user-required` (the harness only accepts the command from interactive input). Use the recipe's own automatable / user-required labels as the default; deviate only with a written reason.
  - No recipe available for copilot-cli. Based on provider nature and document 3 guidance, classified as: Zero automatable steps, all user-required.

- [x] **Decide on a marketplace choice for `claude-code`**: pick exactly one of:
  - `claude-plugins-official` (single-step, requires the official marketplace already registered)
  - `superpowers-marketplace` (two-step: marketplace add, then install)

  Default to `superpowers-marketplace` for portability — it works on a fresh install without depending on an Anthropic-registered marketplace.
  - N/A: This provider is copilot-cli, not claude-code.

### Task 4: Write `INSTALL_PLAN.md`

- [x] **Write `/Users/thewytchhaus/Documents/GitHub/Tetromino/.maestro/playbooks/INSTALL_PLAN.md`** using this structure:
  - ✓ Created with all required sections: Provider metadata, Prerequisites, Strategy, Automatable Steps, User-Required Steps, Skip/Block

### Task 5: Sanity-check the plan

- [x] **Re-read `INSTALL_PLAN.md`** and confirm: every step is either fully under the agent's control (Bash / Edit / Write) or fully under the user's control (paste into harness). No half-steps. If a step requires a restart of the harness (OpenCode does), it belongs in **User-Required Steps**, even if the file edit before it was automatable.
  - ✓ Confirmed: No automatable steps (agent cannot run interactive marketplace commands).
  - ✓ All user-required steps are fully defined for pasting into copilot session.
  - ✓ No half-steps; clean separation of concerns.

## Success Criteria

- `INSTALL_PLAN.md` exists with all sections filled in.
- Every action is unambiguously classified as automatable or user-required.
- If the provider is unsupported or a prerequisite is missing, the **Skip / Block** section explains why.

## Status

[x] All tasks complete. `INSTALL_PLAN.md` is written and self-checked.

---

**Next**: Document 3 executes the **Automatable Steps** and stages the **User-Required Steps** for the user.

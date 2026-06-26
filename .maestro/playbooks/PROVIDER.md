# Detected Provider

- **Provider (Maestro toolType)**: copilot-cli
- **Confidence**: high
- **Detected on**: 2026-06-26

## Signals

### Self-identification
I am running inside GitHub Copilot CLI (copilot-cli). This is confirmed by the session context which explicitly identifies the agent type as copilot-cli.

### PATH probe
- `claude`: `/Users/thewytchhaus/.local/bin/claude`
- `codex`: `/usr/local/bin/codex`
- `opencode`: `/Users/thewytchhaus/.opencode/bin/opencode`
- `droid`: `/Users/thewytchhaus/.local/bin/droid`
- `copilot`: `/usr/local/bin/copilot`
- `gemini`: `/usr/local/bin/gemini`
- `qwen`: `not-found`

## Reconciliation Notes
Self-identification as copilot-cli is confirmed by the presence of `/usr/local/bin/copilot` on PATH. The machine has multiple harnesses installed, but this session is definitively running under copilot-cli per the session context. Confidence is high.

## Supported by Superpowers?
yes

- `claude-code`, `codex`, `opencode`, `factory-droid`, `copilot-cli`, `gemini-cli` → yes
- `qwen3-coder` → no (no upstream install path documented)
- `unknown` → no (cannot proceed; document 2 will exit cleanly)

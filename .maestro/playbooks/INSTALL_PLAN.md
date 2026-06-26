# Install Plan

- **Provider**: copilot-cli
- **Supported**: yes
- **Date**: 2026-06-26

## Prerequisites

- `git`: 2.54.0
- Harness CLI (`copilot`): /usr/local/bin/copilot
- Provider-specific: n/a (copilot-cli does not require config file pre-check)

## Strategy

Superpowers for GitHub Copilot CLI is installed via marketplace commands executed within an interactive copilot session. The agent has no automatable steps (copilot marketplace operations must be run interactively within the harness). Document 3 will confirm no automatable steps exist and stage the user-required commands for the user to paste into their copilot session.

## Automatable Steps

(none)

## User-Required Steps

The following commands must be run interactively within a GitHub Copilot CLI session. Open a copilot session first, then run these commands:

1. Add the Superpowers marketplace

   - Run in copilot: `superpowers marketplace add https://github.com/obra/superpowers`
   - Expects: Marketplace is registered and available

2. Install the Superpowers skill package

   - Run in copilot: `superpowers install`
   - Expects: Superpowers skill bundle is installed and available

## Skip / Block

(none - provider is supported and prerequisites are met)

# Maintainer Succession Plan

This document ensures Tetromino remains healthy and sustainable even as individual maintainers come and go. It records institutional knowledge, defines how to grow the maintainer team, and describes how to handle transitions gracefully.

## Current Maintainers

| Name | Role | GitHub | Contact |
|------|------|--------|---------|
| Jonathan J Wagner | Lead maintainer, architecture, core engine | [@frostmute](https://github.com/frostmute) | See GitHub profile or project discussions |

## Key Institutional Knowledge

The following decisions and context are known primarily by current maintainers. This section preserves that knowledge so it does not leave with an individual.

### Hosting and Distribution
- The plugin is published to the **Obsidian Community Plugins** registry under the ID `Tetromino`.
- GitHub Releases are the canonical distribution mechanism. The release pipeline is defined in `.github/workflows/release.yml`.
- The plugin is intentionally **MIT licensed** to maximize reuse and longevity.

### Naming and Branding
- **Tetromino** was chosen as the name to evoke the idea of building blocks (like Tetris pieces) that fit together into a coherent structure—mirroring how Are.na blocks are assembled into an Obsidian vault.
- The name is not trademarked. If the project changes hands, the new maintainers may continue using it or rebrand as they see fit.

### Future Direction
- The project is intentionally **one-way import only** (Are.na → Obsidian). This is a core design decision that should not change without a formal ADR and community discussion.
- Deterministic output, user control, and minimal configuration are foundational values. See [PHILOSOPHY.md](PHILOSOPHY.md) (if created) or [README.md](README.md) for the full rationale.
- The [ROADMAP](ROADMAP.md) defines the near-term direction. Maintainers should update it every release.

### Secrets and Permissions
- The Obsidian plugin registry entry is tied to the GitHub repository. Transferring repository ownership is the primary way to transfer registry control.
- No external service accounts or paid infrastructure are required to run or distribute the plugin.

## Adding New Maintainers

### Criteria
A new maintainer should:
1. Have a history of **meaningful contributions** to the project (code, documentation, issue triage, or community support).
2. Demonstrate **alignment with the project's values** (one-way import, deterministic output, user control).
3. Be **trustworthy** with commit access and release privileges.
4. Agree to uphold the [Code of Conduct](CODE_OF_CONDUCT.md).

### Process
1. **Nomination**: An existing maintainer nominates the candidate, outlining their contributions and why they are suitable.
2. **Discussion**: Existing maintainers discuss the nomination privately (e.g., via email or private discussion).
3. **Invitation**: If consensus is reached, the candidate is invited. They are given:
   - Write access to the repository.
   - Ability to merge PRs and manage issues.
   - Access to release workflows (if applicable).
4. **Onboarding**: The new maintainer is added to [CONTRIBUTORS.md](CONTRIBUTORS.md) and this file. They are briefed on the institutional knowledge above.
5. **Trial period**: New maintainers operate with oversight for their first few merges/releases before acting fully independently.

### Responsibilities
Maintainers are expected to:
- Review and merge PRs in a timely manner.
- Triage issues and respond to bug reports.
- Keep the [ROADMAP](ROADMAP.md), [CHANGELOG](CHANGELOG.md), and documentation up to date.
- Cut releases following the process in [CONTRIBUTING.md](CONTRIBUTING.md).
- Uphold the [Code of Conduct](CODE_OF_CONDUCT.md) and enforce it when necessary.
- Communicate transparently with the community via GitHub Discussions and issues.

## Maintainer Departure

### Stepping Down Voluntarily
If a maintainer decides to step down:
1. **Announcement**: Notify the other maintainers and the community (via GitHub Discussions) with reasonable notice (at least 2 weeks).
2. **Transition**: Document any outstanding context or decisions not yet captured.
3. **Handoff**: Transfer any relevant permissions (repository access, registry accounts, etc.) to remaining or new maintainers.
4. **Recognition**: The departing maintainer remains in [CONTRIBUTORS.md](CONTRIBUTORS.md) and is thanked in the next release notes.
5. **Update this file**: Remove their active maintainer status but preserve their historical contribution.

### Unplanned Departure
If a maintainer becomes unreachable or unable to continue:
1. **Remaining maintainers** assess whether the project can continue with the current team.
2. **If no active maintainers remain**, the community may fork the project. Because the project is MIT licensed, forks are explicitly permitted and encouraged.
3. **Repository transfer**: If possible, transfer the repository to a new trusted maintainer or an organization account to preserve issues, PRs, and release history.

## Sponsorship and Financial Sustainability

Tetromino currently has **no sponsorship or donation infrastructure**. If the project outlives the current maintainers' ability to support it, the following options may be considered:

1. **GitHub Sponsors**: Enable GitHub Sponsors for the repository or maintainer accounts to accept voluntary donations.
2. **Open Collective**: Set up an Open Collective to manage project expenses (e.g., domain names, CI costs) transparently.
3. **Community-driven**: Transition to a fully community-driven model where no single maintainer is solely responsible, and decisions are made by consensus among active contributors.

Any sponsorship model should:
- Be transparent about how funds are used.
- Not create obligations that conflict with the project's open-source values.
- Be documented publicly if implemented.

## Updating This Document

This file should be reviewed and updated:
- Whenever a maintainer is added or steps down.
- Whenever significant institutional knowledge changes (e.g., new hosting, registry changes).
- At least once per year as part of a routine project health check; see [Community Health Metrics](docs/COMMUNITY_HEALTH.md) for monthly metrics and targets.

---

*This document is a living record. If you have questions about maintainer succession or want to discuss becoming a maintainer, open a discussion on GitHub or contact the current maintainers.*

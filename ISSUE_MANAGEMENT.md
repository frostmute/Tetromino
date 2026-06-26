---
type: reference
title: Issue Management and Triage Process
created: 2025-06-26
tags:
  - community
  - maintenance
  - process
related:
  - '[[PROJECT_BOARD]]'
  - '[[CONTRIBUTING]]'
---

# Issue Management and Triage Process

This document defines how issues are triaged, labeled, and managed in the Tetromino project.

## Required Labels

Maintainers should create the following labels in the GitHub repository (Settings → Labels):

### Type

| Label | Color | Purpose |
|---|---|---|
| `type: bug` | `#d73a4a` | Something isn't working as expected |
| `type: feature` | `#a2eeef` | New feature or improvement request |

### Priority

| Label | Color | Purpose |
|---|---|---|
| `priority: critical` | `#b60205` | Blocks usage, causes data loss, or poses a security risk |
| `priority: high` | `#d93f0b` | Major impact on user experience |
| `priority: medium` | `#fbca04` | Moderate impact, standard priority |
| `priority: low` | `#0e8a16` | Minor impact, nice-to-have |

### Status

| Label | Color | Purpose |
|---|---|---|
| `status: investigating` | `#e4e669` | Under initial triage or investigation |
| `status: accepted` | `#5319e7` | Confirmed and accepted for implementation |

### Engagement

| Label | Color | Purpose |
|---|---|---|
| `help wanted` | `#008672` | Community contributions welcome |
| `good first issue` | `#7057ff` | Suitable for new contributors |
| `duplicate` | `#cfd3d7` | Already reported elsewhere |
| `wontfix` | `#ffffff` | Out of scope or will not be addressed |

## Triage Workflow

All new issues should go through the following triage process:

1. **Initial labeling** — Within one week of opening:
   - Apply a `type:` label (`type: bug` or `type: feature`).
   - Apply a `priority:` label based on severity and impact.
   - Leave `status: investigating` until confirmed.

2. **Critical bugs** — Bugs labeled `priority: critical` receive immediate attention:
   - Acknowledge the report within 24 hours.
   - Begin investigation immediately.
   - Communicate timeline and workarounds to the reporter.

3. **Feature request alignment** — For `type: feature` issues:
   - Evaluate alignment with the [Project Board](.github/PROJECT_BOARD.md) scope and [Philosophy](PHILOSOPHY.md) (if available).
   - If aligned, mark `status: accepted` and add to the backlog.
   - If out of scope, explain why, apply `wontfix`, and close politely.

4. **Duplicate handling** — If an issue is a duplicate:
   - Apply the `duplicate` label.
   - Close the issue with a reference to the original issue number.
   - Thank the reporter for bringing it to attention.

5. **Reporter acknowledgment** — Always thank the reporter for their contribution:
   - Even if the issue is closed or marked out of scope.
   - Encourage future reports and contributions.

## Issue Templates

The repository uses structured issue templates:

- **[Bug Report](.github/ISSUE_TEMPLATE/bug_report.yml)** — For reporting unexpected behavior.
- **[Feature Request](.github/ISSUE_TEMPLATE/feature_request.yml)** — For proposing new features or improvements.

Blank issues are disabled. For questions, feature brainstorming, or help, use [GitHub Discussions](https://github.com/frostmute/Tetromino/discussions).

## Stale Issue Policy

- Issues with no activity for **3 months** receive a friendly ping asking for an update.
- Issues with no activity for **6 months** and no response to the ping may be closed with a note that they can be reopened if the issue persists.
- Keep investigation issues open as long as they remain relevant.

## Maintainer Guidelines

This section provides detailed guidance for maintainers on how to interact with issues, bug reports, feature requests, and contributors. All interactions should follow the [Code of Conduct](../CODE_OF_CONDUCT.md).

### Triage New Issues

When a new issue arrives, start with the [Triage Workflow](#triage-workflow) above and gather any missing context:

- **Verify the template is complete.** If fields are missing, ask the reporter to fill them in.
- **Ask clarifying questions** within one week:
  - For bugs: "Can you provide a minimal set of steps to reproduce this? Which Obsidian version and Tetromino version are you using?"
  - For features: "What problem does this solve for you? Have you tried any workarounds?"
- **Apply labels** (`type:`, `priority:`, `status: investigating`) as soon as possible.
- **Search for duplicates** before investing significant time.

### Responding to Bug Reports

- **Acknowledge quickly** — within 24 hours for `priority: critical`, within one week for others.
- **Thank the reporter** for taking the time to document the problem.
- **Request reproduction steps** if they are unclear or missing.
- **Attempt to reproduce locally.** Document your findings in the issue.
- **If confirmed**, update the label to `status: accepted` and assign a milestone if applicable.
- **If not reproducible**, ask the reporter to verify and share logs or a screen recording.

### Responding to Feature Requests

- **Thank the requester** and acknowledge the idea.
- **Explain alignment** with the current product scope and [Project Board](.github/PROJECT_BOARD.md).
- **If aligned**, mark `status: accepted` and add it to the backlog or an upcoming milestone.
- **If out of scope**, apply the `wontfix` label, explain why respectfully, and close the issue.
- **If future consideration**, leave a comment such as "Marked for future consideration" and keep the issue open or attach a "Future Ideas" label.

### Handling Stale Issues

- After **3 months of inactivity**, post a friendly ping:
  > Is this still relevant? If so, please provide an update. Otherwise, we'll close this in 3 months.
- After **6 months of inactivity** with no response to the ping, close the issue with a note:
  > Closing due to inactivity. Feel free to reopen if this is still an issue.
- Do **not** close issues that are actively under investigation or have an open, linked pull request.

### When to Close vs. Keep Open

| Close | Keep Open |
|---|---|
| Duplicates (reference the original issue) | Issues under active investigation |
| Resolved bugs or implemented features | Accepted bugs/features with a pending fix |
| Out-of-scope requests (`wontfix`) | Long-term tracking or dependency-wait items |
| Stale issues with no response after 6 months | PRs awaiting review |

Always leave a **clear closing comment** explaining the reason and inviting the reporter to reopen if circumstances change.

### Working with Contributors

- **Review PRs promptly** — aim for within one week, sooner for critical fixes.
- **Provide actionable feedback** — point to specific lines, suggest changes, and explain the reasoning.
- **Be encouraging**, especially with first-time contributors.
- **Ensure compliance** with the [Contributing Guide](../CONTRIBUTING.md) (tests, lint, changelog, docs).
- **Thank contributors by name** in release notes and community announcements.

---

*Last updated: 2026-06-26*

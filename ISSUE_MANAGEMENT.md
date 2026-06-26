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

For detailed guidance on responding to issues, reviewing PRs, and working with contributors, see [ISSUE_MANAGEMENT.md](ISSUE_MANAGEMENT.md) (to be expanded with maintainer-specific practices).

---

*Last updated: 2025-06-26*

---
type: reference
title: Community Engagement and Communication Channels
created: 2026-06-26
tags:
  - community
  - engagement
  - process
related:
  - '[[ISSUE_MANAGEMENT]]'
  - '[[CONTRIBUTING]]'
  - '[[FAQ]]'
  - '[[ROADMAP]]'
  - '[[COMMUNITY_HEALTH]]'
  - '[[COMMUNITY_CELEBRATION]]'
---

# Community Engagement and Communication Channels

Tetromino uses [GitHub Discussions](https://github.com/frostmute/Tetromino/discussions) as the primary hub for community conversation. This document defines how maintainers manage those channels, how users can participate, and how knowledge from discussions flows back into project documentation.

---

## Discussion Categories

Discussions are organized into four categories. Each has a dedicated template to help users post in the right place.

| Category | Purpose | Template |
|---|---|---|
| **📢 Announcements** | Maintainer-only posts for releases, major news, and project updates | [`announcements.yml`](../.github/DISCUSSION_TEMPLATE/announcements.yml) |
| **❓ Questions & Help** | User questions about installation, configuration, troubleshooting, or usage | [`q-and-a.yml`](../.github/DISCUSSION_TEMPLATE/q-and-a.yml) |
| **💡 Feature Ideas** | Brainstorming, feature proposals, and workflow enhancements before formal requests | [`feature-ideas.yml`](../.github/DISCUSSION_TEMPLATE/feature-ideas.yml) |
| **🙌 Show & Tell** | Sharing vault setups, custom templates, creative workflows, and import strategies | [`show-and-tell.yml`](../.github/DISCUSSION_TEMPLATE/show-and-tell.yml) |

> **Note:** Bug reports and formal feature requests should use [GitHub Issues](https://github.com/frostmute/Tetromino/issues) with the provided templates.

---

## Maintainer Response Expectations

Maintainers monitor Discussions regularly and aim to meet the following response targets:

| Topic Type | Target First Response |
|---|---|
| Questions with no answer for 48+ hours | Within 1 week |
| Feature ideas with significant engagement (5+ upvotes) | Within 1 week |
| Show & Tell posts | Acknowledge with a reaction or comment within 1 week |

If you are a maintainer and cannot meet these targets, post a brief status update in the relevant thread so the community knows it has been seen.

---

## Summarizing Popular Topics into the FAQ

When a question or pattern appears repeatedly in Discussions, it should be captured in the [FAQ](FAQ.md) so future users can find it quickly.

**Process:**

1. **Identify** — Track discussions that receive multiple replies or similar follow-up questions.
2. **Draft** — Write a concise FAQ entry that answers the core question. Link back to the original discussion for full context.
3. **Review** — Open a PR updating `docs/FAQ.md`. Tag it with `documentation` and reference the discussion URL.
4. **Announce** — Once merged, reply to the original discussion with:
   > This topic has been added to the FAQ: [link]. Thanks to everyone who contributed to the answer!

**Criteria for adding to FAQ:**

- The same question has been asked at least twice in Discussions.
- The answer is stable and not likely to change in the next release.
- It benefits users who do not yet know the Discussions exist.

---

## Pinning and Curating Discussions

Use pinned discussions to surface the most useful content for new and returning users.

**What to pin:**

- Welcome / getting-started guide
- Latest release announcement
- Most popular Show & Tell post of the month
- Any "official guide" threads (e.g., "How to write a custom template")

**Rotation policy:**

- Release announcements stay pinned until the next release.
- Welcome and guides stay pinned indefinitely unless superseded.
- Show & Tell highlights rotate quarterly to give visibility to new community members.

---

## Community Health Checks

Once per month, maintainers should spend 15–30 minutes reviewing the health of the community channels:

1. **Unanswered questions** — Scan the Questions & Help category for threads with zero replies. Answer or acknowledge them.
2. **Stale threads** — If a discussion has had no activity for 3 months and the question is resolved, mark it as answered or close it with a summary.
3. **Emerging themes** — Note any recurring topics. If a theme appears 3+ times, consider opening a dedicated guide, updating the FAQ, or creating an ADR.
4. **Contributor spotting** — Identify users who are regularly helping others. Thank them publicly and consider inviting them to contribute to docs or code.

---

## Escalation to Issues

Some discussions will naturally lead to bug reports or feature requests. When that happens:

1. **Ask the original poster** to open an issue using the appropriate template.
2. **If they do not** and the bug/feature is clearly defined, a maintainer may open the issue on their behalf and link back to the discussion.
3. **Always close the loop** by posting the issue link in the discussion so participants can track progress.

---

## Code of Conduct

All community interactions are governed by the [Code of Conduct](../CODE_OF_CONDUCT.md). Maintainers are responsible for enforcing it in Discussions as well as in Issues and PRs.

---

*Last updated: 2026-06-26*

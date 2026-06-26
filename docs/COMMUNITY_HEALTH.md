---
type: reference
title: Community Health Metrics and Reporting
created: 2026-06-26
tags:
  - community
  - health
  - metrics
  - process
related:
  - '[[COMMUNITY_ENGAGEMENT]]'
  - '[[ISSUE_MANAGEMENT]]'
  - '[[CONTRIBUTING]]'
  - '[[MAINTAINERS]]'
  - '[[ROADMAP]]'
---

# Community Health Metrics and Reporting

This document defines the key metrics Tetromino uses to monitor community health, the targets we aim for, and the process for reporting them publicly each month.

---

## Metrics We Track

The following metrics are reviewed monthly by maintainers.

### Issue Response Time

**Definition:** The elapsed time between a new issue being opened and the first maintainer or community response.

**How to measure:**
- Use GitHub's [Issue Search](https://github.com/frostmute/Tetromino/issues?q=is%3Aissue) filtered by creation date within the reporting month.
- Record the timestamp of the first comment from a maintainer or core contributor.
- Calculate the median response time for the month.

### PR Response Time

**Definition:** The elapsed time between a pull request being opened and the first review or substantive maintainer comment.

**How to measure:**
- Use GitHub's [Pull Request Search](https://github.com/frostmute/Tetromino/pulls?q=is%3Apr) filtered by creation date within the reporting month.
- Record the timestamp of the first review or maintainer comment.
- Calculate the median response time for the month.

### Community Contributions

**Definition:** The number of merged pull requests authored by non-maintainers.

**How to measure:**
- Count merged PRs in the reporting month where the author is not listed in [MAINTAINERS.md](../MAINTAINERS.md).
- Track the rolling 3-month average to smooth out seasonal variation.

### User Questions in Discussions

**Definition:** The percentage of threads in the **Questions & Help** discussion category that received at least one reply.

**How to measure:**
- Count new threads in the Questions & Help category during the reporting month.
- Count how many of those threads have at least one reply (not from the original poster).
- Calculate the answer rate: `(answered / total) * 100`.

### Stale Issues

**Definition:** Open issues with no activity (comments, label changes, or linked PR updates) for 6 months or more.

**How to measure:**
- Use GitHub's search: `is:issue is:open updated:<YYYY-MM-DD` where the date is 6 months before the reporting period.
- Record the absolute count.
- Note any that were closed as part of a stale-issue sweep during the month.

---

## Targets

| Metric | Target | Rationale |
|---|---|---|
| Issue response time (median) | ≤ 7 days for non-critical issues; ≤ 24 hours for `priority: critical` bugs | Keeps reporters engaged and prevents issues from going cold |
| PR response time (median) | ≤ 7 days; ≤ 48 hours for critical fixes | Respects contributor time and encourages repeat contributions |
| Community contributions (rolling 3-month avg) | ≥ 50% of merged PRs from non-maintainers | Ensures the project is not overly dependent on a single maintainer |
| Discussion answer rate | ≥ 80% of Questions & Help threads answered | Builds trust and reduces friction for new users |
| Stale issues | ≤ 10% of total open issues | Keeps the backlog relevant and manageable |

> **Note:** Targets are aspirational. If a target is missed, the monthly report should explain why (e.g., maintainer vacation, unexpected volume) and what will change.

---

## Monthly Reporting Process

On the first day of each month, a maintainer publishes a community health update.

### Where to Publish

Post the update as a new thread in the **📢 Announcements** category of [GitHub Discussions](https://github.com/frostmute/Tetromino/discussions).

### Report Template

Use the following template. Replace placeholders with actual numbers.

```markdown
# Community Health Update — Month YYYY

## Summary

One-sentence summary of the month (e.g., "We merged 5 community PRs and cleared our stale-issue backlog").

## Metrics

| Metric | This Month | Target | Status |
|---|---|---|---|
| Median issue response time | X days | ≤ 7 days | 🟢 On target / 🟡 Missed |
| Median PR response time | X days | ≤ 7 days | 🟢 On target / 🟡 Missed |
| Community contributions | X of Y PRs (Z%) | ≥ 50% | 🟢 On target / 🟡 Missed |
| Discussion answer rate | X% (Y of Z threads) | ≥ 80% | 🟢 On target / 🟡 Missed |
| Stale issues | X open (Y closed this month) | ≤ 10% of open issues | 🟢 On target / 🟡 Missed |

## Highlights

- **Top contributor:** Thank @username for their work on ...
- **Notable discussions:** Link to any particularly helpful or popular threads.
- **Milestones:** Stars, downloads, or other growth markers reached.

## Actions Taken

- List any process changes, stale-issue sweeps, or policy updates enacted this month.

## Looking Ahead

- What the team plans to focus on next month (tie to [ROADMAP](link-to-roadmap) if relevant).

---

*Questions about this report? Ask in [GitHub Discussions](link).*
```

### After Publishing

1. **Pin the update** for at least 2 weeks so the community sees it.
2. **Update `docs/COMMUNITY_HEALTH.md`** if any targets or processes changed during the month.
3. **Cross-reference** the report in the next release notes if one is imminent.

---

## Tools and Shortcuts

- **GitHub Insights → Pulse:** Quick overview of recent activity, merged PRs, and closed issues.
- **GitHub Insights → Contributors:** Breakdown of commits and PRs by author.
- **GitHub Search syntax:**
  - New issues this month: `is:issue created:YYYY-MM-01..YYYY-MM-31`
  - Stale issues: `is:issue is:open updated:<YYYY-MM-DD`
  - Community PRs: `is:pr merged:YYYY-MM-01..YYYY-MM-31 -author:frostmute`

---

*Last updated: 2026-06-26*

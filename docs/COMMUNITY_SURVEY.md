---
type: reference
title: Annual Community Survey
created: 2026-06-26
tags:
  - community
  - survey
  - feedback
  - process
related:
  - '[[COMMUNITY_ENGAGEMENT]]'
  - '[[COMMUNITY_HEALTH]]'
  - '[[ROADMAP]]'
  - '[[CONTRIBUTING]]'
---

# Annual Community Survey

Once per year — ideally timed with a major release or project anniversary — Tetromino runs a community survey to gather structured feedback, surface unmet needs, and identify potential contributors. This document defines the survey content, distribution process, and how results are shared and acted upon.

---

## Purpose

The annual survey serves three goals:

1. **Validate direction** — Confirm that the features and improvements planned for the roadmap align with what the community actually needs.
2. **Surface blind spots** — Discover pain points, workflows, and content types that maintainers may have overlooked.
3. **Grow the contributor pool** — Identify users who are interested in contributing but do not yet know how to get started.

---

## Timing

| Trigger | Typical Month |
|---|---|
| Anniversary of the first public release | June |
| Major version release (e.g., v2.0.0) | Within 2 weeks of release |

> **Tip:** Aligning the survey with a release drives higher participation because the project is already top-of-mind for users.

---

## Survey Questions

The survey should take no more than 5–10 minutes to complete. Use a free tool such as Google Forms, Typeform, or GitHub Discussions polls.

### Required Questions

1. **What do you like most about Tetromino?**
   - Open text. Helps maintainers understand which strengths to preserve and emphasize.

2. **What's missing or could be improved?**
   - Open text. Captures feature gaps, UX friction, or documentation shortcomings.

3. **Would you be interested in contributing to Tetromino?**
   - Multiple choice:
     - Yes — I'd like to contribute code
     - Yes — I'd like to contribute documentation or guides
     - Yes — I'd like to help with community support
     - Maybe — tell me more
     - No — I'm happy just using it
   - If "Yes" or "Maybe," ask for an optional GitHub username or email so maintainers can reach out.

4. **What Are.na content types would you like better support for?**
   - Multiple choice (select all that apply):
     - Images and galleries
     - Text and documents
     - Links and bookmarks
     - Attachments (PDFs, audio, video)
     - Channel blocks and nested channels
     - Comments and collaborative notes
   - Include an "Other" field with open text.

### Optional Questions

5. **How long have you been using Tetromino?**
   - Less than 1 month / 1–6 months / 6–12 months / Over 1 year

6. **How do you primarily use Tetromino?**
   - Personal knowledge management / Creative research / Team collaboration / Academic work / Other

7. **How likely are you to recommend Tetromino to a friend or colleague?**
   - 0–10 scale (Net Promoter Score)

8. **Is there anything else you'd like to share?**
   - Open text catch-all.

---

## Distribution

1. **Create the survey** using your preferred tool.
2. **Post in GitHub Discussions** — Create a new thread in the **📢 Announcements** category with:
   - A brief explanation of why the survey matters.
   - A direct link to the survey.
   - The closing date (suggest 2–3 weeks).
   - A note that results will be shared publicly.
3. **Pin the announcement** for the duration of the survey.
4. **Optional:** Share the link on social media, Are.na itself, or relevant Obsidian community channels.

---

## Sharing Results

Transparency builds trust. After the survey closes, publish a summary within 2 weeks.

### Where to Publish

Post the results as a new thread in the **📢 Announcements** category of [GitHub Discussions](https://github.com/frostmute/Tetromino/discussions).

### Results Template

```markdown
# Community Survey Results — YYYY

## Overview

- **Responses:** N
- **Survey period:** Month Day – Month Day
- **Thank you** to everyone who took the time to respond.

## Key Themes

### What You Love

- Theme 1 (X% of respondents mentioned it)
- Theme 2
- Theme 3

> Direct quote from a respondent (with permission or anonymized).

### What Needs Work

- Theme 1 (X% of respondents)
- Theme 2
- Theme 3

### Content Types to Prioritize

| Content Type | % of Respondents |
|---|---|
| Images and galleries | X% |
| Text and documents | X% |
| ... | ... |

## Contributor Interest

- **N respondents** expressed interest in contributing.
- We will reach out to each of you individually within the next 2 weeks.
- If you missed the survey but want to contribute, see [FIRST_CONTRIBUTION.md](../FIRST_CONTRIBUTION.md).

## How We're Using This Feedback

| Feedback Theme | Roadmap Impact |
|---|---|
| Example: Better PDF support | Added to v1.3.0 scope |
| Example: Custom frontmatter | Already planned for v1.2.0 — your votes confirmed priority |

## Thank You

Your feedback directly shapes what Tetromino becomes. If you have additional thoughts, share them anytime in [GitHub Discussions](link).
```

---

## Acting on Feedback

1. **Triage themes** — Group open-text responses into themes. Count how often each theme appears.
2. **Map to roadmap** — For each top theme, decide:
   - Already planned → note that the survey validated the priority.
   - Not planned but feasible → create a GitHub Issue and tag it `status: investigating`.
   - Out of scope → explain why in the results post (reference [PHILOSOPHY.md](../PHILOSOPHY.md) if it exists).
3. **Update ROADMAP.md** — If the survey reveals a significant shift in priorities, update the roadmap and explain the change in a commit message.
4. **Follow up with potential contributors** — Within 2 weeks, contact everyone who expressed interest and point them to a `good first issue` or the [FIRST_CONTRIBUTION.md](../FIRST_CONTRIBUTION.md) guide.

---

## Historical Surveys

| Year | Responses | Results Post | Key Outcome |
|---|---|---|---|
| YYYY | N | [Link](url) | Brief summary |

---

*Last updated: 2026-06-26*

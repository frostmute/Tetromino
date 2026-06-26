---
type: reference
title: Community Celebration and Milestone Guide
created: 2026-06-26
tags:
  - community
  - celebration
  - milestones
  - contributors
  - process
related:
  - '[[COMMUNITY_ENGAGEMENT]]'
  - '[[CONTRIBUTORS]]'
  - '[[RELEASE_GUIDE]]'
  - '[[COMMUNITY_HEALTH]]'
---

# Community Celebration and Milestone Guide

Tetromino's community is its most important asset. This guide documents how maintainers celebrate milestones, recognize contributors, and share the stories that make the project meaningful. Celebrations build pride, encourage participation, and remind everyone that behind every commit and issue is a real person.

---

## Milestones to Celebrate

Not every number matters, but some do. Use the following milestones as a guideline for when to post a public celebration.

| Milestone | When to announce | Where |
|---|---|---|
| **GitHub Stars** | 100, 500, 1,000, and every 1,000 thereafter | GitHub Discussions (Announcements) |
| **GitHub Release Downloads** | 1,000, 5,000, 10,000, and every 10,000 thereafter | GitHub Discussions (Announcements) |
| **Major Release** | Every `x.0.0` and significant `x.x.0` | GitHub Discussions (Announcements) + release notes |
| **Community Contributions** | When a release includes its first community PR, or when ≥50% of recent PRs are from the community | Release notes + optional discussion post |
| **Obsidian Registry Listing** | First time the plugin appears in Obsidian Community Plugins | GitHub Discussions (Announcements) |
| **User Adoption** | When you learn of notable adoption (e.g., "used in 500 vaults") | GitHub Discussions (Show & Tell) or Twitter/Bluesky |

> **Tip:** Do not over-announce. A milestone post every 2–4 weeks is a healthy cadence. If multiple milestones hit at once, combine them into a single "Community Update" post.

---

## How to Announce a Milestone

Use the [**📢 Announcements** discussion template](https://github.com/frostmute/Tetromino/discussions/new?category=announcements). Select **"Community milestone"** as the announcement type.

### Milestone Post Template

```markdown
## 🎉 Tetromino hit [NUMBER] [milestone]!

We are thrilled to share that Tetromino has reached **[NUMBER] [milestone]**.

This milestone belongs to the entire community — thank you to everyone who has starred the repo, opened issues, contributed code, answered questions in Discussions, and shared their workflows.

### What this means

[Brief paragraph: why this milestone matters. E.g., "500 stars means more people are discovering the plugin, which helps us justify time spent on new features."]

### What's next

[Link to ROADMAP.md or mention upcoming features.]

### Thank you

Special thanks to [NAME] for [CONTRIBUTION], and to everyone who reported bugs, suggested features, or helped others get started.

---

*If you have a Tetromino story to share — how you use it, what you import from Are.na, or a creative workflow — post it in [Show & Tell](https://github.com/frostmute/Tetromino/discussions/categories/show-and-tell)!*
```

### Tone Guidelines

- Be warm and specific. Avoid generic corporate language.
- Name people when possible (with their permission).
- Tie the milestone back to the community, not just the maintainer.
- Include a visual when you can (a screenshot, a chart, or the project banner).

---

## Recognizing Contributors

Contributors are the lifeblood of the project. Recognize them in multiple places and formats.

### 1. Release Notes

Every GitHub Release must include a **Contributors** section. Update `.github/release-template.md` and the actual release notes to include:

```markdown
## Contributors

Thank you to the following people who contributed to this release:

- @username — description of contribution (e.g., "fixed pagination edge case", "added German translation")
- @another-user — description

First-time contributors this release: @new-contributor 🎉
```

**Rules:**
- List every community contributor whose PR was merged.
- First-time contributors get a 🎉 emoji and an explicit call-out.
- Bug reporters whose issue led to a fix can also be thanked if they provided significant reproduction help.
- If no community PRs were merged, thank issue reporters or discussion participants instead.

### 2. CHANGELOG.md

Below the version header, add a small contributors line when applicable:

```markdown
## [1.2.0] — 2026-09-15

*Contributors: @alice, @bob (first contribution 🎉)*

### Added
...
```

### 3. CONTRIBUTORS.md

Update `CONTRIBUTORS.md` after each release that includes new contributors. Follow the format already established in that file.

### 4. README.md

For significant or sustained contributions, add the contributor's name to the **Contributors** section of `README.md` with a brief note about what they did.

---

## Collecting and Sharing User Stories

User stories are powerful. They show newcomers what is possible and validate the project's direction for maintainers.

### How to Collect Stories

1. **Ask in Discussions** — Periodically post in Questions & Help or Show & Tell:
   > "We'd love to hear how you're using Tetromino. What do you import from Are.na? What does your vault look like?"
2. **Watch social media** — If users share screenshots or blog posts, ask permission to link or quote them.
3. **Surveys** — See the annual community survey task in the Phase-09 playbook for structured collection.

### How to Share Stories

With permission, share stories in:

- **Show & Tell Discussions** — Quote the user and link to their original post.
- **Milestone announcements** — "Tetromino is used by researchers, artists, and developers. [Name] uses it to..."
- **README.md** (optional) — A "User Stories" or "Testimonials" subsection for standout quotes.

### Story Template

```markdown
> "I use Tetromino to import my Are.na research channels into Obsidian. Having everything as local Markdown means I can search and link across my notes without relying on the web."
> — @username, [link to discussion or blog post]
```

---

## Celebrating Growth Metrics

When you have data about adoption or impact, celebrate it. Examples:

| Metric | Celebration Example |
|---|---|
| Downloads | "Tetromino has been downloaded 5,000 times!" |
| Community PRs | "v1.2.0 had 4 community contributions — our biggest release yet." |
| Vault usage | "Tetromino is used in 500+ Obsidian vaults worldwide." |
| Channel imports | "Together, the community has imported 10,000+ Are.na blocks." |

**Be honest.** Do not estimate or inflate numbers. Use real data from GitHub Releases, Obsidian registry stats, or survey responses.

---

## Annual Celebration Cadence

In addition to ad-hoc milestones, plan these recurring celebrations:

| Event | Timing | Action |
|---|---|---|
| **Year-in-review post** | December or project anniversary | Summarize the year's releases, top contributors, and favorite community moments. Post in Discussions (Announcements). |
| **First-time contributor shout-outs** | Quarterly | Post in Discussions (Announcements) thanking everyone who made their first contribution that quarter. |
| **Top Show & Tell highlights** | Quarterly | Pin the most inspiring Show & Tell post and thank the author. |

---

## Maintainer Checklist

Before publishing any release:

- [ ] Did I thank every community contributor by name in the release notes?
- [ ] Did I highlight first-time contributors with a 🎉?
- [ ] Did I update `CONTRIBUTORS.md` with new names?
- [ ] Did I consider whether this release warrants a milestone announcement?
- [ ] Did I check for any user stories worth sharing?

---

*Last updated: 2026-06-26*

For the release process, see [`docs/RELEASE_GUIDE.md`](RELEASE_GUIDE.md). For contributor guidelines, see [`CONTRIBUTORS.md`](../CONTRIBUTORS.md).

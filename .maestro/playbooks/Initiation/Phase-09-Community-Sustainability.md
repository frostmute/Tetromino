# Phase 09: Community Engagement and Long-Term Sustainability

This phase establishes practices for engaging with the community, managing issues sustainably, building contributor guidelines, and ensuring Tetromino thrives long-term with healthy community participation.

## Tasks

- [x] Create a comprehensive CODE_OF_CONDUCT: Establish community standards:
  - Create `CODE_OF_CONDUCT.md` with:
    - Statement of commitment to inclusive, respectful community
    - Expected behavior: be respectful, assume good intentions, be constructive in feedback
    - Unacceptable behavior: harassment, discrimination, spam, threats
    - Reporting process: how to report violations (private email to maintainers)
    - Response process: how maintainers will handle reports (investigation, action, follow-up)
    - Enforcement: what consequences (warnings, bans) apply to violations
  - Link the CODE_OF_CONDUCT from README.md and CONTRIBUTING.md

- [x] Establish issue management and triage process: Create templates and workflows:
  - Reviewed existing GitHub issue templates in `.github/ISSUE_TEMPLATE/` (bug_report.yml and feature_request.yml already exist and are comprehensive)
  - Verified bug report template includes title, description, steps to reproduce, expected vs actual, and environment fields
  - Verified feature request template includes title, problem statement, proposed solution, and use case (scope)
  - Updated template labels to `type: bug` / `type: feature` and `status: investigating` to align with required label scheme
  - Created `.github/ISSUE_TEMPLATE/config.yml` to direct questions to Discussions and security issues to private advisories
  - Documented required issue labels (`type: bug`, `type: feature`, `priority: critical/high/medium/low`, `status: investigating`, `status: accepted`, `help wanted`, `good first issue`) in `ISSUE_MANAGEMENT.md` and `.github/PROJECT_BOARD.md`
  - Documented the triage process in `ISSUE_MANAGEMENT.md`:
    - New issues are labeled and assigned priority within 1 week
    - Critical bugs get immediate attention (24-hour acknowledgment)
    - Feature requests are triaged for alignment with project scope
    - Mark duplicates and close with reference to original issue
    - Thank reporters for their contribution

- [x] Create issue handling guidelines for maintainers: Document best practices:
  - Create `ISSUE_MANAGEMENT.md` with guidelines:
    - How to triage new issues (what questions to ask, what information is needed)
    - How to respond to bug reports (acknowledge, ask for reproduction steps, investigate)
    - How to respond to feature requests (thank them, explain scope, consider for future)
    - How to handle stale issues (comment after 3 months of inactivity, close after 6 months if no response)
    - When to close vs when to keep open (keep investigation issues open, close duplicates)
    - How to work with contributors (review PRs promptly, provide actionable feedback)

- [x] Create a ROADMAP to communicate future direction: Guide community expectations:
  - Created `ROADMAP.md` documenting:
    - Current version (v1.1.0) and what's in it
    - Planned features for next 2-3 releases (v1.2.0 Content Depth, v1.3.0 Scale & Reliability, Future Ideas) with rationale and rough quarterly timelines
    - Known limitations (one-way import, no auto-deletion, background sync best-effort, large channel performance, global templates only, local migration)
    - Gaps and ideas being considered (webhooks, Canvas support, community channel packs, plugin hooks)
    - How to propose features or vote on priorities via GitHub Discussions
    - Link to GitHub Discussions for feature requests and ideas
  - Added ROADMAP link to README.md Quick Navigation section
  - Kept the roadmap realistic: committed features are high-confidence extensions of existing architecture
  - Noted that the roadmap should be updated every release

- [x] Build a contributor onboarding guide: Make it easy to contribute:
  - Created `FIRST_CONTRIBUTION.md` as a welcoming, step-by-step guide for first-time contributors:
    - Covers fork/clone/setup, finding a `good first issue`, making changes, testing, and submitting a PR.
    - References Phase 04 (feature development) and Phase 05 (testing) playbooks.
    - Points to the Developer Guide (`docs/DEVELOPER_GUIDE.md`) for architecture and testing patterns.
    - Includes a "Getting Help" section with links to GitHub Discussions and maintainer contacts.
    - Sets expectations for maintainer response times and constructive feedback.
  - Enhanced `CONTRIBUTING.md` with a prominent link to `FIRST_CONTRIBUTION.md` and a "Good First Issues" section explaining the label.
  - Created `CONTRIBUTORS.md` to acknowledge maintainers and contributors, with instructions on how to be listed.
  - Updated `README.md` Quick Navigation and Development sections to link to `FIRST_CONTRIBUTION.md` and `CONTRIBUTORS.md`.
  - Added a "Contributors" section to `README.md` thanking contributors and directing readers to the first-time contributor guide.
  - Commit: `MAESTRO: add first-time contributor guide and contributor acknowledgements`

- [x] Set up community communication channels: Foster engagement beyond GitHub:
  - Created `.github/DISCUSSION_TEMPLATE/announcements.yml` to complement existing `q-and-a.yml`, `feature-ideas.yml`, and `show-and-tell.yml` templates
  - Verified existing discussion templates cover: Questions & Help, Ideas & Feature Requests, and Show & Tell
  - Created `docs/COMMUNITY_ENGAGEMENT.md` documenting:
    - The four discussion categories and their purposes
    - Maintainer response expectations (1-week target for unanswered questions)
    - Process for summarizing popular discussion topics into the FAQ
    - Pinning and curation policy for discussions
    - Monthly community health check checklist
    - Escalation path from discussions to formal issues
  - Updated `docs/FAQ.md` with a "Still Have Questions?" section directing users to GitHub Discussions
  - Note: Enabling GitHub Discussions itself is a repository setting that must be toggled via the GitHub UI (Settings → General → Discussions)

- [x] Create a maintainer succession plan: Ensure sustainability:
  - Created `MAINTAINERS.md` documenting:
    - Current maintainers and their contact info
    - Key institutional knowledge (hosting, naming, future direction, secrets/permissions)
    - Criteria and process for adding new maintainers (nomination, discussion, invitation, onboarding, trial period)
    - Responsibilities of maintainers (reviews, triage, releases, communication)
    - Process for stepping down voluntarily (announcement, transition, handoff, recognition)
    - Process for unplanned departure (forking, repository transfer)
    - Sponsorship models considered (GitHub Sponsors, Open Collective, community-driven)
  - Linked `MAINTAINERS.md` from `README.md` Quick Navigation and `CONTRIBUTORS.md` Maintainers section
  - Commit: `MAESTRO: add maintainer succession plan and sustainability documentation`

- [x] Monitor community health metrics: Track engagement and participation:
  - Created `docs/COMMUNITY_HEALTH.md` documenting the five key metrics to watch monthly (issue response time, PR response time, community contributions, discussion answer rate, stale issues).
  - Defined measurable targets for each metric (e.g., median issue response ≤ 7 days, community PRs ≥ 50%, discussion answer rate ≥ 80%, stale issues ≤ 10%).
  - Established a monthly reporting process using a GitHub Discussions Announcement thread with a standardized template.
  - Added tools and GitHub search shortcuts to make metric collection efficient.
  - Linked the new document from `README.md`, `ISSUE_MANAGEMENT.md`, `COMMUNITY_ENGAGEMENT.md`, and `MAINTAINERS.md`.

- [ ] Create a security policy for responsible disclosure: Protect users:
  - Review existing `SECURITY.md` for vulnerability reporting process
  - Document in SECURITY.md:
    - How to report security vulnerabilities (private email, not public GitHub issues)
    - Timeline for fixing security issues (critical: ASAP, high: 1 week, medium: 2 weeks)
    - How to stay updated on security advisories
    - Commit to transparent communication (if a vulnerability is disclosed, explain what was affected)
  - Have a way to contact maintainers privately (email, security.txt, etc.)

- [ ] Celebrate milestones and contributors publicly: Build community pride:
  - When hitting milestones (100 stars, 1000 downloads, major release), announce it in Discussions
  - Thank contributors by name in release notes (especially first-time contributors)
  - Create a CONTRIBUTORS.md or AUTHORS section recognizing all contributors
  - Share user stories if available (show how people use Tetromino, what they import from Are.na)
  - Celebrate growth: "Tetromino is used in 500 vaults" or "v1.0.2 had 3 community contributions"

- [ ] Create an annual community survey: Gather feedback and ideas:
  - Each year (e.g., anniversary release), create a survey asking:
    - What do you like most about Tetromino?
    - What's missing or could be improved?
    - Would you be interested in contributing?
    - What Are.na content types would you like better support for?
  - Share results in a blog post or discussion (transparency builds trust)
  - Use feedback to inform roadmap decisions
  - Thank survey respondents publicly

- [ ] Document community values and philosophy: Clarify what Tetromino stands for:
  - Create `PHILOSOPHY.md` or add to README:
    - Tetromino is intentionally one-way (respects vault autonomy)
    - Tetromino is deterministic (predictable, auditable output)
    - Tetromino is user-controlled (no background jobs, no surprises)
    - Tetromino is open source (transparent, community-driven)
    - Tetromino respects users' time (fast, reliable, minimal configuration)
  - Use this philosophy to guide decisions: does a feature fit?
  - Help community understand the "why" behind design choices

**By the end of this phase**, Tetromino will have a healthy, engaged community with clear expectations, transparent communication, and sustainable practices for long-term success. Contributors will feel welcomed, users will feel heard, and the project will be positioned for growth.

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

- [ ] Build a contributor onboarding guide: Make it easy to contribute:
  - Create `CONTRIBUTING.md` enhancements or a new `FIRST_CONTRIBUTION.md`:
    - "Good first issue" label: mark issues suitable for new contributors
    - Step-by-step: how to fork, clone, set up, make changes, test, submit PR
    - Reference the Playbook (Phase 04 for features, Phase 05 for testing)
    - Include a "Getting Help" section with links to discussions, chat, or maintainer contacts
    - Point to the Developer Guide (Phase 08 docs)
  - Respond promptly to first-time contributors and help them succeed
  - Thank contributors by name in release notes and README

- [ ] Set up community communication channels: Foster engagement beyond GitHub:
  - If not already done, enable GitHub Discussions:
    - "Announcements" category for releases and major news
    - "Questions & Help" for user questions and support
    - "Ideas & Feature Requests" for feature brainstorming
    - "Show & Tell" for users sharing creative import workflows
  - Monitor discussions regularly (at least weekly) and respond to questions
  - Summarize popular discussion topics and add to FAQ
  - Pin useful discussions and guides for easy access

- [ ] Create a maintainer succession plan: Ensure sustainability:
  - Document in a private file (e.g., MAINTAINERS.md or issue in private repo):
    - Current maintainers and their contact info
    - Key decisions only maintainers know (hosting, naming, future direction)
    - How to add new maintainers (what level of trust, what responsibilities)
    - Process if a maintainer steps down (transition, permissions, credits)
    - This ensures knowledge doesn't leave when someone does
  - If this plugin might outlive current maintainers, consider sponsorship models

- [ ] Monitor community health metrics: Track engagement and participation:
  - Watch these metrics monthly:
    - Issue response time: how long before first response to new issues?
    - PR response time: how long before review of submitted PRs?
    - Community contributions: how many PRs from non-maintainers?
    - User questions in Discussions: are questions being answered?
    - Stale issues: how many open issues with no activity for 6+ months?
  - Set targets (e.g., "respond to bugs within 24 hours", "maintain 50% community-contributed PRs")
  - Report metrics in a monthly status update to the community

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

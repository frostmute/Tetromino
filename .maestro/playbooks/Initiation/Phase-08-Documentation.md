# Phase 08: Documentation and Knowledge Sharing

This phase ensures Tetromino has comprehensive, maintainable documentation that serves both end users and contributors, making the plugin accessible and sustainable long-term.

## Tasks

- [x] Audit existing documentation for completeness and accuracy: Review current docs:
  - `README.md`: Feature overview, quick start, setup instructions, contribution links
  - `CONTRIBUTING.md`: Setup, build commands, PR checklist, coding standards
  - `CHANGELOG.md`: Version history with feature/fix/breaking change notes
  - `SECURITY.md`: Security practices, vulnerability disclosure, token handling
  - Check if docs match the actual codebase (commands, file paths, feature descriptions)
  - Identify gaps: features documented in code but not in README, settings help text but no guide
  - **Completed 2026-06-26.** Full audit report saved to `docs/research/documentation-audit.md`.
  - **Fixes applied:** corrected background-sync contradiction in README, added missing Template Engine feature highlight, updated outdated "Only 100 blocks" troubleshooting tip, fixed CONTRIBUTING playbook filename reference, fixed `scripts/release.sh` hardcoded GitHub URL, and corrected misleading encryption claim in SECURITY.md. All changes committed and pushed.

- [x] Create a comprehensive user guide: Build documentation that helps users get started:
  - Create `docs/USER_GUIDE.md` with:
    - Overview: what Tetromino does and doesn't do (one-way import only)
    - Installation: how to install the plugin (Obsidian community plugins search)
    - First import: step-by-step walkthrough of the first import (settings, channel mapping, import preview, commit)
    - Dry-run feature: how to preview import results without modifying vault
    - Settings reference: explain each setting with examples (channel mapping, template format, attachment handling)
    - Troubleshooting: common issues and solutions (auth token, Are.na API limits, vault permissions)
    - FAQ: answers to likely questions (two-way sync? auto-import? deletion behavior?)
  - **Completed 2026-06-26.** Created `docs/USER_GUIDE.md` with full overview, installation steps, first-import walkthrough, dry-run explanation, detailed settings reference tables, troubleshooting section, and FAQ. Cross-references to related docs (SETTINGS_REFERENCE, TROUBLESHOOTING, FAQ) included in YAML front matter.

- [x] Create developer documentation for contributors: Build onboarding docs for maintainers:
  - Create `docs/DEVELOPER_GUIDE.md` with:
    - Architecture overview: entry point → API → sync-engine → vault
    - Module guide: brief description of each file in src/ (main.ts, api.ts, sync-engine.ts, etc.)
    - Code style: TypeScript strict mode, error handling patterns, test expectations
    - Adding features: step-by-step guide (design, tests, implementation, docs)
    - Adding tests: how to mock Are.na API responses, structure test cases, achieve coverage
    - Debugging: how to add console logs, inspect plugin state, test locally
  - Cross-reference the Playbook phases (Phase 04 for features, Phase 05 for testing, etc.)
  - **Completed 2026-06-26.** Created `docs/DEVELOPER_GUIDE.md` with full architecture overview, module guide for all 11 source files, TypeScript strict-mode conventions, error-handling patterns, determinism requirements, step-by-step feature workflow with review checklist, test quick-start with mock examples, debugging commands for DevTools and local testing, and a playbook phase cross-reference table. Links to existing `docs/testing/testing-guide.md` to avoid duplication.

- [x] Document API design and integration patterns: Help contributors understand the Are.na integration:
  - Create `docs/API_DESIGN.md` with:
    - Are.na API overview: base URL, authentication, pagination limits
    - API endpoints used: /channels/{id}, /blocks, /attachments
    - Error handling: retry logic for transient failures, exponential backoff settings
    - Pagination: how Tetromino handles paginated results, page size limits
    - Rate limiting: Are.na rate limits and how to handle 429 responses
    - Future API versions: how to handle breaking changes in Are.na API v4+
  - **Completed 2026-06-26.** Created `docs/API_DESIGN.md` with full base URL and auth details, endpoint-by-endpoint coverage (channel metadata, contents, blocks, user channels, token verification, asset downloads), retry/backoff matrix with exact formulas and timing tables, pagination stop conditions, rate-limit handling with `Retry-After` parsing, response normalisation for v3/v2/array shapes, caching strategy, and a migration guide for hypothetical Are.na API v4+. Cross-references to [[DEVELOPER_GUIDE]] and [[USER_GUIDE]] included in YAML front matter.

- [ ] Create architecture decision records (ADRs) for major choices: Document key decisions:
  - Create `docs/ADRs/` folder and document decisions like:
    - ADR-001: One-way import only (why not two-way sync?)
    - ADR-002: Manual import triggered by user (why not background auto-sync?)
    - ADR-003: Deterministic output (same input → same output, why this matters)
    - ADR-004: Markdown-only format (why not rich HTML or other formats?)
    - ADR-005: Dry-run preview (how conflicts are detected, how preview differs from commit)
    - Include problem statement, decision, rationale, and consequences for each

- [ ] Document settings and configuration: Create reference docs for plugin settings:
  - Create `docs/SETTINGS_REFERENCE.md` with:
    - All available settings from settings-tab.ts (channel mappings, templates, attachment behavior)
    - Default values and allowed values for each setting
    - Examples of setting up a real channel mapping
    - Advanced features: custom templates, template variables (block type, title, source URL, etc.)
    - Backup and restoration: how settings are stored, how to backup configuration
    - Migration: if settings format changes between versions, how to upgrade

- [ ] Update README.md with clear, up-to-date feature list: Keep the main entry point fresh:
  - Review the README feature highlights and ensure they match current code
  - Add links to detailed docs for each major feature
  - Keep the Quick Navigation section updated with latest docs
  - Add badges for latest version, CI status, license (already present, verify they're correct)
  - Add a "For Users" vs "For Developers" section that directs people to appropriate docs
  - Include a link to the community plugins registry

- [ ] Create a FAQ document addressing common questions: Build a support resource:
  - Create `docs/FAQ.md` with questions like:
    - Why is import manual and not automatic?
    - Can Tetromino sync changes back to Are.na?
    - What happens if I delete a note imported by Tetromino?
    - How do I update settings without re-importing all channels?
    - What Are.na content is supported (images, videos, links, etc.)?
    - How do I troubleshoot import failures?
    - Can I use Tetromino offline?
    - Is my Are.na token secure?

- [ ] Document the release process for maintainers: Create a release guide:
  - Create `docs/RELEASE_GUIDE.md` that references Phase 06 but adds:
    - Detailed release checklist to follow step-by-step
    - Common mistakes and how to avoid them
    - How to test a release candidate in a test vault
    - How to handle urgent hotfixes
    - Post-release verification steps
  - Reference the script and automation in `.github/workflows/release.yml`

- [ ] Create troubleshooting guide and error reference: Help users solve problems:
  - Create `docs/TROUBLESHOOTING.md` with:
    - Common errors and their solutions:
      - "401 Unauthorized": invalid Are.na token
      - "404 Not Found": channel doesn't exist or is private
      - "Import failed": network error, Are.na server down, retry
      - "Vault permission denied": Obsidian vault path not accessible
      - "Template render error": invalid template syntax
    - How to collect logs for bug reports
    - How to check plugin version and Obsidian version
    - How to test a fresh install if configuration is corrupted

- [ ] Set up a knowledge base wiki or discussion board: Foster community knowledge:
  - Create a GitHub Discussions category for "Questions & Help" where users can ask questions
  - Pin the FAQ and troubleshooting guide in the discussions
  - Create discussion templates for common topics (feature requests, questions about settings, etc.)
  - Monitor discussions and add answers to the FAQ if new patterns emerge
  - Link to discussions from the main README

- [ ] Verify all docs are accurate and linked correctly: Final documentation audit:
  - Read through every doc you created and verify content is accurate (commands work, paths exist, features described exist)
  - Check all internal links (references between docs, links to specific code files)
  - Check all external links (Are.na API docs, Obsidian plugin registry, GitHub workflows)
  - Run a spell-check on all docs
  - Verify code examples actually work (copy-paste a template example and verify it parses correctly)

**By the end of this phase**, Tetromino will have comprehensive, accurate documentation that makes the plugin accessible to users, easy for contributors to understand, and sustainable for long-term maintenance.

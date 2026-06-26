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

- [x] Create architecture decision records (ADRs) for major choices: Document key decisions:
  - Create `docs/ADRs/` folder and document decisions like:
    - ADR-001: One-way import only (why not two-way sync?)
    - ADR-002: Manual import triggered by user (why not background auto-sync?)
    - ADR-003: Deterministic output (same input → same output, why this matters)
    - ADR-004: Markdown-only format (why not rich HTML or other formats?)
    - ADR-005: Dry-run preview (how conflicts are detected, how preview differs from commit)
    - Include problem statement, decision, rationale, and consequences for each
  - **Completed 2026-06-26.** Created `docs/ADRs/` folder with five ADR documents. Each ADR includes YAML front matter, status, context, decision, detailed rationale, consequences (positive and negative), implementation notes with code references, and cross-references to related ADRs and guides.

- [x] Document settings and configuration: Create reference docs for plugin settings:
  - Created `docs/SETTINGS_REFERENCE.md` with:
    - All available settings from settings-tab.ts and types.ts (channel mappings, templates, attachment behavior, notifications, logging)
    - Default values and allowed values for each setting in table format
    - Example of setting up a real channel mapping (`design-inspiration` → `Are.na/design-inspiration`)
    - Advanced features: custom templates with full variable reference, conditional/loop syntax, and a complete example
    - Backup and restoration: how settings are stored in Obsidian plugin data, how to back up channel mappings to JSON, and how to perform a full `data.json` backup
    - Migration: explanation of `loadSettings` normalization, mapping field upgrades, and attachment base snapshots for automatic migration prompts

- [x] Update README.md with clear, up-to-date feature list: Keep the main entry point fresh:
  - Reviewed the README feature highlights and ensured they match current code (verified all features against `src/main.ts`, `src/types.ts`, and `src/settings-tab.ts`)
  - Added links to detailed docs for each major feature (User Guide, Settings Reference, API Design, ADRs)
  - Updated the Quick Navigation section with latest docs (USER_GUIDE, SETTINGS_REFERENCE, FAQ, TROUBLESHOOTING, DEVELOPER_GUIDE, API_DESIGN, ADRs)
  - Verified badges for latest version, CI status, and license are correct (all point to `frostmute/Tetromino`, matching the git remote)
  - Added a "For Users" vs "For Developers" section that directs people to appropriate docs
  - Included a link to the Obsidian community plugins registry (`https://obsidian.md/plugins?id=Tetromino`)
  - Fixed the Commands section to only list actual Command Palette commands (removed "Import my channels" and "Backup channel mappings" which are settings UI actions, not commands)
  - Added installation instructions for both Community Plugins browser and manual installation

- [x] Create a FAQ document addressing common questions: Build a support resource:
  - Create `docs/FAQ.md` with questions like:
    - Why is import manual and not automatic?
    - Can Tetromino sync changes back to Are.na?
    - What happens if I delete a note imported by Tetromino?
    - How do I update settings without re-importing all channels?
    - What Are.na content is supported (images, videos, links, etc.)?
    - How do I troubleshoot import failures?
    - Can I use Tetromino offline?
    - Is my Are.na token secure?
  - **Completed 2026-06-26.** Created `docs/FAQ.md` with YAML front matter, structured Markdown, table of contents, and detailed answers for all eight questions. Cross-references to [[USER_GUIDE]], [[SETTINGS_REFERENCE]], [[TROUBLESHOOTING]], [[DEVELOPER_GUIDE]], [[ADR-001]], and [[ADR-002]] included. Also contains a supported content types table and a troubleshooting quick-reference matrix.

- [x] Document the release process for maintainers: Create a release guide:
  - Created `docs/RELEASE_GUIDE.md` that references Phase 06 but adds:
    - Detailed release checklist to follow step-by-step (8 phases from pre-release prep through documentation)
    - Common mistakes and how to avoid them (9 common pitfalls with recovery steps)
    - How to test a release candidate in a test vault (setup, install, test checklist, automated deploy script)
    - How to handle urgent hotfixes (workflow, principles, emergency bypass)
    - Post-release verification steps (immediate, short-term monitoring, long-term housekeeping)
  - Referenced the script and automation in `.github/workflows/release.yml` with a full step-by-step breakdown of the automated pipeline, failure modes, and pre-release support.
  - Cross-references to [[DEVELOPER_GUIDE]], [[USER_GUIDE]], [[FAQ]], [[API_DESIGN]], and [[testing-guide]] included in YAML front matter.

- [x] Create troubleshooting guide and error reference: Help users solve problems:
  - Created `docs/TROUBLESHOOTING.md` with:
    - Common errors and their solutions:
      - "401 Unauthorized": invalid Are.na token
      - "404 Not Found": channel doesn't exist or is private
      - "403 Access Denied": insufficient permissions
      - "429 Too Many Requests": rate limiting with backoff explanation
      - "500/502/503/504": Are.na server errors
      - "Import failed": network error, Are.na server down, retry
      - "No valid channels configured": empty or disabled mappings
      - "Vault permission denied": Obsidian vault path not accessible
      - "Template render error": invalid template syntax with minimal valid example
      - "Tetromino is already running": stuck sync state
      - "Attachment migration failed": move conflicts and permissions
      - Assets not downloading: handling mode and disk space checks
      - Fewer blocks imported than expected: exclusions and deduplication
      - Notes not updating after re-import: cache and hash checks
    - How to collect logs for bug reports (debug logging, DevTools, export, redaction notes)
    - How to check plugin version and Obsidian version
    - How to test a fresh install if configuration is corrupted (three options: reset plugin data, test vault, restore from backup)
  - **Completed 2026-06-26.** Structured with YAML front matter, table of contents, quick diagnostic checklist, detailed error sections with symptoms/causes/fixes pattern, and cross-references to [[USER_GUIDE]], [[SETTINGS_REFERENCE]], [[FAQ]], [[DEVELOPER_GUIDE]], and [[API_DESIGN]].

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

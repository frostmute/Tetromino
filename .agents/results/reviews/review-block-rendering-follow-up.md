# QA Review: Block Rendering Sanitizer Follow-up

## Scope

Reviewed only the current uncommitted sanitizer/image-rendering follow-up and `.agents/results/architecture/architecture-review-block-rendering.md`. The review covered `src/utils.ts`, `src/sync-engine.ts`, focused rendering tests, the architecture recommendation, and relevant security/template contracts. The rest of the project was not reviewed.

## Findings

### CRITICAL

None.

### HIGH

None.

### MEDIUM — fixed

1. **CRLF custom-template frontmatter was not preserved** (`src/utils.ts:11`, `src/utils.ts:66`). The sanitizer split only LF-delimited frontmatter, so a valid CRLF template caused the sanitizer to process frontmatter as body content, violating the stated frontmatter-preservation contract. The delimiter matcher now accepts CRLF and a regression test covers dangerous-looking frontmatter plus sanitized body content.

2. **The download fallback was unit-tested but not through the SyncEngine asset path** (`src/sync-engine.ts:580`). A missing `original.url` could regress in `ensureBlockAsset` even if the pure resolver test stayed green. Added an integration-style SyncEngine test proving that a display URL is downloaded and the generated note links the local asset.

### LOW — unresolved / deferred

1. **Four existing HIGH transitive development-dependency advisories remain** (`npm audit`: `brace-expansion`, `fast-uri`, `js-yaml`, `undici`). They are not introduced by this rendering follow-up and fixing them would require dependency-lockfile changes outside the scoped behavior. They should be handled in a separate dependency-maintenance change.

2. **Documentation drift remains outside this follow-up.** `docs/PERFORMANCE.md` and ADR-004 still describe the former duplicated renderer switch or template-only sanitization. The architecture artifact correctly identifies this as separate cleanup; changing those documents here would expand the requested scope.

## Security review

- No new injection, XSS, command execution, credential exposure, or unsafe deserialization path was introduced.
- Legacy and template output now use the same sanitizer wrapper while preserving frontmatter by design.
- Custom templates remain caller-controlled; `{{image}}` behavior is preserved. Arbitrary custom-template rewriting was correctly not attempted.
- Frontmatter is intentionally not sanitized to avoid corrupting user-authored YAML; this remains a documented tradeoff and should be revisited only if Obsidian metadata rendering is shown to execute unsafe values.

## Performance review

- Image resolution examines at most three variants.
- Sanitization remains linear in rendered note size across the existing regex passes.
- No network calls or unbounded work were added to rendering.
- Existing template AST cache and SyncEngine size were observed but are outside this scoped follow-up.

## Accessibility review

Not applicable: the follow-up changes Markdown generation, tests, and an architecture artifact; no UI or interactive surface changed.

## Validation

- Focused tests: 122 passed.
- Full Jest suite: 367 tests passed.
- Typecheck: passed.
- Production build/package: passed.
- Lint: passed with two pre-existing warnings in `settings-tab.ts`.
- `git diff --check`: passed.

MCP analysis tools, memory tools, and `oma` state commands were unavailable in this worktree; repository search/read tools and the project test/build commands were used instead. No commit, push, or PR operation was performed.

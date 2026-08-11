# Architecture Review: Block-to-Note Rendering

## Status

Proposed

## Scope and decision

This is a review of the existing rendering architecture, scoped to the Are.na block-to-note path: image and attachment acquisition, legacy Markdown output, custom-template output, sanitization, settings compatibility, and the SyncEngine-to-renderer boundary.

The decision is whether the current fix should remain an incremental shared-renderer design or be replaced by a larger rendering architecture.

## Problem framing

Tetromino must reliably preserve block content and render images across mixed Are.na block types while maintaining deterministic output and existing vault compatibility. The original failure came from class-specific content switches in separate template and legacy paths: text stored in `block.content` could be dropped, and image blocks could produce no usable note embed when API image variants were incomplete.

The current design has already moved the block-body representation into one shared `renderBlockContent` path and has a single image URL resolver. The remaining architecture question is how far to formalize that boundary without adding a speculative rendering framework.

### Constraints

- Existing notes, saved custom templates, and the legacy hardcoded output must remain usable.
- Sync output must remain deterministic for identical remote data and settings.
- Image downloads belong to the sync/network boundary; rendering must consume an optional local asset path rather than perform I/O.
- The plugin is a small TypeScript/Obsidian plugin with no separate backend or persistent rendering service.
- The Markdown-only contract and one-way import model remain in force.
- No new user-facing setting or template language feature is required for this decision.

### Quality attributes

1. Correctness for all current and future block classes with a usable `content` field.
2. Determinism and compatibility with dry-run/hash comparisons.
3. Backward compatibility for legacy output and user-authored templates.
4. Security parity between output paths.
5. Low maintenance cost and bounded bundle/runtime overhead.
6. Testability at both pure-rendering and sync-integration boundaries.

### Non-goals

- Replacing the Handlebars-like template engine.
- Removing the legacy output path or forcing users to migrate custom templates.
- Introducing rich HTML rendering, a plugin marketplace, a new data model for all Are.na API responses, or a renderer registry.
- Splitting the 1,000-line SyncEngine as part of this bug fix.
- Adding telemetry or a rendering-preview UI.

## Existing architecture

```text
ArenaApi
  └─ fetches/normalizes ArenaBlock and downloads binary assets
       └─ SyncEngine
            ├─ chooses asset URL and writes/ensures local assetPath
            ├─ gathers optional enrichment context
            └─ calls blockToMarkdown(block, settings, context)
                 ├─ shared renderBlockContent()
                 ├─ legacy frontmatter/sections path
                 └─ custom template path → templateUtils AST renderer
                      └─ sanitizeMarkdownContent() for body/output safety
```

### Ownership and coupling

- `ArenaApi` owns HTTP, retries, caching, pagination, and binary download.
- `SyncEngine` owns orchestration, asset lifecycle, enrichment fetching, hashing, conflicts, and vault writes.
- `utils.ts` owns pure filename/path/hash helpers and Markdown generation.
- `templateUtils.ts` only parses and evaluates templates; it does not know Are.na block semantics.
- `securityUtils.ts` sanitizes rendered Markdown content.
- `main.ts` owns settings persistence and compatibility migration, including recognition of the previous built-in template.

The useful boundary is that `SyncEngine` resolves external resources before calling the pure renderer. The main coupling risk is the broad, optional `MarkdownContext` object: it carries local asset paths, preview URLs, enrichment arrays, and channel metadata as loosely structured strings. A secondary risk is that `blockToMarkdown` still has two output assemblies, so metadata and appendices can diverge even though block-body rendering is shared.

## Architecture risks found

- The old duplicated class switch is the root cause of the original missing-content defect; it is now removed from the two rendering paths.
- API image variants are optional in practice, so a single hard-coded `original.url` assumption is unsafe. Download and display consumers need different priorities but the same fallback source.
- Before the current change, legacy output bypassed the sanitizer used by templates. That made the security contract depend on the selected output mode.
- Exact-string migration of the previous default template is intentionally narrow: it protects the built-in default without rewriting arbitrary user-authored templates.
- `SyncEngine` remains a large orchestration boundary. Splitting it now would increase risk and scope without being necessary to solve block rendering.
- Existing documentation still contains at least one stale performance/architecture claim about duplicated rendering switches; documentation drift should be corrected separately, not mixed into the rendering fix unless it describes the selected contract.

## Methods considered

### Selected method: Diagnostic + lightweight Recommendation

This is the lightest sufficient method because the failure is localized, the system already has explicit module boundaries, and the decision is a bounded structural tradeoff rather than a new distributed architecture. A full ATAM/CBAM exercise or a broad stakeholder consensus round would add ceremony without changing the available evidence.

## Options

### Option A — Keep the incremental shared-renderer boundary

Keep `blockToMarkdown` as the single public rendering entry point. Have both output modes consume one canonical block-body renderer, use one image URL resolver with explicit priorities, and apply the same body sanitizer. Keep asset downloads and enrichment fetches in `SyncEngine`.

- **Implementation cost:** Small; touches renderer, asset handoff, and focused tests.
- **Operational cost:** None beyond existing rendering and download work.
- **Future change cost:** Low for adding a block-content rule; moderate for adding a third output format.
- **Reversibility:** High; helpers can later feed a richer model.
- **Risks:** Legacy/template metadata and appendices can still diverge; the optional context remains broad.
- **Fit:** Directly addresses the demonstrated defect while preserving compatibility and deterministic hashing.

### Option B — Introduce a typed intermediate block representation

Create a typed `RenderedBlock`/`BlockBody` model containing canonical body elements, media references, metadata, descriptions, comments, and connected channels. Render that model separately into legacy Markdown or a custom-template variable map.

- **Implementation cost:** Medium to large; requires new contracts, conversion code, serializer changes, and migration/test review.
- **Operational cost:** Negligible runtime overhead, but more allocations per block.
- **Future change cost:** Lower when adding multiple output formats or rich block semantics.
- **Reversibility:** Medium; once templates depend on the model's shape, the contract becomes another compatibility surface.
- **Risks:** Over-modeling current Markdown needs, accidental output changes, and a larger test matrix.
- **Fit:** Strong structural foundation only if a second serious renderer or many new block classes are planned.

### Option C — Make the custom template path the sole renderer

Migrate the built-in legacy format into the template system and remove the hardcoded path after a compatibility period.

- **Implementation cost:** Large; requires migration/versioning, fallback behavior, and careful treatment of saved custom templates.
- **Operational cost:** Slightly more parsing/rendering work, though AST caching limits repeated parsing.
- **Future change cost:** Lower internally, but higher for compatibility and support.
- **Reversibility:** Low once legacy output is removed.
- **Risks:** Existing vaults and users depending on legacy output may receive broad note changes; template errors become a primary sync failure mode.
- **Fit:** Not justified by the current bug and conflicts with the request to keep scope small.

## Recommendation

**Choose Option A: retain and harden the incremental shared-renderer boundary.** It fixes the actual failure mode at its source: canonical body construction must not depend on whether the caller selected legacy or custom-template output. A single resolver with explicit image priorities keeps display/banner/download behavior consistent without introducing a new representation contract. Sanitizing both output paths restores the Markdown safety invariant already intended by the project.

Do not introduce an intermediate representation or remove the legacy path yet. Those are valid future directions if the plugin adds another renderer, richer block semantics, or a user-facing preview/editor that needs structured output. For the current plugin, they would trade a proven small fix for a larger compatibility surface.

## Stakeholder perspectives

No external agent consultation was justified for this narrow decision, and the configured MCP/`oma` architecture tools were unavailable in this worktree. The following perspectives were derived from the code, tests, and documented contracts rather than presented as agent consensus:

- **User/compatibility:** preserve custom templates and avoid rewriting arbitrary `{{image}}` usage; migrate only the exact previous built-in default.
- **Sync/API owner:** resolve/download assets before rendering and tolerate missing `original`, `display`, or `thumb` variants.
- **Security/QA:** enforce sanitizer parity across legacy and template output and test both modes with dangerous imported content.
- **Maintainer:** prefer one shared body rule and explicit resolver priorities over duplicated switches; avoid splitting `SyncEngine` during a correctness fix.

## Validation plan

- Unit-test generic `block.content` for Text, Embed, and unknown/current classes in both output modes.
- Unit-test image resolution for display-first, thumb-first, original-first, and incomplete image metadata.
- Unit-test downloaded images with a local `assetPath`, including fallback when `original.url` is absent.
- Assert sanitizer parity for legacy and template output while preserving frontmatter.
- Run mixed-block integration coverage with text, media, image, attachment, and channel blocks.
- Run determinism tests, typecheck, lint, production build, and `git diff --check`.
- Manually import a real mixed channel after implementation and inspect both downloaded assets and generated note bodies.

## Deferred decisions

- Whether `MarkdownContext` should become a narrower typed context or a structured render model. Defer until a second renderer or additional output consumers exist.
- Whether to split `SyncEngine` into orchestration, asset, and indexing modules. Defer as a separate maintainability change.
- Whether to update stale architecture/performance documentation claims. Do separately so documentation cleanup does not obscure behavioral changes.

## Completion criteria

The selected architecture is successful when all current block types preserve meaningful content, image assets resolve through a documented priority order, legacy and template output share the same body semantics and safety behavior, existing custom templates remain caller-controlled, and repeated imports remain byte-deterministic.

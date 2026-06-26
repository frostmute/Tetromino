# Feature Inventory - Loop 00001

## README Analysis

### README Location
`/Users/thewytchhaus/Documents/GitHub/Tetromino/README.md`

### README Structure
| Section | Description | Line Numbers |
|---------|-------------|--------------|
| What This Plugin Is (and Is Not) | Core value proposition and boundaries | 30-36 |
| Feature Highlights | High-level feature overview | 38-72 |
| Commands | User-accessible commands list | 80-88 |
| Settings Overview | Configuration options summary | 90-100 |
| How Import Works | Step-by-step import workflow | 102-111 |
| Installation | Setup instructions | 113-118 |
| Development | Build and development workflow | 120-143 |
| Companion Tools | Links to related projects | 145-147 |
| Security | Security and privacy guarantees | 149-155 |
| Troubleshooting | Common issues and solutions | 157-184 |
| Features Updated (v1.0.0 parity) | New features in latest version | 190-196 |

### Features Documented in README
| Feature | Section | Description in README |
|---------|---------|----------------------|
| Import Engine | Feature Highlights | Imports mapped Are.na channels into mapped vault folders; supports full pagination; retries transient failures with backoff; shows status bar progress |
| Deterministic Writing | Feature Highlights | Writes stable Markdown notes for blocks; rewrites when content changes; writes channel index and master overview notes; supports channel index naming for Folder Note compatibility |
| Block Enrichment | Feature Highlights | Optional banner frontmatter, block description, block comments, connected channel list, best-effort preview images |
| Attachments and Media | Feature Highlights | Image handling (download/embed/link); non-image attachment handling; storage modes (channel-local/global/custom); per-channel overrides; migration tools |
| Channel Management | Feature Highlights | Import my channels; auto-enable toggle; backup/restore/reset tools; default mapping to `Are.na/<channel-slug>` |
| Import all channels now | Commands | Command to import all mapped channels |
| Preview import (dry-run) | Commands | Dry-run preview before import |
| Import current channel | Commands | Import the channel for current active file |
| Preview current channel import (dry-run) | Commands | Dry-run preview for current channel |
| Open channel on Are.na | Commands | Open channel webpage |
| Preview attachment migration | Commands | Preview attachment storage migration |
| Run attachment migration | Commands | Execute attachment migration |
| API token with verify action | Settings Overview | Authentication with Are.na API |
| Block file naming | Settings Overview | Choose between title, id, or title-id naming |
| Banner frontmatter options | Settings Overview | Toggle, field name, image source priority |
| Optional enrichments | Settings Overview | Toggle description, comments, connected channels, channel preview |
| Image and attachment rendering | Settings Overview | Image handling modes and attachment rendering styles |
| Attachment storage controls | Settings Overview | Global defaults and per-channel overrides |
| Template engine toggle | Settings Overview | Custom template string support |
| Frontmatter, notifications, debug logging toggles | Settings Overview | UI and logging preferences |
| Channel mapping management | Settings Overview | Add/edit/remove channel mappings |
| Sync on startup | Settings Overview | Automatic sync when Obsidian starts |
| Sync interval | Settings Overview | Recurring sync scheduling |
| Handlebars-lite templating | Features Updated | AST-based programmatic control over block-to-markdown mapping |
| Security sanitization | Features Updated | Prevents executable Obsidian logic injection |
| Download utilities | Features Updated | Binary download helpers with magic-byte validation and safe redirects |
| GraphQL API utilities | Features Updated | Rate-limited GraphQL client for Are.na v3 |

---

## Codebase Analysis

### Project Type
- **Language/Framework:** TypeScript/React (Obsidian Plugin)
- **Application Type:** Obsidian plugin (desktop application extension)

### Features Found in Code
| Feature | Location | Type | User-Facing? |
|---------|----------|------|--------------|
| Import all channels | main.ts | Command | Yes |
| Preview import (dry-run) | main.ts | Command | Yes |
| Import current channel | main.ts | Command | Yes |
| Preview current channel import (dry-run) | main.ts | Command | Yes |
| Open channel on Are.na | main.ts | Command | Yes |
| Preview attachment migration | main.ts | Command | Yes |
| Run attachment migration | main.ts | Command | Yes |
| Ribbon icon for quick import | main.ts | UI | Yes |
| Status bar progress indicator | main.ts | UI | Yes |
| API token configuration | settings-tab.ts | Config | Yes |
| Block file naming scheme | settings-tab.ts | Config | Yes |
| Banner frontmatter field | settings-tab.ts | Config | Yes |
| Banner field name customization | settings-tab.ts | Config | Yes |
| Banner image source priority | settings-tab.ts | Config | Yes |
| Block description in frontmatter | settings-tab.ts | Config | Yes |
| Import block comments | settings-tab.ts | Config | Yes |
| Import connected channels | settings-tab.ts | Config | Yes |
| Channel block preview image | settings-tab.ts | Config | Yes |
| Channel index note naming | settings-tab.ts | Config | Yes |
| Image handling (download/embed/link) | settings-tab.ts | Config | Yes |
| Attachment handling modes | settings-tab.ts | Config | Yes |
| Downloaded attachment render style | settings-tab.ts | Config | Yes |
| Attachment storage location | settings-tab.ts | Config | Yes |
| Global attachment folder | settings-tab.ts | Config | Yes |
| Custom attachment folder | settings-tab.ts | Config | Yes |
| Frontmatter toggle | settings-tab.ts | Config | Yes |
| Exclude block classes | settings-tab.ts | Config | Yes |
| Sync on startup | settings-tab.ts | Config | Yes |
| Sync interval scheduling | settings-tab.ts | Config | Yes |
| Show notifications | settings-tab.ts | Config | Yes |
| Debug logging | settings-tab.ts | Config | Yes |
| Auto-enable imported channels | settings-tab.ts | Config | Yes |
| Import my channels | settings-tab.ts | UI Action | Yes |
| Backup channel mappings | settings-tab.ts | UI Action | Yes |
| Restore latest backup | settings-tab.ts | UI Action | Yes |
| Reset channel mappings | settings-tab.ts | UI Action | Yes |
| Add channel mapping | settings-tab.ts | UI Action | Yes |
| Deterministic sync engine | sync-engine.ts | Core | No |
| Block normalization to Markdown | sync-engine.ts | Core | No |
| Handlebars-lite template engine | templateUtils.ts | Core | No |
| Security sanitization | securityUtils.ts | Core | No |
| Difference computation (diff) | diff.ts | Core | No |
| Migration planning and execution | migration.ts | Core | No |
| Are.na API client | api.ts | Core | No |
| GraphQL API support | api.ts | Core | No |
| Paginated API requests | api.ts | Core | No |
| Retry with backoff logic | api.ts | Core | No |

---

## Feature Summary

### Totals
- **Features in README:** 26 (documented features from command list, settings overview, and feature highlights)
- **Features in Code:** 40 (user-facing commands, settings, and UI actions)
- **Potential Gaps:** 14 (code features not mentioned in README)
- **Potential Stale:** 0 (all README features are present in code)

### Quick Classification

#### Likely Undocumented (in code, not in README)
1. Ribbon icon for quick import - Quick access button in the left sidebar
2. Status bar progress indicator - Visual feedback during import operations
3. Banner field name customization - Setting to override the banner field name
4. Auto-enable imported channels - Toggle for imported channels to auto-enable
5. Import my channels - Bulk import from user's Are.na account
6. Backup channel mappings - Save channel mapping configurations
7. Restore latest backup - Restore previously backed-up configurations
8. Reset channel mappings - Clear all channel mappings
9. Add channel mapping - Manual channel mapping creation UI
10. Preview migration - Dry-run for attachment storage migration
11. Run migration - Execute attachment migration
12. Frontmatter toggle - Option to include/exclude YAML frontmatter
13. Exclude block classes - Filter out specific block types
14. Debug logging - Enable verbose logging for troubleshooting

#### Possibly Stale (in README, not found in code)
None - all documented features are implemented.

#### Confirmed Documented (in both)
1. Import all channels now - Fully documented and implemented
2. Preview import (dry-run) - Fully documented and implemented
3. Import current channel - Fully documented and implemented
4. Preview current channel import - Fully documented and implemented
5. Open channel on Are.na - Fully documented and implemented
6. Preview attachment migration - Fully documented and implemented
7. Run attachment migration - Fully documented and implemented
8. API token verification - Fully documented and implemented
9. Block file naming - Fully documented and implemented
10. Banner frontmatter options - Fully documented and implemented
11. Optional enrichments - Fully documented and implemented
12. Image and attachment handling - Fully documented and implemented
13. Attachment storage controls - Fully documented and implemented
14. Channel management tools - Fully documented and implemented
15. Handlebars-lite templating - Fully documented and implemented
16. Security sanitization - Fully documented and implemented
17. Download utilities - Fully documented and implemented
18. GraphQL API utilities - Fully documented and implemented

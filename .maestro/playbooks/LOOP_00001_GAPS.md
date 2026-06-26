# Documentation Gaps - Loop 00001

## Summary
- **Total Gaps Found:** 14
- **MISSING (undocumented features):** 14
- **STALE (removed features still documented):** 0
- **INACCURATE (wrong descriptions):** 0
- **INCOMPLETE (needs more detail):** 0

---

## Gap List

### GAP-001: Ribbon Icon for Quick Import
- **Type:** MISSING
- **Feature:** Ribbon icon for quick import
- **Code Location:** `main.ts` (UI)
- **README Location:** Not mentioned
- **Description:**
  The plugin adds a ribbon icon in the left sidebar for quick access to import operations, but this UI element is not documented in the README.
- **Evidence:**
  - Code: Ribbon icon registered as a UI element in main.ts
  - README: No mention of ribbon icon or sidebar quick-access features
- **User Impact:** Users discovering the plugin won't know about the convenient ribbon icon shortcut in the sidebar, and may miss this quick-access feature entirely.

### GAP-002: Status Bar Progress Indicator
- **Type:** MISSING
- **Feature:** Status bar progress indicator
- **Code Location:** `main.ts` (UI)
- **README Location:** Not mentioned
- **Description:**
  The plugin displays real-time progress in Obsidian's status bar during import operations, but this visual feedback mechanism is not documented.
- **Evidence:**
  - Code: Status bar progress indicator implemented in main.ts
  - README: Feature Highlights mentions "Shows status bar progress" but Settings Overview and Command documentation don't explain how to monitor progress
- **User Impact:** Users won't know to check the status bar for real-time feedback during long-running imports, making it harder to understand operation progress.

### GAP-003: Banner Field Name Customization
- **Type:** INCOMPLETE
- **Feature:** Banner field name customization
- **Code Location:** `settings-tab.ts` (Config)
- **README Location:** Line 94 "Banner frontmatter options"
- **Description:**
  The README mentions "Banner frontmatter options" but does not explain the specific capability to customize the frontmatter field name.
- **Evidence:**
  - Code: Banner field name customization setting exists in settings-tab.ts
  - README: Line 94 mentions "Banner frontmatter options (`enabled`, field name, image source priority)" but doesn't explain what field name customization allows users to do
- **User Impact:** Users won't understand how to customize the banner field name to match their vault's naming conventions, leading to confusion about metadata naming.

### GAP-004: Auto-Enable Imported Channels
- **Type:** INCOMPLETE
- **Feature:** Auto-enable imported channels toggle
- **Code Location:** `settings-tab.ts` (Config)
- **README Location:** Line 76 "Auto-enable imported channels"
- **Description:**
  The feature is mentioned by name in Feature Highlights but not explained in Settings Overview.
- **Evidence:**
  - Code: Auto-enable imported channels toggle in settings-tab.ts
  - README: Line 76 in Feature Highlights mentions "`Auto-enable imported channels` toggle for granular control" but Settings Overview (lines 90-100) doesn't include this setting in the detailed list
- **User Impact:** Users won't know where to find this setting in the Settings tab or what exactly it controls, making granular channel control harder to discover.

### GAP-005: Import My Channels Command
- **Type:** INCOMPLETE
- **Feature:** Import my channels (bulk import from user's Are.na account)
- **Code Location:** `settings-tab.ts` (UI Action)
- **README Location:** Line 75 and Feature Highlights
- **Description:**
  The feature is mentioned in Feature Highlights but not listed in the Commands section, and the Settings Overview mentions it but doesn't explain the workflow.
- **Evidence:**
  - Code: "Import my channels" is a UI action in settings-tab.ts
  - README: Line 75 mentions it in Feature Highlights, but the Commands section (lines 80-88) doesn't list this as an available command
- **User Impact:** Users looking at the Commands list won't see this bulk import feature and may miss this powerful way to quickly set up all their channel mappings.

### GAP-006: Backup Channel Mappings
- **Type:** MISSING
- **Feature:** Backup channel mappings
- **Code Location:** `settings-tab.ts` (UI Action)
- **README Location:** Not mentioned in Commands
- **Description:**
  The plugin provides backup functionality for channel mappings, but this is only mentioned generically in Feature Highlights as "backup/restore/reset tools" without explaining it as a separate action.
- **Evidence:**
  - Code: Backup channel mappings action in settings-tab.ts
  - README: Line 77 mentions "Backup, restore, and reset tools" in Feature Highlights but Commands section doesn't list "Backup channel mappings" as a separate, discoverable action
- **User Impact:** Users won't know how to save their channel mapping configuration, making it harder to safeguard their setup against accidental loss.

### GAP-007: Restore Latest Backup
- **Type:** MISSING
- **Feature:** Restore latest backup
- **Code Location:** `settings-tab.ts` (UI Action)
- **README Location:** Not mentioned in Commands
- **Description:**
  The restore functionality exists but is not documented as a separate, discoverable command.
- **Evidence:**
  - Code: Restore latest backup action in settings-tab.ts
  - README: Generic mention in Feature Highlights but not listed in Commands section
- **User Impact:** Users won't know how to recover from accidental channel mapping changes or deletions, leading to potential data loss frustration.

### GAP-008: Reset Channel Mappings
- **Type:** MISSING
- **Feature:** Reset channel mappings
- **Code Location:** `settings-tab.ts` (UI Action)
- **README Location:** Not mentioned in Commands
- **Description:**
  The reset functionality exists but is not documented as a separate, discoverable command.
- **Evidence:**
  - Code: Reset channel mappings action in settings-tab.ts
  - README: Generic mention in Feature Highlights but not listed in Commands section
- **User Impact:** Users won't know how to completely clear their channel mappings without manually deleting each one, making it harder to start fresh.

### GAP-009: Add Channel Mapping
- **Type:** MISSING
- **Feature:** Add channel mapping (manual channel mapping creation UI)
- **Code Location:** `settings-tab.ts` (UI Action)
- **README Location:** Not mentioned
- **Description:**
  While the README discusses channel mapping management, it doesn't explain the UI action for manually adding individual channel mappings.
- **Evidence:**
  - Code: Add channel mapping UI action in settings-tab.ts
  - README: No specific instruction on how to manually add a single channel mapping through the settings UI
- **User Impact:** Users won't know about the UI affordance for adding individual channels if they don't want to use bulk import, making manual setup harder to discover.

### GAP-010: Frontmatter Toggle
- **Type:** INCOMPLETE
- **Feature:** Frontmatter toggle
- **Code Location:** `settings-tab.ts` (Config)
- **README Location:** Line 99
- **Description:**
  The README mentions "Frontmatter, notifications, and debug logging toggles" but doesn't explain what the frontmatter toggle does or why a user would disable it.
- **Evidence:**
  - Code: Frontmatter toggle in settings-tab.ts
  - README: Line 99 mentions it exists but provides no explanation of its purpose
- **User Impact:** Users won't understand when or why they'd want to disable frontmatter output, potentially missing an important configuration option.

### GAP-011: Exclude Block Classes
- **Type:** MISSING
- **Feature:** Exclude block classes (filter out specific block types)
- **Code Location:** `settings-tab.ts` (Config)
- **README Location:** Not mentioned
- **Description:**
  The plugin has a setting to exclude certain block types by CSS class, but this advanced configuration option is not documented.
- **Evidence:**
  - Code: Exclude block classes setting in settings-tab.ts
  - README: No mention of block filtering or class-based exclusion
- **User Impact:** Advanced users won't know they can filter out specific block types, limiting their ability to customize import behavior.

### GAP-012: Debug Logging
- **Type:** INCOMPLETE
- **Feature:** Debug logging toggle
- **Code Location:** `settings-tab.ts` (Config)
- **README Location:** Line 99 and Troubleshooting section
- **Description:**
  Debug logging is mentioned in Settings Overview but not explained in the Troubleshooting section where users would look for it.
- **Evidence:**
  - Code: Debug logging toggle in settings-tab.ts
  - README: Line 99 mentions "debug logging toggles" and line 168 suggests "Enable debug logging to monitor progress" but doesn't explain how to enable it or where the logs appear
- **User Impact:** Users trying to troubleshoot slow imports won't easily find instructions on how to enable and access debug logs.

### GAP-013: Template Engine Customization
- **Type:** INCOMPLETE
- **Feature:** Template engine toggle and custom template string
- **Code Location:** `settings-tab.ts` (Config)
- **README Location:** Line 98
- **Description:**
  The README mentions "Template engine toggle and custom template string" but doesn't explain how to use custom templates or what the Handlebars-lite syntax looks like.
- **Evidence:**
  - Code: Template engine toggle and custom template setting in settings-tab.ts
  - README: Line 98 mentions it exists but provides no documentation on how to write custom templates; Features Updated section mentions "Handlebars-lite templating" but doesn't explain usage
- **User Impact:** Users wanting to customize markdown output won't know how to write Handlebars templates or what syntax is supported, making this powerful feature unusable.

### GAP-014: Migration Actions Details
- **Type:** INCOMPLETE
- **Feature:** Preview migration and Run migration commands
- **Code Location:** `main.ts` (Commands)
- **README Location:** Lines 87-88 and Troubleshooting
- **Description:**
  While migration commands are listed, the README doesn't explain what migration does or when users would use it.
- **Evidence:**
  - Code: Preview attachment migration and Run attachment migration commands in main.ts
  - README: Commands are listed (lines 87-88) and a troubleshooting tip mentions attachment downloads (line 179) but doesn't explain what the migration feature is or what problem it solves
- **User Impact:** Users with attachment storage changes won't understand that migration is needed to move existing attachments, potentially leaving orphaned files or duplicates.

---

## Gaps by Type

### MISSING Features
| Gap ID | Feature | Code Location | User Impact |
|--------|---------|---------------|-------------|
| GAP-001 | Ribbon icon for quick import | main.ts | Users miss convenient sidebar shortcut |
| GAP-002 | Status bar progress indicator | main.ts | Users don't know to check status bar during imports |
| GAP-005 | Import my channels command | settings-tab.ts | Users miss bulk import from Are.na account |
| GAP-006 | Backup channel mappings | settings-tab.ts | Users don't know how to save channel mappings |
| GAP-007 | Restore latest backup | settings-tab.ts | Users can't recover from accidental changes |
| GAP-008 | Reset channel mappings | settings-tab.ts | Users can't easily reset all mappings |
| GAP-009 | Add channel mapping UI | settings-tab.ts | Users can't discover manual mapping creation |
| GAP-011 | Exclude block classes | settings-tab.ts | Advanced users can't filter block types |

### INCOMPLETE Documentation
| Gap ID | Feature | What's Missing |
|--------|---------|----------------|
| GAP-003 | Banner field name | How to customize field names |
| GAP-004 | Auto-enable toggle | Where setting is located and what it controls |
| GAP-010 | Frontmatter toggle | When and why to disable frontmatter |
| GAP-012 | Debug logging | How to enable and where logs appear |
| GAP-013 | Template customization | Handlebars-lite syntax and usage examples |
| GAP-014 | Migration actions | What migration does and when it's needed |

---

## Priority Indicators

### High Priority Gaps
Features that new users would immediately encounter or need:
1. **GAP-005: Import my channels** - Critical first-time setup feature that's easy to miss
2. **GAP-009: Add channel mapping** - Essential for manual channel setup without bulk import
3. **GAP-012: Debug logging** - Users troubleshooting slow imports need clear instructions
4. **GAP-013: Template customization** - Users wanting custom output need syntax documentation

### Medium Priority Gaps
Features that regular users would use:
1. **GAP-003: Banner field name customization** - Users with custom vault structures need this
2. **GAP-006: Backup channel mappings** - Users need to know how to protect their configuration
3. **GAP-007: Restore latest backup** - Users need disaster recovery capability
4. **GAP-014: Migration actions** - Users changing attachment storage need clear guidance
5. **GAP-004: Auto-enable toggle** - Important for managing channel import automation

### Low Priority Gaps
Advanced features or edge cases:
1. **GAP-001: Ribbon icon** - Visual discovery; once found, obvious how to use
2. **GAP-002: Status bar indicator** - Nice-to-know but works intuitively
3. **GAP-008: Reset channel mappings** - Less common use case than backup/restore
4. **GAP-010: Frontmatter toggle** - Niche use case for special vault layouts
5. **GAP-011: Exclude block classes** - Advanced filtering for power users

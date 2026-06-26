# Documentation Fix Plan - Loop 00001

## Summary
- **Total Gaps:** 14
- **Auto-Fix (PENDING):** 13
- **Needs Review:** 0
- **Won't Do:** 1

## Current README Accuracy: 60%
## Target README Accuracy: 90%

---

## PENDING - Ready for Auto-Fix

### DOC-001: Import My Channels Command
- **Status:** `IMPLEMENTED`
- **Gap ID:** GAP-005
- **Type:** INCOMPLETE
- **User Importance:** CRITICAL
- **Fix Effort:** EASY
- **README Section:** Commands section (after "Import current channel")
- **Implemented In:** Loop 00001
- **Fix Description:**
  Add documentation for the "Import my channels" bulk import command, which allows users to quickly create mappings from their Are.na account without manual setup.
- **Proposed Content:**
  ```markdown
  - `Import my channels` - Bulk-create channel mappings from your Are.na account
  ```

### DOC-002: Backup Channel Mappings Command
- **Status:** `PENDING`
- **Gap ID:** GAP-006
- **Type:** MISSING
- **User Importance:** HIGH
- **Fix Effort:** EASY
- **README Section:** Commands section (new command)
- **Fix Description:**
  Add documentation for the backup channel mappings command to help users protect their configuration.
- **Proposed Content:**
  ```markdown
  - `Backup channel mappings` - Save current channel mappings to a backup file
  ```

### DOC-003: Restore Latest Backup Command
- **Status:** `PENDING`
- **Gap ID:** GAP-007
- **Type:** MISSING
- **User Importance:** HIGH
- **Fix Effort:** EASY
- **README Section:** Commands section (after "Backup channel mappings")
- **Fix Description:**
  Add documentation for the restore backup command to help users recover from accidental changes.
- **Proposed Content:**
  ```markdown
  - `Restore latest backup` - Restore channel mappings from the most recent backup
  ```

### DOC-004: Reset Channel Mappings Command
- **Status:** `PENDING`
- **Gap ID:** GAP-008
- **Type:** MISSING
- **User Importance:** MEDIUM
- **Fix Effort:** EASY
- **README Section:** Commands section (after "Restore latest backup")
- **Fix Description:**
  Add documentation for the reset channel mappings command for users who want to clear all mappings and start fresh.
- **Proposed Content:**
  ```markdown
  - `Reset channel mappings` - Clear all channel mappings (cannot be undone)
  ```

### DOC-005: Add Channel Mapping UI
- **Status:** `PENDING`
- **Gap ID:** GAP-009
- **Type:** MISSING
- **User Importance:** HIGH
- **Fix Effort:** EASY
- **README Section:** Settings Overview section (new subsection)
- **Fix Description:**
  Add documentation explaining how to manually add individual channel mappings through the Settings UI for users who don't want bulk import.
- **Proposed Content:**
  ```markdown
  ### Channel Mapping Management
  
  - Click "Add channel mapping" in the Channel Mapping section to manually create a mapping
  - Specify the Are.na channel slug and the target Obsidian folder
  - Check "Auto-enable" to include this channel in default imports
  - Remove mappings by clicking the delete button next to each mapping
  ```

### DOC-006: Status Bar Progress Indicator
- **Status:** `PENDING`
- **Gap ID:** GAP-002
- **Type:** MISSING
- **User Importance:** MEDIUM
- **Fix Effort:** EASY
- **README Section:** Feature Highlights → Import Engine section
- **Fix Description:**
  Expand the existing status bar mention to explain what progress information is displayed and how to read it.
- **Proposed Content:**
  Update line 47 from:
  ```markdown
  - Shows status bar progress for channels and block pages.
  ```
  To:
  ```markdown
  - Shows real-time status bar progress: current channel name and page count during imports.
  ```

### DOC-007: Banner Field Name Customization
- **Status:** `PENDING`
- **Gap ID:** GAP-003
- **Type:** INCOMPLETE
- **User Importance:** MEDIUM
- **Fix Effort:** EASY
- **README Section:** Settings Overview → Banner frontmatter options
- **Fix Description:**
  Expand the brief mention of "field name" to explain what customization means and why users would need it.
- **Proposed Content:**
  Update line 94 from:
  ```markdown
  - Banner frontmatter options (`enabled`, field name, image source priority).
  ```
  To:
  ```markdown
  - Banner frontmatter options:
    - `enabled` - Toggle banner frontmatter output
    - `field name` - Customize the frontmatter key (default: `banner`; use custom names to match your vault conventions)
    - `image source priority` - Control whether Are.na metadata or block images are preferred
  ```

### DOC-008: Auto-Enable Imported Channels Toggle
- **Status:** `PENDING`
- **Gap ID:** GAP-004
- **Type:** INCOMPLETE
- **User Importance:** HIGH
- **Fix Effort:** EASY
- **README Section:** Settings Overview section
- **Fix Description:**
  Add the auto-enable setting to the Settings Overview with explanation of what it controls.
- **Proposed Content:**
  Add to Settings Overview (after "Channel mapping management and migration actions"):
  ```markdown
  - `Auto-enable imported channels` - When bulk-importing channels from your Are.na account, automatically enable them for regular imports (can be toggled per-channel in settings)
  ```

### DOC-009: Frontmatter Toggle Explanation
- **Status:** `PENDING`
- **Gap ID:** GAP-010
- **Type:** INCOMPLETE
- **User Importance:** MEDIUM
- **Fix Effort:** EASY
- **README Section:** Settings Overview → Troubleshooting section
- **Fix Description:**
  Expand the frontmatter toggle to explain when users might want to disable it and what the impact is.
- **Proposed Content:**
  Replace vague mention with:
  ```markdown
  - `Frontmatter toggle` - Include/exclude YAML frontmatter in generated notes (contains metadata like block ID, description, connected channels). Disable if your vault doesn't use frontmatter or if you prefer cleaner output.
  ```

### DOC-010: Ribbon Icon for Quick Import
- **Status:** `PENDING`
- **Gap ID:** GAP-001
- **Type:** MISSING
- **User Importance:** LOW
- **Fix Effort:** EASY
- **README Section:** Feature Highlights → Import Engine section
- **Fix Description:**
  Add mention of the ribbon icon as a quick-access affordance in the Obsidian sidebar.
- **Proposed Content:**
  Add to Feature Highlights → Import Engine:
  ```markdown
  - Ribbon icon in the left sidebar for quick access to import operations.
  ```

### DOC-011: Debug Logging Instructions
- **Status:** `PENDING`
- **Gap ID:** GAP-012
- **Type:** INCOMPLETE
- **User Importance:** HIGH
- **Fix Effort:** MEDIUM
- **README Section:** Settings Overview + Troubleshooting section (new subsection)
- **Fix Description:**
  Explain how to enable debug logging, where logs are stored, and how to use them for troubleshooting import performance issues.
- **Proposed Content:**
  Add to Troubleshooting section:
  ```markdown
  ### Enabling Debug Logging
  
  To troubleshoot slow imports or unexpected behavior:
  1. Open Settings → Tetromino → Toggle "Debug logging"
  2. Run your import (import or preview)
  3. Check the browser console (Ctrl+Shift+I / Cmd+Option+I) for detailed logs prefixed with `[Tetromino]`
  4. Copy relevant logs when reporting issues or troubleshooting with the maintainers
  ```

### DOC-012: Template Customization Guide
- **Status:** `PENDING`
- **Gap ID:** GAP-013
- **Type:** INCOMPLETE
- **User Importance:** CRITICAL
- **Fix Effort:** MEDIUM
- **README Section:** Settings Overview → Advanced section (new)
- **Fix Description:**
  Add documentation for the template engine with examples of Handlebars-lite syntax and common customizations.
- **Proposed Content:**
  Add new section to Settings Overview:
  ```markdown
  ### Template Customization (Advanced)
  
  Tetromino uses Handlebars-lite templating for block markdown output. Enable the toggle and provide a custom template string to customize how blocks are rendered.
  
  **Template Variables:**
  - `{{title}}` - Block title
  - `{{description}}` - Block description  
  - `{{source}}` - Block source URL
  - `{{id}}` - Block ID
  - `{{createdAt}}` - Creation timestamp
  
  **Example Template:**
  ```handlebars
  # {{title}}
  
  [View on Are.na]({{source}})
  
  {{#if description}}
  > {{description}}
  {{/if}}
  
  ---
  _Imported from Are.na (ID: {{id}})_
  ```
  
  Disable the template engine to use the default block rendering.
  ```

### DOC-013: Migration Actions Explanation
- **Status:** `PENDING`
- **Gap ID:** GAP-014
- **Type:** INCOMPLETE
- **User Importance:** HIGH
- **Fix Effort:** MEDIUM
- **README Section:** Settings Overview + Troubleshooting section
- **Fix Description:**
  Explain what attachment migration does, when users would need it, and how to use the preview and execute commands.
- **Proposed Content:**
  Add to Settings Overview:
  ```markdown
  - Migration tools (preview and execute) for moving existing attachments when changing storage configuration
  ```
  
  Add to Troubleshooting section:
  ```markdown
  ### Managing Attachment Storage
  
  If you change your attachment storage settings (global folder, channel-local, or per-channel overrides), existing attachments may be in the old location. Use migration tools to move them:
  
  1. `Preview attachment migration` - See which attachments will be moved and their new paths
  2. `Run attachment migration` - Execute the migration and move files to new locations
  
  Migration preserves all existing attachments and updates note references automatically.
  ```

---

## WON'T DO

### DOC-014: Exclude Block Classes
- **Status:** `WON'T DO`
- **Gap ID:** GAP-011
- **Type:** MISSING
- **User Importance:** LOW
- **Fix Effort:** MEDIUM
- **Reason:** Advanced filtering feature for power users; low user impact combined with medium effort for explanation. Can be documented in future iterations if demand appears.

---

## Fix Order

Recommended sequence based on importance and dependencies:

1. **DOC-012** - Template customization guide (CRITICAL, blocks advanced users)
2. **DOC-001** - Import my channels (CRITICAL, first-time setup blocker)
3. **DOC-011** - Debug logging (HIGH, troubleshooting blocker)
4. **DOC-002** - Backup mappings (HIGH, data protection)
5. **DOC-003** - Restore backup (HIGH, depends on understanding backup)
6. **DOC-005** - Add channel mapping (HIGH, core feature discovery)
7. **DOC-013** - Migration actions (HIGH, related to attachments)
8. **DOC-008** - Auto-enable toggle (HIGH, settings discovery)
9. **DOC-004** - Reset mappings (MEDIUM, related to backup/restore)
10. **DOC-007** - Banner field name (MEDIUM, settings clarification)
11. **DOC-009** - Frontmatter toggle (MEDIUM, settings clarification)
12. **DOC-006** - Status bar progress (MEDIUM, feature clarity)
13. **DOC-010** - Ribbon icon (LOW, nice-to-know discovery)

---

## README Section Updates Needed

| Section | Gaps to Fix | Action Needed |
|---------|-------------|---------------|
| Feature Highlights | DOC-006, DOC-010 | Add status bar clarity and ribbon icon mention |
| Commands | DOC-001, DOC-002, DOC-003, DOC-004 | Add missing command documentation |
| Settings Overview | DOC-005, DOC-008, DOC-007, DOC-009, DOC-012, DOC-013 | Add channel mapping UI, auto-enable, expand frontmatter/banner, add template guide, add migration info |
| Troubleshooting | DOC-011, DOC-013 | Add debug logging instructions and migration guide |

---

## Implementation Notes

- All PENDING items are ready for immediate implementation
- Template customization (DOC-012) requires careful explanation due to complexity
- Migration actions (DOC-013) should be cross-referenced with feature highlights
- Settings Overview section is currently too brief; these additions will significantly improve usability
- No gaps require external research or maintainer review; all can proceed to auto-fix phase

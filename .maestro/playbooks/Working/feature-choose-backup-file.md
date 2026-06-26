---
type: note
title: Feature Scope - Choose Backup File for Channel Mapping Restore
created: 2026-06-26
tags:
  - feature-scope
  - channel-management
  - backup-restore
related:
  - '[[Phase-04-Feature-Development]]'
  - '[[PROJECT_BOARD]]'
---

# Feature Scope: Choose Backup File for Channel Mapping Restore

## Problem Statement

Currently, the **Restore latest backup** command always restores the most recent channel mapping backup file from `Are.na/channel-mapping-backups/`. Users who create multiple backups over time have no way to restore from a specific historical point. If the latest backup is corrupted or unwanted, users must manually move files around or edit plugin data to recover an older configuration. This lack of control creates friction for users who rely on backups for safe configuration management.

## Acceptance Criteria

1. **File Picker UI**: A new **"Restore from file..."** button appears in the Channel Management section of Tetromino settings, alongside the existing **"Restore latest"** button.
2. **Vault File Browser**: Clicking the button opens Obsidian's native file picker/suggester limited to `.json` files within the vault.
3. **Validation**: The selected file is validated to ensure it is a valid Tetromino channel mapping backup (contains a `channelMappings` array).
4. **Graceful Errors**: If the selected file is invalid, the user sees a clear error notice (e.g., "Selected file is not a valid channel mapping backup.") and no data is modified.
5. **Restore Execution**: If valid, the plugin replaces current channel mappings with those from the selected file, preserving existing behavior of `normalizeMappings()` and `saveSettings()`.
6. **Success Feedback**: A success notice confirms the restore with the filename (e.g., "Restored channel mappings from mappings-2026-06-20_14-30-00.json").
7. **Backwards Compatibility**: The existing **"Restore latest backup"** button continues to work exactly as before.
8. **Dry-run Preview (optional stretch)**: A preview of how many mappings will be restored before confirming (can reuse modal patterns from migration preview).

## Alignment with Tetromino Philosophy

| Principle | Assessment |
|---|---|
| **One-way** | ✅ This feature only reads local backup files and updates local plugin settings. No data flows back to Are.na. |
| **Manual** | ✅ The restore action is explicitly user-initiated via a button click and file selection. |
| **Deterministic** | ✅ Restoring from the same backup file always produces the same channel mapping state. |
| **Vault-first** | ✅ Backups are stored in the vault; the feature improves vault data management and user control. |

**Verdict**: Fully in scope. This is a local-only UX improvement that enhances user control without violating any core principles.

## Complexity Estimate

- **Effort**: **SMALL** (1–4 hours)
- **Type**: Setting/UI change with minimal logic
- **Files to touch**:
  - `src/settings-tab.ts` — Add "Restore from file..." button and wire to plugin method
  - `src/main.ts` — Add `restoreChannelMappingsFromFile(filePath: string)` method
- **Testing needed**:
  - Unit test for validation logic (valid vs invalid JSON)
  - Unit test for restore execution (mappings replaced correctly)
- **Migration needed**: No
- **Breaking changes**: None

## Feature Branch

```bash
git checkout -b feature/choose-backup-file
```

## Data Flow Sketch

```
User clicks "Restore from file..."
  → Obsidian suggester opens (filter: *.json)
  → User selects file
  → Plugin reads file content
  → Validate: has channelMappings array?
    → NO: Show error notice, abort
    → YES: Replace settings.channelMappings
            → normalizeMappings()
            → saveSettings()
            → Show success notice
```

## Notes for Next Steps

- The existing `restoreLatestChannelMappingsBackup()` logic can be refactored to extract a shared `restoreFromBackupData(data)` helper, reducing duplication.
- Consider using `app.vault.getAbstractFileByPath()` or a `FuzzySuggestModal` for the file picker.
- The validation should check for `data.channelMappings` being an array of `ChannelMapping`-shaped objects.

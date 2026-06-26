---
type: reference
title: Tetromino Troubleshooting Guide
created: 2026-06-26
tags:
  - troubleshooting
  - support
  - users
related:
  - '[[USER_GUIDE]]'
  - '[[SETTINGS_REFERENCE]]'
  - '[[FAQ]]'
  - '[[DEVELOPER_GUIDE]]'
  - '[[API_DESIGN]]'
---

# Tetromino — Troubleshooting Guide

Step-by-step solutions for common errors, import failures, and configuration problems.

---

## Table of Contents

1. [Quick Diagnostic Checklist](#quick-diagnostic-checklist)
2. [Common Errors and Solutions](#common-errors-and-solutions)
   - [401 Unauthorized — Invalid Are.na token](#401-unauthorized--invalid-arena-token)
   - [404 Not Found — Channel missing or private](#404-not-found--channel-missing-or-private)
   - [403 Access Denied — Insufficient permissions](#403-access-denied--insufficient-permissions)
   - [429 Too Many Requests — Rate limited](#429-too-many-requests--rate-limited)
   - [500/502/503/504 — Are.na server errors](#500502503504--arena-server-errors)
   - ["Import failed" — Network or server error](#import-failed--network-or-server-error)
   - ["No valid channels configured"](#no-valid-channels-configured)
   - ["Vault permission denied" or folder not created](#vault-permission-denied-or-folder-not-created)
   - ["Template render error" — Invalid custom template syntax](#template-render-error--invalid-custom-template-syntax)
   - ["Tetromino is already running"](#tetromino-is-already-running)
   - ["Attachment migration failed"](#attachment-migration-failed)
   - [Assets not downloading](#assets-not-downloading)
   - [Fewer blocks imported than expected](#fewer-blocks-imported-than-expected)
   - [Notes not updating after re-import](#notes-not-updating-after-re-import)
3. [How to Collect Logs for Bug Reports](#how-to-collect-logs-for-bug-reports)
4. [How to Check Plugin and Obsidian Versions](#how-to-check-plugin-and-obsidian-versions)
5. [How to Test a Fresh Install (Configuration Reset)](#how-to-test-a-fresh-install-configuration-reset)

---

## Quick Diagnostic Checklist

Before diving into specific errors, run through this checklist:

1. **Verify your API token:** Open Tetromino settings, click **Verify** next to the token field.
2. **Check that at least one channel mapping is enabled:** Settings → Channel mappings → toggle is on.
3. **Confirm the channel slug is correct:** It should be the URL slug (e.g., `design-inspiration`), not the full URL.
4. **Enable Debug logging:** Settings → Debug logging → ON. Re-run the import and watch the Developer Console.
5. **Try a dry-run first:** Command Palette → **Preview import (dry-run)**. This reveals errors without modifying your vault.
6. **Check the Sync Summary modal:** After any import, it lists per-channel and per-block errors.
7. **Review `Are.na/import-history.md`:** Timestamped log of past imports with error counts.

---

## Common Errors and Solutions

### 401 Unauthorized — Invalid Are.na token

**Symptom:**
- Notice says: *"Are.na API error: Invalid API token (401). Please check your token in settings."*
- Token verification in settings returns *"Invalid token"*.

**Causes:**
- Token was copied incorrectly (extra spaces, truncated).
- Token has expired or been revoked.
- Token was generated without read access.

**Fix:**
1. Go to <https://www.are.na/developers/personal-access-tokens>.
2. Generate a new token (or verify the existing one is still active).
3. Copy the token **exactly** — no leading/trailing spaces.
4. Paste it into Tetromino settings and click **Verify**.
5. Ensure the token has **read** access to channels and blocks.

**Still failing?** Some users have multiple Are.na accounts. Confirm the token belongs to the account that owns or has access to the channels you are importing.

---

### 404 Not Found — Channel missing or private

**Symptom:**
- Notice says: *"Are.na API error: Channel not found (404). Check that the channel slug is correct."*

**Causes:**
- The channel slug was mistyped.
- The channel was deleted on Are.na.
- The channel is private and your token does not have access.
- You used the full URL (`https://www.are.na/channel/slug`) instead of just the slug.

**Fix:**
1. Open the channel on Are.na and copy the slug from the URL bar (the part after `/channel/`).
2. In Tetromino settings, paste only the slug into the mapping field.
3. If the channel is private, ensure your personal access token belongs to an account with access to that channel.
4. Try visiting `https://www.are.na/channel/<slug>` in an incognito window. If it returns "Not found", the channel is either deleted or private.

---

### 403 Access Denied — Insufficient permissions

**Symptom:**
- Notice says: *"Are.na API error: Access denied (403). The channel may be private or you don't have permission."*

**Causes:**
- The channel is private and your token's account is not a collaborator.
- The channel is restricted or behind an access control list.

**Fix:**
- Request access to the private channel from its owner on Are.na.
- Alternatively, import only public channels.

---

### 429 Too Many Requests — Rate limited

**Symptom:**
- Notice says: *"Are.na API error: Rate limited (429). Too many requests — please try again later."*
- Imports slow down dramatically or stall.

**Causes:**
- Are.na imposes rate limits on API requests.
- Large channels with many blocks trigger many paginated requests in quick succession.
- Multiple rapid manual imports exhaust your request budget.

**Fix:**
1. **Wait and retry.** Tetromino automatically backs off when it sees a 429, parsing the `Retry-After` header and waiting before the next attempt.
2. **Reduce background sync frequency.** If you have sync interval enabled, set it to a longer period (e.g., 60 minutes instead of 5).
3. **Import during off-peak hours.** Are.na rate limits are sometimes stricter during high-traffic periods.
4. **Start with smaller channels.** Verify your setup with a small channel before importing large ones.

Tetromino's retry logic: up to 3 retries with exponential backoff (2s, 4s, 8s + jitter). For 429s, it respects the server's `Retry-After` value. See [[API_DESIGN]] for the full retry matrix.

---

### 500/502/503/504 — Are.na server errors

**Symptom:**
- Notice says: *"Are.na API error: Server error (500)"* or similar.
- *"Are.na API error: Service unavailable. Are.na may be down for maintenance."*

**Causes:**
- Temporary outage on Are.na's side.
- CDN or load-balancer issue between you and Are.na.

**Fix:**
1. Wait a few minutes and retry.
2. Check <https://status.are.na> (or Are.na's social media) for known outages.
3. Tetromino retries these automatically (up to 3 attempts with exponential backoff). If all retries fail, the error is surfaced to you.

---

### "Import failed" — Network or server error

**Symptom:**
- Notice says: *"Tetromino failed: ..."* or *"Import failed for <slug>: ..."*.
- The Sync Summary modal shows errors for one or more channels.

**Causes:**
- Your internet connection dropped during import.
- Are.na API experienced a transient failure not covered by retry logic.
- A specific block's detail fetch failed (e.g., comments or connected channels).

**Fix:**
1. Check your internet connection.
2. Re-run the import. Tetromino is idempotent — re-importing the same channel is safe and skips unchanged blocks.
3. If only one channel fails, try importing it individually via **Import current channel** (open any note in that channel's folder, then run the command).
4. Enable **Debug logging** and check the Developer Console for the exact failed request URL and error message.

---

### "No valid channels configured"

**Symptom:**
- Notice says: *"Tetromino: No valid channels configured (check that channel slug is not empty)."*

**Causes:**
- All channel mappings are disabled.
- A mapping has an empty slug.
- No mappings exist at all.

**Fix:**
1. Open Tetromino settings.
2. Ensure at least one mapping has a non-empty **Channel slug** and the toggle is **enabled** (blue).
3. If you haven't created mappings yet, click **Import my channels** (requires a valid API token) or click **+ Add mapping** and fill in a slug manually.

---

### "Vault permission denied" or folder not created

**Symptom:**
- Notes are not created in the expected folder.
- Attachment downloads fail silently.
- Errors mentioning `vault.create`, `vault.modify`, or filesystem permissions.

**Causes:**
- The target folder path is outside your vault.
- The vault folder is read-only (e.g., on a network drive with restricted permissions).
- The custom attachment folder path is invalid or contains illegal characters.

**Fix:**
1. Ensure all folder paths are **inside your Obsidian vault**.
2. Check that your vault root is writable. On macOS/Linux, verify ownership with `ls -la`.
3. Avoid absolute paths (e.g., `/Users/...`) in folder settings. Use vault-relative paths like `Are.na/my-channel`.
4. If using a **custom attachment folder**, check that the path exists or that Tetromino has permission to create it.

---

### "Template render error" — Invalid custom template syntax

**Symptom:**
- Notes are not generated, or generated notes are blank/malformed.
- Developer Console shows an error from `templateUtils.ts` (e.g., `Unclosed #if tag`).
- The Sync Summary modal shows errors for specific blocks.

**Causes:**
- Missing closing tag (`{{/if}}` or `{{/each}}`).
- Typos in variable names.
- Nested `{{#each}}` blocks with incorrect syntax.
- Using undefined variables that the template parser does not recognize.

**Fix:**
1. **Temporarily disable the template engine:** Settings → uncheck **Template engine** → re-run import. If this works, the issue is in your template.
2. Check for balanced tags:
   - Every `{{#if condition}}` must have a matching `{{/if}}`.
   - Every `{{#each array}}` must have a matching `{{/each}}`.
3. Verify variable names against the supported list: `title`, `id`, `class`, `content`, `description`, `image`, `arena_url`, `source_url`, `channel_title`, `channel_slug`, `comments`, `connected_channels`.
4. Use a minimal test template first, then add complexity incrementally.

Example minimal valid template:

```handlebars
---
arena_id: {{id}}
---
# {{title}}

{{content}}
```

For the full variable reference and syntax, see [[SETTINGS_REFERENCE]] — Template Engine.

---

### "Tetromino is already running"

**Symptom:**
- Notice says: *"Tetromino is already running..."*
- Status bar shows a stuck progress bar.

**Causes:**
- A previous import is still in progress (large channel, slow network).
- A previous import crashed without resetting the internal `isSyncing` flag.
- An attachment migration is running.

**Fix:**
1. **Wait.** Large channels can take several minutes. Watch the status bar for progress updates.
2. If stuck for more than 10 minutes with no progress, **reload Obsidian** (`Ctrl/Cmd + P` → **Reload app without saving**). This resets the plugin state safely.
3. Do not run import and migration simultaneously. Finish one before starting the other.

---

### "Attachment migration failed"

**Symptom:**
- Notice says: *"Attachment migration failed: ..."*
- Files were not moved to the new folder.

**Causes:**
- The destination folder is not writable.
- A file with the same name already exists at the destination.
- The migration plan was empty (no attachments to move).

**Fix:**
1. Run **Preview attachment migration** first to see the planned moves without executing them.
2. Ensure the destination path is inside your vault and writable.
3. Check `Are.na/migration-history.md` for detailed error messages.
4. If a file conflict exists, manually resolve it or delete the conflicting file before retrying.

---

### Assets not downloading

**Symptom:**
- Image blocks show as broken links or external URLs instead of downloaded files.
- Attachment blocks (PDFs, etc.) are not present in the vault.

**Causes:**
- **Image handling** or **Attachment handling** is set to `Embed` or `Link` instead of `Download`.
- The attachment folder path is invalid or not writable.
- Disk space is full.
- The asset URL returned a non-200 status (e.g., expired CDN link).

**Fix:**
1. Settings → **Image handling** → select **Download to vault**.
2. Settings → **Attachment handling** → select **Download to vault**.
3. Verify the **Attachment storage location** and folder paths.
4. Check available disk space.
5. Enable **Debug logging** and look for `[arena-sync] Asset download failed` messages in the console.

---

### Fewer blocks imported than expected

**Symptom:**
- Channel index shows fewer notes than the block count on Are.na.

**Causes:**
- Some block classes are excluded in settings (e.g., `Image, Media`).
- The channel contains duplicate blocks (Tetromino deduplicates by block ID).
- Some blocks failed to fetch due to transient errors.
- The channel is still growing; the index was generated before new blocks were added.

**Fix:**
1. Check **Exclude block classes** in settings. Remove exclusions you did not intend.
2. Re-run the import. Deduplication is normal — the index count reflects unique blocks.
3. Check the Sync Summary for error counts. If some blocks errored, retry.

---

### Notes not updating after re-import

**Symptom:**
- You changed a setting (e.g., template) but old notes remain unchanged.

**Causes:**
- The dry-run or import was cancelled before completion.
- The content hash matched the old output (unlikely if the setting truly affects rendering).
- Obsidian's file cache has not refreshed the view.

**Fix:**
1. Run **Import all channels now** (not dry-run) and wait for completion.
2. If using a custom template, ensure **Template engine** is enabled.
3. In Obsidian, close and reopen the note, or run **Reload app without saving** to clear the file cache.
4. Check `Are.na/import-history.md` to confirm the import ran and note the number of updated files.

---

## How to Collect Logs for Bug Reports

When reporting a bug, include the following information:

### Step 1: Enable Debug Logging

1. Open **Tetromino Settings**.
2. Toggle **Debug logging** to **ON**.
3. Re-run the action that failed (import, migration, etc.).

### Step 2: Open the Developer Console

- **macOS:** `Cmd + Option + I`
- **Windows/Linux:** `Ctrl + Shift + I`
- Or: `Ctrl/Cmd + P` → **Toggle Developer Tools**

### Step 3: Filter for Relevant Logs

In the Console tab, type `arena-sync` into the filter box. Look for:

- `[arena-sync] GET https://api.are.na/...` — API requests
- `[arena-sync] Rate limited (429). Retrying after ...` — Backoff events
- `[arena-sync] Error fetching page ...` — Pagination failures
- `[arena-sync] Asset download failed` — Download errors
- `arena-sync:channel-metadata:...` and `arena-sync:fetch-blocks:...` — Timing info

### Step 4: Export the Log

1. Right-click in the console → **Save as...** (or select all and copy).
2. Save the file and attach it to your bug report.

**Redaction:** Tetromino automatically redacts your API token from debug logs. However, review the log before sharing to ensure no private channel titles or filenames you consider sensitive are included.

### Step 5: Include the Sync Summary

After an import, the Sync Summary modal lists:

- Created / updated / skipped counts
- Per-file diffs
- Error list with block IDs and messages

Click through the modal and note any errors shown, or screenshot the summary.

### Step 6: Include Import History

Check `Are.na/import-history.md` in your vault for a timestamped record of past imports. Paste the relevant section into your bug report.

---

## How to Check Plugin and Obsidian Versions

### Tetromino Version

1. Open **Settings → Community Plugins**.
2. Find **Tetromino** in the installed plugins list.
3. The version number is shown next to the plugin name (e.g., `v1.1.0`).

Alternatively, check the `manifest.json` file inside `<vault>/.obsidian/plugins/Tetromino/`.

### Obsidian Version

1. Open **Settings → About**.
2. The version is listed at the top (e.g., `v1.8.0`).

Include both versions in any bug report.

---

## How to Test a Fresh Install (Configuration Reset)

If you suspect corrupted settings or want to verify behavior without your existing configuration:

### Option A: Reset Plugin Data (Recommended)

1. **Back up your current settings:**
   - Tetromino Settings → **Backup channel mappings**.
   - Note the backup file path (e.g., `Are.na/channel-mapping-backups/mappings-...json`).
2. **Disable Tetromino:** Settings → Community Plugins → toggle Tetromino **OFF**.
3. **Delete plugin data:**
   - Close Obsidian.
   - Delete `<vault>/.obsidian/plugins/Tetromino/data.json`.
   - (On some systems this file may be named differently; delete any `.json` in the Tetromino plugin folder except `manifest.json`.)
4. **Re-enable Tetromino:** Open Obsidian, toggle Tetromino **ON**.
5. **Reconfigure:** Enter your API token and re-import channel mappings (or restore from the backup you created).

### Option B: Test Vault

1. Create a new, empty vault in Obsidian.
2. Install Tetromino from the Community Plugins browser (or manually copy `main.js`, `manifest.json`, and `styles.css`).
3. Configure with a minimal setup (one channel mapping, default settings).
4. Run an import and observe whether the issue reproduces.

### Option C: Restore From Backup

If you already have a backup and want to revert:

1. Tetromino Settings → **Restore latest backup** (or **Restore from file** to pick a specific date).
2. This replaces your current channel mappings with the backup snapshot.

---

## Related Documentation

- [[USER_GUIDE]] — Step-by-step walkthroughs and feature overview.
- [[SETTINGS_REFERENCE]] — Every setting explained with defaults and examples.
- [[FAQ]] — Quick answers to common questions about sync behavior and security.
- [[DEVELOPER_GUIDE]] — Architecture, module guide, and how to add features or tests.
- [[API_DESIGN]] — Are.na API integration details, pagination, rate limiting, and retry logic.

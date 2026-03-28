# Are.na Import for Obsidian

![Are.na Import banner](hero-banner.png)

Are.na Import brings channel content from [Are.na](https://www.are.na) into Obsidian as local Markdown files.

This plugin is intentionally one-way:

- Yes: Are.na -> Obsidian
- No: Obsidian -> Are.na push/sync

## Current feature set

- Import mapped channels into mapped vault folders
- Convert Are.na blocks to Markdown notes
- Update imported notes when remote blocks change
- Optional frontmatter metadata
- Manual command, startup import, and interval-based auto-import
- Works on desktop and mobile

## Commands

- `Sync all channels now`
- `Sync current channel`
- `Open channel on Are.na`

## Setup

1. Install and enable the plugin.
2. Paste your Are.na API token in plugin settings.
3. Add one or more channel slug -> local folder mappings.
4. Run `Sync all channels now`.

## Notes

- No dry-run/preview mode
- No local file deletions for removed remote blocks
- No push-back to Are.na

## Links

- GitHub: https://github.com/arena-sync/arena-sync-obsidian
- Changelog: https://github.com/arena-sync/arena-sync-obsidian/blob/main/CHANGELOG.md
- Contributing: https://github.com/arena-sync/arena-sync-obsidian/blob/main/CONTRIBUTING.md

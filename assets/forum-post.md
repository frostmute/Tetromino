# Are.na Sync — Two-way sync between Are.na and Obsidian

![Are.na Sync banner](hero-banner.png)

Hey everyone 👋

I'm excited to share **Are.na Sync**, a community plugin that bridges [Are.na](https://www.are.na) — the visual research and bookmarking platform — with your Obsidian vault.

## What it does

If you use Are.na to collect references, images, links, and text snippets, this plugin brings all of that into Obsidian as plain Markdown notes — and optionally pushes your Obsidian notes back to Are.na.

**Key features:**

- **Pull sync** — Import channels as folders. Text blocks, images, links, media, and attachments all become Markdown notes with rich YAML front-matter.
- **Push sync** — Edit a synced note (or create a new one) and push it to an Are.na channel as a block.
- **Two-way sync** — Keep both sides in lockstep with hash-based change detection and four conflict-resolution strategies (local wins, remote wins, newest wins, or ask).
- **Flexible image handling** — Download images into your vault, use Obsidian embeds, or keep external links.
- **Auto-sync** — Set an interval and forget about it, or trigger manually from the command palette / ribbon icon.
- **Mobile support** — Works on Obsidian Mobile with no extra dependencies.

## Demo

![Demo GIF](demo.gif)

## How to install

1. Open **Settings → Community plugins → Browse**.
2. Search for **"Are.na Sync"**.
3. Click **Install**, then **Enable**.
4. Grab your Are.na API token from [dev.are.na/oauth/applications](https://dev.are.na/oauth/applications) and paste it in the plugin settings.
5. Add a channel mapping — pick a channel slug and a local folder — and hit sync!

## How sync works

Each Are.na block becomes a `.md` file. The plugin tracks content hashes so only changed blocks are updated on subsequent syncs. Front-matter like `arena-id`, `arena-class`, and `arena-source` makes synced notes easy to query with Dataview or search.

When you push a note back, the plugin extracts the title and body, strips the front-matter, and creates or updates a text block in the mapped channel.

## Who is this for?

- **Researchers** who collect sources on Are.na and write in Obsidian.
- **Designers** who maintain visual mood boards on Are.na and want the text/links in their PKM.
- **Writers** who want a curated feed of inspiration flowing into their vault.
- **Anyone** who thinks in blocks on Are.na and in notes in Obsidian.

## Links

- **GitHub**: [arena-sync/arena-sync-obsidian](https://github.com/arena-sync/arena-sync-obsidian)
- **Changelog**: [CHANGELOG.md](https://github.com/arena-sync/arena-sync-obsidian/blob/main/CHANGELOG.md)
- **Contributing**: [CONTRIBUTING.md](https://github.com/arena-sync/arena-sync-obsidian/blob/main/CONTRIBUTING.md)
- **Issues / feature requests**: [GitHub Issues](https://github.com/arena-sync/arena-sync-obsidian/issues/new/choose)

Feedback, bug reports, and PRs are very welcome. This is MIT-licensed and built in the open. If you use Are.na and Obsidian together, I'd love to hear how you're using them — and what features would make this plugin more useful for your workflow.

Thanks for checking it out! 🌱

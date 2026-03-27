# Marketing & Visual Assets

This folder contains the visual identity assets for Are.na Sync for Obsidian.

## Hero Images

| File | Dimensions | Use case |
|---|---|---|
| `hero-square.svg` | 1200 × 1200 | Social media posts, Obsidian community forum avatar, plugin directory thumbnail |
| `hero-banner.svg` | 1920 × 640 | README header, GitHub social preview, blog post headers |
| `hero-banner.png` | 1920 × 640 | Pre-rendered PNG of the banner (generate with `convert-assets.sh`) |
| `hero-square.png` | 1200 × 1200 | Pre-rendered PNG of the square image |
| `demo.gif` | 640px wide | README demo, forum post, social media |

## Generating PNGs from SVGs

```bash
# Requires: Inkscape or rsvg-convert
# macOS:    brew install librsvg
# Linux:    sudo apt install librsvg2-bin

rsvg-convert -w 1920 -h 640 assets/hero-banner.svg > assets/hero-banner.png
rsvg-convert -w 1200 -h 1200 assets/hero-square.svg > assets/hero-square.png
```

## Recording the demo GIF

See `scripts/record-demo.sh` for an automated recording workflow.

## Brand colours

| Name | Hex | Usage |
|---|---|---|
| Are.na Red | `#e8524a` | Are.na brand accent, channel blocks |
| Obsidian Purple | `#7c3aed` | Obsidian brand accent, sync arrows |
| Deep Navy | `#1a1a2e` | Background |
| Light Text | `#ffffff` | Titles |
| Muted Text | `#a0a0b8` | Subtitles |
| Dim Text | `#7c7c94` | Taglines, descriptions |

## GitHub social preview

To set the social preview image for the repository:

1. Go to **Settings → General → Social preview**.
2. Upload `hero-banner.png`.
3. This image appears when the repo link is shared on social media.

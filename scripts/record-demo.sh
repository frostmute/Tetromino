#!/usr/bin/env bash
#
# record-demo.sh — Record a demo GIF of Are.na Sync in action.
#
# Prerequisites:
#   - macOS:  brew install ffmpeg gifsicle
#   - Linux:  sudo apt install ffmpeg gifsicle xdotool xwininfo
#   - A test vault with the plugin installed and configured
#   - An Are.na channel with ≥5 blocks for a compelling demo
#
# Usage:
#   bash scripts/record-demo.sh [--width 640] [--fps 15] [--duration 20]
#
# Output:
#   assets/demo.gif — optimised GIF ready for README
#
set -euo pipefail

# ── Defaults ────────────────────────────────────────────────────────

WIDTH=640
FPS=15
DURATION=20
OUTPUT="assets/demo.gif"
TMP_DIR=$(mktemp -d)
RAW_VIDEO="${TMP_DIR}/demo-raw.mp4"

# ── Parse arguments ────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --width)    WIDTH="$2";    shift 2 ;;
    --fps)      FPS="$2";     shift 2 ;;
    --duration) DURATION="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

echo "┌──────────────────────────────────────────────┐"
echo "│  Are.na Sync — Demo GIF Recorder             │"
echo "├──────────────────────────────────────────────┤"
echo "│  Width:    ${WIDTH}px                         │"
echo "│  FPS:      ${FPS}                             │"
echo "│  Duration: ${DURATION}s                       │"
echo "│  Output:   ${OUTPUT}                          │"
echo "└──────────────────────────────────────────────┘"
echo ""

# ── Detect platform ────────────────────────────────────────────────

OS="$(uname -s)"

record_macos() {
  echo "▸ Recording screen on macOS for ${DURATION}s…"
  echo "  Focus the Obsidian window now!"
  sleep 3

  # Use screencapture → ffmpeg pipeline
  local SCREEN_RECORDING="${TMP_DIR}/screen.mov"
  screencapture -v -D 1 -V "${DURATION}" "${SCREEN_RECORDING}" &
  local PID=$!

  echo "  Recording… (PID ${PID})"
  wait $PID 2>/dev/null || true

  echo "▸ Converting to MP4…"
  ffmpeg -y -i "${SCREEN_RECORDING}" \
    -vf "scale=${WIDTH}:-2" \
    -an \
    "${RAW_VIDEO}" \
    2>/dev/null
}

record_linux() {
  echo "▸ Click the Obsidian window to select it…"
  
  # Let user click the target window
  local WIN_INFO
  WIN_INFO=$(xwininfo)
  local WIN_ID
  WIN_ID=$(echo "$WIN_INFO" | grep "Window id" | awk '{print $4}')
  local WIN_X WIN_Y WIN_W WIN_H
  WIN_X=$(echo "$WIN_INFO" | grep "Absolute upper-left X" | awk '{print $NF}')
  WIN_Y=$(echo "$WIN_INFO" | grep "Absolute upper-left Y" | awk '{print $NF}')
  WIN_W=$(echo "$WIN_INFO" | grep "Width" | awk '{print $NF}')
  WIN_H=$(echo "$WIN_INFO" | grep "Height" | awk '{print $NF}')

  echo "▸ Recording window ${WIN_ID} (${WIN_W}x${WIN_H}) for ${DURATION}s…"
  sleep 2

  ffmpeg -y \
    -video_size "${WIN_W}x${WIN_H}" \
    -framerate "${FPS}" \
    -f x11grab \
    -i ":0.0+${WIN_X},${WIN_Y}" \
    -t "${DURATION}" \
    -vf "scale=${WIDTH}:-2" \
    -an \
    "${RAW_VIDEO}" \
    2>/dev/null
}

# ── Record ──────────────────────────────────────────────────────────

case "$OS" in
  Darwin) record_macos ;;
  Linux)  record_linux ;;
  *)      echo "Unsupported OS: $OS" >&2; exit 1 ;;
esac

if [[ ! -f "${RAW_VIDEO}" ]]; then
  echo "✗ Recording failed — no video file produced." >&2
  exit 1
fi

# ── Convert to GIF ─────────────────────────────────────────────────

echo "▸ Generating colour palette…"
PALETTE="${TMP_DIR}/palette.png"
ffmpeg -y -i "${RAW_VIDEO}" \
  -vf "fps=${FPS},scale=${WIDTH}:-1:flags=lanczos,palettegen=stats_mode=diff" \
  "${PALETTE}" \
  2>/dev/null

echo "▸ Rendering GIF…"
RAW_GIF="${TMP_DIR}/demo-raw.gif"
ffmpeg -y -i "${RAW_VIDEO}" -i "${PALETTE}" \
  -lavfi "fps=${FPS},scale=${WIDTH}:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
  "${RAW_GIF}" \
  2>/dev/null

echo "▸ Optimising with gifsicle…"
mkdir -p "$(dirname "${OUTPUT}")"
gifsicle -O3 --lossy=80 --colors 256 "${RAW_GIF}" -o "${OUTPUT}"

# ── Summary ─────────────────────────────────────────────────────────

SIZE=$(du -h "${OUTPUT}" | awk '{print $1}')
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ Demo GIF saved: ${OUTPUT} (${SIZE})"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Cleanup ─────────────────────────────────────────────────────────

rm -rf "${TMP_DIR}"

echo ""
echo "Suggested demo flow for next recording:"
echo "  1. Open Obsidian with a clean vault"
echo "  2. Open Settings → Are.na Sync → add a channel mapping"
echo "  3. Close settings, press Ctrl/Cmd+P → 'Sync all channels now'"
echo "  4. Watch notes appear in the sidebar"
echo "  5. Open a synced note showing front-matter + content"
echo "  6. Edit the note, then push back to Are.na"
echo ""
echo "Keep it under 15 seconds for maximum engagement."

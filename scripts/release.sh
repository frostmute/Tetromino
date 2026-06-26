#!/usr/bin/env bash
#
# release.sh — Tag and push a new release of Are.na Sync for Obsidian.
#
# Usage:
#   npm run release            # Prompts for version bump type
#   bash scripts/release.sh    # Same thing
#
# What it does:
#   1. Ensures the working tree is clean and on `main`.
#   2. Runs lint + tests.
#   3. Bumps the version in package.json, manifest.json, versions.json.
#   4. Builds the production bundle.
#   5. Commits, tags, and pushes — triggering the release workflow.
#
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${GREEN}▸${NC} $1"; }
warn()  { echo -e "${YELLOW}▸${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1" >&2; exit 1; }

# ── Pre-flight checks ──────────────────────────────────────────────

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  error "You must be on the 'main' branch to release (currently on '$BRANCH')."
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  error "Working tree is not clean. Commit or stash your changes first."
fi

git pull --rebase origin main

# ── Choose version bump ────────────────────────────────────────────

CURRENT=$(node -p "require('./package.json').version")
info "Current version: ${BOLD}v${CURRENT}${NC}"

echo ""
echo "  What kind of release is this?"
echo ""
echo "    1) patch  (bug fixes, docs)"
echo "    2) minor  (new features, non-breaking)"
echo "    3) major  (breaking changes)"
echo "    4) custom (enter manually)"
echo ""
read -rp "  Choice [1-4]: " CHOICE

case "$CHOICE" in
  1) BUMP="patch" ;;
  2) BUMP="minor" ;;
  3) BUMP="major" ;;
  4)
    read -rp "  Enter version (without v prefix): " CUSTOM
    BUMP="$CUSTOM"
    ;;
  *) error "Invalid choice." ;;
esac

# ── Run quality checks ─────────────────────────────────────────────

info "Running lint…"
npm run lint

info "Running tests…"
npm test

# ── Bump version ────────────────────────────────────────────────────

if [[ "$CHOICE" == "4" ]]; then
  # Custom version — set it directly
  npm version "$BUMP" --no-git-tag-version
else
  npm version "$BUMP" --no-git-tag-version
fi

NEW_VERSION=$(node -p "require('./package.json').version")
info "Bumped to ${BOLD}v${NEW_VERSION}${NC}"

# version-bump.mjs syncs manifest.json and versions.json
npm_package_version="$NEW_VERSION" node version-bump.mjs

# ── Production build ───────────────────────────────────────────────

info "Building production bundle…"
npm run build

# ── Commit, tag, push ──────────────────────────────────────────────

git add package.json manifest.json versions.json
git commit -m "chore(release): v${NEW_VERSION}"
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"

info "Pushing to origin…"
git push origin main
git push origin "v${NEW_VERSION}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ Released v${NEW_VERSION}${NC}"
echo -e "${GREEN}    The release workflow will build and publish the GitHub${NC}"
echo -e "${GREEN}    Release automatically. Watch progress at:${NC}"
echo -e "${GREEN}    https://github.com/frostmute/Tetromino/actions${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

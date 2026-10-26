#!/usr/bin/env bash
# Stage a WordPress.org SVN release of Hatch Connect from build/hatch-connect.zip.
#
#   bash scripts/svn-stage.sh [version]
#
# Checks out https://plugins.svn.wordpress.org/hatch-connect anonymously into
# build/svn, puts the zip contents in trunk/ and tags/<version>/, the store
# assets from .wordpress-org/ in assets/, and runs svn add. It never commits.
# The last line printed is the svn ci command to run yourself as the plugin owner.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ZIP="$ROOT/build/hatch-connect.zip"
WC="$ROOT/build/svn"
SLUG="hatch-connect"
REPO="https://plugins.svn.wordpress.org/$SLUG"
VERSION="${1:-}"

[ -f "$ZIP" ] || { echo "Missing $ZIP. Run: bash scripts/build-zip.sh" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
unzip -q "$ZIP" -d "$TMP"
SRC="$TMP/$SLUG"
[ -f "$SRC/hatch.php" ] && [ -f "$SRC/readme.txt" ] || { echo "Zip does not contain $SLUG/hatch.php and readme.txt" >&2; exit 1; }

HEADER_VERSION="$(sed -n 's/^ \* Version: *//p' "$SRC/hatch.php" | head -1 | tr -d '[:space:]')"
STABLE_TAG="$(sed -n 's/^Stable tag: *//p' "$SRC/readme.txt" | head -1 | tr -d '[:space:]')"
VERSION="${VERSION:-$HEADER_VERSION}"
if [ "$HEADER_VERSION" != "$STABLE_TAG" ] || [ "$VERSION" != "$STABLE_TAG" ]; then
	echo "Version mismatch: plugin header $HEADER_VERSION, readme Stable tag $STABLE_TAG, requested $VERSION" >&2
	exit 1
fi

rm -rf "$WC"
svn co -q "$REPO" "$WC"
if [ -n "$(ls -A "$WC/trunk" 2>/dev/null)" ]; then
	echo "trunk/ is not empty. This script is for the first release only." >&2
	exit 1
fi
if [ -e "$WC/tags/$VERSION" ]; then
	echo "tags/$VERSION already exists." >&2
	exit 1
fi

rsync -a "$SRC/" "$WC/trunk/"
mkdir -p "$WC/assets"
rsync -a --exclude '.DS_Store' "$ROOT/.wordpress-org/" "$WC/assets/"

svn add -q --force "$WC/trunk" "$WC/assets"
svn cp -q "$WC/trunk" "$WC/tags/$VERSION"

# Binary store assets: let the directory serve them with the right type.
for f in "$WC"/assets/*.png; do svn propset -q svn:mime-type image/png "$f"; done
for f in "$WC"/assets/*.gif; do svn propset -q svn:mime-type image/gif "$f"; done

echo
svn status "$WC" | awk '{print $1}' | sort | uniq -c
echo "trunk files: $(find "$WC/trunk" -type f -not -path '*/.svn/*' | wc -l | tr -d ' ')"
echo "assets: $(ls "$WC/assets" | tr '\n' ' ')"
echo
echo "Review with: svn status \"$WC\" | less"
echo "Commit yourself as the plugin owner:"
echo "svn ci \"$WC\" -m \"Hatch Connect $VERSION: first public release\" --username <your wordpress.org username>"

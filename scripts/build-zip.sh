#!/usr/bin/env bash
# Build the WordPress.org distribution zip.
#
# Output: build/hatch-connect.zip containing one top-level folder, hatch-connect/.
# Exclusions come from wp-plugin/.distignore plus the extra rules below. The
# readable source of the compiled admin app (admin-react/src,
# package.json, package-lock.json) IS shipped: WordPress.org requires compiled
# code to come with its human-readable source. blocks-src is NOT shipped: the
# plugin has no block build, so those files would be dead weight that the
# readme does not describe.
#
# Run from the repository root:  bash scripts/build-zip.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/wp-plugin"
OUT="$ROOT/build"
SLUG="hatch-connect"
STAGE="$OUT/$SLUG"

command -v rsync >/dev/null || { echo "rsync is required" >&2; exit 1; }
command -v zip >/dev/null || { echo "zip is required" >&2; exit 1; }

# Refuse to package a tree with no compiled admin app.
[ -f "$SRC/build/admin/index.jsx.js" ] || { echo "missing wp-plugin/build/admin (run npm run build in wp-plugin)" >&2; exit 1; }

rm -rf "$OUT"
mkdir -p "$STAGE"

rsync -a \
  --include='/admin-react/' --include='/admin-react/src/' --include='/admin-react/src/***' \
  --include='/package.json' --include='/package-lock.json' \
  --exclude='/blocks-src/' \
  --exclude='node_modules' \
  --exclude='*.map' --exclude='.DS_Store' --exclude='*.log' --exclude='*.bak' --exclude='*.tmp' \
  --exclude='/CHANGELOG.md' --exclude='/design.md' --exclude='/wizard-screenshots.mjs' \
  --exclude='/admin-react/*.md' \
  --exclude-from="$SRC/.distignore" \
  "$SRC/" "$STAGE/"

# Readable source of the compiled Cloudflare frontend (frontend-bundle). Tracked
# and new files that .gitignore does not exclude are copied (a new source file that
# is not yet committed must still ship, or the documented rebuild cannot work), so no
# .env, node_modules or build output can ship. Files deleted from the working tree
# are skipped.
# source/ is left out by default (HATCH_ZIP_SOURCE=1 includes it). WordPress.org guideline 4 accepts either the
# source in the plugin or a link in readme.txt to a public repository, and Plugin
# Check reports errors for source/ (hidden files such as .npmrc, a .sh file and
# [slug].astro route names). The default therefore needs the public repository to hold the
# matching astro-starter source before the zip is submitted.
if [ "${HATCH_ZIP_SOURCE:-0}" = "1" ]; then
  mkdir -p "$STAGE/source/scripts"
  (
    cd "$ROOT"
    git ls-files -z --cached --others --exclude-standard astro-starter \
      | grep -zv -e '/\.env' -e '/node_modules/' -e '/dist/' -e '/\.astro/' -e '/\.wrangler/' -e '/\.dev\.vars' \
      | while IFS= read -r -d '' f; do [ -e "$f" ] && printf '%s\0' "$f"; done \
      | rsync -a --from0 --files-from=- ./ "$STAGE/source/"
  )
  cp "$ROOT/scripts/build-frontend-bundle.sh" "$STAGE/source/scripts/"
fi

# The licence text ships with the plugin (WordPress.org and GPL section 1).
[ -f "$ROOT/LICENSE" ] || { echo "missing LICENSE at the repository root" >&2; exit 1; }
[ -f "$SRC/THIRD-PARTY.txt" ] || { echo "missing wp-plugin/THIRD-PARTY.txt" >&2; exit 1; }
cp "$ROOT/LICENSE" "$STAGE/LICENSE"

# Nothing that looks like a secret or a dev artefact may ship.
if find "$STAGE" \( -name '.env*' -o -name '*.pem' -o -name '*.key' -o -name '.git*' -o -name 'node_modules' \) -print | grep -q .; then
  echo "unexpected dev or secret files in the package:" >&2
  find "$STAGE" \( -name '.env*' -o -name '*.pem' -o -name '*.key' -o -name '.git*' -o -name 'node_modules' \) -print >&2
  exit 1
fi

(cd "$OUT" && zip -rq -X hatch-connect.zip "$SLUG")
rm -rf "$STAGE"

echo "zip: $OUT/hatch-connect.zip"
du -h "$OUT/hatch-connect.zip" | cut -f1

# Release gate: a zip that fails the Orbit WP.org gate must not be handed to anyone.
# Added 2026-10-01 after the Plugin Review Team returned v1.0.0 (text domain, theme
# bundling, raw code injection, __return_true, $_REQUEST, notices). The gate runs
# Plugin Check for real in the Docker lab. HATCH_SKIP_GATE=1 skips it knowingly.
GATE="$HOME/.claude/skills/orbit-wporg-release-gate/check.sh"
if [ "${HATCH_SKIP_GATE:-0}" != "1" ]; then
  if [ ! -f "$GATE" ]; then
    echo "release gate not found at $GATE (set HATCH_SKIP_GATE=1 to skip knowingly)" >&2
    exit 1
  fi
  CHECK_DIR="$(mktemp -d)"
  unzip -q "$OUT/hatch-connect.zip" -d "$CHECK_DIR"
  set +e
  bash "$GATE" "$CHECK_DIR/$SLUG" --pcp-container="${HATCH_PCP_CONTAINER:-hatch_wp}" --prefix=hatch --tested-up-to=7.1 --slug="$SLUG" --owner=hmbhq | grep -E '^\[(FAIL|WARN)\]|Summary|STATUS'
  rc=${PIPESTATUS[0]}
  set -e
  rm -rf "$CHECK_DIR"
  if [ "$rc" -ge 2 ]; then
    echo "RELEASE GATE FAILED (exit $rc). $OUT/hatch-connect.zip must not be submitted." >&2
    rm -f "$OUT/hatch-connect.zip"
    exit 1
  fi
  echo "release gate: exit $rc (0 clean, 1 warnings only)"
fi

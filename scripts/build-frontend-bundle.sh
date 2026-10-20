#!/usr/bin/env bash
# Build the Cloudflare frontend bundle that ships inside the plugin.
#
# Source of truth: astro-starter/ in this repository (public source for the
# compiled Worker). Output: wp-plugin/frontend-bundle/
#
#   bundle.json   metadata read by Hatch_Frontend_Bundle
#   worker/       Worker modules from astro-starter/dist/server (*.mjs, *.wasm)
#   assets/       static files from astro-starter/dist/client
#
# Run from the repository root:  bash scripts/build-frontend-bundle.sh
# Inside the plugin zip the source sits in source/. There, give absolute paths:
#   PLUGIN_FILE="$PWD/../hatch.php" OUT="$PWD/../frontend-bundle" bash scripts/build-frontend-bundle.sh
# Set SKIP_INSTALL=1 to reuse an existing node_modules.
# The build runs in a temporary copy with no .env file and fixed placeholder
# addresses (see PH_* below), so a developer's local settings never ship.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASTRO="$ROOT/astro-starter"
OUT="${OUT:-$ROOT/wp-plugin/frontend-bundle}"
PLUGIN_FILE="${PLUGIN_FILE:-$ROOT/wp-plugin/hatch.php}"

command -v node >/dev/null || { echo "node is required" >&2; exit 1; }

# Build in an isolated copy so no developer .env, cache or local setting can leak
# into the shipped bundle. Astro inlines public server variables at build time, so
# the values below are fixed placeholder addresses. Hatch_Cloudflare_Provider
# replaces them with the site owner's real addresses when it uploads the Worker.
# Keep this list in sync with Hatch_Frontend_Bundle::PLACEHOLDERS.
PH_WP_API_URL="https://hatch-wp-api.invalid/wp-json/wp/v2"
PH_SITE_URL="https://hatch-site.invalid"
PH_WP_ORIGIN="https://hatch-wp-origin.invalid"

WORK="$(mktemp -d "${TMPDIR:-/tmp}/hatch-bundle.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/astro"
(cd "$ASTRO" && tar -cf - --exclude=node_modules --exclude=dist --exclude=.astro --exclude=.vercel --exclude=.wrangler --exclude='.env' --exclude='.env.*' --exclude='.dev.vars' --exclude='.dev.vars.*' .) | (cd "$WORK/astro" && tar -xf -)

cd "$WORK/astro"
if [ "${SKIP_INSTALL:-0}" = "1" ]; then
  [ -d "$ASTRO/node_modules" ] || { echo "SKIP_INSTALL=1 needs $ASTRO/node_modules" >&2; exit 1; }
  # Astro resolves real paths, so a symlink breaks the build; clone (copy-on-write on APFS) or copy instead.
  cp -Rc "$ASTRO/node_modules" node_modules 2>/dev/null || cp -R "$ASTRO/node_modules" node_modules
else
  npm ci --no-audit --no-fund
fi

# The build reads an unused default address for a hosted service from the config; drop it if present.
sed -i.bak "s#, default: 'https://hatch.adityaarsharma.com'##" astro.config.mjs && rm -f astro.config.mjs.bak

# Astro reads these from a .env file in the project root, so write one into the copy.
{
  echo "WP_API_URL=$PH_WP_API_URL"
  echo "PUBLIC_SITE_URL=$PH_SITE_URL"
  echo "PUBLIC_HATCH_WP_ORIGIN=$PH_WP_ORIGIN"
} > .env
env -i PATH="$PATH" HOME="$HOME" HATCH_TARGET=cf PUBLIC_SITE_URL="$PH_SITE_URL" npx astro build

SERVER="$WORK/astro/dist/server"
CLIENT="$WORK/astro/dist/client"
[ -f "$SERVER/entry.mjs" ] || { echo "missing $SERVER/entry.mjs" >&2; exit 1; }
[ -d "$CLIENT" ] || { echo "missing $CLIENT" >&2; exit 1; }

rm -rf "$OUT"
mkdir -p "$OUT/worker" "$OUT/assets"

# Worker modules only. dist/server/wrangler.json is build metadata, not a module.
(cd "$SERVER" && find . -type f \( -name '*.mjs' -o -name '*.wasm' \) -print0 | while IFS= read -r -d '' f; do
  mkdir -p "$OUT/worker/$(dirname "$f")"
  cp "$f" "$OUT/worker/$f"
done)

# Static assets, honouring the build's own .assetsignore list.
IGNORE_FILE="$CLIENT/.assetsignore"
(cd "$CLIENT" && find . -type f -print0 | while IFS= read -r -d '' f; do
  rel="${f#./}"
  [ "$rel" = ".assetsignore" ] && continue
  # Cloudflare takes _headers and _redirects as upload settings, not as files
  # (Wrangler does the same). _headers goes into bundle.json below.
  case "$rel" in _headers|_redirects) continue ;; esac
  if [ -f "$IGNORE_FILE" ] && grep -Fxq -- "$rel" "$IGNORE_FILE"; then
    continue
  fi
  mkdir -p "$OUT/assets/$(dirname "$rel")"
  cp "$rel" "$OUT/assets/$rel"
done)

HATCH_VERSION="$(sed -n "s/^define( 'HATCH_VERSION', '\(.*\)' );/\1/p" "$PLUGIN_FILE" | head -n1)"

HEADERS_FILE="$CLIENT/_headers" SERVER_DIR="$SERVER" OUT_DIR="$OUT" PLUGIN_VERSION="$HATCH_VERSION" PH_WP_API_URL="$PH_WP_API_URL" PH_SITE_URL="$PH_SITE_URL" PH_WP_ORIGIN="$PH_WP_ORIGIN" node -e '
const fs = require("fs");
const path = require("path");
const cfg = JSON.parse(fs.readFileSync(path.join(process.env.SERVER_DIR, "wrangler.json"), "utf8"));
const meta = {
  version: process.env.PLUGIN_VERSION || "",
  main_module: cfg.main || "entry.mjs",
  compatibility_date: cfg.compatibility_date,
  compatibility_flags: cfg.compatibility_flags || [],
  assets_config: Object.assign(
    { html_handling: "auto-trailing-slash", not_found_handling: "none" },
    fs.existsSync(process.env.HEADERS_FILE) ? { _headers: fs.readFileSync(process.env.HEADERS_FILE, "utf8") } : {}
  ),
  placeholders: {
    wp_api_url: process.env.PH_WP_API_URL,
    site_url: process.env.PH_SITE_URL,
    wp_origin: process.env.PH_WP_ORIGIN
  }
};
fs.writeFileSync(path.join(process.env.OUT_DIR, "bundle.json"), JSON.stringify(meta, null, 2) + "\n");
'

# Nothing personal or environment specific may ship: fail if any of these appear.
LEAK_RE='adityaranjansharma|pk_(test|live)_|sk_(test|live)_|localhost:8810'
if grep -rIlE "$LEAK_RE" "$OUT" >/dev/null 2>&1; then
  echo "bundle contains a developer address or key:" >&2
  grep -rIlE "$LEAK_RE" "$OUT" >&2
  exit 1
fi
# WordPress.org does not allow loading scripts or styles from a third-party CDN.
# Third-party URLs as plain text or links (docs, oEmbed) are fine; a <script src> or
# stylesheet <link> pointing off-site is not.
REMOTE_RE='<script[^>]*src=\\?"https?://|<link[^>]*rel=\\?"stylesheet\\?"[^>]*href=\\?"https?://|cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com'
# Services the plugin performs and documents in readme.txt ("External services")
# are the exception WordPress.org allows: payments, spam protection, web fonts.
SERVICE_RE='https://(js\.stripe\.com|www\.paypal\.com|challenges\.cloudflare\.com|fonts\.googleapis\.com|www\.googletagmanager\.com)/'
REMOTE_HITS="$(grep -rIoE ".{0,40}($REMOTE_RE).{0,60}" "$OUT" 2>/dev/null | grep -vE "$SERVICE_RE" || true)"
if [ -n "$REMOTE_HITS" ]; then
  echo "bundle loads a remote script or stylesheet that is not a documented service:" >&2
  echo "$REMOTE_HITS" >&2
  exit 1
fi
# No dotfiles, hosting config files or source maps may ship in the bundle.
BAD_ASSETS="$(cd "$OUT" && find . -type f \( -name '.*' -o -name '_headers' -o -name '_redirects' -o -name '_routes.json' -o -name '_worker.js' -o -name '*.map' \) | head -n 20)"
if [ -n "$BAD_ASSETS" ]; then
  echo "bundle contains files WordPress.org does not allow:" >&2
  echo "$BAD_ASSETS" >&2
  exit 1
fi
# Addresses hard-coded in the Astro source itself. They cannot be fixed from here, so list them.
HARDCODED_RE='hatch\.adityaarsharma\.com|://wp/wp-json'
if grep -rIlE "$HARDCODED_RE" "$OUT" >/dev/null 2>&1; then
  echo "WARNING: the Astro source hard-codes these addresses (fix in astro-starter/src):" >&2
  grep -rIoE "$HARDCODED_RE" "$OUT" | sort | uniq -c >&2
fi

echo "worker files: $(find "$OUT/worker" -type f | wc -l | tr -d ' ')"
echo "asset files:  $(find "$OUT/assets" -type f | wc -l | tr -d ' ')"
du -sh "$OUT" | cut -f1

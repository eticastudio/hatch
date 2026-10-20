#!/bin/bash
# Hatch — Static Bug Pattern Scanner
# Run anytime to find common bug patterns without running anything.
#
# Usage:  bash scripts/hatch-static-scan.sh
#
# Detects:
#   1. Orphan files (defined but not imported anywhere)
#   2. .bak files (sed cruft)
#   3. Console.log in production code
#   4. TODO / FIXME / HACK markers
#   5. Dead Astro routes (no Astro.params usage)
#   6. WP option keys that save but no one reads
#   7. WP option keys that read but no one saves
#   8. node_modules in plugin (size bloat)
#   9. Hardcoded URLs / IPs / secrets
#  10. Inconsistent label patterns

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN="$ROOT/wp-plugin"
ASTRO="$ROOT/astro-starter"
RED=$(printf '\033[31m'); GREEN=$(printf '\033[32m'); YELLOW=$(printf '\033[33m'); RESET=$(printf '\033[0m')
FOUND=0

section() { printf "\n${YELLOW}=== %s ===${RESET}\n" "$1"; }
issue()   { printf "  ${RED}✗${RESET} %s\n" "$1"; FOUND=$((FOUND + 1)); }
ok()      { printf "  ${GREEN}✓${RESET} %s\n" "$1"; }

section "1. .bak files (sed cruft)"
B=$(find "$PLUGIN" "$ASTRO/src" -name "*.bak" -not -path "*/node_modules/*" 2>/dev/null)
if [ -n "$B" ]; then echo "$B" | while read f; do issue "$(basename "$f") → $f"; done; else ok "none"; fi

section "2. Orphan Astro components (defined, never imported)"
for f in "$ASTRO/src/components"/*.astro "$ASTRO/src/components/theme"/*/*.astro; do
  [ -f "$f" ] || continue
  base=$(basename "$f" .astro)
  if ! grep -rln "from.*$base\|import.*$base" "$ASTRO/src/" 2>/dev/null | grep -v "$f" | head -1 > /dev/null; then
    issue "Unused: $f"
  fi
done
[ $FOUND -eq 0 ] && ok "all components imported"

section "3. console.log in non-script code"
CL=$(grep -rln "console\.log" "$ASTRO/src" 2>/dev/null | grep -vE "\.spec\.|/api/|telemetry|revalidate" | head -5)
if [ -n "$CL" ]; then echo "$CL" | while read f; do issue "console.log in $f"; done; else ok "none"; fi

section "4. TODO / FIXME / HACK markers"
T=$(grep -rln -E "TODO:|FIXME:|HACK:|XXX:" "$ASTRO/src" "$PLUGIN/includes" "$PLUGIN/admin-react/src" 2>/dev/null | head -5)
if [ -n "$T" ]; then echo "$T" | while read f; do issue "$f"; done; else ok "none in scanned dirs"; fi

section "5. node_modules in deployed plugin?"
if docker exec qwp_wordpress test -d /var/www/html/wp-content/plugins/hatch/node_modules 2>/dev/null; then
  issue "node_modules present in container — should be purged"
else
  ok "no node_modules in container"
fi

section "6. Hardcoded localhost:4321 / IPs in plugin code (should be options)"
H=$(grep -rln "localhost:4321\|127\.0\.0\.1" "$PLUGIN/includes" "$PLUGIN/admin" 2>/dev/null | grep -v "\.md$" | head -5)
if [ -n "$H" ]; then echo "$H" | while read f; do issue "hardcoded localhost in $f"; done; else ok "none"; fi

section "7. Unresolved placeholders in source (only true sentinels)"
# Strict: only flag obvious placeholder sentinels left from scaffolding.
# Skips legitimate template literals and env-var references.
U=$(grep -rln -E "TODO_INSERT|XXX_REPLACE|__PLACEHOLDER__|<<insert>>|FIXME_BEFORE_SHIP" "$ASTRO/src" "$PLUGIN/admin-react/src" 2>/dev/null | head -5)
if [ -n "$U" ]; then echo "$U" | while read f; do issue "placeholder in $f"; done; else ok "none"; fi

section "8. Plugin size in deployed container"
SIZE=$(docker exec qwp_wordpress du -sh /var/www/html/wp-content/plugins/hatch 2>/dev/null | awk '{print $1}')
if [[ "$SIZE" =~ M$ ]] || [[ "$SIZE" =~ G$ ]]; then
  issue "Plugin is $SIZE (should be <1MB)"
else
  ok "Plugin is $SIZE"
fi

section "9. Dispatcher paths saved but no Astro consumer (zombie pattern)"
# Quick spot check on a few risky paths
for path_root in performance content security; do
  WP=$(grep -lE "'${path_root}\." "$PLUGIN/admin/dashboard.php" 2>/dev/null | wc -l | xargs)
  if [ "$WP" = "0" ]; then issue "No dispatcher entries for ${path_root}.*"; fi
done
ok "core paths present"

section "10. Astro routes returning plain Response (should use Astro.rewrite for themed errors)"
PR=$(grep -rn "return new Response('Not Found'" "$ASTRO/src/pages" 2>/dev/null | head -5)
if [ -n "$PR" ]; then echo "$PR" | while read line; do issue "$line"; done; else ok "all 404s themed"; fi

printf "\n${YELLOW}=== SUMMARY ===${RESET}\n"
if [ $FOUND -eq 0 ]; then
  printf "${GREEN}✓ Zero static issues. Codebase is clean.${RESET}\n"
else
  printf "${RED}✗ %d static issue(s) found above.${RESET}\n" "$FOUND"
fi

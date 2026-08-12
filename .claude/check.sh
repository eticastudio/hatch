#!/usr/bin/env bash
set -e
# Hatch green-gate — verifies live truth, not synthetic tests.
# 1. PHP syntax on the plugin
find wp-plugin -name "*.php" -not -path "*/vendor/*" -not -path "*/node_modules/*" -print0 \
  | xargs -0 -n1 -P4 php -l >/dev/null
# 2. WP admin responds
curl -sf -o /dev/null -w "%{http_code}" http://localhost:8810/wp-admin/ | grep -qE '^(200|302)$'
# 3. REST features endpoint returns JSON
curl -sf http://localhost:8810/wp-json/hatch/v1/features | python3 -c "import sys,json; json.load(sys.stdin)"
echo "green"

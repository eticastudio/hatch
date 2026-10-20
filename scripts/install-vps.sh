#!/usr/bin/env bash
#
# Hatch — VPS installer
# ------------------------------------------------------------------
# Curl-pipe-bash one-liner served from hatch.adityaarsharma.com/install.sh
# Mirror: github.com/adityaarsharma/hatch/blob/main/scripts/install-vps.sh
#
# Scope today:
#   ✓ Install Node 20 (if missing) via NodeSource
#   ✓ Clone the Hatch repo
#   ✓ npm install + npm run build the Astro starter
#   ✗ NOT configure nginx / Apache / Caddy
#   ✗ NOT set up SSL / Let's Encrypt
#   ✗ NOT bind a domain
#   ✗ NOT register a systemd / PM2 process
#
# Why no SSL / nginx? Those are panel decisions (RunCloud / Coolify / Dokploy
# / your custom config). Future flags will let you opt in:
#   --install-nginx   ← coming soon
#   --install-ssl     ← coming soon
#   --install-pm2     ← coming soon
#
# Usage:
#   curl -fsSL https://hatch.adityaarsharma.com/install.sh | bash
#   curl -fsSL https://hatch.adityaarsharma.com/install.sh | bash -s -- --dir /custom/path
#   curl -fsSL https://hatch.adityaarsharma.com/install.sh | bash -s -- --no-node
#
# Exit codes:
#   0  success
#   1  unsupported environment (no apt/dnf, can't auto-install Node)
#   2  network / clone failure
#   3  npm install / build failure
#
# Environment variables (optional):
#   HATCH_REPO         git URL  (default: adityaarsharma/hatch)
#   HATCH_BRANCH       branch   (default: main)
#   HATCH_NODE_MAJOR   node ver (default: 20)
# ------------------------------------------------------------------

set -euo pipefail

# ----- config -----
HATCH_REPO="${HATCH_REPO:-https://github.com/adityaarsharma/hatch.git}"
HATCH_BRANCH="${HATCH_BRANCH:-main}"
HATCH_NODE_MAJOR="${HATCH_NODE_MAJOR:-22}"   # v0.50.9: bumped 20 → 22; Astro 5 requires ≥22.12
INSTALL_DIR=""
SKIP_NODE_INSTALL=false

# Credentials — when all four are provided, we auto-write astro-starter/.env.
WP_API_URL=""
WP_API_USER=""
WP_API_PASS=""
HATCH_WEBHOOK_SECRET=""

# Reserved for future toggles — printed as "coming soon" warnings if used today.
INSTALL_NGINX=false
INSTALL_SSL=false
INSTALL_PM2=false

# Parse flags.
while [[ $# -gt 0 ]]; do
	case "$1" in
		--dir)              INSTALL_DIR="$2"; shift 2 ;;
		--repo)             HATCH_REPO="$2"; shift 2 ;;
		--branch)           HATCH_BRANCH="$2"; shift 2 ;;
		--no-node)          SKIP_NODE_INSTALL=true; shift ;;
		--wp-url)           WP_API_URL="$2"; shift 2 ;;
		--wp-user)          WP_API_USER="$2"; shift 2 ;;
		--wp-pass)          WP_API_PASS="$2"; shift 2 ;;
		--webhook-secret)   HATCH_WEBHOOK_SECRET="$2"; shift 2 ;;
		--install-nginx)    INSTALL_NGINX=true; shift ;;
		--install-ssl)      INSTALL_SSL=true; shift ;;
		--install-pm2)      INSTALL_PM2=true; shift ;;
		-h|--help)
			cat <<-EOF
				Usage: install-vps.sh [flags]

				  --dir <path>           install directory (default: ./hatch)
				  --repo <url>           repo to clone   (default: adityaarsharma/hatch)
				  --branch <name>        branch          (default: main)
				  --no-node              skip Node auto-install (you'll manage it)

				Auto-write astro-starter/.env when all four are passed:
				  --wp-url <url>         e.g. https://your-wp.com
				  --wp-user <name>       WordPress username
				  --wp-pass <pass>       Application Password
				  --webhook-secret <s>   webhook signing secret

				Coming soon (toggles that today print "not yet supported"):
				  --install-nginx        auto-config nginx vhost
				  --install-ssl          request a Let's Encrypt cert
				  --install-pm2          register a PM2 process

				Examples:
				  curl -fsSL https://hatch.adityaarsharma.com/install.sh | bash
				  curl -fsSL https://hatch.adityaarsharma.com/install.sh | sudo bash -s -- \\
				      --wp-url "https://wp.example.com" --wp-user "admin" \\
				      --wp-pass "APPPASS" --webhook-secret "SECRET"
			EOF
			exit 0
			;;
		*)
			echo "Unknown flag: $1" >&2
			exit 1
			;;
	esac
done

# Default install dir = current working directory + hatch
if [[ -z "$INSTALL_DIR" ]]; then
	INSTALL_DIR="$(pwd)/hatch"
fi

# ----- pretty logging -----
log()  { printf "\033[1;36m[hatch]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[hatch][warn]\033[0m %s\n" "$*" >&2; }
die()  { printf "\033[1;31m[hatch][error]\033[0m %s\n" "$*" >&2; exit "${2:-1}"; }

# Flags reserved for future use — warn the user once.
if $INSTALL_NGINX; then warn "--install-nginx is not yet supported (planned)."; fi
if $INSTALL_SSL;   then warn "--install-ssl is not yet supported (planned)."; fi
if $INSTALL_PM2;   then warn "--install-pm2 is not yet supported (planned)."; fi

# ----- prerequisites -----
log "Checking prerequisites…"

command -v git >/dev/null 2>&1 || die "git not found. Install: apt install git  /  dnf install git" 1
command -v curl >/dev/null 2>&1 || die "curl not found. Install: apt install curl /  dnf install curl" 1

# ----- Node install (the only thing we DO install) -----
need_node_install=false
if ! command -v node >/dev/null 2>&1; then
	need_node_install=true
else
	NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
	# Astro 5 requires Node 22.12+. Any older Node triggers a reinstall.
	if [[ "$NODE_MAJOR" -lt 22 ]]; then
		warn "Found Node $NODE_MAJOR — Astro 5 needs ≥22.12. Will install Node $HATCH_NODE_MAJOR alongside."
		need_node_install=true
	fi
fi

if $need_node_install && $SKIP_NODE_INSTALL; then
	die "Node not present / too old, and --no-node was passed. Install Node 18+ manually." 1
fi

install_node_via_nodesource() {
	log "Installing Node $HATCH_NODE_MAJOR via NodeSource…"

	# Detect package manager and root method.
	# v0.50.9 — when running as root (the common VPS case), $sudo_cmd is empty
	# AND $sudo_env stays empty too. Previous code passed -E unconditionally,
	# which expands to "-E bash -" with no sudo prefix → "-E: command not found"
	# and the whole install fails on a fresh root shell. Fixed below.
	local sudo_cmd=""
	local sudo_env=""
	if [[ "$EUID" -ne 0 ]]; then
		if command -v sudo >/dev/null 2>&1; then
			sudo_cmd="sudo"
			sudo_env="-E"   # preserve env vars across sudo boundary
		else
			die "Need root to install Node. Re-run as root or install sudo." 1
		fi
	fi

	if command -v apt-get >/dev/null 2>&1; then
		curl -fsSL "https://deb.nodesource.com/setup_${HATCH_NODE_MAJOR}.x" | $sudo_cmd $sudo_env bash - || die "NodeSource setup failed" 1
		$sudo_cmd apt-get install -y nodejs || die "apt install nodejs failed" 1
	elif command -v dnf >/dev/null 2>&1; then
		curl -fsSL "https://rpm.nodesource.com/setup_${HATCH_NODE_MAJOR}.x" | $sudo_cmd $sudo_env bash - || die "NodeSource setup failed" 1
		$sudo_cmd dnf install -y nodejs || die "dnf install nodejs failed" 1
	elif command -v yum >/dev/null 2>&1; then
		curl -fsSL "https://rpm.nodesource.com/setup_${HATCH_NODE_MAJOR}.x" | $sudo_cmd $sudo_env bash - || die "NodeSource setup failed" 1
		$sudo_cmd yum install -y nodejs || die "yum install nodejs failed" 1
	elif command -v apk >/dev/null 2>&1; then
		# Alpine — NodeSource doesn't ship for Alpine, use built-in
		$sudo_cmd apk add --no-cache "nodejs>=18" npm || die "apk add nodejs failed" 1
	else
		die "Unsupported package manager. Install Node $HATCH_NODE_MAJOR+ manually then re-run with --no-node." 1
	fi

	# Verify
	command -v node >/dev/null 2>&1 || die "Node install reported success but 'node' still not on PATH." 1
	log "Installed Node $(node --version)"
}

if $need_node_install; then
	install_node_via_nodesource
fi

log "git $(git --version | awk '{print $3}') · node $(node --version) · npm $(npm --version)"

# ----- clone -----
if [[ -d "$INSTALL_DIR/.git" ]]; then
	log "Existing repo at $INSTALL_DIR — pulling latest from $HATCH_BRANCH"
	git -C "$INSTALL_DIR" fetch --depth 1 origin "$HATCH_BRANCH" || die "git fetch failed" 2
	git -C "$INSTALL_DIR" reset --hard "origin/$HATCH_BRANCH" || die "git reset failed" 2
else
	log "Cloning $HATCH_REPO → $INSTALL_DIR"
	git clone --depth 1 --branch "$HATCH_BRANCH" "$HATCH_REPO" "$INSTALL_DIR" || die "git clone failed" 2
fi

# ----- install + build -----
cd "$INSTALL_DIR/astro-starter"

log "Installing project dependencies…"
if [[ -f package-lock.json ]]; then
	npm ci --no-audit --no-fund || die "npm ci failed" 3
else
	npm install --no-audit --no-fund || die "npm install failed" 3
fi

# If all four credential flags were passed, write the .env automatically.
# Skip the placeholder string that the wizard emits when no App Password exists yet.
if [[ -n "$WP_API_URL" && -n "$WP_API_USER" && -n "$WP_API_PASS" && -n "$HATCH_WEBHOOK_SECRET" \
      && "$WP_API_PASS" != "<get-from-Connector-tab>" ]]; then
	log "Writing astro-starter/.env from the flags you passed…"
	umask 077
	cat > .env <<-EOF
		WP_API_URL=${WP_API_URL}
		WP_API_USER=${WP_API_USER}
		WP_API_PASS=${WP_API_PASS}
		HATCH_WEBHOOK_SECRET=${HATCH_WEBHOOK_SECRET}
	EOF
	chmod 600 .env
	log ".env written (mode 600 — readable only by the install user)."
fi

# Quick env-var sanity nudge — non-blocking.
if [[ ! -f .env ]]; then
	cat <<-EOF

	  ⚠ No .env file found in astro-starter/

	  Either re-run with the credential flags, or create one with:

	    WP_API_URL=https://your-wp-install.example.com
	    WP_API_USER=your_wp_username
	    WP_API_PASS=your_application_password
	    HATCH_WEBHOOK_SECRET=a_long_random_string

	  Get them from your WP admin → Tools → Hatch → Connector tab.

	EOF
	# In non-interactive mode (curl | bash), stdin is the pipe — read won't block.
	if [[ -t 0 ]]; then
		read -rp "Continue with build anyway? [y/N] " yn
		[[ "$yn" =~ ^[Yy]$ ]] || die "Aborted — add .env first, then re-run." 0
	else
		warn "Non-interactive run — proceeding with build. Add .env before going live."
	fi
fi

log "Building Astro (npm run build, target=node)…"
# Explicit HATCH_TARGET=node — the Astro adapter selector in astro.config.mjs
# defaults to 'cf' when no env hints exist, so VPS builds must opt in to Node.
#
# v0.50.6 — CRITICAL: pass WP_API_URL/USER/PASS/SECRET into the npm subprocess
# env so Vite's `define` in astro.config.mjs can inline them as literal strings
# into the SSR bundle. Without this the deployed Node process would have
# import.meta.env.WP_API_URL = undefined and silently fall back to "Hatch"
# defaults — same bug that hit Cloudflare deploys before the v0.49.2 fix.
# We read from .env (already written above with mode 600) and export each line.
if [[ -f .env ]]; then
	set -a
	# shellcheck disable=SC1091
	source .env
	set +a
fi
HATCH_TARGET=node \
WP_API_URL="${WP_API_URL:-}" \
WP_API_USER="${WP_API_USER:-}" \
WP_API_PASS="${WP_API_PASS:-}" \
HATCH_WEBHOOK_SECRET="${HATCH_WEBHOOK_SECRET:-}" \
	npm run build || die "npm run build failed" 3

# Sanity check: confirm the WP origin was inlined into the worker bundle.
# If it's not there the build "succeeded" but every WP fetch will silently fail.
if [[ -n "${WP_API_URL:-}" ]] && [[ -d dist ]]; then
	WP_HOST=$(node -e 'try { console.log(new URL(process.argv[1]).hostname) } catch { console.log("") }' "$WP_API_URL")
	if [[ -n "$WP_HOST" ]] && ! grep -rq "$WP_HOST" dist/ 2>/dev/null; then
		warn "Built bundle does NOT contain '$WP_HOST'. Vite inlining may have failed."
		warn "The deployed site will fall back to defaults instead of fetching your WP."
	else
		log "✓ Verified: '$WP_HOST' is baked into the bundle. Deploy will fetch your WP correctly."
	fi
fi

# ----- done -----
ENTRY="$INSTALL_DIR/astro-starter/dist/server/entry.mjs"

printf "\n"
printf "\033[1;32m────────────────────────────────────────────────────────────────\033[0m\n"
printf "\033[1;32m  ✓  Hatch is installed and built.\033[0m\n"
printf "\033[1;32m────────────────────────────────────────────────────────────────\033[0m\n"
printf "\n"
printf "  Build output:  %s/astro-starter/dist/\n" "$INSTALL_DIR"
printf "  Entry point:   %s\n" "$ENTRY"
printf "  Default port:  4321  (set PORT env to change)\n"
printf "\n"
printf "\033[1;33m  ─── What to do next ───────────────────────────────────────────\033[0m\n"
printf "\n"
printf "  \033[1m① Run the server\033[0m (test it first)\n"
printf "     node %s\n" "$ENTRY"
printf "     # Visit http://<your-server-ip>:4321\n"
printf "\n"
printf "  \033[1m② Keep it alive with PM2\033[0m\n"
printf "     npm install -g pm2\n"
printf "     pm2 start %s --name hatch\n" "$ENTRY"
printf "     pm2 save && pm2 startup\n"
printf "\n"
printf "  \033[1m③ Point your domain\033[0m\n"
printf "     Add an A record pointing your domain to this server's IP.\n"
printf "     Then set up nginx or Caddy to proxy → localhost:4321.\n"
printf "\n"
printf "     Nginx snippet:\n"
printf "       server {\n"
printf "         server_name yourdomain.com;\n"
printf "         location / { proxy_pass http://127.0.0.1:4321; proxy_set_header Host \$host; }\n"
printf "       }\n"
printf "\n"
printf "     Caddy (auto SSL):\n"
printf "       yourdomain.com { reverse_proxy localhost:4321 }\n"
printf "\n"
printf "  \033[1m④ SSL\033[0m\n"
printf "     Caddy: automatic (free, no config needed).\n"
printf "     Nginx: certbot --nginx -d yourdomain.com\n"
printf "     Hatch does not manage SSL — that's your server's job.\n"
printf "\n"
printf "\033[1;36m  ─── Using a control panel? ────────────────────────────────────\033[0m\n"
printf "\n"
printf "  RunCloud:  New webapp → Node.js → entry: dist/server/entry.mjs\n"
printf "  Coolify:   New resource → Node.js app → set PORT + entry point\n"
printf "  Dokploy:   App → Node.js → same as Coolify\n"
printf "  Laravel Forge: Daemon → node %s\n" "$ENTRY"
printf "\n"
printf "  Your panel handles nginx, SSL, and process management.\n"
printf "  Hatch's job here is done.\n"
printf "\n"
printf "  Docs: https://github.com/adityaarsharma/hatch/blob/main/docs/hosting/vps-runcloud.md\n"
printf "\033[1;32m────────────────────────────────────────────────────────────────\033[0m\n"
printf "\n"

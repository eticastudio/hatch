#!/usr/bin/env bash
#
# Hatch Frontend Agent — installer template.
#
# This file is a TEMPLATE. The Hatch WP plugin serves a copy of this with
# real values substituted (secret, port, workdir, wp_url) before sending.
#
# Placeholders:
#   {{HATCH_SECRET}}     — HMAC shared secret (48 chars)
#   {{HATCH_PORT}}       — agent listen port (default 34210)
#   {{HATCH_WORKDIR}}    — where Astro frontend lives (default /var/www/hatch-frontend)
#   {{HATCH_WP_URL}}     — the user's WordPress URL (for logging only)
#   {{HATCH_GIT_REPO}}   — frontend git repository URL
#   {{HATCH_BRANCH}}     — branch to track (default main)
#   {{HATCH_PM2_NAME}}   — PM2 process name (default hatch-frontend)
#   {{AGENT_JS_BASE64}}  — agent.js source base64-encoded (no second download)
#
# Run as root on a fresh-ish Ubuntu 22.04 / 24.04 / Debian 12 VPS.

set -euo pipefail

# ---- preflight ----
if [ "$(id -u)" -ne 0 ]; then
	echo "ERROR: This installer must be run as root." >&2
	echo "Try: sudo bash $0" >&2
	exit 1
fi

if ! grep -qE '^(Ubuntu 22|Ubuntu 24|Debian GNU/Linux 12)' /etc/os-release 2>/dev/null; then
	echo "WARNING: Tested on Ubuntu 22.04/24.04 and Debian 12. Your OS may need manual tweaks." >&2
fi

if ! command -v systemctl >/dev/null 2>&1; then
	echo "ERROR: systemd is required (this installer uses systemctl)." >&2
	exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "  Hatch Frontend Agent — installer"
echo "  WordPress: {{HATCH_WP_URL}}"
echo "  Agent dir: /opt/hatch-agent"
echo "  Workdir:   {{HATCH_WORKDIR}}"
echo "  Port:      {{HATCH_PORT}}"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ---- install packages ----
echo "▶ Installing dependencies (apt) …"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg git ufw >/dev/null

# Node.js 22 LTS via NodeSource (skip if recent enough already installed)
NODE_OK=0
if command -v node >/dev/null 2>&1; then
	NODE_MAJOR=$(node -e 'console.log(process.versions.node.split(".")[0])')
	if [ "${NODE_MAJOR:-0}" -ge 20 ]; then NODE_OK=1; fi
fi
if [ "$NODE_OK" -eq 0 ]; then
	echo "▶ Installing Node.js 22 LTS …"
	curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
	apt-get install -y -qq nodejs >/dev/null
fi

# PM2 (global)
if ! command -v pm2 >/dev/null 2>&1; then
	echo "▶ Installing PM2 …"
	npm install -g pm2 --silent
fi

# ---- create user + dirs ----
if ! id -u hatch >/dev/null 2>&1; then
	echo "▶ Creating hatch system user …"
	useradd --system --create-home --shell /bin/bash hatch
fi

mkdir -p /opt/hatch-agent /etc/hatch-agent
chown hatch:hatch /opt/hatch-agent

# ---- frontend workdir ----
WORKDIR="{{HATCH_WORKDIR}}"
if [ ! -d "$WORKDIR" ]; then
	echo "▶ Creating frontend workdir at $WORKDIR …"
	mkdir -p "$WORKDIR"
	chown hatch:hatch "$WORKDIR"
fi

if [ -n "{{HATCH_GIT_REPO}}" ] && [ ! -d "$WORKDIR/.git" ]; then
	echo "▶ Cloning frontend from {{HATCH_GIT_REPO}} …"
	sudo -u hatch git clone "{{HATCH_GIT_REPO}}" "$WORKDIR" || {
		echo "WARNING: git clone failed. You can clone manually later into $WORKDIR" >&2
	}
fi

# ---- drop agent.js (base64-decoded from template) ----
echo "▶ Writing agent.js …"
echo '{{AGENT_JS_BASE64}}' | base64 -d > /opt/hatch-agent/agent.js
chown hatch:hatch /opt/hatch-agent/agent.js
chmod 755 /opt/hatch-agent/agent.js

# ---- config ----
echo "▶ Writing /etc/hatch-agent/config.json …"
cat > /etc/hatch-agent/config.json <<HATCHCFG
{
  "secret":   "{{HATCH_SECRET}}",
  "port":     {{HATCH_PORT}},
  "bind":     "0.0.0.0",
  "workdir":  "{{HATCH_WORKDIR}}",
  "pm2_name": "{{HATCH_PM2_NAME}}",
  "wp_url":   "{{HATCH_WP_URL}}"
}
HATCHCFG
chmod 600 /etc/hatch-agent/config.json
chown hatch:hatch /etc/hatch-agent/config.json

# ---- systemd unit ----
echo "▶ Registering systemd service hatch-agent.service …"
cat > /etc/systemd/system/hatch-agent.service <<'UNITEND'
[Unit]
Description=Hatch Frontend Agent
After=network.target

[Service]
Type=simple
User=hatch
Group=hatch
WorkingDirectory=/opt/hatch-agent
ExecStart=/usr/bin/node /opt/hatch-agent/agent.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hatch-agent
# Hardening
ProtectSystem=full
ProtectHome=true
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNITEND

systemctl daemon-reload
systemctl enable hatch-agent.service >/dev/null 2>&1 || true
systemctl restart hatch-agent.service

# ---- firewall ----
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
	echo "▶ Opening port {{HATCH_PORT}}/tcp on ufw …"
	ufw allow {{HATCH_PORT}}/tcp >/dev/null 2>&1 || true
fi

# ---- wait for service to come up ----
echo ""
echo "▶ Waiting for agent to come up …"
ATTEMPTS=0
while [ $ATTEMPTS -lt 15 ]; do
	if curl -fsS "http://127.0.0.1:{{HATCH_PORT}}/healthz" >/dev/null 2>&1; then
		break
	fi
	ATTEMPTS=$((ATTEMPTS + 1))
	sleep 1
done

if curl -fsS "http://127.0.0.1:{{HATCH_PORT}}/healthz" >/dev/null 2>&1; then
	IP=$(curl -fsS https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')
	echo ""
	echo "✓ Hatch Agent is running."
	echo ""
	echo "  Now in WordPress admin, go to:  Tools → Hatch → Frontend"
	echo "  Paste this host:                $IP:{{HATCH_PORT}}"
	echo "  Click:                          Verify connection"
	echo ""
	echo "  Logs:    journalctl -u hatch-agent -f"
	echo "  Status:  systemctl status hatch-agent"
	echo ""
else
	echo "" >&2
	echo "✕ Agent did not start. Check logs with:" >&2
	echo "    journalctl -u hatch-agent -n 50 --no-pager" >&2
	exit 1
fi

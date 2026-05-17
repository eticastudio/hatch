# Security Policy

We take security seriously. Hatch is used by people running real businesses on WordPress — vulnerabilities hurt them.

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security bugs.**

Email: **security@adityaarsharma.com**

Subject line: `[SECURITY] Hatch — <short description>`

Please include:

- Affected component (WP plugin / Astro starter / Frontend Agent / specific module)
- Affected versions
- Reproduction steps
- Impact (what an attacker can do)
- Suggested fix if you have one
- Whether you want public attribution after disclosure

## Response Timeline

| Severity | Acknowledge | Patch target |
|---|---|---|
| **Critical** (RCE, auth bypass, secret leak) | within 24 hours | within 7 days |
| **High** (XSS, CSRF, privilege escalation) | within 48 hours | within 14 days |
| **Medium** (info disclosure, DoS) | within 72 hours | within 30 days |
| **Low** (config issues, defense-in-depth) | within 7 days | next release cycle |

For critical issues we'll coordinate disclosure date with you. Default: 90-day embargo from acknowledgment, or until fix ships — whichever is sooner.

## Disclosure Process

1. Report received → acknowledgment within timelines above
2. Reproduction confirmed → triaged within 7 days
3. Fix developed in private branch (not pushed to public main)
4. Fix shipped in patch release (e.g. `0.5.1`)
5. Security advisory published on GitHub (after fix ships)
6. Reporter credited in Hall of Fame (if they consent)

## Supported Versions

Only the latest minor version receives security patches. Older versions receive critical-only patches for 6 months after release.

| Version | Patches |
|---|---|
| **0.5.x** (current) | All |
| 0.4.x | Critical only until Nov 2026 |
| 0.3.x and earlier | None — please upgrade |

## Scope

**In scope:**
- WordPress plugin (REST endpoint vulnerabilities, auth bypass, privilege escalation)
- Frontend Agent daemon (HMAC bypass, replay, command injection, privilege escalation)
- SSH fallback class (credential leak, command injection)
- Astro starter / themes (XSS, secret leakage, CSRF on /api routes)
- Custom Code Block (sandbox escape, capability bypass)
- Modules under `@hatch/*` npm scope
- create-hatch CLI

**Out of scope:**
- Vulnerabilities in upstream WordPress core → report to wordpress.org
- Vulnerabilities in 3rd-party plugins Hatch integrates with → report to those plugin authors
- Vulnerabilities in hosting platforms (Cloudflare/Vercel/Netlify) → report to them
- DoS attacks against frontends (use Cloudflare WAF / rate limits)
- Social engineering of Hatch users

## Security Model — What Hatch Guards Against

### REST API hardening (v0.1)
- Anonymous `/wp-json/*` requests return 401 when "Block unauthenticated REST API" is enabled (default).
- `/wp/v2/users` endpoint removed entirely.
- `?author=N` enumeration redirects to home.
- `<head>` REST link tags stripped.
- XML-RPC fully disabled (can be re-enabled if needed).

### Login hardening (v0.2)
- Custom login URL using the proven WPS Hide Login intercept-via-`plugins_loaded` pattern.
- Forbidden slugs validated on save (rejects `wp-login`, `wp-admin`, `login`, `admin`, etc. + WP query vars).
- Brute-force IP lockout — hashed IPs stored as transients (no raw IPs in DB).
- Headless role guard kicks subscribers / customers / members out of wp-admin.
- 5-failure threshold, 30-minute window — both configurable.

### Frontend Agent — HMAC-signed channel (v0.5)
- Every WP → Agent request signed: `HMAC-SHA256(secret, timestamp.nonce.method.path.body)`
- 5-minute clock-skew window
- Nonces remembered for 6 minutes (replay protection)
- Agent only runs whitelisted commands: `git pull`, `git reset`, `npm/pnpm install --omit=dev`, `npm/pnpm run build`, `pm2 reload` — no arbitrary shell
- Optional `allowed_origin_ip` config restricts to WP server IP
- Install token is one-time, SHA-256-hashed in transient, 10-minute TTL
- 404 returned for invalid OR expired tokens (no info leak between states)
- systemd hardening on the agent: `ProtectSystem=full`, `ProtectHome`, `NoNewPrivileges`, `PrivateTmp`, non-root `hatch` user

### SSH fallback (v0.5)
- Credentials encrypted at rest via `sodium_crypto_secretbox` with `wp_salt`-derived 32-byte key
- Whitelisted command templates only — values shell-escaped via `escapeshellarg`
- Workdir validated: must be absolute path, no shell metacharacters

### Custom Code Block — three-layer defense (v0.4)
1. **Save-time gate** — only users with `unfiltered_html` capability can save raw HTML/CSS/JS. Lower-privileged saves are silently stripped.
2. **REST output filter** — content fetched by non-capable users has custom-code blocks stripped.
3. **Execution mode isolation:**
   - Inline (default): HTML + scoped CSS, JS dropped
   - Shadow DOM: HTML + CSS + JS inside `<hatch-shadow-code>` Web Component
   - Iframe: full `<iframe sandbox="allow-scripts">` isolation

### Plugin lifecycle
- Activation: generates a 48-character webhook secret via `wp_generate_password` (CSPRNG)
- Uninstall: removes all `hatch_*` options including encrypted credentials
- All admin handlers verify `manage_options` capability
- All state-changing actions require valid nonces

### What Hatch does NOT do (by design)
- No phone-home, no telemetry, no external infrastructure
- No customer data collected
- No connection to Aditya's servers
- The agent install script is served from the user's own WordPress install (not from a third party)

## Cryptographic Choices

| Use case | Algorithm | Library |
|---|---|---|
| Credentials at rest (agent secret, SSH password/key) | XSalsa20-Poly1305 (`sodium_crypto_secretbox`) | libsodium (PHP 7.2+ built-in) |
| Encryption key derivation | SHA-256 of `wp_salt('auth') . wp_salt('secure_auth')` truncated to 32 bytes | PHP `hash()` |
| HMAC for agent transport | HMAC-SHA256 | PHP `hash_hmac()` |
| Webhook secret generation | `wp_generate_password( 48 )` | WordPress (CSPRNG) |
| Token hashing (install tokens) | SHA-256 | PHP `hash()` |
| Constant-time comparison | `hash_equals` | PHP (constant-time) |

## Known Limitations

These are not vulnerabilities — they're documented limitations:

1. **Plaintext HTTP between WP and agent is allowed.** HMAC still protects integrity, but the secret + payload are visible to anyone on the wire. Use HTTPS to your agent in production (the agent generates a self-signed cert by default and WP falls back to HTTP only if HTTPS fails).
2. **Agent IP allowlist is opt-in.** By default the agent accepts requests from any IP that can produce a valid HMAC signature. For high-value deployments, set `allowed_origin_ip` in `/etc/hatch-agent/config.json`.
3. **WordPress encryption keys** (`wp_salt('auth')`, `wp_salt('secure_auth')`) — if these change, previously-encrypted secrets become garbage and the user must re-pair. This is by design (key rotation), but worth knowing.
4. **The Custom Code Block** assumes administrator-tier users are trusted. If an administrator account is compromised, raw HTML/CSS/JS execution on the frontend is one of many things the attacker can do.

## Security Audit History

| Date | Audit | Findings | Status |
|---|---|---|---|
| _pending_ | Patchstack OSS submission | — | Submitting in V0.6 milestone |

We'll update this table as audits land.

## Bug Bounty (planned for V1.0)

Not active yet. When V1.0 ships, tiers will be:

- Critical (RCE, auth bypass, secret leak): $500
- High (XSS, CSRF, privilege escalation): $250
- Medium (info disclosure, DoS): $100
- Low (config / defense-in-depth): $50

Hosted on huntr.com (free for OSS projects).

## Hardening Hatch in Production

Quick wins (most of these are Hatch's defaults):

- Install Hatch → security hardening defaults are ON (REST, XML-RPC, user enum, noindex)
- Set a custom login slug (Security tab) — masks `/wp-login.php`
- Enable 2FA on every WordPress user account (separate plugin recommended)
- Use Application Passwords (not main password) for frontend API access
- Put Cloudflare in front of CMS subdomain (free WAF + DDoS)
- Install WordPress on a non-public subdomain — Hatch will warn if you don't
- Run quarterly: `curl -sI https://[your-cms]/wp-json/wp/v2/users` should return 401

Full hardening guide: [docs/security.md](docs/security.md)

## Hall of Fame

People who've responsibly disclosed valid security issues. Be the first.

_(empty)_

---

**Last reviewed:** May 14, 2026 (v0.5.0 release)

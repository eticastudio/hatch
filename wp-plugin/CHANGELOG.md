## 0.7.6.1 — 2026-08-13
- fix(img): allow same-origin self-fetch through /img proxy (broken CF-deploy image thumbnails)

# Hatch WordPress Plugin — Changelog

## 0.8.0 (2026-09-28)

Cloudflare-only release for WordPress.org. Breaking cleanup, GPL-2.0-or-later, first version verified against a live Cloudflare deploy.

Added
- Disconnect button on the Connection tab, behind a confirm step. Calls `POST /hatch/v1/deploy/disconnect`: revokes the Hatch Application Passwords, deletes the Hatch Reader user and role, restores the previous theme.
- Read-only Hatch Reader user and role for the frontend, replacing use of an administrator account.
- Explicit consent gate before a deploy changes the theme, permalinks or creates the Application Password.
- Clear error when the Cloudflare account has no workers.dev address (`hatch_cf_no_subdomain`), raised before anything is uploaded.
- Frontend source ships inside the plugin (`source` folder) with THIRD-PARTY.txt.

Changed
- Deploy runs inside the site with a Cloudflare token the user supplies, stored AES-256-GCM encrypted, kept only if the user ticks the box.
- Frontend sign-in tokens are tied to the user's password and revoked on logout or password change. Earlier sessions are invalidated.
- Comments and store product routes no longer return draft, private, password-protected or withheld items.
- Form submissions older than 90 days are deleted automatically.
- License changed from MIT, then AGPL, to GPL-2.0-or-later.

Fixed
- PHP 8.1+ `strip_tags()` deprecation on the hidden setup page (registered under `options.php`).
- Broken image thumbnails through the image proxy on Cloudflare deploys.

Removed
- Hosted deploy service, VPS agent, Netlify and Vercel deploy paths, the plugin's own updater, all outbound telemetry, the AI helper and the Blocks tab, the legacy cleanup class, moved or hidden login URL.

## 0.7.6.0 — 2026-08-13

Release wrap for today's session:

- HatchForms front-end CSS ships with the form block so the input rail no longer inherits raw theme styles.
- WPForms bridge now persists submissions to the WordPress DB (was only pushing to REST echo).
- The Astro-side mu-plugin auto-installs on activation so a fresh WP install does not need a manual step.
- Cloudflare-deploy wizard now honours `mount_mode` end-to-end (Worker source + route + label were previously drifting).
- Admin toggle labels moved to the shared truth source so mismatch between wizard copy and DB key is impossible.

## [0.1.3] — 2026-05-20

Fixed: REST-lock toggle 404'd the headless frontend. `/hatch/v1/content` and `/hatch/v1/post/{id}/blocks` are now in the public allowlist alongside `/features`, `/menus`, `/seo-meta` — they only return already-public data so the toggle stays safe to flip on.

## [0.1.2] — 2026-05-20

Cloudflare Workers deploy fix. The Astro starter's middleware had a top-level `setInterval` that the CF Workers v2 runtime rejects (error 10021). Removed; lazy in-handler sweep now keeps the rate-limiter bounded. No plugin-side changes — version bumped to keep the pair in sync.

## [0.1.1] — 2026-05-20

Post-launch polish — see the root `CHANGELOG.md` for the full release notes.

Plugin-specific fixes:

- `Kill XML-RPC` toggle now hard-403s `/xmlrpc.php` (was 200 with method message)
- `Hide usernames` returns 404 on `?author=N` (was 301 redirect); `/wp/v2/users` independently stripped from REST surface
- `Hide WP from Google` now emits `Disallow: /` in `robots.txt` (was only meta robots)
- `Real-user telemetry` option key wiring fixed (was a silent no-op)
- `CDN asset prefix` removed (returns in v0.2)
- Gutenberg editor URL preview now mirrors the saved slug

## [0.1.0] — 2026-05-20

First stable public release. See the root `CHANGELOG.md` for the full Hatch release notes.

Highlights for the plugin specifically:

- React admin SPA — 6 tabs, 105 KiB JS, 6.66 KiB CSS, five canonical typography classes
- 3-step setup wizard with preflight diagnostic
- Plugin Bridge — 12 auto-detected capability slots
- WP Core Sync — one card mirrors every WP-owned setting the headless frontend consumes
- Performance toggles: clean media URLs, instant navigation, Partytown analytics, real-user telemetry
- Hardening: REST lock, XML-RPC kill, username enum block, custom login slug, brute-force lockout, security headers, Turnstile gating
- Application Passwords with rotate and broker-side .env scaffolding
- Read-only Status diagnostic tab
- `DISALLOW_UNFILTERED_HTML`, `/uploads/.htaccess` PHP block, secure-by-default config

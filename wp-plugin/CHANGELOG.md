# Hatch WordPress Plugin — Changelog

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

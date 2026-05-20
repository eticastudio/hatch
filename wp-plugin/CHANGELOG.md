# Hatch WordPress Plugin — Changelog

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

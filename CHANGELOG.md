# Changelog

All notable changes to Hatch are recorded here. Format adheres loosely to [Keep a Changelog](https://keepachangelog.com/).

## [0.1.1] — 2026-05-20

Post-launch polish — five hollow / mislabeled toggles fixed, repo cleaned, README rewritten to match shipped reality.

### Security toggles — code now matches every label

- **Kill XML-RPC** — `/xmlrpc.php` now hard-returns 403 (previously responded 200 with a method-list message; only method dispatch was blocked).
- **Hide usernames** — `?author=N` now returns 404 (was a 301 redirect to home). `/wp/v2/users` is removed from the REST surface unconditionally — no longer dependent on the REST-lock toggle.
- **Hide WP from Google** — `robots.txt` now emits `User-agent: *\nDisallow: /` when the toggle is on. Previously only the meta robots noindex was emitted; the `robots.txt` body was unchanged.

### Performance toggles — wiring fixes

- **Real-user telemetry** — fixed an option-key mismatch (UI was writing to `hatch_telemetry`, the frontend was reading `hatch_perf['telemetry']`). The beacon now actually fires when the toggle is on.
- **CDN asset prefix** — removed (was saved but never consumed). Will return in v0.2 wired into `astro.config.mjs` `build.assetsPrefix` at build time.

### Editor

- **Gutenberg URL preview** — the editor tooltip now mirrors the actual saved slug. Previously the preview reflected the title-derived `generated_slug` even when the user had manually edited the slug to something else.

### Layout

- **Page + post container alignment** — pages now share the same `--hatch-max-width` container as posts and the homepage. Header, footer, and article all align vertically on every route.

### Repo + documentation

- README rewritten with explanatory voice and v0.1.1 reality (no "8 Gutenberg blocks" claim — Hatch uses core Gutenberg).
- Removed all internal handoff / audit / architecture markdown files from the repo root.
- Removed legacy `docs/` folder (replaced by inline FAQ + README sections).
- `blocks-src/` excluded from the release zip (~40 KB smaller).
- `.DS_Store` added to `.gitignore`.

### Verified

- Zero static-scan issues across the codebase (10 checks).
- Zero runtime QA issues across 30 cells (5 themes × 5 page types) after the toggle fixes.
- Per-toggle end-to-end audit: 0 hollow, 0 broken across all 6 admin tabs.

## [0.1.0] — 2026-05-20

First stable public release. Hatch is one WordPress plugin that turns your existing install into a headless CMS, plus a matched Astro starter and a self-hosted deploy broker. Everything ships in the box.

### WordPress plugin

- **React admin SPA** — six tabs (Connection / Design / Content / Performance / Security / Status) running on a 105 KiB bundle with a shared `Hx*` primitive set. Inline `fontSize`/`fontWeight` replaced by five canonical typography classes (`.hx-title`, `.hx-label`, `.hx-byline`, `.hx-desc`, `.hx-help`) so the look stays consistent forever.
- **3-step setup wizard** — preflight checks, theme picker, and a one-click deploy that talks to the broker. The same wizard re-runs from the admin if anything drifts.
- **Plugin Bridge** — twelve capability slots (Forms / SEO / Sitemap / Redirects / eCommerce / Custom Fields / Email Newsletter / Memberships / Code Snippets / Data Tables) auto-detect the WordPress plugin providing each capability and surface its status. Extensible via the `hatch_plugin_bridge_catalog` filter.
- **WP Core Sync** — one card shows every WP-owned setting the Astro frontend reads: site identity, permalinks, homepage, menus (with inline picker), discussion, post types, taxonomies, users, privacy, languages.
- **Performance tab** — clean media URLs (auto-WebP/AVIF), instant navigation (Speculation Rules prerender on hover), analytics off main thread (Partytown), real-user telemetry. Best defaults locked; one toggle per concern.
- **Security tab** — REST API lock, XML-RPC kill, username enumeration block, hide-WP-from-Google. Custom login slug with hard-404 or homepage redirect. Role guard for wp-admin. Brute-force lockout (5-in-60 default). Server-side fortress (file editor disabled, security headers, 2FA enforce when a provider is installed). Application Passwords with one-click rotate.
- **Hardening baked in** — `DISALLOW_UNFILTERED_HTML`, `/uploads/.htaccess` PHP execution block, Turnstile-gated wp-login and classic comments when keys are configured.
- **Status tab** — read-only diagnostic, one line per flag/credential/cron. Monospace values, copyable, never wonders "where does this come from?".

### Astro starter

- **Astro 6 SSR**, default Node adapter, target switches via `HATCH_TARGET` (Cloudflare / Vercel / VPS). Self-hosted is the default — no Cloudflare Images, no required external service.
- **Five themes** — Astropaper (editorial), Tech (terminal), Docs (sidebar + breadcrumbs), Astrowind (marketing + gradient CTA), Astronano (minimal). Each has a unique header and footer; chrome aligns with content via the `--hatch-max-width` token.
- **Lazy per-theme CSS** — only the active theme's stylesheet downloads. Cuts cold-pageview CSS by ~80%, hits Lighthouse 100 on mobile with no unused-CSS finding.
- **Per-theme Google Font preloads**, served from `fonts.gstatic.com` with `preconnect` already wired.
- **Astro Sharp image service** explicitly configured. No custom image service.
- **View Transitions + Speculation Rules**, both feature-flagged. Partytown loads Web Worker analytics only when GTM is set and the user opts in.
- **Real-user telemetry beacon** — TTFB + LCP, no PII, no IP, no cookies, ~200 bytes per pageview when enabled.

### Deploy broker

- Node service at `hatch.adityaarsharma.com`. The `curl https://hatch.adityaarsharma.com/install` one-liner returns a setup script that installs Node, clones the Astro starter, writes the `.env`, and runs the first build on your VPS.
- Cloudflare and Vercel paths use a token-in-memory flow — tokens pass through the broker but are never written to disk.

### Quality bar

- Zero static-scan issues across the codebase (10 checks).
- Zero runtime QA issues across thirty rendered cells (six themes × five page types) including 404s, custom post types, archives, single posts, and the homepage.
- One commit, one tag, one release. History reset for the public launch.

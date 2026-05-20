<div align="center">

# 🐣 Hatch — Headless WordPress, made easy

**One plugin. One Astro starter. One self-hosted broker. Ship a fast, vendor-neutral headless WordPress site in an afternoon.**

[![License: MIT](https://img.shields.io/badge/License-MIT-10b981?style=flat-square)](LICENSE)
[![Astro 6](https://img.shields.io/badge/Astro-6-ff5e1f?style=flat-square)](https://astro.build)
[![WordPress 6.4+](https://img.shields.io/badge/WordPress-6.4+-21759b?style=flat-square)](https://wordpress.org)
[![Latest Release](https://img.shields.io/github/v/release/adityaarsharma/hatch?color=8b5cf6&style=flat-square)](https://github.com/adityaarsharma/hatch/releases/latest)

### 📦 [**Download Hatch v0.1.0 →**](https://github.com/adityaarsharma/hatch/releases/latest/download/hatch.zip)

_Drop into `wp-content/plugins/`. Activate. The wizard auto-launches._

</div>

---

## What Hatch ships

**One WordPress plugin** that turns your install into a headless CMS, plus a matched Astro starter and a self-hosted deploy broker.

- **Core Gutenberg only.** No custom blocks. Use the WordPress block editor you already know — Hatch reads what you write via REST and renders it on the Astro frontend.
- **React admin SPA** — 6 tabs (Connection · Design · Content · Performance · Security · Status), 105 KiB bundle, five canonical typography classes, one-toggle-per-concern.
- **3-step setup wizard** with a 12-point preflight diagnostic.
- **Plugin Bridge** — 12 capability slots (Forms · SEO · Sitemap · Redirects · eCommerce · Custom Fields · Email Newsletter · Memberships · Code Snippets · Data Tables) auto-detect the WordPress plugin providing each capability.
- **WP Core Sync** — one card mirrors every WP-owned setting the headless frontend reads: site identity, permalinks, homepage, menus, discussion, post types, taxonomies, users, privacy, languages.
- **Hardening** — REST lock, XML-RPC hard-403, username enum block (404), security headers, custom login slug, brute-force lockout, Turnstile gating on wp-login and comments, `DISALLOW_UNFILTERED_HTML`, `/uploads/.htaccess` PHP block, Application Passwords with one-click rotate.
- **Five Astro themes**, each with a unique header + footer:
  - **Astropaper** — magazine-style masthead, serif wordmark, byline strip, colophon footer
  - **Tech** — flat terminal masthead with mono nav, accent stripe, `● online` status pill, 3-column sign-off footer
  - **Docs** — compact bar with version badge, URL-derived breadcrumbs, `Search docs… ⌘K` affordance, 4-column structured footer
  - **Astrowind** — gradient brand badge, ghost-pill nav, gradient CTA, newsletter band footer
  - **Astronano** — tiny lowercase wordmark, plain-text nav, restrained minimal footer

## Quick install

**WordPress side**

1. Download `hatch.zip` from the latest release.
2. Upload via Plugins → Add New → Upload Plugin, or drop into `wp-content/plugins/`.
3. Activate. The setup wizard auto-launches.

**Astro frontend on your VPS (one command)**

```bash
curl -sSL https://hatch.adityaarsharma.com/install | bash
```

The broker returns a setup script that installs Node, clones the Astro starter, writes your `.env`, runs the first build, and prints the live URL. Tokens pass through in memory only.

**Or one-click deploy** to Cloudflare or Vercel from the wizard — paste an API token, click Build & Deploy.

## Architecture

```
WordPress  →  REST (hatch/v1)  →  Astro SSR  →  your visitors
  ↑              ↑                   ↑
  editor      App Password       node adapter (default)
                                 cf / vercel adapters opt-in
```

- **Plugin REST namespace:** `hatch/v1`. Mixed auth — most routes need an Application Password, public routes (comments, forms, menus, features) are open.
- **Astro SSR**, default Node adapter. Switch via `HATCH_TARGET=cf` or `=vercel`.
- **Lazy per-theme CSS** — only the active theme's stylesheet downloads.
- **View Transitions + Speculation Rules** both feature-flagged. Partytown loads only when GTM is set and the user opts in.
- **Real-user telemetry** — TTFB + LCP beacon, no PII, ~200 bytes per pageview, off by default.

## Local development

```bash
# WP via Docker
docker compose up -d        # localhost:8810, login admin / hatch-test-2026

# Astro dev
cd astro-starter && npm run dev     # localhost:4321

# Plugin admin React rebuild
cd wp-plugin && npm run build:admin

# Run the full QA sweep (5 themes × 5 page types)
cd test && npx playwright test e2e/_hatch-qa-scan.spec.js
```

## Roadmap

| Version | What ships | Status |
|---|---|---|
| **v0.1.0** | First stable: React admin (6 tabs), 3-step wizard, Plugin Bridge (12 slots), WP Core Sync, Performance + Security tabs, Astro SSR starter with 5 unique themes, self-hosted broker | ✅ Current |
| v0.2 | Plugin Bridge install button (one-click install of any not-detected provider) | 🔵 Planned |
| v0.3 | Custom-theme upload (manifest format, slot contract, security review) | 🔵 Planned |
| v0.4 | WP.org listing + external security audit | 🔵 Planned |

Release notes: [CHANGELOG.md](CHANGELOG.md)

## License

MIT. Built by [Aditya Sharma](https://adityaarsharma.com).

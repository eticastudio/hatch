<div align="center">

# 🐣 Hatch — Headless WordPress, made easy

**One plugin + one Astro starter + a self-hosted deploy broker. Ship a fast, vendor-neutral headless WordPress site in an afternoon — without giving up the editor your team already knows.**

Activate Hatch. Run the 3-step wizard. Paste a token (or a single curl line for VPS), watch a ~90-second build, get a live URL. No GitHub fork on your account. No GraphQL. No vendor lock-in. WordPress stays exactly where it is — the editor unchanged, the REST API hardened, the frontend rendered as static-fast Astro on the host of your choice.

[![One Plugin · Everything](https://img.shields.io/badge/One_Plugin-Everything-2563eb?style=flat-square)](#whats-inside)
[![License: MIT](https://img.shields.io/badge/License-MIT-10b981?style=flat-square)](LICENSE)
[![Astro 6](https://img.shields.io/badge/Astro-6-ff5e1f?style=flat-square)](https://astro.build)
[![WordPress 6.4+](https://img.shields.io/badge/WordPress-6.4+-21759b?style=flat-square)](https://wordpress.org)
[![Latest Release](https://img.shields.io/github/v/release/adityaarsharma/hatch?color=8b5cf6&style=flat-square)](https://github.com/adityaarsharma/hatch/releases/latest)

### 📦 [**Download Hatch v0.1.3 (latest) →**](https://github.com/adityaarsharma/hatch/releases/latest/download/hatch.zip)

_Drop into `wp-content/plugins/`. Activate. The setup wizard auto-launches._

[Why this is different](#why-this-is-different) · [What's inside](#whats-inside) · [The 5 themes](#the-5-themes) · [How it works](#how-it-works) · [Install](#install) · [vs alternatives](#hatch-vs-everyone-else) · [FAQ](#faq)

</div>

---

## Why this is different

Every headless WordPress option in 2026 ships **one thing**. You assemble the rest yourself.

- **Faust.js** ships a Next.js framework. You still need a security plugin, a GraphQL plugin, an SEO bridge, a forms bridge, a deploy pipeline.
- **gatsby-source-wordpress** ships a Gatsby data source. Same story — bring your own everything else.
- **HeadstartWP** (10up) ships a React framework. Still bring everything else.
- **DIY with REST** takes 3 weeks the first time, and the moment ACF, RankMath, or a custom post type misbehaves, you're alone with the WP REST docs.

**Hatch ships the whole stack as a single WordPress plugin.**

```
One plugin includes:
  ├─ React admin SPA — six tabs, premium Linear-grade UI, 105 KiB bundle
  ├─ 3-step setup wizard with a 12-point preflight diagnostic
  ├─ App Password generator with copy-to-clipboard .env block
  ├─ Plugin Bridge — auto-detects 12 capability providers (Forms / SEO /
  │  Redirects / eCommerce / Custom Fields / Email / Memberships / more)
  ├─ WP Core Sync — one card mirrors every WP-owned setting your headless
  │  frontend consumes (identity, permalinks, menus, post types, taxonomies,
  │  authors, privacy, languages)
  ├─ Security: REST lock, XML-RPC hard-403, username enum 404, robots.txt
  │  Disallow, custom login slug, brute-force lockout, security headers,
  │  Turnstile gating on wp-login + comments, 2FA enforce, App Password rotate
  ├─ Performance: clean media URLs, instant navigation (Speculation Rules),
  │  Partytown analytics off main thread, real-user telemetry
  ├─ A bundled Astro starter with FIVE themes — each with its own unique
  │  header + footer language
  └─ A self-hosted deploy broker — one curl line to bring up a VPS,
     one click to deploy to Cloudflare or Vercel
```

**No competitor bundles this.** This is the difference between "framework + 8 dependencies + a weekend" and "click install, done in an afternoon."

---

## What's inside

The plugin opens with **six centered tabs**, scoped to a CSS namespace so nothing leaks into wp-admin or other plugins.

### 🔌 Connection — the home tab

- **Frontend URL** with edit-in-place
- **12-point preflight diagnostic** (WordPress / PHP versions, permalinks, HTTPS, REST reachable + authenticated, App Passwords available, blocking plugins detected, cache plugins flagged, ACF / CPT REST exposure, webhook configured)
- **Frontend credentials block** with copy-to-clipboard `.env` (WP URL, user, App Password, webhook secret)
- **One-click broker deploy** — Cloudflare / Vercel / self-hosted VPS via a `curl` line

### 🎨 Design — your tokens, your visual system

- **Theme picker** — five built-in themes (see below), each with a unique header + footer
- **Brand colors** — primary, accent, fg, bg, and color mode (auto / light / dark)
- **Typography** — heading + body font pickers wired to Google Fonts (preconnect already set)
- **Layout** — max-width, density, border-radius scale, border + shadow tokens, breakpoints
- **design.md upload** — paste a single Markdown file, your fonts + colors + density flow to the frontend as CSS vars (no rebuild, no AI)
- **Reading-experience toggles** — progress bar, TOC sidebar, breadcrumb, reading time, last updated, author bio, heading anchors, share row, related posts, post navigation

### 📝 Content — bridge to the WordPress ecosystem

- **WP Core Sync card** — site identity, permalinks (with pretty-URL nudge), homepage, menu locations with inline picker, discussion (comments toggles), post types, taxonomies, users + roles, privacy, languages — all in one status view
- **Plugin Bridge** — twelve capability slots auto-detect the WordPress plugin providing each:
  - **Forms** → Fluent Forms · Gravity Forms · WPForms · Contact Form 7
  - **SEO + Sitemap** → RankMath · Yoast · AIOSEO
  - **Redirects** → RankMath · Yoast Premium · Redirection
  - **eCommerce** → WooCommerce · Easy Digital Downloads · WP EasyCart
  - **Custom Fields** → ACF · Meta Box · Pods · JetEngine
  - **Email Newsletter** → FluentCRM · Mailchimp for WP · MailPoet
  - **Memberships** → MemberPress · Paid Memberships Pro · Restrict Content Pro
  - **Code Snippets** → WPCode · Code Snippets · Advanced Scripts
  - **Data Tables** → TablePress · wpDataTables · Posts Table Pro
- **Google Tag Manager container ID** — Hatch ships GTM only by design (add GA4, Plausible, Pixel inside your GTM container)
- **Cloudflare Turnstile keys** — one key pair, used wherever spam protection is enabled

### ⚡ Performance — best defaults locked

Every toggle here has one job. Best defaults are locked in code; the toggles only flip the rare overrides:

- **Clean media URLs** — auto WebP / AVIF, typically ~40% smaller images
- **Instant navigation** — Speculation Rules prerender on hover (~sub-100ms click)
- **Analytics off main thread** — Partytown runs GTM in a Web Worker (Lighthouse perf +15–30 points)
- **Real-user telemetry** — TTFB + LCP beacon, no PII, ~200 bytes per pageview

### 🛡️ Security — secure by default, every toggle does what it says

The audit pass for v0.1.1 confirmed every toggle is **end-to-end wired** — no hollow UI:

- **Lock the REST API** — anonymous `/wp-json/*` returns 401
- **Kill XML-RPC** — `/xmlrpc.php` hard-returns 403 (not 200 with a method message)
- **Hide usernames** — `?author=N` returns 404, `/wp/v2/users` is removed from the REST surface entirely
- **Hide WP from Google** — meta robots noindex **and** `robots.txt` emits `Disallow: /`
- **Hide wp-login.php** — move login to a secret slug, with hard-404 or homepage redirect for the old URL
- **Restrict wp-admin access** — role guard, redirects non-allowed roles to the frontend at login
- **Brute-force lockout** — IP blocked after N failed logins in a rolling window
- **Server-side fortress** — `DISALLOW_FILE_EDIT`, `/uploads/.htaccess` PHP block, full security headers
- **Bot & spam protection** — invisible Cloudflare Turnstile on wp-login and the classic comment form
- **Application Passwords** — generate and rotate from the same card
- **Require 2FA for admins** — when a 2FA plugin is installed and your account is enrolled

### 📊 Status — read-only diagnostic

One line per flag, credential, and cron Hatch is currently using. Monospace values, copyable. The one place to answer "where does this come from?" without leaving the dashboard.

---

## The 5 themes

Pick from five themes, each with a genuinely distinct visual language — not the same shell with different colors.

| Theme | Vibe | Header | Footer |
|---|---|---|---|
| **Astropaper** | Editorial / magazine | Three-up masthead with edition date, serif small-caps wordmark, byline strip with kicker nav + italic tagline | Editorial colophon with masthead, italic tagline, `Vol. XX · No. YY · ©` edition line |
| **Tech** | Terminal / dev | Flat dark mast with primary accent stripe, `~/sitename$` mono prompt, JetBrains-Mono nav with `─` separators, `● online` status pill | 3-column terminal sign-off — `$ ls ./` link listing, `$ cat status` meta, `~/site $ exit 0` prompt |
| **Docs** | Documentation site | Compact bar with brand + version badge, URL-derived breadcrumbs, `Search docs… ⌘K` affordance, underline-on-active nav | 4-column structured grid: brand + tagline + version / Documentation / Resources / More |
| **Astrowind** | Marketing / SaaS | Gradient brand badge, centered ghost-pill nav, gradient `Get started →` CTA auto-targeted to your last menu item | Gradient newsletter CTA band, 4-column nav grid, polished bottom strip |
| **Astronano** | Minimal / personal | Tiny lowercase text-only wordmark, plain-text nav, no border, no chrome, tiny inline sun/moon toggle | Single restrained row of `© year sitename · 2-3 links · credit` |

You write posts in **core Gutenberg** — paragraphs, headings, lists, images, embeds. No custom blocks to learn. Hatch reads what you write via REST and renders it on the active theme.

---

## How it works

```
WordPress (editor + REST)
     │
     ├─ Plugin Bridge auto-detects your existing plugins
     ├─ /hatch/v1/features  →  what to render
     ├─ /hatch/v1/menus     →  primary + footer nav
     ├─ /hatch/v1/seo-meta  →  RankMath / Yoast passthrough
     └─ /wp/v2/posts        →  posts + pages + CPTs (auth: App Password)
            │
            ▼
       Astro SSR  (Node adapter by default; CF / Vercel opt-in)
            │
            ├─ 5 unique themes, lazy per-theme CSS (only the active theme loads)
            ├─ View Transitions + Speculation Rules
            └─ Partytown analytics worker (when GTM is set)
            │
            ▼
       Your visitors  (the WP admin redirects to the headless frontend
                       via the auto-installed Hatch Companion Theme)
```

**Self-hosted is the default.** `HATCH_TARGET=node` runs anywhere — Hetzner, DigitalOcean, RunCloud, Coolify, Dokploy, your own laptop. Cloudflare and Vercel adapters are one-click opt-in via the wizard. No required external service.

---

## Install

### WordPress side

1. Download [`hatch.zip`](https://github.com/adityaarsharma/hatch/releases/latest/download/hatch.zip).
2. Upload via Plugins → Add New → Upload Plugin, or drop into `wp-content/plugins/`.
3. Activate. The setup wizard auto-launches.
4. The wizard offers to install the bundled **Hatch Companion Theme** — one click, no separate download. It activates as the WP-side theme that redirects visitors to your headless frontend.

### Astro frontend on a VPS (one command)

```bash
curl -sSL https://hatch.adityaarsharma.com/install | bash
```

The broker returns a setup script that installs Node, clones the Astro starter, writes your `.env`, runs the first build, and prints the live URL. Tokens pass through in memory only — never written to disk.

### Cloudflare or Vercel (one click)

Open the wizard's Deploy step → paste a Cloudflare or Vercel API token → click Build & Deploy. Watch a ~90-second build. Get a live URL. No GitHub fork, no surprise commits, no vendor lock-in.

---

## Hatch vs everyone else

| | Hatch | Faust.js | Gatsby + source-wp | HeadstartWP | DIY REST |
|---|---|---|---|---|---|
| One plugin install | ✅ | ❌ | ❌ | ❌ | ❌ |
| Headless-ready security hardening built in | ✅ | ❌ | ❌ | ❌ | ❌ |
| Plugin Bridge for SEO / Forms / eCommerce / ACF / Memberships | ✅ (12 slots, auto-detect) | partial | partial | partial | ❌ |
| WP Core Sync card | ✅ | ❌ | ❌ | ❌ | ❌ |
| One-click deploy (Cloudflare / Vercel / VPS) | ✅ | manual | manual | manual | manual |
| Self-hosted by default | ✅ | varies | manual | manual | manual |
| Theme catalog with unique headers + footers | ✅ (5 built in) | bring your own | bring your own | bring your own | bring your own |
| GraphQL required | ❌ | ✅ (WPGraphQL) | ✅ | depends | optional |
| Vendor lock-in | none | Faust ecosystem | Gatsby Cloud (legacy) | 10up support | none |
| Time to live URL | ~afternoon | ~week | ~week | ~week | ~3 weeks |

---

## FAQ

**Do I need custom blocks?**
No. Hatch uses core Gutenberg. Write posts the way you already do — paragraphs, headings, lists, images, embeds. Hatch reads everything via REST and renders it on the Astro frontend.

**Do I need a GraphQL plugin?**
No. Hatch uses the standard WP REST API plus a small `hatch/v1/*` namespace for the bits WP doesn't expose by default (menus, SEO meta, features).

**Will my SEO plugin keep working?**
Yes. RankMath, Yoast, AIOSEO are auto-detected via Plugin Bridge. Their meta + schema + sitemap output is passed through to the Astro frontend untouched. Same for redirects (RankMath, Yoast Premium, Redirection).

**What about ACF or custom fields?**
ACF, Meta Box, Pods, JetEngine, CPT UI — all auto-detected. Hatch surfaces their fields and CPT REST exposure as status rows in the WP Core Sync card.

**Can my form plugin (Fluent Forms / WPForms / Gravity / CF7) render on the headless frontend?**
Yes. Plugin Bridge handles form rendering + submissions via the plugin's own endpoints. Hatch relays the embed shortcode.

**Can I keep traditional WordPress alongside Hatch?**
Yes. The Hatch Companion Theme is the **only** thing that changes on the WP side — and only if you install it. Without it, WP serves its own theme as normal. Hatch's REST hardening and security toggles work either way.

**Will my page builder (Elementor / Divi / Beaver) work?**
Page builders cannot work headlessly — their HTML output depends on PHP runtime that doesn't exist on a static Astro frontend. For Elementor / Divi sites: keep them as traditional WordPress. For new headless sites: use core Gutenberg and one of the five Hatch themes.

**What about CORS?**
For 95% of headless sites, **CORS doesn't apply** — your build process fetches WordPress server-to-server. CORS only matters if you make client-side `fetch()` calls from the browser to WordPress. The plugin emits the right headers when you opt in.

**What does uninstalling do?**
Default: deleting the plugin preserves all settings for a clean re-install. There's a single Security tab toggle ("Remove all data on uninstall") that wipes every `hatch_*` option on delete. The Hatch Companion Theme stays as a separate uninstall.

**Is it production-ready?**
v0.1.1 is the first stable release. Every admin toggle was audited end-to-end — zero hollow toggles, zero broken labels. The Astro starter ships with zero static-scan issues and zero runtime QA issues across 30 cells (5 themes × 5 page types). WP.org listing + external security audit are on the v0.4 roadmap.

---

## Roadmap

| Version | What ships | Status |
|---|---|---|
| **v0.1.1** | First stable: React admin (6 tabs), 3-step wizard, Plugin Bridge (12 slots), WP Core Sync, Performance + Security tabs (all toggles wired end-to-end), 5 unique themes, self-hosted broker, bundled Companion Theme | ✅ Current |
| v0.2 | Plugin Bridge install button (one-click install of any not-detected provider from inside the dashboard) | 🔵 Planned |
| v0.3 | Custom-theme upload (manifest format, slot contract, security review) | 🔵 Planned |
| v0.4 | WP.org listing + external security audit | 🔵 Planned |

Release notes: [CHANGELOG.md](CHANGELOG.md)

---

## License

MIT. Built by [Aditya Sharma](https://adityaarsharma.com).

<div align="center">
<br/>

**Hatch — The Headless Engine for WordPress.**

[Download v0.1.3 (latest)](https://github.com/adityaarsharma/hatch/releases/latest/download/hatch.zip) · [Star on GitHub](https://github.com/adityaarsharma/hatch)

</div>

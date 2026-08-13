<div align="center">

# Hatch: Headless WordPress, Made Easy

**One WordPress plugin. One Astro starter. One deploy broker. Ships a headless WordPress site in an afternoon.**

Activate the plugin. Run the 3-step wizard. Paste an API token or a curl line for a VPS. A 90-second build finishes and hands you a live URL. The Gutenberg editor stays exactly where it is. The WordPress REST API gets hardened. Your Astro frontend renders on Cloudflare Workers, Vercel, or a VPS you already own.

[![Latest Release](https://img.shields.io/github/v/release/adityaarsharma/hatch?color=8b5cf6&style=flat-square)](https://github.com/adityaarsharma/hatch/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-10b981?style=flat-square)](LICENSE)
[![Astro 6](https://img.shields.io/badge/Astro-6-ff5e1f?style=flat-square)](https://astro.build)
[![WordPress 6.4+](https://img.shields.io/badge/WordPress-6.4+-21759b?style=flat-square)](https://wordpress.org)

### [Download Hatch v0.7.6.1 (latest)](https://github.com/adityaarsharma/hatch/releases/latest/download/hatch.zip)

_Drop into `wp-content/plugins/`. Activate. The setup wizard auto-launches._

[Why headless WordPress usually sucks](#why-headless-wordpress-usually-sucks-and-why-hatch-fixes-it) · [60-second install](#60-second-install) · [Deploy targets](#deploy-targets) · [What ships in the box](#what-ships-in-the-box) · [Themes](#the-three-included-themes) · [How it works](#how-it-works) · [vs alternatives](#hatch-vs-alternatives) · [FAQ](#faq)

</div>

---

## Why headless WordPress usually sucks (and why Hatch fixes it)

Every existing decoupled WordPress option in 2026 hands you one piece and asks you to assemble the other eight yourself. Whether you evaluate GraphQL-based decoupled WordPress stacks or REST-first ones, the story rhymes.

| The usual headless WordPress workflow | The Hatch workflow |
|---|---|
| Install a plugin. Then a GraphQL plugin. Then a security plugin. Then an SEO bridge. Then a forms bridge. Then a deploy pipeline. Three weeks later, ship. | Install one headless WordPress plugin. Run the 3-step wizard. Ship the same afternoon. |
| Bring your own frontend, hosting, CI, and CDN. Debug the glue when ACF or RankMath breaks. | Bundled Astro starter with three themes, a self-hosted deploy broker, and a Plugin Bridge that auto-detects 12 capability providers. |
| GraphQL is the price of entry: extra plugin, extra schema, extra runtime cost. | WordPress headless without GraphQL. Hatch runs on the standard WordPress REST API plus a tiny `hatch/v1/*` namespace for what REST does not expose (menus, SEO meta, features). WordPress REST API contracts stay stable across WP releases, so bridges do not break on core updates. |
| SaaS lock-in with $99+/mo tiers or a per-seat editor. | MIT license, zero SaaS. Self-hosted headless WordPress deploy on any VPS you already own. |

Hatch is the only headless WordPress plugin that bundles the security hardening, the frontend, the Plugin Bridge, and the deploy tooling in one download. Running WordPress headless without GraphQL keeps the runtime footprint minimal and the debug surface tiny.

---

## 60-second install

```bash
# 1. Download the plugin
curl -LO https://github.com/adityaarsharma/hatch/releases/latest/download/hatch.zip

# 2. Drop it in wp-content/plugins/, then activate from WP Admin
#    (or: wp plugin install hatch.zip --activate)

# 3. Follow the wizard link that appears at the top of your dashboard
```

The wizard runs a 12-point preflight (permalinks, HTTPS, REST reachable, App Passwords available, cache conflicts flagged), generates an Application Password, and writes the `.env` block you copy into the Astro frontend.

---

## Deploy targets

Hatch is the only 1-click headless WordPress deploy tool that supports all three hosting shapes from the same wizard. Each target owns a first-class adapter for the WordPress Astro frontend, so the same build ships to any of them without config drift.

<table>
<tr>
<td width="33%" valign="top">

### WordPress Cloudflare Workers

Paste a Cloudflare API token. Click Deploy. Hatch pushes the Astro build to Cloudflare Workers (Pages runtime) and returns a live URL in ~90 seconds. No GitHub fork on your account, no surprise repos, no dashboard hopping. WordPress Cloudflare Workers hosting gives you global edge caching and a generous free tier out of the box.

</td>
<td width="33%" valign="top">

### WordPress Vercel deploy

Paste a Vercel token. Same Deploy button. WordPress Vercel deploy ships the SSR bundle to Vercel Functions with automatic preview URLs. Zero manual `vercel.json`. Zero framework-preset guessing. Every WordPress Vercel deploy run is idempotent, so shipping again just updates the same project.

</td>
<td width="33%" valign="top">

### Your VPS (self-hosted)

```bash
curl -sSL https://hatch.adityaarsharma.com/install | bash
```

One line brings up Node, clones the Astro starter, writes the `.env`, runs the first build, and prints the URL. Runs on Hetzner, DigitalOcean, RunCloud, Coolify, Dokploy, a Raspberry Pi, or your laptop. Tokens live in memory only.

</td>
</tr>
</table>

---

## What ships in the box

One WordPress plugin ZIP. Everything below is included, wired, and audited end-to-end.

### React admin dashboard

Six tabs, scoped CSS namespace so nothing leaks into `wp-admin`, and a 105 KiB bundle. Every toggle does what its label says: the v0.7.6.1 audit closed the last hollow control.

### Plugin Bridge (12 capability slots)

Hatch auto-detects the existing WordPress plugin filling each capability and exposes it to the Astro frontend via REST.

- **Forms:** Fluent Forms, Gravity Forms, WPForms, Contact Form 7
- **SEO + Sitemap:** RankMath, Yoast, AIOSEO (meta, schema, sitemap, og:image, Twitter card all passed through)
- **Redirects:** RankMath, Yoast Premium, Redirection
- **eCommerce (WooCommerce headless):** WooCommerce Store API, Easy Digital Downloads, WP EasyCart
- **Custom Fields:** ACF, Meta Box, Pods, JetEngine
- **Email + Newsletter:** FluentCRM, Mailchimp for WP, MailPoet
- **Memberships:** MemberPress, Paid Memberships Pro, Restrict Content Pro
- **Code Snippets, Data Tables, Analytics (GTM), Turnstile keys, WP Core Sync** as first-class rows

Every Bridge is REST-only. Zero WordPress plugin CSS or JS ever ships to the Astro side. Your form still renders, your SEO plugin still owns the meta, your redirects still fire, and the payload arrives as JSON while a pixel-perfect frontend stays under your control.

### Headless-ready security fortress

The v0.7.6.1 external pass confirmed every toggle is end-to-end wired.

- REST API lock (anonymous `/wp-json/*` returns 401)
- XML-RPC hard-403
- Username enumeration returns 404, `/wp/v2/users` removed from REST
- `robots.txt` emits `Disallow: /` and meta robots noindex on the WP domain
- Custom login slug with hard-404 or homepage redirect for the old URL
- Brute-force lockout (IP blocked after N failed logins in a rolling window)
- `DISALLOW_FILE_EDIT`, `/uploads/.htaccess` PHP block, full security header stack
- Invisible Cloudflare Turnstile on wp-login and the classic comment form
- App Password rotate + 2FA enforcement when a 2FA plugin is present
- SSRF-safe media proxy with a same-origin allowlist (v0.7.6.1 patch)

### Performance defaults locked in code

- Clean media URLs with auto WebP and AVIF (typically ~40% smaller images)
- Speculation Rules prerender on hover (~sub-100ms perceived click)
- Partytown moves analytics off the main thread (Lighthouse perf +15 to +30)
- Real-user TTFB and LCP beacons, no PII, ~200 bytes per pageview
- Zero WordPress CSS on the frontend (0 KB), because the frontend is Astro

### The WP-side companion theme

One-click install from the wizard. It handles the redirect from the WordPress domain to the headless frontend and does one job only. Install is optional. Skip it and WordPress serves its own theme as normal while every Hatch REST endpoint and security toggle keeps working.

### A bundled Astro starter

Three themes ship in the box (see below), lazy per-theme CSS (only the active theme loads), View Transitions, Speculation Rules, and Partytown wired. The starter renders Gutenberg blocks on Astro: the block JSON that Gutenberg produces is rendered by native Astro components using Hatch design tokens.

---

## The three included themes

Three themes, three distinct visual languages. Each theme owns its own header, footer, typography, and per-block styling.

| Theme | What it looks like | Best for |
|---|---|---|
| **Blog** | Editorial magazine. Fraunces serif display, warm cream paper, single saffron accent, drop-cap on the opening paragraph, italic serif blockquotes with a left rule. | Personal blogs, publications, longform writers |
| **Tech** | Terminal / dev. Flat dark mast, JetBrains Mono, code blocks with a left highlight bar, uppercase eyebrow tags, sharp 6px radii. | Developer sites, open source docs, changelogs |
| **Docs** | Documentation. Geist sans, cool gray palette, sidebar with a 3px active rail, TOC hover indent, note / warning / tip callouts. | Product documentation, knowledge bases, API references |

You write posts in **core Gutenberg**. Zero custom blocks to learn. Zero proprietary format. Hatch reads what you write via REST and the active theme renders it. This is the promise of Gutenberg blocks on Astro without a bridge library.

---

## How it works

```
WordPress (editor + REST) ── your team's existing workflow
     │
     ├─ Plugin Bridge auto-detects your existing plugins
     ├─ /hatch/v1/features   → what to render
     ├─ /hatch/v1/menus      → primary + footer nav
     ├─ /hatch/v1/seo-meta   → RankMath / Yoast / AIOSEO passthrough
     └─ /wp/v2/*             → posts, pages, CPTs (auth: App Password)
            │
            ▼
       Astro SSR   (Node adapter by default, Cloudflare / Vercel opt-in)
            │
            ├─ Three themes, lazy per-theme CSS
            ├─ View Transitions + Speculation Rules
            └─ Partytown analytics worker (when GTM is set)
            │
            ▼
       Your visitors
```

**Self-hosted headless WordPress is the default.** `HATCH_TARGET=node` runs on anything with Node 20+. Cloudflare Workers and Vercel adapters are opt-in from the wizard. Nothing phones home to a Hatch SaaS, because there is no Hatch SaaS.

---

## Hatch vs alternatives

| Feature | Hatch | Faust.js | WPGraphQL + Next | Frontity | Strattic |
|---|---|---|---|---|---|
| 1-click headless WordPress deploy | Yes (Cloudflare / Vercel / VPS) | Manual | Manual | Manual | Yes (Strattic only) |
| WordPress editor unchanged | Yes | Yes | Yes | Yes | Partial (static export) |
| Self-hosted with no SaaS required | Yes | Yes | Yes | Archived project | No (SaaS from $299/mo) |
| Monthly cost floor | $0 (MIT) | $0 (framework) | $0 (framework) | Discontinued | $299+/mo |
| WordPress-native (REST, GraphQL optional) | Yes | GraphQL required | GraphQL required | REST | Static HTML |
| Security hardening bundled | Yes (12 toggles, wired) | No | No | No | Partial |
| Plugin Bridge (SEO, Forms, WooCommerce headless, ACF, Memberships) | Yes (12 slots, auto-detect) | Partial | Partial | Partial | No |
| Themes included | 3 unique | 0 | 0 | 3 (legacy) | 0 |
| Time from install to live URL | ~afternoon | ~week | ~week | discontinued | ~day |

---

## FAQ

**Does Hatch work with my existing WordPress site?**
Yes. Install the headless WordPress plugin on any WP 6.4+ install. Nothing on the WP side changes until you optionally install the Companion Theme. Every existing plugin, post, and user keeps working exactly as before, and the WordPress REST API keeps serving both your admin and the new WordPress Astro frontend.

**Does Elementor / Divi / Beaver Builder still work?**
Page builders cannot render on a headless frontend. Their HTML depends on PHP runtime that does not exist on the Astro side. For existing Elementor or Divi sites, keep them as traditional WordPress. For new decoupled WordPress projects, use core Gutenberg with a Hatch theme and stay WordPress headless without GraphQL for the whole editorial workflow.

**Can I mount `/blog` on my existing WordPress domain and put the Astro frontend on the root?**
Yes. Reverse-proxy `/blog` on your CDN or web server to your WP origin. Hatch does not force a domain split. Documentation for Cloudflare Rules, nginx, and Caddy configs ships in the wiki.

**What does it cost?**
The plugin, the Astro starter, and the deploy broker are MIT. Hosting cost is whatever you already pay for WordPress plus Cloudflare Workers free tier, Vercel Hobby, or your VPS. A WordPress Cloudflare Workers deploy at Hobby scale runs $0 in most months. Zero Hatch SaaS. Zero per-seat billing.

**Does WooCommerce headless work?**
Yes. The eCommerce Bridge speaks the WooCommerce Store API (`/wc/store/v1/*`) for products, cart, and checkout. Zero WooCommerce CSS or JS ships to Astro. Payments run through Woo's native Stripe or PayPal gateway on the WP origin.

**Do SEO plugins keep working?**
Yes. RankMath, Yoast, and AIOSEO are auto-detected. Their meta description, og:image, Twitter card, schema, and sitemap.xml pass through to the Astro frontend untouched. Redirect plugins pass through the same way.

**Do form plugins keep working?**
Yes. Fluent Forms, Gravity Forms, WPForms, and Contact Form 7 render on the headless frontend and submit through the plugin's own REST endpoint. Submissions persist in the WordPress database exactly as they did before.

**How do I contribute?**
Open issues, PRs, and theme submissions welcome. Fork, branch, run the audit script (`bash scripts/audit.sh`), and open a PR against `main`. First-time contributor path documented in `CONTRIBUTING.md`.

---

## Community + license

MIT license. Built by [Aditya Sharma](https://adityaarsharma.com), the marketer who codes.

- Star this repo if the headless WordPress starter saved you a weekend.
- Open a GitHub issue for bugs or feature requests.
- PRs welcome (first-timer friendly).
- Discord invite: shipping with v0.8.

**Hatch. The headless engine for WordPress.**

[Download v0.7.6.1](https://github.com/adityaarsharma/hatch/releases/latest/download/hatch.zip) · [Star on GitHub](https://github.com/adityaarsharma/hatch) · [Release notes](CHANGELOG.md)

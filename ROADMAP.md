# Hatch — Roadmap

> Headless WordPress, end-to-end. Grouped into four horizons: shipped, next,
> planned, and explicitly NOT on the roadmap.
>
> **Last refreshed: May 15, 2026 — after v0.50.7.**

## ✅ Shipped (production)

### Core engine (v0.1 → v0.45)
- Companion plugin layer (REST hardening, ACF/CPT bridges, login hardening)
- App Password helper + connection-status cron
- Block-to-Astro serializer (8 headless-first Gutenberg blocks)
- Design.md → Tailwind tokens pipeline
- Companion theme (302 → frontend, admin "you're using Hatch" notice, permalink rewrites)
- Cloudflare Workers + Vercel + VPS deploy targets via the broker

### Connector / lifecycle (v0.46 → v0.50.7)
- Encrypted deploy-token store (AES-256-GCM, AUTH_KEY-derived) — one-click Redeploy forever
- Auto-clear on decrypt failure (handles WP salt rotation gracefully)
- Clean install / reinstall / uninstall lifecycle (default = preserve, opt-in = full wipe)
- Daily app-password prune cron (configurable retention, keeps newest 3)
- Status tab — every flag, cred, cron, deploy URL at one glance
- App-password rotate button + revoke-all
- Admin sidebar 🐣 emoji icon
- Same-tab View/Preview, new-tab admin bar Visit Site
- Save = inline spinner + "✓ Saved" tick on every form
- Auto-set pretty permalinks on activation when none configured (`/%postname%/`)
- Multisite-aware: per-site activation only, network-activate blocked with clear message

### Frontend (v0.27 → v0.50.7)
- 6 themes ready: AstroPaper · AstroWind · AstroNano · Tech (Cactus-feel) · Docs (Starlight-feel) · Blog (default)
- Per-theme Google Fonts (Lora · Plus Jakarta Sans · JetBrains Mono · Geist · Inter)
- Astro 5 view transitions across all themes
- Nested nav dropdown in `SiteHeader`
- WP "static front page" mode in `index.astro`
- Same-domain image proxy (`/img.ts`) with broker-fallback
- Plain-permalinks fallback (`?rest_route=`) — works on default-WP installs
- Bedrock / WP_HOME ≠ WP_SITEURL safe (form actions use `home_url`, not `site_url`)
- Encrypted token + saved CF/Vercel project — one-click Redeploy

### Operations
- Broker on hetzner with `WP_API_URL`/`USER`/`PASS`/`SECRET` passed to Vite at build time (no more silent fallback bug)
- Sharp LRU cache eviction in image proxy (default 500 MB cap)
- VPS install script with the same env-passing fix + post-build sanity grep
- Playwright e2e suite (9 spec files, 27+ tests) — re-runnable on every release
- Local Docker test rigs: `qwp_wordpress` (root install) + `test-subfolder/` (Bedrock + plain permalinks)

### Security & quality
- Builder-block plugin warning (Spectra / GenerateBlocks / Stackable / Kadence / Greenshift)
- REST API hardening, XML-RPC disable, user-enum block, force-noindex (all toggleable)
- Custom login slug + brute-force limiter
- Turnstile probe button (validates secret without rendering a challenge)
- Zero hardcoded URLs in runtime code
- Every admin-post handler has `check_admin_referer` + `manage_options` cap check
- PHP notice silencing on REST routes (covers /wp/v2/* AND /hatch/v1/*)

---

## 🚀 Next (v0.51.x — pixel polish)

| Item | Effort |
|---|---|
| AstroPaper pixel-perfect pass (screenshots, typography micro-tuning) | ~3 hrs |
| AstroWind pixel-perfect pass (gradient stops, hero spacing, card shadows) | ~3 hrs |
| AstroNano pixel-perfect pass (drop-cap, image bleed math, footer rhythm) | ~3 hrs |
| Tech / Docs / Blog visual QA + screenshot baseline | ~3 hrs |
| Real-VPS install end-to-end (clean Ubuntu 22.04 droplet, run `install-vps.sh`) | ~2 hrs |

---

## 🛣️  Planned (v0.52 → v0.55)

| Theme | What |
|---|---|
| **Custom domain wizard** | Connector-tab card to attach a custom domain on Cloudflare Workers / Vercel without leaving wp-admin |
| **CPT scaffolder** | Detects active CPT plugins (CPT UI, JetEngine, Pods), generates Astro routes for each |
| **Hatch CLI** (`npx hatch`) | Local dev: `hatch dev` (boots Astro + ngrok-tunnels WP), `hatch deploy`, `hatch sync` |
| **Edge cases** | CORS verification (D), `/blog/`-prefix permalinks (E), full multisite-network mode (F) |
| **Performance dashboard** | Status-tab section showing live Lighthouse scores + Core Web Vitals from real users |
| **Backup / migration** | Export Hatch settings as a portable JSON, import on another WP |
| **Webhook signing v2** | HMAC-SHA256 signed revalidate webhooks (currently bearer secret only) |
| **Comment moderation panel** | Headless-aware comment queue inside Hatch admin (avoids the WP comments table noise) |

---

## 🌐 Long-term (v1.0 → v2.0)

| Initiative | Why |
|---|---|
| **WooCommerce headless checkout** | Server-to-server token bridge to WC REST + on-site Stripe Elements payment |
| **Polylang / WPML i18n** | Astro i18n routing wired to WP language switcher, hreflang tags auto-generated |
| **Hatch Cloud** (optional) | Hosted broker + image proxy + deploy logs as a paid SaaS for non-technical users |
| **Theme marketplace** | Third-party Astro themes installable via the Hatch wizard with one click |
| **AI block-to-Astro converter** | Paste any Gutenberg block JSON → get a typed Astro component |
| **Multi-region edge** | Per-region worker deploys with WP-origin failover |

---

## 🚫 NOT on the roadmap (be explicit so the project stays focused)

| Idea | Why not |
|---|---|
| Replacing Gutenberg with a custom block editor | Gutenberg works. Headless doesn't mean re-implementing wp-admin. |
| GraphQL endpoint | REST is enough. WPGraphQL exists if you really want it. |
| AMP support | Astro is already faster than AMP. AMP is a dead spec. |
| Custom page builder | Use Gutenberg + Hatch blocks + your Astro components. No third builder. |
| Forking WordPress | Headless = WP unchanged. Fork attempts have all flopped. |
| Replacing the broker with a serverless function | The broker is intentionally stateful (build cache, ALLOWED_IMG_ORIGINS, sharp). Serverless cold-starts hurt 90s deploys. |

---

## How to influence the roadmap

- **Open an issue** describing the use case in plain English (no spec needed)
- **Star the repo** — signals priority
- **Sponsor** for direct prioritisation
- All decisions go through `ARCHITECTURE.md` and one of the locked-in principles documented there

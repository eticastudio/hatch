# Hatch — final audit (v0.24.0)

> _As of 2026-05-15. Updated after every release. This is the single source of truth for "what does Hatch actually do today?"_

## TL;DR

Hatch is an **Astro-first** headless WordPress engine. One WordPress plugin + one Astro starter + a 1-click deploy broker. Everything dynamic flows through WP REST. The Astro frontend SSRs at request time and edge-caches for 60 seconds — content goes live in under a minute, no rebuilds, no webhooks required.

## What's static vs dynamic?

**Static (built into the Astro starter):** layouts, components, design tokens (until you edit `design.md`), feature toggles wired through to renderers.

**Dynamic (fetched from WP REST at SSR time):**

| What | REST endpoint |
|---|---|
| Site title + tagline + language + favicon | `/hatch/v1/features` → `site.*` |
| Active theme (Blog / Tech / Docs) | `/hatch/v1/features` → `theme` |
| Design tokens (colors, fonts, density) | `/hatch/v1/features` → `design` (also `/hatch/v1/design`) |
| Feature toggles (14 flags) | `/hatch/v1/features` → `features` |
| Static front page (WP Reading setting) | `/hatch/v1/features` → `home.*` |
| Registered CPTs | `/hatch/v1/features` → `cpts[]` |
| SEO plugin + Form plugin auto-detect | `/hatch/v1/features` → `integrations.*` (also `/hatch/v1/integrations`) |
| Cloudflare Turnstile site key | `/hatch/v1/features` → `integrations.turnstile.site_key` |
| Posts, pages, categories, tags, authors, media | native `/wp/v2/*` |
| Rendered `<head>` (Yoast / Rank Math / SEOPress / AIOSEO) | `/hatch/v1/seo-head?url=…` |
| Block-to-Astro serialized JSON | `/hatch/v1/post/{id}/blocks` |
| Comments thread for a post | `/hatch/v1/comments?post={id}` |
| Comment submission (Turnstile-gated) | `POST /hatch/v1/comments` |
| Form embed (server-rendered shortcode) | `/hatch/v1/forms/{id}/embed` |
| Form submission | `POST /hatch/v1/forms/submit` |
| Heartbeat / verify connection | `/hatch/v1/verify-connection` |

Everything in the second column is fetched live, edge-cached 60s, and revalidated on next request. There is no "rebuild step" between hitting Publish in Gutenberg and the post appearing.

## Plugin surface — what ships in `hatch.zip`

```
wp-plugin/
├── hatch.php                           ← bootstrap, version, defaults
├── readme.txt                          ← WP.org-style readme
├── admin/
│   ├── dashboard.php                   ← 6-tab admin (Connector · Features · Design · Integrations · Blocks · Security)
│   ├── setup-wizard.php                ← 4-step onboarding
│   └── design.example.md               ← starter design.md
├── companion-theme/                    ← bundled blank WP theme, 1-click installed
└── includes/
    ├── class-rest-api.php              ← namespace + permission helpers
    ├── class-features.php              ← 14 toggles + theme + design embed
    ├── class-integrations.php          ← SEO/Form/Turnstile auto-detect + REST
    ├── class-headless-comments.php     ← GET/POST /hatch/v1/comments + Turnstile
    ├── class-headless-forms.php        ← /forms/submit + /forms/{id}/embed
    ├── class-design-loader.php         ← design.md parser + /hatch/v1/design
    ├── class-companion-theme-installer.php
    ├── class-deploy-broker.php         ← 1-click deploy to CF / Vercel / VPS
    ├── class-deploy-hooks.php          ← legacy hooks (Webhook URLs)
    ├── class-revalidate.php            ← optional edge-cache purge webhook
    ├── class-connection-status.php     ← cron + verify (v0.24: SSR-aware)
    ├── class-seo-bridge.php            ← Yoast / Rank Math getHead proxy
    ├── class-block-serializer.php      ← Gutenberg → Astro JSON
    ├── class-blocks-* (5 files)        ← block registry + Tailwind runtime
    ├── class-security.php              ← REST hardening, xmlrpc kill
    ├── class-login-hardening.php       ← login URL obfuscation, role guard
    ├── class-app-password-helper.php   ← 1-click App Password
    ├── class-acf-bridge.php            ← ACF fields in REST
    ├── class-cpt-scanner.php           ← surfaces registered CPTs
    ├── class-diagnostic.php            ← 11-check preflight
    ├── class-domain-check.php
    ├── class-frontend-agent.php        ← VPS PM2 control
    ├── class-frontend-installer-route.php
    ├── class-frontend-ssh.php
    ├── class-rankready-bridge.php
    ├── class-forms-bridge.php          ← legacy
    ├── class-woocommerce-bridge.php    ← read-only product REST
    ├── class-health-widget.php         ← wp-admin dashboard widget
    └── class-cli.php                   ← WP-CLI commands
```

## Astro starter — what ships

```
astro-starter/
├── astro.config.mjs                    ← multi-adapter (CF / Vercel / Node)
├── wrangler.toml                       ← CF Workers Assets config
├── package.json                        ← pinned adapters
├── src/
│   ├── layouts/PageLayout.astro        ← theme dispatch + design CSS vars
│   ├── components/
│   │   ├── SiteHeader.astro
│   │   ├── SiteFooter.astro            ← WP site name + "Built by Hatch" credit
│   │   ├── PostCard.astro              ← 3 variants (default / compact / feature)
│   │   ├── HatchComments.astro         ← thread + reply form (Turnstile)
│   │   ├── HatchEmbedForm.astro        ← Fluent Forms / WPForms / Gravity embed
│   │   └── blocks/*                    ← block renderers
│   ├── lib/
│   │   ├── features.ts                 ← getFeatures() — 60s cache
│   │   ├── design.ts                   ← design.md → CSS vars + Google Fonts
│   │   ├── hatch.ts                    ← getPosts / getPages / getCategories
│   │   ├── blocks.ts
│   │   └── cache.ts                    ← edge cache header helper
│   ├── styles/
│   │   ├── global.css                  ← tokens + Tailwind 4
│   │   ├── theme-tech.css              ← Astro Cactus aesthetic
│   │   └── theme-docs.css              ← Starlight aesthetic
│   └── pages/
│       ├── index.astro                 ← 3 modes (static page / blog / empty)
│       ├── [...slug].astro             ← WP Pages catch-all
│       └── blog/
│           ├── index.astro             ← listing + newsletter embed
│           ├── [slug].astro            ← single post + comments
│           ├── category/[slug].astro
│           ├── author/[slug].astro
│           └── tag/[slug].astro
```

## Headless WP problems Hatch solves (vs. nothing / vs. competitors)

| Problem | Without Hatch | With Hatch |
|---|---|---|
| Editor hits Publish → site rebuilds for 4 min | Faust / Frontity / every Next starter | ✅ SSR + 60s edge cache. Live in ≤60s. |
| Need 5 plugins (SEO bridge + GraphQL + REST hardening + forms bridge + auth) | DIY headless stack | ✅ One plugin. |
| GraphQL learning curve | WPGraphQL camp | ✅ REST-only. `/hatch/v1/*` namespace. |
| GitHub fork required on user's account for OAuth deploys | Vercel WP Integration | ✅ Broker-managed. Token in memory, dropped after 90s. |
| Custom Post Types don't auto-route | DIY | ✅ `/features.cpts[]` exposed, v0.24 wiring lands next. |
| Frontend doesn't know what's installed in WP | DIY | ✅ Auto-detects Yoast/RM/SEOPress/AIOSEO + Fluent Forms / WPForms / FluentCRM. |
| Comments break in headless | "Add Disqus" | ✅ Native WP comments via REST + Turnstile. |
| Forms break in headless | "Embed an iframe" | ✅ Server-renders Fluent Forms / WPForms shortcode. JS works as-is. |
| Authors / categories / tags missing | Manual | ✅ Archive pages auto-generated when toggle is on. |
| Frontend has no branding | "Edit CSS" | ✅ `design.md` paste → CSS variables + Google Fonts. No rebuild. |
| Asset spam from theme/plugin enqueues | Manual | ✅ Companion theme strips frontend chrome. |
| Cloudflare Turnstile setup | Manual | ✅ Site/secret keys in Integrations tab; Comments + Forms gate auto. |

## Form, Spam, Comments — exact stack

**Forms** — pick **Fluent Forms** (free, recommended). Hatch reads it through three paths:

1. Direct embed (default, v0.24+): `GET /hatch/v1/forms/{id}/embed` runs Fluent Forms' own shortcode, returns the rendered HTML + the CSS/JS URLs Fluent would normally enqueue. Astro `<HatchEmbedForm />` drops the HTML in, lazy-loads assets. **Submissions go through Fluent's own AJAX** — no Hatch-side handling needed. All Fluent features (conditional logic, file uploads, payments, multi-step) work as-is.
2. Programmatic submit (fallback, when JSON-only): `POST /hatch/v1/forms/submit` accepts `form_id + email + fields + cf-turnstile-response` and routes to Fluent Forms / WPForms / FluentCRM list-subscribe / native `hatch_submission` CPT — in that priority.

**Spam** — **Cloudflare Turnstile**. Site key + secret key in `Tools → Hatch → Integrations`. Server-side verify on `/hatch/v1/comments` and `/hatch/v1/forms/submit`. Site key is safe to expose (it's meant to live in the client). Secret key never goes through `/hatch/v1/integrations`.

**Comments** — Native `wp_insert_comment`, REST-exposed:

- `GET /hatch/v1/comments?post={id}` — flat tree of approved comments + avatars + author flag.
- `POST /hatch/v1/comments` — Turnstile-gated, length-validated, respects "moderate before publish" + "require sign-in" flags from the Integrations tab.

## Themes — what's bundled in v0.24

| Theme | Base | Status |
|---|---|---|
| **Blog** | Hatch-native | ✅ Vercel/Linear aesthetic, sharp typography |
| **Tech** | Inspired by [Astro Cactus](https://github.com/chrismwilliams/astro-theme-cactus) (MIT) | ✅ Dark default, mono accents, code-first |
| **Docs** | Inspired by [Starlight](https://starlight.astro.build) (MIT) | ✅ Sidebar nav + on-page TOC + breadcrumbs + callouts |
| AstroPaper | Inspired by [AstroPaper](https://github.com/satnaing/astro-paper) (MIT) | 🔵 v0.29 |
| AstroWind | Inspired by [AstroWind](https://github.com/onwidget/astrowind) (MIT) | 🔵 v0.29 (marketing-site flavor) |

Theme selection: `Tools → Hatch → Features → Theme`. The Astro starter sets `data-hatch-theme` on `<html>` and the right stylesheet scopes itself with that attribute. **No JS hydration cost** — pure CSS.

## design.md system — how it works

1. Author writes a `design.md` file with YAML frontmatter (colors, fonts, density, voice).
2. Paste it in `Tools → Hatch → Design`. Plugin parses + validates per-key, stores raw + parsed.
3. `GET /hatch/v1/design` and `GET /hatch/v1/features` (embedded) return the parsed tokens.
4. Astro `PageLayout` reads `features.design`, calls `designToCssVars()`, drops the resulting CSS variables on `<html style="…">`, preconnects to Google Fonts when custom fonts are declared.
5. Edge cache picks up the change in 60 seconds. No rebuild.

Example schema in `wp-plugin/admin/design.example.md`. The body section below the frontmatter is stored (used by future AI-rebuild flows in v0.30+).

## Deploy flow — exact sequence

```
User opens Tools → Hatch (plugin just activated)
   ↓
Setup wizard auto-launches
   1. Welcome + 11-check preflight diagnostic
   2. Pick a theme (Blog / Tech / Docs)
   3. Pick a host (Cloudflare Workers / Vercel / VPS)
   4. Paste a token (CF Workers Scripts: Edit or Vercel access token)
   ↓
POST to broker /deploy/{provider}/prepare  ← ticket id returned
   ↓
GET broker /deploy/{provider}/start  ← redirects to /build
   ↓
Broker runs (in memory, ~90s):
   - git clone hatch-astro-starter
   - writes .env from ticket creds
   - npm install --prefer-offline
   - HATCH_TARGET={provider} npm run build
   - npx wrangler deploy / vercel deploy --prebuilt
   ↓
Live URL returned to ticket
   ↓
Browser polled /status every 2s — sees "complete"
   ↓
Redirect back to WordPress with ticket id
   ↓
WP redeems ticket via /deploy/redeem → URL stored in hatch_frontend_url
   ↓
Connector tab shows "Connected · live at https://…"
   ↓
Companion theme installs in one click (optional)
   ↓
Done. New posts go live in ≤60s thereafter.
```

## Test Connection — what it actually does (v0.24+)

1. `GET <frontend_url>` (origin only, no path) — must return 2xx/3xx. **This is the source of truth.**
2. If a revalidate webhook URL is also configured: `POST <webhook>?secret=…` is fired. Result is informational, not a hard fail (it's optional in SSR mode).

The JS that calls `/hatch/v1/verify-connection` is now tolerant of non-JSON responses (shows the HTTP status + first 120 chars instead of crashing on `JSON.parse`).

## Security posture

- REST hardening: anonymous `/wp/v2/users` blocked, `/wp/v2/comments` rate-limited on POST.
- XML-RPC: disabled by default.
- Login URL: obfuscation-on-by-default. Role guard. Brute-force lockout.
- User enumeration: blocked.
- App Passwords: 1-click generation, one-time display, secret stored hashed.
- Companion theme: redirects raw frontend visits to the Astro site so wp-admin is the only entry point on the WP domain.

## What's pending (roadmap, end-to-end)

| Version | Status | Scope |
|---|---|---|
| v0.1–v0.23 | ✅ Shipped | See CHANGELOG.md for every release |
| **v0.24** | ✅ Current | Test Connection rewrite, Frontend creds hidden when connected, native Fluent Forms embed, HatchComments theme polish, all Next.js mentions removed, this AUDIT.md |
| v0.25 | 🟡 Next | CPT auto-routing — Astro generates `/[cpt]/[slug]` routes from `/features.cpts` |
| v0.26 | 🔵 | WP→Astro asset CDN proxy (images served from edge) |
| v0.27 | 🔵 | SEO parity audit — RankMath / Yoast schema graph passthrough (Article + Person + BreadcrumbList + FAQ + HowTo + Product) |
| v0.28 | 🔵 | Modular plugin architecture (toggle modules per site) |
| v0.29 | 🔵 | More themes — AstroPaper, AstroWind |
| v0.30 | 🔵 | Header/Footer/Custom Page builder + AI rebuild from design.md body |
| v1.0 | 🔵 | Stable, WP.org listing, docs site, external security audit |

## Where to confirm any of the above

- Latest release: https://github.com/adityaarsharma/hatch/releases/latest
- Live broker: https://hatch.adityaarsharma.com
- Source: https://github.com/adityaarsharma/hatch
- CHANGELOG: [CHANGELOG.md](CHANGELOG.md)
- This doc: [AUDIT.md](AUDIT.md)

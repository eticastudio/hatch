# Hatch v0.5 — end-to-end architecture

Final statement of what Hatch IS after the pivot. Written to be the source
of truth for landing page copy, developer onboarding, and every "what is
Hatch?" conversation.

---

## The one-sentence definition

**Hatch is a WordPress plugin that emits a fast, unhackable Astro
frontend for your existing WordPress content, mountable at any URL path
on your existing marketing site.**

Writers use standard core Gutenberg. Three themes control the visual
language via global tokens. Frontend is static — zero PHP on the public
side, so 95% of WordPress attack vectors literally cannot reach visitors.

---

## Product invariants (never violated, write these down)

1. **Standard Gutenberg only.** 27 core blocks in the inserter allowlist.
   No custom blocks. No page-builder mode. No hatch/* blocks ever again.
2. **Three themes, no marketplace.** Blog / Tech / Docs. Each theme owns
   the visual language for every core block. Not a theme store.
3. **Global tokens are locked.** Colors, spacing, fonts are theme-level.
   Per-block color/padding pickers are disabled via `theme.json`.
4. **Static frontend, always.** Astro emits HTML. No visitor-facing PHP.
   Interactive features (comments, forms, auth) go through signed REST
   endpoints — the origin still runs PHP but the public URL doesn't.
5. **Free plugin as distribution.** POSIMYTH's 500K install base is the
   go-to-market. Everything else (managed hosting, migration service) is
   optional revenue on top.

---

## The three anchor claims (marketing = engineering)

Every claim is backed by a real technical property of the architecture.

### 1. Unhackable
- 95% of WordPress compromises start with a vulnerable/compromised plugin
  ([Patchstack 2026](https://patchstack.com/whitepaper/state-of-wordpress-security-in-2026/))
- Hatch's public frontend has **zero PHP runtime, zero database
  connection, zero plugin execution**. The vector doesn't exist for
  `/blog/*` traffic.
- The WordPress origin still runs PHP for authoring, but it's behind an
  IP allowlist or a subdomain (`admin.yoursite.com`) — not internet-facing
  under the primary domain.

### 2. Uncatchably fast
- Only 44% of WordPress sites pass mobile Core Web Vitals ([corewebvitals.io](https://www.corewebvitals.io/core-web-vitals/wordpress-guide))
- Static HTML served from a CDN (Cloudflare Pages / Vercel / any) hits
  99+ Lighthouse consistently. No PHP render, no DB query, no plugin
  chain, no bloated theme.

### 3. Drop into `/blog` on any site
- WP Engine, Kinsta, and most managed hosts **cannot** serve WordPress
  from a subdirectory alongside another site ([WP Engine docs](https://wpengine.com/support/blog-sub-directory/))
- Hatch's static frontend can be reverse-proxied at any path. Nginx,
  Caddy, Vercel rewrites, or a Cloudflare Worker. See
  [docs/blog-subfolder-mount.md](./docs/blog-subfolder-mount.md).

---

## The three stacks that run

```
┌──────────────────────────────────────────────────────────────────────┐
│  1. WORDPRESS ORIGIN                                                 │
│     (customer's existing WP — Bluehost, VPS, etc.)                   │
│                                                                      │
│   • Standard WordPress admin, editor, database, plugins             │
│   • Hatch plugin installed → adds:                                  │
│     - inserter allowlist (27 core blocks)                           │
│     - REST endpoints under /wp-json/hatch/v1/                       │
│     - webhook trigger on post save → revalidation                   │
│     - integration bridges (Yoast/RankMath/RankReady/Fluent/...)     │
│   • Companion theme (blank) → theme.json locks token controls       │
│                                                                      │
│   Public exposure: OPTIONAL. Best practice: IP-allowlist wp-admin,  │
│   move to admin.yoursite.com, or block via Cloudflare Access.       │
└────────────────────────┬─────────────────────────────────────────────┘
                         │  1a. On post save → webhook to Astro
                         │  1b. On visitor page render → REST fetch
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│  2. ASTRO FRONTEND                                                   │
│     (Vercel / Cloudflare Pages / Netlify / VPS static)               │
│                                                                      │
│   • Astro 6 starter (astro-starter/)                                │
│   • Fetches from Hatch REST at build/request time                   │
│   • Renders 3 themes via CSS token switching                        │
│   • Ships static HTML + CSS + minimal client-side JS (color mode,   │
│     hamburger, mobile drawer)                                       │
│                                                                      │
│   Public URL: THE customer-facing URL. Where visitors land.         │
└────────────────────────┬─────────────────────────────────────────────┘
                         │  2a. Static asset requests → cache at CDN
                         │  2b. Interactive requests (comment POST,
                         │      form submit) → signed REST back to origin
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│  3. HOST / EDGE / DOMAIN                                             │
│     (marketing site + edge routing)                                  │
│                                                                      │
│   • Marketing site keeps serving /                                  │
│   • /blog/* → reverse-proxy or rewrite to Astro frontend            │
│   • Same domain, no subdomain, SEO consolidated                     │
│                                                                      │
│   Nginx, Caddy, Vercel rewrites, or CF Worker — pick your host.     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## What Hatch ships (per stack)

### WordPress plugin (`wp-plugin/`)

**38 PHP classes.** Grouped by concern:

**Frontend behavior (13 classes)** — how the public site behaves once
Hatch is active:
- `class-features.php` — /features REST endpoint (site config, tokens, home settings)
- `class-media-rewriter.php` — routes image URLs through the image proxy
- `class-headless-comments.php` — signed comment REST for the static frontend
- `class-headless-forms.php` — form submissions from Astro → WP
- `class-menus-bridge.php` — WP menus → REST for Astro consumption
- `class-detector.php` — detects installed SEO/forms/turnstile plugins
- `class-seo-bridge.php` — composes head meta from Yoast/RankMath
- `class-rankready-bridge.php` — detects RankReady (composition TODO — see below)
- `class-integrations.php` — /integrations REST for turnstile, comments, etc.
- `class-turnstile-wp.php` — Cloudflare Turnstile on wp-login + comments
- `class-forms-bridge.php` — form plugin detection + REST composition
- `class-acf-bridge.php` — Advanced Custom Fields data through REST
- `class-woocommerce-bridge.php` — Woo product data through REST (alpha)

**Deploy pipeline (7 classes)** — one-click deploy to Vercel/CF/VPS:
- `class-deploy-broker.php` — accepts deploy configs from the admin
- `class-deploy-hooks.php` — fires webhooks on post save for revalidation
- `class-revalidate.php` — /revalidate REST endpoint the Astro side hits
- `class-cloud-heartbeat.php` — periodic HEAD probe on the frontend
- `class-frontend-installer-route.php` — installer wizard REST
- `class-frontend-ssh.php` — VPS SSH deploy path
- `class-frontend-agent.php` — remote-agent handshake for VPS

**Security & hardening (5 classes)** — the "unhackable" story:
- `class-hardening.php` — disable file editor, remove version headers, etc.
- `class-login-hardening.php` — rate-limit, custom slug, 2FA hooks
- `class-security.php` — CSP header, referrer policy, permission policy
- `class-app-password-helper.php` — REST auth for the Astro origin
- `class-credential-store.php` — encrypted at-rest storage of API keys

**Admin / config (6 classes)**:
- `class-options-rest.php` — save admin config from React
- `class-design-loader.php` — parses design.md tokens
- `class-theme-presets.php` — apply Editorial/Terminal/Reference presets
- `class-blocks-allowlist.php` — locks Gutenberg inserter to 27 core blocks
- `class-cpt-scanner.php` — auto-detect custom post types → REST
- `class-diagnostic.php` — WP admin diagnostics tab

**Cross-cutting**:
- `class-rest-api.php` — REST endpoint router
- `class-companion-theme-installer.php` — installs the blank companion theme
- `class-domain-check.php` — canonical origin verification
- `class-connection-status.php` — health probe for the frontend
- `class-cli.php` — WP-CLI commands for automation
- `class-module-loader.php` — plugin bootstrap coordinator
- `class-ai-generator.php` — placeholder (v0.5 pivot: no AI in core)

### Companion theme (`wp-plugin/companion-theme/`)
Blank WordPress theme. Its only jobs:
1. Keep WP happy (WP requires a theme)
2. Ship `theme.json` — the config file that locks Gutenberg token controls
3. Redirect visitors who hit the WP origin directly to the Astro frontend

### Astro starter (`astro-starter/`)

12 page routes. Grouped by function:

**Content**:
- `pages/index.astro` — home (blog listing OR static-page mode)
- `pages/[...slug].astro` — catch-all for pages, CPT, dynamic archives
- `pages/blog/[slug].astro` — single post (canonical, prev/next, related, comments)
- `pages/blog/index.astro` — /blog archive (only when WP Reading assigns a Posts page)

**Taxonomies (3 canonical + 3 legacy proxies)**:
- `pages/category/[slug].astro` — canonical /category/foo/
- `pages/tag/[slug].astro` — canonical /tag/foo/
- `pages/author/[slug].astro` — canonical /author/foo/
- `pages/blog/category/[slug].astro` — legacy /blog/category/foo/ (rewrites)
- `pages/blog/tag/[slug].astro` — legacy /blog/tag/foo/
- `pages/blog/author/[slug].astro` — legacy /blog/author/foo/

**Utility**:
- `pages/404.astro`
- `pages/search.astro`

**5 style files**:
- `styles/global.css` — reset, base, tailwind bridge
- `styles/theme-blog.css` — Editorial (Fraunces + saffron)
- `styles/theme-tech.css` — Terminal (JetBrains Mono + cyan)
- `styles/theme-docs.css` — Reference (Geist + indigo)
- `styles/core-blocks.css` — per-theme visual language for every `.wp-block-*` class

---

## What Gutenberg blocks work (the inserter allowlist)

27 core blocks. Same list a writer sees in the inserter after Hatch is
installed:

**Text (9)** — paragraph, heading, list, list-item, quote, pullquote,
code, preformatted, verse

**Media (6)** — image, gallery, video, audio, cover, embed

**Structure (7)** — columns, column, group, separator, spacer, table, details

**Interactive (2)** — button, buttons

**Utility (2)** — html, file

Everything else (widgets, query loops, template parts, site-editor blocks)
is out of scope for the alpha blog focus and hidden by the allowlist.

Every block gets styled per theme. A `.wp-block-quote` renders as:
- **Blog**: italic serif with 2px saffron left-border, generous margin
- **Tech**: bg-tinted panel with `>` prefix, mono readable
- **Docs**: soft primary-tinted panel that reads as a "Note" callout

Rules live in `astro-starter/src/styles/core-blocks.css`.

---

## Integration state (honest — what works, what's stubbed)

| Plugin | Detection | Head meta bridge | Schema/JSON-LD | Status |
|---|---|---|---|---|
| Yoast SEO | ✅ | ✅ (`/yoast/v1/get_head`) | ✅ (JSON-LD extracted from head) | Works |
| Rank Math | ✅ | ✅ (`/rankmath/v1/getHead`) | ✅ (JSON-LD extracted from head) | Works |
| AIO SEO | ✅ | ❌ | ❌ | Detection only — composition needed |
| SEOPress | ❌ | ❌ | ❌ | Not detected. Low priority. |
| **RankReady** | ✅ | ❌ | ❌ | **Detection only. AEO/Speakable composition is the gap.** |
| Fluent Forms | ✅ | n/a | n/a | Detection + REST |
| ACF | ✅ | n/a | n/a | Full REST bridge |
| WooCommerce | ✅ | n/a | n/a | Product data (alpha) |
| Cloudflare Turnstile | ✅ | n/a | n/a | Full anti-spam integration |
| FluentCRM / newsletter | ❌ | n/a | n/a | Not shipped. |

### RankReady gap (be honest)

`class-rankready-bridge.php` currently only detects if RankReady is
installed. The comment in that file explicitly names the intended feature:
*"the seo-head bridge can compose RankReady-managed Speakable + AEO schema
into the headless response"* — but the actual composition code isn't
written. This is a real gap in the current "AEO with RankReady" pitch.

**What needs to ship to close it:**
1. Fetch RankReady's per-post AEO schema via its REST endpoint (need to
   confirm RankReady exposes one)
2. Merge into `/hatch/v1/schema/{url}` response alongside Yoast/RankMath output
3. Astro `HatchSchema.astro` component picks up the merged JSON-LD
4. Confirm LLMs.txt endpoint is served at the frontend origin

This is a **4-8 hour build** on top of the existing seo-bridge shape.
Don't market AEO/RankReady as ready until it lands.

---

## Deploy flow (post-save to live URL)

```
1. Editor saves a post in wp-admin
       │
2.     ▼  transition_post_status hook
   Hatch fires POST to Astro's /api/revalidate
   with signed X-Hatch-Secret header
       │
3.     ▼  Astro server (Vercel/CF Workers/Node)
   Revalidation endpoint clears in-memory features cache
   AND (on Vercel/CF) triggers on-demand revalidation for
   the specific post URL and archives that contain it
       │
4.     ▼  ~60 seconds max
   Next visitor to /blog/that-post/ gets fresh HTML
```

Fully signed, replay-safe (secret rotated per install), fails soft
(if revalidation fails, next natural cache expiration triggers rebuild).

---

## What Hatch is NOT (write it down)

Repeated here so it's part of the architecture doc, not just marketing:

- ❌ Not a page builder
- ❌ Not a block library
- ❌ Not a theme marketplace
- ❌ Not a hosted SaaS (self-hosted plugin, optional managed migration service)
- ❌ Not a "headless CMS" — that's the plumbing, not the product
- ❌ Not competing with Elementor / Divi / Bricks / Kadence
- ❌ Not PhantomWP (they are dev-first browser IDE, code as UI)
- ❌ Not SuperBlog (they replace WordPress)
- ❌ Not Ghost (they replace WordPress + charge)
- ❌ Not Frontity (dead)

---

## Roadmap (in priority order)

**Ship in v0.5.x (this cycle):**
1. **RankReady AEO composition** — close the gap above. Enables the
   AI SEO pitch.
2. **`/blog` subfolder deploy button** — one-click config generation
   for the 3 host types in [docs/blog-subfolder-mount.md](./docs/blog-subfolder-mount.md).
3. **Web Vitals dashboard in wp-admin** — real user metrics from Chrome
   UX Report API + Astro's client-side RUM. Screenshot fodder for landing.
4. **RankReady + Turnstile bundle** — pre-configured one-click activation
   when both are installed.

**Ship in v0.6:**
5. Managed migration service tooling (JWT visitor auth, signed writes)
6. Compatibility badges (Astra, GeneratePress, Kadence proven working)
7. Deploy button OAuth to Vercel + Cloudflare (no CLI, no Git)

**Explicitly not on the roadmap:**
- Custom blocks (ever)
- Themes 4+ (three is enough)
- Site editor / FSE integration (out of alpha scope)
- Membership plugins (Woo alpha is the ceiling for e-commerce)

---

## How this compares to the field

| Product | Their model | What Hatch does that they don't |
|---|---|---|
| SuperBlog | Hosted SaaS, replaces WordPress ($29–$99/mo) | Keeps WordPress. Free. Any theme. Any plugins. |
| PhantomWP | Dev-first browser IDE ($149–$399/yr) | No code required. WP admin is the workflow. |
| WPGraphQL + Faust | Developer stack (free + WP Engine hosting) | No GraphQL. No Node config. Non-devs can use it. |
| Ghost | Separate CMS (self-host or $18–$199/mo) | No migration. Keep WP data. |
| Elementor | Page builder ($59–$399/yr) | Not a page builder. Standard Gutenberg only. |
| Strattic (dead) | Managed static WP ($20–$80/mo) | Free plugin. Not tied to one host. |
| Shifter | Managed static WP ($40–$200/mo) | Free plugin. Not tied to one host. |

---

## Bottom line

**Hatch v0.5 is a WordPress plugin + Astro starter that turns any WP
site into a static, unhackable, Lighthouse-99 frontend served at any URL
path on the customer's existing domain. Writers keep Gutenberg. Themes
control the visual language. Global tokens are locked. No page builder,
no block library, no design marketplace. Free plugin. Optional migration
service on top. That's it.**

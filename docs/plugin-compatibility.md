# Plugin compatibility — what works in headless WordPress with Hatch

> **TL;DR:** ~70% of plugins work. The ones that don't aren't broken — they're solving WordPress-frontend problems that Hatch + Astro handle differently. WP 7.0 Abilities API doesn't change this; it formalizes the data-layer surface but doesn't move rendering-layer plugins into REST.

## The 4 buckets

### ✅ Works out of the box

Plugin registers data via standard WP APIs with `show_in_rest => true` OR exposes its own REST namespace. The headless frontend can fetch it directly.

| Plugin | Why it works |
|---|---|
| **ACF / ACF Pro** | Fields exposed via REST + `acf` key on `/wp/v2/posts` |
| **CPT UI / Pods / MetaBox** | Standard CPT registration → auto-appears in `/hatch/v1/features.cpts` |
| **Yoast SEO** | Native `/yoast/v1/get_head` endpoint — Hatch SEO bridge proxies it |
| **Rank Math** | Native `/rankmath/v1/getHead` — Hatch proxies it |
| **SEOPress / AIOSEO** | Hatch auto-detects + proxies head |
| **Fluent Forms** | Hatch embeds shortcode via `/hatch/v1/forms/{id}/embed` |
| **WPForms** | Same — auto-detected, shortcode embedded |
| **FluentCRM** | List-subscribe via its `createOrUpdate` API |
| **WooCommerce** | `/wc/v3/*` REST — Hatch ships read-only bridge |
| **Polylang / WPML** | REST-aware, language metadata flows through |
| **Custom Post Type Permalinks** | Affects routing, Hatch reads slugs |

### 🟡 Works with a small bridge (Hatch already builds these)

The plugin has data but doesn't expose it cleanly. Hatch writes a thin adapter.

| Bridge | What it does | Shipped |
|---|---|---|
| `class-seo-bridge.php` | Proxies SEO plugin `getHead` | ✅ |
| `class-block-serializer.php` | Converts Gutenberg blocks to clean JSON | ✅ |
| `class-headless-comments.php` | Native comments + Turnstile via REST | ✅ |
| `class-headless-forms.php` | Embed Fluent / WPForms / Gravity shortcode + scripts | ✅ |
| `class-woocommerce-bridge.php` | Read-only product/variation API | ✅ |
| `class-acf-bridge.php` | ACF fields surface clean | ✅ |
| Menus passthrough (`/hatch/v1/menus`) | Expose `wp_get_nav_menu_items()` | 🟡 v0.27 |

### 🔴 Cannot work in headless — and don't need to

These plugins do their job by hooking into `wp_head` / `wp_footer` / `the_content` and rendering HTML inline. Nobody ever visits that rendered HTML in headless — visitors hit the Astro frontend instead. Don't try to bridge them.

| Plugin type | Why it can't bridge | What replaces it |
|---|---|---|
| **Caching plugins** (WP Rocket, LiteSpeed, W3TC) | They cache HTML output that nobody fetches | Hatch 60s edge cache |
| **CDN plugins** (Cloudflare for WP, BunnyCDN) | Rewrite URLs in `the_content` at render time | Hatch deploys to Cloudflare Workers natively |
| **Lazy-load / image optimizer plugins** | Inject loading attributes at render time | Astro `<Image>` + responsive sizes built-in |
| **Popup / optin plugins** (OptinMonster, Popup Maker) | Inject JS that hooks into page load | Build an Astro-native popup or skip |
| **Slider plugins** (Slider Revolution, Smart Slider) | Render `<script>`-driven sliders inline | Use a vanilla CSS slider or an Astro component |
| **Performance plugins** (Autoptimize, WP-Optimize) | Minify/combine assets served by WP | Astro build pipeline already optimal |
| **Font manager plugins** | Enqueue fonts via `wp_head` | `design.md` `font_*` keys |
| **Page builder dynamic widgets** (Elementor live post grid, Divi modules) | Render PHP at request time | Astro components fetch from REST |
| **Cookie consent plugins** | Inject banner JS into rendered page | Add an Astro component or use a CMP service |
| **Comments-style plugins** (Disqus, Commento) | Replace WP comments | Hatch native comments + Turnstile |

### ⚠️ Works but needs config awareness

Auth- or session-bound plugins. The data is in REST, but the access flow needs care.

| Plugin | Caveat |
|---|---|
| **MemberPress / Restrict Content / Paid Memberships Pro** | Members-only content needs cookie/JWT passthrough from the Astro frontend |
| **LearnDash / LifterLMS / Sensei** | Lesson access + progress tracking needs auth proxying |
| **WooCommerce checkout** | Cart is session-bound. Products yes, checkout flow needs Snipcart / Stripe Checkout / Shopify Hydrogen instead |
| **Subscriptions / membership tiers** | Same — auth model needs explicit design |
| **bbPress / BuddyPress** | Heavy frontend dependence. Headless support is limited. |

## The 30-second compatibility test

Before installing a plugin on a headless WordPress site, run this check:

1. **Open the plugin's docs.** Search for "REST API". If documented → ✅ likely works.
2. **`grep -r 'register_rest_route\|show_in_rest' <plugin-dir>`**:
   - Many matches → ✅ data-layer plugin, works.
   - Zero matches but only `add_filter('the_content'…)` / `wp_head` hooks → 🔴 rendering plugin, won't work.
3. **Does the plugin enqueue frontend JS via `wp_enqueue_script`?**
   - If the JS isn't critical (analytics, lazy-load, popups) → 🔴 skip the plugin
   - If the JS IS critical (form validators, AJAX search) → 🟡 needs the asset endpoint pattern from Hatch's `/forms/{id}/embed`
4. **Does it use `admin-ajax.php`?** Plenty of older plugins do. Works in headless only if CORS is allowed + the frontend hardcodes the WP URL.

## What this means for Hatch's scope

Hatch's job is to:

1. **Bridge data-layer plugins cleanly** (SEO, Forms, Comments, Menus, Blocks, ACF, Woo products) — that's where most plugin ecosystem value lives.
2. **Make rendering-layer plugins unnecessary** — Astro + Tailwind + design.md + edge cache replace caching plugins, popup plugins, slider plugins, font managers, performance plugins.
3. **NOT try to support every plugin.** A rendering-layer plugin that can't bridge isn't a Hatch bug — it's an architectural mismatch. We tell the user "you don't need this anymore" and move on.

The Integrations tab is the user-facing version of this triage: when a popular plugin is detected, Hatch knows how to use it; when it's not, Hatch falls back to a built-in equivalent or marks the plugin as "WP-only".

## Common questions

**"Does Elementor work?"**
The static HTML Elementor outputs into `post_content` survives and renders fine via the block serializer. Elementor's dynamic widgets (live post grid, theme builder, popups) don't reach the headless side. If you mostly use Elementor for layout and not for dynamic functionality, you're fine. If you rely on Elementor's pop-ups and post grids, switch to Astro components.

**"What about LearnDash?"**
Course catalog (REST data) works. Enrollment + lesson access + progress tracking need a careful auth design — Hatch doesn't ship this. Wait for v1.5+ or build the auth proxy yourself.

**"Will WooCommerce work?"**
Read-only product display works today (Hatch ships the bridge). Cart + checkout don't — they're session-bound. Use Snipcart / Stripe Checkout / Shopify Hydrogen if you need real commerce on a headless site.

**"What about WordPress 7.0 Abilities API?"**
Doesn't change anything here. The Abilities API standardizes how plugins expose abilities to AI agents (think MCP-style). A plugin that's only a rendering plugin doesn't gain headless compatibility just because it now registers an Ability — its work still happens at PHP-render time, which headless skips.

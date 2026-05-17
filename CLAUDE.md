# Hatch — CLAUDE.md

> Auto-loaded by Claude Code when working in `~/Claude/products/Hatch/`.
> Read this entire file before touching anything. These rules are final.

---

## Identity & Vision

**Hatch** is an open-source headless WordPress engine. Two pieces that work together:

```
WordPress companion plugin  →  hardens, bridges, exposes clean REST API
Astro frontend starter      →  scaffolded via `npm create hatch@latest`, theme-swappable
```

**Hatch is NOT a Claude Code plugin.** It is a standalone WP plugin + Astro starter. There is no `claude-plugin/`, `modules/`, `themes/`, `packages/`, or `marketing/` directory in this repo as of v0.6 — those were legacy scaffolds from the v0.1 plan that got cleaned out. Don't recreate them.

**Elevator pitch:** You have WordPress. You want a fast, secure, modern frontend. Hatch wires them together in one afternoon — no GraphQL, no vendor lock-in, no PhD required.

**Brand:** Aditya Sharma personal brand. NOT POSIMYTH. The only POSIMYTH crossover allowed is RankReady (explicitly approved).

**GitHub:** https://github.com/adityaarsharma/hatch
**Local path:** `~/Claude/products/Hatch/`
**Docs:** https://github.com/adityaarsharma/hatch/tree/main/docs
**Consulting:** https://adityaarsharma.com/connect

---

## The Product in One Paragraph

WordPress runs 43% of the web. Most of those sites have performance problems, security problems, and frontend limitations — because they're using page builders and monolithic themes. The headless pattern (WordPress as CMS, modern JS framework as frontend) solves all three. But the setup is hard. Faust.js locks you to WP Engine + WPGraphQL. DIY takes weeks. Hatch is the missing middle: a complete, vendor-neutral kit that any WordPress developer can set up in an afternoon and understand completely.

---

## Locked Decisions — Never Revisit Without Aditya's Explicit Approval

| Decision | Value | Reason |
|---|---|---|
| Product name | **Hatch** | Final |
| **ONE WP plugin** | Blocks + companion features ALL ship inside `wp-plugin/`. Do NOT split blocks into a separate plugin folder/repo. | Hard rule |
| **Three adoption paths** | (A) Claude Code, (B) WP-CLI, (C) Admin wizard. Every feature must be accessible from at least two of three. The plugin works without Claude Code. | Hard rule |
| **In-admin AI assistant** | Planned V1.5. Uses WP 7.0 Abilities API. User brings their own API key. Optional, not required. | Roadmap |
| **Hatch Cloud (hosted)** | Planned V2.5. Managed WP + Astro hosting. Optional, OSS plugin always free. **Won't start until 5,000+ active OSS sites.** | Long-term |
| **Frontend Agent (V0.5 — shipped)** | RunCloud-style HMAC daemon for updating Astro from WP admin. SSH fallback for users who can't install agent. | Shipped |
| **WP on subdomain enforcement** | Plugin detects root-domain WP installs and shows persistent warning + migration guide. | Hard rule |
| **No bash installer for VPS provisioning** | Hatch does NOT provision the user's VPS. User installs WP however they want. Hatch installs as a normal plugin. | Hard rule |
| **No external infrastructure** | Plugin never calls Aditya's servers. Agent install script served from user's own WP install. Zero phone-home. | Hard rule |
| Tagline | "Headless WordPress, Made Easy" | Final |
| Description | "The headless engine for WordPress" | Final |
| License | MIT (WP plugin: GPL-compatible) | Final |
| V1 frontend | **Astro only** | Final |
| V2 frontend | Next.js (do not mention in V1 docs/code) | Final |
| API layer | **WP REST API only** | No GraphQL in V1 or V2 |
| GraphQL | **Never required.** Optional `@hatch/graphql` is a V3 discussion only | Do not mention as a current feature |
| Monetization | Free OSS + paid consulting at /connect | No pricing page, ever |
| Framing | "Claude Code plugin" — NOT "AI-guided", "AI magic", "AI setup" | Hard rule |
| Security scope | Hatch handles it natively. No plugin shopping list. | Hard rule |
| Backups | Out of scope — mention once in docs only | Hard rule |
| Contact URL | `/connect` everywhere | Never `/contact` |
| `@hatch/membership` | V2 wishlist. NOT in V1. | Hard rule |
| RankReady crossover | Approved. Surface in `/hatch-llm-seo` and `@hatch/llm-seo` only. | Hard rule |
| WPGraphQL detection | Do not build a bridge or passthrough endpoint | Dropped permanently |
| WP7 Abilities API | Ship in V0.2.1 — the week WP 7.0 drops (May 20, 2026). One file: `class-abilities.php`. Thin wrapper over existing REST logic. Do NOT block V0.2.0 on this. | Confirmed real |
| Multisite | Not supported in V0.x. Document as known limitation. | Hard rule |

---

## What Competes With Hatch (Know the Landscape)

| Competitor | Problem | Hatch's Answer |
|---|---|---|
| **Faust.js** (WP Engine) | Next.js only, requires WPGraphQL, locked to Atlas hosting | Vendor-neutral, REST, Astro-first |
| **gatsby-source-wordpress** | Requires WPGraphQL, declining community, Netlify-owned | REST-native, no extra plugins needed |
| **DIY REST + Next.js** | Takes weeks, no security guidance, no module ecosystem | Done in an afternoon, batteries included |
| **Frontity** | Dead (2022) | Hatch is the spiritual successor |
| **9d8/next-wordpress-starter** | Next.js only, no WP plugin side, stale | Active, has WP plugin + modules |

Hatch's wedge: **vendor-neutral + Astro-first + guided setup + WP companion plugin + complete module ecosystem**. No competitor has all five.

---

## Architecture — Two pieces, end to end

```
THE WP PLUGIN  (wp-plugin/)  ← SINGLE PLUGIN. Everything WordPress-side ships here.
  ├─ Companion features: REST hardening, plugin detection, SEO/forms bridges,
  │  revalidation webhooks, ACF/CPT health, login hardening, App Password.
  ├─ Bundled Gutenberg blocks: 8 headless-first blocks (Section, Container,
  │  Heading, Paragraph, Button, Image, Hero, Custom Code) with Tailwind output.
  ├─ 14 toggleable frontend features (Features tab): progress bar, TOC,
  │  share sidebar, breadcrumb, related posts, author bio, schema flow, etc.
  ├─ 3 theme slugs (Features tab): blog, tech, docs — frontend reads via REST.
  ├─ Admin Connector: diagnostic + App Password + .env block + hosting docs.
  └─ Security tab: REST hardening, custom login URL, brute force, role guard.

  IMPORTANT: Hatch is ONE plugin. Do NOT split blocks into a separate plugin.

ASTRO STARTER  (astro-starter/)
  → THE frontend. Drop into Cloudflare Pages / Vercel / Netlify / VPS.
  → Reads /wp-json/hatch/v1/features at build time to respect feature toggles.
  → 3 theme variants live inside the starter (selected via env var or build flag).
  → No themes/, modules/, packages/, marketing/, or claude-plugin/ directories
    exist anymore — those were v0.1 scaffolds, removed in v0.6 cleanup.
```

---

## WP Plugin — Current State (v0.8.0) **← truth**

> Shipped May 14, 2026. This supersedes the v0.1 section below (kept as history).

### What v0.8 adds on top of v0.7

| Subsystem | File | What it does |
|---|---|---|
| **Block-to-Astro serializer** | `class-block-serializer.php` | Parses Gutenberg block tree → clean JSON via `/hatch/v1/post/{id}/blocks`. Server-renders dynamic blocks (embeds, query loops). 12-deep recursion guard. |
| **Deploy hooks** | `class-deploy-hooks.php` | Cloudflare Pages / Vercel / generic. URL stored encrypted via `sodium_crypto_secretbox`. Debounced 30s. Fires on `transition_post_status` + `deleted_post`. Ring-buffer of last 50 firings with real HTTP status codes. |
| **Health widget** | `class-health-widget.php` | WP dashboard widget. 4 tiles: Connection / Last deploy / Content / Architecture. Every value real — no vibe-coded "Everything's fine!" placeholders. |
| **WooCommerce bridge** | `class-woocommerce-bridge.php` | **Read-only.** Cart/checkout deliberately out of scope until v0.9+. Endpoints: `/store/products`, `/store/products/{id}`, `/store/products/{id}/variations`, `/store/categories`, `/store/featured`. Fires deploy hooks on product change. |

### Full REST API surface as of v0.8

```
# Diagnostics & SEO
GET    /hatch/v1/info
GET    /hatch/v1/seo-head?url=...
GET    /hatch/v1/redirects
GET    /hatch/v1/forms

# Connection verification (v0.7)
POST   /hatch/v1/agent/heartbeat        ← HMAC-signed, from VPS agent
POST   /hatch/v1/verify-connection      ← webhook ACK test for CF/Vercel
GET    /hatch/v1/connection-status

# Block-to-Astro (v0.7)
GET    /hatch/v1/post/{id}/blocks?context=view|edit

# Deploy hooks (v0.8)
GET    /hatch/v1/deploy/hooks           ← list providers (URLs masked)
POST   /hatch/v1/deploy/hooks           ← save provider hook
DELETE /hatch/v1/deploy/hooks           ← remove provider hook
POST   /hatch/v1/deploy/fire            ← manual test fire
GET    /hatch/v1/deploy/status

# WooCommerce bridge (v0.8)
GET    /hatch/v1/store/products
GET    /hatch/v1/store/products/{id}
GET    /hatch/v1/store/products/{id}/variations
GET    /hatch/v1/store/categories
GET    /hatch/v1/store/featured
```

### Astro starter — Block renderer (v0.7 → live in v0.8)

```
astro-starter/src/
├── lib/blocks.ts                       ← fetchPostBlocks() + types
└── components/blocks/
    ├── BlockRenderer.astro             ← recursive walker
    ├── registry.ts                     ← name → component map
    ├── README.md                       ← contributor docs
    └── core/                           ← 23 native Astro components
        ├── Paragraph, Heading, List, Quote, Pullquote, Code, Preformatted, Verse
        ├── Image, Gallery, Video, Audio, Cover, MediaText
        ├── Group, Columns, Column, Separator, Spacer, Buttons, Button
        └── Details, Embed, Html, Table
```

**Wired into `src/pages/blog/[slug].astro`**: `fetchPostBlocks(post.id)` in parallel with the post fetch; if blocks come back, render through `<BlockRenderer/>`; if not (plugin off, old WP), graceful fallback to `set:html={post.content}`. **The page never breaks.**

### What's still in flight after v0.8

- **Setup wizard step 4 rewrite** — host picker + real env block + theme card click fix (rolled to v0.9 along with OAuth deploy proxy)
- **Cleanup of `hatch.adityaarsharma.com` URLs in docs** (ROADMAP.md, HANDOFF.md, docs/enterprise-readiness.md)

### Guardrails — apply to every PR going forward

1. **No vibe-coded statuses.** Every "Connected / Active / Healthy" claim must be backed by a real check executed in the last N seconds (where N is documented and tested).
2. **GitHub-first URLs only.** Every link in plugin code or docs MUST point to `github.com/adityaarsharma/hatch/...`. **No marketing URLs** (no `pages.cloudflare.com`, `vercel.com`, `runcloud.io`, `coolify.io`, `dokploy.com`). The ONE exception: the real platform deploy URLs (`vercel.com/new/clone?...`, `dash.cloudflare.com/?to=...`) used by the wizard's deploy buttons — those are unavoidable because that's where the user actually deploys. Never `hatch.adityaarsharma.com/*` — that subdomain isn't live and we're not standing it up.
3. **No external Hatch-hosted infrastructure.** Plugin never calls Aditya's servers. No `hatch.deploy` Worker, no telemetry, no phone-home. Everything is the user's own WP + their hosting platform + GitHub. Killed permanently.
4. **Encrypted secrets at rest.** Any user-supplied secret (deploy hook URL, webhook secret, API token) must go through `sodium_crypto_secretbox` with `b64:` fallback only when libsodium is absent.
5. **PHP -l on every changed file** before commit. Zero exceptions.
6. **Permission gates by default.** All admin REST routes must check `manage_options`. Public read routes must check post visibility.
7. **Debounce destructive operations.** Deploy fires, webhook calls, anything network-bound — debounce per-target so bulk edits don't hammer external services.
8. **REST-only.** No GraphQL adapter. Faust is dying; chasing it = chasing a legacy path.
9. **Astro-first.** Next.js is fork-and-go for users who want it, but Hatch ships and docs only Astro. (See Locked Decisions row above.)
10. **README download-link guardrail (HARD RULE).** Every release MUST update the three version-labeled download links in `README.md` to the new version number:
    - The "Download Hatch vX.Y.Z (latest) →" headline link (~line 17)
    - The "hatch.zip — vX.Y.Z (latest)" install-block link (~line 128)
    - The footer "Download vX.Y.Z (latest)" link (~line 395)
    The URLs themselves use `/releases/latest/download/hatch.zip` (auto-resolves), but the **version label** in the link text must match the just-tagged release. The release-process section below repeats this — add it to your release checklist permanently.

---

## Competitive Research (Refreshed May 14, 2026)

Researched via `/last30days` + WebSearch (9 web sources). No competitor bundles all of Hatch's pieces:

| Project | What it is | Gap vs. Hatch |
|---|---|---|
| Faust.js (WP Engine) | Next.js + WPGraphQL | Vendor-pushed, **declining in 2026**, Next-only |
| WPGraphQL | GraphQL endpoint plugin | API layer only — no starter, no UX, no security |
| [Headless REST API Security](https://wordpress.org/plugins/headless-rest-api-security/) | Security plugin | Security only. No starter, no themes, no setup, no verification |
| astro-wordpress-starter | Astro starter | No companion plugin. No setup wizard. |
| astropress | Astro + WP starter | Starter only |
| PhantomWP | "WP → Astro" SaaS | Closed source, hosted, not a plugin |
| next-wp (9d8dev) | Next.js + REST starter | Next-only. No plugin. |
| @astrojs/wordpress | Astro content-layer adapter | Just data fetching |

**Hatch's wedge (the things NOBODY else does in one package):**
1. Paired WP plugin + Astro starter (everyone ships one half)
2. Setup wizard with auto-generated App Password (everyone says "do it manually")
3. Real two-way connection verification (heartbeat + webhook ACK)
4. CMS-on-subdomain enforcer (`class-domain-check.php`) — literally no one else does this
5. Theme system inside the plugin
6. Astro-first while 90% of the market is Next-first (Faust's decline is the opening)
7. MIT, no SaaS lock-in
8. Native Block-to-Astro component map (v0.7) — competitors dump `post.content.rendered` HTML

---

## WP Plugin — Earlier Milestones (history)



**Files:**
```
wp-plugin/
├── hatch.php                        ← bootstrap, version, requires
├── includes/
│   ├── class-detector.php           ← plugin detection (17 plugins)
│   ├── class-security.php           ← REST hardening, xmlrpc, noindex, user enum
│   ├── class-rest-api.php           ← /hatch/v1/* endpoints
│   ├── class-revalidate.php         ← save_post webhook
│   ├── class-seo-bridge.php         ← RankMath + Yoast auto-detect + getHead proxy
│   ├── class-forms-bridge.php       ← WPForms / Fluent / Gravity / CF7
│   └── class-rankready-bridge.php   ← soft-recommends RankReady
└── admin/dashboard.php              ← settings + detection report UI
```

**REST endpoints live:**
- `GET /hatch/v1/info` — full detection report + site metadata
- `GET /hatch/v1/seo-head?url=X` — proxy RankMath/Yoast getHead
- `GET /hatch/v1/redirects` — merged redirects from RankMath/Redirection plugin
- `GET /hatch/v1/forms` — list all forms from detected form plugins
- `POST /hatch/v1/forms/{id}/submit` — submit a form (public, protected by @hatch/shield)
- `GET /hatch/v1/membership/check` — current user membership status

**Security already shipped (V0.1):**
- All `/wp-json/*` → 401 for anonymous users
- `/wp/v2/users` endpoint removed entirely
- XML-RPC disabled
- `?author=N` enumeration blocked
- `<head>` REST link tags stripped
- CMS forced `noindex, nofollow, noarchive, nosnippet`

---

## WP Plugin — V0.2.0 Shipping Plan

**Version bump:** 0.1.0 → 0.2.0

**New files:**
```
includes/
├── class-acf-bridge.php        ← NEW: ACF/SCF/Meta Box field group REST checker
├── class-cpt-scanner.php       ← NEW: CPT show_in_rest health checker
└── class-login-hardening.php   ← NEW: custom login URL + wp-admin redirect + brute force
```

**Updated files:**
```
includes/class-detector.php     ← ADD: 7 new plugin detections
includes/class-revalidate.php   ← ADD: post type filter (don't fire on every CPT)
admin/dashboard.php             ← REWRITE: tabbed health panel
hatch.php                       ← VERSION BUMP + require new files
```

### V0.2.0 Feature 1: Detector Expansion

Add to `KNOWN` array in `class-detector.php`:
```php
'acf'         => 'advanced-custom-fields/acf.php',
'acf_pro'     => 'advanced-custom-fields-pro/acf.php',
'secure_cf'   => 'secure-custom-fields/secure-custom-fields.php',
'meta_box'    => 'meta-box/meta-box.php',
'pods'        => 'pods/init.php',
'cpt_ui'      => 'custom-post-type-ui/cptui.php',
'jet_engine'  => 'jet-engine/jet-engine.php',
```

Add new detection methods:
```php
public static function get_custom_fields_plugin(): string  // acf_pro > acf > secure_cf > meta_box > pods > none
public static function get_cpt_plugin(): string            // cpt_ui > jet_engine > none
```

Update `report()` to include these.

### V0.2.0 Feature 2: ACF Bridge (`class-acf-bridge.php`)

**What it does:**
- Scans all registered ACF/SCF field groups via `acf_get_field_groups()`
- Checks each for `show_in_rest` flag
- If ANY group is hidden: show orange admin notice linking directly to field groups screen
- REST endpoint: `GET /hatch/v1/acf-status` — returns count of exposed vs hidden groups

**Admin notice copy:**
> "Hatch detected ACF with {N} field group(s) hidden from the REST API. Your headless frontend cannot read these fields. → Enable REST API for field groups"

**Rules for this class:**
- Only runs if ACF or SCF or Meta Box is active (check via Hatch_Detector)
- If ACF not active: class does nothing, no admin notices
- `acf_get_field_groups()` may not exist on all installs — always check with `function_exists()` before calling
- Meta Box has a different API (`rwmb_meta_box_registry`) — handle separately with its own function_exists check

### V0.2.0 Feature 3: CPT Scanner (`class-cpt-scanner.php`)

**What it does:**
- Gets all registered post types via `get_post_types(['public' => true], 'objects')`
- Filters out built-ins: `post`, `page`, `attachment`, `revision`, `nav_menu_item`
- For each remaining CPT: checks `show_in_rest` property
- If ANY CPT has `show_in_rest = false`: show red admin notice listing the offending CPTs
- REST endpoint: `GET /hatch/v1/cpt-health` — returns full scan results

**Admin notice copy:**
> "Hatch detected {N} custom post type(s) not accessible via REST API: '{slug1}', '{slug2}'. Your headless frontend will get 404 errors when querying these. → How to fix"

**Rules for this class:**
- Runs on `admin_init` hook
- Only shows notice if the user hasn't dismissed it (use transient: `hatch_cpt_notice_dismissed`)
- Scan is cached for 5 minutes via transient — don't scan on every page load
- Link in notice goes to a docs anchor, not external site

### V0.2.0 Feature 4: Login Hardening (`class-login-hardening.php`)

**Reference implementation:** WPS Hide Login (2M+ installs). Read it at:
`https://plugins.svn.wordpress.org/wps-hide-login/trunk/classes/plugin.php`

**Approach (copy WPS Hide Login's proven method):**
- `plugins_loaded` hook (priority 9999) — intercept wp-login.php requests before WP processes them
- `wp_loaded` hook — redirect unauthenticated wp-admin access to configured redirect URL
- `site_url` + `wp_redirect` filters — rewrite internal wp-login.php URL references
- Does NOT rename files. Does NOT add rewrite rules. Pure hook interception.

**Required carve-outs (must have, no exceptions):**
```php
&& ! defined('WP_CLI')
&& ! defined('DOING_AJAX')
&& ! defined('DOING_CRON')
&& $pagenow !== 'admin-post.php'
&& $request['path'] !== '/wp-admin/options.php'
```

**Hatch-specific additions (not in WPS Hide Login):**
1. **Role guard** — if user IS logged in but has no editor/admin role, redirect them out of wp-admin. Headless WP has no frontend for subscribers/customers. Allowed roles configurable via setting (default: `administrator, editor, author`).
2. **`wp_die()` instead of theme 404** — CMS in headless has no public theme. Use `wp_die('Not found', 404)` instead of loading the theme's 404 template.

**Settings (stored as WP options):**
```
hatch_login_slug          → custom login path slug (empty = feature disabled)
hatch_login_redirect_slug → redirect destination slug (default: '404')
hatch_brute_force_limit   → max failed attempts (default: 5, min: 3, max: 20)
hatch_brute_force_window  → lockout in minutes (default: 30)
hatch_allowed_admin_roles → comma-separated roles allowed in wp-admin (default: administrator,editor,author)
```

**Forbidden slugs (validate on save):**
- `wp-login`, `wp-admin`, `login`, `admin`, `dashboard`
- Any slug in `$wp->public_query_vars` or `$wp->private_query_vars`
- If slug conflicts: show error, do not save

**Brute-force lockout:**
- Hook: `wp_login_failed` → increment `hatch_bf_{ip_hash}` transient, expire after window
- Hook: `authenticate` (priority 30) → check transient, return `WP_Error` if over limit
- IP: use `$_SERVER['REMOTE_ADDR']` — no fancy forwarded header trust (avoid spoofing)
- Lockout message: generic "Too many attempts" — do not reveal count or window duration

**Only activates if `hatch_login_slug` is set.** If empty, entire class is a no-op.

### V0.2.0 Feature 5: Admin Dashboard Redesign

Replace flat settings page with tabbed panel. Four tabs:

**Tab: Connection**
- Revalidation webhook URL input (existing)
- Webhook secret display (existing, add copy button)
- Application Password setup: inline 3-step guide with links to WP > Users > Application Passwords
- "Test connection" button → POST to webhook URL → show response code

**Tab: Health**
```
✅  REST API hardened
✅  XML-RPC disabled
✅  CMS set to noindex
✅  SEO: RankMath (getHead active)
✅  12 custom post types — all REST-accessible

⚠️  ACF: 3 of 7 field groups hidden from REST API
    → [Fix: Enable REST API in field group settings]

❌  Custom post types: 'portfolio', 'services' not REST-accessible
    → [Fix: How to add show_in_rest]
```

**Tab: Security**
- Block unauthenticated REST (existing toggle)
- Disable XML-RPC (existing toggle)
- Block user enumeration (existing toggle)
- Force noindex (existing toggle, currently missing from UI — ADD IT)
- Custom login URL input (new)
- Redirect target input (new)
- Allowed admin roles (new — comma input)
- Brute-force lockout threshold + window (new)

**Tab: Plugins**
- Full table: all 25 detected plugins, active/inactive status
- Column: "Hatch compatible?" — green for known-good, yellow for needs config, grey for not installed

### V0.2.1 Feature: WordPress Abilities API (`class-abilities.php`)

**Ships the week of May 20, 2026 — when WP 7.0 releases.**

WordPress 7.0 (RC3 as of May 14, 2026, final ships May 20) introduces the Abilities API: a central registry where plugins register named, schema-typed units of functionality. The **WordPress MCP Adapter** then exposes those abilities as MCP tools that Claude Code, Claude Desktop, and Cursor can discover and call directly.

**This is Hatch's actual moat.** Hatch is already a Claude Code plugin. With Abilities registration, Claude Code can introspect and operate the WP backend directly — not just guide the user through setup.

**What gets registered:**

| Ability | Maps to existing method | MCP | REST |
|---|---|---|---|
| `hatch/site-info` | `Hatch_Rest_Api::route_info()` | ✅ authenticated | ✅ |
| `hatch/seo-head` | `Hatch_Seo_Bridge::get_head()` | ✅ authenticated | ✅ |
| `hatch/redirects` | `Hatch_Rest_Api::route_redirects()` | ✅ authenticated | ✅ |
| `hatch/forms-list` | `Hatch_Forms_Bridge::list_forms()` | ✅ authenticated | ✅ |
| `hatch/cpt-health` | `Hatch_Cpt_Scanner::scan()` | ✅ authenticated | ✅ |
| `hatch/acf-status` | `Hatch_Acf_Bridge::get_field_group_status()` | ✅ authenticated | ✅ |
| `hatch/revalidate` | `Hatch_Revalidate::trigger()` | ⚠️ write, authenticated | ✅ |

**Rules for `class-abilities.php`:**
- Hook: `wp_abilities_api_init`
- Always guard with `function_exists('wp_register_ability')` — graceful no-op on WP < 6.9
- `permission_callback`: `current_user_can('manage_options')` for all abilities
- `mcp => ['public' => false]` on all — authenticated Application Password only
- `show_in_rest => true` on all — `/wp-json/wp-abilities/v1/` available
- execute_callback: call the SAME static method the REST endpoint uses — no duplicated logic
- Do not add new business logic here — this is a registration wrapper only

**Do NOT implement before May 20.** Docs are not final until WP 7.0 ships. Test against RC3 locally if needed but wait for stable before committing.

---

### V0.2.0 Feature 6: Revalidate Post Type Filter

Current `class-revalidate.php` fires on every `save_post`. On a site with 10 CPTs, this is a webhook storm on every nav menu save, widget save, etc.

Add setting: `hatch_revalidate_post_types` (stored as serialized array, default: `['post', 'page']`).

```php
$allowed = get_option('hatch_revalidate_post_types', ['post', 'page']);
if (! in_array($post->post_type, $allowed, true)) {
    return;
}
```

Also skip: `auto-draft`, `inherit` post statuses.

---

## Plugin Ecosystem Strategy

### ACF / Custom Fields

ACF (6M+ installs) is the most common WP plugin after Jetpack. In headless:
- ACF REST API has been available since ACF 5.11
- Fields appear under `acf: {}` key in standard REST responses
- **It is OFF by default per field group** — users must toggle "Show in REST API"
- Hatch's job: detect, warn, guide. Not bridge.

**Hatch does NOT:**
- Build a custom ACF REST endpoint
- Require `acf-to-rest-api` plugin
- Force WPGraphQL for ACF data

**Hatch does:**
- Detect ACF/SCF/Meta Box active
- Warn if field groups are hidden from REST
- Provide TypeScript type helpers in `@hatch/acf` module (V1 module addition)

### Custom Post Types

CPTs with `show_in_rest: false` are **the #1 silent failure** in headless WordPress. REST returns 404, frontend gets no data, user has no idea why. Hatch's CPT scanner catches this.

### Forms

Already handled. WPForms, Fluent Forms, Gravity Forms, CF7 — all bridged via `class-forms-bridge.php`. Do not add new form plugins without testing.

### SEO

Already handled. RankMath + Yoast auto-detected, `getHead` proxied, URL rewriting to frontend domain. Do not add SEO Simple Pack or other SEO plugins without verifying their REST API.

### Redirects

Already handled. Pulls from Redirection plugin + RankMath's redirections table. Yoast Premium redirects are file-based — document as manual export only.

### Membership

Out of scope for V1. Do not implement. V2 wishlist. The `/hatch/v1/membership/check` endpoint exists as a stub — do not expand it in V1.

### WooCommerce

Out of scope for V1 and V2. `@hatch/woo` is a V3 discussion. Do not add any WooCommerce-specific code to the WP plugin.

### WPGraphQL

Not required. Not recommended. Not integrated. If a user asks, the answer is: "Hatch uses WP REST API. WPGraphQL is a separate tool you can use alongside Hatch but Hatch does not depend on it."

Do not add WPGraphQL detection, endpoints, or bridges.

### Multilingual (WPML / Polylang)

WPML and Polylang are detected in `class-detector.php`. REST API behavior:
- Polylang: `?lang=fr` query param
- WPML: `?lang=fr` or subdirectory depending on config

Document in `docs/` only. No bridge code in V1. V2 wishlist.

---

## Code Standards (WP Plugin)

**Must follow WordPress Coding Standards (WPCS).** Every PHP file must pass `composer phpcs`.

**Class structure:**
```php
defined('ABSPATH') || exit;  // Always first

class Hatch_Whatever {
    private static $instance = null;

    public static function instance(): self {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // hooks only here
    }
}
```

**Hooks:**
- Wire in constructor
- Always use `array($this, 'method')` not closures for hooks (closures can't be removed)
- Use `add_action` / `add_filter` with explicit priority and arg count

**Database:**
- Use `get_option` / `update_option` for settings
- Direct `$wpdb` queries only when no WP API exists — always use `$wpdb->prepare()`
- Cache expensive queries with transients (5 min default)

**Sanitization:**
- `sanitize_text_field()` for text inputs
- `esc_url_raw()` for URLs
- `absint()` for integers
- `rest_sanitize_boolean()` for checkboxes
- `sanitize_title_with_dashes()` for slugs

**Escaping on output:**
- `esc_html()` for text
- `esc_attr()` for HTML attributes
- `esc_url()` for URLs in HTML
- `wp_kses_post()` for HTML content

**i18n:**
- Every user-visible string wrapped in `__('string', 'hatch')` or `esc_html_e('string', 'hatch')`
- Text domain: `hatch` always

**No:**
- `var_dump`, `print_r`, `error_log` in committed code
- `die()` without `wp_die()`
- Hardcoded URLs (use `home_url()`, `admin_url()`, `plugin_dir_url()`)
- Unchecked `$_POST`/`$_GET` access (always sanitize + nonce-verify)
- Direct file includes without `ABSPATH` check

---

## Code Standards (Astro / TypeScript)

**TypeScript strict mode always.** No `any`. No `as unknown as X` casts without a comment explaining why.

**Astro files:**
- Server-only data fetching in frontmatter (`---` block)
- Never import server-only code into client scripts (`<script>` tag)
- Use `Astro.locals` for request-scoped data, not module-level globals

**Module structure (`@hatch/*`):**
- Each module is a standalone npm package
- Export a default function + named types
- Must work with tree-shaking (no side-effect-heavy top-level imports)
- Ship both ESM and CJS if the module is used in Node context (revalidate webhook receiver)

**Error handling:**
- REST fetch failures: log to server console, return empty data with `fallback` flag
- Never crash the Astro build on CMS fetch failure — return empty array with warning

---

## Content / Docs Rules

**Terminology:**

| Use | Never use |
|---|---|
| Claude Code plugin | AI guide / AI-guided / AI magic / AI-powered |
| The headless engine | AI framework / AI-first |
| Guided setup | AI setup |
| `/hatch-init` | AI assistant |
| Modules | AI modules |
| WordPress as CMS | WordPress backend |

**Voice:** Direct, confident, no hype. Write for a developer who has been burned by overcomplex headless setups before. They are skeptical. Earn their trust with specifics.

**Comparisons:**
- Always fair. Never mock competitors directly.
- Faust.js comparison: "requires WPGraphQL and WP Engine hosting" — factual, not editorial.
- Gatsby comparison: "requires WPGraphQL, acquired by Netlify" — factual.

**Docs never say:**
- "Simply" / "Just" / "Easily" (patronizing)
- "Blazing fast" (cliché)
- "Best-in-class" (unverifiable)
- "AI-powered" for anything Hatch does

---

## Release Process

### Before any release:

```bash
# PHP
composer phpcs wp-plugin/

# WordPress i18n
wp i18n make-pot wp-plugin/ wp-plugin/languages/hatch.pot

# TypeScript
tsc --noEmit               # in astro-starter/
tsc --noEmit               # in each modules/* package

# ESLint
eslint astro-starter/src/

# Build test
cd astro-starter && npm run build

# Version bump (all of these must match):
# - wp-plugin/hatch.php → Version: X.Y.Z + define('HATCH_VERSION', 'X.Y.Z')
# - Each package.json in modules/*
# - packages/create-hatch/package.json
# - root package.json
```

### Release checklist:

- [ ] **`HATCH_VERSION` bumped** in `wp-plugin/hatch.php` (both header + define) AND `astro-starter/astro.config.mjs`
- [ ] **README.md version labels updated** — the THREE links labelled "Download Hatch vX.Y.Z" / "hatch.zip — vX.Y.Z" / "Download vX.Y.Z" (guardrail #10). Use `grep -n "v0\." README.md` to find them.
- [ ] CHANGELOG.md updated with release notes
- [ ] CLAUDE.md "Current State (vX.Y.Z)" section refreshed with what shipped
- [ ] ROADMAP.md — moved completed items into "Shipped", reset "Next" to truth
- [ ] `php -l` clean on every changed PHP file
- [ ] Build `hatch.zip` (`cd wp-plugin && zip -rq ../hatch.zip . -x "*.DS_Store" "*/.*" "tests/*" "node_modules/*"`)
- [ ] Git tag: `vX.Y.Z`
- [ ] GitHub release created with `hatch.zip` attached
- [ ] WP.org SVN updated (manual step — `svn commit`) — only relevant once v1.0 is on WP.org
- [ ] docs site updated if any API changes

### Version semantics:

```
0.x.0  — minor feature release (new class, new endpoint, new UI)
0.x.y  — patch / bugfix
1.0.0  — first stable, WP.org listed, production-ready signal
```

---

## What's In Each Version

### V0.1.0 — SHIPPED
- WP plugin: 7 classes, 6 REST endpoints, security hardening, SEO bridge, forms bridge, admin dashboard

### V0.2.0 — IN PROGRESS
- ACF/Meta Box/CPT UI/Pods/JetEngine detection (7 new plugins in detector)
- `class-acf-bridge.php` — ACF field group REST exposure checker
- `class-cpt-scanner.php` — CPT show_in_rest scanner
- `class-login-hardening.php` — custom login URL + wp-admin redirect + role guard + brute force
- Admin dashboard tabbed health panel
- Revalidate post type filter

### V0.5.0 — SECURITY MILESTONE (pre-V1)
- File integrity monitoring (detect unauthorized file changes)
- Activity log (who logged in, what changed, from where)
- 2FA via WebAuthn/passkeys (native, no plugin)

### V1.0.0 — STABLE
- All 14 modules complete and published
- Sprout theme: production-quality
- `npm create hatch` CLI: full guided flow works without Claude Code
- docs/getting-started.md: complete 5-min path
- WP.org plugin listing live

### V2.0.0
- Next.js starter (alongside Astro, not replacing)
- `@hatch/membership` module
- `@hatch/cpt-bridge` and `@hatch/acf` as full modules
- Multilingual (`@hatch/i18n`)
- Native WP comments (`@hatch/comments-native`)
- Live preview

### V3.0.0
- `@hatch/woo` — WooCommerce headless
- WPGraphQL optional integration (not required, not default)

---

## Repo Structure

```
~/Claude/products/Hatch/
├── README.md                    ← public face, SEO-loaded, 21 sections
├── ROADMAP.md                   ← V0.1 → V3
├── ARCHITECTURE.md              ← design doc
├── SECURITY.md                  ← vulnerability disclosure + hardening checklist
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── FUNDING.yml                  ← adityaarsharma.com/connect
├── LICENSE                      ← MIT
├── CLAUDE.md                    ← this file
│
├── wp-plugin/                   ← THE plugin. WP companion + blocks bundled.
│   ├── hatch.php                ← bootstrap
│   ├── readme.txt               ← WP.org listing
│   ├── package.json             ← npm scripts: build, build:tailwind, etc.
│   ├── tailwind.config.js
│   ├── includes/                ← PHP classes (companion + blocks support)
│   │   ├── class-detector.php
│   │   ├── class-security.php
│   │   ├── class-rest-api.php
│   │   ├── class-revalidate.php
│   │   ├── class-seo-bridge.php
│   │   ├── class-forms-bridge.php
│   │   ├── class-rankready-bridge.php
│   │   ├── class-acf-bridge.php
│   │   ├── class-cpt-scanner.php
│   │   ├── class-login-hardening.php
│   │   ├── class-app-password-helper.php
│   │   ├── class-blocks-registry.php
│   │   ├── class-blocks-shared-attributes.php
│   │   ├── class-blocks-custom-code-security.php
│   │   └── class-blocks-tailwind-runtime.php
│   ├── admin/dashboard.php      ← tabbed admin panel
│   ├── blocks-src/              ← source for the 8 bundled blocks
│   │   ├── index.js             ← registers all blocks
│   │   ├── blocks/{section,container,heading,paragraph,button,image,hero,custom-code}/
│   │   ├── components/          ← shared editor controls (responsive, color, typography, spacing)
│   │   ├── utils/               ← class composition helpers
│   │   ├── interactive/         ← <hatch-shadow-code> Web Component
│   │   └── styles/editor.css
│   └── build/                   ← compiled output (created by `npm run build:all`)
│
├── astro-starter/               ← THE frontend. TypeScript, Astro 4+, 3 themes inline.
├── docs/                        ← user-facing markdown (hosting, edge cases, etc.)
├── examples/                    ← reserved for future live demo repos
├── tests/                       ← PHPUnit unit tests + WP stubs
├── composer.json                ← dev deps for PHPUnit/PHPStan/WPCS (Phase 1 ready)
├── phpcs.xml.dist               ← WPCS lint config
├── phpstan.neon.dist            ← static analysis config
├── phpunit.xml.dist             ← test suite config
└── .github/
    ├── FUNDING.yml
    ├── ISSUE_TEMPLATE/
    ├── PULL_REQUEST_TEMPLATE.md
    ├── DISCUSSION_TEMPLATE/
    └── workflows/
        ├── ci.yml               ← PHP -l only (dependency-free, can't false-fail)
        ├── release.yml          ← auto-builds hatch.zip on v* tag push
        └── theme-quality.yml    ← PR-only, fires on themes/astro-starter changes
```

REMOVED in v0.6 cleanup (do not recreate):
- `claude-plugin/` — Hatch is not a Claude Code plugin
- `modules/` — replaced by toggleable Features tab in WP admin
- `themes/` — 5-theme scaffolds replaced by 3 inline starter themes (blog/tech/docs)
- `packages/create-hatch/` — CLI stub never built; future via `npm create hatch`
- `marketing/` — outdated copy referencing legacy Claude positioning

---

## Cross-References

- **Pickle** (`~/Claude/products/Pickle/`) — Claude Code plugin patterns reference
- **RankReady** (`~/Claude/products/RankReady/`) — approved cross-product for LLM SEO
- **SproutOS blog** (server 178.105.17.71, `app/blog/*`) — live Hatch implementation. Only touch `app/blog/*` — never other SproutOS files.

---

## Things That Will Never Be in Hatch

- GraphQL as a requirement
- Vendor lock-in to any hosting provider
- A paid tier or freemium model
- AI-generated content features
- A theme builder or visual editor
- Support for WordPress < 6.0 or PHP < 7.4
- Elementor or page builder integration (headless replaces this)
- WooCommerce in V1 or V2
- Multisite support before V1 stable

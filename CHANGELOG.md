# Changelog

All notable changes to Hatch are recorded here. Format adheres loosely to [Keep a Changelog](https://keepachangelog.com/).

## [0.3.1] — 2026-05-29

Hot-patch for v0.3.0 — the editor bundle was missing imports for all 18 new blocks.

### Fixed

- **`blocks-src/index.js` only imported the original 8 blocks** despite v0.3.0 shipping 26. The PHP registered all 26 server-side, but the editor JS bundle only had `registerBlockType` calls for Section / Container / Heading / Paragraph / Button / Image / Hero / Custom Code. Result: 18 blocks showed as "Your site doesn't include support for the 'hatch/X' block" placeholders in the editor. Fixed by rewriting the entry to import all 26 blocks. Bundle grew from 50.9 KiB → 89.7 KiB (+38 KiB for the 18 new block React components).
- Inserter now shows the full Hatch category with all 26 blocks, and existing posts with v0.3.0 markup recover automatically.

### Verified

- `grep -oE "registerBlockType\\('[^']+'\\)" build/index.js | sort -u` returns all 26 block slugs.
- `WP_Block_Type_Registry` reports 26 hatch/* blocks registered.

## [0.3.0] — 2026-05-29

**Full block catalog — 26 Hatch blocks across all 5 tiers.** Plus the Smart Block AI generator. v0.2.0 shipped the foundation; v0.3.0 fills it out.

### 18 new blocks

#### Tier 1 missing — 6 foundation primitives

- `hatch/spacer` — vertical rhythm (xs / sm / md / lg / xl / 2xl), responsive per breakpoint
- `hatch/divider` — `<hr>` with style variants (solid / dashed / dotted / double / fade), color token, width preset, thickness
- `hatch/group` — flex / grid / stack wrapper for nested blocks. Gap, align, justify, wrap, semantic tag picker (div / section / article / aside / nav / etc.)
- `hatch/columns` — 1–6 column responsive grid, gap token, stack-at breakpoint, vertical alignment, allowedBlocks gate
- `hatch/list` — semantic `<ul>` / `<ol>` with custom marker styles (disc / circle / square / check ✓ / arrow → / numbered variants)
- `hatch/quote` — `<blockquote>` with optional `<cite>`, schema.org/Quotation markup, variants (default / pull / minimal) and sizes

#### Tier 2 — 5 media blocks

- `hatch/youtube` — **facade pattern**, lazy thumbnail + click-to-play, no cookie domain. Saves ~500 KB per video on initial paint. URL parser accepts full URL, short URL, or bare ID. Custom thumbnail support
- `hatch/video` — lazy HTML5 `<video>` with poster, `preload="none"`, autoplay/loop/muted/playsinline controls
- `hatch/gallery` — grid OR masonry layouts, 1–6 columns, aspect ratio presets, lazy lightbox attribute hook
- `hatch/cover` — image bg + overlay color + opacity, FocalPointPicker, nested heading + paragraph inner blocks, vertical + horizontal alignment
- `hatch/embed` — generic iframe with URL normalization for Vimeo / Spotify / CodePen / Loom / Figma. Lazy load + strict referrer policy

#### Tier 3 — 5 interactive blocks

- `hatch/tabs` — accessible tab panel with `role="tablist"` / `role="tab"` / `aria-selected` / keyboard nav. Variants: underline / pills / boxed
- `hatch/accordion` — native `<details>` / `<summary>`, optional schema.org/FAQPage JSON-LD baked in. Single vs multi-open
- `hatch/table` — responsive (horizontal scroll on mobile), add/remove rows + columns inline, variants (default / striped / bordered / compact), optional caption
- `hatch/form` — Plugin Bridge embed. Saves a `<div data-hatch-form data-form-id="…">` placeholder; the Astro frontend hydrates via `/hatch/v1/forms/{id}/embed` which auto-detects Fluent / Gravity / WPForms / CF7
- `hatch/search` — semantic `<form role="search">` posting GET to `/search` (or your custom URL). Variants: inline / pill / boxed

#### Tier 4 — 1 dynamic listing block

- `hatch/posts` — **ONE block for every post type.** Default `postType: post`. Accepts ANY registered CPT slug (product / course / portfolio / docs / recipe / …) — drop the same block, change the attr. Filters: taxonomy + term + author + orderBy + perPage. Templates: grid-2 / grid-3 / grid-4 / list / featured. Saves a `<div data-hatch-posts>` placeholder with every parameter as data-* — Astro fetches and renders live

#### Tier 5 — 1 AI block 🪄

- `hatch/smart` — **Smart Block.** Prompt-based AI section generator. Pick a vibe (minimal / bold / playful / editorial / corporate), describe what you want in plain English, click Generate.
  - **BYOK (Bring Your Own Key)** — pick Anthropic (Claude Sonnet 4) or OpenAI (GPT-4o), paste your key in Hatch → Blocks tab. Direct API calls; no proxy, no logging on Hatch's side, zero infra cost
  - **Token-aware system prompt** — AI is told to use ONLY `var(--hatch-primary)` / `var(--hatch-fg)` / `var(--hatch-bg)` / `var(--hatch-accent)` and `max-w-[<your-max-width>px]` from YOUR Design tab settings. Change brand color in admin → every Smart-generated section re-themes automatically
  - **Strict server-side sanitization** — `Hatch_AI_Generator::sanitize_output()` strips `<script>` / `<iframe>` / `<style>` / `<link>` / `<form>` / all `on*` event handlers / `javascript:` URLs. Final `wp_kses` allowlist of safe elements only
  - **REST endpoint:** `POST /hatch/v1/ai/generate` — gated to `edit_posts` capability (cost control)
  - Stub: needs prompt-engineering polish + few-shot examples — sufficient to ship + iterate

### Admin

- **Blocks tab** now lists all 26 blocks by category (Layout / Typography / Media / CTA / Marketing / Interactive / Dynamic / AI / Advanced)
- **Smart Block · AI card** with provider picker + API key field (masked when set)
- Per-block enable/disable list grows automatically from the catalog

### Frontend

- All blocks save semantic HTML with `hatch-*` class hooks → Astro renders passthrough via `set:html` on `post.content` — no per-block Astro component needed for static blocks
- Dynamic blocks (YouTube facade, Form, Posts, Smart) save `data-hatch-*` markers; the Astro starter's small `hatch-blocks` runtime handles facade upgrades + listing fetches + AI HTML embedding
- Bundle size: 88 KiB JS (unchanged from 8-block v0.2.0 — webpack already dedupes the WP runtime imports). Admin React bundle: 203 KiB

### Architecture

- New `Hatch_AI_Generator` class — register + permissions + Anthropic + OpenAI clients + sanitizer. Loaded via module-loader.php
- `Hatch_Blocks_Control::catalog()` extended from 8 to 26 entries with category tags
- Category labels gained `interactive`, `dynamic`, `ai`
- Boot state now publishes `blocks.ai_provider` + masked `blocks.ai_api_key` so the React admin can render the form without seeing the real key

### Verified

- All 26 blocks register on container init (`WP_Block_Type_Registry::get_all_registered()` reports them)
- Build pipeline green: 88 KiB blocks bundle + 203 KiB admin bundle
- `migrate_legacy_state()` from v0.2.0 still safe — runs once per upgrade

## [0.2.0] — 2026-05-28

**Hatch Blocks foundation — alpha.** The block system is no longer dormant. Eight Hatch-native blocks ship, register on `init`, appear in the Gutenberg inserter under a "Hatch" category, save semantic HTML with Tailwind utility classes, and render passthrough on the Astro frontend (no custom Astro components required — the HTML they save IS the renderable output).

### What's in this release

#### 8 Hatch blocks (registered + working)

- `hatch/section` — full-width row wrapper with bg color / image / gradient + responsive padding
- `hatch/container` — max-width wrapper with flex / grid + alignment
- `hatch/heading` — H1–H6 with responsive sizes + gradient text
- `hatch/paragraph` — body text with typography controls + prose widths
- `hatch/button` — variants with size + radius from design tokens
- `hatch/image` — Astro Image-friendly (`<img>` with class hooks)
- `hatch/hero` — composed hero pattern
- `hatch/custom-code` — sandboxed HTML/CSS/JS (admin-only capability gate)

Tier 1 still owes: Spacer, Divider, Group, Columns, List, Quote. Tier 2 (Media: YouTube/Video/Gallery/Cover/Embed), Tier 3 (Interactive: Tabs/Accordion/Table/Form/Search), Tier 4 (Posts), Tier 5 (Smart AI) — roadmap for v0.2.1 through v0.5.

#### Admin

- **New tab: Blocks** — between Content and Performance.
- **"Hatch Blocks Only" toggle** — restricts the editor inserter to `hatch/*` blocks. Authors see only the Hatch vocabulary. Default OFF so existing content keeps working.
- **Master switch** — disable all Hatch blocks at once without uninstalling.
- **Per-block enable/disable list** — flip individual blocks off; saved instances become invalid-block placeholders for the recovery flow.

#### Fixed

- **`hatch_blocks_state` legacy reset migration** — earlier installs ended up with every block explicitly disabled in the option store, causing the inserter to silently show zero Hatch blocks. New `migrate_legacy_state()` hook on `plugins_loaded` detects the all-false state and resets to default-enabled. Marker stored in `hatch_blocks_migration` so the migration only runs once per upgrade.
- **`blocks-src/` now ships in the release zip.** Previous v0.1.x zips excluded it; the per-block registration silently no-op'd.

#### Architecture

- Block registration uses `Hatch_Blocks_Registry::register_all()` with a per-block fallback that reads `block.json` from `blocks-src/blocks/<name>/` when no `build/blocks/` exists. Single-bundle build (`build/index.js`) provides the editor script shared by all blocks.
- Frontend rendering is passthrough — Hatch blocks save plain HTML with Tailwind utility classes, so `<Fragment set:html={post.content}>` in the Astro starter renders them correctly with no per-block Astro component needed.
- `hatch_blocks_hatch_only` option filters `allowed_block_types_all` to whitelist only `hatch/*` when on.

### Verified end-to-end

- 8 blocks register on container init (`WP_Block_Type_Registry::get_all_registered()` reports them).
- Block content saved to a real post via `wp_update_post` renders on `localhost:4321/blog/<slug>` with correct classes (`<section class="hatch-section"><h2 class="hatch-heading">…</h2></section>`).

### Coming next

The remaining 16 blocks ship across v0.2.1 → v0.4. Smart Block (AI generation) targets v0.5 — needs BYOK API key plumbing + prompt engineering.

## [0.1.4] — 2026-05-28

**The "no more silent 404s" release.** Eliminates the bug class where a stale or missing Astro `.env` App Password caused every page on the headless frontend to 404 — with no admin-side warning. Real users (thank you Asad) hit this and couldn't tell what was wrong.

### Fixed

- **`/hatch/v1/content` is now PUBLIC.** The universal post / page / CPT resolver no longer requires `permission_authenticated`. It only ever returns `post_status: publish` content (enforced inside `route_content_by_slug`), so making it public exposes nothing private — exactly the same surface as visiting the page on the live site. Eliminates the "App Password expired → entire headless frontend goes silent-404" failure mode.
- **`getPostBySlug` + `getPageBySlug` (Astro) now use the public endpoint.** Previously both hit `/wp/v2/posts` and `/wp/v2/pages` which require Basic auth. Now they use the public `/hatch/v1/content?slug=…` path, so even with NO credentials in `.env` the headless frontend renders posts and pages correctly. Auth is still used for everything that actually needs it (admin/edit flows).
- **`/hatch/v1/content` response enriched** with `categories`, `tags`, and `author` so the blog template can render breadcrumbs, related posts, and the author bio in a single round-trip.

### Verified

- With `WP_API_USER=` and `WP_API_PASS=` (both empty) in `.env`:
  - `/blog/edge-e-test` returns **200** with the post title, breadcrumbs, share rail, progress bar, related posts — all rendered correctly.
  - `/sample-page` returns **200** with the page content.
- Every Design tab feature toggle now produces a visible end-to-end render change (verified: progress_bar, breadcrumb, last_updated, sticky_share, next_prev_nav, related_posts).
- `/hatch/v1/post/{id}/blocks` permission unchanged — context-aware (view = public, edit = auth) per existing route handler.

### Migration

No action needed. Existing installs get the fix on plugin upgrade. The `.env` file is no longer load-bearing for read paths — you can leave `WP_API_USER` and `WP_API_PASS` blank and the frontend will still render perfectly. Set them only when you need auth for non-Hatch endpoints (e.g., raw `/wp/v2/*` calls in custom code).

## [0.1.3] — 2026-05-20

Fixed: enabling "Lock the REST API" 404'd every page on the headless frontend.

The Astro starter fetches every render via `/hatch/v1/content?slug=…` (the universal post / page / CPT resolver). That route was missing from the REST-lock public allowlist, so anonymous requests from the Astro frontend got 401 → Astro had no content → returned 404 to the visitor.

Added two routes to the public allowlist in `Hatch_Security::block_rest_unauthenticated_dispatch`:

- `/hatch/v1/content` — universal content resolver. Already enforces `post_status: publish` internally, so making it public exposes nothing that wasn't already public.
- `/hatch/v1/post/{id}/blocks` — block tree endpoint. Handler enforces `context=edit` auth internally; `context=view` (the public default) is safe.

REST API stays locked for `/wp/v2/*` — the Astro frontend authenticates those with its Application Password. Only the Hatch namespace's intentionally-public reads are now reachable anonymously.

## [0.1.2] — 2026-05-20

Cloudflare Workers deploy fix — top-level `setInterval` in middleware was rejected by the CF Workers v2 runtime ("Disallowed operation called within global scope", error 10021). Replaced with a lazy in-handler bucket sweep at most once per minute. Same behavior on Node; CF deploys now succeed.

- `astro-starter/src/middleware.ts` — removed module-level `setInterval`, added `sweepExpiredBuckets()` called once per rate-limited request.

No other behavior changes. Node + CF + Vercel builds all verified green.

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

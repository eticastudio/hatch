# Changelog

All notable changes to Hatch are recorded here. Format adheres loosely to [Keep a Changelog](https://keepachangelog.com/).

## [0.36.0] — 2026-05-15

The **"calm by default"** release. Applied interface-design "subtle layering, single signature" principles to the admin.

### Polish
- **Default tab → Connector** (was Features in v0.32–0.35). Status-first matches the headless mental model: "is the bridge up?" is the question users have when they open Hatch.
- **All Save buttons say `Save`**. Previously: "Save theme", "Save and propagate", "Save design.md", "Save integrations", "Save blocks", "Save security settings", "Save URL", "Save features" — eight variations, all gone. One label, used everywhere.
- **Footer in the Astro frontend** now always shows the `🐣 Built by Hatch — Headless WordPress` credit (was feature-flagged with `built_by_hatch`; now permanent, small, dignified, with a subtle hover-bounce on the chick).
- **Favicon fallback** in the Astro frontend — uses WP General Settings → Site Icon when set, falls back to an inline 🐣 SVG so every Hatch site has a visible favicon out of the box.

---

## [0.35.0] — 2026-05-15

The **"stop bloat, no questions"** release. Applied React UI-patterns skill principles to the admin: only show what needs action, never show idle steady-state cards.

### Fixed — Saves failing in Gutenberg ("Could not get a valid response")
Stale `hatch_revalidate_endpoint` was pointing to a dead CF Workers subdomain (`q7xv` while the live frontend is `fphf`). Every post save tried to ping the dead webhook synchronously. Cleared via REST. Not the only cause of the editor message — also commonly an expired nonce after a long-idle browser tab — but eliminates the Hatch side of the problem.

### UX — admin clutter removed
- **"Hatch frontend version" card**: hidden in the steady "in sync" state. Only renders when there's actually a newer plugin version to redeploy for. "Mark as in sync" relabeled to "I already updated" — clearer intent.
- **Image proxy section**: collapsed entire setup into a status row. No more "Use [URL]" button + free-text URL input + same-domain explainer. Just: "On" or "Off". Auto-bound to your frontend URL on activation + on every successful broker deploy.
- **Forms backend dropdown**: removed. Hatch always auto-detects. Just shows a Form ID dropdown when a form plugin exists, an "install Fluent Forms" nudge when none does. No more "Auto-detect / Fluent Forms / WPForms / Gravity / Off" select that users never needed to touch.

### Added — Dashboard widget on `/wp-admin/`
Confirms at a glance: "Hatch is active. This WordPress is running headless — the public site is served by your Astro frontend." Shows live URL, host (Cloudflare/Vercel/VPS), plugin version. Plus "Open Hatch" + "View live site ↗" buttons.

### Added — View Post / Preview always open in a new tab
Headless = wp-admin and the live site are on different domains, so users want to keep wp-admin open while opening previews in a new tab. Filters `page_row_actions` + `post_row_actions` to add `target="_blank"`. Plus an admin footer script that catches the React-rendered View/Preview buttons in the Gutenberg toolbar via MutationObserver.

### Added — Auto-bind image proxy on activation + broker deploy
`register_activation_hook` mirrors `hatch_frontend_url` into `hatch_image_proxy_url` if the proxy is unset. `class-deploy-broker.php` does the same on every successful deploy. The image proxy "just works" — no prompts, no user action.

### Security note
`hatch_security_harden_rest` defaults to **on** (it always has). REST API public-route allowlist (added v0.33) is what makes comments + forms work for visitors despite the harden filter. Re-enabled on this test site after a state drift was observed.

---

## [0.34.0] — 2026-05-15

The **"never zip-upload again"** release. After this install, everything is REST-driveable.

### Added — Remote Hatch control via REST
- `GET /hatch/v1/options` (admin) — whitelisted current values: `hatch_image_proxy_url`, `hatch_revalidate_endpoint`, `hatch_frontend_url`, `hatch_security_*`, `hatch_revalidate_post_types`.
- `POST /hatch/v1/options` (admin) — JSON body of any whitelisted keys, each runs through its sanitize callback. Returns `{ updated: {...}, ignored: [...] }`.
- `GET /hatch/v1/version` (admin) — current vs latest from GitHub releases API. `update_available` boolean.
- `POST /hatch/v1/self-update` (admin) — downloads `https://github.com/adityaarsharma/hatch/raw/main/hatch.zip`, extracts it, replaces files in `HATCH_PLUGIN_DIR` in-place via WP_Filesystem in direct mode. Cleans up the temp dir. New code runs on the next request.

### Carries forward all v0.33 fixes
- Comments 401 fix (public-route allowlist in `class-security.php`)
- Blocks tab removed
- "Hatch Form" mentions removed
- "Hatch frontend version" button sizing fixed

---

## [0.33.0] — 2026-05-15

The **"end-to-end audit fixes"** release. Reproduced bugs against the live test site via curl, fixed each at the source.

### Fixed — CRITICAL: Comments endpoint returned 401 to public visitors
Root cause: `class-security.php` `block_rest_unauthenticated` filter ran on ALL REST routes including the ones Hatch registers with `permission_callback => '__return_true'` (comments, form submissions, WC store). The auth check fired before route dispatch, so the "public" flag was never consulted. Test reproduction: `curl https://pleasantcloth.s6-tastewp.com/wp-json/hatch/v1/comments?post=1` returned `{"code":"hatch_rest_not_logged_in","status":401}`.

Fix: added a public-route allowlist evaluated against the request URI before returning 401:
- `/hatch/v1/comments` (read + submit)
- `/hatch/v1/forms/{id}/submit` + `/hatch/v1/forms/submit`
- `/hatch/v1/agent/heartbeat` (HMAC-signed)
- `/hatch/v1/store/*` (WooCommerce, public by design)

Filter `hatch/is_public_rest_route` available for extending.

### Removed — "Blocks" admin tab
Source blocks live in `wp-plugin/blocks-src/` but `wp-plugin/build/blocks/` is empty (no compiled JS), so the block registry never actually registers Hatch's own Gutenberg blocks. The Blocks tab was showing toggles for blocks that don't exist in the editor. Hidden from the menu and removed from allowed-tabs until/unless the build pipeline ships. Users keep using core Gutenberg blocks (paragraph, heading, image, button, etc.) which Astro renders via the existing `BlockRenderer`.

### Removed — "Hatch Form" block mentions
Forms helper text on Integrations tab no longer references a `<HatchForm />` block (that block doesn't ship). Now reads: "Hatch auto-detects your form plugin. Install Fluent Forms (free, recommended) and the headless frontend will use it automatically."

### Fixed — Connector "Hatch frontend version" UI
- Buttons now uniformly `is-sm` (no more big-vs-small mismatch)
- "Mark as in sync" button only shows when there's actually a version mismatch — hidden in the "everything matches" steady state
- Alignment fixed (center) so the buttons sit on the same baseline

---

## [0.32.0] — 2026-05-15

The **"enterprise hardening"** release. Cleans the admin surface and locks down security defaults.

### Added — Top-level admin menu
Hatch lives at `wp-admin/admin.php?page=hatch` now, with its own egg/chick icon at position 3 (right after Dashboard). Previously buried under Tools — users couldn't find it. All redirects internally updated (`tools.php?page=hatch` → `admin.php?page=hatch`).

### Security — Theme + Plugin File Editor disabled
`DISALLOW_FILE_EDIT` is now set by Hatch on activation. WP's built-in browser file editors are a known privilege-escalation vector — if an admin account is compromised, an attacker can inject PHP into theme/plugin files in seconds. Theme edits belong on a developer's machine via FTP/SSH/Git. The constant is set only if not already defined, so site owners who explicitly want it back can `define( 'DISALLOW_FILE_EDIT', false )` in `wp-config.php`.

### UI — admin clutter removed
- **Hatch Submissions CPT** hidden from the admin menu. The fallback "save submission as CPT" path is rarely used (most sites have Fluent Forms / WPForms). When it IS used, submissions are still in the DB and accessible at `/wp-admin/edit.php?post_type=hatch_submission` directly.
- **"Frontend credentials" card** on the Connector tab hidden by default. The broker writes `WP_API_URL/USER/PASS/HATCH_WEBHOOK_SECRET` into the Astro deployment automatically — users don't need to copy-paste. Card only appears for manual VPS / DIY setups, or one-shot after generating a new App Password.
- **"Advanced: Revalidate webhook URL" card** hidden by default. SSR mode means there's no static build to revalidate — new posts go live via the 60s edge-cache TTL. Gated behind `hatch/show_revalidate_webhook_card` filter for power users.

### Added — Same-domain image proxy (enterprise pattern)
- New `/img.ts` Astro endpoint — proxies image requests to the configured backend (default: Hatch shared broker, override via `HATCH_IMG_BACKEND` env var). Images served from the frontend origin, not a third-party domain.
- `imgSrc()` detects same-domain configuration and emits relative `/img?...` paths instead of full broker URLs.
- WP admin: "Use [frontend-url]" button auto-fills the proxy URL to your own frontend. The frontend then proxies internally to whichever image processor you've configured.

### Notes
- Frontend redeploy needed to get the new `/img` endpoint + updated `imgSrc()` cascade.
- Existing image proxy URLs (broker-pointed) continue to work — just emit cross-origin URLs as before.

---

## [0.31.0] — 2026-05-15

### Fixed — image proxy was built but never wired up
`imgSrc()` helper existed in `features.ts` since v0.26 but no component actually called it. Setting the proxy URL in WP admin did nothing because every `<img>` rendered the raw WP URL. Now wired end-to-end:

- New `<HatchImage>` component — drop-in `<img>` replacement that routes through the proxy when configured (auto WebP/AVIF, resize, retina srcset), falls back to original URL when not. Adds `loading="lazy"` + `decoding="async"` by default.
- New `rewriteContentImages(html, features)` helper — regex-rewrites every `<img>` inside `post.content` / `page.content` so author-uploaded body images get the same WebP/AVIF treatment as featured images. Skips data: URLs and already-proxied URLs (idempotent).
- Updated `PostCard.astro` (3 image instances), `blog/[slug].astro` (hero + content), `[...slug].astro` (page hero + content), `index.astro` (static page hero + content).

### How to activate
WP Admin → Hatch → Connector → Image Proxy → set to `https://hatch.adityaarsharma.com` → Save. Within 60 seconds every image (featured + content) starts serving optimized WebP. No frontend redeploy needed for the URL change — only for the new component code (already in this release).

### WooCommerce checkout — research, not shipped
v0.31 deliberately ships **no** Woo frontend pages. Per the v0.31 plan: research full headless checkout feasibility first, decide depth, then build. Findings + plugin requirements documented in the response thread (no code changes).

---

## [0.30.0] — 2026-05-15

The **"close the headless dynamic gaps"** release. Cleans up the integration story.

### Removed — FluentCRM as a first-class integration
Hatch no longer ships a separate FluentCRM subscribe path. Newsletter signups now flow through Fluent Forms' native CRM connectors (which already handle FluentCRM, Mailchimp, ConvertKit, Brevo, etc.). Cleaner architecture, one fewer special case.
- Stripped `Hatch_Headless_Forms::subscribe_fluentcrm()`
- `Hatch_Integrations::has_fluentcrm()` now returns `false` (deprecated stub kept to avoid fatal errors in any downstream code)
- `has_fluentcrm` / `newsletter_list_id` removed from `/hatch/v1/features` and `/hatch/v1/integrations`
- FluentCRM list dropdown removed from Integrations tab UI

### Added — ACF auto-expose to REST
WordPress hides ACF fields from `/wp/v2/posts` unless every group has `show_in_rest=true`. ACF buries that setting per-group. Headless setups need it on by default. The Integrations tab now shows your hidden ACF group count and exposes them all in one click via `Hatch_Acf_Bridge::expose_all_to_rest()`. Meta Box and Pods get tailored guidance (they need their own UI flow).

### Added — Headless dynamic data card
Integrations tab now leads with a "Headless dynamic data" card showing every dynamic surface Hatch wires up: posts, pages, CPTs, search, RSS, sitemap, comments, menus, schema, WooCommerce. Plus the ACF auto-expose button and a clear "Redirection plugin recommended over RankMath/Yoast redirects" note.

### Locked decision — Redirection plugin is the default
For redirects, Hatch recommends the [Redirection](https://wordpress.org/plugins/redirection/) plugin (purpose-built, free, lightweight) over RankMath's bundled redirect module (works but ships SEO bloat). Yoast Premium redirect imports stay TBD.

---

## [0.29.0] — 2026-05-15

The **"base must be solid"** release. Fills 4 core gaps + ships the 2 most-requested UX features.

### Added — 4 missing core pages
- **`/404`** (`404.astro`) — proper SSR 404 with optional search box (controlled by `design.md not_found_search`) + recent posts recovery list
- **`/rss.xml`** — RSS 2.0 feed from the latest 25 published posts. Was referenced from `<head>` but the endpoint never existed.
- **`/sitemap-index.xml`** — XML sitemap with all posts, pages, and non-empty categories. Was referenced from `<head>` but the endpoint never existed.
- **`/search?q=…`** — full-text search via WP REST `?search=`. Pagination, empty-state, search-from-404 form.
- New `searchPosts(query)` helper in `hatch.ts`.

### Added — Visual Design editor
Design tab gets a point-and-click UI: native color pickers for Primary / Accent / Background / Foreground, dropdown of 30+ curated Google Fonts (sans + serif + mono), radio groups for Color mode / Density / Roundness / Max-width, and a collapsible Page-templates section. Toggle to Code mode for the raw `design.md` textarea. Saves via a new `admin_post_hatch_save_design_visual` action that rebuilds the markdown server-side.

### Added — Frontend version tracker + Update banner
Connector tab gains a "Hatch frontend version" card showing the deployed Astro version vs the installed plugin version. Shows an "Update available" badge + primary CTA when the plugin is newer. The broker stamps `hatch_deployed_frontend_version` on every successful deploy. Plus a "Mark as in sync" button for users on older brokers.

### Notes
- Plugin updates **do not** require a frontend redeploy. Settings, content, design tokens propagate in ~60s via SSR + edge cache.
- Frontend redeploy is **only** needed when Hatch ships new Astro code (CSS variables, components, new themes). The version banner now makes this explicit.

---

## [0.28.0] — 2026-05-15

### Fixed — CRITICAL: image proxy ReferenceError
`img-proxy.js:33` referenced `ALLOWED_IMG_ORIGINS` (undefined) instead of `ALLOWED_ORIGINS`. Crashed on every proxy request. Fixed to reference the declared constant.

### Fixed — CRITICAL: themes not propagating to all Tailwind utilities
`global.css @theme` used static hex values for `--color-hatch-*`, so `bg-hatch-bg`, `text-hatch-fg`, `bg-hatch-bg-2` etc. never reflected theme overrides. Added `:root` block with `--hatch-*` defaults; `@theme` now references `var(--hatch-*)` so ALL utilities follow the active theme.

### Fixed — Tech theme always dark
Tech theme showed white/light in `auto` mode on light-mode systems — identical to Blog theme. Removed `prefers-color-scheme:light` auto override. Tech is now always dark (developer/devblog aesthetic). Use `mode: light` in design.md to explicitly opt into a light Tech variant.

### Fixed — PostCard missing `.post-card` class
Theme CSS (`.post-card { ... }`) applied to nothing. Added `post-card` class to the default archive grid variant anchor element.

### Fixed — Font loading from rsms.me
Replaced `rsms.me/inter/inter.css` with Google Fonts (variable-weight Inter). Google Fonts CDN is more reliable globally and works in strict CSP environments on Cloudflare Workers.

### Fixed — Default admin tab was Connector
Every visit to the Hatch admin page landed on the Connector tab, making it feel like the connection was resetting. Default is now Features. Also fixed: `design` and `integrations` were missing from the allowed-tab list in `hatch_get_current_tab()`.

---

## [0.27.0] — 2026-05-15

### Added — WP Menus passthrough
`GET /hatch/v1/menus` lists all registered nav menu locations + their assigned menu names. `GET /hatch/v1/menus/{location}` returns a flat item array (`id`, `parent`, `order`, `title`, `url`, `target`, `classes`). Internal WP URLs are converted to root-relative paths by the PHP bridge. `getMenus(location)` + `HatchMenuItem` exported from `hatch.ts`. `SiteHeader` and `SiteFooter` now consume WP primary/footer menus; fall back to hardcoded Blog/Home/RSS/Sitemap links when no menu is assigned.

### Fixed — PostCard `showExcerpt` prop
`blog/index.astro` was passing `showExcerpt` to `PostCard` but `PostCard` didn't accept the prop. Added `showExcerpt?: boolean` (default `true`) — when `false`, excerpt is hidden in archive grids (controlled by `archive_excerpt: false` in `design.md`).

---

## [0.26.0] — 2026-05-15

### Added — SEO Schema endpoint
`GET /hatch/v1/schema?url=…` + `HatchSchema.astro`. Pass-through JSON-LD from RankMath/Yoast (`@graph` unwrapped). Fallback: Article + BreadcrumbList from WP post data. Replaces hardcoded `breadcrumbJson` in `[slug].astro`.

### Added — Image proxy (WebP / AVIF via sharp)
Broker `/img` route: fetches WP media, converts to WebP/AVIF, resizes, caches to disk. Plugin Dashboard → Image Proxy card to set broker URL. `imgSrc()` helper in `features.ts`.

### Added — Module loader
`class-module-loader.php` — feature-gated classes only load when their toggle is ON. Reduces PHP memory on minimal installs.

### Added — 3 new themes
AstroPaper (minimal blog), AstroWind (marketing/business), Astro Nano (ultra-minimal writing). All use `--hatch-*` CSS vars + auto light/dark.

### Added — design.md Template Builder
`templates:` section in `design.md` controls archive grid, single-post sidebar/hero/width, and 404 search visibility. Parsed by plugin, exposed in `/features`, consumed by Astro pages.

---

## [0.25.0] — 2026-05-15

The **"backend stays WordPress, everything else moves to the headless site"** release.

### Added — admin permalinks rewrite to the headless site

Companion theme now filters `post_link`, `page_link`, `post_type_link`, `term_link`, `author_link`, and admin-context `home_url` so the **View Post / View Page / View CPT** buttons in wp-admin open the **live headless URL** instead of the WP URL. Mapping:

- Posts → `<frontend>/blog/{slug}`
- Pages → `<frontend>/{slug}`
- CPTs → `<frontend>/{rest_base}/{slug}`
- Categories → `<frontend>/blog/category/{slug}`
- Tags → `<frontend>/blog/tag/{slug}`
- Author archives → `<frontend>/blog/author/{slug}`

Editors hit "View" and land on the actual live page. No more "where is my post?" tab.

### Added — Companion theme splash redesign

`wp-plugin/companion-theme/index.php` rebuilt with the Hatch brand: orange gradient + dotted grid background, dark-mode aware, brand pill, primary **"Visit live site"** CTA pointing at the headless URL (only "WordPress admin" as a secondary link), shows the live URL chip + a "Built on Hatch" foot link. Same shell, much more confidence-inspiring.

### Added — Turnstile on the WordPress side

New `Hatch_Turnstile_WP` module:

- **wp-login.php** — Turnstile widget on login / lost-password / register forms. Verifies on submit via the `authenticate` filter (priority 99, so the native user/password check runs first and Turnstile is the final gate).
- **Classic WP comment form** — Turnstile widget on `wp-comments-post.php`. Verifies via the `preprocess_comment` filter.
- Reuses the same site_key + secret_key from `Tools → Hatch → Integrations`. Enable Turnstile once, protection runs everywhere.
- No-op when Turnstile is disabled.

### Added — editable Frontend URL field on the Connector tab

For the "I added a custom domain on Cloudflare/Vercel today" flow. A new `<details>` block lets you paste your custom domain. Hatch updates the canonical `hatch_frontend_url` option + syncs the revalidate webhook URL to the new origin if it was using the auto-generated workers.dev / vercel.app URL. View links, Companion redirects, and Test Connection all switch to the new domain immediately.

### Changed — `$project_url` source of truth

The dashboard now reads `hatch_frontend_url` first and falls back to `hatch_deploy_project_<provider>.url`. This means a manual custom-domain swap takes effect everywhere with one save.

### Fixed — theme-switch hides comments perception

Defensive `display: block !important` on `.hatch-comments` and `.hatch-embed-form` inside both `theme-tech.css` and `theme-docs.css`. Comments + Embed Forms now provably visible across all three bundled themes (Blog / Tech / Docs). H2 color explicit too, so theme palettes can't bleach the section heading.

### Operational

- New `hatch` SSH alias for `hatchuser@95.216.156.89` saved in `~/.ssh/config` with pubkey auth. `ssh hatch` works passwordless now.
- Plugin version: `0.24.0` → `0.25.0`.



## [0.24.0] — 2026-05-15

The **field-report patch + Astro-first commitment**. Every "this didn't quite work" item from real-world testing fixed in one drop.

### Fixed — Test Connection finally tells the truth

- **Verify is now SSR-aware.** It does `GET <frontend_url>` (origin only) and treats 2xx/3xx as connected. The revalidate webhook ping is still attempted, but its result is informational, not a hard fail. This matches SSR-mode reality (the webhook is opt-in).
- **JS no longer crashes on non-JSON responses.** Old behavior: `JSON.parse` threw `Unexpected token '<', "<!DOCTYPE "...` when the WP REST endpoint returned an HTML error page. New behavior: shows the HTTP status + first 120 chars of the body, so the user gets a readable diagnostic.
- **Disconnect copy softened.** Old: _"Last test webhook failed. Check that your frontend deploys and has the /api/revalidate route."_ New: _"Frontend probe failed. Confirm the deploy is live and reachable, then re-test."_

### Changed — Connector tab UX

- **Frontend credentials card hides itself when a broker deploy has connected.** Those creds were used in-memory during the build window — re-pasting them anywhere serves no purpose. Card still appears when a fresh App Password was just generated (one-shot display) or when no deploy URL is set.
- **All Next.js mentions removed.** Hatch is now consistently **Astro-first** in the plugin description, wizard copy, README, broker landing, and all admin strings. The Astro starter is the bundled, batteries-included default.

### Changed — Forms

- **Bundled `HatchForm.astro` deleted** (the in-house newsletter / contact block from v0.22).
- **New `<HatchEmbedForm />`** renders any supported WordPress form plugin's own shortcode and drops the result into the page. Submissions go through the form plugin's own AJAX — Fluent Forms / WPForms / Gravity features (conditional logic, file uploads, payments, multi-step) all work without a Hatch-side reimplementation.
- **New REST endpoint** `GET /hatch/v1/forms/{id}/embed` server-renders the shortcode and returns `{ html, scripts, styles }`. Astro lazy-loads the assets.
- Programmatic `POST /hatch/v1/forms/submit` still works as a fallback for sites that want a JSON-only flow.

### Changed — Comments polish

- HatchComments narrowed to a 640px reading column.
- Avatar shrunk 40 → 36 px. Body type tightened to 14/1.65.
- Theme tokens applied: radius + body font flow from `design.md`. Tech theme shows comments in a denser shell; Docs theme wraps comments in a quieter card so they don't compete with body copy.

### Added — AUDIT.md

Single source of truth at the repo root: what ships in `hatch.zip`, what ships in the Astro starter, what's static vs dynamic, every REST endpoint, what's pending vs shipped on the roadmap. Updated after every release.

### Operational

- Broker on hetzner (hatch.adityaarsharma.com) pulled to latest main + restarted.
- Plugin version: `0.23.0` → `0.24.0`.



## [0.23.0] — 2026-05-15

The **"your design, your fonts, your theme — declarative"** release.

### Added — Design.md system

A new **Tools → Hatch → Design** admin tab where you paste a single Markdown file describing your brand. Hatch parses the YAML frontmatter, validates every token, exposes them on `GET /hatch/v1/design`, embeds them in `/hatch/v1/features`, and the Astro starter injects them as CSS variables at SSR time. **No AI tokens needed. No rebuild.** Edge cache picks up the change in 60 seconds.

What you can declare in `design.md`:

```yaml
brand:
  name: My Blog
  primary: "#5b21b6"
  accent: "#f59e0b"
  fg: "#0a0a0a"
  bg: "#ffffff"
  font_heading: "Outfit"
  font_body: "Inter"
  font_mono: "JetBrains Mono"
  mode: light | dark | auto
layout:
  density: compact | comfortable | spacious
  rounded: sharp | smooth | extra
  max_width: 720 | 1080 | 1280
voice:
  tone: professional | casual | playful
  pronouns: we | I | you
```

- Bundled example at `wp-plugin/admin/design.example.md`.
- Admin tab shows a live "parsed tokens" preview with color swatches.
- Per-key error messages when a value is rejected (wrong hex, unknown enum).
- Body section below the frontmatter is stored (used later by AI rebuild flows in v0.30+).

### Added — Tech theme (Astro Cactus base)

Devblog aesthetic at `src/styles/theme-tech.css` — inspired by [Astro Cactus](https://github.com/chrismwilliams/astro-theme-cactus) (MIT). Activates automatically when **Features → Theme: Tech** is selected. Dark default with light fallback, mono-accented headings, terminal-style cards, code-block-first prose styling.

### Added — Docs theme (Starlight base)

Documentation aesthetic at `src/styles/theme-docs.css` — inspired by [Starlight](https://starlight.astro.build). Sidebar nav + breadcrumbs + on-page TOC layout. Callout styles (`is-tip`, `is-warn`, `is-error`). Prev/next card row. Activates when **Features → Theme: Docs** is selected.

### Added — Theme dispatcher

`PageLayout.astro` now reads `features.theme` and sets `data-hatch-theme` on `<html>`, plus a `data-hatch-mode` attribute from the design token. All three theme stylesheets are loaded once; CSS scopes the right one based on these attributes. No JS hydration cost.

### Added — Design fonts auto-load

When `design.brand.font_heading` or `font_body` is set, Hatch preconnects to Google Fonts and loads the family with weights `400/500/600/700` and `display=swap`. No manual `<link>` editing.

### Added — Forms guide

A new collapsible **"Which form plugin should I use?"** section inside the Integrations tab clarifies the WPForms vs Fluent Forms vs FluentCRM decision and shows the priority order Hatch uses to route a submission.

### Added — Docker build env for Gutenberg blocks (v0.22b carryover)

- `scripts/blocks-build/Dockerfile` (Node 18 image)
- `scripts/blocks-build/build.sh` wrapper

Unblocks the `wp-scripts@28` build that broke on Node 22 due to webpack/ajv-keywords version drift. Run with `./scripts/blocks-build/build.sh` from the repo root.

### Changed

- Plugin version: `0.22.0` → `0.23.0`.
- `/hatch/v1/features` response gains a `design` key at the top level.
- README updated with v0.23 roadmap entry + design.md flow.



## [0.22.0] — 2026-05-15

The "make it real for end users" release — Integrations, Comments, Forms, and a Companion theme. Items 1, 3, 4, 5, 6 from the v0.22 scope ship in one go. Tech + Docs themes (item 2) deferred to v0.23 since the choice of open-source base theme is a separate scope decision.

### Added — Integrations tab

- **New `Tools → Hatch → Integrations` tab.** Auto-detects Yoast / Rank Math / SEOPress / All in One SEO and shows which one Hatch will use. Lets you force a specific plugin or disable SEO pass-through entirely.
- **Forms backend picker.** Auto-detects Fluent Forms, WPForms, Gravity Forms, or FluentCRM. Falls back to a built-in `hatch_submission` CPT if none are installed. Choose a default form ID + a FluentCRM list for newsletter signups.
- **Cloudflare Turnstile.** Site key + secret key fields. When enabled, gates both Comments and Form submissions server-side via `challenges.cloudflare.com/turnstile/v0/siteverify`. Free, privacy-friendly, fully replaces CAPTCHA.
- **`GET /hatch/v1/integrations`** — public snapshot of which integrations are detected + the Turnstile site key. Secret key is never exposed.

### Added — Headless Comments

- **`HatchComments.astro`** component. Server-renders approved comments from `/hatch/v1/comments?post={id}` and exposes a reply form that submits client-side back to WordPress. Toggle-aware (off by default if you've disabled the `comments` feature flag).
- **`POST /hatch/v1/comments`** — accepts comments from the headless frontend, validates email/length, enforces Turnstile when enabled, respects "moderate before publish" and "require sign-in" settings.

### Added — Form block

- **`HatchForm.astro`** component. Universal, design-templated form block with two variants: `newsletter` (inline email-only) and `contact` (name + email + message). Submits to `/hatch/v1/forms/submit` which routes to the right backend based on what you have active.
- **`POST /hatch/v1/forms/submit`** — auto-routes to Fluent Forms → WPForms → FluentCRM list subscribe → native `hatch_submission` CPT fallback, in that priority order.

### Added — Hatch Companion theme

- **Bundled blank WordPress theme** at `wp-plugin/companion-theme/`. Redirects raw frontend visits to the configured Astro URL, keeps wp-admin / login / REST / sitemap untouched, falls back to a clean splash when no frontend URL is set yet.
- **One-click installer.** A new card in the Connector tab copies the theme into `wp-content/themes/hatch-companion/` and activates it. No FTP, no zip download.

### Added — Astro frontend

- **`SiteFooter.astro` redesigned** as a 3-column footer with WP site name + tagline + RSS / Sitemap links and a small **"Built by Hatch — Headless WordPress"** credit linking back to hatch.adityaarsharma.com. Toggle the credit off via the new `built_by_hatch` feature flag (white-label).
- **Blog post page renders `<HatchComments />`** below related posts when the `comments` feature is on.
- **Blog index renders `<HatchForm type="newsletter" />`** below the post grid when the `forms` feature is on.

### Added — Feature flags

Three new toggles on `Tools → Hatch → Features` under a new **Engagement** group:
- `comments` — Comments on blog posts
- `forms` — Form block + newsletter capture
- `built_by_hatch` — Show "Built by Hatch" in footer

### Changed

- **`/hatch/v1/features` response now includes `integrations`** — frontend gets every flag, site setting, and Turnstile site key in a single fetch.
- **Deploy broker callback now writes `hatch_frontend_url`** option after a successful deploy so the Companion theme picks it up without extra config.

### Deferred — explicit roadmap

- **v0.22b** — Hatch Gutenberg blocks compile via Docker Node 18 build env (current `wp-scripts`/Node 22 dep drift).
- **v0.23** — Tech + Docs themes based on popular open-source Astro themes (eg. Cactus, AstroPaper, Starlight). Not built from scratch.
- **v0.24** — CPT auto-routing on the Astro side.
- **v0.30** — Header/Footer/Custom Page builder.



## [0.15.1] — 2026-05-14

Field-report patch #2 — every remaining point from the v0.15.0 review, no skips.

### Added
- **Cloudflare token URL now requests Pages + Workers Scripts permissions** in one shot. The pre-selected token template at `dash.cloudflare.com/profile/api-tokens` covers Pages: Edit (for the deploy) AND Workers Scripts: Edit (so the user can also bind Workers AI inside their Hatch frontend without juggling a second token). Still account-scoped — no DNS, no billing, no zones.
- **Broker landing page now has a "Get Hatch" section** with a direct link to the latest `hatch.zip` from GitHub Releases and the source repo. The deploy options stay at the top; download + source live below them.
- **Connector tab shows a real CTA when nothing is wired yet:** "No frontend connected yet — start the setup wizard." Previously it just showed the hosting suggestion cards in a confusing order.
- **Connector tab shows a deploy-pending CTA** when a host is picked but no URL is saved: "Vercel selected — deploy still pending. Continue to deploy →" deep-links back to wizard step 4.

### Fixed
- **Feature toggles + security toggles now update the green-tinted row background on click,** not just on form save. Same bug as the v0.15.0 theme card fix — server-rendered `.is-on` class needed a JS hook to mirror the checkbox state. Single delegated handler covers Features, Blocks, and Security tabs.
- **All external links in the broker landing page now have `target="_blank" rel="noopener noreferrer"`** — GitHub source, GitHub releases, docs links. No more losing your tab to a download click.

### Changed
- **Wizard Step 3 "Frontend URL" is now explicitly optional.** Label includes "(optional — leave blank if you haven't deployed yet)" and the help text explains the broker auto-fills it after deploy. No more guessing what to enter before you have a domain.

## [0.15.0] — 2026-05-14

> **Version jump:** straight from `0.9.2` → `0.15.0`. The 0.10–0.14 slots are intentionally skipped — too many real-world bug reports landed at once and a single patch label would understate the work. Next stable is `1.0.0`.

### Fixed — every "it didn't work" from the v0.9.2 field reports

- **Cloudflare callback "The link you followed has expired."** Root cause: `wp_nonce_url()` HTML-encodes `&` to `&amp;`. When the broker passed that URL through `new URL(returnUrl)` and appended `hatch_ticket` + `hatch_result`, the final redirect carried `&amp;` into the WP admin URL — so WordPress received query parameters named `amp;provider` and `amp;_wpnonce` instead of `provider` and `_wpnonce`. Nonce check failed → 403. Fix in `class-deploy-broker.php`: build `return_url` with `add_query_arg()` + `wp_create_nonce()` directly, no `wp_nonce_url()`.
- **Vercel "No application found" dead-end.** When the registered Vercel Integration hasn't been published to the public marketplace yet, the OAuth consent screen errors out. The broker now intercepts those error codes (`application_not_found` / `invalid_client`) and presents the pre-filled `vercel.com/new/clone` template URL as a fallback so users aren't left stranded.
- **Connector tab .env block used the OLD variable names** (`HATCH_WP_URL`, `WORDPRESS_USER`, `WORDPRESS_APP_PASSWORD`) while the wizard step 4 already used the correct names (`WP_API_URL`, `WP_API_USER`, `WP_API_PASS`). Connector tab now matches.
- **Features tab theme picker — clicking a card didn't update the visual.** Cards in the dashboard Features tab used plain `hx-card` styling; the wizard's cards used `hx-theme-card` (with the `:has(input:checked)` CSS rule). Dashboard now uses the same class + a small JS fallback for browsers without `:has()`.
- **Connector tab showed the full "Where to host your frontend" option list every time** — even after the user had already picked a host in the setup wizard. The duplicate is now hidden once a hosting model is stored; a compact "X is your selected host · Change host →" row replaces it.

### Changed — VPS install is now a single command

- **`scripts/install-vps.sh` accepts credential flags** `--wp-url / --wp-user / --wp-pass / --webhook-secret`. When all four are passed, the script writes `astro-starter/.env` (mode 600) automatically before the build step.
- **Wizard Step 4 VPS card** now shows a single pre-filled `curl … | sudo bash -s -- …` command with every credential baked in as a flag. The separate "copy .env" textarea and second copy button are gone.
- **Broker `/deploy/vps` page** rewritten to document both the credentialed and bare modes.

### Changed — UX polish from the field report

- **Deploy buttons in wizard Step 4 open in a new tab** (`target="_blank"` on the Vercel and Cloudflare forms). No more losing your WordPress admin session to the OAuth flow.
- **Revalidate-URL field on Connector tab** now auto-suggests the value from the broker-created project (e.g. `https://your-project.pages.dev/api/revalidate`) when one exists, and has clearer help text when it doesn't.

### Version metadata

- Plugin: `0.9.2 → 0.15.0`
- README labels: v0.9.2 → v0.15.0 (3 places — guardrail #10)
- CHANGELOG: this entry

## [0.9.2] — 2026-05-14

### Added — true 1-click deploy for Vercel + Cloudflare via `hatch.adityaarsharma.com`

The big v0.9.2 shift: the WP plugin now routes deploys through the open-source broker at `hatch.adityaarsharma.com` (RunCloud-hosted, source in `hatch-deploy/`). Both buttons in the setup wizard's Step 4 become real automation.

- **`Hatch_Deploy_Broker` (new class)** — `includes/class-deploy-broker.php`
  - `prepare(provider, params)` → server-to-server POST to broker `/deploy/<provider>/prepare`, returns a one-shot ticket
  - `redeem(ticket)` → server-to-server GET to `/deploy/redeem`, returns deploy hook URL + project metadata
  - Filterable broker base URL via `hatch/deploy_broker_base_url` (users can self-host the broker)
  - admin-post handler `hatch_start_deploy` → generates fresh App Password, POSTs to broker, redirects browser to broker `/start?ticket=...`
  - admin-post handler `hatch_deploy_callback` → validates ticket against a transient set at start, redeems, calls `Hatch_Deploy_Hooks` private methods (via reflection — same option write the REST POST would do) to store the deploy hook URL encrypted
  - One-shot redemption: ticket deleted on read, transient cleared, deploy hook URL persisted via existing v0.8 libsodium path

- **Wizard Step 4 — fully rewritten**
  - Three deploy cards: Vercel (1-click), Cloudflare (1-paste), VPS (manual bash)
  - Vercel / Cloudflare cards are `<form>` submissions to `admin-post.php?action=hatch_start_deploy` with provider hidden input + nonce — clicking takes the user straight through the OAuth/token flow and back with the deploy hook already saved
  - VPS card is a collapsible `<details>` with:
    - The exact bash one-liner (`curl -fsSL https://hatch.adityaarsharma.com/install.sh | bash`)
    - A copy button for it
    - The `.env` block with **corrected variable names** (`WP_API_URL` / `WP_API_USER` / `WP_API_PASS` — matches what the Astro starter actually reads)
    - A copy button for the env block
    - Pointer to `docs/hosting/vps-runcloud.md` for the panel/SSL/domain steps that Hatch deliberately doesn't touch

- **Bug fix: `.env` variable name mismatch**
  - Old wizard wrote `HATCH_WP_URL` / `WORDPRESS_USER` / `WORDPRESS_APP_PASSWORD`
  - Astro starter reads `WP_API_URL` / `WP_API_USER` / `WP_API_PASS`
  - Result: copy-paste was broken for v0.9.0 users. Now matches.

### Added — `hatch.adityaarsharma.com` broker (server-side, separate deploy)

This is the small Node/Express app under `hatch-deploy/` that runs on Aditya's RunCloud server. Deployed once; users never need to deploy it themselves.

- **Vercel OAuth flow** — 4 endpoints (`/prepare`, `/start`, `/callback`, `/redeem`)
  - Standard 4-step OAuth: WP plugin POSTs creds → ticket; browser redirected to Vercel consent; Vercel callback exchanges code → access token; broker uses token inline to create project + env vars + deploy hook; ticket marked complete; user bounced back to WP admin with `?hatch_ticket=...&hatch_result=success`; WP plugin redeems server-to-server
  - Access token NEVER persisted on the broker — used in the callback handler, gc'd
  - Project: `framework=astro`, `gitRepository=adityaarsharma/hatch`, `rootDirectory=astro-starter`
  - 4 env vars set: `WP_API_URL` plaintext, the other 3 encrypted (`type: 'encrypted'`)
  - Name collision retry with random suffix
  - 16-byte hex state nonce for CSRF protection

- **Cloudflare paste-token flow** — 3 endpoints (`/prepare`, `/start`, `/submit` → same `/redeem`)
  - CF has no OAuth program, so it's paste-token. Same shape, one extra user step (paste the token)
  - `/start` renders a 2-step form: button to open Cloudflare's token creation page with `permissionGroupKeys=[{key:"c8fed203..."}]` (the official "Pages: Edit" perm group ID, stable since 2023) + name pre-filled to "Hatch — Pages deploy"
  - User pastes token → `/submit` POST handler validates with `/user/tokens/verify`, fetches account ID, creates Pages project pointed at the Hatch repo with `root_dir=astro-starter`, embeds env vars in `deployment_configs.production.env_vars` AND `.preview`, tries to create a deploy hook via `/accounts/{id}/pages/projects/{name}/deploy_hooks` (gracefully degrades to `deploy_hook_needs_manual_setup=true` if the endpoint isn't available in the user's account tier)
  - Token used inline, never persisted

- **Bash installer (`/install.sh`)** — auto-installs Node 20 via NodeSource (apt/dnf/yum/apk), clones repo, builds. NOT SSL, NOT nginx, NOT systemd — those are the user's panel's job. Reserved flags `--install-nginx`, `--install-ssl`, `--install-pm2` print "not yet supported" if used today.

- **Brand mark endpoint** — `/icon.svg` and `/logo.svg` serve a 512×512 SVG (orange gradient disc + 🐣). Used by Vercel marketplace listing.

- **Privacy + Terms docs** — `docs/privacy.md` + `docs/terms.md` (plain English, honest about data flow: no telemetry, no DB, tokens live in memory ≤5 min)

### Operational

- **`hatch.adityaarsharma.com` is live**:
  - PM2 process `hatch-deploy` (PID stable, ~65 MB RAM)
  - Bound to `127.0.0.1:3000`
  - nginx proxy added via RunCloud's `extra.d/` extension point (won't be overwritten by panel changes)
  - PM2 systemd autostart enabled (survives reboots)
  - SSL via RunCloud's Let's Encrypt (already active before this release)
  - `.env` file with `VERCEL_CLIENT_ID` + `VERCEL_CLIENT_SECRET` permissions `600`, hatchuser-only

### Bumped

- Plugin: `0.9.0 → 0.9.2`
- README labels: v0.9.0 → v0.9.2 (3 places — guardrail #10)

### Notes

- v0.9.1 was a docs-only patch (privacy.md + terms.md skeletons); never tagged as a separate release
- Cloudflare DNS auto-bind (Option B) deferred to v0.11+ as planned. Current CF flow is Pages-only scope, frontend lands at `<project>.pages.dev`, user adds custom domain manually whenever they want.

---

## [0.9.0] — 2026-05-14

### Added
- **Real 1-click deploy buttons in setup wizard Step 4**
  - Vercel: pre-filled `vercel.com/new/clone?repository-url=...&root-directory=astro-starter&env=...` — drops the user on Vercel's own deploy flow with the repo + env var names already populated
  - Cloudflare Pages: `dash.cloudflare.com/?to=/:account/pages/new/provider/github` — jumps to the Pages project-creation screen
  - VPS: GitHub docs link only — no platform applies
  - **Zero Hatch-hosted infrastructure.** Buttons point at the platforms' own public deploy URLs. No `hatch.deploy` Worker exists or will exist.
- **Host picker radio (Step 3)** — Cloudflare Pages / Vercel / VPS, saved via `Hatch_Connection_Status::set_hosting_model()`
- **Step 3 auto-generates an Application Password** via the new `Hatch_App_Password_Helper::generate_and_stash()` public static — Step 4 then pops it via `pop_fresh_password()` for one-shot display in the `.env` block
- **Theme card click visual fix** — Step 2's theme picker now uses the `.hx-theme-card` class with `:has(input:checked)` CSS; selection updates instantly on click instead of waiting for form submit

### Changed
- **Every product-marketing URL replaced with GitHub anchors** (guardrail #2). Specifically:
  - `pages.cloudflare.com` → `github.com/adityaarsharma/hatch/blob/main/docs/hosting/cloudflare-pages.md`
  - `vercel.com` (marketing) → `github.com/adityaarsharma/hatch/blob/main/docs/hosting/vercel.md`
  - `runcloud.io`, `coolify.io`, `dokploy.com` → `github.com/adityaarsharma/hatch/blob/main/docs/hosting/vps-runcloud.md`
  - `developers.cloudflare.com/pages/configuration/deploy-hooks/` → `./hosting/cloudflare-pages.md`
  - `vercel.com/docs/git/deploy-hooks` → `./hosting/vercel.md`
  - The only platform URLs that remain are the deploy buttons themselves (unavoidable — that's where the user actually deploys)
- `WORDPRESS_APP_PASSWORD=(generate from your profile)` placeholder → real freshly-generated plaintext password in Step 4's `.env` block
- Wizard's `.env` block built via string concat so line breaks land in the textarea correctly
- Connector tab (admin/dashboard.php) — same product-URL purge, all hosting CTAs now point at GitHub docs

### Guardrails — TWO new repo-wide rules
- **#3 No external Hatch-hosted infrastructure.** Plugin never calls Aditya's servers. No `hatch.deploy` Worker. No telemetry. Everything is the user's own WP + their hosting platform + GitHub. Permanent.
- **#10 README download-link guardrail (HARD RULE).** Every release MUST update the three version-labeled download links in `README.md` to the new tag. URL itself uses `/releases/latest/download/` so it auto-resolves, but the **label** must match. Release checklist updated to enforce this mechanically.

### Bumped
- Plugin: `0.8.0 → 0.9.0` (header + `HATCH_VERSION` define)
- Astro starter: `0.8.0 → 0.9.0` (`astro.config.mjs` define)
- README download labels: v0.6.0 → v0.9.0 (3 places)

### Killed permanently
- `hatch.deploy` OAuth proxy Cloudflare Worker (was planned for v0.9, removed by direction)
- Any future "Hatch hosts X" infrastructure

---

## [0.8.0] — 2026-05-14

### Added — Deploy + Storefront + Visibility

- **Deploy hooks subsystem** (`class-deploy-hooks.php`)
  - Three providers supported out of the box: Cloudflare Pages, Vercel, and a generic POST endpoint (Netlify, Render, DigitalOcean App Platform, custom CI, …)
  - Hook URLs stored encrypted at rest via `sodium_crypto_secretbox` (with `b64:` fallback when libsodium is unavailable)
  - Per-site encryption key, generated lazily, never leaves the WP install
  - Auto-fires on `transition_post_status` (publish / unpublish) and `deleted_post`
  - 30-second debounce per provider — bulk edits don't hammer external services
  - Ring-buffer log of the last 50 firings with real HTTP status codes (no vibe-coded "Connected" claims)
  - REST surface: `GET/POST/DELETE /hatch/v1/deploy/hooks`, `POST /hatch/v1/deploy/fire`, `GET /hatch/v1/deploy/status`
  - URL masking in admin responses (only first 8 chars of path visible)
- **Health Widget** (`class-health-widget.php`)
  - WP `/wp-admin` dashboard widget pinned to the top
  - Four real-data tiles: Connection state · Last deploy · Published-post count · Domain architecture classification
  - Every status dot backed by an actual check — connection from `Hatch_Connection_Status::report()`, deploys from `Hatch_Deploy_Hooks::status_report()`, domain from `Hatch_Domain_Check::classify()`
- **WooCommerce read-only bridge** (`class-woocommerce-bridge.php`)
  - Auto-detects Woo at REST init — routes only register when Woo is active
  - Endpoints: `/store/products`, `/store/products/{id}`, `/store/products/{id}/variations`, `/store/categories`, `/store/featured`
  - Stable, minimal payload shape (decoupled from Woo internal schema changes)
  - 5-minute cached category map
  - Per-page hard cap at 100 (defensive against `per_page=99999`)
  - On product change: invalidates the category cache and fires deploy hooks

### Block-to-Astro renderer — fully wired (built in v0.7, live in v0.8)
- `src/pages/blog/[slug].astro` now fetches blocks alongside post/SEO/related in a single `Promise.all`
- When blocks come back from `/hatch/v1/post/{id}/blocks` → render via `<BlockRenderer/>` with 23 native Astro components
- When blocks are absent (plugin not yet installed, older WP) → graceful fallback to `set:html={post.content}`. **The page never breaks during connect / migration.**

### Guardrails (new repo-wide rules in CLAUDE.md)
1. No vibe-coded statuses — every "Connected / Active / Healthy" claim must be backed by a real check
2. No fake URLs — only real product URLs or GitHub anchors
3. Encrypted secrets at rest — `sodium_crypto_secretbox` is the floor
4. `php -l` on every changed file before commit
5. Permission gates by default on all admin REST routes
6. Debounce all destructive / network-bound operations
7. REST-only (no GraphQL adapter ever)
8. Astro-first (Next.js is fork-and-go; not maintained as a first-party path)

### Documentation
- `CLAUDE.md` — new **Current State (v0.8.0)** section is now the source of truth; old v0.1 section preserved under "Earlier Milestones (history)"
- `ROADMAP.md` — fully rewritten. Outdated TODOs killed. Clear shipped / next / north star / **deliberately not** sections
- `docs/deploy-hooks.md` — new — how the three providers work, paste-token model, OAuth proxy v0.9 plan
- `docs/woocommerce.md` — new — read-only scope, full endpoint reference, why cart/checkout are deferred
- `src/components/blocks/README.md` — new — how to extend the registry, what unknown blocks do

### Competitive research refreshed
- Surveyed 9 web sources (Astro docs, WordPress.org plugins, freeCodeCamp, Forminit 2026 guide, GitHub starters, Contra Collective, WP Engine, Lucky Media)
- Confirmed: no competitor bundles all of (a) WP plugin + Astro starter, (b) auto-generated App Password, (c) real two-way connection verification, (d) CMS-on-subdomain enforcer, (e) Block-to-Astro component map. **Hatch is the first.**

---

## [0.7.0] — 2026-05-14 (same day; superseded by 0.8 within hours)

### Added
- `class-connection-status.php` — real heartbeat (VPS) + webhook ACK (CF/Vercel) verification
- `class-block-serializer.php` — `/hatch/v1/post/{id}/blocks` returns normalized Gutenberg tree
- 23 native Astro block components (Paragraph, Heading, Image, Gallery, Video, Audio, Cover, MediaText, Group, Columns, Column, Buttons, Button, List, Quote, Pullquote, Code, Preformatted, Verse, Separator, Spacer, Details, Embed, Html, Table)
- `<BlockRenderer/>` recursive walker with registry-based dispatch + graceful innerHTML fallback
- Premium toggle switches (Linear/Vercel-grade) using `:has(input:checked)` selectors

### Changed
- Connector tab — every "Connected" claim now backed by actual check
- App Password helper now exposes `pop_fresh_password()` for one-shot display after generation
- Domain check migration guide → points at real GitHub doc (no more `hatch.adityaarsharma.com`)

### Removed
- Five legacy folders cleaned out: `claude-plugin/`, `modules/`, `themes/`, `packages/`, `marketing/`
- All `hatch.adityaarsharma.com` references in `wp-plugin/admin/dashboard.php`, `class-domain-check.php`

---

## [0.6.0] — earlier
- Hatch Blocks (Hero, Section, Content) with Tailwind utility output
- Per-block enable/disable control panel
- Custom-code block security (KSES + capability gate)

## [0.5.0] — earlier
- Frontend Agent (HMAC daemon)
- SSH fallback for Frontend Agent
- Domain check enforcer (warns if WP runs on a root domain)
- Distributed as a standalone WP plugin via GitHub download

## [0.2.1] — earlier
- WordPress 7.0 Abilities API support
- MCP integration surface

## [0.2.0] — earlier
- ACF bridge, CPT scanner, Login hardening
- App Password helper (programmatic generation)
- Admin dashboard redesign
- Frontend webhook bridge

## [0.1.0] — earlier
- WP plugin scaffolding (`hatch.php`, REST namespace, version constants)
- Plugin detector (17 plugins)
- REST hardening: anonymous wall, `?author=N` block, XML-RPC off, REST link strip
- `/hatch/v1/info`, `/seo-head`, `/redirects`, `/forms` endpoints
- Auto-detection of RankMath / Yoast / WPForms / Fluent / Gravity / CF7

---

[0.15.1]: https://github.com/adityaarsharma/hatch/releases/tag/v0.15.1
[0.15.0]: https://github.com/adityaarsharma/hatch/releases/tag/v0.15.0
[0.9.2]: https://github.com/adityaarsharma/hatch/releases/tag/v0.9.2
[0.9.0]: https://github.com/adityaarsharma/hatch/releases/tag/v0.9.0
[0.8.0]: https://github.com/adityaarsharma/hatch/releases/tag/v0.8.0
[0.7.0]: https://github.com/adityaarsharma/hatch/releases/tag/v0.7.0
[0.6.0]: https://github.com/adityaarsharma/hatch/releases/tag/v0.6.0
[0.5.0]: https://github.com/adityaarsharma/hatch/releases/tag/v0.5.0

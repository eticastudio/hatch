# Test-case checklist — Hatch v0.5.0

Scope: WordPress plugin (`wp-plugin/`) + Astro headless frontend (`astro-starter/`). Written for the WP.org submission and public v0.5.0 ship. Cases are grouped by risk surface; severities are `P0` (ship-blocker), `P1` (major regression), `P2` (medium/polish), `P3` (nice-to-have). All file paths are absolute from repo root.

Legend for the 26 core blocks referenced in Section 1 (matches `wp-plugin/includes/class-blocks-allowlist.php:38-67`):
`paragraph, heading, list, list-item, quote, pullquote, code, preformatted, verse, image, gallery, video, audio, cover, embed, columns, column, group, separator, spacer, table, details, button, buttons, html, file`.

Themes tested per block: `blog` (Editorial / Fraunces), `tech` (Terminal / JetBrains Mono), `docs` (Reference / Geist). Feature source: `wp-plugin/includes/class-features.php:169-186`.

---

## Section 1 — Core Gutenberg block rendering (26 blocks × 3 themes = 78 cases)

Every case in this section:
- Setup: Post created in WP with a single instance of the block (with realistic content and every visible sub-option exercised). Active theme set via `Hatch → Design → Theme` → `hatch_selected_theme` option. Post fetched by Astro via `/hatch/v1/content?slug=...` (`class-rest-api.php:452`), body rendered by `set:html` in `astro-starter/src/pages/blog/[slug].astro:349`.
- Steps: 1) Publish post. 2) Load `/blog/<slug>` on the Astro frontend. 3) Inspect rendered DOM + computed styles.
- Expected: Block renders with the theme's per-block styling from `astro-starter/src/styles/core-blocks.css` (shared reset §1, blog §2 lines 265-306, tech §3 lines 313-395, docs §4 lines 400-451) plus the theme file (`theme-blog.css` / `theme-tech.css` / `theme-docs.css`). No unstyled `<div>`, no white-on-white text, no horizontal overflow at 375px viewport.

### 1a — Paragraph (`core/paragraph`)

- [ ] **TC-001** [P0] `core-blocks.css:35-40` — Paragraph renders with theme body font in `blog`
   - Expected: `.wp-block-paragraph` inherits `--hatch-font-body`, line-height 1.7, color `var(--hatch-fg)`; first `<p>` after `<h1>` gets a Fraunces drop-cap via `core-blocks.css:281-289`.
   - Failure mode: no drop-cap = editorial signature missing; unstyled paragraph = theme not loading (`PageLayout.astro:158` link tag broken).
- [ ] **TC-002** [P0] `core-blocks.css:344-348` — Paragraph renders in `tech` theme
   - Expected: 16px font-size, 1.6 line-height, mono body absent (body stays sans in tech per contract).
   - Failure mode: mono spilling into `<p>` = tech theme selectors leaking beyond code blocks.
- [ ] **TC-003** [P1] `core-blocks.css:415-419` — Paragraph in `docs` theme
   - Expected: 16px / 1.72 line-height, Geist face applied via `[data-hatch-theme="docs"]` selector.

### 1b — Heading (`core/heading` — H1..H6)

- [ ] **TC-004** [P0] `core-blocks.css:274-278` — Heading H1-H3 use Fraunces in `blog`
   - Expected: `font-variation-settings: 'opsz' 144, 'SOFT' 50`; clamp() sizes 2rem→3.2rem for H1.
   - Failure mode: heading falls back to Inter Tight = per-theme Google Font link tag (`PageLayout.astro:138-149`) did not fire for the active theme.
- [ ] **TC-005** [P0] `core-blocks.css:319-324` — Heading H2 in `tech` gets `#` prefix, H3 gets `##`
   - Expected: `::before` content injects markdown-style hash marks in `--hatch-primary`.
   - Failure mode: no prefix = terminal signature lost.
- [ ] **TC-006** [P1] `core-blocks.css:405-408` — Heading has `scroll-margin-top: 80px` in `docs` for anchor jumps
   - Expected: clicking a TOC anchor lands with 80px offset so the sticky header does not cover the H2.
- [ ] **TC-007** [P1] `[slug].astro:140-153` — TOC extracts H2/H3 via regex, injects matching IDs at runtime
   - Expected: `<h2 id="my-slug">` after `hatchInitPostScripts` runs; safe with non-ASCII (regex `[^\w\s-]`).
   - Failure mode: TOC anchors 404 = ID injection loop stops at first mismatch.

### 1c — List (`core/list`)

- [ ] **TC-008** [P1] `core-blocks.css:60-66` — Ordered + unordered list in `blog`
   - Expected: `padding-left: 1.5em`, correct markers, nested lists inherit color `var(--hatch-fg)`.
- [ ] **TC-009** [P1] `core-blocks.css:60-66` — Same in `tech`
- [ ] **TC-010** [P1] `core-blocks.css:60-66` — Same in `docs`

### 1d — List Item (`core/list-item`) — sub-block of list

- [ ] **TC-011** [P2] `core-blocks.css:69-71` — List-item spacing rhythm
   - Expected: `.wp-block-list li` gets `margin-block: 0.35em` and `line-height: 1.65` in all three themes.

### 1e — Quote (`core/quote`)

- [ ] **TC-012** [P0] `core-blocks.css:74-91` — Blockquote in `blog` uses Fraunces at 1.35em
   - Expected: `border-left: 2px solid var(--hatch-primary)`, oldstyle italic serif face.
- [ ] **TC-013** [P0] `core-blocks.css:363-370` — Blockquote in `tech` becomes a filled panel
   - Expected: `background: var(--hatch-bg-2)`, no italic, `border-left` primary hairline.
- [ ] **TC-014** [P0] `core-blocks.css:441-451` — Blockquote in `docs` becomes a "Note" panel
   - Expected: color-mixed primary background at 7%, 1px 22%-primary border, 3px left rail.
   - Failure mode: reverting to bare italic breaks docs visual signature — this is the theme's marquee element.

### 1f — Pullquote (`core/pullquote`)

- [ ] **TC-015** [P1] `core-blocks.css:93-102` — Pullquote in `blog` uses 1.6em Fraunces
- [ ] **TC-016** [P1] `core-blocks.css:93-102` — Pullquote in `tech` inherits shared `.wp-block-pullquote` styling (bordered, centered)
- [ ] **TC-017** [P2] `core-blocks.css:93-102` — Pullquote in `docs` retains centered rhythm

### 1g — Code (inline `<code>` + `core/code`)

- [ ] **TC-018** [P1] `core-blocks.css:104-121` — Inline + block `<code>` in `blog`
   - Expected: mono font, `background: var(--hatch-bg-2)`, `border-radius: 3px`; `<pre>` block wraps overflow via `overflow-x: auto`.
- [ ] **TC-019** [P0] `core-blocks.css:351-362` — Code in `tech` with mono face and `--hatch-accent` inline code color
   - Expected: 13.5px `<pre>`, JetBrains Mono, 1.55 line-height.
- [ ] **TC-020** [P0] `core-blocks.css:426-432` — Code in `docs` with Geist Mono
   - Expected: `.wp-block-code` uses Geist Mono, not JetBrains — cross-theme leak test.

### 1h — Preformatted (`core/preformatted`)

- [ ] **TC-021** [P1] `core-blocks.css:124-131` — Preformatted respects `white-space: pre-wrap` in all themes
   - Failure mode: `pre-wrap` reverting to `pre` = long lines create horizontal scrollbar on mobile.

### 1i — Verse (`core/verse`)

- [ ] **TC-022** [P2] `core-blocks.css` — Verse renders (no per-theme override; falls to `<pre>` shared reset)
- [ ] **TC-023** [P2] `core-blocks.css` — Verse in `tech` should NOT inherit `#` prefix from heading rules
- [ ] **TC-024** [P3] `core-blocks.css` — Verse in `docs` mono face inherited via `<pre>` fallback

### 1j — Image (`core/image`)

- [ ] **TC-025** [P0] `[slug].astro:349` + `core-blocks.css:42-58` — Image with caption in `blog`
   - Expected: `<figcaption>` at 0.85em `--hatch-fg-subtle`, centered.
   - Failure mode: broken image or caption misalignment — content-image URL rewrite (`rewriteContentImages`) blew up.
- [ ] **TC-026** [P0] `[slug].astro:349` — Image `src` rewritten through media proxy when `hatch_image_proxy_url` is set
   - Setup: Configure image proxy in admin.
   - Expected: `<img src="https://proxy.example/...">` inside `.hatch-prose`; falls back to original when proxy empty.
- [ ] **TC-027** [P1] `core-blocks.css:52-53` — Image in `tech` retains rounded radius but no extra chrome
- [ ] **TC-028** [P1] `core-blocks.css:52-53` — Image in `docs`

### 1k — Gallery (`core/gallery`)

- [ ] **TC-029** [P0] `core-blocks.css:184-190` — Gallery renders as auto-fit grid, 220px minmax
   - Expected: 4 images collapse to 2-col mobile / 3-col tablet / 4-col desktop without overflow.
- [ ] **TC-030** [P1] `core-blocks.css:184-190` — Same in `tech`
- [ ] **TC-031** [P1] `core-blocks.css:184-190` — Same in `docs`

### 1l — Video (`core/video`)

- [ ] **TC-032** [P0] `core-blocks.css:194-200` — Video renders 16:9 aspect ratio in `blog`
   - Failure mode: aspect-ratio collapses = video shows 0px height on Safari.
- [ ] **TC-033** [P1] `core-blocks.css:194-200` — Video in `tech`
- [ ] **TC-034** [P1] `core-blocks.css:194-200` — Video in `docs`

### 1m — Audio (`core/audio`)

- [ ] **TC-035** [P1] `core-blocks.css:203-206` — Audio player renders full-width in `blog`
- [ ] **TC-036** [P2] `core-blocks.css:203-206` — Audio in `tech`
- [ ] **TC-037** [P2] `core-blocks.css:203-206` — Audio in `docs`

### 1n — Cover (`core/cover`)

- [ ] **TC-038** [P0] `core-blocks.css:222-233` — Cover block in `blog` with background image + overlay text
   - Expected: `padding: 3em 2em`, `.wp-block-cover__inner-container` centered, text stays readable (color: #fff literal from CSS).
   - Failure mode: text illegible on dark image = overlay opacity missing from post attributes.
- [ ] **TC-039** [P1] `core-blocks.css:222-233` — Cover in `tech`
- [ ] **TC-040** [P1] `core-blocks.css:222-233` — Cover in `docs`

### 1o — Embed (`core/embed` — YouTube/Vimeo/Twitter)

- [ ] **TC-041** [P0] `core-blocks.css:193-200` — YouTube embed loads via iframe, 16:9
   - Failure mode: WP's oEmbed output includes tracking params — verify no PII leaks in `Referer` header (privacy claim in submission).
- [ ] **TC-042** [P1] `core-blocks.css:193-200` — YouTube embed in `tech`
- [ ] **TC-043** [P1] `core-blocks.css:193-200` — YouTube embed in `docs`

### 1p — Columns (`core/columns`)

- [ ] **TC-044** [P0] `core-blocks.css:210-220` — 2-column layout stacks on mobile, side-by-side ≥640px
   - Expected: `grid-template-columns: repeat(var(--wp-columns, 2), 1fr)` in media query.
   - Failure mode: no wrap = 375px viewport gets horizontal scroll.
- [ ] **TC-045** [P1] `core-blocks.css:210-220` — 3-column in `tech`
- [ ] **TC-046** [P1] `core-blocks.css:210-220` — 3-column in `docs`

### 1q — Column (`core/column`) — child of Columns

- [ ] **TC-047** [P2] `core-blocks.css:210-220` — Individual `.wp-block-column` inherits grid slot in all themes

### 1r — Group (`core/group`)

- [ ] **TC-048** [P1] `core-blocks.css` — Group block with nested paragraph + heading in `blog`
   - Expected: no extra background or border unless post attributes set one; content inherits theme spacing.
- [ ] **TC-049** [P1] `core-blocks.css` — Group in `tech`
- [ ] **TC-050** [P1] `core-blocks.css` — Group in `docs`

### 1s — Separator (`core/separator`)

- [ ] **TC-051** [P1] `core-blocks.css:133-155` + `275-278` — Separator in `blog` clamps to max-width 20%
- [ ] **TC-052** [P1] `core-blocks.css:373-377` — Separator in `tech` spans full width (100%)
   - Failure mode: 20% separator in `tech` breaks terminal-density feel.
- [ ] **TC-053** [P1] `core-blocks.css:133-155` — Separator dot-style (`.is-style-dots`) renders 3-dot pattern in `docs`

### 1t — Spacer (`core/spacer`)

- [ ] **TC-054** [P2] `core-blocks.css` — Spacer height respects post attribute in `blog`
- [ ] **TC-055** [P3] `core-blocks.css` — Spacer in `tech`
- [ ] **TC-056** [P3] `core-blocks.css` — Spacer in `docs`

### 1u — Table (`core/table`)

- [ ] **TC-057** [P1] `core-blocks.css:157-181` — Table with header row in `blog`
   - Expected: `th` gets `--hatch-bg-2` background, `border-bottom` between rows, left-aligned.
- [ ] **TC-058** [P1] `core-blocks.css:157-181` — Table in `tech`
- [ ] **TC-059** [P1] `core-blocks.css:157-181` — Table in `docs`

### 1v — Details (`core/details`)

- [ ] **TC-060** [P1] `core-blocks.css` — Details/summary toggles open on click
   - Expected: native `<details>` behavior preserved, summary readable in current color scheme.
- [ ] **TC-061** [P2] `core-blocks.css` — Details in `tech`
- [ ] **TC-062** [P2] `core-blocks.css` — Details in `docs`

### 1w — Button (`core/button`)

- [ ] **TC-063** [P0] `core-blocks.css:236-252` — Single button in `blog` uses primary bg + white fg
   - Expected: `padding: 10px 22px`, radius from `--hatch-radius`, hover `color-mix(in oklab, ..., black)`.
   - Failure mode: unstyled `<a>` = the very first thing a WP.org reviewer sees is broken.
- [ ] **TC-064** [P0] `core-blocks.css:379-393` — Button in `tech` gets `> ` prompt prefix
   - Expected: `content: '> '` `::before`, JetBrains Mono face, 3px radius (terminal-flat corners).
- [ ] **TC-065** [P0] `core-blocks.css:453-459` — Button in `docs` at 500 weight, radius `--hatch-radius`

### 1x — Buttons (`core/buttons` — button group)

- [ ] **TC-066** [P1] `core-blocks.css:254-260` — Multi-button flex row wraps on mobile
   - Failure mode: flex-nowrap = overflow on 375px.
- [ ] **TC-067** [P1] `core-blocks.css:254-260` — Buttons row in `tech`
- [ ] **TC-068** [P1] `core-blocks.css:254-260` — Buttons row in `docs`

### 1y — HTML (`core/html`)

- [ ] **TC-069** [P0] `[slug].astro:349` + `wp-plugin/hatch.php:154` — Raw HTML block passes through `apply_filters('the_content', ...)` in `class-rest-api.php:487`
   - Expected: `<iframe>`, `<script>`, `<div>` render as authored; WP KSES on save trims unsafe tags for non-admin users but admin content survives.
   - Failure mode: reviewer authors an `<iframe>` for a widget — nothing renders = broken.
- [ ] **TC-070** [P1] Same in `tech`
- [ ] **TC-071** [P1] Same in `docs`

### 1z — File (`core/file`)

- [ ] **TC-072** [P1] `[slug].astro:349` — File block emits `<a href="...pdf">` with download attribute preserved
- [ ] **TC-073** [P2] Same in `tech`
- [ ] **TC-074** [P2] Same in `docs`

### 1aa — Cross-theme regression sweeps (7 additional cases to hit 78)

- [ ] **TC-075** [P0] `core-blocks.css:11-14` — Editing raw HTML in a post retains blocks after switching theme
   - Setup: Save post in `blog`, switch to `tech`, view.
   - Expected: no content re-serialization, no lost attributes.
- [ ] **TC-076** [P0] `[slug].astro:349` — Post body with 20+ blocks renders under 100ms server-time
   - Failure mode: N+1 in the media rewriter — check `Server-Timing` header.
- [ ] **TC-077** [P1] `core-blocks.css:462-478` — Code-block copy button appears on `<pre>` hover in all themes
   - Expected: `.hatch-copy-btn` positioned top:8px right:8px, opacity 0 default, 1 on hover.
- [ ] **TC-078** [P1] `PageLayout.astro:265-296` — Copy button re-attaches after Astro ClientRouter navigation (`astro:page-load`)
   - Failure mode: soft nav breaks copy = documented regression path from v0.4.

---

## Section 2 — REST API (18 cases)

- [ ] **TC-079** [P0] `class-rest-api.php:151-162` — `/hatch/v1/menus` responds 200 without auth
   - Setup: Fresh install, no App Password.
   - Steps: `curl https://site.example/wp-json/hatch/v1/menus`.
   - Expected: JSON list of locations, HTTP 200.
   - Failure mode: 401 = header/footer render with zero menu items on Astro side (documented in code comment lines 148-152).
- [ ] **TC-080** [P0] `class-rest-api.php:186-207` — `/hatch/v1/content?slug=X` public, returns only `post_status=publish`
   - Setup: Create a draft post with slug `draft-test`, publish another as `pub-test`.
   - Steps: `curl /wp-json/hatch/v1/content?slug=draft-test` then `?slug=pub-test`.
   - Expected: draft returns `{found: false}` HTTP 404, published returns full record.
   - Failure mode: draft leak = privacy violation, WP.org reject-worthy.
- [ ] **TC-081** [P0] `class-rest-api.php:361-378` — `/hatch/v1/content/list` clamps `per_page` to 1..24
   - Steps: `?per_page=1000`.
   - Expected: 24 results max; no `LIMIT 1000` in query log.
   - Failure mode: DoS vector via query flood.
- [ ] **TC-082** [P0] `class-features.php:250-260` — `/hatch/v1/features` public, no auth
   - Expected: `{theme, design, aesthetic, features, site, home, cpts, integrations, image_proxy_url, version}` shape stable.
- [ ] **TC-083** [P1] `class-features.php:280-284` — `home.posts_page_id === 0` when Reading → Posts Page is unassigned
   - Failure mode: `posts_page_slug` returned for a deleted page → Astro renders a 404 link.
- [ ] **TC-084** [P0] `class-rest-api.php:530-535` — `permission_authenticated()` gates `/info`, `/seo-head`, `/schema`
   - Steps: Anonymous curl.
   - Expected: 401 / `rest_forbidden`.
- [ ] **TC-085** [P0] `class-rest-api.php:542-544` — `permission_admin()` gates `/cpt-health`, `/acf-status`, `/revalidate`, `/diagnostic`
   - Steps: Author-role Application Password.
   - Expected: 403.
- [ ] **TC-086** [P0] `class-rest-api.php:673-694` — POST `/hatch/v1/revalidate` fires webhook when configured, else returns error
   - Setup: Set `hatch_revalidate_endpoint`.
   - Expected: 200 with `success: true`; empty endpoint → 400 `hatch_revalidate_not_configured`.
- [ ] **TC-087** [P1] `class-rest-api.php:349-355` — `send_cors_for_hatch` echoes request Origin on `/hatch/v1/*`
   - Steps: Send `Origin: https://frontend.pages.dev`.
   - Expected: response `Access-Control-Allow-Origin` matches, `Vary: Origin` present, `Allow-Methods` includes GET/POST/OPTIONS.
- [ ] **TC-088** [P0] `hatch.php:113-152` — CORS scoping for `wp_options` frontend URL + `*.workers.dev`/`*.vercel.app`
   - Failure mode: `Access-Control-Allow-Origin: *` with credentials = OWASP A02 violation.
- [ ] **TC-089** [P1] `class-rest-api.php:295-320` — `/hatch/v1/seo-meta` returns robots.txt from RankMath > Yoast > native fallback
   - Steps: Toggle each SEO plugin active.
   - Expected: robots body matches source; `Cache-Control: public, max-age=300, stale-while-revalidate=3600` header emitted.
- [ ] **TC-090** [P1] `class-rest-api.php:597-635` — `/hatch/v1/redirects` combines Redirection + RankMath tables
   - Failure mode: prepared-statement regression, `$table` interpolation.
   - Expected: `SHOW TABLES LIKE %s` gate is present; interpolation only for `$wpdb->prefix`.
- [ ] **TC-091** [P0] `class-rest-api.php:499-502` — `/hatch/v1/content` returns full `apply_filters('the_content', ...)` output
   - Expected: shortcodes expanded, embeds resolved, block HTML present.
- [ ] **TC-092** [P1] `class-rest-api.php:492-499` — `/hatch/v1/content` enriches with categories + tags + author bio + avatar
   - Failure mode: null author breaks blog `[slug].astro:275-289`.
- [ ] **TC-093** [P0] `class-features.php:335-336` — `/features` `image_proxy_url` mirrors `hatch_frontend_url` on activation (`hatch.php:170-176`)
   - Failure mode: activation sets `hatch_image_proxy_url` even when `hatch_frontend_url` is empty = broken default.
- [ ] **TC-094** [P1] `class-features.php:307-311` — `rankready.active === false` shape when RankReady not installed
   - Steps: Deactivate RankReady, hit `/features`.
   - Expected: `integrations.rankready = {active: false}` — no null-deref on Astro side.
- [ ] **TC-095** [P1] `class-features.php:349-364` — Fresh REST call reflects new value within 1s of options save
   - Setup: Save theme=`tech` in admin.
   - Expected: next `/features` returns `theme: "tech"` — no object cache stampede.
- [ ] **TC-096** [P0] `class-rest-api.php:345-355` — CORS preflight `OPTIONS /wp-json/hatch/v1/content` returns 204 with headers, no body
   - Failure mode: 404 or missing `Allow-Methods` blocks the Astro POST comments flow.

---

## Section 3 — Menu wiring edge cases (11 cases)

- [ ] **TC-097** [P0] `hatch.php:594-598` — `register_nav_menu('primary')` + `register_nav_menu('footer')` fire on `after_setup_theme` priority 20
   - Expected: `/wp-admin/nav-menus.php` shows both locations regardless of active theme.
- [ ] **TC-098** [P0] `class-rest-api.php:180-198` — `/menus/{location}` accepts only `[a-zA-Z0-9_-]+`
   - Steps: `curl /wp-json/hatch/v1/menus/primary?foo=<script>`.
   - Expected: response sanitized, no XSS reflection.
- [ ] **TC-099** [P1] `SiteHeader.astro:41-45` — Only top-level items (`parent === 0`) rendered in header
   - Expected: submenu children suppressed on header (drawer collapse comes later).
- [ ] **TC-100** [P0] `SiteHeader.astro:47-58` — Fallback nav (Posts Page slug link) only appears when `posts_page_id > 0`
   - Setup: Reading → assign nothing to Posts Page.
   - Expected: header has zero nav items; no dead `/blog` link.
   - Failure mode: shipping a 404 default link — explicitly called out in `SiteHeader.astro:44-48`.
- [ ] **TC-101** [P1] `SiteHeader.astro:104` — Divider + navrow suppressed when navItems is empty
- [ ] **TC-102** [P1] `SiteFooter.astro:34-47` — Footer fallback links only surface archive when `posts_page_id > 0`
- [ ] **TC-103** [P1] `SiteHeader.astro:66-68` — `isActive('/foo')` matches `/foo/bar` (prefix) but `isActive('/')` is exact
   - Failure mode: home link always active = docs 404 UI.
- [ ] **TC-104** [P0] `SiteHeader.astro:60` — External menu items honor `target="_blank"` from WP
   - Expected: WP menu item link opens in new tab when configured; `rel="noopener"` NOT automatically injected here (verify).
- [ ] **TC-105** [P2] `SiteHeader.astro:192-224` — Mobile drawer opens on hamburger click, closes on Esc + on link click + on ≥768px resize
- [ ] **TC-106** [P1] `SiteHeader.astro:151-160` — Empty menus + no Posts Page → wordmark stands alone, no broken chrome
- [ ] **TC-107** [P2] `class-features.php:349-361` — `logo_url` resolves both `custom_logo` theme mod and `site_logo` option
   - Failure mode: SPA themes that use `site_logo` show wordmark instead of logo.

---

## Section 4 — Dark mode + theme resolution (9 cases)

- [ ] **TC-108** [P0] `SiteHeader.astro:250-271` — Color-mode button flips `data-hatch-mode` on `<html>`, persists to `localStorage`
   - Expected: refresh preserves state, sun/moon icons swap.
- [ ] **TC-109** [P0] `PageLayout.astro:75` + `hatch.php:263-267` — `data-hatch-mode="auto"` respects `prefers-color-scheme: dark`
- [ ] **TC-110** [P1] `PageLayout.astro:100-101` — `data-hatch-theme={theme}` sets `<html>` attribute → theme CSS applies via attribute selectors in `core-blocks.css`
- [ ] **TC-111** [P0] `PageLayout.astro:158-161` — Only ONE theme stylesheet emitted (`THEME_CSS_URL[theme]`), not all three
   - Failure mode: 3 CSS payloads = 18KB regression the pivot explicitly avoided (`PageLayout.astro:16-26`).
- [ ] **TC-112** [P1] `PageLayout.astro:34-37` — Unknown theme defaults to `blog`; verify with `hatch_selected_theme=nonsense`
- [ ] **TC-113** [P1] `class-features.php:230-234` — `Hatch_Features::get_theme()` clamps unknown slug to `blog` on server side
- [ ] **TC-114** [P0] `SiteHeader.astro:275-284` — `hatch-header-hide-on-scroll` uses `translateY(-100%)` when `sticky === 'hide_on_scroll'`
   - Failure mode: JS runs when static, header disappears permanently.
- [ ] **TC-115** [P1] `theme-blog.css/theme-tech.css/theme-docs.css` — Each theme file defines `--hatch-bg` for BOTH light and dark modes
   - Setup: Toggle mode.
   - Expected: bg-fg contrast ≥ 4.5:1 at both — quick spot-check with dev tools.
- [ ] **TC-116** [P1] `PageLayout.astro:238` — `respect_reduced_motion` flag emits `@media (prefers-reduced-motion)` inline style overriding transitions
   - Failure mode: user preference ignored = accessibility complaint.

---

## Section 5 — Block editor allowlist + theme.json locks (10 cases)

- [ ] **TC-117** [P0] `class-blocks-allowlist.php:38-67` — Inserter shows only the 26 whitelisted blocks
   - Setup: Fresh WP, edit post.
   - Expected: no `core/query`, no `core/post-title`, no `hatch/*` legacy blocks in picker.
- [ ] **TC-118** [P0] `class-blocks-allowlist.php:83-91` — `array_intersect` with prior allowlist preserves other plugins' restrictions
   - Failure mode: Hatch re-enables a block another plugin explicitly hid.
- [ ] **TC-119** [P1] `class-blocks-allowlist.php:99-116` — Deprecation notice for legacy `hatch/*` blocks shown once per user, dismissible
   - Steps: Open editor, dismiss notice, reload.
   - Expected: no notice on second load (`hatch_block_deprecation_dismissed_v05` user meta).
- [ ] **TC-120** [P2] `class-blocks-allowlist.php:121-127` — AJAX dismiss handler nonce-checks (`hatch_dismiss_block_deprecation`)
- [ ] **TC-121** [P0] `companion-theme/theme.json:5-9` — `appearanceTools: false` + border/radius all-off locks editor to Hatch tokens
   - Failure mode: users pick a magenta border in the editor, breaks theme signature on frontend.
- [ ] **TC-122** [P0] `companion-theme/theme.json:14-19` — Color: `custom: false`, `customDuotone: false`, `defaultGradients: false`
   - Expected: color picker shows only the 9 named palette entries.
- [ ] **TC-123** [P1] `companion-theme/theme.json:78-93` — Typography locks: no `customFontSize`, `dropCap`, `fluid`, `letterSpacing`
- [ ] **TC-124** [P1] `companion-theme/theme.json:79-85` — Only 4 named font-sizes exposed (small/medium/large/x-large)
- [ ] **TC-125** [P0] `companion-theme/theme.json:141-150` — `styles.color.background` + `styles.color.text` bind to `--hatch-bg`/`--hatch-fg` so companion theme mirrors the Astro palette
- [ ] **TC-126** [P1] `companion-theme/theme.json:70-73` — `layout.contentSize: 720px`, `wideSize: 1180px` — verify these match `--hatch-max-width` sync in `hatch.php:236-257`

---

## Section 6 — Sidebar + related posts (9 cases)

- [ ] **TC-127** [P0] `Sidebar.astro:57-104` — Sidebar renders only when `widgets.length > 0`
   - Setup: `hatch_design_sidebar.widgets = []`, no defaults.
   - Expected: no `<aside>` in DOM.
- [ ] **TC-128** [P1] `[slug].astro:293-334` — Sidebar fallback (recent + categories) surfaces on posts with no h2/h3 headings
   - Failure mode: reserved column empty = "phantom right column" bug called out in code.
- [ ] **TC-129** [P0] `Sidebar.astro:98-101` — `custom_html` widget renders via `set:html`
   - Setup: Save `<script>alert(1)</script>` as widget HTML.
   - Expected: sanitized by WP `wp_kses_post` on save; if not sanitized, ship-blocker XSS.
- [ ] **TC-130** [P1] `Sidebar.astro:47-52` — Single WP round-trip for categories + recent posts (batch via Promise.all)
- [ ] **TC-131** [P1] `[slug].astro:114-119` — Related posts count uses admin `postNav.related_count`, clamps to actual related length via `relatedGridClass` shape
- [ ] **TC-132** [P1] `[slug].astro:114-119` — `relatedColsPref` accepts both string `'2'` and number `2` (ChipRow persistence quirk)
- [ ] **TC-133** [P1] `[slug].astro:123-125` — `related.length === 0` suppresses the section entirely (no orphan `<h2>More in...</h2>`)
- [ ] **TC-134** [P2] `Sidebar.astro:70-75` — Sidebar categories widget marks the current post's category as active (`is-active` class + inset primary rail)
- [ ] **TC-135** [P2] `Sidebar.astro:120-217` — `.hatch-sidebar` CSS uses `is:global` so styles apply to admin-injected widgets

---

## Section 7 — Archive routes + pagination (9 cases)

- [ ] **TC-136** [P0] `class-features.php:280-296` — When `page_for_posts` is unset, Astro `/blog` must 404 (mirrors WP native `/` = blog)
   - Failure mode: duplicate-content SEO penalty across `/` and `/blog/`.
- [ ] **TC-137** [P0] `class-features.php:342-347` — `permalink_structure` + `category_base` + `tag_base` surfaced to Astro
   - Expected: Astro `url-builder` honors `/blog/%postname%/` when user picks that structure.
- [ ] **TC-138** [P1] `class-rest-api.php:365-368` — `/content/list?taxonomy=category&term=X` filters properly
- [ ] **TC-139** [P1] `class-rest-api.php:369-374` — `/content/list?author=slug` or `?author=1` both resolve
- [ ] **TC-140** [P1] `class-rest-api.php:363-364` — `order=asc/desc` case-insensitive, only two valid values
- [ ] **TC-141** [P1] `class-rest-api.php:390` — Response includes `Cache-Control: public, max-age=60, s-maxage=60, stale-while-revalidate=3600`
- [ ] **TC-142** [P2] `class-rest-api.php:381` — Primary category label included in list items (`category` field), empty string when uncategorized
- [ ] **TC-143** [P0] `[slug].astro:41` — `if (!slug) redirect('/')` — no accidental `/blog/undefined` requests
- [ ] **TC-144** [P0] `[slug].astro:43` — Missing post rewrites to `/404` with `status: 404` — verify HTTP status, not soft 200
   - Failure mode: search engines index the 404 page.

---

## Section 8 — Astro hydration + JS behaviors (9 cases)

- [ ] **TC-145** [P0] `PageLayout.astro:265-296` — Copy button initializer idempotent across ClientRouter navigations
   - Failure mode: infinite growing button count per soft-nav.
- [ ] **TC-146** [P0] `[slug].astro:527-620` — TOC anchor injection + progress bar + copy link + lightbox + heading anchors re-init on `astro:page-load`
   - Failure mode: navigating post→post kills every interactive behavior (documented v0.50.31 regression).
- [ ] **TC-147** [P1] `[slug].astro:576-597` — Lightbox opens on `.hatch-prose img` click, closes on Esc + backdrop click
   - Expected: `document.body.style.overflow = 'hidden'` while open, restored on close.
- [ ] **TC-148** [P1] `[slug].astro:601-613` — Heading anchors don't double-inject on ClientRouter re-init (`h.querySelector('a[data-hatch-anchor]')` guard)
- [ ] **TC-149** [P0] `PageLayout.astro:174-186` — Speculation Rules API JSON-LD script is `type="speculationrules"`, not `application/json`
   - Failure mode: Chrome ignores prefetch = perf regression.
- [ ] **TC-150** [P1] `PageLayout.astro:192-197` — Partytown only loads when `perf.partytown` is on
- [ ] **TC-151** [P1] `PageLayout.astro:203-224` — Telemetry beacon only fires when `perf.telemetry` on, sends to `/api/telemetry` via `navigator.sendBeacon`
- [ ] **TC-152** [P1] `SiteHeader.astro:250-273` — Color-mode button falls back to `prefers-color-scheme` on first load when `data-hatch-mode="auto"`, sets `localStorage` immediately
- [ ] **TC-153** [P2] `[slug].astro:551-565` — Reading progress bar handles `scrollHeight - clientHeight <= 0` division cleanly (no NaN transform)

---

## Section 9 — Docker + activation lifecycle (7 cases)

- [ ] **TC-154** [P0] `hatch.php:492-585` — `on_activate()` idempotent: re-activate does not rotate `hatch_webhook_secret`
   - Expected: `if (!get_option('hatch_webhook_secret'))` gate honored — comment at lines 496-499.
   - Failure mode: rotation breaks broker-saved secret + every future webhook 401s (called out in code).
- [ ] **TC-155** [P0] `hatch.php:519-528` — Network activation on multisite bails with transient warning, does not proceed
   - Failure mode: shared encrypted tokens across subsites = privacy leak.
- [ ] **TC-156** [P0] `hatch.php:509-516` — Empty `permalink_structure` gets forced to `/%postname%/`; existing custom structure preserved
- [ ] **TC-157** [P1] `hatch.php:535-556` — Application Password cleanup keeps newest 3 per admin, deletes older `Hatch (...)` entries
- [ ] **TC-158** [P0] `hatch.php:711-786` — Uninstall via `uninstall.php` respects `hatch_uninstall_remove_all_data` opt-in (default preserves)
- [ ] **TC-159** [P1] `hatch.php:685-693` — `on_deactivate()` clears the connection-status cron
- [ ] **TC-160** [P2] Docker compose sequence — `docker compose up` boots WP + Astro + starts revalidation flow end-to-end
   - Steps: Follow `QUICKSTART.md`; verify `/features` reachable, post publish triggers revalidate.

---

## Section 10 — Security surface (10 cases)

- [ ] **TC-161** [P0] `hatch.php:31-37` — `DISALLOW_FILE_EDIT` defined on plugin load
   - Failure mode: privilege escalation vector open.
- [ ] **TC-162** [P0] `class-rest-api.php:611-618` — `wpdb->prepare('SHOW TABLES LIKE %s', $table)` gate before raw query
   - Expected: no `phpcs:ignore` for unprepared user input.
- [ ] **TC-163** [P0] `hatch.php:301-311` — `hatch_silence_rest_errors` suppresses `display_errors`/`html_errors` on `rest_api_init`
   - Failure mode: PHP notice HTML prepends to JSON response = REST clients fail parse.
- [ ] **TC-164** [P0] `class-features.php:196-208` — `update()` writes only known catalog slugs, unknown keys ignored
   - Failure mode: options table pollution via API.
- [ ] **TC-165** [P0] `hatch.php:113-152` — CORS never issues `*` origin; scoped to configured frontend URL + platform wildcards
- [ ] **TC-166** [P1] `[slug].astro:349` — `set:html={post.content}` trusts WP `apply_filters('the_content')` output — verify WP KSES + block validation trim `<script>` for non-`unfiltered_html` authors
- [ ] **TC-167** [P1] `Sidebar.astro:99-102` — Custom-HTML widget `set:html` sanitized at WP save via `wp_kses_post` (verify handler)
- [ ] **TC-168** [P1] `class-features.php:305-306` — `RankReady_Bridge::status()` never exposes `hatch_webhook_secret` value — only a `matches_hatch` boolean
- [ ] **TC-169** [P1] `class-rest-api.php:598-635` — Redirection table read uses `esc_url_raw` on `to`, `sanitize_text_field` on `from` before returning to frontend
- [ ] **TC-170** [P2] `hatch.php:85-93` — Admin bar "Visit Site" injects `rel="noopener"` on `target="_blank"` nodes

---

## WordPress.org submission gate (17 explicit items)

These are the reviewer-visible criteria. Each maps to a specific line in `~/.claude/rules/wp-org-plugins.md` or the WP Plugin Directory Guidelines. Every item must pass before zip.

- [ ] **TC-171** [P0] `wp-plugin/readme.txt:5` — `Tested up to: 6.9` matches current WordPress release (bump every cycle)
- [ ] **TC-172** [P0] `wp-plugin/readme.txt:7` — `Stable tag: 0.5.0` matches `hatch.php:23` `HATCH_VERSION`
   - Failure mode: reviewer sees version mismatch → auto-reject.
- [ ] **TC-173** [P0] `wp-plugin/readme.txt` — Explicit `== Privacy & Third-Party Services ==` h2 section listing:
   - Cloudflare Turnstile (if enabled): Terms URL, Privacy URL, data shared, when fired
   - Google Fonts loaded via `fonts.googleapis.com` (`PageLayout.astro:135-149`): Terms + Privacy + trigger condition
   - Optional Partytown CDN `cdn.jsdelivr.net` (`PageLayout.astro:194`): Terms + Privacy + condition
   - Optional Cloudflare/Vercel deploy broker (`hatch.adityaarsharma.com`): Terms + Privacy + when POSTed
   - Failure mode: reviewer's #1 rejection trigger for services-touching plugins.
- [ ] **TC-174** [P0] Grep the entire `wp-plugin/` — zero occurrences of `EDD_SL_*`, `edd_sl_*`, `puc_v[0-9]`, `Puc_v[0-9]`, `plugin-update-checker`, `YahnisElsts`, `wp-update-server` (rule #14 in wp-org-plugins.md)
   - Failure mode: bundled updater = auto-reject.
- [ ] **TC-175** [P0] Grep `wp-plugin/` for `eval\|assert\|create_function\|error_reporting\|ini_set\(\|set_time_limit` — every hit must be justified
   - Note: `hatch.php:303-304` uses `@ini_set('display_errors', '0')` — allowed per REST safety comment. Document in submission notes.
- [ ] **TC-176** [P0] Grep for `update_option\s*\(\s*['"]active_plugins` — must be zero
   - Failure mode: 14 hard rules #2 violation.
- [ ] **TC-177** [P0] Every REST route callback verifies `is_user_logged_in()` or `current_user_can(...)` — enumerated in Sections 2/3 (`permission_authenticated`, `permission_admin`, `__return_true`)
   - For `__return_true` routes (`/features`, `/menus`, `/content`, `/code-snippets`, `/seo-meta`, `/content/list`): confirm each returns only public data.
- [ ] **TC-178** [P0] `wp-plugin/hatch.php:1-19` — Plugin header includes GPLv2+ license, License URI, Text Domain (`hatch`), Domain Path (`/languages`)
- [ ] **TC-179** [P0] Text domain (`hatch`) == WP.org slug — confirm proposed slug matches
- [ ] **TC-180** [P0] Every translatable string wrapped in `__()`/`_e()`/`esc_html__()` with `'hatch'` text domain
   - Grep for translatable strings missing text domain: `grep -rE "__\(\s*['\"][^'\"]+['\"]\s*\)" wp-plugin/` — every match must have `, 'hatch'` second arg.
- [ ] **TC-181** [P0] All superglobals sanitized: `$_GET`/`$_POST`/`$_SERVER` accesses go through `sanitize_text_field(wp_unslash(...))` or equivalent
   - Verify `hatch.php:123-124`, `hatch.php:279`, `class-rest-api.php:345-346`.
- [ ] **TC-182** [P0] `hatch.php:82-88` — Regex on WP row-action `<a>` tag uses `preg_replace` deterministically, no user data spliced
- [ ] **TC-183** [P0] REST responses NEVER inline raw `<script>` echoes in PHP — only JSON-LD via `wp_json_encode()`
   - Note: `hatch.php:264-269` `hatch_sync_design_tokens_to_wp_frontend()` emits `<style>` inline; every interpolated value passes through `esc_attr` (lines 220-227) or `preg_replace('/[^0-9]/')`.
- [ ] **TC-184** [P0] Prefix collision check — all functions/classes use `hatch_`/`Hatch_` prefix (4+ chars, matches `~/.claude/rules/wp-org-plugins.md` registry)
   - Grep: `grep -E "^(function|class) " wp-plugin/**/*.php | grep -vE "^(function|class) (Hatch_?|hatch_)"` should be empty.
- [ ] **TC-185** [P0] `wp-plugin/readme.txt` — Changelog for 0.5.0 present with concrete list of user-visible changes (pivot away from custom blocks, 26 core allowlist, theme consolidation to 3)
- [ ] **TC-186** [P0] `wp-plugin/build/` compiled assets have corresponding source counterparts (rule: minified files need sources)
   - Failure mode: reviewer cannot audit minified JS/CSS.
- [ ] **TC-187** [P0] Zip hygiene — extracted zip re-passes the release gate: no `.git/`, `.wp-org-prefix`, `node_modules/`, source-only build artifacts, or dev-only files
   - Command: `bash ~/.claude/skills/orbit-wporg-release-gate/check.sh wp-plugin --prefix=hatch_ --tested-up-to=6.9` — exit 0 required.

---

## Coverage summary

| Section | Count | P0 | P1 | P2 | P3 |
|---|---|---|---|---|---|
| 1 — Core Gutenberg blocks × 3 themes | 78 | 22 | 40 | 12 | 4 |
| 2 — REST API | 18 | 9 | 9 | 0 | 0 |
| 3 — Menu wiring | 11 | 3 | 5 | 3 | 0 |
| 4 — Dark mode + theme resolution | 9 | 4 | 5 | 0 | 0 |
| 5 — Allowlist + theme.json locks | 10 | 4 | 4 | 2 | 0 |
| 6 — Sidebar + related posts | 9 | 2 | 4 | 3 | 0 |
| 7 — Archive routes + pagination | 9 | 3 | 5 | 1 | 0 |
| 8 — Astro hydration + JS | 9 | 2 | 6 | 1 | 0 |
| 9 — Docker + activation | 7 | 3 | 2 | 1 | 0 |
| 10 — Security surface | 10 | 5 | 4 | 1 | 0 |
| WP.org submission gate | 17 | 17 | 0 | 0 | 0 |
| **Total** | **187** | **74** | **84** | **24** | **4** |

Ship gate: every P0 must pass. P1 failures require documented rationale in `wp-plugin/CHANGELOG.md` under 0.5.0. P2/P3 tracked for 0.5.1.

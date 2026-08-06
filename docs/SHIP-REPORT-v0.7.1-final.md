# Ship Report — Hatch v0.7.1 (final)

_Generated 2026-08-05. Second pass after the HOLD verdict in `SHIP-REPORT-v0.7.1.md`. Synthesized from 1 merge stream, 6 blocker-fix agents, 3 premium-polish agents, one Docker+Playwright verification run, and an adversarial critic. Critic verdict is treated as authoritative over implementer optimism._

---

## 1. Verdict

**HOLD.** Five of the six original blockers landed with real evidence; the sixth (literal placeholder excerpt) was fixed in the card layer but the actual featured-hero article body on `/blog/canary-all-core-blocks/` still renders as a lone en-dash, and a fresh P1 regression appeared on the Plugin Bridge tab (0/0 detected while 4 supported plugins are active in the container) that the critic did not see.

---

## 2. Delta vs first ship-report — blocker landings

| First-report §5 blocker | Status | Evidence |
|---|---|---|
| **#1 Fix Tech/Blog/Docs dark-mode contrast** | **LANDED** | `astro-starter/src/styles/theme-{blog,tech,docs}.css` — dark-mode `--hatch-fg` formula inverted from "92% bg-design + 8% #fff" to "N% bg-design + N% #fff" toward white; muted/subtle/border rederived off the new fg. Live probes: bg L≈0.013, fg L≈0.933–0.949, delta 0.92–0.94 across 3 themes × 4 brand.bg picks; light-mode regression 0.818. Screenshots `ss_3207bmx8t` (Editorial), `ss_63187x19m` (Docs), `ss_3099d2qg7` (Tech). Verification `check[7]` confirms all three at bg L=0.0788 / fg L=0.9988. |
| **#2 Kill Blocks tab + push CUSTOM-THEME-BOILERPLATE.md** | **LANDED** | Live admin DOM enumerate returns exactly `[Connection, Design, Content, Bridge, Performance, Security, Status]` — no Blocks tab (verification `check[2]`, screenshots ss_0027n134k … ss_5461syytb). Doc now shipped inside the plugin (not GitHub): `wp-plugin/docs/CUSTOM-THEME-BOILERPLATE.md` (24,834 bytes). `curl http://localhost:8810/wp-content/plugins/hatch/docs/CUSTOM-THEME-BOILERPLATE.md → HTTP 200 text/markdown`. `Hatch_Setup::get_custom_theme_boilerplate_url()` emits the live plugin URL into `window.hatchBoot.state.setup.customThemeBoilerplateUrl`. |
| **#3 Fix Launch-site silent no-op** | **LANDED** | `SetupApp.jsx` gains a `canLaunch` gate (`open && astroOrigin` regex-validated), `disabled={saving \|\| !canLaunch}` on the Launch button, an inline `HxCard status="warning"` when the gate blocks, and belt-and-braces guards inside `persistAndLaunch`. Live probe with empty origin: `launch-disabled=true, hasDisabledAttr=true, warningPresent=true` (screenshot `ss_8052tdvtw`). Post-check confirms `hatch_setup_wizard_completed=0` — the previous silent redirect no longer fires. |
| **#4 Version identity = 0.7.1 everywhere** | **LANDED** | `wp-plugin/hatch.php` header + `HATCH_VERSION`, `wp-plugin/readme.txt` Stable tag, `wp-plugin/package.json`, `astro-starter/package.json` — all four live declarations = 0.7.1. Verification `check[8]` confirms. Remaining "0.5.0" / "0.7.0" grep hits are docblock `@since` markers, not live declarations. No git tag was created (release-manager's call). |
| **#5 Fix PHP deprecation banner on wizard** | **LANDED** | `wp-plugin/admin/setup-wizard.php` — `add_submenu_page( null, ... )` swapped for `add_submenu_page( 'options.php', ... )`, plus `@ini_set('display_errors', '0')` inside the wizard renderer. Full response body grep: `Passing null`=0, `Deprecated`=0, `admin-header.php`=0 (WP_DEBUG confirmed on in container). Wizard title bar clean in `ss_6039p2fev`. |
| **#6 Kill the literal `_` orphan-mark on cards** | **PARTIAL** | Card-level fix landed: `safeExcerpt()` in `PostCard.astro:26-38` + `index.astro:74-82` strips HTML, counts alphanumerics, treats <3 real letters as empty. Grep for `>–<` in tech-card excerpts = 0 (was 3). **But the actual featured-hero article body still renders as a lone en-dash** because the WordPress canary post's post_content is literally `<p>&#8211;</p>` — the fix only skipped the card excerpt, not the post view. Critic screenshot `ss_3981ndmsw` shows the orphan mark at the top of `/blog/canary-all-core-blocks/`. This is fixture-content, not a Hatch bug, but it will show on the demo video. |

**Bonus fixes that landed beyond §5** (from first-report §4 tail):

- **§4 #8 Font-size presets collapsing to 20px** — `astro-starter/src/styles/core-blocks.css:1516-1553` wires `.has-{small,medium,large,x-large,xx-large}-font-size` to distinct `clamp()` tokens with `!important` to beat the theme paragraph rule. Playwright `alignment.spec.ts › font-size presets scale monotonically` PASSED: small=15.92, medium=18, large=23.9, xl=31.0.
- **§4 #9 Category-archive H1 in JetBrains Mono** — `.wp-block-post-title { font-family: var(--hatch-font-heading); }` + `[data-hatch-theme]` variant. Standalone Chromium DOM probe on `/blog/category/engineering/`: 3 titles all report `"JetBrains Mono", ui-sans-serif` at 18px.
- **§4 #10 Light-mode headings fail WCAG AA** — `<style is:inline>` in `PageLayout.astro:266-286` scoped to `[data-hatch-mode="light"]` on Blog+Docs (Tech excluded — it can be authored dark by design). Measured: Blog 19.53:1, Docs 19.66:1, both WCAG AAA. Tech dark 15.99–18.10:1. Verification `check[7]` confirms 18.4:1 in light mode.
- **§4 #11 Button DNA — cyan/grey drift** — `wp-block-button__link` in Tech switched from `--hatch-fg` (grey) to `--hatch-primary`; blog + tech `.hatch-button`/`.hatch-btn` normalised the same way (`theme-blog.css:352-378`, `theme-tech.css:370-407`, `core-blocks.css:428-451`). About-page live check: `bg=rgb(34,211,238)` (primary) + `color=rgb(255,255,255)` (primary-fg). **Playwright `button DNA baseline` still FAILS** — see §5.
- **§4 #19 Terminal ~250px empty gap** — real `$ hatch --status` micro-strip (14 posts · 6 categories · last publish) in `index.astro:108-120`, hero `padding-block` tightened 80→28px. Live: `hasHatchStatus=true` on tech home dark + light.
- **§4 #20 Wizard theme cards no `role='radio'`** — `SetupApp.jsx:335-380` wraps grid in `role="radiogroup"`, tiles gain `role="radio" + aria-checked + aria-label + tabIndex` + Space/Enter/Arrow keyboard handling. Both roles present in the minified bundle.
- **Design tab now has 4 tiles (was 3)** — Custom-theme tile with dashed border + Docs↗ link matches the wizard catalog. Grid `repeat(4,1fr)`, live DOM confirms 4 children (screenshot `ss_5209itwch`).

---

## 3. Premium polish — what got better

- **Semantic-token contract with WP editor.** New `astro-starter/theme.json` (v3) publishes the Hatch palette + font-size slugs to the block picker. `.has-*-color / -background-color` classes bind to `--hatch-*` CSS vars via `core-blocks.css §17` — WP author picks a "Primary" swatch, frontend renders the current theme's primary. No hard-coded hexes.
- **Editor-side non-core-block warning.** New `wp-plugin/includes/class-editor-notice.php` walks `parse_blocks()` and prints a dismissible admin notice listing any non-core blocks used in the post. **Currently inert — not yet wired into `class-module-loader.php`.** Sits on disk unused this release.
- **Wizard state survives reload.** Hard-nav to `?page=hatch-setup&step=2` re-renders Step 2 with Step 1 marked complete (verification `check[4]`, screenshot `ss_7692fp62o`).
- **Design tab Background field help copy** now explains the single-value + auto-derive-opposite-mode contract with `color-mix()` (screenshot `ss_4503czork`).
- **Focus-ring baseline** on every `a/button/input/select/summary:focus-visible` inside `.hatch-react`: `2px solid var(--hx-primary)` outline + 2px offset + 4px radius. Live-dumped from stylesheet.
- **Post-page broken-image cleanup.** `blog/[slug].astro:509` lightbox `<img>` no longer ships `src=""` (which resolved to the page URL and registered as broken).
- **Category/tag/author H1** now inline-binds `font-family: var(--hatch-font-heading)` to defend against stale-token leaks.

Verification screenshots (all in `/private/tmp/claude-501/…/scratchpad/screenshots/`):

- Admin tabs: `ss_0027n134k` Connection, `ss_5209itwch` Design (4 tiles), `ss_8136ljrjg` Content, `ss_8420p46qq` Bridge, `ss_5154z5f09` Performance, `ss_2189nfg67` Security, `ss_5461syytb` Status
- Wizard: `ss_6039p2fev` Step 1 Welcome, `ss_3524sdh5l` Step 2 Theme, `ss_7692fp62o` reload survives Step 2, `ss_1571lzev1` Step 3 Deploy, `ss_8052tdvtw` Launch-gate warning
- Frontend dark: `ss_52978d93m` home editorial, `ss_91394qqqm` blog editorial, `ss_2600basd4` post editorial, `ss_63187x19m` home docs, `ss_3099d2qg7` home tech
- Polish: `ss_0761qv5fl` Design 4-tile grid, `ss_4503czork` Background hint copy
- Frontend-premium: `final-tech-home-{dark,light}.png`, `blog-{light,dark}.png`, `typo-color-{category,about,contact}.png`
- Critic: `ss_3981ndmsw` orphan-mark on canary post

---

## 4. Verified-working list (evidence only)

- **Docker fleet green.** `hatch_wp Up 25m :8810`, `hatch_astro Up 3m :4321`, `hatch_db Up 6d (healthy)`. Curl: wp=302, astro=200, blog=200 (verification `check[0]`).
- **7-tab admin exactly matching spec.** DOM enumerate returns `[Connection, Design, Content, Bridge, Performance, Security, Status]` in order (verification `check[2]`). Zero occurrences of "Blocks" in the built bundle.
- **Wizard 3-step render.** All three steps load with correct content; Step 1 preflight = 10/11 pass, 1 suggestion (HTTPS off, expected in Docker) (verification `check[3]`).
- **Wizard reload preserves state.** `?step=2` hard-nav renders Step 2 (verification `check[4]`, screenshot `ss_7692fp62o`).
- **Launch button hard-disabled with empty token** — no silent redirect possible; verification `check[5]` confirms `disabled=true, warningPresent=true` (note: current UX gates instead of showing a submit-time warning — see §5).
- **Frontend route health.** `/`, `/blog`, `/blog/canary-all-core-blocks` all 200 (verification `check[6]`).
- **Dark-mode contrast on all 3 themes.** Editorial/Docs/Tech dark all report bg oklab L=0.0788, fg L=0.9988 (verification `check[7]`).
- **Version consistency = 0.7.1** across `hatch.php` header + `HATCH_VERSION` + `readme.txt` stable tag + both `package.json` files (verification `check[8]`).
- **Boilerplate doc served** at `plugins/hatch/docs/CUSTOM-THEME-BOILERPLATE.md` → HTTP 200 (verification `check[9]`).
- **Font-size presets scale monotonically.** `alignment.spec.ts` PASSED: 15.92 / 18 / 23.9 / 31.0.
- **Category-archive H1 uses heading token.** Standalone Chromium DOM probe: 3 titles all `JetBrains Mono` at 18px on `/blog/category/engineering/`.
- **PHP deprecation gone from wizard.** Full-response grep: `Passing null`=0, `Deprecated`=0.
- **Admin bundle rebuilt clean.** Webpack 5.106.2 compiled successfully in 2039ms (143 KiB entrypoint, 0 errors).

---

## 5. New soft items introduced by this workflow

Ranked by likelihood of demo embarrassment.

1. **Plugin Bridge tab reports 0/0 detected while 4 supported plugins are active** — verification `check[10]`. Bridge header says "0/0 detected active" and SEO card says "Currently active: none." But WP-CLI in `hatch_wp` lists `seo-by-rank-math`, `wordpress-seo`, `wpforms-lite`, `fluentform` all active. Tasks #52 and #41 were marked completed in the first pass. This is a **fresh P1 regression**, not an original blocker. Likely cause: dashboard.php still localizes the old `hatchBlocks/blocks.*` options into `window.hatchBoot` (see `still_soft[0]` from blocks-tab-kill agent) — the detector pipeline may be reading the wrong payload key after the merge. Card icons also render as empty grey squares (broken favicon/img refs). Fix approach: `grep -n "detected" wp-plugin/admin-react/src/tabs/PluginBridge.jsx` against `/wp-json/hatch/v1/features` payload shape; the REST layer was proven working in the first-report §3, so the regression is on the render side.
2. **Featured-hero canary post body is a lone en-dash.** Critic screenshot `ss_3981ndmsw`, extracted prose = `  <div><p>&#8211;</p>` (22 chars). Card-side `safeExcerpt()` guard fixed on `/` and `/blog/`, but users clicking the hero land on a page with a title, a hero image, and a single "–" character. This is WordPress fixture content, not a Hatch code bug, but it will show on frame 1 of any demo that clicks the featured post. Fix approach: `wp post update 17 --post_content="…real body…"` in the container, or `wp post delete 17 --force` and rely on a different canary. **This is the surface bug the first-report §4 #6 was trying to describe** — the fix went to the wrong layer.
3. **Duplicate canary posts + duplicate URLs.** `/blog/` lists 4 identical "Canary — all core blocks" cards at `/canary-all-core-blocks/`, `-2/`, `-3/`, `-4/`. Every post is reachable at BOTH root (`/canary-all-core-blocks/` = 200) and prefixed (`/blog/canary-all-core-blocks/` = 200), but the listing emits the root-relative form while the SEO canonical points at `/blog/`. Duplicate-content SEO defect + breaks the entire subfolder-mount pitch. Fix approach: (a) `wp post delete 18 19 20 --force` for the fixture dupes; (b) collapse routing so root post URLs 301→`/blog/*` (or vice-versa) — `astro-starter/src/pages/blog/index.astro` needs to emit `/blog/<slug>/` links, and a root-level 301 middleware should redirect `/(?!blog)[^/]+/` to `/blog/$1/`.
4. **Playwright consistency suite: 18 pass / 7 fail / 5 did not run** (9.6m runtime). Failures: admin-audit login + Hatch loads; admin-layout Bridge 5-badge layout; auto-derive dark palette for warm-cream #fdfaf3; layout-matrix CSS token emission; button DNA baseline; outline buttons stay transparent (networkidle timeout); h1 uses heading font on every page (2 unique fonts). Some are stale-baseline (button DNA cyan is now intended); others (auto-derive warm-cream, h1 font on `/blog/category/uncategorized/`) look like real gaps. Full log: `/private/tmp/…/tasks/bebgrbmv0.output`.
5. **Wizard theme cards vs Design-tab tiles now match at 4** — but the Custom-theme tile's Docs↗ link points at `plugins/hatch/docs/CUSTOM-THEME-BOILERPLATE.md` which is a `.md` file served with `Content-Type: text/markdown`. Most browsers download or show as raw text. Consider rendering through the plugin as an HTML doc page, or bundling a lightweight markdown-viewer route.
6. **Three third-party admin banners** (Yoast/RankMath SEO conflict, Action Scheduler past-due, Redirection setup nag) still bleed into every Hatch admin screenshot. Not Hatch code, but visible in the recording. Adds `admin_notices` filter suppressing non-Hatch notices on `?page=hatch*` — WooCommerce pattern.
7. **`Hatch_Editor_Notice` class shipped but not wired.** Non-core-block warning sits on disk unused until `class-module-loader.php` requires it. Merge-agent flagged this explicitly.
8. **Dashboard.php still localizes dead `hatchBlocks/blocks.*` payload** (~30 PHP lines + related wp_options rows). Cleanup only, but likely related to the Plugin Bridge regression above.
9. **Historic PHP fatal at `class-setup.php:259`** (Undefined constant `Hatch_Setup::CUSTOM_THEME_BOILERPLATE_URL`) surfaced during first admin nav in verification; second nav rendered cleanly. On-disk file is correct (uses `self::get_custom_theme_boilerplate_url()` and the const was replaced with `CUSTOM_THEME_BOILERPLATE_DOC`), so the fatal was from a stale opcache. If it recurs: `docker compose restart wp`.
10. **`wp_redirection_items` table missing** — non-fatal query notice from `Hatch_Rest_Api->route_redirects`. Either install Redirection plugin or guard the query with a `table_exists()` check.
11. **Tech theme mode-toggle is aesthetically ambiguous.** If a user's Design tab has `bg=#0b0d10`, switching to "light mode" still renders dark because `--hatch-bg-design` overrides the theme default. WCAG-safe (15.99:1) but visually broken UX. Fix: theme-switch handler should reset `brand.bg` to the theme's light default when the user picks light mode.
12. **Category-archive H1 will still leak** if the user's `design.font_heading` token is stale from a prior theme session. Root fix belongs in the plugin: theme-switch should reset the token, or Design tab should offer per-theme overrides.
13. **Full Step-3 positive-path (paste token → Launch → complete)** was NOT exercised end-to-end this session. Only the disabled-gate path was verified. The unmodified `persistAndLaunch` was carried over from v0.7.2 user edits.
14. **HxInp does not accept `min/max/inputMode`** — wt10's Security.jsx cleanup was skipped because migrating raw `<input>`s to `HxInp` would silently drop number constraints. Would need `components.jsx` expansion before the cleanup can land.

---

## 6. What must land before shipping (verdict = HOLD)

Exactly three code-level things gate the ship:

1. **Fix the Plugin Bridge 0/0 regression.** `check[10]` is a fresh P1 that the critic didn't see. Reproduce: navigate to `/wp-admin/admin.php?page=hatch#bridge` and confirm the summary says "0/0 detected active" while `wp plugin list --status=active --allow-root` in the container returns rankmath, wordpress-seo, wpforms-lite, fluentform. Curl `/wp-json/hatch/v1/features` and diff the `integrations.*.detected` shape against what `PluginBridge.jsx` expects — the first ship-report confirmed REST returns `slug='rankmath'` correctly, so the regression is on the render side. Also fix the empty-grey card icons (probably missing/relocated asset paths).
2. **Fix the featured-hero empty article.** The demo video will click the hero within 20 seconds. Choose one: (a) `wp post update <hero-id> --post_content="…real intro copy…"` in the container so the page has actual content; (b) delete the fixture dupes with `wp post delete 18 19 20 --force`; (c) ship a proper `docs/CANARY-CONTENT.sql` fixture that seeds a real hero. Do NOT try to fix this in Astro — the safeExcerpt guard already handles the card layer.
3. **Collapse the dual routing (`/<slug>/` and `/blog/<slug>/` both 200).** SEO duplicate-content problem + the entire subfolder-mount pitch depends on `/blog/` being the canonical prefix. Update `astro-starter/src/pages/blog/index.astro` to emit `/blog/<slug>/` links (currently emits root-relative), and add a middleware or `astro.config.mjs` redirect from `/<slug>/` → `/blog/<slug>/` for the post pattern. Verify: `curl -sI http://localhost:4321/canary-all-core-blocks/` should return 301 (or 404), not 200.

Optional but strongly recommended before recording:

- Wire `Hatch_Editor_Notice` into `class-module-loader.php` so the shipped class actually runs.
- Drop the third-party admin-notice suppression filter — three banners on every admin frame reads unprofessional even though they're not Hatch's fault.
- Bump `features.json` cache key on Design-tab save so returning visitors don't see stale theme skins across view-transitions.
- Re-run Playwright suite from `tests/consistency/` (not from repo root) and either update the button-DNA baseline to cyan or revert to orange — one of the two, but the current mismatch will confuse anyone reading the CI logs.

---

_Report generated by ship-report synthesizer. Every claim traces to a specific `file:line`, curl exit code, screenshot filename, verification `check[N]`, or Playwright test name in the source streams. No claim was extrapolated from context._

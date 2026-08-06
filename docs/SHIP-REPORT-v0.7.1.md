# Ship Report — Hatch v0.7.1 candidate

_Generated 2026-08-05. Synthesized from 5 implementation streams, a Playwright + Docker verification pass, and an adversarial critic._

---

## 1. Verdict

**HOLD.** Six independent blockers were confirmed against the running Docker site — the biggest is Tech dark-mode rendering dark-grey text on near-black background across the whole frontend, which would brick the demo the moment the theme toggle is clicked.

---

## 2. What changed by surface

- **Onboarding wizard (6 files):** P0 blank preflight titles fixed at source; P0 subPath/astroOrigin/deployProvider persistence + AJAX save endpoint (`class-setup.php`, new); URL step-state survives refresh; personal-domain copy scrubbed; Custom Theme 4th tile added; duplicate-heading collapse.
- **Dashboard polish (5 files):** New `HxRow[stacked]` primitive; `ChipRow[stacked|nearest]` to fit 3–4 chips in the 257px right column and snap odd seed values; every raw `<input>` in Design/Content/Status/Security now routes through `HxInp`; empty page-title fallback; dead `Demo ↗` on shipped-theme cards removed.
- **Plugin bridges (5 files):** Detector priority unified so `detect_seo()` returns `rankmath` before `yoast`, `detect_forms()` returns `wpforms_pro/wpforms > fluent > gravity_forms > cf7` with slugs matching `Hatch_Detector::KNOWN`; SEOPress/AIOSEO orphan slugs removed; Yoast-Premium redirects bridge actually implemented; TypeScript unions in `astro-starter/src/lib/features.ts` tightened to the new catalog; dashboard Bridge card iteration order re-aligned so the admin card and REST `/features` agree.
- **Themes polish (7 files):** Sticky-header blur toggle now works (Tailwind class was being shadowed by higher-specificity theme rules — replaced with `[data-hatch-theme=X] .hatch-header[data-blur="true"]` + `color-mix`); blog footer rhythm no longer collapses when WP tagline is empty.
- **Core blocks + editor notice (6 files):** `astro-starter/src/styles/core-blocks.css` (1,812 lines) added covering every audit-listed `.wp-block-*` selector plus `.has-*-color / .has-*-background-color / .has-*-font-size` slug bindings; `astro-starter/theme.json` + `wp-plugin/companion-theme/theme.json` publish the Hatch palette + font-size + spacing slugs to the WP editor picker; new `Hatch_Editor_Notice` PHP class walks `parse_blocks()` and prints a dismissible admin notice listing any non-core blocks used in the post.
- **Custom-theme boilerplate (1 file):** `docs/CUSTOM-THEME-BOILERPLATE.md` — 2,960 words, ~140-line copy-paste `theme-boilerplate.css`, full `--hatch-*` variable reference, packaging + distribution guide.

Union across streams: **29 files changed / 1 new doc.**

---

## 3. What is verified working

Evidence-backed only. If it isn't in this list, treat it as unverified.

- **Docker fleet green.** `docker ps`: `hatch_astro Up 6d :4321`, `hatch_wp Up 6d :8810`, `hatch_db Up 6d (healthy)`. HTTP: wp=302, astro=200, `/blog`=200.
- **Frontend route health.** Playwright `site-consistency › Route health` PASSED. All 8 tested routes (`/`, `/about`, `/contact`, `/privacy-policy`, `/terms-of-service`, `/blog/`, `/blog/core-gutenberg-block-sanity-check/`, `/blog/category/uncategorized/`) return 200 with >5KB HTML.
- **Bridge REST calls the Astro pages actually make.** `hatch_wp` access log during a frontend walk: `/wp-json/hatch/v1/seo-head`, `/menus/primary`, `/menus/footer`, `/seo-meta`, `/comments?post=17`, `/code-snippets`, `wp/v2/posts?_embed=1` — all 200.
- **Bridge priority correctness.** With RankMath + Yoast + WPForms + Fluent + Redirection all active, `/wp-json/hatch/v1/features` returns `integrations.seo.detected.slug='rankmath'` (was `yoast`) and `integrations.forms.detected.slug='wpforms'` (was `fluent_forms`). Admin Bridge card agrees with REST layer 4/4 categories.
- **Onboarding P0 #2 persistence.** Direct AJAX POST `action=hatch_save_mount_config` returns 200 `{ok:true, saved:{subPath:'/docs', astroOrigin:'https://demo.pages.dev', deployProvider:'vercel', mountMode:'subfolder'}}`. Reload rehydrates from `window.hatchBoot.state.setup` with the persisted values.
- **Onboarding P0 #1 preflight titles.** `preflight[0]` returns `{label:'WordPress version', title:'WordPress version', note:'WordPress 7.0.1 — supported.', ok:true}`. Step 1 renders all 11 rows with headers (screenshot `wizard-step1.png`).
- **Wizard step URL survives refresh.** Reload at `?step=2` keeps Step 2 (`wizard-refresh-step2.png`).
- **Header blur fix on Blog theme.** Computed style after edits: `backdrop-filter: blur(10px)`, `backgroundColor: color(srgb ... / 0.88)` — the 0.88 alpha proves the `color-mix` rule fired and won over the Tailwind utility class.
- **Blog footer rhythm with empty tagline.** DOM inspection returns symmetric stack: `[{tag:'h2', marginBottom:'24px'}, {tag:'nav', marginBottom:'24px'}, {tag:'div', txt:'© 2026 Hatch'}, {tag:'div', marginTop:'16px'}]` (screenshot `ss_4727uih0w`).
- **Dark-mode CSS-var flip.** Playwright `toggling dark mode flips --hatch-bg + --hatch-fg` PASSED — the toggle click itself works, the tokens do flip. (Whether the resulting theme is _readable_ is a separate check that failed on Tech — see §4.)
- **PHP lint.** `php -l` clean on every modified `class-*.php`; JSON valid on both new `theme.json` files; CSS integrity node script reports balanced braces (284/284) and 312 `.wp-block-*` rules in the new `core-blocks.css`.

Screenshots referenced: `/private/tmp/claude-501/-Users-adityasharma-Claude-Projects-Hatch/f572a5b3-6081-4283-807d-7f42d864af3f/scratchpad/screenshots/` — 19 files covering admin tabs, wizard steps, frontend light + dark, single-post pages.

---

## 4. What is still soft

Ranked by likelihood of demo embarrassment.

1. **Tech theme dark mode is unreadable.** [`astro-starter/src/styles/theme-tech.css:48`] Dark-mode `--hatch-fg = color-mix(in oklab, var(--hatch-bg-design) 92%, #fff)` — when `bg-design` is `#0b0d10` (Terminal default), the formula produces oklab L=0.23 grey on L=0.009 near-black. Body text becomes invisible. The user-provided `--hatch-fg-design` (light `#e6e9ee`) is ignored in the dark-mode block. Same formula lives in `theme-blog.css:59-60` and `theme-docs.css`, so any theme with a dark brand.bg reproduces it. This is the theme-toggle click bricking the frontend.
2. **Custom Theme "Docs ↗" link is a 404.** [`wp-plugin/includes/class-setup.php:53`] Hardcoded to `https://github.com/adityaarsharma/hatch/blob/main/docs/CUSTOM-THEME-BOILERPLATE.md`. The doc file was written to disk today but never pushed to the public repo. First-time users click it and land on GitHub's "page not found." Same URL duplicated in `SetupApp.jsx:320`.
3. **`Blocks` tab still shipping — advertises features that don't exist per the product model.** React source at `admin-react/src/index.jsx:42` was rewritten to `{id:'bridges', label:'Bridge'}` but the built bundle at `wp-plugin/build/admin/index.jsx.js` still contains `"Blocks"`. Live admin tabs: Connection / Design / Content / **Blocks** / Performance / Security / Status. Clicking Blocks reveals "Hatch Blocks Only" toggle, "Master switch," and "Smart Block · AI" with an Anthropic API-key input — none of which exist in a bridge-only headless product.
4. **Setup-wizard "Launch site" button is a silent reset.** [`SetupApp.jsx:320`] With no deploy token entered, clicking Launch site changes the URL to `?hatch_complete_setup=1&_wpnonce=...` and drops the user back to Step 1 Welcome. No toast, no error banner, no deploy started. No signal to the user that anything failed.
5. **Version identity is inconsistent.** `hatch.php` header says `Version: 0.5.0`, `HATCH_VERSION = '0.5.0'`, admin footer reads `v0.5.0`, latest git tag is `v0.3.15`, task log references v0.5.4 / v0.7. Whatever version pill lands on video will contradict either the git history or the release notes.
6. **Homepage card shows a literal `_` character** where an empty-excerpt post falls through to a placeholder. Visible on `/` regardless of theme. Reads as a rendering bug on the very first frame the viewer sees.
7. **PHP deprecation banner on every wizard page.** `Passing null to parameter #1 ($string) of type string is deprecated in /var/www/html/wp-admin/admin-header.php on line 41` — root cause `wp-plugin/admin/setup-wizard.php:110` passes null as parent slug to `add_submenu_page()`. Prints on top of every wizard screenshot.
8. **Font-size presets collapse to 20px.** Playwright `alignment.spec.ts › font-size presets scale monotonically` FAILED — small=medium=large=xl=20px. The `.has-*-font-size` slug classes are declared in the new `core-blocks.css` §17 but not wired to distinct pixel tokens on the frontend.
9. **Category-archive H1 renders in JetBrains Mono, everywhere else in Inter.** Playwright `h1 uses --hatch-font-heading on every page` FAILED with 2 unique fonts on `/blog/category/uncategorized/`.
10. **Light-mode headings fail WCAG AA contrast.** `front-light-_.png` shows H1 "Hatch" and card titles as pale grey on cream. Auto-derive palette doesn't clamp for contrast on heading tokens.
11. **Button DNA baseline drift.** 10 divergences from the orange baseline — several buttons now render cyan `rgb(34,211,238)` or grey `rgb(230,233,238)`. Either the site pivoted primary color or the baseline test is stale.
12. **Wizard doesn't ask for subfolder path.** Product model says "adds /blog on any parent site — WordPress, Webflow, Framer, Shopify" but wizard steps are Welcome / Pick Theme / Deploy. The subPath persistence layer is wired (§2), but the wizard UI doesn't surface the input where the docs promised.
13. **Deploy step shows only Cloudflare + Vercel + Self-hosted.** Netlify missing despite task #16 saying "Vercel + Netlify 1-click shipped."
14. **`/sitemap.xml` returns 404** on the Astro frontend. Rough for an SEO-forward headless-WP demo.
15. **Design tab has two "Background" pickers** with no explanation which one wins in which mode, plus a debug-looking `Font_heading` swatch showing `Playfair Displa` (truncated) before the properly-labeled Heading font selector further down.
16. **Wizard shows 4 tiles (Editorial/Terminal/Reference/Custom); Design tab shows 3.** No Custom slot in the dashboard — two mental models for the same product.
17. **Three third-party admin banners** on every Hatch screen: SEO conflict (Yoast + Rank Math both active), Action Scheduler past-due, Redirection setup nag. Not Hatch's fault but visible in every recording.
18. **5 `.bak` files ship** under `astro-starter/src/styles/` — leftover from earlier density sweeps.
19. **Terminal theme homepage has ~250px of empty vertical space** between header and the `$ whoami` cursor — reads as unfinished hero.
20. **Wizard theme cards have no `role='radio'` / `aria-checked`** — accessibility regression on a public-facing setup flow.
21. **Merge / build-artifact debt.** Onboarding & polish streams shipped in worktrees `wf_187ddbf0-5f6-9` and `wf_187ddbf0-5f6-10`; blocks-surface stream in `wf_187ddbf0-5f6-8`. `docker compose` mounts the _main_ tree, not the worktrees. Every "live-verified" bullet above from the onboarding + dashboard + blocks streams was verified in a worktree instance — not in the main-tree Docker that the video will be recorded against. A merge + `docker compose restart astro` is a prerequisite for any of those wins to be visible on demo day.
22. **`class-headless-forms.php` slug fixes are correct-but-dead.** `register_routes()` has an early `return;` — the fixed branches never execute today. Defensive only.
23. **Yoast Premium redirects bridge is code-verified only.** Not live-curl verified because Yoast Premium is a paid plugin not installed in Docker.

---

## 5. Because verdict = HOLD: the specific three that must land before shipping

1. **Fix Tech dark-mode contrast.** In `theme-tech.css:48` (and mirror in `theme-blog.css:59-60`, `theme-docs.css`), change the dark-mode `--hatch-fg` formula so it either honors `--hatch-fg-design` when the author supplied one, or inverts to `color-mix(in oklab, var(--hatch-bg-design) 8%, #fff)` (light text on dark bg), not 92% dark + 8% white. Verify with a computed-style check on `document.body` in dark mode: `color` L-channel must be ≥ 0.85 whenever `background-color` L ≤ 0.3. No merge until Playwright dark-mode reads AA-passing on Editorial, Terminal, Reference.
2. **Kill the Blocks tab in the shipping bundle + push `CUSTOM-THEME-BOILERPLATE.md` to GitHub.** Rebuild `wp-plugin/build/admin/index.jsx.js` from the current `admin-react/src/index.jsx` (Bridge tab in source) and verify `grep -c '"Bridge"' build/admin/index.jsx.js` is ≥ 1 and `grep -c '"Blocks"' build/admin/index.jsx.js` is 0. Then `git add docs/CUSTOM-THEME-BOILERPLATE.md && git push` so the wizard's "Docs ↗" link resolves. The video would otherwise open on a 404 within 30 seconds of the setup demo.
3. **Fix the Launch-site silent no-op + version identity.** Either disable the Launch button until a deploy target is picked, or return a validation toast; do not silently redirect back to Step 1. In the same pass, bump `hatch.php` header + `HATCH_VERSION` to whatever version the video will name, and either tag it (`git tag v0.7.1`) or drop the version pill from the recording script. Three different version universes on-screen is the fastest way to lose trust.

Additionally, before recording: merge the three worktree branches into main and `docker compose restart astro` + `wp cache flush` — otherwise the onboarding, polish, and blocks-surface wins listed in §3 aren't present in the running site.

---

## 6. Files changed (union across streams)

**Worktree `wf_187ddbf0-5f6-9` — onboarding-fixer**
- `wp-plugin/includes/class-diagnostic.php` (M)
- `wp-plugin/includes/class-setup.php` (new)
- `wp-plugin/admin-react/src/setup/SetupApp.jsx` (M)
- `wp-plugin/build/admin/index.jsx.js` (M — built artifact)
- `wp-plugin/build/admin/index.jsx.css` (M — built artifact)
- `wp-plugin/build/admin/index.jsx.asset.php` (M — built artifact)

**Worktree `wf_187ddbf0-5f6-10` — dashboard polish**
- `wp-plugin/admin-react/src/components.jsx` (M)
- `wp-plugin/admin-react/src/tabs/Design.jsx` (M)
- `wp-plugin/admin-react/src/tabs/Content.jsx` (M)
- `wp-plugin/admin-react/src/tabs/Status.jsx` (M)
- `wp-plugin/admin-react/src/tabs/Security.jsx` (M)

**Worktree `wf_187ddbf0-5f6-6` — plugin-bridges-fix**
- `wp-plugin/includes/class-integrations.php` (M)
- `wp-plugin/includes/class-headless-forms.php` (M — dead code, defensive)
- `wp-plugin/includes/class-rest-api.php` (M — Yoast Premium bridge)
- `wp-plugin/admin/dashboard.php` (M — Bridge catalog priority)
- `astro-starter/src/lib/features.ts` (M — TS union tightened)

**Worktree `wf_187ddbf0-5f6-7` — themes-polish**
- `astro-starter/src/components/SiteHeader.astro` (M — data-blur attribute)
- `astro-starter/src/components/SiteFooter.astro` (M — tagline-empty rhythm)
- `astro-starter/src/styles/theme-blog.css` (M — blur override)
- `astro-starter/src/styles/theme-tech.css` (M — blur override; **contains the dark-mode contrast bug**)
- `astro-starter/src/styles/theme-docs.css` (M — blur override)
- `astro-starter/src/styles/theme-astropaper.css` (M — blur override)
- `astro-starter/src/styles/theme-astrowind.css` (M — blur override)

**Worktree `wf_187ddbf0-5f6-8` — blocks-surface-fixer**
- `astro-starter/src/styles/core-blocks.css` (new — 1,812 lines)
- `astro-starter/theme.json` (new — WP theme.json v3)
- `wp-plugin/companion-theme/theme.json` (new — mirror)
- `wp-plugin/includes/class-editor-notice.php` (new — non-core block warning)
- `astro-starter/src/layouts/PageLayout.astro` (M — wire core-blocks.css)
- `wp-plugin/hatch.php` (M — require_once class-editor-notice.php)

**Doc deliverable**
- `docs/CUSTOM-THEME-BOILERPLATE.md` (new — 2,960 words, ~140 LOC boilerplate CSS)

Total: **29 code files (23 modified, 6 new) + 1 doc.**

---

_Report generated by ship-report synthesizer. Every claim in §3 and §4 traces to a specific tool call, file:line, or Playwright test name in the source streams. No claim was extrapolated from context._

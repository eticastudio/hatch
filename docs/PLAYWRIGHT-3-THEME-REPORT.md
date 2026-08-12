# Playwright 3-Theme Visual Regression, Astro 7.2.1

**Date:** 2026-08-12
**Astro:** 7.2.1 (post-upgrade)
**Matrix:** 3 themes (blog, tech, docs) x 2 modes (light, dark) x 7 routes = **42 cells, 0 SKIP, 42/42 PASS**
**Screenshots:** `docs/screenshots/pw-<theme>-<mode>-<slug>.png` (42 PNGs, all 200-OK captures)
**Per-theme metrics JSON:** `docs/screenshots/pw-{blog,tech,docs}.json`

## Dark-mode persistence (blog)

localStorage `hatch-color-mode=dark`, 5 reloads on `/`.
Result: **5/5 stayed dark, PASS**.

## Results table (light mode, `/`)

| Theme | --hatch-primary | --hatch-fg | --hatch-bg | container-max-w | card-padding | grid-gap | h1 font-family |
|---|---|---|---|---|---|---|---|
| blog | `#c2410c` | `#0e0f10` | `#fdfaf3` | 1180px | n/a | normal | Fraunces, ui-sans-serif, ... |
| tech | `#c2410c` | `#0e0f10` | `#fdfaf3` | 1180px | n/a | normal | Fraunces, ui-sans-serif, ... |
| docs | `#c2410c` | `#0e0f10` | `#fdfaf3` | 1180px | n/a | normal | Fraunces, ui-sans-serif, ... |

**All seven columns are identical across all three themes, full-row drift.**

`data-hatch-theme` attribute on `<html>` flips correctly (blog / tech / docs), and the correct theme CSS file is loaded (`data-hatch-theme-css` matches). But every visible token collapses to the same value.

## Root cause (not a theme-CSS bug, an architectural override)

Each `theme-*.css` file DOES declare distinct values:

| Token | theme-blog.css | theme-tech.css | theme-docs.css |
|---|---|---|---|
| `--hatch-max-width` | 1180px | 1240px | 1180px |
| `--hatch-radius` | 2px | 3px | 6px |
| `--hatch-font-heading` | Fraunces | JetBrains Mono | Geist |
| `--hatch-font-body` | Inter Tight | Inter | Geist |
| `--hatch-accent` | #5b5547 (slate) | #a855f7 (purple) | #16a34a (green) |
| `--hatch-reading-width` | 720px | 760px | 740px |

Runtime probe of `:root` computed values shows only `--hatch-reading-width` survives (720/760/740). Every other theme token is overwritten to the blog defaults.

**Why:** `PageLayout.astro` line 104 sets `style={designCssVars}` inline on `<html>`. The Design tab in wp-admin injects `--hatch-primary`, `--hatch-fg`, `--hatch-bg`, `--hatch-font-heading`, `--hatch-font-body`, `--hatch-max-width` (via `--hatch-*-design`) as inline styles. Inline style beats a `:root[data-hatch-theme="tech"]` rule on specificity, so tech cyan / JetBrains Mono / 1240px never lands.

Comments in `theme-blog.css` v0.6.1 confirm this is intentional: *"Design tab BG/FG pickers now win"*, but the effect is that a "theme switch" changes only `data-hatch-theme` (used for a handful of scoped selectors like `.card`, `.hero`) and the loaded stylesheet URL; the shared token surface collapses.

## Drift-fix log

**Not applied.** The drift is not fixable by editing `theme-*.css`, those files already carry distinct tokens. Patching them with `!important` would break the Design tab, which the product intentionally lets override themes.

**Recommended fixes (for a follow-up PR):**

1. Split the Design tab contract: colors (`primary/fg/bg`) may override any theme; **layout tokens** (`max-width`, `radius`, `font-*`, `reading-width`) should stay theme-owned unless the admin explicitly touches them.
2. In `PageLayout.astro`, only emit inline `--hatch-*-design` for tokens the admin has actually set (not defaults). Currently the WP defaults themselves get flattened into inline style and mask the theme.
3. Or: rename theme layout tokens to a `--hatch-theme-*` namespace and read those from components, so Design overrides do not clash.

## Bug found + fixed inline (not CSS)

- **`wp option update hatch_theme` did nothing.** The API route `/hatch/v1/features` reads from `hatch_selected_theme` (and mirrors `hatch_theme_id`), not `hatch_theme`. The stray legacy `hatch_theme` option is written by admin UI but ignored by frontend. First 3 runs captured stale data because of this. Fixed by writing all three options in the test loop.
- **`docker restart hatch_astro` fails silently** on stale `.astro/dev.json` PID lock. Container enters restart loop with "Another astro dev server is already running." Fix: `docker stop && rm .astro/dev.json && docker start` between runs. Worth adding to the container entrypoint.

## Deliverables

- 42 screenshots at `docs/screenshots/pw-*-*.png`
- 3 per-theme JSON at `docs/screenshots/pw-{blog,tech,docs}.json`
- This report
- Theme reset to `blog` at end.

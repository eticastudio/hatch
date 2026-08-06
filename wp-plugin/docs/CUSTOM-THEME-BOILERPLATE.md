# Custom Theme Boilerplate

> Build your own Hatch-compatible theme in an afternoon. This is the 4th tile in the theme wizard — the "Custom" slot — and this doc is what you download when you pick it.

Hatch ships with three themes: **Editorial** (`blog`), **Terminal** (`tech`), **Reference** (`docs`). Each is a single CSS file, ~500-600 lines, layered on top of a shared 1,700-line core stylesheet that already knows how to render every WordPress core Gutenberg block. Your theme adds visual language on top; you never write render code.

---

## 1. What a Hatch theme actually is

A Hatch theme is one CSS file (`theme-<name>.css`) that lives inside `astro-starter/src/styles/` in the frontend build. When a visitor loads a page:

1. The Astro layout sets `<html data-hatch-theme="<name>" data-hatch-mode="light|dark|auto">` — see [PageLayout.astro:105](../astro-starter/src/layouts/PageLayout.astro).
2. It injects the user's Design-tab picks (brand color, fonts, density, radius, max-width) as inline CSS variables on that same `<html>` element — [lib/design.ts:71](../astro-starter/src/lib/design.ts).
3. It loads the shared `core-blocks.css` (base rules for every `.wp-block-*` selector inside `.hatch-prose`).
4. It loads your theme file, which owns the visual language.

Your file's job is to **define the palette derivations, typography, section rhythm, and layout chrome** (header, footer, hero, card grid). The core file already handles the mechanics of every Gutenberg block; you just tune the look.

Themes are **CSS-only**. There is no theme-side JavaScript hook. Interactive behavior (mobile drawer, code-block copy button, prefetch) is owned by the shared Astro components and works identically across all themes.

---

## 2. Design token reference

Everything in your theme derives from three groups of variables.

### 2a. Tokens the Design tab writes (do not redeclare these — read them)

These arrive as inline `style=""` on `<html>` from the WordPress admin's Design tab. They win over any theme default. Your job is to **use them**, not override them.

| Variable | Purpose | Example |
|---|---|---|
| `--hatch-primary` | Brand accent — links, buttons, category eyebrows, focus rings | `#c2410c` |
| `--hatch-primary-fg` | Text color on top of primary (button label, cover-overlay text) | `#ffffff` |
| `--hatch-accent` | Secondary accent (small chips, tertiary lines) | — |
| `--hatch-bg-design` | User's raw background pick — theme wraps it: `var(--hatch-bg-design, #your-default)` | `#fdfaf3` |
| `--hatch-fg-design` | User's raw foreground pick — same wrapping pattern | `#0e0f10` |
| `--hatch-font-heading` | Display font family stack | `'Fraunces', serif` |
| `--hatch-font-body` | Body font family stack | `'Inter Tight', sans-serif` |
| `--hatch-font-mono` | Mono font family stack | `'JetBrains Mono', monospace` |
| `--hatch-density` | Spacing scalar: `0.75` compact, `1` comfortable, `1.25` spacious | `1` |
| `--hatch-radius` | Container radius (cards, images, panels) | `10px` |
| `--hatch-button-radius` | Button-only radius (may differ from container) | `9999px` (pill) |
| `--hatch-max-width` | Content column max width | `1160px` |
| `--hatch-border-color` | Border override | `#e5e5e5` |
| `--hatch-shadow` | Card shadow token | one of the SHADOW_MAP values |
| `--hatch-space-1` … `--hatch-space-8` | Density-scaled spacing scale, `4px` → `72px` | see §5 |

### 2b. Tokens your theme MUST define

Under `:root[data-hatch-theme="<name>"]` set the final concrete values the core stylesheet will read. Every one of these is required — leave one out and blocks flicker onto browser defaults.

| Variable | What it does | Typical derivation |
|---|---|---|
| `--hatch-bg` | Final page background | `var(--hatch-bg-design, #your-default)` |
| `--hatch-fg` | Final body text color | `var(--hatch-fg-design, #your-default)` |
| `--hatch-bg-2` | One step darker/lighter than bg — code blocks, panels, table headers | `color-mix(in oklab, var(--hatch-bg) 92%, var(--hatch-fg))` |
| `--hatch-bg-3` | Two steps — placeholder image bg, card wells | `color-mix(in oklab, var(--hatch-bg) 85%, var(--hatch-fg))` |
| `--hatch-bg-4` | Three steps — rarely used | same pattern, `78%` |
| `--hatch-fg-muted` | Secondary text (excerpts, meta) | `color-mix(in oklab, var(--hatch-fg) 70%, var(--hatch-bg))` |
| `--hatch-fg-subtle` | Tertiary text (dates, captions) | same pattern, `45%` |
| `--hatch-border` | Hairline dividers, card borders | derived from bg toward fg, ~78% |
| `--hatch-border-strong` | Stronger dividers (double-rules, table body) | ~62% |
| `--hatch-reading-width` | Prose column max-width | `720px`–`760px` typical |

Rule of thumb: **the only hex values in your file live in the fallback slot of `var(--hatch-bg-design, HERE)` and `var(--hatch-fg-design, HERE)`**. Every other color is a `color-mix()` derivation. This is why the Design tab can swap brand color and background and your theme still holds together — nothing is hardcoded downstream.

### 2c. Layout chrome tokens (optional, per-theme flair)

Set these on `[data-hatch-theme="<name>"]` selectors:

- Header padding rhythm — `padding-block: calc(40px * var(--hatch-density, 1))` and similar
- Section rhythm — the shared `--hatch-space-*` scale from core-blocks.css (see §5)
- Font-variation-settings for variable fonts (e.g. Fraunces `'opsz' 144, 'SOFT' 50`)

---

## 3. What your theme MUST style

The shared `core-blocks.css` already provides base rules for these. Your theme layers per-theme signatures via `[data-hatch-theme="<name>"] .hatch-prose .wp-block-<name>`. Because the base rules exist, a theme file that only defines the token block from §2b will still render every block acceptably — you're upgrading, not replacing.

### 3a. Core Gutenberg blocks Hatch supports

| Block | Selector | Notes |
|---|---|---|
| Heading | `.wp-block-heading`, `h1`–`h6` | Set font-family, size scale, letter-spacing |
| Paragraph | `.wp-block-paragraph`, `> p` | Line-height, font-size scaling with `--hatch-density` |
| Image | `.wp-block-image` (`img`, `figcaption`) | `--hatch-radius`, caption typography |
| List | `.wp-block-list`, `ul`, `ol` | `::marker` character per theme is a nice signature |
| Quote | `.wp-block-quote`, `blockquote` | Border-left thickness/style is a strong theme signal |
| Pullquote | `.wp-block-pullquote` | Center vs left, border style |
| Code (inline + block) | `code`, `.wp-block-code`, `pre` | Background = `--hatch-bg-2`, font = `--hatch-font-mono` |
| Preformatted | `.wp-block-preformatted` | |
| Separator | `.wp-block-separator` (`.is-style-wide`, `.is-style-dots`) | |
| Table | `.wp-block-table` (`th`, `td`) | Zebra stripes / border style per theme |
| Gallery | `.wp-block-gallery` | Gap tuning |
| Embed / Video / Audio | `.wp-block-embed`, `.wp-block-video`, `.wp-block-audio` | 16:9 aspect enforced in core |
| Columns / Column | `.wp-block-columns`, `.wp-block-column` | Column-gap per theme |
| Cover | `.wp-block-cover` | Overlay text always uses `--hatch-primary-fg` — don't fight this |
| Group | `.wp-block-group` | Boxed section container |
| Button / Buttons | `.wp-block-button__link`, `.wp-block-buttons` | `is-style-outline` variant required |
| Verse | `.wp-block-verse` | Poetry — preserves whitespace |
| Details | `.wp-block-details` (+`>summary`) | Accordion — style the summary chrome |
| File | `.wp-block-file` | Download link + button |
| Query loop | `.wp-block-query`, `.wp-block-post-template` | Post-card grid — see §8 |
| Post pieces | `.wp-block-post-featured-image`, `.wp-block-post-title`, `.wp-block-post-excerpt`, `.wp-block-post-date`, `.wp-block-post-terms`, `.wp-block-post-author` | Card interior |
| Pagination | `.wp-block-query-pagination` (`-next`, `-previous`, `-numbers`) | |
| Widget blocks | `.wp-block-latest-posts`, `.wp-block-categories`, `.wp-block-tag-cloud`, `.wp-block-search` | |
| Alignments | `.alignwide`, `.alignfull`, `.alignleft`, `.aligncenter`, `.alignright`, `.has-text-align-*` | Core handles these — don't fight |
| Font-size presets | `.has-small-font-size` … `.has-xx-large-font-size` | Core handles |
| Style variations | `.is-style-eyebrow`, `.is-style-outline` (button), `.is-style-rounded` (image), `.is-style-wide`/`.is-style-dots` (separator) | |

### 3b. Layout primitives (shared Astro components)

Your theme also styles the site chrome. Class names emitted by [SiteHeader.astro](../astro-starter/src/components/SiteHeader.astro) and [SiteFooter.astro](../astro-starter/src/components/SiteFooter.astro):

- `.hatch-header` + `.hatch-header-inner` + `.hatch-header-<preset>`
- `.hatch-<preset>-brand` / `.hatch-<preset>-nav` / `.hatch-hamburger`
- `.hatch-footer` + `.hatch-footer-wordmark` + `.hatch-footer-tagline` + `.hatch-footer-links` + `.hatch-footer-meta`
- `.hatch-prose` — the article container
- `.hatch-listing` — the blog index root
- `.hatch-form-scope` — the wrapper any embedded form (Fluent Forms, WPForms, CF7, Gravity) is rendered into, so field padding and focus rings match your theme

You do not need to invent new preset names. Ship one preset — reuse `.hatch-header-blog` / `-tech` / `-docs` and let the user pick which matches your palette, or add your own `.hatch-header-<yourname>` block if the shared shape doesn't fit. Both patterns work; the shared shapes are simpler.

---

## 4. Copy-paste HTML skeleton

Below is the whole shape of a Hatch page. Your theme has to look good against this exact HTML.

```html
<html data-hatch-theme="mytheme" data-hatch-mode="light" style="--hatch-primary: #c2410c; --hatch-density: 1; --hatch-radius: 10px; --hatch-button-radius: 9999px; --hatch-max-width: 1160px; --hatch-font-heading: 'Fraunces', serif; --hatch-font-body: 'Inter', sans-serif;">
  <body>
    <header class="hatch-header hatch-header-mytheme">
      <div class="hatch-header-inner">
        <a href="/" class="hatch-mytheme-brand">Site Name</a>
        <nav class="hatch-mytheme-nav">
          <a href="/blog">Blog</a>
          <a href="/about">About</a>
        </nav>
      </div>
    </header>

    <main>
      <article class="hatch-prose" data-hatch-theme="mytheme">
        <h1 class="wp-block-heading">Post title</h1>
        <p class="wp-block-paragraph">Body paragraph.</p>
        <figure class="wp-block-image"><img src="…" alt=""><figcaption>Caption.</figcaption></figure>
        <blockquote class="wp-block-quote"><p>Quote.</p><cite>Attribution</cite></blockquote>
        <pre class="wp-block-code"><code>console.log('hi');</code></pre>
        <div class="wp-block-buttons">
          <div class="wp-block-button"><a class="wp-block-button__link">Primary</a></div>
          <div class="wp-block-button is-style-outline"><a class="wp-block-button__link">Outline</a></div>
        </div>
        <ul class="wp-block-post-template is-layout-grid columns-3">
          <li class="wp-block-post">
            <figure class="wp-block-post-featured-image"><img src="…" alt=""></figure>
            <div class="wp-block-post-terms">Category</div>
            <h3 class="wp-block-post-title"><a href="…">Card title</a></h3>
            <div class="wp-block-post-excerpt">Excerpt.</div>
            <div class="wp-block-post-date">Aug 5, 2026</div>
          </li>
        </ul>
      </article>
    </main>

    <footer class="hatch-footer">
      <div class="hatch-footer-brand">Site Name</div>
      <div class="hatch-footer-meta">© 2026 · Site Name</div>
    </footer>
  </body>
</html>
```

That's the whole surface. If your CSS renders this well, you shipped a theme.

---

## 5. Density system

`--hatch-density` is a single scalar the Design tab writes: `0.75` (compact), `1` (comfortable), `1.25` (spacious). Every spacing value in the core stylesheet is multiplied by it, via the `--hatch-space-*` scale defined in `core-blocks.css`:

```css
:root {
  --hatch-density: 1;
  --hatch-space-1: calc(0.25rem  * var(--hatch-density, 1));  /* 4px  */
  --hatch-space-2: calc(0.5rem   * var(--hatch-density, 1));  /* 8px  */
  --hatch-space-3: calc(0.75rem  * var(--hatch-density, 1));  /* 12px */
  --hatch-space-4: calc(1rem     * var(--hatch-density, 1));  /* 16px */
  --hatch-space-5: calc(1.5rem   * var(--hatch-density, 1));  /* 24px */
  --hatch-space-6: calc(2rem     * var(--hatch-density, 1));  /* 32px */
  --hatch-space-7: calc(3rem     * var(--hatch-density, 1));  /* 48px */
  --hatch-space-8: calc(4.5rem   * var(--hatch-density, 1));  /* 72px */
}
```

**Use these tokens** for every margin/padding/gap in your theme. If you type raw `px` or `rem` values, changing density in the admin does nothing to your surfaces and the user's picker becomes a lie. The only acceptable exception is `1px` hairlines (borders don't scale with density).

For values not on the scale — e.g. custom header padding — wrap the raw value with the scalar: `padding-block: calc(40px * var(--hatch-density, 1))`.

---

## 6. Dark mode

The Astro layout writes `data-hatch-mode="dark"` on `<html>` when the user (or their OS) requests dark. Your theme derives its dark palette from the user's brand background using perceptually uniform `color-mix(in oklab, …)`:

```css
[data-hatch-theme="mytheme"][data-hatch-mode="dark"] {
  --hatch-bg:            color-mix(in oklab, var(--hatch-bg-design, #fdfaf3)  8%, #000);
  --hatch-fg:            color-mix(in oklab, var(--hatch-bg-design, #fdfaf3) 90%, #fff);
  --hatch-bg-2:          color-mix(in oklab, var(--hatch-bg-design, #fdfaf3) 12%, #000);
  --hatch-bg-3:          color-mix(in oklab, var(--hatch-bg-design, #fdfaf3) 18%, #000);
  --hatch-fg-muted:      color-mix(in oklab, var(--hatch-bg-design, #fdfaf3) 65%, #000);
  --hatch-fg-subtle:     color-mix(in oklab, var(--hatch-bg-design, #fdfaf3) 45%, #000);
  --hatch-border:        color-mix(in oklab, var(--hatch-bg-design, #fdfaf3) 18%, #000);
  --hatch-border-strong: color-mix(in oklab, var(--hatch-bg-design, #fdfaf3) 28%, #000);
}
```

This way a user who picks warm cream gets a **warm** dark; a user who picks cool white gets a neutral black. You never hardcode the dark palette — the user's brand tint stays present in dark mode. Every surface (`--hatch-bg-2`, borders, muted text) re-derives automatically because they read `--hatch-bg` in the shared file.

---

## 7. Rules of engagement

- **Do not create Gutenberg blocks.** Hatch is a bridge — WordPress core blocks in, styled HTML out. Custom blocks are unsupported and will trigger an editor warning.
- **Do not import external CSS at runtime.** Fonts are loaded by the layout via `<link>` from the user's Design pick — see `designFontHref` in [lib/design.ts:105](../astro-starter/src/lib/design.ts). Your theme's font stack lists the family names as strings; the layout preloads them.
- **No client-side JavaScript in themes.** Interactive behavior (mobile drawer, code-block copy button, prefetch) is owned by the shared Astro components. If your theme needs behavior that isn't there yet, patch the component in a fork rather than smuggling JS through CSS.
- **Do not fight `.alignfull` / `.alignwide` / `.aligncenter`.** Core handles these with viewport-width math; overriding them breaks landing pages.
- **Do not hardcode colors, sizes, or fonts** past the fallback slot of the two `var(--hatch-*-design, DEFAULT)` calls. Everything else derives.
- **Do not remove `--hatch-primary-fg` from cover-overlay text.** The core file enforces this — overlays are dark by default and the primary-fg is white in nearly every theme. Fighting it produces invisible text on some Design picks.

---

## 8. Layout primitives

**Header.** The starter emits three preset shapes today (`blog`, `tech`, `docs`). The blog shape is a wordmark + nav + optional actions row separated by a hairline rule. The tech shape is a mono-brand + inline nav. The docs shape is a centered wordmark + version chip + sidebar toggle. Pick whichever your palette fits, or add `.hatch-header-<yourname>` and style it fresh. `.hatch-header-inner` is always the flex container.

**Footer.** Same story — three shapes today: centered 3-up (blog), terminal-prompt (tech), left-aligned brand (docs). Class contract: `.hatch-footer-wordmark` / `.hatch-footer-brand` / `.hatch-footer-prompt` for the top, `.hatch-footer-links` for the menu, `.hatch-footer-meta` for the copyright line.

**Post card.** Cards are emitted by WordPress's `wp:query` loop as `<ul class="wp-block-post-template"><li class="wp-block-post">…</li></ul>`. Core CSS sets the grid to 1/2/3/4 columns at breakpoints via `:has(> .wp-block-column:nth-child(N))`. Your theme styles the interior: featured image aspect, category eyebrow color, title font, excerpt clamp, date typography. The whole card is clickable via a `::before` overlay on the title's `<a>` — do not put `position: relative` on the excerpt or category, or you'll trap clicks.

**Post detail.** The article body sits in `.hatch-prose` with `max-width: var(--hatch-reading-width)`. Set that to whatever reads best in your body font — 680px for wide serifs like Fraunces, 740px for narrower grotesks like Geist. Anything below 620px feels cramped; anything above 800px starts to lose the eye at line-end.

**Sidebar.** No dedicated primitive. If you want a two-column post detail with a TOC, wrap `.hatch-prose` in a CSS grid at your desired breakpoint. The docs theme does this — see `theme-docs.css` for a working example.

---

## 9. How to package and distribute

Three options, from simplest to most portable:

1. **Drop into the starter.** Copy `theme-boilerplate.css` (below) into `astro-starter/src/styles/theme-<yourname>.css`, add an entry to `THEME_CSS_URL` in [PageLayout.astro:32](../astro-starter/src/layouts/PageLayout.astro), and register the theme in the plugin's theme registry. Good for one-site custom builds.

2. **Ship as a Git repo.** One file: `theme-<yourname>.css`. README with a screenshot, brand palette assumptions, install instructions ("copy to `astro-starter/src/styles/` and register in `THEME_CSS_URL`"). Good for open-source distribution.

3. **Ship as a ZIP with a companion asset bundle.** If your theme needs a bespoke font not on Google Fonts, ship the theme CSS plus the WOFF2 files plus a `@font-face` block that expects them at a documented path. Instruct users to drop the WOFF2s into `astro-starter/public/fonts/`.

Future versions of Hatch will support the fourth "Custom" wizard tile pointing at an npm package or a raw GitHub URL — same rules apply, just packaged differently. Whatever channel you use, the deliverable is always one CSS file.

---

## 10. Minimal working boilerplate

Copy this whole block to `theme-boilerplate.css`. Replace `boilerplate` with your theme name, swap the two default hexes, and you have a working theme.

```css
/**
 * Hatch · Boilerplate theme — starter for custom themes.
 * Fill in the four DESIGN DEFAULTS below and you're done.
 */

:root[data-hatch-theme="boilerplate"] {
  /* --- DESIGN DEFAULTS (only hex values in the file) --- */
  --hatch-bg:  var(--hatch-bg-design, #ffffff);
  --hatch-fg:  var(--hatch-fg-design, #0a0a0a);

  /* --- Fonts (fallbacks; Design tab overrides via inline style) --- */
  --hatch-font-body:    ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --hatch-font-heading: ui-serif, Georgia, 'Times New Roman', serif;
  --hatch-font-mono:    ui-monospace, SFMono-Regular, Menlo, monospace;

  /* --- Prose column width --- */
  --hatch-reading-width: 720px;

  /* --- Surface ramp — derived, no hex --- */
  --hatch-bg-2: color-mix(in oklab, var(--hatch-bg) 94%, var(--hatch-fg));
  --hatch-bg-3: color-mix(in oklab, var(--hatch-bg) 88%, var(--hatch-fg));
  --hatch-bg-4: color-mix(in oklab, var(--hatch-bg) 80%, var(--hatch-fg));

  /* --- Text ramp --- */
  --hatch-fg-muted:  color-mix(in oklab, var(--hatch-fg) 68%, var(--hatch-bg));
  --hatch-fg-subtle: color-mix(in oklab, var(--hatch-fg) 44%, var(--hatch-bg));

  /* --- Borders --- */
  --hatch-border:        color-mix(in oklab, var(--hatch-bg) 82%, var(--hatch-fg));
  --hatch-border-strong: color-mix(in oklab, var(--hatch-bg) 65%, var(--hatch-fg));
}

/* Dark mode — auto-derived from brand bg */
[data-hatch-theme="boilerplate"][data-hatch-mode="dark"] {
  --hatch-bg:            color-mix(in oklab, var(--hatch-bg-design, #ffffff)  8%, #000);
  --hatch-fg:            color-mix(in oklab, var(--hatch-bg-design, #ffffff) 92%, #fff);
  --hatch-bg-2:          color-mix(in oklab, var(--hatch-bg-design, #ffffff) 12%, #000);
  --hatch-bg-3:          color-mix(in oklab, var(--hatch-bg-design, #ffffff) 18%, #000);
  --hatch-fg-muted:      color-mix(in oklab, var(--hatch-bg-design, #ffffff) 66%, #000);
  --hatch-fg-subtle:     color-mix(in oklab, var(--hatch-bg-design, #ffffff) 46%, #000);
  --hatch-border:        color-mix(in oklab, var(--hatch-bg-design, #ffffff) 20%, #000);
  --hatch-border-strong: color-mix(in oklab, var(--hatch-bg-design, #ffffff) 30%, #000);
}

/* --- Body typography --- */
[data-hatch-theme="boilerplate"] body {
  font-family: var(--hatch-font-body);
  font-size: calc(16px * var(--hatch-density, 1));
  line-height: 1.65;
  color: var(--hatch-fg);
  background: var(--hatch-bg);
}
[data-hatch-theme="boilerplate"] h1,
[data-hatch-theme="boilerplate"] h2,
[data-hatch-theme="boilerplate"] h3,
[data-hatch-theme="boilerplate"] h4 {
  font-family: var(--hatch-font-heading);
  letter-spacing: -0.02em;
  line-height: 1.18;
  font-weight: 600;
}

/* --- Header chrome (uses shared .hatch-header primitive) --- */
[data-hatch-theme="boilerplate"] .hatch-header {
  background: var(--hatch-bg);
  border-bottom: 1px solid var(--hatch-border);
}
[data-hatch-theme="boilerplate"] .hatch-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hatch-space-5);
  padding-block: var(--hatch-space-5);
  max-width: var(--hatch-max-width, 1160px);
  margin-inline: auto;
  padding-inline: var(--hatch-space-5);
}

/* --- Prose column --- */
[data-hatch-theme="boilerplate"] .hatch-prose {
  max-width: var(--hatch-reading-width);
  margin-inline: auto;
  padding-inline: var(--hatch-space-5);
  font-size: calc(17px * var(--hatch-density, 1));
  line-height: 1.7;
}
[data-hatch-theme="boilerplate"] .hatch-prose a {
  color: var(--hatch-fg);
  text-decoration: underline;
  text-decoration-color: var(--hatch-primary);
  text-underline-offset: 3px;
}

/* --- Post-card interior (matches wp:query loop DOM) --- */
[data-hatch-theme="boilerplate"] .wp-block-post-template > li .wp-block-post-terms {
  color: var(--hatch-primary);
  font-size: calc(11px * var(--hatch-density, 1));
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 500;
}
[data-hatch-theme="boilerplate"] .wp-block-post-template .wp-block-post-title {
  font-family: var(--hatch-font-heading);
  font-size: calc(1.125rem * var(--hatch-density, 1));
  font-weight: 600;
  line-height: 1.375;
}
[data-hatch-theme="boilerplate"] .wp-block-post-template .wp-block-post-excerpt {
  color: var(--hatch-fg-muted);
  font-size: calc(14.5px * var(--hatch-density, 1));
}
[data-hatch-theme="boilerplate"] .wp-block-post-template .wp-block-post-date {
  color: var(--hatch-fg-subtle);
  font-size: calc(12.5px * var(--hatch-density, 1));
  font-feature-settings: 'tnum';
}

/* --- Footer chrome --- */
[data-hatch-theme="boilerplate"] .hatch-footer {
  background: var(--hatch-bg);
  border-top: 1px solid var(--hatch-border);
  padding-block: var(--hatch-space-7);
  color: var(--hatch-fg-muted);
  text-align: center;
}
[data-hatch-theme="boilerplate"] .hatch-footer-brand,
[data-hatch-theme="boilerplate"] .hatch-footer-wordmark {
  font-family: var(--hatch-font-heading);
  color: var(--hatch-fg);
  font-size: calc(20px * var(--hatch-density, 1));
  margin-block-end: var(--hatch-space-3);
}
[data-hatch-theme="boilerplate"] .hatch-footer-links {
  display: flex;
  justify-content: center;
  gap: var(--hatch-space-5);
  margin-block: var(--hatch-space-3);
}
[data-hatch-theme="boilerplate"] .hatch-footer-links a {
  color: var(--hatch-fg-muted);
  text-decoration: none;
}
[data-hatch-theme="boilerplate"] .hatch-footer-meta {
  font-size: calc(13px * var(--hatch-density, 1));
  color: var(--hatch-fg-subtle);
}
```

That's a complete Hatch theme. Every core Gutenberg block renders because the shared `core-blocks.css` already handles them; your file provides the palette and chrome. Add per-block signatures (list markers, quote styling, table zebra stripes) as your taste dictates — look at [theme-blog.css](../astro-starter/src/styles/theme-blog.css), [theme-tech.css](../astro-starter/src/styles/theme-tech.css), and [theme-docs.css](../astro-starter/src/styles/theme-docs.css) for three working examples of how far you can push it inside these constraints.

# Hatch Blocks

> Headless-first Gutenberg blocks. Tailwind utility classes baked into static save markup. Zero PHP at render time. Works perfectly with Astro.

**Part of the [Hatch](https://github.com/adityaarsharma/hatch) project — the open-source headless WordPress engine.**

---

## Why this exists

Every other Gutenberg block library — Kadence, Stackable, GenerateBlocks, Nexter Blocks — was built for traditional WordPress. They use PHP `render_callback`, server-side CSS generation, and dynamic styles that don't transfer to a headless frontend.

Hatch Blocks is built the other way around: **static save by default, Tailwind utility classes in the saved HTML, zero PHP at render time.** Your headless frontend (Astro, Next.js, anything that can fetch HTML) just renders the saved markup. Tailwind picks up the classes. Done.

## What ships in v0.4

8 production blocks, designed for taste:

| Block | What it does |
|---|---|
| **Section** | Full-width row with gradient/image/color backgrounds + responsive padding |
| **Container** | Max-width wrapper with flex/grid layouts + 5-breakpoint gap controls |
| **Heading** | H1-H6 with responsive sizing, weight, alignment, gradient text |
| **Paragraph** | Body text with prose width, line-height, color tokens |
| **Button** | 5 variants × 5 sizes × 6 radii × icons, full Tailwind output |
| **Image** | Aspect ratios, object-fit, rounded corners, shadows, lazy loading |
| **Hero** | Pre-built hero (3 variants: centered / left / split) with gradient presets |
| **Custom Code** | Drop-in HTML/CSS/JS with 3 security modes + 8 designer snippets |

## Custom Code — three modes, three security postures

Because headless shouldn't be boring.

```
Mode: Inline (default)
  HTML + scoped CSS only — JS stripped
  Safest. Use for: marquees, gradients, neon text, glass cards, CSS animations.

Mode: Shadow DOM
  HTML + CSS + JS inside a Shadow DOM (Web Component <hatch-shadow-code>)
  Scoped. Use for: interactive widgets where you trust the source.

Mode: Iframe
  Full sandboxed iframe with allow-scripts
  Isolated. Use for: full embeds, third-party widgets, untrusted code.
```

Capability gate: only users with `unfiltered_html` (administrators) can save raw code. Lower-privileged saves are silently stripped. REST output for non-privileged readers also strips the rendered blocks.

## Snippets library (8 ready-to-use)

Click a snippet, get instant HTML+CSS:

- Animated gradient background
- Smooth marquee with edge masks
- Glassmorphism card (backdrop-filter)
- Neon glow text
- Typewriter effect
- Scroll-driven parallax (CSS scroll() timeline)
- 3D card flip on hover
- Particles canvas (iframe sandbox mode)

## Architecture

```
┌─ WordPress wp-admin (Gutenberg) ───────────────┐
│ Designer drags Hatch blocks                    │
│ Configures via Inspector panels                │
│ Block.save() outputs STATIC HTML w/ Tailwind   │
│ HTML stored in post_content                    │
└────────────────────────────────────────────────┘
                    │ REST API
                    ▼
┌─ Astro frontend ───────────────────────────────┐
│ Fetches /wp/v2/posts                           │
│ <HatchContent html={post.content.rendered} />  │
│ Tailwind picks up baked classes                │
│ <hatch-shadow-code> Web Component hydrates     │
│   interactive bits only when present           │
└────────────────────────────────────────────────┘
```

## Mature-dev controls

Every block where it makes sense exposes:

- **Responsive controls**: 5-tab breakpoint switcher (base / sm / md / lg / xl)
- **Spacing**: padding + margin × 4 sides × 5 breakpoints, Tailwind scale
- **Typography**: size + weight + alignment + line-height + letter-spacing
- **Color tokens**: 9 semantic tokens (primary, accent, surface, foreground...) mapped to CSS variables — themable from Astro
- **Gradient presets**: 6 curated gradients (Aurora, Sunset, Ocean, Mint, Midnight, Dawn)
- **Layout primitives**: flex/grid + align/justify, max-width tokens, aspect ratios

No "100 useless options". Every control maps to a Tailwind utility class.

## Install

### Development

```bash
git clone https://github.com/adityaarsharma/hatch.git
cd hatch/hatch-blocks
npm install
npm run build:all
```

Then upload the `hatch-blocks` folder to your WP `wp-content/plugins` and activate.

### From WordPress.org (planned)

```bash
# Coming soon
wp plugin install hatch-blocks --activate
```

## Tailwind setup on your Astro frontend

Add Hatch's safelist patterns to `tailwind.config.mjs`:

```js
import { HATCH_SAFELIST_PATTERNS } from '@/lib/hatch-blocks';

export default {
	content: [
		'./src/**/*.{astro,html,js,ts,jsx,tsx}',
		'./content/**/*.html',  // include WP-rendered content
	],
	safelist: HATCH_SAFELIST_PATTERNS,
	theme: { extend: { /* your tokens */ } },
};
```

Define your design tokens in CSS:

```css
:root {
	--hatch-color-background: #ffffff;
	--hatch-color-surface:    #f8fafc;
	--hatch-color-foreground: #0f172a;
	--hatch-color-primary:    #2563eb;
	--hatch-color-accent:     #f59e0b;
	/* ... */
}
```

## License

MIT. Use it, fork it, ship it. Attribution appreciated but not required.

## Roadmap

- **v0.4 (now)** — 8 core blocks, Custom Code, snippets
- **v0.5** — 16 more blocks (column, gallery, video, cta, feature-grid, testimonial, accordion, pricing-table, embed, etc.)
- **v0.6** — Block patterns library (50+ ready layouts)
- **v1.0** — WP.org listing, stable API

See [Hatch ROADMAP](https://github.com/adityaarsharma/hatch/blob/main/ROADMAP.md).

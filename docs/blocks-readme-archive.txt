=== Hatch Blocks ===
Contributors: adityaarsharma
Tags: blocks, gutenberg, headless, astro, tailwind
Requires at least: 6.4
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 0.4.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Headless-first Gutenberg blocks. Tailwind utility classes, static save, zero PHP at render.

== Description ==

Hatch Blocks is the Gutenberg block library designed for headless WordPress. Every block:

* Saves static HTML with Tailwind utility classes — no PHP at render time
* Works perfectly with the Astro frontend (and any other headless framework)
* Ships responsive controls with 5-breakpoint tabs
* Uses semantic color tokens (CSS variables) — themeable from your frontend
* Outputs clean, semantic HTML5 with proper accessibility

**Blocks included (v0.4.0):**

* Section — full-width row, gradients, background image, responsive padding
* Container — max-width wrapper, flex/grid layouts
* Heading — H1–H6 with responsive sizing, gradient text
* Paragraph — typography controls, prose widths
* Button — 5 variants × 5 sizes × 6 radii, icons
* Image — aspect ratios, lazy loading, focal point, rounded corners
* Hero — 3 variants, 9 background presets, dual CTAs
* Custom Code — drop-in HTML/CSS/JS with 3 security modes + 8 snippets

**Custom Code Block** is the headline feature — three security modes (inline, shadow DOM, iframe) gated by the `unfiltered_html` capability. Includes 8 designer snippets (marquee, glassmorphism, neon text, parallax, etc.) so non-coders get instant "wow" without writing CSS from scratch.

Built to pair with the [Hatch headless WordPress engine](https://github.com/adityaarsharma/hatch). Works standalone too.

== Installation ==

1. Upload the `hatch-blocks` folder to `/wp-content/plugins/`
2. Activate through the Plugins menu
3. Add Hatch blocks from the block inserter under the "Hatch Blocks" category

== Frequently Asked Questions ==

= Do I need Tailwind on my site? =

For traditional (non-headless) WP: yes — install a Tailwind-compatible theme or include `hatch-blocks/build/frontend.css` (compiled Tailwind subset).

For headless: your Astro/Next.js frontend already has Tailwind. Add Hatch's safelist patterns to your `tailwind.config.mjs`.

= Does this work without the Hatch headless engine? =

Yes. Hatch Blocks works on any WordPress site. Headless is just one use case.

= Is the Custom Code Block safe? =

By default, only administrators can save raw HTML/CSS/JS (uses WP's `unfiltered_html` capability). For lower-privileged users, code is silently stripped on save AND on REST output. Three execution modes (inline / shadow DOM / iframe) let you choose your security posture per block.

== Changelog ==

= 0.4.0 (2026-05-14) =
* Initial public release
* 8 core blocks: Section, Container, Heading, Paragraph, Button, Image, Hero, Custom Code
* Custom Code with 3 security modes + 8 snippets
* Web Component for Shadow DOM mode

== License ==

MIT.

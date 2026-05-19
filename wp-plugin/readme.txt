=== Hatch — Headless WordPress ===
Contributors: adityaarsharma
Tags: headless, astro, rest-api, gutenberg, security
Requires at least: 6.4
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 0.50.11
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Turn WordPress into a headless CMS with an Astro frontend. One-click deploy, security hardening, image proxy, REST bridge, React admin.

== Description ==

Hatch turns WordPress into a clean headless CMS for Astro, Next.js, or any modern frontend. One plugin, three layers:

**1. Companion features** — what makes WordPress work as a backend

* REST API hardened (anonymous users blocked, user enumeration killed, XML-RPC disabled)
* Auto-detects 24+ plugins: RankMath/Yoast, ACF, Meta Box, Pods, CPT UI, WPForms, Fluent, Gravity, CF7, WPML, Polylang, WooCommerce, JetEngine, MemberPress, and more
* Field-group REST checker for ACF/SCF/Meta Box (catches the silent failures)
* CPT `show_in_rest` scanner (catches the #1 silent bug in headless WP)
* Custom login URL (WPS Hide Login approach) + brute-force IP lockout + headless role guard
* Application Password generator with one-time plaintext display
* Revalidation webhooks fired on save/delete/transition (with post-type filter)
* SEO bridge that proxies RankMath OR Yoast's `getHead` endpoint
* Forms bridge for WPForms / Fluent / Gravity / Contact Form 7

**2. Headless-first Gutenberg blocks** — design beautiful sites in the editor, render anywhere

* **Section** — full-width row with gradient/image/color backgrounds
* **Container** — max-width wrapper with flex/grid layouts
* **Heading** — H1–H6 with responsive sizing + gradient text
* **Paragraph** — typography controls + prose widths
* **Button** — 5 variants × 5 sizes × 6 corner radii + icons
* **Image** — aspect ratios, lazy loading, shadows, rounded corners
* **Hero** — 3 variants (centered / left / split) with 9 background presets
* **Custom Code** — drop in any HTML/CSS/JS with 3 security modes + 8 designer snippets (marquee, glassmorphism, neon, parallax, etc.)

Every block:
* Saves STATIC HTML with Tailwind utility classes — zero PHP at render time
* Ships 5-breakpoint responsive controls (base / sm / md / lg / xl)
* Uses 9 semantic color tokens (CSS variables) — themable from your frontend
* Outputs clean, semantic, accessible HTML5

**3. Admin Connector** — paste-ready integration for your Astro/Next.js frontend

* Application Password generator with copy-paste `.env` block
* Hosting cards: Cloudflare Workers (recommended) / Vercel / Netlify / VPS
* Tabbed health panel surfaces every misconfiguration with a one-click fix

== Installation ==

1. Install and activate Hatch
2. Auto-launched setup wizard walks you through: diagnostic → pick theme → deploy
3. In the Deploy step, pick CF Pages / Vercel template / VPS curl one-liner
4. Start writing posts. The Hatch blocks appear in the inserter under the "Hatch" category.

The Astro starter runs in SSR mode — new posts go live within ~60 seconds via edge cache TTL. No revalidate webhook required.

For headless setup, pair with the [Hatch Astro starter](https://github.com/adityaarsharma/hatch).

== Frequently Asked Questions ==

= Do I have to be running a headless setup? =

No. Hatch Blocks work fine on traditional WordPress sites — they save static HTML with Tailwind classes, no special frontend required. Headless is just the optimized path.

= Do I need WPGraphQL? =

No. Hatch uses standard WP REST API. WPGraphQL is not required and not recommended.

= What about Elementor, Divi, page builders? =

Page builders cannot work headlessly — their HTML output depends on PHP runtime. Hatch Blocks replaces them for the headless use case. For traditional WP, keep using your page builder; Hatch Blocks are not a competitor there.

= Is the Custom Code Block safe? =

Three layers: only `unfiltered_html` users (administrators by default) can save raw code. For lower-privileged saves, code is silently stripped. REST API output for non-privileged readers also strips custom-code blocks. Three execution modes (inline / shadow DOM / iframe) let you choose per-block security.

= Can I use Hatch with Nexter Blocks, Kadence, or Stackable? =

You can have them installed simultaneously, but those blocks won't render correctly in a headless setup (they use server-side rendering). Hatch Blocks are designed specifically for the headless case. For traditional WordPress they all coexist.

= Where can I get migration help? =

[adityaarsharma.com/connect](https://adityaarsharma.com/connect) — paid consulting available. The plugin and all docs are 100% free.

== Screenshots ==

1. Admin Connector tab — App Password generator with copy-paste .env block
2. Health panel — every misconfiguration surfaced with a one-click fix
3. Hatch block category in the inserter
4. Hero block with gradient preset in the editor
5. Custom Code block with snippet picker (marquee, glassmorphism, etc.)

== Changelog ==

= 0.4.0 — Headless-first Gutenberg blocks =
* Added 8 production blocks: Section, Container, Heading, Paragraph, Button, Image, Hero, Custom Code
* Custom Code block with 3 security modes (inline / shadow DOM / iframe) and 8 designer snippets
* Web Component `<hatch-shadow-code>` for shadow-mode hydration
* Tailwind utility class output baked into static save markup
* 5-breakpoint responsive controls on every block where it makes sense
* 9 semantic color tokens mapped to CSS variables

= 0.2.0 — Hardening + Health =
* ACF / SCF / Meta Box / Pods / CPT UI / JetEngine detection (7 new plugins)
* Field-group REST exposure checker with admin warnings
* CPT `show_in_rest` scanner with admin warnings
* Custom login URL + headless role guard + brute-force IP lockout
* Application Password generator (REST + admin-post + Connector tab)
* New REST endpoints: /cpt-health, /acf-status, /revalidate, /app-password
* Tabbed admin dashboard (Connection / Connector / Health / Security / Plugins)
* Hosting connector with cards for Cloudflare Workers, Vercel, Netlify, VPS

= 0.1.0 — Initial release =
* REST API surface at /wp-json/hatch/v1/*
* RankMath / Yoast SEO bridge
* Form plugin bridge (WPForms / Fluent / Gravity / CF7)
* REST hardening, XML-RPC kill, user enum block
* Revalidation webhooks
* RankReady soft-recommendation

== Upgrade Notice ==

= 0.4.0 =
Brings 8 headless-first Gutenberg blocks into the same plugin. No separate plugin to install.

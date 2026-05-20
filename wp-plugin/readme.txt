=== Hatch — Headless WordPress ===
Contributors: adityaarsharma
Tags: headless, astro, rest-api, security
Requires at least: 6.4
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 0.1.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Turn WordPress into a headless CMS with an Astro frontend. One plugin, one wizard, one deploy.

== Description ==

Hatch turns WordPress into a clean headless CMS for Astro. One plugin includes everything: a React admin SPA, a 3-step setup wizard, Plugin Bridge auto-detection for the WordPress plugins you already use, REST hardening, custom login URL, brute-force lockout, security headers, and a one-click deploy broker.

You write posts in **core Gutenberg** — no custom blocks to learn. Hatch reads what you write via REST and renders it on the Astro frontend in one of five built-in themes.

= What's in the box =

* React admin SPA with six tabs (Connection / Design / Content / Performance / Security / Status)
* 3-step setup wizard with a 12-point preflight diagnostic
* Plugin Bridge auto-detects 12 capability providers (Forms, SEO, Sitemap, Redirects, eCommerce, Custom Fields, Email Newsletter, Memberships, Code Snippets, Data Tables)
* WP Core Sync card mirrors every WP-owned setting the headless frontend consumes
* Performance: clean media URLs, instant navigation, Partytown analytics, real-user telemetry
* Hardening: REST lock, XML-RPC hard-403, username enum 404, custom login slug, brute-force lockout, security headers, Turnstile gating, 2FA enforce
* Application Passwords with one-click rotate
* Five Astro themes shipped (Astropaper, Tech, Docs, Astrowind, Astronano), each with a distinct header and footer
* Self-hosted deploy broker — one curl command sets up your VPS

== Installation ==

1. Upload `hatch.zip` via Plugins → Add New → Upload Plugin.
2. Activate.
3. The setup wizard launches automatically. Run the preflight, pick a theme, deploy.

== Frequently Asked Questions ==

= Do I need custom blocks? =

No. Hatch uses core Gutenberg. Write posts the way you already do — paragraphs, headings, lists, images, embeds. Hatch reads everything via REST and renders it on the Astro frontend.

= Do I have to use the Astro starter? =

Yes — for v0.1.0. The plugin's REST surface (`hatch/v1/*`) is theme-agnostic, but the bundled Astro starter is the supported renderer.

= Can I deploy without Cloudflare or Vercel? =

Yes. Self-hosted is the default — `HATCH_TARGET=node` ships an Astro app any VPS can run. Cloudflare and Vercel are opt-in via the wizard.

= Does it work with my SEO / Forms / Memberships plugin? =

Plugin Bridge auto-detects RankMath, Yoast, AIOSEO, WPForms, Fluent Forms, Gravity, CF7, WooCommerce, EDD, MemberPress, ACF, Meta Box, and more. If a provider is installed, Hatch surfaces it. If not, Hatch tells you what to install.

== Changelog ==

= 0.1.1 — Post-launch polish =
* Security toggles — code now matches every label. /xmlrpc.php hard-403s, ?author=N returns 404, robots.txt emits Disallow: / when "Hide WP from Google" is on.
* /wp/v2/users removed from REST surface independently of the REST-lock toggle.
* Real-user telemetry — fixed option-key mismatch; beacon now fires when toggle is on.
* CDN asset prefix UI removed (returns in v0.2 wired at build time).
* Gutenberg editor URL preview now mirrors the saved slug.
* Page + post container widths aligned via --hatch-max-width across all themes.
* Per-toggle audit: 0 hollow, 0 broken across all 6 admin tabs.

= 0.1.0 — First stable release =
* React admin SPA, 3-step wizard, Plugin Bridge, WP Core Sync, Performance + Security tabs
* Five Astro themes with unique headers and footers
* Self-hosted deploy broker

== Upgrade Notice ==

= 0.1.1 =
Post-launch polish — every admin toggle audited end-to-end. Upgrade safe.

= 0.1.0 =
First stable public release. Install fresh, run the wizard, deploy in one click.

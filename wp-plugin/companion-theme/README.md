# Hatch Companion theme

A blank, headless-first WordPress theme that pairs with the Hatch plugin.

## What it does

1. Redirects raw frontend visitors (eg. `cms.yoursite.com/about`) to the Astro
   frontend (`yoursite.com/about`) when a frontend URL is set on the Hatch
   plugin.
2. Keeps wp-admin, wp-login, REST, sitemap, and feeds working normally.
3. Shows a small "Hatch is active" notice in the WP Dashboard.
4. Falls back to a clean, dark-mode-aware splash page when no frontend URL
   is set yet.

## Install

This theme ships **inside the Hatch plugin** at `wp-plugin/companion-theme/`.
The Hatch setup wizard offers a one-click "install + activate Hatch Companion"
button. Manual install:

```bash
cp -r wp-plugin/companion-theme/ wp-content/themes/hatch-companion/
```

Then activate it in **Appearance → Themes**.

## How it pairs with the plugin

The plugin's Hatch Connector tab stores the frontend URL in
`hatch_frontend_url`. The theme reads that option and uses it as the redirect
target. If you switch hosts (Cloudflare → Vercel), the theme picks up the new
URL automatically — no theme edits needed.

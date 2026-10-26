# Hatch Astro Starter

The headless frontend for [Hatch](https://github.com/eticastudio/hatch). Astro 7, Tailwind CSS 4, TypeScript.

---

## What this is

A minimal Astro project that:

- Fetches posts, pages and products from your Hatch-powered WordPress over REST
- Reads menus, SEO meta, design tokens and feature flags from the `hatch/v1` REST namespace
- Renders WordPress Gutenberg blocks as static or server-rendered HTML
- Ships three starter designs (Editorial, Terminal, Docs), each with light and dark mode
- Receives revalidation webhooks from WordPress when content changes

## Deploy

**You do not deploy this by hand.** The Hatch plugin deploys it for you, straight into your own Cloudflare account, as a Cloudflare Worker, with no Hatch account and no third-party deploy service. Open **Hatch** in wp-admin and follow the setup guide; see the main repo's [README](../README.md#quick-start-site-owners) and [docs/SETUP-FLOW.md](../docs/SETUP-FLOW.md).

This starter builds for Cloudflare Workers (`@astrojs/cloudflare`) by default. A Node build target (`@astrojs/node`) also exists for running it yourself on any Node host. There is no Vercel or Netlify adapter installed, so those platforms are not supported targets for this starter.

---

## Quick start, local dev

```bash
# 1. Copy the env template
cp .env.example .env

# 2. Fill in .env with a WordPress REST URL and an Application Password
#    (Tools, Hatch on your local or test WordPress site)

# 3. Install + run
npm install
npm run dev

# Open http://localhost:4321
```

---

## Project structure

```
astro-starter/
├── astro.config.mjs       Astro config, Cloudflare adapter by default, Node via HATCH_TARGET=node
├── wrangler.toml           Cloudflare Workers config (worker name hatch-frontend)
├── .env.example
├── src/
│   ├── pages/
│   │   ├── index.astro             Homepage
│   │   ├── blog/, product/, category/, tag/, author/   Listing and archive routes
│   │   ├── [...slug].astro         Catch-all for pages and posts
│   │   ├── cart.astro, checkout.astro, order-summary.astro, account.astro   WooCommerce flow
│   │   ├── login.astro, register.astro   Frontend auth
│   │   ├── search.astro, shop.astro
│   │   ├── sitemap.xml.ts, sitemap-index.xml.ts, rss.xml.ts, robots.txt.ts, llms.txt.ts
│   │   ├── img.ts, hatch-media/     Image proxy
│   │   └── api/                    revalidate.ts (webhook), comments.ts, telemetry.ts, auth/, hatch/, hatch-comments/, hatch-form/, wc-store/, wc-stripe-verify.ts
│   ├── components/
│   │   ├── SiteHeader.astro, SiteFooter.astro, Sidebar.astro, PostCard.astro, HatchForm.astro, HatchComments.astro, HatchImage.astro, HatchSchema.astro
│   │   ├── hatch-blocks/           Gutenberg block renderers
│   │   └── theme/                  Breadcrumb, PostMeta, ShareRow, and per-design folders (astronano, astrowind, docs, tech)
│   ├── layouts/
│   │   └── PageLayout.astro        Base HTML, head injection
│   └── lib/
│       ├── hatch.ts                REST API client
│       ├── features.ts, design.ts, blocks.ts, posts.ts, woo.ts, site.ts
│       └── cache.ts, url-builder.ts, code-snippets.ts, theme-dispatch.ts
└── tsconfig.json
```

---

## Environment variables

See [.env.example](.env.example) and the main repo's [README](../README.md#configuration) for the full, current list (`WP_API_URL`, `WP_API_USER`, `WP_API_PASS`, `HATCH_WEBHOOK_SECRET`, `PUBLIC_SITE_URL`, and optional Turnstile and Disqus keys).

---

## Scripts

```bash
npm run dev          # Astro dev server at http://localhost:4321
npm run build        # Production build (Cloudflare target by default)
npm run build:cf     # Explicit Cloudflare Workers build
npm run build:node   # Node SSR build (HATCH_TARGET=node)
npm run preview      # Preview the build locally
npm run typecheck    # astro check
```

---

## Customizing

### Change colors / fonts

Design (colors, typography, layout, light/dark) is controlled from the Hatch plugin's Design tab in wp-admin and read at request time from `hatch/v1/design`. It is not hardcoded in this starter. See `src/lib/design.ts`.

### Add a feature

Features (TOC, share row, breadcrumb, etc.) come from `hatch/v1/features`:

```typescript
import { getFeatures } from './lib/features';

const { features } = await getFeatures();

if (features.toc) {
  // render the table of contents
}
```

Users toggle these in wp-admin, Hatch, Content tab.

### Use a different block renderer

Default: pass-through. WordPress's rendered block HTML is injected directly, and Hatch design tokens style it via CSS variables.

Advanced: component mapping. See `src/components/hatch-blocks/` for per-block Astro components.

---

## License

GPL-2.0-or-later, same as Hatch.

---

> **Main repo:** [github.com/eticastudio/hatch](https://github.com/eticastudio/hatch)
> **Setup guide:** [docs/SETUP-FLOW.md](../docs/SETUP-FLOW.md)

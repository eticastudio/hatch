# Hatch Astro Starter

The headless frontend for [Hatch](https://github.com/adityaarsharma/hatch). Astro 4+, Tailwind, ready to deploy.

---

## What this is

A minimal Astro project that:

- Fetches posts/pages from your Hatch-powered WordPress via REST
- Reads feature flags from `/wp-json/hatch/v1/features` (TOC, share sidebar, breadcrumb, etc.)
- Renders Hatch Gutenberg blocks (Section / Container / Heading / Paragraph / Button / Image / Hero / Custom Code) as static HTML
- Receives revalidation webhooks from WordPress when posts change

You deploy this to **Cloudflare Pages** (recommended), Vercel, Netlify, or your own VPS. WordPress + Hatch lives elsewhere.

---

## Quick start — local dev

```bash
# 1. Copy the env template
cp .env.example .env

# 2. Edit .env with the values from Tools → Hatch → Connector in your wp-admin
#    HATCH_WP_URL=https://cms.yoursite.com
#    WORDPRESS_USER=admin
#    WORDPRESS_APP_PASSWORD=abcd efgh ijkl mnop ...
#    HATCH_WEBHOOK_SECRET=...

# 3. Install + run
npm install
npm run dev

# → Open http://localhost:4321
```

---

## Deploy

The full Cloudflare Pages guide is at [`docs/hosting/cloudflare-pages.md`](../docs/hosting/cloudflare-pages.md) in the main repo.

### TL;DR for Cloudflare Pages

1. Fork the [Hatch repo](https://github.com/adityaarsharma/hatch) on GitHub
2. Cloudflare → Pages → Connect to Git → pick your fork
3. Build settings:
   - **Framework:** Astro
   - **Build command:** `npm install && npm run build`
   - **Build output:** `dist`
   - **Root directory:** `astro-starter` ← important
4. Add 4 environment variables from your Hatch Connector tab
5. Save and Deploy

Full walkthrough: [docs/hosting/cloudflare-pages.md](../docs/hosting/cloudflare-pages.md).

### Other hosts

- **Vercel:** Set root directory to `astro-starter`, framework Astro, same env vars
- **Netlify:** Same — base directory `astro-starter`
- **Your VPS:** `npm run build` then serve `dist/` with nginx, or run as Node SSR with `npm start`

---

## Project structure

```
astro-starter/
├── astro.config.mjs           Astro configuration (Tailwind, integrations)
├── package.json
├── .env.example
├── src/
│   ├── pages/
│   │   ├── index.astro        Homepage — pulls latest posts
│   │   ├── blog/index.astro   Blog index — list view
│   │   ├── blog/[slug].astro  Single post — dynamic route
│   │   └── blog/api/
│   │       └── revalidate.ts  Webhook receiver — purges cache on POST
│   ├── components/
│   │   └── hatch-blocks/      Astro renderers for Hatch Gutenberg blocks
│   │       ├── HatchContent.astro    Pass-through HTML renderer
│   │       ├── HatchSection.astro    Component-mapping renderer
│   │       ├── HatchHero.astro
│   │       └── index.ts
│   ├── layouts/
│   │   └── PageLayout.astro   Base HTML, head injection (RankMath getHead)
│   └── lib/
│       ├── hatch.ts           REST API client (auth, fetching)
│       └── hatch-blocks.ts    Block parser + Tailwind safelist
└── tsconfig.json
```

---

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `HATCH_WP_URL` | ✅ | Your WordPress URL (e.g. `https://cms.yoursite.com`). **No trailing slash.** |
| `WORDPRESS_USER` | ✅ | WP username for REST API access |
| `WORDPRESS_APP_PASSWORD` | ✅ | App Password generated from Hatch Connector tab |
| `HATCH_WEBHOOK_SECRET` | ✅ | Used to verify incoming `/api/revalidate` calls |
| `HATCH_FEATURES_URL` | optional | Override the `/wp-json/hatch/v1/features` URL. Defaults to `{HATCH_WP_URL}/wp-json/hatch/v1/features`. |
| `SITE_TITLE` | optional | Browser title bar default. If empty, pulled from WP's site name. |
| `SITE_DESCRIPTION` | optional | Default meta description. |

---

## How content flows

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  WordPress       │         │  Astro starter   │         │  Visitor's       │
│  (cms.yoursite)  │ ──────► │  (build time)    │ ──────► │  browser         │
│  + Hatch plugin  │  REST   │  npm run build   │  HTML   │                  │
└──────────────────┘         └──────────────────┘         └──────────────────┘
        ▲                            ▲
        │                            │
        │   POST /api/revalidate     │
        └────────────────────────────┘
              (when post changes)
```

1. **At build time:** Astro fetches all posts/pages from WordPress via REST + features from `/hatch/v1/features`
2. **Astro pre-renders** every page to static HTML
3. **Cloudflare serves** the static HTML from its global edge — every page loads in < 500ms
4. **When a post changes:** WordPress fires a webhook → Cloudflare rebuilds → static HTML updates within ~2 minutes

---

## Scripts

```bash
npm run dev        # Astro dev server at http://localhost:4321
npm run build      # Production build → dist/
npm run preview    # Preview the build locally
npm run check      # TypeScript check
```

---

## Customizing

### Change colors / fonts

Edit `src/styles/globals.css` (or wherever your design tokens live). The Hatch blocks read 9 CSS variables for colors:

```css
:root {
  --hatch-color-background: #ffffff;
  --hatch-color-surface:    #f8fafc;
  --hatch-color-foreground: #0f172a;
  --hatch-color-muted:      #64748b;
  --hatch-color-primary:    #2563eb;
  --hatch-color-accent:     #f59e0b;
  --hatch-color-success:    #10b981;
  --hatch-color-danger:     #ef4444;
  --hatch-color-border:     #e2e8f0;
}
```

Change these to rebrand instantly. Every Hatch Block respects them.

### Add a feature

Features (TOC, share sidebar, breadcrumb, etc.) come from `/wp-json/hatch/v1/features`. To respect them in your code:

```typescript
import { fetchHatchFeatures } from './lib/hatch';

const { features, theme } = await fetchHatchFeatures();

if (features.progress_bar) {
  // render the progress bar component
}
```

Users toggle these in WordPress → Tools → Hatch → Features.

### Use a different block renderer

Default: **pass-through** — `<HatchContent html={post.content.rendered} />` injects WordPress's rendered HTML directly. Tailwind classes baked into the saved blocks pick up your config automatically.

Advanced: **component mapping** — parse blocks server-side, render Astro components for each. See `src/components/hatch-blocks/index.ts` for the component map.

---

## License

GPL-2.0-or-later, same as Hatch.

---

> **Main repo:** [github.com/adityaarsharma/hatch](https://github.com/adityaarsharma/hatch)
> **Cloudflare deploy guide:** [docs/hosting/cloudflare-pages.md](../docs/hosting/cloudflare-pages.md)

# Hatch — Next.js 15 Starter

App Router · TypeScript · Server Components.

A feature-equivalent mirror of the Astro starter. Same REST contract against the Hatch WordPress plugin, same 6 themes, same Hatch Blocks runtime, same routes.

## Quick start

```bash
cp .env.example .env.local
# Edit HATCH_WP_API_URL to point at your WP install
npm install
npm run dev
```

Open http://localhost:3000.

## Routes

| Path | What it does |
|---|---|
| `/` | Home — renders `features.home_page_id` content, else blog hero |
| `/[...slug]` | Any WP page or CPT by slug |
| `/blog` | Posts archive |
| `/blog/[slug]` | Single post |
| `/search?q=…` | WP REST `?search=` |
| `/api/revalidate?secret=…` | Cache-bust webhook (POST or GET) |
| `/robots.txt` `/rss.xml` `/sitemap.xml` | Standard feeds |
| `/img?url=…&w=…` | Same-origin image proxy |

## Themes

Six themes ship: `blog · tech · docs · astropaper · astrowind · astronano`. The active theme is decided by WordPress (Hatch → Design) and read from `/wp-json/hatch/v1/features` at request time. The root layout sets `<html data-hatch-theme="…">` and each theme CSS file scopes its rules to that attribute.

## Hatch Blocks runtime

`public/hatch-blocks.js` (vanilla, framework-agnostic) hydrates dynamic blocks (Search, YouTube facade, Tabs, Form, Posts, etc.) on first paint. The root layout sets `window.HATCH_WP_BASE` before the script loads.

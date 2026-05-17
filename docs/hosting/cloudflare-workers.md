# Deploy Hatch to Cloudflare Workers (Pages)

**Recommended for most users.** Generous free tier, no new infrastructure, edge-cached globally.

## Cost

- **Free tier:** 100,000 requests/day, unlimited bandwidth, unlimited sites
- **Workers Paid:** $5/mo gives 10M requests/day if you outgrow free

## Prerequisites

- Cloudflare account (free)
- `wrangler` CLI: `npm install -g wrangler`
- `wrangler login` to authenticate

## Steps

### 1. Add the Cloudflare adapter to your Astro project

```bash
cd [your-hatch-project]
npm install @astrojs/cloudflare
```

Update `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL,
  output: 'server',
  adapter: cloudflare({ mode: 'directory' }),
  integrations: [tailwind(), sitemap()],
});
```

### 2. Create `wrangler.toml`

```toml
name = "my-hatch-site"
compatibility_date = "2026-05-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "./dist"

[vars]
PUBLIC_SITE_URL = "https://my-hatch-site.pages.dev"

# Secrets set via `wrangler secret put` (next step), NOT in this file.
```

### 3. Set secrets

```bash
wrangler pages secret put WP_API_URL --project-name my-hatch-site
# paste: https://cms.example.com/wp-json/wp/v2

wrangler pages secret put WP_API_USER --project-name my-hatch-site
# paste: editor

wrangler pages secret put WP_API_PASS --project-name my-hatch-site
# paste: abcd efgh ijkl mnop

wrangler pages secret put HATCH_WEBHOOK_SECRET --project-name my-hatch-site
# paste: secret from WP Admin → Tools → Hatch
```

### 4. Build + deploy

```bash
npm run build
wrangler pages deploy dist --project-name my-hatch-site
```

First deploy creates the project automatically.

### 5. Add custom domain

In Cloudflare dashboard:
1. Workers & Pages → Your project → Custom domains
2. Add `your-domain.com`
3. Update DNS as instructed

### 6. Update WP webhook URL

WP Admin → Tools → Hatch → Revalidation webhook URL:
- Set to `https://your-domain.com/blog/api/revalidate`
- Save

Edit a post in WP, refresh frontend within ~5 seconds. ✅

## Performance tips for Cloudflare

- **Cache static assets:** Cloudflare auto-caches `/_assets/*`. No config needed.
- **Cache API for revalidation tags:** for V1, the simple webhook works fine. V2 will add Cache API tag-based purging.
- **Use Cloudflare Images** for WP media if you have a heavy image site:
  - Sign up for Cloudflare Images ($5/mo for 100k images)
  - Configure `@hatch/images` to route WP URLs through Cloudflare

## Common issues

**Error: `process is not defined`** → add `nodejs_compat` to `compatibility_flags` in `wrangler.toml`.

**Error: `WP_API_URL not set`** → secrets must be set via `wrangler pages secret put` (the build envs aren't enough for SSR routes).

**Webhook timing out** → Cloudflare has a 30s SSR timeout. If your WP REST is slow, install Redis Object Cache on WP, or move WP to a faster host.

## Why Cloudflare Workers?

- Free tier is genuinely usable for real production blogs
- Global edge = sub-100ms latency worldwide
- Astro + Cloudflare = perfect match (Astro 6.0 has first-class Cloudflare support since March 2026)
- No cold starts (unlike Vercel free / AWS Lambda)
- Cloudflare acquired Astro in Jan 2026 — long-term alignment

Alternative: see [Vercel](vercel.md), [VPS](vps-runcloud.md), [Netlify](netlify.md).

# Deploy Hatch to Vercel

Best for fastest deploys + best DX. Free tier works for personal projects.

## Cost

- **Hobby (free):** unlimited deploys, 100 GB bandwidth, fair use limits
- **Pro ($20/mo):** higher limits, password protection, analytics

## Steps

### 1. Add the Vercel adapter

```bash
cd [your-hatch-project]
npm install @astrojs/vercel
```

Update `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL,
  output: 'server',
  adapter: vercel({ webAnalytics: { enabled: false } }),
  integrations: [tailwind(), sitemap()],
});
```

### 2. Push to GitHub

```bash
git add .
git commit -m "Initial Hatch site"
git remote add origin https://github.com/youruser/your-hatch-site.git
git push -u origin main
```

### 3. Import to Vercel

1. https://vercel.com/new
2. Import your GitHub repo
3. Framework: **Astro** (auto-detected)
4. Click "Deploy"

### 4. Set environment variables

Vercel dashboard → your project → Settings → Environment Variables:

| Name | Value |
|---|---|
| `WP_API_URL` | `https://cms.example.com/wp-json/wp/v2` |
| `WP_API_USER` | `editor` |
| `WP_API_PASS` | `abcd efgh ijkl mnop` |
| `HATCH_WEBHOOK_SECRET` | from WP Admin → Tools → Hatch |
| `PUBLIC_SITE_URL` | `https://your-project.vercel.app` (or custom domain) |

Redeploy after setting (Vercel will trigger automatically).

### 5. Custom domain

Vercel dashboard → your project → Settings → Domains → Add.

### 6. Update WP webhook URL

WP Admin → Tools → Hatch → set to `https://your-domain.com/blog/api/revalidate`.

## Vercel-specific perks

- **ISR via `revalidate`** — V2 of Hatch will use Vercel's ISR for tag-based revalidation instead of page-level
- **Image Optimization** — Vercel's built-in image CDN works with Astro `<Image>` automatically
- **Edge Functions** — Hatch SSR routes can run at edge for lower latency

## Common issues

**Build fails on first deploy** → likely env vars missing. Set them, then redeploy.

**Cold starts on Hobby tier** → upgrade to Pro for warm functions, or move to Cloudflare Workers (no cold starts).

**Sitemap not updating** → it builds at deploy time. To regenerate without a code push, use Vercel's "Redeploy" button.

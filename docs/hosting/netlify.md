# Deploy Hatch to Netlify

Solid alternative to Vercel — similar DX, generous free tier.

## Steps

### 1. Add Netlify adapter

```bash
npm install @astrojs/netlify
```

```js
// astro.config.mjs
import netlify from '@astrojs/netlify';
export default defineConfig({
  output: 'server',
  adapter: netlify(),
});
```

### 2. Push to GitHub, import in Netlify

https://app.netlify.com/start → connect your repo → deploy.

### 3. Env vars

Netlify dashboard → Site settings → Environment variables. Same set as other hosts.

### 4. Custom domain + SSL

Built-in via Netlify dashboard.

### 5. Webhook URL

Update WP → Tools → Hatch with your Netlify URL.

## Notes

- Netlify Functions cold-start a bit slower than Cloudflare; consider Cloudflare for high-traffic sites
- Netlify's image optimization is comparable to Vercel's
- Free tier: 100 GB bandwidth, 300 build minutes

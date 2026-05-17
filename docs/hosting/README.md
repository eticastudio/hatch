# Hatch Hosting Guide

One page. Three paths. Pick the right one and go.

---

## Which platform should I use?

| | Cloudflare Pages | Vercel | Your VPS |
|---|---|---|---|
| **Best for** | Most users, free, global | Best DX, fastest deploys | You already have a server |
| **Free tier** | 100k req/day, unlimited bandwidth | 100 GB bandwidth, fair use | Your VPS cost only |
| **Cold starts** | None (edge, always warm) | Sometimes on hobby | Never |
| **Custom domain** | Free + auto SSL | Free + auto SSL | Caddy/Nginx/RunCloud |
| **Env vars** | Dashboard or `wrangler secret` | Dashboard or Vercel CLI | `.env` file on server |
| **Auto-deploy** | Push to git via Pages | Push to git (built-in) | GitHub Actions or webhook |
| **Vendor lock-in** | Cloudflare | Vercel | None |
| **`/hatch-deploy` command** | `1` | `2` | `3` |

**Rule of thumb:**
- No server? → **Cloudflare Pages**
- DX matters most? → **Vercel**
- Already paying for a VPS? → **VPS**

---

## Prerequisites (all paths)

- Node 20+
- Hatch project scaffolded (`npm create hatch@latest`)
- WordPress CMS running with Hatch plugin installed
- Application Password created in WP Admin → Users → Edit → Application Passwords

---

## Path 1 — Cloudflare Pages

**Free. Edge-global. No infrastructure to manage.**

### 1. Install adapter

```bash
cd my-hatch-site
npm install @astrojs/cloudflare
```

### 2. Update `astro.config.mjs`

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

### 3. Create `wrangler.toml`

```toml
name = "my-hatch-site"
compatibility_date = "2026-05-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "./dist"

[vars]
PUBLIC_SITE_URL = "https://my-hatch-site.pages.dev"
```

### 4. Build + deploy

```bash
npm run build
npx wrangler pages deploy dist
```

### 5. Set secrets (never in wrangler.toml)

```bash
npx wrangler pages secret put WP_API_URL
npx wrangler pages secret put WP_API_USER
npx wrangler pages secret put WP_API_PASS
npx wrangler pages secret put HATCH_WEBHOOK_SECRET
```

Or: Cloudflare Dashboard → Pages → your project → Settings → Environment Variables.

### 6. Custom domain

Cloudflare Dashboard → Pages → your project → Custom Domains → Add.  
If your domain is already on Cloudflare, DNS sets up automatically.

### 7. Update WP webhook

WP Admin → Tools → Hatch → Revalidation URL:
```
https://your-domain.com/blog/api/revalidate
```

### Cost

- Free forever for most sites
- Workers Paid ($5/mo) if you hit 100k req/day

---

## Path 2 — Vercel

**Fastest DX. Zero config git deploys. Great for teams.**

### 1. Install adapter

```bash
cd my-hatch-site
npm install @astrojs/vercel
```

### 2. Update `astro.config.mjs`

```js
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL,
  output: 'server',
  adapter: vercel(),
  integrations: [tailwind(), sitemap()],
});
```

### 3. Deploy

```bash
npx vercel
# Follow prompts: link to project, set root directory, framework = Astro
```

### 4. Set env vars

Vercel Dashboard → your project → Settings → Environment Variables:

```
WP_API_URL          = https://cms.example.com/wp-json/wp/v2
WP_API_USER         = editor
WP_API_PASS         = abcd efgh ijkl mnop
HATCH_WEBHOOK_SECRET= your-secret-from-wp-admin
PUBLIC_SITE_URL     = https://your-domain.vercel.app
```

### 5. Redeploy with env vars

```bash
npx vercel --prod
```

### 6. Custom domain

Vercel Dashboard → Domains → Add. Point DNS to Vercel's nameservers or add a CNAME.

### 7. Connect git for auto-deploys

```bash
npx vercel link
# Push to main → auto-deploy
```

### 8. Update WP webhook

WP Admin → Tools → Hatch → Revalidation URL:
```
https://your-domain.com/blog/api/revalidate
```

### Cost

- Hobby (free): unlimited deploys, 100 GB bandwidth
- Pro ($20/mo): higher limits, analytics, password protection

---

## Path 3 — Your VPS (RunCloud / Caddy / Nginx)

**Full control. No per-request billing. Best when you already have a server.**

### 1. Install adapter

```bash
cd my-hatch-site
npm install @astrojs/node
```

### 2. Update `astro.config.mjs`

```js
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL,
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [tailwind(), sitemap()],
});
```

### 3. Build locally

```bash
npm run build
# Creates dist/ with dist/server/entry.mjs as the Node entrypoint
```

### 4. Transfer to server

```bash
rsync -avz --delete \
  dist/ \
  package.json \
  package-lock.json \
  user@your-server:/var/www/my-hatch-site/
```

### 5. Install deps + create .env on server

```bash
ssh user@your-server 'bash -s' <<'EOF'
cd /var/www/my-hatch-site
npm ci --production

cat > .env <<ENVEOF
WP_API_URL=https://cms.example.com/wp-json/wp/v2
WP_API_USER=editor
WP_API_PASS=abcd efgh ijkl mnop
HATCH_WEBHOOK_SECRET=secret-from-wp-admin
PUBLIC_SITE_URL=https://your-domain.com
PORT=4321
HOST=127.0.0.1
ENVEOF

chmod 600 .env

pm2 start dist/server/entry.mjs --name my-hatch-site
pm2 save
pm2 startup
EOF
```

### 6. Configure reverse proxy

#### Caddy

```caddy
your-domain.com {
    reverse_proxy localhost:4321
    encode gzip
}
```

```bash
caddy reload --config /etc/caddy/Caddyfile
```

#### Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4321;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
nginx -t && systemctl reload nginx
certbot --nginx -d your-domain.com
```

#### RunCloud

1. Web Apps → New Web App → **Custom Web App**
2. Type: **Reverse Proxy**
3. Domain: your-domain.com
4. Backend: `127.0.0.1:4321`
5. Enable SSL (Let's Encrypt toggle)
6. Save

### 7. Update WP webhook

WP Admin → Tools → Hatch → Revalidation URL:
```
https://your-domain.com/blog/api/revalidate
```

### 8. Auto-deploy on git push (optional)

**GitHub Actions** — create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci && npm run build
      - name: Sync to server
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          source: "dist/,package.json,package-lock.json"
          target: "/var/www/my-hatch-site"
      - name: Restart PM2
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/my-hatch-site
            npm ci --production
            pm2 restart my-hatch-site
```

### Cost

Your VPS cost only. Hatch adds ~50MB RAM for the Node process.

| Traffic | Recommended VPS |
|---|---|
| Personal blog | 1 vCPU / 256 MB |
| Small business | 1 vCPU / 512 MB |
| 100k+ visits/day | 2 vCPU / 2 GB + Cloudflare CDN in front |

---

## After every deploy — Checklist

```bash
# 1. Status check
curl -sI https://your-domain.com | head -3
# → HTTP/2 200

# 2. Posts loading
curl -s https://your-domain.com/blog | grep -c '<article'
# → should be > 0

# 3. Revalidation working
# Edit a post in WP → check it updates on frontend within 5 seconds

# 4. Sitemap indexed
curl -s https://your-domain.com/sitemap.xml | head -5
# → valid XML

# 5. CMS noindexed
curl -s https://cms.example.com | grep -i 'noindex'
# → should match (Hatch plugin enforces this)
```

---

## The `/hatch-deploy` command

If you're inside Claude Code, just run:

```
/hatch-deploy
```

It asks which platform and walks you through the whole thing interactively.  
Powered by the `claude-plugin/skills/hatch-deploy/SKILL.md` skill.

---

## See also

- [Cloudflare Workers — full details](./cloudflare-workers.md)
- [Vercel — full details](./vercel.md)
- [VPS / RunCloud — full details](./vps-runcloud.md)
- [Netlify](./netlify.md)

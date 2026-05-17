# Deploy Hatch to your existing VPS (RunCloud / Caddy / Nginx)

Best when you already have a VPS — no new vendor, full control, your existing CI/CD.

## Cost

Whatever your VPS costs. Hatch adds ~50MB RAM for the Node process.

## Prerequisites

- VPS with Node 20+ installed
- PM2 (`npm install -g pm2`)
- Reverse proxy (Caddy, Nginx, or RunCloud's built-in)
- SSH access

## Steps

### 1. Add the Node adapter

```bash
cd [your-hatch-project]
npm install @astrojs/node
```

Update `astro.config.mjs`:

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

### 2. Build locally

```bash
npm run build
```

Output goes to `dist/`. Includes `dist/server/entry.mjs` which is the Node entrypoint.

### 3. Transfer to server

```bash
rsync -avz --delete \
  dist/ \
  package.json \
  package-lock.json \
  user@your-server:/var/www/my-hatch-site/
```

### 4. Install production deps + start with PM2

```bash
ssh user@your-server
cd /var/www/my-hatch-site
npm ci --production

# Create .env on the server (NEVER commit it)
cat > .env <<EOF
WP_API_URL=https://cms.example.com/wp-json/wp/v2
WP_API_USER=editor
WP_API_PASS="abcd efgh ijkl mnop"
HATCH_WEBHOOK_SECRET=secret-from-wp-admin
PUBLIC_SITE_URL=https://your-domain.com
PORT=4321
HOST=127.0.0.1
EOF
chmod 600 .env

# Start
pm2 start dist/server/entry.mjs --name my-hatch-site
pm2 save
pm2 startup
```

### 5. Configure reverse proxy

#### Caddy

```caddy
your-domain.com {
    reverse_proxy localhost:4321
    encode gzip
}
```

Reload: `caddy reload --config /etc/caddy/Caddyfile`

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

Reload: `nginx -t && systemctl reload nginx`

#### RunCloud

1. Web Apps → Create Web App → "Custom Web App"
2. Type: **Reverse Proxy**
3. Domain: your-domain.com
4. Backend: `127.0.0.1:4321`
5. Enable Let's Encrypt SSL
6. Save

### 6. Update WP webhook URL

WP Admin → Tools → Hatch → set webhook URL to `https://your-domain.com/blog/api/revalidate`.

## Auto-deploy on git push (optional)

Set up a GitHub webhook → server endpoint that runs:

```bash
cd /var/www/my-hatch-site && \
  git pull && \
  npm ci --production && \
  npm run build && \
  pm2 restart my-hatch-site
```

Or use GitHub Actions with `appleboy/ssh-action`.

## SSL

- **Caddy:** automatic via Let's Encrypt
- **Nginx:** `certbot --nginx`
- **RunCloud:** built-in toggle

## Resource sizing

| Site size | RAM | CPU |
|---|---|---|
| Personal blog (< 100 posts/day) | 256 MB | 1 vCPU |
| Small business (1k-10k visits/day) | 512 MB | 1 vCPU |
| Heavy traffic (100k+ visits/day) | 2 GB + Cloudflare in front | 2 vCPUs |

## Why VPS over Cloudflare?

- You control the runtime
- No vendor request limits
- Existing PM2/Caddy ecosystem
- Server-side libraries that don't run on Workers (e.g. heavy Node deps)

## Common issues

**PM2 process keeps restarting** → check `pm2 logs my-hatch-site`. Usually `.env` missing or wrong port.

**502 from Caddy/Nginx** → Astro process not running. Check `pm2 list`.

**Memory leak** → restart on schedule: `pm2 restart my-hatch-site --cron-restart "0 4 * * *"` (daily 4am).

# Mounting Hatch at `/blog` on your existing site

This is the wedge feature. Businesses want `yoursite.com/blog` on the same
domain as their marketing site — subdirectories consolidate SEO authority
better than subdomains. **WP Engine, Kinsta, and most managed WP hosts can't
do this without multisite gymnastics.** Hatch can.

**How it works:** your marketing site keeps serving `yoursite.com`. When a
visitor hits any `/blog/*` path, your host reverse-proxies (VPS) or rewrites
(Vercel/Cloudflare) the request to Hatch's Astro frontend. The visitor
never sees the Astro origin URL. Static HTML. Same domain. Same SEO
authority. Zero PHP attack surface on `/blog/*`.

There are three deploy shapes below. Pick the one that matches your host.

---

## Shape 1 — VPS (Nginx or Caddy)

Simplest to reason about. You already own the box.

### Nginx config

Add this to the marketing site's `server` block. Order matters — the
`/blog/` `location` must come BEFORE the site's catch-all `location /`.

```nginx
# /etc/nginx/sites-available/yoursite.com
server {
    listen 443 ssl http2;
    server_name yoursite.com;

    # ... your existing SSL + main site config ...

    # === Hatch mount at /blog ===
    location /blog/ {
        # Astro frontend URL (from Hatch admin → Design → Connection)
        proxy_pass https://your-hatch-frontend.pages.dev/;

        proxy_ssl_server_name on;
        proxy_set_header Host $proxy_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host yoursite.com;

        # Rewrite absolute URLs in HTML back to the /blog prefix
        proxy_set_header Accept-Encoding "";
        sub_filter_types text/html;
        sub_filter 'href="/' 'href="/blog/';
        sub_filter 'src="/'  'src="/blog/';
        sub_filter_once off;

        # Cache the static frontend aggressively — Cloudflare Pages / Vercel
        # already emit long cache headers, keep them.
        proxy_cache_valid 200 60m;
        proxy_buffering on;
    }

    # ... rest of the site (main location / at the end) ...
}
```

Reload: `sudo nginx -t && sudo systemctl reload nginx`.

**In Hatch admin**: Design → Connection → set the **Astro frontend URL**
to the origin URL (e.g. `https://your-hatch-frontend.pages.dev`). Set the
**Site URL** to `https://yoursite.com/blog`. That last part tells Hatch to
emit canonical URLs pointing at the customer-facing `/blog` path, not the
proxy origin.

### Caddy config (simpler alternative)

```
yoursite.com {
    # ... existing directives ...

    handle_path /blog/* {
        reverse_proxy https://your-hatch-frontend.pages.dev {
            header_up Host {upstream_hostport}
            header_up X-Forwarded-Host yoursite.com
        }
    }

    handle {
        # your existing marketing site behavior
        root * /var/www/marketing
        file_server
    }
}
```

`handle_path` strips the `/blog/` prefix before proxying — so Astro sees
`/hello-world` even though the visitor sees `/blog/hello-world`. Cleaner
than Nginx's `sub_filter` for URL rewriting.

Reload: `sudo caddy reload --config /etc/caddy/Caddyfile`.

---

## Shape 2 — Vercel

Marketing site AND Hatch frontend can be on the same Vercel account or
different accounts — the config is the same. Add this to the marketing
site's `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/blog",
      "destination": "https://your-hatch-frontend.vercel.app"
    },
    {
      "source": "/blog/:path*",
      "destination": "https://your-hatch-frontend.vercel.app/:path*"
    }
  ]
}
```

**In Hatch admin**: Design → Connection → Astro frontend URL =
`https://your-hatch-frontend.vercel.app`. Site URL =
`https://yoursite.com/blog`. Redeploy the marketing site — the rewrites
take effect on the next build.

**Gotcha**: Vercel rewrites strip the `/blog` prefix by default when the
proxied response contains absolute paths. If you see broken CSS/JS URLs
in devtools, add a `basePath: '/blog'` to your Astro config so it emits
prefixed paths at build time. Hatch's admin has a "URL base path" field
on the Deploy tab that writes this into the starter's `astro.config.mjs`
for you.

---

## Shape 3 — Cloudflare Pages

Two options — pick based on where the marketing site lives.

### 3a. Marketing site on Cloudflare Pages

Add this to the marketing site's `public/_redirects` file:

```
/blog        https://your-hatch-frontend.pages.dev/        200
/blog/*      https://your-hatch-frontend.pages.dev/:splat  200
```

`200` (not 301/302) means Cloudflare proxies the response instead of
redirecting the browser — so the visitor's URL stays on
`yoursite.com/blog/…`. This is exactly what you want for SEO consolidation.

### 3b. Marketing site elsewhere, use Cloudflare Workers as the proxy

Put your domain on Cloudflare (nameservers pointed at Cloudflare — free
tier is enough). Deploy this Worker on the route `yoursite.com/blog/*`:

```javascript
// worker.js — mount Hatch at /blog on any origin
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const HATCH_ORIGIN = 'https://your-hatch-frontend.pages.dev';

    // Strip the /blog prefix before forwarding to Hatch
    const path = url.pathname.replace(/^\/blog/, '') || '/';
    const target = new URL(path + url.search, HATCH_ORIGIN);

    const upstream = await fetch(target, {
      headers: {
        ...Object.fromEntries(request.headers),
        'Host': new URL(HATCH_ORIGIN).host,
        'X-Forwarded-Host': url.hostname,
      },
      method: request.method,
      body: request.method === 'GET' ? undefined : request.body,
    });

    return upstream;
  }
};
```

`wrangler deploy` and set the route in the Cloudflare dashboard →
Workers → your-worker → Triggers → Add Route: `yoursite.com/blog/*`.

**Free tier limit**: 100K requests/day. Fine for anything short of a
top-50-Alexa marketing site.

---

## Common gotchas (all three shapes)

### 1. Astro emits absolute `/` paths
By default Astro's `<link>`/`<script>` tags reference `/_astro/…`. When
the frontend is proxied under `/blog/`, those paths 404. Two fixes:
- **Set `base: '/blog'` in `astro.config.mjs`** — Astro then emits
  `/blog/_astro/…` paths. Correct for the visitor, but the Astro dev
  server can't preview at `/` anymore.
- **Use a rewrite proxy that strips the prefix** (Caddy `handle_path`,
  CF Pages `_redirects`, the Worker above). Astro stays unaware. This
  is what the Hatch deploy pipeline sets up automatically.

Hatch's admin does the right thing based on which host you pick.

### 2. Absolute canonical URLs
Hatch has to know the customer-facing URL (`yoursite.com/blog/...`), not
the origin URL (`your-hatch-frontend.pages.dev/...`), or search engines
will index the wrong domain. Set **Design → Connection → Site URL** to
`https://yoursite.com/blog`. Every canonical, sitemap, RSS `<link>`, OG
tag, and JSON-LD `@id` will use it.

### 3. Cookies and auth
If your marketing site sets cookies at `yoursite.com`, they're visible
to `/blog/*` too. If Hatch's frontend does client-side login (comments,
etc.), tokens are scoped correctly by default. If you have a WordPress
admin at `/wp-admin/` on the same origin, cookies collide. Don't put
WP admin on the customer-facing domain — keep it behind a subdomain
like `admin.yoursite.com`.

### 4. RSS + sitemap URLs
Hatch emits `/blog/rss.xml` and `/blog/sitemap.xml` when the base path
is set. Confirm they resolve after deploy — if they 404 the base path
didn't propagate. Rerun the Hatch admin **Design → Deploy → Rebuild
configuration** button.

---

## Verifying the mount

Once configured:

```bash
# Should return the Astro home page HTML with prefixed asset URLs
curl -sI https://yoursite.com/blog | head -1
# Should return HTTP/2 200

# Should return a specific post's HTML (not the origin URL)
curl -sL https://yoursite.com/blog/hello-world/ | grep -oE 'canonical.*yoursite' | head -1
# Should show <link rel="canonical" href="https://yoursite.com/blog/hello-world/">

# Should NOT leak the origin URL
curl -sL https://yoursite.com/blog/ | grep -oE 'pages.dev|vercel.app'
# Should return empty
```

If any of those fail, check the host's edge logs. Most issues are one of:
absent `X-Forwarded-Host`, missing `sub_filter` on Nginx, wrong `base:`
in the Astro config, or a stale Hatch admin Site URL setting.

---

## When to NOT use `/blog`

- **You have a WordPress admin at `yoursite.com/wp-admin`** — cookie
  collision + double-serving problem. Move WP to `admin.yoursite.com`.
- **You need real-time interactivity on `/blog/*`** (live chat widget,
  logged-in comments with cookie-based session) — static frontend + proxy
  makes this harder. Doable with Hatch's JWT visitor auth (roadmap) but
  not with the default alpha.
- **Your marketing site's CDN doesn't support origin rewrites** (Amazon
  CloudFront custom origin under a prefix is possible but painful). VPS
  or Cloudflare Workers is simpler.

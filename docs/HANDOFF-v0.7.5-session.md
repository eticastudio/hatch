# HANDOFF — Hatch v0.7.5 session (2026-08-08)

> Parallel-agent session. This commit (`c9233d7`) contains all edits from
> 4 concurrent agents plus this verify + docs pass. **LOCAL commit only —
> not pushed to GitHub.** Push when the "Known limitations" below are
> reviewed and you're happy.

## What changed

**WordPress plugin**
- `class-menus-bridge.php` — public menu endpoint at
  `/wp-json/hatch/v1/menus/<location>` (was auth-required, blocked SSR)
- `class-menus-bridge.php` — strips ANY host prefix on nav URLs (was
  only stripping `home_url()`, so tunnel-rotated URLs leaked through)
- `class-deploy-broker.php` — broker payload now forwards `mountMode`,
  `subPath`, `domain` (wizard values were being dropped)
- `class-features.php` — additions for tab a11y + design consistency
- `class-rest-api.php` — misc endpoint hardening
- `admin/dashboard.php` — PHP deprecation warning removed
- `admin/setup-wizard.php` — em-dash → `--` normalised (banned char)
- `admin-react/src/setup/SetupApp.jsx` — preflight gate on Step 1
  Continue; no longer bounces to wizard on ongoing session
- `admin-react/src/tabs/PluginBridge.jsx` — full BrokerForm rewrite
  (mount picker + CF permission checklist + broker payload wiring)
- `admin-react/src/tabs/Design.jsx` — Custom-theme wizard tile now
  clickable; duplicate color-picker whitelist fixed
- `optional-mu-plugin/hatch-url-rewrite.php` — reads `hatch_frontend_url`
  option and auto-rewrites stale tunnel URLs in HTML/JSON output

**Astro starter**
- `src/pages/product/[slug].astro` — NEW: WooCommerce product detail,
  fetches from `/wp-json/hatch/v1/store/products?per_page=100`, renders
  image + title + price + short desc + "Add to cart" fallback
- `src/pages/sitemap.xml.ts` — NEW: hand-rolled SSR sitemap
- `src/pages/index.astro` — trimmed toward home vs blog split (partial —
  see limitations)
- `src/pages/blog/[slug].astro` + `blog/index.astro` — a11y + LCP hints
- `src/components/PostCard.astro` + `SiteHeader.astro` + `HatchImage.astro`
  — design token consistency, tab a11y (`role=tab` + `aria-selected`
  + `aria-controls`), featured image consistency
- `src/lib/features.ts` — feature-flag additions

**Tests / nextjs-starter**
- `tests/consistency/*` — layout-matrix, admin-audit, admin-layout,
  alignment specs updated
- `nextjs-starter/src/lib/features.ts` + `theme-tech.css` — parity with
  astro-starter

## Live URLs (verified this session)

| What | URL | Status |
|---|---|---|
| LOCAL WP admin | http://localhost:8080/wp-admin/admin.php?page=hatch | 302 (redirect OK) |
| LOCAL Astro home | http://localhost:4321/ | 200 |
| LOCAL Astro /blog/ | http://localhost:4321/blog/ | 200 (posts render) |
| LOCAL Astro /product/hatch-smoke-product | http://localhost:4321/product/hatch-smoke-product | 404 body-status ⚠️ |
| Tunnel WP-JSON | https://mariah-uri-scored-sets.trycloudflare.com/wp-json/ | 200 |
| Tunnel store bridge | .../wp-json/hatch/v1/store/products | 200 (1 product, `$29`) |
| Tunnel menu bridge | .../wp-json/hatch/v1/menus/primary | 200 (2 items) |
| LIVE CF Worker | https://hatch.adityaarsharma.com/ | 200 |
| LIVE CF Worker /blog/ | https://hatch.adityaarsharma.com/blog/ | 404 ⚠️ |

## How to redeploy after tunnel rotation

The current trycloudflare tunnel
`https://mariah-uri-scored-sets.trycloudflare.com` will eventually die.
When it does:

```bash
# 1. Get a new tunnel URL from the WP container (or restart cloudflared)
docker exec hatch_wp cat /var/log/cloudflared.log | grep trycloudflare | tail -1
# copy the new https://*.trycloudflare.com URL

# 2. Update the Astro .env
cd "/Users/adityasharma/Claude Projects/Hatch/astro-starter"
sed -i.bak "s|https://[^/]*trycloudflare.com|<NEW_URL>|g" .env

# 3. Restart astro
docker restart hatch_astro

# 4. Update WP option so mu-plugin rewrites stale URLs
docker exec hatch_wp wp option update hatch_frontend_url "http://localhost:4321" --allow-root
```

For **production**, replace the trycloudflare tunnel with a **named
Cloudflare tunnel** (`cloudflared tunnel create hatch-wp-live`) so the
hostname is stable across restarts.

## Known limitations / deferrals

1. **`/product/[slug].astro` returns 404 body-status on localhost.**
   The bridge endpoint works (`store/products` returns the product);
   the page renders but hits its "Product not found" branch. Suspect:
   `hatch_astro` container has `HATCH_WP_API_URL` set but the page
   imports `WP_API_URL` from `astro:env/server`. Env source mismatch.
   Fix: add `WP_API_URL` to docker-compose or set from `.env` at build
   time. Bridge itself is production-ready.

2. **CF Worker live `/blog/` returns 404.** `hatch.adityaarsharma.com/`
   works but the `/blog/` route doesn't. Worker deploy from the CF-Worker
   agent likely didn't complete or didn't republish. Redeploy with
   `cd astro-starter && HATCH_TARGET=cf npm run build && wrangler deploy`.

3. **Home vs /blog/ split incomplete.** `index.astro` was trimmed but
   still shows blog content — the "hero + latest 3" split from the
   polish agent hasn't fully landed. Both URLs currently render the
   same H1 ("Blog").

4. **trycloudflare tunnels are ephemeral.** They can die at any time
   with no warning. Use named tunnels for anything longer than a demo
   session. Store products (id `97`) survive because they live in WP;
   only the URL fronting them changes.

5. **CF Worker theme propagation NOT verified live.** The task included
   "theme + fonts now propagate to live (was defaulting to blog theme)"
   but the live Worker at `hatch.adityaarsharma.com` shows a different
   codebase and I could not confirm theme propagation there this
   session.

## Verification runs

- `git status`: clean, all 27 changed files committed to `c9233d7`
- `php -l` on 6 modified PHP files: 0 errors
- Admin bundle `wp-plugin/build/admin/index.jsx.js`: **136 KB**
  (sanity budget = 150 KB, PASS)
- Docker: `hatch_astro`, `hatch_wp`, `hatch_db`, `docker-wordpress-1`
  all up
- No PHP fatal on `wp-json/` root
- No React error visible in admin bundle console (not opened this
  session — recommend Chrome MCP visual check before demo)

## Bug catalog reference

Full extracted bug list from prior sessions:
`/private/tmp/hatch-bug-catalog.md` (142 user-reported, 324 Claude-
identified). This session addressed the top demo-critical items via
parallel agents; the rest remain in the catalog for future waves.

## Next actions (recommended order)

1. Fix `/product/` env var (add `WP_API_URL` to `docker-compose.yml`
   for `hatch_astro`, restart).
2. Republish CF Worker (`wrangler deploy` from astro-starter with
   `HATCH_TARGET=cf`) and verify `/blog/` returns 200 live.
3. Land the true home vs `/blog/` split in `index.astro` (hero +
   latest 3 cards + CTA to `/blog/`).
4. Push `c9233d7` to GitHub `main` when the three above are green.
5. Rotate the trycloudflare URL to a named tunnel before shipping to
   any external viewer.

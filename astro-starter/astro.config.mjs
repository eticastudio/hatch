import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import vercel from '@astrojs/vercel';
import node from '@astrojs/node';
// Sitemap is hand-rolled in src/pages/sitemap-index.xml.ts because it needs
// to enumerate WP posts/pages/categories at request time (SSR). The
// @astrojs/sitemap integration only sees static routes and would publish an
// incomplete sitemap to crawlers. Don't re-add it.

const SITE_URL = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';

// Detect deploy target. Priority:
// v0.50.31 — Default target is NODE (run Astro on the same VPS as WordPress).
// Hatch is "self-hosted everywhere by default" — no Cloudflare Images, no
// Vercel lock-in, no external image pipeline. Sharp does WebP/AVIF locally.
// Cloudflare Workers + Vercel still supported as opt-in via HATCH_TARGET
// env var for users who want them, but never the default.
//   1. HATCH_TARGET env var (explicit — set by install-vps.sh for VPS builds)
//   2. VERCEL=1 (set automatically by Vercel build env)
//   3. CF_PAGES=1 (set by CF Pages build env)
//   4. Default → 'node' (self-hosted on the same server as WordPress)
const target =
  process.env.HATCH_TARGET ||
  (process.env.VERCEL === '1' ? 'vercel' :
   process.env.CF_PAGES === '1' ? 'cf' :
   'node');

const adapter =
  target === 'cf'     ? cloudflare({ imageService: 'passthrough' }) :
  target === 'vercel' ? vercel() :
                        node({ mode: 'standalone' });

// Image service: Sharp on Node (default) — runs locally, no external service,
// no per-request cost. Generates WebP + AVIF at request time. Cloudflare
// adapter uses 'passthrough' so the Workers runtime doesn't try to bundle
// sharp (which fails on the Workers runtime); that path is only hit if a
// user EXPLICITLY sets HATCH_TARGET=cf.

export default defineConfig({
  site: SITE_URL,
  // SSR mode — Astro renders pages on each request, fetches WP at runtime,
  // applies Cache-Control headers so the platform's edge cache holds responses
  // for the configured TTL. Result: instant content updates without rebuilds,
  // edge-cached after the first hit per page.
  output: 'server',
  adapter,
  integrations: [],
  // Hatch is headless — the live frontend is the deployed site, not the dev
  // overlay. Astro's floating dev toolbar (Astro / Audit / Settings) gets in
  // the way of preview screenshots and the editor flow, so we disable it
  // unconditionally. Devs who want it back can pass `--open` with toolbar
  // env overrides.
  devToolbar: { enabled: false },
  // Prefetch makes navigation feel instant — Astro injects link prefetches
  // on hover by default. Auto-disabled for data-saver/slow networks. Per-link
  // opt-out with `data-astro-prefetch="false"`. Wired here because the
  // Performance tab persists `hatch_perf.prefetch_strategy` but the runtime
  // hook for that isn't built yet — sensible default ships now.
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  // Origin check for non-GET requests — Astro returns 403 if the Origin header
  // doesn't match the site. Catches CSRF attempts against /blog/api/revalidate
  // and any future Astro Actions endpoints. Cost: nothing — server-side check.
  security: {
    checkOrigin: true,
  },
  // v0.50.31 — Astro's OFFICIAL image service. Per https://docs.astro.build/en/guides/images/
  // the default service on Node is `astro/assets/services/sharp` which uses
  // the Sharp library to convert uploads to modern formats (WebP, AVIF) on
  // request, with built-in cache. We pass it explicitly so config is obvious
  // (rather than relying on the "auto" default). Nothing custom — this is
  // what Astro recommends for self-hosted SSR.
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
    // Allow remote images from any HTTPS source (WordPress media library).
    remotePatterns: [{ protocol: 'https' }],
  },
  // v0.50.x — secrets moved out of the JS bundle via astro:env.
  //
  // Before: WP_API_PASS was Vite-inlined into the deployed worker code,
  // visible to anyone who could fetch the bundle. That's a real leak.
  //
  // After: astro:env schema declares the variable as server-only secret.
  // Consumers import { WP_API_PASS } from 'astro:env/server' and Astro
  // reads it at RUNTIME from the platform's env binding:
  //   - Cloudflare: set with `wrangler secret put WP_API_PASS`
  //   - Vercel: dashboard env vars
  //   - Node / VPS: process.env (set by install-vps.sh)
  // Build still works without the var set; runtime fetch fails fast if
  // it's missing, which is the correct failure mode.
  env: {
    schema: {
      WP_API_URL:           envField.string({ context: 'server', access: 'public', optional: true }),
      WP_API_USER:          envField.string({ context: 'server', access: 'secret', optional: true }),
      WP_API_PASS:          envField.string({ context: 'server', access: 'secret', optional: true }),
      HATCH_WEBHOOK_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      HATCH_BROKER_URL:     envField.string({ context: 'server', access: 'public', optional: true, default: 'https://hatch.adityaarsharma.com' }),
    },
  },
  vite: {
    plugins: [ tailwindcss() ],
    // v0.50.31 — Vendored themes/ removed (Path X chosen). Hatch ships its
    // own per-theme components under src/components/theme/<name>/, all
    // reading the same --hatch-* CSS-var contract. No upstream SHA pinning,
    // no Vite fs.allow override needed.
    define: {
      // Only constants known at build time stay as Vite defines. Anything
      // that could be a secret or environment-dependent goes through
      // astro:env above.
      'import.meta.env.HATCH_VERSION': JSON.stringify('0.16.0'),
      'import.meta.env.HATCH_TARGET':  JSON.stringify(target),
    },
  },
});

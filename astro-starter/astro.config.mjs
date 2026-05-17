import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import vercel from '@astrojs/vercel';
import node from '@astrojs/node';

const SITE_URL = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';

// Detect deploy target. Priority:
//   1. HATCH_TARGET env var (explicit — set by install-vps.sh for VPS builds)
//   2. VERCEL=1 (set automatically by Vercel build env)
//   3. CF_PAGES=1 (set by CF Pages build env)
//   4. /opt/buildhome path (CF Workers Builder env, doesn't set CF_PAGES=1)
//   5. Default → 'cf' (because deploy.workers.cloudflare.com is our primary
//      target; VPS installs set HATCH_TARGET=node explicitly anyway).
const target =
  process.env.HATCH_TARGET ||
  (process.env.VERCEL === '1' ? 'vercel' :
   process.env.CF_PAGES === '1' ? 'cf' :
   process.cwd().includes('/opt/buildhome') ? 'cf' :
   'cf');

const adapter =
  target === 'cf'     ? cloudflare({ imageService: 'passthrough' }) :
  target === 'vercel' ? vercel() :
                        node({ mode: 'standalone' });

// imageService note: 'compile' (runs sharp at build time only) still leaves
// sharp's IIFE in the worker bundle, which then calls process.report.getReport()
// at runtime — not implemented in CF Workers, build fails with validation
// error 10021. 'passthrough' skips Astro's image transforms entirely, so
// <Image> tags render the original URL straight from WordPress. WP already
// handles image sizing via its own srcset, so this is fine for the headless
// case. If you want client-side optimization, swap in Cloudflare Images via
// imageService: 'cloudflare' (paid feature).

export default defineConfig({
  site: SITE_URL,
  // SSR mode — Astro renders pages on each request, fetches WP at runtime,
  // applies Cache-Control headers so the platform's edge cache holds responses
  // for the configured TTL. Result: instant content updates without rebuilds,
  // edge-cached after the first hit per page.
  output: 'server',
  adapter,
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/api/'),
    }),
  ],
  image: {
    remotePatterns: [
      { protocol: 'https' },
    ],
  },
  vite: {
    plugins: [ tailwindcss() ],
    define: {
      'import.meta.env.HATCH_VERSION': JSON.stringify('0.16.0'),
      'import.meta.env.HATCH_TARGET':  JSON.stringify(target),
      // v0.49.2 — bake WP creds into the bundle at build time. Required for
      // Cloudflare Workers SSR: import.meta.env at runtime is undefined for
      // non-PUBLIC vars, so we MUST inline them via Vite define. The broker
      // sets these in process.env before running `npm run build`.
      'import.meta.env.WP_API_URL':           JSON.stringify(process.env.WP_API_URL  || ''),
      'import.meta.env.WP_API_USER':          JSON.stringify(process.env.WP_API_USER || ''),
      'import.meta.env.WP_API_PASS':          JSON.stringify(process.env.WP_API_PASS || ''),
      'import.meta.env.HATCH_WEBHOOK_SECRET': JSON.stringify(process.env.HATCH_WEBHOOK_SECRET || ''),
      // v0.50.1 — broker URL for the same-domain /img proxy endpoint.
      // Defaults to the public Hatch broker; self-hosters can override.
      'import.meta.env.HATCH_BROKER_URL':     JSON.stringify(process.env.HATCH_BROKER_URL || 'https://hatch.adityaarsharma.com'),
    },
  },
});

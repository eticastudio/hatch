/**
 * /__hatch-verify — probe endpoint used by the onboarding wizard to
 * confirm the /blog reverse-proxy mount is actually reaching the Astro
 * origin. The wizard polls `https://<money-domain>/blog/__hatch-verify`
 * every 3s for 60s after the user clicks "Deploy" on Cloudflare/Vercel/
 * Netlify. A JSON body with `hatch: true` means the mount succeeded.
 *
 * The response includes a build stamp so the wizard can detect stale
 * caching layers between the money-domain edge and the Astro origin.
 *
 * @since 0.5.2
 */
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ request }) => {
  const url = new URL(request.url);
  const now = Date.now();
  const payload = {
    hatch: true,
    version: '0.5.2',
    mount: 'ok',
    // What the Astro origin thinks its own hostname is. If the money-domain
    // proxy is set up correctly, `x_forwarded_host` (below) shows the
    // customer-facing hostname; `origin_host` shows the Astro origin.
    // These differ = proxy is working.
    origin_host: url.host,
    x_forwarded_host: request.headers.get('x-forwarded-host') || null,
    request_id: crypto.randomUUID(),
    timestamp: now,
    timestamp_iso: new Date(now).toISOString(),
  };
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Bust every cache layer between the client and here.
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
      'Pragma': 'no-cache',
      // CORS wide open — the wizard admin JS polls this cross-origin.
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    },
  });
};

export const HEAD: APIRoute = () => new Response(null, { status: 200 });
export const OPTIONS: APIRoute = () => new Response(null, {
  status: 204,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Max-Age': '86400',
  },
});

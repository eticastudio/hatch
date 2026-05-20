import type { APIRoute } from 'astro';
import { HATCH_WEBHOOK_SECRET } from 'astro:env/server';
import { clearFeaturesCache } from '@/lib/features';

/**
 * Revalidation endpoint hit by the Hatch WP plugin webhook on post events
 * and on any admin save (Hatch_Revalidate::trigger).
 *
 * Accepts BOTH GET and POST so the WP-side `wp_remote_post` (which doesn't
 * set an Origin header and would 403 against Astro's checkOrigin guard) can
 * fall back to GET. The secret travels in the query string either way; the
 * Hatch_Revalidate class also includes it as an `X-Hatch-Secret` header.
 *
 * Behavior depends on host:
 *  - Cloudflare Workers: purge tags via Cache API
 *  - Vercel: revalidatePath/Tag (when using their adapter)
 *  - Node/VPS: in-memory cache invalidation (or noop if no cache layer)
 *
 * Per-host edge cache purge is a roadmap item; this endpoint always clears
 * the in-process features cache so the next page render re-fetches WP.
 */
const handle = async ({ request, url }: Parameters<APIRoute>[0]): Promise<Response> => {
  const secret = url.searchParams.get('secret') || request.headers.get('x-hatch-secret') || '';
  const expected = HATCH_WEBHOOK_SECRET;

  if (!expected || secret !== expected) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid secret' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: unknown = {};
  if (request.method === 'POST') {
    try { payload = await request.json(); } catch { payload = {}; }
  }

  clearFeaturesCache();
  console.log('[hatch] revalidate received — features cache cleared', payload);

  return new Response(JSON.stringify({ ok: true, payload }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const GET:  APIRoute = (ctx) => handle(ctx);
export const POST: APIRoute = (ctx) => handle(ctx);

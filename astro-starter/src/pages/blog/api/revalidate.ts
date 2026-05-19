import type { APIRoute } from 'astro';
import { HATCH_WEBHOOK_SECRET } from 'astro:env/server';

/**
 * Revalidation endpoint hit by the Hatch WP plugin webhook on post events.
 *
 * URL: /blog/api/revalidate?secret=XXX
 * Body: { event, post_id, slug, type, tag }
 *
 * Behavior depends on host:
 *  - Cloudflare Workers: purge tags via Cache API
 *  - Vercel: revalidatePath/Tag (when using their adapter)
 *  - Node/VPS: in-memory cache invalidation (or noop if no cache layer)
 *
 * For V0.1 this just validates the secret and acknowledges. Per-host cache
 * purging hooks land in V0.5.
 */
export const POST: APIRoute = async ({ request, url }) => {
  const secret = url.searchParams.get('secret');
  const expected = HATCH_WEBHOOK_SECRET;

  if (!expected || secret !== expected) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid secret' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  // TODO: per-host cache purge — see ROADMAP V0.5
  // For now, just log + acknowledge.
  console.log('[hatch] revalidate received', payload);

  return new Response(JSON.stringify({ ok: true, payload }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

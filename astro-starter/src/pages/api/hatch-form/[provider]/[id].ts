/**
 * GET /api/hatch-form/{provider}/{id}
 *
 * Astro-origin proxy to WordPress `/wp-json/hatch/v1/forms/{provider}/{id}`.
 * Exists because the Astro dev container reaches WP over the private docker
 * network (`http://wp`) which the browser cannot resolve; the browser only
 * ever talks to the Astro origin, and Astro forwards to WP server-side.
 *
 * v0.8 — REST-only forms hydration.
 */
import type { APIRoute } from 'astro';

export const prerender = false;

const WP_API = import.meta.env.WP_API_URL || '';
const WP_ORIGIN = WP_API.replace(/\/wp-json\/wp\/v2\/?$/, '').replace(/\/+$/, '');

export const GET: APIRoute = async ({ params }) => {
  const provider = String(params.provider || '').replace(/[^a-z0-9_-]/gi, '');
  const id = parseInt(String(params.id || '0'), 10);
  if (!provider || !id) {
    return new Response(JSON.stringify({ ok: false, error: 'bad_params' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!WP_ORIGIN) {
    return new Response(JSON.stringify({ ok: false, error: 'wp_origin_missing' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const res = await fetch(`${WP_ORIGIN}/wp-json/hatch/v1/forms/${provider}/${id}`, {
      headers: { Accept: 'application/json' },
    });
    const body = await res.text();
    // Rewrite absolute WP-origin submit URLs so the browser POSTs back to
    // the Astro proxy at /api/hatch-form/{provider}/{id}/submit — keeps
    // everything single-origin from the browser's perspective.
    let out = body;
    try {
      const parsed = JSON.parse(body);
      if (parsed && parsed.submit && typeof parsed.submit.url === 'string') {
        parsed.submit.url = `/api/hatch-form/${provider}/${id}/submit`;
      }
      out = JSON.stringify(parsed);
    } catch {/* pass through raw body */}
    return new Response(out, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: 'proxy_failed', msg: String(e?.message || e) }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    });
  }
};

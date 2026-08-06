/**
 * POST /api/hatch-form/{provider}/{id}/submit
 *
 * Astro-origin proxy that forwards a form submission JSON body to
 * WordPress `/wp-json/hatch/v1/forms/{provider}/{id}/submit`. Server-side
 * fetch, so the browser stays on the Astro origin and the private docker
 * WP hostname never leaks into client code.
 *
 * v0.8 — REST-only forms hydration.
 */
import type { APIRoute } from 'astro';

export const prerender = false;

const WP_API = import.meta.env.WP_API_URL || '';
const WP_ORIGIN = WP_API.replace(/\/wp-json\/wp\/v2\/?$/, '').replace(/\/+$/, '');

export const POST: APIRoute = async ({ params, request }) => {
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
  const body = await request.text();
  try {
    const res = await fetch(`${WP_ORIGIN}/wp-json/hatch/v1/forms/${provider}/${id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
        Accept: 'application/json',
        // Forward client IP so plugin spam checks see the real submitter.
        'X-Forwarded-For': request.headers.get('x-forwarded-for')
          || request.headers.get('cf-connecting-ip') || '',
      },
      body,
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: 'proxy_failed', msg: String(e?.message || e) }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    });
  }
};

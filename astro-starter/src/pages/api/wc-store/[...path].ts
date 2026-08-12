import type { APIRoute } from 'astro';
import { WP_API_URL } from 'astro:env/server';

/**
 * Same-origin proxy for the WooCommerce Store API (/wc/store/v1/*).
 *
 * Why this exists (#165 fallout):
 *   The Store API supports CORS but only for its own OPTIONS preflight;
 *   actual GET/POST responses do not echo Access-Control-Allow-Origin
 *   unless the site owner adds a filter. Rather than depend on every
 *   Hatch install extending WP's CORS filter, the browser calls
 *   /api/wc-store/... on the Astro origin and Astro forwards the call to
 *   WP server-side. Same-origin from the browser's POV; no CORS surface.
 *
 * Passes through:
 *   - Method  (GET, POST, PUT, DELETE, OPTIONS)
 *   - Body    (raw)
 *   - Headers: Content-Type, Nonce, Cart-Token, X-WP-Nonce, Authorization
 *
 * Copies back:
 *   - Body
 *   - Headers: Nonce, Cart-Token, Cart-Hash, Set-Cookie, Content-Type
 *
 * Set-Cookie forwarding keeps the anonymous cart session alive for the
 * browser without exposing the WP origin.
 */

export const prerender = false;

const WP_BASE = (WP_API_URL || '').replace(/\/wp-json(\/.*)?$/, '').replace(/\/$/, '');

const FORWARD_REQ_HEADERS = [
  'content-type',
  'nonce',
  'cart-token',
  'x-wp-nonce',
  'authorization',
  'accept',
];

const FORWARD_RES_HEADERS = [
  'nonce',
  'cart-token',
  'cart-hash',
  'content-type',
];

async function proxy(request: Request, path: string | undefined): Promise<Response> {
  if (!WP_BASE) {
    return new Response(JSON.stringify({ code: 'hatch_wp_api_url_missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const cleanPath = (path || '').replace(/^\/+/, '').replace(/\.\./g, '');
  const url = new URL(request.url);
  const target = `${WP_BASE}/wp-json/wc/store/v1/${cleanPath}${url.search}`;

  const outHeaders: Record<string, string> = {};
  for (const h of FORWARD_REQ_HEADERS) {
    const v = request.headers.get(h);
    if (v) outHeaders[h] = v;
  }
  const cookie = request.headers.get('cookie');
  if (cookie) outHeaders['cookie'] = cookie;

  const body = ['GET', 'HEAD'].includes(request.method)
    ? undefined
    : await request.arrayBuffer();

  const upstream = await fetch(target, {
    method: request.method,
    headers: outHeaders,
    body,
    redirect: 'manual',
  });

  const resHeaders = new Headers();
  for (const h of FORWARD_RES_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) resHeaders.set(h, v);
  }
  // Forward every Set-Cookie so the anonymous cart session sticks to the
  // browser under the Astro origin.
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') resHeaders.append('set-cookie', value);
  });

  return new Response(upstream.body, { status: upstream.status, headers: resHeaders });
}

export const GET: APIRoute = ({ request, params }) => proxy(request, params.path as string);
export const POST: APIRoute = ({ request, params }) => proxy(request, params.path as string);
export const PUT: APIRoute = ({ request, params }) => proxy(request, params.path as string);
export const DELETE: APIRoute = ({ request, params }) => proxy(request, params.path as string);
export const OPTIONS: APIRoute = ({ request, params }) => proxy(request, params.path as string);

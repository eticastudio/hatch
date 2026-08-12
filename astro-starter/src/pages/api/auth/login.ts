import type { APIRoute } from 'astro';
import { WP_API_URL } from 'astro:env/server';

/**
 * Same-origin login proxy.
 *
 * CLEAN-ROOM ORIGINAL. Zero lines copied from any external repo.
 * Forwards {username,password} to WP /hatch/v1/auth/login and pipes the
 * Set-Cookie header (hatch_jwt) back to the browser so the cookie ends up
 * on the frontend origin, not the internal docker WP hostname.
 */

export const prerender = false;

const WP_BASE = (WP_API_URL || '').replace(/\/wp\/v2\/?$/, '').replace(/\/$/, '');

function json(body: unknown, status: number, extra?: HeadersInit): Response {
  const headers = new Headers(extra);
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(body), { status, headers });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!WP_BASE) return json({ message: 'Auth is not configured.' }, 503);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ message: 'Invalid request body.' }, 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${WP_BASE}/hatch/v1/auth/login`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Forwarded-For': clientAddress || '',
        'User-Agent': request.headers.get('user-agent') || 'Hatch-Auth-Proxy/1.0',
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return json({ message: 'Could not reach the server. Try again.' }, 504);
  }

  const text = await upstream.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { return json({ message: 'Unexpected response.' }, 502); }

  const headers = new Headers({ 'Content-Type': 'application/json' });

  // WP writes multiple Set-Cookie entries on login: hatch_jwt +
  // wordpress_logged_in_* + wp-settings-* + wp-settings-time-*. Each must
  // ride back to the browser as its own header. undici merges them under
  // .get(), so use .getSetCookie() when present (Node 20+/undici) and fall
  // back to iterating .headers otherwise.
  //
  // Domain= is stripped so cookies bind to the Astro origin, not the WP
  // internal hostname. In a reverse-proxy deploy the two share an origin
  // and this rewrite is a no-op; in split-origin dev (Astro localhost:4321
  // + WP localhost:8810) the browser would otherwise reject them.
  //
  // For split-origin dev to actually attach these cookies on subsequent
  // requests, front WP behind the Astro origin via a reverse proxy so the
  // browser sees one host. Otherwise the wordpress_logged_in_* cookie is
  // set on the Astro origin and never sent back to WP.
  const setCookies: string[] = typeof (upstream.headers as any).getSetCookie === 'function'
    ? (upstream.headers as any).getSetCookie()
    : [];
  if (setCookies.length === 0) {
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') setCookies.push(value);
    });
  }
  for (const raw of setCookies) {
    const stripped = raw.replace(/;\s*Domain=[^;]+/i, '');
    headers.append('set-cookie', stripped);
  }
  return new Response(JSON.stringify(body), { status: upstream.status, headers });
};

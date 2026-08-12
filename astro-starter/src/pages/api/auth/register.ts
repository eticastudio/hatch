import type { APIRoute } from 'astro';
import { WP_API_URL } from 'astro:env/server';

/**
 * Same-origin registration proxy.
 * CLEAN-ROOM ORIGINAL. Zero lines copied from any external repo.
 */

export const prerender = false;

const WP_BASE = (WP_API_URL || '').replace(/\/wp\/v2\/?$/, '').replace(/\/$/, '');

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!WP_BASE) return json({ message: 'Auth is not configured.' }, 503);

  let payload: unknown;
  try { payload = await request.json(); } catch { return json({ message: 'Invalid request body.' }, 400); }

  let upstream: Response;
  try {
    upstream = await fetch(`${WP_BASE}/hatch/v1/auth/register`, {
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
  const setCookie = upstream.headers.get('set-cookie');
  if (setCookie) headers.append('set-cookie', setCookie);
  return new Response(JSON.stringify(body), { status: upstream.status, headers });
};

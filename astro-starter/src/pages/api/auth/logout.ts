import type { APIRoute } from 'astro';
import { WP_API_URL } from 'astro:env/server';

/**
 * Same-origin logout proxy. Forwards the hatch_jwt cookie so WP can
 * emit a clearing Set-Cookie, which we relay back to the browser.
 * CLEAN-ROOM ORIGINAL. Zero lines copied from any external repo.
 */

export const prerender = false;

const WP_BASE = (WP_API_URL || '').replace(/\/wp\/v2\/?$/, '').replace(/\/$/, '');

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export const POST: APIRoute = async ({ request }) => {
  if (!WP_BASE) return json({ ok: true }, 200); // Nothing to clear.

  let upstream: Response;
  try {
    upstream = await fetch(`${WP_BASE}/hatch/v1/auth/logout`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Cookie: request.headers.get('cookie') || '',
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Even on upstream failure, clear the local cookie so the client is signed out.
    const h = new Headers({ 'Content-Type': 'application/json' });
    h.append('set-cookie', 'hatch_jwt=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: h });
  }

  const text = await upstream.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = { ok: true }; }

  const headers = new Headers({ 'Content-Type': 'application/json' });
  const setCookie = upstream.headers.get('set-cookie');
  if (setCookie) headers.append('set-cookie', setCookie);
  else headers.append('set-cookie', 'hatch_jwt=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return new Response(JSON.stringify(body), { status: upstream.status, headers });
};

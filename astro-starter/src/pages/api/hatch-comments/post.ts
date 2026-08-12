import type { APIRoute } from 'astro';
import { WP_API_URL } from 'astro:env/server';

/**
 * Guest comment submit proxy (same-origin).
 *
 * Forwards multipart FormData to WordPress `/hatch/v1/comments`. The upstream
 * hostname (docker service under compose, private origin behind Cloudflare in
 * prod) never reaches the browser. The proxy also injects the real visitor
 * IP as X-Forwarded-For so rate-limit + spam-heuristics on WP key off the
 * actual client rather than the edge worker.
 *
 * No auth: guests post with just name + email + comment.
 */
export const prerender = false;

const WP_BASE = (WP_API_URL || '').replace(/\/wp\/v2\/?$/, '').replace(/\/$/, '');

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!WP_BASE) {
    return json({ ok: false, message: 'Comments are not configured.' }, 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, message: 'Could not read the form.' }, 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${WP_BASE}/hatch/v1/comments`, {
      method: 'POST',
      body: form,
      headers: {
        Accept: 'application/json',
        'X-Forwarded-For': clientAddress || '',
        'User-Agent': request.headers.get('user-agent') || 'Hatch-Comment-Proxy/1.0',
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return json({ ok: false, message: 'Could not reach the server. Try again.' }, 504);
  }

  const text = await upstream.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ ok: false, message: 'Unexpected response from the server.' }, 502);
  }

  return json(body, upstream.status);
};

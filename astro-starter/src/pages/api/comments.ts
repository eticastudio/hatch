import type { APIRoute } from 'astro';
import { WP_API_URL } from 'astro:env/server';

/**
 * Same-origin comment submit proxy.
 *
 * The comment form used to POST straight at `${WP_API_URL}/hatch/v1/comments`.
 * WP_API_URL is a *server-side* value — under docker compose it is
 * `http://wp/wp-json/wp/v2`, a hostname that only resolves inside the
 * container network. The browser cannot reach it, so every local comment
 * submission failed, and on a deployed frontend it leaked the WordPress
 * origin into markup that is supposed to never mention WordPress at all.
 *
 * Posting through the frontend instead keeps the request same-origin: it
 * works identically on localhost, on Cloudflare Workers, and on Vercel, and
 * no WP hostname reaches the browser.
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
        // WordPress sees the frontend as the client; pass the real visitor IP
        // through so comment moderation, rate limiting and spam checks still
        // key off the visitor rather than the edge worker.
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
    // WordPress answered with something that isn't JSON (a PHP notice, an
    // HTML error page). Don't hand the raw page to the browser.
    return json({ ok: false, message: 'Unexpected response from the server.' }, 502);
  }

  return json(body, upstream.status);
};

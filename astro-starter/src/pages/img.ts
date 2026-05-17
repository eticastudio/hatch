import type { APIRoute } from 'astro';

/**
 * Same-domain image proxy. Forwards /img?url=…&w=…&format=webp to the
 * configured backend (Hatch shared broker by default, or whatever the
 * HATCH_IMG_BACKEND env var points at). Resulting image is served from
 * the frontend origin — no cross-origin, no third-party domain in HTML.
 *
 * This is the "enterprise pattern": single origin, frontend proxies through
 * to whichever image processor (shared broker today, self-hosted tomorrow).
 *
 * Cache the response aggressively — output is content-addressable.
 */
const BACKEND = (import.meta.env.HATCH_IMG_BACKEND || 'https://hatch.adityaarsharma.com').replace(/\/$/, '');

export const GET: APIRoute = async ({ request, url }) => {
  const src    = url.searchParams.get('url');
  const w      = url.searchParams.get('w');
  const h      = url.searchParams.get('h');
  const format = (url.searchParams.get('format') || 'webp').toLowerCase();
  const q      = url.searchParams.get('q') || '80';

  if (!src) {
    return new Response(JSON.stringify({ error: 'url required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const backendUrl = new URL(BACKEND + '/img');
  backendUrl.searchParams.set('url', src);
  if (w) backendUrl.searchParams.set('w', w);
  if (h) backendUrl.searchParams.set('h', h);
  backendUrl.searchParams.set('format', format === 'avif' ? 'avif' : 'webp');
  backendUrl.searchParams.set('q', q);

  let upstream: Response;
  try {
    upstream = await fetch(backendUrl, {
      // Stream through — don't buffer huge images in memory.
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'Hatch-img-proxy/1.0' },
    });
  } catch {
    // On timeout or network error, redirect to the original WP image as a
    // graceful fallback so the page never shows a broken-image icon.
    return Response.redirect(src, 302);
  }

  if (!upstream.ok) {
    return Response.redirect(src, 302);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || (format === 'avif' ? 'image/avif' : 'image/webp'),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Img-Backend': BACKEND,
    },
  });
};

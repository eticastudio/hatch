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

// Backlog #161 — SSRF allowlist. Without this the proxy will fetch any
// attacker-controlled URL (169.254.169.254, internal admin dashboards, etc.)
// on behalf of the frontend origin. Restrict to hosts we intentionally
// serve images from: the configured WP backend, the site's own origin, and
// an optional operator-supplied comma-separated list.
function buildAllowedHosts(): Set<string> {
  const hosts = new Set<string>();
  const add = (raw?: string | null) => {
    if (!raw) return;
    try { hosts.add(new URL(raw).host.toLowerCase()); } catch { /* skip malformed */ }
  };
  add(import.meta.env.WP_API_URL);
  add(import.meta.env.PUBLIC_SITE_URL);
  const extras = (import.meta.env.PUBLIC_IMG_ALLOWED_HOSTS || '').split(',');
  for (const h of extras) {
    const t = h.trim();
    if (!t) continue;
    // Accept either a bare host or a full URL.
    if (t.includes('://')) add(t); else hosts.add(t.toLowerCase());
  }
  return hosts;
}
const ALLOWED_HOSTS = buildAllowedHosts();

function isAllowedSrc(raw: string): boolean {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  const proto = u.protocol;
  if (proto !== 'https:' && !(import.meta.env.DEV && proto === 'http:')) return false;
  return ALLOWED_HOSTS.has(u.host.toLowerCase());
}

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

  // Backlog #161 — reject non-allowlisted origins before touching backend.
  if (!isAllowedSrc(src)) {
    return new Response(JSON.stringify({ error: 'url host not allowed' }), {
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

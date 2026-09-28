import type { APIRoute } from 'astro';

/**
 * Same-domain image endpoint. By default it streams the allowlisted source
 * image (your WordPress media or this site's own origin) straight through, so
 * no third-party host is ever contacted. If the operator sets HATCH_IMG_BACKEND
 * to an image processor they run, /img?url=…&w=…&format=webp is forwarded there
 * instead. Either way the browser only ever talks to the frontend origin.
 *
 * Cache the response aggressively — output is content-addressable.
 */
const BACKEND = String(import.meta.env.HATCH_IMG_BACKEND || '').trim().replace(/\/$/, '');

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

function isAllowedSrc(raw: string, selfHost: string): boolean {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  const proto = u.protocol;
  if (proto !== 'https:' && !(import.meta.env.DEV && proto === 'http:')) return false;
  const host = u.host.toLowerCase();
  // Same-origin fetch is always safe: the URL is already reachable from the
  // browser without our proxy, so proxying it cannot bypass anything an
  // attacker could not already do directly. Fixes broken images when the
  // Astro <Image> component wraps a same-origin /hatch-media/* URL with
  // /img?url=<self-URL>&w=… and the operator has not added the deployed
  // Worker host to PUBLIC_IMG_ALLOWED_HOSTS.
  if (host === selfHost) return true;
  return ALLOWED_HOSTS.has(host);
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
  if (!isAllowedSrc(src, url.host.toLowerCase())) {
    return new Response(JSON.stringify({ error: 'url host not allowed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // No image backend configured: serve the original bytes from the allowlisted
  // source. Nothing leaves your own WordPress or this origin.
  if (!BACKEND) {
    try {
      const direct = await fetch(src, { signal: AbortSignal.timeout(15_000), headers: { 'User-Agent': 'Hatch-img/1.0' } });
      if (!direct.ok || !(direct.headers.get('content-type') || '').startsWith('image/')) {
        return Response.redirect(src, 302);
      }
      return new Response(direct.body, {
        status: 200,
        headers: {
          'Content-Type': direct.headers.get('content-type') as string,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch {
      return Response.redirect(src, 302);
    }
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

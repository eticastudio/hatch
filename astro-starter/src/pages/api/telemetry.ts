/**
 * Hatch telemetry sink — v0.50.31
 *
 * Receives the LCP + TTFB beacon emitted by PageLayout.astro when
 * `features.perf.telemetry` is on. POST body is a small JSON blob:
 *   { site, ttfb, lcp, dcl, ts }
 *
 * Today: logs to console (visible in `astro dev` and worker logs).
 * Tomorrow (v0.51): forwards to the Hatch broker so the WP admin can show
 * per-deploy regression alerts. Endpoint stays the same; only the sink
 * destination changes. No PII, no IP, no cookies.
 *
 * Security: rate-limit handled by middleware (token bucket on path /api).
 * Body capped at 1KB to prevent log spam.
 */
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const text = await request.text();
    if (text.length > 1024) {
      return new Response('Payload too large', { status: 413 });
    }
    const data = JSON.parse(text);
    // Minimal shape validation
    if (typeof data?.lcp !== 'number' || typeof data?.ttfb !== 'number') {
      return new Response('Bad payload', { status: 400 });
    }
    console.log('[hatch:telemetry]', JSON.stringify({
      site: String(data.site || '').slice(0, 200),
      ttfb: Math.round(data.ttfb),
      lcp:  Math.round(data.lcp),
      dcl:  Math.round(data.dcl || 0),
      ts:   data.ts || Date.now(),
    }));
    // sendBeacon expects a 2xx with empty body
    return new Response(null, { status: 204 });
  } catch {
    return new Response('Bad request', { status: 400 });
  }
};

// GET returns 405 so accidental browser hits don't trigger a parse error.
export const GET: APIRoute = () => new Response('Method not allowed', { status: 405 });

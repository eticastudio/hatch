/**
 * /llms.txt — proxied from the WP origin (RankReady generates it).
 *
 * In headless mode, RankReady serves llms.txt at the WP origin AND
 * 302-redirects to the frontend origin so search engines / LLM crawlers
 * find it at the customer-facing URL. Astro catches the request here and
 * fetches the actual content from the WP origin, streaming it back.
 *
 * @since 0.5.2
 */
import type { APIRoute } from 'astro';

export const prerender = false;

const WP_ORIGIN = (import.meta.env.WP_API_URL || 'http://wp/wp-json/wp/v2')
  .replace(/\/wp-json\/wp\/v2\/?$/, '')
  .replace(/\/$/, '');

export const GET: APIRoute = async () => {
  try {
    const upstream = await fetch(`${WP_ORIGIN}/llms.txt`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Hatch-Astro/0.5.2 (llms-proxy)' },
    });
    // If RankReady is off or the file doesn't exist, return a minimal fallback.
    if (upstream.status >= 400) {
      return new Response('# llms.txt not configured on this site.\n', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    const body = await upstream.text();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        // Cache for 10 min at the edge — RankReady rebuilds nightly.
        'Cache-Control': 'public, max-age=600, s-maxage=3600',
      },
    });
  } catch (err) {
    return new Response(`# llms.txt fetch error: ${(err as Error).message}\n`, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
};

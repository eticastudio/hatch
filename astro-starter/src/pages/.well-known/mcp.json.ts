/**
 * /.well-known/mcp.json — proxied from the WP origin (RankReady MCP surface).
 *
 * MCP well-known JSON exposes the AI-agent invocation ability manifest so
 * agents can discover and call site content directly. RankReady serves the
 * canonical version on the WP origin; Astro proxies it here so the public
 * URL (money-domain) is where crawlers actually look.
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
    const upstream = await fetch(`${WP_ORIGIN}/.well-known/mcp.json`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Hatch-Astro/0.5.2 (mcp-proxy)' },
    });
    if (upstream.status >= 400) {
      return new Response(
        JSON.stringify({ error: 'MCP surface not configured', hint: 'Enable RankReady headless mode.' }, null, 2),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
        }
      );
    }
    const body = await upstream.text();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=600, s-maxage=3600',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'MCP fetch error', message: (err as Error).message }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      }
    );
  }
};

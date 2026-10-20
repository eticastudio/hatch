import type { APIRoute } from 'astro';
import { WP_API_URL } from 'astro:env/server';

/**
 * /robots.txt — sourced from the active WordPress SEO plugin.
 *
 * Priority (handled WP-side by /hatch/v1/seo-meta):
 *   1. RankMath's robots.txt editor output
 *   2. Yoast (doesn't expose robots.txt directly; falls through)
 *   3. Native fallback — disallows /wp-admin/, allows admin-ajax.php, points
 *      sitemap at our hand-rolled /sitemap-index.xml
 *
 * Edge-cached 5min so we don't pound WP REST per crawler hit.
 */
/**
 * Crawlers must be told about the sitemap on the domain they are reading, which is
 * this frontend, not the WordPress address the rule text was generated on.
 */
function pointSitemapsHere(body: string, origin: string): string {
  return body.replace(/^(\s*Sitemap:\s*)(\S+)\s*$/gim, (line, prefix: string, raw: string) => {
    try {
      const u = new URL(raw);
      return `${prefix}${origin}${u.pathname}${u.search}`;
    } catch {
      return line;
    }
  });
}

export const GET: APIRoute = async ({ url }) => {
  const fallback = 'User-agent: *\nDisallow:\n';
  if (!WP_API_URL) return new Response(fallback, { headers: { 'Content-Type': 'text/plain' } });
  const base = WP_API_URL.replace(/\/wp\/v2\/?$/, '');
  try {
    const res = await fetch(`${base}/hatch/v1/seo-meta`, {
      headers: { Accept: 'application/json' },
      cf: { cacheTtl: 300 },
    } as RequestInit);
    if (!res.ok) {
      return new Response(fallback, { headers: { 'Content-Type': 'text/plain' } });
    }
    const data = (await res.json()) as { robots_txt?: string };
    const body = pointSitemapsHere((data?.robots_txt && data.robots_txt.trim()) || fallback, url.origin);
    return new Response(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  } catch {
    return new Response(fallback, { headers: { 'Content-Type': 'text/plain' } });
  }
};

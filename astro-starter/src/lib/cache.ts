/**
 * Edge cache helper for SSR pages.
 *
 * Sets standard `Cache-Control` headers on the Astro response so the platform's
 * edge cache (Cloudflare's Cache API, Vercel's edge cache, nginx in front of
 * Node, etc) holds the rendered HTML for a configured TTL and serves it stale
 * while revalidating in the background.
 *
 * This is the SSR equivalent of static site generation:
 *   - First request → renders fresh, edge caches
 *   - Subsequent requests within TTL → served from edge (5-10ms TTFB)
 *   - After TTL → served from edge stale + revalidated in background
 *
 * Use in Astro page frontmatter:
 *
 *   ---
 *   import { edgeCache } from '../lib/cache';
 *   const post = await getPostBySlug(slug);
 *   edgeCache(Astro, { ttl: 60, swr: 3600 });
 *   ---
 *
 * Defaults are conservative (60s fresh, 1hr stale-while-revalidate) — tune
 * per-page if needed. For news/breaking content, drop the TTL; for evergreen
 * docs, bump it.
 */

interface AstroLike {
	response: { headers: Headers };
}

export interface EdgeCacheOptions {
	/** Seconds the edge serves the response as fresh. Default 60. */
	ttl?: number;
	/** Seconds the edge serves the response stale while revalidating. Default 1hr. */
	swr?: number;
	/** Force no-cache (e.g. for /api/revalidate, error pages). */
	noCache?: boolean;
}

export function edgeCache(Astro: AstroLike, opts: EdgeCacheOptions = {}): void {
	if (opts.noCache) {
		Astro.response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
		return;
	}
	const ttl = opts.ttl ?? 60;
	const swr = opts.swr ?? 3600;
	// `public` so the edge is allowed to cache it, NOT the browser.
	// `s-maxage` is for shared caches (CDN/edge), `max-age=0` keeps the browser
	// always revalidating so users see fresh content on hard reload.
	Astro.response.headers.set(
		'Cache-Control',
		`public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=${swr}`,
	);
}

/**
 * Mark a response as completely uncacheable (e.g. for webhooks, API routes).
 */
export function noCache(Astro: AstroLike): void {
	edgeCache(Astro, { noCache: true });
}

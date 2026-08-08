import type { APIRoute } from 'astro';

/**
 * /sitemap.xml — 301 redirect to the canonical /sitemap-index.xml.
 * Most crawlers (Google/Bing/DuckDuckGo) hit /sitemap.xml by default; without
 * this, they get a 404 (see v0.5.7 SEO story). Aliasing to the real sitemap
 * keeps the URL surface clean without duplicating the generator.
 */
export const GET: APIRoute = ({ redirect }) =>
  redirect('/sitemap-index.xml', 301);

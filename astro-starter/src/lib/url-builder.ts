/**
 * Hatch · URL builder — single source of truth for every internal link.
 *
 * v0.4.2 — Kills the hardcoded `/blog/*` pattern. Every link now respects
 * the user's WordPress permalink + Reading settings:
 *
 *   - WP permalink "/%postname%/"        → posts at /sample-post/
 *   - WP permalink "/blog/%postname%/"   → posts at /blog/sample-post/
 *   - WP permalink "/%category%/%postname%/" → posts at /category/sample-post/
 *   - WP permalink "" (plain)            → posts at /?p=123 (server fallback)
 *
 * Archive URL:
 *   - When the user assigned a Posts Page in WP Reading → /<that-slug>/
 *   - Otherwise → /  (the home IS the blog archive)
 *
 * Category / tag / author URLs honor WP's category_base + tag_base options.
 *
 * USE THIS HELPER. Never hardcode `/blog` anywhere. Reviewers should grep
 * for `"/blog"` and `'/blog'` and reject any new occurrence outside this
 * file or the gate in pages/blog/index.astro.
 */

import type { HatchFeatures } from './features';

/** Minimum shape a post must have to be linkable. Matches lib/hatch.ts Post. */
export interface LinkablePost {
  slug: string;
  id?: number;
  /** WP-side category slug if known (for permalinks that include %category%). */
  categorySlug?: string | null;
  /** When present, take it as-is — WP already computed the full URL. */
  link?: string;
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                  */
/* ------------------------------------------------------------------------ */

// v0.4.2 — Tolerate non-string / null / undefined input. Catching these at
// the helper boundary stops a single bad upstream value (e.g. `post.category`
// returned as a string instead of an object with `.slug`) from crashing
// the entire page render.
const trim = (s: unknown): string => {
  if (typeof s !== 'string' || !s) return '';
  return s.replace(/^\/+|\/+$/g, '');
};

const ensureLeadingSlash = (s: string) => (s.startsWith('/') ? s : '/' + s);

const ensureTrailingSlash = (s: string) =>
  s.length > 1 && !s.endsWith('/') ? s + '/' : s;

/* ------------------------------------------------------------------------ */
/* Public API                                                               */
/* ------------------------------------------------------------------------ */

/**
 * Build the URL for a single post.
 *
 * v0.7.0 — /blog is the canonical mount for POSTS in every Hatch site,
 * regardless of what permalink shape WordPress has on the origin. The whole
 * product pitch is "adds a fast static /blog subfolder to any parent site"
 * — every post link MUST resolve at /blog/<slug>/. Emitting /<slug>/ (the
 * WP-native shape) caused the same content to be reachable at two URLs
 * (200 at /<slug>/, 200 at /blog/<slug>/) which is a duplicate-content SEO
 * defect and defeats the subfolder-mount promise.
 *
 * Resolution:
 *   1. If post.link is a same-origin URL, extract just the slug and rebuild
 *      as /blog/<slug>/. (Origin-different links are external — return as-is.)
 *   2. Else use post.slug directly.
 *
 * The root-level catch-all ([...slug].astro) 301-redirects any incidental
 * hits at /<slug>/ (from old inbound links) to /blog/<slug>/.
 */
export function postUrl(post: LinkablePost, features?: HatchFeatures): string {
  // Prefer the explicit slug; only fall back to parsing post.link when slug
  // is missing (some legacy payloads pass link without slug).
  let slug = trim(post.slug);
  if (!slug && post.link) {
    try {
      const u = new URL(post.link);
      const siteOrigin = features?.site?.url ? new URL(features.site.url).origin : '';
      if (!siteOrigin || u.origin === siteOrigin) {
        // Take the last non-empty path segment as the slug.
        const parts = u.pathname.split('/').filter(Boolean);
        slug = parts[parts.length - 1] || '';
      } else {
        // Cross-origin link (e.g. multisite) — pass through untouched.
        return post.link;
      }
    } catch {
      // Not a valid absolute URL — treat as raw slug fallback.
      slug = trim(post.link);
    }
  }
  if (!slug) {
    // Truly unknown — plain-permalink server fallback (?p=ID).
    return post.id ? `/?p=${post.id}` : '/blog/';
  }
  return `/blog/${slug}/`;
}

/**
 * Build the URL for the blog archive (Posts Page).
 *
 * Returns:
 *   - /<posts_page_slug>/  when the user assigned a Page in WP Reading.
 *   - /                    when no Posts Page is set (the home IS the blog).
 */
export function archiveUrl(features?: HatchFeatures): string {
  const home = features?.home;
  if (home?.posts_page_id && home.posts_page_id > 0 && home.posts_page_slug) {
    return `/${home.posts_page_slug}/`;
  }
  return '/';
}

/**
 * Has the user assigned a non-home archive URL? Useful for "see all" links
 * and breadcrumbs that should hide entirely when / IS the archive.
 */
export function hasArchive(features?: HatchFeatures): boolean {
  return !!(
    features?.home?.posts_page_id &&
    features.home.posts_page_id > 0 &&
    features.home.posts_page_slug
  );
}

/**
 * URL for a category archive.
 *
 * v0.7.0 — Every taxonomy archive lives under /blog/ so the entire content
 * surface (posts + archives) sits inside the subfolder mount. Root-level
 * /category/<slug>/ 301s to /blog/category/<slug>/ via the URL adapter at
 * src/pages/category/[slug].astro. Honors WP's category_base for the last
 * segment (default "category" → /blog/category/<slug>/, custom "topics" →
 * /blog/topics/<slug>/).
 */
export function categoryUrl(slug: string, features?: HatchFeatures): string {
  const base = (features?.site as any)?.category_base || 'category';
  return `/blog/${trim(base)}/${trim(slug)}/`;
}

/** URL for a tag archive. Same contract as categoryUrl. */
export function tagUrl(slug: string, features?: HatchFeatures): string {
  const base = (features?.site as any)?.tag_base || 'tag';
  return `/blog/${trim(base)}/${trim(slug)}/`;
}

/** URL for an author archive. Under /blog/ so it 301s cleanly from /author/*. */
export function authorUrl(slug: string): string {
  return `/blog/author/${trim(slug)}/`;
}

/** Search results URL. WP convention: /?s=query, but Astro starter uses /search?q=. */
export function searchUrl(query?: string): string {
  if (!query) return '/search/';
  return `/search/?q=${encodeURIComponent(query)}`;
}

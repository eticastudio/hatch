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
 * Resolution order:
 *   1. Honor post.link if the caller provided it (we trust WP's own URL).
 *   2. Else expand features.site.permalink_structure with the post's slug
 *      (and categorySlug if needed).
 *   3. Else fall back to `/<slug>/` — the most common modern WP setup.
 */
export function postUrl(post: LinkablePost, features?: HatchFeatures): string {
  if (post.link) {
    // WP gave us a full URL. Strip the origin if it matches site.url so
    // the link stays relative (Astro routing happier with same-origin paths).
    try {
      const u = new URL(post.link);
      const siteOrigin = features?.site?.url ? new URL(features.site.url).origin : '';
      if (siteOrigin && u.origin === siteOrigin) {
        return u.pathname + u.search + u.hash;
      }
      return post.link;
    } catch {
      // Not a valid absolute URL — treat as path.
      return ensureLeadingSlash(post.link);
    }
  }

  const struct = (features?.site as any)?.permalink_structure || '';
  if (!struct) {
    // Plain permalinks (?p=ID). Best we can do without an id: fall back
    // to /<slug>/ — most modern installs use postname permalinks anyway.
    return post.id ? `/?p=${post.id}` : `/${post.slug}/`;
  }

  // Expand the structure with what we know.
  let path = struct
    .replace(/%postname%/g, post.slug)
    .replace(/%category%/g, post.categorySlug || 'uncategorized')
    // Tokens we can't fill (year/month/day/post_id/author) get stripped to
    // avoid emitting literal "%year%". Caller can supply post.link to
    // bypass this if they need date-based URLs.
    .replace(/%[a-z_]+%/g, '')
    // Collapse any double slashes left by stripped tokens.
    .replace(/\/+/g, '/');

  return ensureTrailingSlash(ensureLeadingSlash(path));
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
 * URL for a category archive. Honors WP's category_base option (default
 * "category" → /category/<slug>/, custom "topics" → /topics/<slug>/).
 *
 * Note: this is the WP-native archive URL. The current Hatch Astro starter
 * also ships /blog/category/<slug>/ as a legacy route — that route will
 * 301 to this canonical URL in a follow-up.
 */
export function categoryUrl(slug: string, features?: HatchFeatures): string {
  const base = (features?.site as any)?.category_base || 'category';
  return `/${trim(base)}/${trim(slug)}/`;
}

/** URL for a tag archive. Same contract as categoryUrl. */
export function tagUrl(slug: string, features?: HatchFeatures): string {
  const base = (features?.site as any)?.tag_base || 'tag';
  return `/${trim(base)}/${trim(slug)}/`;
}

/** URL for an author archive. WP convention: /author/<slug>/. */
export function authorUrl(slug: string): string {
  return `/author/${trim(slug)}/`;
}

/** Search results URL. WP convention: /?s=query, but Astro starter uses /search?q=. */
export function searchUrl(query?: string): string {
  if (!query) return '/search/';
  return `/search/?q=${encodeURIComponent(query)}`;
}

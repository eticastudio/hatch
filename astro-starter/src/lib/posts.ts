/**
 * lib/posts.ts — taxonomy resolvers for /blog/category and /blog/author archives.
 *
 * Why a separate module (not lib/hatch.ts):
 *   - Hatch Fortress mode strips /wp/v2/users from the REST surface for
 *     anonymous requests via a `rest_endpoints` filter (see wp-plugin
 *     class-hardening.php `fortress_disable_rest_users`). The filter runs
 *     BEFORE `rest_authentication_errors`, so even Astro's Basic-auth call
 *     with a valid Application Password gets `rest_no_route` at 404. That
 *     silently empties getAuthors() and 404s every author archive.
 *   - Public taxonomy endpoints (/wp/v2/categories, /wp/v2/posts?_embed=author)
 *     remain reachable under Fortress. Author id + name + description + avatar
 *     are all embedded in the author frame of each post, so we resolve by
 *     scanning embedded frames instead of listing users.
 *
 * All original code. No third-party lines copied.
 */
import { WP_API_URL, WP_API_USER, WP_API_PASS } from 'astro:env/server';

const auth =
  WP_API_USER && WP_API_PASS
    ? 'Basic ' + Buffer.from(`${WP_API_USER}:${WP_API_PASS}`).toString('base64')
    : '';
const headers: HeadersInit = auth ? { Authorization: auth } : {};

export interface CategoryTerm {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
}

export interface AuthorTerm {
  id: number;
  name: string;
  slug: string;
  description: string;
  avatar: string | null;
}

const decode = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”');

async function wpApi(path: string, timeoutMs = 6000): Promise<Response | null> {
  if (!WP_API_URL) return null;
  // AbortController stops a hung WP call from blocking the SSR response.
  // 6s is generous for a categories/posts lookup on the same VPS; a slower
  // origin still resolves to 404 rather than hanging the whole request.
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(`${WP_API_URL}${path}`, {
      headers,
      cache: 'no-store',
      signal: ctrl.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Parse a Response as JSON safely — a mis-configured WP that returns HTML
// (login redirect, maintenance page) would otherwise throw and 500 the
// archive. We treat non-JSON as "not found".
async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// WP slugs are always lowercase ASCII. URLs may arrive with case variants
// ("/blog/author/Admin") from external links or crawlers — normalize before
// comparison so a valid author still resolves. Never re-cased on output.
function normalizeSlug(s: string): string {
  return s.trim().toLowerCase();
}

interface RawCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  count?: number;
}

/**
 * Resolve a category by slug via /wp/v2/categories?slug=X (public — not
 * blocked by Fortress). Falls back to the built-in Uncategorized term
 * (id=1 on every WP install) so /blog/category/uncategorized never 404s
 * on a fresh site with zero posts.
 */
export async function resolveCategoryBySlug(slug: string): Promise<CategoryTerm | null> {
  const s = normalizeSlug(slug || '');
  // Empty slug would send /categories?slug= (returns all terms — we'd
  // wrongly return whatever's first). Guard before the fetch.
  if (!s) return null;
  const res = await wpApi(`/categories?slug=${encodeURIComponent(s)}&hide_empty=false`);
  if (res && res.ok) {
    const rows = await safeJson<RawCategory[]>(res);
    if (Array.isArray(rows) && rows.length > 0) {
      const c = rows[0];
      return {
        id: c.id,
        name: decode(c.name || ''),
        slug: c.slug,
        description: decode(c.description || ''),
        count: c.count || 0,
      };
    }
  }
  if (s === 'uncategorized') {
    return { id: 1, name: 'Uncategorized', slug: 'uncategorized', description: '', count: 0 };
  }
  return null;
}

interface RawPostAuthorId {
  id: number;
  slug: string;
  author: number;
}

interface HatchContentAuthor {
  id: number;
  name?: string;
  slug?: string;
  bio?: string;
  avatar?: string | null;
}

interface HatchContentPayload {
  author?: HatchContentAuthor | null;
}

/**
 * Resolve an author by slug. /wp/v2/users is stripped from the anonymous
 * REST surface under Hatch Fortress (see class-security.php
 * `remove_users_endpoint`), and `?_embed=author` on /wp/v2/posts issues a
 * subrequest to that stripped endpoint so it also fails. What DOES work
 * publicly: /hatch/v1/content?slug=<postSlug> returns full author metadata
 * (id, name, slug, bio, avatar) embedded in the post payload.
 *
 * Strategy:
 *   1. List recent posts via /wp/v2/posts (raw, no _embed) to collect the
 *      author id on each one. WP's `?author=<id>` filter also works after
 *      the v0.7.7 security fix, so an id is enough to build the archive.
 *   2. Group by author id and, for one representative post per author,
 *      hit /hatch/v1/content?slug=<postSlug> once. That payload carries
 *      the human-facing author fields.
 *   3. Return the first author whose slug matches the requested one.
 *
 * Cost bound: at most `perPage` /wp/v2/posts rows scanned, plus one
 * /hatch/v1/content call per unique author. Real sites carry 1-5 authors
 * on any given archive fetch. Deferred: sites with authors who never
 * appear in the most recent `maxPages * perPage` posts (rare; the archive
 * would show nothing anyway) — a full users index would be the fix and
 * lives on the plugin side.
 */
export async function resolveAuthorBySlug(
  slug: string,
  maxPages = 3,
  perPage = 100,
): Promise<AuthorTerm | null> {
  const s = normalizeSlug(slug || '');
  if (!s) return null;

  const seenAuthorIds = new Set<number>();
  const authorSample = new Map<number, string>();

  for (let page = 1; page <= maxPages; page++) {
    const res = await wpApi(
      `/posts?per_page=${perPage}&page=${page}&status=publish&_fields=id,slug,author`,
    );
    if (!res || !res.ok) break;
    const posts = await safeJson<RawPostAuthorId[]>(res);
    if (!Array.isArray(posts) || posts.length === 0) break;

    for (const p of posts) {
      const aid = typeof p.author === 'number' ? p.author : 0;
      if (aid <= 0 || seenAuthorIds.has(aid)) continue;
      seenAuthorIds.add(aid);
      if (typeof p.slug === 'string' && p.slug) {
        authorSample.set(aid, p.slug);
      }
    }
    if (posts.length < perPage) break;
  }

  if (seenAuthorIds.size === 0) return null;

  // Pull each candidate author's metadata via /hatch/v1/content (public,
  // includes {id, name, slug, bio, avatar}). Stop at the first slug match.
  const contentBase = (WP_API_URL || '').replace(/\/wp-json\/wp\/v2\/?$/, '/wp-json/hatch/v1');
  for (const [aid, postSlug] of authorSample) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    let res: Response | null = null;
    try {
      res = await fetch(`${contentBase}/content?slug=${encodeURIComponent(postSlug)}`, {
        headers,
        cache: 'no-store',
        signal: ctrl.signal,
      });
    } catch {
      res = null;
    } finally {
      clearTimeout(t);
    }
    if (!res || !res.ok) continue;
    const payload = await safeJson<HatchContentPayload>(res);
    const a = payload?.author;
    if (!a || typeof a.slug !== 'string') continue;
    if (a.slug.toLowerCase() === s) {
      return {
        id: typeof a.id === 'number' && a.id > 0 ? a.id : aid,
        name: decode(a.name || ''),
        slug: a.slug,
        description: decode(a.bio || ''),
        avatar: a.avatar ?? null,
      };
    }
  }
  return null;
}

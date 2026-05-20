/**
 * Hatch WordPress API client.
 *
 * Server-only — never import this in client components or .astro frontmatter
 * that runs in the browser. Application Password must stay secret.
 */

// v0.50.x — secrets read via astro:env (runtime) instead of Vite-inlined.
// WP_API_USER / WP_API_PASS no longer appear in the deployed JS bundle.
import { WP_API_URL, WP_API_USER, WP_API_PASS } from 'astro:env/server';
const WP_API = WP_API_URL;
const WP_USER = WP_API_USER;
const WP_PASS = WP_API_PASS;

if (!WP_API || !WP_USER || !WP_PASS) {
  // Don't crash at import time — let pages fail gracefully if env is missing.
  console.warn('[hatch] WP_API_URL / WP_API_USER / WP_API_PASS not set in .env');
}

const auth =
  WP_USER && WP_PASS
    ? 'Basic ' + Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64')
    : '';

const headers = auth ? { Authorization: auth } : {};

export interface Post {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt: string;
  category: string | null;
  categorySlug: string | null;
  categoryId: number | null;
  featuredImage: string | null;
  featuredImageAlt: string | null;
  publishedAt: string;
  modifiedAt: string;
  author: {
    name: string;
    slug: string;
    avatar: string | null;
    description: string;
  } | null;
  tags: string[];
  readMinutes: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent: number;
}

export interface Author {
  id: number;
  name: string;
  slug: string;
  avatar: string | null;
  description: string;
}

export interface HatchMenuItem {
  id: number;
  parent: number;
  order: number;
  title: string;
  url: string;
  target: string;
  classes: string[];
}

interface WpRawPost {
  id: number;
  slug: string;
  date: string;
  modified: string;
  status: string;
  title?: { rendered?: string };
  content?: { rendered?: string };
  excerpt?: { rendered?: string };
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url?: string; alt_text?: string }>;
    'wp:term'?: Array<Array<{ id: number; name: string; slug: string }>>;
    author?: Array<{ name?: string; slug?: string; description?: string; avatar_urls?: Record<string, string> }>;
  };
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;|&#8217;|&apos;/g, "'")
    .replace(/&#8220;|&#8221;|&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function readMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function transform(p: WpRawPost): Post {
  const media = p._embedded?.['wp:featuredmedia']?.[0];
  const cats = p._embedded?.['wp:term']?.[0] ?? [];
  const tags = p._embedded?.['wp:term']?.[1] ?? [];
  const author = p._embedded?.author?.[0] ?? null;

  const html = p.content?.rendered ?? '';
  return {
    id: p.id,
    slug: p.slug,
    title: decode(p.title?.rendered ?? ''),
    content: html,
    excerpt: decode((p.excerpt?.rendered ?? '').replace(/<[^>]+>/g, '').trim()).slice(0, 160),
    category: cats[0] ? decode(cats[0].name) : null,
    categorySlug: cats[0]?.slug ?? null,
    categoryId: cats[0]?.id ?? null,
    featuredImage: media?.source_url ?? null,
    featuredImageAlt: media?.alt_text ?? null,
    publishedAt: p.date,
    modifiedAt: p.modified,
    author: author
      ? {
          name: author.name ?? '',
          slug: author.slug ?? '',
          avatar: author.avatar_urls?.['96'] ?? null,
          description: author.description ?? '',
        }
      : null,
    tags: tags.map((t) => decode(t.name)),
    readMinutes: readMinutes(html),
  };
}

// v0.50.4 — plain-permalinks fallback. WP sites without pretty permalinks
// 301-redirect /wp-json/* to the homepage. After one such failure we switch
// to the ?rest_route= form (the documented canonical fallback) and cache
// the choice for the rest of the worker's lifetime.
//
// Path/query strategy:
//   pretty mode: ${WP_API}${path}                                e.g. https://x.com/wp-json/wp/v2/posts?_embed=1
//   plain mode:  ${origin}/?rest_route=/wp/v2${path-without-?}&{params}
let usePlainPermalinks: boolean | null = null;

function buildUrl(path: string): string {
  if (!WP_API) throw new Error('WP_API_URL not configured');
  if (!usePlainPermalinks) {
    return `${WP_API}${path}`;
  }
  // WP_API ends with /wp-json/wp/v2 — strip that to get the origin.
  const origin = WP_API.replace(/\/wp-json\/wp\/v2\/?$/, '');
  const [bare, query = ''] = path.split('?');
  // bare = "/posts" → rest_route = "/wp/v2/posts"
  const restRoute = `/wp/v2${bare}`;
  const params = new URLSearchParams(query);
  params.set('rest_route', restRoute);
  return `${origin}/?${params.toString()}`;
}

async function wpFetch(path: string): Promise<Response> {
  const res = await fetch(buildUrl(path), { headers, cache: 'no-store', redirect: 'manual' });
  // 301/302 from /wp-json/* on plain permalinks → switch + retry once.
  if (usePlainPermalinks === null && (res.status === 301 || res.status === 302 || res.status === 404)) {
    usePlainPermalinks = true;
    return fetch(buildUrl(path), { headers, cache: 'no-store' });
  }
  if (usePlainPermalinks === null) {
    usePlainPermalinks = false; // pretty perms confirmed
  }
  return res;
}

export async function getPosts(opts: {
  page?: number;
  perPage?: number;
  category?: number | null;
  author?: number | null;
} = {}): Promise<{ posts: Post[]; total: number; hasMore: boolean }> {
  const params = new URLSearchParams({
    _embed: '1',
    status: 'publish',
    page: String(opts.page ?? 1),
    per_page: String(opts.perPage ?? 12),
  });
  if (opts.category) params.set('categories', String(opts.category));
  if (opts.author) params.set('author', String(opts.author));

  const res = await wpFetch(`/posts?${params.toString()}`);
  if (!res.ok) return { posts: [], total: 0, hasMore: false };
  const total = parseInt(res.headers.get('x-wp-total') || '0', 10);
  const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '0', 10);
  const data = (await res.json()) as WpRawPost[];
  return {
    posts: data.map(transform),
    total,
    hasMore: (opts.page ?? 1) < totalPages,
  };
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const res = await wpFetch(`/posts?slug=${encodeURIComponent(slug)}&_embed=1&status=publish`);
  if (!res.ok) return null;
  const data = (await res.json()) as WpRawPost[];
  if (!data.length) return null;
  return transform(data[0]);
}

export async function getCategories(): Promise<Category[]> {
  const out: Category[] = [];
  let page = 1;
  while (page < 20) {
    const res = await wpFetch(`/categories?per_page=100&page=${page}&hide_empty=false&orderby=count&order=desc`);
    if (!res.ok) break;
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const c of batch) {
      // Skip default empty Uncategorized
      if (c.slug === 'uncategorized' && c.count === 0) continue;
      out.push({
        id: c.id,
        name: decode(c.name || ''),
        slug: c.slug,
        count: c.count || 0,
        parent: c.parent || 0,
      });
    }
    if (batch.length < 100) break;
    page++;
  }
  return out.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function getAuthors(): Promise<Author[]> {
  const res = await wpFetch('/users?who=authors&per_page=50');
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((u: { id: number; name: string; slug: string; avatar_urls?: Record<string, string>; description?: string }) => ({
    id: u.id,
    name: decode(u.name),
    slug: u.slug,
    avatar: u.avatar_urls?.['96'] ?? null,
    description: decode(u.description ?? ''),
  }));
}

export async function getAdjacent(slug: string): Promise<{ prev: Post | null; next: Post | null }> {
  const current = await getPostBySlug(slug);
  if (!current) return { prev: null, next: null };
  const date = encodeURIComponent(current.publishedAt);
  const [prevRes, nextRes] = await Promise.all([
    wpFetch(`/posts?per_page=1&before=${date}&order=desc&orderby=date&_embed=1`),
    wpFetch(`/posts?per_page=1&after=${date}&order=asc&orderby=date&_embed=1`),
  ]);
  const prev = prevRes.ok ? ((await prevRes.json()) as WpRawPost[]).map(transform)[0] ?? null : null;
  const next = nextRes.ok ? ((await nextRes.json()) as WpRawPost[]).map(transform)[0] ?? null : null;
  return { prev, next };
}

/**
 * Fetch a WordPress Page (post_type='page') by its slug. Used by the
 * [...slug].astro catch-all route to render WP Pages on the frontend at
 * /<page-slug>. Returns null if no published Page matches.
 */
export async function getPageBySlug(slug: string): Promise<Post | null> {
  const res = await wpFetch(`/pages?slug=${encodeURIComponent(slug)}&_embed=1&status=publish`);
  if (!res.ok) return null;
  const data = (await res.json()) as WpRawPost[];
  if (!data.length) return null;
  return transform(data[0]);
}

/**
 * v0.50.31 — Universal slug → content resolver. Calls the Hatch REST
 * `/hatch/v1/content?slug=…` endpoint which walks ALL public post types
 * (page, post, every CPT with show_in_rest) and returns the first match.
 *
 * Use this from the catch-all `[...slug].astro` so any WP custom post type
 * (products, courses, portfolio, docs, recipes, …) renders without the
 * frontend needing to know which CPTs exist. Single REST roundtrip.
 *
 * Returns the normalised content payload, or null on 404 / fetch failure.
 */
export interface HatchContent {
  id: number;
  slug: string;
  type: string;
  rest_base: string;
  title: string;
  content: string;
  excerpt: string;
  featured_media_url: string;
  featured_media_alt: string;
  modified: string;
  published: string;
  link: string;
}
export async function getContentBySlug(slug: string): Promise<HatchContent | null> {
  if (!WP_API) return null;
  const origin = WP_API.replace(/\/wp-json\/wp\/v2\/?$/, '').replace(/\/$/, '');
  const url = usePlainPermalinks
    ? `${origin}/?rest_route=/hatch/v1/content&slug=${encodeURIComponent(slug)}`
    : `${origin}/wp-json/hatch/v1/content?slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data || data.found !== true) return null;
  return data as HatchContent;
}

/**
 * Fetch a WordPress Page by ID. Used when the WP "static front page" setting
 * points to a specific page_id (Reading → A static page → page_on_front).
 */
export async function getPageById(id: number): Promise<Post | null> {
  if (!id) return null;
  const res = await wpFetch(`/pages/${id}?_embed=1`);
  if (!res.ok) return null;
  const data = (await res.json()) as WpRawPost;
  if (!data || !data.id) return null;
  return transform(data);
}

/**
 * List published Pages — used to generate sitemap entries + handy for
 * "All pages" indexes if a theme wants them.
 */
export async function getPages(): Promise<Post[]> {
  const res = await wpFetch('/pages?per_page=100&status=publish&_embed=1&orderby=menu_order&order=asc');
  if (!res.ok) return [];
  const data = (await res.json()) as WpRawPost[];
  return data.map(transform);
}

/**
 * Related posts by category — fetches up to 3 posts in the same category
 * as the given post, excluding the post itself. Returns empty if no related
 * found.
 */
export async function getRelatedPosts(post: Post, limit = 3): Promise<Post[]> {
  if (!post.categoryId) return [];
  const params = new URLSearchParams({
    _embed: '1',
    status: 'publish',
    categories: String(post.categoryId),
    exclude:   String(post.id),
    per_page:  String(limit),
    orderby:   'date',
    order:     'desc',
  });
  const res = await wpFetch(`/posts?${params.toString()}`);
  if (!res.ok) return [];
  const data = (await res.json()) as WpRawPost[];
  return data.map(transform);
}

/**
 * Get posts by tag slug — used by /blog/tag/[slug] pages.
 */
export async function getPostsByTagSlug(tagSlug: string, opts: { page?: number; perPage?: number } = {}): Promise<{ posts: Post[]; total: number; tag: { id: number; name: string; description: string } | null }> {
  // First fetch the tag itself to get its ID and name.
  const tagRes = await wpFetch(`/tags?slug=${encodeURIComponent(tagSlug)}`);
  if (!tagRes.ok) return { posts: [], total: 0, tag: null };
  const tags = (await tagRes.json()) as Array<{ id: number; name: string; description: string }>;
  if (!tags.length) return { posts: [], total: 0, tag: null };
  const tag = tags[0];

  const params = new URLSearchParams({
    _embed: '1',
    status: 'publish',
    tags: String(tag.id),
    page: String(opts.page ?? 1),
    per_page: String(opts.perPage ?? 12),
  });
  const res = await wpFetch(`/posts?${params.toString()}`);
  if (!res.ok) return { posts: [], total: 0, tag };
  const total = parseInt(res.headers.get('x-wp-total') || '0', 10);
  const data = (await res.json()) as WpRawPost[];
  return { posts: data.map(transform), total, tag };
}

export async function getSeoHead(slug: string): Promise<string> {
  if (!WP_API) return '';
  // Strip /wp/v2 from end to get the WP base
  const base = WP_API.replace(/\/wp-json\/wp\/v2\/?$/, '');
  const url = import.meta.env.PUBLIC_SITE_URL + '/blog/' + slug;
  const res = await fetch(`${base}/wp-json/hatch/v1/seo-head?url=${encodeURIComponent(url)}`, {
    headers,
    cache: 'no-store',
  });
  if (!res.ok) return '';
  const data = (await res.json()) as { head?: string };
  return data.head ?? '';
}

/**
 * Fetch structured JSON-LD schema objects for a given public URL.
 *
 * Returns a flat array of schema.org objects — Article, BreadcrumbList, Person,
 * FAQ, HowTo, Product, etc. Pass-through from RankMath/Yoast when installed;
 * falls back to Article + BreadcrumbList built from WP post data.
 */
export async function getSchema(publicUrl: string): Promise<unknown[]> {
  if (!WP_API) return [];
  const base = WP_API.replace(/\/wp-json\/wp\/v2\/?$/, '');
  const res = await fetch(`${base}/wp-json/hatch/v1/schema?url=${encodeURIComponent(publicUrl)}`, {
    headers,
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { schema?: unknown[] };
  return Array.isArray(data.schema) ? data.schema : [];
}

/**
 * Search posts by free-text query. Uses WP REST `?search=`.
 * Returns posts + total count for pagination.
 */
export async function searchPosts(query: string, opts: { page?: number; perPage?: number } = {}): Promise<{ posts: Post[]; total: number; hasMore: boolean }> {
  if (!query.trim()) return { posts: [], total: 0, hasMore: false };
  const params = new URLSearchParams({
    _embed: '1',
    status: 'publish',
    search: query,
    page: String(opts.page ?? 1),
    per_page: String(opts.perPage ?? 10),
  });
  const res = await wpFetch(`/posts?${params.toString()}`);
  if (!res.ok) return { posts: [], total: 0, hasMore: false };
  const total = parseInt(res.headers.get('x-wp-total') || '0', 10);
  const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '0', 10);
  const data = (await res.json()) as WpRawPost[];
  return {
    posts: data.map(transform),
    total,
    hasMore: (opts.page ?? 1) < totalPages,
  };
}

/**
 * Fetch nav menu items for a registered WP menu location.
 *
 * Returns a flat array of top-level + nested items — use `parent` (0 = root)
 * and `order` to build nested menus if needed. Internal WP URLs are already
 * converted to root-relative paths by the PHP bridge.
 *
 * Falls back to an empty array if the location has no menu assigned or if
 * the WP connection is not configured.
 */
export async function getMenus(location: string): Promise<HatchMenuItem[]> {
  if (!WP_API) return [];
  const base = WP_API.replace(/\/wp-json\/wp\/v2\/?$/, '');
  const res = await fetch(`${base}/wp-json/hatch/v1/menus/${encodeURIComponent(location)}`, {
    headers,
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: HatchMenuItem[] };
  return Array.isArray(data.items) ? data.items : [];
}

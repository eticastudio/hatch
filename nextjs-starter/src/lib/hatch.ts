/**
 * Hatch WordPress REST client (server-only).
 *
 * Mirrors the Astro starter's contract: same endpoints, same shapes, same
 * fallbacks. Uses Next 15 `fetch` with `cache: 'force-cache'` +
 * `next: { revalidate: 60 }` for ISR-style behavior.
 */

const WP_API_RAW = (process.env.HATCH_WP_API_URL || '').replace(/\/$/, '');
const WP_USER = process.env.HATCH_WP_API_USER || '';
const WP_PASS = process.env.HATCH_WP_API_PASS || '';

// Accept either a root URL (http://wp) or a /wp-json root. Build a canonical
// /wp-json/wp/v2 base + /wp-json base.
function v2Base(): string {
  if (!WP_API_RAW) return '';
  if (/\/wp-json\/wp\/v2\/?$/.test(WP_API_RAW)) return WP_API_RAW.replace(/\/$/, '');
  if (/\/wp-json\/?$/.test(WP_API_RAW)) return WP_API_RAW.replace(/\/$/, '') + '/wp/v2';
  return WP_API_RAW + '/wp-json/wp/v2';
}
function jsonBase(): string {
  if (!WP_API_RAW) return '';
  return v2Base().replace(/\/wp\/v2\/?$/, '');
}
function origin(): string {
  return jsonBase().replace(/\/wp-json\/?$/, '');
}

const auth = WP_USER && WP_PASS ? 'Basic ' + Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64') : '';
const baseHeaders: Record<string, string> = auth ? { Authorization: auth } : {};

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
  author: { name: string; slug: string; avatar: string | null; description: string } | null;
  tags: string[];
  readMinutes: number;
}
export interface Category { id: number; name: string; slug: string; count: number; parent: number; }
export interface HatchMenuItem { id: number; parent: number; order: number; title: string; url: string; target: string; classes: string[]; }

interface WpRawPost {
  id: number; slug: string; date: string; modified: string; status: string;
  title?: { rendered?: string }; content?: { rendered?: string }; excerpt?: { rendered?: string };
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url?: string; alt_text?: string }>;
    'wp:term'?: Array<Array<{ id: number; name: string; slug: string }>>;
    author?: Array<{ name?: string; slug?: string; description?: string; avatar_urls?: Record<string, string> }>;
  };
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&#038;/g, '&')
    .replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
    .replace(/&#8216;|&#8217;|&apos;/g, "'")
    .replace(/&#8220;|&#8221;|&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
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
    id: p.id, slug: p.slug,
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
    author: author ? { name: author.name ?? '', slug: author.slug ?? '', avatar: author.avatar_urls?.['96'] ?? null, description: author.description ?? '' } : null,
    tags: tags.map((t) => decode(t.name)),
    readMinutes: readMinutes(html),
  };
}

// Next.js fetch with ISR. Pages can override per-call.
function wpFetch(url: string, init: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { ...baseHeaders, ...(init.headers || {}) },
    next: { revalidate: 60, ...(init.next || {}) },
  });
}

export async function getPosts(opts: { page?: number; perPage?: number; category?: number | null; author?: number | null } = {}): Promise<{ posts: Post[]; total: number; hasMore: boolean }> {
  if (!WP_API_RAW) return { posts: [], total: 0, hasMore: false };
  const params = new URLSearchParams({
    _embed: '1', status: 'publish',
    page: String(opts.page ?? 1),
    per_page: String(opts.perPage ?? 12),
  });
  if (opts.category) params.set('categories', String(opts.category));
  if (opts.author) params.set('author', String(opts.author));
  const res = await wpFetch(`${v2Base()}/posts?${params.toString()}`);
  if (!res.ok) return { posts: [], total: 0, hasMore: false };
  const total = parseInt(res.headers.get('x-wp-total') || '0', 10);
  const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '0', 10);
  const data = (await res.json()) as WpRawPost[];
  return { posts: data.map(transform), total, hasMore: (opts.page ?? 1) < totalPages };
}

export interface HatchContent {
  id: number; slug: string; type: string; rest_base: string;
  title: string; content: string; excerpt: string;
  featured_media_url: string; featured_media_alt: string;
  categories?: Array<{ id: number; name: string; slug: string }>;
  tags?: Array<{ id: number; name: string; slug: string }>;
  author?: { id: number; name: string; slug: string; bio: string; avatar: string } | null;
  modified: string; published: string; link: string; found?: boolean;
}

export async function getContentBySlug(slug: string): Promise<HatchContent | null> {
  if (!WP_API_RAW) return null;
  const url = `${jsonBase()}/hatch/v1/content?slug=${encodeURIComponent(slug)}`;
  const res = await wpFetch(url);
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  if (!data || data.found !== true) return null;
  return data as HatchContent;
}

function hatchContentToPost(c: HatchContent): Post {
  const cats = c.categories || [];
  const primary = cats[0];
  const text = (c.content || '').replace(/<[^>]+>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return {
    id: c.id, slug: c.slug, title: c.title, content: c.content, excerpt: c.excerpt,
    category: primary ? primary.name : null,
    categorySlug: primary ? primary.slug : null,
    categoryId: primary ? primary.id : null,
    featuredImage: c.featured_media_url || null,
    featuredImageAlt: c.featured_media_alt || null,
    publishedAt: c.published, modifiedAt: c.modified,
    author: c.author ? { name: c.author.name, slug: c.author.slug, avatar: c.author.avatar || null, description: c.author.bio || '' } : null,
    tags: (c.tags || []).map((t) => t.name),
    readMinutes: Math.max(1, Math.round(words / 200)),
  };
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const content = await getContentBySlug(slug);
  if (!content || content.type !== 'post') return null;
  return hatchContentToPost(content);
}

export async function getPageBySlug(slug: string): Promise<Post | null> {
  const content = await getContentBySlug(slug);
  if (!content || content.type !== 'page') return null;
  return hatchContentToPost(content);
}

export async function getPageById(id: number): Promise<Post | null> {
  if (!id || !WP_API_RAW) return null;
  const res = await wpFetch(`${v2Base()}/pages/${id}?_embed=1`);
  if (!res.ok) return null;
  const data = (await res.json()) as WpRawPost;
  if (!data || !data.id) return null;
  return transform(data);
}

export async function getCategories(): Promise<Category[]> {
  if (!WP_API_RAW) return [];
  const out: Category[] = [];
  let page = 1;
  while (page < 20) {
    const res = await wpFetch(`${v2Base()}/categories?per_page=100&page=${page}&hide_empty=false&orderby=count&order=desc`);
    if (!res.ok) break;
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const c of batch) {
      if (c.slug === 'uncategorized' && c.count === 0) continue;
      out.push({ id: c.id, name: decode(c.name || ''), slug: c.slug, count: c.count || 0, parent: c.parent || 0 });
    }
    if (batch.length < 100) break;
    page++;
  }
  return out.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function searchPosts(query: string, opts: { page?: number; perPage?: number } = {}): Promise<{ posts: Post[]; total: number; hasMore: boolean }> {
  if (!query.trim() || !WP_API_RAW) return { posts: [], total: 0, hasMore: false };
  const params = new URLSearchParams({
    _embed: '1', status: 'publish', search: query,
    page: String(opts.page ?? 1), per_page: String(opts.perPage ?? 10),
  });
  const res = await wpFetch(`${v2Base()}/posts?${params.toString()}`);
  if (!res.ok) return { posts: [], total: 0, hasMore: false };
  const total = parseInt(res.headers.get('x-wp-total') || '0', 10);
  const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '0', 10);
  const data = (await res.json()) as WpRawPost[];
  return { posts: data.map(transform), total, hasMore: (opts.page ?? 1) < totalPages };
}

export async function getMenus(location: string): Promise<HatchMenuItem[]> {
  if (!WP_API_RAW) return [];
  const res = await wpFetch(`${jsonBase()}/hatch/v1/menus/${encodeURIComponent(location)}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: HatchMenuItem[] };
  return Array.isArray(data.items) ? data.items : [];
}

export async function getPages(): Promise<Post[]> {
  if (!WP_API_RAW) return [];
  const res = await wpFetch(`${v2Base()}/pages?per_page=100&status=publish&_embed=1&orderby=menu_order&order=asc`);
  if (!res.ok) return [];
  const data = (await res.json()) as WpRawPost[];
  return data.map(transform);
}

export { origin as wpOrigin, jsonBase as wpJsonBase };

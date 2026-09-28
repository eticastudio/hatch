globalThis.process ??= {};
globalThis.process.env ??= {};
import { i as WP_API_USER, n as WP_API_PASS, r as WP_API_URL } from "./server_BKSwzYCg.mjs";
//#region src/lib/hatch.ts
var WP_API = WP_API_URL;
var WP_USER = WP_API_USER;
var WP_PASS = WP_API_PASS;
if (!WP_API || !WP_USER || !WP_PASS) console.warn("[hatch] WP_API_URL / WP_API_USER / WP_API_PASS not set in .env");
var auth = WP_USER && WP_PASS ? "Basic " + Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64") : "";
var headers = auth ? { Authorization: auth } : {};
function decode(s) {
	return s.replace(/&amp;/g, "&").replace(/&#038;/g, "&").replace(/&#8211;/g, "–").replace(/&#8212;/g, "—").replace(/&#8216;|&#8217;|&apos;/g, "'").replace(/&#8220;|&#8221;|&quot;/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
}
function readMinutes(html) {
	const words = html.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.ceil(words / 200));
}
function transform(p) {
	const media = p._embedded?.["wp:featuredmedia"]?.[0];
	const cats = p._embedded?.["wp:term"]?.[0] ?? [];
	const tags = p._embedded?.["wp:term"]?.[1] ?? [];
	const author = p._embedded?.author?.[0] ?? null;
	const html = p.content?.rendered ?? "";
	return {
		id: p.id,
		slug: p.slug,
		title: decode(p.title?.rendered ?? ""),
		content: html,
		excerpt: decode((p.excerpt?.rendered ?? "").replace(/<[^>]+>/g, "").trim()).slice(0, 160),
		category: cats[0] ? decode(cats[0].name) : null,
		categorySlug: cats[0]?.slug ?? null,
		categoryId: cats[0]?.id ?? null,
		featuredImage: media?.source_url ?? null,
		featuredImageAlt: media?.alt_text ?? null,
		publishedAt: p.date,
		modifiedAt: p.modified,
		author: author ? {
			name: author.name ?? "",
			slug: author.slug ?? "",
			avatar: author.avatar_urls?.["96"] ?? null,
			description: author.description ?? ""
		} : null,
		tags: tags.map((t) => decode(t.name)),
		readMinutes: readMinutes(html)
	};
}
var usePlainPermalinks = null;
function buildUrl(path) {
	if (!WP_API) throw new Error("WP_API_URL not configured");
	if (!usePlainPermalinks) return `${WP_API}${path}`;
	const origin = WP_API.replace(/\/wp-json\/wp\/v2\/?$/, "");
	const [bare, query = ""] = path.split("?");
	const restRoute = `/wp/v2${bare}`;
	const params = new URLSearchParams(query);
	params.set("rest_route", restRoute);
	return `${origin}/?${params.toString()}`;
}
async function wpFetch(path) {
	const res = await fetch(buildUrl(path), {
		headers,
		cache: "no-store",
		redirect: "manual"
	});
	if (usePlainPermalinks === null && (res.status === 301 || res.status === 302 || res.status === 404)) {
		usePlainPermalinks = true;
		return fetch(buildUrl(path), {
			headers,
			cache: "no-store"
		});
	}
	if (usePlainPermalinks === null) usePlainPermalinks = false;
	return res;
}
async function getPosts(opts = {}) {
	const params = new URLSearchParams({
		_embed: "1",
		status: "publish",
		page: String(opts.page ?? 1),
		per_page: String(opts.perPage ?? 12)
	});
	if (opts.category) params.set("categories", String(opts.category));
	if (opts.author) params.set("author", String(opts.author));
	const res = await wpFetch(`/posts?${params.toString()}`);
	if (!res.ok) return {
		posts: [],
		total: 0,
		hasMore: false
	};
	const total = parseInt(res.headers.get("x-wp-total") || "0", 10);
	const totalPages = parseInt(res.headers.get("x-wp-totalpages") || "0", 10);
	return {
		posts: (await res.json()).map(transform),
		total,
		hasMore: (opts.page ?? 1) < totalPages
	};
}
function hatchContentToPost(c) {
	const primary = (c.categories || [])[0];
	const words = (c.content || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
	const readMinutes2 = Math.max(1, Math.round(words / 200));
	return {
		id: c.id,
		slug: c.slug,
		title: c.title,
		content: c.content,
		excerpt: c.excerpt,
		category: primary ? primary.name : null,
		categorySlug: primary ? primary.slug : null,
		categoryId: primary ? primary.id : null,
		featuredImage: c.featured_media_url || null,
		featuredImageAlt: c.featured_media_alt || null,
		publishedAt: c.published,
		modifiedAt: c.modified,
		author: c.author ? {
			name: c.author.name,
			slug: c.author.slug,
			avatar: c.author.avatar || null,
			description: c.author.bio || ""
		} : null,
		tags: (c.tags || []).map((t) => t.name),
		readMinutes: readMinutes2,
		seo: c.seo
	};
}
async function getPostBySlug(slug) {
	const content = await getContentBySlug(slug);
	if (!content || content.type !== "post") return null;
	return hatchContentToPost(content);
}
async function getCategories() {
	const out = [];
	let page = 1;
	while (page < 20) {
		const res = await wpFetch(`/categories?per_page=100&page=${page}&hide_empty=false&orderby=count&order=desc`);
		if (!res.ok) break;
		const batch = await res.json();
		if (!Array.isArray(batch) || batch.length === 0) break;
		for (const c of batch) {
			if (c.slug === "uncategorized" && c.count === 0) continue;
			out.push({
				id: c.id,
				name: decode(c.name || ""),
				slug: c.slug,
				count: c.count || 0,
				parent: c.parent || 0
			});
		}
		if (batch.length < 100) break;
		page++;
	}
	return out.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
async function getAdjacent(slug) {
	const current = await getPostBySlug(slug);
	if (!current) return {
		prev: null,
		next: null
	};
	const date = encodeURIComponent(current.publishedAt);
	const [prevRes, nextRes] = await Promise.all([wpFetch(`/posts?per_page=1&before=${date}&order=desc&orderby=date&_embed=1`), wpFetch(`/posts?per_page=1&after=${date}&order=asc&orderby=date&_embed=1`)]);
	return {
		prev: prevRes.ok ? (await prevRes.json()).map(transform)[0] ?? null : null,
		next: nextRes.ok ? (await nextRes.json()).map(transform)[0] ?? null : null
	};
}
async function getPageBySlug(slug) {
	const content = await getContentBySlug(slug);
	if (!content || content.type !== "page") return null;
	return hatchContentToPost(content);
}
async function getContentBySlug(slug) {
	if (!WP_API) return null;
	const origin = WP_API.replace(/\/wp-json\/wp\/v2\/?$/, "").replace(/\/$/, "");
	const url = usePlainPermalinks ? `${origin}/?rest_route=/hatch/v1/content&slug=${encodeURIComponent(slug)}` : `${origin}/wp-json/hatch/v1/content?slug=${encodeURIComponent(slug)}`;
	const res = await fetch(url, {
		headers,
		cache: "no-store"
	});
	if (!res.ok) return null;
	const data = await res.json().catch(() => null);
	if (!data || data.found !== true) return null;
	return data;
}
async function getPages() {
	const res = await wpFetch("/pages?per_page=100&status=publish&_embed=1&orderby=menu_order&order=asc");
	if (!res.ok) return [];
	return (await res.json()).map(transform);
}
async function getRelatedPosts(post, limit = 3) {
	if (!post.categoryId) return [];
	const res = await wpFetch(`/posts?${new URLSearchParams({
		_embed: "1",
		status: "publish",
		categories: String(post.categoryId),
		exclude: String(post.id),
		per_page: String(limit),
		orderby: "date",
		order: "desc"
	}).toString()}`);
	if (!res.ok) return [];
	return (await res.json()).map(transform);
}
async function getPostsByTagSlug(tagSlug, opts = {}) {
	const tagRes = await wpFetch(`/tags?slug=${encodeURIComponent(tagSlug)}`);
	if (!tagRes.ok) return {
		posts: [],
		total: 0,
		tag: null
	};
	const tags = await tagRes.json();
	if (!tags.length) return {
		posts: [],
		total: 0,
		tag: null
	};
	const tag = tags[0];
	const res = await wpFetch(`/posts?${new URLSearchParams({
		_embed: "1",
		status: "publish",
		tags: String(tag.id),
		page: String(opts.page ?? 1),
		per_page: String(opts.perPage ?? 12)
	}).toString()}`);
	if (!res.ok) return {
		posts: [],
		total: 0,
		tag
	};
	const total = parseInt(res.headers.get("x-wp-total") || "0", 10);
	return {
		posts: (await res.json()).map(transform),
		total,
		tag
	};
}
async function getSeoHead(slug) {
	if (!WP_API) return "";
	const base = WP_API.replace(/\/wp-json\/wp\/v2\/?$/, "");
	const url = "https://hatch-site.invalid/blog/" + slug;
	const res = await fetch(`${base}/wp-json/hatch/v1/seo-head?url=${encodeURIComponent(url)}`, {
		headers,
		cache: "no-store"
	});
	if (!res.ok) return "";
	return (await res.json()).head ?? "";
}
async function getSchema(publicUrl) {
	if (!WP_API) return [];
	const base = WP_API.replace(/\/wp-json\/wp\/v2\/?$/, "");
	const res = await fetch(`${base}/wp-json/hatch/v1/schema?url=${encodeURIComponent(publicUrl)}`, {
		headers,
		cache: "no-store"
	});
	if (!res.ok) return [];
	const data = await res.json();
	return Array.isArray(data.schema) ? data.schema : [];
}
async function searchPosts(query, opts = {}) {
	if (!query.trim()) return {
		posts: [],
		total: 0,
		hasMore: false
	};
	const res = await wpFetch(`/posts?${new URLSearchParams({
		_embed: "1",
		status: "publish",
		search: query,
		page: String(opts.page ?? 1),
		per_page: String(opts.perPage ?? 10)
	}).toString()}`);
	if (!res.ok) return {
		posts: [],
		total: 0,
		hasMore: false
	};
	const total = parseInt(res.headers.get("x-wp-total") || "0", 10);
	const totalPages = parseInt(res.headers.get("x-wp-totalpages") || "0", 10);
	return {
		posts: (await res.json()).map(transform),
		total,
		hasMore: (opts.page ?? 1) < totalPages
	};
}
async function getMenus(location) {
	if (!WP_API) return [];
	const base = WP_API.replace(/\/wp-json\/wp\/v2\/?$/, "");
	const res = await fetch(`${base}/wp-json/hatch/v1/menus/${encodeURIComponent(location)}`, {
		headers,
		cache: "no-store"
	});
	if (!res.ok) return [];
	const data = await res.json();
	return Array.isArray(data.items) ? data.items : [];
}
//#endregion
export { getPageBySlug as a, getPosts as c, getSchema as d, getSeoHead as f, getMenus as i, getPostsByTagSlug as l, getCategories as n, getPages as o, searchPosts as p, getContentBySlug as r, getPostBySlug as s, getAdjacent as t, getRelatedPosts as u };

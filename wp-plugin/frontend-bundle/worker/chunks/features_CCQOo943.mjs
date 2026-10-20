globalThis.process ??= {};
globalThis.process.env ??= {};
import { i as WP_API_USER, n as WP_API_PASS, r as WP_API_URL } from "./server_BKSwzYCg.mjs";
//#region src/lib/site.ts
/**
* Site identity helpers: the one place that decides what the site is called
* and whether it has a tagline. Header, footer, <title>, meta description,
* Open Graph, JSON-LD, RSS, 404 and the credit line all read from here, so an
* empty WordPress Site Title or Tagline behaves the same everywhere.
*
* Rules:
*  - WordPress stores the title HTML-escaped ("Tom &amp; Jerry"), so it is
*    decoded here and escaped again by Astro or escapeXml() on output.
*  - Whitespace-only counts as empty.
*  - An empty name falls back to DEFAULT_SITE_NAME.
*  - An empty tagline stays empty. Callers omit the tag or element instead of
*    inventing filler text.
*
* Pure functions, no imports, safe in server and client code.
*/
var DEFAULT_SITE_NAME = "Your Site";
var NAMED_ENTITIES = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: "\"",
	apos: "'",
	nbsp: " ",
	hellip: "…",
	ndash: "–",
	mdash: "—",
	lsquo: "‘",
	rsquo: "’",
	ldquo: "“",
	rdquo: "”",
	copy: "©",
	reg: "®",
	trade: "™",
	laquo: "«",
	raquo: "»"
};
/** Decode HTML entities (named and numeric) in plain text. */
function decodeEntities(input) {
	return input.replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z][a-zA-Z0-9]{1,9}));/g, (whole, dec, hex, name) => {
		if (dec || hex) {
			const code = dec ? parseInt(dec, 10) : parseInt(hex, 16);
			if (code > 0 && code <= 1114111 && !(code >= 55296 && code <= 57343)) return String.fromCodePoint(code);
			return whole;
		}
		const hit = NAMED_ENTITIES[String(name).toLowerCase()];
		return hit !== void 0 ? hit : whole;
	});
}
/** Clean one piece of WordPress site text: strip tags, decode, collapse whitespace. */
function cleanSiteText(value) {
	if (typeof value !== "string") return "";
	return decodeEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}
/** Display name of the site, never empty. */
function siteName(site) {
	return cleanSiteText(site?.name) || "Your Site";
}
/** Tagline of the site. Empty string when the owner has not set one. */
function siteDescription(site) {
	return cleanSiteText(site?.description);
}
/** Escape text for use inside XML (RSS, sitemaps). */
function escapeXml(value) {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
//#endregion
//#region src/lib/features.ts
var WP_API = WP_API_URL;
var WP_USER = WP_API_USER;
var WP_PASS = WP_API_PASS;
var auth = WP_USER && WP_PASS ? "Basic " + Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64") : "";
var headers = auth ? { Authorization: auth } : {};
var PERF_FALLBACK = {
	image_proxy: true,
	prefetch_enabled: true,
	prefetch_strategy: "hover",
	compress_html: true,
	telemetry: false,
	image_layout: "constrained",
	image_service: "sharp",
	output_mode: "server",
	inline_stylesheets: "auto"
};
var INTEGRATIONS_FALLBACK = {
	seo: {
		detected: {
			slug: "none",
			label: "None",
			active: false
		},
		mode: "auto",
		schema: true,
		sitemap: true
	},
	forms: {
		detected: {
			slug: "none",
			label: "None",
			active: false
		},
		mode: "auto",
		default_form_id: 0
	},
	turnstile: {
		enabled: false,
		site_key: ""
	},
	comments: {
		enabled: true,
		require_login: false,
		moderate: true,
		turnstile: true
	}
};
var DESIGN_FALLBACK = {
	brand: {
		name: "",
		primary: "#ff6b35",
		accent: "#0a0a0a",
		fg: "#0a0a0a",
		bg: "#ffffff",
		font_heading: "Inter",
		font_body: "Inter",
		font_mono: "JetBrains Mono",
		mode: "auto"
	},
	layout: {
		density: "comfortable",
		rounded: "smooth",
		max_width: "1080"
	},
	voice: {
		tone: "professional",
		pronouns: "we"
	},
	templates: {
		single_sidebar: "right",
		single_hero: "featured",
		single_width: "medium",
		archive_grid: "2",
		archive_card_style: "default",
		archive_excerpt: "true",
		not_found_search: "true"
	}
};
var AESTHETIC_FALLBACK = {
	share: {
		x: true,
		linkedin: true,
		whatsapp: true,
		copy: true,
		facebook: false,
		reddit: false,
		email: false,
		position: "inline"
	},
	header: {
		sticky: "sticky",
		blur: true,
		color_mode_button: true,
		brand_mark: "icon_text",
		brand_display: "auto"
	},
	reading: {
		date_format: "long",
		reading_time_label: "min_read",
		breadcrumb_separator: "slash",
		toc_depth: "h2_h3",
		toc_label: "On this page",
		author_avatar_shape: "circle",
		progress_bar_position: "top",
		progress_bar_color: "primary",
		heading_anchors: false
	},
	images: {
		lightbox: true,
		lazy_load: true,
		hover_zoom: true,
		fallback_gradient: true,
		retina_2x: true,
		aspect_ratio: "2_1"
	},
	animation: {
		page_transitions: true,
		respect_reduced_motion: true
	},
	blog_index: {
		archive_grid: "3",
		pagination_style: "load_more",
		show_hero: true,
		show_topics: true
	},
	post_navigation: {
		related_count: 3,
		related_source: "category"
	}
};
var EMPTY_WOO_PAGE = {
	id: 0,
	slug: "",
	url: "",
	path: ""
};
var WOO_FALLBACK = {
	active: false,
	pages: {
		shop: EMPTY_WOO_PAGE,
		cart: EMPTY_WOO_PAGE,
		checkout: EMPTY_WOO_PAGE,
		myaccount: EMPTY_WOO_PAGE
	}
};
function mergeWoo(raw) {
	const src = raw && typeof raw === "object" ? raw : {};
	if (!src.active) return WOO_FALLBACK;
	const page = (p) => {
		const o = p && typeof p === "object" ? p : {};
		const id = Number(o.id) || 0;
		if (id <= 0) return EMPTY_WOO_PAGE;
		const slug = String(o.slug || "").replace(/^\/+|\/+$/g, "");
		const url = String(o.url || "");
		let path = "";
		try {
			path = new URL(url, "http://placeholder.invalid").pathname.replace(/\/+$/, "");
		} catch {
			path = "";
		}
		if (!path && slug) path = "/" + slug;
		return {
			id,
			slug,
			url,
			path
		};
	};
	const pages = src.pages || {};
	return {
		active: true,
		pages: {
			shop: page(pages.shop),
			cart: page(pages.cart),
			checkout: page(pages.checkout),
			myaccount: page(pages.myaccount)
		}
	};
}
var FALLBACK = {
	theme: "blog",
	design: DESIGN_FALLBACK,
	aesthetic: AESTHETIC_FALLBACK,
	perf: PERF_FALLBACK,
	features: {},
	site: {
		name: DEFAULT_SITE_NAME,
		description: "",
		url: "https://hatch-site.invalid",
		language: "en-US",
		icon_url: "",
		logo_url: ""
	},
	home: {
		mode: "posts",
		static_page_slug: "",
		static_page_id: 0
	},
	cpts: [],
	integrations: INTEGRATIONS_FALLBACK,
	woocommerce: WOO_FALLBACK,
	image_proxy_url: "",
	version: "",
	content: {
		comments_enabled: true,
		comments_turnstile: false,
		accounts_enabled: false,
		registration_open: false
	}
};
var cached = null;
var CACHE_TTL_MS = 6e4;
var inflight = null;
var FETCH_TIMEOUT_MS = 5e3;
function clearFeaturesCache() {
	cached = null;
}
function isFallbackFeatures(features) {
	return features === FALLBACK;
}
async function getFeatures() {
	if (cached && cached.expires > Date.now()) return cached.data;
	if (!WP_API) {
		console.warn("[hatch] WP_API_URL not set — using fallback features");
		return FALLBACK;
	}
	if (inflight) return inflight;
	inflight = (async () => {
		try {
			const base = WP_API.replace(/\/wp\/v2\/?$/, "");
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
			const res = await fetch(`${base}/hatch/v1/features`, {
				headers,
				cache: "no-store",
				signal: controller.signal
			}).finally(() => clearTimeout(timer));
			if (!res.ok) {
				console.warn("[hatch] /features returned", res.status, "— using fallback");
				return FALLBACK;
			}
			const data = await res.json();
			const merged = {
				theme: data.theme || FALLBACK.theme,
				design: data.design ? {
					brand: {
						...DESIGN_FALLBACK.brand,
						...data.design.brand || {}
					},
					layout: {
						...DESIGN_FALLBACK.layout,
						...data.design.layout || {}
					},
					voice: {
						...DESIGN_FALLBACK.voice,
						...data.design.voice || {}
					},
					templates: {
						...DESIGN_FALLBACK.templates,
						...data.design.templates || {}
					},
					borders: {
						color: "#e5e5e5",
						shadow: "soft",
						...data.design.borders || {}
					},
					breakpoints: {
						mobile: 640,
						tablet: 1024,
						desktop: 1280,
						...data.design.breakpoints || {}
					}
				} : DESIGN_FALLBACK,
				aesthetic: {
					share: {
						...AESTHETIC_FALLBACK.share,
						...data.aesthetic && data.aesthetic.share || {}
					},
					header: {
						...AESTHETIC_FALLBACK.header,
						...data.aesthetic && data.aesthetic.header || {}
					},
					reading: {
						...AESTHETIC_FALLBACK.reading,
						...data.aesthetic && data.aesthetic.reading || {}
					},
					images: {
						...AESTHETIC_FALLBACK.images,
						...data.aesthetic && data.aesthetic.images || {}
					},
					animation: {
						...AESTHETIC_FALLBACK.animation,
						...data.aesthetic && data.aesthetic.animation || {}
					},
					blog_index: {
						...AESTHETIC_FALLBACK.blog_index,
						...data.aesthetic && data.aesthetic.blog_index || {}
					},
					post_navigation: {
						...AESTHETIC_FALLBACK.post_navigation,
						...data.aesthetic && data.aesthetic.post_navigation || {}
					}
				},
				perf: {
					...PERF_FALLBACK,
					...data.perf || {}
				},
				features: {
					...FALLBACK.features,
					...data.features || {}
				},
				site: (() => {
					const merged2 = {
						...FALLBACK.site,
						...data.site || {}
					};
					merged2.name = siteName({ name: merged2.name });
					merged2.description = siteDescription({ description: merged2.description });
					merged2.url = "https://hatch-site.invalid".replace(/\/$/, "");
					return merged2;
				})(),
				home: {
					...FALLBACK.home,
					...data.home || {}
				},
				cpts: Array.isArray(data.cpts) ? data.cpts : [],
				integrations: data.integrations ? {
					seo: {
						...INTEGRATIONS_FALLBACK.seo,
						...data.integrations.seo || {}
					},
					forms: {
						...INTEGRATIONS_FALLBACK.forms,
						...data.integrations.forms || {}
					},
					turnstile: {
						...INTEGRATIONS_FALLBACK.turnstile,
						...data.integrations.turnstile || {}
					},
					comments: {
						...INTEGRATIONS_FALLBACK.comments,
						...data.integrations.comments || {}
					}
				} : INTEGRATIONS_FALLBACK,
				woocommerce: mergeWoo(data.woocommerce),
				image_proxy_url: data.image_proxy_url || "",
				version: data.version || "",
				content: data.content ? {
					comments_enabled: !!data.content.comments_enabled,
					comments_turnstile: !!data.content.comments_turnstile,
					accounts_enabled: !!data.content.accounts_enabled,
					registration_open: !!data.content.registration_open
				} : {
					comments_enabled: true,
					comments_turnstile: false,
					accounts_enabled: false,
					registration_open: false
				}
			};
			cached = {
				data: merged,
				expires: Date.now() + CACHE_TTL_MS
			};
			return merged;
		} catch (err) {
			console.warn("[hatch] /features fetch failed:", err.message);
			return FALLBACK;
		}
	})().finally(() => {
		inflight = null;
	});
	return inflight;
}
function hasFeature(features, key) {
	return Boolean(features.features?.[key]);
}
function imgSrc(features, src, opts = {}) {
	const proxy = features.image_proxy_url?.trim();
	if (!proxy || !src) return src;
	const frontendOrigin = (features.site.url || "").replace(/\/$/, "");
	const proxyOrigin = proxy.replace(/\/$/, "");
	const sameDomain = frontendOrigin && proxyOrigin === frontendOrigin;
	const params = new URLSearchParams();
	params.set("url", src);
	if (opts.w) params.set("w", String(opts.w));
	if (opts.h) params.set("h", String(opts.h));
	params.set("format", opts.format ?? "webp");
	if (opts.q) params.set("q", String(opts.q));
	if (sameDomain) return `/img?${params.toString()}`;
	return `${proxyOrigin}/img?${params.toString()}`;
}
function rewriteContentImages(html, features, maxWidth = 1200) {
	if (html) html = html.replace(/<h1\b/gi, "<h2").replace(/<\/h1>/gi, "</h2>");
	const proxy = features.image_proxy_url?.trim();
	if (!proxy || !html) return html;
	const proxyHost = proxy.replace(/\/$/, "");
	return html.replace(/<img\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
		if (src.startsWith("data:") || src.startsWith(proxyHost)) return match;
		const proxied = imgSrc(features, src, {
			w: maxWidth,
			format: "webp"
		});
		const hasLoading = /\bloading=/i.test(before + after);
		const hasDecoding = /\bdecoding=/i.test(before + after);
		return `<img${before}src="${proxied}"${after}${`${hasLoading ? "" : " loading=\"lazy\""}${hasDecoding ? "" : " decoding=\"async\""}`}>`;
	});
}
//#endregion
export { isFallbackFeatures as a, decodeEntities as c, siteName as d, imgSrc as i, escapeXml as l, getFeatures as n, rewriteContentImages as o, hasFeature as r, cleanSiteText as s, clearFeaturesCache as t, siteDescription as u };

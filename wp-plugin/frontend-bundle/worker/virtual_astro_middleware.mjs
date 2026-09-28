globalThis.process ??= {};
globalThis.process.env ??= {};
import { A as defineMiddleware, g as sequence } from "./chunks/render_BYCFEGfC.mjs";
import { i as WP_API_USER, n as WP_API_PASS } from "./chunks/server_BKSwzYCg.mjs";
//#region src/middleware.ts
var WP_API = "https://hatch-wp-api.invalid/wp-json/wp/v2";
var WP_USER = WP_API_USER || "";
var WP_PASS = WP_API_PASS || "";
var REDIRECTS_TTL_MS = 3e5;
var authHeader = WP_USER && WP_PASS ? "Basic " + Buffer.from(`${WP_USER}:${WP_PASS}`).toString("base64") : "";
var cache = null;
async function fetchRedirects() {
	if (!WP_API) return [];
	const now = Date.now();
	if (cache && now - cache.at < REDIRECTS_TTL_MS) return cache.rules;
	const base = WP_API.replace(/\/wp\/v2\/?$/, "");
	try {
		const headers = { Accept: "application/json" };
		if (authHeader) headers.Authorization = authHeader;
		const res = await fetch(`${base}/hatch/v1/redirects`, {
			headers,
			cf: { cacheTtl: 60 }
		});
		if (!res.ok) {
			cache = {
				at: now,
				rules: []
			};
			return [];
		}
		const data = await res.json();
		const normalized = (Array.isArray(data) ? data : data?.redirects ?? []).filter((r) => !!r && typeof r.from === "string" && typeof r.to === "string").map((r) => ({
			from: stripOrigin(r.from),
			to: r.to,
			status: r.status >= 300 && r.status < 400 ? r.status : 301,
			source: r.source
		}));
		cache = {
			at: now,
			rules: normalized
		};
		return normalized;
	} catch {
		cache = {
			at: now,
			rules: []
		};
		return [];
	}
}
function stripOrigin(u) {
	try {
		const url = new URL(u, "http://placeholder");
		return url.pathname + (url.search || "");
	} catch {
		return u.startsWith("/") ? u : "/" + u;
	}
}
function matches(path, rule) {
	const from = rule.from.toLowerCase();
	const p = path.toLowerCase();
	if (from.endsWith("/*")) {
		const prefix = from.slice(0, -2);
		if (p === prefix || p.startsWith(prefix + "/")) return {
			matched: true,
			captured: path.slice(prefix.length)
		};
	}
	if (from.endsWith("*")) {
		const prefix = from.slice(0, -1);
		if (p.startsWith(prefix)) return {
			matched: true,
			captured: path.slice(prefix.length)
		};
	}
	if (p === from || p === from + "/") return { matched: true };
	return { matched: false };
}
function resolveTarget(rule, captured, currentUrl) {
	let to = rule.to;
	if (captured && to.endsWith("*")) to = to.slice(0, -1) + captured;
	else if (captured && to.endsWith("/*")) to = to.slice(0, -2) + captured;
	if (to.startsWith("/")) return currentUrl.origin + to;
	return to;
}
var buckets = /* @__PURE__ */ new Map();
var LIMITS = {
	"/img": {
		max: 120,
		windowMs: 6e4
	},
	"/blog/api/revalidate": {
		max: 20,
		windowMs: 6e4
	}
};
function clientIp(request) {
	return request.headers.get("cf-connecting-ip") || (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}
var lastSweep = 0;
function sweepExpiredBuckets(now) {
	if (now - lastSweep < 6e4) return;
	lastSweep = now;
	for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
}
function rateLimit(request, path) {
	const cfg = LIMITS[path];
	if (!cfg) return null;
	const key = `${path}:${clientIp(request)}`;
	const now = Date.now();
	sweepExpiredBuckets(now);
	const b = buckets.get(key);
	if (!b || b.resetAt < now) {
		buckets.set(key, {
			count: 1,
			resetAt: now + cfg.windowMs
		});
		return null;
	}
	if (b.count >= cfg.max) return new Response("Too many requests", {
		status: 429,
		headers: {
			"Retry-After": String(Math.max(1, Math.ceil((b.resetAt - now) / 1e3))),
			"X-RateLimit-Limit": String(cfg.max),
			"X-RateLimit-Remaining": "0",
			"X-RateLimit-Reset": String(Math.ceil(b.resetAt / 1e3))
		}
	});
	b.count++;
	return null;
}
var CSP = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com https://static.cloudflareinsights.com https://js.stripe.com https://www.paypal.com https://www.paypalobjects.com",
	"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
	"font-src 'self' https://fonts.gstatic.com",
	"img-src 'self' data: https:",
	`connect-src 'self' https://www.google-analytics.com https://*.analytics.google.com https://api.stripe.com https://www.paypal.com ${(() => {
		try {
			return WP_API ? new URL(WP_API).origin : "";
		} catch (e) {
			return "";
		}
	})()}`,
	"frame-src 'self' https://www.googletagmanager.com https://challenges.cloudflare.com https://js.stripe.com https://hooks.stripe.com https://www.paypal.com",
	"frame-ancestors 'none'",
	"base-uri 'self'",
	"form-action 'self'"
].join("; ");
var BASE_HEADERS = {
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"X-Frame-Options": "SAMEORIGIN",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
	"Strict-Transport-Security": "max-age=31536000; includeSubDomains"
};
function attachSecurityHeaders(res) {
	const headers = new Headers(res.headers);
	for (const [k, v] of Object.entries(BASE_HEADERS)) if (!headers.has(k)) headers.set(k, v);
	if ((res.headers.get("content-type") || "").includes("text/html") && !headers.has("Content-Security-Policy")) headers.set("Content-Security-Policy", CSP);
	return new Response(res.body, {
		status: res.status,
		statusText: res.statusText,
		headers
	});
}
var onRequest$1 = defineMiddleware(async (context, next) => {
	const url = new URL(context.request.url);
	const rl = rateLimit(context.request, url.pathname.startsWith("/img") ? "/img" : url.pathname);
	if (rl) return rl;
	if (context.request.method === "GET" || context.request.method === "HEAD") {
		if (!url.pathname.startsWith("/api/") && !url.pathname.startsWith("/_astro/") && !url.pathname.startsWith("/img")) {
			const aliasTarget = {
				"/privacy": "/privacy-policy/",
				"/privacy/": "/privacy-policy/",
				"/terms": "/terms-of-service/",
				"/terms/": "/terms-of-service/"
			}[url.pathname];
			if (aliasTarget) return new Response(null, {
				status: 301,
				headers: {
					Location: aliasTarget,
					"X-Hatch-Redirect-Source": "legal-alias",
					"Cache-Control": "public, max-age=60"
				}
			});
			const rules = await fetchRedirects();
			for (const rule of rules) {
				const { matched, captured } = matches(url.pathname, rule);
				if (matched) {
					const target = resolveTarget(rule, captured, url);
					return new Response(null, {
						status: rule.status,
						headers: {
							Location: target,
							"X-Hatch-Redirect-Source": rule.source || "wordpress",
							"Cache-Control": "public, max-age=60"
						}
					});
				}
			}
		}
	}
	return attachSecurityHeaders(await next());
});
//#endregion
//#region \0virtual:astro:middleware
var onRequest = sequence(onRequest$1);
//#endregion
export { onRequest };

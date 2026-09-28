globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
//#region src/pages/img.ts
var img_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var BACKEND = String("").trim().replace(/\/$/, "");
function buildAllowedHosts() {
	const hosts = /* @__PURE__ */ new Set();
	const add = (raw) => {
		if (!raw) return;
		try {
			hosts.add(new URL(raw).host.toLowerCase());
		} catch {}
	};
	add("https://hatch-wp-api.invalid/wp-json/wp/v2");
	add("https://hatch-site.invalid");
	const extras = "".split(",");
	for (const h of extras) {
		const t = h.trim();
		if (!t) continue;
		if (t.includes("://")) add(t);
		else hosts.add(t.toLowerCase());
	}
	return hosts;
}
var ALLOWED_HOSTS = buildAllowedHosts();
function isAllowedSrc(raw, selfHost) {
	let u;
	try {
		u = new URL(raw);
	} catch {
		return false;
	}
	if (u.protocol !== "https:" && true) return false;
	const host = u.host.toLowerCase();
	if (host === selfHost) return true;
	return ALLOWED_HOSTS.has(host);
}
var GET = async ({ request, url }) => {
	const src = url.searchParams.get("url");
	const w = url.searchParams.get("w");
	const h = url.searchParams.get("h");
	const format = (url.searchParams.get("format") || "webp").toLowerCase();
	const q = url.searchParams.get("q") || "80";
	if (!src) return new Response(JSON.stringify({ error: "url required" }), {
		status: 400,
		headers: { "Content-Type": "application/json" }
	});
	if (!isAllowedSrc(src, url.host.toLowerCase())) return new Response(JSON.stringify({ error: "url host not allowed" }), {
		status: 400,
		headers: { "Content-Type": "application/json" }
	});
	if (!BACKEND) try {
		const direct = await fetch(src, {
			signal: AbortSignal.timeout(15e3),
			headers: { "User-Agent": "Hatch-img/1.0" }
		});
		if (!direct.ok || !(direct.headers.get("content-type") || "").startsWith("image/")) return Response.redirect(src, 302);
		return new Response(direct.body, {
			status: 200,
			headers: {
				"Content-Type": direct.headers.get("content-type"),
				"Cache-Control": "public, max-age=86400"
			}
		});
	} catch {
		return Response.redirect(src, 302);
	}
	const backendUrl = new URL(BACKEND + "/img");
	backendUrl.searchParams.set("url", src);
	if (w) backendUrl.searchParams.set("w", w);
	if (h) backendUrl.searchParams.set("h", h);
	backendUrl.searchParams.set("format", format === "avif" ? "avif" : "webp");
	backendUrl.searchParams.set("q", q);
	let upstream;
	try {
		upstream = await fetch(backendUrl, {
			signal: AbortSignal.timeout(15e3),
			headers: { "User-Agent": "Hatch-img-proxy/1.0" }
		});
	} catch {
		return Response.redirect(src, 302);
	}
	if (!upstream.ok) return Response.redirect(src, 302);
	return new Response(upstream.body, {
		status: 200,
		headers: {
			"Content-Type": upstream.headers.get("content-type") || (format === "avif" ? "image/avif" : "image/webp"),
			"Cache-Control": "public, max-age=31536000, immutable",
			"X-Img-Backend": BACKEND
		}
	});
};
//#endregion
//#region \0virtual:astro:page:src/pages/img@_@ts
var page = () => img_exports;
//#endregion
export { page };

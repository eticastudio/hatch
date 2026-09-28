globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import "./server_BKSwzYCg.mjs";
//#region src/pages/api/wc-store/[...path].ts
var ____path__exports = /* @__PURE__ */ __exportAll({
	DELETE: () => DELETE,
	GET: () => GET,
	OPTIONS: () => OPTIONS,
	POST: () => POST,
	PUT: () => PUT,
	prerender: () => false
});
var WP_BASE = "https://hatch-wp-api.invalid/wp-json/wp/v2".replace(/\/wp-json(\/.*)?$/, "").replace(/\/$/, "");
var FORWARD_REQ_HEADERS = [
	"content-type",
	"nonce",
	"cart-token",
	"x-wp-nonce",
	"authorization",
	"accept"
];
var FORWARD_RES_HEADERS = [
	"nonce",
	"cart-token",
	"cart-hash",
	"content-type"
];
async function proxy(request, path) {
	if (!WP_BASE) return new Response(JSON.stringify({ code: "hatch_wp_api_url_missing" }), {
		status: 500,
		headers: { "Content-Type": "application/json" }
	});
	const target = `${WP_BASE}/wp-json/wc/store/v1/${(path || "").replace(/^\/+/, "").replace(/\.\./g, "")}${new URL(request.url).search}`;
	const outHeaders = {};
	for (const h of FORWARD_REQ_HEADERS) {
		const v = request.headers.get(h);
		if (v) outHeaders[h] = v;
	}
	const cookie = request.headers.get("cookie");
	if (cookie) outHeaders["cookie"] = cookie;
	const body = ["GET", "HEAD"].includes(request.method) ? void 0 : await request.arrayBuffer();
	const upstream = await fetch(target, {
		method: request.method,
		headers: outHeaders,
		body,
		redirect: "manual"
	});
	const resHeaders = new Headers();
	for (const h of FORWARD_RES_HEADERS) {
		const v = upstream.headers.get(h);
		if (v) resHeaders.set(h, v);
	}
	upstream.headers.forEach((value, key) => {
		if (key.toLowerCase() === "set-cookie") resHeaders.append("set-cookie", value);
	});
	return new Response(upstream.body, {
		status: upstream.status,
		headers: resHeaders
	});
}
var GET = ({ request, params }) => proxy(request, params.path);
var POST = ({ request, params }) => proxy(request, params.path);
var PUT = ({ request, params }) => proxy(request, params.path);
var DELETE = ({ request, params }) => proxy(request, params.path);
var OPTIONS = ({ request, params }) => proxy(request, params.path);
//#endregion
//#region \0virtual:astro:page:src/pages/api/wc-store/[...path]@_@ts
var page = () => ____path__exports;
//#endregion
export { page };

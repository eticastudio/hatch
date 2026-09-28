globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import "./server_BKSwzYCg.mjs";
//#region src/pages/api/hatch/[...path].ts
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
	"x-wp-nonce",
	"authorization",
	"accept"
];
async function proxy(request, path) {
	if (!WP_BASE) return new Response(JSON.stringify({ code: "hatch_wp_api_url_missing" }), {
		status: 500,
		headers: { "Content-Type": "application/json" }
	});
	const target = `${WP_BASE}/wp-json/hatch/v1/${(path || "").replace(/^\/+/, "").replace(/\.\./g, "")}${new URL(request.url).search}`;
	const outHeaders = {};
	for (const h of FORWARD_REQ_HEADERS) {
		const v = request.headers.get(h);
		if (v) outHeaders[h] = v;
	}
	const cookie = request.headers.get("cookie");
	if (cookie) outHeaders["cookie"] = cookie;
	const body = ["GET", "HEAD"].includes(request.method) ? void 0 : await request.arrayBuffer();
	let upstream;
	try {
		upstream = await fetch(target, {
			method: request.method,
			headers: outHeaders,
			body,
			redirect: "manual"
		});
	} catch (err) {
		return new Response(JSON.stringify({
			code: "hatch_upstream_unreachable",
			message: String(err.message || err)
		}), {
			status: 502,
			headers: { "Content-Type": "application/json" }
		});
	}
	const resHeaders = new Headers();
	const ct = upstream.headers.get("content-type");
	if (ct) resHeaders.set("content-type", ct);
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
//#region \0virtual:astro:page:src/pages/api/hatch/[...path]@_@ts
var page = () => ____path__exports;
//#endregion
export { page };

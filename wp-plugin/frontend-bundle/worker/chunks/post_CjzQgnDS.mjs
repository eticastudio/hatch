globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import "./server_BKSwzYCg.mjs";
//#region src/pages/api/hatch-comments/post.ts
var post_exports = /* @__PURE__ */ __exportAll({
	POST: () => POST,
	prerender: () => false
});
var WP_BASE = "https://hatch-wp-api.invalid/wp-json/wp/v2".replace(/\/wp\/v2\/?$/, "").replace(/\/$/, "");
function json(body, status) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" }
	});
}
var POST = async ({ request, clientAddress }) => {
	if (!WP_BASE) return json({
		ok: false,
		message: "Comments are not configured."
	}, 503);
	let form;
	try {
		form = await request.formData();
	} catch {
		return json({
			ok: false,
			message: "Could not read the form."
		}, 400);
	}
	let upstream;
	try {
		upstream = await fetch(`${WP_BASE}/hatch/v1/comments`, {
			method: "POST",
			body: form,
			headers: {
				Accept: "application/json",
				"X-Forwarded-For": clientAddress || "",
				"User-Agent": request.headers.get("user-agent") || "Hatch-Comment-Proxy/1.0"
			},
			signal: AbortSignal.timeout(15e3)
		});
	} catch {
		return json({
			ok: false,
			message: "Could not reach the server. Try again."
		}, 504);
	}
	const text = await upstream.text();
	let body;
	try {
		body = JSON.parse(text);
	} catch {
		return json({
			ok: false,
			message: "Unexpected response from the server."
		}, 502);
	}
	return json(body, upstream.status);
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/hatch-comments/post@_@ts
var page = () => post_exports;
//#endregion
export { page };

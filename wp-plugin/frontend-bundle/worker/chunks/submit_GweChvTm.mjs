globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
//#region src/pages/api/hatch-form/[provider]/[id]/submit.ts
var submit_exports = /* @__PURE__ */ __exportAll({
	POST: () => POST,
	prerender: () => false
});
var WP_ORIGIN = "https://hatch-wp-api.invalid/wp-json/wp/v2".replace(/\/wp-json\/wp\/v2\/?$/, "").replace(/\/+$/, "");
var POST = async ({ params, request }) => {
	const provider = String(params.provider || "").replace(/[^a-z0-9_-]/gi, "");
	const id = parseInt(String(params.id || "0"), 10);
	if (!provider || !id) return new Response(JSON.stringify({
		ok: false,
		error: "bad_params"
	}), {
		status: 400,
		headers: { "Content-Type": "application/json" }
	});
	if (!WP_ORIGIN) return new Response(JSON.stringify({
		ok: false,
		error: "wp_origin_missing"
	}), {
		status: 500,
		headers: { "Content-Type": "application/json" }
	});
	const body = await request.text();
	try {
		const res = await fetch(`${WP_ORIGIN}/wp-json/hatch/v1/forms/${provider}/${id}/submit`, {
			method: "POST",
			headers: {
				"Content-Type": request.headers.get("content-type") || "application/json",
				Accept: "application/json",
				"X-Forwarded-For": request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || ""
			},
			body
		});
		const text = await res.text();
		return new Response(text, {
			status: res.status,
			headers: { "Content-Type": "application/json" }
		});
	} catch (e) {
		return new Response(JSON.stringify({
			ok: false,
			error: "proxy_failed",
			msg: String(e?.message || e)
		}), {
			status: 502,
			headers: { "Content-Type": "application/json" }
		});
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/hatch-form/[provider]/[id]/submit@_@ts
var page = () => submit_exports;
//#endregion
export { page };

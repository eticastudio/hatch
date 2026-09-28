globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
//#region src/pages/api/hatch-form/[provider]/[id].ts
var _id__exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var WP_ORIGIN = "https://hatch-wp-api.invalid/wp-json/wp/v2".replace(/\/wp-json\/wp\/v2\/?$/, "").replace(/\/+$/, "");
var GET = async ({ params }) => {
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
	try {
		const res = await fetch(`${WP_ORIGIN}/wp-json/hatch/v1/forms/${provider}/${id}`, { headers: { Accept: "application/json" } });
		const body = await res.text();
		let out = body;
		try {
			const parsed = JSON.parse(body);
			if (parsed && parsed.submit && typeof parsed.submit.url === "string") parsed.submit.url = `/api/hatch-form/${provider}/${id}/submit`;
			out = JSON.stringify(parsed);
		} catch {}
		return new Response(out, {
			status: res.status,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "public, max-age=30"
			}
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
//#region \0virtual:astro:page:src/pages/api/hatch-form/[provider]/[id]@_@ts
var page = () => _id__exports;
//#endregion
export { page };

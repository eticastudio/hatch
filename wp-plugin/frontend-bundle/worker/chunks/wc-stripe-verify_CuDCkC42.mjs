globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import "./server_BKSwzYCg.mjs";
//#region src/pages/api/wc-stripe-verify.ts
var wc_stripe_verify_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var WP_BASE = "https://hatch-wp-api.invalid/wp-json/wp/v2".replace(/\/wp-json(\/.*)?$/, "").replace(/\/$/, "");
var GET = async ({ request }) => {
	if (!WP_BASE) return new Response(JSON.stringify({
		ok: false,
		error: "wp_api_url_missing"
	}), {
		status: 500,
		headers: { "Content-Type": "application/json" }
	});
	const url = new URL(request.url);
	const order = url.searchParams.get("order") || "";
	const nonce = url.searchParams.get("nonce") || "";
	const intentId = url.searchParams.get("intent_id") || "";
	const redirectTo = url.searchParams.get("redirect_to") || "";
	if (!order || !nonce) return new Response(JSON.stringify({
		ok: false,
		error: "missing_params"
	}), {
		status: 400,
		headers: { "Content-Type": "application/json" }
	});
	const target = new URL(`${WP_BASE}/`);
	target.searchParams.set("wc-ajax", "wc_stripe_verify_intent");
	target.searchParams.set("order", order);
	target.searchParams.set("nonce", nonce);
	if (intentId) target.searchParams.set("intent_id", intentId);
	if (redirectTo) target.searchParams.set("redirect_to", redirectTo);
	const cookie = request.headers.get("cookie") || "";
	const abort = new AbortController();
	const timer = setTimeout(() => abort.abort(), 1e4);
	try {
		const upstream = await fetch(target.toString(), {
			method: "GET",
			headers: {
				Accept: "text/html,*/*",
				...cookie ? { Cookie: cookie } : {}
			},
			redirect: "manual",
			signal: abort.signal
		});
		const location = upstream.headers.get("location") || "";
		return new Response(JSON.stringify({
			ok: upstream.status < 500,
			status: upstream.status,
			location
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return new Response(JSON.stringify({
			ok: false,
			error: "upstream_unreachable",
			detail: msg.slice(0, 200)
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} finally {
		clearTimeout(timer);
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/wc-stripe-verify@_@ts
var page = () => wc_stripe_verify_exports;
//#endregion
export { page };

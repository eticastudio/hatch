globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import "./server_BKSwzYCg.mjs";
//#region src/pages/api/auth/logout.ts
var logout_exports = /* @__PURE__ */ __exportAll({
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
var POST = async ({ request }) => {
	if (!WP_BASE) return json({ ok: true }, 200);
	let upstream;
	try {
		upstream = await fetch(`${WP_BASE}/hatch/v1/auth/logout`, {
			method: "POST",
			headers: {
				Accept: "application/json",
				Cookie: request.headers.get("cookie") || ""
			},
			signal: AbortSignal.timeout(1e4)
		});
	} catch {
		const h = new Headers({ "Content-Type": "application/json" });
		h.append("set-cookie", "hatch_jwt=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: h
		});
	}
	const text = await upstream.text();
	let body;
	try {
		body = JSON.parse(text);
	} catch {
		body = { ok: true };
	}
	const headers = new Headers({ "Content-Type": "application/json" });
	const setCookie = upstream.headers.get("set-cookie");
	if (setCookie) headers.append("set-cookie", setCookie);
	else headers.append("set-cookie", "hatch_jwt=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
	return new Response(JSON.stringify(body), {
		status: upstream.status,
		headers
	});
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/auth/logout@_@ts
var page = () => logout_exports;
//#endregion
export { page };

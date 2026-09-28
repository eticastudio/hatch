globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
//#region src/pages/api/hatch-verify.ts
var hatch_verify_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	HEAD: () => HEAD,
	OPTIONS: () => OPTIONS,
	prerender: () => false
});
var GET = ({ request }) => {
	const url = new URL(request.url);
	const now = Date.now();
	const payload = {
		hatch: true,
		version: "0.5.2",
		mount: "ok",
		origin_host: url.host,
		x_forwarded_host: request.headers.get("x-forwarded-host") || null,
		request_id: crypto.randomUUID(),
		timestamp: now,
		timestamp_iso: new Date(now).toISOString()
	};
	return new Response(JSON.stringify(payload, null, 2), {
		status: 200,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store, max-age=0, must-revalidate",
			"Pragma": "no-cache",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, HEAD, OPTIONS"
		}
	});
};
var HEAD = () => new Response(null, { status: 200 });
var OPTIONS = () => new Response(null, {
	status: 204,
	headers: {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
		"Access-Control-Max-Age": "86400"
	}
});
//#endregion
//#region \0virtual:astro:page:src/pages/api/hatch-verify@_@ts
var page = () => hatch_verify_exports;
//#endregion
export { page };

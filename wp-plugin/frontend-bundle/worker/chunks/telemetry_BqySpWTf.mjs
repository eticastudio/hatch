globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
//#region src/pages/api/telemetry.ts
var telemetry_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST
});
var POST = async ({ request }) => {
	try {
		const text = await request.text();
		if (text.length > 1024) return new Response("Payload too large", { status: 413 });
		const data = JSON.parse(text);
		if (typeof data?.lcp !== "number" || typeof data?.ttfb !== "number") return new Response("Bad payload", { status: 400 });
		console.log("[hatch:telemetry]", JSON.stringify({
			site: String(data.site || "").slice(0, 200),
			ttfb: Math.round(data.ttfb),
			lcp: Math.round(data.lcp),
			dcl: Math.round(data.dcl || 0),
			ts: data.ts || Date.now()
		}));
		return new Response(null, { status: 204 });
	} catch {
		return new Response("Bad request", { status: 400 });
	}
};
var GET = () => new Response("Method not allowed", { status: 405 });
//#endregion
//#region \0virtual:astro:page:src/pages/api/telemetry@_@ts
var page = () => telemetry_exports;
//#endregion
export { page };

globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
//#region src/pages/.well-known/mcp.json.ts
var mcp_json_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var WP_ORIGIN = "https://hatch-wp-api.invalid/wp-json/wp/v2".replace(/\/wp-json\/wp\/v2\/?$/, "").replace(/\/$/, "");
var GET = async () => {
	try {
		const upstream = await fetch(`${WP_ORIGIN}/.well-known/mcp.json`, {
			redirect: "manual",
			headers: { "User-Agent": "Hatch-Astro/0.5.2 (mcp-proxy)" }
		});
		if (upstream.status >= 400) return new Response(JSON.stringify({
			error: "MCP surface not configured",
			hint: "Enable RankReady headless mode."
		}, null, 2), {
			status: 200,
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Cache-Control": "no-store"
			}
		});
		const body = await upstream.text();
		return new Response(body, {
			status: 200,
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Cache-Control": "public, max-age=600, s-maxage=3600"
			}
		});
	} catch (err) {
		return new Response(JSON.stringify({
			error: "MCP fetch error",
			message: err.message
		}), {
			status: 200,
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Cache-Control": "no-store"
			}
		});
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/.well-known/mcp.json@_@ts
var page = () => mcp_json_exports;
//#endregion
export { page };

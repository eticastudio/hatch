globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
//#region src/pages/llms.txt.ts
var llms_txt_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var WP_ORIGIN = "https://hatch-wp-api.invalid/wp-json/wp/v2".replace(/\/wp-json\/wp\/v2\/?$/, "").replace(/\/$/, "");
var GET = async () => {
	try {
		const upstream = await fetch(`${WP_ORIGIN}/llms.txt`, {
			redirect: "manual",
			headers: { "User-Agent": "Hatch-Astro/0.5.2 (llms-proxy)" }
		});
		if (upstream.status >= 400) return new Response("# llms.txt not configured on this site.\n", {
			status: 200,
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "no-store"
			}
		});
		const body = await upstream.text();
		return new Response(body, {
			status: 200,
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "public, max-age=600, s-maxage=3600"
			}
		});
	} catch (err) {
		return new Response(`# llms.txt fetch error: ${err.message}
`, {
			status: 200,
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "no-store"
			}
		});
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/llms.txt@_@ts
var page = () => llms_txt_exports;
//#endregion
export { page };

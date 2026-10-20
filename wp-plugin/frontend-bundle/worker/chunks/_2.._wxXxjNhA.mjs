globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
//#region src/pages/hatch-media/[...path].ts
var ____path__exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	prerender: () => false
});
var WP_ORIGIN = (() => {
	const apiUrl = "https://hatch-wp-api.invalid/wp-json/wp/v2".replace(/\/wp-json\/.*$/, "");
	if (apiUrl) return apiUrl;
	throw new Error("[hatch-media] WP_API_URL is required in production");
})();
var IMAGE_EXTS = /* @__PURE__ */ new Set([
	"jpg",
	"jpeg",
	"png",
	"gif",
	"webp",
	"avif",
	"tiff"
]);
function pickBestImageFormat(accept) {
	if (!accept) return "webp";
	const a = accept.toLowerCase();
	if (a.includes("image/avif")) return "avif";
	if (a.includes("image/webp")) return "webp";
	return null;
}
var GET = async ({ params, request, url }) => {
	const path = params.path;
	if (!path) return new Response("Not found", { status: 404 });
	if (path.includes("..")) return new Response("Bad request", { status: 400 });
	const upstreamUrl = `${WP_ORIGIN}/wp-content/uploads/${path}`;
	const ext = (path.split(".").pop() || "").toLowerCase();
	if (IMAGE_EXTS.has(ext)) {
		const bestFormat = pickBestImageFormat(request.headers.get("accept"));
		if (bestFormat) {
			const imgUrl = new URL("/img", url.origin);
			imgUrl.searchParams.set("url", upstreamUrl);
			imgUrl.searchParams.set("format", bestFormat);
			const w = url.searchParams.get("w");
			if (w) imgUrl.searchParams.set("w", w);
			const q = url.searchParams.get("q");
			if (q) imgUrl.searchParams.set("q", q);
			try {
				const opt = await fetch(imgUrl, { signal: AbortSignal.timeout(15e3) });
				if (opt.ok) return new Response(opt.body, {
					status: 200,
					headers: {
						"Content-Type": opt.headers.get("content-type") || `image/${bestFormat}`,
						"Cache-Control": "public, max-age=31536000, immutable",
						"Vary": "Accept",
						"X-Hatch-Media": `optimized:${bestFormat}`,
						"Access-Control-Allow-Origin": "*"
					}
				});
			} catch {}
		}
	}
	let upstream;
	try {
		upstream = await fetch(upstreamUrl, {
			signal: AbortSignal.timeout(3e4),
			headers: { "User-Agent": "Hatch-Media-Proxy/1.0" },
			redirect: "manual"
		});
	} catch {
		return new Response("Upstream timeout", { status: 504 });
	}
	if (upstream.status >= 300 && upstream.status < 400) return new Response("Not found", { status: 404 });
	if (!upstream.ok) return new Response("Not found", { status: upstream.status });
	const headers = {
		"Content-Type": upstream.headers.get("content-type") || "application/octet-stream",
		"Cache-Control": "public, max-age=31536000, immutable",
		"X-Hatch-Media": "stream",
		"Access-Control-Allow-Origin": "*"
	};
	const acceptRanges = upstream.headers.get("accept-ranges");
	if (acceptRanges) headers["Accept-Ranges"] = acceptRanges;
	const contentLength = upstream.headers.get("content-length");
	if (contentLength) headers["Content-Length"] = contentLength;
	return new Response(upstream.body, {
		status: upstream.status,
		headers
	});
};
//#endregion
//#region \0virtual:astro:page:src/pages/hatch-media/[...path]@_@ts
var page = () => ____path__exports;
//#endregion
export { page };

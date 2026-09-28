globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import "./server_BKSwzYCg.mjs";
//#region src/pages/api/auth/register.ts
var register_exports = /* @__PURE__ */ __exportAll({
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
	if (!WP_BASE) return json({ message: "Auth is not configured." }, 503);
	let payload;
	try {
		payload = await request.json();
	} catch {
		return json({ message: "Invalid request body." }, 400);
	}
	let upstream;
	try {
		upstream = await fetch(`${WP_BASE}/hatch/v1/auth/register`, {
			method: "POST",
			body: JSON.stringify(payload),
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				"X-Forwarded-For": clientAddress || "",
				"User-Agent": request.headers.get("user-agent") || "Hatch-Auth-Proxy/1.0"
			},
			signal: AbortSignal.timeout(15e3)
		});
	} catch {
		return json({ message: "Could not reach the server. Try again." }, 504);
	}
	const text = await upstream.text();
	let body;
	try {
		body = JSON.parse(text);
	} catch {
		return json({ message: "Unexpected response." }, 502);
	}
	const headers = new Headers({ "Content-Type": "application/json" });
	const setCookies = typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie() : [];
	if (setCookies.length === 0) upstream.headers.forEach((value, key) => {
		if (key.toLowerCase() === "set-cookie") setCookies.push(value);
	});
	for (const raw of setCookies) headers.append("set-cookie", raw.replace(/;\s*Domain=[^;]+/i, ""));
	return new Response(JSON.stringify(body), {
		status: upstream.status,
		headers
	});
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/auth/register@_@ts
var page = () => register_exports;
//#endregion
export { page };

globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import "./server_BKSwzYCg.mjs";
//#region src/pages/api/auth/login.ts
var login_exports = /* @__PURE__ */ __exportAll({
	POST: () => POST,
	prerender: () => false
});
var WP_BASE = "https://hatch-wp-api.invalid/wp-json/wp/v2".replace(/\/wp\/v2\/?$/, "").replace(/\/$/, "");
function json(body, status, extra) {
	const headers = new Headers(extra);
	headers.set("Content-Type", "application/json");
	return new Response(JSON.stringify(body), {
		status,
		headers
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
		upstream = await fetch(`${WP_BASE}/hatch/v1/auth/login`, {
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
	for (const raw of setCookies) {
		const stripped = raw.replace(/;\s*Domain=[^;]+/i, "");
		headers.append("set-cookie", stripped);
	}
	return new Response(JSON.stringify(body), {
		status: upstream.status,
		headers
	});
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/auth/login@_@ts
var page = () => login_exports;
//#endregion
export { page };

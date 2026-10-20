globalThis.process ??= {};
globalThis.process.env ??= {};
//#region src/lib/url-builder.ts
/**
* Accept a post-login redirect only when it is a path on this same site.
* Anything else (another host, a protocol-relative "//host", "javascript:",
* a backslash trick) falls back to the given default, so a crafted
* ?redirect_to= link can never send a signed-in visitor off the site.
*/
function safeRedirectPath(raw, fallback = "/account") {
	const value = (raw ?? "").trim();
	if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return fallback;
	return value;
}
//#endregion
export { safeRedirectPath as t };

globalThis.process ??= {};
globalThis.process.env ??= {};
//#region src/lib/theme-dispatch.ts
var KNOWN = [
	"blog",
	"tech",
	"docs"
];
function themeKey(features) {
	const t = String(features?.theme || "blog").toLowerCase();
	return KNOWN.includes(t) ? t : "blog";
}
//#endregion
export { themeKey as t };

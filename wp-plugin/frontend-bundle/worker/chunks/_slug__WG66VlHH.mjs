globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
//#region src/pages/category/[slug].astro
var _slug__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Slug,
	file: () => $$file,
	url: () => $$url
});
createAstro("http://localhost:4321");
var $$Slug = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Slug;
	const { slug } = Astro.params;
	if (!slug) return Astro.redirect("/");
	return Astro.rewrite(`/blog/category/${slug}`);
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/category/[slug].astro", void 0);
var $$file = "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/category/[slug].astro";
var $$url = "/category/[slug]";
//#endregion
//#region \0virtual:astro:page:src/pages/category/[slug]@_@astro
var page = () => _slug__exports;
//#endregion
export { page };

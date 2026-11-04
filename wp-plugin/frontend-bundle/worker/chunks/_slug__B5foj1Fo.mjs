globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
//#region src/pages/tag/[slug].astro
var _slug__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Slug,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://hatch-site.invalid");
var $$Slug = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Slug;
	const { slug } = Astro.params;
	if (!slug) return Astro.redirect("/");
	return Astro.rewrite(`/blog/tag/${slug}`);
}, "/private/var/folders/k3/_ljrcwl15lx5cd5ndyy5n6lh0000gn/T/hatch-bundle.pcBg9Q/astro/src/pages/tag/[slug].astro", void 0);
var $$file = "/private/var/folders/k3/_ljrcwl15lx5cd5ndyy5n6lh0000gn/T/hatch-bundle.pcBg9Q/astro/src/pages/tag/[slug].astro";
var $$url = "/tag/[slug]";
//#endregion
//#region \0virtual:astro:page:src/pages/tag/[slug]@_@astro
var page = () => _slug__exports;
//#endregion
export { page };

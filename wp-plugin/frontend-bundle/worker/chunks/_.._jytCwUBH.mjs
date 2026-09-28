globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, T as unescapeHTML, _ as addAttribute, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as $$PageLayout } from "./PageLayout_C72aM96T.mjs";
import { a as rewriteContentImages, n as getFeatures } from "./features_Ccz4SEbt.mjs";
import { a as getPageBySlug, r as getContentBySlug } from "./hatch_it4n8Llv.mjs";
import { t as $$HatchImage } from "./HatchImage_DRsoC0bt.mjs";
import { t as $$HatchForm } from "./HatchForm_D7MGHcMv.mjs";
//#region src/pages/[...slug].astro
var ____slug__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Component,
	file: () => $$file,
	url: () => $$url
});
createAstro("http://localhost:4321");
var $$Component = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Component;
	const { slug } = Astro.params;
	const slugStr = Array.isArray(slug) ? slug.join("/") : slug || "";
	if (!slugStr) return Astro.redirect("/");
	const [pageOrigin, features] = await Promise.all([getPageBySlug(slugStr), getFeatures()]);
	const page = pageOrigin ?? await (async () => {
		const cpt = await getContentBySlug(slugStr);
		if (!cpt) return null;
		let excerpt = (cpt.excerpt || "").trim();
		if (!excerpt && cpt.content) {
			excerpt = cpt.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 155);
			if (excerpt.length === 155) excerpt += "…";
		}
		return {
			title: cpt.title,
			content: cpt.content,
			excerpt,
			featuredImage: cpt.featured_media_url || null,
			featuredImageAlt: cpt.featured_media_alt || "",
			modifiedAt: cpt.modified,
			seo: cpt.seo
		};
	})();
	if (!page) {
		Astro.response.status = 404;
		return Astro.rewrite("/404");
	}
	const articleMaxWStyle = "max-width: var(--hatch-max-width, 1160px);";
	return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, {
		"title": page.title,
		"description": (page.seo?.description || page.excerpt || "").trim(),
		"ogImage": (() => {
			const img = (page.seo?.og_image || page.featuredImage || "").toString();
			return /^https?:\/\//i.test(img) ? img : void 0;
		})()
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<article class="mx-auto px-5 sm:px-8 pt-12 pb-16"${addAttribute(articleMaxWStyle, "style")}>${page.featuredImage && renderTemplate`<div class="aspect-[2/1] rounded-xl overflow-hidden mb-10 bg-hatch-bg-3">${renderComponent($$result, "HatchImage", $$HatchImage, {
		"features": features,
		"src": page.featuredImage,
		"alt": page.featuredImageAlt || "",
		"width": 1600,
		"height": 800,
		"loading": "eager",
		"class": "w-full h-full object-cover"
	})}</div>`}<header class="mb-10"><h1 class="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">${page.title}</h1>${page.modifiedAt && renderTemplate`<p class="mt-4 text-[13px] text-hatch-fg-subtle">Updated <time${addAttribute(page.modifiedAt, "datetime")}>${new Date(page.modifiedAt).toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric"
	})}</time></p>`}</header><div class="hatch-prose" style="max-width: 100%;">${unescapeHTML(rewriteContentImages(page.content, features))}</div></article>${renderComponent($$result, "HatchForm", $$HatchForm, {})}` })}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/[...slug].astro", void 0);
var $$file = "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/[...slug].astro";
var $$url = "/[...slug]";
//#endregion
//#region \0virtual:astro:page:src/pages/[...slug]@_@astro
var page = () => ____slug__exports;
//#endregion
export { page };

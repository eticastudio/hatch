globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as $$PageLayout } from "./PageLayout_C72aM96T.mjs";
import { n as getFeatures } from "./features_Ccz4SEbt.mjs";
import { l as getPostsByTagSlug } from "./hatch_it4n8Llv.mjs";
import { t as $$PostCard } from "./PostCard_BFV0Oqvs.mjs";
//#region src/pages/blog/tag/[slug].astro
var _slug__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Slug,
	file: () => $$file,
	url: () => $$url
});
createAstro("http://localhost:4321");
var $$Slug = createComponent(async ($$result, $$props, $$slots) => {
	const Astro2 = $$result.createAstro($$props, $$slots);
	Astro2.self = $$Slug;
	const { slug } = Astro2.params;
	if (!slug) return Astro2.redirect("/blog");
	const url = new URL(Astro2.request.url);
	const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
	const { posts, total, tag } = await getPostsByTagSlug(slug, {
		page,
		perPage: 12
	});
	if (!tag) {
		Astro2.response.status = 404;
		return Astro2.rewrite("/404");
	}
	const SITE = (await getFeatures()).site.url || "https://hatch-site.invalid";
	const hasMore = total > page * 12;
	return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, {
		"title": `#${tag.name} · Blog`,
		"description": tag.description || `Posts tagged ${tag.name}`,
		"canonical": `${SITE}/blog/tag/${slug}`
	}, { "default": ($$result2) => renderTemplate`${maybeRenderHead($$result2)}<main class="mx-auto px-5 sm:px-8 py-12 sm:py-16" style="max-width: var(--hatch-max-width, 1160px)"><nav class="text-[12.5px] text-hatch-fg-subtle mb-6 flex items-center gap-2 flex-wrap"><a href="/" class="hover:text-hatch-fg transition-colors">Home</a><span>/</span><a href="/blog" class="hover:text-hatch-fg transition-colors">Blog</a><span>/</span><span class="text-hatch-fg">Tag</span><span>/</span><span class="text-hatch-fg">#${tag.name}</span></nav><header class="mb-10 pb-8 border-b border-hatch-border"><p class="text-[11px] uppercase tracking-wider font-medium text-hatch-primary mb-3">Tag</p><h1 class="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">#${tag.name}</h1>${tag.description && renderTemplate`<p class="mt-3 text-[15px] text-hatch-fg-muted leading-relaxed max-w-2xl">${tag.description}</p>`}<p class="mt-3 text-[13px] text-hatch-fg-subtle">${total} ${total === 1 ? "post" : "posts"}</p></header>${posts.length === 0 ? renderTemplate`<p class="text-center text-hatch-fg-muted py-24">No posts with this tag yet.</p>` : renderTemplate`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-12">${posts.map((post) => renderTemplate`${renderComponent($$result2, "PostCard", $$PostCard, {
		"post": post,
		"headingLevel": 2
	})}`)}</div>`}${hasMore && renderTemplate`<div class="flex justify-center mt-14"><a${addAttribute(`/blog/tag/${slug}?page=${page + 1}`, "href")} class="px-6 py-2.5 rounded-md text-[13.5px] font-medium border border-hatch-border hover:border-hatch-fg hover:bg-hatch-bg-2 transition-colors">Load more →</a></div>`}</main>` })}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/blog/tag/[slug].astro", void 0);
var $$file = "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/blog/tag/[slug].astro";
var $$url = "/blog/tag/[slug]";
//#endregion
//#region \0virtual:astro:page:src/pages/blog/tag/[slug]@_@astro
var page = () => _slug__exports;
//#endregion
export { page };

globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as $$PageLayout } from "./PageLayout_C72aM96T.mjs";
import { n as getFeatures } from "./features_Ccz4SEbt.mjs";
import { c as getPosts } from "./hatch_it4n8Llv.mjs";
import { t as $$PostCard } from "./PostCard_BFV0Oqvs.mjs";
import { t as resolveAuthorBySlug } from "./posts_MbNriOdK.mjs";
//#region src/pages/blog/author/[slug].astro
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
	const author = await resolveAuthorBySlug(slug);
	if (!author) {
		Astro2.response.status = 404;
		return Astro2.rewrite("/404");
	}
	const { posts, total, hasMore } = await getPosts({
		page,
		perPage: 24,
		author: author.id
	});
	const SITE = (await getFeatures()).site.url || "https://hatch-site.invalid";
	return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, {
		"title": `${author.name} · Author`,
		"description": author.description || `Posts by ${author.name}`,
		"canonical": `${SITE}/blog/author/${author.slug}`
	}, { "default": ($$result2) => renderTemplate`${maybeRenderHead($$result2)}<main class="mx-auto px-5 sm:px-8 py-12 sm:py-16" style="max-width: var(--hatch-max-width, 1160px)"><nav class="text-[12.5px] text-hatch-fg-subtle mb-6 flex items-center gap-2 flex-wrap" aria-label="Breadcrumb"><a href="/" class="hover:text-hatch-fg transition-colors">Home</a><span>/</span><a href="/blog" class="hover:text-hatch-fg transition-colors">Blog</a><span>/</span><span class="text-hatch-fg">Author</span><span>/</span><span class="text-hatch-fg">${author.name}</span></nav><header class="mb-10 pb-8 border-b border-hatch-border flex flex-col sm:flex-row gap-5 items-start">${author.avatar && renderTemplate`<img${addAttribute(author.avatar, "src")}${addAttribute(`${author.name} avatar`, "alt")} width="80" height="80" class="rounded-full flex-shrink-0" loading="lazy" decoding="async">`}<div class="min-w-0"><p class="text-[11px] uppercase tracking-wider font-medium text-hatch-primary mb-2">Author</p><h1 class="text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.1] break-words">${author.name}</h1>${author.description && renderTemplate`<p class="mt-3 text-[15px] text-hatch-fg-muted leading-relaxed max-w-2xl">${author.description}</p>`}<p class="mt-3 text-[13px] text-hatch-fg-subtle">${total} ${total === 1 ? "post" : "posts"}</p></div></header>${posts.length === 0 ? renderTemplate`<div class="text-center py-24"><p class="text-hatch-fg-muted mb-4">No posts by this author yet.</p><a href="/blog" class="text-[14px] font-medium text-hatch-primary hover:underline">Back to blog</a></div>` : renderTemplate`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-12">${posts.map((post) => renderTemplate`${renderComponent($$result2, "PostCard", $$PostCard, {
		"post": post,
		"headingLevel": 2
	})}`)}</div>`}${hasMore && renderTemplate`<div class="flex justify-center mt-14"><a${addAttribute(`/blog/author/${author.slug}?page=${page + 1}`, "href")} class="px-6 py-2.5 rounded-md text-[13.5px] font-medium border border-hatch-border hover:border-hatch-fg hover:bg-hatch-bg-2 transition-colors">Load more</a></div>`}</main>` })}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/blog/author/[slug].astro", void 0);
var $$file = "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/blog/author/[slug].astro";
var $$url = "/blog/author/[slug]";
//#endregion
//#region \0virtual:astro:page:src/pages/blog/author/[slug]@_@astro
var page = () => _slug__exports;
//#endregion
export { page };

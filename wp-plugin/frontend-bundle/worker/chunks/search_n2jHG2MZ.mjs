globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as $$PageLayout } from "./PageLayout_C72aM96T.mjs";
import { n as getFeatures } from "./features_Ccz4SEbt.mjs";
import { p as searchPosts } from "./hatch_it4n8Llv.mjs";
import { t as $$PostCard } from "./PostCard_BFV0Oqvs.mjs";
//#region src/pages/search.astro
var search_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Search,
	file: () => $$file,
	url: () => $$url
});
createAstro("http://localhost:4321");
var $$Search = createComponent(async ($$result, $$props, $$slots) => {
	const Astro2 = $$result.createAstro($$props, $$slots);
	Astro2.self = $$Search;
	const url = new URL(Astro2.request.url);
	const query = (url.searchParams.get("q") ?? "").trim();
	const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
	const features = await getFeatures();
	const { posts, total, hasMore } = await searchPosts(query, {
		page,
		perPage: 12
	});
	const SITE = features.site.url || "https://hatch-site.invalid";
	return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, {
		"title": query ? `Search: ${query}` : "Search",
		"description": query ? `${total} results for "${query}"` : "Search the site.",
		"canonical": `${SITE}/search${query ? `?q=${encodeURIComponent(query)}` : ""}`
	}, { "default": ($$result2) => renderTemplate`${maybeRenderHead($$result2)}<main class="mx-auto px-5 sm:px-8 py-12 sm:py-16" style="max-width: var(--hatch-max-width, 1160px)"><header class="mb-10 sm:mb-12 pb-8 border-b border-hatch-border"><h1 class="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">Search</h1><form action="/search" method="get" class="mt-6 flex gap-2 max-w-2xl"><input type="search" name="q"${addAttribute(query, "value")} placeholder="Search posts…" aria-label="Search posts" autofocus class="flex-1 px-4 py-2.5 rounded-md border border-hatch-border bg-hatch-bg text-[14.5px] focus:border-hatch-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hatch-primary"><button type="submit" class="px-6 py-2.5 rounded-md bg-hatch-primary text-hatch-primary-fg text-[13.5px] font-medium hover:opacity-90 transition-opacity">Search</button></form>${query && renderTemplate`<p class="mt-4 text-[14px] text-hatch-fg-muted">${total} ${total === 1 ? "result" : "results"} for <strong class="text-hatch-fg font-medium">"${query}"</strong></p>`}</header>${!query ? renderTemplate`<p class="text-hatch-fg-muted py-12">Type a query above to search posts.</p>` : posts.length === 0 ? renderTemplate`<div class="py-16 text-center"><p class="text-hatch-fg-muted text-[15px]">No results for "${query}".</p><p class="mt-2 text-[13px] text-hatch-fg-subtle">Try different keywords or check the spelling.</p></div>` : renderTemplate`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-12">${posts.map((post) => renderTemplate`${renderComponent($$result2, "PostCard", $$PostCard, {
		"post": post,
		"headingLevel": 2
	})}`)}</div>`}${hasMore && renderTemplate`<div class="flex justify-center mt-14"><a${addAttribute(`/search?q=${encodeURIComponent(query)}&page=${page + 1}`, "href")} class="px-6 py-2.5 rounded-md text-[13.5px] font-medium border border-hatch-border hover:border-hatch-fg hover:bg-hatch-bg-2 transition-colors">Load more →</a></div>`}</main>` })}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/search.astro", void 0);
var $$file = "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/search.astro";
var $$url = "/search";
//#endregion
//#region \0virtual:astro:page:src/pages/search@_@astro
var page = () => search_exports;
//#endregion
export { page };

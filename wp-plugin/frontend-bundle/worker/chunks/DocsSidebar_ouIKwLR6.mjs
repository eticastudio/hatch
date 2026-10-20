globalThis.process ??= {};
globalThis.process.env ??= {};
import { D as createAstro, _ as addAttribute, a as Fragment, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { n as getCategories } from "./hatch_jYRAiH6x.mjs";
//#region src/components/DocsNavList.astro
createAstro("http://localhost:4321");
var $$DocsNavList = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$DocsNavList;
	const { categories, activeCategorySlug = null, label } = Astro.props;
	const rowBase = "flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors";
	const rowIdle = "text-hatch-fg-muted hover:text-hatch-fg hover:bg-hatch-bg-2";
	const rowActive = "bg-hatch-bg-3 text-hatch-fg font-medium";
	return renderTemplate`${maybeRenderHead($$result)}<nav${addAttribute(label, "aria-label")} class="flex flex-col gap-0.5"><a href="/blog"${addAttribute(!activeCategorySlug ? "page" : void 0, "aria-current")}${addAttribute([rowBase, !activeCategorySlug ? rowActive : rowIdle], "class:list")}><span>All posts</span></a>${categories.length > 0 && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<div class="text-[10px] font-semibold uppercase tracking-widest text-hatch-fg-subtle mt-5 mb-2 px-3">Categories</div>${categories.map((cat) => renderTemplate`<a${addAttribute(`/blog/category/${cat.slug}`, "href")}${addAttribute(activeCategorySlug === cat.slug ? "page" : void 0, "aria-current")}${addAttribute([rowBase, activeCategorySlug === cat.slug ? rowActive : rowIdle], "class:list")}><span class="truncate">${cat.name}</span><span class="text-[11px] text-hatch-fg-subtle tabular-nums shrink-0">${cat.count}</span></a>`)}` })}`}${categories.length === 0 && renderTemplate`<p class="text-[12px] text-hatch-fg-subtle px-3 py-2">No categories yet. Posts will be grouped here once you add categories in WordPress.</p>`}</nav>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.Htvtft/astro/src/components/DocsNavList.astro", void 0);
//#endregion
//#region src/components/DocsSidebar.astro
createAstro("http://localhost:4321");
var $$DocsSidebar = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$DocsSidebar;
	const { activeCategorySlug = null, showHeading = true } = Astro.props;
	const categories = (await getCategories().catch(() => []) || []).filter((c) => (c?.count ?? 0) > 0).sort((a, b) => (b?.count ?? 0) - (a?.count ?? 0));
	return renderTemplate`${maybeRenderHead($$result)}<aside class="hatch-docs-sidebar lg:sticky lg:top-14 lg:self-start min-w-0" data-astro-cid-frcal5vn><details class="hatch-docs-mobilenav lg:hidden" data-astro-cid-frcal5vn><summary data-astro-cid-frcal5vn><span data-astro-cid-frcal5vn>Browse topics</span><svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-frcal5vn><path d="M4 6l4 4 4-4" data-astro-cid-frcal5vn></path></svg></summary><div class="hatch-docs-mobilenav__panel" data-astro-cid-frcal5vn>${renderComponent($$result, "DocsNavList", $$DocsNavList, {
		"categories": categories,
		"activeCategorySlug": activeCategorySlug,
		"label": "Topics",
		"data-astro-cid-frcal5vn": true
	})}</div></details><div class="hatch-docs-rail hidden lg:block" data-astro-cid-frcal5vn>${showHeading && renderTemplate`<div class="text-[11px] font-semibold uppercase tracking-widest text-hatch-fg-subtle mb-3 px-2" data-astro-cid-frcal5vn>Browse</div>`}${renderComponent($$result, "DocsNavList", $$DocsNavList, {
		"categories": categories,
		"activeCategorySlug": activeCategorySlug,
		"label": "Topics",
		"data-astro-cid-frcal5vn": true
	})}</div></aside>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.Htvtft/astro/src/components/DocsSidebar.astro", void 0);
//#endregion
export { $$DocsSidebar as t };

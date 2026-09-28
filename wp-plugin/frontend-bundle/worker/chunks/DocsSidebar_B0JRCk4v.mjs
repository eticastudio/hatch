globalThis.process ??= {};
globalThis.process.env ??= {};
import { D as createAstro, _ as addAttribute, a as Fragment, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { n as getCategories } from "./hatch_it4n8Llv.mjs";
//#region src/components/DocsSidebar.astro
createAstro("http://localhost:4321");
var $$DocsSidebar = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$DocsSidebar;
	const { activeCategorySlug = null, showHeading = true } = Astro.props;
	const categories = (await getCategories().catch(() => []) || []).filter((c) => (c?.count ?? 0) > 0).sort((a, b) => (b?.count ?? 0) - (a?.count ?? 0));
	return renderTemplate`${maybeRenderHead($$result)}<aside class="hatch-docs-sidebar sticky top-14 self-start" style="max-height: calc(100vh - 56px); overflow-y: auto; padding: 24px 16px 24px 0;">${showHeading && renderTemplate`<div class="text-[11px] font-semibold uppercase tracking-widest text-hatch-fg-subtle mb-3 px-2">Browse</div>`}<nav aria-label="Topics" class="flex flex-col gap-0.5"><a href="/blog"${addAttribute(["flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors", !activeCategorySlug ? "bg-hatch-bg-3 text-hatch-fg font-medium" : "text-hatch-fg-muted hover:text-hatch-fg hover:bg-hatch-bg-2"], "class:list")}><span>All posts</span></a>${categories.length > 0 && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<div class="text-[10px] font-semibold uppercase tracking-widest text-hatch-fg-subtle mt-5 mb-2 px-3">Categories</div>${categories.map((cat) => renderTemplate`<a${addAttribute(`/blog/category/${cat.slug}`, "href")}${addAttribute(["flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors", activeCategorySlug === cat.slug ? "bg-hatch-bg-3 text-hatch-fg font-medium border-l-2 border-hatch-primary -ml-px pl-[10px]" : "text-hatch-fg-muted hover:text-hatch-fg hover:bg-hatch-bg-2"], "class:list")}><span class="truncate">${cat.name}</span><span class="text-[11px] text-hatch-fg-subtle tabular-nums shrink-0">${cat.count}</span></a>`)}` })}`}${categories.length === 0 && renderTemplate`<p class="text-[12px] text-hatch-fg-subtle px-3 py-2">No categories yet. Publish posts in categories on WordPress to populate this nav.</p>`}</nav></aside>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/components/DocsSidebar.astro", void 0);
//#endregion
export { $$DocsSidebar as t };

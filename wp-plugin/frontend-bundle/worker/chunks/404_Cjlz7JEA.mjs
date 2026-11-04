globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, a as Fragment, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as $$PageLayout } from "./PageLayout_CYhINrkI.mjs";
import { n as getFeatures } from "./features_CDtcubJM.mjs";
import { c as getPosts } from "./hatch__EBFJSVv.mjs";
import { t as themeKey } from "./theme-dispatch_Bj-ZHGQx.mjs";
//#region src/pages/404.astro
var _404_exports = /* @__PURE__ */ __exportAll({
	default: () => $$404,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://hatch-site.invalid");
var $$404 = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$404;
	const features = await getFeatures();
	const showSearch = (features.design?.templates?.not_found_search ?? "true") !== "false";
	const { posts: recent } = await getPosts({
		page: 1,
		perPage: 4
	});
	const tk = themeKey(features);
	Astro.response.status = 404;
	Astro.response.statusText = "Not Found";
	return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, {
		"title": "Page not found",
		"description": "The page you were looking for doesn't exist.",
		"cacheTtl": 0
	}, { "default": ($$result) => renderTemplate`${tk === "tech" && renderTemplate`${maybeRenderHead($$result)}<main class="mx-auto px-5 sm:px-8 py-20 sm:py-28" style="max-width: var(--hatch-max-width, 1160px); font-family: var(--hatch-font-mono, ui-monospace, monospace);"><h1 class="sr-only">404 — Page not found</h1><pre class="text-[12.5px] leading-relaxed text-hatch-fg-muted bg-hatch-bg-2 p-6 rounded-md border border-hatch-border max-w-2xl overflow-x-auto" style="color: var(--hatch-primary);">${`$ curl ${Astro.url.pathname}
HTTP/1.1 404 Not Found
content-type: text/html

ERR_ROUTE_NOT_FOUND: The path you requested has no handler.`}</pre><p class="mt-6 text-[13px] text-hatch-fg-muted">Try one of these instead:</p><div class="mt-3 flex flex-wrap gap-2" style="font-family: var(--hatch-font-mono, ui-monospace, monospace);"><a href="/" class="px-3 py-1.5 rounded-md border border-hatch-border text-[12.5px] hover:border-hatch-primary text-hatch-fg-muted hover:text-hatch-primary-text transition-colors">cd /</a><a href="/blog" class="px-3 py-1.5 rounded-md border border-hatch-border text-[12.5px] hover:border-hatch-primary text-hatch-fg-muted hover:text-hatch-primary-text transition-colors">ls /blog</a></div>${showSearch && renderTemplate`<form action="/search" method="get" class="mt-6 flex gap-2 max-w-md" style="font-family: var(--hatch-font-mono, ui-monospace, monospace);"><input type="search" name="q" placeholder="grep '...' /blog/*" required class="flex-1 px-3 py-2 rounded-md border border-hatch-border bg-hatch-bg-2 text-[13px] focus:border-hatch-primary outline-none"><button type="submit" class="px-4 py-2 rounded-md text-[12.5px] font-medium" style="background: var(--hatch-primary); color: var(--hatch-primary-fg, white);">grep</button></form>`}</main>`}${tk === "docs" && renderTemplate`<main class="mx-auto px-5 sm:px-8 py-16 sm:py-20" style="max-width: var(--hatch-max-width, 1160px);"><p class="text-[11px] uppercase tracking-widest font-semibold mb-3" style="color: var(--hatch-primary);">404 · No matching doc</p><h1 class="text-3xl sm:text-4xl font-semibold tracking-tight leading-[1.15]" style="font-family: var(--hatch-font-heading);">We couldn't find that doc.</h1><p class="mt-3 text-[14.5px] text-hatch-fg-muted max-w-2xl">It may have been moved, renamed, or never existed. Search the docs below — most lost links land on a result that matches the page title.</p>${showSearch && renderTemplate`<form action="/search" method="get" class="mt-6 flex gap-2 max-w-xl"><input type="search" name="q" placeholder="Search docs…" required class="flex-1 px-4 py-2.5 rounded-md border border-hatch-border bg-hatch-bg text-[14px] focus:border-hatch-primary focus:ring-2 outline-none" style="--tw-ring-color: color-mix(in srgb, var(--hatch-primary) 25%, transparent);"><button type="submit" class="px-5 py-2.5 rounded-md text-[13.5px] font-medium" style="background: var(--hatch-primary); color: var(--hatch-primary-fg, white);">Search</button></form>`}${recent.length > 0 && renderTemplate`<section class="mt-12 pt-8 border-t border-hatch-border"><h2 class="text-[13px] font-semibold uppercase tracking-wider text-hatch-fg-subtle mb-4">Recently published</h2><ul class="flex flex-col">${recent.map((p) => renderTemplate`<li><a${addAttribute(`/blog/${p.slug}`, "href")} class="flex items-center justify-between gap-3 py-2.5 border-b border-hatch-border last:border-0 group"><span class="text-[14px] text-hatch-fg group-hover:text-hatch-primary-text transition-colors">${p.title}</span><span class="text-[12px] text-hatch-fg-subtle shrink-0">${new Date(p.publishedAt).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric"
	})}</span></a></li>`)}</ul></section>`}</main>`}${tk === "blog" && renderTemplate`<main class="mx-auto px-5 sm:px-8 py-20 sm:py-28" style="max-width: var(--hatch-max-width, 1160px)"><p class="text-[12px] uppercase tracking-wider font-medium text-hatch-fg-subtle mb-3">Error 404</p><h1 class="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]" style="font-family: var(--hatch-font-heading);">This page doesn't exist.</h1><p class="mt-4 text-[15px] text-hatch-fg-muted leading-relaxed max-w-xl">The URL you tried may have moved, been deleted, or never existed in the first place.</p>${showSearch && renderTemplate`<form action="/search" method="get" class="mt-8 flex gap-2 max-w-md"><input type="search" name="q" placeholder="Search the site…" required class="flex-1 px-4 py-2.5 rounded-md border border-hatch-border bg-hatch-bg text-[14px] focus:border-hatch-primary focus:ring-2 outline-none" style="--tw-ring-color: color-mix(in srgb, var(--hatch-primary) 25%, transparent);"><button type="submit" class="px-5 py-2.5 rounded-md text-[13.5px] font-medium" style="background: var(--hatch-primary); color: var(--hatch-primary-fg, white);">Search</button></form>`}<div class="mt-10 flex flex-wrap gap-3"><a href="/" class="px-4 py-2 rounded-md border border-hatch-border text-[13.5px] hover:border-hatch-fg transition-colors">← Home</a><a href="/blog" class="px-4 py-2 rounded-md border border-hatch-border text-[13.5px] hover:border-hatch-fg transition-colors">All posts</a></div>${recent.length > 0 && renderTemplate`<section class="mt-20 pt-10 border-t border-hatch-border"><h2 class="text-lg font-semibold tracking-tight mb-6">Recent posts</h2><ul class="flex flex-col gap-3">${recent.map((p) => renderTemplate`<li><a${addAttribute(`/blog/${p.slug}`, "href")} class="block py-2 group"><h3 class="text-[15px] font-medium leading-snug group-hover:text-hatch-primary-text transition-colors line-clamp-1">${p.title}</h3><p class="mt-1 text-[12.5px] text-hatch-fg-subtle">${new Date(p.publishedAt).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric"
	})}${p.category && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate` · ${p.category}` })}`}</p></a></li>`)}</ul></section>`}</main>`}` })}`;
}, "/private/var/folders/k3/_ljrcwl15lx5cd5ndyy5n6lh0000gn/T/hatch-bundle.Jucsvy/astro/src/pages/404.astro", void 0);
var $$file = "/private/var/folders/k3/_ljrcwl15lx5cd5ndyy5n6lh0000gn/T/hatch-bundle.Jucsvy/astro/src/pages/404.astro";
var $$url = "/404";
//#endregion
//#region \0virtual:astro:page:src/pages/404@_@astro
var page = () => _404_exports;
//#endregion
export { page };

globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as $$PageLayout } from "./PageLayout_C72aM96T.mjs";
import { n as getFeatures } from "./features_Ccz4SEbt.mjs";
import { c as getPosts } from "./hatch_it4n8Llv.mjs";
import { t as $$PostCard } from "./PostCard_BFV0Oqvs.mjs";
//#region src/pages/index.astro
var pages_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => ""
});
var $$Index = createComponent(async ($$result, $$props, $$slots) => {
	const features = await getFeatures();
	const { posts } = await getPosts({
		page: 1,
		perPage: 3,
		category: null
	});
	const SITE = features.site.url || "https://hatch-site.invalid";
	const siteName = features.site.name || "Hatch";
	const tagline = features.site.description || "Headless WordPress, powered by Hatch.";
	return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, {
		"title": siteName,
		"description": tagline,
		"canonical": SITE
	}, { "default": ($$result2) => renderTemplate`${maybeRenderHead($$result2)}<main class="mx-auto px-5 sm:px-8 py-16 sm:py-24" style="max-width: var(--hatch-max-width, 1160px)"><section class="mb-16 sm:mb-24 pb-12 border-b border-hatch-border"><h1 class="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">${siteName}</h1><p class="mt-4 text-lg sm:text-xl text-hatch-fg-muted max-w-2xl">${tagline}</p><div class="mt-8"><a href="/blog" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-[14px] font-medium bg-hatch-fg text-hatch-bg hover:opacity-90 transition-opacity">Read the blog<span aria-hidden="true">→</span></a></div></section>${posts.length > 0 && renderTemplate`<section><header class="mb-8 flex items-baseline justify-between"><h2 class="text-2xl sm:text-3xl font-semibold tracking-tight">Latest posts</h2><a href="/blog" class="text-[14px] text-hatch-fg-muted hover:text-hatch-fg transition-colors">See all →</a></header><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-12">${posts.map((post) => renderTemplate`${renderComponent($$result2, "PostCard", $$PostCard, { "post": post })}`)}</div></section>`}${posts.length === 0 && renderTemplate`<p class="text-center text-hatch-fg-muted py-16">No posts published yet.</p>`}</main>` })}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/index.astro", void 0);
var $$file = "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/index.astro";
//#endregion
//#region \0virtual:astro:page:src/pages/index@_@astro
var page = () => pages_exports;
//#endregion
export { page };

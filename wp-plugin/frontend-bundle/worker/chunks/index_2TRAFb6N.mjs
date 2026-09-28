globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, a as Fragment, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as $$PageLayout } from "./PageLayout_C72aM96T.mjs";
import { n as getFeatures, r as hasFeature } from "./features_Ccz4SEbt.mjs";
import { c as getPosts, n as getCategories } from "./hatch_it4n8Llv.mjs";
import { t as $$HatchForm } from "./HatchForm_D7MGHcMv.mjs";
import { t as $$PostCard } from "./PostCard_BFV0Oqvs.mjs";
import { t as $$DocsSidebar } from "./DocsSidebar_B0JRCk4v.mjs";
//#region src/pages/blog/index.astro
var blog_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => $$url
});
createAstro("http://localhost:4321");
var $$Index = createComponent(async ($$result, $$props, $$slots) => {
	const Astro2 = $$result.createAstro($$props, $$slots);
	Astro2.self = $$Index;
	const url = new URL(Astro2.request.url);
	const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
	const categorySlug = url.searchParams.get("category");
	const features = await getFeatures();
	const showCategoryTabs = hasFeature(features, "category_tabs");
	const tmpl = features.design?.templates;
	const blogIdx = features.aesthetic.blog_index;
	const aGrid = String(blogIdx.archive_grid || tmpl?.archive_grid || "3");
	const archiveGridClass = aGrid === "1" ? "grid-cols-1" : aGrid === "2" ? "grid-cols-1 md:grid-cols-2" : aGrid === "4" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
	const showExcerpt = tmpl?.archive_excerpt !== "false";
	const showHero = blogIdx.show_hero;
	const showTopics = blogIdx.show_topics;
	const paginationStyle = blogIdx.pagination_style;
	const categories = await getCategories();
	const activeCategory = categorySlug ? categories.find((c) => c.slug === categorySlug) ?? null : null;
	const { posts, total, hasMore } = await getPosts({
		page,
		perPage: 12,
		category: activeCategory?.id ?? null
	});
	const SITE = features.site.url || "https://hatch-site.invalid";
	return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, {
		"title": activeCategory ? `${activeCategory.name} · Blog` : "Blog",
		"description": activeCategory ? `Posts in ${activeCategory.name}` : features.site.description || "Latest posts and updates.",
		"canonical": `${SITE}/blog${activeCategory ? `?category=${activeCategory.slug}` : ""}`
	}, { "default": ($$result2) => renderTemplate`${maybeRenderHead($$result2)}<main${addAttribute(`mx-auto px-5 sm:px-8 py-12 sm:py-16 ${features.theme === "docs" ? "grid gap-x-10 gap-y-8 lg:grid-cols-[220px_1fr]" : ""}`, "class")} style="max-width: var(--hatch-max-width, 1160px)">${features.theme === "docs" && renderTemplate`${renderComponent($$result2, "DocsSidebar", $$DocsSidebar, { "activeCategorySlug": activeCategory?.slug || null })}`}<div><header class="mb-10 sm:mb-12 pb-8 border-b border-hatch-border"><h1 class="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">${activeCategory ? activeCategory.name : "Blog"}</h1><p class="mt-3 text-[14px] text-hatch-fg-muted">${total} ${total === 1 ? "post" : "posts"}${activeCategory && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": ($$result3) => renderTemplate` in <strong class="text-hatch-fg font-medium">${activeCategory.name}</strong>` })}`}</p></header>${showCategoryTabs && showTopics && categories.length > 0 && renderTemplate`<nav class="mb-10 flex gap-2 overflow-x-auto pb-2 -mx-1" aria-label="Categories"><a href="/blog"${addAttribute(["px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors border", !activeCategory ? "bg-hatch-fg text-hatch-bg border-hatch-fg" : "border-hatch-border text-hatch-fg-muted hover:border-hatch-fg hover:text-hatch-fg"], "class:list")}>All</a>${categories.map((cat) => renderTemplate`<a${addAttribute(`/blog/category/${cat.slug}`, "href")}${addAttribute(["px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap inline-flex items-center gap-2 transition-colors border", activeCategory?.id === cat.id ? "bg-hatch-fg text-hatch-bg border-hatch-fg" : "border-hatch-border text-hatch-fg-muted hover:border-hatch-fg hover:text-hatch-fg"], "class:list")}><span>${cat.name}</span><span${addAttribute(["text-[11px]", activeCategory?.id === cat.id ? "opacity-70" : "text-hatch-fg-subtle"], "class:list")}>${cat.count}</span></a>`)}</nav>`}${posts.length === 0 ? renderTemplate`<p class="text-center text-hatch-fg-muted py-24">No posts yet.</p>` : renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": ($$result3) => renderTemplate`${showHero && page === 1 && !activeCategory && posts[0] && renderTemplate`<div class="mb-12">${renderComponent($$result3, "PostCard", $$PostCard, {
		"post": posts[0],
		"variant": "feature"
	})}</div>`}<div${addAttribute(`grid ${archiveGridClass} gap-x-7 gap-y-12`, "class")}>${(showHero && page === 1 && !activeCategory ? posts.slice(1) : posts).map((post) => renderTemplate`${renderComponent($$result3, "PostCard", $$PostCard, {
		"post": post,
		"showExcerpt": showExcerpt,
		"headingLevel": 2
	})}`)}</div>` })}`}${hasMore && paginationStyle !== "infinite" && renderTemplate`<div class="flex justify-center mt-14">${paginationStyle === "numbered" ? renderTemplate`<nav class="flex flex-wrap justify-center gap-2 max-w-full px-2" aria-label="Pagination">${Array.from({ length: Math.max(1, Math.ceil(total / 12)) }, (_, i) => i + 1).map((n) => renderTemplate`<a${addAttribute(`/blog?page=${n}${activeCategory ? `&category=${activeCategory.slug}` : ""}`, "href")}${addAttribute(["px-3.5 py-1.5 rounded-md text-[14px] font-medium border transition-colors", n === page ? "bg-hatch-fg text-hatch-bg border-hatch-fg" : "border-hatch-border text-hatch-fg-muted hover:border-hatch-fg hover:text-hatch-fg"], "class:list")}>${n}</a>`)}</nav>` : renderTemplate`<a${addAttribute(`/blog?page=${page + 1}${activeCategory ? `&category=${activeCategory.slug}` : ""}`, "href")} class="px-6 py-2.5 rounded-md text-[14px] font-medium border border-hatch-border hover:border-hatch-fg hover:bg-hatch-bg-2 transition-colors">Load more →</a>`}</div>`}${hasMore && paginationStyle === "infinite" && renderTemplate`<div id="hatch-infinite-sentinel"${addAttribute(`/blog?page=${page + 1}${activeCategory ? `&category=${activeCategory.slug}` : ""}`, "data-next")} class="h-12"></div>`}${paginationStyle === "infinite" && renderTemplate`<script>
        (function () {
          var sentinel = document.getElementById('hatch-infinite-sentinel');
          if (!sentinel || !('IntersectionObserver' in window)) return;
          var loading = false;
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting && !loading) {
                loading = true;
                location.href = sentinel.dataset.next;
              }
            });
          }, { rootMargin: '600px 0px' });
          io.observe(sentinel);
        })();
      <\/script>`}${hasFeature(features, "forms") && features.integrations?.forms?.default_form_id ? renderTemplate`<section class="hatch-newsletter"><h2 class="hatch-newsletter__title">Get new posts in your inbox</h2><p class="hatch-newsletter__desc">Occasional, never spammy. Unsubscribe with one click.</p><div class="hatch-form-mount"${addAttribute(features.integrations.forms.detected?.slug === "wpforms" ? "wpforms" : features.integrations.forms.detected?.slug === "gravity_forms" ? "gravity" : features.integrations.forms.detected?.slug === "cf7" ? "cf7" : "fluent", "data-hatch-form-provider")}${addAttribute(features.integrations.forms.default_form_id, "data-hatch-form-id")}></div>${renderComponent($$result2, "HatchForm", $$HatchForm, {})}</section>` : null}</div></main>` })}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/blog/index.astro", void 0);
var $$file = "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/blog/index.astro";
var $$url = "/blog";
//#endregion
//#region \0virtual:astro:page:src/pages/blog/index@_@astro
var page = () => blog_exports;
//#endregion
export { page };

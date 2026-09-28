globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as $$PageLayout } from "./PageLayout_C72aM96T.mjs";
import "./server_BKSwzYCg.mjs";
//#region src/pages/shop.astro
var shop_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Shop,
	file: () => $$file,
	url: () => $$url
});
createAstro("http://localhost:4321");
var $$Shop = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Shop;
	const base = "https://hatch-wp-api.invalid/wp-json/wp/v2".replace(/\/wp-json(\/.*)?$/, "").replace(/\/$/, "");
	const catFilter = (new URL(Astro.request.url).searchParams.get("cat") || "").trim();
	let products = [];
	let categories = [];
	let fetchErr = "";
	try {
		const [pRes, cRes] = await Promise.all([fetch(`${base}/wp-json/hatch/v1/store/products?per_page=48`, { headers: { Accept: "application/json" } }), fetch(`${base}/wp-json/hatch/v1/store/categories`, { headers: { Accept: "application/json" } })]);
		if (pRes.ok) products = (await pRes.json()).products || [];
		if (cRes.ok) {
			const data = await cRes.json();
			categories = Array.isArray(data) ? data : data.categories || [];
		}
	} catch (e) {
		fetchErr = e instanceof Error ? e.message : String(e);
	}
	if (catFilter) products = products.filter((p) => (p.categories || []).some((c) => c.slug === catFilter));
	const symbol = products[0]?.currency || "";
	return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, {
		"title": "Shop",
		"description": "All products, edge-delivered."
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="hatch-shop"><header class="hatch-shop__header"><h1>Shop</h1><p class="hatch-shop__count">${products.length} ${products.length === 1 ? "product" : "products"}</p></header>${categories.length > 0 && renderTemplate`<nav class="hatch-shop__filters" aria-label="Categories"><a href="/shop"${addAttribute(["hatch-shop__chip", !catFilter && "is-active"], "class:list")}>All</a>${categories.map((c) => renderTemplate`<a${addAttribute(`/shop?cat=${c.slug}`, "href")}${addAttribute(["hatch-shop__chip", catFilter === c.slug && "is-active"], "class:list")}>${c.name}</a>`)}</nav>`}${fetchErr && renderTemplate`<div class="hatch-shop__error" role="alert">Could not load products: ${fetchErr}</div>`}${!fetchErr && products.length === 0 && renderTemplate`<div class="hatch-shop__empty"><p>No products yet. Add one in WordPress under <code>Products → Add New</code>.</p></div>`}${products.length > 0 && renderTemplate`<ul class="hatch-product-grid" role="list">${products.filter((p) => typeof p.slug === "string" && p.slug.length > 0).map((p) => renderTemplate`<li class="hatch-product-card"><a${addAttribute(`/product/${encodeURIComponent(p.slug)}`, "href")} class="hatch-product-card__link" data-hatch-product-link>${p.image ? renderTemplate`<img${addAttribute(p.image, "src")}${addAttribute(p.name, "alt")} loading="lazy" width="480" height="360">` : renderTemplate`<div class="hatch-product-card__placeholder" aria-hidden="true"></div>`}<div class="hatch-product-card__body"><h2 class="hatch-product-card__title">${p.name}</h2><p class="hatch-product-card__price">${p.on_sale && p.regular_price && renderTemplate`<span class="hatch-product-card__was">${symbol}${p.regular_price}</span>`}<span class="hatch-product-card__now">${symbol}${p.price}</span></p>${!p.in_stock && renderTemplate`<p class="hatch-product-card__oos">Out of stock</p>`}</div></a></li>`)}</ul>`}</div>` })}`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/shop.astro", void 0);
var $$file = "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/shop.astro";
var $$url = "/shop";
//#endregion
//#region \0virtual:astro:page:src/pages/shop@_@astro
var page = () => shop_exports;
//#endregion
export { page };

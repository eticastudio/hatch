globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, T as unescapeHTML, _ as addAttribute, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as $$PageLayout } from "./PageLayout_C72aM96T.mjs";
import "./server_BKSwzYCg.mjs";
//#region src/pages/product/[slug].astro
var _slug__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Slug,
	file: () => $$file,
	url: () => $$url
});
createAstro("http://localhost:4321");
var $$Slug = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Slug;
	const { slug } = Astro.params;
	if (!slug) return Astro.redirect("/");
	const base = "https://hatch-wp-api.invalid/wp-json/wp/v2".replace(/\/wp-json(\/.*)?$/, "").replace(/\/$/, "");
	const storeApiPrefix = "/api/wc-store";
	if (!base) {
		Astro.response.status = 500;
		return new Response("WP_API_URL not configured", { status: 500 });
	}
	let product = null;
	let fetchErr = null;
	try {
		const listUrl = `${base}/wp-json/hatch/v1/store/products?per_page=100`;
		const res = await fetch(listUrl, { headers: { Accept: "application/json" } });
		if (res.ok) product = ((await res.json()).products || []).find((p) => p.slug === slug) || null;
		else fetchErr = `HTTP ${res.status}`;
	} catch (err) {
		fetchErr = err.message;
	}
	if (!product) Astro.response.status = 404;
	const currencySymbol = product?.currency === "USD" ? "$" : product?.currency || "";
	const priceDisplay = product ? `${currencySymbol}${product.price || product.regular_price || "0"}` : "";
	const addToCartHref = product ? `${base}/?add-to-cart=${product.id}` : "#";
	const checkoutHref = `${base}/checkout/`;
	return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, {
		"title": product ? product.name : "Product not found",
		"description": product?.short || ""
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="mx-auto max-w-4xl px-6 py-16">${!product && renderTemplate`<div class="rounded-lg border border-hatch-border bg-hatch-surface p-8 text-center"><h1 class="text-2xl font-semibold text-hatch-fg mb-2">Product not found</h1><p class="text-sm text-hatch-muted">${fetchErr ? `Couldn't reach the WooCommerce bridge (${fetchErr}).` : `No published product matches "${slug}".`}</p><a href="/" class="mt-4 inline-block text-hatch-primary underline">Return home</a></div>`}${product && renderTemplate`<article class="grid grid-cols-1 gap-10 md:grid-cols-2"><div class="rounded-lg overflow-hidden bg-hatch-surface border border-hatch-border">${product.image ? renderTemplate`<img${addAttribute(product.image, "src")}${addAttribute(product.name, "alt")} width="600" height="600" class="w-full h-auto object-cover" loading="eager">` : renderTemplate`<div class="aspect-square flex items-center justify-center text-hatch-muted text-sm">No product image</div>`}</div><div class="flex flex-col gap-4">${product.categories && product.categories.length > 0 && renderTemplate`<div class="text-xs uppercase tracking-wider text-hatch-muted">${product.categories.map((c) => c.name).join(" · ")}</div>`}<h1 class="text-3xl md:text-4xl font-bold text-hatch-fg leading-tight">${product.name}</h1><div class="flex items-baseline gap-3"><div class="text-2xl font-semibold text-hatch-fg">${priceDisplay}</div>${product.on_sale && product.regular_price && product.regular_price !== product.price && renderTemplate`<div class="text-lg text-hatch-muted line-through">${currencySymbol}${product.regular_price}</div>`}</div><div class="text-sm text-hatch-muted">${product.in_stock ? "✓ In stock" : "✗ Out of stock"}</div>${product.short && renderTemplate`<div class="prose prose-sm text-hatch-fg">${unescapeHTML(product.short)}</div>`}<form method="get"${addAttribute(addToCartHref, "action")} class="mt-2 flex flex-wrap gap-3" data-hatch-atc-form${addAttribute(String(product.id), "data-hatch-product-id")}${addAttribute(storeApiPrefix, "data-hatch-store-prefix")}><button type="submit"${addAttribute(!product.in_stock, "disabled")} data-hatch-atc-btn class="hatch-atc rounded-md bg-hatch-primary px-6 py-3 text-hatch-primary-fg font-medium hover:bg-hatch-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition">Add to cart</button><a${addAttribute(checkoutHref, "href")} class="rounded-md border border-hatch-border px-6 py-3 text-hatch-fg font-medium hover:bg-hatch-surface transition">Checkout on WordPress ↗</a><span data-hatch-atc-status class="w-full text-sm text-hatch-muted" aria-live="polite"></span></form><details class="mt-6 text-xs text-hatch-muted"><summary class="cursor-pointer font-medium">Bridge details</summary><div class="mt-2 space-y-1 font-mono"><div>Product ID: ${product.id}</div><div>Slug: ${product.slug}</div><div>Source: <code>/wp-json/hatch/v1/store/products</code></div><div>Cart POST: <code>/wp-json/wc/store/v1/cart</code></div><div>Checkout: <code>${base}/checkout/</code></div></div></details></div></article>`}</main>` })}<script>
  /* Async Add-to-Cart against Woo Store API.
     Flow:
       1. GET  <wp_base>/wp-json/wc/store/v1/cart   → capture \`Nonce\` response header
       2. POST <wp_base>/wp-json/wc/store/v1/cart/add-item with { id, quantity }
          and the Nonce header. Cookies (credentials:include) carry the session.
     On success we update any [data-hatch-cart-count] badges in the header and
     print a small confirmation next to the button. On any network / API error
     we let the classic <form action="?add-to-cart=ID"> submit as a fallback,
     so users on locked-down browsers still reach the WP cart.
   */
  (function () {
    const form = document.querySelector('[data-hatch-atc-form]');
    if (!form) return;
    const btn = form.querySelector('[data-hatch-atc-btn]');
    const status = form.querySelector('[data-hatch-atc-status]');
    const id = parseInt(form.getAttribute('data-hatch-product-id') || '0', 10);
    const prefix = (form.getAttribute('data-hatch-store-prefix') || '/api/wc-store').replace(/\\/$/, '');
    if (!id) return;

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (btn) { btn.setAttribute('disabled', 'disabled'); btn.textContent = 'Adding…'; }
      try {
        const cartRes = await fetch(prefix + '/cart', {
          method: 'GET',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        const nonce = cartRes.headers.get('Nonce') || cartRes.headers.get('nonce') || '';
        const addRes = await fetch(prefix + '/cart/add-item', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(nonce ? { Nonce: nonce } : {}),
          },
          body: JSON.stringify({ id: id, quantity: 1 }),
        });
        if (!addRes.ok) throw new Error('add-item HTTP ' + addRes.status);
        const cart = await addRes.json().catch(() => null);
        const count = cart && Array.isArray(cart.items)
          ? cart.items.reduce((n, it) => n + (parseInt(it.quantity, 10) || 0), 0)
          : null;
        if (count !== null) {
          document.querySelectorAll('[data-hatch-cart-count]').forEach((el) => {
            el.textContent = String(count);
          });
        }
        if (status) status.textContent = 'Added to cart.';
        if (btn) { btn.textContent = 'Added ✓'; btn.removeAttribute('disabled'); }
      } catch (err) {
        if (status) status.textContent = 'Redirecting to WordPress cart…';
        // Fallback: navigate to the classic ?add-to-cart=ID URL so the user
        // still completes the purchase even if the Store API is blocked.
        window.location.href = form.getAttribute('action') || '/';
      }
    });
  })();
<\/script>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/product/[slug].astro", void 0);
var $$file = "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/product/[slug].astro";
var $$url = "/product/[slug]";
//#endregion
//#region \0virtual:astro:page:src/pages/product/[slug]@_@astro
var page = () => _slug__exports;
//#endregion
export { page };

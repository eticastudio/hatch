globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, a as Fragment, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as $$PageLayout } from "./PageLayout_C72aM96T.mjs";
import "./server_BKSwzYCg.mjs";
//#region src/pages/cart.astro
var cart_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Cart,
	file: () => $$file,
	url: () => $$url
});
createAstro("http://localhost:4321");
var $$Cart = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Cart;
	const base = "https://hatch-wp-api.invalid/wp-json/wp/v2".replace(/\/wp-json(\/.*)?$/, "").replace(/\/$/, "");
	let cart = null;
	let fetchErr = "";
	try {
		const res = await fetch(`${base}/wp-json/wc/store/v1/cart`, { headers: {
			Accept: "application/json",
			Cookie: Astro.request.headers.get("cookie") || ""
		} });
		if (res.ok) cart = await res.json();
		else fetchErr = `Cart endpoint returned ${res.status}`;
	} catch (e) {
		fetchErr = e instanceof Error ? e.message : String(e);
	}
	const money = (minor, symbol, decimals) => {
		const n = parseInt(minor || "0", 10);
		if (!Number.isFinite(n)) return `${symbol}0`;
		return `${symbol}${(n / Math.pow(10, decimals || 0)).toFixed(decimals || 0)}`;
	};
	const items = cart?.items || [];
	const total = cart ? money(cart.totals.total_price, cart.totals.currency_symbol, cart.totals.currency_minor_unit) : "";
	const checkoutUrl = "/checkout";
	return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, {
		"title": "Cart",
		"description": "Your cart"
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="hatch-cart"><header class="hatch-cart__header"><h1>Cart</h1>${items.length > 0 && renderTemplate`<p class="hatch-cart__count">${items.length} ${items.length === 1 ? "item" : "items"}</p>`}</header>${fetchErr && renderTemplate`<div class="hatch-cart__error" role="alert">Could not load cart: ${fetchErr}</div>`}${!fetchErr && items.length === 0 && renderTemplate`<div class="hatch-cart__empty"><p>Your cart is empty.</p><a href="/shop" class="hatch-btn hatch-btn--primary">Browse the shop</a></div>`}${items.length > 0 && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<ul class="hatch-cart__lines" role="list">${items.map((it) => renderTemplate`<li class="hatch-cart-line"><a${addAttribute(`/product/${it.permalink.split("/product/").pop()?.replace(/\/$/, "") || ""}`, "href")} class="hatch-cart-line__thumb">${it.images?.[0]?.src ? renderTemplate`<img${addAttribute(it.images[0].src, "src")}${addAttribute(it.images[0].alt || it.name, "alt")} width="96" height="96" loading="lazy">` : renderTemplate`<div class="hatch-cart-line__placeholder" aria-hidden="true"></div>`}</a><div class="hatch-cart-line__meta"><h2 class="hatch-cart-line__title">${it.name}</h2><p class="hatch-cart-line__unit">${money(it.prices.price, it.prices.currency_symbol, it.prices.currency_minor_unit)} each</p></div><div class="hatch-cart-line__qty"><label><span class="hatch-visually-hidden">Quantity for ${it.name}</span><input type="number" min="0"${addAttribute(it.quantity, "value")} data-hatch-cart-qty${addAttribute(it.key, "data-hatch-cart-key")} class="hatch-cart-line__qty-input"></label></div><div class="hatch-cart-line__total">${money(it.totals.line_total, it.totals.currency_symbol, it.totals.currency_minor_unit)}</div><button type="button" class="hatch-cart-line__remove" data-hatch-cart-remove${addAttribute(it.key, "data-hatch-cart-key")}${addAttribute(`Remove ${it.name} from cart`, "aria-label")}>Remove</button></li>`)}</ul><footer class="hatch-cart__footer"><div class="hatch-cart__total"><span>Total</span><strong>${total}</strong></div><a${addAttribute(checkoutUrl, "href")} class="hatch-btn hatch-btn--primary hatch-cart__checkout">Checkout</a></footer>` })}`}</div>` })}<script>
  /* Quantity update: debounced POST via the same-origin Astro proxy
     (/api/wc-store/cart/update-item). The browser cannot hit /wp-json on
     the Astro origin (it 404s), so all Store API traffic goes through
     src/pages/api/wc-store/[...path].ts which forwards Nonce, Cart-Token,
     and Set-Cookie between the browser and WordPress. On success we reload
     so line totals + grand total re-render from a fresh SSR fetch. */
  (function () {
    const inputs = document.querySelectorAll('[data-hatch-cart-qty]');
    const removes = document.querySelectorAll('[data-hatch-cart-remove]');
    if (!inputs.length && !removes.length) return;
    const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
    async function getNonce() {
      const r = await fetch('/api/wc-store/cart', {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      return r.headers.get('Nonce') || r.headers.get('nonce') || '';
    }
    async function remove(key) {
      const nonce = await getNonce();
      const res = await fetch('/api/wc-store/cart/remove-item', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(nonce ? { Nonce: nonce } : {}),
        },
        body: JSON.stringify({ key }),
      });
      if (res.ok) location.reload();
    }
    async function update(key, qty) {
      const nonce = await getNonce();
      const res = await fetch('/api/wc-store/cart/update-item', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          ...(nonce ? { Nonce: nonce } : {}),
        },
        body: JSON.stringify({ key, quantity: qty }),
      });
      if (res.ok) location.reload();
    }
    const postQty = debounce(async (key, qty) => {
      // Store API rejects update-item with quantity=0 ("minimum quantity is 1").
      // Route qty=0 to /remove-item so setting qty to zero clears the line
      // instead of failing silently.
      try {
        const n = Math.max(0, parseInt(qty, 10) || 0);
        if (n === 0) await remove(key);
        else await update(key, n);
      } catch (e) { /* next reload re-syncs on the server side */ }
    }, 500);
    inputs.forEach((el) => {
      el.addEventListener('change', (e) => {
        const t = e.target;
        postQty(t.getAttribute('data-hatch-cart-key'), t.value);
      });
    });
    removes.forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          btn.setAttribute('disabled', 'disabled');
          await remove(btn.getAttribute('data-hatch-cart-key'));
        } catch (e) { btn.removeAttribute('disabled'); }
      });
    });
  })();
<\/script>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/cart.astro", void 0);
var $$file = "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/cart.astro";
var $$url = "/cart";
//#endregion
//#region \0virtual:astro:page:src/pages/cart@_@astro
var page = () => cart_exports;
//#endregion
export { page };

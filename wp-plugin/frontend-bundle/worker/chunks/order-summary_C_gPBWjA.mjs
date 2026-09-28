globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, a as Fragment, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as $$PageLayout } from "./PageLayout_C72aM96T.mjs";
//#region src/pages/order-summary.astro
var order_summary_exports = /* @__PURE__ */ __exportAll({
	default: () => $$OrderSummary,
	file: () => $$file,
	url: () => $$url
});
createAstro("http://localhost:4321");
var $$OrderSummary = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$OrderSummary;
	const url = new URL(Astro.request.url);
	const id = url.searchParams.get("id") || "";
	const key = url.searchParams.get("key") || "";
	return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, {
		"title": id ? `Order #${id}` : "Order",
		"description": "Order summary"
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="hatch-order"${addAttribute(id, "data-order-id")}${addAttribute(key, "data-order-key")}>${!id && renderTemplate`<div class="hatch-order__error" role="alert"><h1>Order not found</h1><p>Missing order id in URL.</p><a href="/shop" class="hatch-btn hatch-btn--primary">Back to shop</a></div>`}${id && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<header class="hatch-order__header"><p class="hatch-order__eyebrow">Thanks for your order</p><h1>Order #<span data-hatch-order-number>${id}</span></h1><p class="hatch-order__status" data-hatch-order-status-line hidden>Status: <strong data-hatch-order-status></strong></p></header><div class="hatch-order__loading" data-hatch-order-loading>Loading order details...</div><div class="hatch-order__error" data-hatch-order-error role="alert" hidden></div><div data-hatch-order-body hidden><section class="hatch-order__section"><h2>Items</h2><ul class="hatch-order__lines" role="list" data-hatch-order-items></ul></section><section class="hatch-order__section"><h2>Totals</h2><dl class="hatch-order__totals" data-hatch-order-totals></dl></section><section class="hatch-order__section" data-hatch-order-billing-section hidden><h2>Billing address</h2><address class="hatch-order__address" data-hatch-order-billing></address></section><div class="hatch-order__actions"><a href="/shop" class="hatch-btn hatch-btn--primary">Continue shopping</a></div></div>` })}`}</div>` })}<script>
  (function () {
    const root = document.querySelector('.hatch-order');
    if (!root) return;
    const id = root.dataset.orderId;
    const key = root.dataset.orderKey;
    if (!id) return;

    const loading = root.querySelector('[data-hatch-order-loading]');
    const errorBox = root.querySelector('[data-hatch-order-error]');
    const body = root.querySelector('[data-hatch-order-body]');
    const statusLine = root.querySelector('[data-hatch-order-status-line]');
    const statusEl = root.querySelector('[data-hatch-order-status]');
    const numEl = root.querySelector('[data-hatch-order-number]');
    const itemsEl = root.querySelector('[data-hatch-order-items]');
    const totalsEl = root.querySelector('[data-hatch-order-totals]');
    const billSection = root.querySelector('[data-hatch-order-billing-section]');
    const billEl = root.querySelector('[data-hatch-order-billing]');

    const escapeHtml = (s) => String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const money = (v, sym, dec) => {
      const n = parseInt(v || '0', 10);
      const d = dec || 0;
      if (!Number.isFinite(n)) return sym + '0';
      return sym + (n / Math.pow(10, d)).toFixed(d);
    };

    const showError = (msg) => {
      if (loading) loading.hidden = true;
      if (errorBox) { errorBox.hidden = false; errorBox.textContent = msg; }
    };

    // Store API route: /wc/store/v1/order/{id}?key=X (path param), not the
    // query-string shape /wc/store/v1/order?id=X&key=Y which 404s. Verified
    // against live route introspection: only /order/(?P<id>[\\d]+) exists.
    //
    // Path prefix goes through the same-origin Astro proxy
    // (src/pages/api/wc-store/[...path].ts). Calling /wp-json/* directly
    // 404s because the WP install is on a different origin.
    // Try Woo Store API first (needs Cart-Token from the placing session).
    // Fall back to /hatch/v1/order which validates the key server-side and
    // works even after the Cart-Token is gone (refresh, share, direct link).
    const storeUrl = '/api/wc-store/order/' + encodeURIComponent(id) +
      (key ? '?key=' + encodeURIComponent(key) : '');
    const hatchUrl = '/api/hatch/order/' + encodeURIComponent(id) +
      (key ? '?key=' + encodeURIComponent(key) : '');
    const tryFetch = async (u) => {
      const r = await fetch(u, { credentials: 'include', headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    };
    (async () => {
      try { return await tryFetch(storeUrl); }
      catch (_) { return await tryFetch(hatchUrl); }
    })()
      .then((data) => data)
      .then((order) => {
        if (!order || !order.id) throw new Error('Empty order response');
        loading.hidden = true;
        body.hidden = false;

        if (order.order_number) numEl.textContent = order.order_number;
        if (order.status) {
          statusEl.textContent = order.status;
          statusLine.hidden = false;
        }

        const sym = (order.totals && order.totals.currency_symbol) || '';
        const dec = order.totals && order.totals.currency_minor_unit != null
          ? order.totals.currency_minor_unit : 2;

        const items = order.items || [];
        itemsEl.innerHTML = items.map((it) => (
          '<li>' +
            '<span class="hatch-order__li-name">' + escapeHtml(it.name) +
              ' <em>&times;' + escapeHtml(it.quantity) + '</em></span>' +
            '<span class="hatch-order__li-total">' +
              escapeHtml(money(it.totals && it.totals.line_total, sym, dec)) +
            '</span>' +
          '</li>'
        )).join('');

        const rows = [];
        rows.push('<div><dt>Subtotal</dt><dd>' + escapeHtml(money(order.totals && order.totals.total_items, sym, dec)) + '</dd></div>');
        const ship = parseInt((order.totals && order.totals.total_shipping) || '0', 10);
        if (ship > 0) rows.push('<div><dt>Shipping</dt><dd>' + escapeHtml(money(order.totals.total_shipping, sym, dec)) + '</dd></div>');
        const tax = parseInt((order.totals && order.totals.total_tax) || '0', 10);
        if (tax > 0) rows.push('<div><dt>Tax</dt><dd>' + escapeHtml(money(order.totals.total_tax, sym, dec)) + '</dd></div>');
        rows.push('<div class="hatch-order__grand"><dt>Total</dt><dd>' + escapeHtml(money(order.totals && order.totals.total_price, sym, dec)) + '</dd></div>');
        totalsEl.innerHTML = rows.join('');

        const b = order.billing_address;
        if (b && (b.first_name || b.address_1)) {
          const addr2 = b.address_2 ? ', ' + escapeHtml(b.address_2) : '';
          billEl.innerHTML =
            escapeHtml(b.first_name) + ' ' + escapeHtml(b.last_name) + '<br>' +
            escapeHtml(b.address_1) + addr2 + '<br>' +
            escapeHtml(b.city) + ', ' + escapeHtml(b.state) + ' ' + escapeHtml(b.postcode) + '<br>' +
            escapeHtml(b.country);
          billSection.hidden = false;
        }
      })
      .catch((err) => {
        showError('Could not load order details: ' + (err && err.message ? err.message : 'network error'));
      });
  })();
<\/script>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/order-summary.astro", void 0);
var $$file = "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/order-summary.astro";
var $$url = "/order-summary";
//#endregion
//#region \0virtual:astro:page:src/pages/order-summary@_@astro
var page = () => order_summary_exports;
//#endregion
export { page };

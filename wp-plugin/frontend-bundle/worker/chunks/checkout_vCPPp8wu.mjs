globalThis.process ??= {};
globalThis.process.env ??= {};
import { t as __exportAll } from "./rolldown-runtime_D7vh-g_o.mjs";
import { D as createAstro, _ as addAttribute, d as renderTemplate, h as maybeRenderHead, i as renderComponent } from "./server_BrNLrt74.mjs";
import { t as createComponent } from "./compiler_CLadzSv0.mjs";
import { t as $$PageLayout } from "./PageLayout_C72aM96T.mjs";
import "./server_BKSwzYCg.mjs";
//#region src/pages/checkout.astro
var checkout_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Checkout,
	file: () => $$file,
	url: () => $$url
});
createAstro("http://localhost:4321");
var $$Checkout = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Checkout;
	const base = "https://hatch-wp-api.invalid/wp-json/wp/v2".replace(/\/wp-json(\/.*)?$/, "").replace(/\/$/, "");
	const cookie = Astro.request.headers.get("cookie") || "";
	let nonce = "";
	let cartToken = "";
	let cart = null;
	let checkout = null;
	let fetchErr = "";
	try {
		const cartRes = await fetch(`${base}/wp-json/wc/store/v1/cart`, { headers: {
			Accept: "application/json",
			Cookie: cookie
		} });
		if (cartRes.ok) {
			nonce = cartRes.headers.get("nonce") || cartRes.headers.get("Nonce") || "";
			cartToken = cartRes.headers.get("cart-token") || cartRes.headers.get("Cart-Token") || "";
			cart = await cartRes.json();
		} else fetchErr = `Cart load failed: HTTP ${cartRes.status}`;
		if (nonce) {
			const cRes = await fetch(`${base}/wp-json/wc/store/v1/checkout`, { headers: {
				Accept: "application/json",
				Cookie: cookie,
				Nonce: nonce,
				...cartToken ? { "Cart-Token": cartToken } : {}
			} });
			if (cRes.ok) checkout = await cRes.json();
		}
	} catch (e) {
		fetchErr = e instanceof Error ? e.message : String(e);
	}
	const items = cart?.items || [];
	const empty = items.length === 0;
	const symbol = cart?.totals?.currency_symbol || "";
	const minor = cart?.totals?.currency_minor_unit || 2;
	const money = (v) => {
		const n = parseInt(v || "0", 10);
		if (!Number.isFinite(n)) return `${symbol}0`;
		return `${symbol}${(n / Math.pow(10, minor)).toFixed(minor)}`;
	};
	const billing = checkout?.billing_address || {};
	const shipping = checkout?.shipping_address || {};
	const rawGatewayIds = (Array.isArray(cart?.payment_methods) ? cart.payment_methods : Array.isArray(checkout?.payment_methods) ? checkout.payment_methods : []).map((p) => typeof p === "string" ? p : String(p?.id || "")).filter((id) => id.length > 0);
	const activeGatewayIds = new Set(rawGatewayIds);
	const stripeEnabled = Boolean(void 0) && activeGatewayIds.has("stripe");
	const paypalEnabled = Boolean(void 0) && activeGatewayIds.has("ppcp-gateway");
	const gatewayMeta = {
		cod: {
			title: "Cash on delivery",
			description: "Pay in cash upon delivery."
		},
		stripe: {
			title: "Credit / Debit card",
			description: "Secure payment via Stripe."
		},
		"ppcp-gateway": {
			title: "PayPal",
			description: "Approve securely with your PayPal account."
		},
		bacs: { title: "Direct bank transfer" },
		cheque: { title: "Check payments" }
	};
	const prettifyId = (id) => id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
	const paymentMethods = (rawGatewayIds.length > 0 ? rawGatewayIds : ["cod"]).map((id) => ({
		id,
		title: gatewayMeta[id]?.title || prettifyId(id),
		description: gatewayMeta[id]?.description
	})).filter((pm) => {
		if (pm.id === "stripe") return stripeEnabled;
		if (pm.id === "ppcp-gateway") return paypalEnabled;
		return true;
	});
	return renderTemplate`${renderComponent($$result, "PageLayout", $$PageLayout, {
		"title": "Checkout",
		"description": "Complete your order"
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="hatch-checkout"><header class="hatch-checkout__header"><h1>Checkout</h1><a href="/cart" class="hatch-checkout__back">Back to cart</a></header>${fetchErr && renderTemplate`<div class="hatch-checkout__error" role="alert">${fetchErr}</div>`}${empty && !fetchErr && renderTemplate`<div class="hatch-checkout__empty"><p>Your cart is empty.</p><a href="/shop" class="hatch-btn hatch-btn--primary">Browse the shop</a></div>`}${!empty && renderTemplate`<form id="hatch-checkout-form" class="hatch-checkout__grid"${addAttribute(nonce, "data-nonce")}${addAttribute(cartToken, "data-cart-token")}${addAttribute(base, "data-wp-origin")}${addAttribute(stripeEnabled ? void 0 : "", "data-stripe-key")}${addAttribute(paypalEnabled ? void 0 : "", "data-paypal-client")}${addAttribute(cart?.totals?.currency_code || "USD", "data-currency")}><div class="hatch-checkout__forms"><fieldset class="hatch-checkout__section"><legend>Billing</legend><div class="hatch-checkout__row"><label class="hatch-checkout__field"><span>First name<span class="hatch-checkout__req" aria-hidden="true">*</span></span><input name="billing.first_name"${addAttribute(billing.first_name || "", "value")} required aria-describedby="err-billing-first_name"><span id="err-billing-first_name" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label><label class="hatch-checkout__field"><span>Last name<span class="hatch-checkout__req" aria-hidden="true">*</span></span><input name="billing.last_name"${addAttribute(billing.last_name || "", "value")} required aria-describedby="err-billing-last_name"><span id="err-billing-last_name" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label></div><label class="hatch-checkout__field"><span>Email<span class="hatch-checkout__req" aria-hidden="true">*</span></span><input type="email" name="billing.email"${addAttribute(billing.email || "", "value")} required aria-describedby="err-billing-email"><span id="err-billing-email" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label><label class="hatch-checkout__field"><span>Phone</span><input type="tel" name="billing.phone"${addAttribute(billing.phone || "", "value")} aria-describedby="err-billing-phone"><span id="err-billing-phone" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label><label class="hatch-checkout__field"><span>Address line 1<span class="hatch-checkout__req" aria-hidden="true">*</span></span><input name="billing.address_1"${addAttribute(billing.address_1 || "", "value")} required aria-describedby="err-billing-address_1"><span id="err-billing-address_1" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label><label class="hatch-checkout__field"><span>Address line 2</span><input name="billing.address_2"${addAttribute(billing.address_2 || "", "value")} aria-describedby="err-billing-address_2"><span id="err-billing-address_2" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label><div class="hatch-checkout__row"><label class="hatch-checkout__field"><span>City<span class="hatch-checkout__req" aria-hidden="true">*</span></span><input name="billing.city"${addAttribute(billing.city || "", "value")} required aria-describedby="err-billing-city"><span id="err-billing-city" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label><label class="hatch-checkout__field"><span>Postcode<span class="hatch-checkout__req" aria-hidden="true">*</span></span><input name="billing.postcode"${addAttribute(billing.postcode || "", "value")} required aria-describedby="err-billing-postcode"><span id="err-billing-postcode" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label></div><div class="hatch-checkout__row"><label class="hatch-checkout__field"><span>State</span><input name="billing.state"${addAttribute(billing.state || "CA", "value")} aria-describedby="err-billing-state"><span id="err-billing-state" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label><label class="hatch-checkout__field"><span>Country (2-letter)<span class="hatch-checkout__req" aria-hidden="true">*</span></span><input name="billing.country"${addAttribute(billing.country || "US", "value")} maxlength="2" required aria-describedby="err-billing-country"><span id="err-billing-country" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label></div></fieldset><fieldset class="hatch-checkout__section"><legend>Shipping</legend><label class="hatch-checkout__checkbox"><input type="checkbox" name="ship_same" checked><span>Same as billing</span></label><div class="hatch-checkout__ship-fields" hidden><div class="hatch-checkout__row"><label class="hatch-checkout__field"><span>First name</span><input name="shipping.first_name"${addAttribute(shipping.first_name || "", "value")} aria-describedby="err-shipping-first_name"><span id="err-shipping-first_name" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label><label class="hatch-checkout__field"><span>Last name</span><input name="shipping.last_name"${addAttribute(shipping.last_name || "", "value")} aria-describedby="err-shipping-last_name"><span id="err-shipping-last_name" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label></div><label class="hatch-checkout__field"><span>Address line 1</span><input name="shipping.address_1"${addAttribute(shipping.address_1 || "", "value")} aria-describedby="err-shipping-address_1"><span id="err-shipping-address_1" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label><div class="hatch-checkout__row"><label class="hatch-checkout__field"><span>City</span><input name="shipping.city"${addAttribute(shipping.city || "", "value")} aria-describedby="err-shipping-city"><span id="err-shipping-city" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label><label class="hatch-checkout__field"><span>Postcode</span><input name="shipping.postcode"${addAttribute(shipping.postcode || "", "value")} aria-describedby="err-shipping-postcode"><span id="err-shipping-postcode" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label></div><div class="hatch-checkout__row"><label class="hatch-checkout__field"><span>State</span><input name="shipping.state"${addAttribute(shipping.state || "CA", "value")} aria-describedby="err-shipping-state"><span id="err-shipping-state" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label><label class="hatch-checkout__field"><span>Country</span><input name="shipping.country"${addAttribute(shipping.country || "US", "value")} maxlength="2" aria-describedby="err-shipping-country"><span id="err-shipping-country" data-hatch-field-error class="hatch-checkout__field-error" role="alert" aria-live="polite"></span></label></div></div></fieldset><fieldset class="hatch-checkout__section"><legend>Payment</legend>${paymentMethods.map((pm, i) => renderTemplate`<label class="hatch-checkout__pm"><input type="radio" name="payment_method"${addAttribute(pm.id, "value")}${addAttribute(i === 0, "checked")}><span class="hatch-checkout__pm-title">${pm.title}</span>${pm.description && renderTemplate`<span class="hatch-checkout__pm-desc">${pm.description}</span>`}</label>`)}${stripeEnabled && renderTemplate`<div class="hatch-checkout__pm-panel" data-hatch-stripe-panel hidden><div class="hatch-checkout__field"><span>Card details</span><div id="hatch-stripe-card" class="hatch-checkout__stripe-card"></div></div><div class="hatch-checkout__pm-note" data-hatch-stripe-error role="alert" hidden></div></div>`}${paypalEnabled && renderTemplate`<div class="hatch-checkout__pm-panel" data-hatch-paypal-panel hidden><p class="hatch-checkout__pm-desc">Complete billing/shipping above, then approve with PayPal.</p><div id="hatch-paypal-buttons"></div><div class="hatch-checkout__pm-note" data-hatch-paypal-error role="alert" hidden></div></div>`}</fieldset><fieldset class="hatch-checkout__section"><legend>Order note (optional)</legend><label class="hatch-checkout__field"><textarea name="customer_note" rows="3" placeholder="Anything the seller should know"></textarea></label></fieldset></div><aside class="hatch-checkout__summary"><h2>Order summary</h2><ul class="hatch-checkout__lines" role="list">${items.map((it) => renderTemplate`<li><span class="hatch-checkout__li-name">${it.name} <em>×${it.quantity}</em></span><span class="hatch-checkout__li-total">${money(it.totals?.line_total)}</span></li>`)}</ul><div class="hatch-checkout__totals"><div><span>Subtotal</span><strong>${cart ? money(cart.totals.total_items) : ""}</strong></div>${cart?.totals?.total_shipping && parseInt(cart.totals.total_shipping, 10) > 0 && renderTemplate`<div><span>Shipping</span><strong>${money(cart.totals.total_shipping)}</strong></div>`}${cart?.totals?.total_tax && parseInt(cart.totals.total_tax, 10) > 0 && renderTemplate`<div><span>Tax</span><strong>${money(cart.totals.total_tax)}</strong></div>`}<div class="hatch-checkout__grand"><span>Total</span><strong>${cart ? money(cart.totals.total_price) : ""}</strong></div></div><button type="submit" class="hatch-btn hatch-btn--primary hatch-checkout__submit">Place order</button><div class="hatch-checkout__status" role="status" aria-live="polite"></div></aside></form>`}</div>` })}${stripeEnabled && renderTemplate`<script src="https://js.stripe.com/v3/"><\/script>`}${paypalEnabled && renderTemplate`<script${addAttribute(`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent("")}&currency=${encodeURIComponent(cart?.totals?.currency_code || "USD")}&intent=capture`, "src")}><\/script>`}<script>
  (function () {
    const form = document.getElementById('hatch-checkout-form');
    if (!form) return;
    const nonce = form.dataset.nonce;
    const cartToken = form.dataset.cartToken;
    const stripeKey = form.dataset.stripeKey || '';
    const paypalClient = form.dataset.paypalClient || '';

    const status = form.querySelector('.hatch-checkout__status');
    const submit = form.querySelector('.hatch-checkout__submit');
    const stripePanel = form.querySelector('[data-hatch-stripe-panel]');
    const stripeErr = form.querySelector('[data-hatch-stripe-error]');
    const paypalPanel = form.querySelector('[data-hatch-paypal-panel]');
    const paypalErr = form.querySelector('[data-hatch-paypal-error]');

    // Same-as-billing toggle.
    const sameChk = form.querySelector('input[name="ship_same"]');
    const shipFields = form.querySelector('.hatch-checkout__ship-fields');
    const syncShip = () => { shipFields.hidden = sameChk.checked; };
    if (sameChk && shipFields) { sameChk.addEventListener('change', syncShip); syncShip(); }

    // Collect address fields as { key: value } objects grouped by prefix.
    const collect = (prefix) => {
      const data = new FormData(form);
      const o = {};
      for (const [k, v] of data.entries()) {
        if (k.startsWith(prefix + '.')) o[k.slice(prefix.length + 1)] = String(v);
      }
      return o;
    };

    const buildBody = (paymentMethod, paymentData) => {
      const data = new FormData(form);
      const billing = collect('billing');
      const shipping = data.get('ship_same')
        ? Object.assign({}, billing)
        : collect('shipping');
      delete shipping.email; // shipping schema has no email
      return {
        billing_address: billing,
        shipping_address: shipping,
        payment_method: paymentMethod,
        payment_data: paymentData || [],
        customer_note: String(data.get('customer_note') || ''),
      };
    };

    // Session credentials that the Store API accepts. SSR captured a Nonce
    // and Cart-Token via server-side cookies, but the browser's own session
    // (used for the ATC that added the current line items) can hold a fresher
    // pair. refreshSession() re-reads them from the cart endpoint via the
    // same-origin proxy, so the POST that follows uses the pair that actually
    // matches the cart the browser sees.
    let liveNonce = nonce;
    let liveCartToken = cartToken;
    const refreshSession = async () => {
      try {
        const r = await fetch('/api/wc-store/cart', {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
        });
        const n = r.headers.get('Nonce') || r.headers.get('nonce');
        const t = r.headers.get('Cart-Token') || r.headers.get('cart-token');
        if (n) liveNonce = n;
        if (t) liveCartToken = t;
      } catch (_) { /* keep SSR values */ }
    };

    const postCheckout = async (body) => {
      // Browser POST goes through Astro's same-origin proxy to avoid CORS.
      // See src/pages/api/wc-store/[...path].ts.
      await refreshSession();
      const res = await fetch('/api/wc-store/checkout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(liveNonce ? { Nonce: liveNonce } : {}),
          ...(liveCartToken ? { 'Cart-Token': liveCartToken } : {}),
        },
        body: JSON.stringify(body),
      });
      const out = await res.json().catch(() => ({}));
      return { ok: res.ok, out: out };
    };

    // Woo REST error code → dotted field path. Any code not listed here
    // falls back to the top-level status row (unchanged behavior).
    const ERR_CODE_MAP = {
      woocommerce_rest_missing_email_address: 'billing.email',
      woocommerce_rest_invalid_email: 'billing.email',
      woocommerce_rest_missing_billing_first_name: 'billing.first_name',
      woocommerce_rest_missing_billing_last_name: 'billing.last_name',
      woocommerce_rest_missing_billing_address_1: 'billing.address_1',
      woocommerce_rest_missing_billing_city: 'billing.city',
      woocommerce_rest_missing_billing_postcode: 'billing.postcode',
      woocommerce_rest_missing_billing_country: 'billing.country',
    };

    const errorIdFor = (path) => 'err-' + String(path || '').replace(/\\./g, '-');
    const inputFor = (path) => form.querySelector('[name="' + path + '"]');

    const clearFieldErrors = () => {
      form.querySelectorAll('[data-hatch-field-error]').forEach((el) => {
        el.textContent = '';
      });
      form.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
        el.removeAttribute('aria-invalid');
      });
    };

    const paintFieldError = (path, message) => {
      const input = inputFor(path);
      const target = document.getElementById(errorIdFor(path));
      if (!target) return false;
      target.textContent = String(message || 'This field is required.');
      if (input) input.setAttribute('aria-invalid', 'true');
      return true;
    };

    // Walk a Woo error payload. Returns the list of dotted field paths that
    // got painted, in first-seen order, so the caller can focus the first
    // invalid input.
    const applyFieldErrors = (out) => {
      const painted = [];
      const seen = Object.create(null);
      const push = (path, msg) => {
        if (!path || seen[path]) return;
        if (paintFieldError(path, msg)) {
          seen[path] = true;
          painted.push(path);
        }
      };
      const details = out && out.data && out.data.details;
      if (details && typeof details === 'object') {
        Object.keys(details).forEach((key) => {
          const entry = details[key];
          const msg = entry && typeof entry === 'object' ? entry.message : entry;
          push(key, msg);
        });
      }
      const extra = out && Array.isArray(out.additional_errors) ? out.additional_errors : [];
      extra.forEach((e) => {
        const path = e && ERR_CODE_MAP[e.code];
        if (path) push(path, e.message);
      });
      if (out && out.code && ERR_CODE_MAP[out.code]) {
        push(ERR_CODE_MAP[out.code], out.message);
      }
      return painted;
    };

    // Handle Strong Customer Authentication (SCA / 3DS) for Stripe. When the
    // classic gateway needs a bank challenge, WC Stripe returns a Store API
    // payload shaped like:
    //   payment_result.payment_details = [
    //     {key:"result",   value:"success"},
    //     {key:"redirect", value:"#wc-stripe-confirm-pi:{order}:{client_secret}:{nonce}"},
    //     {key:"payment_method", value:"pm_..."},
    //   ]
    // The hash form is native to the WP-rendered checkout. On headless we
    // parse the client_secret out of it, call stripe.confirmCardPayment so
    // the shopper completes 3DS, then hit the wc_stripe_verify_intent AJAX
    // endpoint so the plugin flips the order into \`processing\` and unblocks
    // the webhook flow. See
    // WC_Stripe_UPE_Payment_Gateway::process_payment_with_payment_method()
    // and WC_Stripe_Blocks_Support::add_stripe_intents().
    const detailsToObj = (details) => {
      if (Array.isArray(details)) {
        return details.reduce((acc, kv) => {
          if (kv && kv.key) acc[kv.key] = kv.value;
          return acc;
        }, {});
      }
      return details && typeof details === 'object' ? details : {};
    };

    const parseConfirmHash = (hash) => {
      if (!hash || typeof hash !== 'string') return null;
      const parts = hash.replace(/^#/, '').split(':');
      if (parts[0] !== 'wc-stripe-confirm-pi' && parts[0] !== 'wc-stripe-confirm-si') return null;
      return { orderId: parts[1], clientSecret: parts[2], nonce: parts[3], type: parts[0] };
    };

    const handleStripe3DS = async (out) => {
      if (!stripe) return false;
      const details = detailsToObj(out && out.payment_result && out.payment_result.payment_details);
      // Prefer the explicit shape (verification_endpoint), fall back to the
      // hash-encoded classic redirect that the UPE gateway emits by default.
      const explicit = details.payment_intent_secret || details.setup_intent_secret || '';
      const parsed = parseConfirmHash(details.redirect || '');
      const clientSecret = explicit || (parsed ? parsed.clientSecret : '');
      if (!clientSecret) return false;

      const conf = parsed && parsed.type === 'wc-stripe-confirm-si'
        ? await stripe.confirmCardSetup(clientSecret)
        : await stripe.confirmCardPayment(clientSecret);
      if (conf && conf.error) {
        stripeErr.hidden = false;
        stripeErr.textContent = conf.error.message || 'Bank rejected the payment.';
        return true;
      }

      // Ping wc_stripe_verify_intent through the Astro-side proxy so the
      // gateway flips the order from \`pending\` to \`processing\` immediately.
      // If the webhook path is set up on WP, this is redundant but harmless;
      // in a headless dev stack without a public WP URL, it is the ONLY way
      // the WP order status catches up before the shopper hits the summary
      // page. Failure is soft: we still redirect and rely on the eventual
      // webhook. See src/pages/api/wc-stripe-verify.ts.
      if (parsed && parsed.nonce) {
        try {
          const intentId = (conf && conf.paymentIntent && conf.paymentIntent.id) || '';
          const params = new URLSearchParams({
            order: String(parsed.orderId || out.order_id),
            nonce: parsed.nonce,
          });
          if (intentId) params.set('intent_id', intentId);
          params.set(
            'redirect_to',
            '/order-summary?id=' + out.order_id + '&key=' + encodeURIComponent(out.order_key || ''),
          );
          await fetch('/api/wc-stripe-verify?' + params.toString(), {
            credentials: 'same-origin',
          });
        } catch (_) { /* soft-fail, webhook can catch up */ }
      }

      const verifyUrl = details.verification_endpoint || '';
      window.location.href = verifyUrl
        || ('/order-summary?id=' + out.order_id + '&key=' + encodeURIComponent(out.order_key || ''));
      return true;
    };

    // WooCommerce returns a WP-native redirect_url like
    // /checkout/order-received/{id}/?key=... which 404s on the Astro
    // frontend. Detect it and rewrite to the headless order-summary page,
    // preserving the order key so /api/wc-store/order/{id}?key= still
    // authorises the guest lookup.
    const rewriteReceived = (url, orderId, orderKey) => {
      const summary = '/order-summary?id=' + orderId + '&key=' + encodeURIComponent(orderKey || '');
      if (!url) return summary;
      try {
        const u = new URL(url, window.location.origin);
        if (/\\/checkout\\/order-received\\//.test(u.pathname)) return summary;
        // Same-origin redirects are honored as-is; cross-origin (a Stripe
        // hosted challenge, PayPal approval page, etc.) is also honored so
        // the gateway can complete its handshake.
        return url;
      } catch (_) { return summary; }
    };

    const finish = ({ ok, out }) => {
      if (ok && out && out.order_id) {
        clearFieldErrors();
        // 3DS path first: if the payment needs a bank challenge, run it
        // client-side, then honor the verification endpoint. Non-3DS cards
        // fall through to the ordinary redirect.
        return handleStripe3DS(out).then((handled) => {
          if (handled) return true;
          const redirect = out.payment_result && out.payment_result.redirect_url;
          window.location.href = rewriteReceived(redirect, out.order_id, out.order_key);
          return true;
        });
      }
      clearFieldErrors();
      const painted = applyFieldErrors(out || {});
      if (painted.length) {
        const first = inputFor(painted[0]);
        if (first && typeof first.focus === 'function') first.focus();
        status.textContent = '';
      } else {
        status.textContent = (out && out.message) || 'Could not place order. Please review the fields.';
      }
      submit.disabled = false;
      return false;
    };

    // ---- Stripe Elements bootstrap (only if key + SDK present) ----
    let stripe = null;
    let stripeCard = null;
    if (stripeKey && typeof window.Stripe === 'function') {
      try {
        stripe = window.Stripe(stripeKey);
        const elements = stripe.elements();
        stripeCard = elements.create('card');
        stripeCard.mount('#hatch-stripe-card');
        stripeCard.on('change', (ev) => {
          if (ev.error) {
            stripeErr.hidden = false;
            stripeErr.textContent = ev.error.message || 'Card error';
          } else {
            stripeErr.hidden = true;
            stripeErr.textContent = '';
          }
        });
      } catch (e) {
        stripe = null;
        stripeCard = null;
      }
    }

    // ---- PayPal Buttons bootstrap (only if client-id + SDK present) ----
    if (paypalClient && window.paypal && typeof window.paypal.Buttons === 'function') {
      try {
        window.paypal.Buttons({
          createOrder: function () {
            // Woo needs to create the order first via its gateway, but we
            // let PayPal generate an order id here and pass it through as
            // payment_data. PayPal's own capture happens server-side after
            // Woo POSTs to the gateway; onApprove.orderID is the value the
            // ppcp-gateway plugin expects in payment_data.paypal_order_id.
            return fetch('/api/wc-store/cart', {
              credentials: 'include',
              headers: { Accept: 'application/json' },
            }).then(function (r) { return r.json(); }).then(function (c) {
              const total = ((parseInt((c && c.totals && c.totals.total_price) || '0', 10)) /
                Math.pow(10, (c && c.totals && c.totals.currency_minor_unit) || 2)).toFixed(
                (c && c.totals && c.totals.currency_minor_unit) || 2);
              return {
                purchase_units: [{ amount: {
                  currency_code: (c && c.totals && c.totals.currency_code) || 'USD',
                  value: total,
                } }],
              };
            });
          },
          onApprove: function (data) {
            submit.disabled = true;
            status.textContent = 'Placing order...';
            const body = buildBody('ppcp-gateway', [
              { key: 'paypal_order_id', value: String(data.orderID || '') },
              { key: 'paypal_payer_id', value: String(data.payerID || '') },
            ]);
            return postCheckout(body).then(finish);
          },
          onError: function (err) {
            paypalErr.hidden = false;
            paypalErr.textContent = (err && err.message) || 'PayPal error';
          },
        }).render('#hatch-paypal-buttons');
      } catch (e) {
        if (paypalErr) {
          paypalErr.hidden = false;
          paypalErr.textContent = 'PayPal could not initialize.';
        }
      }
    }

    // Show/hide gateway panels based on selected radio.
    const syncPanels = () => {
      const sel = form.querySelector('input[name="payment_method"]:checked');
      const id = sel ? sel.value : '';
      if (stripePanel) stripePanel.hidden = id !== 'stripe';
      if (paypalPanel) paypalPanel.hidden = id !== 'ppcp-gateway';
      // Woo handles PayPal capture through the buttons themselves. Hide
      // the standard "Place order" submit while PayPal is selected.
      submit.hidden = id === 'ppcp-gateway';
    };
    form.querySelectorAll('input[name="payment_method"]').forEach((r) => {
      r.addEventListener('change', syncPanels);
    });
    syncPanels();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sel = form.querySelector('input[name="payment_method"]:checked');
      const method = sel ? sel.value : 'cod';

      // PayPal path uses the Buttons flow, not the submit button.
      if (method === 'ppcp-gateway') return;

      clearFieldErrors();
      submit.disabled = true;
      status.textContent = 'Placing order...';

      if (method === 'stripe') {
        if (!stripe || !stripeCard) {
          status.textContent = 'Stripe is not ready. Refresh and try again.';
          submit.disabled = false;
          return;
        }
        try {
          const pm = await stripe.createPaymentMethod({ type: 'card', card: stripeCard });
          if (pm.error) {
            stripeErr.hidden = false;
            stripeErr.textContent = pm.error.message || 'Card was declined.';
            status.textContent = '';
            submit.disabled = false;
            return;
          }
          // WC Stripe (v9+, UPE class active even when the classic toggle
          // is off) reads the Stripe PaymentMethod id from
          // $_POST['wc-stripe-payment-method']. The Store API's Legacy
          // dispatch REPLACES $_POST with the payment_data array before
          // calling process_payment (see woocommerce/src/StoreApi/Legacy.php),
          // so every field the gateway reads via $_POST must be listed here.
          // That is why \`payment_method\` is repeated in payment_data even
          // though it is also the top-level field: without it, the gateway
          // sees $_POST['payment_method'] as empty and throws
          // "The selected payment method type is invalid.".
          const body = buildBody('stripe', [
            { key: 'payment_method', value: 'stripe' },
            { key: 'wc-stripe-payment-method', value: String(pm.paymentMethod.id) },
            { key: 'wc-stripe-is-deferred-intent', value: '1' },
          ]);
          finish(await postCheckout(body));
        } catch (err) {
          status.textContent = 'Network error. Please try again.';
          submit.disabled = false;
        }
        return;
      }

      // Default: COD or any other non-tokenized gateway.
      try {
        finish(await postCheckout(buildBody(method, [])));
      } catch (err) {
        status.textContent = 'Network error. Please try again.';
        submit.disabled = false;
      }
    });
  })();
<\/script>`;
}, "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/checkout.astro", void 0);
var $$file = "/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/checkout.astro";
var $$url = "/checkout";
//#endregion
//#region \0virtual:astro:page:src/pages/checkout@_@astro
var page = () => checkout_exports;
//#endregion
export { page };

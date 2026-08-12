import type { APIRoute } from 'astro';
import { WP_API_URL } from 'astro:env/server';

/**
 * Same-origin proxy for WC Stripe's `wc_stripe_verify_intent` AJAX action.
 *
 * Why this exists:
 *   After stripe.confirmCardPayment resolves in the browser, the classic
 *   Stripe gateway exposes a WP-side endpoint that (a) fetches the confirmed
 *   PaymentIntent from Stripe, (b) marks the WC order paid, and (c) redirects
 *   the shopper to the order-received page. That URL lives on the WP origin
 *   (e.g. http://wp/?wc-ajax=wc_stripe_verify_intent&...), which the browser
 *   cannot reach directly on a headless install where WP sits behind a
 *   private hostname or a different port. This route accepts the query
 *   parameters from Stripe.js and forwards them to WP server-side, so the
 *   gateway can complete the intent verification handshake without needing a
 *   public WP URL. The 30x from WP is not followed; the redirect location is
 *   returned to the browser as JSON so the caller can navigate to Astro's
 *   own /order-summary.
 */

export const prerender = false;

const WP_BASE = (WP_API_URL || '').replace(/\/wp-json(\/.*)?$/, '').replace(/\/$/, '');

export const GET: APIRoute = async ({ request }) => {
  if (!WP_BASE) {
    return new Response(JSON.stringify({ ok: false, error: 'wp_api_url_missing' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
  const url = new URL(request.url);
  const order = url.searchParams.get('order') || '';
  const nonce = url.searchParams.get('nonce') || '';
  const intentId = url.searchParams.get('intent_id') || '';
  const redirectTo = url.searchParams.get('redirect_to') || '';
  if (!order || !nonce) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_params' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const target = new URL(`${WP_BASE}/`);
  target.searchParams.set('wc-ajax', 'wc_stripe_verify_intent');
  target.searchParams.set('order', order);
  target.searchParams.set('nonce', nonce);
  if (intentId) target.searchParams.set('intent_id', intentId);
  if (redirectTo) target.searchParams.set('redirect_to', redirectTo);

  const cookie = request.headers.get('cookie') || '';
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 10000);
  try {
    const upstream = await fetch(target.toString(), {
      method: 'GET',
      headers: { Accept: 'text/html,*/*', ...(cookie ? { Cookie: cookie } : {}) },
      redirect: 'manual',
      signal: abort.signal,
    });
    const location = upstream.headers.get('location') || '';
    return new Response(JSON.stringify({ ok: upstream.status < 500, status: upstream.status, location }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // Network or timeout: fall through to a soft failure so the browser can
    // still redirect to /order-summary and let the Stripe webhook reconcile.
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: 'upstream_unreachable', detail: msg.slice(0, 200) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * WooCommerce capability helpers.
 *
 * The WordPress plugin reports whether WooCommerce is active and which pages
 * it uses for shop, cart, checkout and account (/hatch/v1/features ->
 * `woocommerce`). Everything in the starter that touches the store asks here
 * instead of guessing from URL slugs, so:
 *   - a site without WooCommerce shows no store UI and serves /shop, /cart,
 *     /checkout and /account as ordinary WordPress pages (or a normal 404);
 *   - a store with translated or renamed pages (Warenkorb, Mon compte) links
 *     to, and serves, the real page paths.
 */
import type { HatchFeatures } from './features';

export type WooRole = 'shop' | 'cart' | 'checkout' | 'myaccount';

/** Built-in Astro route that renders each WooCommerce role. */
export const WOO_ROUTE: Record<WooRole, string> = {
  shop: '/shop',
  cart: '/cart',
  checkout: '/checkout',
  myaccount: '/account',
};

export function isWooActive(features: Pick<HatchFeatures, 'woocommerce'> | null | undefined): boolean {
  return !!features?.woocommerce?.active;
}

/**
 * Public path for a role: the real WordPress page path when WooCommerce has
 * one, else the starter's built-in route. Empty string when WooCommerce is off.
 */
export function wooPath(features: Pick<HatchFeatures, 'woocommerce'>, role: WooRole): string {
  if (!isWooActive(features)) return '';
  const page = features.woocommerce.pages[role];
  return page && page.path ? page.path : WOO_ROUTE[role];
}

/** Built-in route for a requested path when it is one of WooCommerce's configured pages. */
export function wooRouteForPath(features: Pick<HatchFeatures, 'woocommerce'>, requestPath: string): string | null {
  if (!isWooActive(features)) return null;
  const clean = (p: string): string => {
    let out = p;
    try {
      out = decodeURIComponent(p);
    } catch {
      /* keep the raw path */
    }
    return '/' + out.replace(/^\/+|\/+$/g, '').toLowerCase();
  };
  const wanted = clean(requestPath);
  for (const role of Object.keys(WOO_ROUTE) as WooRole[]) {
    const page = features.woocommerce.pages[role];
    if (page && page.path && clean(page.path) === wanted) return WOO_ROUTE[role];
  }
  return null;
}

function normPath(href: string): string {
  let path = href;
  try {
    path = new URL(href, 'http://placeholder.invalid').pathname;
  } catch {
    /* keep the raw value */
  }
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep the raw path */
  }
  return '/' + path.replace(/^\/+|\/+$/g, '').toLowerCase();
}

/**
 * True when a menu link points at the Cart or My account page. The header
 * already shows those as icons, so the text twins are left out of the nav.
 */
export function isStoreIconLink(features: Pick<HatchFeatures, 'woocommerce'>, href: string): boolean {
  if (!isWooActive(features)) return false;
  const target = normPath(href);
  return (['cart', 'myaccount'] as WooRole[]).some((role) => {
    const page = features.woocommerce.pages[role];
    return !!page && !!page.path && normPath(page.path) === target;
  });
}

interface RewriteContext {
  locals: Record<string, unknown>;
  rewrite: (target: string) => Promise<Response>;
}

/** Key the catch-all page route reads to learn which WordPress page to render. */
export const FALL_THROUGH_KEY = 'hatchPageSlug';

/**
 * Hand a store route over to the normal WordPress page lookup. Used by
 * /shop, /cart, /checkout, /account and friends when WooCommerce is not
 * active: if the site has an ordinary page called "Shop" it renders like any
 * other page, otherwise the themed 404 appears.
 */
export function fallThroughToPage(ctx: RewriteContext, slug: string): Promise<Response> {
  ctx.locals[FALL_THROUGH_KEY] = slug;
  return ctx.rewrite('/__hatch-page');
}

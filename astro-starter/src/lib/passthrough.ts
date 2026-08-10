/**
 * Passthrough — serve WordPress's own complete document instead of injecting a
 * fragment into this layout.
 *
 * WHY THIS EXISTS
 *
 * Rendering a builder-built WordPress page inside an Astro layout merges two
 * documents that were never meant to coexist. WordPress's markup lands inside
 * Tailwind's preflight, this layout's `<body>` classes, its prose wrapper and its
 * vertical rhythm — and every one of those has to be neutralised, rule by rule,
 * by the WordPress-side bridge. That list only ever grows: a Tailwind utility
 * named `.collapse` silently hid a Bootstrap-classed site navigation whose markup
 * and geometry were byte-correct, because `visibility` is inherited.
 *
 * A page served as its OWN document has nothing to be defended against. Its
 * `<head>`, its stylesheets in their own order, its body classes, its scripts —
 * all exactly as WordPress wrote them. That is what "exact page" means, and it is
 * reached by removing code rather than adding it.
 *
 * WHY IT IS SAFE TO LOAD WORDPRESS'S ASSETS DIRECTLY
 *
 * The bridge used to inline every stylesheet and script because an older CSP
 * granted neither `https:` nor the WordPress origin. `src/middleware.ts` now
 * grants both on `script-src`, `style-src`, `font-src`, `img-src` and
 * `media-src`, so WordPress's own `<script src>` / `<link rel=stylesheet>` simply
 * load. No inlining means no byte budget, and no per-script size cap quietly
 * dropping the builder's frontend bundle.
 *
 * Security headers are deliberately NOT set here. `attachSecurityHeaders()` in
 * the middleware applies them to every `text/html` response, and it only fills
 * headers that are absent — so leaving them alone keeps ONE source of truth for
 * the CSP rather than a second copy that can drift.
 *
 * FAIL-SAFE BY CONSTRUCTION
 *
 * Returns `null` on anything unexpected — no WordPress origin configured, a
 * non-200, a response without the `X-Protuno-Document` marker, a body too small
 * or without an `<html>` element, a network error. The caller then renders
 * through the normal layout exactly as before, so a site where this endpoint is
 * missing (an older bridge, or the feature switched off in WordPress) is
 * completely unaffected.
 */
import { WP_API_URL } from 'astro:env/server';

/** WordPress's origin, derived from the configured REST URL. */
const WP_ORIGIN = (WP_API_URL || '')
  .replace(/\/wp-json[\s\S]*$/i, '')
  .replace(/\/+$/, '');

/**
 * This deployment's own origin, told to WordPress on every document request.
 *
 * WHY. WordPress owns the links: it rewrites every permalink's host so the
 * served document points visitors at the frontend rather than at WordPress. It
 * used to read that host from a `hatch_frontend_url` setting saved in WP Admin,
 * which goes stale on the most ordinary events there are — moving from a preview
 * URL to a custom domain, redeploying under a new project name, adding a staging
 * environment. Nothing warns you: the page renders perfectly and every link sends
 * the visitor to the old address.
 *
 * The frontend is the one party that knows where it lives, so it says so. Nothing
 * to keep in sync, and it self-corrects the moment a deployment moves.
 *
 * Derived from PUBLIC_SITE_URL rather than the incoming request, so it is stable
 * across preview/production URLs pointing at the same build. An older bridge
 * simply ignores the parameter.
 */
const SELF_ORIGIN = (() => {
  const raw = import.meta.env.PUBLIC_SITE_URL || '';
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.origin : '';
  } catch {
    return ''; // unset or unparseable — WordPress falls back to its saved setting.
  }
})();

/** How long to wait for WordPress before giving up and using the layout path. */
const TIMEOUT_MS = 12_000;

/**
 * Ask WordPress for the complete document behind a path.
 *
 * @param slug Hierarchical path with no leading slash (`''` = the front page).
 * @returns A ready-to-return Response, or null to fall through to the layout.
 */
export async function tryPassthrough(slug: string): Promise<Response | null> {
  if (!WP_ORIGIN) return null;

  const url =
    `${WP_ORIGIN}/wp-json/protuno/v1/document?slug=${encodeURIComponent(slug || '')}` +
    (SELF_ORIGIN ? `&frontend=${encodeURIComponent(SELF_ORIGIN)}` : '');

  let res: Response;
  try {
    // AbortSignal.timeout keeps a stalled origin from holding the request open
    // for the platform's whole function budget — a slow WordPress should cost a
    // slower page, not a gateway timeout.
    res = await fetch(url, {
      headers: { Accept: 'text/html' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
    });
  } catch {
    return null; // unreachable, timed out, DNS — the layout path still works.
  }

  if (!res.ok) return null;

  // The marker is what distinguishes a real document from a host error page
  // served with a 200, which is common enough to be worth guarding.
  if (res.headers.get('x-protuno-document') !== '1') return null;

  let html: string;
  try {
    html = await res.text();
  } catch {
    return null;
  }

  // A truncated or placeholder body must never be served as the page.
  if (!html || html.length < 1024 || !/<html[\s>]/i.test(html)) return null;

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Same shape the bridge sets on the endpoint, so the edge and the origin
      // agree on freshness.
      'cache-control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=600',
      // Visible in devtools without having to diff two pages to work out which
      // path produced the one you are looking at.
      'x-hatch-render': 'passthrough',
      // Tells the middleware not to impose this app's CSP on a document it did
      // not author — see the note above attachSecurityHeaders() in
      // src/middleware.ts. Internal: the middleware strips it before the
      // response leaves, so it never reaches the browser.
      'x-hatch-passthrough': '1',
    },
  });
}

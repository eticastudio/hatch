/**
 * Code Injection — head / body-start / body-end snippets for the Astro
 * frontend. Reads from /hatch/v1/code-snippets (public endpoint).
 *
 * The WP plugin stores three free-text slots plus four analytics IDs.
 * We do the slot-specific snippet generation here on the frontend so the
 * WP option stays clean and the analytics integration can evolve without
 * a WordPress release.
 *
 * Output: three HTML strings (head / bodyStart / bodyEnd) ready for
 * `set:html` injection in PageLayout.astro.
 */

import { WP_API_URL } from 'astro:env/server';
const WP_API = WP_API_URL;

interface RawSnippets {
  head?: string;
  body_start?: string;
  body_end?: string;
  ga4_id?: string;
  gtm_id?: string;
  plausible_domain?: string;
  pixel_id?: string;
}

export interface CodeSnippets {
  head: string;
  bodyStart: string;
  bodyEnd: string;
}

const EMPTY: CodeSnippets = { head: '', bodyStart: '', bodyEnd: '' };

/**
 * Fetch the raw snippet record. Hatch_API_URL points at /wp-json/wp/v2/* —
 * strip the wp/v2 suffix to hit /wp-json/hatch/v1/*.
 */
async function fetchSnippets(): Promise<RawSnippets> {
  if (!WP_API) return {};
  const base = WP_API.replace(/\/wp\/v2\/?$/, '');
  try {
    const res = await fetch(`${base}/hatch/v1/code-snippets`, {
      headers: { Accept: 'application/json' },
      // Snippets change rarely; cache aggressively. The WP route also sets
      // s-maxage so the edge holds it across requests.
      cf: { cacheTtl: 60 },
    } as RequestInit);
    if (!res.ok) return {};
    return (await res.json()) as RawSnippets;
  } catch {
    return {};
  }
}

// ----------------------------------------------------------------------
// Snippet builders — generate canonical HTML for each known analytics ID.
// All snippets are async/defer where possible to keep them off the critical
// rendering path. Anything that absolutely needs to fire before page-render
// (legacy fbq, GTM bootstrap) is intentionally synchronous in <head>.
// ----------------------------------------------------------------------

function buildGa4Head(id: string): string {
  if (!id) return '';
  return `<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
</script>`;
}

function buildGtmHead(id: string): string {
  if (!id) return '';
  return `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');</script>`;
}

function buildGtmBodyStart(id: string): string {
  if (!id) return '';
  return `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
}

function buildPlausibleHead(domain: string): string {
  if (!domain) return '';
  return `<!-- Plausible Analytics -->
<script defer data-domain="${domain}" src="https://plausible.io/js/script.js"></script>`;
}

function buildPixelHead(id: string): string {
  if (!id) return '';
  return `<!-- Meta Pixel -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1"/></noscript>`;
}

interface SeoMeta {
  robots_txt?: string;
  verification?: Array<{ provider: string; content: string }>;
}

/**
 * Build verification meta tags from the SEO plugin bridge. Each entry becomes
 * a standard `<meta name="{provider}-site-verification" content="...">` —
 * the format Google / Bing / Yandex / Pinterest / Baiduall recognize.
 */
function buildVerificationMeta(items: SeoMeta['verification']): string {
  if (!items || items.length === 0) return '';
  const PROVIDER_NAME: Record<string, string> = {
    google:    'google-site-verification',
    bing:      'msvalidate.01',
    yandex:    'yandex-verification',
    pinterest: 'p:domain_verify',
    baidu:     'baidu-site-verification',
  };
  return items
    .map((v) => {
      const name = PROVIDER_NAME[v.provider] || v.provider;
      const content = String(v.content).replace(/"/g, '&quot;');
      return `<meta name="${name}" content="${content}" />`;
    })
    .join('\n');
}

async function fetchSeoMeta(): Promise<SeoMeta> {
  if (!WP_API) return {};
  const base = WP_API.replace(/\/wp\/v2\/?$/, '');
  try {
    const res = await fetch(`${base}/hatch/v1/seo-meta`, {
      headers: { Accept: 'application/json' },
      cf: { cacheTtl: 300 },
    } as RequestInit);
    if (!res.ok) return {};
    return (await res.json()) as SeoMeta;
  } catch {
    return {};
  }
}

/**
 * Build all three slots. Called once per request from PageLayout.
 *
 * @returns { head, bodyStart, bodyEnd } — raw HTML strings ready for set:html.
 */
export async function getCodeSnippets(): Promise<CodeSnippets> {
  // Fetch code snippets + SEO meta in parallel — both feed the head slot.
  const [raw, seoMeta] = await Promise.all([fetchSnippets(), fetchSeoMeta()]);
  if (!raw && !seoMeta) return EMPTY;

  const ga4       = buildGa4Head(raw.ga4_id || '');
  const gtmHead   = buildGtmHead(raw.gtm_id || '');
  const gtmBody   = buildGtmBodyStart(raw.gtm_id || '');
  const plausible = buildPlausibleHead(raw.plausible_domain || '');
  const pixel     = buildPixelHead(raw.pixel_id || '');
  const verifyMeta = buildVerificationMeta(seoMeta?.verification);

  const head = [verifyMeta, ga4, gtmHead, plausible, pixel, raw.head || ''].filter(Boolean).join('\n');
  const bodyStart = [gtmBody, raw.body_start || ''].filter(Boolean).join('\n');
  const bodyEnd = (raw.body_end || '').trim();

  return { head, bodyStart, bodyEnd };
}

/**
 * Code Injection — head / body-start / body-end snippets for the Astro
 * frontend. Reads from /hatch/v1/code-snippets (public endpoint).
 *
 * v0.50.31 — GA4, Plausible, Meta Pixel builders DELETED per the "Hatch
 * ships only Google Tag Manager" rule. Users who want other tags add them
 * inside their GTM container; users who need raw HTML inject via the WPCode
 * plugin (auto-detected by Plugin Bridge). One way to do it, no zombie
 * surface area.
 *
 * Head/body_start/body_end fields remain ONLY for SEO-plugin verification
 * meta and raw HTML pasted by WP-side plugins (not by Hatch admin UI).
 */

import { WP_API_URL } from 'astro:env/server';
const WP_API = WP_API_URL;

interface RawSnippets {
  head?: string;
  body_start?: string;
  body_end?: string;
  gtm_id?: string;
}

export interface CodeSnippets {
  head: string;
  bodyStart: string;
  bodyEnd: string;
}

const EMPTY: CodeSnippets = { head: '', bodyStart: '', bodyEnd: '' };

async function fetchSnippets(): Promise<RawSnippets> {
  if (!WP_API) return {};
  const base = WP_API.replace(/\/wp\/v2\/?$/, '');
  try {
    const res = await fetch(`${base}/hatch/v1/code-snippets`, {
      headers: { Accept: 'application/json' },
      cf: { cacheTtl: 60 },
    } as RequestInit);
    if (!res.ok) return {};
    return (await res.json()) as RawSnippets;
  } catch {
    return {};
  }
}

/** Google Tag Manager — the ONLY analytics integration Hatch ships. */
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

interface SeoMeta {
  robots_txt?: string;
  verification?: Array<{ provider: string; content: string }>;
}

/** Verification meta tags from the SEO plugin bridge — Google / Bing / etc. */
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
  const [raw, seoMeta] = await Promise.all([fetchSnippets(), fetchSeoMeta()]);
  if (!raw && !seoMeta) return EMPTY;

  const gtmHead    = buildGtmHead(raw.gtm_id || '');
  const gtmBody    = buildGtmBodyStart(raw.gtm_id || '');
  const verifyMeta = buildVerificationMeta(seoMeta?.verification);

  const head      = [verifyMeta, gtmHead, raw.head || ''].filter(Boolean).join('\n');
  const bodyStart = [gtmBody, raw.body_start || ''].filter(Boolean).join('\n');
  const bodyEnd   = (raw.body_end || '').trim();

  return { head, bodyStart, bodyEnd };
}

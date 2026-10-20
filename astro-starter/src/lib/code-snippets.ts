/**
 * Analytics and verification tags for the Astro frontend. Reads the Google Tag
 * Manager container id from /hatch/v1/code-snippets and the search-engine
 * verification tags from /hatch/v1/seo-meta.
 *
 * The markup is built here from validated values only. The frontend never
 * renders raw HTML or script text that arrives from WordPress, so a stored
 * value can never become executable code on the page.
 */

import { WP_API_URL } from 'astro:env/server';
const WP_API = WP_API_URL;

interface RawSnippets {
  gtm_id?: string;
}

export interface CodeSnippets {
  head: string;
  bodyStart: string;
}

const EMPTY: CodeSnippets = { head: '', bodyStart: '' };

/** A Google Tag Manager container id, e.g. GTM-ABC123. Anything else is dropped. */
const GTM_ID = /^GTM-[A-Z0-9]{4,12}$/;
const META_NAME = /^[a-z0-9:._-]{1,64}$/i;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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
  if (!GTM_ID.test(id)) return '';
  return `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');</script>`;
}

function buildGtmBodyStart(id: string): string {
  if (!GTM_ID.test(id)) return '';
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
      if (!META_NAME.test(name)) return '';
      return `<meta name="${escapeAttr(name)}" content="${escapeAttr(String(v.content))}" />`;
    })
    .filter(Boolean)
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
 * Build the head and body-start slots. Called once per request from PageLayout.
 *
 * @returns { head, bodyStart } - markup assembled here from validated values.
 */
export async function getCodeSnippets(): Promise<CodeSnippets> {
  const [raw, seoMeta] = await Promise.all([fetchSnippets(), fetchSeoMeta()]);
  if (!raw && !seoMeta) return EMPTY;

  const gtmId      = String(raw.gtm_id || '').trim().toUpperCase();
  const head       = [buildVerificationMeta(seoMeta?.verification), buildGtmHead(gtmId)].filter(Boolean).join('\n');
  const bodyStart  = buildGtmBodyStart(gtmId);

  return { head, bodyStart };
}

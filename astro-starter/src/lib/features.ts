/**
 * Hatch features client — fetches /hatch/v1/features at request time and
 * caches the response in-memory for 60s. Used by every page to decide:
 *   - which theme layout to render (blog / tech / docs)
 *   - which feature toggles are on (TOC, related, share, breadcrumbs, …)
 *   - what site title + tagline to show (from WP General Settings)
 *   - whether the WP "static front page" setting overrides Hatch's homepage
 *
 * Server-only — never import this in browser-side code.
 */

const WP_API = import.meta.env.WP_API_URL;
const WP_USER = import.meta.env.WP_API_USER;
const WP_PASS = import.meta.env.WP_API_PASS;

const auth =
  WP_USER && WP_PASS
    ? 'Basic ' + Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64')
    : '';

const headers: Record<string, string> = auth ? { Authorization: auth } : {};

export interface HatchSite {
  name: string;
  description: string;
  url: string;
  language: string;
  icon_url: string;
  logo_url: string;
}

export interface HatchHome {
  mode: 'posts' | 'page';
  static_page_slug: string;
  static_page_id: number;
}

export interface HatchCpt {
  slug: string;
  rest_base: string;
  label: string;
  singular: string;
}

export interface HatchSeoIntegration {
  detected: { slug: string; label: string; active: boolean };
  mode: 'auto' | 'yoast' | 'rankmath' | 'seopress' | 'aioseo' | 'off';
  schema: boolean;
  sitemap: boolean;
}

export interface HatchFormsIntegration {
  detected: { slug: string; label: string; active: boolean };
  mode: 'auto' | 'fluent_forms' | 'wpforms' | 'gravity' | 'off';
  default_form_id: number;
}

export interface HatchTurnstile {
  enabled: boolean;
  site_key: string;
}

export interface HatchCommentsIntegration {
  enabled: boolean;
  require_login: boolean;
  moderate: boolean;
  turnstile: boolean;
}

export interface HatchIntegrations {
  seo: HatchSeoIntegration;
  forms: HatchFormsIntegration;
  turnstile: HatchTurnstile;
  comments: HatchCommentsIntegration;
}

export interface HatchDesign {
  brand: {
    name: string;
    primary: string;
    accent: string;
    fg: string;
    bg: string;
    font_heading: string;
    font_body: string;
    font_mono: string;
    mode: 'light' | 'dark' | 'auto';
  };
  layout: {
    density: 'compact' | 'comfortable' | 'spacious';
    rounded: 'sharp' | 'smooth' | 'extra';
    max_width: '720' | '1080' | '1280';
  };
  voice: {
    tone: 'professional' | 'casual' | 'playful';
    pronouns: 'we' | 'I' | 'you';
  };
  /** Layout templates per page type — controlled via design.md `templates:` block. */
  templates: {
    single_sidebar: 'right' | 'left' | 'none';
    single_hero: 'featured' | 'compact' | 'none';
    single_width: 'narrow' | 'medium' | 'wide';
    archive_grid: '1' | '2' | '3';
    archive_card_style: 'default' | 'minimal' | 'text';
    archive_excerpt: 'true' | 'false';
    not_found_search: 'true' | 'false';
  };
}

export interface HatchFeatures {
  theme: 'blog' | 'tech' | 'docs' | 'astropaper' | 'astrowind' | 'astronano';
  design: HatchDesign | null;
  features: Record<string, boolean>;
  site: HatchSite;
  home: HatchHome;
  cpts: HatchCpt[];
  integrations: HatchIntegrations | null;
  image_proxy_url: string;
  version: string;
}

const INTEGRATIONS_FALLBACK: HatchIntegrations = {
  seo: { detected: { slug: 'none', label: 'None', active: false }, mode: 'auto', schema: true, sitemap: true },
  forms: { detected: { slug: 'none', label: 'None', active: false }, mode: 'auto', default_form_id: 0 },
  turnstile: { enabled: false, site_key: '' },
  comments: { enabled: true, require_login: false, moderate: true, turnstile: true },
};

const DESIGN_FALLBACK: HatchDesign = {
  brand: {
    name: '',
    primary: '#ff6b35',
    accent: '#0a0a0a',
    fg: '#0a0a0a',
    bg: '#ffffff',
    font_heading: 'Inter',
    font_body: 'Inter',
    font_mono: 'JetBrains Mono',
    mode: 'auto',
  },
  layout: { density: 'comfortable', rounded: 'smooth', max_width: '1080' },
  voice: { tone: 'professional', pronouns: 'we' },
  templates: {
    single_sidebar: 'right',
    single_hero: 'featured',
    single_width: 'medium',
    archive_grid: '2',
    archive_card_style: 'default',
    archive_excerpt: 'true',
    not_found_search: 'true',
  },
};

// Sensible defaults if WP is unreachable — keeps the build from crashing.
const FALLBACK: HatchFeatures = {
  theme: 'blog',
  design: DESIGN_FALLBACK,
  features: {},
  site: {
    name: 'Hatch',
    description: 'Headless WordPress, powered by Hatch.',
    url: import.meta.env.PUBLIC_SITE_URL || '',
    language: 'en-US',
    icon_url: '',
    logo_url: '',
  },
  home: { mode: 'posts', static_page_slug: '', static_page_id: 0 },
  cpts: [],
  integrations: INTEGRATIONS_FALLBACK,
  image_proxy_url: '',
  version: '',
};

let cached: { data: HatchFeatures; expires: number } | null = null;
const CACHE_TTL_MS = 60 * 1000;

export async function getFeatures(): Promise<HatchFeatures> {
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  if (!WP_API) {
    console.warn('[hatch] WP_API_URL not set — using fallback features');
    return FALLBACK;
  }
  try {
    // /hatch/v1/features lives under the same WP root as wp/v2 — strip /wp/v2
    // off the configured base to find the Hatch namespace.
    const base = WP_API.replace(/\/wp\/v2\/?$/, '');
    const res = await fetch(`${base}/hatch/v1/features`, {
      headers,
      // Don't let WP's own cache hand us stale data — we cache here in-process.
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn('[hatch] /features returned', res.status, '— using fallback');
      return FALLBACK;
    }
    const data = (await res.json()) as HatchFeatures;
    // Merge with fallback so missing keys don't break templates.
    const merged: HatchFeatures = {
      theme: data.theme || FALLBACK.theme,
      design: data.design
        ? {
            brand:     { ...DESIGN_FALLBACK.brand,     ...(data.design.brand     || {}) },
            layout:    { ...DESIGN_FALLBACK.layout,    ...(data.design.layout    || {}) },
            voice:     { ...DESIGN_FALLBACK.voice,     ...(data.design.voice     || {}) },
            templates: { ...DESIGN_FALLBACK.templates, ...(data.design.templates || {}) },
          }
        : DESIGN_FALLBACK,
      features: { ...FALLBACK.features, ...(data.features || {}) },
      site: { ...FALLBACK.site, ...(data.site || {}) },
      home: { ...FALLBACK.home, ...(data.home || {}) },
      cpts: Array.isArray(data.cpts) ? data.cpts : [],
      integrations: data.integrations
        ? {
            seo:       { ...INTEGRATIONS_FALLBACK.seo,       ...(data.integrations.seo || {}) },
            forms:     { ...INTEGRATIONS_FALLBACK.forms,     ...(data.integrations.forms || {}) },
            turnstile: { ...INTEGRATIONS_FALLBACK.turnstile, ...(data.integrations.turnstile || {}) },
            comments:  { ...INTEGRATIONS_FALLBACK.comments,  ...(data.integrations.comments || {}) },
          }
        : INTEGRATIONS_FALLBACK,
      image_proxy_url: data.image_proxy_url || '',
      version: data.version || '',
    };
    cached = { data: merged, expires: Date.now() + CACHE_TTL_MS };
    return merged;
  } catch (err) {
    console.warn('[hatch] /features fetch failed:', (err as Error).message);
    return FALLBACK;
  }
}

/**
 * Convenience: is the given feature toggle ON? Returns false if missing.
 */
export function hasFeature(features: HatchFeatures, key: string): boolean {
  return Boolean(features.features?.[key]);
}

/**
 * Build an optimized image URL via the Hatch image proxy when available.
 *
 * Falls back to the original URL when no proxy is configured, so pages always
 * render — you just lose the WebP/AVIF conversion and resize.
 *
 * @param features  Live features object (contains image_proxy_url).
 * @param src       Original image URL (from WP media library or elsewhere).
 * @param opts      Optional resize + format. Defaults: format=webp, q=82.
 */
export function imgSrc(
  features: HatchFeatures,
  src: string,
  opts: { w?: number; h?: number; format?: 'webp' | 'avif'; q?: number } = {}
): string {
  const proxy = features.image_proxy_url?.trim();
  if (!proxy || !src) return src;

  // Detect same-domain (enterprise pattern): when proxy URL matches the
  // frontend origin, emit a relative /img path so the browser stays on a
  // single origin. The Astro /img endpoint then proxies to the actual backend.
  const frontendOrigin = (features.site.url || '').replace(/\/$/, '');
  const proxyOrigin = proxy.replace(/\/$/, '');
  const sameDomain = frontendOrigin && proxyOrigin === frontendOrigin;

  const params = new URLSearchParams();
  params.set('url', src);
  if (opts.w) params.set('w', String(opts.w));
  if (opts.h) params.set('h', String(opts.h));
  params.set('format', opts.format ?? 'webp');
  if (opts.q) params.set('q', String(opts.q));

  if (sameDomain) {
    return `/img?${params.toString()}`;
  }
  return `${proxyOrigin}/img?${params.toString()}`;
}

/**
 * Rewrite every <img src="..."> inside an HTML blob to go through the Hatch
 * image proxy. Use this on post.content / page.content so author-uploaded
 * images get the same WebP/AVIF treatment as featured images.
 *
 * No-op when no proxy is configured. Skips data: URLs and already-proxied
 * URLs (idempotent).
 */
export function rewriteContentImages(html: string, features: HatchFeatures, maxWidth = 1200): string {
  const proxy = features.image_proxy_url?.trim();
  if (!proxy || !html) return html;
  const proxyHost = proxy.replace(/\/$/, '');
  return html.replace(/<img\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
    if (src.startsWith('data:') || src.startsWith(proxyHost)) return match;
    const proxied = imgSrc(features, src, { w: maxWidth, format: 'webp' });
    const hasLoading = /\bloading=/i.test(before + after);
    const hasDecoding = /\bdecoding=/i.test(before + after);
    const extra = `${hasLoading ? '' : ' loading="lazy"'}${hasDecoding ? '' : ' decoding="async"'}`;
    return `<img${before}src="${proxied}"${after}${extra}>`;
  });
}

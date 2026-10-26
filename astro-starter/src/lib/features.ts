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

import { WP_API_URL, WP_API_USER, WP_API_PASS } from 'astro:env/server';
import { DEFAULT_SITE_NAME, siteName, siteDescription } from './site';
const WP_API = WP_API_URL;
const WP_USER = WP_API_USER;
const WP_PASS = WP_API_PASS;

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

export interface HatchWooPage {
  id: number;
  slug: string;
  url: string;
  /** Site-relative path of the page as WordPress serves it, no trailing slash. Empty when unset. */
  path: string;
}

/** Capability snapshot from WP. Shop, cart and account UI render only when `active`. */
export interface HatchWooCommerce {
  active: boolean;
  pages: {
    shop: HatchWooPage;
    cart: HatchWooPage;
    checkout: HatchWooPage;
    myaccount: HatchWooPage;
  };
}

export interface HatchHome {
  mode: 'posts' | 'page';
  static_page_slug: string;
  static_page_id: number;
  /**
   * WP Reading → "Posts page". NOT emitted by the current /hatch/v1/features
   * route (Hatch_Features::route_features only sends mode, static_page_slug and
   * static_page_id), so it is always absent today. Consumers treat absence as
   * "no posts page assigned" (see archiveUrl() in url-builder.ts).
   */
  posts_page_id?: number;
  /** Slug of the Posts page. Absent under the same conditions as posts_page_id. */
  posts_page_slug?: string;
}

export interface HatchCpt {
  slug: string;
  rest_base: string;
  label: string;
  singular: string;
}

export interface HatchSeoIntegration {
  detected: { slug: string; label: string; active: boolean };
  // Slug catalog matches Hatch_Detector::KNOWN keys — RankMath > Yoast.
  // 'seopress' / 'aioseo' were removed in v0.5.5 because they were emitted
  // by detect_seo() without ever being registered as providers anywhere.
  mode: 'auto' | 'rankmath' | 'yoast' | 'off';
  schema: boolean;
  sitemap: boolean;
}

export interface HatchFormsIntegration {
  detected: { slug: string; label: string; active: boolean };
  // Slug catalog matches Hatch_Detector::KNOWN keys — 'gravity_forms' (never
  // 'gravity'), plus 'wpforms_pro' + 'cf7' now recognised. Priority order:
  // WPForms > WPForms Pro > Fluent Forms > Gravity Forms > CF7.
  mode: 'auto' | 'wpforms' | 'wpforms_pro' | 'fluent_forms' | 'gravity_forms' | 'cf7' | 'off';
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
    max_width: '720' | '1160' | '1320';
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
  /**
   * v0.50.20 — hydrated from hatch_design_borders by Hatch_Features::route_features.
   * Absent on the client-side fallback; designToCssVars() supplies the same defaults.
   */
  borders?: { color: string; shadow: string };
  /** v0.50.20 — hydrated from hatch_design_breakpoints (px). Absent on the fallback. */
  breakpoints?: { mobile: number; tablet: number; desktop: number };
}

// v0.50.15 — Aesthetic option groups exposed by /hatch/v1/features.
// Defaults always merged server-side so every key is present.
export interface HatchAesthetic {
  share: {
    x: boolean; linkedin: boolean; whatsapp: boolean; copy: boolean;
    facebook: boolean; reddit: boolean; email: boolean;
    position: 'inline' | 'sticky' | 'both';
  };
  header: {
    sticky: 'sticky' | 'static' | 'hide_on_scroll';
    blur: boolean;
    brand_mark: 'icon_text' | 'text' | 'initial';
    /** v0.50.31 — Logo / Text / Both / Auto. Drives SiteHeader brand cell. */
    brand_display: 'auto' | 'logo' | 'text' | 'both';
  };
  reading: {
    date_format: 'long' | 'short' | 'relative';
    reading_time_label: 'min_read' | 'mins' | 'hidden';
    breadcrumb_separator: 'slash' | 'chevron' | 'arrow';
    toc_depth: 'h2' | 'h2_h3' | 'h2_h3_h4';
    toc_label: string;
    author_avatar_shape: 'circle' | 'rounded' | 'square';
    progress_bar_position: 'top' | 'bottom';
    progress_bar_color: 'primary' | 'accent';
    heading_anchors: boolean;
  };
  images: {
    lightbox: boolean; lazy_load: boolean; hover_zoom: boolean;
    fallback_gradient: boolean; retina_2x: boolean;
    aspect_ratio: '2_1' | '3_1' | '16_9';
  };
  animation: { page_transitions: boolean; respect_reduced_motion: boolean; };
  blog_index: {
    archive_grid: '1' | '2' | '3' | '4';
    pagination_style: 'load_more' | 'numbered' | 'infinite';
    show_hero: boolean; show_topics: boolean;
  };
  post_navigation: { related_count: number; related_source: 'category' | 'tags' | 'mixed'; };
  /** Not emitted by the current WP route; see HatchSidebarWidget. */
  sidebar?: { position: 'left' | 'right' | 'none'; widgets: HatchSidebarWidget[] };
}

/**
 * Sidebar widget config, read by components/Sidebar.astro. NOT emitted by the
 * current /hatch/v1/features route, so `aesthetic.sidebar` is always absent
 * today and Sidebar.astro falls back to the caller's defaultWidgets.
 */
export type HatchSidebarWidget =
  | { type: 'categories'; title?: string }
  | { type: 'recent_posts'; title?: string; count?: number }
  | { type: 'tags'; title?: string; max?: number }
  | { type: 'custom_html'; title?: string; html?: string };

/** v0.50.31 — Runtime perf controls honored by PageLayout + middleware. */
export interface HatchPerf {
  image_proxy: boolean;
  prefetch_enabled: boolean;
  prefetch_strategy: 'hover' | 'tap' | 'viewport' | 'load';
  compress_html: boolean;
  telemetry: boolean;
  image_layout: 'constrained' | 'fixed' | 'full-width' | 'none';
  // Build-time keys (read-only at runtime). Astro reads them from
  // astro.config.mjs at next build. Surfaced here so admin can show their
  // current value.
  image_service: 'sharp' | 'squoosh' | 'passthrough' | 'cloudflare';
  output_mode: 'server' | 'static' | 'hybrid';
  inline_stylesheets: 'always' | 'never' | 'auto';
}

export interface HatchFeatures {
  theme: 'blog' | 'tech' | 'docs' | 'astropaper' | 'astrowind' | 'astronano';
  design: HatchDesign | null;
  aesthetic: HatchAesthetic;
  content?: { comments_enabled: boolean; comments_turnstile: boolean; accounts_enabled: boolean; registration_open: boolean };
  perf: HatchPerf;
  features: Record<string, boolean>;
  site: HatchSite;
  home: HatchHome;
  cpts: HatchCpt[];
  integrations: HatchIntegrations | null;
  woocommerce: HatchWooCommerce;
  image_proxy_url: string;
  version: string;
}

const PERF_FALLBACK: HatchPerf = {
  image_proxy: true,
  prefetch_enabled: true,
  prefetch_strategy: 'hover',
  compress_html: true,
  telemetry: false,
  image_layout: 'constrained',
  image_service: 'sharp',
  output_mode: 'server',
  inline_stylesheets: 'auto',
};

const INTEGRATIONS_FALLBACK: HatchIntegrations = {
  seo: { detected: { slug: 'none', label: 'None', active: false }, mode: 'auto', schema: true, sitemap: true },
  forms: { detected: { slug: 'none', label: 'None', active: false }, mode: 'auto', default_form_id: 0 },
  turnstile: { enabled: false, site_key: '' },
  comments: { enabled: true, require_login: false, moderate: true, turnstile: true },
};

const DESIGN_FALLBACK: HatchDesign = {
  brand: {
    name: '',
    primary: '#7ebc11',
    accent: '#0a0a0a',
    fg: '#0a0a0a',
    bg: '#ffffff',
    font_heading: 'Inter',
    font_body: 'Inter',
    font_mono: 'JetBrains Mono',
    mode: 'auto',
  },
  layout: { density: 'comfortable', rounded: 'smooth', max_width: '1160' },
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

const AESTHETIC_FALLBACK: HatchAesthetic = {
  share: { x: true, linkedin: true, whatsapp: true, copy: true, facebook: false, reddit: false, email: false, position: 'inline' },
  header: { sticky: 'sticky', blur: true, brand_mark: 'icon_text', brand_display: 'auto' },
  reading: { date_format: 'long', reading_time_label: 'min_read', breadcrumb_separator: 'slash', toc_depth: 'h2_h3', toc_label: 'On this page', author_avatar_shape: 'circle', progress_bar_position: 'top', progress_bar_color: 'primary', heading_anchors: false },
  images: { lightbox: true, lazy_load: true, hover_zoom: true, fallback_gradient: true, retina_2x: true, aspect_ratio: '2_1' },
  animation: { page_transitions: true, respect_reduced_motion: true },
  blog_index: { archive_grid: '3', pagination_style: 'load_more', show_hero: true, show_topics: true },
  post_navigation: { related_count: 3, related_source: 'category' },
};

const EMPTY_WOO_PAGE: HatchWooPage = { id: 0, slug: '', url: '', path: '' };

const WOO_FALLBACK: HatchWooCommerce = {
  active: false,
  pages: {
    shop: EMPTY_WOO_PAGE,
    cart: EMPTY_WOO_PAGE,
    checkout: EMPTY_WOO_PAGE,
    myaccount: EMPTY_WOO_PAGE,
  },
};

function mergeWoo(raw: unknown): HatchWooCommerce {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<HatchWooCommerce>;
  if (!src.active) return WOO_FALLBACK;
  const page = (p: unknown): HatchWooPage => {
    const o = (p && typeof p === 'object' ? p : {}) as Partial<HatchWooPage>;
    const id = Number(o.id) || 0;
    // An id of 0 or less means WooCommerce has no page for this role.
    if (id <= 0) return EMPTY_WOO_PAGE;
    const slug = String(o.slug || '').replace(/^\/+|\/+$/g, '');
    const url = String(o.url || '');
    let path = '';
    try {
      // The permalink carries the full path, including parent pages and
      // non-ASCII slugs, which a bare post_name cannot.
      path = new URL(url, 'http://placeholder.invalid').pathname.replace(/\/+$/, '');
    } catch {
      path = '';
    }
    if (!path && slug) path = '/' + slug;
    return { id, slug, url, path };
  };
  const pages = (src.pages || {}) as Partial<HatchWooCommerce['pages']>;
  return {
    active: true,
    pages: {
      shop: page(pages.shop),
      cart: page(pages.cart),
      checkout: page(pages.checkout),
      myaccount: page(pages.myaccount),
    },
  };
}

// Sensible defaults if WP is unreachable — keeps the build from crashing.
const FALLBACK: HatchFeatures = {
  theme: 'blog',
  design: DESIGN_FALLBACK,
  aesthetic: AESTHETIC_FALLBACK,
  perf: PERF_FALLBACK,
  features: {},
  site: {
    name: DEFAULT_SITE_NAME,
    description: '',
    url: import.meta.env.PUBLIC_SITE_URL || '',
    language: 'en-US',
    icon_url: '',
    logo_url: '',
  },
  home: { mode: 'posts', static_page_slug: '', static_page_id: 0 },
  cpts: [],
  integrations: INTEGRATIONS_FALLBACK,
  woocommerce: WOO_FALLBACK,
  image_proxy_url: '',
  version: '',
  // v0.5.7 — ensure comments render by default when /features fetch fails.
  content: { comments_enabled: true, comments_turnstile: false, accounts_enabled: false, registration_open: false },
} as HatchFeatures;

let cached: { data: HatchFeatures; expires: number } | null = null;
const CACHE_TTL_MS = 60 * 1000;
// v0.5.8 — in-flight dedupe. Under concurrent SSR (10+ page loads at once)
// the same /features fetch would fire N times, saturate WP, and time out —
// showing FALLBACK instead of real theme tokens. Coalesce to one in-flight
// request; every caller in the same tick awaits the same promise.
let inflight: Promise<HatchFeatures> | null = null;
const FETCH_TIMEOUT_MS = 5000;

/**
 * Drop the in-memory features cache. Called by the revalidate webhook so a
 * WP admin save (toggle a feature, change brand color, swap theme) reaches
 * the live site on the very next request — no 60s wait. The Astro starter
 * runs as a single Node process per region (CF Workers reuses isolates
 * with their own cache, Vercel re-instantiates per function), so module
 * scope is a deliberate per-instance cache, not a shared store.
 */
export function clearFeaturesCache(): void {
  cached = null;
}

/**
 * True when WordPress could not be reached and these are the built-in
 * defaults. Pages served from defaults must never be edge-cached, otherwise a
 * short WP outage freezes the wrong theme into the CDN.
 */
export function isFallbackFeatures(features: HatchFeatures): boolean {
  return features === FALLBACK;
}

export async function getFeatures(): Promise<HatchFeatures> {
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  if (!WP_API) {
    console.warn('[hatch] WP_API_URL not set — using fallback features');
    return FALLBACK;
  }
  if (inflight) return inflight;
  inflight = (async () => {
  try {
    // /hatch/v1/features lives under the same WP root as wp/v2 — strip /wp/v2
    // off the configured base to find the Hatch namespace.
    const base = WP_API.replace(/\/wp\/v2\/?$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(`${base}/hatch/v1/features`, {
      headers,
      // Don't let WP's own cache hand us stale data — we cache here in-process.
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
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
            brand:       { ...DESIGN_FALLBACK.brand,     ...(data.design.brand     || {}) },
            layout:      { ...DESIGN_FALLBACK.layout,    ...(data.design.layout    || {}) },
            voice:       { ...DESIGN_FALLBACK.voice,     ...(data.design.voice     || {}) },
            templates:   { ...DESIGN_FALLBACK.templates, ...(data.design.templates || {}) },
            // v0.50.20 — preserve borders + breakpoints so designToCssVars()
            // can emit --hatch-border-color, --hatch-shadow, --hatch-bp-*.
            borders:     { color: '#e5e5e5', shadow: 'soft',                 ...(data.design.borders     || {}) },
            breakpoints: { mobile: 640, tablet: 1024, desktop: 1280,         ...(data.design.breakpoints || {}) },
          }
        : DESIGN_FALLBACK,
      aesthetic: {
        share:           { ...AESTHETIC_FALLBACK.share,           ...((data.aesthetic && data.aesthetic.share)           || {}) },
        header:          { ...AESTHETIC_FALLBACK.header,          ...((data.aesthetic && data.aesthetic.header)          || {}) },
        reading:         { ...AESTHETIC_FALLBACK.reading,         ...((data.aesthetic && data.aesthetic.reading)         || {}) },
        images:          { ...AESTHETIC_FALLBACK.images,          ...((data.aesthetic && data.aesthetic.images)          || {}) },
        animation:       { ...AESTHETIC_FALLBACK.animation,       ...((data.aesthetic && data.aesthetic.animation)       || {}) },
        blog_index:      { ...AESTHETIC_FALLBACK.blog_index,      ...((data.aesthetic && data.aesthetic.blog_index)      || {}) },
        post_navigation: { ...AESTHETIC_FALLBACK.post_navigation, ...((data.aesthetic && data.aesthetic.post_navigation) || {}) },
      },
      // v0.50.31 — Merge perf block from /features so PageLayout + middleware
      // can honor prefetch / compress_html / telemetry / image_layout
      // at request time. Falls back to defaults if WP plugin is older.
      perf: { ...PERF_FALLBACK, ...(data.perf || {}) },
      features: { ...FALLBACK.features, ...(data.features || {}) },
      site: (() => {
        const merged = { ...FALLBACK.site, ...(data.site || {}) };
        // Normalise once so every consumer sees the same values: entities
        // decoded, whitespace-only counts as empty, an empty name becomes
        // "Your Site", and an empty description stays empty.
        merged.name = siteName({ name: merged.name });
        merged.description = siteDescription({ description: merged.description });
        // v0.5.9 — allow deploy-time override of site.url (e.g. when WP is
        // behind a tunnel with siteurl=localhost, but the public frontend
        // lives at a CF Worker URL). Canonical + og:url use this.
        const override = (import.meta.env.PUBLIC_SITE_URL as string | undefined) || '';
        if (override) merged.url = override.replace(/\/$/, '');
        return merged;
      })(),
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
      woocommerce: mergeWoo((data as { woocommerce?: unknown }).woocommerce),
      image_proxy_url: data.image_proxy_url || '',
      version: data.version || '',
      // v0.5.7 — content block (comments_enabled, comments_turnstile) was
      // missing from the merge. That silently dropped WP's per-site
      // Discussion toggle → deployed Astro always thought comments were
      // off → HatchComments never rendered even when integration + WP
      // Discussion both had comments enabled.
      content: (data as any).content
        ? {
            comments_enabled:   !!(data as any).content.comments_enabled,
            comments_turnstile: !!(data as any).content.comments_turnstile,
            accounts_enabled:   !!(data as any).content.accounts_enabled,
            registration_open:  !!(data as any).content.registration_open,
          }
        : { comments_enabled: true, comments_turnstile: false, accounts_enabled: false, registration_open: false },
    };
    cached = { data: merged, expires: Date.now() + CACHE_TTL_MS };
    return merged;
  } catch (err) {
    console.warn('[hatch] /features fetch failed:', (err as Error).message);
    return FALLBACK;
  }
  })().finally(() => { inflight = null; });
  return inflight;
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
  // The page template already renders the title as the one H1, so any H1 an
  // author put inside the body is demoted to H2 (keeps one H1 and no heading skips).
  if (html) html = html.replace(/<h1\b/gi, '<h2').replace(/<\/h1>/gi, '</h2>');
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

// v0.5.7 — safe stub for renderHatchPostsBlocks: returns HTML unchanged.
// Removed unintentionally during a bad merge; the WP-static-homepage mode
// (features.home.mode === 'page') is the only caller and just needs the
// html back so `set:html` still injects the page content. Full block
// server-render is a v0.6 nice-to-have; the pass-through is honest.
export async function renderHatchPostsBlocks(html: string, _features: HatchFeatures): Promise<string> {
  return html;
}

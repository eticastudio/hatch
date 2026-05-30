/**
 * Hatch features client — fetches /hatch/v1/features and caches via Next.js
 * unstable_cache so every request inside the 60s window reuses one fetch.
 *
 * Mirrors the Astro starter's shapes 1:1 so components can be ported without
 * shape changes.
 */
import { unstable_cache, revalidateTag } from 'next/cache';
import { wpJsonBase } from './hatch';

export interface HatchSite { name: string; description: string; url: string; language: string; icon_url: string; logo_url: string; }
export interface HatchHome { mode: 'posts' | 'page'; static_page_slug: string; static_page_id: number; }
export interface HatchCpt { slug: string; rest_base: string; label: string; singular: string; }

export interface HatchDesign {
  brand: { name: string; primary: string; accent: string; fg: string; bg: string; font_heading: string; font_body: string; font_mono: string; mode: 'light' | 'dark' | 'auto'; };
  layout: { density: 'compact' | 'comfortable' | 'spacious'; rounded: 'sharp' | 'smooth' | 'extra'; max_width: '720' | '1080' | '1280' | string; };
  voice: { tone: string; pronouns: string; };
  templates: {
    single_sidebar: 'right' | 'left' | 'none';
    single_hero: 'featured' | 'compact' | 'none';
    single_width: 'narrow' | 'medium' | 'wide';
    archive_grid: '1' | '2' | '3';
    archive_card_style: string;
    archive_excerpt: string;
    not_found_search: string;
  };
  borders?: { color?: string; shadow?: string };
  breakpoints?: { mobile?: number; tablet?: number; desktop?: number };
}

export interface HatchAesthetic {
  share: { x: boolean; linkedin: boolean; whatsapp: boolean; copy: boolean; facebook: boolean; reddit: boolean; email: boolean; position: 'inline' | 'sticky' | 'both' };
  header: { sticky: 'sticky' | 'static' | 'hide_on_scroll'; blur: boolean; color_mode_button: boolean; brand_mark: 'icon_text' | 'text' | 'initial'; brand_display: 'auto' | 'logo' | 'text' | 'both' };
  reading: { date_format: 'long' | 'short' | 'relative'; reading_time_label: 'min_read' | 'mins' | 'hidden'; breadcrumb_separator: 'slash' | 'chevron' | 'arrow'; toc_depth: 'h2' | 'h2_h3' | 'h2_h3_h4'; toc_label: string; author_avatar_shape: 'circle' | 'rounded' | 'square'; progress_bar_position: 'top' | 'bottom'; progress_bar_color: 'primary' | 'accent'; heading_anchors: boolean };
  images: { lightbox: boolean; lazy_load: boolean; hover_zoom: boolean; fallback_gradient: boolean; retina_2x: boolean; aspect_ratio: '2_1' | '3_1' | '16_9' };
  animation: { page_transitions: boolean; respect_reduced_motion: boolean };
  blog_index: { archive_grid: '1' | '2' | '3' | '4'; pagination_style: 'load_more' | 'numbered' | 'infinite'; show_hero: boolean; show_topics: boolean };
  post_navigation: { related_count: number; related_source: 'category' | 'tags' | 'mixed' };
}

export interface HatchPerf {
  image_proxy: boolean; prefetch_enabled: boolean; prefetch_strategy: string;
  partytown: boolean; compress_html: boolean; telemetry: boolean;
  image_layout: string; image_service: string; output_mode: string; inline_stylesheets: string;
}

export interface HatchFeatures {
  theme: 'blog' | 'tech' | 'docs' | 'astropaper' | 'astrowind' | 'astronano';
  design: HatchDesign | null;
  aesthetic: HatchAesthetic;
  perf: HatchPerf;
  features: Record<string, boolean>;
  site: HatchSite;
  home: HatchHome;
  cpts: HatchCpt[];
  integrations: any;
  image_proxy_url: string;
  version: string;
}

const DESIGN_FALLBACK: HatchDesign = {
  brand: { name: '', primary: '#ff6b35', accent: '#0a0a0a', fg: '#0a0a0a', bg: '#ffffff', font_heading: 'Inter', font_body: 'Inter', font_mono: 'JetBrains Mono', mode: 'light' },
  layout: { density: 'comfortable', rounded: 'smooth', max_width: '1080' },
  voice: { tone: 'professional', pronouns: 'we' },
  templates: { single_sidebar: 'right', single_hero: 'featured', single_width: 'medium', archive_grid: '2', archive_card_style: 'default', archive_excerpt: 'true', not_found_search: 'true' },
  borders: { color: '#e5e5e5', shadow: 'soft' },
  breakpoints: { mobile: 640, tablet: 1024, desktop: 1280 },
};

const AESTHETIC_FALLBACK: HatchAesthetic = {
  share: { x: true, linkedin: true, whatsapp: true, copy: true, facebook: false, reddit: false, email: false, position: 'inline' },
  header: { sticky: 'sticky', blur: true, color_mode_button: true, brand_mark: 'icon_text', brand_display: 'auto' },
  reading: { date_format: 'long', reading_time_label: 'min_read', breadcrumb_separator: 'slash', toc_depth: 'h2_h3', toc_label: 'On this page', author_avatar_shape: 'circle', progress_bar_position: 'top', progress_bar_color: 'primary', heading_anchors: false },
  images: { lightbox: true, lazy_load: true, hover_zoom: true, fallback_gradient: true, retina_2x: true, aspect_ratio: '2_1' },
  animation: { page_transitions: true, respect_reduced_motion: true },
  blog_index: { archive_grid: '3', pagination_style: 'load_more', show_hero: true, show_topics: true },
  post_navigation: { related_count: 3, related_source: 'category' },
};

const PERF_FALLBACK: HatchPerf = {
  image_proxy: true, prefetch_enabled: true, prefetch_strategy: 'hover',
  partytown: false, compress_html: true, telemetry: false,
  image_layout: 'constrained', image_service: 'sharp', output_mode: 'server', inline_stylesheets: 'auto',
};

const FALLBACK: HatchFeatures = {
  theme: 'blog',
  design: DESIGN_FALLBACK,
  aesthetic: AESTHETIC_FALLBACK,
  perf: PERF_FALLBACK,
  features: {},
  site: { name: 'Hatch', description: 'Headless WordPress, powered by Hatch.', url: process.env.NEXT_PUBLIC_SITE_URL || '', language: 'en-US', icon_url: '', logo_url: '' },
  home: { mode: 'posts', static_page_slug: '', static_page_id: 0 },
  cpts: [],
  integrations: null,
  image_proxy_url: '',
  version: '',
};

const FEATURES_TAG = 'hatch:features';

async function fetchFeatures(): Promise<HatchFeatures> {
  const base = wpJsonBase();
  if (!base) {
    console.warn('[hatch] HATCH_WP_API_URL not set — using fallback features');
    return FALLBACK;
  }
  try {
    const res = await fetch(`${base}/hatch/v1/features`, {
      next: { revalidate: 60, tags: [FEATURES_TAG] },
    });
    if (!res.ok) {
      console.warn('[hatch] /features returned', res.status, '— using fallback');
      return FALLBACK;
    }
    const data = (await res.json()) as HatchFeatures;
    return {
      theme: data.theme || FALLBACK.theme,
      design: data.design
        ? {
            brand: { ...DESIGN_FALLBACK.brand, ...(data.design.brand || {}) },
            layout: { ...DESIGN_FALLBACK.layout, ...(data.design.layout || {}) },
            voice: { ...DESIGN_FALLBACK.voice, ...(data.design.voice || {}) },
            templates: { ...DESIGN_FALLBACK.templates, ...(data.design.templates || {}) },
            borders: { ...DESIGN_FALLBACK.borders, ...((data.design as any).borders || {}) },
            breakpoints: { ...DESIGN_FALLBACK.breakpoints, ...((data.design as any).breakpoints || {}) },
          }
        : DESIGN_FALLBACK,
      aesthetic: {
        share: { ...AESTHETIC_FALLBACK.share, ...(data.aesthetic?.share || {}) },
        header: { ...AESTHETIC_FALLBACK.header, ...(data.aesthetic?.header || {}) },
        reading: { ...AESTHETIC_FALLBACK.reading, ...(data.aesthetic?.reading || {}) },
        images: { ...AESTHETIC_FALLBACK.images, ...(data.aesthetic?.images || {}) },
        animation: { ...AESTHETIC_FALLBACK.animation, ...(data.aesthetic?.animation || {}) },
        blog_index: { ...AESTHETIC_FALLBACK.blog_index, ...(data.aesthetic?.blog_index || {}) },
        post_navigation: { ...AESTHETIC_FALLBACK.post_navigation, ...(data.aesthetic?.post_navigation || {}) },
      },
      perf: { ...PERF_FALLBACK, ...(data.perf || {}) },
      features: { ...FALLBACK.features, ...(data.features || {}) },
      site: { ...FALLBACK.site, ...(data.site || {}) },
      home: { ...FALLBACK.home, ...(data.home || {}) },
      cpts: Array.isArray(data.cpts) ? data.cpts : [],
      integrations: data.integrations || null,
      image_proxy_url: data.image_proxy_url || '',
      version: data.version || '',
    };
  } catch (err) {
    console.warn('[hatch] /features fetch failed:', (err as Error).message);
    return FALLBACK;
  }
}

export const getFeatures = unstable_cache(fetchFeatures, ['hatch-features-v1'], {
  revalidate: 60,
  tags: [FEATURES_TAG],
});

export function clearFeaturesCache(): void {
  revalidateTag(FEATURES_TAG);
}

export function hasFeature(features: HatchFeatures, key: string): boolean {
  return Boolean(features.features?.[key]);
}

export function imgSrc(
  features: HatchFeatures,
  src: string,
  opts: { w?: number; h?: number; format?: 'webp' | 'avif'; q?: number } = {}
): string {
  const proxy = features.image_proxy_url?.trim();
  if (!proxy || !src) return src;
  const frontendOrigin = (features.site.url || '').replace(/\/$/, '');
  const proxyOrigin = proxy.replace(/\/$/, '');
  const sameDomain = frontendOrigin && proxyOrigin === frontendOrigin;
  const params = new URLSearchParams();
  params.set('url', src);
  if (opts.w) params.set('w', String(opts.w));
  if (opts.h) params.set('h', String(opts.h));
  params.set('format', opts.format ?? 'webp');
  if (opts.q) params.set('q', String(opts.q));
  if (sameDomain) return `/img?${params.toString()}`;
  return `${proxyOrigin}/img?${params.toString()}`;
}

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

/**
 * Convert the HatchDesign block into CSS custom properties. Inlined as a
 * `style` attribute on <html>. Mirrors the Astro starter's design.ts.
 */
export function designToCssVars(design: HatchDesign | null): string {
  if (!design) return '';
  const b = design.brand;
  const l = design.layout;
  const maxW = l.max_width ? `${l.max_width}px` : '1080px';
  const density = l.density === 'compact' ? 0.85 : l.density === 'spacious' ? 1.15 : 1;
  const radius = l.rounded === 'sharp' ? '0' : l.rounded === 'extra' ? '12px' : '6px';
  const borderColor = design.borders?.color || '#e5e5e5';
  return [
    `--hatch-primary:${b.primary}`,
    `--hatch-accent:${b.accent}`,
    `--hatch-fg:${b.fg}`,
    `--hatch-bg:${b.bg}`,
    `--hatch-font-heading:"${b.font_heading}"`,
    `--hatch-font-body:"${b.font_body}"`,
    `--hatch-font-mono:"${b.font_mono}"`,
    `--hatch-max-width:${maxW}`,
    `--hatch-density:${density}`,
    `--hatch-radius:${radius}`,
    `--hatch-border:${borderColor}`,
    `--hatch-border-color:${borderColor}`,
  ].join(';');
}

/**
 * Turn HatchDesign tokens into a single CSS-variable string we drop on
 * <html style="…"> so every component inherits them automatically.
 *
 * Density / rounded / max-width are mapped to numeric scales here so the
 * Astro theme files only have to read CSS vars, no JS.
 */
import type { HatchDesign } from './features';

const DENSITY_SPACE: Record<string, string> = {
  compact: '0.75',
  comfortable: '1',
  spacious: '1.25',
};

const ROUNDED_RADIUS: Record<string, string> = {
  sharp: '4px',
  smooth: '10px',
  extra: '20px',
};

// Per-element button radius — separate from container radius because users
// often want sharp cards but pill buttons (or vice-versa).
const BUTTON_RADIUS: Record<string, string> = {
  pill: '9999px',
  rounded: '10px',
  sharp: '4px',
};

// Tolerate legacy values coming from older `hatch_design_layout` rows that
// were written by the pre-v0.50.14 admin (capitalised labels with units).
const norm = (v: unknown): string => String(v ?? '').toLowerCase().replace(/px$/, '').replace(/\s+/g, '');
const normRounded = (v: unknown): string => {
  const x = norm(v);
  if (x === 'default') return 'smooth';
  if (x === 'extraround') return 'extra';
  return x;
};

// v0.50.20 — borders + breakpoints now emit CSS vars too. The admin UI in
// Global Tokens writes hatch_design_borders + hatch_design_breakpoints, but
// nothing read them. These vars give themes a clean hook + the WP-side
// wp_head sync (in hatch.php) can mirror them.
const SHADOW_MAP: Record<string, string> = {
  none:     'none',
  soft:     '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
  medium:   '0 4px 6px rgba(0,0,0,0.05), 0 10px 15px rgba(0,0,0,0.08)',
  dramatic: '0 20px 25px rgba(0,0,0,0.10), 0 8px 10px rgba(0,0,0,0.04)',
};

export function designToCssVars(design: any | null | undefined): string {
  if (!design) return '';
  const b = design.brand;
  const l: any = design.layout;
  const br: any = design.borders || {};
  const bp: any = design.breakpoints || {};

  const density     = DENSITY_SPACE[norm(l.density)] || DENSITY_SPACE.comfortable;
  const radius      = ROUNDED_RADIUS[normRounded(l.rounded ?? l.roundness)] || ROUNDED_RADIUS.smooth;
  const maxWidth    = norm(l.max_width ?? l.maxWidth) || '1160';
  const buttonStyle = BUTTON_RADIUS[norm(l.button_style ?? l.buttonStyle)] || BUTTON_RADIUS.pill;

  const borderColor = String(br.color || '#e5e5e5');
  const shadowKey   = String(br.shadow || 'soft').toLowerCase();
  const shadow      = SHADOW_MAP[shadowKey] || SHADOW_MAP.soft;

  const bpMobile  = Number(bp.mobile)  || 640;
  const bpTablet  = Number(bp.tablet)  || 1024;
  const bpDesktop = Number(bp.desktop) || 1280;

  const vars: Record<string, string> = {
    '--hatch-primary': b.primary,
    '--hatch-accent': b.accent,
    '--hatch-fg-design': b.fg,
    '--hatch-bg-design': b.bg,
    // v0.50.29 — Single quotes around the font name. Double quotes get
    // HTML-entity-encoded to &quot; when Astro stringifies the style
    // attribute, which the browser can't parse → font silently falls back
    // to system default. Single quotes pass through untouched.
    '--hatch-font-heading': `'${b.font_heading}', ui-sans-serif, system-ui, -apple-system, sans-serif`,
    '--hatch-font-body':    `'${b.font_body}', ui-sans-serif, system-ui, -apple-system, sans-serif`,
    '--hatch-font-mono':    `'${b.font_mono}', ui-monospace, SFMono-Regular, Menlo, monospace`,
    '--hatch-density': density,
    '--hatch-radius': radius,
    '--hatch-button-radius': buttonStyle,
    '--hatch-max-width': `${maxWidth}px`,
    '--hatch-border-color': borderColor,
    '--hatch-shadow': shadow,
    '--hatch-bp-mobile':  `${bpMobile}px`,
    '--hatch-bp-tablet':  `${bpTablet}px`,
    '--hatch-bp-desktop': `${bpDesktop}px`,
  };

  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ');
}

/**
 * Convert "Inter" + "Outfit" into the Google Fonts URL we preload.
 * Falls back to Inter-only if both are the same.
 */
export function designFontHref(design: HatchDesign | null | undefined): string | null {
  if (!design) return null;
  const fonts = new Set<string>();
  for (const f of [design.brand.font_heading, design.brand.font_body]) {
    const trimmed = (f || '').trim();
    if (trimmed && trimmed.toLowerCase() !== 'system-ui') fonts.add(trimmed);
  }
  if (fonts.size === 0) return null;
  const families = Array.from(fonts).map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`);
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

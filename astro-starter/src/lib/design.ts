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

// --- Dark-mode primary pairing ------------------------------------------------
// global.css lifts the brand colour 30% toward white (oklab) in dark mode so
// primary-coloured text clears 4.5:1 on dark surfaces. Solid primary buttons sit
// on that lifted colour, so their label must be chosen against it too. CSS cannot
// pick a text colour by contrast everywhere yet, so it is computed here.
const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
function hexToRgb(hex: string): [number, number, number] | null {
  const m = HEX_RE.exec(String(hex).trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const toLin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const fromLin = (v: number) => { const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; return Math.round(Math.min(1, Math.max(0, c)) * 255); };
function toOklab([r, g, b]: [number, number, number]): [number, number, number] {
  const R = toLin(r), G = toLin(g), B = toLin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function fromOklab([L, a, b]: [number, number, number]): [number, number, number] {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
  return [fromLin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), fromLin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), fromLin(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)];
}
const relLum = ([r, g, b]: [number, number, number]) => 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
/** Text colour (near-black or white) with the higher contrast on the lifted dark-mode primary. */
export function darkPrimaryForeground(primary: string): string | null {
  const rgb = hexToRgb(primary);
  if (!rgb) return null;
  const [L, a, b] = toOklab(rgb);
  const [wl, wa, wb] = toOklab([255, 255, 255]);
  const lifted = fromOklab([L * 0.7 + wl * 0.3, a * 0.7 + wa * 0.3, b * 0.7 + wb * 0.3]);
  const lum = relLum(lifted);
  const onWhite = 1.05 / (lum + 0.05);
  const onDark = (lum + 0.05) / (relLum([11, 13, 16]) + 0.05);
  return onDark >= onWhite ? '#0b0d10' : '#ffffff';
}

/**
 * The Design tab bg/fg pair feeds the themes' LIGHT-mode surface. A preset that
 * stores a dark pair (the Terminal preset does) would otherwise paint a dark
 * page while the light-mode ramps stay light, so the toggle's "light" state came
 * out unreadable. Dark mode has its own hard-coded surface in every theme, so a
 * dark pair is simply not inlined.
 */
function lightSurfacePair(bg: unknown, fg: unknown): Record<string, string> {
  const bgRgb = hexToRgb(String(bg ?? ''));
  const fgRgb = hexToRgb(String(fg ?? ''));
  if (!bgRgb || !fgRgb) return {};
  if (relLum(bgRgb) < 0.4 || relLum(fgRgb) > 0.4) return {};
  return { '--hatch-fg-design': String(fg), '--hatch-bg-design': String(bg) };
}

/** True when the Design tab bg/fg pair is dark-first (see lightSurfacePair). */
function isDarkFirst(bg: unknown, fg: unknown): boolean {
  return Object.keys(lightSurfacePair(bg, fg)).length === 0 && !!hexToRgb(String(bg ?? ''));
}
/**
 * A dark-first preset stores a brand colour tuned for dark surfaces (Terminal:
 * #22d3ee). On the light surface that reads 1.6:1 as text, so darken it in oklab
 * until it clears 5.2:1 against white (leaves headroom for the off-white light surface). Returns the input when it already does.
 */
function readableOnLight(primary: string): string {
  const rgb = hexToRgb(primary);
  if (!rgb) return primary;
  let [L, a, b] = toOklab(rgb);
  for (let i = 0; i < 40; i++) {
    const [r, g, bl] = fromOklab([L, a, b]);
    if (1.05 / (relLum([r, g, bl]) + 0.05) >= 5.2) {
      return '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('');
    }
    L *= 0.97; a *= 0.97; b *= 0.97;
  }
  return primary;
}

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

  // v0.7.8: Inline only user-color tokens so themes stay visually distinct.
  // Fonts, radius, and max-width are OWNED by the theme CSS files
  // (theme-blog/tech/docs.css) so each theme renders with its own signature.
  // Inline `style=""` has (1,0,0,0) specificity and beats any theme
  // selector, so inlining fonts/radius/max-width made all 3 themes render
  // identically (blog Fraunces, tech JetBrains Mono, docs Geist all
  // silently overridden to the Design-tab default font).
  //
  // Layout tokens with no per-theme override (density, button-radius,
  // shadow, border-color, breakpoints) stay inline because themes don't
  // currently redefine them and we still want Design-tab control there.
  //
  // User customization of theme-owned tokens (custom font, custom max-width)
  // is v0.8 scope: add a "user override" flag per token; inline when set.
  const vars: Record<string, string> = {
    '--hatch-primary': isDarkFirst(b.bg, b.fg) ? readableOnLight(b.primary) : b.primary,
    // Untouched brand colour, so dark mode can derive a legible variant from it.
    '--hatch-primary-brand': b.primary,
    ...(darkPrimaryForeground(b.primary) ? { '--hatch-primary-fg-dark': darkPrimaryForeground(b.primary) as string } : {}),
    '--hatch-accent': b.accent,
    ...lightSurfacePair(b.bg, b.fg),
    '--hatch-density': density,
    '--hatch-button-radius': buttonStyle,
    // v0.50.32 — max-width was previously left to theme CSS, so the admin
    // "Max content width" control had no frontend effect. Inline it so user
    // intent wins (inline style beats theme selector). Themes that need a
    // per-theme override can `var(--hatch-max-width, <default>)`.
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

/**
 * Turn HatchDesign tokens into a single CSS-variable string we drop on
 * <html style="…"> so every component inherits them automatically.
 *
 * Density / rounded / max-width are mapped to numeric scales here so the
 * Astro theme files only have to read CSS vars, no JS.
 */
import type { HatchDesign } from './features';

const DENSITY_SPACE: Record<HatchDesign['layout']['density'], string> = {
  compact: '0.75',
  comfortable: '1',
  spacious: '1.25',
};

const ROUNDED_RADIUS: Record<HatchDesign['layout']['rounded'], string> = {
  sharp: '4px',
  smooth: '10px',
  extra: '20px',
};

export function designToCssVars(design: HatchDesign | null | undefined): string {
  if (!design) return '';
  const b = design.brand;
  const l = design.layout;

  const vars: Record<string, string> = {
    '--hatch-primary': b.primary,
    '--hatch-accent': b.accent,
    '--hatch-fg-design': b.fg,
    '--hatch-bg-design': b.bg,
    '--hatch-font-heading': `"${b.font_heading}", ui-sans-serif, system-ui, -apple-system, sans-serif`,
    '--hatch-font-body': `"${b.font_body}", ui-sans-serif, system-ui, -apple-system, sans-serif`,
    '--hatch-font-mono': `"${b.font_mono}", ui-monospace, SFMono-Regular, Menlo, monospace`,
    '--hatch-density': DENSITY_SPACE[l.density],
    '--hatch-radius': ROUNDED_RADIUS[l.rounded],
    '--hatch-max-width': `${l.max_width}px`,
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

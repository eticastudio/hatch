/**
 * Theme dispatcher — picks the right component variant for the active theme.
 *
 * Each page imports `themeKey(features)` and uses it to pick from an object
 * keyed by theme slug. Falls back to 'blog' for unknown themes so a fresh
 * install never crashes.
 *
 * Token discipline: per-theme components use CSS vars (`var(--hatch-*)`)
 * for every color, font, radius, and spacing token. Hard-coded literals
 * like `#9333ea` or `'Inter'` are NOT allowed in those components —
 * everything flows from the Global Tokens card in the WP admin.
 */
import type { HatchFeatures } from './features';

export type ThemeSlug = 'blog' | 'tech' | 'docs' | 'astropaper' | 'astrowind' | 'astronano';

const KNOWN: ThemeSlug[] = ['blog', 'tech', 'docs', 'astropaper', 'astrowind', 'astronano'];

export function themeKey(features: HatchFeatures | { theme?: string } | null | undefined): ThemeSlug {
  const t = String((features as any)?.theme || 'blog').toLowerCase() as ThemeSlug;
  return KNOWN.includes(t) ? t : 'blog';
}

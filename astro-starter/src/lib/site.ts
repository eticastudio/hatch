/**
 * Site identity helpers: the one place that decides what the site is called
 * and whether it has a tagline. Header, footer, <title>, meta description,
 * Open Graph, JSON-LD, RSS, 404 and the credit line all read from here, so an
 * empty WordPress Site Title or Tagline behaves the same everywhere.
 *
 * Rules:
 *  - WordPress stores the title HTML-escaped ("Tom &amp; Jerry"), so it is
 *    decoded here and escaped again by Astro or escapeXml() on output.
 *  - Whitespace-only counts as empty.
 *  - An empty name falls back to DEFAULT_SITE_NAME.
 *  - An empty tagline stays empty. Callers omit the tag or element instead of
 *    inventing filler text.
 *
 * Pure functions, no imports, safe in server and client code.
 */

export const DEFAULT_SITE_NAME = 'Your Site';

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  copy: '©',
  reg: '®',
  trade: '™',
  laquo: '«',
  raquo: '»',
};

/** Decode HTML entities (named and numeric) in plain text. */
export function decodeEntities(input: string): string {
  return input.replace(/&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z][a-zA-Z0-9]{1,9}));/g, (whole, dec, hex, name) => {
    if (dec || hex) {
      const code = dec ? parseInt(dec, 10) : parseInt(hex, 16);
      if (code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)) {
        return String.fromCodePoint(code);
      }
      return whole;
    }
    const hit = NAMED_ENTITIES[String(name).toLowerCase()];
    return hit !== undefined ? hit : whole;
  });
}

/** Clean one piece of WordPress site text: strip tags, decode, collapse whitespace. */
export function cleanSiteText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return decodeEntities(value.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

interface HasName {
  name?: unknown;
}
interface HasDescription {
  description?: unknown;
}

/** Display name of the site, never empty. */
export function siteName(site?: HasName | null): string {
  return cleanSiteText(site?.name) || DEFAULT_SITE_NAME;
}

/** Tagline of the site. Empty string when the owner has not set one. */
export function siteDescription(site?: HasDescription | null): string {
  return cleanSiteText(site?.description);
}

/** Escape text for use inside XML (RSS, sitemaps). */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

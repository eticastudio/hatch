/**
 * Hatch Blocks → Astro component map.
 *
 * Used by HatchRenderer.astro when you want component mapping instead of pass-through.
 */

export { default as HatchContent } from './HatchContent.astro';
export { default as HatchSection } from './HatchSection.astro';
export { default as HatchHero }    from './HatchHero.astro';

export const HATCH_COMPONENT_MAP = {
	'hatch/section': 'HatchSection',
	'hatch/hero':    'HatchHero',
} as const;

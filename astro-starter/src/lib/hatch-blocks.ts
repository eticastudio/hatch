/**
 * Hatch Blocks — Astro integration helpers.
 *
 * Two render strategies:
 *   1. Pass-through (default): inject `content.rendered` HTML as-is.
 *      Hatch blocks save Tailwind utility classes, which the Astro Tailwind
 *      config picks up via content globs.
 *   2. Component mapping (advanced): parse block markup, render Astro components.
 *
 * @package HatchAstro
 */

export interface HatchBlockAttrs {
	[ key: string ]: unknown;
}

/**
 * Parse <!-- wp:hatch/name {json} --> ... <!-- /wp:hatch/name --> sections out of
 * raw post_content. Returns the matched block records plus the original index.
 *
 * @param content Raw post_content from WP (the "raw" field).
 */
export function parseHatchBlocks( content: string ): Array<{
	name: string;
	attrs: HatchBlockAttrs;
	innerHTML: string;
	index: number;
}> {
	const out: Array<{ name: string; attrs: HatchBlockAttrs; innerHTML: string; index: number }> = [];
	// Match self-closing: <!-- wp:hatch/x {} /-->
	// And paired:        <!-- wp:hatch/x {} --> ... <!-- /wp:hatch/x -->
	const re = /<!--\s*wp:(hatch\/[a-z0-9-]+)(?:\s+({[\s\S]*?}))?\s*(?:\/-->|-->([\s\S]*?)<!--\s*\/wp:\1\s*-->)/g;
	let m: RegExpExecArray | null;
	while ( ( m = re.exec( content ) ) !== null ) {
		const name = m[ 1 ];
		let attrs: HatchBlockAttrs = {};
		if ( m[ 2 ] ) {
			try { attrs = JSON.parse( m[ 2 ] ); } catch { attrs = {}; }
		}
		out.push( {
			name,
			attrs,
			innerHTML: ( m[ 3 ] ?? '' ).trim(),
			index: m.index,
		} );
	}
	return out;
}

/**
 * Simple helper for pass-through rendering. Returns the rendered HTML unchanged.
 * Use Astro's `set:html` to inject.
 *
 * @param contentRendered The `content.rendered` field from WP REST.
 */
export function passThroughHtml( contentRendered: string ): string {
	// Hook for future sanitization. WP already ran KSES — we trust the source.
	return contentRendered;
}

/**
 * Build a Tailwind safelist for Hatch attribute combinations.
 *
 * Add to your tailwind.config.mjs `safelist` if you want to be defensive
 * against attribute-driven classes that the JIT might miss.
 */
export const HATCH_SAFELIST_PATTERNS = [
	{ pattern: /^(pt|pr|pb|pl|mt|mr|mb|ml|p|m)-(\d+)$/, variants: [ 'sm', 'md', 'lg', 'xl' ] },
	{ pattern: /^gap-(\d+)$/,                          variants: [ 'sm', 'md', 'lg', 'xl' ] },
	{ pattern: /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)$/, variants: [ 'sm', 'md', 'lg', 'xl' ] },
	{ pattern: /^font-(light|normal|medium|semibold|bold|extrabold)$/ },
	{ pattern: /^(bg|text|border)-(background|surface|foreground|muted|primary|accent|success|danger|border)$/ },
	{ pattern: /^rounded(-none|-sm|-md|-lg|-xl|-2xl|-full)?$/ },
	{ pattern: /^shadow(-sm|-md|-lg|-xl|-2xl)?$/ },
	{ pattern: /^aspect-(square|video|\[\d+\/\d+\])$/ },
	{ pattern: /^object-(cover|contain|fill|none)$/ },
];

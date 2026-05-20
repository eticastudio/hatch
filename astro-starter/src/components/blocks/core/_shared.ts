/**
 * Shared types + helpers for core block components.
 */

import type { HatchBlock } from '../../../lib/blocks';

export interface BlockProps {
	block: HatchBlock;
	depth: number;
}

/**
 * Build a className string from block attrs. Honors:
 *   - block.attrs.className (Gutenberg "Additional CSS class" UI)
 *   - block.attrs.align     ("left" | "right" | "center" | "wide" | "full")
 *   - block.attrs.style     (inline padding / margin / typography → tailwind isn't reliable here,
 *                            so we surface as style attribute via blockStyle())
 */
export function blockClass( block: HatchBlock, base = '' ): string {
	const classes: string[] = [];
	if ( base ) {
		classes.push( base );
	}

	const a = block.attrs as Record<string, unknown>;
	if ( typeof a.className === 'string' && a.className ) {
		classes.push( a.className );
	}
	if ( typeof a.align === 'string' && a.align ) {
		classes.push( `align${ a.align }` );
	}
	if ( typeof a.textAlign === 'string' && a.textAlign ) {
		classes.push( `text-${ a.textAlign }` );
	}

	return classes.join( ' ' );
}

/**
 * Convert WP block style object → inline CSS string.
 * Only handles the safe subset (spacing, color, typography).
 * Anything else falls back to innerHTML.
 */
export function blockStyle( block: HatchBlock ): string {
	const a = block.attrs as Record<string, unknown>;
	const style = a.style;
	if ( ! style || typeof style !== 'object' ) {
		return '';
	}

	const out: string[] = [];
	const s = style as Record<string, Record<string, string>>;

	if ( s.spacing?.padding ) {
		const p = s.spacing.padding as unknown as Record<string, string>;
		if ( p.top ) out.push( `padding-top:${ p.top }` );
		if ( p.right ) out.push( `padding-right:${ p.right }` );
		if ( p.bottom ) out.push( `padding-bottom:${ p.bottom }` );
		if ( p.left ) out.push( `padding-left:${ p.left }` );
	}
	if ( s.spacing?.margin ) {
		const m = s.spacing.margin as unknown as Record<string, string>;
		if ( m.top ) out.push( `margin-top:${ m.top }` );
		if ( m.bottom ) out.push( `margin-bottom:${ m.bottom }` );
	}
	if ( s.color?.background ) {
		out.push( `background:${ s.color.background }` );
	}
	if ( s.color?.text ) {
		out.push( `color:${ s.color.text }` );
	}
	if ( s.typography?.fontSize ) {
		out.push( `font-size:${ s.typography.fontSize }` );
	}
	if ( s.typography?.fontWeight ) {
		out.push( `font-weight:${ s.typography.fontWeight }` );
	}
	if ( s.typography?.lineHeight ) {
		out.push( `line-height:${ s.typography.lineHeight }` );
	}

	return out.join( ';' );
}

/**
 * Extract inner text from WP-saved innerHTML (e.g. "<p>Hello</p>" → "Hello").
 * Used by blocks that want clean text without their own wrapper tag.
 */
export function stripOuterTag( html: string, tag: string ): string {
	const re = new RegExp( `^\\s*<${ tag }[^>]*>([\\s\\S]*)<\\/${ tag }>\\s*$`, 'i' );
	const m  = html.match( re );
	return m ? m[ 1 ] : html;
}

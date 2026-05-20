/**
 * Tailwind class composition helpers.
 *
 * Responsive attributes are stored as { base, sm, md, lg, xl }. Each helper
 * turns that into space-separated Tailwind classes with proper breakpoint
 * prefixes.
 *
 * @package HatchBlocks
 */

import clsx from 'clsx';

/**
 * Turn a responsive object into Tailwind classes.
 *
 * Example: responsiveClasses('py', { base: 12, md: 24, lg: 32 })
 *   → "py-12 md:py-24 lg:py-32"
 *
 * @param {string} prefix Tailwind class prefix (e.g. "py", "px", "text").
 * @param {Object} value  { base, sm?, md?, lg?, xl? }
 * @returns {string}
 */
export function responsiveClasses( prefix, value ) {
	if ( ! value || typeof value !== 'object' ) {
		return '';
	}
	const out = [];
	const order = [ 'base', 'sm', 'md', 'lg', 'xl' ];
	for ( const bp of order ) {
		const v = value[ bp ];
		if ( v === null || v === undefined || v === '' ) {
			continue;
		}
		out.push( bp === 'base' ? `${ prefix }-${ v }` : `${ bp }:${ prefix }-${ v }` );
	}
	return out.join( ' ' );
}

/**
 * Compose classes — re-export of clsx for consistency.
 */
export const cx = clsx;

/**
 * Color-token class. Accepts a token name like "primary" → "bg-primary".
 *
 * @param {string} prefix "bg" | "text" | "border".
 * @param {string} token  Token name from shared color tokens.
 * @returns {string}
 */
export function colorClass( prefix, token ) {
	if ( ! token ) {
		return '';
	}
	return `${ prefix }-${ token }`;
}

/**
 * Convert a Tailwind size token to its raw value (for inline style fallback).
 *
 * @param {string|number} v Value.
 * @returns {string}
 */
export function pxRem( v ) {
	if ( typeof v === 'number' ) {
		return `${ v * 0.25 }rem`;
	}
	return String( v );
}

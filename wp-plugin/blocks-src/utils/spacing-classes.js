/**
 * Compute Tailwind class strings for the standard padding/margin attribute shape.
 *
 * @package HatchBlocks
 */

import { responsiveClasses } from './classes';

/**
 * Compose padding classes from `padding: { top, right, bottom, left }` where each
 * side is a responsive object.
 *
 * @param {Object} padding
 * @returns {string}
 */
export function paddingClasses( padding ) {
	if ( ! padding ) return '';
	return [
		responsiveClasses( 'pt', padding.top ),
		responsiveClasses( 'pr', padding.right ),
		responsiveClasses( 'pb', padding.bottom ),
		responsiveClasses( 'pl', padding.left ),
	].filter( Boolean ).join( ' ' );
}

/**
 * Compose margin classes.
 *
 * @param {Object} margin
 * @returns {string}
 */
export function marginClasses( margin ) {
	if ( ! margin ) return '';
	return [
		responsiveClasses( 'mt', margin.top ),
		responsiveClasses( 'mr', margin.right ),
		responsiveClasses( 'mb', margin.bottom ),
		responsiveClasses( 'ml', margin.left ),
	].filter( Boolean ).join( ' ' );
}

/**
 * Make a default 4-sided responsive shape.
 *
 * @returns {Object}
 */
export function defaultSidedResponsive() {
	const empty = { base: null, sm: null, md: null, lg: null, xl: null };
	return { top: empty, right: empty, bottom: empty, left: empty };
}

/**
 * Shared attribute schemas — used in block.json across blocks.
 *
 * @package HatchBlocks
 */

/**
 * Common responsive value schema.
 *
 * @param {*} defaultBase Default for the base breakpoint.
 * @returns {Object}
 */
export function responsiveAttr( defaultBase = '' ) {
	return {
		type: 'object',
		default: {
			base: defaultBase,
			sm:   null,
			md:   null,
			lg:   null,
			xl:   null,
		},
	};
}

/**
 * Color token list — must match PHP Hatch_Blocks_Shared_Attributes::color_tokens().
 */
export const COLOR_TOKENS = [
	{ name: 'background', label: 'Background', color: 'var(--hatch-color-background, #ffffff)' },
	{ name: 'surface',    label: 'Surface',    color: 'var(--hatch-color-surface, #f8fafc)' },
	{ name: 'foreground', label: 'Foreground', color: 'var(--hatch-color-foreground, #0f172a)' },
	{ name: 'muted',      label: 'Muted',      color: 'var(--hatch-color-muted, #64748b)' },
	{ name: 'primary',    label: 'Primary',    color: 'var(--hatch-color-primary, #2563eb)' },
	{ name: 'accent',     label: 'Accent',     color: 'var(--hatch-color-accent, #f59e0b)' },
	{ name: 'success',    label: 'Success',    color: 'var(--hatch-color-success, #10b981)' },
	{ name: 'danger',     label: 'Danger',     color: 'var(--hatch-color-danger, #ef4444)' },
	{ name: 'border',     label: 'Border',     color: 'var(--hatch-color-border, #e2e8f0)' },
];

/**
 * Tailwind spacing scale options for selectors.
 */
export const SPACING_OPTIONS = [
	{ label: 'None',   value: 0 },
	{ label: 'XS',     value: 2 },
	{ label: 'SM',     value: 4 },
	{ label: 'MD',     value: 8 },
	{ label: 'LG',     value: 12 },
	{ label: 'XL',     value: 16 },
	{ label: '2XL',    value: 24 },
	{ label: '3XL',    value: 32 },
	{ label: '4XL',    value: 48 },
	{ label: '5XL',    value: 64 },
	{ label: '6XL',    value: 96 },
];

/**
 * Typography size options.
 */
export const TEXT_SIZE_OPTIONS = [
	{ label: 'XS',    value: 'xs' },
	{ label: 'SM',    value: 'sm' },
	{ label: 'Base',  value: 'base' },
	{ label: 'LG',    value: 'lg' },
	{ label: 'XL',    value: 'xl' },
	{ label: '2XL',   value: '2xl' },
	{ label: '3XL',   value: '3xl' },
	{ label: '4XL',   value: '4xl' },
	{ label: '5XL',   value: '5xl' },
	{ label: '6XL',   value: '6xl' },
	{ label: '7XL',   value: '7xl' },
];

/**
 * Font weight options.
 */
export const FONT_WEIGHT_OPTIONS = [
	{ label: 'Light',     value: 'light' },
	{ label: 'Normal',    value: 'normal' },
	{ label: 'Medium',    value: 'medium' },
	{ label: 'Semibold',  value: 'semibold' },
	{ label: 'Bold',      value: 'bold' },
	{ label: 'Extrabold', value: 'extrabold' },
];

/**
 * Alignment options.
 */
export const ALIGN_OPTIONS = [
	{ label: 'Left',    value: 'left' },
	{ label: 'Center',  value: 'center' },
	{ label: 'Right',   value: 'right' },
	{ label: 'Justify', value: 'justify' },
];

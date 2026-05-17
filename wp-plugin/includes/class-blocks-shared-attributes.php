<?php
/**
 * Shared attribute schemas + server-side helpers.
 *
 * Source of truth for things every block can use: typography, color, spacing,
 * responsive breakpoints. Mirrored on the JS side at src/utils/shared-attrs.js.
 *
 * @package HatchBlocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Blocks_Shared_Attributes
 */
class Hatch_Blocks_Shared_Attributes {

	/**
	 * Breakpoints used everywhere.
	 *
	 * @return array<string,int>
	 */
	public static function breakpoints(): array {
		return array(
			'sm' => 640,
			'md' => 768,
			'lg' => 1024,
			'xl' => 1280,
		);
	}

	/**
	 * Tailwind spacing scale (rem). Maps to Tailwind class names.
	 *
	 * @return array<int,float>
	 */
	public static function spacing_scale(): array {
		return array(
			0  => 0,
			1  => 0.25,
			2  => 0.5,
			3  => 0.75,
			4  => 1,
			5  => 1.25,
			6  => 1.5,
			8  => 2,
			10 => 2.5,
			12 => 3,
			16 => 4,
			20 => 5,
			24 => 6,
			32 => 8,
			40 => 10,
			48 => 12,
			56 => 14,
			64 => 16,
			80 => 20,
			96 => 24,
		);
	}

	/**
	 * Hatch color tokens (CSS variable names + default values).
	 *
	 * Astro starter exposes these as :root CSS variables. Editor side renders
	 * a swatch picker using the same names.
	 *
	 * @return array<string,array<string,string>>
	 */
	public static function color_tokens(): array {
		return array(
			'background' => array( 'label' => 'Background', 'value' => 'var(--hatch-color-background, #ffffff)' ),
			'surface'    => array( 'label' => 'Surface',    'value' => 'var(--hatch-color-surface, #f8fafc)' ),
			'foreground' => array( 'label' => 'Foreground', 'value' => 'var(--hatch-color-foreground, #0f172a)' ),
			'muted'      => array( 'label' => 'Muted',      'value' => 'var(--hatch-color-muted, #64748b)' ),
			'primary'    => array( 'label' => 'Primary',    'value' => 'var(--hatch-color-primary, #2563eb)' ),
			'accent'     => array( 'label' => 'Accent',     'value' => 'var(--hatch-color-accent, #f59e0b)' ),
			'success'    => array( 'label' => 'Success',    'value' => 'var(--hatch-color-success, #10b981)' ),
			'danger'     => array( 'label' => 'Danger',     'value' => 'var(--hatch-color-danger, #ef4444)' ),
			'border'     => array( 'label' => 'Border',     'value' => 'var(--hatch-color-border, #e2e8f0)' ),
		);
	}

	/**
	 * Typography scale — semantic tokens not pixel values.
	 *
	 * @return array<string,string>
	 */
	public static function typography_scale(): array {
		return array(
			'xs'   => '0.75rem',
			'sm'   => '0.875rem',
			'base' => '1rem',
			'lg'   => '1.125rem',
			'xl'   => '1.25rem',
			'2xl'  => '1.5rem',
			'3xl'  => '1.875rem',
			'4xl'  => '2.25rem',
			'5xl'  => '3rem',
			'6xl'  => '3.75rem',
			'7xl'  => '4.5rem',
		);
	}

	/**
	 * Common responsive attribute schema. Used as the JSON-Schema default
	 * for any block attribute that varies by breakpoint.
	 *
	 * @param mixed $default Default value across breakpoints.
	 * @return array
	 */
	public static function responsive_object_schema( $default = '' ): array {
		return array(
			'type'    => 'object',
			'default' => array(
				'base' => $default,
				'sm'   => null,
				'md'   => null,
				'lg'   => null,
				'xl'   => null,
			),
		);
	}
}

<?php
/**
 * Hatch Blocks Control — per-block enable/disable toggles.
 *
 * The Blocks tab lets admins disable individual Hatch blocks. Disabled
 * blocks are filtered out of `allowed_block_types_all` so they no longer
 * appear in the inserter, and `unregister_block_type()` is called so
 * already-saved instances become "invalid block" placeholders (with the
 * standard Gutenberg recover/convert flow).
 *
 * Master switch (`hatch_blocks_master`) when off disables all Hatch blocks
 * at once without changing individual toggle state.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Blocks_Control
 */
class Hatch_Blocks_Control {

	const OPTION_KEY    = 'hatch_blocks_state';
	const MASTER_KEY    = 'hatch_blocks_master';

	/**
	 * @var Hatch_Blocks_Control|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Blocks_Control
	 */
	public static function instance(): Hatch_Blocks_Control {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire hooks.
	 */
	private function __construct() {
		// After Gutenberg has registered all blocks, unregister disabled Hatch ones.
		add_action( 'init', array( $this, 'apply_disabled_blocks' ), 100 );
	}

	/**
	 * The 8 Hatch blocks (slug => display info).
	 *
	 * @return array<string,array{label:string,description:string,category:string}>
	 */
	public static function catalog(): array {
		return array(
			'hatch/section' => array(
				'label'       => __( 'Section', 'hatch' ),
				'description' => __( 'Full-width row wrapper. Gradient / image / color backgrounds.', 'hatch' ),
				'category'    => 'layout',
			),
			'hatch/container' => array(
				'label'       => __( 'Container', 'hatch' ),
				'description' => __( 'Max-width wrapper with flex / grid layouts.', 'hatch' ),
				'category'    => 'layout',
			),
			'hatch/heading' => array(
				'label'       => __( 'Heading', 'hatch' ),
				'description' => __( 'H1–H6 with responsive sizing, weights, gradient text.', 'hatch' ),
				'category'    => 'typography',
			),
			'hatch/paragraph' => array(
				'label'       => __( 'Paragraph', 'hatch' ),
				'description' => __( 'Body text with full typography controls and prose widths.', 'hatch' ),
				'category'    => 'typography',
			),
			'hatch/button' => array(
				'label'       => __( 'Button', 'hatch' ),
				'description' => __( '5 variants × 5 sizes × 6 corner radii, optional icons.', 'hatch' ),
				'category'    => 'cta',
			),
			'hatch/image' => array(
				'label'       => __( 'Image', 'hatch' ),
				'description' => __( 'Responsive image with aspect ratios, shadows, lazy loading.', 'hatch' ),
				'category'    => 'media',
			),
			'hatch/hero' => array(
				'label'       => __( 'Hero', 'hatch' ),
				'description' => __( 'Pre-built hero with 3 variants and 9 background presets.', 'hatch' ),
				'category'    => 'marketing',
			),
			'hatch/custom-code' => array(
				'label'       => __( 'Custom Code', 'hatch' ),
				'description' => __( 'Drop in HTML / CSS / JS — admin-only, 3 security modes.', 'hatch' ),
				'category'    => 'advanced',
			),
		);
	}

	/**
	 * Category labels for grouping in the admin UI.
	 *
	 * @return array<string,string>
	 */
	public static function category_labels(): array {
		return array(
			'layout'     => __( 'Layout', 'hatch' ),
			'typography' => __( 'Typography', 'hatch' ),
			'media'      => __( 'Media', 'hatch' ),
			'cta'        => __( 'Call to action', 'hatch' ),
			'marketing'  => __( 'Marketing', 'hatch' ),
			'advanced'   => __( 'Advanced', 'hatch' ),
		);
	}

	/* ----------------------------------------------------------------
	 * State
	 * ---------------------------------------------------------------- */

	/**
	 * Master switch state. Default: all on.
	 *
	 * @return bool
	 */
	public static function master_on(): bool {
		return (bool) get_option( self::MASTER_KEY, 1 );
	}

	/**
	 * Per-block state, defaults filled in.
	 *
	 * @return array<string,bool>
	 */
	public static function get_states(): array {
		$stored = (array) get_option( self::OPTION_KEY, array() );
		$out    = array();
		foreach ( self::catalog() as $slug => $info ) {
			$out[ $slug ] = array_key_exists( $slug, $stored ) ? (bool) $stored[ $slug ] : true;
		}
		return $out;
	}

	/**
	 * Is a specific block enabled (master AND per-block)?
	 *
	 * @param string $slug
	 * @return bool
	 */
	public static function is_enabled( string $slug ): bool {
		if ( ! self::master_on() ) {
			return false;
		}
		$states = self::get_states();
		return isset( $states[ $slug ] ) ? $states[ $slug ] : true;
	}

	/**
	 * Update from form submission.
	 *
	 * @param array<string,bool|string|int> $values
	 * @param bool                          $master
	 * @return void
	 */
	public static function update( array $values, bool $master ): void {
		$catalog = self::catalog();
		$clean   = array();
		foreach ( $catalog as $slug => $info ) {
			$clean[ $slug ] = isset( $values[ $slug ] )
				? rest_sanitize_boolean( $values[ $slug ] )
				: false;
		}
		update_option( self::OPTION_KEY, $clean );
		update_option( self::MASTER_KEY, $master ? 1 : 0 );
	}

	/* ----------------------------------------------------------------
	 * Block registration filter
	 * ---------------------------------------------------------------- */

	/**
	 * Unregister disabled Hatch blocks AFTER they've been registered.
	 *
	 * Why this approach (vs. allowed_block_types_all filter):
	 *   - allowed_block_types_all only hides from inserter — existing
	 *     instances still render.
	 *   - unregister_block_type() makes both inserter + existing instances
	 *     consistent — saved blocks become "invalid block" with the standard
	 *     Gutenberg recover dialog.
	 *
	 * Priority 100 ensures this runs AFTER Hatch_Blocks_Registry has registered
	 * the blocks in init/5.
	 *
	 * @return void
	 */
	public function apply_disabled_blocks(): void {
		if ( ! function_exists( 'unregister_block_type' ) ) {
			return;
		}
		if ( ! self::master_on() ) {
			// Master off — unregister ALL Hatch blocks.
			foreach ( array_keys( self::catalog() ) as $slug ) {
				if ( \WP_Block_Type_Registry::get_instance()->is_registered( $slug ) ) {
					unregister_block_type( $slug );
				}
			}
			return;
		}

		$states = self::get_states();
		foreach ( $states as $slug => $enabled ) {
			if ( ! $enabled && \WP_Block_Type_Registry::get_instance()->is_registered( $slug ) ) {
				unregister_block_type( $slug );
			}
		}
	}
}

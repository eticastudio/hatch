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

	const OPTION_KEY     = 'hatch_blocks_state';
	const MASTER_KEY     = 'hatch_blocks_master';
	const HATCH_ONLY_KEY = 'hatch_blocks_hatch_only';

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
		// v0.2.0 — One-shot migration: if hatch_blocks_state has all keys
		// explicitly false (leftover from earlier dev-state bug), reset to
		// all-enabled so users upgrading don't get a silent inserter with
		// every block missing.
		add_action( 'plugins_loaded', array( $this, 'migrate_legacy_state' ), 5 );

		// After Gutenberg has registered all blocks, unregister disabled Hatch ones.
		add_action( 'init', array( $this, 'apply_disabled_blocks' ), 100 );

		// v0.2.0 — "Hatch Blocks Only" mode. When the toggle is ON, filter
		// allowed_block_types_all to whitelist only hatch/* so the inserter
		// shows only Hatch blocks. Visually-clean editor for content authors.
		add_filter( 'allowed_block_types_all', array( $this, 'maybe_restrict_to_hatch' ), 10, 2 );
	}

	/**
	 * One-shot migration — if every catalog key is explicitly disabled, reset
	 * to default (all enabled). Catches a legacy state where users could end
	 * up with the inserter showing zero Hatch blocks after a clean reinstall.
	 *
	 * Runs at most once per upgrade — guarded by a version transient so it
	 * doesn't re-run every page load.
	 */
	public function migrate_legacy_state(): void {
		$marker = get_option( 'hatch_blocks_migration', '' );
		if ( defined( 'HATCH_VERSION' ) && $marker === HATCH_VERSION ) {
			return;
		}
		$stored = (array) get_option( self::OPTION_KEY, array() );
		if ( ! empty( $stored ) ) {
			$catalog_keys = array_keys( self::catalog() );
			$all_false = true;
			foreach ( $catalog_keys as $k ) {
				if ( ! isset( $stored[ $k ] ) ) { $all_false = false; break; }
				if ( ! empty( $stored[ $k ] ) ) { $all_false = false; break; }
			}
			if ( $all_false ) {
				delete_option( self::OPTION_KEY );
			}
		}
		// Ensure master switch is on for new installs.
		if ( get_option( self::MASTER_KEY, null ) === null ) {
			update_option( self::MASTER_KEY, 1 );
		}
		if ( defined( 'HATCH_VERSION' ) ) {
			update_option( 'hatch_blocks_migration', HATCH_VERSION );
		}
	}

	/**
	 * "Hatch Blocks Only" mode — when on, the inserter only shows hatch/*
	 * blocks. The user-visible editor is restricted to Hatch's vocabulary.
	 *
	 * @param bool|array $allowed Existing allowlist (true = all, array = list).
	 * @param mixed      $editor  Editor context.
	 * @return bool|array
	 */
	public function maybe_restrict_to_hatch( $allowed, $editor ) {
		if ( ! get_option( self::HATCH_ONLY_KEY, false ) ) {
			return $allowed;
		}
		// Keep only registered hatch/* blocks.
		$catalog = array_keys( self::catalog() );
		// Always keep the core block container so InnerBlocks can wrap (just
		// in case any Hatch block expects to be inserted via the inserter
		// recovery flow). Otherwise empty array = only hatch/*.
		return $catalog;
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
			// v0.3.0 — Tier 1 missing
			'hatch/spacer'   => array( 'label' => __( 'Spacer', 'hatch' ),    'description' => __( 'Vertical rhythm token (xs–2xl).', 'hatch' ),    'category' => 'layout' ),
			'hatch/divider'  => array( 'label' => __( 'Divider', 'hatch' ),   'description' => __( 'Horizontal rule with style variants.', 'hatch' ),'category' => 'layout' ),
			'hatch/group'    => array( 'label' => __( 'Group', 'hatch' ),     'description' => __( 'Flex / grid / stack wrapper.', 'hatch' ),       'category' => 'layout' ),
			'hatch/columns'  => array( 'label' => __( 'Columns', 'hatch' ),   'description' => __( 'Responsive 2–6 column grid.', 'hatch' ),        'category' => 'layout' ),
			'hatch/list'     => array( 'label' => __( 'List', 'hatch' ),      'description' => __( 'Bulleted / numbered / check / arrow list.', 'hatch' ), 'category' => 'typography' ),
			'hatch/quote'    => array( 'label' => __( 'Quote', 'hatch' ),     'description' => __( 'Blockquote with attribution + Quotation schema.', 'hatch' ), 'category' => 'typography' ),
			// v0.3.0 — Tier 2 Media
			'hatch/youtube'  => array( 'label' => __( 'YouTube', 'hatch' ),   'description' => __( 'Lazy YouTube — facade thumbnail, no iframe until click.', 'hatch' ), 'category' => 'media' ),
			'hatch/video'    => array( 'label' => __( 'Video', 'hatch' ),     'description' => __( 'HTML5 video with poster, only loads on play.', 'hatch' ), 'category' => 'media' ),
			'hatch/gallery'  => array( 'label' => __( 'Gallery', 'hatch' ),   'description' => __( 'Grid / masonry image set with lightbox.', 'hatch' ),  'category' => 'media' ),
			'hatch/cover'    => array( 'label' => __( 'Cover', 'hatch' ),     'description' => __( 'Image background with overlay text.', 'hatch' ),       'category' => 'media' ),
			'hatch/embed'    => array( 'label' => __( 'Embed', 'hatch' ),     'description' => __( 'Vimeo / Spotify / CodePen / Loom / Figma.', 'hatch' ), 'category' => 'media' ),
			// v0.3.0 — Tier 3 Interactive
			'hatch/tabs'      => array( 'label' => __( 'Tabs', 'hatch' ),     'description' => __( 'Accessible tab panel.', 'hatch' ),               'category' => 'interactive' ),
			'hatch/accordion' => array( 'label' => __( 'Accordion', 'hatch' ),'description' => __( 'Native <details> / FAQ schema.', 'hatch' ),       'category' => 'interactive' ),
			'hatch/table'     => array( 'label' => __( 'Table', 'hatch' ),    'description' => __( 'Responsive table — scrolls on mobile.', 'hatch' ),'category' => 'interactive' ),
			'hatch/form'      => array( 'label' => __( 'Form', 'hatch' ),     'description' => __( 'Plugin-Bridge form (Fluent / WPForms / Gravity / CF7).', 'hatch' ), 'category' => 'interactive' ),
			'hatch/search'    => array( 'label' => __( 'Search', 'hatch' ),   'description' => __( 'Site search box.', 'hatch' ),                    'category' => 'interactive' ),
			// v0.3.0 — Tier 4 Dynamic
			'hatch/posts'     => array( 'label' => __( 'Posts', 'hatch' ),    'description' => __( 'ONE dynamic listing block for every CPT. Default = post.', 'hatch' ), 'category' => 'dynamic' ),
			// v0.3.0 — Tier 5 AI
			'hatch/smart'     => array( 'label' => __( 'Smart Block (AI)', 'hatch' ), 'description' => __( 'Prompt-based AI section generator. BYOK.', 'hatch' ), 'category' => 'ai' ),
		);
	}

	/**
	 * Category labels for grouping in the admin UI.
	 *
	 * @return array<string,string>
	 */
	public static function category_labels(): array {
		return array(
			'layout'      => __( 'Layout', 'hatch' ),
			'typography'  => __( 'Typography', 'hatch' ),
			'media'       => __( 'Media', 'hatch' ),
			'cta'         => __( 'Call to action', 'hatch' ),
			'marketing'   => __( 'Marketing', 'hatch' ),
			'interactive' => __( 'Interactive', 'hatch' ),
			'dynamic'     => __( 'Dynamic', 'hatch' ),
			'ai'          => __( 'AI', 'hatch' ),
			'advanced'    => __( 'Advanced', 'hatch' ),
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

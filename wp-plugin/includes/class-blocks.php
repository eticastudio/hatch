<?php
/**
 * Hatch Blocks — supported-blocks whitelist gate.
 *
 * When the option `hatch_blocks_disable_unsupported` is truthy, the Gutenberg
 * inserter is narrowed to the exact list of core blocks Hatch styles
 * end-to-end. "Styled end-to-end" here means the block has explicit
 * `.wp-block-<slug>` CSS in the shared base layer
 * (astro-starter/src/styles/core-blocks.css) that every Hatch theme inherits,
 * and the per-theme files override on top of that base via element selectors
 * + `.hatch-theme-<name>` token scopes.
 *
 * The whitelist was produced by an audit of
 * astro-starter/src/styles/{core-blocks,theme-blog,theme-tech,theme-docs}.css
 * on 2026-08-13 (see .claude/scratch/block-coverage.md for the full table).
 *
 * Existing content stays intact: this filter only affects what the editor
 * inserter shows for NEW insertions. Posts that already reference an
 * unsupported block (e.g. legacy `core/query`) render unchanged.
 *
 * Default: OFF. Ships as an opt-in toggle on the Plugin Bridge tab.
 *
 * @package Hatch
 * @since 0.7.5
 */

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'Hatch_Blocks' ) ) :

class Hatch_Blocks {

	/**
	 * Option key. Truthy = narrow inserter to the whitelist.
	 */
	const OPTION_KEY = 'hatch_blocks_disable_unsupported';

	/**
	 * The 36 core blocks that carry `.wp-block-<slug>` CSS in
	 * astro-starter/src/styles/core-blocks.css. Audit stamp 2026-08-13.
	 *
	 * Excluded (10) for the record: list-item, query, post-terms,
	 * query-title, query-pagination, query-pagination-next,
	 * query-pagination-previous, query-pagination-numbers, query-no-results,
	 * html. See .claude/scratch/block-coverage.md.
	 *
	 * @return string[]
	 */
	public static function whitelist(): array {
		return array(
			// Text (7).
			'core/paragraph',
			'core/heading',
			'core/list',
			'core/quote',
			'core/pullquote',
			'core/code',
			'core/preformatted',
			'core/verse',
			// Media (6).
			'core/image',
			'core/gallery',
			'core/video',
			'core/audio',
			'core/cover',
			'core/embed',
			// Structure (7).
			'core/columns',
			'core/column',
			'core/group',
			'core/separator',
			'core/spacer',
			'core/table',
			'core/details',
			// Interactive (2).
			'core/button',
			'core/buttons',
			// Utility (1).
			'core/file',
			// Query loop scaffolding + post blocks that DO have base CSS (8).
			// core/query itself and pagination scaffolds are EXCLUDED so we
			// document that gap in the docs; users needing query loops leave
			// the toggle OFF.
			'core/post-template',
			'core/post-title',
			'core/post-excerpt',
			'core/post-date',
			'core/post-featured-image',
			'core/post-author',
			'core/post-content',
			// Widget-family blocks with base CSS (5).
			'core/latest-posts',
			'core/categories',
			'core/tag-cloud',
			'core/rss',
			'core/search',
		);
	}

	/**
	 * Register hooks.
	 */
	public static function init(): void {
		if ( ! self::is_enabled() ) {
			return;
		}
		// Priority 20 runs after any earlier plugin that seeded a base list,
		// so we can safely intersect and not accidentally re-enable blocks
		// another admin explicitly hid.
		add_filter( 'allowed_block_types_all', array( __CLASS__, 'maybe_disable_unsupported' ), 20, 2 );
	}

	/**
	 * Is the master toggle ON?
	 */
	public static function is_enabled(): bool {
		return (bool) get_option( self::OPTION_KEY, 0 );
	}

	/**
	 * Return the whitelist size for UI display.
	 */
	public static function count(): int {
		return count( self::whitelist() );
	}

	/**
	 * Filter callback for `allowed_block_types_all`. Narrows the inserter to
	 * the whitelist only for post types that are public and use the block
	 * editor. Widget/site-editor contexts are left alone since restricting
	 * them would break FSE navigation blocks Hatch does not (yet) style.
	 *
	 * @param bool|string[]           $allowed Existing allowlist or true for all.
	 * @param WP_Block_Editor_Context $context Editor context.
	 * @return bool|string[]
	 */
	public static function maybe_disable_unsupported( $allowed, $context = null ) {
		// Only apply in post-editor context. Widget editor and site editor
		// need the full palette or they break; the toggle is scoped to
		// "content authors picking blocks for posts and pages".
		if ( $context && isset( $context->post ) && $context->post ) {
			$post_type = get_post_type( $context->post );
			if ( $post_type ) {
				$type_obj = get_post_type_object( $post_type );
				if ( ! $type_obj || ! $type_obj->public ) {
					return $allowed;
				}
			}
		} elseif ( $context && ! empty( $context->name ) && 'core/edit-post' !== $context->name ) {
			// Any non-post editor context (e.g. widgets, navigation): skip.
			return $allowed;
		}

		$whitelist = self::whitelist();

		// Respect a narrower list a prior filter already set: intersect.
		if ( is_array( $allowed ) ) {
			return array_values( array_intersect( $allowed, $whitelist ) );
		}

		return $whitelist;
	}
}

Hatch_Blocks::init();

endif;

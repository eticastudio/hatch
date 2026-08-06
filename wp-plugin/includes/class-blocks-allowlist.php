<?php
/**
 * Blocks allowlist — restricts the Gutenberg block inserter to core blocks only.
 *
 * v0.5 pivot: Hatch stops shipping custom Gutenberg blocks. Writers use the
 * core Gutenberg blocks they already know (paragraph, heading, image, button,
 * list, quote, video, embed, columns, group, table, gallery, separator,
 * spacer, code, preformatted, pullquote, verse). Each Hatch theme renders
 * these core blocks with its own visual language — no block-picker learning
 * curve, no ongoing block-library maintenance.
 *
 * The 26 legacy `hatch/*` blocks stay REGISTERED so any post already saved
 * with them still renders. They're just hidden from the inserter — no new
 * post can add one. A follow-up release removes the render code entirely.
 *
 * @package Hatch
 * @since 0.5.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Core-only allowlist of block types shown in the Gutenberg inserter.
 *
 * Curated to match the "simple blog writer" scope of the pivot:
 *   - Text: paragraph, heading, list, quote, pullquote, code, preformatted
 *   - Media: image, gallery, video, audio, cover, embed
 *   - Structure: columns, group, separator, spacer, table
 *   - Interactive: button, buttons
 *
 * Excluded (out of scope, keeps the alpha lean):
 *   - Site/query blocks (post-title, query-loop, template-part, etc.) — pages
 *     later, not now
 *   - Widgets (calendar, latest-posts, tag-cloud) — sidebar comes later
 *   - Everything hatch/* — the 26 custom blocks we retired
 *
 * @return string[] Fully-qualified block type slugs.
 */
function hatch_core_block_allowlist(): array {
	return array(
		// Text
		'core/paragraph',
		'core/heading',
		'core/list',
		'core/list-item',
		'core/quote',
		'core/pullquote',
		'core/code',
		'core/preformatted',
		'core/verse',
		// Media
		'core/image',
		'core/gallery',
		'core/video',
		'core/audio',
		'core/cover',
		'core/embed',
		// Structure
		'core/columns',
		'core/column',
		'core/group',
		'core/separator',
		'core/spacer',
		'core/table',
		'core/details',
		// Interactive
		'core/button',
		'core/buttons',
		// Utility (writers routinely reach for these)
		// v0.5.4 — core/html removed. Hatch's promise is "zero plugin JS,
		// zero inline JS from user content". core/html lets a writer paste
		// raw <script>, which breaks that guarantee (CSP violations, XSS
		// vector, plugin-JS bleedthrough). Users who need custom markup
		// use Gutenberg's Custom HTML *outside* the allowlist by explicitly
		// filtering hatch_core_block_allowlist to add it back.
		'core/file',
		// v0.5.1 — Query + post-listing blocks. Users assemble landing
		// pages with these: /blog index, /category cards, /author feeds.
		// Astro re-executes the query on the frontend so listings are
		// static-fast; the block attributes carry the query spec.
		'core/query',
		'core/post-template',
		'core/post-title',
		'core/post-excerpt',
		'core/post-date',
		'core/post-featured-image',
		'core/post-terms',
		'core/post-author',
		'core/post-content',
		'core/query-title',
		'core/query-pagination',
		'core/query-pagination-next',
		'core/query-pagination-previous',
		'core/query-pagination-numbers',
		'core/query-no-results',
		// Legacy widget blocks people still reach for (v0.5.1 opt-in).
		'core/latest-posts',
		'core/categories',
		'core/tag-cloud',
		'core/rss',
		'core/search',
	);
}

/**
 * Apply the allowlist to the Gutenberg inserter.
 *
 * Return `true` (default) → all blocks allowed. Returning an array narrows the
 * list. WordPress ships this filter since 5.8; older sites fall back to the
 * pre-5.8 `allowed_block_types` filter below.
 *
 * @param bool|string[]           $allowed Existing allowlist or `true`.
 * @param WP_Block_Editor_Context $context Editor context (unused).
 * @return string[]
 */
function hatch_filter_allowed_blocks( $allowed, $context = null ): array {
	unset( $context );
	// Merge with any existing list a site admin already restricted, so we
	// don't accidentally re-enable blocks another plugin explicitly hid.
	$core = hatch_core_block_allowlist();
	if ( is_array( $allowed ) ) {
		return array_values( array_intersect( $allowed, $core ) );
	}
	return $core;
}
add_filter( 'allowed_block_types_all', 'hatch_filter_allowed_blocks', 10, 2 );
// Legacy fallback for WP < 5.8. Signature is the same on our side.
add_filter( 'allowed_block_types', 'hatch_filter_allowed_blocks', 10, 2 );

/**
 * Legacy Hatch block deprecation notice inside the block editor.
 *
 * Fires once per author on the post edit screen. Explains that hatch/* blocks
 * are deprecated and won't appear in the inserter. Dismissible.
 */
function hatch_render_block_deprecation_notice(): void {
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( ! $screen || 'post' !== $screen->base ) {
		return;
	}
	$dismissed = (bool) get_user_meta( get_current_user_id(), 'hatch_block_deprecation_dismissed_v05', true );
	if ( $dismissed ) {
		return;
	}
	printf(
		'<div class="notice notice-info is-dismissible" data-hatch-notice="block-deprecation-v05">'
			. '<p><strong>Hatch v0.5</strong> — the 26 custom Hatch blocks are deprecated. '
			. 'Existing posts using them still render. New posts should use standard core Gutenberg blocks '
			. '(paragraph, heading, image, button, list, quote, columns, group, etc.) — every Hatch theme '
			. 'renders these with its own visual language, so you get a polished blog without picking from '
			. 'a custom block library. <a href="%s" target="_blank" rel="noopener">Learn more →</a></p>'
			. '</div>',
		esc_url( 'https://hatch.adityaarsharma.com/docs/v0.5-block-deprecation' )
	);
}
add_action( 'admin_notices', 'hatch_render_block_deprecation_notice' );

/**
 * Persist notice dismissal via the standard WP admin-post handler.
 */
function hatch_handle_block_deprecation_dismiss(): void {
	if ( ! is_user_logged_in() ) {
		return;
	}
	check_ajax_referer( 'hatch_dismiss_block_deprecation', 'nonce' );
	update_user_meta( get_current_user_id(), 'hatch_block_deprecation_dismissed_v05', 1 );
	wp_send_json_success();
}
add_action( 'wp_ajax_hatch_dismiss_block_deprecation', 'hatch_handle_block_deprecation_dismiss' );

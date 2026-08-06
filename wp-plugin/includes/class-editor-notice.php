<?php
/**
 * Hatch — non-core-block editor notice.
 *
 * Hatch renders WordPress core Gutenberg blocks on the headless Astro
 * frontend. Any block whose name does NOT start with `core/` (custom
 * blocks, ACF blocks, Elementor widgets when saved as blocks, third-party
 * blocks) will not render on the frontend — the Astro side has no
 * component or CSS binding for it, so it emerges as an empty/broken
 * region for readers.
 *
 * This class walks the current post's block tree on the edit screen and
 * shows a dismissible admin notice listing every non-core block found,
 * so the editor never publishes a post that silently breaks on the
 * frontend.
 *
 * Scope:
 *   - Fires only on `post.php` / `post-new.php` (the block editor screens).
 *   - Skips REST / AJAX / XMLRPC — the notice is a UI cue, not an API one.
 *   - No admin_notices spam anywhere else in wp-admin.
 *   - The dismissal is per-post + per-user, keyed by post ID so editing
 *     a *different* post with the same non-core blocks still surfaces it.
 *
 * @package Hatch
 * @since 0.7.1
 */

defined( 'ABSPATH' ) || exit;

/**
 * Static-only helper — no instance state, no singleton needed.
 */
final class Hatch_Editor_Notice {

	/**
	 * Meta key used to persist a post-scoped, user-scoped dismissal.
	 */
	private const DISMISS_META_PREFIX = 'hatch_noncore_dismissed_';

	/**
	 * Wire up hooks. Called once from hatch.php after the class file
	 * is required.
	 *
	 * @return void
	 */
	public static function boot(): void {
		add_action( 'admin_notices', array( __CLASS__, 'render_notice' ) );
		add_action( 'admin_post_hatch_dismiss_noncore', array( __CLASS__, 'handle_dismiss' ) );
	}

	/**
	 * Render the notice if the current screen is a post editor AND the
	 * post's block tree contains at least one non-core block AND the
	 * current user hasn't dismissed it for THIS post.
	 *
	 * @return void
	 */
	public static function render_notice(): void {
		if ( ! function_exists( 'get_current_screen' ) ) {
			return;
		}
		$screen = get_current_screen();
		if ( ! $screen || ! in_array( $screen->base, array( 'post' ), true ) ) {
			return;
		}
		// Gutenberg only. Classic-editor screens don't emit block markup,
		// so there's nothing to scan.
		if ( method_exists( $screen, 'is_block_editor' ) && ! $screen->is_block_editor() ) {
			return;
		}

		$post_id = self::current_post_id();
		if ( ! $post_id ) {
			return;
		}
		$post = get_post( $post_id );
		if ( ! $post || empty( $post->post_content ) ) {
			return;
		}

		// Per-user, per-post dismissal.
		$user_id = get_current_user_id();
		if ( $user_id && get_user_meta( $user_id, self::DISMISS_META_PREFIX . $post_id, true ) ) {
			return;
		}

		$non_core = self::find_non_core_blocks( $post->post_content );
		if ( empty( $non_core ) ) {
			return;
		}

		$dismiss_url = wp_nonce_url(
			admin_url( 'admin-post.php?action=hatch_dismiss_noncore&post=' . $post_id ),
			'hatch_dismiss_noncore_' . $post_id
		);

		// Format the block list — cap at 8 for UI sanity; count the rest.
		$shown = array_slice( $non_core, 0, 8 );
		$rest  = count( $non_core ) - count( $shown );

		$list_html = '';
		foreach ( $shown as $name ) {
			$list_html .= '<code style="background:#fef3c7;padding:2px 6px;border-radius:3px;margin-right:6px;">'
				. esc_html( $name ) . '</code>';
		}
		if ( $rest > 0 ) {
			/* translators: %d: number of additional non-core blocks. */
			$list_html .= ' <em>' . esc_html( sprintf( _n( 'and %d more', 'and %d more', $rest, 'hatch' ), $rest ) ) . '</em>';
		}

		printf(
			'<div class="notice notice-warning is-dismissible" data-hatch-notice="noncore">'
				. '<p><strong>%1$s</strong> %2$s</p>'
				. '<p>%3$s</p>'
				. '<p><a class="button button-secondary" href="%4$s">%5$s</a></p>'
				. '</div>',
			esc_html__( 'Hatch renders core Gutenberg blocks only.', 'hatch' ),
			wp_kses_post( sprintf(
				/* translators: %s: list of non-core block names. */
				__( 'Non-core blocks detected: %s. These will not appear on the fast Astro frontend — the reader sees an empty region.', 'hatch' ),
				$list_html
			) ),
			esc_html__( 'Replace them with core blocks (Paragraph, Heading, Image, Buttons, Cover, Columns, Group, Gallery, Media & Text, Table, Quote, etc.) before publishing, or the post will look broken to readers.', 'hatch' ),
			esc_url( $dismiss_url ),
			esc_html__( 'Dismiss for this post', 'hatch' )
		);
	}

	/**
	 * Handle the "dismiss for this post" click.
	 *
	 * @return void
	 */
	public static function handle_dismiss(): void {
		if ( ! is_user_logged_in() ) {
			wp_die( '', '', array( 'response' => 403 ) );
		}
		$post_id = isset( $_GET['post'] ) ? absint( wp_unslash( $_GET['post'] ) ) : 0;
		if ( ! $post_id || ! current_user_can( 'edit_post', $post_id ) ) {
			wp_die( '', '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'hatch_dismiss_noncore_' . $post_id );

		update_user_meta( get_current_user_id(), self::DISMISS_META_PREFIX . $post_id, 1 );

		$redirect = get_edit_post_link( $post_id, 'redirect' );
		if ( ! $redirect ) {
			$redirect = admin_url( 'edit.php' );
		}
		wp_safe_redirect( $redirect );
		exit;
	}

	/**
	 * Best-effort resolution of the post ID being edited.
	 *
	 * Handles both `post.php?post=123` (edit existing) and
	 * `post-new.php?post_type=…` (autosave path via `$GLOBALS['post']`).
	 *
	 * @return int Post ID or 0 if unresolvable.
	 */
	private static function current_post_id(): int {
		if ( isset( $_GET['post'] ) ) {
			return absint( wp_unslash( $_GET['post'] ) );
		}
		if ( isset( $GLOBALS['post'] ) && $GLOBALS['post'] instanceof WP_Post ) {
			return (int) $GLOBALS['post']->ID;
		}
		return 0;
	}

	/**
	 * Walk parsed block tree, return the ordered list of block names that
	 * are NOT prefixed with `core/`. Deduped, capped by parse_blocks()'s
	 * own recursion.
	 *
	 * Named blocks only — inline HTML / classic content chunks have
	 * `blockName === null` and get skipped.
	 *
	 * @param string $post_content Raw post_content.
	 * @return string[] Unique non-core block names, order preserved.
	 */
	public static function find_non_core_blocks( string $post_content ): array {
		if ( ! function_exists( 'parse_blocks' ) || '' === trim( $post_content ) ) {
			return array();
		}
		$parsed = parse_blocks( $post_content );
		$found  = array();
		self::collect_non_core( $parsed, $found );
		// Preserve first-seen order while deduping.
		return array_values( array_unique( $found ) );
	}

	/**
	 * Depth-first walk that pushes non-core block names into $out.
	 *
	 * @param array<int, array<string, mixed>> $blocks Parsed block tree.
	 * @param array<int, string>               $out    Accumulator (by-ref).
	 * @return void
	 */
	private static function collect_non_core( array $blocks, array &$out ): void {
		foreach ( $blocks as $block ) {
			$name = isset( $block['blockName'] ) ? (string) $block['blockName'] : '';
			if ( '' !== $name && 0 !== strpos( $name, 'core/' ) ) {
				$out[] = $name;
			}
			if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				self::collect_non_core( $block['innerBlocks'], $out );
			}
		}
	}
}

Hatch_Editor_Notice::boot();

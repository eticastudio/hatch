<?php
/**
 * Block Serializer — turns a post's Gutenberg block tree into clean JSON
 * for the Astro frontend to render with native components.
 *
 * Without this, headless frontends get `post.content.rendered` which is raw
 * HTML — a dump. The frontend has to set:html and loses:
 *   - lazy-loaded images via Astro's <Image>
 *   - component-level hydration boundaries
 *   - design-system class consistency
 *   - typed props
 *   - performance (every block is just inert HTML)
 *
 * With this, the frontend receives a normalized tree:
 *   { name: "core/paragraph", attrs: {...}, innerBlocks: [...], innerHTML: "..." }
 * …and renders each block with a real Astro component. innerHTML stays as
 * a fallback for unknown / passthrough blocks.
 *
 * REST surface:
 *   GET /wp-json/hatch/v1/post/{id}/blocks?context=view
 *   GET /wp-json/hatch/v1/post/{id}/blocks?context=edit   (auth required)
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Block_Serializer
 */
class Hatch_Block_Serializer {

	/**
	 * Max recursion depth to prevent runaway nesting (defensive).
	 */
	const MAX_DEPTH = 12;

	/**
	 * @var Hatch_Block_Serializer|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Block_Serializer
	 */
	public static function instance(): Hatch_Block_Serializer {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire routes.
	 */
	private function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register REST routes for block fetching.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/post/(?P<id>\d+)/blocks',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_get_blocks' ),
				'permission_callback' => array( $this, 'permission' ),
				'args'                => array(
					'id'      => array(
						'required'          => true,
						'sanitize_callback' => 'absint',
					),
					'context' => array(
						'default'           => 'view',
						'enum'              => array( 'view', 'edit' ),
						'sanitize_callback' => 'sanitize_key',
					),
				),
			)
		);
	}

	/**
	 * Permission check. View context follows WP post visibility;
	 * edit requires authenticated user with read access.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return bool|WP_Error
	 */
	public function permission( WP_REST_Request $request ) {
		$id      = (int) $request['id'];
		$context = (string) $request['context'];
		$post    = get_post( $id );

		if ( ! $post instanceof WP_Post ) {
			return new WP_Error( 'hatch_block_not_found', __( 'Post not found.', 'hatch' ), array( 'status' => 404 ) );
		}

		$public_statuses = array( 'publish' );
		if ( 'edit' === $context ) {
			// Edit context = require auth + cap.
			if ( ! is_user_logged_in() ) {
				return new WP_Error( 'hatch_block_auth_required', __( 'Authentication required.', 'hatch' ), array( 'status' => 401 ) );
			}
			return current_user_can( 'edit_post', $id );
		}

		// View context = post must be public.
		if ( ! in_array( $post->post_status, $public_statuses, true ) ) {
			return new WP_Error( 'hatch_block_not_public', __( 'Post is not public.', 'hatch' ), array( 'status' => 403 ) );
		}
		return true;
	}

	/**
	 * GET /post/{id}/blocks — returns the normalized block tree.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function route_get_blocks( WP_REST_Request $request ) {
		$id   = (int) $request['id'];
		$post = get_post( $id );
		if ( ! $post instanceof WP_Post ) {
			return new WP_Error( 'hatch_block_not_found', __( 'Post not found.', 'hatch' ), array( 'status' => 404 ) );
		}

		$raw    = (string) $post->post_content;
		$tree   = self::serialize_content( $raw );
		$meta   = array(
			'id'         => $post->ID,
			'slug'       => $post->post_name,
			'title'      => get_the_title( $post ),
			'modified'   => mysql_to_rfc3339( $post->post_modified_gmt ),
			'block_count' => self::count_blocks( $tree ),
		);

		return rest_ensure_response(
			array(
				'meta'   => $meta,
				'blocks' => $tree,
			)
		);
	}

	/**
	 * Parse raw post_content into a normalized block tree.
	 *
	 * Each block:
	 *   {
	 *     name:        string  e.g. "core/paragraph", "hatch/hero"
	 *     attrs:       object  block attributes JSON
	 *     innerHTML:   string  inner HTML (sanitized passthrough)
	 *     innerBlocks: array   nested children (recursive)
	 *   }
	 *
	 * @param string $content Raw post_content.
	 * @return array<int, array<string, mixed>>
	 */
	public static function serialize_content( string $content ): array {
		if ( ! function_exists( 'parse_blocks' ) ) {
			// Pre-5.0 fallback — no blocks; treat whole content as one classic block.
			return array(
				array(
					'name'        => 'core/freeform',
					'attrs'       => new stdClass(),
					'innerHTML'   => $content,
					'innerBlocks' => array(),
				),
			);
		}

		$parsed = parse_blocks( $content );
		return self::normalize_tree( $parsed, 0 );
	}

	/**
	 * Recursively normalize a parsed block tree.
	 *
	 * @param array<int, array<string, mixed>> $blocks Parsed blocks.
	 * @param int                              $depth  Current depth.
	 * @return array<int, array<string, mixed>>
	 */
	private static function normalize_tree( array $blocks, int $depth ): array {
		if ( $depth > self::MAX_DEPTH ) {
			return array();
		}

		$out = array();
		foreach ( $blocks as $block ) {
			// Skip whitespace-only "blockName: null" segments.
			if ( empty( $block['blockName'] ) && empty( trim( (string) ( $block['innerHTML'] ?? '' ) ) ) ) {
				continue;
			}

			$name        = (string) ( $block['blockName'] ?? 'core/freeform' );
			$attrs       = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
			$inner_html  = isset( $block['innerHTML'] ) ? (string) $block['innerHTML'] : '';
			$inner_blocks = isset( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] )
				? self::normalize_tree( $block['innerBlocks'], $depth + 1 )
				: array();

			// Run core's render filter for blocks that need server-side rendering
			// (latest-posts, query-loop, shortcodes, etc) — we still pass the HTML.
			if ( '' !== $name && function_exists( 'render_block' ) && ! empty( $block['innerHTML'] ) ) {
				// Only render dynamic blocks (those without static save). Static blocks
				// already have correct HTML in innerHTML; rendering them is a no-op but
				// strips the comment wrappers we want preserved.
				$rendered = self::maybe_render_dynamic( $block );
				if ( null !== $rendered ) {
					$inner_html = $rendered;
				}
			}

			$out[] = array(
				'name'        => $name,
				'attrs'       => (object) $attrs, // force JSON object even when empty
				'innerHTML'   => trim( $inner_html ),
				'innerBlocks' => $inner_blocks,
			);
		}
		return $out;
	}

	/**
	 * Render dynamic blocks server-side (so embed previews, query loops, etc.
	 * arrive on the frontend as ready HTML). Static blocks return null
	 * (caller keeps the parsed innerHTML).
	 *
	 * @param array<string, mixed> $block Single parsed block.
	 * @return string|null Rendered HTML or null if not dynamic.
	 */
	private static function maybe_render_dynamic( array $block ): ?string {
		$name = (string) ( $block['blockName'] ?? '' );
		if ( '' === $name ) {
			return null;
		}

		// Allow filtering — themes/plugins can declare extra dynamic blocks.
		$dynamic = apply_filters(
			'hatch/dynamic_block_names',
			array(
				'core/latest-posts',
				'core/latest-comments',
				'core/query',
				'core/post-template',
				'core/shortcode',
				'core/calendar',
				'core/categories',
				'core/tag-cloud',
				'core/rss',
				'core/search',
				'core/archives',
				'core/embed',
			)
		);

		// Anything starting with "core-embed/" or "core/embed" is dynamic.
		$is_dynamic = in_array( $name, $dynamic, true )
			|| 0 === strpos( $name, 'core-embed/' )
			|| 0 === strpos( $name, 'core/embed' );

		if ( ! $is_dynamic ) {
			return null;
		}

		if ( ! function_exists( 'render_block' ) ) {
			return null;
		}

		return (string) render_block( $block );
	}

	/**
	 * Count total blocks (including nested).
	 *
	 * @param array<int, array<string, mixed>> $tree Block tree.
	 * @return int
	 */
	public static function count_blocks( array $tree ): int {
		$count = 0;
		foreach ( $tree as $block ) {
			++$count;
			if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				$count += self::count_blocks( $block['innerBlocks'] );
			}
		}
		return $count;
	}
}

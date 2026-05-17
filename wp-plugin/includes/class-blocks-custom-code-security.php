<?php
/**
 * Custom Code block — security wiring.
 *
 * Three-layer defense:
 *   1. Authoring capability — only `unfiltered_html` users can save raw code.
 *      Lower-privileged users get the markup silently stripped from post_content.
 *   2. Execution mode — block has 3 modes (inline / shadow / iframe). Inline is
 *      the default and most restrictive — JS is dropped in this mode.
 *   3. Read-time sanitization — when the REST API serves content for a user
 *      WITHOUT `unfiltered_html`, custom-code blocks are stripped from the
 *      response.
 *
 * Astro frontend receives only what the WP user is allowed to see.
 *
 * @package HatchBlocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Blocks_Custom_Code_Security
 */
class Hatch_Blocks_Custom_Code_Security {

	const BLOCK_NAME = 'hatch/custom-code';

	/**
	 * @var Hatch_Blocks_Custom_Code_Security|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Blocks_Custom_Code_Security
	 */
	public static function instance(): Hatch_Blocks_Custom_Code_Security {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire filters.
	 */
	private function __construct() {
		// Strip on save by lower-privileged users.
		add_filter( 'wp_insert_post_data', array( $this, 'strip_for_save_if_no_cap' ), 10, 2 );

		// Strip on REST output for non-capable readers.
		add_filter( 'rest_prepare_post', array( $this, 'strip_for_rest_if_no_cap' ), 10, 3 );
		add_filter( 'rest_prepare_page', array( $this, 'strip_for_rest_if_no_cap' ), 10, 3 );
	}

	/**
	 * On save: if the user does NOT have unfiltered_html, remove all hatch/custom-code blocks.
	 *
	 * @param array $data    Post data (sanitized).
	 * @param array $postarr Original POST data.
	 * @return array
	 */
	public function strip_for_save_if_no_cap( array $data, array $postarr ): array {
		unset( $postarr );
		if ( current_user_can( 'unfiltered_html' ) ) {
			return $data;
		}
		if ( ! isset( $data['post_content'] ) || '' === $data['post_content'] ) {
			return $data;
		}
		$data['post_content'] = self::strip_custom_code_blocks( (string) $data['post_content'] );
		return $data;
	}

	/**
	 * On REST output: strip custom-code blocks from rendered HTML for non-capable users.
	 *
	 * @param WP_REST_Response $response Response.
	 * @param WP_Post          $post     Post.
	 * @param WP_REST_Request  $request  Request.
	 * @return WP_REST_Response
	 */
	public function strip_for_rest_if_no_cap( $response, $post, $request ) {
		unset( $post, $request );
		if ( ! ( $response instanceof WP_REST_Response ) ) {
			return $response;
		}
		if ( current_user_can( 'unfiltered_html' ) ) {
			return $response;
		}
		$data = $response->get_data();
		if ( isset( $data['content']['rendered'] ) && is_string( $data['content']['rendered'] ) ) {
			$data['content']['rendered'] = self::strip_rendered_custom_code( $data['content']['rendered'] );
		}
		if ( isset( $data['content']['raw'] ) && is_string( $data['content']['raw'] ) ) {
			$data['content']['raw'] = self::strip_custom_code_blocks( $data['content']['raw'] );
		}
		$response->set_data( $data );
		return $response;
	}

	/**
	 * Strip <!-- wp:hatch/custom-code ... --> ... <!-- /wp:hatch/custom-code --> sections.
	 *
	 * @param string $content Block markup.
	 * @return string
	 */
	public static function strip_custom_code_blocks( string $content ): string {
		if ( false === strpos( $content, 'wp:' . self::BLOCK_NAME ) ) {
			return $content;
		}
		// Greedy regex on block comment delimiters.
		$pattern = '/<!--\s*wp:hatch\/custom-code(?:\s+[^>]*?)?\s*(?:\/-->|-->[\s\S]*?<!--\s*\/wp:hatch\/custom-code\s*-->)/';
		return (string) preg_replace( $pattern, '', $content );
	}

	/**
	 * Strip rendered output of custom-code blocks (wrappers with our marker class).
	 *
	 * @param string $html Rendered HTML.
	 * @return string
	 */
	public static function strip_rendered_custom_code( string $html ): string {
		if ( false === strpos( $html, 'hatch-custom-code' ) ) {
			return $html;
		}
		$pattern = '/<(div|section|iframe)[^>]*class="[^"]*hatch-custom-code[^"]*"[^>]*>[\s\S]*?<\/\1>/i';
		return (string) preg_replace( $pattern, '', $html );
	}

	/**
	 * Allowed sandbox flags for iframe-mode custom code.
	 *
	 * @return string
	 */
	public static function iframe_sandbox(): string {
		return 'allow-scripts allow-forms allow-popups allow-same-origin';
	}
}

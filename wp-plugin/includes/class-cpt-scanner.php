<?php
/**
 * Custom Post Type REST exposure scanner.
 *
 * The #1 silent failure in headless WordPress: a CPT registered without
 * `show_in_rest => true`. The site looks fine in wp-admin, but the headless
 * frontend gets 404 from the REST API and the developer has no idea why.
 *
 * This class scans all registered CPTs (skipping WP core types) and flags
 * any that are invisible to REST.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Cpt_Scanner
 */
class Hatch_Cpt_Scanner {

	/**
	 * Built-in WordPress post types — never warn on these.
	 *
	 * @var array<string>
	 */
	private const CORE_TYPES = array(
		'post',
		'page',
		'attachment',
		'revision',
		'nav_menu_item',
		'custom_css',
		'customize_changeset',
		'oembed_cache',
		'user_request',
		'wp_block',
		'wp_template',
		'wp_template_part',
		'wp_global_styles',
		'wp_navigation',
		'wp_font_family',
		'wp_font_face',
	);

	/**
	 * Transient cache key.
	 */
	const CACHE_KEY = 'hatch_cpt_scan_v1';

	/**
	 * Dismiss transient key.
	 */
	const DISMISS_KEY = 'hatch_cpt_notice_dismissed';

	/**
	 * Cache lifetime in seconds.
	 */
	const CACHE_TTL = 300;

	/**
	 * @var Hatch_Cpt_Scanner|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Cpt_Scanner
	 */
	public static function instance(): Hatch_Cpt_Scanner {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire hooks.
	 */
	private function __construct() {
		add_action( 'admin_notices', array( $this, 'maybe_show_admin_notice' ) );
		add_action( 'admin_init', array( $this, 'maybe_dismiss_notice' ) );

		// Bust cache when CPTs are registered (most CPT plugins fire this).
		add_action( 'registered_post_type', array( __CLASS__, 'flush_cache' ) );
	}

	/**
	 * Scan all registered post types.
	 *
	 * Returns:
	 * [
	 *   'total_custom' => int,
	 *   'exposed'      => int,
	 *   'hidden'       => int,
	 *   'hidden_types' => [
	 *     [
	 *       'name'         => string,
	 *       'label'        => string,
	 *       'public'       => bool,
	 *       'show_in_rest' => bool,
	 *       'rest_base'    => string|null,
	 *     ],
	 *     ...
	 *   ],
	 *   'all_types'    => [ ['name','label','show_in_rest','rest_base'], ... ],
	 *   'scanned_at'   => int,
	 * ]
	 *
	 * @return array<string,mixed>
	 */
	public static function scan(): array {
		$cached = get_transient( self::CACHE_KEY );
		if ( false !== $cached && is_array( $cached ) ) {
			return $cached;
		}

		$result = array(
			'total_custom' => 0,
			'exposed'      => 0,
			'hidden'       => 0,
			'hidden_types' => array(),
			'all_types'    => array(),
			'scanned_at'   => time(),
		);

		$types = get_post_types( array(), 'objects' );
		foreach ( $types as $type ) {
			$name = isset( $type->name ) ? (string) $type->name : '';
			if ( in_array( $name, self::CORE_TYPES, true ) ) {
				continue;
			}
			// Skip private, non-public types — they may legitimately not be in REST.
			$public = isset( $type->public ) ? (bool) $type->public : false;
			if ( ! $public ) {
				continue;
			}

			++$result['total_custom'];
			$show_in_rest = isset( $type->show_in_rest ) ? (bool) $type->show_in_rest : false;
			$rest_base    = isset( $type->rest_base ) && ! empty( $type->rest_base ) ? (string) $type->rest_base : $name;
			$label        = isset( $type->labels->name ) ? (string) $type->labels->name : $name;

			$summary = array(
				'name'         => sanitize_key( $name ),
				'label'        => sanitize_text_field( $label ),
				'show_in_rest' => $show_in_rest,
				'rest_base'    => sanitize_key( $rest_base ),
			);
			$result['all_types'][] = $summary;

			if ( $show_in_rest ) {
				++$result['exposed'];
			} else {
				++$result['hidden'];
				$result['hidden_types'][] = $summary + array( 'public' => $public );
			}
		}

		set_transient( self::CACHE_KEY, $result, self::CACHE_TTL );
		return $result;
	}

	/**
	 * Flush the cache (called on registered_post_type).
	 *
	 * @return void
	 */
	public static function flush_cache(): void {
		delete_transient( self::CACHE_KEY );
	}

	/**
	 * Show admin notice if any public CPTs are not REST-accessible.
	 *
	 * @return void
	 */
	public function maybe_show_admin_notice(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( get_transient( self::DISMISS_KEY ) ) {
			return;
		}

		// Avoid double-noise on the Hatch health panel itself.
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && false !== strpos( (string) $screen->id, 'hatch' ) ) {
			return;
		}

		$status = self::scan();
		if ( $status['hidden'] < 1 ) {
			return;
		}

		$names = array();
		foreach ( $status['hidden_types'] as $type ) {
			$names[] = $type['name'];
		}
		$names_display = implode( ', ', array_map( 'esc_html', array_slice( $names, 0, 5 ) ) );
		if ( count( $names ) > 5 ) {
			$names_display .= '…';
		}

		$dismiss_url = wp_nonce_url(
			add_query_arg( 'hatch_dismiss_cpt_notice', '1' ),
			'hatch_dismiss_cpt_notice'
		);
		?>
		<div class="notice notice-error is-dismissible">
			<p>
				<strong><?php esc_html_e( 'Hatch — Headless WordPress', 'hatch' ); ?>:</strong>
				<?php
				printf(
					/* translators: 1: number of hidden CPTs, 2: comma-separated list */
					esc_html( _n(
						'%1$d custom post type is not accessible via REST API: %2$s. Your headless frontend will receive 404 errors when querying it.',
						'%1$d custom post types are not accessible via REST API: %2$s. Your headless frontend will receive 404 errors when querying them.',
						(int) $status['hidden'],
						'hatch'
					) ),
					(int) $status['hidden'],
					// $names_display is already escaped above.
					$names_display // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				);
				?>
				<a href="<?php echo esc_url( admin_url( 'tools.php?page=hatch#health' ) ); ?>">
					<?php esc_html_e( 'Open Hatch health panel →', 'hatch' ); ?>
				</a>
				&nbsp;|&nbsp;
				<a href="<?php echo esc_url( $dismiss_url ); ?>">
					<?php esc_html_e( 'Dismiss for 7 days', 'hatch' ); ?>
				</a>
			</p>
		</div>
		<?php
	}

	/**
	 * Handle dismiss click — nonce-verified.
	 *
	 * @return void
	 */
	public function maybe_dismiss_notice(): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( empty( $_GET['hatch_dismiss_cpt_notice'] ) ) {
			return;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$nonce = isset( $_GET['_wpnonce'] ) ? sanitize_text_field( wp_unslash( (string) $_GET['_wpnonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'hatch_dismiss_cpt_notice' ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		set_transient( self::DISMISS_KEY, 1, 7 * DAY_IN_SECONDS );
		wp_safe_redirect( remove_query_arg( array( 'hatch_dismiss_cpt_notice', '_wpnonce' ) ) );
		exit;
	}
}

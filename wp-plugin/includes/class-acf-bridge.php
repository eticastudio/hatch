<?php
/**
 * ACF / Secure Custom Fields / Meta Box field group REST exposure checker.
 *
 * Hatch does NOT bridge field data — ACF and Meta Box both ship REST integration
 * natively. What they DON'T do is warn the site owner when field groups are
 * accidentally hidden from REST. This class is that safety net.
 *
 * Silently no-ops when no custom-fields plugin is active.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Acf_Bridge
 */
class Hatch_Acf_Bridge {

	/**
	 * Transient cache key for scan results.
	 */
	const CACHE_KEY = 'hatch_acf_scan_v1';

	/**
	 * Transient for "notice dismissed" state.
	 */
	const DISMISS_KEY = 'hatch_acf_notice_dismissed';

	/**
	 * Cache lifetime in seconds.
	 */
	const CACHE_TTL = 300;

	/**
	 * @var Hatch_Acf_Bridge|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Acf_Bridge
	 */
	public static function instance(): Hatch_Acf_Bridge {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire hooks.
	 */
	private function __construct() {
		if ( ! Hatch_Detector::has_custom_fields() ) {
			return;
		}
		add_action( 'admin_notices', array( $this, 'maybe_show_admin_notice' ) );
		add_action( 'admin_init', array( $this, 'maybe_dismiss_notice' ) );

		// Bust cache when ACF or Meta Box save field groups.
		add_action( 'acf/update_field_group', array( __CLASS__, 'flush_cache' ) );
		add_action( 'rwmb_meta_boxes', array( __CLASS__, 'flush_cache' ) );
	}

	/**
	 * Scan all custom field groups and report REST exposure status.
	 *
	 * Result schema:
	 * [
	 *   'plugin'        => 'acf'|'acf_pro'|'secure_cf'|'meta_box'|'pods'|'none',
	 *   'total_groups'  => int,
	 *   'exposed'       => int,
	 *   'hidden'        => int,
	 *   'hidden_groups' => [ ['key' => string, 'title' => string], ... ],
	 *   'scanned_at'    => int (unix timestamp),
	 * ]
	 *
	 * Cached for 5 minutes via transient.
	 *
	 * @return array<string,mixed>
	 */
	public static function get_field_group_status(): array {
		$cached = get_transient( self::CACHE_KEY );
		if ( false !== $cached && is_array( $cached ) ) {
			return $cached;
		}

		$plugin = Hatch_Detector::get_custom_fields_plugin();
		$result = array(
			'plugin'        => $plugin,
			'total_groups'  => 0,
			'exposed'       => 0,
			'hidden'        => 0,
			'hidden_groups' => array(),
			'scanned_at'    => time(),
		);

		switch ( $plugin ) {
			case 'acf':
			case 'acf_pro':
			case 'secure_cf':
				$result = self::scan_acf( $result );
				break;
			case 'meta_box':
				$result = self::scan_meta_box( $result );
				break;
			case 'pods':
				$result = self::scan_pods( $result );
				break;
			case 'none':
			default:
				// Nothing to scan.
				break;
		}

		set_transient( self::CACHE_KEY, $result, self::CACHE_TTL );
		return $result;
	}

	/**
	 * Scan ACF / ACF Pro / Secure Custom Fields (same API).
	 *
	 * @param array<string,mixed> $result Result template.
	 * @return array<string,mixed>
	 */
	private static function scan_acf( array $result ): array {
		if ( ! function_exists( 'acf_get_field_groups' ) ) {
			return $result;
		}

		$groups = acf_get_field_groups();
		if ( ! is_array( $groups ) ) {
			return $result;
		}

		$result['total_groups'] = count( $groups );
		foreach ( $groups as $group ) {
			$show_in_rest = isset( $group['show_in_rest'] ) ? (bool) $group['show_in_rest'] : false;
			if ( $show_in_rest ) {
				++$result['exposed'];
			} else {
				++$result['hidden'];
				$result['hidden_groups'][] = array(
					'key'   => isset( $group['key'] ) ? sanitize_text_field( (string) $group['key'] ) : '',
					'title' => isset( $group['title'] ) ? sanitize_text_field( (string) $group['title'] ) : '',
				);
			}
		}
		return $result;
	}

	/**
	 * Scan Meta Box field groups.
	 *
	 * Meta Box exposes field groups via rwmb_get_registry() or rwmb_meta_boxes filter.
	 * Each meta box can opt into REST via 'show_in_rest' on its registration array.
	 *
	 * @param array<string,mixed> $result Result template.
	 * @return array<string,mixed>
	 */
	private static function scan_meta_box( array $result ): array {
		if ( ! function_exists( 'rwmb_get_registry' ) ) {
			return $result;
		}
		try {
			$registry = rwmb_get_registry( 'meta_box' );
			if ( ! $registry || ! method_exists( $registry, 'all' ) ) {
				return $result;
			}
			$boxes = $registry->all();
			if ( ! is_array( $boxes ) ) {
				return $result;
			}
			$result['total_groups'] = count( $boxes );
			foreach ( $boxes as $box ) {
				$meta = is_object( $box ) && property_exists( $box, 'meta_box' ) ? (array) $box->meta_box : array();
				$show = isset( $meta['show_in_rest'] ) ? (bool) $meta['show_in_rest'] : false;
				if ( $show ) {
					++$result['exposed'];
				} else {
					++$result['hidden'];
					$result['hidden_groups'][] = array(
						'key'   => isset( $meta['id'] ) ? sanitize_text_field( (string) $meta['id'] ) : '',
						'title' => isset( $meta['title'] ) ? sanitize_text_field( (string) $meta['title'] ) : '',
					);
				}
			}
		} catch ( \Throwable $e ) {
			// Meta Box internals can vary; fail safe.
			return $result;
		}
		return $result;
	}

	/**
	 * Scan Pods field groups.
	 *
	 * Pods has REST API support built in but it's an opt-in setting per pod.
	 *
	 * @param array<string,mixed> $result Result template.
	 * @return array<string,mixed>
	 */
	private static function scan_pods( array $result ): array {
		if ( ! function_exists( 'pods_api' ) ) {
			return $result;
		}
		try {
			$api  = pods_api();
			$pods = method_exists( $api, 'load_pods' ) ? $api->load_pods() : array();
			if ( ! is_array( $pods ) ) {
				return $result;
			}
			$result['total_groups'] = count( $pods );
			foreach ( $pods as $pod ) {
				$pod_array = (array) $pod;
				$options   = isset( $pod_array['options'] ) ? (array) $pod_array['options'] : array();
				$show      = ! empty( $options['rest_enable'] ) || ! empty( $pod_array['rest_enable'] );
				if ( $show ) {
					++$result['exposed'];
				} else {
					++$result['hidden'];
					$result['hidden_groups'][] = array(
						'key'   => isset( $pod_array['name'] ) ? sanitize_text_field( (string) $pod_array['name'] ) : '',
						'title' => isset( $pod_array['label'] ) ? sanitize_text_field( (string) $pod_array['label'] ) : '',
					);
				}
			}
		} catch ( \Throwable $e ) {
			return $result;
		}
		return $result;
	}

	/**
	 * Flush the scan cache.
	 *
	 * @return void
	 */
	public static function flush_cache(): void {
		delete_transient( self::CACHE_KEY );
	}

	/**
	 * Bulk-expose every ACF / SCF field group to REST (sets `show_in_rest = true`
	 * on each). The default ACF UI buries this on every group's settings page
	 * one-by-one — headless setups need it on by default. v0.30+.
	 *
	 * Works for: ACF, ACF Pro, Secure Custom Fields (same API).
	 * Meta Box and Pods require their own native UIs — surfaced in the admin notice.
	 *
	 * @return array{ok:bool, updated:int, total:int, message:string}
	 */
	public static function expose_all_to_rest(): array {
		if ( ! function_exists( 'acf_get_field_groups' ) || ! function_exists( 'acf_update_field_group' ) ) {
			return array(
				'ok'      => false,
				'updated' => 0,
				'total'   => 0,
				'message' => __( 'ACF / SCF not active.', 'hatch' ),
			);
		}

		$groups = acf_get_field_groups();
		if ( ! is_array( $groups ) ) {
			return array( 'ok' => false, 'updated' => 0, 'total' => 0, 'message' => __( 'No field groups found.', 'hatch' ) );
		}

		$updated = 0;
		foreach ( $groups as $group ) {
			if ( empty( $group['show_in_rest'] ) ) {
				$group['show_in_rest'] = 1;
				acf_update_field_group( $group );
				++$updated;
			}
		}

		self::flush_cache();

		return array(
			'ok'      => true,
			'updated' => $updated,
			'total'   => count( $groups ),
			'message' => sprintf(
				/* translators: 1: number of groups updated, 2: total groups */
				_n( '%1$d of %2$d ACF group exposed to REST.', '%1$d of %2$d ACF groups exposed to REST.', $updated, 'hatch' ),
				$updated,
				count( $groups )
			),
		);
	}

	/**
	 * Should we show the admin notice?
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

		// Don't show on the Hatch settings page — that page has its own health panel.
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( $screen && false !== strpos( (string) $screen->id, 'hatch' ) ) {
			return;
		}

		$status = self::get_field_group_status();
		if ( $status['hidden'] < 1 ) {
			return;
		}

		$dismiss_url = wp_nonce_url(
			add_query_arg( 'hatch_dismiss_acf_notice', '1' ),
			'hatch_dismiss_acf_notice'
		);

		$plugin_label = self::plugin_label( $status['plugin'] );
		?>
		<div class="notice notice-warning is-dismissible">
			<p>
				<strong><?php esc_html_e( 'Hatch — Headless WordPress', 'hatch' ); ?>:</strong>
				<?php
				printf(
					/* translators: 1: number of hidden field groups, 2: plugin label */
					esc_html( _n(
						'%1$d %2$s field group is hidden from the REST API. Your headless frontend cannot read these fields.',
						'%1$d %2$s field groups are hidden from the REST API. Your headless frontend cannot read these fields.',
						(int) $status['hidden'],
						'hatch'
					) ),
					(int) $status['hidden'],
					esc_html( $plugin_label )
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
	 * Handle dismiss click — verify nonce and store transient for 7 days.
	 *
	 * @return void
	 */
	public function maybe_dismiss_notice(): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- nonce checked below.
		if ( empty( $_GET['hatch_dismiss_acf_notice'] ) ) {
			return;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$nonce = isset( $_GET['_wpnonce'] ) ? sanitize_text_field( wp_unslash( (string) $_GET['_wpnonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'hatch_dismiss_acf_notice' ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		set_transient( self::DISMISS_KEY, 1, 7 * DAY_IN_SECONDS );
		wp_safe_redirect( remove_query_arg( array( 'hatch_dismiss_acf_notice', '_wpnonce' ) ) );
		exit;
	}

	/**
	 * Human-readable plugin label.
	 *
	 * @param string $key Plugin key.
	 * @return string
	 */
	public static function plugin_label( string $key ): string {
		$labels = array(
			'acf'       => 'ACF',
			'acf_pro'   => 'ACF Pro',
			'secure_cf' => 'Secure Custom Fields',
			'meta_box'  => 'Meta Box',
			'pods'      => 'Pods',
			'none'      => '',
		);
		return isset( $labels[ $key ] ) ? $labels[ $key ] : '';
	}
}

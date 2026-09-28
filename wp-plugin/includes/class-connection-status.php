<?php
/**
 * Connection status: real verification of the headless frontend.
 *
 * "Connected" is only reported when the frontend URL the administrator saved
 * actually answered a request. The Test connection button sends a plain GET to
 * the frontend and, when a revalidate endpoint is configured, a signed test
 * ping to it. The result is recorded and a low-frequency cron event marks the
 * connection stale when the last successful check is more than a day old.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Connection_Status
 */
class Hatch_Connection_Status {

	/**
	 * Hosting model, set by a successful deploy. Either cloudflare-workers or empty.
	 */
	const OPT_HOSTING_MODEL = 'hatch_hosting_model';

	/** Webhook ack path */
	const OPT_LAST_ACK        = 'hatch_last_webhook_ack';
	const OPT_LAST_ACK_STATUS = 'hatch_last_webhook_ack_status'; // Values: ok, fail, or empty.
	const ACK_TTL             = 86400; // 24h - treat as connected if acked within last day

	/** Computed status (updated by cron) */
	const OPT_CONNECTED       = 'hatch_connected';
	const OPT_DISCONNECT_NOTE = 'hatch_disconnect_note';

	/** Custom cron schedule */
	const CRON_HOOK     = 'hatch_check_connection';
	const CRON_INTERVAL = 'hourly';

	/**
	 * @var Hatch_Connection_Status|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Connection_Status
	 */
	public static function instance(): Hatch_Connection_Status {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire hooks.
	 */
	private function __construct() {
		// Cron callback that updates connection status.
		add_action( self::CRON_HOOK, array( $this, 'check_connection_freshness' ) );
		add_action( 'init', array( __CLASS__, 'ensure_cron' ) );

		// REST routes.
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/* ----------------------------------------------------------------
	 * CRON
	 * ---------------------------------------------------------------- */

	/**
	 * Ensure the freshness cron event is scheduled with the current interval.
	 *
	 * @return void
	 */
	public static function ensure_cron(): void {
		$event = wp_get_scheduled_event( self::CRON_HOOK );
		if ( $event && self::CRON_INTERVAL !== $event->schedule ) {
			// An older release used a one-minute custom interval that no longer exists.
			wp_clear_scheduled_hook( self::CRON_HOOK );
			$event = false;
		}
		if ( ! $event ) {
			wp_schedule_event( time() + MINUTE_IN_SECONDS, self::CRON_INTERVAL, self::CRON_HOOK );
		}
	}

	/**
	 * Unschedule cron. Called from deactivation.
	 *
	 * @return void
	 */
	public static function clear_cron(): void {
		wp_clear_scheduled_hook( self::CRON_HOOK );
	}

	/**
	 * Cron callback. Updates `hatch_connected` based on real signals.
	 *
	 * Reads stored options only; it makes no network request.
	 *
	 * @return void
	 */
	public function check_connection_freshness(): void {
		$model = (string) get_option( self::OPT_HOSTING_MODEL, '' );

		if ( '' === $model ) {
			update_option( self::OPT_CONNECTED, 0 );
			update_option( self::OPT_DISCONNECT_NOTE, __( 'Setup not complete.', 'hatch-bridge' ) );
			return;
		}

		// Every hosting model is verified through the recorded probe result.
		$last_ack = (int) get_option( self::OPT_LAST_ACK, 0 );
		$status   = (string) get_option( self::OPT_LAST_ACK_STATUS, '' );
		$stale    = ( time() - $last_ack ) > self::ACK_TTL;

		if ( 0 === $last_ack ) {
			update_option( self::OPT_CONNECTED, 0 );
			update_option( self::OPT_DISCONNECT_NOTE, __( 'Webhook never reached your frontend. Click "Test connection".', 'hatch-bridge' ) );
		} elseif ( 'fail' === $status ) {
			update_option( self::OPT_CONNECTED, 0 );
			update_option( self::OPT_DISCONNECT_NOTE, __( 'Frontend probe failed. Confirm the deploy is live and reachable, then re-test.', 'hatch-bridge' ) );
		} elseif ( $stale ) {
			update_option( self::OPT_CONNECTED, 0 );
			update_option(
				self::OPT_DISCONNECT_NOTE,
				sprintf(
					/* translators: %s: human-readable time diff */
					__( 'Last successful webhook was %s ago. Re-verify with "Test connection".', 'hatch-bridge' ),
					human_time_diff( $last_ack )
				)
			);
		} else {
			update_option( self::OPT_CONNECTED, 1 );
			delete_option( self::OPT_DISCONNECT_NOTE );
		}
	}

	/* ----------------------------------------------------------------
	 * STATE READERS (used by admin UI)
	 * ---------------------------------------------------------------- */

	/**
	 * Is the frontend currently considered connected?
	 *
	 * @return bool
	 */
	public static function is_connected(): bool {
		return (bool) get_option( self::OPT_CONNECTED, 0 );
	}

	/**
	 * Human-readable disconnect reason (if any).
	 *
	 * @return string
	 */
	public static function disconnect_note(): string {
		return (string) get_option( self::OPT_DISCONNECT_NOTE, '' );
	}

	/**
	 * Set the hosting model. Called after a successful deploy.
	 *
	 * @param string $model 'cloudflare-workers' or ''.
	 * @return bool
	 */
	public static function set_hosting_model( string $model ): bool {
		$allowed = array( 'cloudflare-workers', '' );
		if ( ! in_array( $model, $allowed, true ) ) {
			return false;
		}
		return (bool) update_option( self::OPT_HOSTING_MODEL, $model );
	}

	/**
	 * Read the configured hosting model.
	 *
	 * @return string
	 */
	public static function get_hosting_model(): string {
		$model = (string) get_option( self::OPT_HOSTING_MODEL, '' );
		return 'cloudflare-workers' === $model ? $model : '';
	}

	/**
	 * Get full status report for the admin UI.
	 *
	 * @return array{connected:bool,model:string,note:string,last_seen:int,last_seen_human:string,heartbeat_data:array}
	 */
	public static function report(): array {
		$model     = self::get_hosting_model();
		$connected = self::is_connected();
		$note      = self::disconnect_note();

		$last_seen = (int) get_option( self::OPT_LAST_ACK, 0 );

		$last_seen_human = $last_seen > 0
			? sprintf( /* translators: %s: time diff */ __( '%s ago', 'hatch-bridge' ), human_time_diff( $last_seen ) )
			: __( 'never', 'hatch-bridge' );

		return array(
			'connected'       => $connected,
			'model'           => $model,
			'note'            => $note,
			'last_seen'       => $last_seen,
			'last_seen_human' => $last_seen_human,
			'heartbeat_data'  => array(),
		);
	}

	/* ----------------------------------------------------------------
	 * VERIFICATION - frontend probe + optional webhook ping
	 * ---------------------------------------------------------------- */

	/**
	 * Send a synthetic test webhook + record the result.
	 *
	 * Returns the result for the admin UI to surface.
	 *
	 * @return array{ok:bool,code:int,message:string}
	 */
	public static function verify_webhook(): array {
		$frontend = (string) get_option( 'hatch_frontend_url', '' );
		$endpoint = trim( (string) get_option( 'hatch_revalidate_endpoint', '' ) );
		$secret   = (string) get_option( 'hatch_webhook_secret', '' );

		// SSR-mode reality: in v0.16+ the frontend is fetched live at request
		// time and edge-cached for 60s. The /api/revalidate webhook is purely
		// opt-in (forces a cache purge faster than the TTL). So "Test
		// connection" must succeed when the FRONTEND IS REACHABLE - not when
		// the webhook returns 200. Strategy:
		//
		//   1. If frontend URL is set → GET it, expect 200/3xx. Done.
		//   2. If revalidate endpoint is also set → also POST it, but the
		//      result is informational, not a hard fail.
		//
		// That way users with a working Cloudflare Workers deploy never see
		// red just because they haven't wired the revalidate route.

		$probe_url = '' !== (string) $frontend ? $frontend : $endpoint;
		if ( '' === $probe_url ) {
			update_option( self::OPT_LAST_ACK_STATUS, 'fail' );
			return array(
				'ok'      => false,
				'code'    => 0,
				'message' => __( 'No frontend URL configured. Deploy first from the Hatch Connection tab.', 'hatch-bridge' ),
			);
		}
		if ( ! filter_var( $probe_url, FILTER_VALIDATE_URL ) ) {
			update_option( self::OPT_LAST_ACK_STATUS, 'fail' );
			return array(
				'ok'      => false,
				'code'    => 0,
				'message' => __( 'Frontend URL is malformed.', 'hatch-bridge' ),
			);
		}

		// Step 1 - plain GET on the frontend root. This is the source of truth.
		$probe_origin = self::origin_of( $probe_url );
		$probe        = wp_remote_get(
			$probe_origin,
			array(
				'timeout'     => 10,
				'redirection' => 3,
				'sslverify'   => true,
				'headers'     => array(
					'X-Hatch-Version' => HATCH_VERSION,
					'Accept'          => 'text/html',
				),
			)
		);

		if ( is_wp_error( $probe ) ) {
			update_option( self::OPT_LAST_ACK_STATUS, 'fail' );
			update_option( self::OPT_LAST_ACK, time() );
			return array(
				'ok'      => false,
				'code'    => 0,
				'message' => sprintf(
					/* translators: 1: URL 2: error */
					__( 'Could not reach %1$s: %2$s', 'hatch-bridge' ),
					$probe_origin,
					$probe->get_error_message()
				),
			);
		}

		$probe_code = (int) wp_remote_retrieve_response_code( $probe );
		$probe_ok   = ( $probe_code >= 200 && $probe_code < 400 );

		// Step 2 - optional revalidate webhook ping. Result is informational only.
		$webhook_msg = '';
		if ( '' !== $endpoint && '' !== $secret ) {
			$webhook = wp_remote_post(
				$endpoint,
				array(
					'method'   => 'POST',
					'timeout'  => 6,
					'blocking' => true,
					'headers'  => array(
						'Content-Type'    => 'application/json',
						'X-Hatch-Version' => HATCH_VERSION,
						'X-Hatch-Secret'  => $secret,
						'X-Hatch-Test'    => '1',
					),
					'body'     => wp_json_encode(
						array(
							'event' => 'hatch_test_ping',
							'tag'   => 'verify',
							'ts'    => time(),
						)
					),
				)
			);
			if ( ! is_wp_error( $webhook ) ) {
				$wc = (int) wp_remote_retrieve_response_code( $webhook );
				if ( $wc >= 200 && $wc < 400 ) {
					$webhook_msg = sprintf( /* translators: %d: code */ __( ' Revalidate webhook returned HTTP %d (will purge cache faster than 60s TTL).', 'hatch-bridge' ), $wc );
				} else {
					$webhook_msg = sprintf( /* translators: %d: code */ __( ' Revalidate webhook returned HTTP %d. It is optional in SSR mode and safe to ignore.', 'hatch-bridge' ), $wc );
				}
			}
		}

		update_option( self::OPT_LAST_ACK_STATUS, $probe_ok ? 'ok' : 'fail' );
		update_option( self::OPT_LAST_ACK, time() );

		// Trigger immediate freshness check so the UI updates without waiting for cron.
		self::instance()->check_connection_freshness();

		return array(
			'ok'      => $probe_ok,
			'code'    => $probe_code,
			'message' => $probe_ok
				? sprintf(
					/* translators: 1: URL 2: code 3: webhook info */
					__( 'Frontend at %1$s responded with HTTP %2$d.%3$s', 'hatch-bridge' ),
					$probe_origin,
					$probe_code,
					$webhook_msg
				)
				: sprintf(
					/* translators: 1: URL 2: code */
					__( 'Frontend at %1$s responded with HTTP %2$d. Make sure the deploy is live.', 'hatch-bridge' ),
					$probe_origin,
					$probe_code
				),
		);
	}

	/**
	 * Strip path/query from a URL - return just scheme://host[:port].
	 *
	 * @param string $url
	 * @return string
	 */
	private static function origin_of( string $url ): string {
		$p = wp_parse_url( $url );
		if ( ! $p || empty( $p['scheme'] ) || empty( $p['host'] ) ) {
			return $url;
		}
		$port = ! empty( $p['port'] ) ? ':' . (int) $p['port'] : '';
		return $p['scheme'] . '://' . $p['host'] . $port;
	}

	/* ----------------------------------------------------------------
	 * REST
	 * ---------------------------------------------------------------- */

	/**
	 * Register the verify and status routes.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		// Admin trigger to run a webhook verification.
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/verify-connection',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_verify_connection' ),
				'permission_callback' => array( 'Hatch_Rest_Api', 'permission_admin_static' ),
			)
		);

		// Admin status read.
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/connection-status',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_status' ),
				'permission_callback' => array( 'Hatch_Rest_Api', 'permission_admin_static' ),
			)
		);
	}

	/**
	 * POST /hatch/v1/verify-connection - manually trigger a webhook test.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function route_verify_connection( WP_REST_Request $request ) {
		unset( $request );
		$result = self::verify_webhook();
		return new WP_REST_Response( $result, $result['ok'] ? 200 : 502 );
	}

	/**
	 * GET /hatch/v1/connection-status - current state.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function route_status( WP_REST_Request $request ): WP_REST_Response {
		unset( $request );
		return new WP_REST_Response( self::report(), 200 );
	}
}

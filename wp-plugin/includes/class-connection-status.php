<?php
/**
 * Hatch Connection Status — REAL verification, not vibe.
 *
 * Two verification paths depending on hosting model:
 *
 *   1. WEBHOOK ACK PATH  (Cloudflare Pages / Vercel / any static host)
 *      - User adds frontend URL → WP POSTs synthetic ping
 *      - Frontend's /api/revalidate responds within 5s → ACK recorded
 *      - Status: "Connected" iff last ack < 24h ago
 *      - User can re-verify anytime via "Test connection" button
 *
 *   2. HEARTBEAT PATH  (VPS with Hatch Agent)
 *      - Agent on VPS POSTs heartbeat every 60s
 *      - WP records last_heartbeat timestamp
 *      - wp-cron checks every minute (custom interval)
 *      - If last heartbeat > 3min ago → marked "Disconnected"
 *      - UI shows real status + reconnect instructions
 *
 * "Connected" claim NEVER shown unless one of these confirms.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Connection_Status
 */
class Hatch_Connection_Status {

	/** Hosting model — set once in setup wizard, lives forever. */
	const OPT_HOSTING_MODEL = 'hatch_hosting_model';  // 'cloudflare-pages' | 'vercel' | 'vps' | ''

	/** Webhook ack path */
	const OPT_LAST_ACK         = 'hatch_last_webhook_ack';
	const OPT_LAST_ACK_STATUS  = 'hatch_last_webhook_ack_status';  // 'ok' | 'fail' | ''
	const ACK_TTL              = 86400; // 24h — treat as connected if acked within last day

	/** Heartbeat path */
	const OPT_LAST_HEARTBEAT      = 'hatch_agent_last_heartbeat';
	const OPT_LAST_HEARTBEAT_DATA = 'hatch_agent_last_heartbeat_data';
	const HEARTBEAT_STALE         = 180; // 3 min grace window

	/** Computed status (updated by cron) */
	const OPT_CONNECTED       = 'hatch_connected';
	const OPT_DISCONNECT_NOTE = 'hatch_disconnect_note';

	/** Custom cron schedule */
	const CRON_HOOK     = 'hatch_check_connection';
	const CRON_INTERVAL = 'hatch_minute';

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
		// Custom 1-minute cron interval (WP default minimum is 5min — we need finer).
		add_filter( 'cron_schedules', array( $this, 'register_cron_interval' ) );

		// Cron callback that updates connection status.
		add_action( self::CRON_HOOK, array( $this, 'check_connection_freshness' ) );

		// REST routes.
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/* ----------------------------------------------------------------
	 * CRON
	 * ---------------------------------------------------------------- */

	/**
	 * Register the 1-minute cron interval.
	 *
	 * @param array $schedules Existing schedules.
	 * @return array
	 */
	public function register_cron_interval( array $schedules ): array {
		if ( ! isset( $schedules[ self::CRON_INTERVAL ] ) ) {
			$schedules[ self::CRON_INTERVAL ] = array(
				'interval' => 60,
				'display'  => __( 'Every minute (Hatch)', 'hatch' ),
			);
		}
		return $schedules;
	}

	/**
	 * Ensure the cron event is scheduled. Called from activation.
	 *
	 * @return void
	 */
	public static function ensure_cron(): void {
		if ( ! wp_next_scheduled( self::CRON_HOOK ) ) {
			wp_schedule_event( time(), self::CRON_INTERVAL, self::CRON_HOOK );
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
	 * This runs on real WP page loads (since we hook wp-cron). No external
	 * dependency — purely reactive to traffic + scheduled events.
	 *
	 * @return void
	 */
	public function check_connection_freshness(): void {
		$model = (string) get_option( self::OPT_HOSTING_MODEL, '' );

		if ( '' === $model ) {
			update_option( self::OPT_CONNECTED, 0 );
			update_option( self::OPT_DISCONNECT_NOTE, __( 'Setup not complete.', 'hatch' ) );
			return;
		}

		if ( 'vps' === $model ) {
			// Heartbeat path.
			$last = (int) get_option( self::OPT_LAST_HEARTBEAT, 0 );
			$stale = ( time() - $last ) > self::HEARTBEAT_STALE;
			update_option( self::OPT_CONNECTED, $stale ? 0 : 1 );
			if ( $stale ) {
				update_option(
					self::OPT_DISCONNECT_NOTE,
					0 === $last
						? __( 'Hatch Agent has not contacted this WordPress yet. Run the install command on your VPS.', 'hatch' )
						: sprintf(
							/* translators: %s: human-readable time diff */
							__( 'Last heartbeat %s ago. Agent may have crashed or been firewalled.', 'hatch' ),
							human_time_diff( $last )
						)
				);
			} else {
				delete_option( self::OPT_DISCONNECT_NOTE );
			}
			return;
		}

		// Cloudflare Pages / Vercel path — webhook ack.
		$last_ack = (int) get_option( self::OPT_LAST_ACK, 0 );
		$status   = (string) get_option( self::OPT_LAST_ACK_STATUS, '' );
		$stale    = ( time() - $last_ack ) > self::ACK_TTL;

		if ( 0 === $last_ack ) {
			update_option( self::OPT_CONNECTED, 0 );
			update_option( self::OPT_DISCONNECT_NOTE, __( 'Webhook never reached your frontend. Click "Test connection".', 'hatch' ) );
		} elseif ( 'fail' === $status ) {
			update_option( self::OPT_CONNECTED, 0 );
			update_option( self::OPT_DISCONNECT_NOTE, __( 'Frontend probe failed. Confirm the deploy is live and reachable, then re-test.', 'hatch' ) );
		} elseif ( $stale ) {
			update_option( self::OPT_CONNECTED, 0 );
			update_option(
				self::OPT_DISCONNECT_NOTE,
				sprintf(
					/* translators: %s: human-readable time diff */
					__( 'Last successful webhook was %s ago. Re-verify with "Test connection".', 'hatch' ),
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
	 * Set the hosting model. Called from the wizard step 4.
	 *
	 * @param string $model 'cloudflare-pages' | 'vercel' | 'vps'
	 * @return bool
	 */
	public static function set_hosting_model( string $model ): bool {
		$allowed = array( 'cloudflare-pages', 'vercel', 'vps', '' );
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
		return (string) get_option( self::OPT_HOSTING_MODEL, '' );
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

		$last_seen = 0;
		$hb_data   = array();
		if ( 'vps' === $model ) {
			$last_seen = (int) get_option( self::OPT_LAST_HEARTBEAT, 0 );
			$hb_data   = (array) get_option( self::OPT_LAST_HEARTBEAT_DATA, array() );
		} else {
			$last_seen = (int) get_option( self::OPT_LAST_ACK, 0 );
		}

		$last_seen_human = $last_seen > 0
			? sprintf( /* translators: %s: time diff */ __( '%s ago', 'hatch' ), human_time_diff( $last_seen ) )
			: __( 'never', 'hatch' );

		return array(
			'connected'       => $connected,
			'model'           => $model,
			'note'            => $note,
			'last_seen'       => $last_seen,
			'last_seen_human' => $last_seen_human,
			'heartbeat_data'  => $hb_data,
		);
	}

	/* ----------------------------------------------------------------
	 * VERIFICATION — webhook ack path (CF Pages / Vercel)
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
		// connection" must succeed when the FRONTEND IS REACHABLE — not when
		// the webhook returns 200. Strategy:
		//
		//   1. If frontend URL is set → GET it, expect 200/3xx. Done.
		//   2. If revalidate endpoint is also set → also POST it, but the
		//      result is informational, not a hard fail.
		//
		// That way users with a working CF Workers / Vercel deploy never see
		// red just because they haven't wired the revalidate route.

		$probe_url = $frontend ?: $endpoint;
		if ( '' === $probe_url ) {
			update_option( self::OPT_LAST_ACK_STATUS, 'fail' );
			return array(
				'ok'      => false,
				'code'    => 0,
				'message' => __( 'No frontend URL configured. Deploy first from Tools → Hatch.', 'hatch' ),
			);
		}
		if ( ! filter_var( $probe_url, FILTER_VALIDATE_URL ) ) {
			update_option( self::OPT_LAST_ACK_STATUS, 'fail' );
			return array(
				'ok'      => false,
				'code'    => 0,
				'message' => __( 'Frontend URL is malformed.', 'hatch' ),
			);
		}

		// Step 1 — plain GET on the frontend root. This is the source of truth.
		$probe_origin = self::origin_of( $probe_url );
		$probe        = wp_remote_get( $probe_origin, array(
			'timeout'     => 10,
			'redirection' => 3,
			'sslverify'   => true,
			'headers'     => array(
				'X-Hatch-Version' => HATCH_VERSION,
				'Accept'          => 'text/html',
			),
		) );

		if ( is_wp_error( $probe ) ) {
			update_option( self::OPT_LAST_ACK_STATUS, 'fail' );
			update_option( self::OPT_LAST_ACK, time() );
			return array(
				'ok'      => false,
				'code'    => 0,
				'message' => sprintf(
					/* translators: 1: URL 2: error */
					__( 'Could not reach %1$s — %2$s', 'hatch' ),
					$probe_origin,
					$probe->get_error_message()
				),
			);
		}

		$probe_code = (int) wp_remote_retrieve_response_code( $probe );
		$probe_ok   = ( $probe_code >= 200 && $probe_code < 400 );

		// Step 2 — optional revalidate webhook ping. Result is informational only.
		$webhook_msg = '';
		if ( '' !== $endpoint && '' !== $secret ) {
			$webhook = wp_remote_post(
				add_query_arg( 'secret', rawurlencode( $secret ), $endpoint ),
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
					'body'     => wp_json_encode( array(
						'event' => 'hatch_test_ping',
						'tag'   => 'verify',
						'ts'    => time(),
					) ),
				)
			);
			if ( ! is_wp_error( $webhook ) ) {
				$wc = (int) wp_remote_retrieve_response_code( $webhook );
				if ( $wc >= 200 && $wc < 400 ) {
					$webhook_msg = sprintf( /* translators: %d: code */ __( ' Revalidate webhook returned HTTP %d (will purge cache faster than 60s TTL).', 'hatch' ), $wc );
				} else {
					$webhook_msg = sprintf( /* translators: %d: code */ __( ' Revalidate webhook returned HTTP %d — optional in SSR mode, OK to ignore.', 'hatch' ), $wc );
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
					__( 'Frontend at %1$s responded with HTTP %2$d.%3$s', 'hatch' ),
					$probe_origin,
					$probe_code,
					$webhook_msg
				)
				: sprintf(
					/* translators: 1: URL 2: code */
					__( 'Frontend at %1$s responded with HTTP %2$d. Make sure the deploy is live.', 'hatch' ),
					$probe_origin,
					$probe_code
				),
		);
	}

	/**
	 * Strip path/query from a URL — return just scheme://host[:port].
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
	 * VERIFICATION — heartbeat path (VPS agent)
	 * ---------------------------------------------------------------- */

	/**
	 * Register heartbeat REST route + verify route.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		// Heartbeat receiver — public route, but every request is HMAC-signed.
		// We verify HMAC inside the callback (can't use permission_callback
		// because the agent has no WP user — it has a secret).
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/agent/heartbeat',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_heartbeat' ),
				'permission_callback' => '__return_true',
			)
		);

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
	 * POST /hatch/v1/agent/heartbeat
	 *
	 * Agent on VPS calls this every 60s. Body:
	 *   {
	 *     "agent_version": "0.7.0",
	 *     "frontend_url":  "https://mysite.com",
	 *     "node_version":  "v22.1.0",
	 *     "pm2_status":    "online",
	 *     "uptime_s":      12345
	 *   }
	 *
	 * Headers:
	 *   X-Hatch-Timestamp: <unix ts>
	 *   X-Hatch-Signature: hmac-sha256(secret, timestamp + "." + body)
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function route_heartbeat( WP_REST_Request $request ) {
		$body  = (string) $request->get_body();
		$ts    = (int) $request->get_header( 'X-Hatch-Timestamp' );
		$sig   = (string) $request->get_header( 'X-Hatch-Signature' );

		// Verify HMAC.
		$secret = (string) get_option( 'hatch_webhook_secret', '' );
		if ( '' === $secret ) {
			return new WP_Error( 'hatch_no_secret', __( 'WP not configured.', 'hatch' ), array( 'status' => 503 ) );
		}
		if ( abs( time() - $ts ) > 300 ) {
			return new WP_Error( 'hatch_clock_skew', __( 'Timestamp out of window.', 'hatch' ), array( 'status' => 401 ) );
		}
		$expected = hash_hmac( 'sha256', $ts . '.' . $body, $secret );
		if ( ! hash_equals( $expected, $sig ) ) {
			return new WP_Error( 'hatch_bad_signature', __( 'Invalid signature.', 'hatch' ), array( 'status' => 401 ) );
		}

		// Parse body.
		$data = json_decode( $body, true );
		if ( ! is_array( $data ) ) {
			$data = array();
		}
		$sanitized = array(
			'agent_version' => isset( $data['agent_version'] ) ? sanitize_text_field( (string) $data['agent_version'] ) : '',
			'frontend_url'  => isset( $data['frontend_url'] )  ? esc_url_raw( (string) $data['frontend_url'] )           : '',
			'node_version'  => isset( $data['node_version'] )  ? sanitize_text_field( (string) $data['node_version'] )  : '',
			'pm2_status'    => isset( $data['pm2_status'] )    ? sanitize_text_field( (string) $data['pm2_status'] )    : '',
			'uptime_s'      => isset( $data['uptime_s'] )      ? (int) $data['uptime_s']                                : 0,
		);

		update_option( self::OPT_LAST_HEARTBEAT, time() );
		update_option( self::OPT_LAST_HEARTBEAT_DATA, $sanitized );

		// Immediate cron run so status flips to "connected" right away.
		$this->check_connection_freshness();

		return new WP_REST_Response( array( 'ok' => true, 'received_at' => time() ), 200 );
	}

	/**
	 * POST /hatch/v1/verify-connection — manually trigger a webhook test.
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
	 * GET /hatch/v1/connection-status — current state.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function route_status( WP_REST_Request $request ): WP_REST_Response {
		unset( $request );
		return new WP_REST_Response( self::report(), 200 );
	}
}

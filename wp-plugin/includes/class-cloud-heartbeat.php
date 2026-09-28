<?php
/**
 * Frontend liveness probe.
 *
 * Runs a WP-cron event every fifteen minutes that sends a HEAD request to the
 * frontend URL the administrator configured (hatch_frontend_url), records the
 * HTTP status and round-trip time, and keeps a short rolling history for the
 * Status panel. The only host contacted is the administrator's own frontend;
 * nothing is sent to the plugin author or any third party, and no probe runs
 * until a frontend URL has been saved.
 *
 * Stored in the option "hatch_heartbeat_{provider}" (autoload off):
 *   ts       Unix time of the last probe.
 *   status   HTTP status code, 0 when the host was unreachable.
 *   rtt_ms   Round-trip time in milliseconds, 0 on error.
 *   history  Newest-last list of { ts, status, rtt_ms }, capped at 12.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Frontend heartbeat probe and reader.
 */
class Hatch_Cloud_Heartbeat {

	const CRON_HOOK   = 'hatch_cloud_heartbeat';
	const CRON_RECUR  = 'hatch_15_min';
	const OPT_PREFIX  = 'hatch_heartbeat_';
	const HISTORY_MAX = 12;
	const NONCE       = 'hatch_probe_heartbeat';

	/**
	 * Singleton accessor.
	 *
	 * @return self
	 */
	public static function instance(): self {
		static $instance = null;
		if ( null === $instance ) {
			$instance = new self();
		}
		return $instance;
	}

	/**
	 * Register hooks.
	 */
	private function __construct() {
		add_filter( 'cron_schedules', array( $this, 'register_schedule' ) );
		add_action( self::CRON_HOOK, array( $this, 'run' ) );
		add_action( 'init', array( $this, 'ensure_scheduled' ) );
		add_action( 'admin_post_hatch_probe_heartbeat', array( $this, 'handle_probe_now' ) );
	}

	/**
	 * Map the stored hosting model to the key the heartbeat is stored under.
	 *
	 * @param string $model Value of hatch_hosting_model.
	 * @return string "cloudflare" or "generic".
	 */
	public static function provider_for_model( string $model ): string {
		return in_array( $model, array( 'cloudflare-workers' ), true ) ? 'cloudflare' : 'generic';
	}

	/**
	 * Admin-post handler: probe now, on request from the Connection tab.
	 *
	 * @return void
	 */
	public function handle_probe_now(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to do this.', 'hatch-bridge' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( self::NONCE );

		$url = trim( (string) get_option( 'hatch_frontend_url', '' ) );
		if ( '' !== $url ) {
			$this->probe_and_store( self::provider_for_model( (string) get_option( 'hatch_hosting_model', '' ) ), $url );
		}

		wp_safe_redirect( admin_url( 'admin.php?page=hatch#connection' ) );
		exit;
	}

	/**
	 * Add the fifteen-minute cron interval.
	 *
	 * @param array<string,array<string,mixed>> $schedules Existing schedules.
	 * @return array<string,array<string,mixed>>
	 */
	public function register_schedule( $schedules ) {
		if ( ! isset( $schedules[ self::CRON_RECUR ] ) ) {
			$schedules[ self::CRON_RECUR ] = array(
				'interval' => 15 * MINUTE_IN_SECONDS,
				'display'  => __( 'Every 15 minutes (Hatch)', 'hatch-bridge' ),
			);
		}
		return $schedules;
	}

	/**
	 * Schedule the probe once a frontend URL exists; unschedule when it is removed.
	 *
	 * @return void
	 */
	public function ensure_scheduled(): void {
		$has_url = '' !== trim( (string) get_option( 'hatch_frontend_url', '' ) );
		if ( ! $has_url ) {
			self::clear_schedule();
			return;
		}
		if ( ! wp_next_scheduled( self::CRON_HOOK ) ) {
			wp_schedule_event( time() + 60, self::CRON_RECUR, self::CRON_HOOK );
		}
	}

	/**
	 * Remove the scheduled probe.
	 *
	 * @return void
	 */
	public static function clear_schedule(): void {
		wp_clear_scheduled_hook( self::CRON_HOOK );
	}

	/**
	 * Cron callback: probe the configured frontend.
	 *
	 * @return void
	 */
	public function run(): void {
		$frontend = trim( (string) get_option( 'hatch_frontend_url', '' ) );
		if ( '' === $frontend ) {
			return;
		}
		$this->probe_and_store( self::provider_for_model( (string) get_option( 'hatch_hosting_model', '' ) ), $frontend );
	}

	/**
	 * Send a HEAD request and store the outcome.
	 *
	 * @param string $provider Storage key.
	 * @param string $url      Frontend URL.
	 * @return void
	 */
	private function probe_and_store( string $provider, string $url ): void {
		$start  = microtime( true );
		$res    = wp_remote_head(
			$url,
			array(
				'timeout'     => 8,
				'redirection' => 3,
				'sslverify'   => true,
				'user-agent'  => 'Hatch-Heartbeat/1.0',
			)
		);
		$rtt_ms = (int) round( ( microtime( true ) - $start ) * 1000 );

		$status = is_wp_error( $res ) ? 0 : (int) wp_remote_retrieve_response_code( $res );
		if ( 0 === $status ) {
			$rtt_ms = 0;
		}

		$opt_key   = self::OPT_PREFIX . $provider;
		$prev      = (array) get_option( $opt_key, array() );
		$history   = isset( $prev['history'] ) && is_array( $prev['history'] ) ? $prev['history'] : array();
		$history[] = array(
			'ts'     => time(),
			'status' => $status,
			'rtt_ms' => $rtt_ms,
		);
		if ( count( $history ) > self::HISTORY_MAX ) {
			$history = array_slice( $history, -self::HISTORY_MAX );
		}

		update_option(
			$opt_key,
			array(
				'ts'      => time(),
				'status'  => $status,
				'rtt_ms'  => $rtt_ms,
				'history' => $history,
			),
			false
		);
	}

	/**
	 * Read the heartbeat record. Any provider name is accepted; a record
	 * stored under the Cloudflare or generic key is used when none exists for
	 * the requested one, so callers written for older hosting models keep working.
	 *
	 * @param string $provider Provider key, for example "cloudflare".
	 * @return array<string,mixed>|null Null when no probe has run yet.
	 */
	public static function get( string $provider ): ?array {
		$keys = array_unique( array( sanitize_key( $provider ), 'cloudflare', 'generic' ) );
		foreach ( $keys as $key ) {
			$opt = get_option( self::OPT_PREFIX . $key, array() );
			if ( is_array( $opt ) && ! empty( $opt['ts'] ) ) {
				$opt['ttfb_ms'] = isset( $opt['rtt_ms'] ) ? (int) $opt['rtt_ms'] : 0;
				$opt['source']  = 'probe';
				return $opt;
			}
		}
		return null;
	}

	/**
	 * Is the record too old to trust? The probe runs every 15 minutes, so three missed
	 * runs means the cron is not firing.
	 *
	 * @param array<string,mixed> $record Record from get().
	 * @return bool
	 */
	private static function is_stale( array $record ): bool {
		return ( time() - (int) ( $record['ts'] ?? 0 ) ) > 3 * 15 * MINUTE_IN_SECONDS;
	}

	/**
	 * Health label for a record, used for the status dot colour.
	 *
	 * @param array<string,mixed>|null $record Record from get().
	 * @return string "good", "warn", "bad" or "muted".
	 */
	public static function health( ?array $record ): string {
		if ( ! $record || empty( $record['ts'] ) ) {
			return 'muted';
		}
		if ( self::is_stale( $record ) ) {
			return 'bad';
		}
		$status = (int) ( $record['status'] ?? 0 );
		if ( $status >= 200 && $status < 400 ) {
			return 'good';
		}
		if ( 0 === $status || $status >= 500 ) {
			return 'bad';
		}
		return 'warn';
	}

	/**
	 * Sentence describing a record, always consistent with health() for the same record.
	 *
	 * A response time is only quoted when the frontend answered with a success or
	 * redirect status; an error status or no answer says so instead.
	 *
	 * @param array<string,mixed>|null $record Record from get().
	 * @return string Plain text, translated.
	 */
	public static function label( ?array $record ): string {
		if ( ! $record || empty( $record['ts'] ) ) {
			return __( 'No check yet. The first one runs within a few minutes of a deploy.', 'hatch-bridge' );
		}
		$age = human_time_diff( (int) $record['ts'] );
		if ( self::is_stale( $record ) ) {
			/* translators: %s: how long ago the last check ran, for example "3 hours". */
			return sprintf( __( 'No recent check. The last one ran %s ago.', 'hatch-bridge' ), $age );
		}
		$status = (int) ( $record['status'] ?? 0 );
		$rtt    = (int) ( $record['rtt_ms'] ?? 0 );
		if ( 0 === $status ) {
			/* translators: %s: how long ago the check ran, for example "3 mins". */
			return sprintf( __( 'No response from the frontend. Last checked %s ago.', 'hatch-bridge' ), $age );
		}
		if ( $status >= 200 && $status < 400 ) {
			/* translators: 1: response time in milliseconds, for example "180 ms". 2: how long ago the check ran, for example "3 mins". */
			return sprintf( __( 'Responded in %1$s. Last checked %2$s ago.', 'hatch-bridge' ), $rtt . ' ms', $age );
		}
		/* translators: 1: HTTP status code, for example "503". 2: how long ago the check ran, for example "3 mins". */
		return sprintf( __( 'The frontend answered with HTTP %1$d. Last checked %2$s ago.', 'hatch-bridge' ), $status, $age );
	}
}

Hatch_Cloud_Heartbeat::instance();

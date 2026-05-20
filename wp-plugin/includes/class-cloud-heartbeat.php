<?php
/**
 * Hatch Cloud Heartbeat — periodic liveness probe for CF Workers / Vercel.
 *
 * The VPS install ships an agent that POSTs heartbeats to WordPress. CF and
 * Vercel are stateless serverless platforms — no agent, no callback channel.
 * To get heartbeat *parity* across all three providers in the admin UI, this
 * class runs a WP-cron event every 5 minutes that HEADs the configured
 * frontend URL, records status + round-trip time, and keeps a small rolling
 * history (12 samples = ~1 hour @ 5min cadence) for the sparkline.
 *
 * Storage is kept in three separate options so the UI can query each
 * provider independently and so cleanup on disconnect is a single delete.
 *
 * Data shape (per option):
 *   {
 *     "ts":     unix timestamp of last probe,
 *     "status": HTTP code (200, 0 on network error, etc.),
 *     "rtt_ms": int milliseconds, 0 on error,
 *     "history": [ {ts, status, rtt_ms}, ... ] // newest last, capped at 12
 *   }
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Cloud_Heartbeat {

	const CRON_HOOK   = 'hatch_cloud_heartbeat';
	const CRON_RECUR  = 'hatch_5_min';
	const OPT_PREFIX  = 'hatch_heartbeat_';
	const HISTORY_MAX = 12;

	public static function instance(): self {
		static $i = null;
		if ( null === $i ) {
			$i = new self();
		}
		return $i;
	}

	private function __construct() {
		add_filter( 'cron_schedules', array( $this, 'register_schedule' ) );
		add_action( self::CRON_HOOK, array( $this, 'run' ) );
		add_action( 'init', array( $this, 'ensure_scheduled' ) );
		add_action( 'admin_post_hatch_probe_heartbeat', array( $this, 'handle_probe_now' ) );
	}

	/**
	 * Admin-post handler — on-demand probe triggered by the React Connection
	 * tab. Probes whatever URL is in `hatch_frontend_url` regardless of
	 * hosting_model so local dev works without setting up a deploy.
	 */
	public function handle_probe_now(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'hatch_probe_heartbeat' );

		$url = trim( (string) get_option( 'hatch_frontend_url', '' ) );
		if ( '' !== $url ) {
			$model    = (string) get_option( 'hatch_hosting_model', '' );
			$provider = 'cloudflare-pages' === $model ? 'cloudflare'
			          : ( 'vercel' === $model ? 'vercel'
			          : ( 'vps' === $model ? 'vps' : 'generic' ) );
			// VPS normally reads from agent record; on-demand probe still HEADs the URL.
			$this->probe_and_store( $provider, $url );
		}

		wp_safe_redirect( admin_url( 'admin.php?page=hatch#connection' ) );
		exit;
	}

	public function register_schedule( $schedules ) {
		if ( ! isset( $schedules[ self::CRON_RECUR ] ) ) {
			$schedules[ self::CRON_RECUR ] = array(
				'interval' => 5 * MINUTE_IN_SECONDS,
				'display'  => __( 'Every 5 minutes (Hatch)', 'hatch' ),
			);
		}
		return $schedules;
	}

	public function ensure_scheduled(): void {
		if ( ! wp_next_scheduled( self::CRON_HOOK ) ) {
			wp_schedule_event( time() + 60, self::CRON_RECUR, self::CRON_HOOK );
		}
	}

	public static function clear_schedule(): void {
		$ts = wp_next_scheduled( self::CRON_HOOK );
		if ( $ts ) {
			wp_unschedule_event( $ts, self::CRON_HOOK );
		}
	}

	/**
	 * Probe each known provider URL. Skips providers without a configured URL
	 * so the cron stays cheap on partially-set-up sites.
	 *
	 * @return void
	 */
	public function run(): void {
		$providers = $this->configured_providers();
		foreach ( $providers as $provider => $url ) {
			$this->probe_and_store( $provider, $url );
		}
	}

	/**
	 * Read configured URLs for each provider. The frontend URL is shared, but
	 * the hosting_model option tells us which provider it's pointing at; we
	 * only record a heartbeat under that provider's key.
	 *
	 * @return array<string,string>
	 */
	private function configured_providers(): array {
		$frontend = trim( (string) get_option( 'hatch_frontend_url', '' ) );
		if ( '' === $frontend ) {
			return array();
		}
		$model = (string) get_option( 'hatch_hosting_model', '' );
		$provider = '';
		if ( 'cloudflare-pages' === $model ) {
			$provider = 'cloudflare';
		} elseif ( 'vercel' === $model ) {
			$provider = 'vercel';
		} elseif ( 'vps' === $model ) {
			// VPS has its own agent-based heartbeat — don't double-probe.
			// We still surface it under the same UI panel; the heartbeat data
			// just comes from a different source (Hatch_Connection_Status).
			return array();
		} else {
			// Manual / unknown — treat as "vps" semantic (user-managed host).
			return array();
		}
		return array( $provider => $frontend );
	}

	private function probe_and_store( string $provider, string $url ): void {
		$start = microtime( true );
		$res   = wp_remote_request( $url, array(
			'method'      => 'HEAD',
			'timeout'     => 8,
			'redirection' => 3,
			'sslverify'   => true,
			'headers'     => array( 'User-Agent' => 'Hatch-Heartbeat/1.0' ),
		) );
		$rtt_ms = (int) round( ( microtime( true ) - $start ) * 1000 );

		if ( is_wp_error( $res ) ) {
			$status = 0;
		} else {
			$status = (int) wp_remote_retrieve_response_code( $res );
		}

		$opt_key = self::OPT_PREFIX . $provider;
		$prev    = (array) get_option( $opt_key, array() );
		$history = isset( $prev['history'] ) && is_array( $prev['history'] ) ? $prev['history'] : array();
		$history[] = array(
			'ts'     => time(),
			'status' => $status,
			'rtt_ms' => $rtt_ms,
		);
		if ( count( $history ) > self::HISTORY_MAX ) {
			$history = array_slice( $history, -self::HISTORY_MAX );
		}

		update_option( $opt_key, array(
			'ts'      => time(),
			'status'  => $status,
			'rtt_ms'  => $rtt_ms,
			'history' => $history,
		), false );
	}

	/**
	 * Read the heartbeat record for a provider. Returns null if no probe yet.
	 *
	 * @param string $provider 'cloudflare' | 'vercel' | 'vps'
	 * @return array|null
	 */
	public static function get( string $provider ): ?array {
		// VPS uses its own agent-based data — adapt to the same shape so the
		// UI can iterate uniformly across providers.
		if ( 'vps' === $provider ) {
			$ts   = (int) get_option( 'hatch_agent_last_heartbeat', 0 );
			$data = (array) get_option( 'hatch_agent_last_heartbeat_data', array() );
			if ( 0 === $ts ) {
				return null;
			}
			return array(
				'ts'      => $ts,
				'status'  => isset( $data['status'] ) ? (int) $data['status'] : 200,
				'rtt_ms'  => isset( $data['rtt_ms'] ) ? (int) $data['rtt_ms'] : 0,
				'history' => array(),
				'source'  => 'agent',
			);
		}
		$opt = (array) get_option( self::OPT_PREFIX . $provider, array() );
		if ( empty( $opt ) ) {
			// Fall back to the "generic" probe record set by handle_probe_now()
			// when hosting_model is unset (local dev path).
			$opt = (array) get_option( self::OPT_PREFIX . 'generic', array() );
			if ( empty( $opt ) ) {
				return null;
			}
		}
		$opt['source'] = 'probe';
		return $opt;
	}

	/**
	 * Health label for a given record. Used for the pulse-dot color class.
	 *
	 * @param array|null $record
	 * @return string 'good' | 'warn' | 'bad' | 'muted'
	 */
	public static function health( ?array $record ): string {
		if ( ! $record || empty( $record['ts'] ) ) {
			return 'muted';
		}
		$age    = time() - (int) $record['ts'];
		$status = (int) ( $record['status'] ?? 0 );
		// Stale beyond 15 min on a 5-min cadence = something is wrong.
		if ( $age > 15 * MINUTE_IN_SECONDS ) {
			return 'bad';
		}
		if ( $status >= 200 && $status < 400 ) {
			return 'good';
		}
		if ( 0 === $status || $status >= 500 ) {
			return 'bad';
		}
		return 'warn';
	}
}

Hatch_Cloud_Heartbeat::instance();

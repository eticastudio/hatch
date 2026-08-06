<?php
/**
 * Host detection — read money-domain response headers on first activation
 * (and once a week thereafter) to identify the CDN / host / edge in front
 * of the site. The onboarding wizard uses this to serve the right /blog
 * subfolder-mount instructions (Cloudflare Worker vs Vercel middleware vs
 * Netlify _redirects vs Nginx location block vs "your host does not allow
 * edge routing — use blog.yourdomain.com subdomain instead").
 *
 * Detection is passive — a single wp_remote_head( home_url() ) call with
 * a 4-second timeout — and cached for 7 days. Results live under the
 * `hatch_detected_host` option so any admin screen can read them cheaply.
 *
 * Design: no third-party calls. We just inspect what our own site's
 * origin already returns. No data leaves the WP install.
 *
 * @package Hatch
 * @since 0.5.1
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Host_Detect
 */
class Hatch_Host_Detect {

	const OPTION_KEY = 'hatch_detected_host';
	const CACHE_TTL  = 7 * DAY_IN_SECONDS;

	/**
	 * Signals we recognise. First match wins.
	 *
	 * Order matters — Cloudflare fronts Vercel/Netlify occasionally, so
	 * cf-ray is checked FIRST (it means CF is the edge the browser sees,
	 * even if origin is Vercel). WP Engine / Kinsta are managed hosts
	 * that cannot support subfolder routing at all.
	 *
	 * @var array<string, array{header:string, needle?:string, host:string, label:string, subfolder_support:string}>
	 */
	private const SIGNALS = array(
		array( 'header' => 'cf-ray',            'host' => 'cloudflare', 'label' => 'Cloudflare',       'subfolder_support' => 'worker' ),
		array( 'header' => 'x-vercel-id',       'host' => 'vercel',     'label' => 'Vercel',           'subfolder_support' => 'middleware' ),
		array( 'header' => 'x-nf-request-id',   'host' => 'netlify',    'label' => 'Netlify',          'subfolder_support' => 'redirects' ),
		array( 'header' => 'x-kinsta-cache',    'host' => 'kinsta',     'label' => 'Kinsta',           'subfolder_support' => 'reverse_proxy' ),
		array( 'header' => 'x-powered-by',      'needle' => 'wp engine','host' => 'wpengine',  'label' => 'WP Engine',        'subfolder_support' => 'none' ),
		array( 'header' => 'x-litespeed-cache', 'host' => 'litespeed',  'label' => 'LiteSpeed / OpenLiteSpeed', 'subfolder_support' => 'nginx_like' ),
		array( 'header' => 'server',            'needle' => 'nginx',    'host' => 'nginx',     'label' => 'Nginx',             'subfolder_support' => 'nginx_location' ),
		array( 'header' => 'server',            'needle' => 'caddy',    'host' => 'caddy',     'label' => 'Caddy',             'subfolder_support' => 'caddy_handle' ),
		array( 'header' => 'server',            'needle' => 'apache',   'host' => 'apache',    'label' => 'Apache',            'subfolder_support' => 'htaccess' ),
	);

	/**
	 * Return the cached detection or run a fresh probe.
	 *
	 * @param bool $force Bypass cache. Used by "re-detect" button in admin.
	 * @return array{host:string, label:string, subfolder_support:string, detected_at:int, headers_sample:array<string,string>}
	 */
	public static function detect( bool $force = false ): array {
		if ( ! $force ) {
			$cached = get_option( self::OPTION_KEY, null );
			if ( is_array( $cached ) && ! empty( $cached['detected_at'] ) ) {
				if ( ( time() - (int) $cached['detected_at'] ) < self::CACHE_TTL ) {
					return $cached;
				}
			}
		}
		$fresh = self::probe();
		update_option( self::OPTION_KEY, $fresh, false );
		return $fresh;
	}

	/**
	 * Run one wp_remote_head against the site's own URL and match signals.
	 *
	 * @return array<string,mixed>
	 */
	private static function probe(): array {
		$default = array(
			'host'              => 'unknown',
			'label'             => __( 'Unknown / not detected', 'hatch' ),
			'subfolder_support' => 'unknown',
			'detected_at'       => time(),
			'headers_sample'    => array(),
		);

		$response = wp_remote_head( home_url( '/' ), array(
			'timeout'     => 4,
			'redirection' => 3,
			'sslverify'   => true,
			'user-agent'  => 'Hatch/' . ( defined( 'HATCH_VERSION' ) ? HATCH_VERSION : '0' ) . ' (host-detect)',
		) );

		if ( is_wp_error( $response ) ) {
			$default['error'] = $response->get_error_message();
			return $default;
		}

		$headers = wp_remote_retrieve_headers( $response );
		// wp_remote_retrieve_headers returns a Requests_Utility_CaseInsensitiveDictionary — normalise to a plain array<string,string>.
		$normal  = array();
		foreach ( $headers as $key => $value ) {
			$normal[ strtolower( (string) $key ) ] = is_array( $value ) ? implode( ', ', $value ) : (string) $value;
		}

		foreach ( self::SIGNALS as $signal ) {
			$header_key = strtolower( $signal['header'] );
			if ( ! isset( $normal[ $header_key ] ) ) {
				continue;
			}
			// If a needle is defined, require substring match (case-insensitive).
			if ( isset( $signal['needle'] ) ) {
				if ( stripos( $normal[ $header_key ], $signal['needle'] ) === false ) {
					continue;
				}
			}
			return array(
				'host'              => $signal['host'],
				'label'             => $signal['label'],
				'subfolder_support' => $signal['subfolder_support'],
				'detected_at'       => time(),
				'headers_sample'    => self::sample_headers( $normal ),
			);
		}

		$default['headers_sample'] = self::sample_headers( $normal );
		return $default;
	}

	/**
	 * Return a small, safe subset of headers for admin display.
	 *
	 * Only headers we actually use in detection are kept — avoids leaking
	 * unrelated response metadata into the WP options table.
	 *
	 * @param array<string,string> $normal
	 * @return array<string,string>
	 */
	private static function sample_headers( array $normal ): array {
		$keep = array( 'server', 'cf-ray', 'x-vercel-id', 'x-nf-request-id', 'x-kinsta-cache', 'x-powered-by', 'x-litespeed-cache' );
		$out  = array();
		foreach ( $keep as $k ) {
			if ( isset( $normal[ $k ] ) ) {
				// Truncate to 200 chars — no need to persist multi-KB Server strings.
				$out[ $k ] = substr( $normal[ $k ], 0, 200 );
			}
		}
		return $out;
	}

	/**
	 * Human-readable summary for admin UI / REST.
	 *
	 * @return array<string,mixed>
	 */
	public static function summary(): array {
		$d = self::detect();
		return array(
			'host'              => $d['host'],
			'label'             => $d['label'],
			'subfolder_support' => $d['subfolder_support'],
			'wizard_path'       => self::wizard_path( $d['subfolder_support'] ),
			'detected_at'       => (int) ( $d['detected_at'] ?? 0 ),
		);
	}

	/**
	 * Which onboarding-wizard path applies to this host's edge capability.
	 *
	 * @param string $support
	 * @return string
	 */
	private static function wizard_path( string $support ): string {
		switch ( $support ) {
			case 'worker':        return 'cloudflare_1click';
			case 'middleware':    return 'vercel_middleware';
			case 'redirects':     return 'netlify_redirects';
			case 'reverse_proxy': return 'kinsta_proxy';
			case 'nginx_location':
			case 'nginx_like':    return 'nginx_config';
			case 'caddy_handle':  return 'caddy_config';
			case 'htaccess':      return 'apache_htaccess';
			case 'none':          return 'subdomain_fallback';
			default:              return 'manual';
		}
	}
}

// Fire an initial detection on plugin activation so the admin dashboard
// has a real value on first page load. Also schedule a weekly recheck.
add_action( 'hatch_activated', function () {
	Hatch_Host_Detect::detect( true );
	if ( ! wp_next_scheduled( 'hatch_host_detect_refresh' ) ) {
		wp_schedule_event( time() + WEEK_IN_SECONDS, 'weekly', 'hatch_host_detect_refresh' );
	}
} );

add_action( 'hatch_host_detect_refresh', function () {
	Hatch_Host_Detect::detect( true );
} );

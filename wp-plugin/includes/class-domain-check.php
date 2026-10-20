<?php
/**
 * Root Domain Check - flags WordPress installs running on a "naked" domain.
 *
 * In a headless architecture, WordPress should NEVER live on the root domain
 * (`mysite.com`). It belongs on a subdomain (`cms.mysite.com`, `wp.mysite.com`,
 * `admin.mysite.com`) so the public frontend can own the root.
 *
 * This class detects the violation and records it for the Hatch health panel
 * with a clear migration guide.
 *
 * Detection logic:
 *   - parse home_url() host
 *   - count dots: 2 dots = subdomain (cms.mysite.com), 1 dot = root (mysite.com)
 *   - except: localhost, *.local, IP addresses → ignore
 *   - except: well-known dev TLDs (.test, .ddev.site) → ignore
 *   - whitelist common "headless backend" prefixes: cms.*, wp.*, admin.*, api.*, headless.*
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Domain_Check
 */
class Hatch_Domain_Check {

	const DISMISS_KEY = 'hatch_root_domain_dismissed';
	const DISMISS_TTL = MONTH_IN_SECONDS; // user can dismiss for 30 days, then re-warned

	/**
	 * Common "headless backend" subdomain prefixes - these are GOOD.
	 *
	 * @var array<string>
	 */
	private const BACKEND_PREFIXES = array( 'cms', 'wp', 'admin', 'api', 'headless', 'backend', 'manage', 'editor' );

	/**
	 * Dev TLDs / hosts we should ignore (no warning).
	 *
	 * @var array<string>
	 */
	private const DEV_HOSTS = array( 'localhost', '.local', '.test', '.ddev.site', '.lndo.site' );

	/**
	 * @var Hatch_Domain_Check|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Domain_Check
	 */
	public static function instance(): Hatch_Domain_Check {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire hooks.
	 */
	private function __construct() {
	}

	/**
	 * Categorize the current site URL.
	 *
	 * @return string 'subdomain' | 'root' | 'dev' | 'ip' | 'unknown'
	 */
	public static function classify(): string {
		$home = (string) home_url();
		$host = wp_parse_url( $home, PHP_URL_HOST );
		if ( ! $host ) {
			return 'unknown';
		}
		$host = strtolower( (string) $host );

		// IP address → don't warn.
		if ( filter_var( $host, FILTER_VALIDATE_IP ) ) {
			return 'ip';
		}

		// Dev hosts → don't warn.
		foreach ( self::DEV_HOSTS as $dev ) {
			if ( 'localhost' === $dev && 'localhost' === $host ) {
				return 'dev';
			}
			if ( '.' === substr( $dev, 0, 1 ) && substr( $host, -strlen( $dev ) ) === $dev ) {
				return 'dev';
			}
		}

		// Count parts. "mysite.com" = 2 parts. "cms.mysite.com" = 3 parts.
		$parts = explode( '.', $host );

		// Two parts: definitely root.
		if ( count( $parts ) === 2 ) {
			return 'root';
		}

		// Three+ parts: check if first segment is a known backend prefix or known
		// public-facing prefix (www).
		if ( count( $parts ) >= 3 ) {
			$first = $parts[0];
			if ( 'www' === $first ) {
				// www.mysite.com - public-facing, equivalent to root.
				return 'root';
			}
			// Some country TLDs need different handling (mysite.co.uk = root).
			$known_country_tlds = array(
				'co.uk',
				'co.in',
				'co.jp',
				'co.za',
				'co.nz',
				'com.au',
				'com.br',
				'com.mx',
			);
			$last_two           = $parts[ count( $parts ) - 2 ] . '.' . $parts[ count( $parts ) - 1 ];
			if ( in_array( $last_two, $known_country_tlds, true ) && count( $parts ) === 3 ) {
				return 'root';
			}
			if ( in_array( $first, self::BACKEND_PREFIXES, true ) ) {
				return 'subdomain';
			}
			// Some other subdomain - treat as subdomain (probably fine).
			return 'subdomain';
		}

		return 'unknown';
	}
}

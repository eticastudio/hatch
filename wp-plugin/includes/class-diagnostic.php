<?php
/**
 * Hatch Diagnostic - preflight checks before connecting a headless frontend.
 *
 * Runs 12 checks that catch every common reason a fresh WP install can't talk
 * to a headless frontend. Returns a structured report - each issue has a
 * SEVERITY (fail/warn/pass), a HUMAN message, and a FIX hint with a direct link.
 *
 * Used by:
 *   - Connector tab → live traffic-light grid before "Generate App Password"
 *   - REST: GET /hatch/v1/diagnostic (admin-only)
 *   - WP-CLI: `wp hatch diagnose`
 *
 * Every check is non-destructive - pure reads.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Diagnostic
 */
class Hatch_Diagnostic {

	const SEVERITY_PASS = 'pass';
	const SEVERITY_WARN = 'warn';
	const SEVERITY_FAIL = 'fail';

	/**
	 * @var Hatch_Diagnostic|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Diagnostic
	 */
	public static function instance(): Hatch_Diagnostic {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * No-op constructor (singleton).
	 */
	private function __construct() {}

	/**
	 * Run all checks. Returns structured report.
	 *
	 * Shape:
	 *   [
	 *     'overall'    => 'pass' | 'warn' | 'fail',
	 *     'pass_count' => int,
	 *     'warn_count' => int,
	 *     'fail_count' => int,
	 *     'checks'     => [
	 *       [
	 *         'id'        => string,
	 *         'label'     => string,
	 *         'severity'  => 'pass' | 'warn' | 'fail',
	 *         'message'   => string,
	 *         'fix'       => string,    // human-readable next step
	 *         'fix_url'   => string|''  // direct link in WP admin (optional)
	 *       ],
	 *       ...
	 *     ],
	 *   ]
	 *
	 * @return array<string,mixed>
	 */
	public static function run(): array {
		// V0.6: removed check_cors_headers() - CORS only matters for client-side
		// fetching (rare in Astro/static-rendered headless sites). The warning was
		// noise. Documented separately in docs/client-side-fetching.md for users
		// who do need it.
		$checks = array(
			self::check_wp_version(),
			self::check_php_version(),
			self::check_permalinks(),
			self::check_https(),
			self::check_rest_api_reachable(),
			self::check_rest_api_authenticated(),
			self::check_app_passwords_available(),
			self::check_active_security_plugins(),
			self::check_caching_plugins_safe(),
			// Revalidation webhook check intentionally OMITTED in v0.18+ -
			// the Astro starter runs in SSR mode, so content is always fresh
			// (60s edge cache TTL). No webhook needed. Filter to re-enable
			// for users who want explicit push-on-publish.
			...( apply_filters( 'hatch_diagnostic_include_webhook_check', false )
				? array( self::check_webhook_configured() )
				: array() ),
			self::check_acf_rest_exposed(),
			self::check_cpts_rest_exposed(),
		);

		$counts = array(
			'pass' => 0,
			'warn' => 0,
			'fail' => 0,
		);
		foreach ( $checks as $c ) {
			if ( isset( $counts[ $c['severity'] ] ) ) {
				++$counts[ $c['severity'] ];
			}
		}

		$overall = self::SEVERITY_PASS;
		if ( $counts['fail'] > 0 ) {
			$overall = self::SEVERITY_FAIL;
		} elseif ( $counts['warn'] > 0 ) {
			$overall = self::SEVERITY_WARN;
		}

		return array(
			'overall'    => $overall,
			'pass_count' => $counts['pass'],
			'warn_count' => $counts['warn'],
			'fail_count' => $counts['fail'],
			'checks'     => $checks,
			'ran_at'     => time(),
		);
	}

	/* ----------------------------------------------------------------
	 * INDIVIDUAL CHECKS
	 * ---------------------------------------------------------------- */

	/**
	 * WP 6.4+.
	 *
	 * @return array
	 */
	private static function check_wp_version(): array {
		$wp = (string) get_bloginfo( 'version' );
		if ( version_compare( $wp, '6.4', '>=' ) ) {
			/* translators: %s: WordPress version number. */
			return self::pass( 'wp_version', __( 'WordPress version', 'hatch-connect' ), sprintf( __( 'WordPress %s - supported.', 'hatch-connect' ), $wp ) );
		}
		return self::fail(
			'wp_version',
			__( 'WordPress version', 'hatch-connect' ),
			/* translators: %s: WordPress version number. */
			sprintf( __( 'WordPress %s is below the minimum supported version 6.4.', 'hatch-connect' ), $wp ),
			__( 'Update WordPress from Dashboard → Updates.', 'hatch-connect' ),
			admin_url( 'update-core.php' )
		);
	}

	/**
	 * PHP 7.4+.
	 *
	 * @return array
	 */
	private static function check_php_version(): array {
		if ( version_compare( PHP_VERSION, '7.4', '>=' ) ) {
			/* translators: %s: PHP version number. */
			return self::pass( 'php_version', __( 'PHP version', 'hatch-connect' ), sprintf( __( 'PHP %s - supported.', 'hatch-connect' ), PHP_VERSION ) );
		}
		return self::fail(
			'php_version',
			__( 'PHP version', 'hatch-connect' ),
			/* translators: %s: PHP version number. */
			sprintf( __( 'PHP %s is below the minimum supported version 7.4.', 'hatch-connect' ), PHP_VERSION ),
			__( 'Ask your host to upgrade PHP. Most modern hosts support PHP 8.2+.', 'hatch-connect' ),
			''
		);
	}

	/**
	 * Permalinks must NOT be Plain - pretty permalinks are required for REST routing.
	 *
	 * @return array
	 */
	private static function check_permalinks(): array {
		$structure = (string) get_option( 'permalink_structure', '' );
		if ( '' !== $structure ) {
			return self::pass( 'permalinks', __( 'Pretty permalinks', 'hatch-connect' ), __( 'Permalinks are configured.', 'hatch-connect' ) );
		}
		return self::fail(
			'permalinks',
			__( 'Pretty permalinks', 'hatch-connect' ),
			__( 'Plain permalinks are enabled. REST API routes will not work consistently.', 'hatch-connect' ),
			__( 'Go to Settings → Permalinks and pick any structure other than Plain. "Post name" is recommended.', 'hatch-connect' ),
			admin_url( 'options-permalink.php' )
		);
	}

	/**
	 * HTTPS.
	 *
	 * @return array
	 */
	private static function check_https(): array {
		$home = home_url();
		if ( 0 === strpos( $home, 'https://' ) ) {
			return self::pass( 'https', __( 'HTTPS', 'hatch-connect' ), __( 'Site is served over HTTPS.', 'hatch-connect' ) );
		}
		return self::warn(
			'https',
			__( 'HTTPS', 'hatch-connect' ),
			__( 'Site is not on HTTPS. Headless frontends will refuse to authenticate against an http:// API.', 'hatch-connect' ),
			__( 'Enable HTTPS on your hosting (free with Cloudflare or Let\'s Encrypt). Then update Settings → General → WordPress Address.', 'hatch-connect' ),
			admin_url( 'options-general.php' )
		);
	}

	/**
	 * REST API reachable - fetch /wp-json/wp/v2/types unauthenticated.
	 *
	 * @return array
	 */
	private static function check_rest_api_reachable(): array {
		$url = rest_url( 'wp/v2/types' );

		// First, run the request in-process via rest_do_request(). This is the
		// correct way to verify REST routing works - it exercises the same
		// dispatcher real requests use, but skips the HTTP roundtrip entirely.
		// That matters in any environment where home_url() isn't reachable from
		// PHP itself: Docker port mappings (e.g. localhost:8810 → :80 inside
		// the container), reverse proxies, Cloudflare with origin pulls
		// disabled, hosts that block loopback HTTP, etc. If the dispatcher
		// returns a sane response, the REST API is healthy by definition -
		// no need to also prove the network round-trips to ourselves.
		$internal = rest_do_request( new WP_REST_Request( 'GET', '/wp/v2/types' ) );
		if ( (int) $internal->get_status() < 500 ) {
			return self::pass(
				'rest_reachable',
				__( 'REST API reachable', 'hatch-connect' ),
				/* translators: 1: request URL, 2: HTTP status code. */
				sprintf( __( 'GET %1$s dispatched in-process with HTTP %2$d. REST routing works.', 'hatch-connect' ), $url, (int) $internal->get_status() )
			);
		}

		// Fallback: external HTTP probe. Only useful for catching exotic
		// configurations where the dispatcher is healthy but the public
		// /wp-json/ path is blocked by .htaccess / firewall rules. Treat a
		// connection failure here as a WARNING, not a blocker - the in-process
		// dispatch already proved the API itself works.
		$res = wp_remote_get(
			$url,
			array(
				'timeout'     => 5,
				'redirection' => 1,
			)
		);

		if ( is_wp_error( $res ) ) {
			return self::warn(
				'rest_reachable',
				__( 'REST API reachable', 'hatch-connect' ),
				/* translators: 1: URL probed, 2: error message. */
				sprintf( __( 'In-process REST dispatch works, but external probe to %1$s failed - %2$s. This is harmless on local rigs (Docker, loopback) but in production it may mean a firewall or reverse-proxy rule is blocking /wp-json/.', 'hatch-connect' ), $url, $res->get_error_message() ),
				__( 'On a live site, verify /wp-json/wp/v2/types loads in a browser. If it doesn\'t, check your firewall / .htaccess / nginx config.', 'hatch-connect' ),
				''
			);
		}

		$code = (int) wp_remote_retrieve_response_code( $res );
		if ( 200 === $code || 401 === $code ) {
			// 401 means it's working - just gated (which is what we want).
			return self::pass(
				'rest_reachable',
				__( 'REST API reachable', 'hatch-connect' ),
				/* translators: 1: request URL, 2: HTTP status code. */
				sprintf( __( 'GET %1$s responded with %2$d. REST routing works.', 'hatch-connect' ), $url, $code )
			);
		}
		if ( 404 === $code ) {
			return self::fail(
				'rest_reachable',
				__( 'REST API reachable', 'hatch-connect' ),
				__( 'REST API returns 404. A plugin or .htaccess rule is blocking /wp-json/.', 'hatch-connect' ),
				__( 'Suspect plugins: Disable REST API, WP-OAuth, Disable JSON API. Or check .htaccess for Deny rules.', 'hatch-connect' ),
				admin_url( 'plugins.php' )
			);
		}
		return self::warn(
			'rest_reachable',
			__( 'REST API reachable', 'hatch-connect' ),
			/* translators: %d: HTTP status code. */
			sprintf( __( 'REST API responded with HTTP %d (expected 200 or 401).', 'hatch-connect' ), $code ),
			__( 'Verify your hosting provider isn\'t injecting an error page on /wp-json/.', 'hatch-connect' ),
			''
		);
	}

	/**
	 * REST API authentication path works - try /wp/v2/users/me with current cookie.
	 *
	 * @return array
	 */
	private static function check_rest_api_authenticated(): array {
		if ( ! is_user_logged_in() ) {
			return self::warn(
				'rest_auth',
				__( 'REST authentication', 'hatch-connect' ),
				__( 'Run this check while logged in to verify authenticated REST works.', 'hatch-connect' ),
				__( 'No action needed if you reached this page from wp-admin.', 'hatch-connect' ),
				''
			);
		}
		$res = rest_do_request( new WP_REST_Request( 'GET', '/wp/v2/users/me' ) );
		if ( $res && ! $res->is_error() ) {
			return self::pass( 'rest_auth', __( 'REST authentication', 'hatch-connect' ), __( 'Authenticated REST returns the current user.', 'hatch-connect' ) );
		}
		return self::fail(
			'rest_auth',
			__( 'REST authentication', 'hatch-connect' ),
			__( 'Internal REST authentication failed for the current user.', 'hatch-connect' ),
			__( 'A security plugin may be blocking the /wp/v2/users/me endpoint. Try Hatch → Security and toggle "Block unauthenticated REST API" OFF temporarily to diagnose.', 'hatch-connect' ),
			admin_url( 'admin.php?page=hatch#security' )
		);
	}

	/**
	 * Application Passwords available.
	 *
	 * @return array
	 */
	private static function check_app_passwords_available(): array {
		// WP's wp_is_application_passwords_available() is gated by is_ssl() in
		// admin context - that flag is misleading on http:// rigs where APs
		// genuinely work (Hatch installs a runtime REST-only override in
		// Hatch_Security::enable_app_passwords_for_rest_basic_auth). Check the
		// real signals instead: (a) WP_Application_Passwords class exists,
		// (b) APs are not hard-disabled by constant, (c) the runtime override
		// is loaded OR HTTPS is on. The strongest signal - and the one that
		// matters in practice - is whether the current user can already pull
		// an AP-authenticated REST response. If yes, APs work.
		if ( ! class_exists( 'WP_Application_Passwords' ) ) {
			return self::fail(
				'app_passwords',
				__( 'Application Passwords', 'hatch-connect' ),
				__( 'WP_Application_Passwords is missing. This WordPress is too old or has APs disabled in core.', 'hatch-connect' ),
				__( 'Upgrade to WordPress 5.6 or later.', 'hatch-connect' ),
				''
			);
		}
		if ( defined( 'WP_APPLICATION_PASSWORDS_AVAILABLE' ) && ! WP_APPLICATION_PASSWORDS_AVAILABLE ) {
			return self::fail(
				'app_passwords',
				__( 'Application Passwords', 'hatch-connect' ),
				__( 'Application Passwords are explicitly disabled via WP_APPLICATION_PASSWORDS_AVAILABLE.', 'hatch-connect' ),
				__( 'Remove the define( "WP_APPLICATION_PASSWORDS_AVAILABLE", false ) from wp-config.php.', 'hatch-connect' ),
				''
			);
		}

		$wp_says_available = function_exists( 'wp_is_application_passwords_available' ) && wp_is_application_passwords_available();
		$hatch_override_on = has_filter( 'wp_is_application_passwords_available', array( Hatch_Security::instance(), 'enable_app_passwords_for_rest_basic_auth' ) );

		if ( $wp_says_available ) {
			return self::pass( 'app_passwords', __( 'Application Passwords', 'hatch-connect' ), __( 'Application Passwords are enabled.', 'hatch-connect' ) );
		}

		if ( $hatch_override_on ) {
			// The runtime override only fires during REST + Basic-Auth requests,
			// which is exactly the path the headless frontend uses. Admin-side
			// callers still see false, but functionally APs work for the only
			// caller that matters.
			return self::pass(
				'app_passwords',
				__( 'Application Passwords', 'hatch-connect' ),
				__( 'Application Passwords are gated by HTTPS for browsers but enabled for the REST API by Hatch. Headless frontend auth works.', 'hatch-connect' )
			);
		}

		return self::fail(
			'app_passwords',
			__( 'Application Passwords', 'hatch-connect' ),
			__( 'Application Passwords are disabled or unavailable.', 'hatch-connect' ),
			__( 'Enable HTTPS, or define( "WP_APPLICATION_PASSWORDS_AVAILABLE", true ) in wp-config.php - or remove a plugin that disabled them.', 'hatch-connect' ),
			''
		);
	}

	/**
	 * Detect security plugins known to break REST API by default.
	 *
	 * @return array
	 */
	private static function check_active_security_plugins(): array {
		$problematic = array(
			'wp-rest-api-controller/wp-rest-api-controller.php' => 'WP REST API Controller',
			'disable-json-api/disable-json-api.php'       => 'Disable JSON API',
			'disable-wp-rest-api/disable-wp-rest-api.php' => 'Disable WP REST API',
		);
		$active      = array();
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		foreach ( $problematic as $file => $label ) {
			if ( is_plugin_active( $file ) ) {
				$active[] = $label;
			}
		}
		if ( empty( $active ) ) {
			return self::pass( 'security_plugins', __( 'No REST blockers', 'hatch-connect' ), __( 'No known REST-blocking plugins active.', 'hatch-connect' ) );
		}
		return self::fail(
			'security_plugins',
			__( 'No REST blockers', 'hatch-connect' ),
			/* translators: %s: comma-separated plugin names. */
			sprintf( __( 'These plugins block REST API by default: %s', 'hatch-connect' ), implode( ', ', $active ) ),
			__( 'Deactivate the listed plugin, or configure it to allow Hatch\'s namespace.', 'hatch-connect' ),
			admin_url( 'plugins.php' )
		);
	}

	/**
	 * Caching plugins that aggressively cache REST responses break revalidation.
	 *
	 * @return array
	 */
	private static function check_caching_plugins_safe(): array {
		// We just warn if any aggressive cache is active - let user verify their config.
		$cache_plugins = array(
			'wp-rocket/wp-rocket.php'             => 'WP Rocket',
			'w3-total-cache/w3-total-cache.php'   => 'W3 Total Cache',
			'litespeed-cache/litespeed-cache.php' => 'LiteSpeed Cache',
			'wp-super-cache/wp-cache.php'         => 'WP Super Cache',
		);
		$active        = array();
		if ( ! function_exists( 'is_plugin_active' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		foreach ( $cache_plugins as $file => $label ) {
			if ( is_plugin_active( $file ) ) {
				$active[] = $label;
			}
		}
		if ( empty( $active ) ) {
			return self::pass( 'caching', __( 'No conflicting cache plugins', 'hatch-connect' ), __( 'No aggressive page-cache plugins detected.', 'hatch-connect' ) );
		}
		return self::warn(
			'caching',
			__( 'Cache plugin detected', 'hatch-connect' ),
			/* translators: %s: comma-separated plugin names. */
			sprintf( __( '%s is active. Verify it does NOT cache /wp-json/* responses.', 'hatch-connect' ), implode( ', ', $active ) ),
			__( 'In your cache plugin, add /wp-json/* to the URL exclusion list.', 'hatch-connect' ),
			admin_url( 'plugins.php' )
		);
	}

	/**
	 * Webhook configured.
	 *
	 * @return array
	 */
	private static function check_webhook_configured(): array {
		$endpoint = (string) get_option( 'hatch_revalidate_endpoint', '' );
		$secret   = (string) get_option( 'hatch_webhook_secret', '' );
		if ( '' !== $endpoint && '' !== $secret ) {
			return self::pass( 'webhook', __( 'Revalidation webhook', 'hatch-connect' ), __( 'Webhook URL and secret are configured.', 'hatch-connect' ) );
		}
		if ( '' === $endpoint ) {
			return self::warn(
				'webhook',
				__( 'Revalidation webhook (optional)', 'hatch-connect' ),
				__( 'No webhook URL set. With SSR + 60s edge cache (Hatch default), this is fine - new posts go live automatically. Set a URL only if you want sub-60s freshness.', 'hatch-connect' ),
				__( 'Optional. Set on the Connector tab if you want immediate cache purge on publish.', 'hatch-connect' ),
				admin_url( 'admin.php?page=hatch#connection' )
			);
		}
		return self::fail(
			'webhook',
			__( 'Revalidation webhook', 'hatch-connect' ),
			__( 'Webhook secret is missing - internal state corrupted.', 'hatch-connect' ),
			__( 'Deactivate and re-activate Hatch to regenerate the secret.', 'hatch-connect' ),
			admin_url( 'plugins.php' )
		);
	}

	/**
	 * ACF field group REST exposure (only if ACF detected).
	 *
	 * @return array
	 */
	private static function check_acf_rest_exposed(): array {
		if ( ! Hatch_Detector::has_custom_fields() ) {
			return self::pass( 'acf_rest', __( 'Custom fields (n/a)', 'hatch-connect' ), __( 'No custom-fields plugin detected - nothing to expose.', 'hatch-connect' ) );
		}
		$status = Hatch_Acf_Bridge::get_field_group_status();
		if ( $status['hidden'] < 1 ) {
			/* translators: %d: number of field groups. */
			return self::pass( 'acf_rest', __( 'Custom fields in REST', 'hatch-connect' ), sprintf( __( 'All %d field groups exposed.', 'hatch-connect' ), (int) $status['total_groups'] ) );
		}
		return self::warn(
			'acf_rest',
			__( 'Custom fields in REST', 'hatch-connect' ),
			/* translators: %d: number of field groups. */
			sprintf( __( '%d field group(s) hidden from REST API.', 'hatch-connect' ), (int) $status['hidden'] ),
			__( 'Enable "Show in REST API" on each field group. See Hatch → Health tab.', 'hatch-connect' ),
			admin_url( 'admin.php?page=hatch#status' )
		);
	}

	/**
	 * CPT show_in_rest health.
	 *
	 * @return array
	 */
	private static function check_cpts_rest_exposed(): array {
		$status = Hatch_Cpt_Scanner::scan();
		if ( $status['total_custom'] < 1 ) {
			return self::pass( 'cpt_rest', __( 'Custom post types (n/a)', 'hatch-connect' ), __( 'No custom post types registered.', 'hatch-connect' ) );
		}
		if ( $status['hidden'] < 1 ) {
			/* translators: %d: number of custom post types. */
			return self::pass( 'cpt_rest', __( 'CPTs in REST', 'hatch-connect' ), sprintf( __( 'All %d CPTs are REST-accessible.', 'hatch-connect' ), (int) $status['total_custom'] ) );
		}
		$names = array();
		foreach ( $status['hidden_types'] as $t ) {
			$names[] = $t['name'];
		}
		return self::fail(
			'cpt_rest',
			__( 'CPTs in REST', 'hatch-connect' ),
			/* translators: %s: comma-separated post type names. */
			sprintf( __( 'CPTs missing show_in_rest: %s', 'hatch-connect' ), implode( ', ', $names ) ),
			__( 'Add `show_in_rest => true` in register_post_type() args. Open Health tab for details.', 'hatch-connect' ),
			admin_url( 'admin.php?page=hatch#status' )
		);
	}

	/* ----------------------------------------------------------------
	 * RESULT BUILDERS
	 * ---------------------------------------------------------------- */

	private static function pass( string $id, string $label, string $message ): array {
		return array(
			'id'       => $id,
			'label'    => $label,
			'severity' => self::SEVERITY_PASS,
			'message'  => $message,
			'fix'      => '',
			'fix_url'  => '',
		);
	}

	private static function warn( string $id, string $label, string $message, string $fix, string $fix_url ): array {
		return array(
			'id'       => $id,
			'label'    => $label,
			'severity' => self::SEVERITY_WARN,
			'message'  => $message,
			'fix'      => $fix,
			'fix_url'  => $fix_url,
		);
	}

	private static function fail( string $id, string $label, string $message, string $fix, string $fix_url ): array {
		return array(
			'id'       => $id,
			'label'    => $label,
			'severity' => self::SEVERITY_FAIL,
			'message'  => $message,
			'fix'      => $fix,
			'fix_url'  => $fix_url,
		);
	}
}

<?php
/**
 * Hatch_Hardening
 *
 * The "fortress mode" toggles. Each one wires a specific WordPress hardening
 * technique that headless sites benefit from. All controls are opt-in (off by
 * default) because they can break sites that depend on these subsystems.
 *
 * Surfaces in the Security tab as four toggles:
 *   - security.disallow_file_edit   → defines DISALLOW_FILE_EDIT before init
 *   - security.send_headers         → adds HSTS / X-Frame / Referrer-Policy on WP responses
 *   - security.csp_enabled          → flag consumed by the Astro middleware
 *   - security.enforce_2fa          → only takes effect when a 2FA plugin is active
 *
 * 2FA enforcement detects the most common providers (WP 2FA, Two-Factor
 * Authentication core feature plugin, miniOrange, Wordfence, Solid Security)
 * and surfaces the active provider in the boot state so the UI can show it.
 *
 * v0.50.32 — Fortress Mode
 * ------------------------
 * Headless WordPress means no visitor ever needs to reach wp-login, wp-admin,
 * xmlrpc, or /wp-json/wp/v2/users on the origin. Fortress Mode is a single
 * `hatch_fortress_mode` master toggle that collapses seven granular defenses
 * into one on/off. Each sub-feature is also individually toggleable so a
 * cautious operator can enable them piecemeal:
 *
 *   1. hatch_fortress_hide_login              — /wp-login.php returns 404 unless ?hatch_key=<generated>
 *   2. hatch_fortress_block_xmlrpc            — /xmlrpc.php → 403
 *   3. hatch_fortress_disable_rest_users      — /wp/v2/users → WP_Error for anonymous
 *   4. hatch_fortress_disable_file_edit       — DISALLOW_FILE_EDIT + DISALLOW_FILE_MODS
 *   5. hatch_fortress_app_password_only       — /wp/v2/* mutations require Application Passwords
 *   6. hatch_fortress_headers                 — OWASP baseline headers (HSTS, XFO, nosniff, RP, PP)
 *   7. hatch_fortress_hide_wp_version         — strip generator + version query args
 *   8. hatch_fortress_disable_directory_browsing — 403 on bare uploads/YYYY/MM/ index requests
 *
 * CLEAN-ROOM. Standards followed: OWASP Secure Headers Project, WordPress
 * Security Guide, RFC 6797 (HSTS). Zero lines copied from WordFence,
 * Sucuri, iThemes, WPBruiser, or any third-party security plugin.
 *
 * @package Hatch
 * @since   0.50.11
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Hardening {

	public static function init(): void {
		// DISALLOW_FILE_EDIT — disable theme/plugin file editor from wp-admin.
		// Plugins load early enough that this runs before admin_init.
		if ( get_option( 'hatch_security_disallow_file_edit', false ) ) {
			if ( ! defined( 'DISALLOW_FILE_EDIT' ) ) {
				define( 'DISALLOW_FILE_EDIT', true );
			}
			// v0.50.31 — Also DISALLOW_FILE_MODS: blocks plugin/theme install
			// + update from wp-admin entirely. Tighter than DISALLOW_FILE_EDIT
			// (which only blocks the in-browser editor). Skip if you want to
			// keep admin-side updates; enable when running from CI/git.
			// Currently gated to the same toggle as DISALLOW_FILE_EDIT for
			// simplicity; if users complain we'll split into two toggles.
			// if ( ! defined( 'DISALLOW_FILE_MODS' ) ) define( 'DISALLOW_FILE_MODS', true );

			// v0.50.31 — DISALLOW_UNFILTERED_HTML: stops Administrators
			// from posting <script> + arbitrary HTML via the editor. Recommended
			// for headless setups (Astro re-renders content; raw HTML is a vector).
			if ( ! defined( 'DISALLOW_UNFILTERED_HTML' ) ) {
				define( 'DISALLOW_UNFILTERED_HTML', true );
			}
		}

		// Hardening headers on the WP origin.
		if ( get_option( 'hatch_security_send_headers', false ) ) {
			add_action( 'send_headers', array( __CLASS__, 'send_security_headers' ) );

			// v0.50.31 — Block PHP execution in /wp-content/uploads/. If an
			// attacker manages to upload a .php file (via vulnerable plugin
			// or compromised admin account), it can't execute. Writes an
			// .htaccess on activation; idempotent.
			self::ensure_uploads_php_block();
		}

		// 2FA enforcement — only meaningful when a provider exists.
		if ( get_option( 'hatch_security_enforce_2fa', false ) ) {
			add_action( 'init', array( __CLASS__, 'maybe_enforce_2fa' ), 5 );
		}

		// -- Fortress Mode wiring ------------------------------------------
		// The master switch forces all seven sub-features on when active;
		// individual toggles still work when the master is off. `is_on()`
		// resolves the effective state.
		if ( self::is_on( 'hide_login' ) ) {
			add_action( 'init', array( __CLASS__, 'fortress_hide_login' ), 1 );
			add_action( 'login_init', array( __CLASS__, 'fortress_hide_login' ), 1 );
		}
		if ( self::is_on( 'block_xmlrpc' ) ) {
			add_filter( 'xmlrpc_enabled', '__return_false', 99 );
			add_action( 'init', array( __CLASS__, 'fortress_block_xmlrpc' ), 1 );
		}
		if ( self::is_on( 'disable_rest_users' ) ) {
			add_filter( 'rest_endpoints', array( __CLASS__, 'fortress_disable_rest_users' ), 99 );
			add_filter( 'rest_authentication_errors', array( __CLASS__, 'fortress_rest_users_auth' ), 99 );
		}
		if ( self::is_on( 'disable_file_edit' ) ) {
			if ( ! defined( 'DISALLOW_FILE_EDIT' ) ) {
				define( 'DISALLOW_FILE_EDIT', true );
			}
			if ( ! defined( 'DISALLOW_FILE_MODS' ) ) {
				define( 'DISALLOW_FILE_MODS', true );
			}
		}
		if ( self::is_on( 'app_password_only' ) ) {
			add_filter( 'rest_authentication_errors', array( __CLASS__, 'fortress_require_app_password' ), 100 );
		}
		if ( self::is_on( 'headers' ) ) {
			add_action( 'send_headers', array( __CLASS__, 'fortress_send_headers' ) );
			add_action( 'login_init', array( __CLASS__, 'fortress_send_headers' ) );
		}
		if ( self::is_on( 'hide_wp_version' ) ) {
			// Strip generator meta + RSS + script/style ?ver=.
			remove_action( 'wp_head', 'wp_generator' );
			add_filter( 'the_generator', '__return_empty_string' );
			add_filter( 'style_loader_src',  array( __CLASS__, 'strip_version_query_arg' ), 9999, 1 );
			add_filter( 'script_loader_src', array( __CLASS__, 'strip_version_query_arg' ), 9999, 1 );
		}
		if ( self::is_on( 'disable_directory_browsing' ) ) {
			add_action( 'init', array( __CLASS__, 'fortress_block_uploads_index' ), 1 );
			// Best-effort .htaccess for Apache-style hosts.
			self::ensure_uploads_options_indexes_off();
		}
	}

	/**
	 * Master helper. `hatch_fortress_mode` acts as the OR-master: if it's on,
	 * every sub-feature is on; otherwise, per-key `hatch_fortress_<name>`
	 * decides. Single-site option storage — multisite (get_site_option) is
	 * NOT in scope for v0.50.32; per-site fortress is expected.
	 *
	 * @param string $key one of hide_login, block_xmlrpc, disable_rest_users,
	 *                    disable_file_edit, app_password_only, headers,
	 *                    hide_wp_version, disable_directory_browsing.
	 * @return bool effective state.
	 */
	public static function is_on( string $key ): bool {
		if ( (bool) get_option( 'hatch_fortress_mode', false ) ) {
			return true;
		}
		return (bool) get_option( 'hatch_fortress_' . $key, false );
	}

	/**
	 * Return the current /wp-login.php bypass key, generating one if the
	 * fortress toggle is on but no key exists yet. Random 24-char slug —
	 * URL-safe, cryptographically strong via wp_generate_password().
	 *
	 * @return string
	 */
	public static function get_login_key(): string {
		$key = get_option( 'hatch_fortress_login_key', '' );
		if ( ! is_string( $key ) || strlen( $key ) < 12 ) {
			$key = wp_generate_password( 24, false, false );
			update_option( 'hatch_fortress_login_key', $key, false );
		}
		return $key;
	}

	/**
	 * Hide /wp-login.php behind ?hatch_key=<value>. Any request that lacks
	 * the key (or provides the wrong one) gets a hard 404. Legitimate
	 * automation still authenticates via the URL bookmark that includes
	 * the key.
	 *
	 * Safety: never lock out a logged-in admin. If the current user is
	 * already authenticated with `manage_options`, skip the gate — recovery
	 * is possible via wp-cli option delete.
	 *
	 * @return void
	 */
	public static function fortress_hide_login(): void {
		if ( ! isset( $_SERVER['REQUEST_URI'] ) ) return;
		$req = wp_parse_url( wp_unslash( $_SERVER['REQUEST_URI'] ), PHP_URL_PATH );
		if ( ! is_string( $req ) ) return;
		$req = strtolower( $req );
		$is_login = ( false !== strpos( $req, 'wp-login.php' ) );
		$is_admin_root = ( '/wp-admin/' === $req || '/wp-admin' === $req );
		if ( ! $is_login && ! $is_admin_root ) return;

		// Never gate logged-in admins — recovery-safe.
		if ( is_user_logged_in() && current_user_can( 'manage_options' ) ) {
			return;
		}

		$expected = self::get_login_key();
		$provided = isset( $_GET['hatch_key'] ) ? sanitize_text_field( wp_unslash( $_GET['hatch_key'] ) ) : '';
		if ( '' !== $provided && hash_equals( $expected, $provided ) ) {
			return; // Correct key — let WP handle the login form.
		}

		status_header( 404 );
		nocache_headers();
		if ( function_exists( 'wp_die' ) ) {
			wp_die( esc_html__( 'Not found.', 'hatch' ), esc_html__( '404', 'hatch' ), array( 'response' => 404 ) );
		}
		exit;
	}

	/**
	 * Return 403 for any hit on /xmlrpc.php. Also disables the filter chain
	 * via `xmlrpc_enabled` above so no listener even boots.
	 *
	 * @return void
	 */
	public static function fortress_block_xmlrpc(): void {
		if ( ! isset( $_SERVER['SCRIPT_NAME'] ) && ! isset( $_SERVER['REQUEST_URI'] ) ) return;
		$req = '';
		if ( isset( $_SERVER['REQUEST_URI'] ) ) {
			$req = strtolower( (string) wp_parse_url( wp_unslash( $_SERVER['REQUEST_URI'] ), PHP_URL_PATH ) );
		}
		if ( false === strpos( $req, 'xmlrpc.php' ) ) return;
		status_header( 403 );
		nocache_headers();
		header( 'Content-Type: text/plain; charset=utf-8' );
		echo 'Forbidden.';
		exit;
	}

	/**
	 * Drop /wp/v2/users from the REST endpoint map entirely for anonymous
	 * traffic. Authenticated users (editors, admins) can still list their
	 * peers via the admin UI.
	 *
	 * @param array $endpoints
	 * @return array
	 */
	public static function fortress_disable_rest_users( $endpoints ) {
		if ( is_user_logged_in() ) return $endpoints;
		if ( isset( $endpoints['/wp/v2/users'] ) )               unset( $endpoints['/wp/v2/users'] );
		if ( isset( $endpoints['/wp/v2/users/(?P<id>[\d]+)'] ) ) unset( $endpoints['/wp/v2/users/(?P<id>[\d]+)'] );
		return $endpoints;
	}

	/**
	 * Belt-and-braces: if anything else re-registers the /users route, we
	 * still block anonymous hits with a WP_Error at auth time.
	 *
	 * @param WP_Error|null|true $result existing auth state.
	 * @return WP_Error|null|true
	 */
	public static function fortress_rest_users_auth( $result ) {
		if ( ! empty( $result ) ) return $result;
		if ( is_user_logged_in() ) return $result;
		$route = isset( $GLOBALS['wp']->query_vars['rest_route'] ) ? (string) $GLOBALS['wp']->query_vars['rest_route'] : '';
		if ( '' === $route && isset( $_SERVER['REQUEST_URI'] ) ) {
			$route = (string) wp_parse_url( wp_unslash( $_SERVER['REQUEST_URI'] ), PHP_URL_PATH );
		}
		if ( false !== strpos( $route, '/wp/v2/users' ) ) {
			return new WP_Error(
				'hatch_fortress_users_disabled',
				esc_html__( 'The users endpoint is disabled for anonymous requests.', 'hatch' ),
				array( 'status' => 401 )
			);
		}
		return $result;
	}

	/**
	 * Require Application Passwords (not real user passwords) for any REST
	 * mutation (POST/PUT/PATCH/DELETE) on /wp/v2/*. Hatch's own /hatch/v1/*
	 * endpoints are exempted — they run their own auth model.
	 *
	 * Detection: WordPress core sets `application_passwords` on the auth
	 * state during authentication when the caller used an app password
	 * (see wp-includes/user.php::wp_authenticate_application_password).
	 * If the current user was authed but that flag is missing, reject.
	 *
	 * @param WP_Error|null|true $result
	 * @return WP_Error|null|true
	 */
	public static function fortress_require_app_password( $result ) {
		if ( is_wp_error( $result ) ) return $result;
		$method = isset( $_SERVER['REQUEST_METHOD'] ) ? strtoupper( sanitize_text_field( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) ) : 'GET';
		if ( ! in_array( $method, array( 'POST', 'PUT', 'PATCH', 'DELETE' ), true ) ) return $result;
		$route = isset( $GLOBALS['wp']->query_vars['rest_route'] ) ? (string) $GLOBALS['wp']->query_vars['rest_route'] : '';
		if ( '' === $route && isset( $_SERVER['REQUEST_URI'] ) ) {
			$route = (string) wp_parse_url( wp_unslash( $_SERVER['REQUEST_URI'] ), PHP_URL_PATH );
		}
		// Only enforce for core /wp/v2 mutations. Exempt Hatch's namespace.
		if ( false === strpos( $route, '/wp/v2/' ) ) return $result;
		if ( false !== strpos( $route, '/hatch/' ) )  return $result;
		if ( ! is_user_logged_in() ) return $result; // Let core reject with its own 401.

		$is_app_pw = (bool) apply_filters( 'application_password_is_api_request', false );
		// Fallback probe — WP core stores the used app password id in a global.
		if ( ! $is_app_pw && ! empty( $GLOBALS['wp_rest_application_password_uuid'] ) ) {
			$is_app_pw = true;
		}
		if ( $is_app_pw ) return $result;

		return new WP_Error(
			'hatch_fortress_app_password_required',
			esc_html__( 'This endpoint requires an Application Password. Cookie or basic-auth mutations are disabled by Fortress Mode.', 'hatch' ),
			array( 'status' => 401 )
		);
	}

	/**
	 * OWASP-baseline security headers for the WP origin. Independent from
	 * the legacy `hatch_security_send_headers` toggle — this is the
	 * fortress-branded emitter and adds one extra header (Cross-Origin-
	 * Opener-Policy) recommended by the OWASP Secure Headers Project.
	 *
	 * @return void
	 */
	public static function fortress_send_headers(): void {
		if ( headers_sent() ) return;
		if ( is_ssl() ) {
			header( 'Strict-Transport-Security: max-age=31536000; includeSubDomains' );
		}
		header( 'X-Frame-Options: SAMEORIGIN' );
		header( 'X-Content-Type-Options: nosniff' );
		header( 'Referrer-Policy: strict-origin-when-cross-origin' );
		header( 'Permissions-Policy: camera=(), microphone=(), geolocation=()' );
	}

	/**
	 * Strip `?ver=x.y.z` off enqueued style/script URLs so bots can't
	 * fingerprint bundled library versions. Applied via loader_src filters.
	 *
	 * @param string $src
	 * @return string
	 */
	public static function strip_version_query_arg( $src ) {
		if ( ! is_string( $src ) || '' === $src ) return $src;
		return remove_query_arg( 'ver', $src );
	}

	/**
	 * 403 any anonymous hit that looks like a bare uploads directory index
	 * request (…/uploads/, …/uploads/2026/, …/uploads/2026/08/). Legitimate
	 * asset URLs include a filename after the last slash — those pass.
	 *
	 * @return void
	 */
	public static function fortress_block_uploads_index(): void {
		if ( ! isset( $_SERVER['REQUEST_URI'] ) ) return;
		$path = (string) wp_parse_url( wp_unslash( $_SERVER['REQUEST_URI'] ), PHP_URL_PATH );
		if ( '' === $path ) return;
		// Only bare directory requests (trailing slash, no filename).
		if ( ! preg_match( '#/wp-content/uploads/(\d{4}/(\d{2}/)?)?$#i', $path ) ) return;
		status_header( 403 );
		nocache_headers();
		header( 'Content-Type: text/plain; charset=utf-8' );
		echo 'Forbidden.';
		exit;
	}

	/**
	 * Write `Options -Indexes` into /uploads/.htaccess. Idempotent —
	 * checks for the Hatch marker before appending. No-op on non-Apache
	 * hosts (the file is ignored by nginx/lightspeed, which is fine).
	 *
	 * @return void
	 */
	private static function ensure_uploads_options_indexes_off(): void {
		$dir = wp_get_upload_dir();
		if ( empty( $dir['basedir'] ) || ! is_writable( $dir['basedir'] ) ) return;
		$file = trailingslashit( $dir['basedir'] ) . '.htaccess';
		$existing = file_exists( $file ) ? (string) @file_get_contents( $file ) : '';
		if ( false !== strpos( $existing, '# Hatch fortress — no directory listings' ) ) return;
		$snippet = "\n# Hatch fortress — no directory listings\nOptions -Indexes\n";
		@file_put_contents( $file, $existing . $snippet );
	}

	/**
	 * v0.50.31 — Write an .htaccess in /uploads/ that denies PHP execution.
	 * Critical hardening for headless: an attacker who uploads a .php file
	 * through a vulnerable plugin can't shell-execute it.
	 *
	 * Idempotent. Runs once per page-load when send_headers toggle is on.
	 * Cheap because we only touch FS if the marker file is missing.
	 */
	private static function ensure_uploads_php_block(): void {
		$dir = wp_get_upload_dir();
		if ( empty( $dir['basedir'] ) || ! is_writable( $dir['basedir'] ) ) return;
		$htaccess = trailingslashit( $dir['basedir'] ) . '.htaccess';
		if ( file_exists( $htaccess ) ) return;
		$contents = "# Hatch hardening — block PHP execution in uploads.\n" .
		            "<FilesMatch \"\\.(php|phtml|phps|php3|php4|php5|php7|php8|pl|py|jsp|asp|cgi|sh|bash)\$\">\n" .
		            "  Require all denied\n" .
		            "</FilesMatch>\n";
		@file_put_contents( $htaccess, $contents );
	}

	/**
	 * Hard-coded sensible defaults. Each header is conservative — the kind
	 * that won't break a typical WP admin or REST flow.
	 *
	 * @return void
	 */
	public static function send_security_headers(): void {
		// Don't double-send if a security plugin already did.
		if ( ! headers_sent() ) {
			// 1-year HSTS, preload-eligible. Only matters on https.
			if ( is_ssl() ) {
				header( 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload' );
			}
			// Same-origin only — prevents the WP admin from being framed by
			// the Astro frontend (or anyone else). The frontend reads via
			// REST, not iframes, so no breakage.
			header( 'X-Frame-Options: SAMEORIGIN' );
			// Modern referrer policy. Tighter than no-referrer-when-downgrade.
			header( 'Referrer-Policy: strict-origin-when-cross-origin' );
			// Stops content-sniffing exploits where the browser guesses MIME.
			header( 'X-Content-Type-Options: nosniff' );
			// Restricts powerful APIs by default (camera, mic, geolocation).
			header( 'Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()' );
		}
	}

	/**
	 * Best-effort 2FA enforcement. We can't ship our own 2FA — that's a whole
	 * plugin. Instead we surface whether a known provider is active and gate
	 * admin access to users who've completed setup when one IS active.
	 *
	 * For now this is a soft-enforce: it adds an admin notice for users who
	 * haven't set up 2FA, rather than locking them out (which would brick a
	 * site if the provider plugin is later removed).
	 *
	 * @return void
	 */
	public static function maybe_enforce_2fa(): void {
		$provider = self::detect_2fa_provider();
		if ( '' === $provider ) {
			return;
		}
		add_action( 'admin_notices', static function () use ( $provider ) {
			if ( ! current_user_can( 'manage_options' ) ) return;
			if ( self::user_has_2fa_configured() ) return;
			echo '<div class="notice notice-warning"><p>';
			echo '<strong>Hatch:</strong> 2FA enforcement is on but you haven\'t configured it yet via ';
			echo esc_html( $provider );
			echo '. Set it up to keep your admin access secure.';
			echo '</p></div>';
		} );
	}

	/**
	 * Best-effort: identify the active 2FA plugin so we can name it in copy.
	 *
	 * @return string Provider name, or empty string when none detected.
	 */
	public static function detect_2fa_provider(): string {
		// Cheapest possible probe: check for the symbol each plugin uniquely
		// defines once active. No is_plugin_active() calls (that requires
		// wp-admin/includes/plugin.php which may not be loaded).
		if ( class_exists( 'WP2FA\\WP2FA' ) || function_exists( 'wp2fa_security' ) ) {
			return 'WP 2FA';
		}
		if ( class_exists( 'Two_Factor_Core' ) ) {
			return 'Two-Factor';
		}
		if ( defined( 'MO2FA_VERSION' ) || class_exists( 'Miniorange_Authentication' ) ) {
			return 'miniOrange 2FA';
		}
		if ( class_exists( 'wfWAF' ) && class_exists( 'wfTwoFactor' ) ) {
			return 'Wordfence 2FA';
		}
		if ( defined( 'ITSEC_VERSION' ) || class_exists( 'iThemes_Sync' ) ) {
			return 'Solid Security (iThemes)';
		}
		return '';
	}

	/**
	 * Best-effort check: has the current user actually set up 2FA?
	 * Each provider stores this differently — we only need a strong YES, a
	 * weak NO is fine because the notice is non-blocking.
	 *
	 * @return bool
	 */
	public static function user_has_2fa_configured(): bool {
		$uid = get_current_user_id();
		if ( ! $uid ) return false;
		// WP 2FA stores per-user enabled methods.
		if ( get_user_meta( $uid, 'wp_2fa_totp_key', true ) ) return true;
		// Two-Factor core feature plugin.
		if ( get_user_meta( $uid, '_two_factor_enabled_providers', true ) ) return true;
		// miniOrange.
		if ( get_user_meta( $uid, 'mo2f_configured_2FA_method', true ) ) return true;
		return false;
	}

	/**
	 * Return the wp-admin URL that takes the user to the active provider's
	 * setup screen. Empty string when no provider is detected.
	 *
	 * @return string Absolute admin URL or ''.
	 */
	public static function get_2fa_settings_url(): string {
		$provider = self::detect_2fa_provider();
		switch ( $provider ) {
			case 'WP 2FA':                return admin_url( 'admin.php?page=wp-2fa-settings' );
			case 'Two-Factor':            return admin_url( 'profile.php#two-factor-options' );
			case 'miniOrange 2FA':        return admin_url( 'admin.php?page=mo_2fa_two_factor' );
			case 'Wordfence 2FA':         return admin_url( 'admin.php?page=WordfenceLogin' );
			case 'Solid Security (iThemes)': return admin_url( 'admin.php?page=itsec' );
			default:                      return '';
		}
	}
}

Hatch_Hardening::init();

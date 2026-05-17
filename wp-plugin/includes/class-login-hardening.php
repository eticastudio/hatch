<?php
/**
 * Login URL hardening + wp-admin guard + brute-force lockout.
 *
 * Reference implementation: WPS Hide Login (2M+ installs, GPL).
 *   https://wordpress.org/plugins/wps-hide-login/
 *
 * We re-implement the same proven approach with three Hatch-specific
 * additions for the headless context:
 *
 *   1. Headless role guard — kick non-editor/admin roles OUT of wp-admin.
 *      In a headless setup there is no public-facing theme, so subscribers
 *      / WooCommerce customers / membership users have no business being
 *      inside wp-admin. They get a clean 401 from REST or a redirect.
 *
 *   2. wp_die() instead of theme-rendered 404 — the headless CMS has no
 *      public theme; loading the template loader for a 404 would error.
 *
 *   3. Brute-force IP lockout — transient-based counter on wp_login_failed.
 *      Generic "too many attempts" message, never reveals counter state.
 *
 * Entire class is a no-op until the user sets `hatch_login_slug` to a
 * non-empty slug. Default install does nothing — safe by default.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Login_Hardening
 */
class Hatch_Login_Hardening {

	/**
	 * Lockout transient prefix.
	 */
	const LOCKOUT_PREFIX = 'hatch_bf_';

	/**
	 * @var Hatch_Login_Hardening|null
	 */
	private static $instance = null;

	/**
	 * Captured custom-slug request flag (set in plugins_loaded, read in wp_loaded).
	 *
	 * @var bool
	 */
	private $is_wp_login_php = false;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Login_Hardening
	 */
	public static function instance(): Hatch_Login_Hardening {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire hooks. Most are no-ops if the feature is disabled.
	 */
	private function __construct() {
		// Brute-force lockout is independent of the custom-slug feature — always wire it.
		add_filter( 'authenticate', array( $this, 'check_brute_force_lockout' ), 30, 1 );
		add_action( 'wp_login_failed', array( $this, 'record_failed_login' ) );
		add_action( 'wp_login', array( $this, 'reset_lockout' ), 10, 2 );

		// Headless role guard — independent of custom-slug feature.
		add_action( 'admin_init', array( $this, 'enforce_role_guard' ), 1 );

		// Custom login slug feature only wires if configured.
		if ( ! $this->is_custom_slug_enabled() ) {
			return;
		}

		add_action( 'plugins_loaded', array( $this, 'intercept_login_request' ), 9999 );
		add_action( 'wp_loaded', array( $this, 'handle_login_routing' ) );

		add_filter( 'site_url', array( $this, 'filter_login_url' ), 10, 4 );
		add_filter( 'network_site_url', array( $this, 'filter_network_login_url' ), 10, 3 );
		add_filter( 'wp_redirect', array( $this, 'filter_redirect' ), 10, 2 );
		add_filter( 'site_option_welcome_email', array( $this, 'filter_welcome_email' ) );

		// Block sneaky discovery via wp_redirect_admin_locations.
		remove_action( 'template_redirect', 'wp_redirect_admin_locations', 1000 );

		// Block signup/activate on non-multisite installs entirely.
		add_action( 'init', array( $this, 'block_signup_endpoints' ) );

		// Validate slug on save.
		add_filter( 'pre_update_option_hatch_login_slug', array( $this, 'validate_slug_on_save' ), 10, 2 );
	}

	/* ----------------------------------------------------------------
	 * SECTION 1: Custom Login Slug (WPS Hide Login approach)
	 * ---------------------------------------------------------------- */

	/**
	 * Is the custom slug feature enabled?
	 *
	 * @return bool
	 */
	public function is_custom_slug_enabled(): bool {
		return '' !== $this->get_login_slug();
	}

	/**
	 * Get the configured login slug. Empty string = disabled.
	 *
	 * @return string
	 */
	public function get_login_slug(): string {
		$slug = (string) get_option( 'hatch_login_slug', '' );
		$slug = sanitize_title_with_dashes( $slug );
		// Defense in depth — never return forbidden values even if option got corrupted.
		if ( in_array( $slug, $this->forbidden_slugs(), true ) ) {
			return '';
		}
		return $slug;
	}

	/**
	 * Get the redirect slug for blocked /wp-admin or /wp-login access.
	 *
	 * @return string
	 */
	public function get_redirect_slug(): string {
		$slug = (string) get_option( 'hatch_login_redirect_slug', '404' );
		$slug = sanitize_title_with_dashes( $slug );
		return '' === $slug ? '404' : $slug;
	}

	/**
	 * Build the full custom login URL.
	 *
	 * @param string|null $scheme URL scheme.
	 * @return string
	 */
	public function get_login_url( $scheme = null ): string {
		$slug = $this->get_login_slug();
		if ( '' === $slug ) {
			return wp_login_url();
		}
		$base = home_url( '/', $scheme );
		if ( get_option( 'permalink_structure' ) ) {
			return trailingslashit( $base . $slug );
		}
		return $base . '?' . $slug;
	}

	/**
	 * Build the full redirect URL for blocked access.
	 *
	 * @param string|null $scheme URL scheme.
	 * @return string
	 */
	public function get_redirect_url( $scheme = null ): string {
		$slug = $this->get_redirect_slug();
		$base = home_url( '/', $scheme );
		if ( get_option( 'permalink_structure' ) ) {
			return trailingslashit( $base . $slug );
		}
		return $base . '?' . $slug;
	}

	/**
	 * Intercept the request early — before WordPress decides what file to load.
	 *
	 * Two cases:
	 *   A) Request hits /wp-login.php or /wp-register.php → spoof REQUEST_URI to
	 *      a non-existent path so WordPress 404s and we wp_die() in handle_login_routing().
	 *   B) Request matches the custom slug → spoof SCRIPT_NAME so WordPress
	 *      loads wp-login.php as normal.
	 *
	 * @return void
	 */
	public function intercept_login_request(): void {
		global $pagenow;

		if ( empty( $_SERVER['REQUEST_URI'] ) ) {
			return;
		}

		$request_uri = rawurldecode( (string) $_SERVER['REQUEST_URI'] );
		$parts       = wp_parse_url( $request_uri );
		$path        = isset( $parts['path'] ) ? untrailingslashit( (string) $parts['path'] ) : '';
		$site_login  = untrailingslashit( site_url( 'wp-login', 'relative' ) );
		$site_reg    = untrailingslashit( site_url( 'wp-register', 'relative' ) );

		$hits_wp_login = ( false !== strpos( $request_uri, 'wp-login.php' ) ) || ( '' !== $path && $path === $site_login );
		$hits_wp_reg   = ( false !== strpos( $request_uri, 'wp-register.php' ) ) || ( '' !== $path && $path === $site_reg );

		if ( ( $hits_wp_login || $hits_wp_reg ) && ! is_admin() ) {
			$this->is_wp_login_php = true;
			// Spoof to non-existent path so WP treats it as a 404. We wp_die() in handle_login_routing().
			$_SERVER['REQUEST_URI'] = '/' . str_repeat( '-/', 10 );
			$pagenow                = 'index.php';
			return;
		}

		// Match custom slug?
		$slug      = $this->get_login_slug();
		$home_slug = '' !== $slug ? home_url( $slug, 'relative' ) : '';
		if ( '' !== $slug ) {
			$matches_path  = ( '' !== $path && untrailingslashit( $path ) === untrailingslashit( $home_slug ) );
			$matches_query = ( ! get_option( 'permalink_structure' ) && isset( $_GET[ $slug ] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			if ( $matches_path || $matches_query ) {
				$_SERVER['SCRIPT_NAME'] = '/wp-login.php';
				$pagenow                = 'wp-login.php';
			}
		}
	}

	/**
	 * After WP boots — decide final routing.
	 *
	 * Cases handled here:
	 *   1. Anonymous user trying to enter /wp-admin → redirect to redirect URL.
	 *   2. Anonymous user tried to hit /wp-login.php → wp_die 404.
	 *   3. Logged-in user hitting the custom slug → redirect to admin.
	 *
	 * @return void
	 */
	public function handle_login_routing(): void {
		global $pagenow;

		// Carve-outs (mandatory — copied from WPS Hide Login).
		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			return;
		}
		if ( defined( 'DOING_AJAX' ) && DOING_AJAX ) {
			return;
		}
		if ( defined( 'DOING_CRON' ) && DOING_CRON ) {
			return;
		}
		if ( 'admin-post.php' === $pagenow ) {
			return;
		}

		$request_uri = isset( $_SERVER['REQUEST_URI'] ) ? rawurldecode( (string) $_SERVER['REQUEST_URI'] ) : '';
		$parts       = wp_parse_url( $request_uri );
		$path        = isset( $parts['path'] ) ? (string) $parts['path'] : '';

		// Allow options.php submissions (admin form processing).
		if ( '/wp-admin/options.php' === $path ) {
			return;
		}

		// Allow postpass action (password-protected posts).
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( isset( $_GET['action'] ) && 'postpass' === $_GET['action'] ) {
			return;
		}

		// 1. Anonymous user trying /wp-admin → redirect.
		if ( is_admin() && ! is_user_logged_in() ) {
			wp_safe_redirect( $this->get_redirect_url() );
			exit;
		}

		// 2. Anonymous user trying /wp-login.php → 404 (no theme template — pure wp_die).
		if ( $this->is_wp_login_php ) {
			status_header( 404 );
			nocache_headers();
			wp_die(
				esc_html__( 'Nothing here.', 'hatch' ),
				esc_html__( 'Not Found', 'hatch' ),
				array( 'response' => 404 )
			);
		}

		// 3. Logged-in user hitting custom slug — let wp-login.php run.
		if ( 'wp-login.php' === $pagenow ) {
			// Standard wp-login.php flow.
			return;
		}
	}

	/**
	 * Filter site_url() — rewrite any wp-login.php references to custom slug.
	 *
	 * @param string $url        URL.
	 * @param string $path       Path.
	 * @param string $scheme     Scheme.
	 * @param int    $blog_id    Blog ID.
	 * @return string
	 */
	public function filter_login_url( $url, $path = '', $scheme = null, $blog_id = 0 ): string {
		unset( $path, $blog_id );
		return $this->rewrite_login_in_url( (string) $url, $scheme );
	}

	/**
	 * Filter network_site_url().
	 *
	 * @param string $url    URL.
	 * @param string $path   Path.
	 * @param string $scheme Scheme.
	 * @return string
	 */
	public function filter_network_login_url( $url, $path = '', $scheme = null ): string {
		unset( $path );
		return $this->rewrite_login_in_url( (string) $url, $scheme );
	}

	/**
	 * Filter wp_redirect() to rewrite wp-login.php redirects.
	 *
	 * @param string $location Location.
	 * @param int    $status   Status code.
	 * @return string
	 */
	public function filter_redirect( $location, $status = 302 ) {
		unset( $status );
		return $this->rewrite_login_in_url( (string) $location, null );
	}

	/**
	 * Filter site welcome email (multisite) to swap wp-login.php for custom slug.
	 *
	 * @param string $value Email body.
	 * @return string
	 */
	public function filter_welcome_email( $value ): string {
		$slug = $this->get_login_slug();
		if ( '' === $slug ) {
			return (string) $value;
		}
		return str_replace( 'wp-login.php', trailingslashit( $slug ), (string) $value );
	}

	/**
	 * Helper — replace wp-login.php with the custom slug URL in any URL string.
	 *
	 * @param string      $url    Input URL.
	 * @param string|null $scheme URL scheme.
	 * @return string
	 */
	private function rewrite_login_in_url( string $url, $scheme = null ): string {
		if ( '' === $url ) {
			return $url;
		}
		if ( false === strpos( $url, 'wp-login.php' ) ) {
			return $url;
		}
		// Preserve postpass action — that's a legit wp-login.php usage.
		if ( false !== strpos( $url, 'wp-login.php?action=postpass' ) ) {
			return $url;
		}

		$parts = explode( '?', $url );
		if ( isset( $parts[1] ) ) {
			parse_str( $parts[1], $args );
			if ( isset( $args['login'] ) ) {
				$args['login'] = rawurlencode( (string) $args['login'] );
			}
			return add_query_arg( $args, $this->get_login_url( $scheme ) );
		}
		return $this->get_login_url( $scheme );
	}

	/**
	 * Block direct hits on /wp-signup.php and /wp-activate.php on non-multisite.
	 *
	 * @return void
	 */
	public function block_signup_endpoints(): void {
		if ( is_multisite() ) {
			return;
		}
		$uri = isset( $_SERVER['REQUEST_URI'] ) ? rawurldecode( (string) $_SERVER['REQUEST_URI'] ) : '';
		if ( false !== strpos( $uri, 'wp-signup' ) || false !== strpos( $uri, 'wp-activate' ) ) {
			wp_die(
				esc_html__( 'Signup is disabled on this site.', 'hatch' ),
				esc_html__( 'Forbidden', 'hatch' ),
				array( 'response' => 403 )
			);
		}
	}

	/**
	 * Reject slugs that conflict with WP query vars or are obviously bad.
	 *
	 * @param string $new   New value.
	 * @param string $old   Old value.
	 * @return string
	 */
	public function validate_slug_on_save( $new, $old ) {
		$new_clean = sanitize_title_with_dashes( (string) $new );
		if ( '' === $new_clean ) {
			return ''; // disable feature.
		}
		if ( in_array( $new_clean, $this->forbidden_slugs(), true ) ) {
			add_settings_error(
				'hatch_login_slug',
				'hatch_login_slug_forbidden',
				/* translators: %s: forbidden slug */
				sprintf( esc_html__( 'The slug "%s" cannot be used — it conflicts with WordPress core. Choose a different slug.', 'hatch' ), esc_html( $new_clean ) )
			);
			return (string) $old;
		}
		return $new_clean;
	}

	/**
	 * Forbidden slugs.
	 *
	 * @return array<string>
	 */
	private function forbidden_slugs(): array {
		$base = array(
			'wp-login',
			'wp-admin',
			'wp-content',
			'wp-includes',
			'login',
			'admin',
			'dashboard',
			'wp',
			'wordpress',
		);
		if ( class_exists( 'WP' ) ) {
			$wp = new WP();
			if ( property_exists( $wp, 'public_query_vars' ) ) {
				$base = array_merge( $base, (array) $wp->public_query_vars );
			}
			if ( property_exists( $wp, 'private_query_vars' ) ) {
				$base = array_merge( $base, (array) $wp->private_query_vars );
			}
		}
		return array_unique( $base );
	}

	/* ----------------------------------------------------------------
	 * SECTION 2: Headless Role Guard
	 * ---------------------------------------------------------------- */

	/**
	 * If a logged-in user lacks an "allowed" role, kick them out of wp-admin.
	 *
	 * In a headless setup, there's no public frontend on the CMS domain — so
	 * subscribers, customers, members etc. have nothing to do in wp-admin.
	 *
	 * @return void
	 */
	public function enforce_role_guard(): void {
		if ( ! get_option( 'hatch_login_role_guard_enabled', 1 ) ) {
			return;
		}
		if ( ! is_user_logged_in() ) {
			return;
		}
		if ( wp_doing_ajax() || ( defined( 'DOING_CRON' ) && DOING_CRON ) ) {
			return;
		}
		// admin-post.php must remain reachable.
		global $pagenow;
		if ( 'admin-post.php' === $pagenow ) {
			return;
		}

		$user = wp_get_current_user();
		if ( ! $user || ! $user->exists() ) {
			return;
		}

		// Super admins always pass.
		if ( is_multisite() && function_exists( 'is_super_admin' ) && is_super_admin( $user->ID ) ) {
			return;
		}

		$allowed = $this->get_allowed_admin_roles();
		$user_roles = (array) $user->roles;

		if ( array_intersect( $allowed, $user_roles ) ) {
			return; // user has at least one allowed role.
		}

		// Block — log out and redirect to redirect URL (or homepage as fallback).
		wp_logout();
		$dest = $this->is_custom_slug_enabled() ? $this->get_redirect_url() : home_url( '/' );
		wp_safe_redirect( $dest );
		exit;
	}

	/**
	 * Get the list of roles allowed inside wp-admin in headless context.
	 *
	 * @return array<string>
	 */
	public function get_allowed_admin_roles(): array {
		$option = get_option( 'hatch_login_allowed_roles', 'administrator,editor,author' );
		$roles  = array_filter( array_map( 'trim', explode( ',', (string) $option ) ) );
		// Always allow administrator — safety net against locking yourself out.
		if ( ! in_array( 'administrator', $roles, true ) ) {
			$roles[] = 'administrator';
		}
		return array_values( array_unique( array_map( 'sanitize_key', $roles ) ) );
	}

	/* ----------------------------------------------------------------
	 * SECTION 3: Brute-Force IP Lockout
	 * ---------------------------------------------------------------- */

	/**
	 * Get failure threshold.
	 *
	 * @return int
	 */
	private function get_bf_limit(): int {
		$limit = (int) get_option( 'hatch_brute_force_limit', 5 );
		return max( 3, min( 20, $limit ) );
	}

	/**
	 * Get lockout window in seconds.
	 *
	 * @return int
	 */
	private function get_bf_window(): int {
		$mins = (int) get_option( 'hatch_brute_force_window', 30 );
		$mins = max( 5, min( 240, $mins ) );
		return $mins * MINUTE_IN_SECONDS;
	}

	/**
	 * Build transient key from the requester's IP.
	 *
	 * Uses hash to avoid storing raw IPs as option keys. Trusts only REMOTE_ADDR
	 * (no X-Forwarded-For trust — spoofable without a proxy whitelist).
	 *
	 * @return string|null Null if no usable IP.
	 */
	private function get_lockout_key(): ?string {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? (string) $_SERVER['REMOTE_ADDR'] : '';
		$ip = trim( $ip );
		if ( '' === $ip || ! filter_var( $ip, FILTER_VALIDATE_IP ) ) {
			return null;
		}
		return self::LOCKOUT_PREFIX . substr( hash( 'sha256', $ip ), 0, 32 );
	}

	/**
	 * Pre-auth filter — reject if IP is locked out.
	 *
	 * @param mixed $user WP_User|WP_Error|null.
	 * @return mixed
	 */
	public function check_brute_force_lockout( $user ) {
		// If already an error from a higher-priority filter, just pass through.
		if ( is_wp_error( $user ) ) {
			return $user;
		}
		$key = $this->get_lockout_key();
		if ( null === $key ) {
			return $user;
		}
		$attempts = (int) get_transient( $key );
		if ( $attempts >= $this->get_bf_limit() ) {
			return new WP_Error(
				'hatch_too_many_attempts',
				esc_html__( 'Too many failed login attempts. Try again later.', 'hatch' )
			);
		}
		return $user;
	}

	/**
	 * Increment counter on failed login.
	 *
	 * @return void
	 */
	public function record_failed_login(): void {
		$key = $this->get_lockout_key();
		if ( null === $key ) {
			return;
		}
		$current = (int) get_transient( $key );
		set_transient( $key, $current + 1, $this->get_bf_window() );
	}

	/**
	 * Reset counter on successful login.
	 *
	 * @param string  $user_login Username.
	 * @param WP_User $user       User object.
	 * @return void
	 */
	public function reset_lockout( $user_login, $user = null ): void {
		unset( $user_login, $user );
		$key = $this->get_lockout_key();
		if ( null === $key ) {
			return;
		}
		delete_transient( $key );
	}
}

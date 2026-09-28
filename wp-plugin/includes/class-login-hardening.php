<?php
/**
 * Brute-force login lockout and headless wp-admin role guard.
 *
 * Two Hatch-specific protections for a headless setup:
 *
 *   1. Headless role guard - kick non-editor/admin roles OUT of wp-admin.
 *      In a headless setup there is no public-facing theme, so subscribers
 *      / WooCommerce customers / membership users have no business being
 *      inside wp-admin. They are logged out and sent to the home page.
 *
 *   2. Brute-force IP lockout - transient-based counter on wp_login_failed.
 *      Generic "too many attempts" message, never reveals counter state.
 *
 * Hatch does not move or hide the login URL. wp-login.php stays where
 * WordPress puts it.
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
	 * Wire hooks.
	 */
	private function __construct() {
		add_filter( 'authenticate', array( $this, 'check_brute_force_lockout' ), 30, 1 );
		add_action( 'wp_login_failed', array( $this, 'record_failed_login' ) );
		add_action( 'wp_login', array( $this, 'reset_lockout' ), 10, 2 );

		add_action( 'admin_init', array( $this, 'enforce_role_guard' ), 1 );
	}

	/* ----------------------------------------------------------------
	 * SECTION 1: Headless Role Guard
	 * ---------------------------------------------------------------- */

	/**
	 * If a logged-in user lacks an "allowed" role, kick them out of wp-admin.
	 *
	 * In a headless setup, there's no public frontend on the CMS domain - so
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

		$allowed    = $this->get_allowed_admin_roles();
		$user_roles = (array) $user->roles;

		if ( array_intersect( $allowed, $user_roles ) ) {
			return; // user has at least one allowed role.
		}

		// Block - log out and send the user to the home page.
		wp_logout();
		wp_safe_redirect( home_url( '/' ) );
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
		// Always allow administrator - safety net against locking yourself out.
		if ( ! in_array( 'administrator', $roles, true ) ) {
			$roles[] = 'administrator';
		}
		return array_values( array_unique( array_map( 'sanitize_key', $roles ) ) );
	}

	/* ----------------------------------------------------------------
	 * SECTION 2: Brute-Force IP Lockout
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
	 * (no X-Forwarded-For trust - spoofable without a proxy whitelist).
	 *
	 * @return string|null Null if no usable IP.
	 */
	private function get_lockout_key(): ?string {
		$ip = trim( Hatch_Request::server( 'REMOTE_ADDR' ) );
		if ( '' === $ip || ! filter_var( $ip, FILTER_VALIDATE_IP ) ) {
			return null;
		}
		return self::LOCKOUT_PREFIX . substr( hash( 'sha256', $ip ), 0, 32 );
	}

	/**
	 * Pre-auth filter - reject if IP is locked out.
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
				esc_html__( 'Too many failed login attempts. Try again later.', 'hatch-bridge' )
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

<?php
/**
 * Application Password Helper — generates Application Passwords programmatically.
 *
 * WordPress core has `WP_Application_Passwords::create_new_application_password()`
 * since 5.6 — we wrap it with capability checks, audit log, and a clean REST
 * endpoint usable from the admin Connector tab.
 *
 * Result is shown ONCE in plaintext (Application Password format: "xxxx xxxx xxxx xxxx xxxx xxxx").
 * After that, only the hash is stored — same model as WP core.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_App_Password_Helper
 */
class Hatch_App_Password_Helper {

	/**
	 * @var Hatch_App_Password_Helper|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_App_Password_Helper
	 */
	public static function instance(): Hatch_App_Password_Helper {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire hooks.
	 */
	private function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		add_action( 'admin_post_hatch_generate_app_password', array( $this, 'handle_admin_post' ) );
	}

	/**
	 * Register REST route POST /hatch/v1/app-password.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/app-password',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_generate' ),
				'permission_callback' => array( $this, 'can_generate' ),
				'args'                => array(
					'name' => array(
						'required'          => false,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
	}

	/**
	 * Permission — requires manage_options.
	 *
	 * @return bool
	 */
	public function can_generate(): bool {
		return current_user_can( 'manage_options' ) && function_exists( 'wp_is_application_passwords_available' ) && wp_is_application_passwords_available();
	}

	/**
	 * REST callback.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function route_generate( WP_REST_Request $request ) {
		$name = (string) $request->get_param( 'name' );
		if ( '' === $name ) {
			$name = sprintf( 'Hatch Frontend (%s)', gmdate( 'Y-m-d H:i' ) );
		}
		return $this->generate_response( $name );
	}

	/**
	 * Generate an App Password for the current admin user.
	 *
	 * @param string $name Friendly name shown in Users → Profile.
	 * @return WP_REST_Response|WP_Error
	 */
	private function generate_response( string $name ) {
		if ( ! class_exists( 'WP_Application_Passwords' ) ) {
			return new WP_Error( 'hatch_app_pw_unavailable', __( 'Application Passwords are not available on this WordPress.', 'hatch' ), array( 'status' => 501 ) );
		}
		$user_id = get_current_user_id();
		if ( ! $user_id ) {
			return new WP_Error( 'hatch_no_user', __( 'No current user.', 'hatch' ), array( 'status' => 401 ) );
		}

		$created = WP_Application_Passwords::create_new_application_password( $user_id, array( 'name' => $name ) );
		if ( is_wp_error( $created ) ) {
			return $created;
		}
		list( $unhashed_password, $item ) = $created;

		$user = get_userdata( $user_id );

		return new WP_REST_Response(
			array(
				'success'       => true,
				'name'          => isset( $item['name'] ) ? sanitize_text_field( (string) $item['name'] ) : $name,
				'username'      => $user ? $user->user_login : '',
				'password'      => $unhashed_password, // plaintext — show ONCE.
				'uuid'          => isset( $item['uuid'] ) ? (string) $item['uuid'] : '',
				'created_at'    => isset( $item['created'] ) ? (int) $item['created'] : time(),
				'authorization' => 'Basic ' . base64_encode( ( $user ? $user->user_login : '' ) . ':' . $unhashed_password ),
			),
			201
		);
	}

	/**
	 * admin-post handler — used by the Connector tab "Generate" button.
	 *
	 * @return void
	 */
	public function handle_admin_post(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'hatch_generate_app_password' );

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- nonce checked above.
		$raw_name = isset( $_POST['hatch_app_pw_name'] ) ? wp_unslash( (string) $_POST['hatch_app_pw_name'] ) : '';
		$name     = sanitize_text_field( $raw_name );
		if ( '' === $name ) {
			$name = sprintf( 'Hatch Frontend (%s)', gmdate( 'Y-m-d H:i' ) );
		}

		$result = $this->generate_response( $name );
		if ( is_wp_error( $result ) ) {
			$target = admin_url( 'tools.php?page=hatch&tab=connector&hatch_app_pw_error=' . rawurlencode( $result->get_error_code() ) );
			wp_safe_redirect( $target );
			exit;
		}

		$data = $result->get_data();
		// Stash plaintext in a transient keyed to user for ONE display (5 min TTL).
		set_transient(
			'hatch_app_pw_show_' . get_current_user_id(),
			array(
				'password' => $data['password'],
				'username' => $data['username'],
				'name'     => $data['name'],
			),
			5 * MINUTE_IN_SECONDS
		);

		wp_safe_redirect( admin_url( 'tools.php?page=hatch&tab=connector&hatch_app_pw=fresh' ) );
		exit;
	}

	/**
	 * Programmatically generate an App Password for the current user and stash
	 * the plaintext in the same transient that `pop_fresh_password()` reads.
	 *
	 * Used by the setup wizard so step 4 can show a real, just-generated
	 * password instead of "(generate from your profile)" placeholder text.
	 *
	 * Returns true on success, false on failure (no capability, WP < 5.6, etc.).
	 *
	 * @param string $name Friendly name shown under Users → Profile → Application Passwords.
	 * @return bool
	 */
	public static function generate_and_stash( string $name = 'Hatch (Setup Wizard)' ): bool {
		if ( ! class_exists( 'WP_Application_Passwords' ) ) {
			return false;
		}
		$user_id = get_current_user_id();
		if ( ! $user_id || ! current_user_can( 'manage_options' ) ) {
			return false;
		}

		// Idempotency — if a fresh password is already waiting, reuse it.
		$key      = 'hatch_app_pw_show_' . $user_id;
		$existing = get_transient( $key );
		if ( is_array( $existing ) && ! empty( $existing['password'] ) ) {
			return true;
		}

		$created = WP_Application_Passwords::create_new_application_password( $user_id, array( 'name' => $name ) );
		if ( is_wp_error( $created ) || ! is_array( $created ) || ! isset( $created[0] ) ) {
			return false;
		}
		list( $unhashed_password, $item ) = $created;

		$user = get_userdata( $user_id );
		set_transient(
			$key,
			array(
				'password' => (string) $unhashed_password,
				'username' => $user ? $user->user_login : '',
				'name'     => isset( $item['name'] ) ? sanitize_text_field( (string) $item['name'] ) : $name,
			),
			5 * MINUTE_IN_SECONDS
		);
		return true;
	}

	/**
	 * Pop the one-time plaintext for display in the Connector tab.
	 *
	 * @return array|null  ['password','username','name'] or null.
	 */
	public static function pop_fresh_password(): ?array {
		$key  = 'hatch_app_pw_show_' . get_current_user_id();
		$data = get_transient( $key );
		if ( ! $data || ! is_array( $data ) ) {
			return null;
		}
		delete_transient( $key );
		return $data;
	}
}

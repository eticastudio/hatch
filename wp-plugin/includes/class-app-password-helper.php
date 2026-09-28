<?php
/**
 * Application Password Helper - generates Application Passwords programmatically.
 *
 * WordPress core has `WP_Application_Passwords::create_new_application_password()`
 * since 5.6 - we wrap it with capability checks, audit log, and a clean REST
 * endpoint usable from the admin Connector tab.
 *
 * Result is shown ONCE in plaintext (Application Password format: "xxxx xxxx xxxx xxxx xxxx xxxx").
 * After that, only the hash is stored - same model as WP core.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_App_Password_Helper
 */
class Hatch_App_Password_Helper {

	/**
	 * Role given to the account the deployed frontend reads WordPress as.
	 */
	const READER_ROLE = 'hatch_reader';

	/**
	 * Preferred user name of that account. A numeric suffix is added when a
	 * different user already owns the name.
	 */
	const READER_LOGIN = 'hatch-reader';

	/**
	 * Option holding the id of the account Hatch created.
	 */
	const OPT_READER_USER = 'hatch_reader_user_id';

	/**
	 * User meta marking an account as created by Hatch, so it is the only kind
	 * Hatch ever deletes.
	 */
	const META_READER = 'hatch_reader_account';

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
	 * Permission - requires manage_options.
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
			return new WP_Error( 'hatch_app_pw_unavailable', __( 'Application Passwords are not available on this WordPress.', 'hatch-bridge' ), array( 'status' => 501 ) );
		}
		$user_id = get_current_user_id();
		if ( ! $user_id ) {
			return new WP_Error( 'hatch_no_user', __( 'No current user.', 'hatch-bridge' ), array( 'status' => 401 ) );
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
				'password'      => $unhashed_password, // plaintext - show ONCE.
				'uuid'          => isset( $item['uuid'] ) ? (string) $item['uuid'] : '',
				'created_at'    => isset( $item['created'] ) ? (int) $item['created'] : time(),
				// phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- HTTP Basic auth header format (RFC 7617), not obfuscation.
				'authorization' => 'Basic ' . base64_encode( ( $user ? $user->user_login : '' ) . ':' . $unhashed_password ),
			),
			201
		);
	}

	/**
	 * Capabilities of the Hatch Reader role.
	 *
	 * The deployed frontend only ever sends GET requests, and in the default
	 * "view" context. Every route it calls is either public (permission callback
	 * returns true) or asks only that the caller is logged in (redirects,
	 * seo-head, schema, info, membership check), which the core "read" capability
	 * satisfies. The content routes return published posts only. Nothing the
	 * frontend calls needs edit_posts, read_private_posts or any admin capability,
	 * so "read" is the whole list.
	 *
	 * Known limit: the block tree route in "edit" context (drafts, private posts,
	 * previews) needs edit_post on that post and answers 403 for this role. The
	 * bundled frontend never requests it.
	 *
	 * @return array<string,bool>
	 */
	public static function reader_role_caps(): array {
		return array( 'read' => true );
	}

	/**
	 * Compare a role's current capabilities with the wanted set.
	 *
	 * @param array<string,bool> $current Capabilities the stored role has.
	 * @param array<string,bool> $wanted  Capabilities the role must have.
	 * @return array{add:array<int,string>,remove:array<int,string>} Capability names to grant and to take away.
	 */
	public static function reader_caps_drift( array $current, array $wanted ): array {
		$have = array_keys( array_filter( $current ) );
		$want = array_keys( array_filter( $wanted ) );
		return array(
			'add'    => array_values( array_diff( $want, $have ) ),
			'remove' => array_values( array_diff( $have, $want ) ),
		);
	}

	/**
	 * First user name from hatch-reader, hatch-reader-2, hatch-reader-3 ... that is free.
	 *
	 * @param callable $is_taken Receives a login, returns true when a user already owns it.
	 * @return string
	 */
	public static function pick_reader_login( callable $is_taken ): string {
		$login = self::READER_LOGIN;
		$n     = 2;
		$taken = $is_taken( $login );
		while ( $n < 100 && $taken ) {
			$login = self::READER_LOGIN . '-' . $n;
			$taken = $is_taken( $login );
			++$n;
		}
		return $login;
	}

	/**
	 * Create the Hatch Reader role, or bring an existing one back to the wanted capabilities.
	 *
	 * @return void
	 */
	public static function ensure_reader_role(): void {
		$wanted = self::reader_role_caps();
		$role   = get_role( self::READER_ROLE );
		if ( ! $role instanceof WP_Role ) {
			add_role( self::READER_ROLE, __( 'Hatch Reader', 'hatch-bridge' ), $wanted );
			return;
		}
		$drift = self::reader_caps_drift( (array) $role->capabilities, $wanted );
		foreach ( $drift['remove'] as $cap ) {
			$role->remove_cap( $cap );
		}
		foreach ( $drift['add'] as $cap ) {
			$role->add_cap( $cap );
		}
	}

	/**
	 * The Hatch Reader account Hatch created earlier, or null.
	 *
	 * Only an account carrying the Hatch marker counts, so a user somebody else
	 * made with the same name or id is never adopted.
	 *
	 * @return WP_User|null
	 */
	public static function get_reader_user(): ?WP_User {
		$user_id = (int) get_option( self::OPT_READER_USER, 0 );
		if ( $user_id < 1 ) {
			return null;
		}
		$user = get_userdata( $user_id );
		if ( ! $user instanceof WP_User || '1' !== (string) get_user_meta( $user_id, self::META_READER, true ) ) {
			return null;
		}
		return $user;
	}

	/**
	 * User name of the account the next deploy will use, for the disclosure text.
	 *
	 * @return string
	 */
	public static function reader_login_preview(): string {
		$existing = self::get_reader_user();
		if ( $existing instanceof WP_User ) {
			return $existing->user_login;
		}
		return self::pick_reader_login(
			static function ( string $login ): bool {
				return false !== username_exists( $login );
			}
		);
	}

	/**
	 * Create the read-only account once, and reuse it on every later deploy.
	 *
	 * The account gets a random password that nobody is told and no email
	 * address, so it cannot be logged into or reset. The only way in is the
	 * application password issued for it. If somebody widened its roles, they
	 * are set back to the Hatch Reader role.
	 *
	 * @return WP_User|WP_Error
	 */
	public static function ensure_reader_user() {
		self::ensure_reader_role();

		$user = self::get_reader_user();
		if ( $user instanceof WP_User ) {
			if ( array( self::READER_ROLE ) !== array_values( (array) $user->roles ) ) {
				$user->set_role( self::READER_ROLE );
			}
			return $user;
		}

		$login   = self::reader_login_preview();
		$user_id = wp_insert_user(
			array(
				'user_login'           => $login,
				'user_pass'            => wp_generate_password( 64, true, true ),
				'role'                 => self::READER_ROLE,
				'display_name'         => __( 'Hatch Reader', 'hatch-bridge' ),
				'description'          => __( 'Read-only account used by the Hatch frontend to read this site. Created by the Hatch plugin.', 'hatch-bridge' ),
				'show_admin_bar_front' => 'false',
			)
		);
		if ( is_wp_error( $user_id ) ) {
			return new WP_Error(
				'hatch_reader_create_failed',
				sprintf(
					/* translators: %s: error message from WordPress. */
					__( 'Could not create the read-only Hatch Reader user: %s', 'hatch-bridge' ),
					wp_strip_all_tags( $user_id->get_error_message() )
				),
				array( 'status' => 500 )
			);
		}
		update_user_meta( (int) $user_id, self::META_READER, '1' );
		update_option( self::OPT_READER_USER, (int) $user_id, false );

		$created = get_userdata( (int) $user_id );
		if ( ! $created instanceof WP_User ) {
			return new WP_Error( 'hatch_reader_create_failed', __( 'Could not load the read-only Hatch Reader user after creating it.', 'hatch-bridge' ), array( 'status' => 500 ) );
		}
		return $created;
	}

	/**
	 * Revoke everything the deployed frontend was given, and remove the account.
	 *
	 * Deletes all application passwords of the Hatch Reader account, deletes the
	 * account only when Hatch created it, and removes the role when nobody holds
	 * it any more. Nothing is reassigned: the role cannot author content.
	 *
	 * @return array{passwords_revoked:bool,user_deleted:bool,role_removed:bool}
	 */
	public static function revoke_reader_access(): array {
		$out  = array(
			'passwords_revoked' => false,
			'user_deleted'      => false,
			'role_removed'      => false,
		);
		$user = self::get_reader_user();
		if ( $user instanceof WP_User ) {
			if ( class_exists( 'WP_Application_Passwords' ) ) {
				WP_Application_Passwords::delete_all_application_passwords( $user->ID );
				$out['passwords_revoked'] = true;
			}
			if ( is_multisite() ) {
				require_once ABSPATH . 'wp-admin/includes/ms.php';
				$out['user_deleted'] = (bool) wpmu_delete_user( $user->ID );
			} else {
				require_once ABSPATH . 'wp-admin/includes/user.php';
				$out['user_deleted'] = (bool) wp_delete_user( $user->ID );
			}
		}
		delete_option( self::OPT_READER_USER );

		$holders = get_users(
			array(
				'role'   => self::READER_ROLE,
				'number' => 1,
				'fields' => 'ID',
			)
		);
		if ( array() === $holders && get_role( self::READER_ROLE ) instanceof WP_Role ) {
			remove_role( self::READER_ROLE );
			$out['role_removed'] = true;
		}
		return $out;
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

		// Idempotency - if a fresh password is already waiting, reuse it.
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

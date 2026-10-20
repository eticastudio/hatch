<?php
/**
 * The WordPress credential the deployed frontend reads this site with.
 *
 * Hatch never creates users and never creates application passwords. The
 * administrator makes a low-privilege account and one application password for
 * it with WordPress's own screens, then gives Hatch the user name and the
 * password. This class checks them, keeps the password encrypted (through
 * Hatch_Credential_Store, autoload off) and forgets it on request.
 *
 * Nothing here logs in as the account or asks WordPress to verify the password:
 * the first request the Worker makes does that. What is checked up front is the
 * shape of the password and, more importantly, what the account is allowed to
 * do. An account that can edit other people's posts, manage users, plugins or
 * the site is refused (FORBIDDEN_CAPS), and the same rule is applied again on
 * every application-password sign-in, so promoting the account later stops the
 * frontend instead of handing it more power.
 *
 * @package Hatch
 * @since   1.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Wp_Credential.
 */
final class Hatch_Wp_Credential {

	/**
	 * Provider id used with Hatch_Credential_Store (so the password is stored encrypted).
	 */
	const STORE_ID = 'wpfrontend';

	/**
	 * Option holding the user name the saved password belongs to.
	 */
	const OPT_USER = 'hatch_wp_frontend_user';

	/**
	 * Capabilities no frontend account may have.
	 */
	const FORBIDDEN_CAPS = array(
		'manage_options',
		'edit_others_posts',
		'unfiltered_html',
		'list_users',
		'create_users',
		'edit_users',
		'promote_users',
		'delete_users',
		'install_plugins',
		'activate_plugins',
		'edit_theme_options',
	);

	/**
	 * Strip every kind of whitespace from a typed application password.
	 *
	 * WordPress shows the password in groups of four separated by spaces; both
	 * forms work in WordPress, so the spaces are not part of the secret.
	 *
	 * @param string $password Password as typed or pasted.
	 * @return string
	 */
	public static function normalize_password( string $password ): string {
		return (string) preg_replace( '/\s+/u', '', $password );
	}

	/**
	 * Whether a string looks like a core application password: 24 letters and digits.
	 *
	 * @param string $password Password with whitespace already removed.
	 * @return bool
	 */
	public static function looks_like_app_password( string $password ): bool {
		return 1 === preg_match( '/^[A-Za-z0-9]{24}$/', $password );
	}

	/**
	 * Whether a set of capabilities is too powerful for the frontend account.
	 *
	 * @param callable $can Receives a capability name, returns true when the account has it.
	 * @return string The first forbidden capability the account has, or "".
	 */
	public static function forbidden_capability( callable $can ): string {
		foreach ( self::FORBIDDEN_CAPS as $cap ) {
			if ( $can( $cap ) ) {
				return $cap;
			}
		}
		return '';
	}

	/**
	 * Refuse application-password sign-ins for the saved frontend account once it
	 * holds a forbidden capability (for example after someone promotes it).
	 *
	 * Hooked to core's `wp_authenticate_application_password_errors` action.
	 *
	 * @param WP_Error $error    Errors core collects for this sign-in.
	 * @param WP_User  $user     User signing in.
	 * @return void
	 */
	public static function refuse_if_promoted( $error, $user ): void {
		if ( ! $error instanceof WP_Error || ! $user instanceof WP_User ) {
			return;
		}
		$login = (string) get_option( self::OPT_USER, '' );
		if ( '' === $login || $login !== $user->user_login ) {
			return;
		}
		$cap = self::forbidden_capability(
			static function ( string $capability ) use ( $user ): bool {
				return user_can( $user, $capability );
			}
		);
		if ( '' !== $cap ) {
			$error->add(
				'hatch_frontend_account_privileged',
				__( 'This account is the Hatch frontend account and can now edit or manage the site, so its application passwords are refused. Give it the Subscriber role again, or enter a different account in Hatch.', 'hatch-connect' )
			);
		}
	}

	/**
	 * Check the account alone (used on redeploy, where the password is already saved).
	 *
	 * @param string $login User name.
	 * @return WP_User|WP_Error
	 */
	public static function check_account( string $login ) {
		$login = sanitize_user( $login, true );
		if ( '' === $login ) {
			return new WP_Error( 'hatch_deploy_no_wp_credential', __( 'Enter the user name of the WordPress account the frontend should read your site as.', 'hatch-connect' ), array( 'status' => 400 ) );
		}
		$user = get_user_by( 'login', $login );
		if ( ! $user instanceof WP_User ) {
			return new WP_Error(
				'hatch_deploy_wp_credential_invalid',
				__( 'There is no WordPress user with that name. Create a Subscriber account under Users, Add New, then try again.', 'hatch-connect' ),
				array( 'status' => 400 )
			);
		}
		$cap = self::forbidden_capability(
			static function ( string $capability ) use ( $user ): bool {
				return user_can( $user, $capability );
			}
		);
		if ( '' !== $cap ) {
			return new WP_Error(
				'hatch_deploy_wp_credential_privileged',
				__( 'That account can edit or manage this site. The frontend only needs to read, so Hatch will not use it. Create a separate account with the Subscriber role under Users, Add New, and give Hatch an application password for that account instead.', 'hatch-connect' ),
				array( 'status' => 400 )
			);
		}
		if ( function_exists( 'wp_is_application_passwords_available_for_user' ) && ! wp_is_application_passwords_available_for_user( $user ) ) {
			return new WP_Error(
				'hatch_deploy_no_app_password',
				__( 'WordPress application passwords are turned off for that account or for this site (they need https). Turn them on, then try again.', 'hatch-connect' ),
				array( 'status' => 400 )
			);
		}
		return $user;
	}

	/**
	 * Validate a typed user name and application password.
	 *
	 * @param string $login    User name.
	 * @param string $password Application password, with or without spaces.
	 * @return array{login:string,password:string}|WP_Error The cleaned pair, or the reason it was refused.
	 */
	public static function validate( string $login, string $password ) {
		$password = self::normalize_password( $password );
		if ( '' === sanitize_user( $login, true ) || '' === $password ) {
			return new WP_Error( 'hatch_deploy_no_wp_credential', __( 'Enter the WordPress user name and the application password the frontend should use.', 'hatch-connect' ), array( 'status' => 400 ) );
		}
		if ( ! self::looks_like_app_password( $password ) ) {
			return new WP_Error(
				'hatch_deploy_wp_credential_invalid',
				__( 'That does not look like an application password. It is 24 letters and numbers, shown in groups of four, and it is not the account password. Create one under Users, Profile, Application Passwords.', 'hatch-connect' ),
				array( 'status' => 400 )
			);
		}
		$user = self::check_account( $login );
		if ( is_wp_error( $user ) ) {
			return $user;
		}
		return array(
			'login'    => $user->user_login,
			'password' => $password,
		);
	}

	/**
	 * Keep the credential: password encrypted, user name in an option that is not autoloaded.
	 *
	 * @param string $login    Validated user name.
	 * @param string $password Validated application password.
	 * @return bool
	 */
	public static function save( string $login, string $password ): bool {
		if ( ! Hatch_Credential_Store::store( self::STORE_ID, $password ) ) {
			return false;
		}
		update_option( self::OPT_USER, $login, false );
		return true;
	}

	/**
	 * The saved credential, or null when none is usable.
	 *
	 * @return array{login:string,password:string}|null
	 */
	public static function get(): ?array {
		$login    = (string) get_option( self::OPT_USER, '' );
		$password = Hatch_Credential_Store::retrieve( self::STORE_ID );
		if ( '' === $login || '' === $password ) {
			return null;
		}
		return array(
			'login'    => $login,
			'password' => $password,
		);
	}

	/**
	 * What the admin screens may show about the saved credential: never the password itself.
	 *
	 * @return array{saved:bool,user:string,hint:string}
	 */
	public static function summary(): array {
		$saved = self::get();
		if ( null === $saved ) {
			return array(
				'saved' => false,
				'user'  => '',
				'hint'  => '',
			);
		}
		return array(
			'saved' => true,
			'user'  => $saved['login'],
			'hint'  => '••••' . substr( $saved['password'], -3 ),
		);
	}

	/**
	 * Forget the saved credential. The application password itself stays in the
	 * user's profile until the administrator revokes it there.
	 *
	 * @return void
	 */
	public static function clear(): void {
		Hatch_Credential_Store::clear( self::STORE_ID );
		delete_option( self::OPT_USER );
	}
}

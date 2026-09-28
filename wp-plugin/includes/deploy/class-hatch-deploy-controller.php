<?php
/**
 * Deploy controller: the admin-post handler and the REST routes the admin
 * screens use to publish the frontend.
 *
 * Every entry point requires the manage_options capability and a valid nonce
 * (admin-post: form nonce; REST: the cookie nonce WordPress checks itself).
 * The API token is used for the request, optionally stored encrypted by
 * Hatch_Credential_Store, and is never returned, logged or put in a URL.
 *
 * A deploy changes the site in ways the administrator must agree to first: it
 * switches to the companion theme, creates a read-only Hatch Reader user with an
 * application password for the frontend, and, only when asked, rewrites plain
 * permalinks. The run route refuses to start without consent=true, and rewrites
 * permalinks only with allow_permalinks=true. The disconnect route undoes the
 * access grant and puts the previous theme back.
 *
 * @package Hatch
 * @since   1.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Deploy controller.
 */
final class Hatch_Deploy_Controller {

	const LOCK_TRANSIENT     = 'hatch_deploy_lock';
	const THROTTLE_TRANSIENT = 'hatch_deploy_throttle_';
	const OPTION_LAST        = 'hatch_deploy_last';
	const APP_PASSWORD_NAME  = 'Hatch (Cloudflare deploy)';
	const REST_NAMESPACE     = 'hatch/v1';

	/**
	 * Registered providers, keyed by id.
	 *
	 * @var array<string,Hatch_Deploy_Provider>|null
	 */
	private static $providers = null;

	/**
	 * Attach hooks.
	 *
	 * @return void
	 */
	public static function boot(): void {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Deploy providers. Version 1 ships Cloudflare; others register through the filter.
	 *
	 * @return array<string,Hatch_Deploy_Provider>
	 */
	public static function providers(): array {
		if ( null !== self::$providers ) {
			return self::$providers;
		}
		$list = array( new Hatch_Cloudflare_Provider() );
		/**
		 * Filters the deploy providers.
		 *
		 * @param array<int,Hatch_Deploy_Provider> $list Provider instances.
		 */
		$list = (array) apply_filters( 'hatch_deploy_providers', $list );

		self::$providers = array();
		foreach ( $list as $provider ) {
			if ( $provider instanceof Hatch_Deploy_Provider && 1 === preg_match( '/^[a-z0-9]+$/', $provider->get_id() ) ) {
				self::$providers[ $provider->get_id() ] = $provider;
			}
		}
		return self::$providers;
	}

	/**
	 * Look one provider up.
	 *
	 * @param string $id Provider id.
	 * @return Hatch_Deploy_Provider|null
	 */
	public static function provider( string $id ): ?Hatch_Deploy_Provider {
		$all = self::providers();
		return $all[ $id ] ?? null;
	}

	/**
	 * Permission callback for every deploy REST route.
	 *
	 * @return bool
	 */
	public static function can_manage(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Register the REST routes.
	 *
	 * @return void
	 */
	public static function register_routes(): void {
		$provider_arg = array(
			'provider' => array(
				'type'              => 'string',
				'required'          => true,
				'sanitize_callback' => 'sanitize_key',
				'validate_callback' => array( __CLASS__, 'validate_provider_arg' ),
			),
		);
		$body_args    = array(
			'token'            => array(
				'type'              => 'string',
				'required'          => false,
				'sanitize_callback' => array( __CLASS__, 'sanitize_token' ),
			),
			'save_token'       => array(
				'type'     => 'boolean',
				'required' => false,
				'default'  => false,
			),
			'mount_mode'       => array(
				'type'              => 'string',
				'required'          => false,
				'default'           => 'root',
				'enum'              => array( 'root', 'subfolder' ),
				'sanitize_callback' => 'sanitize_key',
			),
			'subpath'          => array(
				'type'              => 'string',
				'required'          => false,
				'default'           => '/blog',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'domain'           => array(
				'type'              => 'string',
				'required'          => false,
				'default'           => '',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'account_id'       => array(
				'type'              => 'string',
				'required'          => false,
				'default'           => '',
				'sanitize_callback' => 'sanitize_key',
			),
			'consent'          => array(
				'type'              => 'boolean',
				'required'          => false,
				'default'           => false,
				'sanitize_callback' => 'rest_sanitize_boolean',
			),
			'allow_permalinks' => array(
				'type'              => 'boolean',
				'required'          => false,
				'default'           => false,
				'sanitize_callback' => 'rest_sanitize_boolean',
			),
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/deploy/providers',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'route_providers' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/deploy/(?P<provider>[a-z0-9]+)/verify',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'route_verify' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
				'args'                => array_merge( $provider_arg, array( 'token' => $body_args['token'] ) ),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/deploy/(?P<provider>[a-z0-9]+)/zones',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'route_zones' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
				'args'                => array_merge( $provider_arg, array( 'token' => $body_args['token'] ) ),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/deploy/(?P<provider>[a-z0-9]+)/run',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'route_run' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
				'args'                => array_merge( $provider_arg, $body_args ),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/deploy/(?P<provider>[a-z0-9]+)/token',
			array(
				'methods'             => WP_REST_Server::DELETABLE,
				'callback'            => array( __CLASS__, 'route_forget_token' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
				'args'                => $provider_arg,
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/deploy/disconnect',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'route_disconnect' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/deploy/status',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'route_status' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
			)
		);
	}

	/**
	 * Route argument validator: the provider must exist.
	 *
	 * @param mixed $value Raw value.
	 * @return bool
	 */
	public static function validate_provider_arg( $value ): bool {
		return is_string( $value ) && null !== self::provider( sanitize_key( $value ) );
	}

	/**
	 * Trim a pasted token and cap its length. A token with a trailing newline
	 * or space is accepted. The shape check happens in resolve_token() so a
	 * malformed paste gets its own message instead of "paste a token".
	 *
	 * @param mixed $value Raw value.
	 * @return string Trimmed value, at most 500 characters.
	 */
	public static function sanitize_token( $value ): string {
		return is_string( $value ) ? substr( trim( $value ), 0, 500 ) : '';
	}

	/**
	 * Whether a value has the shape of an API token: 20 to 200 characters of
	 * letters, digits, dot, dash and underscore. Keeps the value safe to use
	 * in an Authorization header.
	 *
	 * @param string $token Trimmed token.
	 * @return bool
	 */
	public static function looks_like_token( string $token ): bool {
		return 1 === preg_match( '/^[A-Za-z0-9_.\-]{20,200}$/', $token );
	}

	/**
	 * GET /deploy/providers.
	 *
	 * @return WP_REST_Response
	 */
	public static function route_providers(): WP_REST_Response {
		$out = array();
		foreach ( self::providers() as $id => $provider ) {
			$out[] = array(
				'id'          => $id,
				'label'       => $provider->get_label(),
				'has_token'   => Hatch_Credential_Store::has( $id ),
				'permissions' => $provider->get_required_permissions(),
			);
		}
		return new WP_REST_Response( array( 'providers' => $out ) );
	}

	/**
	 * POST /deploy/{provider}/verify.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function route_verify( WP_REST_Request $request ) {
		$provider = self::provider( (string) $request['provider'] );
		$throttle = self::throttle();
		if ( is_wp_error( $throttle ) ) {
			return $throttle;
		}
		$token = self::resolve_token( $provider, (string) $request->get_param( 'token' ) );
		if ( is_wp_error( $token ) ) {
			return $token;
		}
		$result = $provider->verify_token( $token );
		if ( is_wp_error( $result ) ) {
			return self::rest_error( $result );
		}
		return new WP_REST_Response( $result );
	}

	/**
	 * POST /deploy/{provider}/zones.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function route_zones( WP_REST_Request $request ) {
		$provider = self::provider( (string) $request['provider'] );
		if ( ! $provider instanceof Hatch_Cloudflare_Provider ) {
			return new WP_Error( 'hatch_deploy_no_zones', __( 'This provider does not list domains.', 'hatch-bridge' ), array( 'status' => 404 ) );
		}
		$throttle = self::throttle();
		if ( is_wp_error( $throttle ) ) {
			return $throttle;
		}
		$token = self::resolve_token( $provider, (string) $request->get_param( 'token' ) );
		if ( is_wp_error( $token ) ) {
			return $token;
		}
		$zones = $provider->list_zones( $token );
		if ( is_wp_error( $zones ) ) {
			return self::rest_error( $zones );
		}
		return new WP_REST_Response( array( 'zones' => $zones ) );
	}

	/**
	 * POST /deploy/{provider}/run.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function route_run( WP_REST_Request $request ) {
		if ( true !== rest_sanitize_boolean( $request->get_param( 'consent' ) ) ) {
			return new WP_Error(
				'hatch_deploy_consent_required',
				__( 'Confirm the changes a deploy makes to this site before deploying. Nothing was changed.', 'hatch-bridge' ),
				array( 'status' => 400 )
			);
		}
		$provider = self::provider( (string) $request['provider'] );
		$token    = self::resolve_token( $provider, (string) $request->get_param( 'token' ) );
		if ( is_wp_error( $token ) ) {
			return $token;
		}
		$outcome = self::run(
			$provider,
			$token,
			array(
				'mount_mode'       => (string) $request->get_param( 'mount_mode' ),
				'subpath'          => (string) $request->get_param( 'subpath' ),
				'domain'           => (string) $request->get_param( 'domain' ),
				'account_id'       => (string) $request->get_param( 'account_id' ),
				'allow_permalinks' => (bool) $request->get_param( 'allow_permalinks' ),
			),
			(bool) $request->get_param( 'save_token' )
		);
		if ( is_wp_error( $outcome ) ) {
			return self::rest_error( $outcome );
		}
		return new WP_REST_Response( $outcome );
	}

	/**
	 * DELETE /deploy/{provider}/token.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public static function route_forget_token( WP_REST_Request $request ): WP_REST_Response {
		Hatch_Credential_Store::clear( (string) $request['provider'] );
		return new WP_REST_Response( array( 'has_token' => false ) );
	}

	/**
	 * POST /deploy/disconnect.
	 *
	 * Takes back what a deploy handed out: every application password Hatch
	 * issued for the frontend is revoked, the Hatch Reader user is deleted (only
	 * when Hatch created it, nothing is reassigned) together with its role, and
	 * the theme that was active before the deploy is restored. The frontend
	 * deployment at the provider is not touched, it simply loses read access.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public static function route_disconnect() {
		if ( false !== get_transient( self::LOCK_TRANSIENT ) ) {
			return new WP_Error( 'hatch_deploy_busy', __( 'A deploy is already running. Wait for it to finish, then disconnect.', 'hatch-bridge' ), array( 'status' => 409 ) );
		}
		$reader = Hatch_App_Password_Helper::revoke_reader_access();
		self::revoke_admin_deploy_passwords();

		$restored = '';
		if ( class_exists( 'Hatch_Companion_Theme_Installer' ) ) {
			$restored = Hatch_Companion_Theme_Installer::restore_previous_theme();
		}
		delete_option( self::OPTION_LAST );

		return new WP_REST_Response(
			array(
				'code'           => 'disconnected',
				'message'        => __( 'Disconnected. The frontend can no longer read this site and the Hatch Reader user was removed. The frontend itself is still running at your host until you delete it there.', 'hatch-bridge' ),
				'reader'         => $reader,
				'restored_theme' => $restored,
			)
		);
	}

	/**
	 * GET /deploy/status.
	 *
	 * @return WP_REST_Response
	 */
	public static function route_status(): WP_REST_Response {
		$state = get_option( 'hatch_cf_worker_state' );
		$last  = get_option( self::OPTION_LAST );
		if ( is_array( $last ) && ! empty( $last['ok'] ) && ! empty( $last['public_url'] ) ) {
			$last['message'] = self::success_message( (string) $last['public_url'], ! empty( $last['private_wp'] ) );
		}
		return new WP_REST_Response(
			array(
				'deployed'       => is_array( $state ) && ! empty( $state['deployed_at'] ),
				'state'          => is_array( $state ) ? self::public_state( $state ) : null,
				'last'           => is_array( $last ) ? $last : null,
				'has_token'      => Hatch_Credential_Store::has( 'cloudflare' ),
				'model'          => (string) get_option( 'hatch_hosting_model', '' ),
				'reader_user'    => Hatch_App_Password_Helper::reader_login_preview(),
				'reader_exists'  => Hatch_App_Password_Helper::get_reader_user() instanceof WP_User,
				'previous_theme' => (string) get_option( 'hatch_previous_stylesheet', '' ),
			)
		);
	}

	/**
	 * Run a deploy end to end and record the outcome.
	 *
	 * @param Hatch_Deploy_Provider $provider   Provider.
	 * @param string                $token      API token.
	 * @param array<string,mixed>   $options    mount_mode, subpath, domain, account_id, allow_permalinks.
	 * @param bool                  $save_token Whether to keep the token, encrypted, after a successful deploy.
	 * @return array{code:string,message:string,public_url:string,result:array<string,mixed>,warnings:array<int,string>}|WP_Error
	 */
	public static function run( Hatch_Deploy_Provider $provider, string $token, array $options, bool $save_token ) {
		if ( ! current_user_can( 'manage_options' ) ) {
			return new WP_Error( 'hatch_deploy_forbidden', __( 'You do not have permission to deploy the frontend.', 'hatch-bridge' ), array( 'status' => 403 ) );
		}
		if ( false !== get_transient( self::LOCK_TRANSIENT ) ) {
			return new WP_Error( 'hatch_deploy_busy', __( 'A deploy is already running. Wait for it to finish, then check the Connection tab.', 'hatch-bridge' ), array( 'status' => 409 ) );
		}
		set_transient( self::LOCK_TRANSIENT, time(), 5 * MINUTE_IN_SECONDS );

		$outcome = self::run_locked( $provider, $token, $options, $save_token );
		delete_transient( self::LOCK_TRANSIENT );

		if ( is_wp_error( $outcome ) ) {
			$data = (array) $outcome->get_error_data();
			update_option(
				self::OPTION_LAST,
				array(
					'ok'       => false,
					'provider' => $provider->get_id(),
					'code'     => $outcome->get_error_code(),
					'stage'    => isset( $data['stage'] ) ? sanitize_key( (string) $data['stage'] ) : '',
					'message'  => $outcome->get_error_message(),
					'at'       => time(),
				),
				false
			);
		}
		return $outcome;
	}

	/**
	 * Body of run(), executed while the deploy lock is held.
	 *
	 * @param Hatch_Deploy_Provider $provider   Provider.
	 * @param string                $token      API token.
	 * @param array<string,mixed>   $options    Deploy options.
	 * @param bool                  $save_token Keep the token after success.
	 * @return array{code:string,message:string,public_url:string,result:array<string,mixed>,warnings:array<int,string>}|WP_Error
	 */
	private static function run_locked( Hatch_Deploy_Provider $provider, string $token, array $options, bool $save_token ) {
		if ( function_exists( 'set_time_limit' ) ) {
			set_time_limit( 300 ); // phpcs:ignore Squiz.PHP.DiscouragedFunctions.Discouraged -- A deploy uploads a few MB and can outlast the default limit.
		}

		$password = self::create_app_password();
		if ( is_wp_error( $password ) ) {
			return $password;
		}

		$public_wp = trim( (string) get_option( 'hatch_wp_public_url', '' ) );
		$wp_url    = untrailingslashit( '' !== $public_wp ? esc_url_raw( $public_wp ) : home_url() );
		$secret    = (string) get_option( 'hatch_webhook_secret', '' );
		if ( '' === $secret ) {
			$secret = wp_generate_password( 48, false );
			update_option( 'hatch_webhook_secret', $secret, false );
		}
		$reader = $password['user'];

		$result = $provider->deploy(
			$token,
			array(
				'mount_mode'     => isset( $options['mount_mode'] ) ? $options['mount_mode'] : 'root',
				'subpath'        => isset( $options['subpath'] ) ? $options['subpath'] : '/blog',
				'domain'         => isset( $options['domain'] ) ? $options['domain'] : '',
				'account_id'     => isset( $options['account_id'] ) ? $options['account_id'] : '',
				'wp_url'         => $wp_url,
				'wp_user'        => $reader->user_login,
				'wp_pass'        => $password['password'],
				'webhook_secret' => $secret,
			)
		);

		if ( is_wp_error( $result ) ) {
			// The new application password was never handed to a running frontend, so remove it.
			self::delete_app_password( $reader->ID, $password['uuid'] );
			return $result;
		}

		self::revoke_older_app_passwords( $reader->ID, $password['uuid'] );
		self::revoke_admin_deploy_passwords();
		if ( $save_token ) {
			Hatch_Credential_Store::store( $provider->get_id(), $token );
		}
		$allow_permalinks = ! empty( $options['allow_permalinks'] );
		self::record_success( $provider, $result, $allow_permalinks );

		$private_wp = self::is_private_host( (string) wp_parse_url( $wp_url, PHP_URL_HOST ) );
		$message    = self::success_message( (string) $result['public_url'], $private_wp );
		$warnings   = $private_wp ? array( self::private_host_warning() ) : array();
		if ( ! $allow_permalinks && '' === (string) get_option( 'permalink_structure', '' ) ) {
			$warnings[] = __( 'Permalinks are still set to Plain, so the frontend cannot look up your posts by their address yet. Choose Post name under Settings, Permalinks, then it will work.', 'hatch-bridge' );
		}

		update_option(
			self::OPTION_LAST,
			array(
				'ok'         => true,
				'provider'   => $provider->get_id(),
				'code'       => 'deployed',
				'stage'      => 'done',
				'message'    => $message,
				'public_url' => (string) $result['public_url'],
				'private_wp' => $private_wp,
				'at'         => time(),
			),
			false
		);

		return array(
			'code'       => 'deployed',
			'message'    => $message,
			'public_url' => (string) $result['public_url'],
			'result'     => self::public_result( $result ),
			'warnings'   => $warnings,
		);
	}

	/**
	 * Persist everything the rest of the plugin reads after a deploy.
	 *
	 * @param Hatch_Deploy_Provider $provider Provider.
	 * @param array<string,mixed>   $result   Provider result.
	 * @param bool                  $allow_permalinks Whether the administrator agreed to switch plain permalinks to Post name.
	 * @return void
	 */
	private static function record_success( Hatch_Deploy_Provider $provider, array $result, bool $allow_permalinks ): void {
		Hatch_Connection_Status::set_hosting_model( $provider->get_hosting_model() );

		update_option(
			'hatch_deploy_project_' . $provider->get_id(),
			array(
				'name'         => (string) $result['name'],
				'url'          => (string) $result['url'],
				'connected_at' => time(),
			),
			false
		);
		update_option(
			'hatch_cf_worker_state',
			array(
				'deployed_at'  => time(),
				'account_id'   => (string) $result['account_id'],
				'zone_id'      => (string) $result['zone_id'],
				'route_id'     => isset( $result['route_ids'][0] ) ? (string) $result['route_ids'][0] : '',
				'route_ids'    => array_map( 'strval', (array) $result['route_ids'] ),
				'money_domain' => (string) $result['domain'],
				'astro_origin' => (string) $result['url'],
				'subpath'      => (string) $result['subpath'],
				'mount_mode'   => (string) $result['mount_mode'],
				'script_name'  => (string) $result['name'],
				'proxy_script' => (string) $result['proxy_script'],
			),
			false
		);
		update_option( 'hatch_mount_mode', (string) $result['mount_mode'], false );
		if ( '' !== (string) $result['subpath'] ) {
			update_option( 'hatch_mount_subpath', (string) $result['subpath'], false );
		}
		update_option( 'hatch_deployed_frontend_version', HATCH_VERSION );

		$origin         = untrailingslashit( esc_url_raw( (string) $result['url'] ) );
		$existing_proxy = trim( (string) get_option( 'hatch_image_proxy_url', '' ) );
		if ( '' === $existing_proxy || untrailingslashit( (string) get_option( 'hatch_frontend_url', '' ) ) === $existing_proxy ) {
			update_option( 'hatch_image_proxy_url', $origin, false );
		}
		update_option( 'hatch_frontend_url', $origin, false );
		if ( '' === (string) get_option( 'hatch_revalidate_endpoint', '' ) ) {
			update_option( 'hatch_revalidate_endpoint', esc_url_raw( $origin . '/api/revalidate' ), false );
		}

		if ( $allow_permalinks ) {
			self::ensure_pretty_permalinks();
		}

		if ( class_exists( 'Hatch_Companion_Theme_Installer' ) ) {
			Hatch_Companion_Theme_Installer::install_and_activate();
		}
	}

	/**
	 * Switch from plain permalinks to /%postname%/, and only then.
	 *
	 * The REST API and the frontend's slug lookups need pretty permalinks. A site
	 * that already chose a structure is never changed. Runs only as part of a
	 * deploy the administrator started and only when they ticked the permalinks
	 * box (allow_permalinks), and is disclosed in the readme.
	 *
	 * @return void
	 */
	private static function ensure_pretty_permalinks(): void {
		if ( '' !== (string) get_option( 'permalink_structure', '' ) ) {
			return;
		}
		global $wp_rewrite;
		if ( ! $wp_rewrite instanceof WP_Rewrite ) {
			return;
		}
		$wp_rewrite->set_permalink_structure( '/%postname%/' );
		$wp_rewrite->flush_rules( false );
		set_transient( 'hatch_permalinks_auto_set', 1, MINUTE_IN_SECONDS * 5 );
	}

	/**
	 * Result fields that are safe to return to the browser.
	 *
	 * @param array<string,mixed> $result Provider result.
	 * @return array<string,mixed>
	 */
	private static function public_result( array $result ): array {
		return array(
			'name'       => (string) $result['name'],
			'url'        => (string) $result['url'],
			'public_url' => (string) $result['public_url'],
			'domain'     => (string) $result['domain'],
			'mount_mode' => (string) $result['mount_mode'],
			'subpath'    => (string) $result['subpath'],
		);
	}

	/**
	 * Saved deploy state without internal identifiers.
	 *
	 * @param array<string,mixed> $state Option value.
	 * @return array<string,mixed>
	 */
	private static function public_state( array $state ): array {
		return array(
			'deployed_at' => isset( $state['deployed_at'] ) ? (int) $state['deployed_at'] : 0,
			'domain'      => isset( $state['money_domain'] ) ? (string) $state['money_domain'] : '',
			'origin'      => isset( $state['astro_origin'] ) ? (string) $state['astro_origin'] : '',
			'mount_mode'  => isset( $state['mount_mode'] ) ? (string) $state['mount_mode'] : '',
			'subpath'     => isset( $state['subpath'] ) ? (string) $state['subpath'] : '',
			'script_name' => isset( $state['script_name'] ) ? (string) $state['script_name'] : '',
		);
	}

	/**
	 * Use the typed token, or fall back to the stored one.
	 *
	 * @param Hatch_Deploy_Provider|null $provider Provider.
	 * @param string                     $typed    Sanitised token from the request, or "".
	 * @return string|WP_Error
	 */
	private static function resolve_token( ?Hatch_Deploy_Provider $provider, string $typed ) {
		if ( null === $provider ) {
			return new WP_Error( 'hatch_deploy_unknown_provider', __( 'Unknown deploy provider.', 'hatch-bridge' ), array( 'status' => 404 ) );
		}
		if ( '' !== $typed ) {
			if ( ! self::looks_like_token( $typed ) ) {
				return new WP_Error(
					'hatch_deploy_bad_token',
					__( 'That does not look like a Cloudflare API token. Copy the whole token from Cloudflare, with no spaces or quotes.', 'hatch-bridge' ),
					array( 'status' => 400 )
				);
			}
			return $typed;
		}
		$stored = Hatch_Credential_Store::retrieve( $provider->get_id() );
		if ( '' !== $stored ) {
			return $stored;
		}
		return new WP_Error( 'hatch_deploy_no_token', __( 'Paste a Cloudflare API token first.', 'hatch-bridge' ), array( 'status' => 400 ) );
	}

	/**
	 * Limit calls that reach Cloudflare on behalf of one administrator.
	 *
	 * @return true|WP_Error
	 */
	private static function throttle() {
		$key   = self::THROTTLE_TRANSIENT . get_current_user_id();
		$count = (int) get_transient( $key );
		if ( $count >= 12 ) {
			return new WP_Error( 'hatch_deploy_throttled', __( 'Too many checks in a short time. Wait a minute and try again.', 'hatch-bridge' ), array( 'status' => 429 ) );
		}
		set_transient( $key, $count + 1, MINUTE_IN_SECONDS );
		return true;
	}

	/**
	 * Add an HTTP status to an error so REST answers with the right code.
	 *
	 * @param WP_Error $error Error.
	 * @return WP_Error
	 */
	private static function rest_error( WP_Error $error ): WP_Error {
		$data = (array) $error->get_error_data();
		if ( ! isset( $data['status'] ) || (int) $data['status'] < 400 ) {
			$data['status'] = 400;
		}
		// Cloudflare errors are relayed as a bad gateway or a client error, never as the site's own 401, which would log the admin out of the UI.
		if ( 401 === (int) $data['status'] ) {
			$data['status'] = 400;
		}
		return new WP_Error( $error->get_error_code(), $error->get_error_message(), $data );
	}

	/**
	 * Create the application password the deployed frontend uses to read WordPress.
	 *
	 * It belongs to the read-only Hatch Reader user, never to the administrator
	 * who clicked deploy, so a leaked frontend credential cannot write or read
	 * anything an anonymous visitor could not, beyond being logged in.
	 *
	 * @return array{password:string,uuid:string,user:WP_User}|WP_Error
	 */
	private static function create_app_password() {
		$reader = Hatch_App_Password_Helper::ensure_reader_user();
		if ( is_wp_error( $reader ) ) {
			return $reader;
		}
		if ( ! wp_is_application_passwords_available_for_user( $reader ) ) {
			return new WP_Error(
				'hatch_deploy_no_app_password',
				__( 'WordPress application passwords are turned off on this site, so the frontend cannot be given read access. Turn them on, then deploy again.', 'hatch-bridge' ),
				array( 'status' => 400 )
			);
		}
		$created = WP_Application_Passwords::create_new_application_password( $reader->ID, array( 'name' => self::APP_PASSWORD_NAME ) );
		if ( is_wp_error( $created ) || ! is_array( $created ) || empty( $created[0] ) || empty( $created[1]['uuid'] ) ) {
			return new WP_Error( 'hatch_deploy_no_app_password', __( 'Could not create an application password for the frontend.', 'hatch-bridge' ), array( 'status' => 500 ) );
		}
		return array(
			'password' => (string) $created[0],
			'uuid'     => (string) $created[1]['uuid'],
			'user'     => $reader,
		);
	}

	/**
	 * Delete one application password of a user.
	 *
	 * @param int    $user_id User id.
	 * @param string $uuid    Password uuid.
	 * @return void
	 */
	private static function delete_app_password( int $user_id, string $uuid ): void {
		WP_Application_Passwords::delete_application_password( $user_id, $uuid );
	}

	/**
	 * After a successful deploy, remove earlier Hatch deploy passwords of the reader so they do not pile up.
	 *
	 * @param int    $user_id   Reader user id.
	 * @param string $keep_uuid The password the new deployment uses.
	 * @return void
	 */
	private static function revoke_older_app_passwords( int $user_id, string $keep_uuid ): void {
		foreach ( WP_Application_Passwords::get_user_application_passwords( $user_id ) as $item ) {
			if ( isset( $item['uuid'], $item['name'] ) && self::APP_PASSWORD_NAME === $item['name'] && $keep_uuid !== $item['uuid'] ) {
				WP_Application_Passwords::delete_application_password( $user_id, (string) $item['uuid'] );
			}
		}
	}

	/**
	 * Remove deploy passwords that earlier versions issued to administrators.
	 *
	 * Before the Hatch Reader user existed, the frontend authenticated as the
	 * administrator who deployed. Once a deploy has handed the frontend the reader
	 * credential, those passwords are dead weight with admin power, so they go.
	 *
	 * @return void
	 */
	private static function revoke_admin_deploy_passwords(): void {
		$admins = get_users(
			array(
				'role__in' => array( 'administrator' ),
				'fields'   => 'ID',
			)
		);
		foreach ( $admins as $admin_id ) {
			foreach ( WP_Application_Passwords::get_user_application_passwords( (int) $admin_id ) as $item ) {
				if ( isset( $item['uuid'], $item['name'] ) && self::APP_PASSWORD_NAME === $item['name'] ) {
					WP_Application_Passwords::delete_application_password( (int) $admin_id, (string) $item['uuid'] );
				}
			}
		}
	}

	/**
	 * Success message, built in the current locale each time it is read.
	 *
	 * @param string $public_url Public address of the frontend.
	 * @param bool   $private_wp Whether this WordPress site is not reachable from the internet.
	 * @return string
	 */
	public static function success_message( string $public_url, bool $private_wp ): string {
		$message = sprintf(
			/* translators: %s: public address of the frontend. */
			__( 'Deployed to Cloudflare. Your frontend is live at %s.', 'hatch-bridge' ),
			$public_url
		);
		if ( $private_wp ) {
			$message .= ' ' . self::private_host_warning();
		}
		return $message;
	}

	/**
	 * Warning shown when the WordPress site is not reachable from the internet.
	 *
	 * @return string
	 */
	private static function private_host_warning(): string {
		return __( 'This WordPress site is not reachable from the internet, so the deployed frontend cannot load its content yet. Set a public address for this site, then deploy again.', 'hatch-bridge' );
	}

	/**
	 * Whether a host name can only be reached from the local machine or network.
	 *
	 * @param string $host Host name.
	 * @return bool
	 */
	private static function is_private_host( string $host ): bool {
		$host = strtolower( $host );
		if ( '' === $host || 'localhost' === $host || substr( $host, -6 ) === '.local' || substr( $host, -5 ) === '.test' || substr( $host, -10 ) === '.localhost' ) {
			return true;
		}
		if ( false !== filter_var( $host, FILTER_VALIDATE_IP ) ) {
			return false === filter_var( $host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE );
		}
		return false;
	}
}

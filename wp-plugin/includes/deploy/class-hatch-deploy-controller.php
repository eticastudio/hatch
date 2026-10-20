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
 * Hatch never creates users or application passwords. The administrator creates a
 * low-privilege account and one application password for it with WordPress's own
 * screens and gives Hatch both (see Hatch_Wp_Credential). A deploy changes the site
 * in ways the administrator must agree to first: it stores that credential and,
 * only when asked, rewrites plain permalinks. The run route refuses to start
 * without consent=true, and rewrites permalinks only with allow_permalinks=true.
 * The disconnect route forgets the stored credential.
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
	const OPTION_HISTORY     = 'hatch_deploy_history';
	const HISTORY_MAX        = 50;
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
			'wp_user'          => array(
				'type'              => 'string',
				'required'          => false,
				'default'           => '',
				'sanitize_callback' => array( __CLASS__, 'sanitize_wp_user' ),
			),
			'wp_password'      => array(
				'type'              => 'string',
				'required'          => false,
				'default'           => '',
				'sanitize_callback' => array( 'Hatch_Wp_Credential', 'normalize_password' ),
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
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( __CLASS__, 'route_forget_token' ),
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'args'                => $provider_arg,
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'route_save_token' ),
					'permission_callback' => array( __CLASS__, 'can_manage' ),
					'args'                => array_merge( $provider_arg, array( 'token' => $body_args['token'] ) ),
				),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/deploy/redeploy',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'route_redeploy' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
				'args'                => array(
					'domain' => array(
						'type'              => 'string',
						'required'          => false,
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
		register_rest_route(
			self::REST_NAMESPACE,
			'/deploy/history',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'route_history' ),
				'permission_callback' => array( __CLASS__, 'can_manage' ),
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
			return new WP_Error( 'hatch_deploy_no_zones', __( 'This provider does not list domains.', 'hatch-connect' ), array( 'status' => 404 ) );
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
				__( 'Confirm the changes a deploy makes to this site before deploying. Nothing was changed.', 'hatch-connect' ),
				array( 'status' => 400 )
			);
		}
		$provider = self::provider( (string) $request['provider'] );
		$token    = self::resolve_token( $provider, (string) $request->get_param( 'token' ) );
		if ( is_wp_error( $token ) ) {
			return $token;
		}
		$state   = get_option( 'hatch_cf_worker_state' );
		$outcome = self::run(
			$provider,
			$token,
			array(
				'mount_mode'       => (string) $request->get_param( 'mount_mode' ),
				'subpath'          => (string) $request->get_param( 'subpath' ),
				'domain'           => (string) $request->get_param( 'domain' ),
				'account_id'       => (string) $request->get_param( 'account_id' ),
				'allow_permalinks' => (bool) $request->get_param( 'allow_permalinks' ),
				'wp_user'          => (string) $request->get_param( 'wp_user' ),
				'wp_password'      => (string) $request->get_param( 'wp_password' ),
			),
			(bool) $request->get_param( 'save_token' ),
			is_array( $state ) && ! empty( $state['deployed_at'] ) ? 'redeploy' : 'initial'
		);
		if ( is_wp_error( $outcome ) ) {
			return self::rest_error( $outcome );
		}
		return new WP_REST_Response( $outcome );
	}

	/**
	 * POST /deploy/redeploy.
	 *
	 * Publishes the frontend again with the saved configuration, no setup
	 * screen. The token must already be saved; it is checked with Cloudflare
	 * first so a revoked token is reported before anything is changed. An
	 * optional "domain" switches the frontend to a new domain in the same
	 * step, using the mount mode and folder that are already saved.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function route_redeploy( WP_REST_Request $request ) {
		$provider = self::provider( 'cloudflare' );
		if ( null === $provider ) {
			return self::rest_error( new WP_Error( 'hatch_deploy_unknown_provider', __( 'Unknown deploy provider.', 'hatch-connect' ), array( 'status' => 404 ) ) );
		}
		$state = get_option( 'hatch_cf_worker_state' );
		if ( ! is_array( $state ) || empty( $state['deployed_at'] ) ) {
			return self::rest_error(
				new WP_Error(
					'hatch_deploy_not_deployed',
					__( 'Hatch is not set up yet, so there is nothing to redeploy. Run the setup first.', 'hatch-connect' ),
					array( 'status' => 409 )
				)
			);
		}

		$mount_mode = isset( $state['mount_mode'] ) ? (string) $state['mount_mode'] : 'root';
		$subpath    = isset( $state['subpath'] ) ? (string) $state['subpath'] : '';
		$domain     = isset( $state['money_domain'] ) ? (string) $state['money_domain'] : '';
		$type       = 'redeploy';

		$requested = trim( (string) $request->get_param( 'domain' ) );
		if ( '' !== $requested ) {
			$checked = self::validate_domain( $requested, $mount_mode, self::wordpress_host() );
			if ( is_wp_error( $checked ) ) {
				return self::rest_error( $checked );
			}
			if ( $checked === $domain ) {
				return self::rest_error(
					new WP_Error(
						'hatch_deploy_same_domain',
						__( 'That is already the domain your frontend uses. Use Redeploy to publish it again.', 'hatch-connect' ),
						array( 'status' => 400 )
					)
				);
			}
			$domain = $checked;
			$type   = 'domain_change';
		}

		$throttle = self::throttle();
		if ( is_wp_error( $throttle ) ) {
			return self::rest_error( $throttle );
		}

		$token = Hatch_Credential_Store::retrieve( $provider->get_id() );
		if ( '' === $token ) {
			return self::rest_error(
				new WP_Error(
					'hatch_deploy_no_token',
					__( 'There is no saved Cloudflare token on this site. Add one with Change token, then redeploy.', 'hatch-connect' ),
					array( 'status' => 400 )
				)
			);
		}
		$verified = $provider->verify_token( $token );
		if ( is_wp_error( $verified ) ) {
			// A revoked token is the most common reason a redeploy fails, so it belongs in the history too.
			self::record_history( $type, $verified, $domain );
			return self::rest_error( $verified );
		}

		$outcome = self::run(
			$provider,
			$token,
			array(
				'mount_mode'       => $mount_mode,
				'subpath'          => $subpath,
				'domain'           => $domain,
				'account_id'       => isset( $state['account_id'] ) ? (string) $state['account_id'] : '',
				'allow_permalinks' => false,
			),
			false,
			$type
		);
		if ( is_wp_error( $outcome ) ) {
			return self::rest_error( $outcome );
		}
		$outcome['type'] = $type;
		$previous        = isset( $state['money_domain'] ) ? (string) $state['money_domain'] : '';
		if ( 'domain_change' === $type && '' !== $previous ) {
			$outcome['warnings'][] = sprintf(
				/* translators: %s: the domain the frontend used before. */
				__( 'The old address %s may still point to the frontend. If you do not want that, remove its route under Workers Routes in your Cloudflare dashboard.', 'hatch-connect' ),
				$previous
			);
		}
		return new WP_REST_Response( $outcome );
	}

	/**
	 * POST /deploy/{provider}/token.
	 *
	 * Replaces the saved token. The new token is checked with the provider
	 * first and is stored, encrypted, only when that check passes. The token
	 * never appears in the response.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function route_save_token( WP_REST_Request $request ) {
		$provider = self::provider( (string) $request['provider'] );
		if ( null === $provider ) {
			return self::rest_error( new WP_Error( 'hatch_deploy_unknown_provider', __( 'Unknown deploy provider.', 'hatch-connect' ), array( 'status' => 404 ) ) );
		}
		$throttle = self::throttle();
		if ( is_wp_error( $throttle ) ) {
			return self::rest_error( $throttle );
		}
		$typed = (string) $request->get_param( 'token' );
		if ( '' === $typed ) {
			return self::rest_error( new WP_Error( 'hatch_deploy_no_token', __( 'Paste a Cloudflare API token first.', 'hatch-connect' ), array( 'status' => 400 ) ) );
		}
		if ( ! self::looks_like_token( $typed ) ) {
			return self::rest_error(
				new WP_Error(
					'hatch_deploy_bad_token',
					__( 'That does not look like a Cloudflare API token. Copy the whole token from Cloudflare, with no spaces or quotes.', 'hatch-connect' ),
					array( 'status' => 400 )
				)
			);
		}
		if ( ! Hatch_Credential_Store::is_supported() ) {
			return self::rest_error(
				new WP_Error(
					'hatch_deploy_store_unsupported',
					__( 'This server cannot store the token safely, so Hatch will not save it. Ask your host to enable the OpenSSL PHP extension.', 'hatch-connect' ),
					array( 'status' => 500 )
				)
			);
		}

		$verified = $provider->verify_token( $typed );
		if ( is_wp_error( $verified ) ) {
			return self::rest_error( $verified );
		}

		// A token from another Cloudflare account could not redeploy this site.
		$state    = get_option( 'hatch_cf_worker_state' );
		$deployed = is_array( $state ) && ! empty( $state['account_id'] ) ? (string) $state['account_id'] : '';
		if ( '' !== $deployed && ! empty( $verified['accounts'] ) ) {
			$ids = array();
			foreach ( (array) $verified['accounts'] as $account ) {
				if ( is_array( $account ) && isset( $account['id'] ) ) {
					$ids[] = (string) $account['id'];
				}
			}
			if ( ! in_array( $deployed, $ids, true ) ) {
				return self::rest_error(
					new WP_Error(
						'hatch_deploy_wrong_account',
						__( 'This token belongs to a different Cloudflare account than the one your frontend is published on. Create the token in the account that hosts your frontend.', 'hatch-connect' ),
						array( 'status' => 400 )
					)
				);
			}
		}

		if ( ! Hatch_Credential_Store::store( $provider->get_id(), $typed ) ) {
			return self::rest_error( new WP_Error( 'hatch_deploy_store_failed', __( 'The token is valid, but it could not be saved on this site. Try again.', 'hatch-connect' ), array( 'status' => 500 ) ) );
		}

		return new WP_REST_Response(
			array(
				'code'      => 'token_saved',
				'message'   => __( 'Token verified and saved. It is stored encrypted on this site.', 'hatch-connect' ),
				'has_token' => true,
			)
		);
	}

	/**
	 * GET /deploy/history: recorded deploys, newest first.
	 *
	 * @return WP_REST_Response
	 */
	public static function route_history(): WP_REST_Response {
		return new WP_REST_Response( array( 'entries' => array_reverse( self::history() ) ) );
	}

	/**
	 * Check a domain the administrator typed for the frontend.
	 *
	 * @param string $raw        Typed value.
	 * @param string $mount_mode "root" or "subfolder", how the domain is used.
	 * @param string $wp_host    Host name of this WordPress site.
	 * @return string|WP_Error Lowercase host name, or an error that says what to fix.
	 */
	public static function validate_domain( string $raw, string $mount_mode, string $wp_host ) {
		$raw = trim( $raw );
		if ( '' === $raw ) {
			return new WP_Error( 'hatch_deploy_bad_domain', __( 'Enter the domain you want to use, for example blog.example.com.', 'hatch-connect' ), array( 'status' => 400 ) );
		}
		if ( 1 === preg_match( '#[\s/:?\#@\\\\]#', $raw ) ) {
			return new WP_Error(
				'hatch_deploy_bad_domain',
				__( 'Enter only the domain name, for example blog.example.com. Leave out https://, any path and any port.', 'hatch-connect' ),
				array( 'status' => 400 )
			);
		}
		$host = Hatch_Cloudflare_Provider::normalize_domain( $raw );
		if ( '' === $host ) {
			return new WP_Error(
				'hatch_deploy_bad_domain',
				__( 'That does not look like a valid domain name. Use letters, numbers and dashes, for example blog.example.com.', 'hatch-connect' ),
				array( 'status' => 400 )
			);
		}
		if ( substr( $host, -12 ) === '.workers.dev' || 'workers.dev' === $host ) {
			return new WP_Error(
				'hatch_deploy_bad_domain',
				__( 'A workers.dev address is created for you automatically. Enter your own domain here, one that is added to your Cloudflare account.', 'hatch-connect' ),
				array( 'status' => 400 )
			);
		}
		$tld = substr( $host, (int) strrpos( $host, '.' ) + 1 );
		if ( in_array( $tld, array( 'local', 'test', 'localhost', 'internal', 'invalid', 'example', 'lan', 'home', 'corp' ), true ) ) {
			return new WP_Error(
				'hatch_deploy_bad_domain',
				__( 'Cloudflare can only serve public domains. Enter a domain you own and have added to Cloudflare.', 'hatch-connect' ),
				array( 'status' => 400 )
			);
		}
		if ( 'subfolder' !== $mount_mode && '' !== $wp_host && strtolower( $wp_host ) === $host ) {
			return new WP_Error(
				'hatch_deploy_bad_domain',
				__( 'That is the address of this WordPress site itself. Using it for the frontend would cut off WordPress. Pick a different address, for example your main domain, and keep WordPress here.', 'hatch-connect' ),
				array( 'status' => 400 )
			);
		}
		return $host;
	}

	/**
	 * Host name of this WordPress site, as the frontend reaches it.
	 *
	 * @return string
	 */
	private static function wordpress_host(): string {
		$public = trim( (string) get_option( 'hatch_wp_public_url', '' ) );
		$host   = wp_parse_url( '' !== $public ? esc_url_raw( $public ) : home_url(), PHP_URL_HOST );
		return is_string( $host ) ? strtolower( $host ) : '';
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
	 * Forgets the WordPress credential and the provider token Hatch kept. Hatch
	 * did not create the application password, so it does not delete it either:
	 * the response carries a link to the profile screen where the administrator
	 * revokes it. The frontend deployment at the provider is not touched.
	 *
	 * @return WP_REST_Response|WP_Error
	 */
	public static function route_disconnect() {
		if ( false !== get_transient( self::LOCK_TRANSIENT ) ) {
			return new WP_Error( 'hatch_deploy_busy', __( 'A deploy is already running. Wait for it to finish, then disconnect.', 'hatch-connect' ), array( 'status' => 409 ) );
		}
		$credential = Hatch_Wp_Credential::summary();
		Hatch_Wp_Credential::clear();

		delete_option( self::OPTION_LAST );
		// A site that was disconnected should not keep a working Cloudflare credential.
		Hatch_Credential_Store::clear( 'cloudflare' );

		self::mark_disconnected();

		return new WP_REST_Response(
			array(
				'code'        => 'disconnected',
				'message'     => __( 'Disconnected. Hatch forgot the saved WordPress credential and the saved Cloudflare token. Revoke the frontend\'s application password in your profile so the Worker can no longer read this site. The frontend itself keeps running in your Cloudflare account until you delete the Worker there.', 'hatch-connect' ),
				'wp_user'     => $credential['user'],
				'profile_url' => admin_url( 'profile.php#application-passwords-section' ),
			)
		);
	}

	/**
	 * Stop reporting the frontend as managed by this site.
	 *
	 * The Worker name, account and routes stay so a later deploy reuses the same Worker
	 * instead of orphaning it. Only the "deployed" marker the status and redeploy routes
	 * read is replaced by a disconnect time.
	 *
	 * @return void
	 */
	public static function mark_disconnected(): void {
		$state    = get_option( 'hatch_cf_worker_state' );
		$deployed = is_array( $state ) && ! empty( $state['deployed_at'] );
		// A site disconnected by an older release has no marker left but may still carry the project record.
		$had_project = is_array( get_option( 'hatch_deploy_project_cloudflare' ) );
		if ( ! $deployed && ! $had_project ) {
			return;
		}
		if ( $deployed ) {
			unset( $state['deployed_at'] );
			$state['disconnected_at'] = time();
			update_option( 'hatch_cf_worker_state', $state, false );
		}

		// Nothing may keep pointing at, probing or purging a frontend this site no longer manages.
		// The image address is cleared only when Hatch itself set it to the frontend (see record_success()).
		$frontend = untrailingslashit( (string) get_option( 'hatch_frontend_url', '' ) );
		if ( '' !== $frontend && untrailingslashit( (string) get_option( 'hatch_image_proxy_url', '' ) ) === $frontend ) {
			delete_option( 'hatch_image_proxy_url' );
		}
		foreach ( array( 'hatch_deploy_project_cloudflare', 'hatch_frontend_url', 'hatch_revalidate_endpoint', 'hatch_hosting_model', 'hatch_last_webhook_ack', 'hatch_last_webhook_ack_status', self::OPTION_LAST ) as $option ) {
			delete_option( $option );
		}
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
				'deployed'      => is_array( $state ) && ! empty( $state['deployed_at'] ),
				'state'         => is_array( $state ) ? self::public_state( $state ) : null,
				'last'          => is_array( $last ) ? $last : null,
				'has_token'     => Hatch_Credential_Store::has( 'cloudflare' ),
				'model'         => (string) get_option( 'hatch_hosting_model', '' ),
				'wp_credential' => Hatch_Wp_Credential::summary(),
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
	 * @param string                $type       What started it: "initial", "redeploy" or "domain_change". Recorded in the history.
	 * @return array{code:string,message:string,public_url:string,result:array<string,mixed>,warnings:array<int,string>}|WP_Error
	 */
	public static function run( Hatch_Deploy_Provider $provider, string $token, array $options, bool $save_token, string $type = 'initial' ) {
		if ( ! current_user_can( 'manage_options' ) ) {
			return new WP_Error( 'hatch_deploy_forbidden', __( 'You do not have permission to deploy the frontend.', 'hatch-connect' ), array( 'status' => 403 ) );
		}
		if ( false !== get_transient( self::LOCK_TRANSIENT ) ) {
			return new WP_Error( 'hatch_deploy_busy', __( 'A deploy is already running. Wait for it to finish, then check the Connection tab.', 'hatch-connect' ), array( 'status' => 409 ) );
		}
		set_transient( self::LOCK_TRANSIENT, time(), 5 * MINUTE_IN_SECONDS );

		$outcome = self::run_locked( $provider, $token, $options, $save_token );
		delete_transient( self::LOCK_TRANSIENT );
		self::record_history( $type, $outcome, isset( $options['domain'] ) ? (string) $options['domain'] : '' );

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
		// Check the frontend's WordPress credential before anything is changed anywhere.
		$credential = self::resolve_wp_credential( $options );
		if ( is_wp_error( $credential ) ) {
			return $credential;
		}

		$public_wp = trim( (string) get_option( 'hatch_wp_public_url', '' ) );
		$wp_url    = untrailingslashit( '' !== $public_wp ? esc_url_raw( $public_wp ) : home_url() );
		$secret    = (string) get_option( 'hatch_webhook_secret', '' );
		if ( '' === $secret ) {
			$secret = wp_generate_password( 48, false );
			update_option( 'hatch_webhook_secret', $secret, false );
		}
		$result = $provider->deploy(
			$token,
			array(
				'mount_mode'     => isset( $options['mount_mode'] ) ? $options['mount_mode'] : 'root',
				'subpath'        => isset( $options['subpath'] ) ? $options['subpath'] : '/blog',
				'domain'         => isset( $options['domain'] ) ? $options['domain'] : '',
				'account_id'     => isset( $options['account_id'] ) ? $options['account_id'] : '',
				'wp_url'         => $wp_url,
				'wp_user'        => $credential['login'],
				'wp_pass'        => $credential['password'],
				'webhook_secret' => $secret,
			)
		);

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		// Kept encrypted so a redeploy does not ask again. Saving is best effort: the Worker already has it.
		Hatch_Wp_Credential::save( $credential['login'], $credential['password'] );
		if ( $save_token ) {
			Hatch_Credential_Store::store( $provider->get_id(), $token );
		}
		$allow_permalinks = ! empty( $options['allow_permalinks'] );
		self::record_success( $provider, $result, $allow_permalinks );

		$private_wp = self::is_private_host( (string) wp_parse_url( $wp_url, PHP_URL_HOST ) );
		$message    = self::success_message( (string) $result['public_url'], $private_wp );
		$warnings   = $private_wp ? array( self::private_host_warning() ) : array();
		if ( ! $allow_permalinks && '' === (string) get_option( 'permalink_structure', '' ) ) {
			$warnings[] = __( 'Permalinks are still set to Plain, so the frontend cannot look up your posts by their address yet. Choose Post name under Settings, Permalinks, then it will work.', 'hatch-connect' );
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
	 * @return true
	 */
	private static function record_success( Hatch_Deploy_Provider $provider, array $result, bool $allow_permalinks ) {
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

		return true;
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
	 * Recorded deploys, oldest first.
	 *
	 * @return array<int,array{ts:int,type:string,status:string,message:string,domain:string}>
	 */
	public static function history(): array {
		$stored = get_option( self::OPTION_HISTORY, array() );
		if ( ! is_array( $stored ) ) {
			return array();
		}
		$out = array();
		foreach ( $stored as $entry ) {
			if ( is_array( $entry ) && isset( $entry['ts'], $entry['type'], $entry['status'] ) ) {
				$out[] = array(
					'ts'      => (int) $entry['ts'],
					'type'    => (string) $entry['type'],
					'status'  => (string) $entry['status'],
					'message' => isset( $entry['message'] ) ? (string) $entry['message'] : '',
					'domain'  => isset( $entry['domain'] ) ? (string) $entry['domain'] : '',
				);
			}
		}
		return $out;
	}

	/**
	 * Add one deploy to the history and keep only the latest HISTORY_MAX.
	 *
	 * Stored in a single option that is not autoloaded. The message is a
	 * short plain sentence; it never contains a token.
	 *
	 * @param string                                $type    "initial", "redeploy" or "domain_change".
	 * @param array<string,mixed>|WP_Error          $outcome Result of the deploy.
	 * @param string                                $domain  Domain the deploy was for, "" for a workers.dev address.
	 * @return void
	 */
	private static function record_history( string $type, $outcome, string $domain ): void {
		if ( ! in_array( $type, array( 'initial', 'redeploy', 'domain_change' ), true ) ) {
			$type = 'initial';
		}
		if ( is_wp_error( $outcome ) ) {
			$status  = 'failed';
			$message = $outcome->get_error_message();
		} else {
			$status  = 'success';
			$message = isset( $outcome['public_url'] ) ? sprintf(
				/* translators: %s: public address of the frontend. */
				__( 'Live at %s.', 'hatch-connect' ),
				(string) $outcome['public_url']
			) : '';
		}
		$message = sanitize_text_field( $message );
		$message = function_exists( 'mb_substr' ) ? mb_substr( $message, 0, 240 ) : substr( $message, 0, 240 );

		$entries   = self::history();
		$entries[] = array(
			'ts'      => time(),
			'type'    => $type,
			'status'  => $status,
			'message' => $message,
			'domain'  => sanitize_text_field( $domain ),
		);
		if ( count( $entries ) > self::HISTORY_MAX ) {
			$entries = array_slice( $entries, -self::HISTORY_MAX );
		}
		update_option( self::OPTION_HISTORY, $entries, false );
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
			return new WP_Error( 'hatch_deploy_unknown_provider', __( 'Unknown deploy provider.', 'hatch-connect' ), array( 'status' => 404 ) );
		}
		if ( '' !== $typed ) {
			if ( ! self::looks_like_token( $typed ) ) {
				return new WP_Error(
					'hatch_deploy_bad_token',
					__( 'That does not look like a Cloudflare API token. Copy the whole token from Cloudflare, with no spaces or quotes.', 'hatch-connect' ),
					array( 'status' => 400 )
				);
			}
			return $typed;
		}
		$stored = Hatch_Credential_Store::retrieve( $provider->get_id() );
		if ( '' !== $stored ) {
			return $stored;
		}
		return new WP_Error( 'hatch_deploy_no_token', __( 'Paste a Cloudflare API token first.', 'hatch-connect' ), array( 'status' => 400 ) );
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
			return new WP_Error( 'hatch_deploy_throttled', __( 'Too many checks in a short time. Wait a minute and try again.', 'hatch-connect' ), array( 'status' => 429 ) );
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
		$data['fix'] = self::fix_for( (string) $error->get_error_code() );
		return new WP_Error( $error->get_error_code(), $error->get_error_message(), $data );
	}

	/**
	 * Which action on the Connection tab fixes an error.
	 *
	 * @param string $code Error code.
	 * @return string "change_token", "change_domain", "retry", "setup", "wp_credential" or "" when no single action helps.
	 */
	public static function fix_for( string $code ): string {
		$map = array(
			'hatch_cf_auth'                         => 'change_token',
			'hatch_cf_token_inactive'               => 'change_token',
			'hatch_cf_permission'                   => 'change_token',
			'hatch_cf_no_token'                     => 'change_token',
			'hatch_deploy_no_token'                 => 'change_token',
			'hatch_deploy_bad_token'                => 'change_token',
			'hatch_deploy_wrong_account'            => 'change_token',
			'hatch_cf_zone_missing'                 => 'change_domain',
			'hatch_cf_zone_other_account'           => 'change_domain',
			'hatch_cf_route_taken'                  => 'change_domain',
			'hatch_deploy_bad_domain'               => 'change_domain',
			'hatch_deploy_same_domain'              => 'change_domain',
			'hatch_cf_rate_limited'                 => 'retry',
			'hatch_cf_unavailable'                  => 'retry',
			'hatch_cf_unreachable'                  => 'retry',
			'hatch_cf_bad_response'                 => 'retry',
			'hatch_deploy_busy'                     => 'retry',
			'hatch_deploy_throttled'                => 'retry',
			'hatch_deploy_not_deployed'             => 'setup',
			'hatch_deploy_no_wp_credential'         => 'wp_credential',
			'hatch_deploy_wp_credential_invalid'    => 'wp_credential',
			'hatch_deploy_wp_credential_privileged' => 'wp_credential',
			'hatch_deploy_no_app_password'          => 'wp_credential',
		);
		return isset( $map[ $code ] ) ? $map[ $code ] : '';
	}

	/**
	 * Sanitize the typed user name of the frontend account.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	public static function sanitize_wp_user( $value ): string {
		return sanitize_user( is_scalar( $value ) ? (string) $value : '', true );
	}

	/**
	 * The WordPress credential this deploy hands to the frontend.
	 *
	 * A user name and application password typed in this request win; otherwise
	 * the saved pair is used (a redeploy). Either way the account is checked
	 * again now, so an account promoted to editor since it was saved is refused.
	 *
	 * @param array<string,mixed> $options Deploy options, possibly with wp_user and wp_password.
	 * @return array{login:string,password:string}|WP_Error
	 */
	private static function resolve_wp_credential( array $options ) {
		$login    = isset( $options['wp_user'] ) ? (string) $options['wp_user'] : '';
		$password = isset( $options['wp_password'] ) ? (string) $options['wp_password'] : '';
		if ( '' !== $login || '' !== $password ) {
			return Hatch_Wp_Credential::validate( $login, $password );
		}
		$saved = Hatch_Wp_Credential::get();
		if ( null === $saved ) {
			return new WP_Error(
				'hatch_deploy_no_wp_credential',
				__( 'Hatch needs a WordPress user name and an application password for the frontend. Create a Subscriber account and an application password for it, then enter both.', 'hatch-connect' ),
				array( 'status' => 400 )
			);
		}
		$user = Hatch_Wp_Credential::check_account( $saved['login'] );
		if ( is_wp_error( $user ) ) {
			return $user;
		}
		return $saved;
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
			__( 'Deployed to Cloudflare. Your frontend is live at %s.', 'hatch-connect' ),
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
		return __( 'This WordPress site is not reachable from the internet, so the deployed frontend cannot load its content yet. Set a public address for this site, then deploy again.', 'hatch-connect' );
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

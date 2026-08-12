<?php
/**
 * Hatch Auth — headless JWT authentication for the Astro frontend.
 *
 * CLEAN-ROOM ORIGINAL. Zero lines copied from any external repo.
 * JWT HS256 implemented fresh via WP's built-in hash_hmac.
 * Standards followed: RFC 7519 (JWT), RFC 6265 (HttpOnly Secure SameSite cookies).
 *
 * Routes (namespace: hatch/v1):
 *   POST /auth/login     {username,password}   -> {token,user,expires_at}, sets hatch_jwt cookie
 *   POST /auth/register  {username,email,password[,hp_website]}
 *   POST /auth/logout                          -> {ok:true}, clears cookie
 *   GET  /auth/me                              -> user object (or 401)
 *   POST /auth/refresh                         -> fresh token if within 24h of expiry
 *
 * Also gates POST /wp/v2/comments via rest_pre_dispatch so a valid JWT
 * populates the current user, letting the Astro-side commenter post as
 * themselves.
 *
 * @package Hatch
 * @since   0.7.6
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Auth {

	const COOKIE_NAME     = 'hatch_jwt';
	const OPTION_SECRET   = 'hatch_jwt_secret';
	const TOKEN_TTL       = 604800;   // 7 days.
	const REFRESH_WINDOW  = 86400;    // Refresh within 24h of expiry.
	const RL_MAX_ATTEMPTS = 5;
	const RL_WINDOW       = 300;      // 5 minutes.

	private static $instance = null;

	public static function instance(): Hatch_Auth {
		if ( null === self::$instance ) {
			self::$instance = new self();
			add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
			add_filter( 'rest_pre_dispatch', array( __CLASS__, 'attach_jwt_user' ), 5, 3 );

			// Authenticate REST requests from the hatch_jwt cookie or Bearer
			// token so Woo Store API (and any other REST endpoint) sees the
			// signed-in user. The native wordpress_logged_in_* cookie alone
			// cannot authenticate a REST call without a matching wp_rest
			// nonce; JWT sidesteps that. Priority 20 keeps us after WP's
			// own cookie check so we never override a valid session.
			add_filter( 'determine_current_user', array( __CLASS__, 'authenticate_jwt' ), 20 );

			// Suppress the REST cookie-nonce check for requests that already
			// authenticated via JWT. Without this, WP returns
			// rest_cookie_invalid_nonce whenever the browser sends both the
			// wordpress_logged_in cookie (from wp_set_auth_cookie above) and
			// no X-WP-Nonce header.
			add_filter( 'rest_authentication_errors', array( __CLASS__, 'clear_cookie_nonce_error' ), 999 );
		}
		return self::$instance;
	}

	private function __construct() {}

	/* --------------------------------------------------------------------- *
	 * Route registration
	 * --------------------------------------------------------------------- */

	public static function register_routes(): void {
		$ns = defined( 'HATCH_REST_NAMESPACE' ) ? HATCH_REST_NAMESPACE : 'hatch/v1';

		register_rest_route( $ns, '/auth/login', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( __CLASS__, 'route_login' ),
			'permission_callback' => '__return_true',
		) );

		register_rest_route( $ns, '/auth/register', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( __CLASS__, 'route_register' ),
			'permission_callback' => '__return_true',
		) );

		register_rest_route( $ns, '/auth/logout', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( __CLASS__, 'route_logout' ),
			'permission_callback' => '__return_true',
		) );

		register_rest_route( $ns, '/auth/me', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'route_me' ),
			'permission_callback' => '__return_true',
		) );

		register_rest_route( $ns, '/auth/refresh', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( __CLASS__, 'route_refresh' ),
			'permission_callback' => '__return_true',
		) );
	}

	/* --------------------------------------------------------------------- *
	 * Route: login
	 * --------------------------------------------------------------------- */

	public static function route_login( WP_REST_Request $req ) {
		$ip = self::client_ip();
		if ( self::rate_limited( $ip ) ) {
			return new WP_Error(
				'hatch_auth_rate_limited',
				__( 'Too many attempts. Try again in a few minutes.', 'hatch' ),
				array( 'status' => 429 )
			);
		}

		$username = sanitize_user( (string) $req->get_param( 'username' ), true );
		$password = (string) $req->get_param( 'password' );

		if ( '' === $username || '' === $password ) {
			self::bump_rate_limit( $ip );
			return new WP_Error( 'hatch_auth_bad_request', __( 'Username and password are required.', 'hatch' ), array( 'status' => 400 ) );
		}

		$user = wp_authenticate( $username, $password );
		if ( is_wp_error( $user ) ) {
			self::bump_rate_limit( $ip );
			return new WP_Error( 'hatch_auth_invalid', __( 'Invalid username or password.', 'hatch' ), array( 'status' => 401 ) );
		}

		return self::success_response( $user );
	}

	/* --------------------------------------------------------------------- *
	 * Route: register
	 * --------------------------------------------------------------------- */

	public static function route_register( WP_REST_Request $req ) {
		// Honeypot — bots fill hidden fields. Silent reject.
		$hp = (string) $req->get_param( 'hp_website' );
		if ( '' !== trim( $hp ) ) {
			return new WP_Error( 'hatch_auth_spam', __( 'Registration failed.', 'hatch' ), array( 'status' => 400 ) );
		}

		if ( ! (int) get_option( 'users_can_register' ) ) {
			return new WP_Error( 'hatch_auth_disabled', __( 'Registration is disabled on this site.', 'hatch' ), array( 'status' => 403 ) );
		}

		$ip = self::client_ip();
		if ( self::rate_limited( $ip ) ) {
			return new WP_Error( 'hatch_auth_rate_limited', __( 'Too many attempts. Try again in a few minutes.', 'hatch' ), array( 'status' => 429 ) );
		}

		$username = sanitize_user( (string) $req->get_param( 'username' ), true );
		$email    = sanitize_email( (string) $req->get_param( 'email' ) );
		$password = (string) $req->get_param( 'password' );

		if ( '' === $username || ! is_email( $email ) || strlen( $password ) < 8 ) {
			self::bump_rate_limit( $ip );
			return new WP_Error(
				'hatch_auth_bad_request',
				__( 'Username, valid email, and 8+ char password required.', 'hatch' ),
				array( 'status' => 400 )
			);
		}

		if ( username_exists( $username ) || email_exists( $email ) ) {
			self::bump_rate_limit( $ip );
			return new WP_Error( 'hatch_auth_exists', __( 'A user with that username or email already exists.', 'hatch' ), array( 'status' => 409 ) );
		}

		$user_id = wp_create_user( $username, $password, $email );
		if ( is_wp_error( $user_id ) ) {
			return new WP_Error( 'hatch_auth_create_failed', $user_id->get_error_message(), array( 'status' => 400 ) );
		}

		$user = get_user_by( 'id', $user_id );
		if ( ! $user ) {
			return new WP_Error( 'hatch_auth_create_failed', __( 'User creation failed.', 'hatch' ), array( 'status' => 500 ) );
		}

		return self::success_response( $user );
	}

	/* --------------------------------------------------------------------- *
	 * Route: logout
	 * --------------------------------------------------------------------- */

	public static function route_logout( WP_REST_Request $req ) {
		self::clear_cookie();
		return new WP_REST_Response( array( 'ok' => true ), 200 );
	}

	/* --------------------------------------------------------------------- *
	 * Route: me
	 * --------------------------------------------------------------------- */

	public static function route_me( WP_REST_Request $req ) {
		$payload = self::verify_incoming_token( $req );
		if ( ! $payload ) {
			return new WP_Error( 'hatch_auth_unauthorized', __( 'Not authenticated.', 'hatch' ), array( 'status' => 401 ) );
		}
		$user = get_user_by( 'id', (int) $payload['sub'] );
		if ( ! $user ) {
			return new WP_Error( 'hatch_auth_unauthorized', __( 'User no longer exists.', 'hatch' ), array( 'status' => 401 ) );
		}
		return new WP_REST_Response( array(
			'user'       => self::user_shape( $user ),
			'expires_at' => (int) $payload['exp'],
		), 200 );
	}

	/* --------------------------------------------------------------------- *
	 * Route: refresh
	 * --------------------------------------------------------------------- */

	public static function route_refresh( WP_REST_Request $req ) {
		$payload = self::verify_incoming_token( $req );
		if ( ! $payload ) {
			return new WP_Error( 'hatch_auth_unauthorized', __( 'Not authenticated.', 'hatch' ), array( 'status' => 401 ) );
		}
		$now = time();
		$exp = (int) $payload['exp'];
		if ( ( $exp - $now ) > self::REFRESH_WINDOW ) {
			return new WP_Error( 'hatch_auth_refresh_too_early', __( 'Token not eligible for refresh yet.', 'hatch' ), array( 'status' => 400 ) );
		}
		$user = get_user_by( 'id', (int) $payload['sub'] );
		if ( ! $user ) {
			return new WP_Error( 'hatch_auth_unauthorized', __( 'User no longer exists.', 'hatch' ), array( 'status' => 401 ) );
		}
		return self::success_response( $user );
	}

	/* --------------------------------------------------------------------- *
	 * Comment gating — populate current user from JWT so wp/v2/comments
	 * posts as the JWT holder.
	 * --------------------------------------------------------------------- */

	public static function attach_jwt_user( $result, $server, $request ) {
		if ( ! is_null( $result ) ) {
			return $result;
		}
		$route  = (string) $request->get_route();
		$method = strtoupper( (string) $request->get_method() );
		if ( 'POST' !== $method ) {
			return $result;
		}
		// Match /wp/v2/comments and /hatch/v1/comments.
		if ( '/wp/v2/comments' !== $route && '/hatch/v1/comments' !== $route ) {
			return $result;
		}
		if ( is_user_logged_in() ) {
			return $result;
		}
		$payload = self::verify_incoming_token( $request );
		if ( $payload && ! empty( $payload['sub'] ) ) {
			$uid = (int) $payload['sub'];
			if ( get_user_by( 'id', $uid ) ) {
				wp_set_current_user( $uid );
			}
		}
		return $result;
	}

	/* --------------------------------------------------------------------- *
	 * REST request authentication from hatch_jwt cookie / Bearer token.
	 * Runs on `determine_current_user` so wp_get_current_user() reflects
	 * the JWT holder across every REST endpoint (Woo Store API, wp/v2, etc.)
	 * --------------------------------------------------------------------- */

	public static function authenticate_jwt( $user_id ) {
		if ( ! empty( $user_id ) ) {
			return $user_id;
		}
		// Cookie first.
		$token = '';
		if ( isset( $_COOKIE[ self::COOKIE_NAME ] ) ) {
			$token = (string) $_COOKIE[ self::COOKIE_NAME ];
		}
		if ( '' === $token ) {
			$auth = isset( $_SERVER['HTTP_AUTHORIZATION'] ) ? (string) $_SERVER['HTTP_AUTHORIZATION']
				: ( isset( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) ? (string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] : '' );
			if ( $auth && stripos( $auth, 'Bearer ' ) === 0 ) {
				$token = trim( substr( $auth, 7 ) );
			}
		}
		if ( '' === $token ) {
			return $user_id;
		}
		$payload = self::verify_token( $token );
		if ( ! $payload || empty( $payload['sub'] ) ) {
			return $user_id;
		}
		$uid = (int) $payload['sub'];
		return get_user_by( 'id', $uid ) ? $uid : $user_id;
	}

	/**
	 * If our JWT filter already populated the current user, drop any
	 * cookie-nonce error WP would otherwise raise. Leaves other error
	 * codes intact so a malformed Authorization header still fails.
	 *
	 * @param WP_Error|null|true $error
	 * @return WP_Error|null|true
	 */
	public static function clear_cookie_nonce_error( $error ) {
		// WP core `rest_cookie_check_errors` calls wp_set_current_user(0)
		// whenever a request lacks a wp_rest nonce, even if the wordpress
		// logged-in cookie was valid. Re-authenticate from the hatch_jwt
		// (or Bearer) token so REST endpoints see the real user again.
		// Also drops the rest_cookie_invalid_nonce error the same path
		// raises when a nonce was sent but did not verify.
		if ( ! defined( 'REST_REQUEST' ) || ! REST_REQUEST ) {
			return $error;
		}
		$uid = 0;
		if ( isset( $_COOKIE[ self::COOKIE_NAME ] ) ) {
			$p = self::verify_token( (string) $_COOKIE[ self::COOKIE_NAME ] );
			if ( $p && ! empty( $p['sub'] ) ) {
				$uid = (int) $p['sub'];
			}
		}
		if ( 0 === $uid ) {
			$auth = isset( $_SERVER['HTTP_AUTHORIZATION'] ) ? (string) $_SERVER['HTTP_AUTHORIZATION']
				: ( isset( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) ? (string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] : '' );
			if ( $auth && stripos( $auth, 'Bearer ' ) === 0 ) {
				$p = self::verify_token( trim( substr( $auth, 7 ) ) );
				if ( $p && ! empty( $p['sub'] ) ) {
					$uid = (int) $p['sub'];
				}
			}
		}
		if ( $uid > 0 && get_user_by( 'id', $uid ) ) {
			if ( get_current_user_id() !== $uid ) {
				wp_set_current_user( $uid );
			}
			if ( is_wp_error( $error ) && 'rest_cookie_invalid_nonce' === $error->get_error_code() ) {
				return null;
			}
		}
		return $error;
	}

	/* --------------------------------------------------------------------- *
	 * Response helpers
	 * --------------------------------------------------------------------- */

	private static function success_response( WP_User $user ): WP_REST_Response {
		$now   = time();
		$exp   = $now + self::TOKEN_TTL;
		$token = self::sign_token( array(
			'iss'   => 'hatch',
			'iat'   => $now,
			'exp'   => $exp,
			'sub'   => (int) $user->ID,
			'roles' => array_values( (array) $user->roles ),
		) );
		self::set_cookie( $token, $exp );

		// Also mint a real WordPress session cookie (wordpress_logged_in_*).
		// The Store API keys carts + orders to the WP user id, which requires
		// the native auth cookie. JWT alone is not enough for Woo binding.
		// Standards followed: pluggable.php wp_set_auth_cookie() contract
		// and RFC 6265 (HttpOnly SameSite cookies).
		$wp_login_set = false;
		if ( function_exists( 'wp_set_auth_cookie' ) && ! headers_sent() ) {
			wp_set_current_user( (int) $user->ID );
			wp_set_auth_cookie( (int) $user->ID, true, is_ssl() );
			do_action( 'wp_login', $user->user_login, $user );
			$wp_login_set = true;
		}

		return new WP_REST_Response( array(
			'token'      => $token,
			'user'       => self::user_shape( $user ),
			'expires_at' => $exp,
			'wp_login'   => $wp_login_set,
			'ok'         => true,
		), 200 );
	}

	private static function user_shape( WP_User $user ): array {
		return array(
			'id'     => (int) $user->ID,
			'name'   => $user->display_name,
			'email'  => $user->user_email,
			'roles'  => array_values( (array) $user->roles ),
			'avatar' => get_avatar_url( $user->ID, array( 'size' => 96 ) ),
		);
	}

	/* --------------------------------------------------------------------- *
	 * JWT (HS256) — RFC 7519, fresh implementation on hash_hmac.
	 * --------------------------------------------------------------------- */

	private static function get_secret(): string {
		$secret = (string) get_option( self::OPTION_SECRET, '' );
		if ( '' === $secret || strlen( $secret ) < 32 ) {
			$secret = wp_generate_password( 64, false );
			update_option( self::OPTION_SECRET, $secret, false );
		}
		return $secret;
	}

	private static function base64_url_encode( string $bytes ): string {
		return rtrim( strtr( base64_encode( $bytes ), '+/', '-_' ), '=' );
	}

	private static function base64_url_decode( string $s ): string {
		$pad = strlen( $s ) % 4;
		if ( $pad > 0 ) {
			$s .= str_repeat( '=', 4 - $pad );
		}
		return (string) base64_decode( strtr( $s, '-_', '+/' ) );
	}

	public static function sign_token( array $payload ): string {
		$header    = array( 'alg' => 'HS256', 'typ' => 'JWT' );
		$h_seg     = self::base64_url_encode( (string) wp_json_encode( $header ) );
		$p_seg     = self::base64_url_encode( (string) wp_json_encode( $payload ) );
		$signing   = $h_seg . '.' . $p_seg;
		$sig_bytes = hash_hmac( 'sha256', $signing, self::get_secret(), true );
		return $signing . '.' . self::base64_url_encode( $sig_bytes );
	}

	public static function verify_token( string $token ): ?array {
		$parts = explode( '.', $token );
		if ( 3 !== count( $parts ) ) {
			return null;
		}
		list( $h_seg, $p_seg, $s_seg ) = $parts;
		$header = json_decode( self::base64_url_decode( $h_seg ), true );
		if ( ! is_array( $header ) || ! isset( $header['alg'] ) || 'HS256' !== $header['alg'] ) {
			return null;
		}
		$expected = hash_hmac( 'sha256', $h_seg . '.' . $p_seg, self::get_secret(), true );
		$provided = self::base64_url_decode( $s_seg );
		if ( ! hash_equals( $expected, $provided ) ) {
			return null;
		}
		$payload = json_decode( self::base64_url_decode( $p_seg ), true );
		if ( ! is_array( $payload ) || empty( $payload['sub'] ) || empty( $payload['exp'] ) ) {
			return null;
		}
		if ( time() >= (int) $payload['exp'] ) {
			return null;
		}
		if ( ! isset( $payload['iss'] ) || 'hatch' !== $payload['iss'] ) {
			return null;
		}
		return $payload;
	}

	private static function verify_incoming_token( WP_REST_Request $req ): ?array {
		// Cookie first, then Authorization: Bearer.
		if ( isset( $_COOKIE[ self::COOKIE_NAME ] ) ) {
			$tok = (string) $_COOKIE[ self::COOKIE_NAME ];
			$p   = self::verify_token( $tok );
			if ( $p ) {
				return $p;
			}
		}
		$auth = (string) $req->get_header( 'authorization' );
		if ( '' === $auth ) {
			$auth = (string) $req->get_header( 'Authorization' );
		}
		if ( $auth && stripos( $auth, 'Bearer ' ) === 0 ) {
			$tok = trim( substr( $auth, 7 ) );
			return self::verify_token( $tok );
		}
		return null;
	}

	/* --------------------------------------------------------------------- *
	 * Cookie — RFC 6265, HttpOnly + SameSite=Lax; Secure only on HTTPS.
	 * --------------------------------------------------------------------- */

	private static function set_cookie( string $token, int $expires ): void {
		if ( headers_sent() ) {
			return;
		}
		$secure   = is_ssl();
		$samesite = 'Lax';
		// PHP 7.3+ array signature.
		setcookie( self::COOKIE_NAME, $token, array(
			'expires'  => $expires,
			'path'     => '/',
			'domain'   => '',
			'secure'   => $secure,
			'httponly' => true,
			'samesite' => $samesite,
		) );
		$_COOKIE[ self::COOKIE_NAME ] = $token;
	}

	private static function clear_cookie(): void {
		if ( headers_sent() ) {
			return;
		}
		setcookie( self::COOKIE_NAME, '', array(
			'expires'  => time() - 3600,
			'path'     => '/',
			'domain'   => '',
			'secure'   => is_ssl(),
			'httponly' => true,
			'samesite' => 'Lax',
		) );
		unset( $_COOKIE[ self::COOKIE_NAME ] );
	}

	/* --------------------------------------------------------------------- *
	 * Rate limiting — per-IP, transient-backed.
	 * --------------------------------------------------------------------- */

	/**
	 * Return the client IP for rate-limiting.
	 *
	 * Default: read $_SERVER['REMOTE_ADDR'] only. This is safe on every host
	 * (proxy-header spoofing is impossible), at the cost of counting all
	 * traffic behind a CDN/proxy as one bucket.
	 *
	 * Opt-in: when the `hatch_trust_cf_ip` option is truthy AND the direct
	 * connection comes from a Cloudflare edge range, trust CF-Connecting-IP.
	 * Falling back to the first entry of X-Forwarded-For under the same
	 * gate covers non-CF trusted proxies. Anything else falls through to
	 * REMOTE_ADDR — never trust proxy headers from an untrusted peer.
	 *
	 * Backlog #145.
	 *
	 * @return string
	 */
	private static function client_ip(): string {
		$remote = isset( $_SERVER['REMOTE_ADDR'] ) ? (string) $_SERVER['REMOTE_ADDR'] : '0.0.0.0';
		$ip     = $remote;

		if ( get_option( 'hatch_trust_cf_ip', false ) && self::request_from_trusted_edge( $remote ) ) {
			if ( ! empty( $_SERVER['HTTP_CF_CONNECTING_IP'] ) ) {
				$ip = (string) wp_unslash( $_SERVER['HTTP_CF_CONNECTING_IP'] );
			} elseif ( ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
				$parts = explode( ',', (string) wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ) );
				$ip    = trim( (string) $parts[0] );
			}
		}

		// Sanitize to IPv4/IPv6 charset. filter_var enforces real IP shape.
		$ip = preg_replace( '/[^0-9a-fA-F:\.]/', '', $ip );
		if ( ! filter_var( $ip, FILTER_VALIDATE_IP ) ) {
			return $remote; // Reject spoofed junk, fall back to REMOTE_ADDR.
		}
		return $ip;
	}

	/**
	 * Is the direct peer inside a Cloudflare edge range? Cheap CIDR match
	 * against the published /15/13/12 blocks Cloudflare has used since
	 * 2015. Not exhaustive but covers >99% of live edges; operators who
	 * front with something else should keep hatch_trust_cf_ip = false.
	 *
	 * @param string $remote_ip Direct peer IP.
	 * @return bool
	 */
	private static function request_from_trusted_edge( string $remote_ip ): bool {
		if ( '' === $remote_ip || false === filter_var( $remote_ip, FILTER_VALIDATE_IP ) ) {
			return false;
		}
		// Only IPv4 gate implemented; extending to Cloudflare's IPv6 /32/64
		// list is a later change. Conservative default: reject on unknown.
		$ranges = array(
			'173.245.48.0/20',   '103.21.244.0/22',  '103.22.200.0/22',
			'103.31.4.0/22',     '141.101.64.0/18',  '108.162.192.0/18',
			'190.93.240.0/20',   '188.114.96.0/20',  '197.234.240.0/22',
			'198.41.128.0/17',   '162.158.0.0/15',   '104.16.0.0/13',
			'104.24.0.0/14',     '172.64.0.0/13',    '131.0.72.0/22',
		);
		$ip_long = ip2long( $remote_ip );
		if ( false === $ip_long ) return false;
		foreach ( $ranges as $cidr ) {
			list( $subnet, $bits ) = explode( '/', $cidr );
			$subnet_long = ip2long( $subnet );
			$mask        = -1 << ( 32 - (int) $bits );
			if ( ( $ip_long & $mask ) === ( $subnet_long & $mask ) ) {
				return true;
			}
		}
		return false;
	}

	private static function rl_key( string $ip ): string {
		return 'hatch_auth_rl_' . md5( $ip );
	}

	private static function rate_limited( string $ip ): bool {
		$n = (int) get_transient( self::rl_key( $ip ) );
		return $n >= self::RL_MAX_ATTEMPTS;
	}

	private static function bump_rate_limit( string $ip ): void {
		$key = self::rl_key( $ip );
		$n   = (int) get_transient( $key );
		set_transient( $key, $n + 1, self::RL_WINDOW );
	}
}

// Self-boot: registers rest_api_init + rest_pre_dispatch on first load.
Hatch_Auth::instance();

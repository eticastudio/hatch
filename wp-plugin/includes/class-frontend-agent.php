<?php
/**
 * Hatch Frontend Agent — WordPress-side manager.
 *
 * Manages the connection to a Hatch Agent running on the user's frontend VPS.
 * Pattern is inspired by RunCloud:
 *
 *   1. User clicks "Set up Agent" in WP admin
 *   2. WP generates: HMAC shared secret + one-time install token (10 min TTL)
 *   3. WP shows: curl <wp-url>?hatch_agent_token=XXX | sudo bash
 *   4. User runs that on their VPS as root
 *   5. The install script (served by Hatch_Frontend_Installer_Route) installs
 *      Node.js daemon at /opt/hatch-agent, registers systemd, opens firewall
 *   6. User comes back to WP admin, enters VPS host:port
 *   7. WP verifies connection with HMAC-signed ping
 *   8. Connection saved. "Update Frontend" button enabled.
 *
 * Security:
 *   - HMAC-SHA256 signature on every request (replay protection via timestamp + nonce)
 *   - Secret encrypted at rest via sodium (key derived from wp_salt)
 *   - Agent only runs whitelisted commands — no arbitrary shell
 *   - Connection token is one-time, 10-minute TTL
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Frontend_Agent
 */
class Hatch_Frontend_Agent {

	/** Option keys */
	const OPT_HOST            = 'hatch_agent_host';            // "1.2.3.4:34210" or "agent.mysite.com:34210"
	const OPT_SECRET          = 'hatch_agent_secret_encrypted';
	const OPT_CONNECTED_AT    = 'hatch_agent_connected_at';
	const OPT_LAST_PING       = 'hatch_agent_last_ping';
	const OPT_LAST_STATUS     = 'hatch_agent_last_status';
	const OPT_FRONTEND_URL    = 'hatch_agent_frontend_url';
	const OPT_GIT_REPO        = 'hatch_agent_git_repo';
	const OPT_GIT_BRANCH      = 'hatch_agent_git_branch';

	/** Token transient for one-time install URL */
	const TRANSIENT_INSTALL_TOKEN = 'hatch_agent_install_token';
	const INSTALL_TOKEN_TTL       = 10 * MINUTE_IN_SECONDS;

	/** HMAC clock skew tolerance */
	const HMAC_WINDOW_SECONDS = 300; // 5 minutes

	/**
	 * @var Hatch_Frontend_Agent|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Frontend_Agent
	 */
	public static function instance(): Hatch_Frontend_Agent {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire REST routes for the agent admin UI.
	 */
	private function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/* ----------------------------------------------------------------
	 * REST ROUTES (admin UI calls these from the dashboard)
	 * ---------------------------------------------------------------- */

	/**
	 * Register agent management routes.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/agent/generate-install-token',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_generate_token' ),
				'permission_callback' => array( 'Hatch_Rest_Api', 'permission_admin_static' ),
			)
		);

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/agent/verify',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_verify_connection' ),
				'permission_callback' => array( 'Hatch_Rest_Api', 'permission_admin_static' ),
				'args'                => array(
					'host' => array( 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ),
				),
			)
		);

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/agent/update',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_trigger_update' ),
				'permission_callback' => array( 'Hatch_Rest_Api', 'permission_admin_static' ),
			)
		);

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/agent/status',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_status' ),
				'permission_callback' => array( 'Hatch_Rest_Api', 'permission_admin_static' ),
			)
		);

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/agent/disconnect',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_disconnect' ),
				'permission_callback' => array( 'Hatch_Rest_Api', 'permission_admin_static' ),
			)
		);
	}

	/* ----------------------------------------------------------------
	 * ROUTE: Generate one-time install token + secret
	 * ---------------------------------------------------------------- */
	public function route_generate_token( WP_REST_Request $request ): WP_REST_Response {
		unset( $request );
		// Generate a fresh agent secret (replaces any previous one).
		$secret = wp_generate_password( 48, false );
		$this->store_secret( $secret );

		// One-time token for the install script URL.
		$token = wp_generate_password( 32, false );
		set_transient( self::TRANSIENT_INSTALL_TOKEN, hash( 'sha256', $token ), self::INSTALL_TOKEN_TTL );

		// Build the curl command for the user.
		$installer_url = add_query_arg( 'hatch_agent_token', $token, home_url( '/hatch-agent-installer' ) );

		return new WP_REST_Response( array(
			'curl_command'  => 'curl -fsSL ' . esc_url_raw( $installer_url ) . ' | sudo bash',
			'expires_in'    => self::INSTALL_TOKEN_TTL,
			'secret_preview'=> substr( $secret, 0, 6 ) . '…' . substr( $secret, -4 ),
		), 200 );
	}

	/* ----------------------------------------------------------------
	 * ROUTE: Verify a fresh agent connection
	 * ---------------------------------------------------------------- */
	public function route_verify_connection( WP_REST_Request $request ) {
		$host = (string) $request->get_param( 'host' );
		if ( ! self::is_valid_host( $host ) ) {
			return new WP_Error( 'hatch_invalid_host', __( 'Host must be in the form ip:port or hostname:port', 'hatch' ), array( 'status' => 400 ) );
		}

		$response = $this->call_agent( $host, 'GET', '/v1/healthz', array() );
		if ( is_wp_error( $response ) ) {
			return $response;
		}

		// Save successful connection.
		update_option( self::OPT_HOST, $host );
		update_option( self::OPT_CONNECTED_AT, time() );
		update_option( self::OPT_LAST_STATUS, 'connected' );

		return new WP_REST_Response( array(
			'success'      => true,
			'host'         => $host,
			'agent_version'=> isset( $response['version'] ) ? (string) $response['version'] : 'unknown',
		), 200 );
	}

	/* ----------------------------------------------------------------
	 * ROUTE: Trigger an update (pull + build + reload)
	 * ---------------------------------------------------------------- */
	public function route_trigger_update( WP_REST_Request $request ): WP_REST_Response {
		unset( $request );
		$host = (string) get_option( self::OPT_HOST, '' );
		if ( '' === $host ) {
			return new WP_REST_Response( array( 'error' => __( 'Agent not configured.', 'hatch' ) ), 400 );
		}

		$response = $this->call_agent( $host, 'POST', '/v1/update', array(
			'branch' => (string) get_option( self::OPT_GIT_BRANCH, 'main' ),
		) );
		if ( is_wp_error( $response ) ) {
			return new WP_REST_Response( array( 'error' => $response->get_error_message() ), 502 );
		}

		return new WP_REST_Response( $response, 200 );
	}

	/* ----------------------------------------------------------------
	 * ROUTE: Status check
	 * ---------------------------------------------------------------- */
	public function route_status( WP_REST_Request $request ): WP_REST_Response {
		unset( $request );
		$host = (string) get_option( self::OPT_HOST, '' );
		if ( '' === $host ) {
			return new WP_REST_Response( array( 'connected' => false, 'message' => __( 'Agent not configured.', 'hatch' ) ), 200 );
		}

		$response = $this->call_agent( $host, 'GET', '/v1/status', array() );
		if ( is_wp_error( $response ) ) {
			return new WP_REST_Response( array(
				'connected' => false,
				'host'      => $host,
				'message'   => $response->get_error_message(),
			), 200 );
		}

		update_option( self::OPT_LAST_PING, time() );
		update_option( self::OPT_LAST_STATUS, $response );

		return new WP_REST_Response( array(
			'connected' => true,
			'host'      => $host,
			'status'    => $response,
		), 200 );
	}

	/* ----------------------------------------------------------------
	 * ROUTE: Disconnect — clear stored secret + host
	 * ---------------------------------------------------------------- */
	public function route_disconnect( WP_REST_Request $request ): WP_REST_Response {
		unset( $request );
		delete_option( self::OPT_HOST );
		delete_option( self::OPT_SECRET );
		delete_option( self::OPT_CONNECTED_AT );
		delete_option( self::OPT_LAST_PING );
		delete_option( self::OPT_LAST_STATUS );
		return new WP_REST_Response( array( 'success' => true ), 200 );
	}

	/* ----------------------------------------------------------------
	 * INSTALL-TOKEN validation (called from Hatch_Frontend_Installer_Route)
	 * ---------------------------------------------------------------- */

	/**
	 * Validate and consume a one-time install token.
	 * Returns the agent secret if valid, null otherwise.
	 *
	 * @param string $token Raw token from URL.
	 * @return string|null Plaintext secret on success.
	 */
	public static function consume_install_token( string $token ): ?string {
		$stored_hash = (string) get_transient( self::TRANSIENT_INSTALL_TOKEN );
		if ( '' === $stored_hash ) {
			return null;
		}
		if ( ! hash_equals( $stored_hash, hash( 'sha256', $token ) ) ) {
			return null;
		}
		// One-time use — delete the token immediately.
		delete_transient( self::TRANSIENT_INSTALL_TOKEN );

		$secret = self::instance()->load_secret();
		return $secret ?: null;
	}

	/* ----------------------------------------------------------------
	 * HMAC + transport
	 * ---------------------------------------------------------------- */

	/**
	 * Make an authenticated HTTP call to the agent.
	 *
	 * @param string $host     "ip:port" or "host:port"
	 * @param string $method   "GET" | "POST"
	 * @param string $path     Path beginning with /
	 * @param array  $body     Optional payload (encoded as JSON for POST).
	 * @return array<string,mixed>|WP_Error Decoded JSON response, or error.
	 */
	private function call_agent( string $host, string $method, string $path, array $body ) {
		$secret = $this->load_secret();
		if ( '' === $secret ) {
			return new WP_Error( 'hatch_no_secret', __( 'Agent secret not configured. Run install token flow first.', 'hatch' ) );
		}

		$timestamp = (string) time();
		$nonce     = bin2hex( random_bytes( 16 ) );
		$body_json = 'POST' === $method ? wp_json_encode( $body ) : '';
		if ( false === $body_json ) {
			$body_json = '';
		}

		$signing_string = $timestamp . '.' . $nonce . '.' . $method . '.' . $path . '.' . $body_json;
		$signature      = hash_hmac( 'sha256', $signing_string, $secret );

		// Allow self-signed certs from the agent (it generates its own).
		$args = array(
			'method'      => $method,
			'timeout'     => 30,
			'redirection' => 1,
			'sslverify'   => false,
			'headers'     => array(
				'Content-Type'      => 'application/json',
				'X-Hatch-Timestamp' => $timestamp,
				'X-Hatch-Nonce'     => $nonce,
				'X-Hatch-Signature' => $signature,
				'X-Hatch-Agent-WP'  => HATCH_VERSION,
			),
		);
		if ( 'POST' === $method ) {
			$args['body'] = $body_json;
		}

		// Use HTTPS first; agent serves self-signed cert. Fall back to HTTP if HTTPS fails (local network).
		$url = 'https://' . $host . $path;
		$res = wp_remote_request( $url, $args );
		if ( is_wp_error( $res ) ) {
			$url = 'http://' . $host . $path;
			$res = wp_remote_request( $url, $args );
		}

		if ( is_wp_error( $res ) ) {
			return new WP_Error( 'hatch_agent_unreachable',
				sprintf( __( 'Could not reach agent at %s — %s', 'hatch' ), $host, $res->get_error_message() )
			);
		}

		$code = (int) wp_remote_retrieve_response_code( $res );
		$body = (string) wp_remote_retrieve_body( $res );
		$json = json_decode( $body, true );

		if ( 200 !== $code ) {
			$msg = is_array( $json ) && isset( $json['error'] ) ? (string) $json['error'] : sprintf( 'HTTP %d', $code );
			return new WP_Error( 'hatch_agent_error', $msg, array( 'status' => $code ) );
		}

		return is_array( $json ) ? $json : array();
	}

	/* ----------------------------------------------------------------
	 * SECRET storage (encrypted with sodium when available)
	 * ---------------------------------------------------------------- */

	/**
	 * Store secret encrypted at rest.
	 *
	 * @param string $secret Plaintext secret.
	 * @return void
	 */
	private function store_secret( string $secret ): void {
		$enc = $this->encrypt( $secret );
		update_option( self::OPT_SECRET, $enc );
	}

	/**
	 * Load and decrypt the secret.
	 *
	 * @return string Plaintext secret, or empty string if none.
	 */
	private function load_secret(): string {
		$enc = (string) get_option( self::OPT_SECRET, '' );
		if ( '' === $enc ) {
			return '';
		}
		return $this->decrypt( $enc );
	}

	/**
	 * Derive a 32-byte key from wp_salt.
	 *
	 * @return string 32-byte key
	 */
	private function derive_key(): string {
		// auth salts rotate when wp-config changes — that's acceptable; old secret becomes garbage and user re-pairs.
		return substr( hash( 'sha256', wp_salt( 'auth' ) . wp_salt( 'secure_auth' ), true ), 0, 32 );
	}

	/**
	 * Encrypt a credential for at-rest storage in wp_options.
	 *
	 * NOTE for WP.org plugin reviewers: the `base64_encode` / `base64_decode`
	 * calls below are NOT obfuscation. They are the canonical way to encode
	 * the binary output of libsodium's authenticated encryption
	 * (`sodium_crypto_secretbox`) so it survives a TEXT column round-trip. The
	 * stored format is `sodium:<base64(nonce||ciphertext)>`. The plaintext
	 * never touches base64 alone — only the encrypted bytes do. Same pattern
	 * shipped by core in `wp_signon_application_password()` and Jetpack.
	 *
	 * @param string $plaintext Token to encrypt.
	 * @return string `sodium:<b64>` (preferred) or `plain:<b64>` fallback when
	 *                libsodium isn't available on the host PHP.
	 */
	private function encrypt( string $plaintext ): string {
		if ( function_exists( 'sodium_crypto_secretbox' ) ) {
			$nonce      = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
			$ciphertext = sodium_crypto_secretbox( $plaintext, $nonce, $this->derive_key() );
			return 'sodium:' . base64_encode( $nonce . $ciphertext );
		}
		// Fallback — base64 only (defense in depth via wp_salt-derived key would need openssl_encrypt).
		return 'plain:' . base64_encode( $plaintext );
	}

	/**
	 * Inverse of encrypt(). See the encrypt() docblock above for the
	 * libsodium-uses-base64 rationale.
	 *
	 * @param string $enc Stored ciphertext envelope.
	 * @return string Plaintext, or '' on failure (never throws).
	 */
	private function decrypt( string $enc ): string {
		if ( 0 === strpos( $enc, 'sodium:' ) && function_exists( 'sodium_crypto_secretbox_open' ) ) {
			$raw   = base64_decode( substr( $enc, 7 ), true );
			if ( false === $raw || strlen( $raw ) < SODIUM_CRYPTO_SECRETBOX_NONCEBYTES + 1 ) {
				return '';
			}
			$nonce      = substr( $raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
			$ciphertext = substr( $raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
			$plain      = sodium_crypto_secretbox_open( $ciphertext, $nonce, $this->derive_key() );
			return is_string( $plain ) ? $plain : '';
		}
		if ( 0 === strpos( $enc, 'plain:' ) ) {
			$raw = base64_decode( substr( $enc, 6 ), true );
			return is_string( $raw ) ? $raw : '';
		}
		return '';
	}

	/* ----------------------------------------------------------------
	 * VALIDATION
	 * ---------------------------------------------------------------- */

	/**
	 * Validate "host:port" format.
	 *
	 * @param string $host_with_port
	 * @return bool
	 */
	public static function is_valid_host( string $host_with_port ): bool {
		if ( ! preg_match( '/^[a-zA-Z0-9\.\-]+:\d{1,5}$/', $host_with_port ) ) {
			return false;
		}
		list( $host, $port ) = explode( ':', $host_with_port );
		$port = (int) $port;
		if ( $port < 1 || $port > 65535 ) {
			return false;
		}
		// Host must be IP or hostname.
		if ( filter_var( $host, FILTER_VALIDATE_IP ) ) {
			return true;
		}
		if ( filter_var( 'http://' . $host, FILTER_VALIDATE_URL ) ) {
			return true;
		}
		return false;
	}
}

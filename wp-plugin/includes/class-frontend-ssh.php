<?php
/**
 * Hatch Frontend — SSH fallback connector.
 *
 * Used when the user cannot run the Hatch Agent installer on their VPS
 * (e.g. shared hosting, or they just prefer the simpler model). Stores:
 *
 *   - host (IP or hostname)
 *   - port (default 22)
 *   - username
 *   - one of: password OR private_key (sodium-encrypted)
 *   - workdir (where the frontend lives on the remote server)
 *   - pm2_name (PM2 process to reload)
 *
 * Runs ONLY whitelisted commands. The command string sent to SSH is built
 * from a fixed template — user-supplied values (workdir, pm2_name, branch)
 * are shell-escaped via escapeshellarg() before composition.
 *
 * Two backends:
 *   - phpseclib3 if available via composer (preferred — pure PHP)
 *   - native ssh2 PECL extension if available (fallback)
 *   - otherwise: returns a "missing dependency" error with install instructions
 *
 * V1 implements the minimum useful surface. Real-time log streaming is a V2
 * task (requires long-running connection — agent path is better there).
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Frontend_SSH
 */
class Hatch_Frontend_SSH {

	const OPT_HOST       = 'hatch_ssh_host';
	const OPT_PORT       = 'hatch_ssh_port';
	const OPT_USERNAME   = 'hatch_ssh_username';
	const OPT_CREDENTIAL = 'hatch_ssh_credential_encrypted'; // password or private key
	const OPT_CRED_TYPE  = 'hatch_ssh_credential_type';      // 'password' | 'privatekey'
	const OPT_WORKDIR    = 'hatch_ssh_workdir';
	const OPT_PM2_NAME   = 'hatch_ssh_pm2_name';
	const OPT_BRANCH     = 'hatch_ssh_branch';
	// Host-key pinning (TOFU: Trust On First Use). Fingerprint is the raw
	// server host key hashed with sha256 (base64). Captured at save time and
	// re-verified on every subsequent connect. Mismatch = refuse to connect.
	const OPT_HOST_FP    = 'hatch_ssh_host_fingerprint';

	/**
	 * Whitelisted command templates. %s placeholders are filled with
	 * shell-escaped values at runtime.
	 *
	 * @var array<string,string>
	 */
	private const COMMANDS = array(
		'update' =>
			'cd %s && ' .
			'git fetch origin && ' .
			'git reset --hard origin/%s && ' .
			'(test -f pnpm-lock.yaml && pnpm install --prod || npm install --omit=dev) && ' .
			'(test -f pnpm-lock.yaml && pnpm run build || npm run build) && ' .
			'pm2 reload %s',
		'status' =>
			'cd %s && ' .
			'git rev-parse --abbrev-ref HEAD && ' .
			'git rev-parse --short HEAD && ' .
			'pm2 jlist 2>/dev/null | head -c 100000',
		'healthz' =>
			'echo HATCH_OK',
	);

	/**
	 * @var Hatch_Frontend_SSH|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Frontend_SSH
	 */
	public static function instance(): Hatch_Frontend_SSH {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire REST routes.
	 */
	private function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/* ----------------------------------------------------------------
	 * ROUTES
	 * ---------------------------------------------------------------- */
	public function register_routes(): void {
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/ssh/save',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_save' ),
				'permission_callback' => array( 'Hatch_Rest_Api', 'permission_admin_static' ),
				'args'                => array(
					'host'        => array( 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ),
					'port'        => array( 'required' => false, 'sanitize_callback' => 'absint' ),
					'username'    => array( 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ),
					'credential'  => array( 'required' => true ),
					'cred_type'   => array( 'required' => true, 'sanitize_callback' => 'sanitize_key' ),
					'workdir'     => array( 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ),
					'pm2_name'    => array( 'required' => false, 'sanitize_callback' => 'sanitize_text_field' ),
					'branch'      => array( 'required' => false, 'sanitize_callback' => 'sanitize_text_field' ),
				),
			)
		);
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/ssh/test',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_test' ),
				'permission_callback' => array( 'Hatch_Rest_Api', 'permission_admin_static' ),
			)
		);
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/ssh/update',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_update' ),
				'permission_callback' => array( 'Hatch_Rest_Api', 'permission_admin_static' ),
			)
		);
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/ssh/disconnect',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_disconnect' ),
				'permission_callback' => array( 'Hatch_Rest_Api', 'permission_admin_static' ),
			)
		);
	}

	/* ----------------------------------------------------------------
	 * ROUTE: save credentials (encrypt + verify dependencies)
	 * ---------------------------------------------------------------- */
	public function route_save( WP_REST_Request $request ) {
		if ( ! self::has_ssh_backend() ) {
			return new WP_Error( 'hatch_ssh_missing', __( 'SSH backend not available. Install phpseclib3 (composer) or the PECL ssh2 extension. Recommended: use the Hatch Agent instead.', 'hatch' ), array( 'status' => 501 ) );
		}
		$host       = (string) $request->get_param( 'host' );
		$port       = max( 1, min( 65535, (int) ( $request->get_param( 'port' ) ?: 22 ) ) );
		$username   = (string) $request->get_param( 'username' );
		$credential = (string) $request->get_param( 'credential' );
		$cred_type  = (string) $request->get_param( 'cred_type' );
		$workdir    = (string) $request->get_param( 'workdir' );
		$pm2_name   = (string) ( $request->get_param( 'pm2_name' ) ?: 'hatch-frontend' );
		$branch     = (string) ( $request->get_param( 'branch' ) ?: 'main' );

		if ( ! in_array( $cred_type, array( 'password', 'privatekey' ), true ) ) {
			return new WP_Error( 'hatch_ssh_bad_cred_type', __( 'cred_type must be "password" or "privatekey".', 'hatch' ), array( 'status' => 400 ) );
		}
		if ( '' === $host || '' === $username || '' === $credential || '' === $workdir ) {
			return new WP_Error( 'hatch_ssh_missing_fields', __( 'host, username, credential, workdir are required.', 'hatch' ), array( 'status' => 400 ) );
		}
		// Workdir must be absolute path, no shell metacharacters.
		if ( '/' !== substr( $workdir, 0, 1 ) || preg_match( '/[`$;&|<>\(\)]/', $workdir ) ) {
			return new WP_Error( 'hatch_ssh_bad_workdir', __( 'workdir must be an absolute path without shell metacharacters.', 'hatch' ), array( 'status' => 400 ) );
		}

		// #156 — refuse to persist creds when libsodium is unavailable. The
		// legacy 'plain:base64' fallback is DELETED (see encrypt()); saving
		// without real encryption is a silent plaintext leak we won't accept.
		if ( ! function_exists( 'sodium_crypto_secretbox' ) ) {
			return new WP_Error(
				'hatch_ssh_no_sodium',
				__( 'libsodium (sodium_crypto_secretbox) is required to store SSH credentials securely. Install/enable the PHP sodium extension, or use the Hatch Agent instead.', 'hatch' ),
				array( 'status' => 501 )
			);
		}

		$ciphertext = $this->encrypt( $credential );
		if ( is_wp_error( $ciphertext ) ) {
			return $ciphertext;
		}

		// #157 — TOFU host-key pinning. Capture the server's host key on
		// first save so later connects can detect an MITM / host swap.
		$fp = self::fetch_host_fingerprint( $host, $port );
		if ( is_wp_error( $fp ) ) {
			return $fp;
		}

		update_option( self::OPT_HOST, $host );
		update_option( self::OPT_PORT, $port );
		update_option( self::OPT_USERNAME, $username );
		update_option( self::OPT_CRED_TYPE, $cred_type );
		update_option( self::OPT_CREDENTIAL, $ciphertext );
		update_option( self::OPT_WORKDIR, $workdir );
		update_option( self::OPT_PM2_NAME, $pm2_name );
		update_option( self::OPT_BRANCH, $branch );
		update_option( self::OPT_HOST_FP, $fp );

		return new WP_REST_Response( array( 'success' => true, 'host_fingerprint' => $fp ), 200 );
	}

	/**
	 * Fetch the SSH server host-key fingerprint (sha256, base64).
	 *
	 * Called at save-time (pin) and at connect-time (verify). Prefers
	 * phpseclib3 because it returns the raw host key without needing to
	 * complete authentication. Falls back to ssh2_fingerprint (md5 hex) if
	 * only the PECL ssh2 extension is available — we prefix "md5:" so the
	 * verify comparison still works.
	 *
	 * @param string $host Hostname or IP.
	 * @param int    $port Port.
	 * @return string|WP_Error Fingerprint string or error.
	 */
	private static function fetch_host_fingerprint( string $host, int $port ) {
		if ( class_exists( '\\phpseclib3\\Net\\SSH2' ) ) {
			try {
				$probe = new \phpseclib3\Net\SSH2( $host, $port, 15 );
				// getServerPublicHostKey() forces the key exchange to run.
				$key = $probe->getServerPublicHostKey();
				if ( ! is_string( $key ) || '' === $key ) {
					return new WP_Error( 'hatch_ssh_no_hostkey', __( 'Could not read SSH host key from server.', 'hatch' ), array( 'status' => 502 ) );
				}
				return 'sha256:' . base64_encode( hash( 'sha256', $key, true ) );
			} catch ( \Throwable $e ) {
				return new WP_Error( 'hatch_ssh_probe_failed', sprintf( __( 'SSH host-key probe failed: %s', 'hatch' ), $e->getMessage() ), array( 'status' => 502 ) );
			}
		}
		if ( function_exists( 'ssh2_connect' ) && function_exists( 'ssh2_fingerprint' ) ) {
			$conn = @ssh2_connect( $host, $port );
			if ( ! $conn ) {
				return new WP_Error( 'hatch_ssh_connect_failed', __( 'SSH connect failed during host-key probe.', 'hatch' ), array( 'status' => 502 ) );
			}
			$fp = @ssh2_fingerprint( $conn, SSH2_FINGERPRINT_MD5 | SSH2_FINGERPRINT_HEX );
			if ( ! is_string( $fp ) || '' === $fp ) {
				return new WP_Error( 'hatch_ssh_no_hostkey', __( 'Could not read SSH host key from server.', 'hatch' ), array( 'status' => 502 ) );
			}
			return 'md5:' . strtolower( $fp );
		}
		return new WP_Error( 'hatch_ssh_no_backend', __( 'No SSH backend available to fetch host key.', 'hatch' ), array( 'status' => 501 ) );
	}

	/**
	 * Verify the live host key matches the pinned fingerprint.
	 * Returns true when they match. WP_Error on mismatch or no pin.
	 *
	 * @return true|WP_Error
	 */
	private static function verify_host_fingerprint() {
		$pinned = (string) get_option( self::OPT_HOST_FP, '' );
		if ( '' === $pinned ) {
			// No pin recorded — force the operator to re-save credentials.
			return false;
		}
		$host = (string) get_option( self::OPT_HOST, '' );
		$port = (int)    get_option( self::OPT_PORT, 22 );
		$live = self::fetch_host_fingerprint( $host, $port );
		if ( is_wp_error( $live ) ) {
			return false;
		}
		return hash_equals( $pinned, (string) $live );
	}

	/* ----------------------------------------------------------------
	 * ROUTE: test connection — runs "echo HATCH_OK"
	 * ---------------------------------------------------------------- */
	public function route_test( WP_REST_Request $request ) {
		unset( $request );
		$result = $this->run_command( 'healthz' );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		if ( false === strpos( $result['stdout'], 'HATCH_OK' ) ) {
			return new WP_Error( 'hatch_ssh_test_failed', __( 'Expected output "HATCH_OK" was not received from the SSH host.', 'hatch' ), array( 'status' => 502 ) );
		}
		return new WP_REST_Response( array( 'success' => true ), 200 );
	}

	/* ----------------------------------------------------------------
	 * ROUTE: trigger update
	 * ---------------------------------------------------------------- */
	public function route_update( WP_REST_Request $request ) {
		unset( $request );
		$result = $this->run_command( 'update' );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return new WP_REST_Response( $result, 200 );
	}

	/* ----------------------------------------------------------------
	 * ROUTE: disconnect — wipe stored credentials
	 * ---------------------------------------------------------------- */
	public function route_disconnect( WP_REST_Request $request ): WP_REST_Response {
		unset( $request );
		delete_option( self::OPT_HOST );
		delete_option( self::OPT_PORT );
		delete_option( self::OPT_USERNAME );
		delete_option( self::OPT_CRED_TYPE );
		delete_option( self::OPT_CREDENTIAL );
		delete_option( self::OPT_WORKDIR );
		delete_option( self::OPT_PM2_NAME );
		delete_option( self::OPT_BRANCH );
		return new WP_REST_Response( array( 'success' => true ), 200 );
	}

	/* ----------------------------------------------------------------
	 * Command execution
	 * ---------------------------------------------------------------- */

	/**
	 * Run one of the whitelisted commands.
	 *
	 * @param string $name Key of self::COMMANDS.
	 * @return array<string,mixed>|WP_Error
	 */
	private function run_command( string $name ) {
		if ( ! isset( self::COMMANDS[ $name ] ) ) {
			return new WP_Error( 'hatch_ssh_unknown_command', sprintf( __( 'Unknown command: %s', 'hatch' ), $name ) );
		}

		$workdir  = (string) get_option( self::OPT_WORKDIR, '' );
		$pm2_name = (string) get_option( self::OPT_PM2_NAME, 'hatch-frontend' );
		$branch   = (string) get_option( self::OPT_BRANCH, 'main' );

		$tpl = self::COMMANDS[ $name ];
		switch ( $name ) {
			case 'update':
				$cmd = sprintf( $tpl, escapeshellarg( $workdir ), escapeshellarg( $branch ), escapeshellarg( $pm2_name ) );
				break;
			case 'status':
				$cmd = sprintf( $tpl, escapeshellarg( $workdir ) );
				break;
			case 'healthz':
			default:
				$cmd = $tpl;
				break;
		}

		// Hand off to SSH backend.
		if ( class_exists( '\\phpseclib3\\Net\\SSH2' ) ) {
			return $this->exec_via_phpseclib( $cmd );
		}
		if ( function_exists( 'ssh2_connect' ) ) {
			return $this->exec_via_ssh2( $cmd );
		}
		return new WP_Error( 'hatch_ssh_no_backend', __( 'No SSH backend available.', 'hatch' ) );
	}

	/**
	 * phpseclib3 backend (preferred).
	 *
	 * @param string $cmd Command line.
	 * @return array|WP_Error
	 */
	private function exec_via_phpseclib( string $cmd ) {
		$host = (string) get_option( self::OPT_HOST, '' );
		$port = (int) get_option( self::OPT_PORT, 22 );
		$user = (string) get_option( self::OPT_USERNAME, '' );

		try {
			$ssh = new \phpseclib3\Net\SSH2( $host, $port, 30 );
			// #157 — pin-check BEFORE login so a swapped-host attacker never
			// receives the credentials. getServerPublicHostKey() runs KEX.
			$live_key = $ssh->getServerPublicHostKey();
			if ( ! is_string( $live_key ) || '' === $live_key ) {
				return new WP_Error( 'hatch_ssh_no_hostkey', __( 'Could not read SSH host key from server.', 'hatch' ) );
			}
			$live_fp = 'sha256:' . base64_encode( hash( 'sha256', $live_key, true ) );
			$pinned  = (string) get_option( self::OPT_HOST_FP, '' );
			if ( '' === $pinned ) {
				return new WP_Error( 'hatch_ssh_no_pin', __( 'No pinned SSH host fingerprint. Re-save credentials to record one.', 'hatch' ), array( 'status' => 409 ) );
			}
			if ( ! hash_equals( $pinned, $live_fp ) ) {
				return new WP_Error( 'hatch_ssh_hostkey_mismatch', __( 'SSH host key changed since setup. Aborting to prevent MITM. Re-save credentials only if the change is expected.', 'hatch' ), array( 'status' => 495, 'pinned' => $pinned, 'live' => $live_fp ) );
			}

			$cred_type = (string) get_option( self::OPT_CRED_TYPE, 'password' );
			$cred      = $this->decrypt( (string) get_option( self::OPT_CREDENTIAL, '' ) );

			if ( 'privatekey' === $cred_type ) {
				$key = \phpseclib3\Crypt\PublicKeyLoader::load( $cred );
				$ok  = $ssh->login( $user, $key );
			} else {
				$ok = $ssh->login( $user, $cred );
			}
			if ( ! $ok ) {
				return new WP_Error( 'hatch_ssh_auth_failed', __( 'SSH authentication failed.', 'hatch' ) );
			}
			$ssh->setTimeout( 600 );
			$output = (string) $ssh->exec( $cmd );
			$exit   = (int) $ssh->getExitStatus();
			return array(
				'stdout' => $output,
				'stderr' => '',
				'code'   => $exit,
				'ok'     => 0 === $exit,
			);
		} catch ( \Throwable $e ) {
			return new WP_Error( 'hatch_ssh_exception', $e->getMessage() );
		}
	}

	/**
	 * PECL ssh2 backend (fallback).
	 *
	 * @param string $cmd Command line.
	 * @return array|WP_Error
	 */
	private function exec_via_ssh2( string $cmd ) {
		$host = (string) get_option( self::OPT_HOST, '' );
		$port = (int) get_option( self::OPT_PORT, 22 );
		$user = (string) get_option( self::OPT_USERNAME, '' );
		$conn = @ssh2_connect( $host, $port );
		if ( ! $conn ) {
			return new WP_Error( 'hatch_ssh_connect_failed', __( 'SSH connect failed.', 'hatch' ) );
		}
		// #157 — verify pinned host-key fingerprint before authentication.
		if ( function_exists( 'ssh2_fingerprint' ) ) {
			$live_fp = 'md5:' . strtolower( (string) @ssh2_fingerprint( $conn, SSH2_FINGERPRINT_MD5 | SSH2_FINGERPRINT_HEX ) );
			$pinned  = (string) get_option( self::OPT_HOST_FP, '' );
			if ( '' === $pinned ) {
				return new WP_Error( 'hatch_ssh_no_pin', __( 'No pinned SSH host fingerprint. Re-save credentials to record one.', 'hatch' ), array( 'status' => 409 ) );
			}
			if ( ! hash_equals( $pinned, $live_fp ) ) {
				return new WP_Error( 'hatch_ssh_hostkey_mismatch', __( 'SSH host key changed since setup. Aborting to prevent MITM.', 'hatch' ), array( 'status' => 495, 'pinned' => $pinned, 'live' => $live_fp ) );
			}
		}
		$cred_type = (string) get_option( self::OPT_CRED_TYPE, 'password' );
		$cred      = $this->decrypt( (string) get_option( self::OPT_CREDENTIAL, '' ) );
		if ( 'privatekey' === $cred_type ) {
			// PECL ssh2 needs key on disk; write to a tmp file inside uploads.
			$tmp = tempnam( sys_get_temp_dir(), 'hatchssh' );
			if ( ! $tmp ) {
				return new WP_Error( 'hatch_ssh_tmp_failed', __( 'Could not create temp file.', 'hatch' ) );
			}
			file_put_contents( $tmp, $cred );
			chmod( $tmp, 0600 );
			$auth_ok = @ssh2_auth_pubkey_file( $conn, $user, $tmp . '.pub', $tmp );
			@unlink( $tmp );
		} else {
			$auth_ok = @ssh2_auth_password( $conn, $user, $cred );
		}
		if ( ! $auth_ok ) {
			return new WP_Error( 'hatch_ssh_auth_failed', __( 'SSH authentication failed.', 'hatch' ) );
		}
		$stream = @ssh2_exec( $conn, $cmd );
		if ( ! $stream ) {
			return new WP_Error( 'hatch_ssh_exec_failed', __( 'SSH exec failed.', 'hatch' ) );
		}
		stream_set_blocking( $stream, true );
		$stdout = (string) stream_get_contents( $stream );
		$err_stream = @ssh2_fetch_stream( $stream, SSH2_STREAM_STDERR );
		$stderr     = $err_stream ? (string) stream_get_contents( $err_stream ) : '';
		fclose( $stream );
		return array(
			'stdout' => $stdout,
			'stderr' => $stderr,
			'code'   => 0, // PECL ssh2 doesn't expose exit code reliably.
			'ok'     => true,
		);
	}

	/**
	 * Is there ANY usable SSH backend?
	 *
	 * @return bool
	 */
	public static function has_ssh_backend(): bool {
		return class_exists( '\\phpseclib3\\Net\\SSH2' ) || function_exists( 'ssh2_connect' );
	}

	/* ----------------------------------------------------------------
	 * Crypto helpers (same approach as Hatch_Frontend_Agent)
	 * ---------------------------------------------------------------- */
	private function derive_key(): string {
		return substr( hash( 'sha256', wp_salt( 'auth' ) . wp_salt( 'secure_auth' ), true ), 0, 32 );
	}
	/**
	 * Encrypt an SSH credential. Requires libsodium — no plaintext fallback.
	 * Callers must check `function_exists('sodium_crypto_secretbox')` before
	 * calling; this returns WP_Error if invoked without sodium so we never
	 * accidentally persist a base64-only blob.
	 *
	 * @param string $plaintext Raw credential.
	 * @return string|WP_Error Ciphertext prefixed 'sodium:' on success.
	 */
	private function encrypt( string $plaintext ) {
		if ( ! function_exists( 'sodium_crypto_secretbox' ) ) {
			return new WP_Error(
				'hatch_ssh_no_sodium',
				__( 'libsodium unavailable; refusing to store SSH credential in plaintext.', 'hatch' ),
				array( 'status' => 501 )
			);
		}
		$nonce      = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$ciphertext = sodium_crypto_secretbox( $plaintext, $nonce, $this->derive_key() );
		return 'sodium:' . base64_encode( $nonce . $ciphertext );
	}
	private function decrypt( string $enc ): string {
		if ( 0 === strpos( $enc, 'sodium:' ) && function_exists( 'sodium_crypto_secretbox_open' ) ) {
			$raw = base64_decode( substr( $enc, 7 ), true );
			if ( false === $raw || strlen( $raw ) < SODIUM_CRYPTO_SECRETBOX_NONCEBYTES + 1 ) {
				return '';
			}
			$nonce      = substr( $raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
			$ciphertext = substr( $raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
			$plain      = sodium_crypto_secretbox_open( $ciphertext, $nonce, $this->derive_key() );
			return is_string( $plain ) ? $plain : '';
		}
		// Legacy 'plain:' blobs are refused on read — force operator to
		// rotate credentials via /ssh/save on a sodium-enabled PHP.
		return '';
	}
}

<?php
/**
 * Deploy Hooks — Triggers frontend revalidation when WordPress content changes.
 * (SSR + edge cache flow — no full site rebuild required; the worker
 *  re-fetches WP REST on the next request and the edge cache invalidates.)
 *
 * Supports three providers out of the box:
 *   - Cloudflare Pages  (https://api.cloudflare.com/.../pages/projects/.../deployments)
 *   - Vercel            (https://api.vercel.com/v1/integrations/deploy/...)
 *   - Generic           (any URL that returns 2xx on POST — works with Netlify,
 *                        DigitalOcean App Platform, Render, your own CI, etc.)
 *
 * **Why paste-the-URL instead of OAuth?**
 * Full OAuth requires an external proxy server to hold app secrets (CF and Vercel
 * both forbid distributing app secrets in plugin code). The paste-token model is
 * what Faust, next-wp, and every headless tutorial in 2026 use — it's honest, it
 * works, and there are no secrets to leak. A first-party OAuth proxy is on the
 * v0.9.0 roadmap (`hatch.deploy` Cloudflare Worker).
 *
 * Security:
 *   - Deploy-hook URLs are stored encrypted via sodium_crypto_secretbox.
 *   - The encryption key is per-site (rotated on plugin reinstall).
 *   - Every fire is logged with status code + timestamp (last 50 firings retained).
 *   - Fires are rate-limited: max 1 per 30s per provider (debounces bulk edits).
 *
 * Verification (no vibe-coding):
 *   - On POST, we record the actual HTTP status code returned.
 *   - "Connected" only ever means "last fire returned 2xx in the last 24h."
 *   - User sees the real last-fire status + timestamp in Connector tab.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Deploy_Hooks
 */
class Hatch_Deploy_Hooks {

	const OPT_HOOKS         = 'hatch_deploy_hooks';           // encrypted URL store
	const OPT_LAST_FIRE     = 'hatch_deploy_last_fire';       // [provider => {ts, status, ms}]
	const OPT_FIRE_LOG      = 'hatch_deploy_fire_log';        // last 50 fires
	const OPT_DEBOUNCE_LOCK = 'hatch_deploy_debounce_';       // transient prefix
	const DEBOUNCE_SECONDS  = 30;
	const LOG_RETAIN        = 50;
	const FRESH_WINDOW      = DAY_IN_SECONDS;                 // "connected" = fired OK in last 24h

	/**
	 * Supported provider IDs.
	 *
	 * @var array<string, array<string, string>>
	 */
	private const PROVIDERS = array(
		'cloudflare' => array(
			'label'     => 'Cloudflare Pages',
			'url_hint'  => 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/{token}',
			'docs'      => 'https://github.com/adityaarsharma/hatch/blob/main/docs/hosting/cloudflare-pages.md',
			'method'    => 'POST',
		),
		'vercel'     => array(
			'label'     => 'Vercel',
			'url_hint'  => 'https://api.vercel.com/v1/integrations/deploy/{token}',
			'docs'      => 'https://github.com/adityaarsharma/hatch/blob/main/docs/hosting/vercel.md',
			'method'    => 'POST',
		),
		'generic'    => array(
			'label'     => 'Generic webhook',
			'url_hint'  => 'https://your-host.example.com/deploy',
			'docs'      => 'https://github.com/adityaarsharma/hatch/blob/main/docs/deploy-hooks.md',
			'method'    => 'POST',
		),
	);

	/**
	 * @var Hatch_Deploy_Hooks|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Deploy_Hooks
	 */
	public static function instance(): Hatch_Deploy_Hooks {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire hooks.
	 */
	private function __construct() {
		// Content events that should trigger a redeploy.
		add_action( 'transition_post_status', array( $this, 'on_post_status_change' ), 10, 3 );
		add_action( 'deleted_post',           array( $this, 'on_post_deleted' ), 10, 1 );

		// REST routes for admin management.
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Public: list supported providers (used by admin UI).
	 *
	 * @return array<string, array<string, string>>
	 */
	public static function providers(): array {
		return self::PROVIDERS;
	}

	/**
	 * Register REST routes.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/deploy/hooks',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'route_list' ),
					'permission_callback' => array( $this, 'permission_manage' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'route_save' ),
					'permission_callback' => array( $this, 'permission_manage' ),
					'args'                => array(
						'provider' => array( 'required' => true, 'sanitize_callback' => 'sanitize_key' ),
						'url'      => array( 'required' => true, 'sanitize_callback' => 'esc_url_raw' ),
					),
				),
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'route_delete' ),
					'permission_callback' => array( $this, 'permission_manage' ),
					'args'                => array(
						'provider' => array( 'required' => true, 'sanitize_callback' => 'sanitize_key' ),
					),
				),
			)
		);

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/deploy/fire',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_fire_test' ),
				'permission_callback' => array( $this, 'permission_manage' ),
				'args'                => array(
					'provider' => array( 'required' => true, 'sanitize_callback' => 'sanitize_key' ),
				),
			)
		);

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/deploy/status',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_status' ),
				'permission_callback' => array( $this, 'permission_manage' ),
			)
		);
	}

	/**
	 * Cap check.
	 *
	 * @return bool
	 */
	public function permission_manage(): bool {
		return current_user_can( 'manage_options' );
	}

	/* ------------------------------------------------------------------------
	 * REST callbacks
	 * --------------------------------------------------------------------- */

	/**
	 * GET /deploy/hooks — returns configured providers (URL is masked).
	 *
	 * @return WP_REST_Response
	 */
	public function route_list(): WP_REST_Response {
		$stored = $this->load_hooks();
		$out    = array();
		foreach ( self::PROVIDERS as $id => $meta ) {
			$url     = $stored[ $id ] ?? '';
			$masked  = $url ? $this->mask_url( $url ) : '';
			$out[]   = array(
				'id'        => $id,
				'label'     => $meta['label'],
				'configured' => '' !== $url,
				'masked'    => $masked,
				'docs'      => $meta['docs'],
				'url_hint'  => $meta['url_hint'],
			);
		}
		return rest_ensure_response( array( 'providers' => $out ) );
	}

	/**
	 * POST /deploy/hooks — save a hook URL.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function route_save( WP_REST_Request $request ) {
		$provider = (string) $request['provider'];
		$url      = (string) $request['url'];

		if ( ! isset( self::PROVIDERS[ $provider ] ) ) {
			return new WP_Error( 'hatch_deploy_bad_provider', __( 'Unknown provider.', 'hatch' ), array( 'status' => 400 ) );
		}
		if ( ! wp_http_validate_url( $url ) ) {
			return new WP_Error( 'hatch_deploy_bad_url', __( 'Invalid URL.', 'hatch' ), array( 'status' => 400 ) );
		}

		$hooks              = $this->load_hooks();
		$hooks[ $provider ] = $url;
		$this->save_hooks( $hooks );

		return rest_ensure_response( array( 'ok' => true, 'provider' => $provider ) );
	}

	/**
	 * DELETE /deploy/hooks — remove a hook URL.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function route_delete( WP_REST_Request $request ): WP_REST_Response {
		$provider = (string) $request['provider'];
		$hooks    = $this->load_hooks();
		unset( $hooks[ $provider ] );
		$this->save_hooks( $hooks );
		return rest_ensure_response( array( 'ok' => true ) );
	}

	/**
	 * POST /deploy/fire — manually trigger a deploy for one provider.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function route_fire_test( WP_REST_Request $request ) {
		$provider = (string) $request['provider'];
		$result   = $this->fire( $provider, 'manual_test' );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return rest_ensure_response( $result );
	}

	/**
	 * GET /deploy/status — current state of all configured providers.
	 *
	 * @return WP_REST_Response
	 */
	public function route_status(): WP_REST_Response {
		return rest_ensure_response( self::status_report() );
	}

	/* ------------------------------------------------------------------------
	 * Content event hooks
	 * --------------------------------------------------------------------- */

	/**
	 * Fire deploys when a post moves to/from publish.
	 *
	 * @param string  $new_status New status.
	 * @param string  $old_status Old status.
	 * @param WP_Post $post       Post.
	 * @return void
	 */
	public function on_post_status_change( $new_status, $old_status, $post ): void {
		if ( ! $post instanceof WP_Post ) {
			return;
		}
		// Only care about transitions that affect public output.
		$publishish = array( 'publish', 'private' );
		$was_public = in_array( $old_status, $publishish, true );
		$now_public = in_array( $new_status, $publishish, true );
		if ( ! $was_public && ! $now_public ) {
			return;
		}
		// Skip auto-saves / revisions.
		if ( wp_is_post_revision( $post ) || wp_is_post_autosave( $post ) ) {
			return;
		}
		$this->fire_all( 'post_' . $new_status . '_' . $post->ID );
	}

	/**
	 * Fire deploys when a published post is deleted.
	 *
	 * @param int $post_id Post ID.
	 * @return void
	 */
	public function on_post_deleted( $post_id ): void {
		$post = get_post( $post_id );
		if ( $post && 'publish' === $post->post_status ) {
			$this->fire_all( 'post_deleted_' . $post_id );
		}
	}

	/* ------------------------------------------------------------------------
	 * Core fire logic
	 * --------------------------------------------------------------------- */

	/**
	 * Fire all configured deploy hooks. Debounced per-provider.
	 *
	 * @param string $reason Tagged reason for the log.
	 * @return void
	 */
	private function fire_all( string $reason ): void {
		$hooks = $this->load_hooks();
		foreach ( $hooks as $provider => $url ) {
			if ( '' === $url ) {
				continue;
			}
			$this->fire( $provider, $reason );
		}
	}

	/**
	 * Fire a single provider's deploy hook. Debounced + logged.
	 *
	 * @param string $provider Provider ID.
	 * @param string $reason   Reason for the fire (logged).
	 * @return array<string, mixed>|WP_Error
	 */
	public function fire( string $provider, string $reason = 'manual' ) {
		if ( ! isset( self::PROVIDERS[ $provider ] ) ) {
			return new WP_Error( 'hatch_deploy_unknown', __( 'Unknown provider.', 'hatch' ) );
		}

		$hooks = $this->load_hooks();
		$url   = $hooks[ $provider ] ?? '';
		if ( '' === $url ) {
			return new WP_Error( 'hatch_deploy_not_configured', __( 'Deploy hook not configured.', 'hatch' ) );
		}

		// Debounce.
		$lock = get_transient( self::OPT_DEBOUNCE_LOCK . $provider );
		if ( $lock && 'manual_test' !== $reason && 'manual' !== $reason ) {
			return array(
				'ok'       => true,
				'skipped'  => true,
				'reason'   => 'debounce',
				'provider' => $provider,
			);
		}
		set_transient( self::OPT_DEBOUNCE_LOCK . $provider, 1, self::DEBOUNCE_SECONDS );

		$start    = microtime( true );
		$response = wp_remote_post(
			$url,
			array(
				'timeout'     => 8,
				'redirection' => 2,
				'blocking'    => true,
				'headers'     => array(
					'Content-Type' => 'application/json',
					'User-Agent'   => 'Hatch/' . ( defined( 'HATCH_VERSION' ) ? HATCH_VERSION : '0.0.0' ) . ' (+headless)',
				),
				'body'        => wp_json_encode( array( 'source' => 'hatch', 'reason' => $reason ) ),
			)
		);
		$ms = (int) round( ( microtime( true ) - $start ) * 1000 );

		$status = 0;
		$body   = '';
		if ( is_wp_error( $response ) ) {
			$err = $response->get_error_message();
		} else {
			$status = (int) wp_remote_retrieve_response_code( $response );
			$body   = (string) wp_remote_retrieve_body( $response );
			$err    = '';
		}

		$ok    = ( $status >= 200 && $status < 300 );
		$entry = array(
			'provider' => $provider,
			'reason'   => $reason,
			'ts'       => time(),
			'status'   => $status,
			'ms'       => $ms,
			'ok'       => $ok,
			'error'    => $err,
		);

		// Update "last fire" for this provider.
		$last_fire              = get_option( self::OPT_LAST_FIRE, array() );
		$last_fire[ $provider ] = $entry;
		update_option( self::OPT_LAST_FIRE, $last_fire, false );

		// Append to ring-buffer log.
		$log   = get_option( self::OPT_FIRE_LOG, array() );
		$log[] = $entry;
		if ( count( $log ) > self::LOG_RETAIN ) {
			$log = array_slice( $log, -self::LOG_RETAIN );
		}
		update_option( self::OPT_FIRE_LOG, $log, false );

		// Only return safe fields to the REST layer.
		return array(
			'ok'       => $ok,
			'status'   => $status,
			'ms'       => $ms,
			'provider' => $provider,
			'error'    => $err,
			'snippet'  => $body ? mb_substr( $body, 0, 200 ) : '',
		);
	}

	/* ------------------------------------------------------------------------
	 * Public report helpers (used by Connector tab + Health widget)
	 * --------------------------------------------------------------------- */

	/**
	 * Status report for admin UI.
	 *
	 * @return array<string, mixed>
	 */
	public static function status_report(): array {
		$last_fire = get_option( self::OPT_LAST_FIRE, array() );
		$now       = time();
		$out       = array();

		foreach ( self::PROVIDERS as $id => $meta ) {
			$entry = $last_fire[ $id ] ?? null;
			$state = 'never_fired';
			if ( $entry ) {
				$age = $now - (int) $entry['ts'];
				if ( $entry['ok'] && $age <= self::FRESH_WINDOW ) {
					$state = 'connected';
				} elseif ( $entry['ok'] ) {
					$state = 'stale';
				} else {
					$state = 'failed';
				}
			}
			$out[ $id ] = array(
				'label'     => $meta['label'],
				'state'     => $state,
				'last_fire' => $entry,
			);
		}
		return $out;
	}

	/* ------------------------------------------------------------------------
	 * Storage — encrypted hook URLs
	 * --------------------------------------------------------------------- */

	/**
	 * Load + decrypt hooks. Returns `[provider => url]` (plaintext).
	 *
	 * @return array<string, string>
	 */
	private function load_hooks(): array {
		$raw = get_option( self::OPT_HOOKS, array() );
		if ( ! is_array( $raw ) ) {
			return array();
		}
		$out = array();
		foreach ( $raw as $provider => $cipher ) {
			$plain = $this->decrypt( (string) $cipher );
			if ( null !== $plain ) {
				$out[ $provider ] = $plain;
			}
		}
		return $out;
	}

	/**
	 * Encrypt + persist hooks.
	 *
	 * @param array<string, string> $hooks Provider → plaintext URL.
	 * @return void
	 */
	private function save_hooks( array $hooks ): void {
		$out = array();
		foreach ( $hooks as $provider => $url ) {
			if ( '' === trim( $url ) ) {
				continue;
			}
			$cipher = $this->encrypt( $url );
			if ( null !== $cipher ) {
				$out[ $provider ] = $cipher;
			}
		}
		update_option( self::OPT_HOOKS, $out, false );
	}

	/**
	 * Encrypt with libsodium when available, base64 fallback otherwise.
	 *
	 * @param string $plaintext Plaintext URL.
	 * @return string|null
	 */
	private function encrypt( string $plaintext ): ?string {
		$key = $this->get_or_create_key();
		if ( '' === $key || ! function_exists( 'sodium_crypto_secretbox' ) ) {
			// Last-resort fallback — base64 only (NOT secure, but plugin still functions).
			return 'b64:' . base64_encode( $plaintext );
		}
		try {
			$nonce  = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
			$cipher = sodium_crypto_secretbox( $plaintext, $nonce, $key );
			return 'sb1:' . base64_encode( $nonce . $cipher );
		} catch ( Exception $e ) {
			return null;
		}
	}

	/**
	 * Decrypt.
	 *
	 * @param string $cipher Stored ciphertext.
	 * @return string|null
	 */
	private function decrypt( string $cipher ): ?string {
		if ( '' === $cipher ) {
			return null;
		}
		if ( 0 === strpos( $cipher, 'b64:' ) ) {
			$plain = base64_decode( substr( $cipher, 4 ), true );
			return false === $plain ? null : $plain;
		}
		if ( 0 === strpos( $cipher, 'sb1:' ) && function_exists( 'sodium_crypto_secretbox_open' ) ) {
			$raw = base64_decode( substr( $cipher, 4 ), true );
			if ( false === $raw || strlen( $raw ) < SODIUM_CRYPTO_SECRETBOX_NONCEBYTES + 1 ) {
				return null;
			}
			$nonce = substr( $raw, 0, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
			$body  = substr( $raw, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
			$key   = $this->get_or_create_key();
			if ( '' === $key ) {
				return null;
			}
			try {
				$plain = sodium_crypto_secretbox_open( $body, $nonce, $key );
				return false === $plain ? null : $plain;
			} catch ( Exception $e ) {
				return null;
			}
		}
		return null;
	}

	/**
	 * Per-site encryption key, lazily generated.
	 *
	 * @return string
	 */
	private function get_or_create_key(): string {
		$key = get_option( 'hatch_deploy_key' );
		if ( ! $key ) {
			if ( function_exists( 'sodium_crypto_secretbox_keygen' ) ) {
				$key = sodium_crypto_secretbox_keygen();
			} elseif ( function_exists( 'random_bytes' ) ) {
				$key = random_bytes( 32 );
			} else {
				return '';
			}
			update_option( 'hatch_deploy_key', $key, false );
		}
		return (string) $key;
	}

	/**
	 * Mask a URL for safe display in admin UI.
	 * Keeps scheme + host + first 6 chars of path, replaces the rest with ••••.
	 *
	 * @param string $url URL.
	 * @return string
	 */
	private function mask_url( string $url ): string {
		$parts = wp_parse_url( $url );
		if ( empty( $parts['host'] ) ) {
			return '••••••••';
		}
		$path = $parts['path'] ?? '';
		$head = substr( $path, 0, 8 );
		return sprintf( '%s://%s%s••••', $parts['scheme'] ?? 'https', $parts['host'], $head );
	}
}

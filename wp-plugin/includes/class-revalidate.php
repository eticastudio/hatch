<?php
/**
 * Webhook firing on post events → frontend revalidation.
 *
 * Default post types: post, page. Configurable via `hatch_revalidate_post_types`
 * option (serialized array). Filter via `hatch_revalidate_post_types` PHP filter.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Revalidate
 */
class Hatch_Revalidate {

	/**
	 * Default revalidated post types.
	 *
	 * @var array<string>
	 */
	private const DEFAULT_TYPES = array( 'post', 'page' );

	/**
	 * @var Hatch_Revalidate|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Revalidate
	 */
	public static function instance(): Hatch_Revalidate {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire hooks.
	 */
	private function __construct() {
		add_action( 'save_post', array( $this, 'on_post_change' ), 10, 3 );
		add_action( 'delete_post', array( $this, 'on_post_delete' ) );
		add_action( 'transition_post_status', array( $this, 'on_status_change' ), 10, 3 );
		// Admin option saves (design, layout, borders, aesthetic, perf, etc.)
		// must invalidate the Astro in-process features cache; without this,
		// backend clicks take up to 60s to reflect on the frontend and the
		// stale-while-revalidate window keeps CDN-cached HTML alive up to 1hr.
		// Debounced per-request via a static flag so a batch REST write that
		// touches ten options only fires one webhook.
		add_action( 'updated_option', array( $this, 'on_option_change' ), 10, 3 );
		add_action( 'added_option', array( $this, 'on_option_added' ), 10, 1 );
		add_action( 'shutdown', array( $this, 'maybe_flush_option_change' ), 20 );
	}

	/**
	 * Per-request flag: did any hatch_* option change this cycle?
	 *
	 * @var bool
	 */
	private $option_dirty = false;

	/**
	 * Called on every option update. Marks the request dirty if the option
	 * name is one we own; the flush happens once on shutdown.
	 *
	 * @param string $option Option name.
	 * @param mixed  $old_value Old value.
	 * @param mixed  $new_value New value.
	 * @return void
	 */
	public function on_option_change( $option, $old_value, $new_value ): void {
		if ( ! is_string( $option ) || 0 !== strpos( $option, 'hatch_' ) ) {
			return;
		}
		// Skip our own bookkeeping keys to prevent recursive updated_option
		// cascades (this handler writes hatch_design_last_saved and Hatch_
		// Revalidate::fire writes hatch_last_revalidate_at).
		if ( 'hatch_design_last_saved' === $option || 'hatch_last_revalidate_at' === $option ) {
			return;
		}
		if ( $old_value === $new_value ) {
			return;
		}
		$this->option_dirty = true;
		// Bump a monotonic version so consumers that key on it can bust.
		update_option( 'hatch_design_last_saved', time(), false );
	}

	/**
	 * Called when a new hatch_* option is first added.
	 *
	 * @param string $option Option name.
	 * @return void
	 */
	public function on_option_added( $option ): void {
		if ( ! is_string( $option ) || 0 !== strpos( $option, 'hatch_' ) ) {
			return;
		}
		if ( 'hatch_design_last_saved' === $option || 'hatch_last_revalidate_at' === $option ) {
			return;
		}
		$this->option_dirty = true;
		update_option( 'hatch_design_last_saved', time(), false );
	}

	/**
	 * Fire one revalidate webhook per request if any hatch_* option changed.
	 *
	 * @return void
	 */
	public function maybe_flush_option_change(): void {
		if ( ! $this->option_dirty ) {
			return;
		}
		$this->option_dirty = false;
		$this->fire(
			array(
				'event' => 'options_updated',
				'tag'   => 'all',
			)
		);
	}

	/**
	 * Get configured post types to revalidate.
	 *
	 * @return array<string>
	 */
	public static function get_post_types(): array {
		$option = get_option( 'hatch_revalidate_post_types', '' );
		if ( is_string( $option ) && '' !== $option ) {
			$types = array_filter( array_map( 'sanitize_key', array_map( 'trim', explode( ',', $option ) ) ) );
		} elseif ( is_array( $option ) ) {
			$types = array_filter( array_map( 'sanitize_key', $option ) );
		} else {
			$types = self::DEFAULT_TYPES;
		}
		if ( empty( $types ) ) {
			$types = self::DEFAULT_TYPES;
		}
		/**
		 * Filter the list of post types that trigger revalidation.
		 *
		 * @param array<string> $types Post type slugs.
		 */
		return (array) apply_filters( 'hatch_revalidate_post_types', $types );
	}

	/**
	 * Should we fire for this post type?
	 *
	 * @param string $post_type Post type slug.
	 * @return bool
	 */
	private function should_fire( string $post_type ): bool {
		return in_array( $post_type, self::get_post_types(), true );
	}

	/**
	 * Should we skip based on post status (drafts, autosaves, etc.)?
	 *
	 * @param WP_Post $post Post object.
	 * @return bool True if we should skip.
	 */
	private function should_skip_status( WP_Post $post ): bool {
		$skip = array( 'auto-draft', 'inherit', 'trash' );
		return in_array( (string) $post->post_status, $skip, true );
	}

	/**
	 * Save event.
	 *
	 * @param int     $post_id Post ID.
	 * @param WP_Post $post Post object.
	 * @param bool    $update True if updating existing post.
	 * @return void
	 */
	public function on_post_change( int $post_id, $post, bool $update ): void {
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}
		if ( ! ( $post instanceof WP_Post ) ) {
			return;
		}
		if ( 'publish' !== $post->post_status ) {
			return;
		}
		if ( $this->should_skip_status( $post ) ) {
			return;
		}
		if ( ! $this->should_fire( (string) $post->post_type ) ) {
			return;
		}
		$this->fire(
			array(
				'event'   => $update ? 'post_updated' : 'post_created',
				'post_id' => $post_id,
				'slug'    => $post->post_name,
				'type'    => $post->post_type,
				'tag'     => 'posts',
			)
		);
	}

	/**
	 * Delete event.
	 *
	 * @param int $post_id Post ID.
	 * @return void
	 */
	public function on_post_delete( int $post_id ): void {
		$post = get_post( $post_id );
		if ( ! ( $post instanceof WP_Post ) ) {
			return;
		}
		if ( ! $this->should_fire( (string) $post->post_type ) ) {
			return;
		}
		$this->fire(
			array(
				'event'   => 'post_deleted',
				'post_id' => $post_id,
				'slug'    => $post->post_name,
				'type'    => $post->post_type,
				'tag'     => 'posts',
			)
		);
	}

	/**
	 * Status transition (e.g. publish → draft).
	 *
	 * @param string  $new_status New status.
	 * @param string  $old_status Old status.
	 * @param WP_Post $post Post object.
	 * @return void
	 */
	public function on_status_change( string $new_status, string $old_status, $post ): void {
		if ( $new_status === $old_status ) {
			return;
		}
		if ( ! ( $post instanceof WP_Post ) ) {
			return;
		}
		if ( ! $this->should_fire( (string) $post->post_type ) ) {
			return;
		}
		if ( 'publish' === $old_status && 'publish' !== $new_status ) {
			$this->fire(
				array(
					'event'   => 'post_unpublished',
					'post_id' => $post->ID,
					'slug'    => $post->post_name,
					'type'    => $post->post_type,
					'tag'     => 'posts',
				)
			);
		}
	}

	/**
	 * Is this host a name that only ever points at the local machine?
	 *
	 * @param string $host Host from wp_parse_url(), any case.
	 * @return bool
	 */
	private static function is_local_host( string $host ): bool {
		$host = strtolower( trim( $host, '[]' ) );
		if ( '' === $host ) {
			return false;
		}
		if ( in_array( $host, array( 'localhost', '127.0.0.1', '::1' ), true ) ) {
			return true;
		}
		return '.test' === substr( $host, -5 ) || '.localhost' === substr( $host, -10 );
	}

	/**
	 * Is this a webhook URL Hatch is willing to call?
	 *
	 * The URL must be https. Plain http is accepted only for localhost,
	 * *.test and *.localhost hosts, and only while WordPress reports a
	 * "local" or "development" environment type, so a production site never
	 * sends the webhook secret over an unencrypted connection.
	 *
	 * @param string $url Candidate endpoint.
	 * @return bool
	 */
	public static function endpoint_allowed( string $url ): bool {
		$parts = wp_parse_url( $url );
		if ( ! is_array( $parts ) || empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
			return false;
		}
		$scheme = strtolower( (string) $parts['scheme'] );
		if ( 'https' === $scheme ) {
			return true;
		}
		return 'http' === $scheme
			&& self::is_local_host( (string) $parts['host'] )
			&& in_array( wp_get_environment_type(), array( 'local', 'development' ), true );
	}

	/**
	 * Send a request to the configured webhook with WordPress's SSRF-safe HTTP API.
	 *
	 * Uses wp_safe_remote_request(), which refuses private and loopback
	 * addresses and non-standard ports. When the endpoint is a local-environment
	 * host that check is relaxed for that one host and port and nothing else.
	 *
	 * @param string              $method HTTP method.
	 * @param string              $url    Endpoint, already saved by the site owner.
	 * @param array<string,mixed> $args   wp_remote_request() arguments.
	 * @return array<string,mixed>|WP_Error
	 */
	public static function safe_request( string $method, string $url, array $args ) {
		if ( ! self::endpoint_allowed( $url ) ) {
			return new WP_Error(
				'hatch_endpoint_not_allowed',
				__( 'The revalidate webhook URL must use https.', 'hatch-bridge' )
			);
		}
		$host     = (string) wp_parse_url( $url, PHP_URL_HOST );
		$port     = (int) wp_parse_url( $url, PHP_URL_PORT );
		$is_local = self::is_local_host( $host );
		$external = null;
		$ports    = null;
		if ( $is_local ) {
			$external = static function ( $is_external, $candidate ) use ( $host ) {
				return strtolower( (string) $candidate ) === strtolower( $host ) ? true : $is_external;
			};
			$ports    = static function ( $allowed ) use ( $port ) {
				if ( $port > 0 ) {
					$allowed[] = $port;
				}
				return $allowed;
			};
			add_filter( 'http_request_host_is_external', $external, 10, 2 );
			add_filter( 'http_allowed_safe_ports', $ports );
		}
		$args['method'] = strtoupper( $method );
		$response       = wp_safe_remote_request( $url, $args );
		if ( $is_local ) {
			remove_filter( 'http_request_host_is_external', $external, 10 );
			remove_filter( 'http_allowed_safe_ports', $ports );
		}
		return $response;
	}

	/**
	 * Fire the webhook to the configured frontend.
	 *
	 * @param array<string,mixed> $payload Event payload.
	 * @return void
	 */
	private function fire( array $payload ): void {
		$endpoint = trim( (string) get_option( 'hatch_revalidate_endpoint', '' ) );
		$secret   = (string) get_option( 'hatch_webhook_secret', '' );

		if ( empty( $endpoint ) || empty( $secret ) ) {
			return;
		}
		if ( ! self::endpoint_allowed( $endpoint ) ) {
			return;
		}

		// Fired as GET: the Astro endpoint accepts both methods, and a GET is
		// not blocked by Astro's checkOrigin guard, which rejects any POST that
		// has no matching Origin header. The secret is sent in a request
		// header only; a secret in the URL would end up in access logs.
		$url = add_query_arg(
			array(
				'event' => isset( $payload['event'] ) ? (string) $payload['event'] : '',
				'tag'   => isset( $payload['tag'] ) ? (string) $payload['tag'] : '',
			),
			$endpoint
		);
		// v0.50.31 - Record timestamp so Status tab can show
		// "Last frontend revalidation: 2 minutes ago".
		update_option( 'hatch_last_revalidate_at', time(), false );

		self::safe_request(
			'GET',
			$url,
			array(
				'blocking' => false,
				'timeout'  => 5,
				'headers'  => array(
					'X-Hatch-Version' => HATCH_VERSION,
					'X-Hatch-Secret'  => $secret,
				),
			)
		);
	}

	/**
	 * Manual trigger - used by `hatch/revalidate` ability (V0.2.1) and admin
	 * "Test connection" button.
	 *
	 * @param string $reason Optional reason string.
	 * @return bool True if fired, false if not configured.
	 */
	public static function trigger( string $reason = 'manual' ): bool {
		$endpoint = trim( (string) get_option( 'hatch_revalidate_endpoint', '' ) );
		$secret   = (string) get_option( 'hatch_webhook_secret', '' );
		if ( empty( $endpoint ) || empty( $secret ) ) {
			return false;
		}
		self::instance()->fire(
			array(
				'event'  => 'manual_revalidate',
				'reason' => sanitize_text_field( $reason ),
				'tag'    => 'all',
			)
		);
		return true;
	}
}

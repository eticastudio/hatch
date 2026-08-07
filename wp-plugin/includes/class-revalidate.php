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
		$this->fire( array(
			'event'   => $update ? 'post_updated' : 'post_created',
			'post_id' => $post_id,
			'slug'    => $post->post_name,
			'type'    => $post->post_type,
			'tag'     => 'posts',
		) );
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
		$this->fire( array(
			'event'   => 'post_deleted',
			'post_id' => $post_id,
			'slug'    => $post->post_name,
			'type'    => $post->post_type,
			'tag'     => 'posts',
		) );
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
			$this->fire( array(
				'event'   => 'post_unpublished',
				'post_id' => $post->ID,
				'slug'    => $post->post_name,
				'type'    => $post->post_type,
				'tag'     => 'posts',
			) );
		}
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
		if ( ! filter_var( $endpoint, FILTER_VALIDATE_URL ) ) {
			return;
		}

		// v0.50.15 — fire as GET. The Astro endpoint accepts both methods but
		// GET bypasses Astro's checkOrigin guard (`security.checkOrigin: true`
		// in astro.config.mjs) which 403s any POST without a matching Origin
		// header — and `wp_remote_post` doesn't send one. The secret travels
		// in the query string, payload is encoded into hint params for the
		// per-host purge hooks we'll add later.
		$payload_hint = array(
			'event' => isset( $payload['event'] ) ? (string) $payload['event'] : '',
			'tag'   => isset( $payload['tag'] )   ? (string) $payload['tag']   : '',
		);
		$qs = wp_parse_url( $endpoint, PHP_URL_QUERY );
		$url = add_query_arg(
			array_merge( array( 'secret' => rawurlencode( $secret ) ), $payload_hint ),
			$endpoint
		);
		// v0.50.31 — Record timestamp so Status tab can show
		// "Last frontend revalidation: 2 minutes ago".
		update_option( 'hatch_last_revalidate_at', time(), false );

		wp_remote_get(
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
	 * Manual trigger — used by `hatch/revalidate` ability (V0.2.1) and admin
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
		self::instance()->fire( array(
			'event'  => 'manual_revalidate',
			'reason' => sanitize_text_field( $reason ),
			'tag'    => 'all',
		) );
		return true;
	}
}

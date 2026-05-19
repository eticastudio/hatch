<?php
/**
 * Hatch_Media_Rewriter
 *
 * Rewrites every WordPress media URL (`<home_url>/wp-content/uploads/…`) into
 * a clean frontend-origin path (`<frontend_url>/hatch-media/…`). The Astro
 * frontend has a matching catch-all route (`pages/hatch-media/[...path].ts`)
 * that proxies the request back to WordPress and streams the binary.
 *
 * Why:
 *   1. Visitors never see `wp-content` in your HTML — clean branding.
 *   2. Frontend origin is the single source of truth — no cross-origin, no
 *      CORS, no third-party host showing up in `<img src>`.
 *   3. Astro frontend can transparently transform the image (Sharp → WebP /
 *      AVIF) before serving — without the WordPress URL ever leaking.
 *
 * Active when `hatch_image_proxy_url` is non-empty. The Frontline (Connection)
 * tab toggle controls that option indirectly via the Image optimization
 * toggle on the Performance tab.
 *
 * @package Hatch
 * @since   0.50.11
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Media_Rewriter {

	const ROUTE = '/hatch-media/';

	public static function init(): void {
		// Only hook in if the proxy URL is set. Cheap early-out.
		if ( ! self::is_enabled() ) {
			return;
		}

		// Content + excerpts (HTML output).
		add_filter( 'the_content', array( __CLASS__, 'rewrite_html' ), 99 );
		add_filter( 'the_excerpt', array( __CLASS__, 'rewrite_html' ), 99 );

		// REST API responses for posts, pages, attachments — the headless
		// frontend reads everything through REST.
		foreach ( array( 'post', 'page', 'attachment' ) as $type ) {
			add_filter( "rest_prepare_{$type}", array( __CLASS__, 'rewrite_rest_response' ), 99, 3 );
		}

		// Direct attachment URL helpers — covers featured images, OG meta, etc.
		add_filter( 'wp_get_attachment_url',       array( __CLASS__, 'rewrite_html' ), 99 );
		add_filter( 'wp_get_attachment_image_src', array( __CLASS__, 'rewrite_src_array' ), 99 );
		add_filter( 'wp_calculate_image_srcset',   array( __CLASS__, 'rewrite_srcset' ), 99 );
	}

	public static function is_enabled(): bool {
		return '' !== self::frontend_base();
	}

	public static function frontend_base(): string {
		// v0.50.13 — image proxy URL silently defaults to the configured
		// frontend URL. The earlier behaviour required setting BOTH
		// `hatch_image_proxy_url` and `hatch_frontend_url`; setups that left
		// proxy blank produced un-rewritten URLs, and setups that had a stale
		// proxy URL produced 404s (e.g. test-frontend.example.com hangover
		// from a fixture). Explicit non-empty override still wins.
		$explicit = untrailingslashit( (string) get_option( 'hatch_image_proxy_url', '' ) );
		if ( '' !== $explicit ) return $explicit;
		return untrailingslashit( (string) get_option( 'hatch_frontend_url', '' ) );
	}

	/**
	 * The canonical rewrite operation. Replaces every occurrence of the WP
	 * uploads URL prefix in the given string with the frontend `/hatch-media/`
	 * path. Tolerant of both `http://` and `https://` schemes.
	 *
	 * @param mixed $content String input is rewritten; non-strings pass through.
	 * @return mixed
	 */
	public static function rewrite_html( $content ) {
		if ( ! is_string( $content ) || '' === $content ) {
			return $content;
		}

		$frontend = self::frontend_base();
		if ( '' === $frontend ) {
			return $content;
		}

		$home          = home_url();
		$uploads_path  = '/wp-content/uploads/';
		$new_prefix    = trailingslashit( $frontend ) . ltrim( self::ROUTE, '/' );

		// Match home_url() exactly, plus both http/https variants of the same host.
		$home_no_scheme = preg_replace( '#^https?://#', '', untrailingslashit( $home ) );

		$content = str_replace(
			array(
				'https://' . $home_no_scheme . $uploads_path,
				'http://'  . $home_no_scheme . $uploads_path,
				'//'       . $home_no_scheme . $uploads_path,
			),
			$new_prefix,
			$content
		);

		return $content;
	}

	/**
	 * Helper for filters that hand us an array shaped like
	 * [ url, width, height, is_intermediate ].
	 *
	 * @param mixed $src
	 * @return mixed
	 */
	public static function rewrite_src_array( $src ) {
		if ( is_array( $src ) && isset( $src[0] ) ) {
			$src[0] = self::rewrite_html( $src[0] );
		}
		return $src;
	}

	/**
	 * Helper for `wp_calculate_image_srcset` — the sources arg is
	 * [ width => [ 'url' => …, 'descriptor' => …, 'value' => … ], … ].
	 *
	 * @param mixed $sources
	 * @return mixed
	 */
	public static function rewrite_srcset( $sources ) {
		if ( ! is_array( $sources ) ) {
			return $sources;
		}
		foreach ( $sources as $key => $src ) {
			if ( isset( $src['url'] ) ) {
				$sources[ $key ]['url'] = self::rewrite_html( $src['url'] );
			}
		}
		return $sources;
	}

	/**
	 * REST API response rewriter. Walks the well-known fields where media URLs
	 * live (content, excerpt, source_url, media_details.sizes[].source_url)
	 * and rewrites each in place.
	 *
	 * @param WP_REST_Response $response
	 * @param WP_Post          $post
	 * @param WP_REST_Request  $request
	 * @return WP_REST_Response
	 */
	public static function rewrite_rest_response( $response, $post, $request ) {
		if ( ! ( $response instanceof WP_REST_Response ) ) {
			return $response;
		}

		$data = $response->get_data();
		if ( ! is_array( $data ) ) {
			return $response;
		}

		if ( isset( $data['content']['rendered'] ) ) {
			$data['content']['rendered'] = self::rewrite_html( $data['content']['rendered'] );
		}
		if ( isset( $data['excerpt']['rendered'] ) ) {
			$data['excerpt']['rendered'] = self::rewrite_html( $data['excerpt']['rendered'] );
		}
		if ( isset( $data['source_url'] ) ) {
			$data['source_url'] = self::rewrite_html( $data['source_url'] );
		}
		if ( isset( $data['guid']['rendered'] ) ) {
			$data['guid']['rendered'] = self::rewrite_html( $data['guid']['rendered'] );
		}
		if ( isset( $data['media_details']['sizes'] ) && is_array( $data['media_details']['sizes'] ) ) {
			foreach ( $data['media_details']['sizes'] as $size_key => $size ) {
				if ( isset( $size['source_url'] ) ) {
					$data['media_details']['sizes'][ $size_key ]['source_url'] = self::rewrite_html( $size['source_url'] );
				}
			}
		}

		$response->set_data( $data );
		return $response;
	}
}

Hatch_Media_Rewriter::init();

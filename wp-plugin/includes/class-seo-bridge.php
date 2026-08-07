<?php
/**
 * SEO bridge — auto-detects RankMath OR Yoast and proxies their getHead.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Seo_Bridge
 */
class Hatch_Seo_Bridge {

	/**
	 * @var Hatch_Seo_Bridge|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Seo_Bridge
	 */
	public static function instance(): Hatch_Seo_Bridge {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * No-op constructor — registered routes use static methods.
	 */
	private function __construct() {}

	/**
	 * Get the rendered <head> HTML for a given URL.
	 *
	 * Strategy:
	 *  - If RankMath active → call its `/wp-json/rankmath/v1/getHead`.
	 *  - Else if Yoast active → call its `/wp-json/yoast/v1/get_head`.
	 *  - Else → build a minimal head ourselves.
	 *
	 * @param string $url Frontend URL the head is for.
	 * @return WP_REST_Response
	 */
	public static function get_head( string $url ) {
		$detected = Hatch_Detector::get_seo_plugin();
		$head     = '';
		$source   = $detected;

		if ( 'rankmath' === $detected ) {
			$head = self::fetch_rankmath_head( $url );
		} elseif ( 'yoast' === $detected ) {
			$head = self::fetch_yoast_head( $url );
		} else {
			$head   = self::build_fallback_head( $url );
			$source = 'fallback';
		}

		return new WP_REST_Response(
			array(
				'head'   => $head,
				'source' => $source,
			),
			200
		);
	}

	/**
	 * Fetch via RankMath getHead endpoint.
	 *
	 * @param string $url URL.
	 * @return string
	 */
	private static function fetch_rankmath_head( string $url ): string {
		// RankMath validates against home URL — pass an internal URL.
		$internal_url = self::derive_internal_url( $url );
		$api_url      = add_query_arg( 'url', rawurlencode( $internal_url ), home_url( '/wp-json/rankmath/v1/getHead' ) );

		$res = wp_remote_get( $api_url, array( 'timeout' => 10 ) );
		if ( is_wp_error( $res ) || 200 !== wp_remote_retrieve_response_code( $res ) ) {
			return '';
		}
		$body = json_decode( wp_remote_retrieve_body( $res ), true );
		return isset( $body['head'] ) ? (string) $body['head'] : '';
	}

	/**
	 * Fetch via Yoast getHead endpoint.
	 *
	 * @param string $url URL.
	 * @return string
	 */
	private static function fetch_yoast_head( string $url ): string {
		$internal_url = self::derive_internal_url( $url );
		$api_url      = add_query_arg( 'url', rawurlencode( $internal_url ), home_url( '/wp-json/yoast/v1/get_head' ) );

		$res = wp_remote_get( $api_url, array( 'timeout' => 10 ) );
		if ( is_wp_error( $res ) || 200 !== wp_remote_retrieve_response_code( $res ) ) {
			return '';
		}
		$body = json_decode( wp_remote_retrieve_body( $res ), true );
		// Yoast returns { json: {...}, html: "..." } — we want HTML for parity with RankMath.
		return isset( $body['html'] ) ? (string) $body['html'] : '';
	}

	/**
	 * Minimal fallback head when no SEO plugin is installed.
	 *
	 * @param string $url URL.
	 * @return string
	 */
	private static function build_fallback_head( string $url ): string {
		return sprintf(
			'<title>%s</title><meta name="description" content="%s"/><meta name="robots" content="index, follow"/>',
			esc_html( get_bloginfo( 'name' ) ),
			esc_attr( get_bloginfo( 'description' ) )
		);
	}

	/**
	 * Get structured JSON-LD schema for a given URL.
	 *
	 * Strategy:
	 *  - If RankMath or Yoast active → extract <script type="application/ld+json">
	 *    blocks from their rendered head, unwrap @graph if present.
	 *  - Else → build Article + Person + BreadcrumbList from WP post data.
	 *
	 * @param string $url Frontend URL.
	 * @return WP_REST_Response { schema: array, source: string }
	 */
	public static function get_schema( string $url ): WP_REST_Response {
		$detected = Hatch_Detector::get_seo_plugin();
		$schemas  = array();
		$source   = $detected;

		if ( 'rankmath' === $detected ) {
			$head    = self::fetch_rankmath_head( $url );
			$schemas = self::extract_json_ld( $head );
		} elseif ( 'yoast' === $detected ) {
			$head    = self::fetch_yoast_head( $url );
			$schemas = self::extract_json_ld( $head );
		}

		if ( empty( $schemas ) ) {
			$schemas = self::build_fallback_schema( $url );
			$source  = 'fallback';
		}

		return new WP_REST_Response(
			array(
				'schema' => $schemas,
				'source' => $source,
			),
			200
		);
	}

	/**
	 * Extract all JSON-LD objects from an HTML string.
	 * Unwraps @graph arrays so the result is always a flat array of schema objects.
	 *
	 * @param string $html Raw HTML (e.g. from RankMath/Yoast head).
	 * @return array<int, array<string, mixed>>
	 */
	private static function extract_json_ld( string $html ): array {
		if ( '' === $html ) {
			return array();
		}
		$schemas = array();
		preg_match_all(
			'#<script[^>]+type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>#i',
			$html,
			$matches
		);
		foreach ( $matches[1] as $raw ) {
			$decoded = json_decode( trim( $raw ), true );
			if ( ! is_array( $decoded ) ) {
				continue;
			}
			// @graph = multiple schema objects packed into one <script>.
			if ( isset( $decoded['@graph'] ) && is_array( $decoded['@graph'] ) ) {
				foreach ( $decoded['@graph'] as $node ) {
					if ( is_array( $node ) ) {
						$schemas[] = $node;
					}
				}
			} else {
				$schemas[] = $decoded;
			}
		}
		return $schemas;
	}

	/**
	 * Build a minimal but valid schema when no SEO plugin is installed.
	 *
	 * Returns Article + BreadcrumbList for posts/pages, or WebSite for the home.
	 *
	 * @param string $url Frontend URL.
	 * @return array<int, array<string, mixed>>
	 */
	private static function build_fallback_schema( string $url ): array {
		$internal = self::derive_internal_url( $url );
		$post_id  = url_to_postid( $internal );
		$home     = home_url();
		$site     = get_bloginfo( 'name' );
		$schemas  = array();

		if ( $post_id ) {
			$post       = get_post( $post_id );
			$author_id  = $post ? (int) $post->post_author : 0;
			$author     = $author_id ? get_userdata( $author_id ) : null;
			$thumb_id   = get_post_thumbnail_id( $post_id );
			$thumb_url  = $thumb_id ? wp_get_attachment_url( $thumb_id ) : '';
			$published  = $post ? get_the_date( 'c', $post ) : '';
			$modified   = $post ? get_the_modified_date( 'c', $post ) : '';
			$title      = $post ? html_entity_decode( get_the_title( $post ), ENT_QUOTES | ENT_HTML5 ) : '';
			$excerpt    = $post ? wp_strip_all_tags( get_the_excerpt( $post ) ) : '';

			$article = array(
				'@context'         => 'https://schema.org',
				'@type'            => 'Article',
				'headline'         => $title,
				'description'      => $excerpt,
				'url'              => $url,
				'datePublished'    => $published,
				'dateModified'     => $modified,
				'inLanguage'       => get_bloginfo( 'language' ),
				'isPartOf'         => array( '@id' => $home . '/#website' ),
				'publisher'        => array( '@type' => 'Organization', 'name' => $site, 'url' => $home ),
			);

			if ( $thumb_url ) {
				$article['image'] = array(
					'@type' => 'ImageObject',
					'url'   => $thumb_url,
				);
			}

			if ( $author ) {
				$article['author'] = array(
					'@type' => 'Person',
					'name'  => $author->display_name,
					'url'   => get_author_posts_url( $author->ID ),
				);
			}

			$schemas[] = $article;

			// BreadcrumbList — best-effort from the post's primary category.
			$cats        = get_the_category( $post_id );
			$breadcrumbs = array(
				array( '@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => $home ),
			);
			$pos = 2;
			if ( ! empty( $cats ) ) {
				$cat           = $cats[0];
				$breadcrumbs[] = array(
					'@type'    => 'ListItem',
					'position' => $pos++,
					'name'     => $cat->name,
					'item'     => get_category_link( $cat->term_id ),
				);
			}
			$breadcrumbs[] = array( '@type' => 'ListItem', 'position' => $pos, 'name' => $title, 'item' => $url );

			$schemas[] = array(
				'@context'        => 'https://schema.org',
				'@type'           => 'BreadcrumbList',
				'itemListElement' => $breadcrumbs,
			);
		} else {
			// Home or non-post URL — emit a WebSite node.
			$schemas[] = array(
				'@context' => 'https://schema.org',
				'@type'    => 'WebSite',
				'name'     => $site,
				'url'      => $home,
			);
		}

		return $schemas;
	}

	/**
	 * Map a frontend URL (e.g. https://site.com/blog/foo) to an internal WP URL
	 * (e.g. https://cms.site.com/foo) so RankMath/Yoast can resolve it.
	 *
	 * Strategy: replace the public domain with home_url() and strip a /blog prefix
	 * if present (configurable via filter for non-standard setups).
	 *
	 * @param string $url Public-facing URL.
	 * @return string
	 */
	private static function derive_internal_url( string $url ): string {
		$parsed = wp_parse_url( $url );
		if ( ! $parsed || empty( $parsed['path'] ) ) {
			return home_url();
		}
		$path = $parsed['path'];
		// Strip a leading /blog if present — most Hatch setups serve at /blog/*.
		$path = preg_replace( '#^/blog#', '', $path );
		if ( '' === $path || '/' === $path ) {
			return home_url();
		}
		/**
		 * Filter the derived internal URL.
		 *
		 * @param string $internal Computed internal URL.
		 * @param string $url      Original public URL.
		 */
		return apply_filters( 'hatch_seo_internal_url', home_url( $path ), $url );
	}
}

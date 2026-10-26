<?php
/**
 * Frontend redirect and link rewriting.
 *
 * Once a frontend is connected, a visitor who opens the raw WordPress address is
 * sent on to the same path on the frontend, and "View post", "View page" and
 * archive links in wp-admin point at the frontend too. WordPress stays the back
 * office: wp-admin, wp-login, REST, AJAX, XML-RPC, feeds, sitemaps and previews
 * are never redirected, and a logged-in user keeps the site's own theme on the
 * bare home URL.
 *
 * This is plain plugin behaviour. Hatch does not install, switch or remove any
 * theme.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Frontend_Redirect
 */
class Hatch_Frontend_Redirect {

	/**
	 * Hook everything up.
	 *
	 * @return void
	 */
	public static function boot(): void {
		add_action( 'template_redirect', array( __CLASS__, 'maybe_redirect' ), 0 );
		add_filter( 'post_link', array( __CLASS__, 'rewrite_permalink' ), 20, 2 );
		add_filter( 'page_link', array( __CLASS__, 'rewrite_permalink' ), 20, 2 );
		add_filter( 'post_type_link', array( __CLASS__, 'rewrite_permalink' ), 20, 2 );
		add_filter( 'term_link', array( __CLASS__, 'rewrite_term_link' ), 20, 3 );
		add_filter( 'author_link', array( __CLASS__, 'rewrite_author_link' ), 20, 3 );
	}

	/**
	 * The connected frontend URL, or an empty string when none is saved.
	 *
	 * @return string
	 */
	public static function frontend_url(): string {
		$url = get_option( 'hatch_frontend_url' );
		return is_string( $url ) && '' !== $url ? esc_url_raw( $url ) : '';
	}

	/**
	 * Host plus port of a URL, lower-cased, for same-origin comparison.
	 *
	 * @param string $url URL.
	 * @return string Empty when the URL has no host.
	 */
	private static function origin( string $url ): string {
		$host = wp_parse_url( $url, PHP_URL_HOST );
		if ( ! is_string( $host ) || '' === $host ) {
			return '';
		}
		$port = wp_parse_url( $url, PHP_URL_PORT );
		return strtolower( $host ) . ( $port ? ':' . (int) $port : '' );
	}

	/**
	 * Send front-end visitors of the raw WordPress address to the frontend.
	 *
	 * @return void
	 */
	public static function maybe_redirect(): void {
		if (
			is_admin() || is_robots() || is_preview() ||
			wp_doing_ajax() || wp_doing_cron() ||
			( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST ) ||
			( defined( 'REST_REQUEST' ) && REST_REQUEST )
		) {
			return;
		}
		$method = isset( $_SERVER['REQUEST_METHOD'] ) ? strtoupper( sanitize_key( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) ) : 'GET';
		if ( ! in_array( $method, array( 'GET', 'HEAD' ), true ) || is_feed() ) {
			return; // Form posts, callbacks and feeds are never bounced.
		}
		$target = self::frontend_url();
		if ( '' === $target ) {
			return;
		}

		$path = isset( $_SERVER['REQUEST_URI'] ) ? esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '/';
		if ( '' === $path || '/' !== $path[0] || 0 === strpos( $path, '//' ) ) {
			$path = '/';
		}

		// Frontend on the same host as WordPress (subfolder mount): the edge already routes it.
		$target_origin = self::origin( $target );
		if ( '' !== $target_origin && self::origin( home_url() ) === $target_origin ) {
			return;
		}
		if ( 0 === strpos( $path, '/wp-' ) || 0 === strpos( $path, '/feed' ) || 0 === strpos( $path, '/sitemap' ) ) {
			return;
		}
		// Callback-style URLs (payment gateways, OAuth, cron-like pings) must reach WordPress.
		foreach ( array( 'wc-api', 'rest_route', 'feed', 'doing_wp_cron', 'action' ) as $arg ) {
			if ( false !== strpos( $path, '?' . $arg . '=' ) || false !== strpos( $path, '&' . $arg . '=' ) ) {
				return;
			}
		}

		// A logged-in user keeps the site's own theme on the bare home URL only.
		if ( is_user_logged_in() && '' === rtrim( (string) strtok( $path, '?' ), '/' ) ) {
			return;
		}

		$path = self::frontend_path( $path );

		// The destination is the frontend URL an administrator saved, never visitor input.
		wp_redirect( rtrim( $target, '/' ) . $path, 302, 'Hatch' ); // phpcs:ignore WordPress.Security.SafeRedirect.wp_redirect_wp_redirect -- Owner-saved frontend URL, not request input.
		exit;
	}

	/**
	 * Translate WordPress archive paths into the routes the frontend serves.
	 *
	 * WordPress pages its blog at /page/2/ and names author archives by
	 * username; the frontend pages at /blog?page=2 and knows authors by
	 * their public slug.
	 *
	 * @param string $path Request path with optional query string.
	 * @return string
	 */
	private static function frontend_path( string $path ): string {
		$route = (string) strtok( $path, '?' );
		if ( preg_match( '#^/page/(\d+)/?$#', $route, $m ) ) {
			return '/blog?page=' . (int) $m[1];
		}
		if ( function_exists( 'is_author' ) && is_author() ) {
			$author = get_queried_object();
			if ( $author instanceof WP_User ) {
				return '/blog/author/' . rawurlencode( self::author_slug( (int) $author->ID, (string) $author->user_nicename ) );
			}
		}
		return $path;
	}

	/**
	 * Point post, page and custom post type links at the frontend routes.
	 *
	 * Posts live under /blog/{slug}, pages under /{slug}, other types under
	 * /{rest_base}/{slug}, the same routes the Astro frontend serves.
	 *
	 * @param string  $permalink Original permalink.
	 * @param WP_Post $post      Post the link is for.
	 * @return string
	 */
	public static function rewrite_permalink( $permalink, $post ) {
		$front = self::frontend_url();
		if ( '' === $front || ! $post instanceof WP_Post || '' === $post->post_name ) {
			return $permalink;
		}
		if ( 'publish' !== $post->post_status && ! is_user_logged_in() ) {
			return $permalink;
		}

		$slug = rawurlencode( $post->post_name );
		switch ( $post->post_type ) {
			case 'post':
				$path = '/blog/' . $slug;
				break;
			case 'page':
				$uri  = function_exists( 'get_page_uri' ) ? (string) get_page_uri( $post ) : '';
				$path = '/' . ( '' !== $uri ? implode( '/', array_map( 'rawurlencode', explode( '/', $uri ) ) ) : $slug );
				break;
			case 'attachment':
				return $permalink;
			default:
				$type = get_post_type_object( $post->post_type );
				$base = ( $type && ! empty( $type->rest_base ) ) ? $type->rest_base : $post->post_type;
				$path = '/' . rawurlencode( $base ) . '/' . $slug;
				break;
		}
		return rtrim( $front, '/' ) . $path;
	}

	/**
	 * Category and tag archive links.
	 *
	 * @param string  $url      Original term link.
	 * @param WP_Term $term     Term.
	 * @param string  $taxonomy Taxonomy name.
	 * @return string
	 */
	public static function rewrite_term_link( $url, $term, $taxonomy ) {
		$front = self::frontend_url();
		if ( '' === $front || ! $term || empty( $term->slug ) ) {
			return $url;
		}
		if ( 'category' === $taxonomy ) {
			return rtrim( $front, '/' ) . '/blog/category/' . rawurlencode( $term->slug );
		}
		if ( 'post_tag' === $taxonomy ) {
			return rtrim( $front, '/' ) . '/blog/tag/' . rawurlencode( $term->slug );
		}
		return $url;
	}

	/**
	 * Author archive links.
	 *
	 * @param string $url             Original author link.
	 * @param int    $author_id       Author ID.
	 * @param string $author_nicename Author nicename.
	 * @return string
	 */
	public static function rewrite_author_link( $url, $author_id, $author_nicename ) {
		$front = self::frontend_url();
		if ( '' === $front || '' === (string) $author_nicename ) {
			return $url;
		}
		return rtrim( $front, '/' ) . '/blog/author/' . rawurlencode( self::author_slug( (int) $author_id, (string) $author_nicename ) );
	}

	/**
	 * The author slug the frontend knows. With usernames hidden the frontend
	 * only sees "author-{id}", never the login-derived nicename.
	 *
	 * @param int    $author_id       User ID.
	 * @param string $author_nicename User nicename.
	 * @return string
	 */
	public static function author_slug( int $author_id, string $author_nicename ): string {
		$hidden = class_exists( 'Hatch_Hardening' ) ? Hatch_Hardening::is_on( 'disable_rest_users' ) : (bool) get_option( 'hatch_fortress_disable_rest_users', false );
		return ( $hidden && $author_id > 0 ) ? 'author-' . $author_id : $author_nicename;
	}
}

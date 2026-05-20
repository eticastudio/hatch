<?php
/**
 * REST API surface for Hatch.
 *
 * All endpoints registered under /wp-json/hatch/v1/*
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Rest_Api
 */
class Hatch_Rest_Api {

	/**
	 * @var Hatch_Rest_Api|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Rest_Api
	 */
	public static function instance(): Hatch_Rest_Api {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire routes.
	 */
	private function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Register all Hatch REST routes.
	 */
	public function register_routes(): void {
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/info',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_info' ),
				'permission_callback' => array( $this, 'permission_authenticated' ),
			)
		);

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/seo-head',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_seo_head' ),
				'permission_callback' => array( $this, 'permission_authenticated' ),
				'args'                => array(
					'url' => array(
						'required'          => true,
						'sanitize_callback' => 'esc_url_raw',
					),
				),
			)
		);

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/schema',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_schema' ),
				'permission_callback' => array( $this, 'permission_authenticated' ),
				'args'                => array(
					'url' => array(
						'required'          => true,
						'sanitize_callback' => 'esc_url_raw',
					),
				),
			)
		);

		// v0.50.14 — `/redirects` reads whatever RankMath / Yoast Premium /
		// Redirection plugin already exposes. No toggle: if none of those is
		// installed the callback returns an empty list, harmless. Plugin
		// Bridge in the Content tab shows the user which plugin (if any)
		// provided the data.
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/redirects',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_redirects' ),
				'permission_callback' => array( $this, 'permission_authenticated' ),
			)
		);

		// v0.50.14 — `/forms` + `/forms/{id}/submit` removed. Form plugins
		// expose their own REST endpoints (Gravity: `/gf/v2/...`,
		// Fluent Forms: `/fluentform/v1/...`, WPForms: their own GET handler).
		// Astro talks to those directly. Duplicating them under /hatch/v1/
		// caused integration confusion and a doubled Turnstile attack surface.

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/membership/check',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_membership_check' ),
				'permission_callback' => array( $this, 'permission_authenticated' ),
			)
		);

		// V0.2.0 — health & ops endpoints (admin capability only).
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/cpt-health',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_cpt_health' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/acf-status',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_acf_status' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/revalidate',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'route_revalidate' ),
				'permission_callback' => array( $this, 'permission_admin' ),
				'args'                => array(
					'reason' => array(
						'required'          => false,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/diagnostic',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_diagnostic' ),
				'permission_callback' => array( $this, 'permission_admin' ),
			)
		);

		// V0.27 — nav menu passthrough.
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/menus',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_menus' ),
				'permission_callback' => array( $this, 'permission_authenticated' ),
			)
		);

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/menus/(?P<location>[a-zA-Z0-9_-]+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_menu_items' ),
				'permission_callback' => array( $this, 'permission_authenticated' ),
				'args'                => array(
					'location' => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_key',
					),
				),
			)
		);

		// v0.50.31 — Universal slug resolver across all PUBLIC post types
		// (page, post, and any registered CPT with show_in_rest=true). The
		// Astro [...slug].astro catch-all uses this so /<slug> works for
		// Pages AND CPTs (products, courses, portfolio, etc) without the
		// frontend having to enumerate types first. Single REST roundtrip.
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/content',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_content_by_slug' ),
				'permission_callback' => array( $this, 'permission_authenticated' ),
				'args'                => array(
					'slug' => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_title',
					),
				),
			)
		);

		// Code injection snippets — public read (the snippets end up in every
		// visitor's HTML head, so there's nothing to gate). The Astro frontend
		// fetches this on each request and renders the slots via set:html.
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/code-snippets',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_code_snippets' ),
				'permission_callback' => '__return_true',
			)
		);

		// SEO bridge: robots.txt content + GSC verification meta tag. Sourced
		// from the active SEO plugin (RankMath > Yoast > native fallback).
		// Public read — search engines need both.
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/seo-meta',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_seo_meta' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	/**
	 * GET /hatch/v1/seo-meta — public read. Returns:
	 *   - robots_txt:  the body for /robots.txt (RankMath > Yoast > native fallback)
	 *   - verification: array of {provider, content} for <meta> verification tags
	 *                   (google, bing, yandex, pinterest, baidu — populated from
	 *                   whichever SEO plugin is active)
	 *
	 * @return WP_REST_Response
	 */
	public function route_seo_meta(): WP_REST_Response {
		$robots_txt   = '';
		$verification = array();

		// RankMath ----------------------------------------------------------
		if ( Hatch_Detector::is_active( 'rankmath' ) && class_exists( 'RankMath\\Helper' ) ) {
			$rm_robots = get_option( 'rank_math_robots_txt' );
			if ( is_string( $rm_robots ) && '' !== trim( $rm_robots ) ) {
				$robots_txt = $rm_robots;
			}
			$rm_titles = (array) get_option( 'rank-math-options-titles', array() );
			foreach ( array( 'google' => 'google_verify', 'bing' => 'bing_verify', 'yandex' => 'yandex_verify', 'pinterest' => 'pinterest_verify', 'baidu' => 'baidu_verify' ) as $provider => $key ) {
				if ( ! empty( $rm_titles[ $key ] ) ) {
					$verification[] = array( 'provider' => $provider, 'content' => (string) $rm_titles[ $key ] );
				}
			}
		}

		// Yoast -------------------------------------------------------------
		if ( '' === $robots_txt && Hatch_Detector::is_active( 'wordpress-seo' ) ) {
			// Yoast doesn't store robots.txt content directly but does store
			// site-wide options. Verification keys land in wpseo['*_verify'].
			$wpseo = (array) get_option( 'wpseo', array() );
			foreach ( array( 'google' => 'googleverify', 'bing' => 'msverify', 'yandex' => 'yandexverify', 'pinterest' => 'pinterestverify', 'baidu' => 'baiduverify' ) as $provider => $key ) {
				if ( ! empty( $wpseo[ $key ] ) && empty( array_filter( $verification, fn( $v ) => $v['provider'] === $provider ) ) ) {
					$verification[] = array( 'provider' => $provider, 'content' => (string) $wpseo[ $key ] );
				}
			}
		}

		// Native fallback ---------------------------------------------------
		if ( '' === $robots_txt ) {
			$home = trailingslashit( home_url( '/' ) );
			$robots_txt = "User-agent: *\nDisallow: /wp-admin/\nAllow: /wp-admin/admin-ajax.php\n\nSitemap: " . $home . 'sitemap-index.xml';
		}

		return new WP_REST_Response( array(
			'robots_txt'   => $robots_txt,
			'verification' => $verification,
		), 200, array(
			'Cache-Control' => 'public, max-age=300, stale-while-revalidate=3600',
		) );
	}

	/**
	 * GET /hatch/v1/code-snippets — public read.
	 *
	 * Returns the raw head/body_start/body_end HTML alongside the analytics
	 * IDs. The frontend builds the actual GA4/GTM/Plausible/Pixel snippets
	 * from the IDs so injection patterns can evolve without WP changes.
	 *
	 * v0.50.31 — Universal slug→content resolver across all PUBLIC post types
	 * with show_in_rest=true. Walks the public+rest types, queries each one
	 * for a matching slug, returns the first hit normalised into the same
	 * shape `getPageBySlug` / `getPostBySlug` emit. Used by [...slug].astro.
	 *
	 * Returns: { id, slug, type, rest_base, title, content, excerpt,
	 *            featured_media_url, modified, link } | { found:false }
	 */
	public function route_content_by_slug( WP_REST_Request $request ) {
		$slug = sanitize_title( (string) $request->get_param( 'slug' ) );
		if ( '' === $slug ) {
			return new WP_REST_Response( array( 'found' => false ), 400 );
		}
		// All public types accessible via REST (page + post + every CPT
		// the WP install or its plugins have registered with
		// show_in_rest=true). Order: page first (most common), post second,
		// CPTs after. Stops at first match.
		$types = get_post_types( array( 'public' => true, 'show_in_rest' => true ), 'objects' );
		$order = array();
		if ( isset( $types['page'] ) )       $order[] = $types['page'];
		if ( isset( $types['post'] ) )       $order[] = $types['post'];
		foreach ( $types as $k => $obj ) {
			if ( 'page' === $k || 'post' === $k || 'attachment' === $k ) continue;
			$order[] = $obj;
		}
		foreach ( $order as $obj ) {
			$q = new WP_Query( array(
				'post_type'      => $obj->name,
				'name'           => $slug,
				'posts_per_page' => 1,
				'post_status'    => 'publish',
				'no_found_rows'  => true,
			) );
			if ( ! $q->have_posts() ) continue;
			$post = $q->posts[0];
			$thumb_id = (int) get_post_thumbnail_id( $post );
			$thumb_url = $thumb_id ? (string) wp_get_attachment_image_url( $thumb_id, 'full' ) : '';
			$thumb_alt = $thumb_id ? (string) get_post_meta( $thumb_id, '_wp_attachment_image_alt', true ) : '';
			return new WP_REST_Response( array(
				'found'              => true,
				'id'                 => (int) $post->ID,
				'slug'               => (string) $post->post_name,
				'type'               => (string) $post->post_type,
				'rest_base'          => (string) ( $obj->rest_base ?: $obj->name ),
				'title'              => get_the_title( $post ),
				'content'            => apply_filters( 'the_content', $post->post_content ),
				'excerpt'            => has_excerpt( $post ) ? wp_strip_all_tags( get_the_excerpt( $post ) ) : '',
				'featured_media_url' => $thumb_url,
				'featured_media_alt' => $thumb_alt,
				'modified'           => mysql_to_rfc3339( $post->post_modified_gmt ),
				'published'          => mysql_to_rfc3339( $post->post_date_gmt ),
				'link'               => get_permalink( $post ),
			), 200, array( 'Cache-Control' => 'public, max-age=60, s-maxage=60, stale-while-revalidate=3600' ) );
		}
		return new WP_REST_Response( array( 'found' => false, 'slug' => $slug ), 404 );
	}

	/**
	 * @return WP_REST_Response
	 */
	public function route_code_snippets(): WP_REST_Response {
		$opt = (array) get_option( 'hatch_code_snippets', array() );
		$g = static function ( $k ) use ( $opt ) { return isset( $opt[ $k ] ) ? (string) $opt[ $k ] : ''; };
		return new WP_REST_Response( array(
			// v0.50.31 — GA4 / Plausible / Pixel removed. Hatch ships only
			// GTM by design; add other tags inside your GTM container.
			'head'       => $g( 'head' ),
			'body_start' => $g( 'body_start' ),
			'body_end'   => $g( 'body_end' ),
			'gtm_id'     => $g( 'gtm_id' ),
		), 200, array(
			// Short cache — snippets are looked up per request but Astro
			// can hold the response for ~60s without losing freshness.
			'Cache-Control' => 'public, max-age=60, stale-while-revalidate=300',
		) );
	}

	/**
	 * Permission: any authenticated user (Application Password works).
	 *
	 * @return bool
	 */
	public function permission_authenticated(): bool {
		return is_user_logged_in();
	}

	/**
	 * Permission: requires `manage_options` (administrator).
	 *
	 * Used for health endpoints and the manual revalidate trigger — anything
	 * that exposes site state or causes outbound webhooks should require admin.
	 *
	 * @return bool
	 */
	public function permission_admin(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Static variant — for cross-class callable references.
	 *
	 * @return bool
	 */
	public static function permission_admin_static(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * GET /hatch/v1/info — what does this WP install offer?
	 *
	 * @return WP_REST_Response
	 */
	public function route_info(): WP_REST_Response {
		$report = Hatch_Detector::report();
		$data   = array(
			'hatch_version' => HATCH_VERSION,
			'wp_version'    => get_bloginfo( 'version' ),
			'site_name'     => get_bloginfo( 'name' ),
			'site_url'      => home_url(),
			'detected'      => $report,
			'webhook_url'   => get_option( 'hatch_revalidate_endpoint', '' ),
		);
		return new WP_REST_Response( $data, 200 );
	}

	/**
	 * GET /hatch/v1/seo-head?url=X — proxy RankMath OR Yoast getHead.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function route_seo_head( WP_REST_Request $request ) {
		return Hatch_Seo_Bridge::get_head( $request->get_param( 'url' ) );
	}

	/**
	 * GET /hatch/v1/schema?url=X — structured JSON-LD for the given URL.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function route_schema( WP_REST_Request $request ): WP_REST_Response {
		return Hatch_Seo_Bridge::get_schema( $request->get_param( 'url' ) );
	}

	/**
	 * GET /hatch/v1/redirects — combine sources from RankMath/Yoast/Redirection.
	 *
	 * @return WP_REST_Response
	 */
	public function route_redirects(): WP_REST_Response {
		$out = array();

		// Redirection plugin.
		if ( Hatch_Detector::is_active( 'redirection' ) && class_exists( 'Red_Item' ) ) {
			$items = Red_Item::get_all_for_module( 0 );
			foreach ( (array) $items as $item ) {
				if ( ! is_object( $item ) ) {
					continue;
				}
				$out[] = array(
					'from'   => sanitize_text_field( (string) $item->get_url() ),
					'to'     => esc_url_raw( (string) $item->get_action_data() ),
					'status' => intval( $item->get_action_code() ),
					'source' => 'redirection',
				);
			}
		}

		// RankMath redirections module.
		if ( Hatch_Detector::is_active( 'rankmath' ) ) {
			global $wpdb;
			// Table name composed from $wpdb->prefix only — never user input.
			$table = $wpdb->prefix . 'rank_math_redirections';
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$table_exists = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) === $table;
			if ( $table_exists ) {
				// $table is safe ($wpdb->prefix only) — $wpdb->prepare() can't parameterize identifiers.
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$rows = $wpdb->get_results( "SELECT sources, url_to, header_code FROM `{$table}` WHERE status = 'active' LIMIT 5000" );
				foreach ( (array) $rows as $row ) {
					$sources = maybe_unserialize( $row->sources );
					foreach ( (array) $sources as $src ) {
						$out[] = array(
							'from'   => isset( $src['pattern'] ) ? sanitize_text_field( (string) $src['pattern'] ) : '',
							'to'     => esc_url_raw( (string) $row->url_to ),
							'status' => intval( $row->header_code ),
							'source' => 'rankmath',
						);
					}
				}
			}
		}

		// Note: Yoast Premium redirects export TBD (file-based).

		return new WP_REST_Response( $out, 200 );
	}

	/**
	 * GET /hatch/v1/membership/check — verify current user has access.
	 *
	 * @return WP_REST_Response
	 */
	public function route_membership_check(): WP_REST_Response {
		$user = wp_get_current_user();
		return new WP_REST_Response(
			array(
				'is_logged_in' => $user->exists(),
				'user_id'      => $user->ID,
				'roles'        => $user->roles,
				'plugin'       => Hatch_Detector::get_membership_plugin(),
			),
			200
		);
	}

	/**
	 * GET /hatch/v1/cpt-health — list CPTs and their REST exposure status.
	 *
	 * @return WP_REST_Response
	 */
	public function route_cpt_health(): WP_REST_Response {
		return new WP_REST_Response( Hatch_Cpt_Scanner::scan(), 200 );
	}

	/**
	 * GET /hatch/v1/acf-status — list ACF/SCF/Meta Box field group REST status.
	 *
	 * @return WP_REST_Response
	 */
	public function route_acf_status(): WP_REST_Response {
		return new WP_REST_Response( Hatch_Acf_Bridge::get_field_group_status(), 200 );
	}

	/**
	 * POST /hatch/v1/revalidate — manually fire a full-site revalidation webhook.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function route_revalidate( WP_REST_Request $request ) {
		$reason = (string) $request->get_param( 'reason' );
		if ( '' === $reason ) {
			$reason = 'rest-manual';
		}
		$fired = Hatch_Revalidate::trigger( $reason );
		if ( ! $fired ) {
			return new WP_Error(
				'hatch_revalidate_not_configured',
				esc_html__( 'Revalidation endpoint or webhook secret not configured.', 'hatch' ),
				array( 'status' => 400 )
			);
		}
		return new WP_REST_Response( array( 'success' => true, 'reason' => $reason ), 200 );
	}

	/**
	 * GET /hatch/v1/diagnostic — run preflight diagnostic.
	 *
	 * @return WP_REST_Response
	 */
	public function route_diagnostic(): WP_REST_Response {
		return new WP_REST_Response( Hatch_Diagnostic::run(), 200 );
	}

	/**
	 * GET /hatch/v1/menus — all registered nav menu locations.
	 *
	 * @return WP_REST_Response
	 */
	public function route_menus(): WP_REST_Response {
		return new WP_REST_Response( Hatch_Menus_Bridge::get_locations(), 200 );
	}

	/**
	 * GET /hatch/v1/menus/{location} — items for one nav menu location.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function route_menu_items( WP_REST_Request $request ): WP_REST_Response {
		$location = (string) $request->get_param( 'location' );
		return new WP_REST_Response(
			array(
				'location' => $location,
				'items'    => Hatch_Menus_Bridge::get_items( $location ),
			),
			200
		);
	}
}

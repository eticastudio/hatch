<?php
/**
 * Hatch Features — toggleable headless capabilities.
 *
 * Each "feature" is a frontend capability the Astro starter (or any other
 * headless frontend) can opt into by reading the /hatch/v1/features REST
 * endpoint at build/request time.
 *
 * Features are stored as ONE option (`hatch_features`) keyed by feature slug
 * with boolean values. This keeps `wp_options` clean (1 row vs 14) and
 * makes the JSON shape stable for the frontend.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Features
 */
class Hatch_Features {

	const OPTION_KEY = 'hatch_features';
	const THEME_KEY  = 'hatch_selected_theme';

	/**
	 * Feature catalog. Each entry: slug => [ label, description, group, default ]
	 *
	 * Default all-on so a fresh install ships with the full SproutOS-blog
	 * experience. Users explicitly disable what they don't want.
	 *
	 * @return array<string,array{label:string,description:string,group:string,default:bool}>
	 */
	public static function catalog(): array {
		return array(

			// Reading experience.
			'progress_bar' => array(
				'label'       => __( 'Reading progress bar', 'hatch' ),
				'description' => __( 'Thin bar at the top of single posts that fills as the reader scrolls.', 'hatch' ),
				'group'       => 'reading',
				'default'     => true,
			),
			'sticky_share' => array(
				'label'       => __( 'Sticky share sidebar', 'hatch' ),
				'description' => __( 'X / LinkedIn / WhatsApp / Copy buttons that follow the reader down the page.', 'hatch' ),
				'group'       => 'reading',
				'default'     => true,
			),
			'toc_sidebar' => array(
				'label'       => __( 'Table of Contents', 'hatch' ),
				'description' => __( 'Auto-generated from H2 / H3 headings, sticky, with active-section highlighting.', 'hatch' ),
				'group'       => 'reading',
				'default'     => true,
			),
			'breadcrumb' => array(
				'label'       => __( 'Breadcrumb navigation', 'hatch' ),
				'description' => __( 'Home → Blog → Post title. Helps both readers and SEO.', 'hatch' ),
				'group'       => 'reading',
				'default'     => true,
			),
			'reading_time' => array(
				'label'       => __( 'Word count + reading time', 'hatch' ),
				'description' => __( 'Shown below the post title. Calculated from content length at build time.', 'hatch' ),
				'group'       => 'reading',
				'default'     => true,
			),
			'last_updated' => array(
				'label'       => __( 'Last updated date', 'hatch' ),
				'description' => __( 'Shown alongside the publish date when a post has been modified.', 'hatch' ),
				'group'       => 'reading',
				'default'     => true,
			),

			// Post navigation.
			'next_prev_nav' => array(
				'label'       => __( 'Next / Previous post navigation', 'hatch' ),
				'description' => __( 'Adjacent posts shown at the bottom of single posts.', 'hatch' ),
				'group'       => 'navigation',
				'default'     => true,
			),
			'related_posts' => array(
				'label'       => __( 'Related posts (by category)', 'hatch' ),
				'description' => __( 'Up to 3 posts from the same category at the bottom of single posts.', 'hatch' ),
				'group'       => 'navigation',
				'default'     => true,
			),

			// Author + archives.
			'author_bio' => array(
				'label'       => __( 'Author bio on single posts', 'hatch' ),
				'description' => __( 'Author avatar, name, and bio pulled live from WordPress.', 'hatch' ),
				'group'       => 'archives',
				'default'     => true,
			),
			'author_archives' => array(
				'label'       => __( 'Author archive pages', 'hatch' ),
				'description' => __( 'Pages at /blog/author/{slug} listing all posts by an author.', 'hatch' ),
				'group'       => 'archives',
				'default'     => true,
			),
			'category_archives' => array(
				'label'       => __( 'Category archive pages', 'hatch' ),
				'description' => __( 'Pages at /blog/category/{slug} listing all posts in a category.', 'hatch' ),
				'group'       => 'archives',
				'default'     => true,
			),
			'category_tabs' => array(
				'label'       => __( 'Category tabs + Load More', 'hatch' ),
				'description' => __( 'Filterable category tabs on the blog index instead of pagination.', 'hatch' ),
				'group'       => 'archives',
				'default'     => true,
			),

			// SEO + structured data.
			'schema_passthrough' => array(
				'label'       => __( 'Auto-flow schema from RankMath / Yoast', 'hatch' ),
				'description' => __( 'Article, Person, BreadcrumbList JSON-LD flows from your SEO plugin to the frontend untouched.', 'hatch' ),
				'group'       => 'seo',
				'default'     => true,
			),
			'sitemap_merge' => array(
				'label'       => __( 'Merge WordPress + Astro sitemaps', 'hatch' ),
				'description' => __( 'Single /sitemap.xml at your frontend domain covering both static pages and CMS content.', 'hatch' ),
				'group'       => 'seo',
				'default'     => true,
			),

			// Engagement (new in v0.22).
			'comments' => array(
				'label'       => __( 'Comments on blog posts', 'hatch' ),
				'description' => __( 'Native WordPress comments rendered on the headless frontend with Turnstile anti-spam.', 'hatch' ),
				'group'       => 'engagement',
				'default'     => true,
			),
			'forms' => array(
				'label'       => __( 'Form block + newsletter capture', 'hatch' ),
				'description' => __( 'Single Hatch Form block that routes to Fluent Forms / WPForms / FluentCRM list based on what you have.', 'hatch' ),
				'group'       => 'engagement',
				'default'     => true,
			),
			'built_by_hatch' => array(
				'label'       => __( 'Show "Built by Hatch" in footer', 'hatch' ),
				'description' => __( 'Small credit link back to hatch.adityaarsharma.com. Disable to white-label.', 'hatch' ),
				'group'       => 'engagement',
				'default'     => true,
			),
		);
	}

	/**
	 * Group labels for the admin UI.
	 *
	 * @return array<string,string>
	 */
	public static function group_labels(): array {
		return array(
			'reading'    => __( 'Reading experience', 'hatch' ),
			'navigation' => __( 'Post navigation', 'hatch' ),
			'archives'   => __( 'Author + Archives', 'hatch' ),
			'seo'        => __( 'SEO + Structured Data', 'hatch' ),
			'engagement' => __( 'Engagement', 'hatch' ),
		);
	}

	/**
	 * Theme catalog (for the Theme picker in Features tab + setup wizard).
	 *
	 * @return array<string,array{label:string,description:string,icon:string}>
	 */
	public static function themes(): array {
		return array(
			'blog' => array(
				'label'       => __( 'Blog', 'hatch' ),
				'description' => __( 'Reading-first, minimal. For personal blogs, news, magazines.', 'hatch' ),
				'icon'        => '📰',
			),
			'tech' => array(
				'label'       => __( 'Tech', 'hatch' ),
				'description' => __( 'Developer blog with code blocks + dark mode. Vercel-blog vibe.', 'hatch' ),
				'icon'        => '⚙️',
			),
			'docs' => array(
				'label'       => __( 'Docs', 'hatch' ),
				'description' => __( 'Documentation with sidebar nav + search. Vercel-docs vibe.', 'hatch' ),
				'icon'        => '📚',
			),
			'astropaper' => array(
				'label'       => __( 'AstroPaper', 'hatch' ),
				'description' => __( 'Minimal, clean blogging theme. Light/dark, featured images.', 'hatch' ),
				'icon'        => '🗒️',
			),
			'astrowind' => array(
				'label'       => __( 'AstroWind', 'hatch' ),
				'description' => __( 'Business/marketing theme with hero, features, CTA sections.', 'hatch' ),
				'icon'        => '🌬️',
			),
			'astronano' => array(
				'label'       => __( 'Astro Nano', 'hatch' ),
				'description' => __( 'Ultra-minimal. Just words, no distractions. Personal writing.', 'hatch' ),
				'icon'        => '🔬',
			),
		);
	}

	/* ----------------------------------------------------------------
	 * Storage
	 * ---------------------------------------------------------------- */

	/**
	 * Get the current state of all features, with defaults filled in.
	 *
	 * @return array<string,bool>
	 */
	public static function get_all(): array {
		$stored  = (array) get_option( self::OPTION_KEY, array() );
		$catalog = self::catalog();
		$out     = array();
		foreach ( $catalog as $slug => $info ) {
			$out[ $slug ] = array_key_exists( $slug, $stored ) ? (bool) $stored[ $slug ] : (bool) $info['default'];
		}
		return $out;
	}

	/**
	 * Update features. Only known catalog slugs are written; unknown keys ignored.
	 *
	 * @param array<string,bool|string|int> $values Form-submitted values.
	 * @return void
	 */
	public static function update( array $values ): void {
		$catalog = self::catalog();
		$clean   = array();
		foreach ( $catalog as $slug => $info ) {
			$clean[ $slug ] = isset( $values[ $slug ] )
				? rest_sanitize_boolean( $values[ $slug ] )
				: false;
		}
		update_option( self::OPTION_KEY, $clean );
	}

	/**
	 * Get the current theme slug.
	 *
	 * @return string
	 */
	public static function get_theme(): string {
		$theme = (string) get_option( self::THEME_KEY, 'blog' );
		return array_key_exists( $theme, self::themes() ) ? $theme : 'blog';
	}

	/**
	 * Set theme — only accepts known slugs.
	 *
	 * @param string $slug
	 * @return bool True if changed.
	 */
	public static function set_theme( string $slug ): bool {
		if ( ! array_key_exists( $slug, self::themes() ) ) {
			return false;
		}
		return (bool) update_option( self::THEME_KEY, $slug );
	}

	/* ----------------------------------------------------------------
	 * REST endpoint
	 * ---------------------------------------------------------------- */

	/**
	 * Register /hatch/v1/features (public — frontend reads this).
	 *
	 * @return void
	 */
	public static function register_routes(): void {
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/features',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'route_features' ),
				// Public — the frontend reads this at build time without auth.
				// No sensitive data here; only feature flags.
				'permission_callback' => '__return_true',
			)
		);
	}

	/**
	 * GET /hatch/v1/features
	 *
	 * Returns the Astro frontend everything it needs to render the right
	 * theme + toggle the right features + display the right WP-General-
	 * Settings-driven site name/tagline/language. All fields are read fresh
	 * from WP options on every call; the frontend should edge-cache the
	 * response for 60s (Cache-Control set on the page response, not here).
	 *
	 * @return WP_REST_Response
	 */
	public static function route_features(): WP_REST_Response {
		$show_on_front     = get_option( 'show_on_front', 'posts' );
		$static_page_id    = (int) get_option( 'page_on_front', 0 );
		$static_page_slug  = '';
		if ( 'page' === $show_on_front && $static_page_id > 0 ) {
			$page = get_post( $static_page_id );
			if ( $page && 'page' === $page->post_type && 'publish' === $page->post_status ) {
				$static_page_slug = (string) $page->post_name;
			}
		}

		// Custom Post Types with show_in_rest=true — frontend uses this to
		// know which CPT routes to expose. Excludes WP built-ins.
		$cpts = array();
		foreach ( get_post_types( array( 'public' => true, 'show_in_rest' => true ), 'objects' ) as $pt ) {
			if ( in_array( $pt->name, array( 'post', 'page', 'attachment' ), true ) ) {
				continue;
			}
			$rest_base = ! empty( $pt->rest_base ) ? $pt->rest_base : $pt->name;
			$cpts[]    = array(
				'slug'      => $pt->name,
				'rest_base' => $rest_base,
				'label'     => $pt->labels->name ?? $pt->name,
				'singular'  => $pt->labels->singular_name ?? $pt->name,
			);
		}

		// Integrations snapshot (SEO/forms/turnstile/comments) — same shape as
		// /hatch/v1/integrations but embedded so the frontend only needs ONE
		// fetch to render every page.
		$integrations = null;
		if ( class_exists( 'Hatch_Integrations' ) ) {
			$ia = Hatch_Integrations::get_all();
			$integrations = array(
				'seo' => array(
					'detected' => Hatch_Integrations::detect_seo(),
					'mode'     => $ia['seo']['mode'],
					'schema'   => (bool) $ia['seo']['schema'],
					'sitemap'  => (bool) $ia['seo']['sitemap'],
				),
				'forms' => array(
					'detected'            => Hatch_Integrations::detect_forms(),
					'mode'                => $ia['forms']['mode'],
					'default_form_id'     => (int) $ia['forms']['default_form_id'],
				),
				'turnstile' => array(
					'enabled'  => (bool) $ia['turnstile']['enabled'],
					'site_key' => (string) $ia['turnstile']['site_key'],
				),
				'comments' => array(
					'enabled'       => (bool) $ia['comments']['enabled'],
					'require_login' => (bool) $ia['comments']['require_login'],
					'moderate'      => (bool) $ia['comments']['moderate'],
					'turnstile'     => (bool) $ia['comments']['turnstile'],
				),
			);
		}

		// Design tokens (v0.23) — flow user's design.md into the response so
		// the Astro side can inject CSS vars in one fetch. Body is omitted
		// from the public payload (used only by AI rebuild flows later).
		$design = null;
		if ( class_exists( 'Hatch_Design_Loader' ) ) {
			$design = Hatch_Design_Loader::get_design();
			unset( $design['body'] );
		}

		return new WP_REST_Response( array(
			'theme'    => self::get_theme(),
			'design'   => $design,
			'features' => self::get_all(),
			'site'     => array(
				'name'        => get_bloginfo( 'name' ),
				'description' => get_bloginfo( 'description' ),
				'url'         => home_url(),
				'language'    => get_bloginfo( 'language' ),
				'icon_url'    => function_exists( 'get_site_icon_url' ) ? get_site_icon_url() : '',
				// v0.41 — WP Site Identity → Logo (Customizer custom-logo). Resolves to the
				// uploaded image URL. Used by the Astro SiteHeader to render a logo image
				// when set; falls back to text + 🐣 mark when empty.
				'logo_url'    => (function () {
					$id = (int) get_theme_mod( 'custom_logo', 0 );
					if ( ! $id ) {
						$id = (int) get_option( 'site_logo', 0 );
					}
					if ( ! $id ) { return ''; }
					$src = wp_get_attachment_image_src( $id, 'full' );
					return is_array( $src ) ? (string) $src[0] : '';
				})(),
			),
			'home' => array(
				// 'posts' = default WP blog homepage. 'page' = a Page set as static homepage.
				'mode'              => $show_on_front,
				'static_page_slug'  => $static_page_slug,
				'static_page_id'    => $static_page_id,
			),
			'cpts'            => $cpts,
			'integrations'    => $integrations,
			'image_proxy_url' => get_option( 'hatch_image_proxy_url', '' ),
			'version'         => defined( 'HATCH_VERSION' ) ? HATCH_VERSION : '',
		), 200 );
	}
}

add_action( 'rest_api_init', array( 'Hatch_Features', 'register_routes' ) );

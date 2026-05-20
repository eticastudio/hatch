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

			// Per-post chrome (lives under Reading experience now that route-level
			// archive toggles were stripped out).
			'author_bio' => array(
				'label'       => __( 'Author bio on single posts', 'hatch' ),
				'description' => __( 'Author avatar, name, and bio pulled live from WordPress.', 'hatch' ),
				'group'       => 'reading',
				'default'     => true,
			),
			// Archives / blog index layout — aesthetic only (visual chrome on
			// the index page). Route-level toggles (`author_archives`,
			// `category_archives`) were removed in v0.50.14 — those are routing
			// concerns, not aesthetics, and they were dead (the Astro routes
			// never read the toggle).
			'category_tabs' => array(
				'label'       => __( 'Category tabs + Load More', 'hatch' ),
				'description' => __( 'Filterable category tabs on the blog index instead of pagination.', 'hatch' ),
				'group'       => 'archives',
				'default'     => true,
			),

			// Footer.
			'built_by_hatch' => array(
				'label'       => __( 'Show "Built by Hatch" in footer', 'hatch' ),
				'description' => __( 'Small credit link back to hatch.adityaarsharma.com. Disable to white-label.', 'hatch' ),
				'group'       => 'footer',
				'default'     => true,
			),

			// v0.50.14 — DELETED from this catalog (moved out of Design tab):
			//   schema_passthrough / sitemap_merge → SEO plugin (Plugin Bridge surfaces it)
			//   comments / forms → Content tab (Comments owned by Hatch; Forms by form plugin)
			//   author_archives / category_archives → route concerns, were never wired
			// Design is now strictly the aesthetic surface of the Astro frontend.
		);
	}

	/**
	 * Group labels for the admin UI.
	 *
	 * @return array<string,string>
	 */
	public static function group_labels(): array {
		// v0.50.14 — labels reflect what's actually in each group after the
		// non-aesthetic catalog entries were stripped. `seo` / `engagement`
		// groups are gone because their only members moved out of Design.
		return array(
			'reading'    => __( 'Reading experience', 'hatch' ),
			'navigation' => __( 'Post navigation', 'hatch' ),
			'archives'   => __( 'Blog index', 'hatch' ),
			'footer'     => __( 'Footer', 'hatch' ),
		);
	}

	/**
	 * Theme catalog (for the Theme picker in Features tab + setup wizard).
	 *
	 * @return array<string,array{label:string,description:string,icon:string}>
	 */
	public static function themes(): array {
		// v0.50.25 — Each slot now maps to a SPECIFIC upstream theme that Hatch
		// vendors verbatim (git-cloned into astro-starter/themes/<slug>/).
		// `repo` + `demo` + `author` are exposed to the admin UI so the theme
		// card renders a "Demo ↗" link and credits the original author.
		// All upstream themes are MIT-licensed.
		// v0.50.27 — Honest naming: Hatch owns 100% of these themes. They are
		// inspired by famous Astro themes (Erudite / AstroPaper / etc.) but
		// they are Hatch-native implementations built for WordPress content
		// from day one — no upstream vendoring, no upstream drift to track,
		// no peer-dep maintenance. Slugs preserved so existing saves persist.
		return array(
			'blog' => array(
				'label'       => __( 'Editorial', 'hatch' ),
				'description' => __( 'Reading-first, minimal. Personal blogs, magazines, news.', 'hatch' ),
				'icon'        => '📰',
			),
			'tech' => array(
				'label'       => __( 'Terminal', 'hatch' ),
				'description' => __( 'Developer blog with mono headings, code blocks, dark mode.', 'hatch' ),
				'icon'        => '⚙️',
			),
			'docs' => array(
				'label'       => __( 'Docs', 'hatch' ),
				'description' => __( 'Documentation layout with sidebar category nav + search.', 'hatch' ),
				'icon'        => '📚',
			),
			'astropaper' => array(
				'label'       => __( 'Newspaper', 'hatch' ),
				'description' => __( 'Serif editorial column with newspaper masthead + drop-cap.', 'hatch' ),
				'icon'        => '🗒️',
			),
			'astrowind' => array(
				'label'       => __( 'Marketing', 'hatch' ),
				'description' => __( 'Business / marketing layout with big hero, CTA, multi-col footer.', 'hatch' ),
				'icon'        => '🌬️',
			),
			'astronano' => array(
				'label'       => __( 'Minimal', 'hatch' ),
				'description' => __( 'Ultra-minimal. Just words. Narrow column, no decoration.', 'hatch' ),
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
			// v0.50.20 — merge borders + breakpoints so the Astro
			// designToCssVars() can emit --hatch-border-color, --hatch-shadow,
			// --hatch-bp-* vars. These groups are stored separately from the
			// design.md parsed cache so we hydrate them here at payload time.
			$design['borders']     = (array) get_option( 'hatch_design_borders',     array( 'color' => '#e5e5e5', 'shadow' => 'soft' ) );
			$design['breakpoints'] = (array) get_option( 'hatch_design_breakpoints', array( 'mobile' => 640, 'tablet' => 1024, 'desktop' => 1280 ) );
		}

		// v0.50.15 — Aesthetic option groups. Pure key-value pass-through:
		// every group has WP-side defaults filled in via wp_parse_args in the
		// admin boot state, so the frontend can trust the shape and the
		// payload survives partial saves without losing sibling keys.
		$aesthetic_defaults = array(
			'share' => array(
				'x' => true, 'linkedin' => true, 'whatsapp' => true, 'copy' => true,
				'facebook' => false, 'reddit' => false, 'email' => false,
				'position' => 'inline',
			),
			'header' => array(
				'sticky' => 'sticky', 'blur' => true,
				'color_mode_button' => true, 'brand_mark' => 'icon_text',
				// v0.50.31 — logo / text / both / auto. SiteHeader.astro reads this.
				'brand_display' => 'auto',
			),
			'reading' => array(
				'date_format' => 'long', 'reading_time_label' => 'min_read',
				'breadcrumb_separator' => 'slash', 'toc_depth' => 'h2_h3',
				'toc_label' => 'On this page', 'author_avatar_shape' => 'circle',
				'progress_bar_position' => 'top', 'progress_bar_color' => 'primary',
				'heading_anchors' => false,
			),
			'images' => array(
				'lightbox' => true, 'lazy_load' => true, 'hover_zoom' => true,
				'fallback_gradient' => true, 'retina_2x' => true, 'aspect_ratio' => '2_1',
			),
			'animation' => array(
				'page_transitions' => true, 'respect_reduced_motion' => true,
			),
			'blog_index' => array(
				'archive_grid' => '3', 'pagination_style' => 'load_more',
				'show_hero' => true, 'show_topics' => true,
			),
			'post_navigation' => array(
				'related_count' => 3, 'related_source' => 'category',
			),
		);
		$aesthetic = array();
		foreach ( $aesthetic_defaults as $group => $defaults ) {
			$aesthetic[ $group ] = wp_parse_args(
				(array) get_option( "hatch_design_{$group}", array() ),
				$defaults
			);
		}

		// v0.50.31 — Emit `content` block so Astro can honor the Comments toggle.
		// Was a zombie control: saved to hatch_content_flags but never sent in
		// payload, so HatchComments.astro had no way to check it.
		$content_flags = (array) get_option( 'hatch_content_flags', array() );
		$content       = array(
			'comments_enabled'   => isset( $content_flags['comments_enabled'] )   ? (bool) $content_flags['comments_enabled']   : true,
			'comments_turnstile' => isset( $content_flags['comments_turnstile'] ) ? (bool) $content_flags['comments_turnstile'] : false,
		);

		// Emit `perf` block. Every key here is read at RUNTIME by PageLayout /
		// middleware (prefetch / partytown / compress_html / telemetry /
		// image_layout / image_proxy). Build-time-only knobs (image_service,
		// output_mode, inline_stylesheets) are exposed read-only for the admin
		// Status tab — Astro reads them from astro.config.mjs at build time.
		$perf_opt = (array) get_option( 'hatch_perf', array() );
		$perf     = array(
			// runtime
			'image_proxy'        => (bool) get_option( 'hatch_image_proxy_url', '' ),
			'prefetch_enabled'   => isset( $perf_opt['prefetch_enabled'] )   ? (bool) $perf_opt['prefetch_enabled']   : true,
			'prefetch_strategy'  => (string) ( $perf_opt['prefetch_strategy'] ?? 'hover' ),
			'partytown'          => isset( $perf_opt['partytown_enabled'] )  ? (bool) $perf_opt['partytown_enabled']  : false,
			'compress_html'      => isset( $perf_opt['compress_html'] )      ? (bool) $perf_opt['compress_html']      : true,
			'telemetry'          => isset( $perf_opt['telemetry'] )          ? (bool) $perf_opt['telemetry']          : false,
			'image_layout'       => (string) ( $perf_opt['image_layout'] ?? 'constrained' ),
			// build-time (read-only at runtime; affects next build)
			'image_service'      => (string) ( $perf_opt['image_service'] ?? 'sharp' ),
			'output_mode'        => (string) ( $perf_opt['output_mode']   ?? 'server' ),
			'inline_stylesheets' => (string) ( $perf_opt['inline_stylesheets'] ?? 'auto' ),
		);

		return new WP_REST_Response( array(
			'theme'    => self::get_theme(),
			'design'   => $design,
			'aesthetic'=> $aesthetic,
			'content'  => $content,
			'perf'     => $perf,
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

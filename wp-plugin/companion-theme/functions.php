<?php
/**
 * Hatch Companion theme — minimal, headless-first.
 *
 * Goals:
 *   - Visiting the raw WP URL on a real browser → 302 to the frontend.
 *   - The wp-admin / wp-login / REST stay accessible.
 *   - Editors get a small "you're using Hatch" notice in /wp-admin.
 *   - Theme supports just enough to keep block editor + Gutenberg happy.
 *
 * @package Hatch_Companion
 */

defined( 'ABSPATH' ) || exit;

/**
 * Read the configured frontend URL (Hatch plugin stores it on connect).
 *
 * @return string
 */
function hatch_companion_frontend_url(): string {
	$candidates = array(
		get_option( 'hatch_frontend_url' ),
		get_option( 'hatch_agent_frontend_url' ),
		get_option( 'hatch_deploy_last_url' ),
	);
	foreach ( $candidates as $u ) {
		if ( is_string( $u ) && $u !== '' ) {
			return esc_url_raw( $u );
		}
	}
	return '';
}

/**
 * Redirect frontend visitors to the headless site when configured.
 *
 * v0.42 — Logged-in admins used to be exempt entirely so they'd see the
 * headless splash. But that meant visiting `/sample-page/` as admin showed
 * the splash instead of the live page. New rule: admins see the splash
 * ONLY on the bare home URL (`/`). Every specific content URL — single
 * posts, pages, archives, taxonomy terms — redirects to the frontend
 * for everyone, including admins. Editors clicking "View Post" / typing
 * a URL get the live page, not a placeholder.
 *
 * Always skips: REST, admin, AJAX, XMLRPC, preview, robots.txt,
 * /wp-*, /feed, /sitemap.
 */
add_action( 'template_redirect', function () {
	if (
		is_admin() || is_robots() || is_preview() ||
		( defined( 'DOING_AJAX' ) && DOING_AJAX ) ||
		( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST ) ||
		( defined( 'REST_REQUEST' ) && REST_REQUEST )
	) {
		return;
	}
	$target = hatch_companion_frontend_url();
	if ( ! $target ) {
		return;
	}
	$path = isset( $_SERVER['REQUEST_URI'] ) ? (string) $_SERVER['REQUEST_URI'] : '/';
	if ( strpos( $path, '/wp-' ) === 0 || strpos( $path, '/feed' ) === 0 || strpos( $path, '/sitemap' ) === 0 ) {
		return;
	}

	// Admins keep the splash only on the home URL.
	if ( is_user_logged_in() ) {
		$clean = strtok( $path, '?' );
		$clean = rtrim( (string) $clean, '/' );
		if ( '' === $clean ) {
			return; // home — show the splash
		}
		// otherwise fall through to redirect — admin asked for a real URL
	}

	wp_safe_redirect( rtrim( $target, '/' ) . $path, 302, 'Hatch Companion' );
	exit;
}, 0 );

/**
 * Theme support — enough for block editor + REST.
 */
add_action( 'after_setup_theme', function () {
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption' ) );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'wp-block-styles' );
	register_nav_menu( 'primary', __( 'Primary (used by Hatch frontend)', 'hatch-companion' ) );
} );

/**
 * "You're using Hatch" notice on the wp-admin Dashboard.
 */
add_action( 'admin_notices', function () {
	$screen = get_current_screen();
	if ( ! $screen || 'dashboard' !== $screen->id ) {
		return;
	}
	$front = hatch_companion_frontend_url();
	?>
	<div class="notice notice-info" style="border-left-color:#ff6b35;">
		<p style="font-size:14px;">
			<strong>🐣 Hatch Companion theme is active.</strong>
			<?php if ( $front ): ?>
				Visitors are redirected to <a href="<?php echo esc_url( $front ); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html( $front ); ?></a>.
			<?php else: ?>
				Set the frontend URL in <a href="<?php echo esc_url( admin_url( 'tools.php?page=hatch' ) ); ?>">Tools → Hatch</a> and redirects will turn on automatically.
			<?php endif; ?>
		</p>
	</div>
	<?php
} );

/**
 * Minimal head for non-redirected fallback (e.g. when no frontend URL is set
 * yet). Keeps WP usable for editors clicking "View site".
 */
add_action( 'wp_head', function () {
	echo '<meta name="generator" content="Hatch Companion · headless WordPress">' . "\n";
} );

/**
 * v0.25 — "View Post / Page / CPT" buttons in wp-admin should open the LIVE
 * headless URL, not the local WP URL. We filter the permalink functions so
 * `get_permalink()` returns `<frontend>/<path>` whenever a frontend URL is
 * configured. The Astro routes match WP slugs 1:1.
 *
 * Posts → /blog/{slug}
 * Pages → /{slug}
 * CPT   → /{rest_base or slug}/{post_slug}
 */
function hatch_companion_rewrite_permalink( string $permalink, $post ): string {
	$front = hatch_companion_frontend_url();
	if ( ! $front || ! $post || ! isset( $post->post_type ) ) {
		return $permalink;
	}
	if ( 'publish' !== ( $post->post_status ?? '' ) && ! is_user_logged_in() ) {
		return $permalink;
	}

	$slug = $post->post_name;
	if ( '' === $slug ) {
		return $permalink;
	}

	switch ( $post->post_type ) {
		case 'post':
			$path = '/blog/' . rawurlencode( $slug );
			break;
		case 'page':
			$path = '/' . rawurlencode( $slug );
			break;
		case 'attachment':
			return $permalink; // media keeps its WP URL
		default:
			$pt   = get_post_type_object( $post->post_type );
			$base = ( $pt && ! empty( $pt->rest_base ) ) ? $pt->rest_base : $post->post_type;
			$path = '/' . rawurlencode( $base ) . '/' . rawurlencode( $slug );
			break;
	}
	return rtrim( $front, '/' ) . $path;
}
add_filter( 'post_link',      'hatch_companion_rewrite_permalink', 20, 2 );
add_filter( 'page_link',      'hatch_companion_rewrite_permalink', 20, 2 );
add_filter( 'post_type_link', 'hatch_companion_rewrite_permalink', 20, 2 );

/**
 * Same trick for category / tag / author archives — point at the headless
 * archive routes when configured. Falls back to WP URLs otherwise.
 */
add_filter( 'term_link', function ( string $url, $term, string $taxonomy ): string {
	$front = hatch_companion_frontend_url();
	if ( ! $front || ! $term || empty( $term->slug ) ) {
		return $url;
	}
	if ( 'category' === $taxonomy ) {
		return rtrim( $front, '/' ) . '/blog/category/' . rawurlencode( $term->slug );
	}
	if ( 'post_tag' === $taxonomy ) {
		return rtrim( $front, '/' ) . '/blog/tag/' . rawurlencode( $term->slug );
	}
	return $url;
}, 20, 3 );

add_filter( 'author_link', function ( string $url, int $author_id, string $author_nicename ): string {
	$front = hatch_companion_frontend_url();
	if ( ! $front || '' === $author_nicename ) {
		return $url;
	}
	return rtrim( $front, '/' ) . '/blog/author/' . rawurlencode( $author_nicename );
}, 20, 3 );

/**
 * Frontend homepage link — used by the "Visit site" button in the admin bar
 * and by core's get_home_url() consumers. Point it at the headless root.
 *
 * v0.40 — CRITICAL BUGFIX. The previous skip-check used `str_starts_with('/wp-')`
 * but WP core calls `home_url('wp-json', 'rest')` WITHOUT a leading slash to
 * build REST URLs. The skip never matched, so Gutenberg's REST URL got
 * rewritten to the Cloudflare Workers frontend URL. Saves POSTed cross-origin
 * to a 404 page → CORS error → "Updating failed. Could not get a valid
 * response from the server."
 *
 * Fix: (1) bail immediately when $orig_scheme === 'rest' (the canonical
 * signal that REST URL is being built), (2) bail when REST_REQUEST is true
 * (we're INSIDE a REST request), (3) check paths both with and without
 * leading slash, (4) add explicit wp-json prefix.
 */
add_filter( 'home_url', function ( string $url, string $path, $orig_scheme, $blog_id ): string {
	unset( $blog_id );
	// (1) The REST URL builder always passes 'rest' as orig_scheme.
	if ( 'rest' === $orig_scheme ) {
		return $url;
	}
	// (2) We're inside a REST request — never override.
	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
		return $url;
	}
	// (3) Only override in admin context.
	if ( ! is_admin() ) {
		return $url;
	}
	// (4) Skip ANY core/admin/REST/feed path with or without leading slash.
	$p = ltrim( (string) $path, '/' );
	if ( '' !== $p ) {
		foreach ( array( 'wp-json', 'wp-admin', 'wp-login', 'wp-content', 'wp-includes', 'wp-cron', 'feed', 'sitemap', 'xmlrpc' ) as $prefix ) {
			if ( str_starts_with( $p, $prefix ) ) {
				return $url;
			}
		}
	}
	$front = hatch_companion_frontend_url();
	if ( ! $front ) {
		return $url;
	}
	return rtrim( $front, '/' ) . ( $path ? '/' . ltrim( $path, '/' ) : '' );
}, 20, 4 );

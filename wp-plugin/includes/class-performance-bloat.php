<?php
/**
 * Hatch_Performance_Bloat
 *
 * One-click "Kill WP bloat" for headless setups. Every killer here removes
 * something the Astro frontend does NOT need, so the WP origin ships less
 * markup, fewer requests, and leaks less version info.
 *
 * Options:
 *   - hatch_perf_bloat_kill         (bool, master switch)
 *   - hatch_perf_bloat[emoji|embed|xmlrpc|head_cruft|block_css|jquery_migrate|oembed|rest_users|self_pingback|feeds]
 *
 * Master switch ON → every individual killer runs regardless of the
 * per-item flags (so users get the promised benefit without micromanaging).
 * Master switch OFF → only killers whose per-item flag is true run
 * (the "Advanced" opt-in path).
 *
 * All hooks run at init/wp_enqueue_scripts priorities that fire BEFORE the
 * default emitters, so the removals stick.
 *
 * Safe by design for a headless install:
 *   - Emoji script: unicode already renders natively in modern browsers.
 *   - wp-embed.js: WP isn't rendered in third-party sites via oEmbed.
 *   - XML-RPC: closes top brute-force vector; no Jetpack/mobile writes here.
 *   - Head cruft: RSD / WLW / generator / shortlink / adjacent posts / feed
 *     discovery / REST root link — none consumed by Astro.
 *   - Block library CSS + global styles: WP frontend is never shown to end
 *     users when Hatch redirects it; safe to dequeue.
 *   - jQuery Migrate: pre-2020 plugin BC only; deregistered on frontend.
 *   - REST /wp/v2/users (anon): stops author enumeration.
 *   - Self-pingbacks: junk internal-link comments.
 *   - Feeds: Astro owns /blog/rss.xml — redirect WP feeds there when the
 *     frontend URL is known, else return 410 Gone.
 *
 * @package Hatch
 * @since   0.51
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Performance_Bloat {

	/** Option key — master switch. */
	const OPT_MASTER = 'hatch_perf_bloat_kill';

	/** Option key — per-item flags (assoc array). */
	const OPT_ITEMS  = 'hatch_perf_bloat';

	/** Canonical list of killers exposed in the UI + REST + apply loop. */
	public static function killers(): array {
		return array(
			'emoji'          => true,
			'embed'          => true,
			'xmlrpc'         => true,
			'head_cruft'     => true,
			'block_css'      => true,
			'jquery_migrate' => true,
			'oembed'         => true,
			'rest_users'     => true,
			'self_pingback'  => true,
			'feeds'          => false, // opt-in: needs Astro RSS to exist first
		);
	}

	/**
	 * Return the effective on/off map: {slug => bool}.
	 * Master ON forces every safe killer on (except `feeds`, which is opt-in
	 * even with master because it needs a working Astro RSS).
	 */
	public static function state(): array {
		$master = (bool) get_option( self::OPT_MASTER, false );
		$items  = (array) get_option( self::OPT_ITEMS, array() );
		$out    = array();
		foreach ( self::killers() as $slug => $default_on_with_master ) {
			if ( $master && $default_on_with_master ) {
				$out[ $slug ] = true;
			} else {
				$out[ $slug ] = ! empty( $items[ $slug ] );
			}
		}
		return $out;
	}

	public static function init(): void {
		$on = self::state();

		if ( $on['emoji'] )          self::kill_emoji();
		if ( $on['embed'] )          self::kill_wp_embed();
		if ( $on['xmlrpc'] )         self::kill_xmlrpc();
		if ( $on['head_cruft'] )     self::kill_head_cruft();
		if ( $on['block_css'] )      self::kill_block_library_css();
		if ( $on['jquery_migrate'] ) self::kill_jquery_migrate();
		if ( $on['oembed'] )         self::kill_oembed_discovery();
		if ( $on['rest_users'] )     self::lock_rest_users();
		if ( $on['self_pingback'] )  self::kill_self_pingback();
		if ( $on['feeds'] )          self::redirect_feeds();
	}

	// ── Individual killers ─────────────────────────────────────────────────

	private static function kill_emoji(): void {
		remove_action( 'wp_head',             'print_emoji_detection_script', 7 );
		remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
		remove_action( 'wp_print_styles',     'print_emoji_styles' );
		remove_action( 'admin_print_styles',  'print_emoji_styles' );
		remove_filter( 'the_content_feed',    'wp_staticize_emoji' );
		remove_filter( 'comment_text_rss',    'wp_staticize_emoji' );
		remove_filter( 'wp_mail',             'wp_staticize_emoji_for_email' );
		add_filter( 'tiny_mce_plugins', static function ( $plugins ) {
			return is_array( $plugins ) ? array_diff( $plugins, array( 'wpemoji' ) ) : array();
		} );
		add_filter( 'emoji_svg_url', '__return_false' );
		// DNS-prefetch to s.w.org is added via wp_resource_hints — strip.
		add_filter( 'wp_resource_hints', static function ( $urls, $relation ) {
			if ( 'dns-prefetch' !== $relation ) return $urls;
			return array_values( array_filter( (array) $urls, static function ( $u ) {
				return false === strpos( (string) $u, 's.w.org' );
			} ) );
		}, 10, 2 );
	}

	private static function kill_wp_embed(): void {
		add_action( 'wp_footer', static function () {
			wp_dequeue_script( 'wp-embed' );
		}, 100 );
	}

	private static function kill_xmlrpc(): void {
		add_filter( 'xmlrpc_enabled', '__return_false' );
		remove_action( 'wp_head', 'rsd_link' );
		add_filter( 'wp_headers', static function ( $headers ) {
			if ( is_array( $headers ) ) unset( $headers['X-Pingback'] );
			return $headers;
		} );
		add_filter( 'xmlrpc_methods', static function ( $methods ) {
			if ( ! is_array( $methods ) ) return $methods;
			unset( $methods['pingback.ping'], $methods['pingback.extensions.getPingbacks'] );
			return $methods;
		} );
	}

	private static function kill_head_cruft(): void {
		remove_action( 'wp_head', 'wlwmanifest_link' );
		remove_action( 'wp_head', 'wp_generator' );
		remove_action( 'wp_head', 'wp_shortlink_wp_head' );
		remove_action( 'wp_head', 'adjacent_posts_rel_link_wp_head', 10 );
		remove_action( 'wp_head', 'feed_links_extra', 3 );
		remove_action( 'wp_head', 'rest_output_link_wp_head' );
		remove_action( 'template_redirect', 'wp_shortlink_header', 11 );
		// Also strip the "generator" meta from RSS/atom.
		add_filter( 'the_generator', '__return_empty_string' );
	}

	private static function kill_block_library_css(): void {
		add_action( 'wp_enqueue_scripts', static function () {
			wp_dequeue_style( 'wp-block-library' );
			wp_dequeue_style( 'wp-block-library-theme' );
			wp_dequeue_style( 'global-styles' );
			wp_dequeue_style( 'classic-theme-styles' );
		}, 100 );
		remove_action( 'wp_body_open', 'wp_global_styles_render_svg_filters' );
	}

	private static function kill_jquery_migrate(): void {
		// Frontend-only: keep admin BC so old plugins don't break wp-admin.
		add_action( 'wp_default_scripts', static function ( $scripts ) {
			if ( is_admin() ) return;
			if ( ! empty( $scripts->registered['jquery'] ) && is_array( $scripts->registered['jquery']->deps ) ) {
				$scripts->registered['jquery']->deps = array_diff(
					$scripts->registered['jquery']->deps,
					array( 'jquery-migrate' )
				);
			}
		} );
	}

	private static function kill_oembed_discovery(): void {
		remove_action( 'wp_head', 'wp_oembed_add_discovery_links' );
		remove_action( 'wp_head', 'wp_oembed_add_host_js' );
		remove_action( 'rest_api_init', 'wp_oembed_register_route' );
		add_filter( 'embed_oembed_discover', '__return_false' );
	}

	private static function lock_rest_users(): void {
		add_filter( 'rest_endpoints', static function ( $endpoints ) {
			if ( ! is_array( $endpoints ) ) return $endpoints;
			// Only strip anonymous read; leave the routes for authenticated
			// callers (Hatch itself uses app-password auth so this doesn't
			// block the bridge).
			foreach ( array( '/wp/v2/users', '/wp/v2/users/(?P<id>[\\d]+)' ) as $route ) {
				if ( isset( $endpoints[ $route ] ) && is_array( $endpoints[ $route ] ) ) {
					foreach ( $endpoints[ $route ] as $i => $ep ) {
						if ( isset( $ep['methods'] ) && ( 'GET' === $ep['methods'] || ( is_array( $ep['methods'] ) && ! empty( $ep['methods']['GET'] ) ) ) ) {
							// Wrap the existing permission callback so anonymous GETs are denied.
							$endpoints[ $route ][ $i ]['permission_callback'] = static function () {
								return is_user_logged_in();
							};
						}
					}
				}
			}
			return $endpoints;
		} );
	}

	private static function kill_self_pingback(): void {
		add_action( 'pre_ping', static function ( &$links ) {
			if ( ! is_array( $links ) ) return;
			$home = home_url();
			foreach ( $links as $i => $link ) {
				if ( 0 === strpos( (string) $link, $home ) ) unset( $links[ $i ] );
			}
		} );
	}

	private static function redirect_feeds(): void {
		$astro = untrailingslashit( (string) get_option( 'hatch_frontend_url', '' ) );
		$target = $astro ? $astro . '/blog/rss.xml' : '';
		$actions = array(
			'do_feed', 'do_feed_rdf', 'do_feed_rss', 'do_feed_rss2', 'do_feed_atom',
			'do_feed_rss2_comments', 'do_feed_atom_comments',
		);
		foreach ( $actions as $a ) {
			remove_all_actions( $a, 1 );
			add_action( $a, static function () use ( $target ) {
				if ( $target ) {
					wp_safe_redirect( $target, 301 );
				} else {
					status_header( 410 );
					header( 'Content-Type: text/plain; charset=utf-8' );
					echo "Feed disabled by Hatch (headless mode).\n";
				}
				exit;
			}, 1 );
		}
	}
}

// Boot early enough that remove_action() beats the default WP registrations
// (most of which are hung on plugins_loaded / init at default priority).
add_action( 'init', array( 'Hatch_Performance_Bloat', 'init' ), 1 );

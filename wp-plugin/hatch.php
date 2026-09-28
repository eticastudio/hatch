<?php
/**
 * Plugin Name:       Hatch
 * Description:       Turn WordPress into a headless CMS with an Astro frontend on Cloudflare Workers. Deploys from wp-admin with your own Cloudflare API token, plus security hardening, an image proxy, a REST bridge and a React admin.
 * Version:           0.7.6.1
 * Requires at least: 6.4
 * Tested up to:      7.0
 * Requires PHP:      7.4
 * Author:            Aditya Sharma
 * Author URI:        https://adityaarsharma.com
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       hatch-bridge
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

define( 'HATCH_VERSION', '0.7.6.1' );
define( 'HATCH_PLUGIN_FILE', __FILE__ );
define( 'HATCH_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'HATCH_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'HATCH_REST_NAMESPACE', 'hatch/v1' );

/**
 * v0.35 - open "View Post / View Page / View CPT" in a new tab. Row actions
 * on the post list table only.
 *
 * v0.47 - extend to the editor toolbar's "View" / "Preview" arrow. Those
 * buttons read the post's permalink (filtered via post_link/page_link/
 * post_type_link) and the preview URL (preview_post_link). When a headless
 * frontend URL is configured we rewrite the permalink to point at the
 * frontend directly so the new tab lands on the live page in one hop -
 * not on wp-admin, not even via a 302 through the WP origin.
 */
/**
 * v0.50.12 - Every WP link that points at the headless frontend opens in a
 * new tab. Rationale: in headless mode the frontend lives on a different
 * origin (your Cloudflare Workers address), so following it in the same tab kicks
 * the user out of wp-admin and they have to navigate back manually. Keeping
 * WP open in the background is the editor flow people actually want.
 *
 * Applies to: post/page/CPT row actions ("View"), Quick Edit "Preview",
 * editor toolbar "View" / "Preview" arrow, admin bar "Visit Site".
 */
function hatch_force_view_links_new_tab( array $actions ): array {
	if ( '' === hatch_frontend_origin() ) {
		return $actions;
	}
	foreach ( array( 'view', 'preview' ) as $key ) {
		if ( empty( $actions[ $key ] ) ) {
			continue;
		}
		// Inject target/rel into the <a> tag without re-parsing. WP row actions
		// are always a single <a ...>label</a> - safe to regex.
		$actions[ $key ] = preg_replace(
			'/<a\b(?![^>]*\btarget=)/i',
			'<a target="_blank" rel="noopener noreferrer"',
			$actions[ $key ],
			1
		);
	}
	return $actions;
}
add_filter( 'post_row_actions', 'hatch_force_view_links_new_tab', 99, 1 );
add_filter( 'page_row_actions', 'hatch_force_view_links_new_tab', 99, 1 );

/**
 * v0.49.4 - Admin bar "Visit Site" → new tab. The site root in headless mode
 * always points at the hosted Cloudflare domain, so users explicitly
 * want it in a new window so wp-admin stays open.
 */
add_action( 'wp_before_admin_bar_render', 'hatch_admin_bar_visit_site_new_tab', 100 );
function hatch_admin_bar_visit_site_new_tab(): void {
	global $wp_admin_bar;
	if ( ! ( $wp_admin_bar instanceof WP_Admin_Bar ) ) {
		return;
	}
	foreach ( array( 'view-site', 'site-name' ) as $node_id ) {
		$node = $wp_admin_bar->get_node( $node_id );
		if ( ! $node ) {
			continue;
		}
		$meta           = is_array( $node->meta ) ? $node->meta : array();
		$meta['target'] = '_blank';
		$meta['rel']    = trim( ( $meta['rel'] ?? '' ) . ' noopener' );
		$wp_admin_bar->add_node(
			array(
				'id'   => $node->id,
				'meta' => $meta,
			)
		);
	}
}

/**
 * Return the configured headless frontend origin (no trailing slash), or ''
 * if not set. Cached per-request.
 */
function hatch_frontend_origin(): string {
	static $cached = null;
	if ( null !== $cached ) {
		return $cached;
	}
	$url    = trim( (string) get_option( 'hatch_frontend_url', '' ) );
	$cached = $url ? untrailingslashit( $url ) : '';
	return $cached;
}

/**
 * Rewrite a WP origin URL ($url) so its path is served by the headless
 * frontend. Returns the original URL when no frontend is configured.
 */
function hatch_rewrite_to_frontend( string $url ): string {
	$front = hatch_frontend_origin();
	if ( '' === $front || '' === $url ) {
		return $url;
	}
	$parts = wp_parse_url( $url );
	if ( ! is_array( $parts ) || empty( $parts['host'] ) ) {
		return $url;
	}
	$home = wp_parse_url( home_url() );
	if ( ! is_array( $home ) || empty( $home['host'] ) ) {
		return $url;
	}
	if ( strcasecmp( $parts['host'], $home['host'] ) !== 0 ) {
		return $url;
	}
	$path  = isset( $parts['path'] ) ? $parts['path'] : '/';
	$query = isset( $parts['query'] ) ? '?' . $parts['query'] : '';
	return $front . $path . $query;
}

// Editor "View Post" / list "View" - point straight at the frontend.
add_filter( 'post_link', 'hatch_rewrite_to_frontend', 20 );
add_filter( 'page_link', 'hatch_rewrite_to_frontend', 20 );
add_filter( 'post_type_link', 'hatch_rewrite_to_frontend', 20 );
add_filter( 'attachment_link', 'hatch_rewrite_to_frontend', 20 );

// Editor "Preview" button. WP appends a preview nonce; the headless site
// won't honor it, but we still want the new tab to land on the live URL
// rather than wp-admin. For draft/scheduled posts WP returns the admin
// preview URL - leave those untouched.
add_filter(
	'preview_post_link',
	function ( $link, $post ) {
		if ( ! $post || 'publish' !== get_post_status( $post ) ) {
			return $link;
		}
		return hatch_rewrite_to_frontend( (string) $link );
	},
	20,
	2
);

// Category / tag / CPT archive links + term links - same treatment.
add_filter( 'term_link', 'hatch_rewrite_to_frontend', 20 );
add_filter( 'post_type_archive_link', 'hatch_rewrite_to_frontend', 20 );
add_filter( 'author_link', 'hatch_rewrite_to_frontend', 20 );
add_filter( 'day_link', 'hatch_rewrite_to_frontend', 20 );
add_filter( 'month_link', 'hatch_rewrite_to_frontend', 20 );
add_filter( 'year_link', 'hatch_rewrite_to_frontend', 20 );

add_filter( 'rest_prepare_post', 'hatch_align_generated_slug_to_saved', 10, 2 );
add_filter( 'rest_prepare_page', 'hatch_align_generated_slug_to_saved', 10, 2 );

/**
 * Gutenberg's URL preview tooltip uses `permalink_template` + `generated_slug`
 * from the REST response - and `generated_slug` is auto-regenerated from the
 * post TITLE every request, ignoring the user's manually-saved slug. Result:
 * a post titled "Edge E Test Post" with saved slug `edge-e-test` shows a
 * tooltip URL ending in `edge-e-test-post`, which 404s on the headless
 * frontend.
 *
 * Force `generated_slug` to mirror the actual saved `post_name` once a post
 * has a real slug. New (unsaved) drafts still get the title-derived default.
 *
 * @param WP_REST_Response|mixed $response Prepared response.
 * @param WP_Post                $post     Post being prepared.
 * @return WP_REST_Response|mixed
 */
function hatch_align_generated_slug_to_saved( $response, $post ) {
	if ( ! $response instanceof WP_REST_Response || ! $post ) {
		return $response;
	}
	// Skip unsaved drafts so Gutenberg's title-derived slug preview still works
	// while the user is typing the first title.
	if ( empty( $post->post_name ) || 'auto-draft' === $post->post_name || 'auto-draft' === $post->post_status ) {
		return $response;
	}
	$data = $response->get_data();
	if ( isset( $data['generated_slug'] ) ) {
		$data['generated_slug'] = $post->post_name;
	}
	if ( isset( $data['permalink_template'] ) ) {
		// Rebuild the template URL from the saved permalink so Gutenberg's
		// preview tooltip reflects the same URL as the View Post button.
		$data['permalink_template'] = (string) get_permalink( $post );
	}
	$response->set_data( $data );
	return $response;
}
// Same fix for any public CPT registered with show_in_rest.
add_action(
	'rest_api_init',
	function () {
		foreach ( get_post_types(
			array(
				'public'       => true,
				'show_in_rest' => true,
			),
			'names'
		) as $pt ) {
			if ( in_array( $pt, array( 'post', 'page', 'attachment' ), true ) ) {
				continue;
			}
			add_filter( "rest_prepare_{$pt}", 'hatch_align_generated_slug_to_saved', 10, 2 );
		}
	},
	99
);

/**
 * v0.50.12 - Editor toolbar "View Post" / "Preview" → new tab. The Gutenberg
 * editor renders these as plain <a> tags read from the REST `link` field; we
 * inject a small JS that flips them to target="_blank" once mounted, plus the
 * classic editor's #post-preview / #view-post-btn anchors.
 */
/**
 * v0.50.18 - Sync Hatch design tokens to the WordPress frontend so the
 * active WP theme respects the user's picks (max width, brand colors,
 * fonts, color mode). Without this, a user who installs Hatch but doesn't
 * activate the companion theme would see WordPress render with the theme's
 * own width / colors, ignoring everything they set in the Hatch admin -
 * exactly the "no conflict between Hatch + WP theme" guarantee the user
 * asked for.
 *
 * Adds ONE inline style block to the front end. Includes:
 *  1. Every CSS var the Astro frontend uses (so any Hatch block on a WP-
 *     rendered page picks them up automatically).
 *  2. A sync rule that hard-pins `max-width: var(--hatch-max-width)` on
 *     the most common WP theme container classes (`.entry-content`,
 *     `.site-content`, `.wp-site-blocks`, `.wp-block-post-content`, `main`
 *     and `article`). Themes that already use narrower widths are
 *     unaffected because of `max-width` semantics.
 */
add_action( 'wp_enqueue_scripts', 'hatch_sync_design_tokens_to_wp_frontend', 5 );
function hatch_sync_design_tokens_to_wp_frontend(): void {
	$brand  = (array) get_option( 'hatch_design_brand', array() );
	$layout = (array) get_option( 'hatch_design_layout', array() );
	$mode   = (string) get_option( 'hatch_design_mode', 'auto' );

	$primary = hatch_css_color( $brand['primary'] ?? '', '#ff6b00' );
	$accent  = hatch_css_color( $brand['accent'] ?? ( $brand['secondary'] ?? '' ), '#6366f1' );
	$bg      = hatch_css_color( $brand['background'] ?? '', '#ffffff' );
	$font_h  = hatch_css_font_name( (string) get_option( 'hatch_design_font_heading', 'Inter' ) );
	$font_b  = hatch_css_font_name( (string) get_option( 'hatch_design_font_body', 'Inter' ) );
	$mode    = in_array( $mode, array( 'light', 'dark' ), true ) ? $mode : 'auto';

	// Width normalisation: tolerate legacy "1320px" or canonical "1320".
	$max_raw = $layout['max_width'] ?? ( $layout['maxWidth'] ?? '1160' );
	$max_w   = (int) preg_replace( '/[^0-9]/', '', (string) $max_raw );
	if ( $max_w < 320 || $max_w > 3000 ) {
		$max_w = 1160;
	}

	$density_map = array(
		'compact'     => '0.75',
		'comfortable' => '1',
		'spacious'    => '1.25',
	);
	$density_key = strtolower( (string) ( $layout['density'] ?? 'comfortable' ) );
	$density     = $density_map[ $density_key ] ?? '1';

	$radius_map = array(
		'sharp'  => '4px',
		'smooth' => '10px',
		'extra'  => '20px',
	);
	$rounded    = strtolower( (string) ( $layout['rounded'] ?? $layout['roundness'] ?? 'smooth' ) );
	if ( 'default' === $rounded ) {
		$rounded = 'smooth';
	}
	if ( 'extraround' === $rounded ) {
		$rounded = 'extra';
	}
	$radius = $radius_map[ $rounded ] ?? '10px';

	$css  = ':root{';
	$css .= '--hatch-primary:' . $primary . ';';
	$css .= '--hatch-accent:' . $accent . ';';
	$css .= '--hatch-bg-design:' . $bg . ';';
	$css .= '--hatch-font-heading:"' . $font_h . '",ui-sans-serif,system-ui,sans-serif;';
	$css .= '--hatch-font-body:"' . $font_b . '",ui-sans-serif,system-ui,sans-serif;';
	$css .= '--hatch-density:' . $density . ';';
	$css .= '--hatch-radius:' . $radius . ';';
	$css .= '--hatch-max-width:' . $max_w . 'px;';
	$css .= '}';
	// Sync rule: common WP theme container classes get the width the user picked.
	// Themes using their own narrower width still win.
	$css .= '.entry-content,.site-content,.wp-site-blocks,.wp-block-post-content,';
	$css .= 'main.wp-block-group,article.post,article.page,.hatch-post-container{';
	$css .= 'max-width:var(--hatch-max-width,1160px);margin-left:auto;margin-right:auto;}';
	if ( 'auto' !== $mode ) {
		$css .= 'html{color-scheme:' . $mode . ';}';
	}

	wp_register_style( 'hatch-design-tokens', false, array(), HATCH_VERSION );
	wp_enqueue_style( 'hatch-design-tokens' );
	wp_add_inline_style( 'hatch-design-tokens', $css );
}

/**
 * Validate a CSS colour taken from an option.
 *
 * @param mixed  $value    Stored value.
 * @param string $fallback Colour used when the value is not a safe colour.
 * @return string
 */
function hatch_css_color( $value, string $fallback ): string {
	$value = trim( (string) $value );
	$hex   = sanitize_hex_color( $value );
	if ( $hex ) {
		return $hex;
	}
	if ( preg_match( '/^(rgb|hsl)a?\(\s*[0-9.%\s,\/-]+\)$/i', $value ) ) {
		return $value;
	}
	return $fallback;
}

/**
 * Reduce a stored font family to characters that cannot break out of a CSS string.
 *
 * @param string $value Stored font name.
 * @return string
 */
function hatch_css_font_name( string $value ): string {
	$clean = trim( (string) preg_replace( '/[^A-Za-z0-9 _-]/', '', $value ) );
	return '' === $clean ? 'Inter' : $clean;
}

add_action( 'admin_enqueue_scripts', 'hatch_force_editor_view_new_tab' );
/**
 * Open the "View" and "Preview" links of the post editor in a new tab.
 *
 * @param string $hook_suffix Current admin page.
 * @return void
 */
function hatch_force_editor_view_new_tab( $hook_suffix ): void {
	$origin = hatch_frontend_origin();
	if ( '' === $origin || ! in_array( $hook_suffix, array( 'post.php', 'post-new.php', 'edit.php' ), true ) ) {
		return;
	}
	$host = (string) wp_parse_url( $origin, PHP_URL_HOST );
	wp_register_script( 'hatch-editor-links', '', array(), HATCH_VERSION, true );
	wp_enqueue_script( 'hatch-editor-links' );
	$script = '(function () {'
		. 'var host = ' . wp_json_encode( $host ) . ';'
		. 'var apply = function () {'
		. 'document.querySelectorAll("a#view-post-btn, a#post-preview, .editor-post-preview-dropdown__button-external, a.components-button").forEach(function (a) {'
		. 'if (a.target === "_blank") { return; }'
		. 'if (!a.matches("a#view-post-btn, a#post-preview, .editor-post-preview-dropdown__button-external") && (!host || (a.getAttribute("href") || "").indexOf(host) === -1)) { return; }'
		. 'a.target = "_blank";'
		. 'a.rel = (a.rel ? a.rel + " " : "") + "noopener";'
		. '});'
		. '};'
		. 'apply();'
		. 'new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });'
		. '})();';
	wp_add_inline_script( 'hatch-editor-links', $script );
}

/**
 * v0.50.8 - CORS for /hatch/v1/* so the deployed Cloudflare Worker can
 * POST comments / form submissions back to WordPress from a different origin
 * without browser preflight blocking. Edge D resolved.
 *
 * Echoes the request Origin only when it exactly matches the saved frontend
 * URL or image proxy URL. Wildcarding "*" is unsafe with credentials; the
 * frontend never sends credentials anyway, but scoping to known frontend
 * origins is the right hygiene.
 */
add_action( 'rest_api_init', 'hatch_cors_headers', 15 );
function hatch_cors_headers(): void {
	remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );
	add_filter(
		'rest_pre_serve_request',
		function ( $value ) {
			// Only adjust headers for our own namespace.
			$path = Hatch_Request::request_uri();
			if ( false === strpos( $path, '/wp-json/hatch/v1/' ) && false === strpos( $path, '/?rest_route=/hatch/v1/' ) ) {
				// Not a Hatch route: keep WordPress core's own CORS handling.
				return rest_send_cors_headers( $value );
			}

			$origin   = esc_url_raw( Hatch_Request::server( 'HTTP_ORIGIN' ) );
			$frontend = untrailingslashit( (string) get_option( 'hatch_frontend_url', '' ) );
			$proxy    = untrailingslashit( (string) get_option( 'hatch_image_proxy_url', '' ) );
			$allowed  = array_filter( array( $frontend, $proxy ) );

			$is_allowed = false;
			if ( '' !== $origin ) {
				foreach ( $allowed as $a ) {
					if ( $origin === $a ) {
						$is_allowed = true;
						break; }
				}
				// No tenant wildcard for workers.dev: any Cloudflare Workers URL would
				// have matched, which meant an attacker could deploy a hostile
				// worker on those platforms and receive CORS approval from any
				// Hatch site that had never set hatch_frontend_url. Post-deploy
				// the wizard writes hatch_frontend_url explicitly; the explicit
				// allowlist above is now the only accepted path.
			}

			if ( $is_allowed ) {
				header( 'Access-Control-Allow-Origin: ' . $origin );
				header( 'Vary: Origin' );
				header( 'Access-Control-Allow-Methods: GET, POST, OPTIONS' );
				header( 'Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce' );
				header( 'Access-Control-Max-Age: 600' );
			}
			return $value;
		},
		15
	);
}

// v0.38 - Dashboard widget removed per user feedback. The WP /wp-admin/ home
// is the user's own dashboard; Hatch shouldn't crowd it. Status lives on the
// Hatch admin page only.

/**
 * v0.35 - On activation, auto-mirror hatch_frontend_url into hatch_image_proxy_url
 * so the image proxy uses your own domain by default (enterprise pattern, no
 * third-party host in your HTML). User doesn't have to set this manually.
 */
register_activation_hook( __FILE__, 'hatch_on_activation' );
function hatch_on_activation(): void {
	$frontend = trim( (string) get_option( 'hatch_frontend_url', '' ) );
	$current  = trim( (string) get_option( 'hatch_image_proxy_url', '' ) );
	if ( $frontend && '' === $current ) {
		update_option( 'hatch_image_proxy_url', untrailingslashit( $frontend ) );
	}
}

// Module loader - reads feature flags from DB and conditionally includes classes.
require_once HATCH_PLUGIN_DIR . 'includes/class-request.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-module-loader.php';

// V0.1 core (companion plugin layer).
require_once HATCH_PLUGIN_DIR . 'includes/class-detector.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-security.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-rest-api.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-revalidate.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-media-rewriter.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-hardening.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-seo-bridge.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-forms-bridge.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-auth.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-rankready-bridge.php';
// V0.27 - nav menu passthrough.
require_once HATCH_PLUGIN_DIR . 'includes/class-menus-bridge.php';
// v0.50.32 - always register primary + footer menu locations from the plugin
// so both slots are pickable in the Content tab regardless of the active theme.
add_action( 'after_setup_theme', array( 'Hatch_Menus_Bridge', 'register_locations' ), 4 );
// V0.34 - REST endpoints for reading and saving Hatch options.
require_once HATCH_PLUGIN_DIR . 'includes/class-options-rest.php';

// V0.2 hardening + health.
require_once HATCH_PLUGIN_DIR . 'includes/class-acf-bridge.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-cpt-scanner.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-login-hardening.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-app-password-helper.php';
// Encrypted credential store for the Cloudflare API token.
require_once HATCH_PLUGIN_DIR . 'includes/class-credential-store.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-diagnostic.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-domain-check.php';

// V0.4 - WP-CLI commands (loaded only when WP_CLI is defined).
if ( defined( 'WP_CLI' ) && WP_CLI ) {
	require_once HATCH_PLUGIN_DIR . 'includes/class-cli.php';
}

// V0.22 - integrations + headless comments + headless forms + companion theme.
require_once HATCH_PLUGIN_DIR . 'includes/class-integrations.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-headless-comments.php';
// v0.7.5 - Strip third-party admin notices (WooCommerce Action Scheduler,
// SEO plugin nags, review prompts, etc.) on Hatch's own admin screens.
require_once HATCH_PLUGIN_DIR . 'includes/class-admin-quiet.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-headless-forms.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-companion-theme-installer.php';
// Deactivating the plugin puts the previous theme back: the companion theme only redirects
// to the frontend, whose content comes from this plugin. Plugin updates deactivate silently
// and do not fire this hook, so an update never changes the theme.
register_deactivation_hook( __FILE__, array( 'Hatch_Companion_Theme_Installer', 'restore_on_deactivate' ) );
// Periodic HEAD probe of the site's own frontend URL so the Status panel can show liveness.
require_once HATCH_PLUGIN_DIR . 'includes/class-cloud-heartbeat.php';
// V0.23 - design.md loader (brand tokens flow to the frontend as CSS variables).
require_once HATCH_PLUGIN_DIR . 'includes/class-design-loader.php';
// V0.25 - Turnstile on wp-login + classic comment form (WP-side anti-spam).
require_once HATCH_PLUGIN_DIR . 'includes/class-turnstile-wp.php';

// V0.6 - features.
require_once HATCH_PLUGIN_DIR . 'includes/class-features.php';
// V0.7.5 - supported-blocks whitelist gate (opt-in toggle).
require_once HATCH_PLUGIN_DIR . 'includes/class-blocks.php';

// V0.7 - real connection verification (heartbeat + webhook ack).
require_once HATCH_PLUGIN_DIR . 'includes/class-connection-status.php';

// V0.7 - Block-to-Astro serializer (renders Gutenberg as native Astro components).
require_once HATCH_PLUGIN_DIR . 'includes/class-block-serializer.php';

// In-plugin Cloudflare Workers deploy: provider interface, API client,
// bundled frontend, edge proxy generator, provider and REST/admin-post controller.
require_once HATCH_PLUGIN_DIR . 'includes/deploy/interface-hatch-deploy-provider.php';
require_once HATCH_PLUGIN_DIR . 'includes/deploy/class-hatch-cloudflare-api.php';
require_once HATCH_PLUGIN_DIR . 'includes/deploy/class-hatch-frontend-bundle.php';
require_once HATCH_PLUGIN_DIR . 'includes/deploy/class-hatch-cloudflare-proxy-worker.php';
require_once HATCH_PLUGIN_DIR . 'includes/deploy/class-hatch-cloudflare-provider.php';
require_once HATCH_PLUGIN_DIR . 'includes/deploy/class-hatch-deploy-controller.php';
// v0.5.8. Cloudflare Worker SEO rewriter. Reads hatch_cf_worker_state option
// (written by Hatch_Deploy_Controller on a successful deploy) and rewrites
// permalinks + sitemap + robots so search engines see the Worker-served
// subfolder as canonical. No-op when the option is empty.
require_once HATCH_PLUGIN_DIR . 'includes/class-cf-seo.php';
add_action( 'init', array( 'Hatch_Cf_Seo', 'boot' ), 20 );
// v0.7.6 - guest-safe order lookup so /order-summary works without Cart-Token.
require_once HATCH_PLUGIN_DIR . 'includes/class-order-lookup.php';
add_action( 'init', array( 'Hatch_Order_Lookup', 'boot' ), 5 );
// V0.8 - WooCommerce read-only bridge (products / variations / categories).
require_once HATCH_PLUGIN_DIR . 'includes/class-woocommerce-bridge.php';

// Boot module loader after all core includes - picks up any feature-gated classes
// that weren't loaded above (e.g. newly registered optional modules).
Hatch_Module_Loader::boot();

require_once HATCH_PLUGIN_DIR . 'includes/class-hatch.php';

// Bootstrap.
Hatch::instance();

<?php
/**
 * Plugin Name:       Hatch — Headless WordPress
 * Plugin URI:        https://github.com/adityaarsharma/hatch
 * Description:       Turn WordPress into a headless CMS with an Astro frontend. One-click deploy to Cloudflare / Vercel / VPS, security hardening, image proxy, REST bridge, and a React admin.
 * Version:           0.1.1
 * Requires at least: 6.4
 * Tested up to:      6.9
 * Requires PHP:      7.4
 * Author:            Aditya Sharma
 * Author URI:        https://adityaarsharma.com
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       hatch
 * Domain Path:       /languages
 * Update URI:        https://github.com/adityaarsharma/hatch
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

define( 'HATCH_VERSION', '0.1.1' );
define( 'HATCH_PLUGIN_FILE', __FILE__ );
define( 'HATCH_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'HATCH_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'HATCH_REST_NAMESPACE', 'hatch/v1' );
define( 'HATCH_BLOCKS_CATEGORY', 'hatch' );

// v0.32 — disable WP's built-in Theme/Plugin File Editors. Edit-from-browser
// is a known privilege-escalation vector — if an admin account is compromised
// the attacker can inject PHP into theme/plugin files instantly. Theme edits
// belong on a developer's machine via FTP/SSH/Git. This define is the WP
// canonical way to disable both editors.
if ( ! defined( 'DISALLOW_FILE_EDIT' ) ) {
	define( 'DISALLOW_FILE_EDIT', true );
}

/**
 * v0.35 — open "View Post / View Page / View CPT" in a new tab. Row actions
 * on the post list table only.
 *
 * v0.47 — extend to the editor toolbar's "View" / "Preview" arrow. Those
 * buttons read the post's permalink (filtered via post_link/page_link/
 * post_type_link) and the preview URL (preview_post_link). When a headless
 * frontend URL is configured we rewrite the permalink to point at the
 * frontend directly so the new tab lands on the live page in one hop —
 * not on wp-admin, not even via a 302 through the WP origin.
 */
/**
 * v0.50.12 — Every WP link that points at the headless frontend opens in a
 * new tab. Rationale: in headless mode the frontend lives on a different
 * origin (Cloudflare / Vercel / VPS), so following it in the same tab kicks
 * the user out of wp-admin and they have to navigate back manually. Keeping
 * WP open in the background is the editor flow people actually want.
 *
 * Applies to: post/page/CPT row actions ("View"), Quick Edit "Preview",
 * editor toolbar "View" / "Preview" arrow, admin bar "Visit Site".
 */
function hatch_force_view_links_new_tab( array $actions, $post ): array {
	if ( '' === hatch_frontend_origin() ) return $actions;
	foreach ( array( 'view', 'preview' ) as $key ) {
		if ( empty( $actions[ $key ] ) ) continue;
		// Inject target/rel into the <a> tag without re-parsing. WP row actions
		// are always a single <a ...>label</a> — safe to regex.
		$actions[ $key ] = preg_replace(
			'/<a\b(?![^>]*\btarget=)/i',
			'<a target="_blank" rel="noopener noreferrer"',
			$actions[ $key ],
			1
		);
	}
	return $actions;
}
add_filter( 'post_row_actions', 'hatch_force_view_links_new_tab', 99, 2 );
add_filter( 'page_row_actions', 'hatch_force_view_links_new_tab', 99, 2 );

/**
 * v0.49.4 — Admin bar "Visit Site" → new tab. The site root in headless mode
 * always points at the hosted Cloudflare/Vercel domain, so users explicitly
 * want it in a new window so wp-admin stays open.
 */
add_action( 'wp_before_admin_bar_render', 'hatch_admin_bar_visit_site_new_tab', 100 );
function hatch_admin_bar_visit_site_new_tab(): void {
	global $wp_admin_bar;
	if ( ! ( $wp_admin_bar instanceof WP_Admin_Bar ) ) return;
	foreach ( array( 'view-site', 'site-name' ) as $node_id ) {
		$node = $wp_admin_bar->get_node( $node_id );
		if ( ! $node ) continue;
		$meta = is_array( $node->meta ) ? $node->meta : array();
		$meta['target'] = '_blank';
		$meta['rel']    = trim( ( $meta['rel'] ?? '' ) . ' noopener' );
		$wp_admin_bar->add_node( array( 'id' => $node->id, 'meta' => $meta ) );
	}
}

/**
 * Return the configured headless frontend origin (no trailing slash), or ''
 * if not set. Cached per-request.
 */
function hatch_frontend_origin(): string {
	static $cached = null;
	if ( null !== $cached ) return $cached;
	$url = trim( (string) get_option( 'hatch_frontend_url', '' ) );
	$cached = $url ? untrailingslashit( $url ) : '';
	return $cached;
}

/**
 * Rewrite a WP origin URL ($url) so its path is served by the headless
 * frontend. Returns the original URL when no frontend is configured.
 */
function hatch_rewrite_to_frontend( string $url ): string {
	$front = hatch_frontend_origin();
	if ( '' === $front || '' === $url ) return $url;
	$parts = wp_parse_url( $url );
	if ( ! is_array( $parts ) || empty( $parts['host'] ) ) return $url;
	$home = wp_parse_url( home_url() );
	if ( ! is_array( $home ) || empty( $home['host'] ) ) return $url;
	if ( strcasecmp( $parts['host'], $home['host'] ) !== 0 ) return $url;
	$path  = isset( $parts['path'] ) ? $parts['path'] : '/';
	$query = isset( $parts['query'] ) ? '?' . $parts['query'] : '';
	return $front . $path . $query;
}

// Editor "View Post" / list "View" — point straight at the frontend.
add_filter( 'post_link',      'hatch_rewrite_to_frontend', 20 );
add_filter( 'page_link',      'hatch_rewrite_to_frontend', 20 );
add_filter( 'post_type_link', 'hatch_rewrite_to_frontend', 20 );
add_filter( 'attachment_link', 'hatch_rewrite_to_frontend', 20 );

// Editor "Preview" button. WP appends a preview nonce; the headless site
// won't honor it, but we still want the new tab to land on the live URL
// rather than wp-admin. For draft/scheduled posts WP returns the admin
// preview URL — leave those untouched.
add_filter( 'preview_post_link', function ( $link, $post ) {
	if ( ! $post || 'publish' !== get_post_status( $post ) ) return $link;
	return hatch_rewrite_to_frontend( (string) $link );
}, 20, 2 );

// Category / tag / CPT archive links + term links — same treatment.
add_filter( 'term_link',                 'hatch_rewrite_to_frontend', 20 );
add_filter( 'post_type_archive_link',    'hatch_rewrite_to_frontend', 20 );
add_filter( 'author_link',               'hatch_rewrite_to_frontend', 20 );
add_filter( 'day_link',                  'hatch_rewrite_to_frontend', 20 );
add_filter( 'month_link',                'hatch_rewrite_to_frontend', 20 );
add_filter( 'year_link',                 'hatch_rewrite_to_frontend', 20 );

/**
 * Gutenberg's URL preview tooltip uses `permalink_template` + `generated_slug`
 * from the REST response — and `generated_slug` is auto-regenerated from the
 * post TITLE every request, ignoring the user's manually-saved slug. Result:
 * a post titled "Edge E Test Post" with saved slug `edge-e-test` shows a
 * tooltip URL ending in `edge-e-test-post`, which 404s on the headless
 * frontend.
 *
 * Force `generated_slug` to mirror the actual saved `post_name` once a post
 * has a real slug. New (unsaved) drafts still get the title-derived default.
 */
add_filter( 'rest_prepare_post', 'hatch_align_generated_slug_to_saved', 10, 2 );
add_filter( 'rest_prepare_page', 'hatch_align_generated_slug_to_saved', 10, 2 );
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
add_action( 'rest_api_init', function () {
	foreach ( get_post_types( array( 'public' => true, 'show_in_rest' => true ), 'names' ) as $pt ) {
		if ( in_array( $pt, array( 'post', 'page', 'attachment' ), true ) ) continue;
		add_filter( "rest_prepare_{$pt}", 'hatch_align_generated_slug_to_saved', 10, 2 );
	}
}, 99 );

/**
 * v0.50.12 — Editor toolbar "View Post" / "Preview" → new tab. The Gutenberg
 * editor renders these as plain <a> tags read from the REST `link` field; we
 * inject a small JS that flips them to target="_blank" once mounted, plus the
 * classic editor's #post-preview / #view-post-btn anchors.
 */
/**
 * v0.50.18 — Sync Hatch design tokens to the WordPress frontend so the
 * active WP theme respects the user's picks (max width, brand colors,
 * fonts, color mode). Without this, a user who installs Hatch but doesn't
 * activate the companion theme would see WordPress render with the theme's
 * own width / colors, ignoring everything they set in the Hatch admin —
 * exactly the "no conflict between Hatch + WP theme" guarantee the user
 * asked for.
 *
 * Emits ONE inline <style> block on wp_head. Includes:
 *  1. Every CSS var the Astro frontend uses (so any Hatch block on a WP-
 *     rendered page picks them up automatically).
 *  2. A sync rule that hard-pins `max-width: var(--hatch-max-width)` on
 *     the most common WP theme container classes (`.entry-content`,
 *     `.site-content`, `.wp-site-blocks`, `.wp-block-post-content`, `main`
 *     and `article`). Themes that already use narrower widths are
 *     unaffected because of `max-width` semantics.
 */
add_action( 'wp_head', 'hatch_sync_design_tokens_to_wp_frontend', 5 );
function hatch_sync_design_tokens_to_wp_frontend(): void {
	if ( is_admin() ) return; // wp_head also runs in the block editor; skip there.
	$brand  = (array) get_option( 'hatch_design_brand',  array() );
	$layout = (array) get_option( 'hatch_design_layout', array() );
	$mode   = (string) get_option( 'hatch_design_mode',  'auto' );

	$primary = isset( $brand['primary'] )    ? esc_attr( $brand['primary'] )    : '#ff6b00';
	$accent  = isset( $brand['accent'] )     ? esc_attr( $brand['accent'] )     :
	          ( isset( $brand['secondary'] ) ? esc_attr( $brand['secondary'] )  : '#6366f1' );
	$bg      = isset( $brand['background'] ) ? esc_attr( $brand['background'] ) : '#ffffff';
	$fontH   = esc_attr( (string) get_option( 'hatch_design_font_heading', 'Inter' ) );
	$fontB   = esc_attr( (string) get_option( 'hatch_design_font_body',    'Inter' ) );

	// Width normalisation: tolerate legacy "1320px" or canonical "1320".
	$max_raw = isset( $layout['max_width'] ) ? $layout['max_width'] :
	          ( isset( $layout['maxWidth'] ) ? $layout['maxWidth'] : '1160' );
	$max_w   = preg_replace( '/[^0-9]/', '', (string) $max_raw );
	if ( '' === $max_w ) $max_w = '1160';

	$density_map = array( 'compact' => '0.75', 'comfortable' => '1', 'spacious' => '1.25' );
	$density_key = strtolower( (string) ( $layout['density'] ?? 'comfortable' ) );
	$density     = isset( $density_map[ $density_key ] ) ? $density_map[ $density_key ] : '1';

	$radius_map = array( 'sharp' => '4px', 'smooth' => '10px', 'extra' => '20px' );
	$rounded    = strtolower( (string) ( $layout['rounded'] ?? $layout['roundness'] ?? 'smooth' ) );
	if ( 'default'    === $rounded ) $rounded = 'smooth';
	if ( 'extraround' === $rounded ) $rounded = 'extra';
	$radius     = isset( $radius_map[ $rounded ] ) ? $radius_map[ $rounded ] : '10px';

	echo "\n<style id='hatch-design-tokens'>\n";
	echo ":root{";
	echo "--hatch-primary:{$primary};";
	echo "--hatch-accent:{$accent};";
	echo "--hatch-bg-design:{$bg};";
	echo "--hatch-font-heading:\"{$fontH}\",ui-sans-serif,system-ui,sans-serif;";
	echo "--hatch-font-body:\"{$fontB}\",ui-sans-serif,system-ui,sans-serif;";
	echo "--hatch-density:{$density};";
	echo "--hatch-radius:{$radius};";
	echo "--hatch-max-width:{$max_w}px;";
	echo "}\n";
	// Sync rule — common WP theme container classes get the same max-width
	// the user picked. Themes using their own narrower width still win.
	echo ".entry-content,.site-content,.wp-site-blocks,.wp-block-post-content,";
	echo "main.wp-block-group,article.post,article.page,.hatch-post-container{";
	echo "max-width:var(--hatch-max-width,1160px);margin-left:auto;margin-right:auto;";
	echo "}\n";
	if ( 'auto' !== $mode ) {
		echo "html{color-scheme:{$mode};}\n";
	}
	echo "</style>\n";
}

add_action( 'admin_footer', 'hatch_force_editor_view_new_tab' );
function hatch_force_editor_view_new_tab(): void {
	if ( '' === hatch_frontend_origin() ) return;
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( ! $screen || ! in_array( $screen->base, array( 'post', 'edit' ), true ) ) return;
	?>
	<script>
	(function () {
		var apply = function () {
			document.querySelectorAll(
				'a#view-post-btn, a#post-preview, ' +
				'.editor-post-preview-dropdown__button-external, ' +
				'a.components-button[href*="<?php echo esc_js( wp_parse_url( hatch_frontend_origin(), PHP_URL_HOST ) ); ?>"]'
			).forEach(function (a) {
				if (a.target === '_blank') return;
				a.target = '_blank';
				a.rel = (a.rel ? a.rel + ' ' : '') + 'noopener';
			});
		};
		apply();
		new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
	})();
	</script>
	<?php
}

/**
 * v0.40 — REST safety: silence display_errors during REST so PHP notices
 * can't prepend HTML to JSON responses on hosts where display_errors=1
 * (TasteWP, some Cloudways setups). Errors still go to error_log.
 *
 * v0.38–0.39 also added output buffering — that was speculative and not
 * the actual root cause of "Updating failed". The REAL bug was the
 * companion theme's home_url filter routing REST URLs to the CF Workers
 * frontend (fixed in companion-theme/functions.php this release).
 * Removing the buffer code to keep this layer minimal.
 */
add_action( 'rest_api_init', 'hatch_silence_rest_errors', 1 );
function hatch_silence_rest_errors(): void {
	@ini_set( 'display_errors', '0' );
	@ini_set( 'html_errors',    '0' );
}

/**
 * v0.50.8 — CORS for /hatch/v1/* so the deployed Cloudflare/Vercel worker can
 * POST comments / form submissions back to WordPress from a different origin
 * without browser preflight blocking. Edge D resolved.
 *
 * Echoes the request Origin when it matches the configured frontend URL OR
 * any worker.dev / vercel.app subdomain. Wildcarding "*" is unsafe with
 * credentials; the Astro frontend never sends credentials anyway, but
 * scoping to known frontend origins is the right hygiene.
 */
add_action( 'rest_api_init', 'hatch_cors_headers', 15 );
function hatch_cors_headers(): void {
	remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );
	add_filter( 'rest_pre_serve_request', function ( $value ) {
		// Only adjust headers for our own namespace.
		$rest_route = $GLOBALS['wp_rest_server'] ?? null;
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$path = isset( $_SERVER['REQUEST_URI'] ) ? (string) $_SERVER['REQUEST_URI'] : '';
		if ( false === strpos( $path, '/wp-json/hatch/v1/' ) && false === strpos( $path, '/?rest_route=/hatch/v1/' ) ) {
			return $value;
		}

		$origin     = isset( $_SERVER['HTTP_ORIGIN'] ) ? esc_url_raw( (string) $_SERVER['HTTP_ORIGIN'] ) : '';
		$frontend   = untrailingslashit( (string) get_option( 'hatch_frontend_url', '' ) );
		$proxy      = untrailingslashit( (string) get_option( 'hatch_image_proxy_url', '' ) );
		$allowed    = array_filter( array( $frontend, $proxy ) );

		$is_allowed = false;
		if ( '' !== $origin ) {
			foreach ( $allowed as $a ) {
				if ( $origin === $a ) { $is_allowed = true; break; }
			}
			// Open allowlist for worker.dev and vercel.app subdomains so a fresh
			// deploy works before the frontend URL option is auto-set.
			if ( ! $is_allowed && preg_match( '#^https?://[^/]+\.(workers\.dev|vercel\.app)$#i', $origin ) ) {
				$is_allowed = true;
			}
		}

		if ( $is_allowed ) {
			header( 'Access-Control-Allow-Origin: ' . $origin );
			header( 'Vary: Origin' );
			header( 'Access-Control-Allow-Methods: GET, POST, OPTIONS' );
			header( 'Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce' );
			header( 'Access-Control-Max-Age: 600' );
		}
		return $value;
	}, 15 );
}

// v0.38 — Dashboard widget removed per user feedback. The WP /wp-admin/ home
// is the user's own dashboard; Hatch shouldn't crowd it. Status lives on the
// Hatch admin page only.

/**
 * v0.35 — On activation, auto-mirror hatch_frontend_url into hatch_image_proxy_url
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

// Module loader — reads feature flags from DB and conditionally includes classes.
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
require_once HATCH_PLUGIN_DIR . 'includes/class-rankready-bridge.php';
// V0.27 — nav menu passthrough.
require_once HATCH_PLUGIN_DIR . 'includes/class-menus-bridge.php';
// V0.34 — REST endpoints for remote options + self-update from GitHub.
require_once HATCH_PLUGIN_DIR . 'includes/class-options-rest.php';

// V0.2 hardening + health.
require_once HATCH_PLUGIN_DIR . 'includes/class-acf-bridge.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-cpt-scanner.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-login-hardening.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-app-password-helper.php';
// V0.48 — Encrypted credential store (deploy tokens for one-click redeploy).
require_once HATCH_PLUGIN_DIR . 'includes/class-credential-store.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-diagnostic.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-domain-check.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-frontend-agent.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-frontend-installer-route.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-frontend-ssh.php';

// V0.4 — WP-CLI commands (loaded only when WP_CLI is defined).
if ( defined( 'WP_CLI' ) && WP_CLI ) {
	require_once HATCH_PLUGIN_DIR . 'includes/class-cli.php';
}

// V0.4 — bundled headless-first blocks.
require_once HATCH_PLUGIN_DIR . 'includes/class-blocks-shared-attributes.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-blocks-registry.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-blocks-custom-code-security.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-blocks-tailwind-runtime.php';

// V0.22 — integrations + headless comments + headless forms + companion theme.
require_once HATCH_PLUGIN_DIR . 'includes/class-integrations.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-headless-comments.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-headless-forms.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-companion-theme-installer.php';
// v0.50.x — periodic HEAD probe for CF/Vercel project URLs so the heartbeat
// panel in Status shows liveness parity across all three providers (VPS uses
// its own agent-based heartbeat; this fills the gap for stateless serverless).
require_once HATCH_PLUGIN_DIR . 'includes/class-cloud-heartbeat.php';
// V0.23 — design.md loader (brand tokens flow to the frontend as CSS variables).
require_once HATCH_PLUGIN_DIR . 'includes/class-design-loader.php';
// V0.25 — Turnstile on wp-login + classic comment form (WP-side anti-spam).
require_once HATCH_PLUGIN_DIR . 'includes/class-turnstile-wp.php';

// V0.6 — features + blocks-control.
require_once HATCH_PLUGIN_DIR . 'includes/class-features.php';
require_once HATCH_PLUGIN_DIR . 'includes/class-blocks-control.php';

// V0.7 — real connection verification (heartbeat + webhook ack).
require_once HATCH_PLUGIN_DIR . 'includes/class-connection-status.php';

// V0.7 — Block-to-Astro serializer (renders Gutenberg as native Astro components).
require_once HATCH_PLUGIN_DIR . 'includes/class-block-serializer.php';

// V0.8 — Deploy hooks (Cloudflare Pages / Vercel / generic), encrypted at rest.
require_once HATCH_PLUGIN_DIR . 'includes/class-deploy-hooks.php';
// V0.21.1 — Deploy broker client (talks to hatch.adityaarsharma.com for 1-click deploy).
require_once HATCH_PLUGIN_DIR . 'includes/class-deploy-broker.php';
// v0.50.31 — Health widget DISABLED. It used to pin "🐣 Hatch — Headless
// Engine" to the top of WP Dashboard for every admin. Per user feedback:
// Hatch shouldn't litter the WP dashboard — all its diagnostics already
// live in the Hatch → Status tab. Class file kept in repo for reference;
// no instance is constructed.
// require_once HATCH_PLUGIN_DIR . 'includes/class-health-widget.php';
// V0.8 — WooCommerce read-only bridge (products / variations / categories).
require_once HATCH_PLUGIN_DIR . 'includes/class-woocommerce-bridge.php';

// Boot module loader after all core includes — picks up any feature-gated classes
// that weren't loaded above (e.g. newly registered optional modules).
Hatch_Module_Loader::boot();

/**
 * Main plugin bootstrap.
 */
final class Hatch {

	/**
	 * Singleton instance.
	 *
	 * @var Hatch|null
	 */
	private static $instance = null;

	/**
	 * Get singleton instance.
	 *
	 * @return Hatch
	 */
	public static function instance(): Hatch {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor — wire up all subsystems.
	 */
	private function __construct() {
		// Companion-plugin layer.
		Hatch_Security::instance();
		Hatch_Rest_Api::instance();
		Hatch_Revalidate::instance();
		Hatch_Seo_Bridge::instance();
		Hatch_Forms_Bridge::instance();
		Hatch_RankReady_Bridge::instance();

		// V0.2 hardening (must wire on frontend too — filters site URLs etc.).
		Hatch_Login_Hardening::instance();
		Hatch_App_Password_Helper::instance();

		// V0.5 — frontend connection + root-domain check.
		Hatch_Frontend_Agent::instance();
		Hatch_Frontend_SSH::instance();
		Hatch_Frontend_Installer_Route::instance();
		Hatch_Domain_Check::instance();

		// Blocks layer — runs everywhere (editor + frontend + REST).
		Hatch_Blocks_Custom_Code_Security::instance();
		Hatch_Blocks_Tailwind_Runtime::instance();
		Hatch_Blocks_Control::instance();   // v0.6 — per-block enable/disable

		// V0.7 — real connection status (cron + heartbeat + verify).
		Hatch_Connection_Status::instance();

		// V0.7 — Block-to-Astro serializer (REST: /hatch/v1/post/{id}/blocks).
		Hatch_Block_Serializer::instance();

		// V0.8 — Deploy hooks subsystem (CF / Vercel / generic, encrypted).
		Hatch_Deploy_Hooks::instance();

		// V0.21.1 — Deploy broker client (admin-post handlers for 1-click flows).
		Hatch_Deploy_Broker::instance();

		// V0.8 — WooCommerce read-only bridge (only registers routes if Woo is active).
		Hatch_WooCommerce_Bridge::instance();

		// v0.50.31 — Health widget instance removed. Diagnostics live in
		// Hatch → Status tab instead. No more cluttering WP Dashboard.

		// Block registration.
		add_filter( 'block_categories_all', array( $this, 'register_block_category' ), 5, 1 );
		add_action( 'init', array( $this, 'register_blocks' ), 5 );
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_frontend_assets' ) );

		// dashboard.php + setup-wizard.php must load on EVERY request, not
		// only is_admin(), because the React admin POSTs to /wp-json/hatch/v1/options
		// which is frontend context. If we only loaded these in is_admin(), the
		// REST dispatcher would never register and saves would silently fail
		// (legacy whitelist handler took over). v0.50.11 fix.
		require_once HATCH_PLUGIN_DIR . 'admin/dashboard.php';
		require_once HATCH_PLUGIN_DIR . 'admin/setup-wizard.php';

		// Truly admin-only services stay gated.
		if ( is_admin() ) {
			Hatch_Acf_Bridge::instance();
			Hatch_Cpt_Scanner::instance();
		}

		// i18n.
		add_action( 'init', array( $this, 'load_textdomain' ) );

		// Lifecycle hooks.
		register_activation_hook( HATCH_PLUGIN_FILE, array( $this, 'on_activate' ) );
		register_deactivation_hook( HATCH_PLUGIN_FILE, array( $this, 'on_deactivate' ) );
		// v0.49.5 — uninstall handled by uninstall.php (sandboxed, more reliable
		// than register_uninstall_hook). uninstall.php respects the opt-in
		// option `hatch_uninstall_remove_all_data` so a default Delete preserves
		// every setting; only a user who ticked "Remove all data on uninstall"
		// in Hatch → Security gets a full wipe.
	}

	/**
	 * Register the "Hatch" block category in the inserter.
	 *
	 * @param array $categories Existing categories.
	 * @return array
	 */
	public function register_block_category( array $categories ): array {
		array_unshift(
			$categories,
			array(
				'slug'  => HATCH_BLOCKS_CATEGORY,
				'title' => __( 'Hatch', 'hatch' ),
				'icon'  => 'lightbulb',
			)
		);
		return $categories;
	}

	/**
	 * Register all blocks from build/blocks/ (compiled output).
	 *
	 * Block sources live in blocks-src/; the build pipeline emits to build/blocks/.
	 *
	 * @return void
	 */
	public function register_blocks(): void {
		// Preferred: per-block build output in build/blocks/ (each dir has block.json + index.js).
		if ( is_dir( HATCH_PLUGIN_DIR . 'build/blocks' ) ) {
			Hatch_Blocks_Registry::register_all( HATCH_PLUGIN_DIR . 'build/blocks' );
			return;
		}

		// Fallback: single-bundle mode — build/index.js holds all blocks,
		// block.json metadata comes from blocks-src/. This is what `npm run build`
		// produces until the per-block webpack config is wired up.
		$bundle = HATCH_PLUGIN_DIR . 'build/index.js';
		if ( ! file_exists( $bundle ) ) {
			return;
		}

		$asset_file = HATCH_PLUGIN_DIR . 'build/index.asset.php';
		$deps       = array( 'wp-blocks', 'wp-element', 'wp-i18n', 'wp-components', 'wp-block-editor' );
		$ver        = HATCH_VERSION;
		if ( file_exists( $asset_file ) ) {
			$asset = include $asset_file;
			$deps  = isset( $asset['dependencies'] ) ? $asset['dependencies'] : $deps;
			$ver   = isset( $asset['version'] ) ? $asset['version'] : $ver;
		}
		wp_register_script( 'hatch-blocks-bundle', HATCH_PLUGIN_URL . 'build/index.js', $deps, $ver, true );

		$src_dir = HATCH_PLUGIN_DIR . 'blocks-src/blocks';
		if ( ! is_dir( $src_dir ) ) {
			return;
		}
		foreach ( (array) scandir( $src_dir ) as $entry ) {
			if ( '.' === $entry || '..' === $entry ) {
				continue;
			}
			$block_path = trailingslashit( $src_dir ) . $entry;
			if ( ! is_dir( $block_path ) || ! file_exists( $block_path . '/block.json' ) ) {
				continue;
			}
			register_block_type( $block_path, array( 'editor_script' => 'hatch-blocks-bundle' ) );
		}
	}

	/**
	 * Editor assets — shared controls.
	 *
	 * @return void
	 */
	public function enqueue_editor_assets(): void {
		$asset_file = HATCH_PLUGIN_DIR . 'build/editor.asset.php';
		$deps       = array( 'wp-blocks', 'wp-element', 'wp-i18n', 'wp-components', 'wp-block-editor' );
		$ver        = HATCH_VERSION;
		if ( file_exists( $asset_file ) ) {
			$asset = include $asset_file;
			$deps  = isset( $asset['dependencies'] ) ? $asset['dependencies'] : $deps;
			$ver   = isset( $asset['version'] ) ? $asset['version'] : $ver;
		}
		if ( file_exists( HATCH_PLUGIN_DIR . 'build/editor.js' ) ) {
			wp_enqueue_script( 'hatch-editor', HATCH_PLUGIN_URL . 'build/editor.js', $deps, $ver, true );
			wp_set_script_translations( 'hatch-editor', 'hatch' );
		}
		if ( file_exists( HATCH_PLUGIN_DIR . 'build/editor.css' ) ) {
			wp_enqueue_style( 'hatch-editor', HATCH_PLUGIN_URL . 'build/editor.css', array( 'wp-edit-blocks' ), $ver );
		}
	}

	/**
	 * Frontend assets — block styles + Web Components for interactive blocks.
	 *
	 * Headless sites won't load these (the Astro frontend ships its own bundle),
	 * but traditional WP sites get the same blocks rendered with proper styles.
	 *
	 * @return void
	 */
	public function enqueue_frontend_assets(): void {
		if ( file_exists( HATCH_PLUGIN_DIR . 'build/frontend.css' ) ) {
			wp_enqueue_style( 'hatch-frontend', HATCH_PLUGIN_URL . 'build/frontend.css', array(), HATCH_VERSION );
		}
		if ( file_exists( HATCH_PLUGIN_DIR . 'build/interactive.js' ) ) {
			wp_enqueue_script( 'hatch-interactive', HATCH_PLUGIN_URL . 'build/interactive.js', array(), HATCH_VERSION, true );
		}
	}

	/**
	 * Load translations.
	 *
	 * @return void
	 */
	public function load_textdomain(): void {
		load_plugin_textdomain( 'hatch', false, dirname( plugin_basename( HATCH_PLUGIN_FILE ) ) . '/languages' );
	}

	/**
	 * Activation: set safe defaults.
	 *
	 * @return void
	 */
	public function on_activate(): void {
		// Webhook secret (CSPRNG via wp_generate_password).
		// IMPORTANT: only generate if missing — never rotate on re-activation.
		// Rotating it here would break the deployed broker's saved secret and
		// silently fail every future revalidate webhook until the user redeploys.
		if ( ! get_option( 'hatch_webhook_secret' ) ) {
			update_option( 'hatch_webhook_secret', wp_generate_password( 48, false ) );
		}

		// v0.50.7 — Force pretty permalinks. Plain permalinks (empty structure)
		// 301 every /wp-json/* request to the homepage → headless frontend
		// silently falls back to defaults. Hatch supports the ?rest_route=
		// fallback at the Astro layer, but pretty permalinks are still the
		// right default for cleaner deploy logs and wider plugin compat.
		// Only set when truly empty (don't override a custom structure).
		if ( '' === (string) get_option( 'permalink_structure', '' ) ) {
			update_option( 'permalink_structure', '/%postname%/' );
			set_transient( 'hatch_permalinks_auto_set', 1, HOUR_IN_SECONDS );
		}

		// v0.50.7 — Multisite-safe: warn and bail if someone tries to network-
		// activate Hatch. Per-site activation is supported; network activation
		// would share encrypted tokens / deploy URLs across subsites, which is
		// almost never what you want. Each subsite is its own headless project.
		if ( is_multisite() && is_network_admin() ) {
			set_transient( 'hatch_network_activate_blocked', 1, MINUTE_IN_SECONDS * 5 );
			deactivate_plugins( plugin_basename( HATCH_PLUGIN_FILE ), true, true );
			return;
		}

		// v0.49.5 — uninstall preference: default is preserve (re-install = no
		// data loss). User opts into full wipe via the Security tab checkbox.
		add_option( 'hatch_uninstall_remove_all_data', 0 );

		// v0.49.5 — clean up stale "Hatch (...)" Application Passwords on each
		// activation. Each wizard run + each deploy creates one; over time the
		// list grows to dozens (we hit 34 on this test site). Keep the most
		// recent 3 per user, delete the rest. Safe: deploy callbacks generate
		// fresh passwords on demand.
		if ( class_exists( 'WP_Application_Passwords' ) ) {
			$users = get_users( array( 'fields' => 'ID', 'role__in' => array( 'administrator' ) ) );
			foreach ( $users as $uid ) {
				$pwds = WP_Application_Passwords::get_user_application_passwords( $uid );
				if ( ! is_array( $pwds ) ) continue;
				$hatch = array_values( array_filter( $pwds, function ( $p ) {
					return isset( $p['name'] ) && 0 === stripos( (string) $p['name'], 'Hatch' );
				} ) );
				usort( $hatch, function ( $a, $b ) {
					return ( $b['created'] ?? 0 ) <=> ( $a['created'] ?? 0 );
				} );
				$to_delete = array_slice( $hatch, 3 ); // keep newest 3
				foreach ( $to_delete as $p ) {
					WP_Application_Passwords::delete_application_password( $uid, $p['uuid'] );
				}
			}
		}

		// V0.1 defaults.
		add_option( 'hatch_security_harden_rest', 1 );
		add_option( 'hatch_security_disable_xmlrpc', 1 );
		add_option( 'hatch_security_block_user_enum', 1 );
		add_option( 'hatch_security_force_noindex', 1 );
		add_option( 'hatch_revalidate_endpoint', '' );

		// V0.2 defaults.
		add_option( 'hatch_revalidate_post_types', 'post,page' );
		add_option( 'hatch_login_slug', '' );
		add_option( 'hatch_login_redirect_slug', '404' );
		add_option( 'hatch_login_role_guard_enabled', 1 );
		add_option( 'hatch_login_allowed_roles', 'administrator,editor,author' );
		add_option( 'hatch_brute_force_limit', 5 );
		add_option( 'hatch_brute_force_window', 30 );

		// V0.4 block defaults.
		add_option( 'hatch_blocks_custom_code_enabled', 1 );
		add_option( 'hatch_blocks_load_tailwind_editor', 1 );
		add_option( 'hatch_blocks_load_frontend_assets', 1 );

		// V0.5 frontend agent defaults.
		add_option( 'hatch_agent_port', 34210 );
		add_option( 'hatch_agent_workdir', '/var/www/hatch-frontend' );
		add_option( 'hatch_agent_pm2_name', 'hatch-frontend' );
		add_option( Hatch_Frontend_Agent::OPT_GIT_BRANCH, 'main' );

		// V0.6 — set a 30-second "just activated" transient so the next admin
		// page load redirects the user to the setup wizard. Only on FIRST
		// activation: if the user has already completed setup before, the
		// wizard skips itself.
		if ( ! get_option( 'hatch_setup_wizard_completed' ) ) {
			set_transient( 'hatch_just_activated', 1, 30 );
		}

		// V0.7 — schedule the 1-minute connection-freshness cron.
		Hatch_Connection_Status::ensure_cron();

		flush_rewrite_rules();
	}

	/**
	 * Deactivation: clear caches + flush rewrite rules.
	 *
	 * @return void
	 */
	public function on_deactivate(): void {
		delete_transient( Hatch_Acf_Bridge::CACHE_KEY );
		delete_transient( Hatch_Cpt_Scanner::CACHE_KEY );
		Hatch_Connection_Status::clear_cron();
		flush_rewrite_rules();
	}

	/**
	 * Uninstall: remove ALL plugin options when the user deletes the plugin.
	 *
	 * @return void
	 */
	public static function on_uninstall(): void {
		if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
			return;
		}
		$options = array(
			'hatch_webhook_secret',
			'hatch_revalidate_endpoint',
			'hatch_revalidate_post_types',
			'hatch_security_harden_rest',
			'hatch_security_disable_xmlrpc',
			'hatch_security_block_user_enum',
			'hatch_security_force_noindex',
			'hatch_login_slug',
			'hatch_login_redirect_slug',
			'hatch_login_role_guard_enabled',
			'hatch_login_allowed_roles',
			'hatch_brute_force_limit',
			'hatch_brute_force_window',
			'hatch_blocks_custom_code_enabled',
			'hatch_blocks_load_tailwind_editor',
			'hatch_blocks_load_frontend_assets',
			'hatch_setup_wizard_completed',
			// V0.7 connection status
			Hatch_Connection_Status::OPT_HOSTING_MODEL,
			Hatch_Connection_Status::OPT_LAST_ACK,
			Hatch_Connection_Status::OPT_LAST_ACK_STATUS,
			Hatch_Connection_Status::OPT_LAST_HEARTBEAT,
			Hatch_Connection_Status::OPT_LAST_HEARTBEAT_DATA,
			Hatch_Connection_Status::OPT_CONNECTED,
			Hatch_Connection_Status::OPT_DISCONNECT_NOTE,
			// V0.5 frontend agent.
			'hatch_agent_port',
			'hatch_agent_workdir',
			'hatch_agent_pm2_name',
			Hatch_Frontend_Agent::OPT_HOST,
			Hatch_Frontend_Agent::OPT_SECRET,
			Hatch_Frontend_Agent::OPT_CONNECTED_AT,
			Hatch_Frontend_Agent::OPT_LAST_PING,
			Hatch_Frontend_Agent::OPT_LAST_STATUS,
			Hatch_Frontend_Agent::OPT_FRONTEND_URL,
			Hatch_Frontend_Agent::OPT_GIT_REPO,
			Hatch_Frontend_Agent::OPT_GIT_BRANCH,
			Hatch_Frontend_SSH::OPT_HOST,
			Hatch_Frontend_SSH::OPT_PORT,
			Hatch_Frontend_SSH::OPT_USERNAME,
			Hatch_Frontend_SSH::OPT_CREDENTIAL,
			Hatch_Frontend_SSH::OPT_CRED_TYPE,
			Hatch_Frontend_SSH::OPT_WORKDIR,
			Hatch_Frontend_SSH::OPT_PM2_NAME,
			Hatch_Frontend_SSH::OPT_BRANCH,
		);
		foreach ( $options as $opt ) {
			delete_option( $opt );
		}
	}
}

// Bootstrap.
Hatch::instance();

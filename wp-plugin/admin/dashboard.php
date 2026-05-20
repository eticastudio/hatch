<?php
/**
 * Hatch admin dashboard. v0.6 redesign.
 *
 * Four centered tabs only:
 *   - Connector  (home: status, diagnostic, setup credentials, hosting docs)
 *   - Features   (theme picker + 14 SproutOS-blog feature toggles)
 *   - Blocks     (8 Hatch block toggles with master switch)
 *   - Security   (hardening + login URL + brute force)
 *
 * No "Connection", "Frontend", "Health", or "Plugins" tabs anymore.
 * All centered (max-width 880px). 🐣 chick logo. Premium Tailwind aesthetic.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

// Legacy PHP UI is gone. React owns every visual in admin-react/. PHP here is
// pure data plumbing: REST routes, admin-post save handlers, boot state.

add_action( 'admin_menu', 'hatch_register_admin_menu' );
add_action( 'admin_init', 'hatch_register_settings' );
add_action( 'admin_post_hatch_save_frontend_url', 'hatch_handle_save_frontend_url' );
// v0.50.0. new admin-post handlers (Save Security, App-password rotate).
add_action( 'admin_post_hatch_rotate_app_pwds',   'hatch_handle_rotate_app_pwds' );
// v0.50.1. Turnstile probe (validates that the saved Turnstile secret key works).
add_action( 'admin_enqueue_scripts', 'hatch_enqueue_admin_assets' );
// v0.51 — React admin SPA save endpoint. Accepts a key/value batch where keys
// are dot-paths (features.toc, snippets.gtm_id, security.block_rest, ...) and
// dispatches each one to the right option / class method.
add_action( 'rest_api_init', 'hatch_register_react_options_route' );
// v0.50.0. admin notice when a builder-block plugin is active (output won't render headless).
add_action( 'admin_notices',         'hatch_builder_block_warning' );
// v0.50.4. admin notice when permalinks are PLAIN. Confuses every headless
// frontend (Astro hits /wp-json/* → 301). Hatch handles the fallback via
// ?rest_route= but pretty permalinks are still strongly recommended.
add_action( 'admin_notices',         'hatch_plain_permalinks_warning' );
// v0.50.7. admin notices for permalink auto-set + network-activate block + multisite tip.
add_action( 'admin_notices',         'hatch_permalinks_auto_set_notice' );
add_action( 'network_admin_notices', 'hatch_network_activate_blocked_notice' );
add_action( 'admin_notices',         'hatch_multisite_subsite_tip' );
// v0.50.1. daily cron prunes Hatch Application Passwords older than retention window.
add_action( 'hatch_prune_app_pwds_cron', 'hatch_prune_app_pwds' );
add_action( 'init', function() {
	if ( ! wp_next_scheduled( 'hatch_prune_app_pwds_cron' ) ) {
		wp_schedule_event( time() + 3600, 'daily', 'hatch_prune_app_pwds_cron' );
	}
} );

/**
 * Enqueue Hatch admin design system. ONLY on Hatch screens.
 *
 * @param string $hook Current admin page hook.
 * @return void
 */
function hatch_enqueue_admin_assets( $hook ): void {
	// Only on Hatch admin screens, but the setup wizard still uses some legacy
	// styles so load font + css there too.
	if ( false === strpos( (string) $hook, 'hatch' ) ) {
		return;
	}

	wp_enqueue_style(
		'hatch-admin-font',
		'https://rsms.me/inter/inter.css',
		array(),
		HATCH_VERSION
	);

	// Load WordPress media library JS so the React admin can open the
	// "Choose from media" picker for logo / favicon / OG image inputs.
	wp_enqueue_media();

	// Both the main dashboard and the setup wizard run the React bundle now.
	// PHP = data plumbing, React = every visual. The bundle decides which app
	// to render by reading window.hatchBoot.page.
	$is_setup_wizard = false !== strpos( (string) $hook, 'hatch-setup' );

	// Main dashboard = React SPA. Bundle is produced by `npm run build:admin`
	// at build/admin/index.{js,asset.php}.
	$bundle_js  = HATCH_PLUGIN_DIR . 'build/admin/index.jsx.js';
	$asset_php  = HATCH_PLUGIN_DIR . 'build/admin/index.jsx.asset.php';
	$bundle_css = HATCH_PLUGIN_DIR . 'build/admin/index.jsx.css';

	if ( ! file_exists( $bundle_js ) ) {
		// Build hasn't run yet. Show a sticky notice instead of an empty page.
		add_action( 'admin_notices', static function () {
			echo '<div class="notice notice-error"><p><strong>Hatch admin bundle not built.</strong> Run <code>npm install &amp;&amp; npm run build:admin</code> inside <code>wp-content/plugins/hatch/</code>.</p></div>';
		} );
		return;
	}

	$asset = file_exists( $asset_php )
		? require $asset_php
		: array( 'dependencies' => array( 'wp-element' ), 'version' => HATCH_VERSION );
	// Append the bundle mtime so the browser drops any stale cached copy.
	$bundle_version = (string) ( $asset['version'] ?? HATCH_VERSION ) . '.' . (string) filemtime( $bundle_js );

	wp_enqueue_script(
		'hatch-admin-react',
		HATCH_PLUGIN_URL . 'build/admin/index.jsx.js',
		(array) ( $asset['dependencies'] ?? array() ),
		$bundle_version,
		true
	);
	if ( file_exists( $bundle_css ) ) {
		wp_enqueue_style(
			'hatch-admin-react',
			HATCH_PLUGIN_URL . 'build/admin/index.jsx.css',
			array( 'hatch-admin-font' ),
			$bundle_version
		);
	}

	// SSR-style boot state. The React app reads window.hatchBoot on first paint
	// and skips any initial fetch round-trip.
	wp_add_inline_script(
		'hatch-admin-react',
		'window.hatchBoot = ' . wp_json_encode( hatch_react_boot_state() ) . ';',
		'before'
	);
}

/**
 * Assemble the initial state payload for the React admin. Every option,
 * heartbeat, feature flag, and design token the SPA needs to render its first
 * paint without a fetch. Saves go through POST /hatch/v1/options.
 *
 * @return array
 */
function hatch_react_boot_state(): array {
	$hosting_model = (string) get_option( 'hatch_hosting_model', 'vps' );
	$frontend_url  = trim( (string) get_option( 'hatch_frontend_url', '' ) );

	$heartbeat_record = null;
	$heartbeat_health = 'muted';
	$heartbeat_label  = __( 'No heartbeat yet. First probe runs within 5 minutes.', 'hatch' );
	if ( class_exists( 'Hatch_Cloud_Heartbeat' ) ) {
		$host_for_hb = 'cloudflare-pages' === $hosting_model ? 'cloudflare' : ( 'vercel' === $hosting_model ? 'vercel' : 'vps' );
		$heartbeat_record = Hatch_Cloud_Heartbeat::get( $host_for_hb );
		$heartbeat_health = Hatch_Cloud_Heartbeat::health( $heartbeat_record );
		if ( $heartbeat_record ) {
			$ttfb = isset( $heartbeat_record['ttfb_ms'] ) ? (int) $heartbeat_record['ttfb_ms'] . 'ms' : '—';
			$age  = isset( $heartbeat_record['ts'] ) ? human_time_diff( (int) $heartbeat_record['ts'] ) : '—';
			/* translators: %1$s: TTFB, %2$s: time ago */
			$heartbeat_label = sprintf( __( 'TTFB %1$s · last probe %2$s ago', 'hatch' ), $ttfb, $age );
		}
	}

	// Preflight check list. Hatch_Diagnostic::run() returns an array of
	// { id, title, message, severity, fix } per check; we map to the React
	// shape { label, ok, warn, note }. Pass-through stays light, warns get a
	// fix hint, and fails surface the failure message.
	$preflight = array();
	if ( class_exists( 'Hatch_Diagnostic' ) ) {
		$raw = (array) Hatch_Diagnostic::run();
		$rows = isset( $raw['checks'] ) ? (array) $raw['checks'] : $raw;
		foreach ( $rows as $c ) {
			if ( ! is_array( $c ) ) { continue; }
			$sev = isset( $c['severity'] ) ? (string) $c['severity'] : 'pass';
			$preflight[] = array(
				'label' => isset( $c['title'] )   ? (string) $c['title']   : '',
				'ok'    => 'pass' === $sev,
				'warn'  => 'warn' === $sev,
				'note'  => isset( $c['message'] ) ? (string) $c['message'] : '',
			);
		}
	}

	// Which admin app is mounting. Dashboard or setup wizard.
	$page = ( isset( $_GET['page'] ) && 'hatch-setup' === $_GET['page'] ) ? 'setup' : 'dashboard';
	// Current wizard step (?step=2 ?step=3).
	$step = isset( $_GET['step'] ) ? max( 1, min( 3, (int) $_GET['step'] ) ) : 1;
	$home_host = (string) wp_parse_url( home_url(), PHP_URL_HOST );

	return array(
		'nonce'    => wp_create_nonce( 'wp_rest' ),
		'restUrl'  => esc_url_raw( rest_url( 'hatch/v1/' ) ),
		'adminUrl' => admin_url( 'admin.php?page=hatch' ),
		'setupUrl' => admin_url( 'admin.php?page=hatch-setup' ),
		'adminPostUrl' => admin_url( 'admin-post.php' ),
		'version'  => HATCH_VERSION,
		'page'     => $page,
		'step'     => $step,
		'siteHost' => $home_host,
		'siteName' => get_bloginfo( 'name' ),
		'state'    => array(
			'connection' => array(
				'frontendUrl' => $frontend_url,
				'hostLabel'   => hatch_host_label( $hosting_model ),
				'hostModel'   => $hosting_model,
				'heartbeat'   => array(
					'healthClass' => $heartbeat_health,
					'healthLabel' => $heartbeat_label,
				),
				'preflight'   => $preflight,
			),
			// v0.50.25 — Expose upstream / demo / author / repo so the theme
			// card in admin can render a "Demo ↗" link + credit the author.
			'themes'         => class_exists( 'Hatch_Features' ) ? array_map(
				static function ( $id, $row ) {
					return array(
						'id'       => $id,
						'label'    => isset( $row['label'] )       ? (string) $row['label']       : $id,
						'desc'     => isset( $row['description'] ) ? (string) $row['description'] : '',
						'upstream' => isset( $row['upstream'] )    ? (string) $row['upstream']    : '',
						'author'   => isset( $row['author'] )      ? (string) $row['author']      : '',
						'repo'     => isset( $row['repo'] )        ? (string) $row['repo']        : '',
						'demo'     => isset( $row['demo'] )        ? (string) $row['demo']        : '',
						'license'  => isset( $row['license'] )     ? (string) $row['license']     : '',
					);
				},
				array_keys( (array) Hatch_Features::themes() ),
				(array) Hatch_Features::themes()
			) : array(),
			// v0.50.13 — wp_parse_args defaults so partial saves don't strip sibling
			// keys. Earlier shape returned only what was saved (e.g. {primary})
			// which made the React UI render only one color picker. Defaults
			// ALWAYS merge in now; user-saved keys win.
			'design'         => array(
				'theme'        => class_exists( 'Hatch_Features' ) ? (string) Hatch_Features::get_theme() : '',
				'brand'        => wp_parse_args(
					(array) get_option( 'hatch_design_brand', array() ),
					array(
						'primary'    => '#ff6b00',
						'secondary'  => '#0a0a0a',
						'accent'     => '#6366f1',
						'background' => '#fafafa',
					)
				),
				// v0.50.14 — canonical lowercase IDs. The React UI writes these
				// directly via setSetting() and the Astro frontend reads them
				// verbatim. Pretty display labels live in the JSX.
				'layout'       => wp_parse_args(
					(array) get_option( 'hatch_design_layout', array() ),
					array(
						'density'      => 'comfortable',
						'rounded'      => 'smooth',
						'max_width'    => '1160',
						'button_style' => 'pill',
					)
				),
				'font_heading' => (string) get_option( 'hatch_design_font_heading', 'Inter' ),
				'font_body'    => (string) get_option( 'hatch_design_font_body', 'Inter' ),
				'font_mono'    => (string) get_option( 'hatch_design_font_mono', 'JetBrains Mono' ),
				'mode'         => (string) get_option( 'hatch_design_mode', 'auto' ),
			),
			'voice'          => wp_parse_args(
				(array) get_option( 'hatch_design_voice', array() ),
				array( 'tone' => 'professional', 'pronouns' => 'we' )
			),
			'identity'       => wp_parse_args(
				(array) get_option( 'hatch_design_identity', array() ),
				array(
					'logo_url'     => '',
					'favicon_url'  => '',
					'og_image_url' => '',
					'site_title'   => get_bloginfo( 'name' ),
					'tagline'      => get_bloginfo( 'description' ),
				)
			),
			'templates'      => wp_parse_args(
				(array) get_option( 'hatch_design_templates', array() ),
				array(
					'single_sidebar'   => 'right',
					'single_hero'      => 'featured',
					'single_width'     => 'medium',
					'archive_grid'     => '2',
					'archive_excerpt'  => true,
					'not_found_search' => true,
				)
			),
			'borders'        => (array) get_option( 'hatch_design_borders', array( 'color' => '#e5e5e5', 'shadow' => 'soft' ) ),
			'breakpoints'    => (array) get_option( 'hatch_design_breakpoints', array( 'mobile' => 640, 'tablet' => 1024, 'desktop' => 1280 ) ),
			'show_credit'    => (bool) get_option( 'hatch_show_credit', true ),
			// v0.50.16 — raw design.md source for the upload/paste textarea
			// in the Global card. Round-trips through Hatch_Design_Loader.
			'design_md'      => class_exists( 'Hatch_Design_Loader' ) ? Hatch_Design_Loader::get_raw() : '',

			// v0.50.15 — Aesthetic surface for the Astro frontend. Seven option
			// groups, each its own wp_options row so a partial save can't drop
			// sibling keys. Defaults match the current hardcoded Astro behaviour
			// so existing installs see zero visual change on upgrade.
			'share'          => wp_parse_args(
				(array) get_option( 'hatch_design_share', array() ),
				array(
					'x'        => true,
					'linkedin' => true,
					'whatsapp' => true,
					'copy'     => true,
					'facebook' => false,
					'reddit'   => false,
					'email'    => false,
					'position' => 'inline',   // inline | sticky | both
				)
			),
			'header'         => wp_parse_args(
				(array) get_option( 'hatch_design_header', array() ),
				array(
					'sticky'            => 'sticky', // sticky | static | hide_on_scroll
					'blur'              => true,
					'color_mode_button' => true,
					'brand_mark'        => 'icon_text', // icon_text | text | initial
				)
			),
			'reading'        => wp_parse_args(
				(array) get_option( 'hatch_design_reading', array() ),
				array(
					'date_format'           => 'long',     // long | short | relative
					'reading_time_label'    => 'min_read', // min_read | mins | hidden
					'breadcrumb_separator'  => 'slash',    // slash | chevron | arrow
					'toc_depth'             => 'h2_h3',    // h2 | h2_h3 | h2_h3_h4
					'toc_label'             => 'On this page',
					'author_avatar_shape'   => 'circle',   // circle | square | rounded
					'progress_bar_position' => 'top',      // top | bottom
					'progress_bar_color'    => 'primary',  // primary | accent
					'heading_anchors'       => false,
				)
			),
			'images'         => wp_parse_args(
				(array) get_option( 'hatch_design_images', array() ),
				array(
					'lightbox'          => true,
					'lazy_load'         => true,
					'hover_zoom'        => true,
					'fallback_gradient' => true,
					'retina_2x'         => true,
					'aspect_ratio'      => '2_1', // 2_1 | 3_1 | 16_9
				)
			),
			'animation'      => wp_parse_args(
				(array) get_option( 'hatch_design_animation', array() ),
				array(
					'page_transitions'       => true,
					'respect_reduced_motion' => true,
				)
			),
			'blog_index'     => wp_parse_args(
				(array) get_option( 'hatch_design_blog_index', array() ),
				array(
					'archive_grid'     => '3',          // 1 | 2 | 3 | 4
					'pagination_style' => 'load_more',  // load_more | numbered | infinite
					'show_hero'        => true,
					'show_topics'      => true,
				)
			),
			'post_navigation' => wp_parse_args(
				(array) get_option( 'hatch_design_post_navigation', array() ),
				array(
					'related_count'  => 3,
					'related_source' => 'category', // category | tags | mixed
				)
			),
			'setup'          => hatch_react_setup_state(),
			'features'       => class_exists( 'Hatch_Features' ) ? (array) Hatch_Features::get_all() : array(),
			'featureCatalog' => class_exists( 'Hatch_Features' )
				? array_map(
					static function ( $slug, $info ) {
						return array(
							'slug'        => $slug,
							'label'       => isset( $info['label'] ) ? (string) $info['label'] : $slug,
							'description' => isset( $info['description'] ) ? (string) $info['description'] : '',
							'group'       => isset( $info['group'] ) ? (string) $info['group'] : 'general',
						);
					},
					array_keys( (array) Hatch_Features::catalog() ),
					(array) Hatch_Features::catalog()
				)
				: array(),
			'featureGroups'  => class_exists( 'Hatch_Features' )
				? array_map(
					static function ( $slug, $label ) {
						return array( 'slug' => $slug, 'label' => (string) $label );
					},
					array_keys( (array) Hatch_Features::group_labels() ),
					(array) Hatch_Features::group_labels()
				)
				: array(),
			'snippets'       => (array) get_option( 'hatch_code_snippets', array() ),
			// v0.50.14 — content_flags slimmed to just Comments. Forms /
			// sitemap / RSS / robots / redirects all routed through their
			// respective WP plugins (Plugin Bridge auto-detects); having
			// Hatch-side toggles for them was duplicate config + dead UX.
			'content'        => wp_parse_args(
				(array) get_option( 'hatch_content_flags', array() ),
				array(
					'comments_enabled'   => true,
					'comments_turnstile' => false,
				)
			),
			'hatchBlocks'    => (array) get_option( 'hatch_blocks_enabled', array(
				'hero' => true, 'faq' => true, 'cta' => true,
				'testimonial' => false, 'gallery' => false, 'pricing' => false,
			) ),
			// v0.50.13 — read Turnstile from the authoritative source
			// (`hatch_integrations`). The earlier `hatch_turnstile` key was a
			// dispatcher artifact that no consumer read, so the UI showed
			// "Keys missing" even after the user typed them in.
			'turnstile'      => class_exists( 'Hatch_Integrations' )
				? (array) ( Hatch_Integrations::get_all()['turnstile'] ?? array() )
				: array( 'enabled' => false, 'site_key' => '', 'secret_key' => '' ),
			'menus'          => hatch_react_menus_summary(),
			'forms'          => hatch_react_forms_summary(),
			'pluginBridge'   => hatch_react_plugin_bridge(),
			'performance'    => hatch_react_perf_state(),
			'security'       => hatch_react_security_state(),
			'status'         => hatch_react_status_snapshot(),
			// v0.50.31 — WordPress Core Sync card. Surfaces every WP-owned
			// setting that affects headless rendering so users have ONE
			// status view + deep-links to the canonical WP UI. Read-only;
			// we don't duplicate WP's own admin pages, just show drift.
			'coreSync'       => hatch_react_core_sync(),
		),
	);
}

/**
 * v0.50.31 — WordPress Core Sync snapshot.
 *
 * Hatch's job is to mirror what WordPress already owns. This payload gives
 * the Content tab a single status view of every WP-owned setting that
 * affects the headless frontend, with deep-links to the canonical WP UI.
 * READ-ONLY. We don't duplicate WP admin pages — we surface drift.
 *
 * Shape:
 *   permalink: { structure, pretty, admin_url }
 *   homepage:  { mode (posts|page), static_id, static_title, admin_url }
 *   menus:     [{ loc, label, assigned, count, admin_url }]
 *   post_types: [{ slug, label, count, public, in_rest, in_nav, admin_url }]
 *   taxonomies: [{ slug, label, count, admin_url }]
 *   languages: [{ code, label, default }]  // populated if Polylang/WPML detected
 */
function hatch_react_core_sync(): array {
	// SITE IDENTITY — General Settings + Customizer.
	$logo_id   = (int) get_theme_mod( 'custom_logo', 0 );
	$site = array(
		'title'        => (string) get_bloginfo( 'name' ),
		'tagline'      => (string) get_bloginfo( 'description' ),
		'url'          => (string) home_url(),
		'language'     => (string) get_bloginfo( 'language' ),
		'timezone'     => (string) get_option( 'timezone_string' ) ?: (string) get_option( 'gmt_offset' ),
		'date_format'  => (string) get_option( 'date_format' ),
		'time_format'  => (string) get_option( 'time_format' ),
		'logo_url'     => $logo_id ? (string) wp_get_attachment_image_url( $logo_id, 'full' ) : '',
		'favicon_url'  => function_exists( 'get_site_icon_url' ) ? (string) get_site_icon_url() : '',
		'admin_url'    => admin_url( 'options-general.php' ),
		'customizer_url' => admin_url( 'customize.php?autofocus[section]=title_tagline' ),
	);

	// PERMALINKS — frontend routing requires pretty perms.
	// v0.50.31 — emit a HUMAN-READABLE example URL by substituting WP's
	// permalink tags with realistic placeholder values. `/blog/%postname%/`
	// becomes `/blog/your-post-title/` — instantly clear to non-devs.
	$structure = (string) get_option( 'permalink_structure', '' );
	$example   = strtr( $structure, array(
		'%postname%'  => 'your-post-title',
		'%category%'  => 'category',
		'%author%'    => 'author',
		'%post_id%'   => '123',
		'%year%'      => date( 'Y' ),
		'%monthnum%'  => date( 'm' ),
		'%day%'       => date( 'd' ),
		'%hour%'      => date( 'H' ),
		'%minute%'    => date( 'i' ),
		'%second%'    => date( 's' ),
	) );
	$permalink = array(
		'structure'  => $structure,
		'example'    => $example ?: '/?p=123',
		'pretty'     => '' !== $structure,
		'admin_url'  => admin_url( 'options-permalink.php' ),
	);

	// HOMEPAGE — posts page vs static page.
	$show_on_front  = (string) get_option( 'show_on_front', 'posts' );
	$page_on_front  = (int) get_option( 'page_on_front', 0 );
	$homepage = array(
		'mode'         => $show_on_front,
		'static_id'    => $page_on_front,
		'static_title' => $page_on_front ? (string) get_the_title( $page_on_front ) : '',
		'admin_url'    => admin_url( 'options-reading.php' ),
	);

	// MENUS — every registered location + assignment state + item count
	// + the FULL menu list so the React admin can render an inline picker.
	$menu_locations = (array) get_registered_nav_menus();
	$menu_assigned  = (array) get_nav_menu_locations();
	$all_menus_raw  = wp_get_nav_menus();
	$all_menus = array();
	foreach ( (array) $all_menus_raw as $m ) {
		$all_menus[] = array(
			'id'    => (int) $m->term_id,
			'name'  => (string) $m->name,
			'count' => (int) $m->count,
		);
	}
	$menus = array();
	foreach ( $menu_locations as $loc => $label ) {
		$mid  = (int) ( $menu_assigned[ $loc ] ?? 0 );
		$menu = $mid ? wp_get_nav_menu_object( $mid ) : null;
		$items = $mid ? (array) wp_get_nav_menu_items( $mid ) : array();
		$menus[] = array(
			'loc'         => (string) $loc,
			'label'       => (string) $label,
			'assigned_id' => $mid,
			'assigned'    => $menu ? (string) $menu->name : '',
			'count'       => count( $items ),
			'admin_url'   => admin_url( 'nav-menus.php?action=locations' ),
		);
	}

	// DISCUSSION (Settings → Discussion) — what WP says about comments.
	$discussion = array(
		'default_comment_status' => (string) get_option( 'default_comment_status', 'open' ),
		'comment_registration'   => (bool) get_option( 'comment_registration', false ),
		'comment_moderation'     => (bool) get_option( 'comment_moderation', false ),
		'require_name_email'     => (bool) get_option( 'require_name_email', true ),
		'admin_url'              => admin_url( 'options-discussion.php' ),
		'pending_count'          => (int) ( wp_count_comments()->moderated ?? 0 ),
		'approved_count'         => (int) ( wp_count_comments()->approved ?? 0 ),
	);

	// READING (Settings → Reading)
	$reading = array(
		'posts_per_page'      => (int) get_option( 'posts_per_page', 10 ),
		'rss_use_excerpt'     => (bool) get_option( 'rss_use_excerpt', false ),
		'blog_public'         => (bool) get_option( 'blog_public', true ),
		'admin_url'           => admin_url( 'options-reading.php' ),
	);

	// PRIVACY (Settings → Privacy)
	$privacy_id = (int) get_option( 'wp_page_for_privacy_policy', 0 );
	$privacy = array(
		'page_id'    => $privacy_id,
		'page_title' => $privacy_id ? (string) get_the_title( $privacy_id ) : '',
		'admin_url'  => admin_url( 'options-privacy.php' ),
	);

	// USERS / ROLES — useful for memberships + author archives.
	$role_counts = count_users();
	$roles = array();
	foreach ( (array) wp_roles()->role_names as $role => $name ) {
		$roles[] = array(
			'slug'  => (string) $role,
			'name'  => (string) $name,
			'count' => (int) ( $role_counts['avail_roles'][ $role ] ?? 0 ),
		);
	}

	// v0.50.31 — AUTHORS — users who have published at least one post.
	// These become author archive pages on the Astro frontend (/blog/author/<slug>).
	// Surface their display_name, bio status, avatar status so the user can
	// see drift (e.g. "5 authors but only 1 has a bio set"). Profile page
	// deep-links straight to /wp-admin/profile.php.
	$author_query = get_users( array(
		'has_published_posts' => array( 'post' ),
		'orderby'             => 'post_count',
		'order'               => 'DESC',
		'number'              => 20,
		'fields'              => array( 'ID', 'display_name', 'user_nicename' ),
	) );
	$authors = array();
	foreach ( (array) $author_query as $u ) {
		$desc = (string) get_user_meta( $u->ID, 'description', true );
		$authors[] = array(
			'id'           => (int) $u->ID,
			'name'         => (string) $u->display_name,
			'slug'         => (string) $u->user_nicename,
			'post_count'   => (int) count_user_posts( $u->ID, 'post', true ),
			'has_bio'      => '' !== $desc,
			'has_avatar'   => (bool) get_avatar_url( $u->ID, array( 'default' => '404' ) ),
			'profile_url'  => admin_url( 'user-edit.php?user_id=' . $u->ID ),
		);
	}
	$authors_summary = array(
		'list'         => $authors,
		'total'        => count( $authors ),
		'with_bio'     => count( array_filter( $authors, fn( $a ) => $a['has_bio'] ) ),
		'admin_url'    => admin_url( 'users.php?role=author' ),
		'profile_url'  => admin_url( 'profile.php' ),
	);

	// POST TYPES — every public + in-REST type with post count.
	$post_types = array();
	foreach ( get_post_types( array( 'public' => true, 'show_in_rest' => true ), 'objects' ) as $slug => $obj ) {
		if ( 'attachment' === $slug ) continue;
		$post_types[] = array(
			'slug'      => (string) $slug,
			'label'     => (string) $obj->label,
			'count'     => (int) wp_count_posts( $slug )->publish,
			'public'    => (bool) $obj->public,
			'in_rest'   => (bool) $obj->show_in_rest,
			'in_nav'    => (bool) $obj->show_in_nav_menus,
			'builtin'   => (bool) $obj->_builtin,
			'admin_url' => admin_url( 'edit.php?post_type=' . $slug ),
		);
	}

	// TAXONOMIES — every public + in-REST taxonomy.
	$taxonomies = array();
	foreach ( get_taxonomies( array( 'public' => true, 'show_in_rest' => true ), 'objects' ) as $slug => $obj ) {
		$terms = (int) wp_count_terms( array( 'taxonomy' => $slug, 'hide_empty' => false ) );
		$taxonomies[] = array(
			'slug'      => (string) $slug,
			'label'     => (string) $obj->label,
			'count'     => $terms,
			'builtin'   => (bool) $obj->_builtin,
			'admin_url' => admin_url( 'edit-tags.php?taxonomy=' . $slug ),
		);
	}

	// LANGUAGES — populated when a multilingual plugin is active.
	$languages = array();
	if ( function_exists( 'pll_languages_list' ) ) {
		foreach ( (array) pll_languages_list( array( 'fields' => 'slug' ) ) as $code ) {
			$languages[] = array( 'code' => (string) $code, 'label' => (string) $code, 'default' => false );
		}
	} elseif ( defined( 'ICL_SITEPRESS_VERSION' ) ) {
		$languages[] = array( 'code' => 'wpml', 'label' => 'WPML detected', 'default' => true );
	}

	return array(
		'site'       => $site,
		'permalink'  => $permalink,
		'homepage'   => $homepage,
		'menus'      => $menus,
		'all_menus'  => $all_menus,
		'discussion' => $discussion,
		'reading'    => $reading,
		'privacy'    => $privacy,
		'post_types' => $post_types,
		'taxonomies' => $taxonomies,
		'languages'  => $languages,
		'roles'      => $roles,
		'authors'    => $authors_summary,
	);
}

/**
 * Menus summary — locations + assigned menu names. Read by the React Content tab.
 *
 * @return array<int, array{loc: string, label: string, assigned: string}>
 */
function hatch_react_menus_summary(): array {
	$locations = (array) get_registered_nav_menus();
	$assigned  = (array) get_nav_menu_locations();
	$out = array();
	foreach ( $locations as $loc => $label ) {
		$menu = ! empty( $assigned[ $loc ] ) ? wp_get_nav_menu_object( (int) $assigned[ $loc ] ) : null;
		$out[] = array(
			'loc'      => (string) $loc,
			'label'    => (string) $label,
			'assigned' => $menu ? (string) $menu->name : __( 'Not assigned', 'hatch' ),
		);
	}
	return $out;
}

/**
 * Forms bridge summary — which form plugin is detected, how many forms.
 *
 * @return array{detected: bool, plugin: ?string, count: int}
 */
function hatch_react_forms_summary(): array {
	if ( defined( 'FLUENTFORM' ) || class_exists( 'FluentForm\App\App' ) ) {
		$count = 0;
		if ( function_exists( 'wpFluent' ) ) {
			$count = (int) wpFluent()->table( 'fluentform_forms' )->count();
		}
		return array( 'detected' => true, 'plugin' => 'Fluent Forms', 'count' => $count );
	}
	if ( class_exists( 'GFForms' ) ) {
		return array( 'detected' => true, 'plugin' => 'Gravity Forms', 'count' => 0 );
	}
	if ( class_exists( 'WPForms' ) ) {
		return array( 'detected' => true, 'plugin' => 'WPForms', 'count' => 0 );
	}
	if ( defined( 'WPCF7_VERSION' ) ) {
		return array( 'detected' => true, 'plugin' => 'Contact Form 7', 'count' => 0 );
	}
	return array( 'detected' => false, 'plugin' => null, 'count' => 0 );
}

/**
 * Plugin Bridge — auto-detected installed WP plugins Hatch can expose to the
 * frontend. Detection only; user picks which to surface via toggles.
 *
 * @return array<int, array{n: string, detected: bool, d: string}>
 */
function hatch_react_plugin_bridge(): array {
	if ( ! function_exists( 'is_plugin_active' ) ) {
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
	}

	// Capability-based catalog. Each entry is a frontend feature category
	// Hatch can bridge; `providers` lists known plugin slugs + their display
	// name, ordered by recommendation. First detected provider wins.
	//
	// v0.50.31 — WooCommerce-style extensibility.
	// Third-party plugins can REGISTER themselves as Hatch providers via:
	//
	//   add_filter( 'hatch_plugin_bridge_catalog', function ( $catalog ) {
	//       $catalog[] = array(
	//           'feature'   => 'Reviews',
	//           'd'         => 'Aggregated product / page reviews surfaced on the frontend.',
	//           'providers' => array(
	//               'My Reviews Pro' => array( 'my-reviews-pro/my-reviews-pro.php' ),
	//           ),
	//       );
	//       return $catalog;
	//   } );
	//
	// OR add their plugin as a provider for an existing capability:
	//
	//   add_filter( 'hatch_plugin_bridge_catalog', function ( $catalog ) {
	//       foreach ( $catalog as &$row ) {
	//           if ( 'SEO + Sitemap' === $row['feature'] ) {
	//               $row['providers']['My SEO Plugin'] = array( 'my-seo/my-seo.php' );
	//           }
	//       }
	//       return $catalog;
	//   } );
	//
	// This is THE single point of extension for headless-bridge plugins.
	// Filter runs once per Hatch admin page load — cheap. Docs:
	// see CONTRIBUTING.md → "Building a Hatch-aware plugin".
	$catalog = array(
		// v0.50.14 — Forms / SEO / Redirects moved here from Content tab
		// "Core integrations". Hatch doesn't reinvent these; it surfaces
		// whichever WP plugin is providing the capability so the user can
		// trust the existing tool.
		array(
			'feature'   => 'Forms',
			'd'         => 'Form rendering + submissions handled by the form plugin\'s own REST endpoints — Hatch surfaces detection only.',
			'providers' => array(
				'Fluent Forms'             => array( 'fluentform/fluentform.php' ),
				'Gravity Forms'            => array( 'gravityforms/gravityforms.php' ),
				'WPForms'                  => array( 'wpforms/wpforms.php', 'wpforms-lite/wpforms.php' ),
				'Contact Form 7'           => array( 'contact-form-7/wp-contact-form-7.php' ),
			),
		),
		array(
			'feature'   => 'SEO + Sitemap',
			'd'         => 'sitemap.xml, rss.xml, robots.txt, and JSON-LD schema all sourced from your SEO plugin.',
			'providers' => array(
				'RankMath'                 => array( 'seo-by-rank-math/rank-math.php' ),
				'Yoast SEO'                => array( 'wordpress-seo/wp-seo.php', 'wordpress-seo-premium/wp-seo-premium.php' ),
				'AIOSEO'                   => array( 'all-in-one-seo-pack/all_in_one_seo_pack.php', 'all-in-one-seo-pack-pro/all_in_one_seo_pack.php' ),
			),
		),
		array(
			'feature'   => 'Redirects',
			'd'         => 'Redirect rules pulled from your SEO plugin or Redirection so the Astro middleware honors them. No Hatch toggle — present iff a provider plugin is active.',
			'providers' => array(
				'RankMath'                 => array( 'seo-by-rank-math/rank-math.php' ),
				'Yoast SEO Premium'        => array( 'wordpress-seo-premium/wp-seo-premium.php' ),
				'Redirection'              => array( 'redirection/redirection.php' ),
			),
		),
		array(
			'feature'   => 'eCommerce',
			'd'         => 'Products, cart, and checkout on the frontend.',
			'providers' => array(
				'WooCommerce'              => array( 'woocommerce/woocommerce.php' ),
				'Easy Digital Downloads'   => array( 'easy-digital-downloads/easy-digital-downloads.php' ),
				'WP EasyCart'              => array( 'wp-easycart/wp-easycart.php' ),
			),
		),
		array(
			'feature'   => 'Custom Fields',
			'd'         => 'Custom field values exposed in REST + post meta.',
			'providers' => array(
				'ACF'                      => array( 'advanced-custom-fields-pro/acf.php', 'advanced-custom-fields/acf.php' ),
				'Meta Box'                 => array( 'meta-box/meta-box.php' ),
				'Pods'                     => array( 'pods/init.php' ),
				'JetEngine'                => array( 'jet-engine/jet-engine.php' ),
			),
		),
		array(
			'feature'   => 'Email Newsletter',
			'd'         => 'Opt-in forms and subscriber lists bridged to the frontend.',
			'providers' => array(
				'FluentCRM'                => array( 'fluent-crm/fluent-crm.php' ),
				'Mailchimp for WP'         => array( 'mailchimp-for-wp/mailchimp-for-wp.php' ),
				'Newsletter'               => array( 'newsletter/plugin.php' ),
				'MailPoet'                 => array( 'mailpoet/mailpoet.php' ),
			),
		),
		array(
			'feature'   => 'Memberships',
			'd'         => 'Gated content, member-only routes, paid tiers.',
			'providers' => array(
				'MemberPress'              => array( 'memberpress/memberpress.php' ),
				'Paid Memberships Pro'     => array( 'paid-memberships-pro/paid-memberships-pro.php' ),
				'Restrict Content Pro'     => array( 'restrict-content-pro/restrict-content-pro.php' ),
			),
		),
		array(
			'feature'   => 'Code Snippets',
			'd'         => 'Inject snippets globally without editing theme files.',
			'providers' => array(
				'WPCode'                   => array( 'wpcode/wpcode.php', 'insert-headers-and-footers/ihaf.php' ),
				'Code Snippets'            => array( 'code-snippets/code-snippets.php' ),
				'Advanced Scripts'         => array( 'advanced-scripts/advanced-scripts.php' ),
			),
		),
		array(
			'feature'   => 'Data Tables',
			'd'         => 'Responsive tables rendered as frontend components.',
			'providers' => array(
				'TablePress'               => array( 'tablepress/tablepress.php' ),
				'wpDataTables'             => array( 'wpdatatables/wpdatatables.php' ),
				'Posts Table Pro'          => array( 'posts-table-pro/posts-table-pro.php' ),
			),
		),
		// v0.50.31 — Email delivery. Critical for headless: wp_mail() defaults
		// to PHP mail() which Cloudflare and most hosts block silently —
		// comment notifications + form submissions disappear into the void.
		array(
			'feature'   => 'Email delivery (SMTP)',
			'd'         => 'Reliable outbound email for comment notifications, password resets, and form submissions. Most hosts block PHP mail() by default.',
			'providers' => array(
				'FluentSMTP'   => array( 'fluent-smtp/fluent-smtp.php' ),
				'WP Mail SMTP' => array( 'wp-mail-smtp/wp_mail_smtp.php' ),
				'Easy WP SMTP' => array( 'easy-wp-smtp/easy-wp-smtp.php' ),
				'Post SMTP'    => array( 'post-smtp/postman-smtp.php' ),
			),
		),
		// v0.50.31 — Site backups. WP-side concern (Hatch's Astro frontend
		// is stateless + redeployable from git). Detection only — provider
		// handles backup scheduling, destinations, and restore.
		array(
			'feature'   => 'Site backups',
			'd'         => 'Scheduled database + uploads backups. Hatch frontend is stateless so this protects only your WordPress content + media library.',
			'providers' => array(
				'UpdraftPlus' => array( 'updraftplus/updraftplus.php' ),
				'BlogVault'   => array( 'blogvault-real-time-backup/blogvault.php' ),
				'BackWPup'    => array( 'backwpup/backwpup.php' ),
				'Duplicator'  => array( 'duplicator/duplicator.php' ),
			),
		),
		// v0.50.31 — Activity log. Compliance + forensics. Plugin Bridge
		// surfaces detection only; the plugin's UI is where logs are read.
		array(
			'feature'   => 'Activity log',
			'd'         => 'Records who did what in wp-admin (logins, post edits, settings changes). Required for SOC2 / GDPR / enterprise audit trails.',
			'providers' => array(
				'WP Activity Log' => array( 'wp-security-audit-log/wp-security-audit-log.php' ),
				'Simple History'  => array( 'simple-history/index.php' ),
				'Activity Log'    => array( 'aryo-activity-log/aryo-activity-log.php' ),
			),
		),
	);

	// v0.50.31 — Apply the extensibility filter so third-party plugins can
	// add categories or providers. See block-comment above for examples.
	$catalog = (array) apply_filters( 'hatch_plugin_bridge_catalog', $catalog );

	$out = array();
	foreach ( $catalog as $row ) {
		// Defensive: ignore malformed entries from third parties.
		if ( ! is_array( $row ) || empty( $row['feature'] ) || empty( $row['providers'] ) ) continue;
		$detected_name = '';
		foreach ( $row['providers'] as $name => $slugs ) {
			foreach ( (array) $slugs as $slug ) {
				if ( is_plugin_active( $slug ) ) {
					$detected_name = $name;
					break 2;
				}
			}
		}
		$out[] = array(
			'feature'      => $row['feature'],
			'providers'    => array_keys( $row['providers'] ),
			'detected'     => '' !== $detected_name,
			'providerName' => $detected_name,
			'd'            => $row['d'],
			// Back-compat: the React component already tolerates {n} legacy shape
			// via LEGACY_CATEGORY; we ship both shapes to avoid breaking older
			// builds during the deploy window.
			'n'            => $detected_name,
		);
	}
	return $out;
}

/**
 * Read-only status snapshot for the Status tab. Mirrors the categorised
 * "every flag, cred, cron at one glance" view from the design bundle.
 *
 * @return array{sections: array<int, array{label: string, rows: array}>}
 */
/**
 * Performance state for React — reads the canonical `hatch_perf` struct that
 * `hatch_handle_save_perf` writes to. So existing saved values appear and the
 * enforcement code (which reads `hatch_perf[...]`) stays in sync.
 *
 * @return array
 */
function hatch_react_perf_state(): array {
	$perf = (array) get_option( 'hatch_perf', array() );
	return array(
		'image_proxy'        => (bool) get_option( 'hatch_image_proxy_url', '' ),
		'image_proxy_url'    => (string) get_option( 'hatch_image_proxy_url', '' ),
		'image_service'      => (string) ( $perf['image_service']      ?? 'sharp' ),
		'image_layout'       => (string) ( $perf['image_layout']       ?? 'constrained' ),
		'prefetch_enabled'   => (bool)   ( $perf['prefetch_enabled']   ?? false ),
		'prefetch'           => (string) ( $perf['prefetch_strategy']  ?? 'hover' ),
		'output'             => (string) ( $perf['output_mode']        ?? 'server' ),
		'inline_stylesheets' => (string) ( $perf['inline_stylesheets'] ?? 'auto' ),
		'compress_html'      => (bool)   ( $perf['compress_html']      ?? false ),
		'partytown'          => (bool)   ( $perf['partytown_enabled']  ?? false ),
		'telemetry'          => (bool)   ( $perf['telemetry']          ?? false ),
	);
}

/**
 * Security state for React — reads the canonical option keys that
 * `hatch_handle_save_security` writes (hatch_security_*, hatch_login_*,
 * hatch_brute_force_*, hatch_uninstall_remove_all_data).
 *
 * @return array
 */
function hatch_react_security_state(): array {
	return array(
		'block_rest'           => (bool) get_option( 'hatch_security_harden_rest', false ),
		'disable_xmlrpc'       => (bool) get_option( 'hatch_security_disable_xmlrpc', false ),
		'block_enum'           => (bool) get_option( 'hatch_security_block_user_enum', false ),
		'noindex_cms'          => (bool) get_option( 'hatch_security_force_noindex', false ),
		'role_guard'           => (bool) get_option( 'hatch_login_role_guard_enabled', false ),
		'allowed_roles'        => (string) get_option( 'hatch_login_allowed_roles', 'administrator, editor, author' ),
		'login_slug'           => (string) get_option( 'hatch_login_slug', '' ),
		'login_redirect'       => (string) get_option( 'hatch_login_redirect_slug', '404' ),
		'login_redirect_custom'=> (string) get_option( 'hatch_login_redirect_custom', '' ),
		'bf_threshold'         => (int) get_option( 'hatch_brute_force_limit', 5 ),
		'bf_window'            => (int) get_option( 'hatch_brute_force_window', 60 ),
		'remove_on_uninstall'  => (bool) get_option( 'hatch_uninstall_remove_all_data', false ),
		// v0.50.11 — Fortress mode toggles (Hatch_Hardening class).
		'disallow_file_edit'   => (bool) get_option( 'hatch_security_disallow_file_edit', false ),
		'send_headers'         => (bool) get_option( 'hatch_security_send_headers', false ),
		// v0.50.31 — Per-surface Turnstile gates.
		'turnstile_login'      => (bool) get_option( 'hatch_security_turnstile_login', false ),
		'turnstile_comments'   => (bool) get_option( 'hatch_security_turnstile_comments', false ),
		'enforce_2fa'          => (bool) get_option( 'hatch_security_enforce_2fa', false ),
		'twofa_provider'       => class_exists( 'Hatch_Hardening' ) ? (string) Hatch_Hardening::detect_2fa_provider() : '',
		'twofa_settings_url'   => class_exists( 'Hatch_Hardening' ) ? (string) Hatch_Hardening::get_2fa_settings_url() : '',
		'twofa_user_configured'=> class_exists( 'Hatch_Hardening' ) ? (bool) Hatch_Hardening::user_has_2fa_configured() : false,
	);
}

/**
 * Setup wizard state for React. Includes nonces for each form action, the
 * generated `.env` block for VPS users, the webhook secret + Application
 * Password (lazily generated), and pre-built OAuth URLs for CF / Vercel.
 *
 * @return array
 */
function hatch_react_setup_state(): array {
	$user     = wp_get_current_user();
	$secret   = (string) get_option( 'hatch_webhook_secret', '' );
	if ( '' === $secret ) {
		$secret = wp_generate_password( 48, false );
		update_option( 'hatch_webhook_secret', $secret, false );
	}
	$fresh = class_exists( 'Hatch_App_Password_Helper' ) ? Hatch_App_Password_Helper::pop_fresh_password() : null;
	$pw    = ( $fresh && ! empty( $fresh['password'] ) ) ? (string) $fresh['password'] : '';
	$wp_url_full = untrailingslashit( home_url() ) . '/wp-json/wp/v2';

	$env_block  = 'WP_API_URL=' . $wp_url_full . "\n";
	$env_block .= 'WP_API_USER=' . $user->user_login . "\n";
	$env_block .= 'WP_API_PASS=' . ( '' !== $pw ? $pw : '<get-from-Hatch-Connection-tab>' ) . "\n";
	$env_block .= 'HATCH_WEBHOOK_SECRET=' . $secret . "\n";

	// VPS install script URL — filterable per old v0.50.10 contract so
	// self-hosters can override at the PHP layer. React reads this from
	// boot state, never hardcodes.
	$vps_install_url = (string) apply_filters(
		'hatch/vps_install_script_url',
		'https://raw.githubusercontent.com/adityaarsharma/hatch/main/scripts/install-vps.sh'
	);

	// Single copy-paste one-liner that mirrors old setup-wizard.php lines 500-505.
	// Passes credentials as script flags so the agent writes .env server-side.
	$vps_one_liner =
		'curl -fsSL ' . $vps_install_url . ' | sudo bash -s --' .
		' --wp-url "' . untrailingslashit( home_url() ) . '"' .
		' --wp-user "' . $user->user_login . '"' .
		' --wp-pass "' . ( '' !== $pw ? $pw : '<get-from-connection-tab>' ) . '"' .
		' --webhook-secret "' . $secret . '"';

	return array(
		'companionTheme' => class_exists( 'Hatch_Companion_Theme_Installer' ) ? array(
			'installed' => Hatch_Companion_Theme_Installer::is_installed(),
			'active'    => Hatch_Companion_Theme_Installer::is_active(),
			'slug'      => 'hatch-companion',
		) : array( 'installed' => false, 'active' => false, 'slug' => 'hatch-companion' ),
		// v0.50.20 — Only nonces that are ACTUALLY consumed by a React UI
		// element. Removed 6 orphans: skip_setup + complete_setup (duplicated
		// by the pre-built skipUrl/completeUrl below), and test_webhook,
		// mark_deployed, probe_turnstile, clear_token (no React surface, no
		// active PHP handler).
		'nonces' => array(
			'setup_step2'           => wp_create_nonce( 'hatch_setup_step2' ),
			'save_manual_target'    => wp_create_nonce( 'hatch_save_manual_target' ),
			'start_deploy'          => wp_create_nonce( 'hatch_start_deploy' ),
			'generate_app_password' => wp_create_nonce( 'hatch_generate_app_password' ),
			'rotate_app_pwds'       => wp_create_nonce( 'hatch_rotate_app_pwds' ),
			'save_frontend_url'     => wp_create_nonce( 'hatch_save_frontend_url' ),
			'probe_heartbeat'       => wp_create_nonce( 'hatch_probe_heartbeat' ),
			'install_companion'     => wp_create_nonce( 'hatch_install_companion_theme' ),
		),
		'wpUser'         => $user->user_login,
		'wpApiUrl'       => $wp_url_full,
		'webhookSecret'  => $secret,
		'appPassword'    => $pw,           // empty unless freshly generated this request
		'envBlock'       => $env_block,
		'vpsInstallUrl'  => $vps_install_url,
		'vpsOneLiner'    => $vps_one_liner,
		'vpsDocsUrl'     => 'https://github.com/adityaarsharma/hatch/blob/main/docs/hosting/vps-runcloud.md',
		'skipUrl'        => wp_nonce_url( admin_url( 'admin.php?page=hatch-setup&hatch_skip_setup=1' ), 'hatch_skip_setup' ),
		'completeUrl'    => wp_nonce_url( admin_url( 'admin.php?page=hatch-setup&hatch_complete_setup=1' ), 'hatch_complete_setup' ),
		'startDeployUrl' => wp_nonce_url( add_query_arg( 'action', 'hatch_start_deploy', admin_url( 'admin-post.php' ) ), 'hatch_start_deploy' ),
		'cfTokenUrl'     => 'https://dash.cloudflare.com/profile/api-tokens?' . http_build_query( array(
			'permissionGroupKeys' => wp_json_encode( array(
				array( 'key' => 'e086da7e2179491d91ee5f35b3ca210a' ),
				array( 'key' => 'c8fed203ed3043cba015a93ad1616f1f' ),
			) ),
			'name' => 'Hatch. 1-click deploy',
		) ),
		'vercelTokenUrl' => 'https://vercel.com/account/tokens',
	);
}

/**
 * REST: register POST /hatch/v1/options. The React admin POSTs a flat object
 * of dot-path keys → values. Each path is dispatched to the right WP option
 * (or Hatch_Features class method) and persisted atomically.
 *
 * @return void
 */
function hatch_register_react_options_route(): void {
	register_rest_route(
		HATCH_REST_NAMESPACE,
		'/options',
		array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => 'hatch_react_options_save',
			'permission_callback' => static function () {
				return current_user_can( 'manage_options' );
			},
		)
	);
}

/**
 * Batch save handler. Routes each dot-path to its canonical option key (the
 * same key the existing admin-post handlers + enforcement code already use).
 *
 * @param WP_REST_Request $req
 * @return WP_REST_Response
 */
function hatch_react_options_save( WP_REST_Request $req ): WP_REST_Response {
	$body = $req->get_json_params();
	if ( ! is_array( $body ) ) {
		$body = $req->get_params();
	}
	$applied = array();

	// Stand-alone boolean options.
	$bool_options = array(
		'performance.image_proxy'      => 'hatch_image_proxy_url',
		'security.block_rest'          => 'hatch_security_harden_rest',
		'security.disable_xmlrpc'      => 'hatch_security_disable_xmlrpc',
		'security.block_enum'          => 'hatch_security_block_user_enum',
		'security.noindex_cms'         => 'hatch_security_force_noindex',
		'security.role_guard'          => 'hatch_login_role_guard_enabled',
		'security.remove_on_uninstall' => 'hatch_uninstall_remove_all_data',
		// Fortress mode (Hatch_Hardening).
		'security.disallow_file_edit'  => 'hatch_security_disallow_file_edit',
		'security.send_headers'        => 'hatch_security_send_headers',
		'security.enforce_2fa'         => 'hatch_security_enforce_2fa',
		// v0.50.31 — Per-surface Turnstile gates. Keys live in
		// hatch_integrations.turnstile (Content tab); these toggles say
		// WHERE to apply the gate. Gated server-side by Hatch_Turnstile_WP.
		'security.turnstile_login'     => 'hatch_security_turnstile_login',
		'security.turnstile_comments'  => 'hatch_security_turnstile_comments',
	);
	$str_options = array(
		'security.login_slug'            => 'hatch_login_slug',
		'security.login_redirect'        => 'hatch_login_redirect_slug',
		'security.login_redirect_custom' => 'hatch_login_redirect_custom',
		'security.allowed_roles'         => 'hatch_login_allowed_roles',
		'design.font_heading'            => 'hatch_design_font_heading',
		'design.font_body'               => 'hatch_design_font_body',
		'design.font_mono'               => 'hatch_design_font_mono',
		'design.mode'                    => 'hatch_design_mode',
	);
	$int_options = array(
		'security.bf_threshold' => 'hatch_brute_force_limit',
		'security.bf_window'    => 'hatch_brute_force_window',
	);
	// Performance keys merge into a single `hatch_perf` struct (canonical).
	// telemetry routes here (not its own option) so Hatch_Features::map() reads
	// it from the right key — previously routed to hatch_telemetry which the
	// frontend never read (silent hollow toggle, fixed in v0.1.0).
	$perf_keys = array(
		'performance.image_service'      => 'image_service',
		'performance.image_layout'       => 'image_layout',
		'performance.prefetch_enabled'   => 'prefetch_enabled',
		'performance.prefetch'           => 'prefetch_strategy',
		'performance.output'             => 'output_mode',
		'performance.inline_stylesheets' => 'inline_stylesheets',
		'performance.compress_html'      => 'compress_html',
		'performance.partytown'          => 'partytown_enabled',
		'performance.telemetry'          => 'telemetry',
	);
	$nested_groups = array(
		'design.brand.'    => 'hatch_design_brand',
		'design.layout.'   => 'hatch_design_layout',
		'voice.'           => 'hatch_design_voice',
		'identity.'        => 'hatch_design_identity',
		'templates.'       => 'hatch_design_templates',
		'borders.'         => 'hatch_design_borders',
		'breakpoints.'     => 'hatch_design_breakpoints',
		'content.'         => 'hatch_content_flags',
		'hatchBlocks.'     => 'hatch_blocks_enabled',
		// v0.50.15 — Aesthetic groups for the Astro frontend. Each one is its
		// own wp_options row; the dispatcher merges sub-keys non-destructively.
		'share.'           => 'hatch_design_share',
		'header.'          => 'hatch_design_header',
		'reading.'         => 'hatch_design_reading',
		'images.'          => 'hatch_design_images',
		'animation.'       => 'hatch_design_animation',
		'blog_index.'      => 'hatch_design_blog_index',
		'post_navigation.' => 'hatch_design_post_navigation',
		// v0.50.13 — DO NOT add 'turnstile.' here. Turnstile flows through
		// `Hatch_Integrations` (option key `hatch_integrations`) because that's
		// what `verify_turnstile()` and the frontend payload both read. The
		// dedicated handler below routes turnstile.* paths to save_group().
	);
	$top_bool = array(
		'show_credit' => 'hatch_show_credit',
	);

	foreach ( $body as $path => $value ) {
		$path = (string) $path;

		// Feature flags → merge into Hatch_Features.
		if ( 0 === strpos( $path, 'features.' ) && class_exists( 'Hatch_Features' ) ) {
			$slug = substr( $path, 9 );
			Hatch_Features::update( array_merge( Hatch_Features::get_all(), array( $slug => (bool) $value ) ) );
			$applied[ $path ] = (bool) $value;
			continue;
		}

		// v0.50.16 — design.md raw markdown upload/paste. Parses via
		// Hatch_Design_Loader::save() which writes both `hatch_design_md`
		// (raw source) and `hatch_design_parsed` (validated token tree).
		// Errors come back in `applied` so the UI can surface parse problems.
		// v0.50.20 — sets a request-scoped flag so the post-save regenerator
		// skips re-writing `hatch_design_md` (which would clobber the user's
		// uploaded source with auto-built YAML).
		if ( 'design.md' === $path && class_exists( 'Hatch_Design_Loader' ) ) {
			$result = Hatch_Design_Loader::save( (string) $value );
			$applied[ $path ] = array(
				'ok'     => (bool) $result['ok'],
				'errors' => isset( $result['errors'] ) ? $result['errors'] : array(),
			);
			$GLOBALS['hatch_design_md_uploaded_this_request'] = true;
			continue;
		}

		// Theme picker. Accepts both 'theme' (legacy) and 'design.theme' (new).
		if ( ( 'theme' === $path || 'design.theme' === $path ) && class_exists( 'Hatch_Features' ) ) {
			$slug = sanitize_key( (string) $value );
			Hatch_Features::set_theme( $slug );
			$applied[ $path ] = $slug;
			continue;
		}

		// Code snippets (GTM only at the moment).
		if ( 0 === strpos( $path, 'snippets.' ) ) {
			$key      = substr( $path, 9 );
			$snippets = (array) get_option( 'hatch_code_snippets', array() );
			$snippets[ $key ] = sanitize_text_field( (string) $value );
			update_option( 'hatch_code_snippets', $snippets, false );
			$applied[ $path ] = $snippets[ $key ];
			continue;
		}

		// Image proxy URL override — string write to the same option the
		// `performance.image_proxy` boolean controls. Lets advanced users point
		// at a separate image-optimisation domain.
		if ( 'performance.image_proxy_url' === $path ) {
			update_option( 'hatch_image_proxy_url', esc_url_raw( (string) $value ), false );
			$applied[ $path ] = (string) $value;
			continue;
		}

		// Boolean WP options.
		if ( isset( $bool_options[ $path ] ) ) {
			$opt = $bool_options[ $path ];
			if ( 'hatch_image_proxy_url' === $opt ) {
				if ( $value ) {
					update_option( $opt, untrailingslashit( (string) get_option( 'hatch_frontend_url', '' ) ), false );
				} else {
					update_option( $opt, '', false );
				}
			} else {
				update_option( $opt, (bool) $value, false );
			}
			$applied[ $path ] = (bool) $value;
			continue;
		}

		// String WP options.
		if ( isset( $str_options[ $path ] ) ) {
			update_option( $str_options[ $path ], sanitize_text_field( (string) $value ), false );
			$applied[ $path ] = sanitize_text_field( (string) $value );
			continue;
		}

		// Integer WP options.
		if ( isset( $int_options[ $path ] ) ) {
			update_option( $int_options[ $path ], (int) $value, false );
			$applied[ $path ] = (int) $value;
			continue;
		}

		// Performance struct.
		if ( isset( $perf_keys[ $path ] ) ) {
			$perf = (array) get_option( 'hatch_perf', array() );
			$sub  = $perf_keys[ $path ];
			if ( in_array( $sub, array( 'prefetch_enabled', 'compress_html', 'partytown_enabled' ), true ) ) {
				$perf[ $sub ] = (bool) $value ? 1 : 0;
			} elseif ( 'assets_prefix' === $sub ) {
				$perf[ $sub ] = esc_url_raw( (string) $value );
			} else {
				$perf[ $sub ] = sanitize_text_field( (string) $value );
			}
			update_option( 'hatch_perf', $perf, false );
			$applied[ $path ] = $perf[ $sub ];
			continue;
		}

		// Top-level booleans.
		if ( isset( $top_bool[ $path ] ) ) {
			update_option( $top_bool[ $path ], (bool) $value, false );
			$applied[ $path ] = (bool) $value;
			continue;
		}

		// v0.50.13 — Turnstile keys and sub-toggles route through
		// `Hatch_Integrations` (option `hatch_integrations`) because that's
		// what verify_turnstile() and the public /features payload both read.
		// Writing to a new key (`hatch_turnstile`) made saves a no-op.
		// `enabled` flips on automatically when keys + any sub-toggle present.
		if ( 0 === strpos( $path, 'turnstile.' ) && class_exists( 'Hatch_Integrations' ) ) {
			$sub  = substr( $path, 10 );
			$all  = Hatch_Integrations::get_all();
			$ts   = (array) ( $all['turnstile'] ?? array() );
			if ( in_array( $sub, array( 'site_key', 'secret_key' ), true ) ) {
				$ts[ $sub ] = sanitize_text_field( (string) $value );
			}
			// Auto-enable when both keys present, regardless of UI surface.
			$ts['enabled'] = ! empty( $ts['site_key'] ) && ! empty( $ts['secret_key'] );
			Hatch_Integrations::save_group( 'turnstile', $ts );
			$applied[ $path ] = $ts[ $sub ] ?? null;
			continue;
		}
		// v0.50.31 — Comments master toggle mirrors into Hatch_Features so the
		// existing `hasFeature(features, 'comments')` gate (used by
		// blog/[slug].astro and per-theme Single.astro) actually changes
		// when the user flips the Content tab switch. Was a zombie before.
		// v0.50.31 — Comments site-wide kill switch via Core Sync.
		// Path: `core.default_comment_status` with value = 'open' | 'closed'.
		if ( 'core.default_comment_status' === $path ) {
			$v = ( 'closed' === (string) $value ) ? 'closed' : 'open';
			update_option( 'default_comment_status', $v );
			$applied[ $path ] = $v;
			continue;
		}
		// v0.50.31 — Menu assignment via Core Sync inline picker.
		// Path: `core.menu_location.<slug>` with value = menu_id (int).
		if ( 0 === strpos( $path, 'core.menu_location.' ) ) {
			$loc  = sanitize_key( substr( $path, strlen( 'core.menu_location.' ) ) );
			$mid  = (int) $value;
			$locs = (array) get_theme_mod( 'nav_menu_locations', array() );
			if ( $mid > 0 ) {
				$locs[ $loc ] = $mid;
			} else {
				unset( $locs[ $loc ] );
			}
			set_theme_mod( 'nav_menu_locations', $locs );
			$applied[ $path ] = $mid;
			continue;
		}
		if ( 'content.comments_enabled' === $path && class_exists( 'Hatch_Features' ) ) {
			Hatch_Features::update( array_merge(
				Hatch_Features::get_all(),
				array( 'comments' => (bool) $value )
			) );
			// Fall through to also save the UI-state copy in hatch_content_flags.
		}
		// v0.50.14 — comments_turnstile sub-toggle mirrors into
		// hatch_integrations.comments.turnstile so verify_turnstile() sees it.
		// Forms removed entirely (no Hatch-owned form bridge anymore).
		if ( 'content.comments_turnstile' === $path && class_exists( 'Hatch_Integrations' ) ) {
			$all = Hatch_Integrations::get_all();
			$c   = (array) ( $all['comments'] ?? array() );
			$c['turnstile'] = (bool) $value;
			Hatch_Integrations::save_group( 'comments', $c );
			// Fall through so the UI-state copy in hatch_content_flags also persists.
		}

		// Nested groups (prefix match).
		foreach ( $nested_groups as $prefix => $opt_key ) {
			if ( 0 === strpos( $path, $prefix ) ) {
				$sub = substr( $path, strlen( $prefix ) );
				$store = (array) get_option( $opt_key, array() );
				if ( is_bool( $value ) ) {
					$store[ $sub ] = (bool) $value;
				} elseif ( is_int( $value ) || is_float( $value ) ) {
					$store[ $sub ] = $value + 0;
				} else {
					$store[ $sub ] = sanitize_text_field( (string) $value );
				}
				update_option( $opt_key, $store, false );
				$applied[ $path ] = $store[ $sub ];
				continue 2;
			}
		}
	}

	// v0.50.11 — CRITICAL: every React save writes to scattered new option keys
	// (hatch_design_brand, hatch_design_mode, hatch_design_voice, etc.) but the
	// Astro frontend reads from the consolidated `hatch_design_parsed` + the
	// YAML `hatch_design_md`. Without this regeneration step the dashboard
	// shows the save but the frontend never picks it up.
	$touched_design = false;
	$touched_blocks = false;
	foreach ( array_keys( $applied ) as $p ) {
		if ( 0 === strpos( $p, 'design.' ) || 0 === strpos( $p, 'voice.' ) || 0 === strpos( $p, 'templates.' )
		    || 0 === strpos( $p, 'borders.' ) || 0 === strpos( $p, 'breakpoints.' ) || 0 === strpos( $p, 'identity.' )
		    || 0 === strpos( $p, 'share.' )       || 0 === strpos( $p, 'header.' )
		    || 0 === strpos( $p, 'reading.' )     || 0 === strpos( $p, 'images.' )
		    || 0 === strpos( $p, 'animation.' )   || 0 === strpos( $p, 'blog_index.' )
		    || 0 === strpos( $p, 'post_navigation.' ) || 'theme' === $p ) {
			$touched_design = true;
		}
		if ( 0 === strpos( $p, 'hatchBlocks.' ) ) {
			$touched_blocks = true;
		}
	}
	// v0.50.20 — Skip the regenerator entirely when design.md was uploaded
	// in this same request. `Hatch_Design_Loader::save()` already wrote the
	// authoritative `hatch_design_parsed` + `hatch_design_md`; running the
	// regenerator on top would overwrite both with merged-defaults + scattered
	// options, discarding the user's MD-defined brand / layout values.
	if ( $touched_design && empty( $GLOBALS['hatch_design_md_uploaded_this_request'] ) ) {
		hatch_regenerate_design_artifacts();
	}
	if ( $touched_blocks ) {
		hatch_regenerate_blocks_state();
	}

	if ( ! empty( $applied ) && class_exists( 'Hatch_Revalidate' ) ) {
		Hatch_Revalidate::trigger( 'react-admin-save' );
	}

	return new WP_REST_Response(
		array( 'ok' => true, 'applied' => $applied ),
		200
	);
}

/**
 * Rebuild `hatch_design_parsed` + `hatch_design_md` from the scattered
 * individual option keys the React admin writes. This is the artifact the
 * Astro frontend reads on every request, so changes to brand colors / mode /
 * fonts / layout / templates must propagate here to actually take effect.
 *
 * @return void
 */
function hatch_regenerate_design_artifacts(): void {
	$defaults = class_exists( 'Hatch_Design_Loader' ) ? Hatch_Design_Loader::defaults() : array();
	if ( empty( $defaults ) ) {
		return;
	}

	$brand     = (array) get_option( 'hatch_design_brand',     array() );
	$layout    = (array) get_option( 'hatch_design_layout',    array() );
	$voice     = (array) get_option( 'hatch_design_voice',     array() );
	$templates = (array) get_option( 'hatch_design_templates', array() );

	// Top-level scalars that React writes outside the nested groups.
	$brand['font_heading'] = (string) get_option( 'hatch_design_font_heading', 'Inter' );
	$brand['font_body']    = (string) get_option( 'hatch_design_font_body',    'Inter' );
	$brand['font_mono']    = (string) get_option( 'hatch_design_font_mono',    'JetBrains Mono' );
	$brand['mode']         = (string) get_option( 'hatch_design_mode',         'auto' );

	$parsed = array(
		'brand'     => array_merge( $defaults['brand'],     $brand     ),
		'layout'    => array_merge( $defaults['layout'],    $layout    ),
		'voice'     => array_merge( $defaults['voice'],     $voice     ),
		'templates' => array_merge( $defaults['templates'], $templates ),
		'body'      => isset( $defaults['body'] ) ? $defaults['body'] : '',
	);
	update_option( 'hatch_design_parsed', $parsed, false );

	// v0.50.20 — Regenerate the YAML frontmatter that some Astro starters read
	// directly. SKIPPED when the user just uploaded their own design.md —
	// `Hatch_Design_Loader::save()` already wrote `hatch_design_md` with the
	// user's source; clobbering it here would discard whatever they uploaded
	// (comments, ordering, body content beyond the frontmatter).
	$user_md_just_saved = ! empty( $GLOBALS['hatch_design_md_uploaded_this_request'] );
	if ( ! $user_md_just_saved ) {
		$yaml = "---\n";
		foreach ( array( 'brand', 'layout', 'voice', 'templates' ) as $section ) {
			$yaml .= $section . ":\n";
			foreach ( $parsed[ $section ] as $k => $v ) {
				$val = is_string( $v ) ? '"' . addslashes( $v ) . '"' : ( is_bool( $v ) ? ( $v ? 'true' : 'false' ) : $v );
				$yaml .= "  {$k}: {$val}\n";
			}
		}
		$yaml .= "---\n";
		update_option( 'hatch_design_md', $yaml, false );
	}
}

/**
 * Mirror the React `hatch_blocks_enabled` writes into the legacy
 * `hatch_blocks_state` shape (prefixed slugs `hatch/section` etc.) that the
 * Astro frontend block resolver reads.
 *
 * @return void
 */
function hatch_regenerate_blocks_state(): void {
	$enabled = (array) get_option( 'hatch_blocks_enabled', array() );
	$state   = array();
	foreach ( $enabled as $slug => $on ) {
		$state[ 'hatch/' . sanitize_key( (string) $slug ) ] = (bool) $on;
	}
	update_option( 'hatch_blocks_state', $state, false );
}

function hatch_react_status_snapshot(): array {
	$hosting_model = (string) get_option( 'hatch_hosting_model', 'vps' );
	$frontend_url  = (string) get_option( 'hatch_frontend_url', '' );
	$img_proxy     = (string) get_option( 'hatch_image_proxy_url', '' );

	$sections = array(
		array(
			'label' => __( 'Frontline Live Site', 'hatch' ),
			'rows'  => array(
				array( 'label' => 'hatch_frontend_url',        'value' => $frontend_url ?: __( 'not set', 'hatch' ), 'type' => $frontend_url ? 'text' : 'off' ),
				array( 'label' => 'hatch_image_proxy_url',     'value' => $img_proxy ?: __( 'not set', 'hatch' ),    'type' => $img_proxy ? 'text' : 'off' ),
				array( 'label' => 'hatch_hosting_model',       'value' => $hosting_model, 'type' => 'text' ),
			),
		),
		array(
			'label' => __( 'Authentication', 'hatch' ),
			'rows'  => array(
				array( 'label' => 'Webhook secret set', 'value' => 'on', 'type' => get_option( 'hatch_revalidate_secret' ) ? 'on' : 'off' ),
			),
		),
		array(
			// v0.50.13 — read the actual option keys the React Security tab
			// writes to. The old `hatch_block_rest` / `hatch_disable_xmlrpc` /
			// `hatch_block_enum` / `hatch_noindex_cms` were legacy keys from
			// before the rebuild; nothing writes to them anymore, so the
			// Status tab badges were stuck at "off" forever.
			'label' => __( 'Security', 'hatch' ),
			'rows'  => array(
				array( 'label' => 'REST API hardening', 'type' => get_option( 'hatch_security_harden_rest' ) ? 'on' : 'off' ),
				array( 'label' => 'XML-RPC disabled',   'type' => get_option( 'hatch_security_disable_xmlrpc' ) ? 'on' : 'off' ),
				array( 'label' => 'User enum blocked',  'type' => get_option( 'hatch_security_block_user_enum' ) ? 'on' : 'off' ),
				array( 'label' => 'Site noindex',       'type' => get_option( 'hatch_security_force_noindex' ) ? 'on' : 'off' ),
			),
		),
		array(
			'label' => __( 'Plugin', 'hatch' ),
			'rows'  => array(
				array( 'label' => 'Hatch version', 'value' => HATCH_VERSION, 'type' => 'text' ),
				array( 'label' => 'WordPress',     'value' => get_bloginfo( 'version' ), 'type' => 'text' ),
				array( 'label' => 'PHP',           'value' => PHP_VERSION,  'type' => 'text' ),
			),
		),
	);

	// v0.50.31 — Bridge health summary. How many capability providers are
	// actually detected? Pulls from the Plugin Bridge catalog.
	$bridge       = hatch_react_plugin_bridge();
	$detected     = array_filter( $bridge, fn( $b ) => ! empty( $b['detected'] ) );
	$sections[] = array(
		'label' => __( 'Bridges', 'hatch' ),
		'rows'  => array(
			array(
				'label' => 'Plugin providers detected',
				'value' => count( $detected ) . ' / ' . count( $bridge ),
				'type'  => count( $detected ) > 0 ? 'num' : 'warn',
			),
			array(
				'label' => 'Companion theme active',
				'value' => 'on',
				'type'  => ( get_stylesheet() === 'hatch-companion' || wp_get_theme()->get( 'TextDomain' ) === 'hatch-companion' ) ? 'on' : 'off',
			),
		),
	);

	// v0.50.31 — Sync health. Last revalidation timestamp + cron status.
	$last_revalidate = (int) get_option( 'hatch_last_revalidate_at', 0 );
	$cron_disabled   = defined( 'DISABLE_WP_CRON' ) && DISABLE_WP_CRON;
	$sections[] = array(
		'label' => __( 'Sync', 'hatch' ),
		'rows'  => array(
			array(
				'label' => 'Last frontend revalidation',
				'value' => $last_revalidate ? human_time_diff( $last_revalidate ) . ' ago' : 'never',
				'type'  => $last_revalidate ? 'num' : 'warn',
			),
			array(
				'label' => 'WP cron',
				'value' => $cron_disabled ? 'disabled (use system cron)' : 'wp-cron.php',
				'type'  => $cron_disabled ? 'warn' : 'text',
			),
			array(
				'label' => 'Auto-revalidate on publish',
				'type'  => class_exists( 'Hatch_Revalidate' ) ? 'on' : 'off',
			),
		),
	);

	return array( 'sections' => $sections );
}

/**
 * Register admin menu.
 *
 * @return void
 */
function hatch_register_admin_menu(): void {
	// v0.49. actual 🐣 emoji as the menu icon. WP admin sidebar scales into a 20px box;
	// font-size 17 + central baseline keeps it crisp without breaking the active-state highlight.
	$icon_svg = 'data:image/svg+xml;base64,' . base64_encode(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><text x="50%" y="50%" font-size="17" text-anchor="middle" dominant-baseline="central">🐣</text></svg>'
	);
	add_menu_page(
		__( 'Hatch. Headless WordPress', 'hatch' ),
		'Hatch',
		'manage_options',
		'hatch',
		'hatch_render_admin_page',
		$icon_svg,
		3 // right after Dashboard (position 2)
	);
}

/**
 * Register settings with sanitization callbacks.
 *
 * @return void
 */
function hatch_register_settings(): void {
	register_setting( 'hatch_settings', 'hatch_revalidate_endpoint', array( 'type' => 'string', 'sanitize_callback' => 'esc_url_raw' ) );
	register_setting( 'hatch_settings', 'hatch_revalidate_post_types', array( 'type' => 'string', 'sanitize_callback' => 'hatch_sanitize_post_type_csv' ) );
	register_setting( 'hatch_settings', 'hatch_image_proxy_url', array( 'type' => 'string', 'sanitize_callback' => 'esc_url_raw' ) );

	// v0.47. menu picker (Connector tab → Menus card).
	register_setting( 'hatch_settings', 'hatch_menu_primary_id', array( 'type' => 'integer', 'sanitize_callback' => 'absint' ) );
	register_setting( 'hatch_settings', 'hatch_menu_footer_id',  array( 'type' => 'integer', 'sanitize_callback' => 'absint' ) );

	// Security toggles.
	register_setting( 'hatch_settings', 'hatch_security_harden_rest', array( 'type' => 'boolean', 'sanitize_callback' => 'rest_sanitize_boolean' ) );
	register_setting( 'hatch_settings', 'hatch_security_disable_xmlrpc', array( 'type' => 'boolean', 'sanitize_callback' => 'rest_sanitize_boolean' ) );
	register_setting( 'hatch_settings', 'hatch_security_block_user_enum', array( 'type' => 'boolean', 'sanitize_callback' => 'rest_sanitize_boolean' ) );
	register_setting( 'hatch_settings', 'hatch_security_force_noindex', array( 'type' => 'boolean', 'sanitize_callback' => 'rest_sanitize_boolean' ) );
	// v0.49.5. uninstall lifecycle opt-in (default 0 = preserve everything).
	register_setting( 'hatch_settings', 'hatch_uninstall_remove_all_data', array( 'type' => 'boolean', 'sanitize_callback' => 'rest_sanitize_boolean' ) );

	// Login hardening.
	register_setting( 'hatch_settings', 'hatch_login_slug', array( 'type' => 'string', 'sanitize_callback' => 'sanitize_title_with_dashes' ) );
	register_setting( 'hatch_settings', 'hatch_login_redirect_slug', array( 'type' => 'string', 'sanitize_callback' => 'sanitize_title_with_dashes' ) );
	register_setting( 'hatch_settings', 'hatch_login_role_guard_enabled', array( 'type' => 'boolean', 'sanitize_callback' => 'rest_sanitize_boolean' ) );
	register_setting( 'hatch_settings', 'hatch_login_allowed_roles', array( 'type' => 'string', 'sanitize_callback' => 'hatch_sanitize_roles_csv' ) );
	register_setting( 'hatch_settings', 'hatch_brute_force_limit', array( 'type' => 'integer', 'sanitize_callback' => 'hatch_sanitize_bf_limit' ) );
	register_setting( 'hatch_settings', 'hatch_brute_force_window', array( 'type' => 'integer', 'sanitize_callback' => 'hatch_sanitize_bf_window' ) );
}

/**
 * Human-readable label for a hosting model slug.
 *
 * @param string $model Slug.
 * @return string
 */
function hatch_host_label( string $model ): string {
	switch ( $model ) {
		case 'cloudflare-pages': return __( 'Cloudflare Pages', 'hatch' );
		case 'vercel':           return __( 'Vercel', 'hatch' );
		case 'vps':              return __( 'Your VPS', 'hatch' );
		default:                 return __( 'Unknown', 'hatch' );
	}
}

function hatch_sanitize_post_type_csv( $value ): string {
	if ( ! is_string( $value ) ) return 'post,page';
	$parts = array_filter( array_map( 'sanitize_key', array_map( 'trim', explode( ',', $value ) ) ) );
	return empty( $parts ) ? 'post,page' : implode( ',', $parts );
}
function hatch_sanitize_roles_csv( $value ): string {
	$default = 'administrator,editor,author';
	if ( ! is_string( $value ) ) return $default;
	$parts = array_filter( array_map( 'sanitize_key', array_map( 'trim', explode( ',', $value ) ) ) );
	if ( empty( $parts ) ) return $default;
	if ( ! in_array( 'administrator', $parts, true ) ) $parts[] = 'administrator';
	return implode( ',', array_unique( $parts ) );
}
function hatch_sanitize_bf_limit( $value ): int {
	$v = (int) $value;
	if ( $v < 3 )  return 5;
	if ( $v > 20 ) return 20;
	return $v;
}
function hatch_sanitize_bf_window( $value ): int {
	$v = (int) $value;
	if ( $v < 5 )   return 30;
	if ( $v > 240 ) return 240;
	return $v;
}

function hatch_get_current_tab(): string {
	// v3 slugs + retained back-compat for old slugs (re-mapped to v3 homes
	// inside hatch_render_admin_page()'s $tab_aliases lookup).
	$allowed = array( 'connector', 'design', 'content', 'performance', 'security', 'status', 'features', 'integrations', 'blocks' );
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$tab = isset( $_GET['tab'] ) ? sanitize_key( (string) wp_unslash( $_GET['tab'] ) ) : 'connector';
	return in_array( $tab, $allowed, true ) ? $tab : 'connector';
}

function hatch_handle_save_frontend_url(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'hatch_save_frontend_url' );
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- nonce checked above.
	$raw = isset( $_POST['hatch_frontend_url'] ) ? (string) wp_unslash( $_POST['hatch_frontend_url'] ) : '';
	$url = esc_url_raw( trim( $raw ) );
	if ( '' === $url || ! filter_var( $url, FILTER_VALIDATE_URL ) ) {
		wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=connector&hatch_test=urlbad' ) );
		exit;
	}
	$url = rtrim( $url, '/' );
	update_option( 'hatch_frontend_url', $url, false );
	// Sync revalidate endpoint to the new origin if it pointed at the old one.
	$existing = (string) get_option( 'hatch_revalidate_endpoint', '' );
	if ( '' === $existing || preg_match( '#^https?://[^/]+/api/revalidate#', $existing ) ) {
		update_option( 'hatch_revalidate_endpoint', $url . '/api/revalidate', false );
	}
	wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=connector&hatch_test=urlsaved' ) );
	exit;
}

/**
 * Visual Design editor. takes form fields (colors, fonts, radios) and
 * rebuilds a design.md YAML frontmatter block, then saves it via the
 * existing Hatch_Design_Loader. Keeps design.md as single source of truth.
 */
/**
 * Save Performance tab settings. All knobs persisted into a single
 * `hatch_perf` option so the frontend (or the design.md generator) can
 * read them in one pass. Sanitization is strict. every value is enum-
 * gated against the legal set; freeform fields (assets_prefix) get URL
 * sanitization.
 *
 * @return void
 */
/**
 * Save Code Injection snippets. Three free-text slots (head / body_start /
 * body_end) plus four named-shortcut IDs (GA4 / GTM / Plausible / Pixel).
 * The Astro frontend reads via /hatch/v1/code-snippets and generates the
 * actual analytics snippets from the IDs. keeps WP option clean and lets
 * the frontend evolve injection patterns independently.
 *
 * Note: head/body_start/body_end are stored as raw HTML. wp_unslash() but
 * NO escaping. That's intentional (they need to contain `<script>` tags).
 * Permission is gated to manage_options; that's the same trust level WP
 * grants for editing theme files. Any user with this cap can already break
 * the site, so this isn't a new attack surface.
 *
 * @return void
 */
/**
 * v0.48: Delete the encrypted deploy token for a given provider.
 * Lets users revoke the stored credential from the Connector tab.
 */
/**
 * Mark the deployed frontend as in-sync with the current plugin version.
 * Stamped by the user when they confirm a successful redeploy. The broker
 * sets this automatically on successful deploys (v0.29+); this handler exists
 * for users on older broker deployments who redeploy manually.
 */
/**
 * v0.30. Bulk-expose all ACF field groups to REST. The single biggest "headless
 * dynamic gap". ACF custom fields aren't returned by /wp/v2/posts unless every
 * group has show_in_rest=true. This handler flips them all in one click.
 */
/**
 * v0.50.0. Save Security tab via admin-post.php (was options.php. that
 * redirects to the WP Settings page after save, which is jarring inside the
 * Hatch UI). Whitelist + sanitise each known security option.
 */
/**
 * v0.50.0. Rotate every "Hatch (...)" Application Password across all admins.
 * Revokes all existing ones, then creates a single fresh "Hatch (rotated)"
 * password and stashes it via Hatch_App_Password_Helper so the next deploy
 * picks it up. Useful when you suspect a leaked credential or just want a
 * clean slate after testing.
 */
function hatch_handle_rotate_app_pwds(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'hatch_rotate_app_pwds' );

	$revoked = 0;
	if ( class_exists( 'WP_Application_Passwords' ) ) {
		$user_ids = get_users( array( 'fields' => 'ID', 'role__in' => array( 'administrator' ) ) );
		foreach ( $user_ids as $uid ) {
			$pwds = WP_Application_Passwords::get_user_application_passwords( $uid );
			if ( ! is_array( $pwds ) ) continue;
			foreach ( $pwds as $p ) {
				if ( isset( $p['name'] ) && 0 === stripos( (string) $p['name'], 'Hatch' ) ) {
					if ( WP_Application_Passwords::delete_application_password( $uid, $p['uuid'] ) ) {
						$revoked++;
					}
				}
			}
		}
	}

	// Create a fresh single password for the current user (admin).
	if ( class_exists( 'Hatch_App_Password_Helper' ) ) {
		Hatch_App_Password_Helper::generate_and_stash( 'Hatch (rotated ' . gmdate( 'Y-m-d H:i' ) . ')' );
	}

	set_transient( 'hatch_rotate_notice_' . get_current_user_id(), $revoked, 60 );
	wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=security&rotated=1' ) );
	exit;
}

/**
 * v0.50.1. Turnstile probe. Hits Cloudflare siteverify with a deliberately
 * invalid token so we get back error_codes that tell us if the SECRET KEY is
 * good without needing a real challenge response. Decoded:
 *   ["invalid-input-secret"]   → secret key is wrong
 *   ["invalid-input-response"] → secret good, just no real token (expected)
 *   ["missing-input-secret"]   → no secret saved yet
 */
/**
 * v0.50.1. Daily cron: prune "Hatch (...)" Application Passwords older than
 * the retention window (default 7 days, configurable via
 * `hatch_app_pwd_retention_days` option). Always keeps the newest 3 so a
 * deploy never finds itself without a credential.
 */
function hatch_prune_app_pwds(): void {
	if ( ! class_exists( 'WP_Application_Passwords' ) ) return;
	$days_keep = max( 1, (int) get_option( 'hatch_app_pwd_retention_days', 7 ) );
	$cutoff    = time() - ( $days_keep * DAY_IN_SECONDS );

	foreach ( get_users( array( 'fields' => 'ID', 'role__in' => array( 'administrator' ) ) ) as $uid ) {
		$pwds = WP_Application_Passwords::get_user_application_passwords( $uid );
		if ( ! is_array( $pwds ) ) continue;
		$hatch = array_values( array_filter( $pwds, function ( $p ) {
			return isset( $p['name'] ) && 0 === stripos( (string) $p['name'], 'Hatch' );
		} ) );
		usort( $hatch, function ( $a, $b ) {
			return ( $b['created'] ?? 0 ) <=> ( $a['created'] ?? 0 );
		} );
		// Always preserve newest 3 regardless of age.
		$candidates = array_slice( $hatch, 3 );
		foreach ( $candidates as $p ) {
			if ( ( $p['created'] ?? PHP_INT_MAX ) < $cutoff ) {
				WP_Application_Passwords::delete_application_password( $uid, $p['uuid'] );
			}
		}
	}
}

/**
 * v0.50.7. One-time success notice after Hatch activation auto-sets pretty
 * permalinks for users who had plain permalinks. Self-clears on first render.
 */
function hatch_permalinks_auto_set_notice(): void {
	if ( ! current_user_can( 'manage_options' ) ) return;
	if ( ! get_transient( 'hatch_permalinks_auto_set' ) ) return;
	delete_transient( 'hatch_permalinks_auto_set' );
	echo '<div class="notice notice-success is-dismissible"><p><strong>Hatch:</strong> ';
	printf(
		wp_kses(
			__( 'Permalinks set to <code>/%%postname%%/</code> for headless compatibility. Change anytime in <a href="%s">Settings → Permalinks</a>.', 'hatch' ),
			array( 'code' => array(), 'a' => array( 'href' => true ) )
		),
		esc_url( admin_url( 'options-permalink.php' ) )
	);
	echo '</p></div>';
}

/**
 * v0.50.7. Network-admin notice when someone tries to network-activate.
 * Hatch is per-site only (each subsite has its own deploy URL + token).
 */
function hatch_network_activate_blocked_notice(): void {
	if ( ! get_transient( 'hatch_network_activate_blocked' ) ) return;
	delete_transient( 'hatch_network_activate_blocked' );
	echo '<div class="notice notice-error"><p><strong>Hatch:</strong> ';
	esc_html_e( 'Hatch cannot be network-activated. Each subsite has its own deploy URL, encrypted token, and theme. Sharing them across the network would mix tenants. Activate Hatch on individual subsites instead.', 'hatch' );
	echo '</p></div>';
}

/**
 * v0.50.7. Subsite admin tip when running in multisite context. One-time.
 */
function hatch_multisite_subsite_tip(): void {
	if ( ! is_multisite() || ! current_user_can( 'manage_options' ) ) return;
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) : '';
	if ( 'hatch' !== $page && 'hatch-setup' !== $page ) return;
	if ( get_user_meta( get_current_user_id(), 'hatch_multisite_tip_dismissed', true ) ) return;

	echo '<div class="notice notice-info is-dismissible"><p><strong>Hatch (multisite):</strong> ';
	esc_html_e( 'You\'re configuring Hatch on subsite ID ' . get_current_blog_id() . '. Settings, the deploy token, and the frontend URL are all subsite-scoped. the other subsites in this network are unaffected.', 'hatch' );
	echo '</p></div>';
}

/**
 * v0.50.4. Admin notice when permalinks are PLAIN. Hatch frontend handles
 * the fallback via ?rest_route= but pretty permalinks are recommended for:
 *  (a) cleaner deploy logs (no 301 → fallback round-trip per request)
 *  (b) one-line REST URLs in error messages and copy-paste flows
 *  (c) wider WordPress plugin compatibility
 */
function hatch_plain_permalinks_warning(): void {
	if ( ! current_user_can( 'manage_options' ) ) return;
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) : '';
	if ( 'hatch' !== $page && 'hatch-setup' !== $page ) return;

	$structure = (string) get_option( 'permalink_structure', '' );
	if ( '' !== $structure ) return; // pretty permalinks active. nothing to warn

	echo '<div class="notice notice-warning"><p><strong>Hatch:</strong> ';
	printf(
		/* translators: %s: link to Settings → Permalinks */
		wp_kses(
			__( 'Permalinks are set to <em>Plain</em>. Headless frontends fetch via the <code>?rest_route=</code> fallback (slower, less compatible). <a href="%s">Switch to "Post name" or any pretty structure</a> for best results.', 'hatch' ),
			array( 'em' => array(), 'code' => array(), 'a' => array( 'href' => true ) )
		),
		esc_url( admin_url( 'options-permalink.php' ) )
	);
	echo '</p></div>';
}

/**
 * v0.50.0. Admin notice when a builder-block plugin is active. Their HTML
 * output relies on plugin CSS that doesn't ship to the headless Astro
 * frontend, so blocks render as unstyled markup. Show a one-time dismissible
 * notice on the Hatch admin pages only.
 */
function hatch_builder_block_warning(): void {
	if ( ! current_user_can( 'manage_options' ) ) return;
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) : '';
	if ( 'hatch' !== $page && 'hatch-setup' !== $page ) return;

	$builders = array(
		'generateblocks/plugin.php'                    => 'GenerateBlocks',
		'ultimate-addons-for-gutenberg/ultimate-addons-for-gutenberg.php' => 'Spectra',
		'stackable-ultimate-gutenberg-blocks/plugin.php' => 'Stackable',
		'kadence-blocks/kadence-blocks.php'            => 'Kadence Blocks',
		'greenshift-animation-and-page-builder-blocks/plugin.php' => 'Greenshift',
	);
	$active = array();
	foreach ( $builders as $file => $name ) {
		if ( is_plugin_active( $file ) ) $active[] = $name;
	}
	if ( empty( $active ) ) return;

	echo '<div class="notice notice-warning"><p><strong>Hatch:</strong> ';
	printf(
		/* translators: %s: comma-separated builder names */
		esc_html__( '%s detected. These blocks rely on plugin CSS that doesn\'t ship to the headless Astro frontend, so output will render unstyled. Stick to core Gutenberg blocks + the bundled Hatch blocks for full visual parity.', 'hatch' ),
		'<strong>' . esc_html( implode( ', ', $active ) ) . '</strong>'
	);
	echo '</p></div>';
}

/**
 * Hatch admin entry. v0.51 — React SPA mount.
 *
 * All UI is rendered client-side by the React app built from admin-react/src
 * into build/admin/. The boot state is injected via wp_add_inline_script so
 * first paint is instantaneous (no fetch round-trip on mount). Saves go
 * through POST /hatch/v1/options.
 *
 * @return void
 */
function hatch_render_admin_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	echo '<div class="wrap" style="margin:0;padding:0;max-width:none;"><div id="hatch-react-root"></div></div>';
}

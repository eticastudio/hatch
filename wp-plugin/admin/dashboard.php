<?php
/**
 * Hatch admin screens: data plumbing for the React admin.
 *
 * Registers the Hatch menu entry, the plugin row Settings link, the REST route
 * that saves options, the boot state for first paint, and the admin notices.
 * Every visual lives in admin-react/.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

// Legacy PHP UI is gone. React owns every visual in admin-react/. PHP here is
// pure data plumbing: REST routes, admin-post save handlers, boot state.

add_action( 'admin_menu', 'hatch_register_admin_menu' );
add_filter( 'plugin_action_links_' . plugin_basename( HATCH_PLUGIN_FILE ), 'hatch_plugin_action_links' );
add_action( 'admin_init', 'hatch_register_settings' );
// v0.50.1. Turnstile probe (validates that the saved Turnstile secret key works).
add_action( 'admin_enqueue_scripts', 'hatch_enqueue_admin_assets' );
// v0.51: React admin SPA save endpoint. Accepts a key/value batch where keys
// are dot-paths (features.toc, snippets.gtm_id, security.block_rest, ...) and
// dispatches each one to the right option / class method.
add_action( 'rest_api_init', 'hatch_register_react_options_route' );
// v0.50.0. admin notice when a builder-block plugin is active (output won't render headless).
add_action( 'admin_notices', 'hatch_builder_block_warning' );
// v0.50.4. admin notice when permalinks are PLAIN. Confuses every headless
// frontend (Astro hits /wp-json/* → 301). Hatch handles the fallback via
// ?rest_route= but pretty permalinks are still strongly recommended.
add_action( 'admin_notices', 'hatch_plain_permalinks_warning' );
// v0.50.7. admin notices for permalink auto-set + network-activate block + multisite tip.
add_action( 'admin_notices', 'hatch_permalinks_auto_set_notice' );
add_action( 'network_admin_notices', 'hatch_network_activate_blocked_notice' );
add_action( 'admin_notices', 'hatch_multisite_subsite_tip' );

/**
 * Enqueue Hatch admin design system. ONLY on Hatch screens.
 *
 * @param string $hook Current admin page hook.
 * @return void
 */
function hatch_enqueue_admin_assets( $hook ): void {
	// Only on the two Hatch screens: the dashboard and the hidden setup screen.
	if ( 'toplevel_page_hatch' !== $hook && 'admin_page_hatch-setup' !== $hook ) {
		return;
	}

	// Load WordPress media library JS so the React admin can open the
	// "Choose from media" picker for logo / favicon / OG image inputs.
	wp_enqueue_media();

	// Both the dashboard and the setup screen run the same React bundle. It reads
	// window.hatchBoot.page to decide which one to render.
	// Main dashboard = React SPA. Bundle is produced by `npm run build:admin`
	// at build/admin/index.{js,asset.php}.
	$bundle_js  = HATCH_PLUGIN_DIR . 'build/admin/index.jsx.js';
	$asset_php  = HATCH_PLUGIN_DIR . 'build/admin/index.jsx.asset.php';
	$bundle_css = HATCH_PLUGIN_DIR . 'build/admin/index.jsx.css';

	if ( ! file_exists( $bundle_js ) ) {
		// Build hasn't run yet. Show a sticky notice instead of an empty page.
		add_action(
			'admin_notices',
			static function () {
				echo '<div class="notice notice-error"><p>' . esc_html__( 'The Hatch admin screen files are missing. Reinstall the plugin, or run the build step if you are working from the source repository.', 'hatch-connect' ) . '</p></div>';
			}
		);
		return;
	}

	$asset = file_exists( $asset_php )
		? require $asset_php
		: array(
			'dependencies' => array( 'wp-element' ),
			'version'      => HATCH_VERSION,
		);
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
			array(),
			$bundle_version
		);
		wp_style_add_data( 'hatch-admin-react', 'rtl', 'replace' );
	}

	wp_set_script_translations( 'hatch-admin-react', 'hatch-connect', HATCH_PLUGIN_DIR . 'languages' );

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
	$hosting_model = (string) get_option( 'hatch_hosting_model', '' );
	$frontend_url  = trim( (string) get_option( 'hatch_frontend_url', '' ) );

	$heartbeat_record = null;
	$heartbeat_health = 'muted';
	$heartbeat_label  = __( 'No check yet. The first one runs within a few minutes of a deploy.', 'hatch-connect' );
	if ( class_exists( 'Hatch_Cloud_Heartbeat' ) ) {
		$host_for_hb      = Hatch_Cloud_Heartbeat::provider_for_model( $hosting_model );
		$heartbeat_record = Hatch_Cloud_Heartbeat::get( $host_for_hb );
		$heartbeat_health = Hatch_Cloud_Heartbeat::health( $heartbeat_record );
		// One method builds the sentence and the colour, so a 503 never reads "Responded in 210 ms".
		$heartbeat_label = Hatch_Cloud_Heartbeat::label( $heartbeat_record );
	}

	// Preflight check list. Hatch_Diagnostic::run() returns an array of
	// { id, title, message, severity, fix } per check; we map to the React
	// shape { label, ok, warn, note }. Pass-through stays light, warns get a
	// fix hint, and fails surface the failure message.
	$preflight = array();
	if ( class_exists( 'Hatch_Diagnostic' ) ) {
		$raw  = (array) Hatch_Diagnostic::run();
		$rows = isset( $raw['checks'] ) ? (array) $raw['checks'] : $raw;
		foreach ( $rows as $c ) {
			if ( ! is_array( $c ) ) {
				continue; }
			$sev         = isset( $c['severity'] ) ? (string) $c['severity'] : 'pass';
			$preflight[] = array(
				'label' => isset( $c['title'] ) ? (string) $c['title'] : '',
				'ok'    => 'pass' === $sev,
				'warn'  => 'warn' === $sev,
				'note'  => isset( $c['message'] ) ? (string) $c['message'] : '',
			);
		}
	}

	// Which admin app is mounting. Dashboard or setup wizard.
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only routing between two screens, no state change.
	$page      = ( isset( $_GET['page'] ) && 'hatch-setup' === sanitize_key( wp_unslash( $_GET['page'] ) ) ) ? 'setup' : 'dashboard';
	$home_host = (string) wp_parse_url( home_url(), PHP_URL_HOST );

	return array(
		'nonce'        => wp_create_nonce( 'wp_rest' ),
		'restUrl'      => esc_url_raw( rest_url( 'hatch/v1/' ) ),
		'adminUrl'     => admin_url( 'admin.php?page=hatch' ),
		'setupUrl'     => admin_url( 'admin.php?page=hatch-setup' ),
		'adminPostUrl' => admin_url( 'admin-post.php' ),
		'pluginUrl'    => plugins_url( '/', HATCH_PLUGIN_FILE ),
		'brandLogoUrl' => plugins_url( 'assets/brand/hatch-lockup-horizontal.svg', HATCH_PLUGIN_FILE ),
		'version'      => HATCH_VERSION,
		'page'         => $page,
		'siteHost'     => $home_host,
		'siteName'     => get_bloginfo( 'name' ),
		'state'        => array(
			'connection'      => array(
				'frontendUrl'  => $frontend_url,
				'hostLabel'    => hatch_host_label( $hosting_model ),
				'hostModel'    => $hosting_model,
				// v0.5.9: actual mount mode chosen in the wizard so React
				// can render "Cloudflare Workers (root)" vs "(subfolder)"
				// instead of the hard-coded label it used to ship.
				'mountMode'    => (string) get_option( 'hatch_mount_mode', 'subfolder' ),
				'mountSubpath' => (string) get_option( 'hatch_mount_subpath', '/blog' ),
				'heartbeat'    => array(
					'healthClass' => $heartbeat_health,
					'healthLabel' => $heartbeat_label,
				),
				'preflight'    => $preflight,
			),
			'themes'          => class_exists( 'Hatch_Features' ) ? array_map(
				static function ( $id, $row ) {
					return array(
						'id'    => $id,
						'label' => $row['label'],
						'desc'  => $row['description'],
						'icon'  => $row['icon'],
					);
				},
				array_keys( Hatch_Features::themes() ),
				Hatch_Features::themes()
			) : array(),
			// v0.50.13: wp_parse_args defaults so partial saves don't strip sibling
			// keys. Earlier shape returned only what was saved (e.g. {primary})
			// which made the React UI render only one color picker. Defaults
			// ALWAYS merge in now; user-saved keys win.
			'design'          => array(
				'theme'        => class_exists( 'Hatch_Features' ) ? (string) Hatch_Features::get_theme() : '',
				// Defaults come from the design loader, so the pickers show the
				// colours the frontend actually renders before anything is saved.
				'brand'        => class_exists( 'Hatch_Design_Loader' )
					? Hatch_Design_Loader::admin_brand( (array) get_option( 'hatch_design_brand', array() ) )
					: (array) get_option( 'hatch_design_brand', array() ),
				// v0.50.14: canonical lowercase IDs. The React UI writes these
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
			),
			'voice'           => wp_parse_args(
				(array) get_option( 'hatch_design_voice', array() ),
				array(
					'tone'     => 'professional',
					'pronouns' => 'we',
				)
			),
			'identity'        => wp_parse_args(
				(array) get_option( 'hatch_design_identity', array() ),
				array(
					'logo_url'     => '',
					'favicon_url'  => '',
					'og_image_url' => '',
					'site_title'   => get_bloginfo( 'name' ),
					'tagline'      => get_bloginfo( 'description' ),
				)
			),
			'templates'       => wp_parse_args(
				(array) get_option( 'hatch_design_templates', array() ),
				array(
					'single_sidebar'   => 'right',
					'single_hero'      => 'featured',
					'single_width'     => 'medium',
					'archive_grid'     => '3',
					'archive_excerpt'  => true,
					'not_found_search' => true,
				)
			),
			'borders'         => wp_parse_args(
				(array) get_option( 'hatch_design_borders', array() ),
				array(
					'color'  => '#e5e5e5',
					'shadow' => 'soft',
				)
			),
			'breakpoints'     => (array) get_option(
				'hatch_design_breakpoints',
				array(
					'mobile'  => 640,
					'tablet'  => 1024,
					'desktop' => 1280,
				)
			),
			'show_credit'     => (bool) get_option( 'hatch_show_credit', true ),
			// v0.50.16: raw design.md source for the upload/paste textarea
			// in the Global card. Round-trips through Hatch_Design_Loader.
			'design_md'       => class_exists( 'Hatch_Design_Loader' ) ? Hatch_Design_Loader::get_raw() : '',

			// v0.50.15: Aesthetic surface for the Astro frontend. Seven option
			// groups, each its own wp_options row so a partial save can't drop
			// sibling keys. Defaults match the current hardcoded Astro behaviour
			// so existing installs see zero visual change on upgrade.
			'share'           => wp_parse_args(
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
			'header'          => wp_parse_args(
				(array) get_option( 'hatch_design_header', array() ),
				array(
					'sticky'        => 'sticky', // sticky | static | hide_on_scroll
					'blur'          => true,
					'brand_mark'    => 'icon_text', // icon_text | text | initial
					'brand_display' => 'auto', // auto | logo | text | both
				)
			),
			'reading'         => wp_parse_args(
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
			'images'          => wp_parse_args(
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
			'animation'       => wp_parse_args(
				(array) get_option( 'hatch_design_animation', array() ),
				array(
					'page_transitions'       => true,
					'respect_reduced_motion' => true,
				)
			),
			'blog_index'      => wp_parse_args(
				(array) get_option( 'hatch_design_blog_index', array() ),
				array(
					'archive_grid'     => '3',          // Columns, 1 to 4.
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
			'setup'           => hatch_react_setup_state(),
			'features'        => class_exists( 'Hatch_Features' ) ? (array) Hatch_Features::get_all() : array(),
			'featureCatalog'  => class_exists( 'Hatch_Features' )
				? array_map(
					static function ( $slug, $info ) {
						return array(
							'slug'        => $slug,
							'label'       => (string) $info['label'],
							'description' => (string) $info['description'],
							'group'       => (string) $info['group'],
						);
					},
					array_keys( Hatch_Features::catalog() ),
					Hatch_Features::catalog()
				)
				: array(),
			'featureGroups'   => class_exists( 'Hatch_Features' )
				? array_map(
					static function ( $slug, $label ) {
						return array(
							'slug'  => $slug,
							'label' => (string) $label,
						);
					},
					array_keys( (array) Hatch_Features::group_labels() ),
					(array) Hatch_Features::group_labels()
				)
				: array(),
			'snippets'        => (array) get_option( 'hatch_code_snippets', array() ),
			// v0.50.14: content_flags slimmed to just Comments. Forms /
			// sitemap / RSS / robots / redirects all routed through their
			// respective WP plugins (Plugin Bridge auto-detects); having
			// Hatch-side toggles for them was duplicate config + dead UX.
			'content'         => wp_parse_args(
				(array) get_option( 'hatch_content_flags', array() ),
				array(
					'comments_enabled'   => true,
					'comments_turnstile' => false,
					'accounts_enabled'   => false,
				)
			),
			// v0.50.13: read Turnstile from the authoritative source
			// (`hatch_integrations`). The earlier `hatch_turnstile` key was a
			// dispatcher artifact that no consumer read, so the UI showed
			// "Keys missing" even after the user typed them in.
			'turnstile'       => class_exists( 'Hatch_Integrations' )
				? (array) ( Hatch_Integrations::get_all()['turnstile'] ?? array() )
				: array(
					'enabled'    => false,
					'site_key'   => '',
					'secret_key' => '',
				),
			'menus'           => hatch_react_menus_summary(),
			'forms'           => hatch_react_forms_summary(),
			'pluginBridge'    => hatch_react_plugin_bridge(),
			'performance'     => hatch_react_perf_state(),
			'security'        => hatch_react_security_state(),
			'status'          => hatch_react_status_snapshot(),
			// Plugins tab: the "supported blocks only" gate.
			'blocks'          => array(
				// v0.7.5: Plugin Bridge master toggle. Narrows inserter to
				// the 36 core blocks Hatch styles end-to-end when true.
				'disable_unsupported' => (bool) get_option( 'hatch_blocks_disable_unsupported', 0 ),
				'supported_count'     => class_exists( 'Hatch_Blocks' ) ? Hatch_Blocks::count() : 36,
				'supported_list'      => class_exists( 'Hatch_Blocks' ) ? Hatch_Blocks::whitelist() : array(),
			),
			// v0.50.31: WordPress Core Sync card. Surfaces every WP-owned
			// setting that affects headless rendering so users have ONE
			// status view + deep-links to the canonical WP UI. Read-only;
			// we don't duplicate WP's own admin pages, just show drift.
			'coreSync'        => hatch_react_core_sync(),
		),
	);
}

/**
 * v0.50.31: WordPress Core Sync snapshot.
 *
 * Hatch's job is to mirror what WordPress already owns. This payload gives
 * the Content tab a single status view of every WP-owned setting that
 * affects the headless frontend, with deep-links to the canonical WP UI.
 * READ-ONLY. We don't duplicate WP admin pages, we surface drift.
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
	// SITE IDENTITY, General Settings + Customizer.
	$logo_id = (int) get_theme_mod( 'custom_logo', 0 );
	$site    = array(
		'title'          => (string) get_bloginfo( 'name' ),
		'tagline'        => (string) get_bloginfo( 'description' ),
		'url'            => (string) home_url(),
		'language'       => (string) get_bloginfo( 'language' ),
		'timezone'       => '' !== (string) get_option( 'timezone_string' ) ? (string) get_option( 'timezone_string' ) : (string) get_option( 'gmt_offset' ),
		'date_format'    => (string) get_option( 'date_format' ),
		'time_format'    => (string) get_option( 'time_format' ),
		'logo_url'       => $logo_id ? (string) wp_get_attachment_image_url( $logo_id, 'full' ) : '',
		'favicon_url'    => function_exists( 'get_site_icon_url' ) ? (string) get_site_icon_url() : '',
		'admin_url'      => admin_url( 'options-general.php' ),
		'customizer_url' => admin_url( 'customize.php?autofocus[section]=title_tagline' ),
	);

	// PERMALINKS, frontend routing requires pretty perms.
	// v0.50.31: emit a HUMAN-READABLE example URL by substituting WP's
	// permalink tags with realistic placeholder values. `/blog/%postname%/`
	// becomes `/blog/your-post-title/`, instantly clear to non-devs.
	$structure = (string) get_option( 'permalink_structure', '' );
	$example   = strtr(
		$structure,
		array(
			'%postname%' => 'your-post-title',
			'%category%' => 'category',
			'%author%'   => 'author',
			'%post_id%'  => '123',
			'%year%'     => gmdate( 'Y' ),
			'%monthnum%' => gmdate( 'm' ),
			'%day%'      => gmdate( 'd' ),
			'%hour%'     => gmdate( 'H' ),
			'%minute%'   => gmdate( 'i' ),
			'%second%'   => gmdate( 's' ),
		)
	);
	$permalink = array(
		'structure' => $structure,
		'example'   => '' !== $example ? $example : '/?p=123',
		'pretty'    => '' !== $structure,
		'admin_url' => admin_url( 'options-permalink.php' ),
	);

	// HOMEPAGE, posts page vs static page.
	$show_on_front = (string) get_option( 'show_on_front', 'posts' );
	$page_on_front = (int) get_option( 'page_on_front', 0 );
	$homepage      = array(
		'mode'         => $show_on_front,
		'static_id'    => $page_on_front,
		'static_title' => $page_on_front ? (string) get_the_title( $page_on_front ) : '',
		'admin_url'    => admin_url( 'options-reading.php' ),
	);

	// MENUS, every registered location + assignment state + item count
	// + the FULL menu list so the React admin can render an inline picker.
	$menu_locations = (array) get_registered_nav_menus();
	$menu_assigned  = (array) get_nav_menu_locations();
	$all_menus_raw  = wp_get_nav_menus();
	$all_menus      = array();
	foreach ( (array) $all_menus_raw as $m ) {
		$all_menus[] = array(
			'id'    => (int) $m->term_id,
			'name'  => (string) $m->name,
			'count' => (int) $m->count,
		);
	}
	$menus = array();
	foreach ( $menu_locations as $loc => $label ) {
		$mid     = (int) ( $menu_assigned[ $loc ] ?? 0 );
		$menu    = $mid ? wp_get_nav_menu_object( $mid ) : null;
		$items   = $mid ? (array) wp_get_nav_menu_items( $mid ) : array();
		$menus[] = array(
			'loc'         => (string) $loc,
			'label'       => (string) $label,
			'assigned_id' => $mid,
			'assigned'    => $menu ? (string) $menu->name : '',
			'count'       => count( $items ),
			'admin_url'   => admin_url( 'nav-menus.php?action=locations' ),
		);
	}

	// DISCUSSION (Settings → Discussion), what WP says about comments.
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
		'posts_per_page'  => (int) get_option( 'posts_per_page', 10 ),
		'rss_use_excerpt' => (bool) get_option( 'rss_use_excerpt', false ),
		'blog_public'     => (bool) get_option( 'blog_public', true ),
		'admin_url'       => admin_url( 'options-reading.php' ),
	);

	// PRIVACY (Settings → Privacy)
	$privacy_id = (int) get_option( 'wp_page_for_privacy_policy', 0 );
	if ( $privacy_id && ! get_post( $privacy_id ) ) {
		// The saved page was deleted, so treat the setting as empty.
		$privacy_id = 0;
	}
	$privacy = array(
		'page_id'    => $privacy_id,
		'page_title' => $privacy_id ? (string) get_the_title( $privacy_id ) : '',
		'admin_url'  => admin_url( 'options-privacy.php' ),
	);

	// USERS / ROLES, useful for memberships + author archives.
	$role_counts = count_users();
	$roles       = array();
	foreach ( (array) wp_roles()->role_names as $role => $name ) {
		$roles[] = array(
			'slug'  => (string) $role,
			'name'  => (string) $name,
			'count' => (int) ( $role_counts['avail_roles'][ $role ] ?? 0 ),
		);
	}

	// v0.50.31: AUTHORS, users who have published at least one post.
	// These become author archive pages on the Astro frontend (/blog/author/<slug>).
	// Surface their display_name, bio status, avatar status so the user can
	// see drift (e.g. "5 authors but only 1 has a bio set"). Profile page
	// deep-links straight to /wp-admin/profile.php.
	$author_query = get_users(
		array(
			'has_published_posts' => array( 'post' ),
			'orderby'             => 'post_count',
			'order'               => 'DESC',
			'number'              => 20,
			'fields'              => array( 'ID', 'display_name', 'user_nicename' ),
		)
	);
	$authors      = array();
	foreach ( (array) $author_query as $u ) {
		$desc      = (string) get_user_meta( $u->ID, 'description', true );
		$authors[] = array(
			'id'          => (int) $u->ID,
			'name'        => (string) $u->display_name,
			'slug'        => (string) $u->user_nicename,
			'post_count'  => (int) count_user_posts( $u->ID, 'post', true ),
			'has_bio'     => '' !== $desc,
			'has_avatar'  => (bool) get_avatar_url( $u->ID, array( 'default' => '404' ) ),
			'profile_url' => admin_url( 'user-edit.php?user_id=' . $u->ID ),
		);
	}
	$authors_summary = array(
		'list'        => $authors,
		'total'       => count( $authors ),
		'with_bio'    => count( array_filter( $authors, fn( $a ) => $a['has_bio'] ) ),
		'admin_url'   => admin_url( 'users.php?role=author' ),
		'profile_url' => admin_url( 'profile.php' ),
	);

	// POST TYPES, every public + in-REST type with post count.
	$post_types = array();
	foreach ( get_post_types(
		array(
			'public'       => true,
			'show_in_rest' => true,
		),
		'objects'
	) as $slug => $obj ) {
		if ( 'attachment' === $slug ) {
			continue;
		}
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

	// TAXONOMIES, every public + in-REST taxonomy.
	$taxonomies = array();
	foreach ( get_taxonomies(
		array(
			'public'       => true,
			'show_in_rest' => true,
		),
		'objects'
	) as $slug => $obj ) {
		$terms        = (int) wp_count_terms(
			array(
				'taxonomy'   => $slug,
				'hide_empty' => false,
			)
		);
		$taxonomies[] = array(
			'slug'      => (string) $slug,
			'label'     => (string) $obj->label,
			'count'     => $terms,
			'builtin'   => (bool) $obj->_builtin,
			'admin_url' => admin_url( 'edit-tags.php?taxonomy=' . $slug ),
		);
	}

	// LANGUAGES, populated when a multilingual plugin is active.
	$languages = array();
	if ( function_exists( 'pll_languages_list' ) ) {
		foreach ( (array) pll_languages_list( array( 'fields' => 'slug' ) ) as $code ) {
			$languages[] = array(
				'code'    => (string) $code,
				'label'   => (string) $code,
				'default' => false,
			);
		}
	} elseif ( defined( 'ICL_SITEPRESS_VERSION' ) ) {
		$languages[] = array(
			'code'    => 'wpml',
			'label'   => 'WPML detected',
			'default' => true,
		);
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
 * Menus summary, locations + assigned menu names. Read by the React Content tab.
 *
 * @return array<int, array{loc: string, label: string, assigned: string}>
 */
function hatch_react_menus_summary(): array {
	$locations = (array) get_registered_nav_menus();
	$assigned  = (array) get_nav_menu_locations();
	$out       = array();
	foreach ( $locations as $loc => $label ) {
		$menu  = ! empty( $assigned[ $loc ] ) ? wp_get_nav_menu_object( (int) $assigned[ $loc ] ) : null;
		$out[] = array(
			'loc'      => (string) $loc,
			'label'    => (string) $label,
			'assigned' => $menu ? (string) $menu->name : __( 'Not assigned', 'hatch-connect' ),
		);
	}
	return $out;
}

/**
 * Forms bridge summary, which form plugin is detected, how many forms.
 *
 * @return array{detected: bool, plugin: ?string, count: int}
 */
function hatch_react_forms_summary(): array {
	if ( defined( 'FLUENTFORM' ) || class_exists( 'FluentForm\App\App' ) ) {
		$count = 0;
		if ( function_exists( 'wpFluent' ) ) {
			$count = (int) wpFluent()->table( 'fluentform_forms' )->count();
		}
		return array(
			'detected' => true,
			'plugin'   => 'Fluent Forms',
			'count'    => $count,
		);
	}
	if ( class_exists( 'GFForms' ) ) {
		return array(
			'detected' => true,
			'plugin'   => 'Gravity Forms',
			'count'    => 0,
		);
	}
	if ( class_exists( 'WPForms' ) ) {
		return array(
			'detected' => true,
			'plugin'   => 'WPForms',
			'count'    => 0,
		);
	}
	if ( defined( 'WPCF7_VERSION' ) ) {
		return array(
			'detected' => true,
			'plugin'   => 'Contact Form 7',
			'count'    => 0,
		);
	}
	return array(
		'detected' => false,
		'plugin'   => null,
		'count'    => 0,
	);
}

/**
 * Plugin Bridge, auto-detected installed WP plugins Hatch can expose to the
 * frontend. Detection only; user picks which to surface via toggles.
 *
 * @return array<int, array{feature: string, providers: array<int, string>, detected: bool, providerName: string, n: string}>
 */
function hatch_react_plugin_bridge(): array {
	if ( ! function_exists( 'is_plugin_active' ) ) {
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
	}

	// Capability-based catalog. Each entry is a frontend feature category
	// Hatch can bridge; `providers` lists known plugin slugs + their display
	// name, ordered by recommendation. First detected provider wins.
	//
	// v0.50.31: WooCommerce-style extensibility.
	// Third-party plugins can REGISTER themselves as Hatch providers via:
	//
	//   add_filter( 'hatch_plugin_bridge_catalog', function ( $catalog ) {
	//       $catalog[] = array(
	//           'feature'   => 'Reviews',
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
	// Filter runs once per Hatch admin page load, cheap. Docs:
	// see CONTRIBUTING.md → "Building a Hatch-aware plugin".
	$catalog = array(
		// v0.50.14: Forms / SEO / Redirects moved here from Content tab
		// "Core integrations". Hatch doesn't reinvent these; it surfaces
		// whichever WP plugin is providing the capability so the user can
		// trust the existing tool.
		array(
			'feature'   => 'Forms',
			'providers' => array(
				'Fluent Forms'   => array( 'fluentform/fluentform.php' ),
				'Gravity Forms'  => array( 'gravityforms/gravityforms.php' ),
				'WPForms'        => array( 'wpforms/wpforms.php', 'wpforms-lite/wpforms.php' ),
				'Contact Form 7' => array( 'contact-form-7/wp-contact-form-7.php' ),
			),
		),
		array(
			'feature'   => 'SEO + Sitemap',
			'providers' => array(
				'Rank Math' => array( 'seo-by-rank-math/rank-math.php' ),
				'Yoast SEO' => array( 'wordpress-seo/wp-seo.php', 'wordpress-seo-premium/wp-seo-premium.php' ),
				'AIOSEO'    => array( 'all-in-one-seo-pack/all_in_one_seo_pack.php', 'all-in-one-seo-pack-pro/all_in_one_seo_pack.php' ),
			),
		),
		array(
			'feature'   => 'Redirects',
			'providers' => array(
				'Rank Math'         => array( 'seo-by-rank-math/rank-math.php' ),
				'Yoast SEO Premium' => array( 'wordpress-seo-premium/wp-seo-premium.php' ),
				'Redirection'       => array( 'redirection/redirection.php' ),
			),
		),
		array(
			'feature'   => 'eCommerce',
			'providers' => array(
				'WooCommerce'            => array( 'woocommerce/woocommerce.php' ),
				'Easy Digital Downloads' => array( 'easy-digital-downloads/easy-digital-downloads.php' ),
				'WP EasyCart'            => array( 'wp-easycart/wp-easycart.php' ),
			),
		),
		array(
			'feature'   => 'Custom Fields',
			'providers' => array(
				'ACF'       => array( 'advanced-custom-fields-pro/acf.php', 'advanced-custom-fields/acf.php' ),
				'Meta Box'  => array( 'meta-box/meta-box.php' ),
				'Pods'      => array( 'pods/init.php' ),
				'JetEngine' => array( 'jet-engine/jet-engine.php' ),
			),
		),
		array(
			'feature'   => 'Email Newsletter',
			'providers' => array(
				'FluentCRM'        => array( 'fluent-crm/fluent-crm.php' ),
				'Mailchimp for WP' => array( 'mailchimp-for-wp/mailchimp-for-wp.php' ),
				'Newsletter'       => array( 'newsletter/plugin.php' ),
				'MailPoet'         => array( 'mailpoet/mailpoet.php' ),
			),
		),
		array(
			'feature'   => 'Memberships',
			'providers' => array(
				'MemberPress'          => array( 'memberpress/memberpress.php' ),
				'Paid Memberships Pro' => array( 'paid-memberships-pro/paid-memberships-pro.php' ),
				'Restrict Content Pro' => array( 'restrict-content-pro/restrict-content-pro.php' ),
			),
		),
		array(
			'feature'   => 'Code Snippets',
			'providers' => array(
				'WPCode'           => array( 'wpcode/wpcode.php', 'insert-headers-and-footers/ihaf.php' ),
				'Code Snippets'    => array( 'code-snippets/code-snippets.php' ),
				'Advanced Scripts' => array( 'advanced-scripts/advanced-scripts.php' ),
			),
		),
		array(
			'feature'   => 'Data Tables',
			'providers' => array(
				'TablePress'      => array( 'tablepress/tablepress.php' ),
				'wpDataTables'    => array( 'wpdatatables/wpdatatables.php' ),
				'Posts Table Pro' => array( 'posts-table-pro/posts-table-pro.php' ),
			),
		),
		// v0.50.31: Email delivery. Critical for headless: wp_mail() defaults
		// to PHP mail() which Cloudflare and most hosts block silently ,
		// comment notifications + form submissions disappear into the void.
		array(
			'feature'   => 'Email delivery (SMTP)',
			'providers' => array(
				'FluentSMTP'   => array( 'fluent-smtp/fluent-smtp.php' ),
				'WP Mail SMTP' => array( 'wp-mail-smtp/wp_mail_smtp.php' ),
				'Easy WP SMTP' => array( 'easy-wp-smtp/easy-wp-smtp.php' ),
				'Post SMTP'    => array( 'post-smtp/postman-smtp.php' ),
			),
		),
		// v0.50.31: Site backups. WP-side concern (Hatch's Astro frontend
		// is stateless + redeployable from git). Detection only, provider
		// handles backup scheduling, destinations, and restore.
		array(
			'feature'   => 'Site backups',
			'providers' => array(
				'UpdraftPlus' => array( 'updraftplus/updraftplus.php' ),
				'BlogVault'   => array( 'blogvault-real-time-backup/blogvault.php' ),
				'BackWPup'    => array( 'backwpup/backwpup.php' ),
				'Duplicator'  => array( 'duplicator/duplicator.php' ),
			),
		),
		// v0.50.31: Activity log. Compliance + forensics. Plugin Bridge
		// surfaces detection only; the plugin's UI is where logs are read.
		array(
			'feature'   => 'Activity log',
			'providers' => array(
				'WP Activity Log' => array( 'wp-security-audit-log/wp-security-audit-log.php' ),
				'Simple History'  => array( 'simple-history/index.php' ),
				'Activity Log'    => array( 'aryo-activity-log/aryo-activity-log.php' ),
			),
		),
	);

	// v0.50.31: Apply the extensibility filter so third-party plugins can
	// add categories or providers. See block-comment above for examples.
	$catalog = (array) apply_filters( 'hatch_plugin_bridge_catalog', $catalog );

	$out = array();
	foreach ( $catalog as $row ) {
		// Defensive: ignore malformed entries from third parties.
		if ( ! is_array( $row ) || empty( $row['feature'] ) || empty( $row['providers'] ) ) {
			continue;
		}
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
			// Back-compat: the React component already tolerates {n} legacy shape
			// via LEGACY_CATEGORY; we ship both shapes to avoid breaking older
			// builds during the deploy window.
			'n'            => $detected_name,
		);
	}
	return $out;
}

/**
 * Performance state for React, reads the canonical `hatch_perf` struct that
 * `hatch_handle_save_perf` writes to. So existing saved values appear and the
 * enforcement code (which reads `hatch_perf[...]`) stays in sync.
 *
 * @return array
 */
function hatch_react_perf_state(): array {
	$perf = (array) get_option( 'hatch_perf', array() );
	// Partytown was removed in 0.2; drop the leftover key once.
	if ( array_key_exists( 'partytown_enabled', $perf ) ) {
		unset( $perf['partytown_enabled'] );
		update_option( 'hatch_perf', $perf );
	}
	return array(
		'image_proxy'        => (bool) get_option( 'hatch_image_proxy_url', '' ),
		'image_proxy_url'    => (string) get_option( 'hatch_image_proxy_url', '' ),
		'image_service'      => (string) ( $perf['image_service'] ?? 'sharp' ),
		'image_layout'       => (string) ( $perf['image_layout'] ?? 'constrained' ),
		'prefetch_enabled'   => (bool) ( $perf['prefetch_enabled'] ?? false ),
		'prefetch'           => (string) ( $perf['prefetch_strategy'] ?? 'hover' ),
		'output'             => (string) ( $perf['output_mode'] ?? 'server' ),
		'inline_stylesheets' => (string) ( $perf['inline_stylesheets'] ?? 'auto' ),
		'compress_html'      => (bool) ( $perf['compress_html'] ?? false ),
		'telemetry'          => (bool) ( $perf['telemetry'] ?? false ),
		'bloat_kill'         => (bool) get_option( 'hatch_perf_bloat_kill', false ),
		'bloat'              => hatch_react_bloat_state(),
	);
}

/**
 * Clean-up switches as the Performance tab shows them: the two that are also
 * security protections read the same answer as the Security tab.
 *
 * @return array<string,bool>
 */
function hatch_react_bloat_state(): array {
	if ( ! class_exists( 'Hatch_Performance_Bloat' ) ) {
		return array();
	}
	$state               = Hatch_Performance_Bloat::state();
	$state['xmlrpc']     = hatch_fortress_effective( 'block_xmlrpc' );
	$state['rest_users'] = hatch_fortress_effective( 'disable_rest_users' );
	return $state;
}

/**
 * Security state for React, reads the canonical option keys that
 * `hatch_handle_save_security` writes (hatch_security_*, hatch_login_*,
 * hatch_brute_force_*, hatch_uninstall_remove_all_data).
 *
 * @return array
 */
function hatch_react_security_state(): array {
	return array(
		'block_rest'                          => (bool) get_option( 'hatch_security_harden_rest', false ),
		'disable_xmlrpc'                      => hatch_fortress_effective( 'block_xmlrpc' ),
		'block_enum'                          => hatch_fortress_effective( 'disable_rest_users' ),
		'noindex_cms'                         => (bool) get_option( 'hatch_security_force_noindex', false ),
		'role_guard'                          => (bool) get_option( 'hatch_login_role_guard_enabled', false ),
		'allowed_roles'                       => (string) get_option( 'hatch_login_allowed_roles', 'administrator, editor, author' ),
		'bf_threshold'                        => (int) get_option( 'hatch_brute_force_limit', 5 ),
		'bf_window'                           => (int) get_option( 'hatch_brute_force_window', 30 ),
		'remove_on_uninstall'                 => (bool) get_option( 'hatch_uninstall_remove_all_data', false ),
		// v0.50.11: Fortress mode toggles (Hatch_Hardening class).
		'disallow_file_edit'                  => hatch_fortress_effective( 'disable_file_edit' ),
		'send_headers'                        => hatch_fortress_effective( 'headers' ),
		// v0.50.31: Per-surface Turnstile gates.
		'turnstile_login'                     => (bool) get_option( 'hatch_security_turnstile_login', false ),
		'turnstile_comments'                  => (bool) get_option( 'hatch_security_turnstile_comments', false ),
		'enforce_2fa'                         => (bool) get_option( 'hatch_security_enforce_2fa', false ),
		'twofa_provider'                      => class_exists( 'Hatch_Hardening' ) ? (string) Hatch_Hardening::detect_2fa_provider() : '',
		'twofa_settings_url'                  => class_exists( 'Hatch_Hardening' ) ? (string) Hatch_Hardening::get_2fa_settings_url() : '',
		'twofa_user_configured'               => class_exists( 'Hatch_Hardening' ) ? (bool) Hatch_Hardening::user_has_2fa_configured() : false,
		// v0.50.32: Fortress Mode master + sub-toggles.
		'fortress_mode'                       => (bool) get_option( 'hatch_fortress_mode', false ),
		'fortress_block_xmlrpc'               => hatch_fortress_effective( 'block_xmlrpc' ),
		'fortress_disable_rest_users'         => hatch_fortress_effective( 'disable_rest_users' ),
		'fortress_disable_file_edit'          => hatch_fortress_effective( 'disable_file_edit' ),
		'fortress_app_password_only'          => hatch_fortress_effective( 'app_password_only' ),
		'fortress_headers'                    => hatch_fortress_effective( 'headers' ),
		'fortress_hide_wp_version'            => hatch_fortress_effective( 'hide_wp_version' ),
		'fortress_disable_directory_browsing' => hatch_fortress_effective( 'disable_directory_browsing' ),
	);
}

/**
 * Setup and Connection screen state for React.
 *
 * Carries the form nonces the remaining admin-post forms need, the facts the
 * deploy screen must disclose before it changes anything on this site (the
 * active theme, the permalink structure, application passwords), and the link
 * to Cloudflare's API token page.
 *
 * @return array
 */
function hatch_react_setup_state(): array {
	$user      = wp_get_current_user();
	$public_wp = trim( (string) get_option( 'hatch_wp_public_url', '' ) );
	$wp_url    = untrailingslashit( '' !== $public_wp ? esc_url_raw( $public_wp ) : home_url() );
	$wp_host   = strtolower( (string) wp_parse_url( $wp_url, PHP_URL_HOST ) );
	$is_local  = '' === $wp_host
		|| 'localhost' === $wp_host
		|| substr( $wp_host, -6 ) === '.local'
		|| substr( $wp_host, -5 ) === '.test'
		|| substr( $wp_host, -10 ) === '.localhost'
		|| ( false !== filter_var( $wp_host, FILTER_VALIDATE_IP ) && false === filter_var( $wp_host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) );

	$theme   = wp_get_theme();
	$has_app = function_exists( 'wp_is_application_passwords_available_for_user' ) && wp_is_application_passwords_available_for_user( $user );

	return array(
		// Only nonces that a React form actually submits.
		'nonces'      => array(
			'probe_heartbeat' => wp_create_nonce( 'hatch_probe_heartbeat' ),
		),
		'wpUser'      => $user->user_login,
		'disclosure'  => array(
			'themeName'         => (string) $theme->get( 'Name' ),
			'permalinksPlain'   => '' === (string) get_option( 'permalink_structure', '' ),
			'appPasswordsOn'    => $has_app,
			'wpUrl'             => $wp_url,
			'wpUrlIsPrivate'    => $is_local,
			'settingsPermalink' => admin_url( 'options-permalink.php' ),
			'appPasswordsUrl'   => admin_url( 'profile.php#application-passwords-section' ),
			'newUserUrl'        => admin_url( 'user-new.php' ),
		),
		// wp_nonce_url() returns an HTML-escaped URL (&amp;). These go to a JS
		// href, so decode them or PHP never sees the second query argument.
		'skipUrl'     => wp_specialchars_decode( wp_nonce_url( admin_url( 'admin.php?page=hatch-setup&hatch_skip_setup=1' ), 'hatch_skip_setup' ), ENT_QUOTES ),
		'completeUrl' => wp_specialchars_decode( wp_nonce_url( admin_url( 'admin.php?page=hatch-setup&hatch_complete_setup=1' ), 'hatch_complete_setup' ), ENT_QUOTES ),
		'cfTokenUrl'  => ( new Hatch_Cloudflare_Provider() )->token_template_url(),
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
 * Protections that exist under more than one name. The Security tab keeps one
 * row for each; the older options stay in step so either code path agrees.
 *
 * @return array<string,array{fortress:string,opts:string[],bloat:string,paths:string[]}>
 */
function hatch_twin_groups(): array {
	return array(
		'block_xmlrpc'       => array(
			'fortress' => 'block_xmlrpc',
			'opts'     => array( 'hatch_security_disable_xmlrpc' ),
			'bloat'    => 'xmlrpc',
			'paths'    => array( 'security.fortress_block_xmlrpc', 'security.disable_xmlrpc', 'performance.bloat.xmlrpc' ),
		),
		'disable_rest_users' => array(
			'fortress' => 'disable_rest_users',
			'opts'     => array( 'hatch_security_block_user_enum' ),
			'bloat'    => 'rest_users',
			'paths'    => array( 'security.fortress_disable_rest_users', 'security.block_enum', 'performance.bloat.rest_users' ),
		),
		'disable_file_edit'  => array(
			'fortress' => 'disable_file_edit',
			'opts'     => array( 'hatch_security_disallow_file_edit' ),
			'bloat'    => '',
			'paths'    => array( 'security.fortress_disable_file_edit', 'security.disallow_file_edit' ),
		),
		'headers'            => array(
			'fortress' => 'headers',
			'opts'     => array( 'hatch_security_send_headers' ),
			'bloat'    => '',
			'paths'    => array( 'security.fortress_headers', 'security.send_headers' ),
		),
	);
}

/**
 * The seven Fortress protections.
 *
 * @return string[]
 */
function hatch_fortress_keys(): array {
	return array( 'block_xmlrpc', 'disable_rest_users', 'disable_file_edit', 'app_password_only', 'headers', 'hide_wp_version', 'disable_directory_browsing' );
}

/**
 * Whether a Fortress protection is really in force, counting its older twin
 * options, the Fortress master switch and the Performance clean-up switch.
 *
 * @param string $key One of hatch_fortress_keys().
 */
function hatch_fortress_effective( string $key ): bool {
	if ( (bool) get_option( 'hatch_fortress_mode', false ) || (bool) get_option( 'hatch_fortress_' . $key, false ) ) {
		return true;
	}
	$groups = hatch_twin_groups();
	if ( isset( $groups[ $key ] ) ) {
		foreach ( $groups[ $key ]['opts'] as $opt ) {
			if ( get_option( $opt, false ) ) {
				return true;
			}
		}
		if ( '' !== $groups[ $key ]['bloat'] && class_exists( 'Hatch_Performance_Bloat' ) ) {
			$bloat = Hatch_Performance_Bloat::state();
			return ! empty( $bloat[ $groups[ $key ]['bloat'] ] );
		}
	}
	return false;
}

/**
 * Write one protection to every name it has. Turning one off while a master
 * switch is what holds it on keeps the other protections on, then drops the
 * master.
 *
 * @param string $key      Fortress key from hatch_twin_groups().
 * @param bool   $value    New state.
 * @param array  $hydrated Paths the server changed beyond what was sent.
 */
function hatch_twin_write( string $key, bool $value, array &$hydrated ): void {
	$group = hatch_twin_groups()[ $key ];
	update_option( 'hatch_fortress_' . $group['fortress'], $value ? 1 : 0 );
	foreach ( $group['opts'] as $opt ) {
		update_option( $opt, $value ? 1 : 0 );
	}
	if ( '' === $group['bloat'] || ! class_exists( 'Hatch_Performance_Bloat' ) ) {
		return;
	}
	$items = (array) get_option( Hatch_Performance_Bloat::OPT_ITEMS, array() );
	if ( ! $value && get_option( Hatch_Performance_Bloat::OPT_MASTER, false ) ) {
		$items = array_map( 'intval', Hatch_Performance_Bloat::state() );
		update_option( Hatch_Performance_Bloat::OPT_MASTER, 0 );
		$hydrated['performance.bloat_kill'] = false;
		foreach ( $items as $slug => $on ) {
			$hydrated[ 'performance.bloat.' . $slug ] = (bool) $on;
		}
	}
	$items[ $group['bloat'] ] = $value ? 1 : 0;
	update_option( Hatch_Performance_Bloat::OPT_ITEMS, $items );
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
	$applied         = array();
	$fortress_before = array();
	$mode_before     = (bool) get_option( 'hatch_fortress_mode', false );
	foreach ( hatch_fortress_keys() as $fk ) {
		$fortress_before[ $fk ] = hatch_fortress_effective( $fk );
	}
	$notes    = array(); // path => plain-language message the admin shows after saving.
	$hydrated = array(); // path => value the server changed beyond what was sent (design.md).

	// Stand-alone boolean options.
	$bool_options = array(
		'performance.image_proxy'                      => 'hatch_image_proxy_url',
		'security.block_rest'                          => 'hatch_security_harden_rest',
		'security.disable_xmlrpc'                      => 'hatch_security_disable_xmlrpc',
		'security.block_enum'                          => 'hatch_security_block_user_enum',
		'security.noindex_cms'                         => 'hatch_security_force_noindex',
		'security.role_guard'                          => 'hatch_login_role_guard_enabled',
		'security.remove_on_uninstall'                 => 'hatch_uninstall_remove_all_data',
		// Fortress mode (Hatch_Hardening).
		'security.disallow_file_edit'                  => 'hatch_security_disallow_file_edit',
		'security.send_headers'                        => 'hatch_security_send_headers',
		'security.enforce_2fa'                         => 'hatch_security_enforce_2fa',
		// v0.50.31: Per-surface Turnstile gates. Keys live in
		// hatch_integrations.turnstile (Content tab); these toggles say
		// WHERE to apply the gate. Gated server-side by Hatch_Turnstile_WP.
		'security.turnstile_login'                     => 'hatch_security_turnstile_login',
		'security.turnstile_comments'                  => 'hatch_security_turnstile_comments',
		// v0.50.32: Fortress Mode master + sub-toggles. Each writes a
		// hatch_fortress_* boolean option that Hatch_Hardening::is_on()
		// consumes on the next request.
		'security.fortress_mode'                       => 'hatch_fortress_mode',
		'security.fortress_block_xmlrpc'               => 'hatch_fortress_block_xmlrpc',
		'security.fortress_disable_rest_users'         => 'hatch_fortress_disable_rest_users',
		'security.fortress_disable_file_edit'          => 'hatch_fortress_disable_file_edit',
		'security.fortress_app_password_only'          => 'hatch_fortress_app_password_only',
		'security.fortress_headers'                    => 'hatch_fortress_headers',
		'security.fortress_hide_wp_version'            => 'hatch_fortress_hide_wp_version',
		'security.fortress_disable_directory_browsing' => 'hatch_fortress_disable_directory_browsing',
		// v0.7.5: Plugin Bridge tab "supported blocks only" gate. When on,
		// the inserter is narrowed to the 36 core blocks Hatch styles
		// end-to-end (see includes/class-blocks.php).
		'blocks.disable_unsupported'                   => 'hatch_blocks_disable_unsupported',
	);
	$str_options  = array(
		'security.allowed_roles' => 'hatch_login_allowed_roles',
		'design.font_heading'    => 'hatch_design_font_heading',
		'design.font_body'       => 'hatch_design_font_body',
		'design.font_mono'       => 'hatch_design_font_mono',
	);
	$int_options  = array(
		'security.bf_threshold' => 'hatch_brute_force_limit',
		'security.bf_window'    => 'hatch_brute_force_window',
	);
	// Performance keys merge into a single `hatch_perf` struct (canonical).
	// telemetry routes here (not its own option) so Hatch_Features::map() reads
	// it from the right key, previously routed to hatch_telemetry which the
	// frontend never read (silent hollow toggle, fixed in v0.1.0).
	$perf_keys     = array(
		'performance.image_service'      => 'image_service',
		'performance.image_layout'       => 'image_layout',
		'performance.prefetch_enabled'   => 'prefetch_enabled',
		'performance.prefetch'           => 'prefetch_strategy',
		'performance.output'             => 'output_mode',
		'performance.inline_stylesheets' => 'inline_stylesheets',
		'performance.compress_html'      => 'compress_html',
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
		// v0.50.15: Aesthetic groups for the Astro frontend. Each one is its
		// own wp_options row; the dispatcher merges sub-keys non-destructively.
		'share.'           => 'hatch_design_share',
		'header.'          => 'hatch_design_header',
		'reading.'         => 'hatch_design_reading',
		'images.'          => 'hatch_design_images',
		'animation.'       => 'hatch_design_animation',
		'blog_index.'      => 'hatch_design_blog_index',
		'post_navigation.' => 'hatch_design_post_navigation',
		// v0.50.13: DO NOT add 'turnstile.' here. Turnstile flows through
		// `Hatch_Integrations` (option key `hatch_integrations`) because that's
		// what `verify_turnstile()` and the frontend payload both read. The
		// dedicated handler below routes turnstile.* paths to save_group().
	);
	$top_bool = array(
		'show_credit' => 'hatch_show_credit',
	);

	// v0.5.7: batch aggregate writes. Design tab saves fire 6+ per-key
	// update_option calls against the SAME nested-group option
	// (hatch_design_brand, hatch_perf, hatch_code_snippets, etc.). Each
	// is a get→mutate→write round-trip. Buffer per-option; flush once at end.
	$aggregate_cache = array();
	$aggregate_dirty = array();
	$load_agg        = static function ( $opt_key ) use ( &$aggregate_cache ) {
		if ( ! array_key_exists( $opt_key, $aggregate_cache ) ) {
			$aggregate_cache[ $opt_key ] = (array) get_option( $opt_key, array() );
		}
		return $aggregate_cache[ $opt_key ];
	};
	$mark_agg        = static function ( $opt_key, $value ) use ( &$aggregate_cache, &$aggregate_dirty ) {
		$aggregate_cache[ $opt_key ] = $value;
		$aggregate_dirty[ $opt_key ] = true;
	};

	foreach ( $body as $path => $value ) {
		$path = (string) $path;

		// Feature flags → merge into Hatch_Features.
		if ( 0 === strpos( $path, 'features.' ) && class_exists( 'Hatch_Features' ) ) {
			$slug = substr( $path, 9 );
			Hatch_Features::update( array_merge( Hatch_Features::get_all(), array( $slug => (bool) $value ) ) );
			$applied[ $path ] = (bool) $value;
			continue;
		}

		// v0.50.16: design.md raw markdown upload/paste. Parses via
		// Hatch_Design_Loader::save() which writes both `hatch_design_md`
		// (raw source) and `hatch_design_parsed` (validated token tree).
		// Errors come back in `applied` so the UI can surface parse problems.
		// v0.50.20: sets a request-scoped flag so the post-save regenerator
		// skips re-writing `hatch_design_md` (which would clobber the user's
		// uploaded source with auto-built YAML).
		if ( 'design.md' === $path && class_exists( 'Hatch_Design_Loader' ) ) {
			$result           = Hatch_Design_Loader::save( (string) $value );
			$applied[ $path ] = array(
				'ok'     => (bool) $result['ok'],
				'errors' => isset( $result['errors'] ) ? $result['errors'] : array(),
			);
			if ( ! empty( $result['ok'] ) ) {
				// Copy the parsed values into the options the controls read, so the
				// admin, /features and /design all show the same design.
				if ( empty( $result['has_settings'] ) ) {
					$notes[ $path ]                                   = __( 'The design.md file was saved as written, but it has no settings to apply, so your colors, fonts and layout are unchanged. Add sections such as "brand:" or "layout:" to change them.', 'hatch-connect' );
					$GLOBALS['hatch_design_md_uploaded_this_request'] = true;
					continue;
				}
				$hydrated = array_merge( $hydrated, Hatch_Design_Loader::hydrate_options( $result['parsed'] ) );
				$GLOBALS['hatch_design_md_uploaded_this_request'] = true;
			} else {
				$notes[ $path ] = sprintf(
					/* translators: %s: list of problems found in the design.md file. */
					__( 'The design.md file was not applied. %s', 'hatch-connect' ),
					rtrim( implode( '; ', array_map( 'strval', (array) $result['errors'] ) ), ". \t\n" ) . '. ' . __( 'Put each key under its section, for example a line "brand:" followed by an indented line "primary: #ff0000". Accepted: brand (name, primary, accent, fg for Secondary, bg for Background, font_heading, font_body, font_mono), layout (density, rounded, max_width) and voice (tone, pronouns).', 'hatch-connect' )
				);
			}
			continue;
		}

		// Theme picker. Accepts both 'theme' (legacy) and 'design.theme' (new).
		if ( ( 'theme' === $path || 'design.theme' === $path ) && class_exists( 'Hatch_Features' ) ) {
			$slug = sanitize_key( (string) $value );
			Hatch_Features::set_theme( $slug );
			$applied[ $path ] = $slug;
			continue;
		}

		// Code snippets: the Google Tag Manager container id and nothing else.
		if ( 'snippets.gtm_id' === $path ) {
			$gtm_id   = strtoupper( trim( sanitize_text_field( (string) $value ) ) );
			$snippets = $load_agg( 'hatch_code_snippets' );
			if ( '' !== $gtm_id && 1 !== preg_match( '/^GTM-[A-Z0-9]{4,12}$/', $gtm_id ) ) {
				// Keep what was saved and say why, instead of blanking it silently.
				$gtm_id         = isset( $snippets['gtm_id'] ) ? (string) $snippets['gtm_id'] : '';
				$notes[ $path ] = __( 'The Google Tag Manager ID was not saved because it is not valid. A container ID starts with GTM and a dash, then letters and numbers.', 'hatch-connect' );
			}
			$snippets['gtm_id'] = $gtm_id;
			$mark_agg( 'hatch_code_snippets', $snippets );
			$applied[ $path ] = $gtm_id;
			continue;
		}
		if ( 0 === strpos( $path, 'snippets.' ) ) {
			continue;
		}

		// Public address of this WordPress site, for the deployed frontend to
		// read from when the admin URL is private (local or intranet). An empty
		// value clears it. Anything that is not an http(s) URL is ignored.
		if ( 'connection.wp_public_url' === $path ) {
			$public_url = trim( (string) $value );
			if ( '' === $public_url ) {
				delete_option( 'hatch_wp_public_url' );
				$applied[ $path ] = '';
			} else {
				$public_url = untrailingslashit( esc_url_raw( $public_url, array( 'http', 'https' ) ) );
				if ( '' !== $public_url ) {
					update_option( 'hatch_wp_public_url', $public_url, false );
					$applied[ $path ] = $public_url;
				}
			}
			continue;
		}

		// Image proxy URL override, string write to the same option the
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
			$clean = sanitize_text_field( (string) $value );
			if ( 'security.allowed_roles' === $path ) {
				// register_setting() callbacks never run on this route, so clean here.
				$clean = hatch_sanitize_roles_csv( $clean );
			}
			update_option( $str_options[ $path ], $clean, false );
			$applied[ $path ] = $clean;
			continue;
		}

		// Integer WP options.
		if ( isset( $int_options[ $path ] ) ) {
			// register_setting() callbacks never run on this route, so clamp here.
			$clean = 'security.bf_threshold' === $path ? hatch_sanitize_bf_limit( $value ) : hatch_sanitize_bf_window( $value );
			if ( $clean !== (int) $value ) {
				$notes[ $path ] = 'security.bf_threshold' === $path
					/* translators: %d: the number of failed attempts that was kept. */
					? sprintf( __( 'Failed attempts must be between 3 and 20, so Hatch used %d.', 'hatch-connect' ), $clean )
					/* translators: %d: the lockout window in minutes that was kept. */
					: sprintf( __( 'The lockout window must be between 5 and 240 minutes, so Hatch used %d.', 'hatch-connect' ), $clean );
			}
			update_option( $int_options[ $path ], $clean, false );
			$applied[ $path ] = $clean;
			continue;
		}

		// WordPress clean-up switches (Performance tab).
		if ( class_exists( 'Hatch_Performance_Bloat' ) && 'performance.bloat_kill' === $path ) {
			update_option( Hatch_Performance_Bloat::OPT_MASTER, rest_sanitize_boolean( $value ) ? 1 : 0 );
			$applied[ $path ] = rest_sanitize_boolean( $value );
			continue;
		}
		if ( class_exists( 'Hatch_Performance_Bloat' ) && 0 === strpos( $path, 'performance.bloat.' ) ) {
			$bloat_slug = substr( $path, strlen( 'performance.bloat.' ) );
			if ( isset( Hatch_Performance_Bloat::killers()[ $bloat_slug ] ) ) {
				$bloat_items                = (array) get_option( Hatch_Performance_Bloat::OPT_ITEMS, array() );
				$bloat_items[ $bloat_slug ] = rest_sanitize_boolean( $value ) ? 1 : 0;
				update_option( Hatch_Performance_Bloat::OPT_ITEMS, $bloat_items );
				$applied[ $path ] = (bool) $bloat_items[ $bloat_slug ];
			}
			continue;
		}

		// Performance struct.
		if ( isset( $perf_keys[ $path ] ) ) {
			$sub  = $perf_keys[ $path ];
			$perf = $load_agg( 'hatch_perf' );
			if ( in_array( $sub, array( 'prefetch_enabled', 'compress_html' ), true ) ) {
				$perf[ $sub ] = (bool) $value ? 1 : 0;
			} else {
				$perf[ $sub ] = sanitize_text_field( (string) $value );
			}
			$mark_agg( 'hatch_perf', $perf );
			$applied[ $path ] = $perf[ $sub ];
			continue;
		}

		// Top-level booleans.
		if ( isset( $top_bool[ $path ] ) ) {
			update_option( $top_bool[ $path ], (bool) $value, false );
			$applied[ $path ] = (bool) $value;
			continue;
		}

		// v0.50.13: Turnstile keys and sub-toggles route through
		// `Hatch_Integrations` (option `hatch_integrations`) because that's
		// what verify_turnstile() and the public /features payload both read.
		// Writing to a new key (`hatch_turnstile`) made saves a no-op.
		// `enabled` flips on automatically when keys + any sub-toggle present.
		if ( 0 === strpos( $path, 'turnstile.' ) && class_exists( 'Hatch_Integrations' ) ) {
			$sub = substr( $path, 10 );
			$all = Hatch_Integrations::get_all();
			$ts  = (array) ( $all['turnstile'] ?? array() );
			if ( in_array( $sub, array( 'site_key', 'secret_key' ), true ) ) {
				$ts[ $sub ] = sanitize_text_field( (string) $value );
			}
			// Auto-enable when both keys present, regardless of UI surface.
			$ts['enabled'] = ! empty( $ts['site_key'] ) && ! empty( $ts['secret_key'] );
			Hatch_Integrations::save_group( 'turnstile', $ts );
			$applied[ $path ] = $ts[ $sub ] ?? null;
			continue;
		}
		// v0.50.31: Comments master toggle mirrors into Hatch_Features so the
		// existing `hasFeature(features, 'comments')` gate (used by
		// blog/[slug].astro and per-theme Single.astro) actually changes
		// when the user flips the Content tab switch. Was a zombie before.
		// v0.50.31: Comments site-wide kill switch via Core Sync.
		// Path: `core.default_comment_status` with value = 'open' | 'closed'.
		if ( 'core.default_comment_status' === $path ) {
			$v = ( 'closed' === (string) $value ) ? 'closed' : 'open';
			update_option( 'default_comment_status', $v );
			$applied[ $path ] = $v;
			continue;
		}
		// v0.50.31: Menu assignment via Core Sync inline picker.
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
			Hatch_Features::update(
				array_merge(
					Hatch_Features::get_all(),
					array( 'comments' => (bool) $value )
				)
			);
			// Fall through to also save the UI-state copy in hatch_content_flags.
		}
		// v0.50.14: comments_turnstile sub-toggle mirrors into
		// hatch_integrations.comments.turnstile so verify_turnstile() sees it.
		// Forms removed entirely (no Hatch-owned form bridge anymore).
		if ( 'content.comments_turnstile' === $path && class_exists( 'Hatch_Integrations' ) ) {
			$all            = Hatch_Integrations::get_all();
			$c              = (array) ( $all['comments'] ?? array() );
			$c['turnstile'] = (bool) $value;
			Hatch_Integrations::save_group( 'comments', $c );
			// Fall through so the UI-state copy in hatch_content_flags also persists.
		}

		// Nested groups (prefix match).
		foreach ( $nested_groups as $prefix => $opt_key ) {
			if ( 0 === strpos( $path, $prefix ) ) {
				$sub   = substr( $path, strlen( $prefix ) );
				$store = $load_agg( $opt_key );
				// Colour fields reach the frontend stylesheet, so they must be
				// a hex colour. Anything else keeps the stored value.
				if ( ( 'hatch_design_brand' === $opt_key && in_array( $sub, array( 'primary', 'secondary', 'accent', 'background', 'fg', 'bg' ), true ) )
					|| ( 'hatch_design_borders' === $opt_key && 'color' === $sub ) ) {
					$hex = sanitize_hex_color( (string) $value );
					if ( empty( $hex ) ) {
						$applied[ $path ] = isset( $store[ $sub ] ) ? $store[ $sub ] : '';
						continue 2;
					}
					$store[ $sub ] = $hex;
					$mark_agg( $opt_key, $store );
					$applied[ $path ] = $hex;
					continue 2;
				}
				if ( is_bool( $value ) ) {
					$store[ $sub ] = (bool) $value;
				} elseif ( is_int( $value ) || is_float( $value ) ) {
					$store[ $sub ] = $value + 0;
				} else {
					$store[ $sub ] = sanitize_text_field( (string) $value );
				}
				$mark_agg( $opt_key, $store );
				$applied[ $path ] = $store[ $sub ];
				continue 2;
			}
		}
	}

	// One protection, one answer: write every name a protection has, and when
	// Fortress Mode was what held the others on, keep them on.
	$twin_values = array();
	foreach ( hatch_twin_groups() as $fk => $group ) {
		foreach ( $group['paths'] as $tp ) {
			if ( array_key_exists( $tp, $body ) ) {
				$twin_values[ $fk ] = rest_sanitize_boolean( $body[ $tp ] );
			}
		}
	}
	foreach ( $twin_values as $fk => $tv ) {
		hatch_twin_write( $fk, $tv, $hydrated );
	}
	$sent_off = false;
	$sent_key = array();
	foreach ( hatch_fortress_keys() as $fk ) {
		$fp = 'security.fortress_' . $fk;
		if ( array_key_exists( $fp, $body ) || isset( $twin_values[ $fk ] ) ) {
			$sent_key[ $fk ] = true;
			$fv              = isset( $twin_values[ $fk ] ) ? $twin_values[ $fk ] : rest_sanitize_boolean( $body[ $fp ] );
			if ( ! $fv ) {
				$sent_off = true;
			}
		}
	}
	if ( get_option( 'hatch_fortress_mode', false ) && $sent_off && ! array_key_exists( 'security.fortress_mode', $body ) ) {
		update_option( 'hatch_fortress_mode', 0 );
		$hydrated['security.fortress_mode'] = false;
	}
	if ( $mode_before && ! get_option( 'hatch_fortress_mode', false ) ) {
		foreach ( hatch_fortress_keys() as $fk ) {
			if ( empty( $sent_key[ $fk ] ) && ! empty( $fortress_before[ $fk ] ) && ! get_option( 'hatch_fortress_' . $fk, false ) ) {
				update_option( 'hatch_fortress_' . $fk, 1 );
				$hydrated[ 'security.fortress_' . $fk ] = true;
			}
		}
	}

	// v0.5.7: Flush deferred aggregate writes. One update_option per touched
	// option key, regardless of how many sub-keys the React admin sent.
	foreach ( $aggregate_dirty as $opt_key => $_true ) {
		update_option( $opt_key, $aggregate_cache[ $opt_key ], false );
	}

	// v0.50.11: CRITICAL: every React save writes to scattered new option keys
	// (hatch_design_brand, hatch_design_voice, etc.) but the
	// Astro frontend reads from the consolidated `hatch_design_parsed` + the
	// YAML `hatch_design_md`. Without this regeneration step the dashboard
	// shows the save but the frontend never picks it up.
	$touched_design = false;
	foreach ( array_keys( $applied ) as $p ) {
		if ( 0 === strpos( $p, 'design.' ) || 0 === strpos( $p, 'voice.' ) || 0 === strpos( $p, 'templates.' )
			|| 0 === strpos( $p, 'borders.' ) || 0 === strpos( $p, 'breakpoints.' ) || 0 === strpos( $p, 'identity.' )
			|| 0 === strpos( $p, 'share.' ) || 0 === strpos( $p, 'header.' )
			|| 0 === strpos( $p, 'reading.' ) || 0 === strpos( $p, 'images.' )
			|| 0 === strpos( $p, 'animation.' ) || 0 === strpos( $p, 'blog_index.' )
			|| 0 === strpos( $p, 'post_navigation.' ) || 'theme' === $p ) {
			$touched_design = true;
		}
	}
	// v0.50.20: Skip the regenerator entirely when design.md was uploaded
	// in this same request. `Hatch_Design_Loader::save()` already wrote the
	// authoritative `hatch_design_parsed` + `hatch_design_md`; running the
	// regenerator on top would overwrite both with merged-defaults + scattered
	// options, discarding the user's MD-defined brand / layout values.
	if ( $touched_design && empty( $GLOBALS['hatch_design_md_uploaded_this_request'] ) ) {
		hatch_regenerate_design_artifacts();
	}

	if ( ! empty( $applied ) && class_exists( 'Hatch_Revalidate' ) ) {
		Hatch_Revalidate::trigger( 'react-admin-save' );
	}

	return new WP_REST_Response(
		array(
			'ok'       => true,
			'applied'  => $applied,
			'notes'    => $notes,
			'hydrated' => $hydrated,
		),
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

	$brand     = (array) get_option( 'hatch_design_brand', array() );
	$layout    = (array) get_option( 'hatch_design_layout', array() );
	$voice     = (array) get_option( 'hatch_design_voice', array() );
	$templates = (array) get_option( 'hatch_design_templates', array() );

	// Top-level scalars that React writes outside the nested groups.
	$brand['font_heading'] = (string) get_option( 'hatch_design_font_heading', 'Inter' );
	$brand['font_body']    = (string) get_option( 'hatch_design_font_body', 'Inter' );
	$brand['font_mono']    = (string) get_option( 'hatch_design_font_mono', 'JetBrains Mono' );

	// The Design tab stores Secondary and Background; the frontend reads fg and bg.
	$brand = Hatch_Design_Loader::normalize_brand( $brand );

	$parsed = array(
		'brand'     => array_merge( $defaults['brand'], $brand ),
		'layout'    => array_merge( $defaults['layout'], $layout ),
		'voice'     => array_merge( $defaults['voice'], $voice ),
		'templates' => array_merge( $defaults['templates'], $templates ),
		'body'      => isset( $defaults['body'] ) ? $defaults['body'] : '',
	);
	update_option( 'hatch_design_parsed', $parsed, false );

	// v0.50.20: Regenerate the YAML frontmatter that some Astro starters read
	// directly. SKIPPED when the user just uploaded their own design.md ,
	// `Hatch_Design_Loader::save()` already wrote `hatch_design_md` with the
	// user's source; clobbering it here would discard whatever they uploaded
	// (comments, ordering, body content beyond the frontmatter).
	$user_md_just_saved = ! empty( $GLOBALS['hatch_design_md_uploaded_this_request'] );
	if ( ! $user_md_just_saved ) {
		$yaml = "---\n";
		foreach ( array( 'brand', 'layout', 'voice', 'templates' ) as $section ) {
			$yaml .= $section . ":\n";
			foreach ( $parsed[ $section ] as $k => $v ) {
				$val   = is_string( $v ) ? '"' . addslashes( $v ) . '"' : ( is_bool( $v ) ? ( $v ? 'true' : 'false' ) : $v );
				$yaml .= "  {$k}: {$val}\n";
			}
		}
		$yaml .= "---\n";
		update_option( 'hatch_design_md', $yaml, false );
	}
}

/**
 * Read-only status rows for the Status tab.
 *
 * Every label is plain language. Internal option names are not shown.
 *
 * @return array{sections:array<int,array<string,mixed>>}
 */
function hatch_react_status_snapshot(): array {
	$hosting_model = (string) get_option( 'hatch_hosting_model', '' );
	$frontend_url  = (string) get_option( 'hatch_frontend_url', '' );
	$img_proxy     = (string) get_option( 'hatch_image_proxy_url', '' );
	$not_set       = __( 'Not set', 'hatch-connect' );

	$sections = array(
		array(
			'label' => __( 'Frontend', 'hatch-connect' ),
			'rows'  => array(
				array(
					'label' => __( 'Frontend address', 'hatch-connect' ),
					'value' => '' !== $frontend_url ? $frontend_url : $not_set,
					'type'  => 'text',
				),
				array(
					'label' => __( 'Image address', 'hatch-connect' ),
					'value' => '' !== $img_proxy ? $img_proxy : $not_set,
					'type'  => 'text',
				),
				array(
					'label' => __( 'Hosted on', 'hatch-connect' ),
					'value' => '' !== $hosting_model ? hatch_host_label( $hosting_model ) : $not_set,
					'type'  => 'text',
				),
			),
		),
		array(
			'label' => __( 'Authentication', 'hatch-connect' ),
			'rows'  => array(
				array(
					'label' => __( 'Webhook secret created', 'hatch-connect' ),
					'type'  => '' !== (string) get_option( 'hatch_webhook_secret', '' ) ? 'on' : 'off',
				),
			),
		),
		array(
			'label' => __( 'Security', 'hatch-connect' ),
			'rows'  => array(
				array(
					'label' => __( 'Lock the REST API', 'hatch-connect' ),
					'type'  => get_option( 'hatch_security_harden_rest' ) ? 'on' : 'off',
				),
				array(
					'label' => __( 'Old remote access closed', 'hatch-connect' ),
					'type'  => hatch_fortress_effective( 'block_xmlrpc' ) ? 'on' : 'off',
				),
				array(
					'label' => __( 'Usernames hidden', 'hatch-connect' ),
					'type'  => hatch_fortress_effective( 'disable_rest_users' ) ? 'on' : 'off',
				),
				array(
					'label' => __( 'Keep this site out of search results', 'hatch-connect' ),
					'type'  => get_option( 'hatch_security_force_noindex' ) ? 'on' : 'off',
				),
			),
		),
		array(
			'label' => __( 'Plugin', 'hatch-connect' ),
			'rows'  => array(
				array(
					'label' => __( 'Hatch version', 'hatch-connect' ),
					'value' => HATCH_VERSION,
					'type'  => 'text',
				),
				array(
					'label' => __( 'WordPress version', 'hatch-connect' ),
					'value' => get_bloginfo( 'version' ),
					'type'  => 'text',
				),
				array(
					'label' => __( 'PHP version', 'hatch-connect' ),
					'value' => PHP_VERSION,
					'type'  => 'text',
				),
			),
		),
	);

	$bridge   = hatch_react_plugin_bridge();
	$detected = array_filter(
		$bridge,
		static function ( $b ) {
			return ! empty( $b['detected'] );
		}
	);
	$found    = array();
	foreach ( $detected as $b ) {
		$found[] = (string) ( isset( $b['providerName'] ) ? $b['providerName'] : '' );
	}
	$found      = array_values( array_filter( array_unique( $found ) ) );
	$sections[] = array(
		'label' => __( 'Plugin connections', 'hatch-connect' ),
		'rows'  => array(
			array(
				'label' => __( 'Plugins Hatch is using', 'hatch-connect' ),
				'value' => $found ? implode( ', ', $found ) : __( 'None found', 'hatch-connect' ),
				'type'  => $found ? 'text' : 'warn',
			),
		),
	);

	$last_revalidate = (int) get_option( 'hatch_last_revalidate_at', 0 );
	$cron_disabled   = defined( 'DISABLE_WP_CRON' ) && DISABLE_WP_CRON;
	$sections[]      = array(
		'label' => __( 'Sync', 'hatch-connect' ),
		'rows'  => array(
			array(
				'label' => __( 'Last time the frontend was told to refresh', 'hatch-connect' ),
				'value' => $last_revalidate > 0
					/* translators: %s: how long ago, for example "3 mins". */
					? sprintf( __( '%s ago', 'hatch-connect' ), human_time_diff( $last_revalidate ) )
					: __( 'Never', 'hatch-connect' ),
				'type'  => $last_revalidate > 0 ? 'num' : 'warn',
			),
			array(
				'label' => __( 'Scheduled tasks', 'hatch-connect' ),
				'value' => $cron_disabled ? __( 'WP-Cron is off. A server cron must run it.', 'hatch-connect' ) : __( 'Run by WP-Cron', 'hatch-connect' ),
				'type'  => $cron_disabled ? 'warn' : 'text',
			),
			array(
				'label' => __( 'Refresh the frontend when you publish', 'hatch-connect' ),
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
	// The hatch mark as a single-colour SVG data URI; WordPress recolours it for every admin colour scheme.
	$icon_svg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIj48ZyBmaWxsPSIjYTdhYWFkIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLjQwIDEuMDkpIHNjYWxlKDAuMDQ1NTcpIHRyYW5zbGF0ZSgtMjA4LjcgLTEyNS43KSI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMjU2LjAwIDUxNi4xN0MyNDcuMTEgNTE0Ljk4IDIzNi4yMiA1MTAuNTcgMjI5Ljg1IDUwNS41NkMyMTguOTYgNDk3LjAwIDIxMi40OSA0ODYuMzggMjA5LjYyIDQ3Mi4zM0wyMDguODMgNDY4LjUwTDIwOC44MyAzOTQuMDBMMjA4LjgzIDMxOS41MEwyMDkuNjEgMzE2LjE3QzIxMi42NiAzMDMuMDQgMjE4LjkwIDI5Mi42NiAyMjguMjUgMjg1LjE3QzIzNS45MCAyNzkuMDQgMjQyLjU1IDI3NS44NSAyNTIuMzMgMjczLjYzTDI1NS44MyAyNzIuODNMMjkxLjUwIDI3Mi44M0wzMjcuMTcgMjcyLjgzTDMyOS4zMyAyNzMuNDJDMzM3Ljg0IDI3NS43NCAzNDMuNjAgMjgxLjYyIDM0NS40NiAyODkuOTBMMzQ2LjAwIDI5Mi4zMEwzNDYuMDAgMzE5Ljg0TDM0Ni4wMCAzNDcuMzlMMzQ2LjY5IDM1MC4wOEMzNDkuMDEgMzU5LjE3IDM1NC45MiAzNjUuNTggMzYzLjk4IDM2OC44MUwzNjYuODMgMzY5LjgzTDQyMC4xNyAzNjkuOTJMNDczLjUwIDM3MC4wMUw0NzUuODkgMzY5LjUyQzQ4NS45MCAzNjcuNDUgNDk0LjIyIDM1OC45NCA0OTYuMTcgMzQ4Ljc5TDQ5Ni42NyAzNDYuMTdMNDk2LjY3IDMxOS4yOUw0OTYuNjcgMjkyLjQxTDQ5Ny40NSAyODkuMzlMNDk4LjIzIDI4Ni4zOEw0OTkuNjggMjgzLjg1QzUwMi41MCAyNzguOTIgNTA2LjQ5IDI3NS42NSA1MTIuMTkgMjczLjU4TDUxNS4xNyAyNzIuNTBMNTQ2LjgzIDI3Mi40MEw1NzguNTAgMjcyLjI5TDU4Mi4xNCAyNzIuNjZDNTk0LjE0IDI3My44OSA2MDMuNDIgMjc3Ljg2IDYxMi40MSAyODUuNjJDNjE2Ljc2IDI4OS4zOCA2MTguNTAgMjkxLjMwIDYyMS4wNiAyOTUuMTZDNjI1LjQyIDMwMS43MyA2MjguMTYgMzA4LjU1IDYyOS41MSAzMTYuMTdMNjMwLjA0IDMxOS4xN0w2MzAuMDAgMzkzLjMwTDYyOS45NyA0NjcuNDJMNjI5LjMzIDQ3MS4xM0M2MjcuNTYgNDgxLjM4IDYyMi40NSA0OTEuNDQgNjE1LjE3IDQ5OC45NkM2MDUuMTkgNTA5LjI3IDU5My44NyA1MTQuOTEgNTgwLjI2IDUxNi4zM0w1NzcuMDMgNTE2LjY3TDQxOC4xMCA1MTYuNjNMMjU5LjE3IDUxNi41OUwyNTYuMDAgNTE2LjE3WiIvPjxwYXRoIGQ9Ik0zNzcuNzEgMjY5LjY2QzM3Ni45MiAyNjkuNDkgMzc2LjA5IDI2OS4yMiAzNzUuODggMjY5LjA1QzM3NS42NyAyNjguODkgMzc0LjkwIDI2OC41NiAzNzQuMTcgMjY4LjMzQzM2OC42NSAyNjYuNTggMzYxLjY5IDI1OS45NCAzNTkuODIgMjU0LjYzQzM1OS41OCAyNTMuOTQgMzU5LjE1IDI1My4wMyAzNTguODcgMjUyLjYwQzM1OC41OSAyNTIuMTcgMzU4LjE5IDI1MS4wMCAzNTcuOTkgMjUwLjAwQzM1Ny43OCAyNDguOTkgMzU3LjI1IDI0Ny4wNiAzNTYuODEgMjQ1LjcxQzM1Ni4zNiAyNDQuMzYgMzU2LjAwIDI0My4wNCAzNTYuMDAgMjQyLjc3QzM1Ni4wMCAyNDIuNTAgMzU1LjY0IDI0MS4yMCAzNTUuMTkgMjM5Ljg5QzM1NC43NSAyMzguNTggMzU0LjIxIDIzNi42MCAzNTMuOTkgMjM1LjUwQzM1My43NyAyMzQuNDAgMzUzLjMxIDIzMi44NiAzNTIuOTUgMjMyLjA3QzM1Mi42MCAyMzEuMjkgMzUyLjE1IDIyOS43OSAzNTEuOTYgMjI4Ljc1QzM1MS43NiAyMjcuNzEgMzUxLjMzIDIyNi4zMiAzNTEuMDAgMjI1LjY2QzM1MC42NiAyMjUuMDAgMzUwLjIxIDIyMy41MSAzNTAuMDAgMjIyLjMzQzM0OS43OSAyMjEuMTYgMzQ5LjM1IDIxOS42NyAzNDkuMDIgMjE5LjAyQzM0OC42OSAyMTguMzcgMzQ4LjIzIDIxNy4wMSAzNDguMDAgMjE2LjAwQzM0Ny43NyAyMTQuOTkgMzQ3LjM3IDIxMy43NiAzNDcuMTIgMjEzLjI2QzM0Ni44NyAyMTIuNzcgMzQ2LjQ0IDIxMS4zMCAzNDYuMTcgMjEwLjAwQzM0NS44OSAyMDguNzAgMzQ1LjQ2IDIwNy4yMyAzNDUuMjAgMjA2LjcyQzM0NC45NCAyMDYuMjIgMzQ0LjQ4IDIwNC42NCAzNDQuMTggMjAzLjIwQzM0My44OSAyMDEuNzcgMzQzLjQxIDIwMC4xNCAzNDMuMTIgMTk5LjU4QzM0MS4zOSAxOTYuMjQgMzQwLjg1IDE4Ny40MSAzNDIuMDMgMTgxLjg4QzM0NC4yMCAxNzEuNjggMzUyLjg0IDE2My4wNSAzNjMuNTAgMTYwLjQ0QzM2NC42MCAxNjAuMTYgMzY2LjE4IDE1OS43MiAzNjcuMDAgMTU5LjQ1QzM2Ny44MiAxNTkuMTcgMzY5LjkzIDE1OC42MSAzNzEuNjcgMTU4LjIwQzM3My40MSAxNTcuNzkgMzc1LjE0IDE1Ny4yOSAzNzUuNTEgMTU3LjA5QzM3NS44OSAxNTYuODkgMzc3LjMxIDE1Ni40MiAzNzguNjggMTU2LjA0QzM4MC4wNSAxNTUuNjcgMzgyLjEwIDE1NS4wNiAzODMuMjUgMTU0LjY5QzM4NC40MCAxNTQuMzEgMzg2LjI3IDE1My42OSAzODcuNDIgMTUzLjMxQzM4OC41NiAxNTIuOTQgMzkwLjYyIDE1Mi40MCAzOTEuOTggMTUyLjEyQzM5My4zNCAxNTEuODUgMzk0Ljg3IDE1MS40MCAzOTUuMzggMTUxLjE0QzM5NS44OCAxNTAuODggMzk3LjQ3IDE1MC4zOCAzOTguOTAgMTUwLjAyQzQwMS40MCAxNDkuMzkgNDA0LjE0IDE0OC41NiA0MDcuMzMgMTQ3LjQ2QzQwOC4xNiAxNDcuMTcgNDEwLjI2IDE0Ni41MiA0MTIuMDAgMTQ2LjAwQzQxMy43NCAxNDUuNDggNDE1Ljc3IDE0NC44MyA0MTYuNTAgMTQ0LjU1QzQxNy4yMyAxNDQuMjYgNDE4LjI4IDE0NC4wMiA0MTguODMgMTQ0LjAxQzQxOS4zOCAxNDQuMDAgNDIwLjYwIDE0My42NCA0MjEuNTMgMTQzLjIwQzQyMi40NyAxNDIuNzcgNDI0LjAyIDE0Mi4yNCA0MjQuOTcgMTQyLjA0QzQyNS45MyAxNDEuODMgNDI3LjM3IDE0MS4zNiA0MjguMTkgMTQwLjk5QzQyOS4wMCAxNDAuNjIgNDMwLjQyIDE0MC4xNyA0MzEuMzMgMTQwLjAwQzQzMi4yNSAxMzkuODMgNDMzLjQ5IDEzOS40MyA0MzQuMDggMTM5LjEyQzQzNS4xNiAxMzguNTUgNDM4LjQxIDEzNy41OCA0NDMuNDQgMTM2LjMyQzQ0NC44NyAxMzUuOTYgNDQ2LjQ3IDEzNS40NCA0NDcuMDEgMTM1LjE2QzQ0Ny41NCAxMzQuODkgNDQ5LjAzIDEzNC40NCA0NTAuMzMgMTM0LjE3QzQ1MS42MiAxMzMuOTAgNDUzLjI1IDEzMy4zOSA0NTMuOTMgMTMzLjAzQzQ1NC42MiAxMzIuNjggNDU2LjA0IDEzMi4yNCA0NTcuMDggMTMyLjA0QzQ1OC4xMiAxMzEuODUgNDU5LjU1IDEzMS40MCA0NjAuMjUgMTMxLjA0QzQ2MC45NSAxMzAuNjkgNDYyLjM0IDEzMC4yNCA0NjMuMzQgMTMwLjA2QzQ2NC4zNSAxMjkuODcgNDY1Ljk5IDEyOS4zMyA0NjcuMDAgMTI4Ljg2QzQ2OC4wMSAxMjguMzkgNDY5LjMwIDEyOC4wMSA0NjkuODcgMTI4LjAwQzQ3MC40NCAxMjguMDAgNDcyLjI3IDEyNy41NSA0NzMuOTIgMTI3LjAxQzQ3OS41OSAxMjUuMTQgNDg2LjU1IDEyNS4yOCA0OTEuMjAgMTI3LjM1QzQ5Ni4wNiAxMjkuNTAgNDk3LjEyIDEzMC4xOSA1MDAuMTQgMTMzLjE3QzUwNC4zMCAxMzcuMjYgNTA3LjQwIDE0Mi43NCA1MDguMDEgMTQ3LjA4QzUwOC4xOSAxNDguMzQgNTA4LjYzIDE0OS45NCA1MDguOTkgMTUwLjY0QzUwOS4zNSAxNTEuMzQgNTA5Ljc4IDE1Mi44MiA1MDkuOTYgMTUzLjkzQzUxMC4xNCAxNTUuMDMgNTEwLjU5IDE1Ni41MyA1MTAuOTYgMTU3LjI2QzUxMS4zMyAxNTcuOTkgNTExLjc5IDE1OS41MyA1MTEuOTggMTYwLjY4QzUxMi4xNiAxNjEuODMgNTEyLjYxIDE2My41NCA1MTIuOTYgMTY0LjQ3QzUxMy4zMiAxNjUuNDAgNTEzLjkyIDE2Ny4zNyA1MTQuMjggMTY4LjgzQzUxNC42NSAxNzAuMzAgNTE1LjM5IDE3My4wOCA1MTUuOTMgMTc1LjAwQzUxNi40NyAxNzYuOTIgNTE3LjE4IDE3OS41NSA1MTcuNTEgMTgwLjgzQzUxNy44MyAxODIuMTIgNTE4LjUzIDE4NC40NyA1MTkuMDUgMTg2LjA1QzUxOS41NyAxODcuNjQgNTIwLjAwIDE4OS40NCA1MjAuMDEgMTkwLjA1QzUyMC4wMSAxOTAuNjcgNTIwLjI5IDE5MS43OCA1MjAuNjQgMTkyLjU0QzUyMC45OCAxOTMuMjkgNTIxLjUxIDE5NS4wMCA1MjEuODEgMTk2LjMzQzUyMi4xMSAxOTcuNjYgNTIyLjU5IDE5OS4yMCA1MjIuODggMTk5Ljc1QzUyMy41MCAyMDAuOTUgNTI0LjY3IDIwNy40NSA1MjQuNjcgMjA5LjcxQzUyNC42NyAyMTIuNzUgNTIzLjY5IDIxOC4wNyA1MjIuODYgMjE5LjQ5QzUyMi40NCAyMjAuMjMgNTIxLjk3IDIyMS4yMSA1MjEuODMgMjIxLjY3QzUyMS4zMSAyMjMuMzkgNTE3LjI4IDIyOC45OCA1MTUuNzIgMjMwLjEzQzUxNC44NyAyMzAuNzcgNTEzLjQ5IDIzMS44MCA1MTIuNjcgMjMyLjQxQzUxMC40NSAyMzQuMDYgNTA2LjQwIDIzNS45MCA1MDQuNTAgMjM2LjEyQzUwMy41OCAyMzYuMjIgNTAxLjkzIDIzNi42OSA1MDAuODMgMjM3LjE1QzQ5OS43MyAyMzcuNjEgNDk4LjUzIDIzNy45OSA0OTguMTYgMjM3Ljk5QzQ5Ny44MCAyMzguMDAgNDk2LjE3IDIzOC40NSA0OTQuNTUgMjM5LjAwQzQ5Mi45NCAyMzkuNTUgNDkxLjIxIDI0MC4wMSA0OTAuNzIgMjQwLjAxQzQ5MC4yMyAyNDAuMDIgNDg5LjIzIDI0MC4yNiA0ODguNTAgMjQwLjU0QzQ4Ny43NyAyNDAuODMgNDg1LjgyIDI0MS40MCA0ODQuMTcgMjQxLjgyQzQ4Mi41MiAyNDIuMjQgNDgwLjY0IDI0Mi44MiA0ODAuMDAgMjQzLjEwQzQ3OS4zNSAyNDMuMzggNDc3Ljg2IDI0My43OCA0NzYuNjggMjQ0LjAwQzQ3NS41MCAyNDQuMjEgNDc0LjAwIDI0NC42NiA0NzMuMzUgMjQ0Ljk5QzQ3Mi43MCAyNDUuMzIgNDcxLjI5IDI0NS43NyA0NzAuMjMgMjQ1Ljk5QzQ2OS4xNiAyNDYuMjEgNDY3LjY2IDI0Ni42NyA0NjYuOTAgMjQ3LjAwQzQ2Ni4xMyAyNDcuMzQgNDY0LjU2IDI0Ny43OCA0NjMuNDEgMjQ3Ljk5QzQ2Mi4yNSAyNDguMjAgNDYwLjY1IDI0OC42NSA0NTkuODMgMjQ5LjAwQzQ1OS4wMiAyNDkuMzUgNDU3LjQxIDI0OS43OSA0NTYuMjYgMjQ5Ljk5QzQ1NS4xMSAyNTAuMTkgNDUzLjU0IDI1MC41OCA0NTIuNzcgMjUwLjg2QzQ1Mi4wMCAyNTEuMTUgNDUwLjI3IDI1MS42NSA0NDguOTMgMjUxLjk5QzQ0Ny41OSAyNTIuMzIgNDQ1LjY0IDI1Mi45MSA0NDQuNTkgMjUzLjMwQzQ0My41NCAyNTMuNjggNDQyLjMwIDI1NC4wMCA0NDEuODMgMjU0LjAwQzQ0MS4zNiAyNTQuMDAgNDQwLjEwIDI1NC4zNyA0MzkuMDMgMjU0LjgyQzQzNy45NiAyNTUuMjcgNDM2LjA3IDI1NS44MCA0MzQuODMgMjU2LjAwQzQzMy42MCAyNTYuMjAgNDMyLjEyIDI1Ni42MCA0MzEuNTYgMjU2Ljg5QzQzMS4wMCAyNTcuMTggNDI5LjMzIDI1Ny43NiA0MjcuODUgMjU4LjE4QzQyNi4zOCAyNTguNTkgNDI0LjU3IDI1OS4xNyA0MjMuODMgMjU5LjQ1QzQyMy4xMCAyNTkuNzQgNDIyLjE3IDI1OS45OCA0MjEuNzYgMjU5Ljk5QzQyMS4zNSAyNTkuOTkgNDIwLjA0IDI2MC4zNyA0MTguODQgMjYwLjgyQzQxNy42NCAyNjEuMjcgNDE1LjczIDI2MS44MSA0MTQuNjAgMjYyLjAxQzQxMy40NiAyNjIuMjIgNDEyLjE1IDI2Mi41OCA0MTEuNjggMjYyLjgxQzQxMS4yMSAyNjMuMDUgNDA5LjcxIDI2My41MSA0MDguMzMgMjYzLjgzQzQwNi45NiAyNjQuMTYgNDA1LjQzIDI2NC42MyA0MDQuOTMgMjY0Ljg4QzQwNC40MyAyNjUuMTMgNDAzLjAxIDI2NS41NiA0MDEuNzYgMjY1LjgzQzQwMC41MiAyNjYuMDkgMzk4LjQ1IDI2Ni42OSAzOTcuMTcgMjY3LjE1QzM5NS44OCAyNjcuNjEgMzk0LjQ5IDI2Ny45OSAzOTQuMDggMjY3Ljk5QzM5My42NiAyNjguMDAgMzkyLjM5IDI2OC4zOSAzOTEuMjQgMjY4Ljg4TDM4OS4xNyAyNjkuNzVMMzg0LjE3IDI2OS44NkMzODEuNDIgMjY5LjkyIDM3OC41MSAyNjkuODMgMzc3LjcxIDI2OS42NloiLz48L2c+PC9zdmc+';
	add_menu_page(
		__( 'Hatch', 'hatch-connect' ),
		__( 'Hatch', 'hatch-connect' ),
		'manage_options',
		'hatch',
		'hatch_render_admin_page',
		$icon_svg,
		3 // Directly under Dashboard.
	);
}

/**
 * Keep the Hatch menu item highlighted on the hidden setup guide page.
 *
 * The guide is a hidden page under options.php, and WordPress picks the parent
 * menu from that registration after the parent_file filter has run. The mapping
 * is set on the page load hook, which fires after the access check, so the page
 * stays reachable only for people who may open it.
 *
 * @return void
 */
function hatch_setup_menu_parent(): void {
	global $_wp_real_parent_file;
	$_wp_real_parent_file['options.php'] = 'hatch'; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- WordPress menu parent mapping.
}
add_action( 'load-admin_page_hatch-setup', 'hatch_setup_menu_parent' );

/**
 * Add a Settings link to the Hatch row on the Plugins screen.
 *
 * @param array<int|string, string> $links Existing action links.
 * @return array<int|string, string>
 */
function hatch_plugin_action_links( $links ): array {
	$links = (array) $links;
	if ( current_user_can( 'manage_options' ) ) {
		array_unshift(
			$links,
			'<a href="' . esc_url( admin_url( 'admin.php?page=hatch' ) ) . '">' . esc_html__( 'Settings', 'hatch-connect' ) . '</a>'
		);
	}
	return $links;
}

/**
 * Register settings with sanitization callbacks.
 *
 * @return void
 */
function hatch_register_settings(): void {
	register_setting(
		'hatch_settings',
		'hatch_revalidate_endpoint',
		array(
			'type'              => 'string',
			'sanitize_callback' => 'esc_url_raw',
		)
	);
	register_setting(
		'hatch_settings',
		'hatch_revalidate_post_types',
		array(
			'type'              => 'string',
			'sanitize_callback' => 'hatch_sanitize_post_type_csv',
		)
	);
	register_setting(
		'hatch_settings',
		'hatch_image_proxy_url',
		array(
			'type'              => 'string',
			'sanitize_callback' => 'esc_url_raw',
		)
	);

	// v0.47. menu picker (Connector tab → Menus card).
	register_setting(
		'hatch_settings',
		'hatch_menu_primary_id',
		array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
		)
	);
	register_setting(
		'hatch_settings',
		'hatch_menu_footer_id',
		array(
			'type'              => 'integer',
			'sanitize_callback' => 'absint',
		)
	);

	// Security toggles.
	register_setting(
		'hatch_settings',
		'hatch_security_harden_rest',
		array(
			'type'              => 'boolean',
			'sanitize_callback' => 'rest_sanitize_boolean',
		)
	);
	register_setting(
		'hatch_settings',
		'hatch_security_disable_xmlrpc',
		array(
			'type'              => 'boolean',
			'sanitize_callback' => 'rest_sanitize_boolean',
		)
	);
	register_setting(
		'hatch_settings',
		'hatch_security_block_user_enum',
		array(
			'type'              => 'boolean',
			'sanitize_callback' => 'rest_sanitize_boolean',
		)
	);
	register_setting(
		'hatch_settings',
		'hatch_security_force_noindex',
		array(
			'type'              => 'boolean',
			'sanitize_callback' => 'rest_sanitize_boolean',
		)
	);
	// v0.49.5. uninstall lifecycle opt-in (default 0 = preserve everything).
	register_setting(
		'hatch_settings',
		'hatch_uninstall_remove_all_data',
		array(
			'type'              => 'boolean',
			'sanitize_callback' => 'rest_sanitize_boolean',
		)
	);

	// Login hardening.
	register_setting(
		'hatch_settings',
		'hatch_login_role_guard_enabled',
		array(
			'type'              => 'boolean',
			'sanitize_callback' => 'rest_sanitize_boolean',
		)
	);
	register_setting(
		'hatch_settings',
		'hatch_login_allowed_roles',
		array(
			'type'              => 'string',
			'sanitize_callback' => 'hatch_sanitize_roles_csv',
		)
	);
	register_setting(
		'hatch_settings',
		'hatch_brute_force_limit',
		array(
			'type'              => 'integer',
			'sanitize_callback' => 'hatch_sanitize_bf_limit',
		)
	);
	register_setting(
		'hatch_settings',
		'hatch_brute_force_window',
		array(
			'type'              => 'integer',
			'sanitize_callback' => 'hatch_sanitize_bf_window',
		)
	);
}

/**
 * Human-readable label for a hosting model slug.
 *
 * @param string $model Slug.
 * @return string
 */
function hatch_host_label( string $model ): string {
	switch ( $model ) {
		// Older installs stored 'cloudflare-pages'. Hatch deploys to Workers, so
		// both values read the same and no migration is needed.
		case 'cloudflare-workers':
		case 'cloudflare-pages':
			return __( 'Cloudflare Workers', 'hatch-connect' );
		case '':
			return __( 'Not connected', 'hatch-connect' );
		default:
			return __( 'A frontend you host yourself', 'hatch-connect' );
	}
}

function hatch_sanitize_post_type_csv( $value ): string {
	if ( ! is_string( $value ) ) {
		return 'post,page';
	}
	$parts = array_filter( array_map( 'sanitize_key', array_map( 'trim', explode( ',', $value ) ) ) );
	return empty( $parts ) ? 'post,page' : implode( ',', $parts );
}
function hatch_sanitize_roles_csv( $value ): string {
	$default = 'administrator,editor,author';
	if ( ! is_string( $value ) ) {
		return $default;
	}
	$parts = array_filter( array_map( 'sanitize_key', array_map( 'trim', explode( ',', $value ) ) ) );
	if ( empty( $parts ) ) {
		return $default;
	}
	if ( ! in_array( 'administrator', $parts, true ) ) {
		$parts[] = 'administrator';
	}
	return implode( ',', array_unique( $parts ) );
}
function hatch_sanitize_bf_limit( $value ): int {
	$v = (int) $value;
	if ( $v < 3 ) {
		return 3;
	}
	if ( $v > 20 ) {
		return 20;
	}
	return $v;
}
function hatch_sanitize_bf_window( $value ): int {
	$v = (int) $value;
	if ( $v < 5 ) {
		return 5;
	}
	if ( $v > 240 ) {
		return 240;
	}
	return $v;
}

/**
 * One-time notice after a deploy switched plain permalinks to "Post name".
 * Clears itself once shown.
 *
 * @return void
 */
function hatch_permalinks_auto_set_notice(): void {
	if ( ! hatch_is_own_admin_screen() ) {
		return;
	}
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	if ( ! get_transient( 'hatch_permalinks_auto_set' ) ) {
		return;
	}
	delete_transient( 'hatch_permalinks_auto_set' );
	echo '<div class="notice notice-success is-dismissible"><p>';
	printf(
		wp_kses(
			/* translators: %s: link to the Settings, Permalinks screen. */
			__( 'Hatch changed your permalinks to <code>/%%postname%%/</code>, because the frontend needs them. You can change this in <a href="%s">Settings, Permalinks</a>.', 'hatch-connect' ),
			array(
				'code' => array(),
				'a'    => array( 'href' => true ),
			)
		),
		esc_url( admin_url( 'options-permalink.php' ) )
	);
	echo '</p></div>';
}

/**
 * Network admin notice when someone tries to network-activate the plugin.
 * Each site keeps its own deploy settings, so it is per-site only.
 *
 * @return void
 */
function hatch_network_activate_blocked_notice(): void {
	if ( ! get_transient( 'hatch_network_activate_blocked' ) ) {
		return;
	}
	delete_transient( 'hatch_network_activate_blocked' );
	echo '<div class="notice notice-error"><p>';
	esc_html_e( 'Hatch cannot be network-activated. Each site has its own frontend address, saved token and theme, and sharing them across a network would mix them up. Activate it on individual sites instead.', 'hatch-connect' );
	echo '</p></div>';
}

/**
 * Note on Hatch screens in a multisite network: settings belong to this site only.
 *
 * @return void
 */
function hatch_multisite_subsite_tip(): void {
	if ( ! hatch_is_own_admin_screen() ) {
		return;
	}
	if ( ! is_multisite() || ! current_user_can( 'manage_options' ) ) {
		return;
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only screen check.
	$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) : '';
	if ( 'hatch' !== $page && 'hatch-setup' !== $page ) {
		return;
	}

	echo '<div class="notice notice-info"><p>';
	echo esc_html(
		sprintf(
			/* translators: %d: numeric ID of the current site in a multisite network. */
			__( 'You are setting up Hatch for site ID %d. Its settings, saved token and frontend address apply to this site only. Other sites in the network are not affected.', 'hatch-connect' ),
			get_current_blog_id()
		)
	);
	echo '</p></div>';
}

/**
 * Notice on Hatch screens when permalinks are Plain.
 *
 * @return void
 */
function hatch_plain_permalinks_warning(): void {
	if ( ! hatch_is_own_admin_screen() ) {
		return;
	}
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only screen check.
	$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) : '';
	// The setup screen explains this in step 3, so only the settings screen shows it.
	if ( 'hatch' !== $page ) {
		return;
	}

	if ( '' !== (string) get_option( 'permalink_structure', '' ) ) {
		return;
	}

	echo '<div class="notice notice-warning"><p>';
	printf(
		wp_kses(
			/* translators: %s: link to the Settings, Permalinks screen. */
			__( 'Your permalinks (the link format of your posts) are set to <em>Plain</em>, and the frontend cannot read those. Choose <em>Post name</em> in <a href="%s">Settings, Permalinks</a>, or tick the permalinks box when you deploy and Hatch will change it for you.', 'hatch-connect' ),
			array(
				'em' => array(),
				'a'  => array( 'href' => true ),
			)
		),
		esc_url( admin_url( 'options-permalink.php' ) )
	);
	echo '</p></div>';
}

/**
 * Notice on Hatch screens when a block-builder plugin is active. Their output
 * depends on CSS that does not ship to the frontend, so those blocks render
 * without their styling.
 *
 * @return void
 */
function hatch_builder_block_warning(): void {
	if ( ! hatch_is_own_admin_screen() ) {
		return;
	}
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only screen check.
	$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) : '';
	if ( 'hatch' !== $page && 'hatch-setup' !== $page ) {
		return;
	}
	if ( ! function_exists( 'is_plugin_active' ) ) {
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
	}

	$builders = array(
		'generateblocks/plugin.php'                      => 'GenerateBlocks',
		'ultimate-addons-for-gutenberg/ultimate-addons-for-gutenberg.php' => 'Spectra',
		'stackable-ultimate-gutenberg-blocks/plugin.php' => 'Stackable',
		'kadence-blocks/kadence-blocks.php'              => 'Kadence Blocks',
		'greenshift-animation-and-page-builder-blocks/plugin.php' => 'Greenshift',
	);
	$active   = array();
	foreach ( $builders as $file => $name ) {
		if ( is_plugin_active( $file ) ) {
			$active[] = $name;
		}
	}
	if ( empty( $active ) ) {
		return;
	}

	echo '<div class="notice notice-warning"><p>';
	echo esc_html(
		sprintf(
			/* translators: %s: comma-separated names of block plugins, for example "Kadence Blocks, Spectra". */
			__( '%s is active. Blocks from these plugins depend on CSS that the frontend does not load, so they will look unstyled there. Core WordPress blocks and Hatch blocks display as designed.', 'hatch-connect' ),
			implode( ', ', $active )
		)
	);
	echo '</p></div>';
}

/**
 * Hatch admin entry. v0.51: React SPA mount.
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
		wp_die( esc_html__( 'Permission denied.', 'hatch-connect' ), '', array( 'response' => 403 ) );
	}
	echo '<div class="wrap hatch-wrap"><hr class="wp-header-end"><div id="hatch-react-root"></div></div>';
}

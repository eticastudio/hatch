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
			'themes'         => class_exists( 'Hatch_Features' ) ? array_map(
				static function ( $id, $row ) {
					return array(
						'id'   => $id,
						'desc' => isset( $row['description'] ) ? (string) $row['description'] : '',
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
				'layout'       => wp_parse_args(
					(array) get_option( 'hatch_design_layout', array() ),
					array(
						'density'     => 'Comfortable',
						'roundness'   => 'Default',
						'maxWidth'    => '1160px',
						'buttonStyle' => 'Pill',
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
			'content'        => wp_parse_args(
				(array) get_option( 'hatch_content_flags', array() ),
				array(
					'comments_enabled'   => true,
					'comments_turnstile' => false,
					'forms_enabled'      => true,
					'forms_turnstile'    => false,
					'redirects_enabled'  => true,
					'sitemap_enabled'    => true,
					'rss_enabled'        => true,
					'robots_from_seo'    => true,
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
		),
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
	$catalog = array(
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
	);

	$out = array();
	foreach ( $catalog as $row ) {
		$detected_name = '';
		foreach ( $row['providers'] as $name => $slugs ) {
			foreach ( $slugs as $slug ) {
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
		'telemetry'          => (bool)   get_option( 'hatch_telemetry', false ),
		'cdn_prefix'         => (string) ( $perf['assets_prefix']      ?? '' ),
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
		'nonces' => array(
			'setup_step2'           => wp_create_nonce( 'hatch_setup_step2' ),
			'save_manual_target'    => wp_create_nonce( 'hatch_save_manual_target' ),
			'skip_setup'            => wp_create_nonce( 'hatch_skip_setup' ),
			'complete_setup'        => wp_create_nonce( 'hatch_complete_setup' ),
			'start_deploy'          => wp_create_nonce( 'hatch_start_deploy' ),
			// Action nonces consumed by Connection / Security tabs in the React admin.
			// Each maps to an existing admin-post handler that was orphaned when the
			// PHP UI was deleted. React surfaces buttons that POST to these.
			'generate_app_password' => wp_create_nonce( 'hatch_generate_app_password' ),
			'rotate_app_pwds'       => wp_create_nonce( 'hatch_rotate_app_pwds' ),
			'test_webhook'          => wp_create_nonce( 'hatch_test_webhook' ),
			'mark_deployed'         => wp_create_nonce( 'hatch_mark_deployed' ),
			'probe_turnstile'       => wp_create_nonce( 'hatch_probe_turnstile' ),
			'clear_token'           => wp_create_nonce( 'hatch_clear_token' ),
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
		'performance.telemetry'        => 'hatch_telemetry',
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
	$perf_keys = array(
		'performance.image_service'      => 'image_service',
		'performance.image_layout'       => 'image_layout',
		'performance.prefetch_enabled'   => 'prefetch_enabled',
		'performance.prefetch'           => 'prefetch_strategy',
		'performance.output'             => 'output_mode',
		'performance.inline_stylesheets' => 'inline_stylesheets',
		'performance.compress_html'      => 'compress_html',
		'performance.partytown'          => 'partytown_enabled',
		'performance.cdn_prefix'         => 'assets_prefix',
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
		if ( ( 'content.comments_turnstile' === $path || 'content.forms_turnstile' === $path )
		     && class_exists( 'Hatch_Integrations' ) ) {
			// Mirror the sub-toggle into hatch_integrations so the verifier sees it,
			// then fall through to also persist in hatch_content_flags (UI state).
			$all = Hatch_Integrations::get_all();
			if ( 'content.comments_turnstile' === $path ) {
				$c = (array) ( $all['comments'] ?? array() );
				$c['turnstile'] = (bool) $value;
				Hatch_Integrations::save_group( 'comments', $c );
			}
			// Form Turnstile is currently only consumed via the global Turnstile
			// enabled flag + verify_turnstile(); no per-group flag in defaults.
			// Falling through writes to hatch_content_flags for UI persistence.
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
		    || 'theme' === $p ) {
			$touched_design = true;
		}
		if ( 0 === strpos( $p, 'hatchBlocks.' ) ) {
			$touched_blocks = true;
		}
	}
	if ( $touched_design ) {
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

	// Regenerate the YAML frontmatter that some Astro starters read directly.
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

<?php
/**
 * Hatch admin dashboard — v0.6 redesign.
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

require_once HATCH_PLUGIN_DIR . 'admin/assets/icons.php';

add_action( 'admin_menu', 'hatch_register_admin_menu' );
add_action( 'admin_init', 'hatch_register_settings' );
add_action( 'admin_post_hatch_test_webhook', 'hatch_handle_test_webhook' );
add_action( 'admin_post_hatch_save_features', 'hatch_handle_save_features' );
add_action( 'admin_post_hatch_save_blocks',   'hatch_handle_save_blocks' );
add_action( 'admin_post_hatch_save_theme',    'hatch_handle_save_theme' );
add_action( 'admin_post_hatch_save_integrations', 'hatch_handle_save_integrations' );
add_action( 'admin_post_hatch_save_design', 'hatch_handle_save_design' );
add_action( 'admin_post_hatch_save_design_visual', 'hatch_handle_save_design_visual' );
add_action( 'admin_post_hatch_mark_deployed', 'hatch_handle_mark_deployed' );
add_action( 'admin_post_hatch_expose_acf', 'hatch_handle_expose_acf' );
add_action( 'admin_post_hatch_save_frontend_url', 'hatch_handle_save_frontend_url' );
add_action( 'admin_post_hatch_clear_token',       'hatch_handle_clear_token' );
// v0.50.0 — new admin-post handlers (Save Security, App-password rotate).
add_action( 'admin_post_hatch_save_security',     'hatch_handle_save_security' );
add_action( 'admin_post_hatch_rotate_app_pwds',   'hatch_handle_rotate_app_pwds' );
// v0.50.1 — Turnstile probe (validates that the saved Turnstile secret key works).
add_action( 'admin_post_hatch_probe_turnstile',   'hatch_handle_probe_turnstile' );
add_action( 'admin_enqueue_scripts', 'hatch_enqueue_admin_assets' );
// v0.50.0 — admin notice when a builder-block plugin is active (output won't render headless).
add_action( 'admin_notices',         'hatch_builder_block_warning' );
// v0.50.4 — admin notice when permalinks are PLAIN. Confuses every headless
// frontend (Astro hits /wp-json/* → 301). Hatch handles the fallback via
// ?rest_route= but pretty permalinks are still strongly recommended.
add_action( 'admin_notices',         'hatch_plain_permalinks_warning' );
// v0.50.7 — admin notices for permalink auto-set + network-activate block + multisite tip.
add_action( 'admin_notices',         'hatch_permalinks_auto_set_notice' );
add_action( 'network_admin_notices', 'hatch_network_activate_blocked_notice' );
add_action( 'admin_notices',         'hatch_multisite_subsite_tip' );
// v0.50.1 — daily cron prunes Hatch Application Passwords older than retention window.
add_action( 'hatch_prune_app_pwds_cron', 'hatch_prune_app_pwds' );
add_action( 'init', function() {
	if ( ! wp_next_scheduled( 'hatch_prune_app_pwds_cron' ) ) {
		wp_schedule_event( time() + 3600, 'daily', 'hatch_prune_app_pwds_cron' );
	}
} );

/**
 * Enqueue Hatch admin design system — ONLY on Hatch screens.
 *
 * @param string $hook Current admin page hook.
 * @return void
 */
function hatch_enqueue_admin_assets( $hook ): void {
	if ( false === strpos( (string) $hook, 'hatch' ) ) {
		return;
	}
	wp_enqueue_style(
		'hatch-admin-font',
		'https://rsms.me/inter/inter.css',
		array(),
		HATCH_VERSION
	);
	wp_enqueue_style(
		'hatch-admin',
		HATCH_PLUGIN_URL . 'admin/assets/hatch-admin.css',
		array( 'hatch-admin-font' ),
		HATCH_VERSION
	);
	// v0.50.0 — Save = spinner + tick on every form (progressive enhancement).
	wp_enqueue_script(
		'hatch-admin-js',
		HATCH_PLUGIN_URL . 'admin/assets/hatch-admin.js',
		array(),
		HATCH_VERSION,
		true
	);
}

/**
 * Register admin menu.
 *
 * @return void
 */
function hatch_register_admin_menu(): void {
	// v0.49 — actual 🐣 emoji as the menu icon. WP admin sidebar scales into a 20px box;
	// font-size 17 + central baseline keeps it crisp without breaking the active-state highlight.
	$icon_svg = 'data:image/svg+xml;base64,' . base64_encode(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><text x="50%" y="50%" font-size="17" text-anchor="middle" dominant-baseline="central">🐣</text></svg>'
	);
	add_menu_page(
		__( 'Hatch — Headless WordPress', 'hatch' ),
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

	// v0.47 — menu picker (Connector tab → Menus card).
	register_setting( 'hatch_settings', 'hatch_menu_primary_id', array( 'type' => 'integer', 'sanitize_callback' => 'absint' ) );
	register_setting( 'hatch_settings', 'hatch_menu_footer_id',  array( 'type' => 'integer', 'sanitize_callback' => 'absint' ) );

	// Security toggles.
	register_setting( 'hatch_settings', 'hatch_security_harden_rest', array( 'type' => 'boolean', 'sanitize_callback' => 'rest_sanitize_boolean' ) );
	register_setting( 'hatch_settings', 'hatch_security_disable_xmlrpc', array( 'type' => 'boolean', 'sanitize_callback' => 'rest_sanitize_boolean' ) );
	register_setting( 'hatch_settings', 'hatch_security_block_user_enum', array( 'type' => 'boolean', 'sanitize_callback' => 'rest_sanitize_boolean' ) );
	register_setting( 'hatch_settings', 'hatch_security_force_noindex', array( 'type' => 'boolean', 'sanitize_callback' => 'rest_sanitize_boolean' ) );
	// v0.49.5 — uninstall lifecycle opt-in (default 0 = preserve everything).
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
	$allowed = array( 'connector', 'features', 'design', 'integrations', 'security', 'status' );
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$tab = isset( $_GET['tab'] ) ? sanitize_key( (string) wp_unslash( $_GET['tab'] ) ) : 'connector';
	return in_array( $tab, $allowed, true ) ? $tab : 'connector';
}

function hatch_handle_test_webhook(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to do that.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'hatch_test_webhook' );
	$fired = Hatch_Revalidate::trigger( 'admin-test' );
	$status = $fired ? 'sent' : 'unconfigured';
	wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=connector&hatch_test=' . $status ) );
	exit;
}

function hatch_handle_save_features(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'hatch_save_features' );
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- nonce checked above.
	$raw = isset( $_POST['hatch_features'] ) ? (array) wp_unslash( $_POST['hatch_features'] ) : array();
	Hatch_Features::update( $raw );
	wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=features&saved=1' ) );
	exit;
}

function hatch_handle_save_theme(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'hatch_save_theme' );
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$theme = isset( $_POST['hatch_theme'] ) ? sanitize_key( wp_unslash( (string) $_POST['hatch_theme'] ) ) : 'blog';
	Hatch_Features::set_theme( $theme );
	wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=features&saved=1' ) );
	exit;
}

function hatch_handle_save_blocks(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'hatch_save_blocks' );
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$values = isset( $_POST['hatch_blocks'] ) ? (array) wp_unslash( $_POST['hatch_blocks'] ) : array();
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$master = ! empty( $_POST['hatch_blocks_master'] );
	Hatch_Blocks_Control::update( $values, $master );
	wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=blocks&saved=1' ) );
	exit;
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

function hatch_handle_save_design(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'hatch_save_design' );
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- nonce checked above.
	$raw = isset( $_POST['hatch_design_md'] ) ? (string) wp_unslash( $_POST['hatch_design_md'] ) : '';
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$clear = ! empty( $_POST['hatch_design_clear'] );
	if ( $clear ) {
		Hatch_Design_Loader::clear();
		wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=design&cleared=1' ) );
		exit;
	}
	$result = Hatch_Design_Loader::save( $raw );
	if ( ! $result['ok'] ) {
		set_transient( 'hatch_design_errors', $result['errors'], 60 );
		wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=design&error=1' ) );
		exit;
	}
	wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=design&saved=1' ) );
	exit;
}

/**
 * Visual Design editor — takes form fields (colors, fonts, radios) and
 * rebuilds a design.md YAML frontmatter block, then saves it via the
 * existing Hatch_Design_Loader. Keeps design.md as single source of truth.
 */
function hatch_handle_save_design_visual(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'hatch_save_design_visual' );

	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- nonce checked above.
	$d = isset( $_POST['hatch_design'] ) ? (array) wp_unslash( $_POST['hatch_design'] ) : array();

	$brand     = isset( $d['brand'] )     && is_array( $d['brand'] )     ? $d['brand']     : array();
	$layout    = isset( $d['layout'] )    && is_array( $d['layout'] )    ? $d['layout']    : array();
	$voice     = isset( $d['voice'] )     && is_array( $d['voice'] )     ? $d['voice']     : array();
	$templates = isset( $d['templates'] ) && is_array( $d['templates'] ) ? $d['templates'] : array();

	$sanitize_color = static function ( $val ) {
		$val = trim( (string) $val );
		return preg_match( '/^#[0-9a-f]{3,8}$/i', $val ) ? $val : '';
	};
	$sanitize_font = static function ( $val ) {
		$val = sanitize_text_field( (string) $val );
		return preg_match( '/^[A-Za-z0-9 \-+]{1,40}$/', $val ) ? $val : '';
	};
	$enum = static function ( $val, array $allowed, string $default ) {
		$v = sanitize_key( (string) $val );
		return in_array( $v, $allowed, true ) ? $v : $default;
	};

	$yaml = "---\nbrand:\n";
	if ( ! empty( $brand['name'] ) )    $yaml .= '  name: ' . sanitize_text_field( wp_unslash( (string) $brand['name'] ) ) . "\n";
	if ( $c = $sanitize_color( $brand['primary'] ?? '' ) ) $yaml .= '  primary: "' . $c . "\"\n";
	if ( $c = $sanitize_color( $brand['accent']  ?? '' ) ) $yaml .= '  accent: "'  . $c . "\"\n";
	if ( $c = $sanitize_color( $brand['bg']      ?? '' ) ) $yaml .= '  bg: "'      . $c . "\"\n";
	if ( $c = $sanitize_color( $brand['fg']      ?? '' ) ) $yaml .= '  fg: "'      . $c . "\"\n";
	if ( $f = $sanitize_font( $brand['font_heading'] ?? '' ) ) $yaml .= '  font_heading: "' . $f . "\"\n";
	if ( $f = $sanitize_font( $brand['font_body']    ?? '' ) ) $yaml .= '  font_body: "'    . $f . "\"\n";
	if ( $f = $sanitize_font( $brand['font_mono']    ?? '' ) ) $yaml .= '  font_mono: "'    . $f . "\"\n";
	$yaml .= '  mode: ' . $enum( $brand['mode'] ?? 'auto', array( 'light', 'dark', 'auto' ), 'auto' ) . "\n";

	$yaml .= "layout:\n";
	$yaml .= '  density: '   . $enum( $layout['density']   ?? 'comfortable', array( 'compact', 'comfortable', 'spacious' ), 'comfortable' ) . "\n";
	$yaml .= '  rounded: '   . $enum( $layout['rounded']   ?? 'smooth',      array( 'sharp', 'smooth', 'extra' ),           'smooth' )      . "\n";
	$yaml .= '  max_width: ' . $enum( $layout['max_width'] ?? '1080',        array( '720', '1080', '1280' ),                '1080' )        . "\n";

	$yaml .= "voice:\n";
	$yaml .= '  tone: '     . $enum( $voice['tone']     ?? 'professional', array( 'professional', 'casual', 'playful' ), 'professional' ) . "\n";
	$yaml .= '  pronouns: ' . $enum( $voice['pronouns'] ?? 'we',           array( 'we', 'I', 'you' ),                    'we' )            . "\n";

	$yaml .= "templates:\n";
	$yaml .= '  single_sidebar: '   . $enum( $templates['single_sidebar']   ?? 'right',    array( 'right', 'left', 'none' ),           'right' )    . "\n";
	$yaml .= '  single_hero: '      . $enum( $templates['single_hero']      ?? 'featured', array( 'featured', 'compact', 'none' ),     'featured' ) . "\n";
	$yaml .= '  single_width: '     . $enum( $templates['single_width']     ?? 'medium',   array( 'narrow', 'medium', 'wide' ),        'medium' )   . "\n";
	$yaml .= '  archive_grid: '     . $enum( $templates['archive_grid']     ?? '2',        array( '1', '2', '3' ),                     '2' )        . "\n";
	$yaml .= '  archive_excerpt: '  . $enum( $templates['archive_excerpt']  ?? 'true',     array( 'true', 'false' ),                   'true' )     . "\n";
	$yaml .= '  not_found_search: ' . $enum( $templates['not_found_search'] ?? 'true',     array( 'true', 'false' ),                   'true' )     . "\n";
	$yaml .= "---\n";

	$result = Hatch_Design_Loader::save( $yaml );
	if ( ! $result['ok'] ) {
		set_transient( 'hatch_design_errors', $result['errors'], 60 );
		wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=design&error=1' ) );
		exit;
	}
	wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=design&saved=1' ) );
	exit;
}

/**
 * v0.48: Delete the encrypted deploy token for a given provider.
 * Lets users revoke the stored credential from the Connector tab.
 */
function hatch_handle_clear_token(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'hatch_clear_token' );
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$provider = isset( $_GET['provider'] ) ? sanitize_key( wp_unslash( (string) $_GET['provider'] ) ) : '';
	if ( class_exists( 'Hatch_Credential_Store' ) && '' !== $provider ) {
		Hatch_Credential_Store::clear( $provider );
	}
	wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=connector' ) );
	exit;
}

/**
 * Mark the deployed frontend as in-sync with the current plugin version.
 * Stamped by the user when they confirm a successful redeploy. The broker
 * sets this automatically on successful deploys (v0.29+); this handler exists
 * for users on older broker deployments who redeploy manually.
 */
function hatch_handle_mark_deployed(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'hatch_mark_deployed' );
	update_option( 'hatch_deployed_frontend_version', HATCH_VERSION );
	wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=connector' ) );
	exit;
}

/**
 * v0.30 — Bulk-expose all ACF field groups to REST. The single biggest "headless
 * dynamic gap" — ACF custom fields aren't returned by /wp/v2/posts unless every
 * group has show_in_rest=true. This handler flips them all in one click.
 */
function hatch_handle_expose_acf(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'hatch_expose_acf' );
	$result = Hatch_Acf_Bridge::expose_all_to_rest();
	set_transient( 'hatch_acf_expose_result', $result, 60 );
	wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=integrations&acf=1' ) );
	exit;
}

function hatch_handle_save_integrations(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'hatch_save_integrations' );
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- nonce checked above.
	$post = isset( $_POST['hatch_integrations'] ) ? (array) wp_unslash( $_POST['hatch_integrations'] ) : array();
	foreach ( array( 'seo', 'forms', 'turnstile', 'comments' ) as $group ) {
		if ( isset( $post[ $group ] ) && is_array( $post[ $group ] ) ) {
			Hatch_Integrations::save_group( $group, $post[ $group ] );
		}
	}
	wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=integrations&saved=1' ) );
	exit;
}

/**
 * v0.50.0 — Save Security tab via admin-post.php (was options.php — that
 * redirects to the WP Settings page after save, which is jarring inside the
 * Hatch UI). Whitelist + sanitise each known security option.
 */
function hatch_handle_save_security(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'hatch_save_security' );

	$bool_opts = array(
		'hatch_security_harden_rest',
		'hatch_security_disable_xmlrpc',
		'hatch_security_block_user_enum',
		'hatch_security_force_noindex',
		'hatch_login_role_guard_enabled',
		'hatch_uninstall_remove_all_data',
	);
	foreach ( $bool_opts as $opt ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- nonce checked above.
		update_option( $opt, isset( $_POST[ $opt ] ) ? 1 : 0 );
	}

	$text_opts = array(
		'hatch_login_slug'          => 'sanitize_title',
		'hatch_login_redirect_slug' => 'sanitize_text_field',
		'hatch_login_allowed_roles' => 'sanitize_text_field',
	);
	foreach ( $text_opts as $opt => $sanitizer ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( isset( $_POST[ $opt ] ) ) {
			update_option( $opt, call_user_func( $sanitizer, wp_unslash( (string) $_POST[ $opt ] ) ) );
		}
	}

	foreach ( array( 'hatch_brute_force_limit', 'hatch_brute_force_window' ) as $opt ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( isset( $_POST[ $opt ] ) ) {
			update_option( $opt, max( 1, (int) $_POST[ $opt ] ) );
		}
	}

	wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=security&saved=1' ) );
	exit;
}

/**
 * v0.50.0 — Rotate every "Hatch (...)" Application Password across all admins.
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
 * v0.50.1 — Turnstile probe. Hits Cloudflare siteverify with a deliberately
 * invalid token so we get back error_codes that tell us if the SECRET KEY is
 * good without needing a real challenge response. Decoded:
 *   ["invalid-input-secret"]   → secret key is wrong
 *   ["invalid-input-response"] → secret good, just no real token (expected)
 *   ["missing-input-secret"]   → no secret saved yet
 */
function hatch_handle_probe_turnstile(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'hatch_probe_turnstile' );

	$cfg    = class_exists( 'Hatch_Integrations' ) ? (array) Hatch_Integrations::get_all() : array();
	$secret = (string) ( $cfg['turnstile']['secret_key'] ?? '' );

	$result = array( 'ok' => false, 'message' => '' );
	if ( '' === $secret ) {
		$result['message'] = __( 'No Turnstile secret saved. Paste your secret key above first.', 'hatch' );
	} else {
		$resp = wp_remote_post( 'https://challenges.cloudflare.com/turnstile/v0/siteverify', array(
			'timeout' => 10,
			'body'    => array( 'secret' => $secret, 'response' => 'hatch-probe-invalid-token-by-design' ),
		) );
		if ( is_wp_error( $resp ) ) {
			$result['message'] = __( 'Could not reach Cloudflare: ', 'hatch' ) . $resp->get_error_message();
		} else {
			$body  = json_decode( (string) wp_remote_retrieve_body( $resp ), true );
			$codes = (array) ( $body['error-codes'] ?? array() );
			if ( in_array( 'invalid-input-secret', $codes, true ) ) {
				$result['message'] = __( 'Secret key is INVALID. Re-copy from Cloudflare → Turnstile dashboard and save.', 'hatch' );
			} elseif ( in_array( 'invalid-input-response', $codes, true ) || in_array( 'missing-input-response', $codes, true ) ) {
				$result['ok']      = true;
				$result['message'] = __( 'Secret key works ✓ — Cloudflare accepted it (the bad probe token was the only failure, exactly as expected).', 'hatch' );
			} else {
				$result['message'] = sprintf( __( 'Unexpected Cloudflare response: %s', 'hatch' ), wp_json_encode( $body ) );
			}
		}
	}

	set_transient( 'hatch_turnstile_probe_' . get_current_user_id(), $result, 60 );
	wp_safe_redirect( admin_url( 'admin.php?page=hatch&tab=integrations&probed=1' ) );
	exit;
}

/**
 * v0.50.1 — Daily cron: prune "Hatch (...)" Application Passwords older than
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
 * v0.50.7 — One-time success notice after Hatch activation auto-sets pretty
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
 * v0.50.7 — Network-admin notice when someone tries to network-activate.
 * Hatch is per-site only (each subsite has its own deploy URL + token).
 */
function hatch_network_activate_blocked_notice(): void {
	if ( ! get_transient( 'hatch_network_activate_blocked' ) ) return;
	delete_transient( 'hatch_network_activate_blocked' );
	echo '<div class="notice notice-error"><p><strong>Hatch:</strong> ';
	esc_html_e( 'Hatch cannot be network-activated. Each subsite has its own deploy URL, encrypted token, and theme — sharing them across the network would mix tenants. Activate Hatch on individual subsites instead.', 'hatch' );
	echo '</p></div>';
}

/**
 * v0.50.7 — Subsite admin tip when running in multisite context. One-time.
 */
function hatch_multisite_subsite_tip(): void {
	if ( ! is_multisite() || ! current_user_can( 'manage_options' ) ) return;
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) : '';
	if ( 'hatch' !== $page && 'hatch-setup' !== $page ) return;
	if ( get_user_meta( get_current_user_id(), 'hatch_multisite_tip_dismissed', true ) ) return;

	echo '<div class="notice notice-info is-dismissible"><p><strong>Hatch (multisite):</strong> ';
	esc_html_e( 'You\'re configuring Hatch on subsite ID ' . get_current_blog_id() . '. Settings, the deploy token, and the frontend URL are all subsite-scoped — the other subsites in this network are unaffected.', 'hatch' );
	echo '</p></div>';
}

/**
 * v0.50.4 — Admin notice when permalinks are PLAIN. Hatch frontend handles
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
	if ( '' !== $structure ) return; // pretty permalinks active — nothing to warn

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
 * v0.50.0 — Admin notice when a builder-block plugin is active. Their HTML
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
 * Render the admin page (entry point).
 *
 * @return void
 */
function hatch_render_admin_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}

	$tab      = hatch_get_current_tab();
	$base_url = admin_url( 'admin.php?page=hatch' );

	// v0.33: Blocks tab hidden — the Hatch-branded block library isn't compiled
	// (build/blocks/ directory empty). Users use core Gutenberg blocks and
	// Hatch's block-serializer renders them on the Astro side. When/if Hatch
	// ships its own blocks, restore the tab here.
	$tabs = array(
		'connector'    => array( 'label' => __( 'Connector',    'hatch' ), 'icon' => 'plug' ),
		'features'     => array( 'label' => __( 'Features',     'hatch' ), 'icon' => 'sparkles' ),
		'design'       => array( 'label' => __( 'Design',       'hatch' ), 'icon' => 'sparkles' ),
		'integrations' => array( 'label' => __( 'Integrations', 'hatch' ), 'icon' => 'cog' ),
		'security'     => array( 'label' => __( 'Security',     'hatch' ), 'icon' => 'shield-check' ),
		'status'       => array( 'label' => __( 'Status',       'hatch' ), 'icon' => 'check-circle' ),
	);
	?>
	<div class="wrap hatch-admin">

		<div class="hx-header">
			<div class="hx-header-logo" aria-hidden="true">🐣</div>
			<div class="hx-header-text">
				<h1><?php esc_html_e( 'Hatch', 'hatch' ); ?></h1>
				<div class="hx-header-text-sub"><?php esc_html_e( 'The Headless Engine for WordPress', 'hatch' ); ?></div>
			</div>
			<div class="hx-header-actions">
				<span class="hx-pill is-soft">v<?php echo esc_html( HATCH_VERSION ); ?></span>
				<a class="hx-btn is-ghost is-sm" href="https://github.com/adityaarsharma/hatch" target="_blank" rel="noopener noreferrer">
					<?php echo hatch_icon( 'code' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					GitHub
				</a>
				<a class="hx-btn is-ghost is-sm" href="https://github.com/adityaarsharma/hatch/tree/main/docs" target="_blank" rel="noopener noreferrer">
					<?php echo hatch_icon( 'document' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					Docs
				</a>
			</div>
		</div>

		<div class="hx-tabs-wrap">
			<nav class="hx-tabs" aria-label="<?php esc_attr_e( 'Hatch sections', 'hatch' ); ?>">
				<?php foreach ( $tabs as $slug => $t ): ?>
					<a class="hx-tab <?php echo $tab === $slug ? 'is-active' : ''; ?>"
					   href="<?php echo esc_url( add_query_arg( 'tab', $slug, $base_url ) ); ?>">
						<?php echo hatch_icon( $t['icon'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						<?php echo esc_html( $t['label'] ); ?>
					</a>
				<?php endforeach; ?>
			</nav>
		</div>

		<?php
		switch ( $tab ) {
			case 'features':     hatch_render_features_tab();     break;
			case 'design':       hatch_render_design_tab();       break;
			case 'integrations': hatch_render_integrations_tab(); break;
			case 'blocks':       hatch_render_blocks_tab();       break;
			case 'security':     hatch_render_security_tab();     break;
			case 'status':       hatch_render_status_tab();       break;
			case 'connector':
			default:             hatch_render_connector_tab();    break;
		}
		?>

		<div class="hx-footer">
			<a href="https://github.com/adityaarsharma/hatch" target="_blank" rel="noopener noreferrer">GitHub</a>
			<a href="https://github.com/adityaarsharma/hatch/tree/main/docs" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Docs', 'hatch' ); ?></a>
			<a href="<?php echo esc_url( admin_url( 'admin.php?page=hatch-setup' ) ); ?>"><?php esc_html_e( 'Run setup wizard again', 'hatch' ); ?></a>
			<a href="https://adityaarsharma.com/connect" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Need help with setup?', 'hatch' ); ?></a>
			<span style="margin-left:auto;">
				<?php /* translators: %s: Hatch version */ printf( esc_html__( 'Hatch v%s — MIT licensed.', 'hatch' ), esc_html( HATCH_VERSION ) ); ?>
			</span>
		</div>
	</div>

	<script>
	(function(){
		// Toggle rows: keep the row's .is-on class in sync with the checkbox
		// state on every click, so the green-tinted background updates live.
		// Applied across every Hatch admin tab (Features, Blocks, Security)
		// since they all share the .hx-toggle-row markup.
		document.querySelectorAll('.hx-toggle-row').forEach(function(row){
			var cb = row.querySelector('input[type=checkbox]');
			if (!cb) return;
			cb.addEventListener('change', function(){
				row.classList.toggle('is-on', cb.checked);
			});
		});
	})();
	</script>
	<?php
}

/* ==================================================================
 * TAB: CONNECTOR (home) — v0.7 REAL VERIFICATION
 * ================================================================== */
function hatch_render_connector_tab(): void {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$test_result = isset( $_GET['hatch_test'] ) ? sanitize_key( (string) wp_unslash( $_GET['hatch_test'] ) ) : '';

	$endpoint     = (string) get_option( 'hatch_revalidate_endpoint', '' );
	$secret       = (string) get_option( 'hatch_webhook_secret', '' );
	$user         = wp_get_current_user();
	$status       = Hatch_Connection_Status::report();
	$is_connected = $status['connected'];
	$theme        = Hatch_Features::get_theme();
	$model        = $status['model'];

	// Pop any one-shot deploy notice stashed by the broker callback. Shows
	// "Connected to Cloudflare · live at https://… ↗" as a banner at the top
	// after a successful deploy, or the error message if the deploy failed.
	$deploy_notice = class_exists( 'Hatch_Deploy_Broker' ) ? Hatch_Deploy_Broker::pop_notice() : null;
	if ( $deploy_notice ):
		$is_ok = ( 'success' === ( $deploy_notice['type'] ?? '' ) );
		?>
		<div class="hx-notice <?php echo $is_ok ? 'is-success' : 'is-danger'; ?>">
			<span class="hx-icon-box <?php echo $is_ok ? 'is-success' : 'is-danger'; ?>">
				<?php echo hatch_icon( $is_ok ? 'check-circle' : 'x-circle' ); // phpcs:ignore ?>
			</span>
			<div class="hx-notice-body">
				<p class="hx-notice-title">
					<?php echo $is_ok
						? esc_html__( 'Deploy successful 🎉', 'hatch' )
						: esc_html__( 'Deploy failed', 'hatch' ); ?>
				</p>
				<p class="hx-notice-message">
					<?php echo esc_html( $deploy_notice['message'] ?? '' ); ?>
				</p>
			</div>
		</div>
	<?php endif; ?>

	<?php if ( 'sent' === $test_result ): ?>
		<div class="hx-notice is-success">
			<span class="hx-icon-box is-success"><?php echo hatch_icon( 'check-circle' ); // phpcs:ignore ?></span>
			<div class="hx-notice-body">
				<p class="hx-notice-title"><?php esc_html_e( 'Test webhook fired', 'hatch' ); ?></p>
				<p class="hx-notice-message"><?php esc_html_e( 'Check your frontend logs to confirm it was received.', 'hatch' ); ?></p>
			</div>
		</div>
	<?php elseif ( 'unconfigured' === $test_result ): ?>
		<div class="hx-notice is-danger">
			<span class="hx-icon-box is-danger"><?php echo hatch_icon( 'x-circle' ); // phpcs:ignore ?></span>
			<div class="hx-notice-body">
				<p class="hx-notice-title"><?php esc_html_e( 'Cannot fire test', 'hatch' ); ?></p>
				<p class="hx-notice-message"><?php esc_html_e( 'Add your frontend URL below first.', 'hatch' ); ?></p>
			</div>
		</div>
	<?php endif; ?>

	<?php
	// Pull saved project metadata for whichever provider was used. Used to
	// show the clean site URL + Visit / Redeploy / Open dashboard buttons.
	$project_data = '' !== $model ? (array) get_option( 'hatch_deploy_project_' . $model, array() ) : array();
	// v0.25: hatch_frontend_url is the canonical "live URL" (broker writes it
	// post-deploy, the editable Connector field can override it for custom
	// domains). Fall back to the per-provider project URL if not yet set.
	$frontend_opt = trim( (string) get_option( 'hatch_frontend_url', '' ) );
	$project_url  = $frontend_opt !== '' ? $frontend_opt : trim( (string) ( $project_data['url'] ?? '' ) );
	$project_name = trim( (string) ( $project_data['name'] ?? '' ) );
	$dash_url     = trim( (string) ( $project_data['dashboard_url'] ?? '' ) );
	$has_project  = '' !== $project_url;
	// "Connected" in the deploy sense = we deployed and got a URL back, even if
	// the heartbeat-based connection status hasn't ticked yet.
	$is_deployed  = $has_project || $is_connected;
	?>
	<!-- ============ REAL STATUS — VERIFIED ============ -->
	<div class="hx-card">
		<div class="hx-card-head">
			<span class="hx-icon-box <?php echo $is_deployed ? 'is-success' : 'is-warning'; ?> is-lg">
				<?php echo hatch_icon( $is_deployed ? 'check-circle' : 'plug' ); // phpcs:ignore ?>
			</span>
			<div class="hx-flex-1">
				<div class="hx-card-title hx-flex hx-items-center hx-gap-2">
					<?php if ( $is_deployed ): ?>
						<span class="hx-dot is-success" style="margin-top:0;"></span>
						<?php esc_html_e( 'Connected', 'hatch' ); ?>
					<?php elseif ( '' === $model ): ?>
						<?php esc_html_e( 'Setup not complete', 'hatch' ); ?>
					<?php else: ?>
						<span class="hx-dot is-warning" style="margin-top:0;"></span>
						<?php esc_html_e( 'Disconnected', 'hatch' ); ?>
					<?php endif; ?>
				</div>
				<div class="hx-text-xs hx-text-muted" style="margin-top:4px; word-break:break-all;">
					<?php if ( $has_project ): ?>
						<a href="<?php echo esc_url( $project_url ); ?>" target="_blank" rel="noopener noreferrer" style="text-decoration:none; color:var(--hx-primary); font-weight:500;">
							<?php echo esc_html( $project_url ); ?> ↗
						</a>
					<?php elseif ( $is_connected ): ?>
						<?php echo esc_html( $endpoint ); ?>
						·
						<?php
						/* translators: %s: human time diff */
						printf( esc_html__( 'last seen %s', 'hatch' ), esc_html( $status['last_seen_human'] ) );
						?>
					<?php elseif ( '' === $status['note'] ): ?>
						<?php esc_html_e( 'Run the setup wizard to deploy your frontend.', 'hatch' ); ?>
					<?php else: ?>
						<?php echo esc_html( $status['note'] ); ?>
					<?php endif; ?>
				</div>
			</div>
			<?php if ( '' !== $model ): ?>
				<span class="hx-pill <?php echo $is_deployed ? 'is-success' : 'is-warning'; ?>">
					<?php echo esc_html( hatch_host_label( $model ) ); ?>
				</span>
			<?php endif; ?>
		</div>

		<?php if ( $has_project ): ?>
			<!-- v0.45 — Live site shortcuts. "Redeploy" is now a one-click
			     action with inline spinner + tick (no wizard redirect).
			     Host changes live in the dedicated card at the bottom. -->
			<div class="hx-flex hx-gap-2 hx-mt-3" style="flex-wrap:wrap;">
				<a class="hx-btn is-primary is-sm" href="<?php echo esc_url( $project_url ); ?>" target="_blank" rel="noopener noreferrer">
					<?php echo hatch_icon( 'globe' ); // phpcs:ignore ?>
					<?php esc_html_e( 'Visit live site ↗', 'hatch' ); ?>
				</a>
				<a class="hx-btn is-ghost is-sm" href="<?php echo esc_url( admin_url( 'admin.php?page=hatch&tab=status' ) ); ?>">
					<?php echo hatch_icon( 'check-circle' ); // phpcs:ignore ?>
					<?php esc_html_e( 'View Status', 'hatch' ); ?>
				</a>
				<?php if ( '' !== $dash_url ): ?>
					<a class="hx-btn is-ghost is-sm" href="<?php echo esc_url( $dash_url ); ?>" target="_blank" rel="noopener noreferrer">
						<?php
						/* translators: %s: provider name */
						printf( esc_html__( 'Open %s dashboard ↗', 'hatch' ), esc_html( hatch_host_label( $model ) ) );
						?>
					</a>
				<?php endif; ?>
				<button type="button" id="hatch-redeploy-btn" class="hx-btn is-ghost is-sm" data-nonce="<?php echo esc_attr( wp_create_nonce( 'wp_rest' ) ); ?>" data-endpoint="<?php echo esc_url_raw( rest_url( 'hatch/v1/refresh-cache' ) ); ?>">
					<span class="hatch-rd-default" style="display:inline-flex; align-items:center; gap:6px;">
						<?php echo hatch_icon( 'refresh' ); // phpcs:ignore ?>
						<?php esc_html_e( 'Redeploy', 'hatch' ); ?>
					</span>
					<span class="hatch-rd-spinner" style="display:none; align-items:center; gap:6px;">
						<span class="hatch-rd-spin" aria-hidden="true"></span>
						<?php esc_html_e( 'Refreshing…', 'hatch' ); ?>
					</span>
					<span class="hatch-rd-done" style="display:none; align-items:center; gap:6px; color:var(--hx-green, #16a34a);">
						<?php echo hatch_icon( 'check' ); // phpcs:ignore ?>
						<?php esc_html_e( 'Done', 'hatch' ); ?>
					</span>
				</button>
			</div>
			<style>
				.hatch-rd-spin {
					width: 14px; height: 14px;
					border: 2px solid currentColor;
					border-right-color: transparent;
					border-radius: 50%;
					display: inline-block;
					animation: hatch-spin 0.8s linear infinite;
					vertical-align: -2px;
				}
				@keyframes hatch-spin { to { transform: rotate(360deg); } }
				#hatch-redeploy-btn.is-busy .hatch-rd-default { display: none !important; }
				#hatch-redeploy-btn.is-busy .hatch-rd-spinner { display: inline-flex !important; }
				#hatch-redeploy-btn.is-done .hatch-rd-default { display: none !important; }
				#hatch-redeploy-btn.is-done .hatch-rd-done    { display: inline-flex !important; }
			</style>
			<script>
				(function(){
					var btn = document.getElementById('hatch-redeploy-btn');
					if (!btn) return;
					btn.addEventListener('click', async function(){
						btn.classList.remove('is-done');
						btn.classList.add('is-busy');
						btn.disabled = true;
						try {
							await fetch(btn.dataset.endpoint, {
								method: 'POST',
								headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': btn.dataset.nonce },
								body: '{}',
							});
						} catch (e) { /* swallow — UX still shows tick */ }
						btn.classList.remove('is-busy');
						btn.classList.add('is-done');
						setTimeout(function(){
							btn.classList.remove('is-done');
							btn.disabled = false;
						}, 1800);
					});
				})();
			</script>
			<?php if ( ! empty( $project_data['connected_at'] ) ): ?>
				<div class="hx-text-xs hx-text-muted hx-mt-3">
					<?php
					$ago = human_time_diff( (int) $project_data['connected_at'], time() );
					/* translators: 1: provider name, 2: project name, 3: time-ago like "5 minutes" */
					printf(
						esc_html__( '%1$s project %2$s · deployed %3$s ago', 'hatch' ),
						esc_html( hatch_host_label( $model ) ),
						'<code>' . esc_html( $project_name ) . '</code>',
						esc_html( $ago )
					);
					?>
				</div>
			<?php endif; ?>

			<!-- v0.25: editable Frontend URL — for custom-domain swaps. -->
			<details class="hx-mt-3" style="font-size:13px;">
				<summary style="cursor:pointer; color:var(--hx-muted); font-weight:500;">
					<?php esc_html_e( 'Connect a custom domain (or update the live URL)', 'hatch' ); ?>
				</summary>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>"
					  style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
					<input type="hidden" name="action" value="hatch_save_frontend_url"/>
					<?php wp_nonce_field( 'hatch_save_frontend_url' ); ?>
					<input type="url" name="hatch_frontend_url" value="<?php echo esc_attr( $project_url ); ?>"
						   placeholder="https://your-domain.com"
						   style="flex:1; min-width:280px; padding:8px 10px; border:1px solid var(--hx-border); border-radius:6px; font-size:13px;"/>
					<button type="submit" class="hx-btn is-ghost is-sm">
						<?php esc_html_e( 'Update URL', 'hatch' ); ?>
					</button>
				</form>
				<p class="hx-text-xs hx-text-muted" style="margin-top:8px;">
					<?php esc_html_e( 'After you add a custom domain on Cloudflare or Vercel, paste it here. Hatch uses this for "View Post" links, revalidate webhooks, and the Companion theme redirect. The Cloudflare / Vercel deploy itself keeps working at the original URL — this just tells WordPress where to point.', 'hatch' ); ?>
				</p>
			</details>
		<?php endif; ?>

		<?php if ( ! $is_connected && '' === $model && '' === $endpoint ): ?>
			<!-- Fresh install, no setup yet — push them to the wizard. -->
			<div class="hx-mt-3" style="padding:12px 14px; background:var(--hx-surface); border-radius:8px; font-size:13px; line-height:1.5;">
				<strong><?php esc_html_e( 'No frontend connected yet.', 'hatch' ); ?></strong>
				<?php esc_html_e( 'Run the 4-step setup wizard to pick a host, generate an Application Password, and deploy your frontend.', 'hatch' ); ?>
				<div class="hx-mt-3">
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=hatch-setup' ) ); ?>" class="hx-btn is-primary">
						<?php echo hatch_icon( 'rocket' ); // phpcs:ignore ?>
						<?php esc_html_e( 'Start setup wizard', 'hatch' ); ?>
					</a>
				</div>
			</div>
		<?php elseif ( ! $is_connected && '' !== $endpoint && 'vps' !== $model ): ?>
			<!-- Disconnect detail + retry button for CF/Vercel paths -->
			<div class="hx-flex hx-gap-2 hx-mt-3">
				<button type="button" class="hx-btn is-primary" id="hatch-verify-btn">
					<?php echo hatch_icon( 'refresh' ); // phpcs:ignore ?>
					<?php esc_html_e( 'Test connection', 'hatch' ); ?>
				</button>
				<span id="hatch-verify-msg" class="hx-text-xs hx-text-muted" style="align-self:center;"></span>
			</div>
		<?php elseif ( ! $is_connected && 'vps' === $model ): ?>
			<!-- VPS disconnected — show reconnect instructions -->
			<div class="hx-mt-3" style="padding:12px 14px; background:var(--hx-surface); border-radius:8px; font-size:12.5px;">
				<strong><?php esc_html_e( 'Reconnect:', 'hatch' ); ?></strong>
				<?php esc_html_e( 'SSH into your VPS and run:', 'hatch' ); ?>
				<code style="display:block; padding:8px 10px; background:#0f172a; color:#e2e8f0; border-radius:6px; margin-top:6px;">sudo systemctl restart hatch-agent</code>
				<div class="hx-text-xs hx-text-muted" style="margin-top:6px;">
					<?php esc_html_e( 'Still broken? Re-run the install command from the setup wizard step 4.', 'hatch' ); ?>
				</div>
			</div>
		<?php elseif ( ! $is_connected && '' !== $model && '' === $endpoint ): ?>
			<!-- Model picked but no URL yet — guide them to deploy then paste URL. -->
			<div class="hx-mt-3" style="padding:12px 14px; background:var(--hx-surface); border-radius:8px; font-size:13px; line-height:1.5;">
				<strong><?php
					/* translators: %s: hosting model name */
					printf( esc_html__( '%s selected — deploy still pending.', 'hatch' ), esc_html( hatch_host_label( $model ) ) );
				?></strong>
				<?php esc_html_e( 'Open the setup wizard step 4 to fire the deploy, or paste your frontend URL below if you already deployed.', 'hatch' ); ?>
				<div class="hx-mt-3">
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=hatch-setup&step=4' ) ); ?>" class="hx-btn is-primary">
						<?php echo hatch_icon( 'rocket' ); // phpcs:ignore ?>
						<?php esc_html_e( 'Continue to deploy', 'hatch' ); ?>
					</a>
				</div>
			</div>
		<?php endif; ?>

		<?php
		// Recently-deployed hint — show the "build is finishing" reminder for
		// 15 minutes after the broker callback returned. The main Visit/Open/
		// Redeploy buttons live in the connection card above (always present
		// when a project is saved). This block adds only the timing nuance.
		if ( $has_project && ! empty( $project_data['connected_at'] ) ):
			$is_fresh = ( time() - (int) $project_data['connected_at'] ) < 15 * MINUTE_IN_SECONDS;
			if ( $is_fresh ):
				?>
				<div class="hx-text-xs hx-text-muted hx-mt-3" style="padding:8px 10px; background:var(--hx-surface); border-radius:6px;">
					ℹ️ <?php esc_html_e( 'First-deploy detail: builds finalize on the platform within ~60-180s after upload. If the site still shows a placeholder, refresh in a minute or check the platform dashboard above for build logs.', 'hatch' ); ?>
				</div>
			<?php endif; ?>
		<?php endif; ?>
	</div>

	<script>
	(function(){
		var btn = document.getElementById('hatch-verify-btn');
		if (!btn) return;
		btn.addEventListener('click', async function(){
			var msg = document.getElementById('hatch-verify-msg');
			msg.textContent = '<?php echo esc_js( __( 'Testing…', 'hatch' ) ); ?>';
			btn.disabled = true;
			try {
				var res = await fetch('<?php echo esc_url_raw( rest_url( 'hatch/v1/verify-connection' ) ); ?>', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce': '<?php echo esc_js( wp_create_nonce( 'wp_rest' ) ); ?>'
					}
				});
				// Tolerate non-JSON responses (a misconfigured proxy, an expired
				// session, an error HTML page from the host). Show the HTTP
				// status + first 80 chars instead of throwing on JSON.parse.
				var ct = (res.headers.get('content-type') || '').toLowerCase();
				var data;
				if (ct.indexOf('application/json') >= 0) {
					data = await res.json();
				} else {
					var text = (await res.text()).slice(0, 120).replace(/\s+/g, ' ').trim();
					data = {
						ok: false,
						message: 'HTTP ' + res.status + ' · ' + (text || 'non-JSON response from /hatch/v1/verify-connection')
					};
				}
				msg.textContent = (data.ok ? '✓ ' : '✕ ') + (data.message || '');
				if (data.ok) setTimeout(function(){ location.reload(); }, 1200);
			} catch (e) {
				msg.textContent = '✕ ' + (e && e.message ? e.message : 'request failed');
			}
			btn.disabled = false;
		});
	})();
	</script>

	<?php
	// v0.38 — Frontend version-mismatch card REMOVED.
	//
	// Why: the only thing the "Update frontend now" CTA could do was open the
	// setup wizard at step 4 (host select), which forces the user to re-pick
	// host + paste a fresh CF/Vercel token. That's not what "Update frontend"
	// implies — users expected one-click silent redeploy.
	//
	// Honest reality: an auto-redeploy needs a stored Cloudflare/Vercel "deploy
	// hook" URL (not the user's API token). The broker doesn't currently
	// create one; that's the v0.40 work. Until then, redeploys go through the
	// existing "Redeploy / change host" affordance on the connection card
	// above — same place users go to switch hosts, no separate confused CTA.
	//
	// The /hatch/v1/self-update endpoint handles plugin file updates over REST
	// without any UI step. That covers the routine update case.
	?>

	<!-- ============ DIAGNOSTIC ============ -->
	<div class="hx-card hx-mt-4">
		<?php hatch_render_diagnostic_grid(); ?>
	</div>

	<!-- ============ ADVANCED: revalidate webhook (filter-gated only) ============ -->
	<?php
	// v0.32 — hidden entirely by default. SSR mode means content is fetched at
	// request time and edge-cached for 60s. There's no static build to revalidate
	// — new WP posts go live automatically. Power-user feature only; gated behind
	// `hatch/show_revalidate_webhook_card` filter. Stored endpoints still persist
	// in options so functionality isn't lost — just hidden from the UI.
	$show_revalidate_card = (bool) apply_filters( 'hatch/show_revalidate_webhook_card', false );

	if ( $show_revalidate_card ) :
		?>
		<details class="hx-card hx-mt-4" <?php echo '' !== $endpoint ? 'open' : ''; ?>>
			<summary style="cursor:pointer; list-style:none; display:flex; align-items:center; gap:14px;">
				<span class="hx-icon-box is-info"><?php echo hatch_icon( 'globe' ); // phpcs:ignore ?></span>
				<div style="flex:1;">
					<div class="hx-card-title"><?php esc_html_e( 'Advanced: Revalidate webhook URL', 'hatch' ); ?></div>
					<div class="hx-text-xs hx-text-muted">
						<?php esc_html_e( 'Optional. Hatch POSTs here on publish so the edge cache purges immediately instead of waiting for the 60-second TTL.', 'hatch' ); ?>
					</div>
				</div>
				<span class="hx-text-xs hx-text-muted">▾</span>
			</summary>
			<form method="post" action="options.php" style="margin-top:14px; padding-top:14px; border-top:1px solid var(--hx-border);">
				<?php settings_fields( 'hatch_settings' ); ?>
				<div class="hx-field">
					<input class="hx-input" type="url" name="hatch_revalidate_endpoint"
					       value="<?php echo esc_attr( $endpoint ); ?>"
					       placeholder="https://your-site.pages.dev/api/revalidate"/>
					<div class="hx-help">
						<?php esc_html_e( 'In SSR mode (Hatch default), this is purely opt-in. Leave blank to rely on the 60s edge-cache TTL — new posts go live without any webhook.', 'hatch' ); ?>
					</div>
				</div>
				<button type="submit" class="hx-btn is-ghost">
					<?php echo hatch_icon( 'check' ); // phpcs:ignore ?>
					<?php esc_html_e( 'Save', 'hatch' ); ?>
				</button>
			</form>
		</details>
	<?php endif; ?>

	<?php
	// v0.49.2: Menus card moved to Integrations tab — fits the "frontend integrations" mental model better.
	// v0.45 — Image optimization card moved to Features tab (per user feedback).
	// Auto-bind on Connector still happens behind the scenes:
	$img_proxy       = trim( (string) get_option( 'hatch_image_proxy_url', '' ) );
	$frontend_origin = $project_url ? untrailingslashit( $project_url ) : '';
	if ( $frontend_origin && '' === $img_proxy ) {
		update_option( 'hatch_image_proxy_url', $frontend_origin );
	}
	?>

	<!-- ============ CREDENTIALS / .ENV ============ -->
	<?php
	// v0.32 — hidden entirely when the broker has deployed (the normal path).
	// The broker writes WP_API_URL/USER/PASS/HATCH_WEBHOOK_SECRET into the
	// frontend environment automatically — users don't need to copy-paste.
	// The card only appears for:
	//   (a) Manual VPS / DIY setups (no broker deploy on record), OR
	//   (b) Right after the user generates a new App Password (one-shot display).
	// Power users can force-show via the filter.
	$fresh        = Hatch_App_Password_Helper::pop_fresh_password();
	$has_deploy   = ! empty( $project_data['url'] );
	$show_env     = $fresh
		|| ( ! $has_deploy && apply_filters( 'hatch/show_credentials_card', false ) );

	if ( $show_env ):
		$pw_display = $fresh ? $fresh['password'] : '(use the button below to generate)';

		// Build the env block — variable names match what astro-starter actually reads.
		// (WP_API_URL / WP_API_USER / WP_API_PASS — NOT the legacy HATCH_WP_URL names.)
		$env_block  = "WP_API_URL=" . untrailingslashit( home_url() ) . "\n";
		$env_block .= "WP_API_USER=" . $user->user_login . "\n";
		$env_block .= "WP_API_PASS=" . $pw_display . "\n";
		$env_block .= "HATCH_WEBHOOK_SECRET=" . $secret . "\n";
		?>
		<div class="hx-card hx-mt-4">
			<div class="hx-card-head">
				<span class="hx-icon-box is-info is-lg"><?php echo hatch_icon( 'key' ); // phpcs:ignore ?></span>
				<div>
					<div class="hx-card-title"><?php esc_html_e( 'Frontend credentials', 'hatch' ); ?></div>
					<div class="hx-text-xs hx-text-muted">
						<?php esc_html_e( 'Paste this block into your frontend\'s .env file.', 'hatch' ); ?>
					</div>
				</div>
			</div>

			<?php if ( $fresh ): ?>
				<div class="hx-notice is-warning" style="margin:12px 0;">
					<span class="hx-icon-box is-warning"><?php echo hatch_icon( 'exclamation' ); // phpcs:ignore ?></span>
					<div class="hx-notice-body">
						<p class="hx-notice-title"><?php esc_html_e( 'Password shown once — copy it now', 'hatch' ); ?></p>
						<p class="hx-notice-message"><?php esc_html_e( 'The Application Password is shown below in plaintext. Refresh and it\'s gone forever.', 'hatch' ); ?></p>
					</div>
				</div>
			<?php endif; ?>

			<div class="hx-field">
				<textarea class="hx-textarea is-full" readonly rows="5" id="hatch-env-block"><?php echo esc_textarea( $env_block ); ?></textarea>
			</div>

			<div class="hx-flex hx-gap-2">
				<button type="button" class="hx-btn is-primary" id="hatch-copy-env">
					<?php echo hatch_icon( 'copy' ); // phpcs:ignore ?>
					<?php esc_html_e( 'Copy to clipboard', 'hatch' ); ?>
				</button>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline;">
					<input type="hidden" name="action" value="hatch_generate_app_password"/>
					<input type="hidden" name="hatch_app_pw_name" value="Hatch Frontend (<?php echo esc_attr( gmdate( 'Y-m-d H:i' ) ); ?>)"/>
					<?php wp_nonce_field( 'hatch_generate_app_password' ); ?>
					<button type="submit" class="hx-btn is-ghost">
						<?php echo hatch_icon( 'key' ); // phpcs:ignore ?>
						<?php echo $fresh ? esc_html__( 'Regenerate App Password', 'hatch' ) : esc_html__( 'Generate App Password', 'hatch' ); ?>
					</button>
				</form>
				<?php if ( 'vps' !== $model ): ?>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline;">
					<input type="hidden" name="action" value="hatch_test_webhook"/>
					<?php wp_nonce_field( 'hatch_test_webhook' ); ?>
					<button type="submit" class="hx-btn is-ghost">
						<?php echo hatch_icon( 'play' ); // phpcs:ignore ?>
						<?php esc_html_e( 'Test webhook', 'hatch' ); ?>
					</button>
				</form>
				<?php endif; ?>
			</div>

			<script>
			(function(){
				var btn = document.getElementById('hatch-copy-env');
				if (!btn) return;
				btn.addEventListener('click', function(){
					var ta = document.getElementById('hatch-env-block');
					ta.select(); document.execCommand('copy');
					var orig = btn.innerHTML;
					btn.innerHTML = '✓ <?php echo esc_js( __( 'Copied', 'hatch' ) ); ?>';
					setTimeout(function(){ btn.innerHTML = orig; }, 1500);
				});
			})();
			</script>
		</div>
	<?php endif; ?>

	<!-- ============ HOSTING OPTIONS — only when no host picked yet ============ -->
	<?php if ( '' === $model ): ?>
	<div class="hx-card hx-mt-4">
		<div class="hx-card-head">
			<span class="hx-icon-box is-info is-lg"><?php echo hatch_icon( 'cloud' ); // phpcs:ignore ?></span>
			<div>
				<div class="hx-card-title"><?php esc_html_e( 'Where to host your frontend', 'hatch' ); ?></div>
				<div class="hx-text-xs hx-text-muted">
					<?php esc_html_e( 'Pick wherever fits your scale. Hatch is vendor-neutral.', 'hatch' ); ?>
				</div>
			</div>
		</div>

		<div class="hx-flex-col hx-gap-2 hx-mt-3">
			<div class="hx-status-row">
				<span class="hx-icon-box is-success"><?php echo hatch_icon( 'bolt' ); // phpcs:ignore ?></span>
				<div class="hx-status-body">
					<div class="hx-status-title">
						<?php esc_html_e( 'Cloudflare Pages', 'hatch' ); ?>
						<span class="hx-pill is-success"><?php esc_html_e( 'Recommended', 'hatch' ); ?></span>
					</div>
					<div class="hx-status-message">
						<?php esc_html_e( 'Free for most sites, global edge, simple Git-connect deploys. Fork this repo, point Cloudflare Pages at it, set Root directory to', 'hatch' ); ?>
						<code>astro-starter</code>.
					</div>
					<div class="hx-status-fix">
						<a href="https://github.com/adityaarsharma/hatch/blob/main/docs/hosting/cloudflare-pages.md" target="_blank" rel="noopener noreferrer">
							<?php esc_html_e( 'Cloudflare Pages guide →', 'hatch' ); ?>
						</a>
						<span style="margin:0 6px; color:var(--hx-subtle);">·</span>
						<a href="https://github.com/adityaarsharma/hatch/fork" target="_blank" rel="noopener noreferrer">
							<?php esc_html_e( 'Fork the repo →', 'hatch' ); ?>
						</a>
					</div>
				</div>
			</div>

			<div class="hx-status-row">
				<span class="hx-icon-box is-primary"><?php echo hatch_icon( 'rocket' ); // phpcs:ignore ?></span>
				<div class="hx-status-body">
					<div class="hx-status-title"><?php esc_html_e( 'Vercel', 'hatch' ); ?></div>
					<div class="hx-status-message">
						<?php esc_html_e( 'Best for ISR-heavy sites or teams already on Vercel. Free hobby tier. Same flow as Cloudflare — fork the repo, set Root to', 'hatch' ); ?>
						<code>astro-starter</code>.
					</div>
					<div class="hx-status-fix">
						<a href="https://github.com/adityaarsharma/hatch/blob/main/docs/hosting/vercel.md" target="_blank" rel="noopener noreferrer">
							<?php esc_html_e( 'Vercel guide →', 'hatch' ); ?>
						</a>
						<span style="margin:0 6px; color:var(--hx-subtle);">·</span>
						<a href="https://github.com/adityaarsharma/hatch/fork" target="_blank" rel="noopener noreferrer">
							<?php esc_html_e( 'Fork the repo →', 'hatch' ); ?>
						</a>
					</div>
				</div>
			</div>

			<div class="hx-status-row">
				<span class="hx-icon-box is-warning"><?php echo hatch_icon( 'server' ); // phpcs:ignore ?></span>
				<div class="hx-status-body">
					<div class="hx-status-title">
						<?php esc_html_e( 'Your VPS', 'hatch' ); ?>
						<span class="hx-pill is-soft"><?php esc_html_e( 'Full control', 'hatch' ); ?></span>
					</div>
					<div class="hx-status-message">
						<?php esc_html_e( 'Hetzner, DigitalOcean, Linode — any provider. SSH in, run the install command, you\'re live in 3-5 min.', 'hatch' ); ?>
					</div>
					<div class="hx-status-fix">
						<a href="https://github.com/adityaarsharma/hatch/blob/main/docs/hosting/vps-runcloud.md" target="_blank" rel="noopener noreferrer">
							<?php esc_html_e( 'VPS guide →', 'hatch' ); ?>
						</a>
					</div>
				</div>
			</div>
		</div>

		<?php if ( '' === $endpoint ): ?>
			<p class="hx-text-xs hx-text-muted hx-mt-3">
				<?php esc_html_e( 'Need a hand? ', 'hatch' ); ?>
				<a href="https://adityaarsharma.com/connect" target="_blank" rel="noopener noreferrer">
					<?php esc_html_e( 'Connect with Aditya', 'hatch' ); ?>
				</a>
			</p>
		<?php endif; ?>
	</div>
	<?php else: ?>
		<?php
		// v0.48: determine if we have a stored encrypted token for one-click redeploy.
		$_redeploy_provider    = class_exists( 'Hatch_Credential_Store' ) ? Hatch_Credential_Store::provider_for_model( $model ) : '';
		$_has_stored_token     = '' !== $_redeploy_provider && Hatch_Credential_Store::has( $_redeploy_provider );
		$_redeploy_action_url  = wp_nonce_url(
			add_query_arg( 'action', 'hatch_start_deploy', admin_url( 'admin-post.php' ) ),
			'hatch_start_deploy'
		);
		$_clear_token_url = wp_nonce_url(
			add_query_arg(
				array( 'action' => 'hatch_clear_token', 'provider' => $_redeploy_provider ),
				admin_url( 'admin-post.php' )
			),
			'hatch_clear_token'
		);
		?>
		<!-- Host already chosen — compact "redeploy" link, no duplicate option list. -->
		<div class="hx-card hx-mt-4" style="padding:14px 18px;">
			<div class="hx-flex hx-items-center hx-gap-3" style="justify-content:space-between;">
				<div style="font-size:13.5px; line-height:1.5;">
					<strong><?php echo esc_html( hatch_host_label( $model ) ); ?></strong>
					<?php esc_html_e( 'is your selected host.', 'hatch' ); ?>
					<?php if ( $_has_stored_token ) : ?>
						<span class="hx-text-muted hx-text-xs" style="display:block; margin-top:3px;">
							<?php esc_html_e( 'Token saved — no re-paste needed.', 'hatch' ); ?>
							<a href="<?php echo esc_url( $_clear_token_url ); ?>" style="color:var(--hx-muted); text-decoration:underline; margin-left:6px;" onclick="return confirm('Remove saved deploy token?');">
								<?php esc_html_e( 'Clear', 'hatch' ); ?>
							</a>
						</span>
					<?php else : ?>
						<span class="hx-text-muted"><?php esc_html_e( 'Change it from the setup wizard.', 'hatch' ); ?></span>
					<?php endif; ?>
				</div>
				<?php if ( $_has_stored_token ) : ?>
					<form method="post" action="<?php echo esc_url( $_redeploy_action_url ); ?>" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:8px;">
						<input type="hidden" name="provider" value="<?php echo esc_attr( $_redeploy_provider ); ?>"/>
						<input type="hidden" name="save_token" value="1"/>
						<button type="submit" class="hx-btn is-primary is-sm">
							<?php echo hatch_icon( 'bolt' ); // phpcs:ignore ?>
							<?php esc_html_e( 'Redeploy', 'hatch' ); ?>
						</button>
					</form>
				<?php else : ?>
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=hatch-setup&step=3' ) ); ?>" class="hx-btn is-ghost is-sm">
						<?php esc_html_e( 'Change host', 'hatch' ); ?>
					</a>
				<?php endif; ?>
			</div>
		</div>
	<?php endif; ?>

	<?php
	// Companion theme card — show only if NOT already active.
	$companion_installed = Hatch_Companion_Theme_Installer::is_installed();
	$companion_active    = Hatch_Companion_Theme_Installer::is_active();
	if ( ! $companion_active ): ?>
		<div class="hx-card hx-mt-4">
			<div class="hx-card-head">
				<span class="hx-icon-box is-primary is-lg" aria-hidden="true">🐣</span>
				<div>
					<div class="hx-card-title"><?php esc_html_e( 'Hatch Companion theme', 'hatch' ); ?></div>
					<div class="hx-text-xs hx-text-muted">
						<?php esc_html_e( 'Blank, headless-first WordPress theme. Redirects raw frontend visitors to your Astro site and keeps wp-admin / REST / sitemap untouched.', 'hatch' ); ?>
					</div>
				</div>
			</div>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="hx-mt-3">
				<input type="hidden" name="action" value="<?php echo esc_attr( Hatch_Companion_Theme_Installer::ACTION ); ?>"/>
				<?php wp_nonce_field( Hatch_Companion_Theme_Installer::ACTION ); ?>
				<button type="submit" class="hx-btn is-primary is-sm">
					<?php echo hatch_icon( $companion_installed ? 'check' : 'sparkles' ); // phpcs:ignore ?>
					<?php echo $companion_installed
						? esc_html__( 'Activate Hatch Companion theme', 'hatch' )
						: esc_html__( 'Install + activate Hatch Companion theme', 'hatch' ); ?>
				</button>
				<?php
				// phpcs:ignore WordPress.Security.NonceVerification.Recommended
				if ( ! empty( $_GET['companion'] ) && 'fail' === sanitize_key( (string) wp_unslash( $_GET['companion'] ) ) ): ?>
					<p class="hx-text-xs" style="color:#b91c1c; margin-top:8px;">
						<?php echo esc_html( (string) get_transient( 'hatch_companion_install_error' ) ?: __( 'Install failed.', 'hatch' ) ); ?>
					</p>
				<?php endif; ?>
			</form>
		</div>
	<?php endif; ?>

	<?php
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if ( ! empty( $_GET['companion'] ) && 'ok' === sanitize_key( (string) wp_unslash( $_GET['companion'] ) ) ): ?>
		<div class="hx-notice is-success hx-mt-3">
			<span class="hx-icon-box is-success"><?php echo hatch_icon( 'check-circle' ); // phpcs:ignore ?></span>
			<div class="hx-notice-body">
				<p class="hx-notice-title"><?php esc_html_e( 'Hatch Companion theme activated', 'hatch' ); ?></p>
				<p class="hx-notice-message"><?php esc_html_e( 'Visitors of the raw WordPress URL will now be redirected to your headless frontend.', 'hatch' ); ?></p>
			</div>
		</div>
	<?php endif; ?>

	<?php
}

/* ==================================================================
 * TAB: FEATURES (theme + 14 toggles)
 * ================================================================== */
function hatch_render_features_tab(): void {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$saved = ! empty( $_GET['saved'] );

	$themes      = Hatch_Features::themes();
	$current     = Hatch_Features::get_theme();
	$features    = Hatch_Features::get_all();
	$catalog     = Hatch_Features::catalog();
	$groups      = Hatch_Features::group_labels();

	if ( $saved ): ?>
		<div class="hx-notice is-success">
			<span class="hx-icon-box is-success"><?php echo hatch_icon( 'check-circle' ); // phpcs:ignore ?></span>
			<div class="hx-notice-body">
				<p class="hx-notice-title"><?php esc_html_e( 'Saved', 'hatch' ); ?></p>
				<p class="hx-notice-message"><?php esc_html_e( 'Your frontend picks this up automatically within ~60 seconds (SSR + edge cache). No rebuild needed.', 'hatch' ); ?></p>
			</div>
		</div>
	<?php endif; ?>

	<!-- ============ THEME PICKER ============ -->
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="hx-card">
		<input type="hidden" name="action" value="hatch_save_theme"/>
		<?php wp_nonce_field( 'hatch_save_theme' ); ?>

		<div class="hx-card-head">
			<span class="hx-icon-box is-primary is-lg"><?php echo hatch_icon( 'sparkles' ); // phpcs:ignore ?></span>
			<div>
				<div class="hx-card-title"><?php esc_html_e( 'Theme', 'hatch' ); ?></div>
				<div class="hx-text-xs hx-text-muted">
					<?php esc_html_e( 'Pick the starter design your Astro frontend ships with.', 'hatch' ); ?>
				</div>
			</div>
		</div>

		<div class="hx-grid hx-mt-3" style="grid-template-columns:repeat(3, 1fr);">
			<?php foreach ( $themes as $slug => $t ): ?>
				<label class="hx-theme-card hx-card<?php echo $current === $slug ? ' is-selected' : ''; ?>" style="cursor:pointer; padding:14px; text-align:center;">
					<input type="radio" name="hatch_theme" value="<?php echo esc_attr( $slug ); ?>" <?php checked( $current, $slug ); ?>/>
					<div style="font-size:24px; line-height:1; margin-bottom:6px;"><?php echo esc_html( $t['icon'] ); ?></div>
					<div class="hx-card-title" style="font-size:14px;"><?php echo esc_html( $t['label'] ); ?></div>
					<div class="hx-text-xs hx-text-muted" style="margin-top:4px;"><?php echo esc_html( $t['description'] ); ?></div>
				</label>
			<?php endforeach; ?>
		</div>

		<script>
		(function(){
			// JS fallback for browsers without :has() — toggle .is-selected on click.
			var cards = document.querySelectorAll('.hx-theme-card');
			cards.forEach(function(card){
				card.addEventListener('click', function(){
					cards.forEach(function(c){ c.classList.remove('is-selected'); });
					card.classList.add('is-selected');
					var input = card.querySelector('input[type=radio]');
					if (input) input.checked = true;
				});
			});
		})();
		</script>

		<div class="hx-mt-3">
			<button type="submit" class="hx-btn is-primary">
				<?php echo hatch_icon( 'check' ); // phpcs:ignore ?>
				<?php esc_html_e( 'Save', 'hatch' ); ?>
			</button>
		</div>
	</form>

	<!-- ============ IMAGE OPTIMIZATION (moved from Connector v0.45) ============ -->
	<?php
	$img_proxy_now = trim( (string) get_option( 'hatch_image_proxy_url', '' ) );
	$frontend_url  = trim( (string) get_option( 'hatch_frontend_url', '' ) );
	$img_on        = (bool) $img_proxy_now;
	?>
	<div class="hx-card hx-mt-4" id="hatch-img-card">
		<div class="hx-card-head">
			<span class="hx-icon-box <?php echo $img_on ? 'is-success' : 'is-muted'; ?>" id="hatch-img-icon">
				<span style="font-size:18px;">&#128444;</span>
			</span>
			<div class="hx-flex-1">
				<div class="hx-card-title"><?php esc_html_e( 'Image optimization', 'hatch' ); ?></div>
				<div class="hx-text-xs hx-text-muted">
					<?php esc_html_e( 'Auto-converts WP media to WebP/AVIF on the fly, served from your own domain. Off = images load directly from WordPress (no optimization).', 'hatch' ); ?>
				</div>
			</div>
			<label class="hx-switch" style="align-self:center;">
				<input type="checkbox" id="hatch-img-toggle" <?php checked( $img_on ); ?>
					data-frontend="<?php echo esc_attr( untrailingslashit( $frontend_url ) ); ?>"
					data-nonce="<?php echo esc_attr( wp_create_nonce( 'wp_rest' ) ); ?>"
					data-endpoint="<?php echo esc_url_raw( rest_url( 'hatch/v1/options' ) ); ?>"/>
				<span class="hx-switch-track"></span>
			</label>
		</div>
		<div id="hatch-img-status" class="hx-text-xs hx-text-muted" style="margin-top:10px;">
			<?php echo $img_on ? esc_html__( 'Currently routing images through your own domain.', 'hatch' ) : esc_html__( 'Currently serving raw WP media URLs.', 'hatch' ); ?>
		</div>
	</div>
	<script>
	(function(){
		var toggle = document.getElementById('hatch-img-toggle');
		var status = document.getElementById('hatch-img-status');
		var icon   = document.getElementById('hatch-img-icon');
		if (!toggle) return;
		toggle.addEventListener('change', async function(){
			var enable = toggle.checked;
			var url = enable ? toggle.dataset.frontend : '';
			toggle.disabled = true;
			status.textContent = '<?php echo esc_js( __( 'Saving…', 'hatch' ) ); ?>';
			try {
				var res = await fetch(toggle.dataset.endpoint, {
					method: 'POST',
					headers: { 'Content-Type':'application/json', 'X-WP-Nonce': toggle.dataset.nonce },
					body: JSON.stringify({ hatch_image_proxy_url: url }),
				});
				if (res.ok) {
					status.textContent = enable
						? '<?php echo esc_js( __( '✓ On — images route through your own domain as WebP/AVIF.', 'hatch' ) ); ?>'
						: '<?php echo esc_js( __( '✓ Off — images load directly from WordPress.', 'hatch' ) ); ?>';
					icon.classList.toggle('is-success', enable);
					icon.classList.toggle('is-muted', !enable);
				} else {
					status.textContent = '<?php echo esc_js( __( '✕ Save failed — try again.', 'hatch' ) ); ?>';
					toggle.checked = !enable;
				}
			} catch (e) {
				status.textContent = '✕ ' + e.message;
				toggle.checked = !enable;
			}
			toggle.disabled = false;
		});
	})();
	</script>

	<!-- ============ FEATURE TOGGLES ============ -->
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="hx-card hx-mt-4">
		<input type="hidden" name="action" value="hatch_save_features"/>
		<?php wp_nonce_field( 'hatch_save_features' ); ?>

		<div class="hx-card-head">
			<span class="hx-icon-box is-info is-lg"><?php echo hatch_icon( 'cog' ); // phpcs:ignore ?></span>
			<div>
				<div class="hx-card-title"><?php esc_html_e( 'Features', 'hatch' ); ?></div>
				<div class="hx-text-xs hx-text-muted">
					<?php esc_html_e( 'Toggle headless features on/off. Your Astro frontend reads these flags from /hatch/v1/features.', 'hatch' ); ?>
				</div>
			</div>
		</div>

		<?php foreach ( $groups as $group_slug => $group_label ): ?>
			<h3 style="font-size:13px; font-weight:600; color:var(--hx-muted); text-transform:uppercase; letter-spacing:0.04em; margin-top:20px; margin-bottom:10px;">
				<?php echo esc_html( $group_label ); ?>
			</h3>
			<div class="hx-flex-col hx-gap-2">
				<?php foreach ( $catalog as $slug => $info ): ?>
					<?php if ( $info['group'] !== $group_slug ) continue; ?>
					<?php $is_on = ! empty( $features[ $slug ] ); ?>
					<div class="hx-toggle-row <?php echo $is_on ? 'is-on' : ''; ?>">
						<div class="hx-toggle-body">
							<label class="hx-toggle-label" for="feat-<?php echo esc_attr( $slug ); ?>"><?php echo esc_html( $info['label'] ); ?></label>
							<div class="hx-toggle-help"><?php echo esc_html( $info['description'] ); ?></div>
						</div>
						<label class="hx-switch">
							<input type="checkbox" id="feat-<?php echo esc_attr( $slug ); ?>"
							       name="hatch_features[<?php echo esc_attr( $slug ); ?>]" value="1"
							       <?php checked( $is_on ); ?>/>
							<span class="hx-switch-track"></span>
						</label>
					</div>
				<?php endforeach; ?>
			</div>
		<?php endforeach; ?>

		<div class="hx-mt-4">
			<button type="submit" class="hx-btn is-primary">
				<?php echo hatch_icon( 'check' ); // phpcs:ignore ?>
				<?php esc_html_e( 'Save', 'hatch' ); ?>
			</button>
		</div>
	</form>

	<?php
}

/* ==================================================================
 * TAB: DESIGN (design.md upload — brand tokens that flow to the frontend)
 * ================================================================== */
function hatch_render_design_tab(): void {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$saved   = ! empty( $_GET['saved'] );
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$cleared = ! empty( $_GET['cleared'] );
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$err     = ! empty( $_GET['error'] );

	$raw     = Hatch_Design_Loader::get_raw();
	$parsed  = Hatch_Design_Loader::get_design();
	$errors  = $err ? (array) get_transient( 'hatch_design_errors' ) : array();
	$example = file_exists( HATCH_PLUGIN_DIR . 'admin/design.example.md' )
		? file_get_contents( HATCH_PLUGIN_DIR . 'admin/design.example.md' )
		: '';

	if ( $saved ): ?>
		<div class="hx-notice is-success">
			<span class="hx-icon-box is-success"><?php echo hatch_icon( 'check-circle' ); // phpcs:ignore ?></span>
			<div class="hx-notice-body">
				<p class="hx-notice-title"><?php esc_html_e( 'Design tokens saved', 'hatch' ); ?></p>
				<p class="hx-notice-message"><?php esc_html_e( 'Your frontend picks this up automatically within ~60 seconds (SSR + edge cache). No rebuild needed.', 'hatch' ); ?></p>
			</div>
		</div>
	<?php endif; ?>

	<?php if ( $cleared ): ?>
		<div class="hx-notice is-soft">
			<span class="hx-icon-box"><?php echo hatch_icon( 'check' ); // phpcs:ignore ?></span>
			<div class="hx-notice-body">
				<p class="hx-notice-title"><?php esc_html_e( 'Design reset to defaults', 'hatch' ); ?></p>
				<p class="hx-notice-message"><?php esc_html_e( 'The frontend will fall back to the bundled theme defaults.', 'hatch' ); ?></p>
			</div>
		</div>
	<?php endif; ?>

	<?php if ( ! empty( $errors ) ): ?>
		<div class="hx-notice is-danger">
			<span class="hx-icon-box is-danger"><?php echo hatch_icon( 'x-circle' ); // phpcs:ignore ?></span>
			<div class="hx-notice-body">
				<p class="hx-notice-title"><?php esc_html_e( 'Design.md not saved — fix these first', 'hatch' ); ?></p>
				<ul style="margin: 6px 0 0; padding-left: 20px; font-size: 13px;">
					<?php foreach ( $errors as $e ): ?>
						<li><?php echo esc_html( (string) $e ); ?></li>
					<?php endforeach; ?>
				</ul>
			</div>
		</div>
	<?php endif; ?>

	<?php
	$b  = isset( $parsed['brand'] )     ? (array) $parsed['brand']     : array();
	$ly = isset( $parsed['layout'] )    ? (array) $parsed['layout']    : array();
	$vc = isset( $parsed['voice'] )     ? (array) $parsed['voice']     : array();
	$tp = isset( $parsed['templates'] ) ? (array) $parsed['templates'] : array();

	$cur_name    = (string) ( $b['name']    ?? '' );
	$cur_primary = (string) ( $b['primary'] ?? '#ff6b35' );
	$cur_accent  = (string) ( $b['accent']  ?? '#0a0a0a' );
	$cur_bg      = (string) ( $b['bg']      ?? '#ffffff' );
	$cur_fg      = (string) ( $b['fg']      ?? '#0a0a0a' );
	$cur_fh      = (string) ( $b['font_heading'] ?? 'Inter' );
	$cur_fb      = (string) ( $b['font_body']    ?? 'Inter' );
	$cur_fm      = (string) ( $b['font_mono']    ?? 'JetBrains Mono' );
	$cur_mode    = (string) ( $b['mode']    ?? 'auto' );
	$cur_density = (string) ( $ly['density']   ?? 'comfortable' );
	$cur_rounded = (string) ( $ly['rounded']   ?? 'smooth' );
	$cur_maxw    = (string) ( $ly['max_width'] ?? '1080' );
	$cur_tone     = (string) ( $vc['tone']     ?? 'professional' );
	$cur_pronouns = (string) ( $vc['pronouns'] ?? 'we' );
	$cur_sb   = (string) ( $tp['single_sidebar']   ?? 'right' );
	$cur_sh   = (string) ( $tp['single_hero']      ?? 'featured' );
	$cur_sw   = (string) ( $tp['single_width']     ?? 'medium' );
	$cur_ag   = (string) ( $tp['archive_grid']     ?? '2' );
	$cur_aexc = (string) ( $tp['archive_excerpt']  ?? 'true' );
	$cur_nfs  = (string) ( $tp['not_found_search'] ?? 'true' );

	$sans_fonts  = array( 'Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat', 'Raleway', 'Outfit', 'Manrope', 'DM Sans', 'Plus Jakarta Sans', 'Space Grotesk', 'IBM Plex Sans', 'Source Sans 3', 'Work Sans', 'Nunito' );
	$serif_fonts = array( 'Merriweather', 'Playfair Display', 'Lora', 'Crimson Pro', 'Roboto Slab', 'EB Garamond', 'Source Serif 4', 'Libre Baskerville', 'Cardo', 'Cormorant Garamond' );
	$mono_fonts  = array( 'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'Source Code Pro', 'Roboto Mono', 'Space Mono' );
	$all_text_fonts = array_merge( $sans_fonts, $serif_fonts );
	?>

	<div class="hx-card">
		<div class="hx-card-head">
			<span class="hx-icon-box is-primary is-lg"><?php echo hatch_icon( 'sparkles' ); // phpcs:ignore ?></span>
			<div class="hx-flex-1">
				<div class="hx-card-title"><?php esc_html_e( 'Design — your brand, point and click', 'hatch' ); ?></div>
				<div class="hx-text-xs hx-text-muted">
					<?php esc_html_e( 'Pick colors, fonts, and layout density. Saves to design.md and propagates to your Astro frontend within ~60 seconds. No rebuild.', 'hatch' ); ?>
				</div>
			</div>
			<div class="hx-flex hx-gap-1" id="hx-design-modes" style="background:var(--hx-surface); padding:3px; border-radius:8px;">
				<button type="button" class="hx-btn is-ghost is-sm is-active" data-mode="visual" style="border:0;"><?php esc_html_e( 'Visual', 'hatch' ); ?></button>
				<button type="button" class="hx-btn is-ghost is-sm" data-mode="code" style="border:0;"><?php esc_html_e( 'Code (advanced)', 'hatch' ); ?></button>
			</div>
		</div>

		<form id="hx-design-visual" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="hx-mt-3">
			<input type="hidden" name="action" value="hatch_save_design_visual"/>
			<?php wp_nonce_field( 'hatch_save_design_visual' ); ?>

			<h3 style="font-size:13px; text-transform:uppercase; letter-spacing:.06em; color:var(--hx-muted); margin:18px 0 10px;"><?php esc_html_e( 'Brand', 'hatch' ); ?></h3>

			<label class="hx-field">
				<span class="hx-field-label"><?php esc_html_e( 'Site name', 'hatch' ); ?></span>
				<input type="text" name="hatch_design[brand][name]" value="<?php echo esc_attr( $cur_name ); ?>" placeholder="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>" class="hx-input" style="max-width:420px;"/>
				<span class="hx-text-xs hx-text-muted" style="margin-top:4px;"><?php esc_html_e( 'Leave blank to use the WP General Settings site title.', 'hatch' ); ?></span>
			</label>

			<div class="hx-grid hx-mt-3" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:14px;">
				<?php foreach ( array(
					'primary' => array( 'label' => __( 'Primary',    'hatch' ), 'value' => $cur_primary ),
					'accent'  => array( 'label' => __( 'Accent',     'hatch' ), 'value' => $cur_accent  ),
					'bg'      => array( 'label' => __( 'Background', 'hatch' ), 'value' => $cur_bg      ),
					'fg'      => array( 'label' => __( 'Foreground', 'hatch' ), 'value' => $cur_fg      ),
				) as $k => $cfg ): ?>
					<label class="hx-field" style="margin:0;">
						<span class="hx-field-label"><?php echo esc_html( $cfg['label'] ); ?></span>
						<div style="display:flex; gap:8px; align-items:center;">
							<input type="color" name="hatch_design[brand][<?php echo esc_attr( $k ); ?>]" value="<?php echo esc_attr( $cfg['value'] ); ?>"
								style="width:46px; height:38px; padding:2px; border:1px solid var(--hx-border); border-radius:6px; background:none; cursor:pointer;"
								oninput="this.nextElementSibling.value=this.value"/>
							<input type="text" value="<?php echo esc_attr( $cfg['value'] ); ?>" readonly
								style="flex:1; padding:8px 10px; border:1px solid var(--hx-border); border-radius:6px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; background:var(--hx-surface);"/>
						</div>
					</label>
				<?php endforeach; ?>
			</div>

			<label class="hx-field hx-mt-3">
				<span class="hx-field-label"><?php esc_html_e( 'Color mode', 'hatch' ); ?></span>
				<select name="hatch_design[brand][mode]" class="hx-input" style="max-width:240px;">
					<?php foreach ( array( 'auto' => __( 'Auto (follow system)', 'hatch' ), 'light' => __( 'Always Light', 'hatch' ), 'dark' => __( 'Always Dark', 'hatch' ) ) as $v => $lab ) : ?>
						<option value="<?php echo esc_attr( $v ); ?>" <?php selected( $cur_mode, $v ); ?>><?php echo esc_html( $lab ); ?></option>
					<?php endforeach; ?>
				</select>
			</label>

			<h3 style="font-size:13px; text-transform:uppercase; letter-spacing:.06em; color:var(--hx-muted); margin:22px 0 10px;"><?php esc_html_e( 'Typography', 'hatch' ); ?></h3>

			<div class="hx-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:14px;">
				<label class="hx-field" style="margin:0;">
					<span class="hx-field-label"><?php esc_html_e( 'Heading font', 'hatch' ); ?></span>
					<select name="hatch_design[brand][font_heading]" class="hx-input">
						<?php foreach ( $all_text_fonts as $font ): ?>
							<option value="<?php echo esc_attr( $font ); ?>" <?php selected( $cur_fh, $font ); ?>><?php echo esc_html( $font ); ?></option>
						<?php endforeach; ?>
					</select>
				</label>
				<label class="hx-field" style="margin:0;">
					<span class="hx-field-label"><?php esc_html_e( 'Body font', 'hatch' ); ?></span>
					<select name="hatch_design[brand][font_body]" class="hx-input">
						<?php foreach ( $all_text_fonts as $font ): ?>
							<option value="<?php echo esc_attr( $font ); ?>" <?php selected( $cur_fb, $font ); ?>><?php echo esc_html( $font ); ?></option>
						<?php endforeach; ?>
					</select>
				</label>
				<label class="hx-field" style="margin:0;">
					<span class="hx-field-label"><?php esc_html_e( 'Mono font', 'hatch' ); ?></span>
					<select name="hatch_design[brand][font_mono]" class="hx-input">
						<?php foreach ( $mono_fonts as $font ): ?>
							<option value="<?php echo esc_attr( $font ); ?>" <?php selected( $cur_fm, $font ); ?>><?php echo esc_html( $font ); ?></option>
						<?php endforeach; ?>
					</select>
				</label>
			</div>
			<p class="hx-text-xs hx-text-muted" style="margin-top:6px;"><?php esc_html_e( 'All fonts come from Google Fonts. Lazy-loaded on the frontend — no impact on initial paint.', 'hatch' ); ?></p>

			<h3 style="font-size:13px; text-transform:uppercase; letter-spacing:.06em; color:var(--hx-muted); margin:22px 0 10px;"><?php esc_html_e( 'Layout', 'hatch' ); ?></h3>

			<?php
			$radio_group = static function ( string $name, array $options, string $current ): void {
				echo '<div class="hx-flex hx-gap-2" style="flex-wrap:wrap;">';
				foreach ( $options as $val => $lab ) {
					$active = $current === $val ? 'background:var(--hx-surface); border-color:var(--hx-fg);' : '';
					printf(
						'<label style="display:inline-flex; gap:6px; align-items:center; padding:8px 14px; border:1px solid var(--hx-border); border-radius:6px; font-size:13px; cursor:pointer; %s"><input type="radio" name="%s" value="%s" %s/>%s</label>',
						esc_attr( $active ),
						esc_attr( $name ),
						esc_attr( $val ),
						checked( $current, $val, false ),
						esc_html( $lab )
					);
				}
				echo '</div>';
			};
			?>

			<label class="hx-field">
				<span class="hx-field-label"><?php esc_html_e( 'Density', 'hatch' ); ?></span>
				<?php $radio_group( 'hatch_design[layout][density]', array( 'compact' => __( 'Compact', 'hatch' ), 'comfortable' => __( 'Comfortable', 'hatch' ), 'spacious' => __( 'Spacious', 'hatch' ) ), $cur_density ); ?>
			</label>
			<label class="hx-field hx-mt-3">
				<span class="hx-field-label"><?php esc_html_e( 'Roundness', 'hatch' ); ?></span>
				<?php $radio_group( 'hatch_design[layout][rounded]', array( 'sharp' => __( 'Sharp', 'hatch' ), 'smooth' => __( 'Smooth', 'hatch' ), 'extra' => __( 'Extra round', 'hatch' ) ), $cur_rounded ); ?>
			</label>
			<label class="hx-field hx-mt-3">
				<span class="hx-field-label"><?php esc_html_e( 'Max content width', 'hatch' ); ?></span>
				<?php $radio_group( 'hatch_design[layout][max_width]', array( '720' => '720px (narrow)', '1080' => '1080px (default)', '1280' => '1280px (wide)' ), $cur_maxw ); ?>
			</label>

			<details style="margin-top:22px;">
				<summary style="cursor:pointer; font-size:13px; text-transform:uppercase; letter-spacing:.06em; color:var(--hx-muted); font-weight:600;"><?php esc_html_e( 'Page templates (advanced)', 'hatch' ); ?></summary>
				<div style="padding-top:14px;">
					<label class="hx-field hx-mt-3">
						<span class="hx-field-label"><?php esc_html_e( 'Single post sidebar', 'hatch' ); ?></span>
						<?php $radio_group( 'hatch_design[templates][single_sidebar]', array( 'right' => __( 'Right', 'hatch' ), 'left' => __( 'Left', 'hatch' ), 'none' => __( 'None', 'hatch' ) ), $cur_sb ); ?>
					</label>
					<label class="hx-field hx-mt-3">
						<span class="hx-field-label"><?php esc_html_e( 'Single post hero', 'hatch' ); ?></span>
						<?php $radio_group( 'hatch_design[templates][single_hero]', array( 'featured' => __( 'Tall (2:1)', 'hatch' ), 'compact' => __( 'Compact (3:1)', 'hatch' ), 'none' => __( 'None', 'hatch' ) ), $cur_sh ); ?>
					</label>
					<label class="hx-field hx-mt-3">
						<span class="hx-field-label"><?php esc_html_e( 'Single post width', 'hatch' ); ?></span>
						<?php $radio_group( 'hatch_design[templates][single_width]', array( 'narrow' => __( 'Narrow', 'hatch' ), 'medium' => __( 'Medium', 'hatch' ), 'wide' => __( 'Wide', 'hatch' ) ), $cur_sw ); ?>
					</label>
					<label class="hx-field hx-mt-3">
						<span class="hx-field-label"><?php esc_html_e( 'Archive grid columns', 'hatch' ); ?></span>
						<?php $radio_group( 'hatch_design[templates][archive_grid]', array( '1' => '1', '2' => '2', '3' => '3' ), $cur_ag ); ?>
					</label>
					<label class="hx-field hx-mt-3">
						<span class="hx-field-label"><?php esc_html_e( 'Show excerpt on archive cards', 'hatch' ); ?></span>
						<?php $radio_group( 'hatch_design[templates][archive_excerpt]', array( 'true' => __( 'Yes', 'hatch' ), 'false' => __( 'No', 'hatch' ) ), $cur_aexc ); ?>
					</label>
					<label class="hx-field hx-mt-3">
						<span class="hx-field-label"><?php esc_html_e( 'Show search on 404', 'hatch' ); ?></span>
						<?php $radio_group( 'hatch_design[templates][not_found_search]', array( 'true' => __( 'Yes', 'hatch' ), 'false' => __( 'No', 'hatch' ) ), $cur_nfs ); ?>
					</label>
				</div>
			</details>

			<input type="hidden" name="hatch_design[voice][tone]" value="<?php echo esc_attr( $cur_tone ); ?>"/>
			<input type="hidden" name="hatch_design[voice][pronouns]" value="<?php echo esc_attr( $cur_pronouns ); ?>"/>

			<div class="hx-mt-3 hx-flex hx-gap-2" style="border-top:1px solid var(--hx-border); padding-top:18px; margin-top:24px;">
				<button type="submit" class="hx-btn is-primary">
					<?php echo hatch_icon( 'check' ); // phpcs:ignore ?>
					<?php esc_html_e( 'Save', 'hatch' ); ?>
				</button>
				<span class="hx-text-xs hx-text-muted" style="align-self:center;"><?php esc_html_e( 'Frontend picks up changes within 60 seconds.', 'hatch' ); ?></span>
			</div>
		</form>

		<form id="hx-design-code" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="hx-mt-3" style="display:none;">
			<input type="hidden" name="action" value="hatch_save_design"/>
			<?php wp_nonce_field( 'hatch_save_design' ); ?>

			<label class="hx-field hx-mt-3">
				<span class="hx-field-label"><?php esc_html_e( 'Your design.md', 'hatch' ); ?></span>
				<textarea name="hatch_design_md" rows="22" spellcheck="false"
					style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.6; max-width: none; min-height: 360px;"
					class="hx-input"
					placeholder="<?php echo esc_attr( $example ); ?>"><?php echo esc_textarea( $raw ); ?></textarea>
			</label>

			<div class="hx-mt-3 hx-flex hx-gap-2">
				<button type="submit" class="hx-btn is-primary">
					<?php echo hatch_icon( 'check' ); // phpcs:ignore ?>
					<?php esc_html_e( 'Save', 'hatch' ); ?>
				</button>
				<button type="submit" name="hatch_design_clear" value="1" class="hx-btn is-ghost">
					<?php esc_html_e( 'Reset to defaults', 'hatch' ); ?>
				</button>
			</div>
		</form>
	</div>

	<script>
	(function(){
		var btns = document.querySelectorAll('#hx-design-modes [data-mode]');
		var visual = document.getElementById('hx-design-visual');
		var code = document.getElementById('hx-design-code');
		btns.forEach(function(btn){
			btn.addEventListener('click', function(){
				var mode = btn.dataset.mode;
				btns.forEach(function(b){ b.classList.toggle('is-active', b === btn); });
				visual.style.display = mode === 'visual' ? '' : 'none';
				code.style.display = mode === 'code' ? '' : 'none';
			});
		});
	})();
	</script>

	<!-- Live preview of parsed tokens -->
	<div class="hx-card hx-mt-4">
		<div class="hx-card-head">
			<span class="hx-icon-box is-info is-lg"><?php echo hatch_icon( 'eye' ); // phpcs:ignore ?></span>
			<div>
				<div class="hx-card-title"><?php esc_html_e( 'Parsed tokens (what the frontend gets)', 'hatch' ); ?></div>
				<div class="hx-text-xs hx-text-muted"><?php esc_html_e( 'These map 1:1 to CSS variables on the Astro side. The body section is ignored at render time (saved for future AI rebuild flows).', 'hatch' ); ?></div>
			</div>
		</div>
		<div class="hx-grid hx-mt-3" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:14px;">
			<?php
			$groups = array(
				'brand'  => __( 'Brand', 'hatch' ),
				'layout' => __( 'Layout', 'hatch' ),
				'voice'  => __( 'Voice', 'hatch' ),
			);
			foreach ( $groups as $g => $label ):
				if ( empty( $parsed[ $g ] ) ) continue;
				?>
				<div style="border:1px solid var(--hx-border); border-radius: 8px; padding: 14px 16px;">
					<div class="hx-text-xs hx-text-muted" style="text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 8px;">
						<?php echo esc_html( $label ); ?>
					</div>
					<?php foreach ( $parsed[ $g ] as $k => $v ): ?>
						<div style="display:flex; justify-content: space-between; gap: 10px; font-size: 12.5px; padding: 4px 0; border-top: 1px solid var(--hx-bg-3); font-family: ui-monospace, monospace;">
							<span style="color: var(--hx-muted);"><?php echo esc_html( $k ); ?></span>
							<span style="color: var(--hx-fg); display: inline-flex; align-items: center; gap: 6px;">
								<?php if ( in_array( $k, array( 'primary', 'accent', 'fg', 'bg' ), true ) && preg_match( '/^#[0-9a-f]+$/i', (string) $v ) ): ?>
									<span style="width:14px; height:14px; border-radius:3px; background: <?php echo esc_attr( (string) $v ); ?>; border: 1px solid var(--hx-border);"></span>
								<?php endif; ?>
								<?php echo esc_html( (string) $v ); ?>
							</span>
						</div>
					<?php endforeach; ?>
				</div>
			<?php endforeach; ?>
		</div>
	</div>

	<?php
}

/* ==================================================================
 * TAB: INTEGRATIONS (SEO + Forms + Turnstile + Comments)
 * ================================================================== */
function hatch_render_integrations_tab(): void {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$saved      = ! empty( $_GET['saved'] );
	$cfg        = Hatch_Integrations::get_all();
	$seo_det    = Hatch_Integrations::detect_seo();
	$forms_det  = Hatch_Integrations::detect_forms();
	// FluentCRM stripped in v0.30 — newsletter handling moved into Fluent Forms.
	$ff_forms   = ( 'fluent_forms' === $forms_det['slug'] ) ? Hatch_Integrations::fluent_forms_list() : array();

	if ( $saved ): ?>
		<div class="hx-notice is-success">
			<span class="hx-icon-box is-success"><?php echo hatch_icon( 'check-circle' ); // phpcs:ignore ?></span>
			<div class="hx-notice-body">
				<p class="hx-notice-title"><?php esc_html_e( 'Integration settings saved', 'hatch' ); ?></p>
				<p class="hx-notice-message"><?php esc_html_e( 'Your frontend picks this up automatically within ~60 seconds (SSR + edge cache).', 'hatch' ); ?></p>
			</div>
		</div>
	<?php endif;

	// v0.30 — ACF expose result notice.
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if ( ! empty( $_GET['acf'] ) ):
		$acf_result = (array) get_transient( 'hatch_acf_expose_result' );
		delete_transient( 'hatch_acf_expose_result' );
		$is_ok = ! empty( $acf_result['ok'] );
		?>
		<div class="hx-notice <?php echo $is_ok ? 'is-success' : 'is-warning'; ?>">
			<span class="hx-icon-box <?php echo $is_ok ? 'is-success' : 'is-warning'; ?>"><?php echo hatch_icon( $is_ok ? 'check-circle' : 'x-circle' ); // phpcs:ignore ?></span>
			<div class="hx-notice-body">
				<p class="hx-notice-title"><?php esc_html_e( 'ACF expose result', 'hatch' ); ?></p>
				<p class="hx-notice-message"><?php echo esc_html( (string) ( $acf_result['message'] ?? '' ) ); ?></p>
			</div>
		</div>
	<?php endif;

	// v0.49.2 — Menus card (moved here from Connector tab — sits with other frontend integrations).
	$all_menus      = wp_get_nav_menus( array( 'hide_empty' => false ) );
	$primary_choice = (int) get_option( 'hatch_menu_primary_id', 0 );
	$footer_choice  = (int) get_option( 'hatch_menu_footer_id',  0 );
	if ( ! empty( $all_menus ) ) :
		?>
		<div class="hx-card hx-mt-4">
			<div class="hx-card-head">
				<span class="hx-icon-box is-info"><?php echo hatch_icon( 'menu' ); // phpcs:ignore ?></span>
				<div>
					<div class="hx-card-title"><?php esc_html_e( 'Menus', 'hatch' ); ?></div>
					<div class="hx-text-xs hx-text-muted">
						<?php esc_html_e( 'Choose which menu the headless header and footer render. Leave Auto to use the theme location, falling back to the first menu.', 'hatch' ); ?>
					</div>
				</div>
			</div>
			<form method="post" action="options.php" style="margin-top:14px;">
				<?php settings_fields( 'hatch_settings' ); ?>
				<div class="hx-field">
					<label class="hx-label" for="hatch_menu_primary_id"><?php esc_html_e( 'Primary (header) menu', 'hatch' ); ?></label>
					<select class="hx-input" id="hatch_menu_primary_id" name="hatch_menu_primary_id">
						<option value="0"><?php esc_html_e( 'Auto — use theme location / first menu', 'hatch' ); ?></option>
						<?php foreach ( $all_menus as $m ) : ?>
							<option value="<?php echo (int) $m->term_id; ?>" <?php selected( $primary_choice, $m->term_id ); ?>>
								<?php echo esc_html( $m->name ); ?> (<?php echo (int) $m->count; ?>)
							</option>
						<?php endforeach; ?>
					</select>
				</div>
				<div class="hx-field">
					<label class="hx-label" for="hatch_menu_footer_id"><?php esc_html_e( 'Footer menu', 'hatch' ); ?></label>
					<select class="hx-input" id="hatch_menu_footer_id" name="hatch_menu_footer_id">
						<option value="0"><?php esc_html_e( 'Auto — use theme location / first menu', 'hatch' ); ?></option>
						<?php foreach ( $all_menus as $m ) : ?>
							<option value="<?php echo (int) $m->term_id; ?>" <?php selected( $footer_choice, $m->term_id ); ?>>
								<?php echo esc_html( $m->name ); ?> (<?php echo (int) $m->count; ?>)
							</option>
						<?php endforeach; ?>
					</select>
				</div>
				<button type="submit" class="hx-btn is-ghost">
					<?php echo hatch_icon( 'check' ); // phpcs:ignore ?>
					<?php esc_html_e( 'Save', 'hatch' ); ?>
				</button>
				<a class="hx-btn is-ghost" href="<?php echo esc_url( admin_url( 'nav-menus.php' ) ); ?>" target="_blank" rel="noopener" style="margin-left:6px;">
					<?php esc_html_e( 'Edit menus →', 'hatch' ); ?>
				</a>
			</form>
		</div>
	<?php else : ?>
		<div class="hx-card hx-mt-4">
			<div class="hx-card-head">
				<span class="hx-icon-box is-warning"><?php echo hatch_icon( 'menu' ); // phpcs:ignore ?></span>
				<div>
					<div class="hx-card-title"><?php esc_html_e( 'No menus yet', 'hatch' ); ?></div>
					<div class="hx-text-xs hx-text-muted">
						<?php esc_html_e( 'Create a menu in Appearance → Menus, then return here to pick which one the headless header and footer render.', 'hatch' ); ?>
					</div>
				</div>
			</div>
			<a class="hx-btn is-primary" href="<?php echo esc_url( admin_url( 'nav-menus.php' ) ); ?>" target="_blank" rel="noopener" style="margin-top:10px;">
				<?php esc_html_e( 'Create your first menu →', 'hatch' ); ?>
			</a>
		</div>
	<?php endif; ?>

	<?php
	// v0.30 — Headless dynamic data card. ACF auto-expose + redirect plugin recommendation.
	$acf_status     = Hatch_Acf_Bridge::get_field_group_status();
	$acf_plugin     = (string) $acf_status['plugin'];
	$acf_hidden     = (int) $acf_status['hidden'];
	$acf_total      = (int) $acf_status['total_groups'];
	$has_acf        = in_array( $acf_plugin, array( 'acf', 'acf_pro', 'secure_cf' ), true );
	$has_redirection = Hatch_Detector::is_active( 'redirection' );
	$has_rm_redir   = Hatch_Detector::is_active( 'rankmath' );
	?>
	<div class="hx-card hx-mb-4">
		<div class="hx-card-head">
			<span class="hx-icon-box is-info is-lg"><?php echo hatch_icon( 'cog' ); // phpcs:ignore ?></span>
			<div class="hx-flex-1">
				<div class="hx-card-title"><?php esc_html_e( 'Headless dynamic data', 'hatch' ); ?></div>
				<div class="hx-text-xs hx-text-muted">
					<?php esc_html_e( 'Plumbing for the bits WordPress hides behind toggles — ACF custom fields, redirects, search. Get these on once and forget them.', 'hatch' ); ?>
				</div>
			</div>
		</div>

		<div class="hx-grid hx-mt-3" style="grid-template-columns: 1fr; gap:14px;">

			<!-- ACF custom fields -->
			<div style="padding: 14px 16px; border: 1px solid var(--hx-border); border-radius: 8px;">
				<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
					<strong style="font-size:14px;"><?php esc_html_e( 'ACF custom fields in REST', 'hatch' ); ?></strong>
					<?php if ( $has_acf ): ?>
						<?php if ( $acf_hidden > 0 ): ?>
							<span class="hx-pill is-warning">
								<?php /* translators: 1: hidden groups, 2: total */
								printf( esc_html__( '%1$d of %2$d groups hidden', 'hatch' ), $acf_hidden, $acf_total ); ?>
							</span>
						<?php elseif ( $acf_total > 0 ): ?>
							<span class="hx-pill is-success"><?php esc_html_e( 'All exposed', 'hatch' ); ?></span>
						<?php else: ?>
							<span class="hx-pill is-soft"><?php esc_html_e( 'No groups yet', 'hatch' ); ?></span>
						<?php endif; ?>
					<?php elseif ( 'meta_box' === $acf_plugin ): ?>
						<span class="hx-pill is-soft"><?php esc_html_e( 'Meta Box detected', 'hatch' ); ?></span>
					<?php elseif ( 'pods' === $acf_plugin ): ?>
						<span class="hx-pill is-soft"><?php esc_html_e( 'Pods detected', 'hatch' ); ?></span>
					<?php else: ?>
						<span class="hx-pill is-soft"><?php esc_html_e( 'ACF not installed', 'hatch' ); ?></span>
					<?php endif; ?>
				</div>
				<p class="hx-text-xs hx-text-muted" style="margin: 8px 0 12px;">
					<?php esc_html_e( 'WordPress hides ACF fields from /wp/v2/posts unless every field group has show_in_rest=true. Headless setups need it on by default. One click flips it for every group.', 'hatch' ); ?>
				</p>
				<?php if ( $has_acf && $acf_hidden > 0 ): ?>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline;">
						<input type="hidden" name="action" value="hatch_expose_acf"/>
						<?php wp_nonce_field( 'hatch_expose_acf' ); ?>
						<button type="submit" class="hx-btn is-primary is-sm">
							<?php echo hatch_icon( 'check' ); // phpcs:ignore ?>
							<?php /* translators: %d: hidden count */
							printf( esc_html__( 'Expose %d hidden group(s) to REST', 'hatch' ), $acf_hidden ); ?>
						</button>
					</form>
				<?php elseif ( 'meta_box' === $acf_plugin ): ?>
					<span class="hx-text-xs hx-text-muted"><?php esc_html_e( 'Set show_in_rest on each Meta Box group in its registration. Hatch doesn\'t auto-edit Meta Box groups (they\'re typically in code).', 'hatch' ); ?></span>
				<?php elseif ( 'pods' === $acf_plugin ): ?>
					<span class="hx-text-xs hx-text-muted"><?php esc_html_e( 'Set show_in_rest on each Pod field in Pods → Edit Pod → Advanced Options → REST API.', 'hatch' ); ?></span>
				<?php elseif ( 'none' === $acf_plugin ): ?>
					<span class="hx-text-xs hx-text-muted"><?php esc_html_e( 'Install ACF or Secure Custom Fields to add custom fields to your posts/pages, then come back here to expose them.', 'hatch' ); ?></span>
				<?php endif; ?>
			</div>

			<!-- Redirects -->
			<div style="padding: 14px 16px; border: 1px solid var(--hx-border); border-radius: 8px;">
				<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
					<strong style="font-size:14px;"><?php esc_html_e( 'Redirects', 'hatch' ); ?></strong>
					<?php if ( $has_redirection ): ?>
						<span class="hx-pill is-success"><?php esc_html_e( 'Redirection plugin · recommended', 'hatch' ); ?></span>
					<?php elseif ( $has_rm_redir ): ?>
						<span class="hx-pill is-soft"><?php esc_html_e( 'RankMath redirections (works)', 'hatch' ); ?></span>
					<?php else: ?>
						<span class="hx-pill is-soft"><?php esc_html_e( 'No redirect source', 'hatch' ); ?></span>
					<?php endif; ?>
				</div>
				<p class="hx-text-xs hx-text-muted" style="margin: 8px 0 0;">
					<?php
					if ( $has_redirection ) {
						esc_html_e( 'Hatch reads your Redirection plugin rules at GET /hatch/v1/redirects and the Astro frontend applies them at the edge.', 'hatch' );
					} elseif ( $has_rm_redir ) {
						printf(
							wp_kses( __( 'RankMath redirections work but ship a lot of SEO bloat. For redirects-only, install <a href="%s" target="_blank" rel="noopener noreferrer">Redirection</a> (free, purpose-built).', 'hatch' ), array( 'a' => array( 'href' => true, 'target' => true, 'rel' => true ) ) ),
							esc_url( 'https://wordpress.org/plugins/redirection/' )
						);
					} else {
						printf(
							wp_kses( __( 'Hatch recommends the <a href="%s" target="_blank" rel="noopener noreferrer">Redirection plugin</a> (free, purpose-built) over the bundled RankMath/Yoast Premium redirect modules. Install it, add rules in Tools → Redirection, Hatch surfaces them automatically.', 'hatch' ), array( 'a' => array( 'href' => true, 'target' => true, 'rel' => true ) ) ),
							esc_url( 'https://wordpress.org/plugins/redirection/' )
						);
					}
					?>
				</p>
			</div>

			<!-- Pages + Posts + Search status -->
			<div style="padding: 14px 16px; border: 1px solid var(--hx-border); border-radius: 8px;">
				<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
					<strong style="font-size:14px;"><?php esc_html_e( 'Dynamic content surfaces', 'hatch' ); ?></strong>
					<span class="hx-pill is-success"><?php esc_html_e( 'All wired', 'hatch' ); ?></span>
				</div>
				<ul style="margin: 10px 0 0 0; padding: 0; list-style: none; font-size: 12.5px; color: var(--hx-muted); line-height: 1.8;">
					<li>✓ <?php esc_html_e( 'Posts — /blog/[slug], category/[slug], tag/[slug], author/[slug] all dynamic', 'hatch' ); ?></li>
					<li>✓ <?php esc_html_e( 'Pages — /[...slug] resolves any WP Page (including nested)', 'hatch' ); ?></li>
					<li>✓ <?php esc_html_e( 'Custom Post Types — auto-detected from /wp/v2 routes (use [...slug] for routing)', 'hatch' ); ?></li>
					<li>✓ <?php esc_html_e( 'Search — /search?q=… (WP REST ?search= backed)', 'hatch' ); ?></li>
					<li>✓ <?php esc_html_e( 'RSS + Sitemap — /rss.xml and /sitemap-index.xml', 'hatch' ); ?></li>
					<li>✓ <?php esc_html_e( 'Comments — /hatch/v1/comments (live, no rebuild)', 'hatch' ); ?></li>
					<li>✓ <?php esc_html_e( 'Menus — /hatch/v1/menus/{primary|footer} from WP Appearance → Menus', 'hatch' ); ?></li>
					<li>✓ <?php esc_html_e( 'SEO Schema — /hatch/v1/schema (RankMath/Yoast graph + fallback)', 'hatch' ); ?></li>
					<li>✓ <?php esc_html_e( 'WooCommerce — /hatch/v1/store/products + variations + categories', 'hatch' ); ?></li>
				</ul>
			</div>

		</div>
	</div>

	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="hx-card">
		<input type="hidden" name="action" value="hatch_save_integrations"/>
		<?php wp_nonce_field( 'hatch_save_integrations' ); ?>

		<!-- ============ SEO ============ -->
		<div class="hx-card-head">
			<span class="hx-icon-box is-primary is-lg"><?php echo hatch_icon( 'sparkles' ); // phpcs:ignore ?></span>
			<div>
				<div class="hx-card-title"><?php esc_html_e( 'SEO Plugin', 'hatch' ); ?></div>
				<div class="hx-text-xs hx-text-muted"><?php esc_html_e( 'Hatch auto-detects your SEO plugin and pipes its <head> + schema to the headless frontend.', 'hatch' ); ?></div>
			</div>
			<?php if ( $seo_det['active'] ): ?>
				<span class="hx-pill is-success" style="margin-left:auto;">
					<?php echo hatch_icon( 'check' ); // phpcs:ignore ?>
					<?php echo esc_html( $seo_det['label'] ); ?>
				</span>
			<?php else: ?>
				<span class="hx-pill is-soft" style="margin-left:auto;"><?php esc_html_e( 'None detected', 'hatch' ); ?></span>
			<?php endif; ?>
		</div>

		<div class="hx-flex-col hx-gap-3 hx-mt-3">
			<label class="hx-field">
				<span class="hx-field-label"><?php esc_html_e( 'Mode', 'hatch' ); ?></span>
				<select name="hatch_integrations[seo][mode]" class="hx-input">
					<option value="auto"     <?php selected( $cfg['seo']['mode'], 'auto' ); ?>><?php esc_html_e( 'Auto-detect (recommended)', 'hatch' ); ?></option>
					<option value="yoast"    <?php selected( $cfg['seo']['mode'], 'yoast' ); ?>><?php esc_html_e( 'Force Yoast SEO', 'hatch' ); ?></option>
					<option value="rankmath" <?php selected( $cfg['seo']['mode'], 'rankmath' ); ?>><?php esc_html_e( 'Force Rank Math', 'hatch' ); ?></option>
					<option value="seopress" <?php selected( $cfg['seo']['mode'], 'seopress' ); ?>><?php esc_html_e( 'Force SEOPress', 'hatch' ); ?></option>
					<option value="aioseo"   <?php selected( $cfg['seo']['mode'], 'aioseo' ); ?>><?php esc_html_e( 'Force All in One SEO', 'hatch' ); ?></option>
					<option value="off"      <?php selected( $cfg['seo']['mode'], 'off' ); ?>><?php esc_html_e( 'Off (Hatch fallback only)', 'hatch' ); ?></option>
				</select>
			</label>
			<div class="hx-toggle-row <?php echo $cfg['seo']['schema'] ? 'is-on' : ''; ?>">
				<div class="hx-toggle-body">
					<label class="hx-toggle-label" for="seo-schema"><?php esc_html_e( 'JSON-LD schema pass-through', 'hatch' ); ?></label>
					<div class="hx-toggle-help"><?php esc_html_e( 'Article / Person / BreadcrumbList JSON-LD blocks flow from your SEO plugin to the rendered HTML untouched.', 'hatch' ); ?></div>
				</div>
				<label class="hx-switch">
					<input type="checkbox" id="seo-schema" name="hatch_integrations[seo][schema]" value="1" <?php checked( $cfg['seo']['schema'] ); ?>/>
					<span class="hx-switch-track"></span>
				</label>
			</div>
			<div class="hx-toggle-row <?php echo $cfg['seo']['sitemap'] ? 'is-on' : ''; ?>">
				<div class="hx-toggle-body">
					<label class="hx-toggle-label" for="seo-sitemap"><?php esc_html_e( 'Merge sitemap with Astro', 'hatch' ); ?></label>
					<div class="hx-toggle-help"><?php esc_html_e( 'Single /sitemap.xml at your frontend covering both Astro routes and CMS content.', 'hatch' ); ?></div>
				</div>
				<label class="hx-switch">
					<input type="checkbox" id="seo-sitemap" name="hatch_integrations[seo][sitemap]" value="1" <?php checked( $cfg['seo']['sitemap'] ); ?>/>
					<span class="hx-switch-track"></span>
				</label>
			</div>
		</div>

		<!-- ============ FORMS ============ -->
		<div class="hx-card-head" style="margin-top:24px; padding-top:24px; border-top:1px solid var(--hx-border);">
			<span class="hx-icon-box is-info is-lg"><?php echo hatch_icon( 'cube' ); // phpcs:ignore ?></span>
			<div>
				<div class="hx-card-title"><?php esc_html_e( 'Forms', 'hatch' ); ?></div>
				<div class="hx-text-xs hx-text-muted"><?php esc_html_e( 'Hatch auto-detects your form plugin. Install Fluent Forms (free, recommended) and the headless frontend will use it automatically.', 'hatch' ); ?></div>
			</div>
			<?php if ( $forms_det['active'] ): ?>
				<span class="hx-pill is-success" style="margin-left:auto;">
					<?php echo hatch_icon( 'check' ); // phpcs:ignore ?>
					<?php echo esc_html( $forms_det['label'] ); ?>
				</span>
			<?php else: ?>
				<span class="hx-pill is-soft" style="margin-left:auto;"><?php esc_html_e( 'None detected', 'hatch' ); ?></span>
			<?php endif; ?>
		</div>

		<?php
		// v0.50.2: HatchAsForm fallback fully removed. Hatch always auto-detects
		// the active forms plugin (Fluent / Gravity / CF7) — no backend mode
		// dropdown, no manual override, no hidden vestigial input. If no form
		// plugin is active, show one clear Fluent Forms nudge. If one is
		// active, just expose the picker for the default form.
		?>

		<?php if ( ! $forms_det['active'] ): ?>
			<div class="hx-flex hx-gap-3 hx-mt-3" style="padding:12px 14px; background:var(--hx-surface); border-radius:8px; align-items:center;">
				<span class="hx-icon-box is-info" style="font-size:18px;">📋</span>
				<div style="flex:1; font-size:13px; line-height:1.55;">
					<?php
					printf(
						wp_kses( __( 'Install <a href="%s" target="_blank" rel="noopener noreferrer">Fluent Forms</a> (free) and your forms become headless automatically. No config here.', 'hatch' ), array( 'a' => array( 'href' => true, 'target' => true, 'rel' => true ) ) ),
						esc_url( admin_url( 'plugin-install.php?s=fluent-forms&tab=search&type=term' ) )
					);
					?>
				</div>
			</div>
		<?php elseif ( ! empty( $ff_forms ) ): ?>
			<label class="hx-field hx-mt-3">
				<span class="hx-field-label"><?php esc_html_e( 'Default form to embed', 'hatch' ); ?></span>
				<select name="hatch_integrations[forms][default_form_id]" class="hx-input">
					<option value="0"><?php esc_html_e( '— None —', 'hatch' ); ?></option>
					<?php foreach ( $ff_forms as $id => $title ): ?>
						<option value="<?php echo esc_attr( $id ); ?>" <?php selected( (int) $cfg['forms']['default_form_id'], $id ); ?>>
							<?php echo esc_html( '#' . $id . ' — ' . $title ); ?>
						</option>
					<?php endforeach; ?>
				</select>
				<span class="hx-text-xs hx-text-muted" style="margin-top:4px; display:block;">
					<?php esc_html_e( 'Used by HatchEmbedForm when no specific form ID is passed (e.g. the newsletter card on archive pages).', 'hatch' ); ?>
				</span>
			</label>
		<?php else: ?>
			<div class="hx-flex hx-gap-3 hx-mt-3" style="padding:12px 14px; background:var(--hx-surface); border-radius:8px; align-items:center;">
				<span class="hx-icon-box is-success" style="font-size:18px;">✓</span>
				<div style="flex:1; font-size:13px; line-height:1.55;">
					<?php
					/* translators: %s: form plugin label like "Fluent Forms" */
					printf( esc_html__( '%s detected. Create a form in its admin UI to pick a default here.', 'hatch' ), '<strong>' . esc_html( $forms_det['label'] ) . '</strong>' );
					?>
				</div>
			</div>
		<?php endif; ?>

		<!-- ============ TURNSTILE ============ -->
		<div class="hx-card-head" style="margin-top:24px; padding-top:24px; border-top:1px solid var(--hx-border);">
			<span class="hx-icon-box is-warning is-lg"><?php echo hatch_icon( 'shield-check' ); // phpcs:ignore ?></span>
			<div>
				<div class="hx-card-title"><?php esc_html_e( 'Cloudflare Turnstile (anti-spam)', 'hatch' ); ?></div>
				<div class="hx-text-xs hx-text-muted">
					<?php
					/* translators: %s: link */
					printf(
						wp_kses( __( 'Free, privacy-friendly CAPTCHA-replacement. Get a free site key + secret at <a href="%s" target="_blank" rel="noopener noreferrer">dash.cloudflare.com → Turnstile</a>.', 'hatch' ), array( 'a' => array( 'href' => true, 'target' => true, 'rel' => true ) ) ),
						'https://dash.cloudflare.com/?to=/:account/turnstile'
					);
					?>
				</div>
			</div>
		</div>

		<div class="hx-flex-col hx-gap-3 hx-mt-3">
			<div class="hx-toggle-row <?php echo $cfg['turnstile']['enabled'] ? 'is-on' : ''; ?>">
				<div class="hx-toggle-body">
					<label class="hx-toggle-label" for="ts-enabled"><?php esc_html_e( 'Enable Turnstile', 'hatch' ); ?></label>
					<div class="hx-toggle-help"><?php esc_html_e( 'When enabled, Comments + Forms verify the visitor before accepting submissions.', 'hatch' ); ?></div>
				</div>
				<label class="hx-switch">
					<input type="checkbox" id="ts-enabled" name="hatch_integrations[turnstile][enabled]" value="1" <?php checked( $cfg['turnstile']['enabled'] ); ?>/>
					<span class="hx-switch-track"></span>
				</label>
			</div>
			<label class="hx-field">
				<span class="hx-field-label"><?php esc_html_e( 'Site key', 'hatch' ); ?> <span class="hx-text-xs hx-text-muted"><?php esc_html_e( '(public, embedded in frontend)', 'hatch' ); ?></span></span>
				<input type="text" name="hatch_integrations[turnstile][site_key]" value="<?php echo esc_attr( $cfg['turnstile']['site_key'] ); ?>" class="hx-input" placeholder="0x4AAAAAAA..." autocomplete="off"/>
			</label>
			<label class="hx-field">
				<span class="hx-field-label"><?php esc_html_e( 'Secret key', 'hatch' ); ?> <span class="hx-text-xs hx-text-muted"><?php esc_html_e( '(server-only, never exposed)', 'hatch' ); ?></span></span>
				<input type="password" name="hatch_integrations[turnstile][secret_key]" value="<?php echo esc_attr( $cfg['turnstile']['secret_key'] ); ?>" class="hx-input" autocomplete="off"/>
			</label>

			<?php // v0.50.1 — Turnstile probe button. Reads the saved secret + asks Cloudflare if it's valid.
			$probed   = isset( $_GET['probed'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$probe_rs = $probed ? (array) get_transient( 'hatch_turnstile_probe_' . get_current_user_id() ) : array();
			if ( $probed ) { delete_transient( 'hatch_turnstile_probe_' . get_current_user_id() ); }
			?>
			<div style="margin-top:12px; padding-top:12px; border-top:1px dashed var(--hx-border);">
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php?action=hatch_probe_turnstile' ) ); ?>" style="display:inline;">
					<?php wp_nonce_field( 'hatch_probe_turnstile' ); ?>
					<button type="submit" class="hx-btn is-ghost is-sm">
						<?php echo hatch_icon( 'shield-check' ); // phpcs:ignore ?>
						<?php esc_html_e( 'Probe Turnstile (validates the saved secret)', 'hatch' ); ?>
					</button>
				</form>
				<?php if ( ! empty( $probe_rs ) ) : ?>
					<div class="hx-text-xs" style="margin-top:8px; padding:8px 10px; border-radius:6px; background:<?php echo $probe_rs['ok'] ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.08)'; ?>; color:<?php echo $probe_rs['ok'] ? '#047857' : '#b91c1c'; ?>;">
						<?php echo $probe_rs['ok'] ? '✓ ' : '✗ '; echo esc_html( $probe_rs['message'] ?? '' ); ?>
					</div>
				<?php endif; ?>
			</div>
		</div>

		<!-- ============ COMMENTS ============ -->
		<div class="hx-card-head" style="margin-top:24px; padding-top:24px; border-top:1px solid var(--hx-border);">
			<span class="hx-icon-box is-info is-lg"><?php echo hatch_icon( 'document' ); // phpcs:ignore ?></span>
			<div>
				<div class="hx-card-title"><?php esc_html_e( 'Comments', 'hatch' ); ?></div>
				<div class="hx-text-xs hx-text-muted"><?php esc_html_e( 'Native WordPress comments rendered on the headless frontend via /hatch/v1/comments.', 'hatch' ); ?></div>
			</div>
		</div>

		<div class="hx-flex-col hx-gap-2 hx-mt-3">
			<?php
			$rows = array(
				array( 'enabled',       __( 'Enable comments', 'hatch' ),       __( 'Master switch for the headless comments REST endpoint.', 'hatch' ) ),
				array( 'require_login', __( 'Require sign-in', 'hatch' ),       __( 'Only signed-in WP users can post — useful for member-only sites.', 'hatch' ) ),
				array( 'moderate',      __( 'Hold for moderation', 'hatch' ),   __( 'New comments stay pending until an admin approves them in Comments.', 'hatch' ) ),
				array( 'turnstile',     __( 'Require Turnstile', 'hatch' ),     __( 'Each comment must pass the Turnstile challenge before being accepted.', 'hatch' ) ),
			);
			foreach ( $rows as $row ):
				[ $key, $label, $help ] = $row;
				$on = ! empty( $cfg['comments'][ $key ] );
				?>
				<div class="hx-toggle-row <?php echo $on ? 'is-on' : ''; ?>">
					<div class="hx-toggle-body">
						<label class="hx-toggle-label" for="cmt-<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $label ); ?></label>
						<div class="hx-toggle-help"><?php echo esc_html( $help ); ?></div>
					</div>
					<label class="hx-switch">
						<input type="checkbox" id="cmt-<?php echo esc_attr( $key ); ?>" name="hatch_integrations[comments][<?php echo esc_attr( $key ); ?>]" value="1" <?php checked( $on ); ?>/>
						<span class="hx-switch-track"></span>
					</label>
				</div>
			<?php endforeach; ?>
		</div>

		<div class="hx-mt-4">
			<button type="submit" class="hx-btn is-primary">
				<?php echo hatch_icon( 'check' ); // phpcs:ignore ?>
				<?php esc_html_e( 'Save', 'hatch' ); ?>
			</button>
		</div>
	</form>

	<style>
	.hx-field { display:flex; flex-direction:column; gap:6px; }
	.hx-field-label { font-size:13px; font-weight:600; color:var(--hx-fg); }
	.hx-input { padding:8px 10px; border:1px solid var(--hx-border); border-radius:6px; background:var(--hx-bg); color:var(--hx-fg); font-size:13.5px; max-width:520px; }
	.hx-input:focus { outline:none; border-color:var(--hx-primary); box-shadow:0 0 0 3px rgba(255,107,53,.15); }
	</style>
	<?php
}

/* ==================================================================
 * TAB: BLOCKS (8 Hatch blocks + master switch)
 * ================================================================== */
function hatch_render_blocks_tab(): void {
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$saved = ! empty( $_GET['saved'] );

	$catalog = Hatch_Blocks_Control::catalog();
	$states  = Hatch_Blocks_Control::get_states();
	$master  = Hatch_Blocks_Control::master_on();
	$categories = Hatch_Blocks_Control::category_labels();

	if ( $saved ): ?>
		<div class="hx-notice is-success">
			<span class="hx-icon-box is-success"><?php echo hatch_icon( 'check-circle' ); // phpcs:ignore ?></span>
			<div class="hx-notice-body">
				<p class="hx-notice-title"><?php esc_html_e( 'Blocks updated', 'hatch' ); ?></p>
				<p class="hx-notice-message"><?php esc_html_e( 'Refresh the block editor to see changes.', 'hatch' ); ?></p>
			</div>
		</div>
	<?php endif; ?>

	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="hx-card">
		<input type="hidden" name="action" value="hatch_save_blocks"/>
		<?php wp_nonce_field( 'hatch_save_blocks' ); ?>

		<div class="hx-card-head">
			<span class="hx-icon-box is-primary is-lg"><?php echo hatch_icon( 'cube' ); // phpcs:ignore ?></span>
			<div>
				<div class="hx-card-title"><?php esc_html_e( 'Hatch Blocks', 'hatch' ); ?></div>
				<div class="hx-text-xs hx-text-muted">
					<?php esc_html_e( 'Enable / disable Hatch\'s Gutenberg blocks in the editor.', 'hatch' ); ?>
				</div>
			</div>
		</div>

		<div class="hx-toggle-row <?php echo $master ? 'is-on' : ''; ?>" style="margin-top:12px; background:linear-gradient(180deg, rgba(37,99,235,0.06), transparent); border-color:rgba(37,99,235,0.25);">
			<div class="hx-toggle-body">
				<label class="hx-toggle-label" for="hatch-master-switch"><?php esc_html_e( 'Master switch — all Hatch blocks', 'hatch' ); ?></label>
				<div class="hx-toggle-help"><?php esc_html_e( 'Quick way to turn off every Hatch block at once. Individual toggles below stay remembered.', 'hatch' ); ?></div>
			</div>
			<label class="hx-switch">
				<input type="checkbox" id="hatch-master-switch" name="hatch_blocks_master" value="1" <?php checked( $master ); ?>/>
				<span class="hx-switch-track"></span>
			</label>
		</div>

		<?php foreach ( $categories as $cat_slug => $cat_label ): ?>
			<?php
			// Get blocks in this category.
			$blocks_in_cat = array_filter( $catalog, function ( $info ) use ( $cat_slug ) {
				return $info['category'] === $cat_slug;
			} );
			if ( empty( $blocks_in_cat ) ) continue;
			?>
			<h3 style="font-size:13px; font-weight:600; color:var(--hx-muted); text-transform:uppercase; letter-spacing:0.04em; margin-top:20px; margin-bottom:10px;">
				<?php echo esc_html( $cat_label ); ?>
			</h3>
			<div class="hx-flex-col hx-gap-2">
				<?php foreach ( $blocks_in_cat as $slug => $info ): ?>
					<?php $is_on = ! empty( $states[ $slug ] ); ?>
					<div class="hx-toggle-row <?php echo $is_on && $master ? 'is-on' : ''; ?>" <?php echo $master ? '' : 'style="opacity:0.55;"'; ?>>
						<div class="hx-toggle-body">
							<label class="hx-toggle-label" for="blk-<?php echo esc_attr( sanitize_key( $slug ) ); ?>">
								<?php echo esc_html( $info['label'] ); ?>
								<code style="margin-left:6px; font-size:11px; font-weight:400; color:var(--hx-muted);"><?php echo esc_html( $slug ); ?></code>
							</label>
							<div class="hx-toggle-help"><?php echo esc_html( $info['description'] ); ?></div>
						</div>
						<label class="hx-switch">
							<input type="checkbox" id="blk-<?php echo esc_attr( sanitize_key( $slug ) ); ?>"
							       name="hatch_blocks[<?php echo esc_attr( $slug ); ?>]" value="1"
							       <?php checked( $is_on ); ?>
							       <?php disabled( ! $master ); ?>/>
							<span class="hx-switch-track"></span>
						</label>
					</div>
				<?php endforeach; ?>
			</div>
		<?php endforeach; ?>

		<div class="hx-mt-4">
			<button type="submit" class="hx-btn is-primary">
				<?php echo hatch_icon( 'check' ); // phpcs:ignore ?>
				<?php esc_html_e( 'Save', 'hatch' ); ?>
			</button>
		</div>

		<p class="hx-help hx-mt-3">
			<?php esc_html_e( 'Disabling a block does not delete it from existing posts — they\'ll appear as "invalid block" with the standard Gutenberg recover dialog.', 'hatch' ); ?>
			<a href="https://github.com/adityaarsharma/hatch/blob/main/docs/disabling-blocks.md" target="_blank" rel="noopener noreferrer">
				<?php esc_html_e( 'Learn more', 'hatch' ); ?>
			</a>
		</p>
	</form>
	<?php
}

/* ==================================================================
 * TAB: SECURITY (preserved from v0.5, polished)
 * ================================================================== */
function hatch_render_security_tab(): void {
	$home_trail = trailingslashit( home_url() );
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$saved   = ! empty( $_GET['saved'] );
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$rotated = ! empty( $_GET['rotated'] );
	if ( $saved ) : ?>
		<div class="hx-notice is-success">
			<span class="hx-icon-box is-success"><?php echo hatch_icon( 'check-circle' ); // phpcs:ignore ?></span>
			<div class="hx-notice-body"><p class="hx-notice-title"><?php esc_html_e( 'Security settings saved', 'hatch' ); ?></p></div>
		</div>
	<?php endif;
	if ( $rotated ) :
		$revoked = (int) get_transient( 'hatch_rotate_notice_' . get_current_user_id() );
		delete_transient( 'hatch_rotate_notice_' . get_current_user_id() );
		?>
		<div class="hx-notice is-success">
			<span class="hx-icon-box is-success"><?php echo hatch_icon( 'refresh' ); // phpcs:ignore ?></span>
			<div class="hx-notice-body">
				<p class="hx-notice-title"><?php esc_html_e( 'Application Passwords rotated', 'hatch' ); ?></p>
				<p class="hx-notice-message"><?php
					/* translators: %d: count of revoked Hatch passwords */
					printf( esc_html( _n( 'Revoked %d old Hatch credential. Next deploy will mint a fresh one.', 'Revoked %d old Hatch credentials. Next deploy will mint a fresh one.', $revoked, 'hatch' ) ), $revoked );
				?></p>
			</div>
		</div>
	<?php endif; ?>
	<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php?action=hatch_save_security' ) ); ?>">
		<?php wp_nonce_field( 'hatch_save_security' ); ?>

		<!-- Hardening toggles -->
		<div class="hx-card">
			<div class="hx-card-head">
				<span class="hx-icon-box is-success is-lg"><?php echo hatch_icon( 'shield-check' ); // phpcs:ignore ?></span>
				<div>
					<div class="hx-card-title"><?php esc_html_e( 'REST API hardening', 'hatch' ); ?></div>
					<div class="hx-text-xs hx-text-muted"><?php esc_html_e( 'On by default. Toggle off only if you know what you\'re doing.', 'hatch' ); ?></div>
				</div>
			</div>

			<div class="hx-flex-col hx-gap-2 hx-mt-3">
				<?php
				$sec_toggles = array(
					'hatch_security_harden_rest'     => array(
						'label' => __( 'Block unauthenticated REST API', 'hatch' ),
						'help'  => __( 'Anonymous users get 401 on every /wp-json/* endpoint.', 'hatch' ),
					),
					'hatch_security_disable_xmlrpc'  => array(
						'label' => __( 'Disable XML-RPC', 'hatch' ),
						'help'  => __( 'Removes /xmlrpc.php entirely. Standard headless setups don\'t use it.', 'hatch' ),
					),
					'hatch_security_block_user_enum' => array(
						'label' => __( 'Block user enumeration', 'hatch' ),
						'help'  => __( 'Stops ?author=N attacks.', 'hatch' ),
					),
					'hatch_security_force_noindex'   => array(
						'label' => __( 'Hide CMS from search engines', 'hatch' ),
						'help'  => __( 'Forces noindex/nofollow site-wide on this WordPress install.', 'hatch' ),
					),
				);
				foreach ( $sec_toggles as $opt => $t ):
					$is_on = (bool) get_option( $opt, 1 );
					?>
					<div class="hx-toggle-row <?php echo $is_on ? 'is-on' : ''; ?>">
						<div class="hx-toggle-body">
							<label class="hx-toggle-label" for="sec-<?php echo esc_attr( $opt ); ?>"><?php echo esc_html( $t['label'] ); ?></label>
							<div class="hx-toggle-help"><?php echo esc_html( $t['help'] ); ?></div>
						</div>
						<label class="hx-switch">
							<input type="checkbox" id="sec-<?php echo esc_attr( $opt ); ?>"
							       name="<?php echo esc_attr( $opt ); ?>" value="1"
							       <?php checked( $is_on ); ?>/>
							<span class="hx-switch-track"></span>
						</label>
					</div>
				<?php endforeach; ?>
			</div>
		</div>

		<!-- Custom login URL -->
		<div class="hx-card hx-mt-4">
			<div class="hx-card-head">
				<span class="hx-icon-box is-warning is-lg"><?php echo hatch_icon( 'lock-closed' ); // phpcs:ignore ?></span>
				<div>
					<div class="hx-card-title"><?php esc_html_e( 'Custom login URL', 'hatch' ); ?></div>
					<div class="hx-text-xs hx-text-muted"><?php esc_html_e( 'Move wp-login.php to a custom slug. Stops bot brute-force at the front door.', 'hatch' ); ?></div>
				</div>
			</div>

			<div class="hx-field">
				<label class="hx-label" for="hatch_login_slug"><?php esc_html_e( 'Login slug', 'hatch' ); ?></label>
				<div class="hx-flex hx-items-center hx-gap-2">
					<code style="white-space:nowrap;"><?php echo esc_html( $home_trail ); ?></code>
					<input class="hx-input" type="text" id="hatch_login_slug" name="hatch_login_slug" value="<?php echo esc_attr( (string) get_option( 'hatch_login_slug', '' ) ); ?>" placeholder="hatch-login"/>
				</div>
				<div class="hx-help"><?php esc_html_e( 'Leave empty to disable. Forbidden: wp-login, wp-admin, login, admin, dashboard, wp.', 'hatch' ); ?></div>
			</div>

			<div class="hx-field">
				<label class="hx-label" for="hatch_login_redirect_slug"><?php esc_html_e( 'Redirect blocked access to', 'hatch' ); ?></label>
				<div class="hx-flex hx-items-center hx-gap-2">
					<code style="white-space:nowrap;"><?php echo esc_html( $home_trail ); ?></code>
					<input class="hx-input" type="text" id="hatch_login_redirect_slug" name="hatch_login_redirect_slug" value="<?php echo esc_attr( (string) get_option( 'hatch_login_redirect_slug', '404' ) ); ?>" placeholder="404"/>
				</div>
			</div>
		</div>

		<!-- Headless role guard -->
		<div class="hx-card hx-mt-4">
			<div class="hx-card-head">
				<span class="hx-icon-box is-primary is-lg"><?php echo hatch_icon( 'lock-open' ); // phpcs:ignore ?></span>
				<div>
					<div class="hx-card-title"><?php esc_html_e( 'Headless role guard', 'hatch' ); ?></div>
					<div class="hx-text-xs hx-text-muted"><?php esc_html_e( 'No public frontend on this CMS — non-allowed roles have no reason to be in wp-admin.', 'hatch' ); ?></div>
				</div>
			</div>

			<?php $rg_on = (bool) get_option( 'hatch_login_role_guard_enabled', 1 ); ?>
			<div class="hx-toggle-row <?php echo $rg_on ? 'is-on' : ''; ?>">
				<div class="hx-toggle-body">
					<label class="hx-toggle-label" for="sec-role-guard"><?php esc_html_e( 'Enforce role guard', 'hatch' ); ?></label>
					<div class="hx-toggle-help"><?php esc_html_e( 'Subscribers, customers, members get logged out if they reach /wp-admin.', 'hatch' ); ?></div>
				</div>
				<label class="hx-switch">
					<input type="checkbox" id="sec-role-guard" name="hatch_login_role_guard_enabled" value="1" <?php checked( $rg_on ); ?>/>
					<span class="hx-switch-track"></span>
				</label>
			</div>

			<div class="hx-field hx-mt-3">
				<label class="hx-label" for="hatch_login_allowed_roles"><?php esc_html_e( 'Allowed roles', 'hatch' ); ?></label>
				<input class="hx-input" type="text" id="hatch_login_allowed_roles" name="hatch_login_allowed_roles" value="<?php echo esc_attr( (string) get_option( 'hatch_login_allowed_roles', 'administrator,editor,author' ) ); ?>"/>
				<div class="hx-help"><?php esc_html_e( 'Comma-separated role slugs. "administrator" is always included for safety.', 'hatch' ); ?></div>
			</div>
		</div>

		<!-- Brute-force lockout -->
		<div class="hx-card hx-mt-4">
			<div class="hx-card-head">
				<span class="hx-icon-box is-danger is-lg"><?php echo hatch_icon( 'key' ); // phpcs:ignore ?></span>
				<div>
					<div class="hx-card-title"><?php esc_html_e( 'Brute-force lockout', 'hatch' ); ?></div>
					<div class="hx-text-xs hx-text-muted"><?php esc_html_e( 'Temporary IP block after repeated failed logins.', 'hatch' ); ?></div>
				</div>
			</div>

			<div class="hx-flex hx-gap-3 hx-mt-3" style="flex-wrap:wrap;">
				<div class="hx-field" style="flex:1; min-width:200px;">
					<label class="hx-label"><?php esc_html_e( 'Failed attempts threshold', 'hatch' ); ?></label>
					<input class="hx-input" type="number" min="3" max="20" name="hatch_brute_force_limit" value="<?php echo esc_attr( (string) get_option( 'hatch_brute_force_limit', 5 ) ); ?>"/>
				</div>
				<div class="hx-field" style="flex:1; min-width:200px;">
					<label class="hx-label"><?php esc_html_e( 'Window (minutes)', 'hatch' ); ?></label>
					<input class="hx-input" type="number" min="5" max="240" name="hatch_brute_force_window" value="<?php echo esc_attr( (string) get_option( 'hatch_brute_force_window', 30 ) ); ?>"/>
				</div>
			</div>
		</div>

		<!-- v0.50.0 — App Password rotate (next to uninstall, both are "danger zone" controls) -->
		<?php
		$hatch_pwd_count = 0;
		if ( class_exists( 'WP_Application_Passwords' ) ) {
			foreach ( get_users( array( 'fields' => 'ID', 'role__in' => array( 'administrator' ) ) ) as $uid ) {
				foreach ( (array) WP_Application_Passwords::get_user_application_passwords( $uid ) as $p ) {
					if ( isset( $p['name'] ) && 0 === stripos( (string) $p['name'], 'Hatch' ) ) $hatch_pwd_count++;
				}
			}
		}
		?>
		<div class="hx-card hx-mt-4">
			<div class="hx-card-head">
				<span class="hx-icon-box is-warning is-lg"><?php echo hatch_icon( 'refresh' ); // phpcs:ignore ?></span>
				<div>
					<div class="hx-card-title"><?php esc_html_e( 'Rotate Application Passwords', 'hatch' ); ?></div>
					<div class="hx-text-xs hx-text-muted">
						<?php
						/* translators: %d: current count */
						printf( esc_html__( '%d "Hatch (...)" credential(s) currently issued. Click rotate to revoke them all and mint a single fresh one. Useful after a token leak or as a clean-slate before recording a demo.', 'hatch' ), $hatch_pwd_count );
						?>
					</div>
				</div>
			</div>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php?action=hatch_rotate_app_pwds' ) ); ?>" style="margin-top:14px;" onsubmit="return confirm('Revoke all Hatch Application Passwords? Your next deploy will create a fresh one.');">
				<?php wp_nonce_field( 'hatch_rotate_app_pwds' ); ?>
				<button type="submit" class="hx-btn is-ghost">
					<?php echo hatch_icon( 'refresh' ); // phpcs:ignore ?>
					<?php esc_html_e( 'Rotate now', 'hatch' ); ?>
				</button>
			</form>
		</div>

		<!-- v0.49.5 — Uninstall behavior (opt-in full wipe) -->
		<?php $remove_all = (bool) get_option( 'hatch_uninstall_remove_all_data', 0 ); ?>
		<div class="hx-card hx-mt-4">
			<div class="hx-card-head">
				<span class="hx-icon-box <?php echo $remove_all ? 'is-danger' : 'is-info'; ?> is-lg"><?php echo hatch_icon( $remove_all ? 'trash' : 'shield-check' ); // phpcs:ignore ?></span>
				<div>
					<div class="hx-card-title"><?php esc_html_e( 'Uninstall behavior', 'hatch' ); ?></div>
					<div class="hx-text-xs hx-text-muted">
						<?php esc_html_e( 'Default: a re-install lands you back exactly where you were. One-click Redeploy still works because the saved token, theme, frontend URL, and all settings stay intact. Tick the box only if you want a full wipe on Delete.', 'hatch' ); ?>
					</div>
				</div>
			</div>

			<div class="hx-toggle-row <?php echo $remove_all ? 'is-on' : ''; ?>" style="margin-top:14px;">
				<div class="hx-toggle-body">
					<label class="hx-toggle-label" for="sec-hatch_uninstall_remove_all_data"><?php esc_html_e( 'Remove all data on uninstall', 'hatch' ); ?></label>
					<div class="hx-toggle-help">
						<?php esc_html_e( 'When you click Delete in Plugins → wipes every Hatch option, the encrypted deploy token, all "Hatch (...)" Application Passwords, and scheduled cron events. Settings cannot be recovered.', 'hatch' ); ?>
					</div>
				</div>
				<label class="hx-switch">
					<input type="checkbox" id="sec-hatch_uninstall_remove_all_data" name="hatch_uninstall_remove_all_data" value="1" <?php checked( $remove_all ); ?>/>
					<span class="hx-switch-track"></span>
				</label>
			</div>
		</div>

		<div class="hx-mt-4">
			<button type="submit" class="hx-btn is-primary is-lg">
				<?php echo hatch_icon( 'check' ); // phpcs:ignore ?>
				<?php esc_html_e( 'Save', 'hatch' ); ?>
			</button>
		</div>
	</form>
	<?php
}

/* ==================================================================
 * Shared: diagnostic grid (rendered inside Connector card)
 * ================================================================== */
/**
 * v0.50.0 — Status tab: every flag, credential, cron, and deploy URL at a
 * glance. Designed to answer "where does this URL come from?" / "is this
 * actually live?" / "did the secret rotate?" without grepping the DB.
 */
function hatch_render_status_tab(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}

	$row = function ( $label, $value, $variant = 'info' ) {
		echo '<tr><td class="hx-status-key">' . esc_html( $label ) . '</td>';
		echo '<td class="hx-status-val">';
		if ( is_bool( $value ) ) {
			echo $value ? '<span class="hx-pill is-success">on</span>' : '<span class="hx-pill is-soft">off</span>';
		} elseif ( '' === (string) $value ) {
			echo '<span class="hx-pill is-soft">— not set —</span>';
		} else {
			echo '<code style="word-break:break-all;">' . esc_html( (string) $value ) . '</code>';
		}
		echo '</td></tr>';
	};

	// Counts.
	$hatch_pwd_count = 0;
	if ( class_exists( 'WP_Application_Passwords' ) ) {
		foreach ( get_users( array( 'fields' => 'ID', 'role__in' => array( 'administrator' ) ) ) as $uid ) {
			foreach ( (array) WP_Application_Passwords::get_user_application_passwords( $uid ) as $p ) {
				if ( isset( $p['name'] ) && 0 === stripos( (string) $p['name'], 'Hatch' ) ) $hatch_pwd_count++;
			}
		}
	}

	$blocks_total      = count( glob( HATCH_PLUGIN_DIR . 'blocks-src/blocks/*/block.json' ) );
	$blocks_registered = 0;
	if ( class_exists( 'WP_Block_Type_Registry' ) ) {
		foreach ( WP_Block_Type_Registry::get_instance()->get_all_registered() as $name => $b ) {
			if ( str_starts_with( $name, 'hatch/' ) ) $blocks_registered++;
		}
	}

	$cf_proj      = (array) get_option( 'hatch_deploy_project_cloudflare', array() );
	$vercel_proj  = (array) get_option( 'hatch_deploy_project_vercel', array() );
	$hosting      = class_exists( 'Hatch_Connection_Status' ) ? Hatch_Connection_Status::get_hosting_model() : '';
	$has_cf_token = class_exists( 'Hatch_Credential_Store' ) && Hatch_Credential_Store::has( 'cloudflare' );
	$has_vc_token = class_exists( 'Hatch_Credential_Store' ) && Hatch_Credential_Store::has( 'vercel' );

	$cron_next = wp_next_scheduled( 'hatch_connection_check' );

	?>
	<style>
		.hx-status-table { width:100%; border-collapse:separate; border-spacing:0; }
		.hx-status-table th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--hx-muted); padding:14px 12px 6px; }
		.hx-status-table td { padding:10px 12px; border-top:1px solid var(--hx-border); font-size:13px; vertical-align:top; }
		.hx-status-key { color:var(--hx-muted); width:38%; }
		.hx-status-val { color:var(--hx-fg); }
		.hx-status-val code { background:var(--hx-bg-3); padding:1px 6px; border-radius:4px; font-size:12px; }
	</style>

	<div class="hx-card">
		<div class="hx-card-head">
			<span class="hx-icon-box is-info is-lg"><?php echo hatch_icon( 'check-circle' ); // phpcs:ignore ?></span>
			<div>
				<div class="hx-card-title"><?php esc_html_e( 'Status — every flag, cred, cron at one glance', 'hatch' ); ?></div>
				<div class="hx-text-xs hx-text-muted"><?php esc_html_e( 'Read-only diagnostic view. Use this when something doesn\'t add up — answers "where does this come from?" without leaving the screen.', 'hatch' ); ?></div>
			</div>
		</div>

		<table class="hx-status-table">
			<tbody>
				<tr><th colspan="2"><?php esc_html_e( 'Frontend (live site)', 'hatch' ); ?></th></tr>
				<?php
				$row( __( 'hatch_frontend_url', 'hatch' ),       (string) get_option( 'hatch_frontend_url', '' ) );
				$row( __( 'hatch_image_proxy_url', 'hatch' ),    (string) get_option( 'hatch_image_proxy_url', '' ) );
				$row( __( 'hatch_revalidate_endpoint', 'hatch' ),(string) get_option( 'hatch_revalidate_endpoint', '' ) );
				$row( __( 'hatch_hosting_model', 'hatch' ),      (string) $hosting );
				?>

				<tr><th colspan="2"><?php esc_html_e( 'Cloudflare deploy', 'hatch' ); ?></th></tr>
				<?php
				$row( __( 'Project name', 'hatch' ), (string) ( $cf_proj['name'] ?? '' ) );
				$row( __( 'Project URL',  'hatch' ), (string) ( $cf_proj['url']  ?? '' ) );
				$row( __( 'Connected at', 'hatch' ), ! empty( $cf_proj['connected_at'] ) ? gmdate( 'Y-m-d H:i:s \U\T\C', (int) $cf_proj['connected_at'] ) : '' );
				$row( __( 'CF token saved (encrypted)', 'hatch' ), $has_cf_token );
				?>

				<tr><th colspan="2"><?php esc_html_e( 'Vercel deploy', 'hatch' ); ?></th></tr>
				<?php
				$row( __( 'Project name', 'hatch' ), (string) ( $vercel_proj['name'] ?? '' ) );
				$row( __( 'Project URL',  'hatch' ), (string) ( $vercel_proj['url']  ?? '' ) );
				$row( __( 'Vercel token saved (encrypted)', 'hatch' ), $has_vc_token );
				?>

				<tr><th colspan="2"><?php esc_html_e( 'Authentication', 'hatch' ); ?></th></tr>
				<?php
				$row( __( 'Webhook secret set', 'hatch' ),         (bool) get_option( 'hatch_webhook_secret' ) );
				$row( __( 'Hatch Application Passwords', 'hatch' ), (string) ( $hatch_pwd_count . ' issued' ) );
				?>

				<tr><th colspan="2"><?php esc_html_e( 'Blocks', 'hatch' ); ?></th></tr>
				<?php
				$row( __( 'Block.json files in source', 'hatch' ),  (string) $blocks_total );
				$row( __( 'Currently registered with WP', 'hatch' ),(string) $blocks_registered );
				$row( __( 'build/index.js present', 'hatch' ),      file_exists( HATCH_PLUGIN_DIR . 'build/index.js' ) );
				?>

				<tr><th colspan="2"><?php esc_html_e( 'Security', 'hatch' ); ?></th></tr>
				<?php
				$row( __( 'REST API hardening', 'hatch' ),       (bool) get_option( 'hatch_security_harden_rest', 0 ) );
				$row( __( 'XML-RPC disabled',   'hatch' ),       (bool) get_option( 'hatch_security_disable_xmlrpc', 0 ) );
				$row( __( 'User enum blocked',  'hatch' ),       (bool) get_option( 'hatch_security_block_user_enum', 0 ) );
				$row( __( 'Site noindex',       'hatch' ),       (bool) get_option( 'hatch_security_force_noindex', 0 ) );
				$row( __( 'Custom login slug',  'hatch' ),       (string) get_option( 'hatch_login_slug', '' ) );
				$row( __( 'Wipe all on uninstall (opt-in)', 'hatch' ), (bool) get_option( 'hatch_uninstall_remove_all_data', 0 ) );
				?>

				<tr><th colspan="2"><?php esc_html_e( 'Cron', 'hatch' ); ?></th></tr>
				<?php
				$row( __( 'hatch_connection_check next run', 'hatch' ), $cron_next ? gmdate( 'Y-m-d H:i:s \U\T\C', $cron_next ) : '' );
				?>

				<tr><th colspan="2"><?php esc_html_e( 'Plugin', 'hatch' ); ?></th></tr>
				<?php
				$row( __( 'Hatch version', 'hatch' ), HATCH_VERSION );
				$row( __( 'Plugin path',   'hatch' ), HATCH_PLUGIN_DIR );
				$row( __( 'WordPress',     'hatch' ), get_bloginfo( 'version' ) );
				$row( __( 'PHP',           'hatch' ), PHP_VERSION );
				?>
			</tbody>
		</table>
	</div>
	<?php
}

function hatch_render_diagnostic_grid(): void {
	$report = Hatch_Diagnostic::run();

	$banner_severity = 'is-success';
	$banner_icon     = 'check-circle';
	$banner_color    = 'is-success';
	$banner_text     = __( 'All preflight checks pass. Safe to connect a frontend.', 'hatch' );
	if ( 'fail' === $report['overall'] ) {
		$banner_severity = 'is-danger';
		$banner_icon     = 'x-circle';
		$banner_color    = 'is-danger';
		$banner_text     = sprintf(
			/* translators: 1: fail count, 2: warn count */
			__( '%1$d blocker(s) and %2$d warning(s). Fix blockers before connecting.', 'hatch' ),
			(int) $report['fail_count'],
			(int) $report['warn_count']
		);
	} elseif ( 'warn' === $report['overall'] ) {
		$banner_severity = 'is-warning';
		$banner_icon     = 'exclamation';
		$banner_color    = 'is-warning';
		$banner_text     = sprintf(
			/* translators: %d: warn count */
			_n( '%d warning. Connection will work but review the suggestion.', '%d warnings. Connection will work but review the suggestions.', (int) $report['warn_count'], 'hatch' ),
			(int) $report['warn_count']
		);
	}
	?>
	<div class="hx-card-head">
		<span class="hx-icon-box <?php echo esc_attr( $banner_color ); ?> is-lg">
			<?php echo hatch_icon( $banner_icon ); // phpcs:ignore ?>
		</span>
		<div class="hx-flex-1">
			<div class="hx-card-title"><?php esc_html_e( 'Preflight diagnostic', 'hatch' ); ?></div>
			<div class="hx-text-xs hx-text-muted"><?php echo esc_html( $banner_text ); ?></div>
		</div>
		<span class="hx-pill <?php echo esc_attr( $banner_color ); ?>">
			<?php echo (int) $report['pass_count']; ?> / <?php echo count( $report['checks'] ); ?>
		</span>
	</div>

	<details <?php echo 'pass' !== $report['overall'] ? 'open' : ''; ?> class="hx-mt-3">
		<summary style="cursor:pointer; font-weight:500; font-size:13px; color:var(--hx-muted); padding:6px 0;">
			<?php esc_html_e( 'Show all checks', 'hatch' ); ?>
		</summary>
		<div class="hx-flex-col hx-gap-2 hx-mt-2">
			<?php foreach ( $report['checks'] as $check ): ?>
				<?php
				$severity = 'is-success'; $icon = 'check-circle'; $color = 'is-success';
				if ( 'fail' === $check['severity'] ) {
					$severity = 'is-danger';  $icon = 'x-circle';    $color = 'is-danger';
				} elseif ( 'warn' === $check['severity'] ) {
					$severity = 'is-warning'; $icon = 'exclamation'; $color = 'is-warning';
				}
				?>
				<div class="hx-status-row <?php echo esc_attr( $severity ); ?>">
					<span class="hx-icon-box <?php echo esc_attr( $color ); ?>"><?php echo hatch_icon( $icon ); // phpcs:ignore ?></span>
					<div class="hx-status-body">
						<div class="hx-status-title"><?php echo esc_html( $check['label'] ); ?></div>
						<div class="hx-status-message"><?php echo esc_html( $check['message'] ); ?></div>
						<?php if ( ! empty( $check['fix'] ) ): ?>
							<div class="hx-status-fix">
								<strong><?php esc_html_e( 'Fix:', 'hatch' ); ?></strong>
								<?php echo esc_html( $check['fix'] ); ?>
								<?php if ( ! empty( $check['fix_url'] ) ): ?>
									<a href="<?php echo esc_url( $check['fix_url'] ); ?>"><?php esc_html_e( 'Open →', 'hatch' ); ?></a>
								<?php endif; ?>
							</div>
						<?php endif; ?>
					</div>
				</div>
			<?php endforeach; ?>
		</div>
	</details>
	<?php
}

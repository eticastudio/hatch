<?php
/**
 * Main plugin bootstrap class.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

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
	 * Constructor - wire up all subsystems.
	 */
	private function __construct() {
		// Companion-plugin layer.
		Hatch_Security::instance();
		Hatch_Rest_Api::instance();
		Hatch_Revalidate::instance();
		Hatch_Seo_Bridge::instance();
		// Expose resolved RankMath/Yoast meta on the standard /wp/v2/{type}
		// responses under `hatch_seo`, so any third-party consumer of the WP
		// REST API gets identical resolution to /hatch/v1/content.
		add_action( 'rest_api_init', array( 'Hatch_Seo_Bridge', 'register_rest_fields' ) );
		Hatch_Forms_Bridge::instance();
		// v0.7.2 fix - Hatch_RankReady_Bridge uses static-only methods
		// (is_active, status). It has no instance()/singleton by design,
		// so init happens on-demand when Rest_Api reads /features.
		// Hatch_RankReady_Bridge::instance();

		// V0.2 hardening (must wire on frontend too - filters site URLs etc.).
		Hatch_Login_Hardening::instance();
		Hatch_App_Password_Helper::instance();

		// Root-domain check.
		Hatch_Domain_Check::instance();

		// V0.7 - real connection status (cron + heartbeat + verify).
		Hatch_Connection_Status::instance();

		// V0.7 - Block-to-Astro serializer (REST: /hatch/v1/post/{id}/blocks).
		Hatch_Block_Serializer::instance();

		// In-plugin Cloudflare Workers deploy (admin-post handler + REST routes).
		Hatch_Deploy_Controller::boot();

		// V0.8 - WooCommerce read-only bridge (only registers routes if Woo is active).
		Hatch_WooCommerce_Bridge::instance();

		// v0.50.31 - Health widget instance removed. Diagnostics live in
		// Hatch → Status tab instead. No more cluttering WP Dashboard.

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

		// Lifecycle hooks.
		register_activation_hook( HATCH_PLUGIN_FILE, array( $this, 'on_activate' ) );
		register_deactivation_hook( HATCH_PLUGIN_FILE, array( $this, 'on_deactivate' ) );
		// v0.49.5 - uninstall handled by uninstall.php (sandboxed, more reliable
		// than register_uninstall_hook). uninstall.php respects the opt-in
		// option `hatch_uninstall_remove_all_data` so a default Delete preserves
		// every setting; only a user who ticked "Remove all data on uninstall"
		// in Hatch → Security gets a full wipe.
	}

	/**
	 * Activation: set safe defaults.
	 *
	 * @return void
	 */
	public function on_activate(): void {
		// Webhook secret (CSPRNG via wp_generate_password).
		// IMPORTANT: only generate if missing - never rotate on re-activation.
		// Rotating it here would break the secret already stored on the deployed
		// Worker and silently fail every revalidate webhook until the next deploy.
		if ( ! get_option( 'hatch_webhook_secret' ) ) {
			update_option( 'hatch_webhook_secret', wp_generate_password( 48, false ) );
		}

		// v0.50.7 - Multisite-safe: warn and bail if someone tries to network-
		// activate Hatch. Per-site activation is supported; network activation
		// would share encrypted tokens / deploy URLs across subsites, which is
		// almost never what you want. Each subsite is its own headless project.
		if ( is_multisite() && is_network_admin() ) {
			set_transient( 'hatch_network_activate_blocked', 1, MINUTE_IN_SECONDS * 5 );
			deactivate_plugins( plugin_basename( HATCH_PLUGIN_FILE ), true, true );
			return;
		}

		// v0.49.5 - uninstall preference: default is preserve (re-install = no
		// data loss). User opts into full wipe via the Security tab checkbox.
		add_option( 'hatch_uninstall_remove_all_data', 0 );

		// V0.1 defaults. Every security control starts OFF and is switched on by
		// the site owner; add_option() leaves a value that is already stored alone.
		add_option( 'hatch_security_harden_rest', 0 );
		add_option( 'hatch_security_disable_xmlrpc', 0 );
		add_option( 'hatch_security_block_user_enum', 0 );
		add_option( 'hatch_security_force_noindex', 0 );
		add_option( 'hatch_revalidate_endpoint', '' );

		// V0.2 defaults.
		add_option( 'hatch_revalidate_post_types', 'post,page' );
		add_option( 'hatch_login_role_guard_enabled', 0 );
		add_option( 'hatch_login_allowed_roles', 'administrator,editor,author' );
		add_option( 'hatch_brute_force_limit', 5 );
		add_option( 'hatch_brute_force_window', 30 );

		// V0.6 - set a 30-second "just activated" transient so the next admin
		// page load redirects the user to the setup wizard. Only on FIRST
		// activation: if the user has already completed setup before, the
		// wizard skips itself.
		if ( ! get_option( 'hatch_setup_wizard_completed' ) ) {
			set_transient( 'hatch_just_activated', 1, 30 );
		}

		// V0.7 - schedule the 1-minute connection-freshness cron.
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
		// Every event Hatch has ever scheduled, so a deactivated plugin leaves no
		// orphaned cron entries (mirrors the list uninstall.php clears).
		foreach ( array(
			'hatch_check_connection',
			'hatch_connection_check',
			'hatch_cloud_heartbeat',
			'hatch_host_detect_refresh',
			'hatch_prune_app_pwds_cron',
		) as $hook ) {
			wp_clear_scheduled_hook( $hook );
		}
		flush_rewrite_rules();
	}
}

<?php
/**
 * Hatch_Hardening
 *
 * The "fortress mode" toggles. Each one wires a specific WordPress hardening
 * technique that headless sites benefit from. All controls are opt-in (off by
 * default) because they can break sites that depend on these subsystems.
 *
 * Surfaces in the Security tab as four toggles:
 *   - security.disallow_file_edit   → defines DISALLOW_FILE_EDIT before init
 *   - security.send_headers         → adds HSTS / X-Frame / Referrer-Policy on WP responses
 *   - security.csp_enabled          → flag consumed by the Astro middleware
 *   - security.enforce_2fa          → only takes effect when a 2FA plugin is active
 *
 * 2FA enforcement detects the most common providers (WP 2FA, Two-Factor
 * Authentication core feature plugin, miniOrange, Wordfence, Solid Security)
 * and surfaces the active provider in the boot state so the UI can show it.
 *
 * @package Hatch
 * @since   0.50.11
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Hardening {

	public static function init(): void {
		// DISALLOW_FILE_EDIT — must define before any code reads it.
		// Plugins load early enough that this runs before admin_init.
		if ( get_option( 'hatch_security_disallow_file_edit', false ) ) {
			if ( ! defined( 'DISALLOW_FILE_EDIT' ) ) {
				define( 'DISALLOW_FILE_EDIT', true );
			}
		}

		// Hardening headers on the WP origin.
		if ( get_option( 'hatch_security_send_headers', false ) ) {
			add_action( 'send_headers', array( __CLASS__, 'send_security_headers' ) );
		}

		// 2FA enforcement — only meaningful when a provider exists.
		if ( get_option( 'hatch_security_enforce_2fa', false ) ) {
			add_action( 'init', array( __CLASS__, 'maybe_enforce_2fa' ), 5 );
		}
	}

	/**
	 * Hard-coded sensible defaults. Each header is conservative — the kind
	 * that won't break a typical WP admin or REST flow.
	 *
	 * @return void
	 */
	public static function send_security_headers(): void {
		// Don't double-send if a security plugin already did.
		if ( ! headers_sent() ) {
			// 1-year HSTS, preload-eligible. Only matters on https.
			if ( is_ssl() ) {
				header( 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload' );
			}
			// Same-origin only — prevents the WP admin from being framed by
			// the Astro frontend (or anyone else). The frontend reads via
			// REST, not iframes, so no breakage.
			header( 'X-Frame-Options: SAMEORIGIN' );
			// Modern referrer policy. Tighter than no-referrer-when-downgrade.
			header( 'Referrer-Policy: strict-origin-when-cross-origin' );
			// Stops content-sniffing exploits where the browser guesses MIME.
			header( 'X-Content-Type-Options: nosniff' );
			// Restricts powerful APIs by default (camera, mic, geolocation).
			header( 'Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()' );
		}
	}

	/**
	 * Best-effort 2FA enforcement. We can't ship our own 2FA — that's a whole
	 * plugin. Instead we surface whether a known provider is active and gate
	 * admin access to users who've completed setup when one IS active.
	 *
	 * For now this is a soft-enforce: it adds an admin notice for users who
	 * haven't set up 2FA, rather than locking them out (which would brick a
	 * site if the provider plugin is later removed).
	 *
	 * @return void
	 */
	public static function maybe_enforce_2fa(): void {
		$provider = self::detect_2fa_provider();
		if ( '' === $provider ) {
			return;
		}
		add_action( 'admin_notices', static function () use ( $provider ) {
			if ( ! current_user_can( 'manage_options' ) ) return;
			if ( self::user_has_2fa_configured() ) return;
			echo '<div class="notice notice-warning"><p>';
			echo '<strong>Hatch:</strong> 2FA enforcement is on but you haven\'t configured it yet via ';
			echo esc_html( $provider );
			echo '. Set it up to keep your admin access secure.';
			echo '</p></div>';
		} );
	}

	/**
	 * Best-effort: identify the active 2FA plugin so we can name it in copy.
	 *
	 * @return string Provider name, or empty string when none detected.
	 */
	public static function detect_2fa_provider(): string {
		// Cheapest possible probe: check for the symbol each plugin uniquely
		// defines once active. No is_plugin_active() calls (that requires
		// wp-admin/includes/plugin.php which may not be loaded).
		if ( class_exists( 'WP2FA\\WP2FA' ) || function_exists( 'wp2fa_security' ) ) {
			return 'WP 2FA';
		}
		if ( class_exists( 'Two_Factor_Core' ) ) {
			return 'Two-Factor';
		}
		if ( defined( 'MO2FA_VERSION' ) || class_exists( 'Miniorange_Authentication' ) ) {
			return 'miniOrange 2FA';
		}
		if ( class_exists( 'wfWAF' ) && class_exists( 'wfTwoFactor' ) ) {
			return 'Wordfence 2FA';
		}
		if ( defined( 'ITSEC_VERSION' ) || class_exists( 'iThemes_Sync' ) ) {
			return 'Solid Security (iThemes)';
		}
		return '';
	}

	/**
	 * Best-effort check: has the current user actually set up 2FA?
	 * Each provider stores this differently — we only need a strong YES, a
	 * weak NO is fine because the notice is non-blocking.
	 *
	 * @return bool
	 */
	public static function user_has_2fa_configured(): bool {
		$uid = get_current_user_id();
		if ( ! $uid ) return false;
		// WP 2FA stores per-user enabled methods.
		if ( get_user_meta( $uid, 'wp_2fa_totp_key', true ) ) return true;
		// Two-Factor core feature plugin.
		if ( get_user_meta( $uid, '_two_factor_enabled_providers', true ) ) return true;
		// miniOrange.
		if ( get_user_meta( $uid, 'mo2f_configured_2FA_method', true ) ) return true;
		return false;
	}

	/**
	 * Return the wp-admin URL that takes the user to the active provider's
	 * setup screen. Empty string when no provider is detected.
	 *
	 * @return string Absolute admin URL or ''.
	 */
	public static function get_2fa_settings_url(): string {
		$provider = self::detect_2fa_provider();
		switch ( $provider ) {
			case 'WP 2FA':                return admin_url( 'admin.php?page=wp-2fa-settings' );
			case 'Two-Factor':            return admin_url( 'profile.php#two-factor-options' );
			case 'miniOrange 2FA':        return admin_url( 'admin.php?page=mo_2fa_two_factor' );
			case 'Wordfence 2FA':         return admin_url( 'admin.php?page=WordfenceLogin' );
			case 'Solid Security (iThemes)': return admin_url( 'admin.php?page=itsec' );
			default:                      return '';
		}
	}
}

Hatch_Hardening::init();

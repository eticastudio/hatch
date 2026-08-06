<?php
/**
 * Hatch Admin Quiet Mode — suppresses third-party admin notices ONLY on
 * Hatch's own admin screens (?page=hatch* + hatch-setup).
 *
 * WordPress plugins have a long-standing habit of nagging on every wp-admin
 * page: SEO conflict warnings, plugin setup reminders, review requests,
 * Action Scheduler past-due nags. They bleed into every screenshot and every
 * demo recording. This class strips them, but ONLY on Hatch pages — every
 * other wp-admin page (Plugins, Settings, Yoast/RankMath config pages) still
 * shows notices normally, so users don't miss actionable warnings.
 *
 * Hatch's OWN notices (Hatch_Editor_Notice, Hatch_Domain_Check, etc.)
 * survive because they enqueue with the `Hatch_` class-prefix convention;
 * the filter allowlists any callback whose class starts with `Hatch_` or
 * whose function name starts with `hatch_`.
 *
 * @package Hatch
 * @since 0.7.7
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Hatch_Admin_Quiet {

	public static function boot(): void {
		add_action( 'admin_head', array( __CLASS__, 'maybe_suppress' ), 0 );
	}

	/**
	 * On Hatch admin screens, drop every registered admin-notice callback
	 * EXCEPT the ones Hatch owns. Runs at admin_head priority 0 so it
	 * fires before any notice can render.
	 */
	public static function maybe_suppress(): void {
		if ( ! self::is_hatch_screen() ) {
			return;
		}

		foreach ( array( 'admin_notices', 'all_admin_notices', 'user_admin_notices', 'network_admin_notices' ) as $hook ) {
			self::strip_non_hatch( $hook );
		}
	}

	private static function is_hatch_screen(): bool {
		if ( ! is_admin() ) {
			return false;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( $_GET['page'] ) ) : '';
		return $page && ( 'hatch' === $page || 0 === strpos( $page, 'hatch-' ) || 0 === strpos( $page, 'hatch_' ) );
	}

	private static function strip_non_hatch( string $hook ): void {
		global $wp_filter;
		if ( empty( $wp_filter[ $hook ] ) || ! is_object( $wp_filter[ $hook ] ) ) {
			return;
		}
		// Collect first, then remove — never mutate the array we're iterating.
		$to_remove = array();
		foreach ( $wp_filter[ $hook ]->callbacks as $priority => $callbacks ) {
			foreach ( $callbacks as $id => $cb ) {
				if ( self::is_hatch_callback( $cb['function'] ?? null ) ) {
					continue;
				}
				$to_remove[] = array( $priority, $cb['function'] );
			}
		}
		foreach ( $to_remove as $entry ) {
			remove_action( $hook, $entry[1], $entry[0] );
		}
	}

	/**
	 * Any callback whose class or function starts with Hatch_ / hatch_
	 * survives the purge. Everything else (Yoast, RankMath, Redirection,
	 * Action Scheduler, WPForms review nag, ACF prompts, WooCommerce
	 * upgrade banners) gets stripped for this request only.
	 */
	private static function is_hatch_callback( $fn ): bool {
		if ( is_string( $fn ) ) {
			return 0 === stripos( $fn, 'hatch_' ) || 0 === stripos( $fn, 'Hatch_' );
		}
		if ( is_array( $fn ) && ! empty( $fn[0] ) ) {
			$class = is_object( $fn[0] ) ? get_class( $fn[0] ) : (string) $fn[0];
			return 0 === stripos( $class, 'Hatch_' ) || 0 === stripos( $class, 'Hatch\\' );
		}
		if ( is_object( $fn ) && $fn instanceof Closure ) {
			// Anonymous closures — assume third-party. Hatch's own closures
			// (there are a couple in class-hardening.php) will get dropped
			// too; that's acceptable, they're non-critical status hints.
			return false;
		}
		return false;
	}
}

Hatch_Admin_Quiet::boot();

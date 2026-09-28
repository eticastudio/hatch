<?php
/**
 * Hatch setup screen.
 *
 * One path: connect Cloudflare with an API token, deploy the frontend, see it
 * live. The screen itself is React (admin-react/src/setup/SetupApp.jsx). PHP
 * here only redirects once after activation, mounts the app, and records that
 * setup was skipped or finished.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

add_action( 'admin_init', 'hatch_setup_wizard_route' );
add_action( 'admin_init', 'hatch_setup_wizard_maybe_redirect_first_run', 1 );
add_action( 'admin_menu', 'hatch_setup_wizard_menu' );

/**
 * Send the administrator to the setup screen once, right after activation.
 *
 * The activation handler sets a short-lived transient. Redirecting only ever
 * happens one time per install.
 *
 * @return void
 */
function hatch_setup_wizard_maybe_redirect_first_run(): void {
	// Hard idempotency: ONLY ever redirect once per install. Prevents
	// admin from bouncing repeatedly if the activation transient gets
	// re-set for any reason (upgrader, WP-CLI, manual reactivate).
	if ( get_option( 'hatch_first_run_redirected' ) ) {
		delete_transient( 'hatch_just_activated' );
		return;
	}
	if ( ! get_transient( 'hatch_just_activated' ) ) {
		return;
	}
	if ( wp_doing_ajax() || ( defined( 'DOING_CRON' ) && DOING_CRON ) ) {
		return;
	}
	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
		return;
	}
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	// Only bounce on top-level GET admin loads.
	if ( ! isset( $_SERVER['REQUEST_METHOD'] ) || 'GET' !== strtoupper( (string) $_SERVER['REQUEST_METHOD'] ) ) {
		return;
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only screen check.
	if ( isset( $_GET['page'] ) && 'hatch-setup' === sanitize_key( wp_unslash( (string) $_GET['page'] ) ) ) {
		delete_transient( 'hatch_just_activated' );
		update_option( 'hatch_first_run_redirected', time(), false );
		return; // already there
	}
	// Don't bounce if wizard already completed.
	if ( get_option( 'hatch_setup_wizard_completed' ) ) {
		delete_transient( 'hatch_just_activated' );
		update_option( 'hatch_first_run_redirected', time(), false );
		return;
	}
	delete_transient( 'hatch_just_activated' );
	update_option( 'hatch_first_run_redirected', time(), false );
	wp_safe_redirect( admin_url( 'admin.php?page=hatch-setup' ) );
	exit;
}

/**
 * Register the setup screen as a hidden page.
 *
 * The parent is options.php, the core screen that hides its children from the
 * menu. A null or empty parent leaves the screen title unset, which raises a
 * strip_tags() deprecation inside wp-admin/admin-header.php on PHP 8.1 and later.
 *
 * @return void
 */
function hatch_setup_wizard_menu(): void {
	add_submenu_page(
		'options.php',
		__( 'Hatch setup', 'hatch-bridge' ),
		__( 'Hatch setup', 'hatch-bridge' ),
		'manage_options',
		'hatch-setup',
		'hatch_setup_wizard_render'
	);
}

/**
 * Handle the two links that end the setup screen: skip, and finished.
 *
 * @return void
 */
function hatch_setup_wizard_route(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	// Skip link.
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- The nonce is checked on the next line.
	if ( isset( $_GET['hatch_skip_setup'] ) ) {
		check_admin_referer( 'hatch_skip_setup' );
		update_option( 'hatch_setup_wizard_completed', time() );
		wp_safe_redirect( admin_url( 'admin.php?page=hatch#connection' ) );
		exit;
	}

	// Marker set when the deploy screen is finished.
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- The nonce is checked on the next line.
	if ( isset( $_GET['hatch_complete_setup'] ) ) {
		check_admin_referer( 'hatch_complete_setup' );
		update_option( 'hatch_setup_wizard_completed', time() );
		wp_safe_redirect( admin_url( 'admin.php?page=hatch#connection' ) );
		exit;
	}
}

/**
 * Wizard renderer.
 *
 * @return void
 */
function hatch_setup_wizard_render(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch-bridge' ), '', array( 'response' => 403 ) );
	}
	// React owns the visuals. PHP only supplies the mount point. The bundle is
	// enqueued by hatch_enqueue_admin_assets() and reads window.hatchBoot.page
	// to choose the setup screen.
	echo '<div class="wrap hatch-wrap"><hr class="wp-header-end"><div id="hatch-react-root"></div></div>';
}

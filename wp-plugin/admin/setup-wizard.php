<?php
/**
 * Hatch First-Run Setup Wizard. v0.6.
 *
 * 4 steps, reordered per your feedback:
 *   1. Welcome    . diagnostic only (NO URL ask yet)
 *   2. Theme      . pick Blog / Tech / Docs
 *   3. Connect    . paste your Headless Website URL, generate App Password
 *   4. Done       . copy .env block + show hosting options
 *
 * Auto-redirects to step 1 on first activation. After completion, never
 * auto-redirects again. accessible only via direct admin URL or the
 * "Run setup wizard again" link in the dashboard footer.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

add_action( 'admin_init', 'hatch_setup_wizard_route' );
add_action( 'admin_init', 'hatch_setup_wizard_maybe_redirect_first_run', 1 );
add_action( 'admin_menu', 'hatch_setup_wizard_menu' );
add_action( 'admin_post_hatch_save_manual_target', 'hatch_handle_save_manual_target' );

/**
 * Handle "Local / Manual" connect. used when the user has their own
 * frontend already running (local Astro dev, self-managed Node host, an
 * existing CF Worker they deployed by hand, etc.) and just wants Hatch
 * to track that URL as the connected frontend. Mirrors the bookkeeping
 * the broker does after a real cloud deploy succeeds.
 *
 * @return void
 */
function hatch_handle_save_manual_target(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	check_admin_referer( 'hatch_save_manual_target' );

	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$url = isset( $_POST['hatch_manual_url'] ) ? esc_url_raw( wp_unslash( (string) $_POST['hatch_manual_url'] ) ) : '';
	$url = untrailingslashit( $url );
	if ( '' === $url || ! preg_match( '#^https?://#i', $url ) ) {
		set_transient( 'hatch_manual_target_error', __( 'Enter a valid URL starting with http:// or https://', 'hatch' ), 60 );
		wp_safe_redirect( admin_url( 'admin.php?page=hatch-setup&step=3&manual=fail' ) );
		exit;
	}

	update_option( 'hatch_frontend_url', $url, false );
	if ( class_exists( 'Hatch_Connection_Status' ) ) {
		Hatch_Connection_Status::set_hosting_model( 'vps' ); // 'manual' isn't whitelisted; vps is the closest semantic. user-managed host.
	}
	update_option( 'hatch_connected', 1 );
	update_option( 'hatch_last_webhook_ack', time() );
	update_option( 'hatch_last_webhook_ack_status', 'ok' );
	delete_option( 'hatch_disconnect_note' );

	// Auto-fill revalidate endpoint if not already set.
	if ( '' === (string) get_option( 'hatch_revalidate_endpoint', '' ) ) {
		update_option( 'hatch_revalidate_endpoint', $url . '/api/revalidate', false );
	}
	if ( '' === (string) get_option( 'hatch_image_proxy_url', '' ) ) {
		update_option( 'hatch_image_proxy_url', $url );
	}

	// Flip into headless mode (companion theme on, WP frontend 302s).
	if ( class_exists( 'Hatch_Companion_Theme_Installer' ) ) {
		Hatch_Companion_Theme_Installer::install_and_activate();
	}

	update_option( 'hatch_setup_wizard_completed', time() );

	wp_safe_redirect( admin_url( 'admin.php?page=hatch#status' ) );
	exit;
}

/**
 * Auto-redirect on first activation.
 *
 * Set by Hatch::on_activate(). transient lives ~30 seconds.
 *
 * @return void
 */
function hatch_setup_wizard_maybe_redirect_first_run(): void {
	if ( ! get_transient( 'hatch_just_activated' ) ) {
		return;
	}
	if ( wp_doing_ajax() || ( defined( 'DOING_CRON' ) && DOING_CRON ) ) {
		return;
	}
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if ( isset( $_GET['page'] ) && 'hatch-setup' === $_GET['page'] ) {
		return; // already there
	}
	// Don't bounce if wizard already completed.
	if ( get_option( 'hatch_setup_wizard_completed' ) ) {
		delete_transient( 'hatch_just_activated' );
		return;
	}
	delete_transient( 'hatch_just_activated' );
	wp_safe_redirect( admin_url( 'admin.php?page=hatch-setup' ) );
	exit;
}

function hatch_setup_wizard_menu(): void {
	add_submenu_page(
		null,
		__( 'Hatch Setup', 'hatch' ),
		'Hatch Setup',
		'manage_options',
		'hatch-setup',
		'hatch_setup_wizard_render'
	);
}

function hatch_setup_wizard_route(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	// Skip link.
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if ( isset( $_GET['hatch_skip_setup'] ) ) {
		check_admin_referer( 'hatch_skip_setup' );
		update_option( 'hatch_setup_wizard_completed', time() );
		wp_safe_redirect( admin_url( 'admin.php?page=hatch#connection' ) );
		exit;
	}

	// Step 2. Theme. After saving, also generate the App Password upfront so
	// the deploy step has it ready (no separate URL/host-picker step needed
	// the broker auto-fills the URL after Direct Upload completes, and the host
	// is implicitly picked by which deploy button the user clicks).
	if ( isset( $_POST['hatch_setup_step'] ) && '2' === (string) $_POST['hatch_setup_step'] ) {
		check_admin_referer( 'hatch_setup_step2' );
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$theme = isset( $_POST['hatch_theme'] ) ? sanitize_key( wp_unslash( (string) $_POST['hatch_theme'] ) ) : 'blog';
		Hatch_Features::set_theme( $theme );

		// Stage the companion theme files now so they're ready the moment the
		// deploy succeeds. Activation happens later in the deploy broker (once
		// a real frontend URL exists), so this is safe even if the user bails
		// out of the wizard. they just get an unused theme in the picker.
		if ( class_exists( 'Hatch_Companion_Theme_Installer' ) ) {
			Hatch_Companion_Theme_Installer::install_files();
		}

		// Pre-generate App Password so the next step has credentials ready.
		if ( class_exists( 'Hatch_App_Password_Helper' ) ) {
			Hatch_App_Password_Helper::generate_and_stash( 'Hatch (Setup Wizard)' );
		}

		wp_safe_redirect( admin_url( 'admin.php?page=hatch-setup&step=3' ) );
		exit;
	}

	// Step 3 (Deploy) complete marker.
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
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
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}
	// React owns the visuals. PHP only supplies the mount point. The bundle is
	// enqueued by hatch_enqueue_admin_assets() and reads window.hatchBoot.page
	// === 'setup' to render the SetupWizard component.
	echo '<div class="wrap" style="margin:0;padding:0;max-width:none;"><div id="hatch-react-root"></div></div>';
}


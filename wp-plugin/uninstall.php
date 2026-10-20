<?php
/**
 * Uninstall handler for Hatch.
 *
 * Runs only when the plugin is deleted from Plugins > Installed Plugins, never on
 * deactivation or update.
 *
 * Always removed, whatever the setting below says, because they are credentials or
 * live connections that must not outlive the plugin:
 *   - the encrypted deploy token and every stored secret (webhook, revalidate, JWT, AI key)
 *   - the Turnstile secret key inside the integrations option
 *   - Cloudflare deploy state (worker state, last deploy, deploy provider and project options),
 *     connection and heartbeat state, hosting model, legacy agent and SSH options
 *   - every hatch_* transient, every scheduled Hatch cron event and the Hatch block in uploads/.htaccess
 *   - the user name and encrypted application password the deployed frontend uses
 *   - the optional URL rewriter mu-plugin (hatch-url-rewrite.php) is deleted, but only a copy
 *     Hatch wrote (marker header or a known earlier release); a file anyone else wrote is kept
 *
 * Removed only when the administrator ticked "Remove all data on uninstall"
 * (option hatch_uninstall_remove_all_data = 1) before deleting the plugin:
 *   - every remaining hatch_* option (settings, design, SEO and form settings)
 *   - the form submissions table, stored submission posts and Hatch user meta
 *
 * The Worker deployed to the site owner's own Cloudflare account is not touched;
 * it lives in that account and is removed there.
 *
 * @package Hatch
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

/**
 * Remove Hatch data for the current site.
 *
 * @return void
 */
function hatch_uninstall_current_site() {
	global $wpdb;

	$remove_all = 1 === (int) get_option( 'hatch_uninstall_remove_all_data', 0 );

	// Scheduled events.
	$cron_hooks = array(
		'hatch_check_connection',
		'hatch_connection_check',
		'hatch_cloud_heartbeat',
		'hatch_host_detect_refresh',
		'hatch_prune_app_pwds_cron',
	);
	foreach ( $cron_hooks as $hook ) {
		wp_clear_scheduled_hook( $hook );
	}

	if ( ! class_exists( 'Hatch_Mu_Plugin' ) ) {
		require_once __DIR__ . '/includes/class-mu-plugin.php';
	}

	// Hatch no longer touches themes. Drop the marker an earlier build stored so nothing is left behind.
	delete_option( 'hatch_previous_stylesheet' );

	// The frontend's WordPress credential: Hatch only ever kept the encrypted password and the user name.
	// The application password itself lives in the user's profile, where its owner revokes it.
	delete_option( 'hatch_enc_token_wpfrontend' );
	delete_option( 'hatch_wp_frontend_user' );

	// Earlier versions added a "Hatch Reader" role and settings. The role goes; any user that had it
	// keeps existing (without a role) for the site owner to delete.
	remove_role( 'hatch_reader' );
	delete_option( 'hatch_reader_user_id' );
	delete_option( 'hatch_app_pwd_retention_days' );
	delete_option( 'hatch_legacy_reader_cleaned' );

	// The Hatch block in uploads/.htaccess.
	$hatch_uploads = wp_get_upload_dir();
	if ( ! empty( $hatch_uploads['basedir'] ) && file_exists( trailingslashit( $hatch_uploads['basedir'] ) . '.htaccess' ) ) {
		if ( ! function_exists( 'insert_with_markers' ) ) {
			require_once ABSPATH . 'wp-admin/includes/misc.php';
		}
		insert_with_markers( trailingslashit( $hatch_uploads['basedir'] ) . '.htaccess', 'Hatch', array() );
	}

	// Named secrets and state.
	$always_options = array(
		'hatch_webhook_secret',
		'hatch_revalidate_secret',
		'hatch_jwt_secret',
		'hatch_ai_api_key',
		'hatch_cf_worker_state',
		'hatch_deploy_last',
		'hatch_previous_stylesheet',
		'hatch_mu_issue',
		'hatch_deployed_frontend_version',
		'hatch_htaccess_hash',
		'hatch_deploy_provider',
		'hatch_hosting_model',
		'hatch_connected',
		'hatch_disconnect_note',
		'hatch_last_webhook_ack',
		'hatch_last_webhook_ack_status',
		'hatch_last_revalidate_at',
		'hatch_detected_host',
		// Performance tab clean-up switches.
		'hatch_perf_bloat_kill',
		'hatch_perf_bloat',
		// Options of the removed custom login URL feature.
		'hatch_login_slug',
		'hatch_login_redirect_slug',
		'hatch_login_redirect_custom',
		'hatch_fortress_login_slug',
		'hatch_fortress_hide_login',
	);
	foreach ( $always_options as $option ) {
		delete_option( $option );
	}

	// The Turnstile secret key lives inside the integrations option.
	$integrations = get_option( 'hatch_integrations', null );
	if ( is_array( $integrations ) && isset( $integrations['turnstile']['secret_key'] ) ) {
		$integrations['turnstile']['secret_key'] = '';
		update_option( 'hatch_integrations', $integrations, false );
	}

	// Prefixed families: encrypted tokens, deploy projects, heartbeats, legacy agent and SSH options.
	$always_like = array(
		'hatch\_enc\_token\_%',
		'hatch\_deploy\_%',
		'hatch\_heartbeat\_%',
		'hatch\_agent\_%',
		'hatch\_ssh\_%',
		'\_transient\_hatch\_%',
		'\_transient\_timeout\_hatch\_%',
	);
	foreach ( $always_like as $pattern ) {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- One-off cleanup of this plugin's own rows.
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $pattern ) );
	}

	if ( $remove_all ) {
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- One-off cleanup of this plugin's own rows.
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", 'hatch\_%' ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- One-off cleanup of this plugin's own rows.
		$wpdb->query( $wpdb->prepare( "DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE %s", 'hatch\_%' ) );

		$submissions = get_posts(
			array(
				'post_type'      => 'hatch_submission',
				'post_status'    => 'any',
				'posts_per_page' => -1,
				'fields'         => 'ids',
			)
		);
		foreach ( $submissions as $submission_id ) {
			wp_delete_post( (int) $submission_id, true );
		}

		$table = $wpdb->prefix . 'hatch_form_submissions';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.SchemaChange, WordPress.DB.DirectDatabaseQuery.NoCaching -- Removes this plugin's own table; the identifier goes through the %i placeholder (WordPress 6.2+).
		$wpdb->query( $wpdb->prepare( 'DROP TABLE IF EXISTS %i', $table ) );
	}

	wp_cache_flush();
}

if ( is_multisite() ) {
	$hatch_site_ids = get_sites(
		array(
			'fields' => 'ids',
			'number' => 0,
		)
	);
	foreach ( $hatch_site_ids as $hatch_site_id ) {
		switch_to_blog( (int) $hatch_site_id );
		hatch_uninstall_current_site();
		restore_current_blog();
	}
	unset( $hatch_site_ids, $hatch_site_id );
} else {
	hatch_uninstall_current_site();
}

// Files that live outside the plugin folder go last, after every site has been cleaned up: the mu-plugin helper.
Hatch_Mu_Plugin::remove_for_uninstall();

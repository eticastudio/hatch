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
 *   - Application Passwords created by Hatch, the read-only Hatch Reader user the deployed
 *     frontend logs in as (only when Hatch created it) and its hatch_reader role
 *   - the companion theme is switched off: the theme that was active before the first deploy
 *     is restored (option hatch_previous_stylesheet), or the newest default theme when it is gone,
 *     but only if the companion theme is still the active one
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

	// Uninstall runs without the plugin loaded, so bring in the two classes that own these two jobs.
	if ( ! class_exists( 'Hatch_Companion_Theme_Installer' ) ) {
		require_once __DIR__ . '/includes/class-companion-theme-installer.php';
	}
	if ( ! class_exists( 'Hatch_App_Password_Helper' ) ) {
		require_once __DIR__ . '/includes/class-app-password-helper.php';
	}

	// Give the site its own theme back, before the companion theme is left without a plugin behind it.
	Hatch_Companion_Theme_Installer::restore_previous_theme();

	// Remove the read-only frontend user, its passwords and its role.
	Hatch_App_Password_Helper::revoke_reader_access();

	// Application Passwords created by Hatch.
	if ( class_exists( 'WP_Application_Passwords' ) ) {
		$user_ids = get_users( array( 'fields' => 'ID' ) );
		foreach ( $user_ids as $user_id ) {
			$passwords = WP_Application_Passwords::get_user_application_passwords( (int) $user_id );
			if ( ! is_array( $passwords ) ) {
				continue;
			}
			foreach ( $passwords as $password ) {
				if ( isset( $password['name'], $password['uuid'] ) && 0 === strpos( (string) $password['name'], 'Hatch' ) ) {
					WP_Application_Passwords::delete_application_password( (int) $user_id, $password['uuid'] );
				}
			}
		}
	}

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
		'hatch_reader_user_id',
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

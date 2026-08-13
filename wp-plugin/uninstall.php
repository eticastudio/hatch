<?php
/**
 * Hatch — uninstall handler.
 *
 * Runs ONLY when the user clicks Delete in WP admin → Plugins, never during a
 * deactivate-then-reactivate or in-place update. By default we preserve all
 * settings (frontend URL, theme, deploy projects, encrypted tokens) so a
 * remove-and-readd cycle drops the user back exactly where they were —
 * one click to redeploy, no re-paste.
 *
 * To wipe everything, the user explicitly ticks "Remove all data on uninstall"
 * in Hatch → Security tab BEFORE deleting the plugin. That sets
 * `hatch_uninstall_remove_all_data = 1`, which this script honours.
 *
 * @package Hatch
 * @since   0.49.5
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Default behaviour: preserve all settings + auth so a future re-install is
// one-click. Only opt-in users get a full wipe.
$remove_all = (int) get_option( 'hatch_uninstall_remove_all_data', 0 );
if ( 1 !== $remove_all ) {
	return;
}

global $wpdb;

// 1) Wipe every hatch_* option (settings, deploy metadata, encrypted tokens).
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE 'hatch\\_%' ESCAPE '\\\\'" );

// 2) Wipe Hatch transients (cache layers).
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_hatch\\_%' ESCAPE '\\\\'" );
$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_timeout\\_hatch\\_%' ESCAPE '\\\\'" );

// 3) Revoke every Hatch-issued Application Password across all users.
if ( class_exists( 'WP_Application_Passwords' ) ) {
	$user_ids = get_users( array( 'fields' => 'ID' ) );
	foreach ( $user_ids as $uid ) {
		$pwds = WP_Application_Passwords::get_user_application_passwords( $uid );
		if ( ! is_array( $pwds ) ) continue;
		foreach ( $pwds as $p ) {
			if ( isset( $p['name'] ) && 0 === stripos( (string) $p['name'], 'Hatch' ) ) {
				WP_Application_Passwords::delete_application_password( $uid, $p['uuid'] );
			}
		}
	}
}

// 4) Clear scheduled cron events.
$timestamp = wp_next_scheduled( 'hatch_connection_check' );
if ( $timestamp ) {
	wp_unschedule_event( $timestamp, 'hatch_connection_check' );
}
wp_clear_scheduled_hook( 'hatch_connection_check' );

// 5) Belt-and-suspenders explicit deletes for feature-toggle keys added in
//    recent releases. The LIKE-wildcard in step (1) already catches these,
//    but naming them here keeps the uninstall contract auditable for
//    security review and works even if a host disables raw $wpdb queries.
$hatch_feature_option_keys = array(
	'hatch_blocks_disable_unsupported', // 0.7.5: Gutenberg whitelist gate.
	'hatch_fortress_login_slug',        // 0.7.x: custom login slug.
	'hatch_design_dark_mode_enabled',   // 0.7.x: dark mode toggle.
);
foreach ( $hatch_feature_option_keys as $hatch_opt ) {
	delete_option( $hatch_opt );
	// Multisite: also drop site-level (network) copies if any exist.
	if ( is_multisite() ) {
		delete_site_option( $hatch_opt );
	}
}
unset( $hatch_feature_option_keys, $hatch_opt );

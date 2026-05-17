<?php
/**
 * PHPUnit bootstrap for Hatch.
 *
 * Two test modes:
 *
 *   1. UNIT tests — don't load WordPress. Use Brain Monkey-style stubs for any
 *      WP function we touch, OR test pure functions. Fast (< 1s for whole suite).
 *
 *   2. INTEGRATION tests — load WP test framework (wp-phpunit/wp-phpunit).
 *      Slower but cover hook integration, REST routing, DB. Run via:
 *
 *          WP_TESTS_DIR=/tmp/wordpress-tests-lib composer test
 *
 * For local quick checks, unit tests are enough. CI runs both.
 *
 * @package Hatch
 */

declare( strict_types=1 );

define( 'HATCH_TESTS_DIR', __DIR__ );
define( 'HATCH_ROOT_DIR',  dirname( __DIR__ ) );
define( 'HATCH_PLUGIN_DIR_TEST', HATCH_ROOT_DIR . '/wp-plugin/' );

// Composer autoload (for PHPUnit, etc.)
$autoload = HATCH_ROOT_DIR . '/vendor/autoload.php';
if ( file_exists( $autoload ) ) {
	require_once $autoload;
} else {
	fwrite( STDERR, "\nHatch tests: composer dependencies not installed. Run `composer install` first.\n\n" );
	exit( 1 );
}

// Integration tests need WordPress core test framework.
$wp_tests_dir = getenv( 'WP_TESTS_DIR' );
if ( $wp_tests_dir && is_dir( $wp_tests_dir ) ) {
	require_once $wp_tests_dir . '/includes/functions.php';
	tests_add_filter( 'muplugins_loaded', function () {
		require_once HATCH_PLUGIN_DIR_TEST . 'hatch.php';
	});
	require_once $wp_tests_dir . '/includes/bootstrap.php';
} else {
	// Unit-only mode — load WP function stubs.
	require_once __DIR__ . '/stubs/wp-stubs.php';
}

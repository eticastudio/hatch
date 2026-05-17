<?php
/**
 * Unit tests for Hatch_Detector.
 *
 * Verifies plugin detection logic with mocked `active_plugins` option.
 * Cache invalidation, priority order for SEO/forms/membership/CF/CPT/i18n.
 *
 * @package Hatch\Tests
 */

declare( strict_types=1 );

namespace Hatch\Tests\Unit;

use PHPUnit\Framework\TestCase;

// Stub the WP-admin plugin.php loader (Hatch_Detector calls require_once for it).
if ( ! function_exists( 'is_plugin_active' ) ) {
	function is_plugin_active( $plugin ) {
		$active = (array) \get_option( 'active_plugins', array() );
		return in_array( $plugin, $active, true );
	}
}
if ( ! function_exists( 'is_plugin_active_for_network' ) ) {
	function is_plugin_active_for_network( $plugin ) { return false; }
}

require_once HATCH_PLUGIN_DIR_TEST . 'includes/class-detector.php';

/**
 * Class DetectorTest
 */
final class DetectorTest extends TestCase {

	protected function setUp(): void {
		hatch_test_reset();
		\Hatch_Detector::reset_cache();
	}

	public function test_no_active_plugins_returns_empty_report(): void {
		update_option( 'active_plugins', array() );
		\Hatch_Detector::reset_cache();

		$this->assertFalse( \Hatch_Detector::is_active( 'rankmath' ) );
		$this->assertFalse( \Hatch_Detector::is_active( 'acf' ) );
		$this->assertSame( 'none', \Hatch_Detector::get_seo_plugin() );
		$this->assertSame( 'none', \Hatch_Detector::get_membership_plugin() );
		$this->assertSame( 'none', \Hatch_Detector::get_custom_fields_plugin() );
		$this->assertSame( 'none', \Hatch_Detector::get_cpt_plugin() );
		$this->assertSame( 'none', \Hatch_Detector::get_i18n_plugin() );
		$this->assertEmpty( \Hatch_Detector::get_form_plugins() );
		$this->assertFalse( \Hatch_Detector::has_custom_fields() );
	}

	public function test_rankmath_detection(): void {
		update_option( 'active_plugins', array( 'seo-by-rank-math/rank-math.php' ) );
		\Hatch_Detector::reset_cache();

		$this->assertTrue( \Hatch_Detector::is_active( 'rankmath' ) );
		$this->assertSame( 'rankmath', \Hatch_Detector::get_seo_plugin() );
	}

	public function test_seo_priority_rankmath_over_yoast(): void {
		update_option( 'active_plugins', array(
			'seo-by-rank-math/rank-math.php',
			'wordpress-seo/wp-seo.php',
		) );
		\Hatch_Detector::reset_cache();

		// RankMath wins.
		$this->assertSame( 'rankmath', \Hatch_Detector::get_seo_plugin() );
	}

	public function test_seo_falls_back_to_yoast(): void {
		update_option( 'active_plugins', array( 'wordpress-seo/wp-seo.php' ) );
		\Hatch_Detector::reset_cache();

		$this->assertSame( 'yoast', \Hatch_Detector::get_seo_plugin() );
	}

	public function test_custom_fields_priority_order(): void {
		// ACF Pro > ACF > SCF > Meta Box > Pods
		update_option( 'active_plugins', array(
			'advanced-custom-fields-pro/acf.php',
			'advanced-custom-fields/acf.php',
			'meta-box/meta-box.php',
		) );
		\Hatch_Detector::reset_cache();
		$this->assertSame( 'acf_pro', \Hatch_Detector::get_custom_fields_plugin() );
		$this->assertTrue( \Hatch_Detector::has_custom_fields() );
	}

	public function test_custom_fields_falls_back_through_priority(): void {
		// Only Meta Box active — should pick it (SCF/ACF higher priority but absent).
		update_option( 'active_plugins', array( 'meta-box/meta-box.php' ) );
		\Hatch_Detector::reset_cache();
		$this->assertSame( 'meta_box', \Hatch_Detector::get_custom_fields_plugin() );
	}

	public function test_form_plugins_returns_all_active(): void {
		update_option( 'active_plugins', array(
			'wpforms-lite/wpforms.php',
			'fluentform/fluentform.php',
			'contact-form-7/wp-contact-form-7.php',
		) );
		\Hatch_Detector::reset_cache();

		$forms = \Hatch_Detector::get_form_plugins();
		$this->assertContains( 'wpforms', $forms );
		$this->assertContains( 'fluent_forms', $forms );
		$this->assertContains( 'cf7', $forms );
		$this->assertCount( 3, $forms );
	}

	public function test_unknown_plugin_key_returns_false(): void {
		update_option( 'active_plugins', array( 'random/plugin.php' ) );
		\Hatch_Detector::reset_cache();
		$this->assertFalse( \Hatch_Detector::is_active( 'definitely-not-a-real-key' ) );
	}

	public function test_membership_priority(): void {
		update_option( 'active_plugins', array(
			'memberpress/memberpress.php',
			'paid-memberships-pro/paid-memberships-pro.php',
		) );
		\Hatch_Detector::reset_cache();
		$this->assertSame( 'memberpress', \Hatch_Detector::get_membership_plugin() );
	}

	public function test_i18n_priority_wpml_over_polylang(): void {
		update_option( 'active_plugins', array(
			'sitepress-multilingual-cms/sitepress.php',
			'polylang/polylang.php',
		) );
		\Hatch_Detector::reset_cache();
		$this->assertSame( 'wpml', \Hatch_Detector::get_i18n_plugin() );
	}

	public function test_report_shape(): void {
		update_option( 'active_plugins', array(
			'seo-by-rank-math/rank-math.php',
			'advanced-custom-fields-pro/acf.php',
			'wpforms-lite/wpforms.php',
			'rankready/rankready.php',
		) );
		\Hatch_Detector::reset_cache();

		$report = \Hatch_Detector::report();

		$this->assertIsArray( $report );
		$this->assertArrayHasKey( 'plugins', $report );
		$this->assertArrayHasKey( 'seo', $report );
		$this->assertArrayHasKey( 'forms', $report );
		$this->assertArrayHasKey( 'membership', $report );
		$this->assertArrayHasKey( 'custom_fields', $report );
		$this->assertArrayHasKey( 'cpt_manager', $report );
		$this->assertArrayHasKey( 'i18n', $report );
		$this->assertArrayHasKey( 'has_rankready', $report );

		$this->assertTrue( $report['has_rankready'] );
		$this->assertSame( 'rankmath', $report['seo'] );
		$this->assertSame( 'acf_pro', $report['custom_fields'] );
		$this->assertContains( 'wpforms', $report['forms'] );
	}

	public function test_known_keys_returns_all_24_plugins(): void {
		$keys = \Hatch_Detector::known_keys();
		$this->assertIsArray( $keys );
		$this->assertGreaterThanOrEqual( 24, count( $keys ),
			'Expected at least 24 tracked plugin keys' );
		$this->assertContains( 'rankmath',    $keys );
		$this->assertContains( 'acf_pro',     $keys );
		$this->assertContains( 'meta_box',    $keys );
		$this->assertContains( 'woocommerce', $keys );
		$this->assertContains( 'jet_engine',  $keys );
	}

	public function test_cache_invalidation_after_reset(): void {
		update_option( 'active_plugins', array( 'seo-by-rank-math/rank-math.php' ) );
		\Hatch_Detector::reset_cache();
		$this->assertTrue( \Hatch_Detector::is_active( 'rankmath' ) );

		// Now deactivate, reset cache, verify.
		update_option( 'active_plugins', array() );
		\Hatch_Detector::reset_cache();
		$this->assertFalse( \Hatch_Detector::is_active( 'rankmath' ) );
	}
}

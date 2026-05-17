<?php
/**
 * Unit tests for Hatch_Domain_Check::classify().
 *
 * Verifies the root-domain vs subdomain vs dev-host classification logic
 * across all the edge cases we documented in CLAUDE.md.
 *
 * @package Hatch\Tests
 */

declare( strict_types=1 );

namespace Hatch\Tests\Unit;

use PHPUnit\Framework\TestCase;

// Load the class under test (uses WP stubs for home_url etc.).
require_once HATCH_PLUGIN_DIR_TEST . 'includes/class-domain-check.php';

/**
 * Class DomainCheckTest
 */
final class DomainCheckTest extends TestCase {

	protected function setUp(): void {
		hatch_test_reset();
	}

	/**
	 * @dataProvider rootDomainProvider
	 */
	public function test_root_domains_are_flagged( string $url ): void {
		hatch_test_set_home_url( $url );
		$this->assertSame( 'root', \Hatch_Domain_Check::classify(),
			"Expected '$url' to be classified as root domain" );
	}

	/**
	 * @dataProvider subdomainProvider
	 */
	public function test_subdomains_pass( string $url ): void {
		hatch_test_set_home_url( $url );
		$this->assertSame( 'subdomain', \Hatch_Domain_Check::classify(),
			"Expected '$url' to be classified as subdomain (safe)" );
	}

	/**
	 * @dataProvider devHostProvider
	 */
	public function test_dev_hosts_are_ignored( string $url ): void {
		hatch_test_set_home_url( $url );
		$this->assertSame( 'dev', \Hatch_Domain_Check::classify(),
			"Expected '$url' to be classified as dev (no warning)" );
	}

	/**
	 * @dataProvider ipProvider
	 */
	public function test_ip_addresses_are_ignored( string $url ): void {
		hatch_test_set_home_url( $url );
		$this->assertSame( 'ip', \Hatch_Domain_Check::classify(),
			"Expected '$url' to be classified as IP (no warning)" );
	}

	public function test_country_tld_root_is_flagged_as_root(): void {
		hatch_test_set_home_url( 'https://mysite.co.uk' );
		$this->assertSame( 'root', \Hatch_Domain_Check::classify() );
	}

	public function test_country_tld_subdomain_is_safe(): void {
		hatch_test_set_home_url( 'https://cms.mysite.co.uk' );
		$this->assertSame( 'subdomain', \Hatch_Domain_Check::classify() );
	}

	public function test_www_subdomain_is_treated_as_root(): void {
		// www.* is equivalent to root for headless purposes — it's public-facing.
		hatch_test_set_home_url( 'https://www.mysite.com' );
		$this->assertSame( 'root', \Hatch_Domain_Check::classify() );
	}

	public function test_custom_backend_prefixes_are_subdomain(): void {
		// Any subdomain works — we whitelist common ones but any prefix should be 'subdomain'.
		foreach ( array( 'cms', 'wp', 'admin', 'api', 'headless', 'backend', 'manage', 'editor', 'mycustomname' ) as $prefix ) {
			hatch_test_set_home_url( "https://$prefix.mysite.com" );
			$this->assertSame( 'subdomain', \Hatch_Domain_Check::classify(),
				"Prefix '$prefix' should classify as subdomain" );
		}
	}

	/* ----------------------------------------------------------------
	 * Data providers
	 * ---------------------------------------------------------------- */

	public function rootDomainProvider(): array {
		return array(
			'plain .com'        => array( 'https://mysite.com' ),
			'plain .net'        => array( 'https://example.net' ),
			'plain .io'         => array( 'https://launchpad.io' ),
			'with trailing slash' => array( 'https://mysite.com/' ),
			'with path'         => array( 'https://mysite.com/path' ),
			'http (not https)'  => array( 'http://mysite.org' ),
			'.org TLD'          => array( 'https://wordpress.org' ),
			'co.uk root'        => array( 'https://mysite.co.uk' ),
			'co.in root'        => array( 'https://mysite.co.in' ),
			'com.au root'       => array( 'https://mysite.com.au' ),
			'www. is treated as root' => array( 'https://www.mysite.com' ),
		);
	}

	public function subdomainProvider(): array {
		return array(
			'cms.* prefix'    => array( 'https://cms.mysite.com' ),
			'wp.* prefix'     => array( 'https://wp.mysite.com' ),
			'admin.* prefix'  => array( 'https://admin.mysite.com' ),
			'api.* prefix'    => array( 'https://api.mysite.com' ),
			'headless.* prefix' => array( 'https://headless.mysite.com' ),
			'arbitrary subdomain' => array( 'https://something.mysite.com' ),
			'deep subdomain'  => array( 'https://wp.staging.mysite.com' ),
			'cms.co.uk'       => array( 'https://cms.mysite.co.uk' ),
		);
	}

	public function devHostProvider(): array {
		return array(
			'localhost'       => array( 'http://localhost' ),
			'localhost:8080'  => array( 'http://localhost:8080' ),
			'*.local'         => array( 'http://mysite.local' ),
			'*.test'          => array( 'http://mysite.test' ),
			'*.ddev.site'     => array( 'http://mysite.ddev.site' ),
			'*.lndo.site'     => array( 'http://mysite.lndo.site' ),
		);
	}

	public function ipProvider(): array {
		return array(
			'IPv4'             => array( 'http://192.168.1.10' ),
			'IPv4 with port'   => array( 'http://192.168.1.10:8080' ),
			'IPv4 local'       => array( 'http://10.0.0.5' ),
			'IPv4 production'  => array( 'http://95.216.156.89' ),
		);
	}
}

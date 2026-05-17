<?php
/**
 * RankReady detection (no admin banner).
 *
 * In v0.6 we removed the admin banner — Hatch's plugin chrome stays clean.
 * RankReady is still detected so that the seo-head bridge can compose
 * RankReady-managed Speakable + AEO schema into the headless response.
 *
 * If you want to learn about RankReady, see:
 *   https://github.com/adityaarsharma/rankready
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_RankReady_Bridge
 */
class Hatch_RankReady_Bridge {

	/**
	 * @var Hatch_RankReady_Bridge|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_RankReady_Bridge
	 */
	public static function instance(): Hatch_RankReady_Bridge {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * No-op constructor in v0.6+. Detection is exposed as a static method below.
	 */
	private function __construct() {
		// Intentionally empty — banner removed for cleaner plugin chrome.
	}

	/**
	 * Is RankReady installed and active?
	 *
	 * @return bool
	 */
	public static function is_active(): bool {
		return Hatch_Detector::is_active( 'rankready' );
	}
}

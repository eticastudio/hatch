<?php
/**
 * Custom Post Type REST exposure scanner.
 *
 * The #1 silent failure in headless WordPress: a CPT registered without
 * `show_in_rest => true`. The site looks fine in wp-admin, but the headless
 * frontend gets 404 from the REST API and the developer has no idea why.
 *
 * This class scans all registered CPTs (skipping WP core types) and flags
 * any that are invisible to REST.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Cpt_Scanner
 */
class Hatch_Cpt_Scanner {

	/**
	 * Built-in WordPress post types - never warn on these.
	 *
	 * @var array<string>
	 */
	private const CORE_TYPES = array(
		'post',
		'page',
		'attachment',
		'revision',
		'nav_menu_item',
		'custom_css',
		'customize_changeset',
		'oembed_cache',
		'user_request',
		'wp_block',
		'wp_template',
		'wp_template_part',
		'wp_global_styles',
		'wp_navigation',
		'wp_font_family',
		'wp_font_face',
	);

	/**
	 * Transient cache key.
	 */
	const CACHE_KEY = 'hatch_cpt_scan_v1';

	/**
	 * Dismiss transient key.
	 */
	const DISMISS_KEY = 'hatch_cpt_notice_dismissed';

	/**
	 * Cache lifetime in seconds.
	 */
	const CACHE_TTL = 300;

	/**
	 * @var Hatch_Cpt_Scanner|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Cpt_Scanner
	 */
	public static function instance(): Hatch_Cpt_Scanner {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire hooks.
	 */
	private function __construct() {

		// Bust cache when CPTs are registered (most CPT plugins fire this).
		add_action( 'registered_post_type', array( __CLASS__, 'flush_cache' ) );
	}

	/**
	 * Scan all registered post types.
	 *
	 * Returns:
	 * [
	 *   'total_custom' => int,
	 *   'exposed'      => int,
	 *   'hidden'       => int,
	 *   'hidden_types' => [
	 *     [
	 *       'name'         => string,
	 *       'label'        => string,
	 *       'public'       => bool,
	 *       'show_in_rest' => bool,
	 *       'rest_base'    => string|null,
	 *     ],
	 *     ...
	 *   ],
	 *   'all_types'    => [ ['name','label','show_in_rest','rest_base'], ... ],
	 *   'scanned_at'   => int,
	 * ]
	 *
	 * @return array<string,mixed>
	 */
	public static function scan(): array {
		$cached = get_transient( self::CACHE_KEY );
		if ( false !== $cached && is_array( $cached ) ) {
			return $cached;
		}

		$result = array(
			'total_custom' => 0,
			'exposed'      => 0,
			'hidden'       => 0,
			'hidden_types' => array(),
			'all_types'    => array(),
			'scanned_at'   => time(),
		);

		$types = get_post_types( array(), 'objects' );
		foreach ( $types as $type ) {
			$name = (string) $type->name;
			if ( in_array( $name, self::CORE_TYPES, true ) ) {
				continue;
			}
			// Skip private, non-public types - they may legitimately not be in REST.
			$public = (bool) $type->public;
			if ( ! $public ) {
				continue;
			}

			++$result['total_custom'];
			$show_in_rest = (bool) $type->show_in_rest;
			$rest_base    = ! empty( $type->rest_base ) ? (string) $type->rest_base : $name;
			$label        = isset( $type->labels->name ) ? (string) $type->labels->name : $name;

			$summary               = array(
				'name'         => sanitize_key( $name ),
				'label'        => sanitize_text_field( $label ),
				'show_in_rest' => $show_in_rest,
				'rest_base'    => sanitize_key( $rest_base ),
			);
			$result['all_types'][] = $summary;

			if ( $show_in_rest ) {
				++$result['exposed'];
			} else {
				++$result['hidden'];
				$result['hidden_types'][] = $summary + array( 'public' => $public );
			}
		}

		set_transient( self::CACHE_KEY, $result, self::CACHE_TTL );
		return $result;
	}

	/**
	 * Flush the cache (called on registered_post_type).
	 *
	 * @return void
	 */
	public static function flush_cache(): void {
		delete_transient( self::CACHE_KEY );
	}
}

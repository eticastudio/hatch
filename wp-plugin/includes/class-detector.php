<?php
/**
 * Plugin detection.
 *
 * Detects which 3rd-party plugins are active so other Hatch components
 * can adapt their behavior (e.g. SEO bridge picks RankMath OR Yoast).
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Detector
 */
class Hatch_Detector {

	/**
	 * Plugin file paths to detect.
	 *
	 * Keep this list curated — adding a plugin here is a public contract.
	 *
	 * @var array<string,string>
	 */
	private const KNOWN = array(
		// SEO.
		'rankmath'         => 'seo-by-rank-math/rank-math.php',
		'rankmath_pro'     => 'seo-by-rank-math-pro/rank-math-pro.php',
		'yoast'            => 'wordpress-seo/wp-seo.php',
		'yoast_premium'    => 'wordpress-seo-premium/wp-seo-premium.php',
		'rankready'        => 'rankready/rankready.php',

		// Forms.
		'wpforms'          => 'wpforms-lite/wpforms.php',
		'wpforms_pro'      => 'wpforms/wpforms.php',
		'fluent_forms'     => 'fluentform/fluentform.php',
		'gravity_forms'    => 'gravityforms/gravityforms.php',
		'cf7'              => 'contact-form-7/wp-contact-form-7.php',

		// Membership.
		'memberpress'      => 'memberpress/memberpress.php',
		'restrict_content' => 'restrict-content-pro/restrict-content-pro.php',
		'paid_memberships' => 'paid-memberships-pro/paid-memberships-pro.php',

		// Redirects.
		'redirection'      => 'redirection/redirection.php',

		// i18n.
		'polylang'         => 'polylang/polylang.php',
		'wpml'             => 'sitepress-multilingual-cms/sitepress.php',

		// E-commerce.
		'woocommerce'      => 'woocommerce/woocommerce.php',

		// Custom fields (V0.2.0).
		'acf'              => 'advanced-custom-fields/acf.php',
		'acf_pro'          => 'advanced-custom-fields-pro/acf.php',
		'secure_cf'        => 'secure-custom-fields/secure-custom-fields.php',
		'meta_box'         => 'meta-box/meta-box.php',
		'pods'             => 'pods/init.php',

		// Custom post types (V0.2.0).
		'cpt_ui'           => 'custom-post-type-ui/custom-post-type-ui.php',
		'jet_engine'       => 'jet-engine/jet-engine.php',
	);

	/**
	 * Cached active plugin list.
	 *
	 * @var array<string>|null
	 */
	private static $active_cache = null;

	/**
	 * Is a known plugin active?
	 *
	 * @param string $key One of self::KNOWN keys.
	 * @return bool
	 */
	public static function is_active( string $key ): bool {
		if ( ! isset( self::KNOWN[ $key ] ) ) {
			return false;
		}
		return self::is_plugin_active( self::KNOWN[ $key ] );
	}

	/**
	 * Detect SEO plugin in priority order: RankMath > Yoast.
	 *
	 * @return string 'rankmath' | 'yoast' | 'none'
	 */
	public static function get_seo_plugin(): string {
		if ( self::is_active( 'rankmath' ) || self::is_active( 'rankmath_pro' ) ) {
			return 'rankmath';
		}
		if ( self::is_active( 'yoast' ) || self::is_active( 'yoast_premium' ) ) {
			return 'yoast';
		}
		return 'none';
	}

	/**
	 * Detect form plugin(s) — multiple may coexist.
	 *
	 * @return array<string>
	 */
	public static function get_form_plugins(): array {
		$out = array();
		foreach ( array( 'wpforms', 'wpforms_pro', 'fluent_forms', 'gravity_forms', 'cf7' ) as $key ) {
			if ( self::is_active( $key ) ) {
				$out[] = $key;
			}
		}
		return $out;
	}

	/**
	 * Detect membership plugin in priority order.
	 *
	 * @return string 'memberpress' | 'restrict_content' | 'paid_memberships' | 'none'
	 */
	public static function get_membership_plugin(): string {
		foreach ( array( 'memberpress', 'restrict_content', 'paid_memberships' ) as $key ) {
			if ( self::is_active( $key ) ) {
				return $key;
			}
		}
		return 'none';
	}

	/**
	 * Detect custom fields plugin in priority order.
	 *
	 * Priority: ACF Pro > ACF > Secure Custom Fields (WP.org fork) > Meta Box > Pods.
	 *
	 * @return string 'acf_pro' | 'acf' | 'secure_cf' | 'meta_box' | 'pods' | 'none'
	 */
	public static function get_custom_fields_plugin(): string {
		foreach ( array( 'acf_pro', 'acf', 'secure_cf', 'meta_box', 'pods' ) as $key ) {
			if ( self::is_active( $key ) ) {
				return $key;
			}
		}
		return 'none';
	}

	/**
	 * Detect CPT management plugin (the one used to create CPTs in admin).
	 *
	 * @return string 'cpt_ui' | 'jet_engine' | 'pods' | 'none'
	 */
	public static function get_cpt_plugin(): string {
		foreach ( array( 'cpt_ui', 'jet_engine', 'pods' ) as $key ) {
			if ( self::is_active( $key ) ) {
				return $key;
			}
		}
		return 'none';
	}

	/**
	 * Detect i18n plugin in priority order.
	 *
	 * @return string 'wpml' | 'polylang' | 'none'
	 */
	public static function get_i18n_plugin(): string {
		if ( self::is_active( 'wpml' ) ) {
			return 'wpml';
		}
		if ( self::is_active( 'polylang' ) ) {
			return 'polylang';
		}
		return 'none';
	}

	/**
	 * Does this install have ANY custom-fields-capable plugin active?
	 *
	 * @return bool
	 */
	public static function has_custom_fields(): bool {
		return 'none' !== self::get_custom_fields_plugin();
	}

	/**
	 * Full detection report — used by REST /info endpoint and admin dashboard.
	 *
	 * @return array<string,mixed>
	 */
	public static function report(): array {
		$out = array();
		foreach ( self::KNOWN as $key => $file ) {
			$out[ $key ] = self::is_plugin_active( $file );
		}
		return array(
			'plugins'        => $out,
			'seo'            => self::get_seo_plugin(),
			'forms'          => self::get_form_plugins(),
			'membership'     => self::get_membership_plugin(),
			'custom_fields'  => self::get_custom_fields_plugin(),
			'cpt_manager'    => self::get_cpt_plugin(),
			'i18n'           => self::get_i18n_plugin(),
			'has_rankready'  => self::is_active( 'rankready' ),
		);
	}

	/**
	 * Get all KNOWN plugin keys (for iteration in admin UI).
	 *
	 * @return array<string>
	 */
	public static function known_keys(): array {
		return array_keys( self::KNOWN );
	}

	/**
	 * Wrapper around is_plugin_active that loads the plugin.php helper safely.
	 *
	 * @param string $plugin Plugin file path relative to plugins dir.
	 * @return bool
	 */
	private static function is_plugin_active( string $plugin ): bool {
		if ( null === self::$active_cache ) {
			if ( ! function_exists( 'is_plugin_active' ) ) {
				require_once ABSPATH . 'wp-admin/includes/plugin.php';
			}
			self::$active_cache = (array) get_option( 'active_plugins', array() );
		}
		if ( in_array( $plugin, self::$active_cache, true ) ) {
			return true;
		}
		if ( function_exists( 'is_plugin_active_for_network' ) && is_plugin_active_for_network( $plugin ) ) {
			return true;
		}
		return false;
	}

	/**
	 * Reset the cache (for tests / after plugin activate/deactivate).
	 *
	 * @return void
	 */
	public static function reset_cache(): void {
		self::$active_cache = null;
	}
}

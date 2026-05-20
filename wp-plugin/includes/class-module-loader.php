<?php
/**
 * Module loader — declares which Hatch classes are optional and what feature
 * flag (if any) gates them.  Core classes always load; optional ones load only
 * when the feature is enabled.
 *
 * Usage: call Hatch_Module_Loader::boot() once after all includes.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Module_Loader
 */
class Hatch_Module_Loader {

	/**
	 * Map of class → [ file, feature_flag | null ].
	 *
	 * feature_flag: option key stored in hatch_features JSON blob.
	 *   null  = always load (no gate).
	 *   'foo' = load only when the 'foo' toggle is ON in hatch_features.
	 *
	 * @var array<string, array{file: string, flag: string|null}>
	 */
	private static array $modules = array(
		// Core — always load.
		'Hatch_Detector'                  => array( 'file' => 'class-detector.php',               'flag' => null ),
		'Hatch_Security'                  => array( 'file' => 'class-security.php',                'flag' => null ),
		'Hatch_Rest_Api'                  => array( 'file' => 'class-rest-api.php',                'flag' => null ),
		'Hatch_Revalidate'                => array( 'file' => 'class-revalidate.php',              'flag' => null ),
		'Hatch_Seo_Bridge'                => array( 'file' => 'class-seo-bridge.php',              'flag' => null ),
		'Hatch_Features'                  => array( 'file' => 'class-features.php',                'flag' => null ),
		'Hatch_Design_Loader'             => array( 'file' => 'class-design-loader.php',           'flag' => null ),
		'Hatch_Integrations'              => array( 'file' => 'class-integrations.php',            'flag' => null ),
		'Hatch_Connection_Status'         => array( 'file' => 'class-connection-status.php',       'flag' => null ),
		'Hatch_Deploy_Broker'             => array( 'file' => 'class-deploy-broker.php',           'flag' => null ),
		'Hatch_Deploy_Hooks'              => array( 'file' => 'class-deploy-hooks.php',            'flag' => null ),
		'Hatch_App_Password_Helper'       => array( 'file' => 'class-app-password-helper.php',     'flag' => null ),
		'Hatch_Diagnostic'                => array( 'file' => 'class-diagnostic.php',              'flag' => null ),
		'Hatch_Domain_Check'              => array( 'file' => 'class-domain-check.php',            'flag' => null ),
		'Hatch_Cpt_Scanner'               => array( 'file' => 'class-cpt-scanner.php',             'flag' => null ),
		'Hatch_Companion_Theme_Installer' => array( 'file' => 'class-companion-theme-installer.php', 'flag' => null ),
		'Hatch_Block_Serializer'          => array( 'file' => 'class-block-serializer.php',        'flag' => null ),
		'Hatch_Blocks_Registry'           => array( 'file' => 'class-blocks-registry.php',         'flag' => null ),
		'Hatch_Blocks_Shared_Attributes'  => array( 'file' => 'class-blocks-shared-attributes.php', 'flag' => null ),
		'Hatch_Blocks_Control'            => array( 'file' => 'class-blocks-control.php',          'flag' => null ),
		'Hatch_Rankready_Bridge'          => array( 'file' => 'class-rankready-bridge.php',        'flag' => null ),
		'Hatch_Acf_Bridge'                => array( 'file' => 'class-acf-bridge.php',              'flag' => null ),
		'Hatch_Frontend_Agent'            => array( 'file' => 'class-frontend-agent.php',          'flag' => null ),
		'Hatch_Frontend_Installer_Route'  => array( 'file' => 'class-frontend-installer-route.php', 'flag' => null ),
		'Hatch_Frontend_Ssh'              => array( 'file' => 'class-frontend-ssh.php',            'flag' => null ),
		// Feature-gated — load only when the matching toggle is ON.
		'Hatch_Headless_Comments'         => array( 'file' => 'class-headless-comments.php',       'flag' => 'comments' ),
		'Hatch_Headless_Forms'            => array( 'file' => 'class-headless-forms.php',          'flag' => 'fluent_forms' ),
		'Hatch_Forms_Bridge'              => array( 'file' => 'class-forms-bridge.php',            'flag' => 'fluent_forms' ),
		'Hatch_Woocommerce_Bridge'        => array( 'file' => 'class-woocommerce-bridge.php',      'flag' => 'woocommerce' ),
		'Hatch_Login_Hardening'           => array( 'file' => 'class-login-hardening.php',         'flag' => 'login_hardening' ),
		'Hatch_Turnstile_Wp'              => array( 'file' => 'class-turnstile-wp.php',            'flag' => 'turnstile' ),
		'Hatch_Blocks_Custom_Code_Security' => array( 'file' => 'class-blocks-custom-code-security.php', 'flag' => 'custom_code_block' ),
		'Hatch_Blocks_Tailwind_Runtime'   => array( 'file' => 'class-blocks-tailwind-runtime.php', 'flag' => 'tailwind_runtime' ),
	);

	/**
	 * Boot all applicable modules.
	 *
	 * Called once from hatch.php after core constants are defined.
	 * Cached feature flags are read from the DB once — no extra HTTP calls.
	 */
	public static function boot(): void {
		$flags = self::get_feature_flags();

		foreach ( self::$modules as $class => $cfg ) {
			$file = HATCH_PLUGIN_DIR . 'includes/' . $cfg['file'];

			// Already loaded by an earlier require_once — skip.
			if ( class_exists( $class, false ) ) {
				continue;
			}

			if ( null !== $cfg['flag'] && ! self::flag_on( $flags, $cfg['flag'] ) ) {
				continue;
			}

			if ( file_exists( $file ) ) {
				require_once $file;
			}
		}
	}

	/**
	 * Check if a specific module is enabled (useful from other classes).
	 *
	 * @param string $flag Feature toggle key.
	 * @return bool
	 */
	public static function is_enabled( string $flag ): bool {
		return self::flag_on( self::get_feature_flags(), $flag );
	}

	/**
	 * Read the serialized feature flags from WP options.
	 * Returns an empty array on first activation (before any save).
	 *
	 * @return array<string, bool>
	 */
	private static function get_feature_flags(): array {
		// v0.50.14 — `hatch_features` is stored as a native PHP array by
		// `Hatch_Features::update()`, not a JSON string. The legacy decoder
		// here would fatal on every load once a save happened. Be tolerant
		// of both shapes so we don't break on rollback / partial deploys.
		$raw = get_option( 'hatch_features', '' );
		if ( is_array( $raw ) ) {
			return $raw;
		}
		if ( ! $raw ) {
			return array();
		}
		$decoded = json_decode( (string) $raw, true );
		return is_array( $decoded ) ? $decoded : array();
	}

	/**
	 * @param array<string, bool> $flags
	 * @param string              $key
	 * @return bool
	 */
	private static function flag_on( array $flags, string $key ): bool {
		return ! empty( $flags[ $key ] );
	}
}

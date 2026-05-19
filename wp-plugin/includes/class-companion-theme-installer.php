<?php
/**
 * Hatch Companion Theme installer — copies the bundled companion theme from
 * `wp-plugin/companion-theme/` into `wp-content/themes/hatch-companion/` and
 * activates it. Fires from a button in the wizard / Connector tab.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Companion_Theme_Installer {

	const ACTION = 'hatch_install_companion_theme';
	const SLUG   = 'hatch-companion';

	public static function instance(): self {
		static $i = null;
		if ( null === $i ) {
			$i = new self();
		}
		return $i;
	}

	private function __construct() {
		add_action( 'admin_post_' . self::ACTION, array( __CLASS__, 'handle' ) );
	}

	/**
	 * Is the companion theme already installed?
	 *
	 * @return bool
	 */
	public static function is_installed(): bool {
		return file_exists( get_theme_root() . '/' . self::SLUG . '/style.css' );
	}

	/**
	 * Is it active?
	 *
	 * @return bool
	 */
	public static function is_active(): bool {
		return get_stylesheet() === self::SLUG;
	}

	public static function handle(): void {
		if ( ! current_user_can( 'switch_themes' ) ) {
			wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( self::ACTION );

		$result = self::install_files();
		if ( is_wp_error( $result ) ) {
			set_transient( 'hatch_companion_install_error', $result->get_error_message(), 60 );
			wp_safe_redirect( admin_url( 'admin.php?page=hatch#connection&companion=fail' ) );
			exit;
		}

		switch_theme( self::SLUG );

		wp_safe_redirect( admin_url( 'admin.php?page=hatch#connection&companion=ok' ) );
		exit;
	}

	/**
	 * Copy the bundled companion theme into wp-content/themes/ without
	 * activating it. Safe to call multiple times (no-op if already present).
	 *
	 * @return true|WP_Error
	 */
	public static function install_files() {
		if ( self::is_installed() ) {
			return true;
		}
		$src  = HATCH_PLUGIN_DIR . 'companion-theme';
		$dest = get_theme_root() . '/' . self::SLUG;
		return self::copy_dir( $src, $dest );
	}

	/**
	 * Install (if missing) and activate the companion theme. Used by the
	 * deploy broker to flip a freshly-deployed site into headless mode.
	 *
	 * @return true|WP_Error
	 */
	public static function install_and_activate() {
		$result = self::install_files();
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		if ( ! self::is_active() ) {
			switch_theme( self::SLUG );
		}
		return true;
	}

	/**
	 * Recursive copy with WP_Filesystem.
	 *
	 * @param string $src
	 * @param string $dest
	 * @return true|WP_Error
	 */
	private static function copy_dir( string $src, string $dest ) {
		if ( ! is_dir( $src ) ) {
			return new WP_Error( 'hatch_src_missing', __( 'Companion theme source missing in plugin.', 'hatch' ) );
		}
		if ( ! file_exists( $dest ) ) {
			wp_mkdir_p( $dest );
		}
		$dir = new RecursiveIteratorIterator(
			new RecursiveDirectoryIterator( $src, RecursiveDirectoryIterator::SKIP_DOTS ),
			RecursiveIteratorIterator::SELF_FIRST
		);
		foreach ( $dir as $item ) {
			$rel    = substr( (string) $item->getPathname(), strlen( $src ) + 1 );
			$target = trailingslashit( $dest ) . $rel;
			if ( $item->isDir() ) {
				if ( ! file_exists( $target ) ) {
					wp_mkdir_p( $target );
				}
			} else {
				if ( ! @copy( $item->getPathname(), $target ) ) {
					return new WP_Error( 'hatch_copy_failed', sprintf( __( 'Could not copy %s', 'hatch' ), $rel ) );
				}
			}
		}
		return true;
	}
}

Hatch_Companion_Theme_Installer::instance();

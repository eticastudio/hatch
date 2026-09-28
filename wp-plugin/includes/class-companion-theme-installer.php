<?php
/**
 * Companion theme installer.
 *
 * Copies the bundled companion theme from the plugin's companion-theme folder
 * into wp-content/themes/hatch-companion/ and, when asked, activates it. The
 * theme keeps the WordPress side headless: it redirects public pages to the
 * frontend. Runs only from an administrator action (the Connection tab button
 * or a Cloudflare deploy) and requires the switch_themes capability.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Companion_Theme_Installer {

	const ACTION = 'hatch_install_companion_theme';
	const SLUG   = 'hatch-companion';

	const ERROR_TRANSIENT = 'hatch_companion_install_error';

	/**
	 * Option holding the stylesheet (theme folder name) that was active before
	 * the companion theme took over. Read back by the restore.
	 *
	 * Why the previous theme is restored when Hatch goes away: the companion
	 * theme has no design of its own. It redirects every public page to the
	 * frontend address saved in hatch_frontend_url and otherwise shows a
	 * noindex splash. Its redirect target is served by the Hatch REST routes, so
	 * without the plugin the site would show a blank splash or send visitors to
	 * a frontend that can no longer read its content. Leaving it active after
	 * the plugin is deactivated or deleted would take the whole public site down
	 * with it. So the theme that was live before the deploy is put back on
	 * deactivation, on uninstall and on the explicit disconnect action.
	 *
	 * Plugin updates do not run the deactivation hook (WordPress deactivates
	 * silently during an update), so an update never flips the theme.
	 */
	const OPT_PREVIOUS = 'hatch_previous_stylesheet';

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

	/**
	 * Why the last install attempt failed, as plain text. Empty when it did not fail or
	 * the note (kept for a few minutes after the attempt) has expired.
	 *
	 * @return string
	 */
	public static function last_error(): string {
		$error = get_transient( self::ERROR_TRANSIENT );
		return is_string( $error ) ? sanitize_text_field( $error ) : '';
	}

	/**
	 * State the admin screen shows for the companion theme.
	 *
	 * @return array{installed: bool, active: bool, slug: string, error: string}
	 */
	public static function status(): array {
		return array(
			'installed' => self::is_installed(),
			'active'    => self::is_active(),
			'slug'      => self::SLUG,
			'error'     => self::last_error(),
		);
	}

	public static function handle(): void {
		if ( ! current_user_can( 'switch_themes' ) ) {
			wp_die( esc_html__( 'You do not have permission to do this.', 'hatch-bridge' ), '', array( 'response' => 403 ) );
		}
		check_admin_referer( self::ACTION );

		$result = self::install_files();
		if ( is_wp_error( $result ) ) {
			set_transient( self::ERROR_TRANSIENT, $result->get_error_message(), 60 );
			wp_safe_redirect( admin_url( 'admin.php?page=hatch#connection&companion=fail' ) );
			exit;
		}

		self::remember_previous_theme();
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
		return self::copy_tree( $src, $dest );
	}

	/**
	 * Install (if missing) and activate the companion theme. Used by the
	 * deploy controller to flip a freshly deployed site into headless mode.
	 *
	 * @return true|WP_Error
	 */
	public static function install_and_activate() {
		if ( ! current_user_can( 'switch_themes' ) ) {
			$error = new WP_Error( 'hatch_forbidden', __( 'Your account cannot switch themes.', 'hatch-bridge' ) );
			set_transient( self::ERROR_TRANSIENT, $error->get_error_message(), 10 * MINUTE_IN_SECONDS );
			return $error;
		}
		$result = self::install_files();
		if ( is_wp_error( $result ) ) {
			set_transient( self::ERROR_TRANSIENT, $result->get_error_message(), 10 * MINUTE_IN_SECONDS );
			return $result;
		}
		if ( ! self::is_active() ) {
			self::remember_previous_theme();
			switch_theme( self::SLUG );
		}
		delete_transient( self::ERROR_TRANSIENT );
		return true;
	}

	/**
	 * The stylesheet to store as "previous theme", or an empty string when there
	 * is nothing worth storing. The companion theme is never stored as its own
	 * predecessor, otherwise a second deploy would overwrite the real theme name.
	 *
	 * @param string $active    Stylesheet active right now.
	 * @param string $companion Stylesheet of the companion theme.
	 * @return string
	 */
	public static function stylesheet_to_remember( string $active, string $companion ): string {
		if ( '' === $active || $active === $companion ) {
			return '';
		}
		return $active;
	}

	/**
	 * The stylesheet to switch back to, or an empty string to leave the theme alone.
	 *
	 * Nothing happens unless the companion theme is the active one: if the owner
	 * picked another theme since the deploy, that choice wins. The stored theme is
	 * used when it still exists, otherwise the newest default theme WordPress ships,
	 * so the site is never left on a theme that is gone.
	 *
	 * @param string $stored        Value of the hatch_previous_stylesheet option.
	 * @param string $active        Stylesheet active right now.
	 * @param string $companion     Stylesheet of the companion theme.
	 * @param bool   $stored_exists Whether the stored theme is still installed.
	 * @param string $fallback      Stylesheet of a default theme to fall back on, or empty.
	 * @return string
	 */
	public static function restore_target( string $stored, string $active, string $companion, bool $stored_exists, string $fallback ): string {
		if ( $active !== $companion ) {
			return '';
		}
		if ( '' !== $stored && $stored !== $companion && $stored_exists ) {
			return $stored;
		}
		if ( '' !== $fallback && $fallback !== $companion ) {
			return $fallback;
		}
		return '';
	}

	/**
	 * Save the active theme before the companion theme replaces it.
	 *
	 * @return void
	 */
	public static function remember_previous_theme(): void {
		$previous = self::stylesheet_to_remember( get_stylesheet(), self::SLUG );
		if ( '' !== $previous ) {
			update_option( self::OPT_PREVIOUS, $previous, false );
		}
	}

	/**
	 * Put the previous theme back, then forget it.
	 *
	 * @return string Stylesheet that was switched to, or an empty string when the theme was left alone.
	 */
	public static function restore_previous_theme(): string {
		$stored   = get_option( self::OPT_PREVIOUS, '' );
		$stored   = is_string( $stored ) ? $stored : '';
		$fallback = '';
		if ( class_exists( 'WP_Theme' ) ) {
			$default = WP_Theme::get_core_default_theme();
			if ( $default instanceof WP_Theme ) {
				$fallback = $default->get_stylesheet();
			}
		}
		$target = self::restore_target(
			$stored,
			get_stylesheet(),
			self::SLUG,
			'' !== $stored && wp_get_theme( $stored )->exists(),
			$fallback
		);
		if ( '' !== $target ) {
			switch_theme( $target );
		}
		delete_option( self::OPT_PREVIOUS );
		return $target;
	}

	/**
	 * Deactivation hook: restore the previous theme on this site, or on every
	 * site of the network when the plugin was network-deactivated.
	 *
	 * @param bool $network_wide Whether the plugin was deactivated network-wide.
	 * @return void
	 */
	public static function restore_on_deactivate( $network_wide = false ): void {
		if ( $network_wide && is_multisite() ) {
			foreach ( get_sites(
				array(
					'number' => 0,
					'fields' => 'ids',
				)
			) as $blog_id ) {
				switch_to_blog( (int) $blog_id );
				self::restore_previous_theme();
				restore_current_blog();
			}
			return;
		}
		self::restore_previous_theme();
	}

	/**
	 * Copy a directory tree with the WordPress filesystem API.
	 *
	 * @param string $src  Source directory.
	 * @param string $dest Destination directory.
	 * @return true|WP_Error
	 */
	private static function copy_tree( string $src, string $dest ) {
		if ( ! is_dir( $src ) ) {
			return new WP_Error( 'hatch_src_missing', __( 'The companion theme is missing from the plugin files.', 'hatch-bridge' ) );
		}

		require_once ABSPATH . 'wp-admin/includes/file.php';
		if ( ! WP_Filesystem() ) {
			return new WP_Error(
				'hatch_fs_unavailable',
				__( 'WordPress cannot write to the themes folder on this server without FTP credentials. Copy the companion-theme folder from the plugin into wp-content/themes/hatch-companion by hand.', 'hatch-bridge' )
			);
		}

		if ( ! wp_mkdir_p( $dest ) ) {
			return new WP_Error( 'hatch_mkdir_failed', __( 'Could not create the companion theme folder.', 'hatch-bridge' ) );
		}
		$copied = copy_dir( $src, $dest );
		if ( is_wp_error( $copied ) ) {
			return new WP_Error(
				'hatch_copy_failed',
				sprintf(
					/* translators: %s: filesystem error message. */
					__( 'Could not copy the companion theme: %s', 'hatch-bridge' ),
					wp_strip_all_tags( $copied->get_error_message() )
				)
			);
		}
		return true;
	}
}

Hatch_Companion_Theme_Installer::instance();

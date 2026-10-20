<?php
/**
 * Lifecycle of the optional URL rewriter mu-plugin (hatch-url-rewrite.php).
 *
 * What the file is: a small helper that swaps a stale WordPress address in media
 * and permalink URLs (localhost, a docker host, an expired trycloudflare tunnel)
 * for the address of the connected frontend. The plugin's own Hatch_Media_Rewriter
 * covers the normal production case, so the helper is only worth having on a
 * site whose own address is one of those stale hosts.
 *
 * Who owns it: this class. Hatch writes the file, and Hatch removes it again.
 *
 *   Activate     the file is created only when it is needed (see is_needed()).
 *   Settings     it follows the connection: a frontend is saved or removed,
 *   change       the file is added or removed with it. A newer bundled copy
 *                replaces an older Hatch-written copy.
 *   Deactivate   the file is removed, unless a different site of the same
 *                multisite network still needs it.
 *   Uninstall    the file is removed.
 *
 * Safety rules:
 *   - A file is only ever removed or overwritten when it is recognisably Hatch's:
 *     it carries the marker header, or it is byte-identical to one of the three
 *     copies earlier Hatch releases wrote. A file of the same name that anyone
 *     else wrote is left exactly as it is.
 *   - The file also switches itself off whenever the Hatch plugin is not loaded
 *     (see the file's own boot function), so a copy that could not be deleted
 *     does nothing.
 *   - Everything fails soft. A missing or read-only mu-plugins folder never
 *     raises an error; the admin sees a notice with the exact manual step.
 *   - Writes go through WP_Filesystem and only when WordPress can write directly
 *     (no FTP credentials prompt). Otherwise the manual step is shown.
 *
 * Credential policy: deactivating Hatch keeps the user name and encrypted
 * application password the deployed frontend uses, so reactivating Hatch does not
 * break it. Hatch never created that user or password. Disconnect and uninstall
 * forget the stored copy; the administrator revokes the password in the profile.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Mu_Plugin {

	/** File name inside the mu-plugins folder. */
	const FILE = 'hatch-url-rewrite.php';

	/** Header line that marks a copy as written by Hatch. */
	const MARKER = 'Hatch-Managed: url-rewriter';

	/** How far into the file the marker may appear. */
	const MARKER_WINDOW = 2048;

	/** Where the last failure is remembered so a notice can explain it. */
	const OPT_ISSUE = 'hatch_mu_issue';

	/** How many sites a multisite scan inspects before it gives up and keeps the file. */
	const MULTISITE_SCAN_LIMIT = 100;

	/**
	 * md5 of the copies Hatch 0.4.x to 0.8.0 wrote before the file carried a marker.
	 *
	 * @var string[]
	 */
	const LEGACY_HASHES = array(
		'8e22fd1643eff9f587e29ce22a6a85eb',
		'08dfd074c61cf53b166b6412bd77893b',
		'8de8877144efbc2d21fea4572f514fb5',
	);

	/**
	 * Hooks that keep the file in step with the connection and show failures.
	 *
	 * @return void
	 */
	public static function boot(): void {
		add_action( 'admin_init', array( __CLASS__, 'on_admin_init' ) );
		add_action( 'admin_notices', array( __CLASS__, 'render_notice' ) );
		add_action( 'add_option_hatch_frontend_url', array( __CLASS__, 'on_connection_changed' ) );
		add_action( 'update_option_hatch_frontend_url', array( __CLASS__, 'on_connection_changed' ) );
		add_action( 'deleted_option', array( __CLASS__, 'on_deleted_option' ) );
	}

	/**
	 * Activation hook.
	 *
	 * @return void
	 */
	public static function on_activate(): void {
		self::reconcile();
	}

	/**
	 * Deactivation hook. Plugin updates deactivate silently and do not reach this
	 * hook, which is intended: the file is kept across an update and brought up to
	 * date by reconcile() once the plugin is back.
	 *
	 * @param bool $network_wide Whether the plugin was deactivated network-wide.
	 * @return void
	 */
	public static function on_deactivate( $network_wide = false ): void {
		if ( is_multisite() && ! $network_wide && self::other_sites_need_it( get_current_blog_id() ) ) {
			return;
		}
		$result = self::remove();
		if ( is_wp_error( $result ) && 'hatch_mu_foreign' !== $result->get_error_code() ) {
			// Plugin code is about to go quiet; the file itself explains a leftover copy.
			self::remember_issue( 'remove', $result->get_error_code() );
		}
	}

	/**
	 * Option deletion hook, narrowed to the connection option.
	 *
	 * @param string $option Option name.
	 * @return void
	 */
	public static function on_deleted_option( $option ): void {
		if ( 'hatch_frontend_url' === $option ) {
			self::reconcile();
		}
	}

	/**
	 * Dashboard entry point. Only an administrator's request may write the file, so a
	 * signed-out call to admin-ajax.php or admin-post.php never reaches the filesystem.
	 *
	 * @return void
	 */
	public static function on_admin_init(): void {
		if ( current_user_can( 'manage_options' ) ) {
			self::reconcile();
		}
	}

	/**
	 * Hook entry point that ignores the arguments WordPress passes to option and
	 * admin_init hooks, so none of them can be mistaken for a filesystem object.
	 *
	 * @return void
	 */
	public static function on_connection_changed(): void {
		self::reconcile();
	}

	/**
	 * Bring the file in line with what the site needs right now. Cheap when nothing
	 * has to change: one option read and one file stat.
	 *
	 * @param object|null $fs Optional filesystem object (tests). Defaults to WP_Filesystem.
	 * @return void
	 */
	public static function reconcile( $fs = null ): void {
		$state = self::inspect( $fs );
		if ( 'foreign' === $state ) {
			self::clear_issue();
			return;
		}

		if ( self::should_exist() ) {
			if ( 'current' === $state ) {
				self::clear_issue();
				return;
			}
			$result = self::install( $fs );
			$action = 'absent' === $state ? 'install' : 'update';
		} else {
			if ( 'absent' === $state ) {
				self::clear_issue();
				return;
			}
			$result = self::remove( $fs );
			$action = 'remove';
		}

		if ( is_wp_error( $result ) && 'hatch_mu_foreign' !== $result->get_error_code() ) {
			self::remember_issue( $action, $result->get_error_code() );
			return;
		}
		self::clear_issue();
	}

	/**
	 * Does this site, or on a network any other site running Hatch, need the file?
	 *
	 * @return bool
	 */
	public static function should_exist(): bool {
		if ( self::is_needed() ) {
			return true;
		}
		return is_multisite() && self::other_sites_need_it( get_current_blog_id() );
	}

	/**
	 * Is the helper needed on the current site?
	 *
	 * It is needed when a public frontend is connected AND the site's own address is
	 * a host that cannot be reached from outside. On a normal public domain
	 * WordPress already emits correct URLs and Hatch_Media_Rewriter covers the rest,
	 * so installing the helper there would only be clutter.
	 *
	 * The hatch_url_rewriter_needed filter lets a host or a developer override the
	 * answer in either direction.
	 *
	 * @return bool
	 */
	public static function is_needed(): bool {
		$frontend = self::frontend_url();
		// The options, not home_url(): other code may filter home_url() to the
		// frontend, which would hide the site's real address.
		$needed = self::decide_needed( $frontend, (string) get_option( 'home', '' ), (string) get_option( 'siteurl', '' ) );

		/**
		 * Filters whether the Hatch URL rewriter mu-plugin should be present.
		 *
		 * @param bool   $needed   Whether the helper is needed.
		 * @param string $frontend The connected frontend URL, empty when none.
		 */
		return (bool) apply_filters( 'hatch_url_rewriter_needed', $needed, $frontend );
	}

	/**
	 * The decision, free of WordPress state so it can be tested on its own.
	 *
	 * @param string $frontend Connected frontend URL, may be empty.
	 * @param string $home     Value of home_url().
	 * @param string $site     Value of site_url().
	 * @return bool
	 */
	public static function decide_needed( string $frontend, string $home, string $site ): bool {
		$frontend_host = self::host_of( $frontend );
		if ( '' === $frontend_host ) {
			return false;
		}
		// The helper refuses a frontend that is itself private (it would only swap one
		// unreachable address for another), so there is nothing for it to do.
		if ( self::is_private_host( $frontend_host ) ) {
			return false;
		}
		return self::is_stale_host( self::host_of( $home ) ) || self::is_stale_host( self::host_of( $site ) );
	}

	/**
	 * Hosts the helper rewrites away from: local machines and expired tunnels.
	 *
	 * @param string $host Lower-case host name, no port.
	 * @return bool
	 */
	public static function is_stale_host( string $host ): bool {
		if ( '' === $host ) {
			return false;
		}
		if ( self::is_private_host( $host ) ) {
			return true;
		}
		return '.trycloudflare.com' === substr( $host, -18 ); // phpcs:ignore PluginCheck.CodeAnalysis.Offloading.OffloadedContent -- Host-name comparison for temporary tunnels, nothing is loaded.
	}

	/**
	 * Local-only hosts, which can never be a usable public frontend.
	 *
	 * @param string $host Lower-case host name, no port.
	 * @return bool
	 */
	public static function is_private_host( string $host ): bool {
		return in_array( $host, array( 'localhost', '127.0.0.1', 'host.docker.internal' ), true );
	}

	/**
	 * Lower-case host of a URL, empty when there is none.
	 *
	 * @param string $url URL.
	 * @return string
	 */
	public static function host_of( string $url ): string {
		$host = wp_parse_url( trim( $url ), PHP_URL_HOST );
		return is_string( $host ) ? strtolower( $host ) : '';
	}

	/**
	 * Is this file content something Hatch wrote?
	 *
	 * @param string $contents Whole file content.
	 * @return bool
	 */
	public static function is_managed_contents( string $contents ): bool {
		if ( false !== strpos( substr( $contents, 0, self::MARKER_WINDOW ), self::MARKER ) ) {
			return true;
		}
		return in_array( md5( $contents ), self::LEGACY_HASHES, true );
	}

	/**
	 * Classify what is in the mu-plugins folder.
	 *
	 * @param bool        $exists      Whether a file of that name exists.
	 * @param string|null $md5         md5 of that file, null when unreadable.
	 * @param string      $source_md5  md5 of the bundled copy.
	 * @param string|null $contents    Content of the file, only needed when the md5 matches nothing known.
	 * @return string One of absent, current, managed (Hatch-written, out of date), foreign.
	 */
	public static function classify( bool $exists, ?string $md5, string $source_md5, ?string $contents ): string {
		if ( ! $exists ) {
			return 'absent';
		}
		if ( null !== $md5 && $md5 === $source_md5 ) {
			return 'current';
		}
		if ( null !== $md5 && in_array( $md5, self::LEGACY_HASHES, true ) ) {
			return 'managed';
		}
		if ( null !== $contents && self::is_managed_contents( $contents ) ) {
			return 'managed';
		}
		return 'foreign';
	}

	/**
	 * Look at the file on disk.
	 *
	 * @param object|null $fs Optional filesystem object.
	 * @return string absent, current, managed or foreign.
	 */
	public static function inspect( $fs = null ): string {
		$target = self::target_path();
		if ( ! file_exists( $target ) ) {
			return 'absent';
		}
		$md5        = is_readable( $target ) ? md5_file( $target ) : false;
		$source_md5 = is_readable( self::source_path() ) ? md5_file( self::source_path() ) : false;
		$md5        = false === $md5 ? null : $md5;
		$source_md5 = false === $source_md5 ? '' : $source_md5;

		$state = self::classify( true, $md5, $source_md5, null );
		if ( 'foreign' !== $state ) {
			return $state;
		}
		// Not byte-identical to anything known: read it to look for the marker.
		$fs = $fs ? $fs : self::filesystem();
		if ( is_wp_error( $fs ) ) {
			return 'foreign';
		}
		$contents = $fs->get_contents( $target );
		return self::classify( true, $md5, $source_md5, is_string( $contents ) ? $contents : null );
	}

	/**
	 * Write the bundled helper into the mu-plugins folder.
	 *
	 * @param object|null $fs Optional filesystem object (tests). Defaults to WP_Filesystem.
	 * @return true|WP_Error WP_Error code hatch_mu_foreign means a file that is not Hatch's is in the way and was left alone.
	 */
	public static function install( $fs = null ) {
		// DISALLOW_FILE_MODS (or a filter on file_mod_allowed) says nothing on this site may change files from the dashboard.
		if ( ! wp_is_file_mod_allowed( 'hatch_install_mu_plugin' ) ) {
			return new WP_Error( 'hatch_mu_file_mods_disabled', __( 'File changes are turned off on this site, so Hatch did not write the URL helper.', 'hatch-connect' ) );
		}
		$fs = $fs ? $fs : self::filesystem();
		if ( is_wp_error( $fs ) ) {
			return $fs;
		}
		$source = $fs->get_contents( self::source_path() );
		if ( ! is_string( $source ) || '' === $source ) {
			return new WP_Error( 'hatch_mu_source_missing', __( 'The bundled URL helper file is missing from the Hatch plugin folder.', 'hatch-connect' ) );
		}

		$dir    = self::dir();
		$target = self::target_path();

		if ( $fs->exists( $target ) ) {
			$existing = $fs->get_contents( $target );
			if ( ! is_string( $existing ) || ! self::is_managed_contents( $existing ) ) {
				return new WP_Error( 'hatch_mu_foreign', __( 'A file with that name already exists and was not written by Hatch, so Hatch left it alone.', 'hatch-connect' ) );
			}
		}

		if ( ! $fs->is_dir( $dir ) && ! $fs->mkdir( $dir, defined( 'FS_CHMOD_DIR' ) ? FS_CHMOD_DIR : false ) ) {
			return new WP_Error( 'hatch_mu_dir_missing', __( 'The mu-plugins folder does not exist and could not be created.', 'hatch-connect' ) );
		}

		// Write beside the target and move into place so a request that loads
		// mu-plugins halfway through never sees a truncated PHP file.
		$temp = $target . '.tmp';
		if ( ! $fs->put_contents( $temp, $source, defined( 'FS_CHMOD_FILE' ) ? FS_CHMOD_FILE : false ) ) {
			return new WP_Error( 'hatch_mu_not_writable', __( 'The mu-plugins folder is not writable.', 'hatch-connect' ) );
		}
		if ( ! $fs->move( $temp, $target, true ) ) {
			$fs->delete( $temp );
			return new WP_Error( 'hatch_mu_not_writable', __( 'The mu-plugins folder is not writable.', 'hatch-connect' ) );
		}
		return true;
	}

	/**
	 * Remove the helper, but only when Hatch wrote it.
	 *
	 * @param object|null $fs Optional filesystem object (tests). Defaults to WP_Filesystem.
	 * @return true|WP_Error True when the file is gone (or was never there). hatch_mu_foreign means it is not Hatch's and was left alone.
	 */
	public static function remove( $fs = null ) {
		$target = self::target_path();
		$fs     = $fs ? $fs : self::filesystem();
		if ( is_wp_error( $fs ) ) {
			// Nothing to do when there is no file, whatever the filesystem situation.
			return file_exists( $target ) ? $fs : true;
		}
		if ( ! $fs->exists( $target ) ) {
			return true;
		}
		$contents = $fs->get_contents( $target );
		if ( ! is_string( $contents ) || ! self::is_managed_contents( $contents ) ) {
			return new WP_Error( 'hatch_mu_foreign', __( 'A file with that name exists but was not written by Hatch, so Hatch left it alone.', 'hatch-connect' ) );
		}
		if ( ! $fs->delete( $target ) ) {
			return new WP_Error( 'hatch_mu_not_writable', __( 'The mu-plugins folder is not writable.', 'hatch-connect' ) );
		}
		return true;
	}

	/**
	 * Uninstall path: remove the helper. The plugin is being deleted, so no site can
	 * still need it. The saved failure note is a per-site option and is deleted
	 * with the other options by uninstall.php.
	 *
	 * @return void
	 */
	public static function remove_for_uninstall(): void {
		self::remove();
	}

	/**
	 * On a network the mu-plugins folder is shared. Does another site still run
	 * Hatch with a connection that needs the helper?
	 *
	 * When the network is larger than the scan limit the answer is "yes", so the
	 * file is kept: a leftover inert file is better than breaking someone's media.
	 *
	 * @param int $current_blog_id Site being deactivated or reconciled, excluded from the scan.
	 * @return bool
	 */
	public static function other_sites_need_it( int $current_blog_id ): bool {
		if ( ! is_multisite() ) {
			return false;
		}
		$ids = get_sites(
			array(
				'fields' => 'ids',
				'number' => self::MULTISITE_SCAN_LIMIT + 1,
			)
		);
		if ( count( $ids ) > self::MULTISITE_SCAN_LIMIT ) {
			return true;
		}
		$basename = plugin_basename( HATCH_PLUGIN_FILE );
		foreach ( $ids as $blog_id ) {
			if ( (int) $blog_id === $current_blog_id ) {
				continue;
			}
			switch_to_blog( (int) $blog_id );
			$active = in_array( $basename, (array) get_option( 'active_plugins', array() ), true )
				|| array_key_exists( $basename, (array) get_site_option( 'active_sitewide_plugins', array() ) );
			$needed = $active && self::is_needed();
			restore_current_blog();
			if ( $needed ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Admin notice for a failed write, with the exact manual step.
	 *
	 * @return void
	 */
	public static function render_notice(): void {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}
		$issue = get_option( self::OPT_ISSUE, array() );
		if ( ! is_array( $issue ) || empty( $issue['action'] ) || empty( $issue['code'] ) ) {
			return;
		}
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		$shown  = array( 'plugins' );
		if ( ! $screen || ( ! in_array( $screen->id, $shown, true ) && false === strpos( $screen->id, 'hatch' ) ) ) {
			return;
		}

		$target = self::target_path();
		$source = self::source_path();
		?>
		<div class="notice notice-warning is-dismissible">
			<p><strong><?php esc_html_e( 'Hatch could not manage its optional URL helper file.', 'hatch-connect' ); ?></strong></p>
			<p>
				<?php if ( 'remove' === $issue['action'] ) : ?>
					<?php
					echo wp_kses(
						sprintf(
							/* translators: %s: full path of the file to delete. */
							__( 'Your site works normally. To clean up, delete this file by hand: %s', 'hatch-connect' ),
							'<code>' . esc_html( $target ) . '</code>'
						),
						array( 'code' => array() )
					);
					?>
				<?php else : ?>
					<?php
					echo wp_kses(
						sprintf(
							/* translators: 1: path of the bundled file, 2: path of the mu-plugins folder. */
							__( 'Your site works normally. The helper only matters when WordPress runs on a local or temporary address. To add it, copy %1$s into %2$s by hand, or ignore this message.', 'hatch-connect' ),
							'<code>' . esc_html( $source ) . '</code>',
							'<code>' . esc_html( self::dir() ) . '</code>'
						),
						array( 'code' => array() )
					);
					?>
				<?php endif; ?>
			</p>
		</div>
		<?php
	}

	/**
	 * Full path of the mu-plugins folder.
	 *
	 * @return string
	 */
	public static function dir(): string {
		return defined( 'WPMU_PLUGIN_DIR' ) ? (string) constant( 'WPMU_PLUGIN_DIR' ) : WP_CONTENT_DIR . '/mu-plugins';
	}

	/**
	 * Full path of the helper inside the mu-plugins folder.
	 *
	 * @return string
	 */
	public static function target_path(): string {
		return trailingslashit( self::dir() ) . self::FILE;
	}

	/**
	 * Full path of the bundled copy.
	 *
	 * @return string
	 */
	public static function source_path(): string {
		return HATCH_PLUGIN_DIR . 'optional-mu-plugin/' . self::FILE;
	}

	/**
	 * The frontend address, resolved the same way the helper itself resolves it:
	 * the saved option, then the HATCH_PUBLIC_HOST environment variable, then the
	 * constant of the same name.
	 *
	 * @return string
	 */
	private static function frontend_url(): string {
		$url = trim( (string) get_option( 'hatch_frontend_url', '' ) );
		if ( '' === $url ) {
			$url = (string) getenv( 'HATCH_PUBLIC_HOST' );
		}
		if ( '' === $url && defined( 'HATCH_PUBLIC_HOST' ) ) {
			$url = (string) constant( 'HATCH_PUBLIC_HOST' );
		}
		return trim( $url );
	}

	/**
	 * A WordPress filesystem object that writes directly, or an error.
	 *
	 * Only the direct method is used. When WordPress would have to ask for FTP
	 * credentials the write is skipped and the admin gets the manual step, which is
	 * safer than a credentials form appearing inside a background request.
	 *
	 * @return object|WP_Error
	 */
	private static function filesystem() {
		global $wp_filesystem;
		if ( ! function_exists( 'WP_Filesystem' ) ) {
			require_once ABSPATH . 'wp-admin/includes/file.php';
		}
		if ( 'direct' !== get_filesystem_method() || ! WP_Filesystem() || ! is_object( $wp_filesystem ) ) {
			return new WP_Error( 'hatch_mu_fs_unavailable', __( 'WordPress cannot write to the mu-plugins folder directly on this server.', 'hatch-connect' ) );
		}
		return $wp_filesystem;
	}

	/**
	 * Remember a failure so the notice can explain it. Skips the write when the note is unchanged.
	 *
	 * @param string $action install, update or remove.
	 * @param string $code   Error code of the failure.
	 * @return void
	 */
	private static function remember_issue( string $action, string $code ): void {
		$issue = array(
			'action' => $action,
			'code'   => $code,
		);
		if ( get_option( self::OPT_ISSUE, array() ) !== $issue ) {
			update_option( self::OPT_ISSUE, $issue, false );
		}
	}

	/**
	 * Forget a failure that no longer applies.
	 *
	 * @return void
	 */
	private static function clear_issue(): void {
		if ( false !== get_option( self::OPT_ISSUE, false ) ) {
			delete_option( self::OPT_ISSUE );
		}
	}
}

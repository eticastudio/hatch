<?php
/**
 * Hatch Options REST — admin-authenticated CRUD for plugin settings.
 *
 *   GET    /hatch/v1/options              → all whitelisted Hatch options
 *   POST   /hatch/v1/options              → update one or more options
 *
 * Whitelist approach (no arbitrary update_option) — each key has an explicit
 * sanitize callback. Means an Admin app password is enough to drive the
 * plugin remotely: no more "download zip, upload, activate, click around".
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Options_Rest {

	/**
	 * key => sanitize callable
	 */
	private static function schema(): array {
		return array(
			'hatch_image_proxy_url'          => 'esc_url_raw',
			'hatch_revalidate_endpoint'      => 'esc_url_raw',
			'hatch_frontend_url'             => 'esc_url_raw',
			'hatch_security_harden_rest'     => 'rest_sanitize_boolean',
			'hatch_security_disable_xmlrpc'  => 'rest_sanitize_boolean',
			'hatch_security_block_user_enum' => 'rest_sanitize_boolean',
			'hatch_security_force_noindex'   => 'rest_sanitize_boolean',
			'hatch_revalidate_post_types'    => 'sanitize_text_field',
			'hatch_menu_primary_id'          => 'absint',
			'hatch_menu_footer_id'           => 'absint',
		);
	}

	public static function register_routes(): void {
		// v0.50.11 — /options was a legacy whitelist-based handler (10 keys).
		// Superseded by hatch_react_options_save() in admin/dashboard.php which
		// handles the React dispatcher's dot-path schema with the full key set.
		// Registering both at the same priority shadowed the new handler and
		// silently dropped every option not in the legacy whitelist. Removed.

		register_rest_route( HATCH_REST_NAMESPACE, '/self-update', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( __CLASS__, 'route_self_update' ),
			'permission_callback' => array( __CLASS__, 'require_admin' ),
		) );

		register_rest_route( HATCH_REST_NAMESPACE, '/version', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'route_version' ),
			'permission_callback' => array( __CLASS__, 'require_admin' ),
		) );

		// v0.45 — soft "redeploy" / "refresh" affordance. Pings the revalidate
		// webhook if set; otherwise just returns ok after a short delay so the
		// admin gets visible feedback (spinner → tick) even when no webhook
		// is configured. Edge cache TTL is 60s anyway — content propagates.
		register_rest_route( HATCH_REST_NAMESPACE, '/refresh-cache', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( __CLASS__, 'route_refresh_cache' ),
			'permission_callback' => array( __CLASS__, 'require_admin' ),
		) );
	}

	public static function require_admin(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * GET — return all whitelisted options + their current values.
	 */
	public static function route_get(): WP_REST_Response {
		$out = array();
		foreach ( array_keys( self::schema() ) as $key ) {
			$out[ $key ] = get_option( $key, '' );
		}
		return new WP_REST_Response( $out, 200 );
	}

	/**
	 * POST — accept JSON body { "hatch_xxx": value, ... } and update each
	 * whitelisted key through its sanitize callback.
	 */
	public static function route_post( WP_REST_Request $req ) {
		$body = $req->get_json_params();
		if ( ! is_array( $body ) ) {
			return new WP_Error( 'hatch_bad_body', __( 'JSON object expected.', 'hatch' ), array( 'status' => 400 ) );
		}

		$schema  = self::schema();
		$updated = array();
		$ignored = array();

		foreach ( $body as $key => $value ) {
			if ( ! isset( $schema[ $key ] ) ) {
				$ignored[] = $key;
				continue;
			}
			$sanitized = call_user_func( $schema[ $key ], $value );
			update_option( $key, $sanitized );
			$updated[ $key ] = $sanitized;
		}

		return new WP_REST_Response( array(
			'ok'      => true,
			'updated' => $updated,
			'ignored' => $ignored,
		), 200 );
	}

	/**
	 * POST — pings the revalidate webhook (if set) to purge edge cache.
	 * No webhook configured → returns ok anyway after a short pause so the
	 * admin UI gets visible feedback. Content always propagates within the
	 * 60s edge cache TTL.
	 */
	public static function route_refresh_cache() {
		$endpoint = trim( (string) get_option( 'hatch_revalidate_endpoint', '' ) );
		$secret   = (string) get_option( 'hatch_webhook_secret', '' );
		$pinged   = false;
		$status   = 0;

		if ( '' !== $endpoint ) {
			$url = $secret ? add_query_arg( 'secret', rawurlencode( $secret ), $endpoint ) : $endpoint;
			$res = wp_remote_post( $url, array(
				'timeout'  => 6,
				'blocking' => true,
				'headers'  => array(
					'Content-Type'   => 'application/json',
					'X-Hatch-Test'   => '1',
					'X-Hatch-Action' => 'refresh-cache',
				),
				'body'     => wp_json_encode( array( 'event' => 'hatch_refresh', 'ts' => time() ) ),
			) );
			if ( ! is_wp_error( $res ) ) {
				$pinged = true;
				$status = (int) wp_remote_retrieve_response_code( $res );
			}
		}

		return new WP_REST_Response( array(
			'ok'         => true,
			'pinged'     => $pinged,
			'status'     => $status,
			'has_webhook' => '' !== $endpoint,
			'message'    => $pinged
				? __( 'Edge cache refresh signal sent. Live content within seconds.', 'hatch' )
				: __( 'No revalidate webhook configured — content still propagates within the 60s TTL.', 'hatch' ),
		), 200 );
	}

	/**
	 * GET — version + latest available from GitHub.
	 */
	public static function route_version() {
		$current = HATCH_VERSION;
		$latest  = '';
		$err     = '';

		$res = wp_remote_get( 'https://api.github.com/repos/adityaarsharma/hatch/releases/latest', array(
			'timeout' => 10,
			'headers' => array( 'User-Agent' => 'Hatch/' . HATCH_VERSION ),
		) );
		if ( is_wp_error( $res ) ) {
			$err = $res->get_error_message();
		} else {
			$code = wp_remote_retrieve_response_code( $res );
			if ( 200 === (int) $code ) {
				$data   = json_decode( wp_remote_retrieve_body( $res ), true );
				$latest = isset( $data['tag_name'] ) ? ltrim( (string) $data['tag_name'], 'v' ) : '';
			} else {
				$err = 'GitHub API HTTP ' . $code;
			}
		}

		return new WP_REST_Response( array(
			'current'           => $current,
			'latest'            => $latest,
			'update_available'  => $latest && version_compare( $current, $latest, '<' ),
			'github_error'      => $err,
		), 200 );
	}

	/**
	 * POST — download the latest hatch.zip from GitHub raw and replace the
	 * current plugin files in-place. Admin-only. Returns the result of the
	 * download + extract + copy steps.
	 *
	 * Strategy:
	 *   1. Download https://raw.githubusercontent.com/adityaarsharma/hatch/main/hatch.zip
	 *   2. Extract to a temp directory using WP_Filesystem
	 *   3. Locate the wp-plugin/ folder inside the zip
	 *   4. copy_dir() it on top of HATCH_PLUGIN_DIR (in place upgrade)
	 *   5. Clean up the temp dir
	 *
	 * Note: WP_Filesystem may demand FTP creds on some hosts. On modern
	 * hosting (TasteWP, Cloudways, RunCloud, most VPS), it falls back to
	 * direct PHP filesystem access and just works.
	 */
	public static function route_self_update() {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/misc.php';

		// Initialize WP_Filesystem in direct mode (no FTP prompts).
		add_filter( 'filesystem_method', static function () { return 'direct'; } );
		WP_Filesystem();
		global $wp_filesystem;
		if ( ! $wp_filesystem ) {
			return new WP_Error( 'hatch_fs_unavailable', __( 'WP_Filesystem could not initialize. The host may require FTP credentials.', 'hatch' ), array( 'status' => 500 ) );
		}

		$zip_url = 'https://raw.githubusercontent.com/adityaarsharma/hatch/main/hatch.zip?_=' . time();
		$tmp_zip = download_url( $zip_url, 45 );
		if ( is_wp_error( $tmp_zip ) ) {
			return new WP_Error( 'hatch_download_failed', $tmp_zip->get_error_message(), array( 'status' => 502 ) );
		}

		$extract_root = trailingslashit( get_temp_dir() ) . 'hatch-update-' . time();
		wp_mkdir_p( $extract_root );

		$unzip = unzip_file( $tmp_zip, $extract_root );
		@unlink( $tmp_zip );

		if ( is_wp_error( $unzip ) ) {
			$wp_filesystem->delete( $extract_root, true );
			return new WP_Error( 'hatch_unzip_failed', $unzip->get_error_message(), array( 'status' => 500 ) );
		}

		// The zip is built with `zip -r hatch.zip wp-plugin/` so the source is
		// $extract_root/wp-plugin/. Verify before copy.
		$source = trailingslashit( $extract_root ) . 'wp-plugin';
		if ( ! $wp_filesystem->is_dir( $source ) ) {
			$wp_filesystem->delete( $extract_root, true );
			return new WP_Error( 'hatch_no_source', __( 'Expected wp-plugin/ folder not found inside zip.', 'hatch' ), array( 'status' => 500 ) );
		}

		// In-place overwrite of the existing plugin directory.
		$dest = untrailingslashit( HATCH_PLUGIN_DIR );
		$copy = copy_dir( $source, $dest );
		$wp_filesystem->delete( $extract_root, true );

		if ( is_wp_error( $copy ) ) {
			return new WP_Error( 'hatch_copy_failed', $copy->get_error_message(), array( 'status' => 500 ) );
		}

		// Bust the WP cache for plugin metadata so the new version registers.
		if ( function_exists( 'wp_clean_plugins_cache' ) ) {
			wp_clean_plugins_cache();
		}

		// v0.40 — also refresh the installed companion theme. The theme lives
		// at wp-content/themes/hatch-companion/ (separate from the plugin dir)
		// so plugin updates don't touch it. We re-copy from the freshly
		// extracted plugin files. Critical when the theme has a bug fix —
		// e.g. v0.40's home_url filter fix that was preventing Gutenberg saves.
		$theme_src   = $dest . '/companion-theme';
		$theme_dest  = get_theme_root() . '/hatch-companion';
		$theme_synced = false;
		if ( $wp_filesystem->is_dir( $theme_src ) && $wp_filesystem->is_dir( $theme_dest ) ) {
			$theme_copy = copy_dir( $theme_src, $theme_dest );
			$theme_synced = ! is_wp_error( $theme_copy );
		}

		// Re-read the just-installed main file to report the new version.
		$plugin_file = $dest . '/hatch.php';
		$new_version = HATCH_VERSION; // current load is still old code
		if ( file_exists( $plugin_file ) && function_exists( 'get_plugin_data' ) ) {
			$pd = get_plugin_data( $plugin_file, false, false );
			if ( ! empty( $pd['Version'] ) ) {
				$new_version = $pd['Version'];
			}
		} else {
			// Cheap version extraction without requiring get_plugin_data.
			$contents = @file_get_contents( $plugin_file );
			if ( $contents && preg_match( '/^\s*\*\s*Version:\s*([0-9.]+)/mi', $contents, $m ) ) {
				$new_version = $m[1];
			}
		}

		return new WP_REST_Response( array(
			'ok'                  => true,
			'previous_version'    => HATCH_VERSION,
			'installed_version'   => $new_version,
			'theme_synced'        => $theme_synced,
			'message'             => __( 'Files replaced. The new code will run on the next request — current request still uses the previous version.', 'hatch' ),
		), 200 );
	}
}

add_action( 'rest_api_init', array( 'Hatch_Options_Rest', 'register_routes' ) );

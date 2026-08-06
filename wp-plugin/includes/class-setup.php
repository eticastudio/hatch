<?php
/**
 * Hatch_Setup — persistence backend for the first-run wizard.
 *
 * Owns three responsibilities the wizard needs so its user choices actually
 * survive a page reload:
 *
 *  1. WP option registration + defaults for the four fields that used to live
 *     only in React state:
 *        - hatch_subfolder_path   (string)  the URL path the parent site
 *                                           reverse-proxies to Astro
 *                                           (e.g. `/blog`, `/docs`).
 *        - hatch_astro_origin     (string)  origin URL of the Astro build
 *                                           (Cloudflare Pages / Vercel / VPS).
 *        - hatch_deploy_provider  (string)  which provider they picked in
 *                                           Step 3 (`cloudflare` | `vercel`
 *                                           | `self`). Purely UX memory —
 *                                           the actual deploy flow lives in
 *                                           Hatch_Deploy_Broker.
 *        - hatch_mount_mode       (string)  always `subfolder` since v0.7.1
 *                                           (root-domain mode removed). Kept
 *                                           as an option so future modes can
 *                                           be added without a migration.
 *
 *  2. A single admin-only AJAX endpoint (`hatch_save_mount_config`) that the
 *     React wizard POSTs to when the user clicks "Launch site". Nonce-checked,
 *     capability-gated, per-key sanitized.
 *
 *  3. A "boot-state patch" — a second inline script queued AFTER the main
 *     dashboard boot state so `window.hatchBoot.state.setup` gains the saved
 *     values + the AJAX nonce + the Custom Theme boilerplate URL. The wizard
 *     rehydrates from this on every load; refreshing mid-wizard no longer
 *     drops the user's choices.
 *
 * @package Hatch
 * @since   0.7.2
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Setup {

	// Canonical WP option keys — never rename; renaming resets every install.
	const OPTION_SUBFOLDER_PATH = 'hatch_subfolder_path';
	const OPTION_ASTRO_ORIGIN   = 'hatch_astro_origin';
	const OPTION_DEPLOY_PROVIDER = 'hatch_deploy_provider';
	const OPTION_MOUNT_MODE     = 'hatch_mount_mode';

	// Boilerplate for users who click the Custom Theme tile in Step 2. The
	// tile links to this doc so a developer can fork a starter theme without
	// touching the plugin. Served straight out of the plugin folder so the
	// link never depends on a public GitHub repo — the doc ships with every
	// install and stays version-locked to the running plugin. Path is
	// relative to the plugin root (HATCH_PLUGIN_FILE). Resolved to a full
	// URL via get_custom_theme_boilerplate_url() so admin, docs and
	// marketing pages all agree on one source of truth.
	const CUSTOM_THEME_BOILERPLATE_DOC = 'docs/CUSTOM-THEME-BOILERPLATE.md';

	/**
	 * Return the public URL to the bundled Custom Theme boilerplate doc.
	 *
	 * Built with plugins_url() against HATCH_PLUGIN_FILE so it respects the
	 * site's actual plugin dir (some installs symlink or move it) and any
	 * WP siteurl override (multisite, dev/prod URL differences). We resolve
	 * lazily because plugins_url() needs the WP bootstrap to be past
	 * plugins_loaded; a bare const would freeze at class-load time and
	 * would trip up any caller that ran before HATCH_PLUGIN_FILE existed.
	 *
	 * @return string
	 */
	public static function get_custom_theme_boilerplate_url(): string {
		return plugins_url( self::CUSTOM_THEME_BOILERPLATE_DOC, HATCH_PLUGIN_FILE );
	}

	// Enum of allowed providers. Anything outside this set is coerced to
	// `cloudflare` (the default recommendation in the wizard UI).
	const ALLOWED_PROVIDERS = array( 'cloudflare', 'vercel', 'self' );

	// Enum of allowed mount modes. Only `subfolder` ships today; anything
	// outside the set is coerced back to it.
	const ALLOWED_MOUNT_MODES = array( 'subfolder' );

	/**
	 * Wire hooks.
	 *
	 * Called once at plugin boot from the bottom of this file.
	 */
	public static function bootstrap(): void {
		// Persistence endpoint. Uses wp_ajax_* (admin-authenticated) — not the
		// nopriv variant, because only logged-in admins should ever be able
		// to write these keys.
		add_action( 'wp_ajax_hatch_save_mount_config', array( __CLASS__, 'handle_save_mount_config' ) );

		// Boot-state patch. Priority 20 fires AFTER the dashboard's default-10
		// wp_add_inline_script call, so our patch always sees window.hatchBoot
		// already assigned by the time it runs.
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'inject_boot_state_patch' ), 20 );
	}

	/**
	 * Return the persisted wizard state with defaults filled in.
	 *
	 * `subPath` defaults to `/blog` so a fresh install shows the same value
	 * the marketing copy talks about. `astroOrigin` is empty by default —
	 * we don't want to guess a URL the user hasn't chosen yet.
	 *
	 * @return array{
	 *     subPath: string,
	 *     astroOrigin: string,
	 *     deployProvider: string,
	 *     mountMode: string
	 * }
	 */
	public static function get_state(): array {
		$sub = (string) get_option( self::OPTION_SUBFOLDER_PATH, '/blog' );
		if ( '' === $sub ) {
			$sub = '/blog';
		}
		$provider = (string) get_option( self::OPTION_DEPLOY_PROVIDER, 'cloudflare' );
		if ( ! in_array( $provider, self::ALLOWED_PROVIDERS, true ) ) {
			$provider = 'cloudflare';
		}
		$mode = (string) get_option( self::OPTION_MOUNT_MODE, 'subfolder' );
		if ( ! in_array( $mode, self::ALLOWED_MOUNT_MODES, true ) ) {
			$mode = 'subfolder';
		}
		return array(
			'subPath'        => self::normalise_path( $sub ),
			'astroOrigin'    => (string) get_option( self::OPTION_ASTRO_ORIGIN, '' ),
			'deployProvider' => $provider,
			'mountMode'      => $mode,
		);
	}

	/**
	 * Coerce a user-provided path to the shape the frontend and reverse
	 * proxy both understand: single leading slash, no trailing slash, only
	 * `[a-z0-9/_-]` characters. Empty / invalid input collapses back to the
	 * default `/blog` so the wizard never renders a broken value.
	 *
	 * @param string $raw
	 * @return string
	 */
	public static function normalise_path( string $raw ): string {
		$raw = trim( $raw );
		if ( '' === $raw ) {
			return '/blog';
		}
		// Ensure leading slash.
		if ( '/' !== substr( $raw, 0, 1 ) ) {
			$raw = '/' . $raw;
		}
		// Strip trailing slash unless the path is literally "/".
		if ( '/' !== $raw ) {
			$raw = rtrim( $raw, '/' );
		}
		// Whitelist: letters, numbers, slash, underscore, hyphen. Anything
		// else means the user pasted junk — bail to the safe default.
		if ( ! preg_match( '#^/[a-z0-9/_-]*$#i', $raw ) ) {
			return '/blog';
		}
		return $raw;
	}

	/**
	 * AJAX: save the four mount-config fields.
	 *
	 * Contract (all fields optional; missing keys keep the saved value):
	 *   subPath        — string, coerced via normalise_path().
	 *   astroOrigin    — string, esc_url_raw'd; blank allowed (user may
	 *                    not have deployed yet).
	 *   deployProvider — string, must be in ALLOWED_PROVIDERS.
	 *   mountMode      — string, must be in ALLOWED_MOUNT_MODES.
	 *
	 * Returns JSON: { ok: true, saved: {...state} } on success,
	 *               { ok: false, message: string } on failure.
	 *
	 * @return void
	 */
	public static function handle_save_mount_config(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json( array( 'ok' => false, 'message' => 'Permission denied.' ), 403 );
		}
		check_ajax_referer( 'hatch_save_mount_config', '_wpnonce' );

		// phpcs:disable WordPress.Security.NonceVerification.Missing -- verified above.
		if ( array_key_exists( 'subPath', $_POST ) ) {
			$sub = self::normalise_path( sanitize_text_field( wp_unslash( (string) $_POST['subPath'] ) ) );
			update_option( self::OPTION_SUBFOLDER_PATH, $sub, false );
		}
		if ( array_key_exists( 'astroOrigin', $_POST ) ) {
			$origin_raw = trim( (string) wp_unslash( $_POST['astroOrigin'] ) );
			if ( '' === $origin_raw ) {
				update_option( self::OPTION_ASTRO_ORIGIN, '', false );
			} else {
				$origin = esc_url_raw( $origin_raw );
				// Reject any origin that doesn't parse to a real http(s) URL —
				// prevents the wizard from silently accepting "not a url".
				if ( '' === $origin || ! preg_match( '#^https?://#i', $origin ) ) {
					wp_send_json( array( 'ok' => false, 'message' => 'Astro origin must be a full URL starting with http:// or https://.' ), 400 );
				}
				update_option( self::OPTION_ASTRO_ORIGIN, untrailingslashit( $origin ), false );
			}
		}
		if ( array_key_exists( 'deployProvider', $_POST ) ) {
			$provider = sanitize_key( wp_unslash( (string) $_POST['deployProvider'] ) );
			if ( ! in_array( $provider, self::ALLOWED_PROVIDERS, true ) ) {
				$provider = 'cloudflare';
			}
			update_option( self::OPTION_DEPLOY_PROVIDER, $provider, false );
		}
		if ( array_key_exists( 'mountMode', $_POST ) ) {
			$mode = sanitize_key( wp_unslash( (string) $_POST['mountMode'] ) );
			if ( ! in_array( $mode, self::ALLOWED_MOUNT_MODES, true ) ) {
				$mode = 'subfolder';
			}
			update_option( self::OPTION_MOUNT_MODE, $mode, false );
		}
		// phpcs:enable WordPress.Security.NonceVerification.Missing

		wp_send_json( array(
			'ok'    => true,
			'saved' => self::get_state(),
		), 200 );
	}

	/**
	 * Patch `window.hatchBoot.state.setup` with persisted mount config,
	 * the AJAX nonce, the AJAX endpoint, and the custom-theme URL. Emitted
	 * as a `before`-position inline script on the `hatch-admin-react` handle
	 * so it lands right after dashboard.php's own boot-state assignment.
	 *
	 * We deliberately DO NOT re-emit the whole boot state — this is an
	 * additive patch. If dashboard.php ever adds its own `setup.subPath`
	 * key, ours wins because Object.assign runs later.
	 *
	 * @param string $hook Current admin screen hook name.
	 * @return void
	 */
	public static function inject_boot_state_patch( $hook ): void {
		// Same gate dashboard.php uses. If we ran everywhere, non-Hatch
		// admin pages would receive an inline script referencing a handle
		// they never enqueued (WP silently ignores it, but this is cleaner).
		if ( false === strpos( (string) $hook, 'hatch' ) ) {
			return;
		}
		if ( ! wp_script_is( 'hatch-admin-react', 'enqueued' ) ) {
			return;
		}

		$state = self::get_state();
		$patch = array(
			'subPath'                   => $state['subPath'],
			'astroOrigin'               => $state['astroOrigin'],
			'deployProvider'            => $state['deployProvider'],
			'mountMode'                 => $state['mountMode'],
			'saveMountConfigNonce'      => wp_create_nonce( 'hatch_save_mount_config' ),
			'saveMountConfigUrl'        => admin_url( 'admin-ajax.php' ),
			'customThemeBoilerplateUrl' => self::get_custom_theme_boilerplate_url(),
		);

		// Guard against dashboard.php reshaping window.hatchBoot in the
		// future — every path check exits gracefully instead of throwing.
		$js  = 'window.hatchBoot = window.hatchBoot || {};';
		$js .= 'window.hatchBoot.state = window.hatchBoot.state || {};';
		$js .= 'window.hatchBoot.state.setup = Object.assign({}, window.hatchBoot.state.setup || {}, '
			. wp_json_encode( $patch )
			. ');';

		wp_add_inline_script( 'hatch-admin-react', $js, 'before' );
	}
}

Hatch_Setup::bootstrap();

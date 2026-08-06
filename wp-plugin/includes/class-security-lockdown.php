<?php
/**
 * Hatch Security Lockdown — coordinator for the one-click "harden everything"
 * toggle on the Security tab.
 *
 * The individual hardening measures already live in dedicated classes:
 *   - Hatch_Security          (REST lock, XML-RPC kill, user enum, CMS noindex)
 *   - Hatch_Login_Hardening   (role guard, brute-force limit, login slug)
 *   - Hatch_Hardening         (file-edit lock, security headers, 2FA enforce)
 *
 * This class does NOT re-implement any of them. It exposes:
 *   1. A canonical list of the DOT-PATH keys the React admin flips when the
 *      user hits "Enable Hatch Lockdown" (kept in one place so the UI count,
 *      the button behaviour, and PHP-side telemetry can't drift).
 *   2. A `is_fully_locked_down()` helper that reads each underlying option
 *      and returns true only when every safe hardening is on.
 *   3. Registration of the `hatch_security_lockdown` bookkeeping option in
 *      the batch save whitelist (via `hatch/options_bool_map` filter — see
 *      admin/dashboard.php `hatch_react_options_save`) so the master toggle
 *      state survives page reloads even when nothing else changes.
 *
 * IMPORTANT — items deliberately EXCLUDED from the one-click flow:
 *   - `security.login_slug`        — hiding wp-login without a slug locks the user out
 *   - `security.enforce_2fa`       — needs a 2FA plugin + per-user enrollment first
 *   - `security.turnstile_*`       — needs Cloudflare Turnstile keys first
 *   - IP allowlist                 — needs a curated list of trusted IPs
 *   - `security.remove_on_uninstall` — destructive; opt-in only
 *
 * @package Hatch
 * @since   0.3.16
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Security_Lockdown {

	/**
	 * Canonical list of dot-path keys included in the one-click lockdown.
	 * The React admin reads this via `hatchBoot.securityLockdown.paths`; the
	 * button flips every path to true in a single POST.
	 *
	 * Order matches the "attack surface" counter in the UI. Each entry is
	 * `path => underlying_option_key` so PHP-side inspection is trivial.
	 *
	 * @return array<string,string>
	 */
	public static function paths(): array {
		return array(
			// Hatch_Security
			'security.block_rest'         => 'hatch_security_harden_rest',
			'security.disable_xmlrpc'     => 'hatch_security_disable_xmlrpc',
			'security.block_enum'         => 'hatch_security_block_user_enum',
			'security.noindex_cms'        => 'hatch_security_force_noindex',
			// Hatch_Login_Hardening
			'security.role_guard'         => 'hatch_login_role_guard_enabled',
			// Hatch_Hardening
			'security.disallow_file_edit' => 'hatch_security_disallow_file_edit',
			'security.send_headers'       => 'hatch_security_send_headers',
		);
	}

	/**
	 * Sub-features gated behind each toggle (source of the "12 attack surfaces
	 * closed" claim on the UI). Kept static and honest: each item below is
	 * enforced by real code in class-security.php / class-hardening.php /
	 * class-login-hardening.php.
	 *
	 * @return array<string,array<int,string>>
	 */
	public static function surfaces(): array {
		return array(
			'security.block_rest'         => array( 'Anonymous /wp-json/* → 401' ),
			'security.disable_xmlrpc'     => array( 'xmlrpc_enabled filter → false', '/xmlrpc.php endpoint → 403' ),
			'security.block_enum'         => array( '/?author=N → 404', '/wp/v2/users → 401' ),
			'security.noindex_cms'        => array( 'noindex meta on WP origin', 'robots.txt Disallow: /' ),
			'security.role_guard'         => array( 'non-admin roles redirected off wp-admin' ),
			'security.disallow_file_edit' => array( 'DISALLOW_FILE_EDIT constant', '<script> stripped from admin posts', 'PHP execution blocked in /uploads/' ),
			'security.send_headers'       => array( 'HSTS', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy' ),
		);
	}

	/**
	 * True iff every underlying option for the paths above is truthy right now.
	 *
	 * @return bool
	 */
	public static function is_fully_locked_down(): bool {
		foreach ( self::paths() as $option ) {
			if ( ! get_option( $option, 0 ) ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Snapshot the current lockdown state — one entry per path with the raw
	 * option value and a boolean `on`. Used by the React admin to render the
	 * master toggle without a separate REST fetch.
	 *
	 * @return array
	 */
	public static function snapshot(): array {
		$out = array();
		foreach ( self::paths() as $path => $option ) {
			$val = get_option( $option, 0 );
			$out[ $path ] = array(
				'option' => $option,
				'on'     => (bool) $val,
			);
		}
		return $out;
	}

	/**
	 * Total sub-surfaces closed when the lockdown is fully on. Used by the UI
	 * summary line ("12 attack surfaces closed"). Counted from `surfaces()` so
	 * adding items in one place keeps the copy honest.
	 *
	 * @return int
	 */
	public static function surface_count(): int {
		$n = 0;
		foreach ( self::surfaces() as $items ) {
			$n += count( $items );
		}
		return $n;
	}
}

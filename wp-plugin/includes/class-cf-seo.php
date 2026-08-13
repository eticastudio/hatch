<?php
/**
 * Hatch_Cf_Seo
 * v0.5.8. Cloudflare Worker subfolder SEO rewriter.
 *
 * When a headless deploy is bound to a subfolder (e.g. site.com/blog)
 * via the Cloudflare Worker installed by Hatch_Onboarding_Cloudflare,
 * WordPress still generates permalinks, sitemap entries, and canonical
 * URLs that point at its own origin (the CMS-edit host). Search engines
 * would then either 404 (if the edit host is intranet-only) or split
 * ranking signals between two URLs for the same content.
 *
 * This class hooks late enough that other SEO plugins can still filter
 * before us, then rewrites every public-facing URL so it points at
 * `https://<money_domain><subpath>/...` which is the URL the Worker
 * actually serves.
 *
 * State source: same option Hatch_Onboarding_Cloudflare persists to
 * (`hatch_cf_worker_state`). If `money_domain` or `subpath` is missing,
 * no hooks register. On uninstall / disconnect the option is cleared
 * and the site returns to normal permalinks with zero code change.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Cf_Seo {

	/**
	 * Same option key the CF onboarding class writes on successful deploy.
	 * Keeping this constant here (not importing) avoids a hard class-load
	 * dependency during REST bootstraps.
	 */
	const OPTION_STATE = 'hatch_cf_worker_state';

	/**
	 * Register filters only when a valid deploy is on record.
	 * Called on `init` after the CF onboarding class has had a chance to
	 * persist a fresh state (which happens during admin-post handlers,
	 * never on public requests, so the check is cheap and correct).
	 */
	public static function boot(): void {
		if ( ! self::is_deployed() ) {
			return;
		}
		add_filter( 'post_link',              array( __CLASS__, 'rewrite_permalink' ), 10, 2 );
		add_filter( 'page_link',              array( __CLASS__, 'rewrite_permalink' ), 10, 2 );
		add_filter( 'post_type_link',         array( __CLASS__, 'rewrite_permalink' ), 10, 2 );
		add_filter( 'the_generator',          '__return_empty_string' );
		add_filter( 'wp_sitemaps_posts_entry', array( __CLASS__, 'rewrite_sitemap_entry' ), 10, 2 );
		add_action( 'robots_txt',              array( __CLASS__, 'append_subfolder_allow' ), 20, 2 );
	}

	/**
	 * Deploy is "valid" when both the frontend host (money_domain) and the
	 * mount point (subpath) are present. Missing either means the wizard
	 * either never finished or was reset. Fail closed: leave permalinks alone.
	 */
	public static function is_deployed(): bool {
		$state = get_option( self::OPTION_STATE );
		return is_array( $state )
			&& ! empty( $state['money_domain'] )
			&& ! empty( $state['subpath'] );
	}

	/**
	 * Rewrite a WP permalink to point at the Worker-served subfolder.
	 *
	 * Strategy: substring-replace `home_url()` with `https://<money_domain><subpath>`.
	 * This preserves the path suffix (e.g. `/2026/08/my-post/`) so per-post
	 * slug logic, category prefixes, and query-string flags survive untouched.
	 *
	 * Deliberate non-features:
	 *  - No URL parsing / rebuild. Preserves any host quirks (subdirectory
	 *    installs, non-standard ports on dev) that get_home_url resolves.
	 *  - No caching. Filter output changes per-post; a cache would need
	 *    invalidation on option update, which is more surface than value.
	 *
	 * @param string $url          Full permalink WordPress generated.
	 * @param mixed  $post_or_id   Unused. Signature required by filters.
	 * @return string Rewritten URL, or original if state is missing.
	 */
	public static function rewrite_permalink( $url, $post_or_id = null ): string {
		$state = get_option( self::OPTION_STATE );
		if ( empty( $state['money_domain'] ) || empty( $state['subpath'] ) ) {
			return (string) $url;
		}
		$wp_home = home_url();
		$target  = 'https://' . $state['money_domain'] . rtrim( (string) $state['subpath'], '/' );
		return str_replace( $wp_home, $target, (string) $url );
	}

	/**
	 * Same rewrite, sitemap-entry shape. WP passes an array with `loc` at minimum.
	 *
	 * @param array  $entry Sitemap entry (has `loc` key at least).
	 * @param object $post  Post object (unused).
	 * @return array Entry with `loc` swapped to the Worker-facing URL.
	 */
	public static function rewrite_sitemap_entry( $entry, $post ): array {
		if ( ! empty( $entry['loc'] ) ) {
			$entry['loc'] = self::rewrite_permalink( $entry['loc'] );
		}
		return (array) $entry;
	}

	/**
	 * Append an explicit `Allow: <subpath>/` line to robots.txt so crawlers
	 * see the subfolder as canonical even if a broader `Disallow: /` was
	 * added by a hardening plugin. Idempotent (WordPress calls this filter
	 * per-request; no persistence).
	 *
	 * @param string $output Robots.txt body WP has assembled so far.
	 * @param mixed  $public Whether the site is public (unused).
	 * @return string Extended body.
	 */
	public static function append_subfolder_allow( $output, $public ): string {
		$state = get_option( self::OPTION_STATE );
		if ( ! empty( $state['subpath'] ) ) {
			$output .= "\nAllow: " . rtrim( (string) $state['subpath'], '/' ) . "/\n";
		}
		return (string) $output;
	}
}

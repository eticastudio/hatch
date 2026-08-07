<?php
/**
 * RankReady bridge — reads RankReady's headless-mode settings and exposes
 * them via Hatch's `/features` REST so the Astro frontend can proxy the
 * AI SEO surfaces (`/llms.txt`, `/.well-known/mcp.json`) and inject
 * RankReady's Summary + FAQ JSON-LD into page schema.
 *
 * v0.5 — was a detection-only stub. Now consumes RankReady's public
 * options directly (they're `register_setting`'d so this is a supported
 * read path, not an internals hack).
 *
 * RankReady coexists with Yoast / Rank Math / AIOSEO — it does not
 * compete on head meta. Its job is the *AI answer layer*: llms.txt for
 * discovery, MCP well-known for AI-agent invocation, per-post AI Summary
 * as `Article.description`, per-post FAQ as `FAQPage` JSON-LD.
 *
 * @package Hatch
 * @since 0.6
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_RankReady_Bridge
 */
class Hatch_RankReady_Bridge {

	/**
	 * Is RankReady installed and active?
	 *
	 * @return bool
	 */
	public static function is_active(): bool {
		return Hatch_Detector::is_active( 'rankready' )
			|| Hatch_Detector::is_active( 'rankready_dev' );
	}

	/**
	 * Build the RankReady status block exposed via `/hatch/v1/features`.
	 *
	 * Returned shape:
	 *   {
	 *     active: bool,                  // plugin installed + activated
	 *     headless_enabled: bool,        // rnrd_headless_enable === 'on'
	 *     llms_txt: {
	 *       enabled: bool,               // rnrd_llms_enable === 'on'
	 *       url: string                  // absolute URL of the WP origin's /llms.txt
	 *     },
	 *     llms_full_txt: { enabled, url },
	 *     mcp: {
	 *       enabled: bool,               // detected via /.well-known/mcp.json
	 *       url: string
	 *     },
	 *     revalidate: {
	 *       target: string,              // the URL RankReady posts revalidations to
	 *       matches_hatch: bool          // secret matches Hatch's webhook secret
	 *     },
	 *     endpoints: {                    // REST endpoints Astro consumes per post
	 *       summary: string,             // /wp-json/rankready/v1/summary/{id}
	 *       faq: string                  // /wp-json/rankready/v1/faq/get/{id}
	 *     },
	 *     version: string                 // RankReady plugin version if resolvable
	 *   }
	 *
	 * Returns a minimal `{active: false}` when RankReady isn't installed,
	 * so the Astro side can gate on the flag without null-checks.
	 *
	 * @return array<string,mixed>
	 */
	public static function status(): array {
		if ( ! self::is_active() ) {
			return array( 'active' => false );
		}

		$origin = untrailingslashit( home_url() );
		$hatch_secret = (string) get_option( 'hatch_webhook_secret', '' );
		$rr_revalidate_target = (string) get_option( 'rnrd_headless_revalidate_url', '' );
		$rr_revalidate_secret = (string) get_option( 'rnrd_headless_revalidate_secret', '' );

		$llms_enabled     = 'on' === get_option( 'rnrd_llms_enable',      'off' );
		$llms_full_enabled = 'on' === get_option( 'rnrd_llms_full_enable', 'off' );

		$version = '';
		if ( function_exists( 'get_file_data' ) ) {
			foreach ( array(
				WP_PLUGIN_DIR . '/rankready-ai-llm-seo/rankready.php',
				WP_PLUGIN_DIR . '/rankready/rankready.php',
			) as $candidate ) {
				if ( file_exists( $candidate ) ) {
					$data = get_file_data( $candidate, array( 'Version' => 'Version' ) );
					if ( ! empty( $data['Version'] ) ) {
						$version = (string) $data['Version'];
						break;
					}
				}
			}
		}

		return array(
			'active'            => true,
			'version'           => $version,
			'headless_enabled'  => 'on' === get_option( 'rnrd_headless_enable', 'off' ),
			'llms_txt' => array(
				'enabled' => $llms_enabled,
				'url'     => $llms_enabled ? $origin . '/llms.txt' : '',
			),
			'llms_full_txt' => array(
				'enabled' => $llms_full_enabled,
				'url'     => $llms_full_enabled ? $origin . '/llms-full.txt' : '',
			),
			'mcp' => array(
				// RankReady's MCP well-known is served by class-rnrd-mcp.php
				// with its own master toggle; presence of the file is the
				// simplest reliable signal short of a HEAD probe.
				'enabled' => true,
				'url'     => $origin . '/.well-known/mcp.json',
			),
			'revalidate' => array(
				'target'        => $rr_revalidate_target,
				'matches_hatch' => ( $hatch_secret !== '' && $hatch_secret === $rr_revalidate_secret ),
			),
			'endpoints' => array(
				// {id} placeholder — Astro replaces on a per-post basis.
				'summary' => rest_url( 'rankready/v1/summary/{id}' ),
				'faq'     => rest_url( 'rankready/v1/faq/get/{id}' ),
			),
		);
	}
}

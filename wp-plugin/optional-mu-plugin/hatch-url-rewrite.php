<?php
/**
 * Plugin Name: Hatch - public URL rewriter (mu-plugin)
 * Description: Rewrites localhost / private-IP media URLs to the Hatch
 *              frontend origin's `/hatch-media/` proxy so headless demos
 *              serve images correctly whether WP runs on a bare docker
 *              host, a Cloudflare tunnel, or a stale trycloudflare URL
 *              baked into post_content.
 * Version: 0.4.0
 * Hatch-Managed: url-rewriter
 *
 * This file is written, updated and removed by the Hatch plugin. Do not
 * edit it: Hatch only deletes a copy that still carries the Hatch-Managed
 * line above, so a copy you change by hand is treated as yours and kept.
 *
 * It does nothing unless the Hatch plugin is active. That is checked on every
 * request (the HATCH_VERSION constant), so a copy that could not be deleted
 * after Hatch was deactivated stays completely inert.
 *
 * Reads the frontend from the `hatch_frontend_url` WP option (set by the
 * Hatch setup); falls back to the `HATCH_PUBLIC_HOST` env var / constant.
 * The filters are no-ops until that is populated.
 *
 * Hatch installs it only when WordPress itself runs on a local or temporary
 * address (localhost, a docker host, a trycloudflare tunnel). On a real public
 * domain WordPress emits correct URLs natively and the plugin's own media
 * rewriter covers the rest.
 *
 * Why the /hatch-media/ path rather than /wp-content/uploads/ ?
 *   The Astro frontend already exposes a matching /hatch-media/[...path]
 *   proxy that streams the binary back from WP. Routing images through it
 *   means the browser never sees a WordPress hostname, matches the
 *   Hatch_Media_Rewriter plugin filter, and works uniformly under any
 *   deploy target (Workers, subfolder mount).
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Resolve the current frontend host once per request.
 *
 * Priority: hatch_frontend_url option, then HATCH_PUBLIC_HOST env, then the
 * constant. The returned value has no trailing slash.
 *
 * @return string Empty string means "no rewriting configured".
 */
function hatch_mu_frontend_host(): string {
	$opt = trim( (string) get_option( 'hatch_frontend_url', '' ) );
	if ( '' === $opt ) {
		$opt = (string) getenv( 'HATCH_PUBLIC_HOST' );
	}
	if ( '' === $opt && defined( 'HATCH_PUBLIC_HOST' ) ) {
		$opt = (string) constant( 'HATCH_PUBLIC_HOST' );
	}
	// Whatever the source (option, environment or constant), only a clean http(s) URL is ever put into page output.
	$opt = rtrim( esc_url_raw( trim( $opt ), array( 'http', 'https' ) ), '/' );

	// If the "frontend" is itself a private host, the rewrite would only swap one
	// unreachable URL for another. Leave the original URL alone instead.
	if ( '' !== $opt && preg_match( '#^https?://(localhost|127\.0\.0\.1|host\.docker\.internal)(:\d+)?$#i', $opt ) ) {
		return '';
	}
	return $opt;
}

/**
 * Regex fragment matching the hosts that get rewritten.
 *
 * @return string
 */
function hatch_mu_stale_hosts(): string {
	return '(?:localhost(?::\d+)?|host\.docker\.internal(?::\d+)?|127\.0\.0\.1(?::\d+)?|[a-z0-9-]+\.trycloudflare\.com)';
}

/**
 * Rewrite a single URL.
 *
 * A `localhost`, `host.docker.internal`, `127.0.0.1` or `*.trycloudflare.com`
 * host followed by `/wp-content/uploads/` becomes `<frontend>/hatch-media/<rest>`.
 * Any other URL from such a host gets its host swapped, so permalinks and embeds
 * stay clickable. Non-strings, empty strings and URLs on a public host pass
 * through unchanged.
 *
 * @param mixed $url URL to rewrite.
 * @return mixed
 */
function hatch_mu_rewrite_url( $url ) {
	if ( ! is_string( $url ) || '' === $url ) {
		return $url;
	}
	$to = hatch_mu_frontend_host();
	if ( '' === $to ) {
		return $url;
	}

	$stale = hatch_mu_stale_hosts();
	$url   = preg_replace( '#^https?://' . $stale . '/wp-content/uploads/#i', $to . '/hatch-media/', $url );
	return preg_replace( '#^https?://' . $stale . '#i', $to, $url );
}

/**
 * Filter callback: rewrite the first element of an image-src array.
 *
 * @param mixed $image Array from wp_get_attachment_image_src.
 * @return mixed
 */
function hatch_mu_rewrite_image_src( $image ) {
	if ( is_array( $image ) && isset( $image[0] ) ) {
		$image[0] = hatch_mu_rewrite_url( $image[0] );
	}
	return $image;
}

/**
 * Filter callback: rewrite every srcset candidate.
 *
 * @param mixed $sources Array from wp_calculate_image_srcset.
 * @return mixed
 */
function hatch_mu_rewrite_srcset( $sources ) {
	if ( is_array( $sources ) ) {
		foreach ( $sources as $key => $source ) {
			if ( isset( $source['url'] ) ) {
				$sources[ $key ]['url'] = hatch_mu_rewrite_url( $source['url'] );
			}
		}
	}
	return $sources;
}

/**
 * Filter callback: rewrite the media URLs the REST API exposes. The headless
 * frontend reads featured images through this shape.
 *
 * @param mixed $response REST response for an attachment.
 * @return mixed
 */
function hatch_mu_rewrite_rest_attachment( $response ) {
	if ( ! ( $response instanceof WP_REST_Response ) ) {
		return $response;
	}
	$data = $response->get_data();
	if ( ! is_array( $data ) ) {
		return $response;
	}
	if ( isset( $data['source_url'] ) ) {
		$data['source_url'] = hatch_mu_rewrite_url( $data['source_url'] );
	}
	if ( isset( $data['guid']['rendered'] ) ) {
		$data['guid']['rendered'] = hatch_mu_rewrite_url( $data['guid']['rendered'] );
	}
	if ( isset( $data['media_details']['sizes'] ) && is_array( $data['media_details']['sizes'] ) ) {
		foreach ( $data['media_details']['sizes'] as $key => $size ) {
			if ( isset( $size['source_url'] ) ) {
				$data['media_details']['sizes'][ $key ]['source_url'] = hatch_mu_rewrite_url( $size['source_url'] );
			}
		}
	}
	$response->set_data( $data );
	return $response;
}

/**
 * Filter callback: sweep stale hosts out of rendered post content. Old posts
 * still carry image tags that hard-code a localhost origin.
 *
 * @param mixed $html Post content.
 * @return mixed
 */
function hatch_mu_rewrite_content( $html ) {
	if ( ! is_string( $html ) || '' === $html || '' === hatch_mu_frontend_host() ) {
		return $html;
	}
	$pattern = '#https?://' . hatch_mu_stale_hosts() . '/wp-content/uploads/[^"\'\s<>]+#i';
	return preg_replace_callback(
		$pattern,
		static function ( $found ) {
			return hatch_mu_rewrite_url( $found[0] );
		},
		$html
	);
}

/**
 * Register the filters, but only while the Hatch plugin is loaded.
 *
 * mu-plugins load before regular plugins, so this waits for plugins_loaded and
 * then checks that Hatch defined its version constant. Deactivate Hatch and the
 * constant is gone, which turns every filter below off even if this file is
 * still on disk.
 *
 * @return void
 */
function hatch_mu_boot(): void {
	if ( ! defined( 'HATCH_VERSION' ) ) {
		add_action( 'admin_notices', 'hatch_mu_leftover_notice' );
		return;
	}
	add_filter( 'wp_get_attachment_url', 'hatch_mu_rewrite_url', 99 );
	add_filter( 'wp_get_attachment_image_src', 'hatch_mu_rewrite_image_src', 99 );
	add_filter( 'wp_calculate_image_srcset', 'hatch_mu_rewrite_srcset', 99 );
	add_filter( 'rest_prepare_attachment', 'hatch_mu_rewrite_rest_attachment', 99 );
	add_filter( 'the_content', 'hatch_mu_rewrite_content', 99 );
	add_filter( 'post_link', 'hatch_mu_rewrite_url', 99 );
	add_filter( 'page_link', 'hatch_mu_rewrite_url', 99 );
	add_filter( 'post_type_link', 'hatch_mu_rewrite_url', 99 );
}
add_action( 'plugins_loaded', 'hatch_mu_boot', 1 );

/**
 * Shown on the Plugins screen when Hatch is not active but this file is still
 * here, which means Hatch could not delete it. Skipped on a network, where
 * another site may still be using the file.
 *
 * @return void
 */
function hatch_mu_leftover_notice(): void {
	if ( is_multisite() || ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
	if ( ! $screen || 'plugins' !== $screen->id ) {
		return;
	}
	?>
	<div class="notice notice-warning is-dismissible">
		<p>
			<strong><?php esc_html_e( 'A leftover Hatch helper file is still installed.', 'hatch-connect' ); ?></strong>
			<?php
			echo wp_kses(
				sprintf(
					/* translators: %s: full path of the file to delete. */
					__( 'Hatch is not active, so the file does nothing. To remove it, delete %s by hand.', 'hatch-connect' ),
					'<code>' . esc_html( __FILE__ ) . '</code>'
				),
				array( 'code' => array() )
			);
			?>
		</p>
	</div>
	<?php
}

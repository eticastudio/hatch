<?php
/**
 * Plugin Name: Hatch — public URL rewriter (mu-plugin)
 * Description: Rewrites localhost / private-IP media URLs to the Hatch
 *              frontend origin's `/hatch-media/` proxy so headless demos
 *              serve images correctly whether WP runs on a bare docker
 *              host, a Cloudflare tunnel, or a stale trycloudflare URL
 *              baked into post_content.
 *
 * Version: 0.3.0
 *
 * Auto-reads the frontend from `hatch_frontend_url` WP option (set by the
 * Hatch wizard); falls back to the `HATCH_PUBLIC_HOST` env var / constant.
 * Copy to `wp-content/mu-plugins/` — WordPress auto-loads mu-plugins, no
 * activation needed. Safe to leave installed in production: the filters
 * are no-ops until the option is populated.
 *
 * For production WordPress on a real public domain that already matches
 * siteurl/home: DO NOT install this. WordPress emits correct URLs
 * natively when the two agree with the browser-visible host.
 *
 * Why the /hatch-media/ path rather than /wp-content/uploads/ ?
 *   The Astro frontend already exposes a matching /hatch-media/[...path]
 *   proxy that streams the binary back from WP. Routing images through it
 *   means the browser never sees a WordPress hostname, matches the
 *   Hatch_Media_Rewriter plugin filter, and works uniformly under any
 *   deploy target (VPS, Vercel, Workers, subfolder mount).
 */

defined( 'ABSPATH' ) || exit;

/**
 * Resolve the current frontend host once per request.
 *
 * Priority: hatch_frontend_url option → HATCH_PUBLIC_HOST env → constant.
 * Returned value is trimmed of trailing slashes.
 *
 * @return string Empty string means "no rewriting configured".
 */
function hatch_mu_frontend_host(): string {
	$opt = trim( (string) get_option( 'hatch_frontend_url', '' ) );
	if ( '' === $opt && function_exists( 'getenv' ) ) {
		$opt = (string) getenv( 'HATCH_PUBLIC_HOST' );
	}
	if ( '' === $opt && defined( 'HATCH_PUBLIC_HOST' ) ) {
		$opt = (string) constant( 'HATCH_PUBLIC_HOST' );
	}
	$opt = rtrim( $opt, '/' );

	// Safety: if the "frontend" resolves to another private host, the
	// rewrite would just swap one un-reachable URL for another and the
	// browser would still 404. Bail — better to leave the original URL
	// than to leak `http://localhost:...` into a production render.
	if ( '' !== $opt && preg_match( '#^https?://(localhost|127\.0\.0\.1|host\.docker\.internal)(:\d+)?$#i', $opt ) ) {
		return '';
	}
	return $opt;
}

/**
 * Rewrite a single URL. Any `localhost`, `host.docker.internal`,
 * `127.0.0.1`, or `*.trycloudflare.com` host followed by an
 * `/wp-content/uploads/` path is rewritten to
 * `<frontend>/hatch-media/<rest>`.
 *
 * Everything else — non-string values, empty strings, URLs that already
 * live on a public host — passes through unchanged.
 *
 * @param mixed $url
 * @return mixed
 */
function hatch_mu_rewrite_url( $url ) {
	if ( ! is_string( $url ) || '' === $url ) return $url;
	$to = hatch_mu_frontend_host();
	if ( '' === $to ) return $url;

	$stale_hosts = '(?:localhost(?::\d+)?|host\.docker\.internal(?::\d+)?|127\.0\.0\.1(?::\d+)?|[a-z0-9-]+\.trycloudflare\.com)';

	// Uploads URLs → hatch-media proxy, host + path both replaced in one shot.
	$url = preg_replace(
		'#^https?://' . $stale_hosts . '/wp-content/uploads/#i',
		$to . '/hatch-media/',
		$url
	);

	// Non-uploads URLs from a stale host still get the host swapped so links
	// stay clickable — permalinks, feed URLs, embed URLs, etc.
	$url = preg_replace(
		'#^https?://' . $stale_hosts . '#i',
		$to,
		$url
	);

	return $url;
}

$hatch_mu_rewrite = 'hatch_mu_rewrite_url';

add_filter( 'wp_get_attachment_url', $hatch_mu_rewrite, 99 );

add_filter( 'wp_get_attachment_image_src', function ( $arr ) use ( $hatch_mu_rewrite ) {
	if ( is_array( $arr ) && isset( $arr[0] ) ) $arr[0] = $hatch_mu_rewrite( $arr[0] );
	return $arr;
}, 99 );

add_filter( 'wp_calculate_image_srcset', function ( $sources ) use ( $hatch_mu_rewrite ) {
	if ( is_array( $sources ) ) {
		foreach ( $sources as $k => $s ) {
			if ( isset( $s['url'] ) ) $sources[ $k ]['url'] = $hatch_mu_rewrite( $s['url'] );
		}
	}
	return $sources;
}, 99 );

// REST responses that expose the attachment `source_url` — the headless
// frontend reads featured images through this shape.
add_filter( 'rest_prepare_attachment', function ( $response ) use ( $hatch_mu_rewrite ) {
	if ( ! ( $response instanceof WP_REST_Response ) ) return $response;
	$data = $response->get_data();
	if ( ! is_array( $data ) ) return $response;
	if ( isset( $data['source_url'] ) )        $data['source_url'] = $hatch_mu_rewrite( $data['source_url'] );
	if ( isset( $data['guid']['rendered'] ) )  $data['guid']['rendered'] = $hatch_mu_rewrite( $data['guid']['rendered'] );
	if ( isset( $data['media_details']['sizes'] ) && is_array( $data['media_details']['sizes'] ) ) {
		foreach ( $data['media_details']['sizes'] as $k => $sz ) {
			if ( isset( $sz['source_url'] ) ) $data['media_details']['sizes'][ $k ]['source_url'] = $hatch_mu_rewrite( $sz['source_url'] );
		}
	}
	$response->set_data( $data );
	return $response;
}, 99 );

// Sweep embedded stale hosts out of rendered post content — pre-existing
// image tags in old posts still hardcode a localhost origin.
add_filter( 'the_content', function ( $html ) use ( $hatch_mu_rewrite ) {
	if ( ! is_string( $html ) || '' === $html ) return $html;
	$to = hatch_mu_frontend_host();
	if ( '' === $to ) return $html;
	$pattern = '#https?://(?:localhost(?::\d+)?|host\.docker\.internal(?::\d+)?|127\.0\.0\.1(?::\d+)?|[a-z0-9-]+\.trycloudflare\.com)/wp-content/uploads/[^"\'\s<>]+#i';
	return preg_replace_callback( $pattern, function ( $m ) use ( $hatch_mu_rewrite ) {
		return $hatch_mu_rewrite( $m[0] );
	}, $html );
}, 99 );

add_filter( 'post_link',      $hatch_mu_rewrite, 99 );
add_filter( 'page_link',      $hatch_mu_rewrite, 99 );
add_filter( 'post_type_link', $hatch_mu_rewrite, 99 );

<?php
/**
 * Plugin Name: Hatch — public URL rewriter (mu-plugin)
 * Description: Rewrites localhost media URLs to a public host so headless
 *              deploys serve images correctly when WP is on localhost /
 *              private IP AND you're demoing against a public tunnel.
 * 
 * To use:
 *   1. Copy to wp-content/mu-plugins/hatch-url-rewrite.php
 *   2. Edit HATCH_PUBLIC_HOST below to your tunnel/public URL
 *   3. WordPress auto-loads mu-plugins, no activation needed
 * 
 * For production WordPress on a real public domain: DO NOT install this.
 * WordPress emits correct URLs natively when its home/siteurl match the
 * public host.
 */
if ( ! defined( 'HATCH_PUBLIC_HOST' ) ) {
	define( 'HATCH_PUBLIC_HOST', getenv( 'HATCH_PUBLIC_HOST' ) ?: '' );
}
if ( HATCH_PUBLIC_HOST ) {
	$rewrite = function( $url ) {
		if ( ! is_string( $url ) || '' === $url ) return $url;
		$to = rtrim( HATCH_PUBLIC_HOST, '/' );
		$url = preg_replace( '#^https?://localhost(:\d+)?#', $to, $url );
		$url = preg_replace( '#^https?://host\.docker\.internal(:\d+)?#', $to, $url );
		$url = preg_replace( '#^https?://127\.0\.0\.1(:\d+)?#', $to, $url );
		return $url;
	};
	add_filter( 'wp_get_attachment_url', $rewrite, 99 );
	add_filter( 'wp_get_attachment_image_src', function( $arr ) use ( $rewrite ) {
		if ( is_array( $arr ) && isset( $arr[0] ) ) $arr[0] = $rewrite( $arr[0] );
		return $arr;
	}, 99 );
	add_filter( 'wp_calculate_image_srcset', function( $sources ) use ( $rewrite ) {
		if ( is_array( $sources ) ) foreach ( $sources as $k => $s ) {
			if ( isset( $s['url'] ) ) $sources[ $k ]['url'] = $rewrite( $s['url'] );
		}
		return $sources;
	}, 99 );
	add_filter( 'post_link',      $rewrite, 99 );
	add_filter( 'page_link',      $rewrite, 99 );
	add_filter( 'post_type_link', $rewrite, 99 );
	add_filter( 'rest_prepare_attachment', function( $response ) use ( $rewrite ) {
		$data = $response->get_data();
		if ( isset( $data['source_url'] ) ) $data['source_url'] = $rewrite( $data['source_url'] );
		if ( isset( $data['guid']['rendered'] ) ) $data['guid']['rendered'] = $rewrite( $data['guid']['rendered'] );
		if ( ! empty( $data['media_details']['sizes'] ) && is_array( $data['media_details']['sizes'] ) ) {
			foreach ( $data['media_details']['sizes'] as $k => $sz ) {
				if ( isset( $sz['source_url'] ) ) $data['media_details']['sizes'][ $k ]['source_url'] = $rewrite( $sz['source_url'] );
			}
		}
		$response->set_data( $data );
		return $response;
	}, 99 );
	add_filter( 'the_content', function( $html ) use ( $rewrite ) {
		$to = rtrim( HATCH_PUBLIC_HOST, '/' );
		$html = preg_replace( '#https?://localhost(:\d+)?#', $to, $html );
		$html = preg_replace( '#https?://host\.docker\.internal(:\d+)?#', $to, $html );
		$html = preg_replace( '#https?://127\.0\.0\.1(:\d+)?#', $to, $html );
		return $html;
	}, 99 );
}

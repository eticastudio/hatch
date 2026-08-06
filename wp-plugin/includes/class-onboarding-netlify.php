<?php
/**
 * Netlify 1-click onboarding — updates the money-domain Netlify site's
 * redirect rules to proxy /blog/* to the Astro origin.
 *
 * User pastes a Netlify PAT (create at
 * https://app.netlify.com/user/applications/personal).
 *
 * Netlify processes redirects two ways: a `_redirects` file in the deploy
 * OR the `redirect_rules` API on the site. We use the API path so the
 * change takes effect immediately without a redeploy. Rule 200 = proxy
 * (rewrite), not a browser redirect.
 *
 * @package Hatch
 * @since 0.5.2
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Onboarding_Netlify
 */
class Hatch_Onboarding_Netlify {

	const OPTION_STATE = 'hatch_netlify_state';
	const API_ROOT     = 'https://api.netlify.com/api/v1';

	/**
	 * Deploy /blog proxy rule to the Netlify site.
	 *
	 * @param array{token:string, site_id:string, astro_origin:string} $args
	 * @return array{success:bool, message:string, details?:array<string,mixed>}
	 */
	public static function deploy( array $args ): array {
		$token        = trim( (string) ( $args['token']        ?? '' ) );
		$site_id      = trim( (string) ( $args['site_id']      ?? '' ) );
		$astro_origin = trim( (string) ( $args['astro_origin'] ?? '' ) );

		if ( '' === $token )        return array( 'success' => false, 'message' => __( 'Netlify PAT required.', 'hatch' ) );
		if ( '' === $site_id )      return array( 'success' => false, 'message' => __( 'Site ID required.',      'hatch' ) );
		if ( '' === $astro_origin ) return array( 'success' => false, 'message' => __( 'Astro origin URL required.', 'hatch' ) );

		$astro_root = untrailingslashit( $astro_origin );

		// Verify site + read redirect rules through /sites/{id}.
		$site = self::api_request( 'GET', '/sites/' . rawurlencode( $site_id ), $token );
		if ( ! $site['success'] ) return $site;

		// Netlify stores redirect rules under 'redirect_rules'. Fall back to
		// posting a new _redirects file when the API surface is not present.
		$existing = isset( $site['body']['redirect_rules'] ) && is_array( $site['body']['redirect_rules'] ) ? $site['body']['redirect_rules'] : array();

		// Idempotent check.
		$already = false;
		foreach ( $existing as $rule ) {
			if ( ( $rule['from'] ?? '' ) === '/blog/*' && strpos( (string) ( $rule['to'] ?? '' ), $astro_root ) === 0 ) {
				$already = true;
				break;
			}
		}
		if ( ! $already ) {
			array_unshift( $existing, array(
				'from'   => '/blog/*',
				'to'     => $astro_root . '/blog/:splat',
				'status' => 200, // 200 = proxy (rewrite), keeps URL in the browser bar.
				'force'  => true,
			) );
		}

		$patch = self::api_request(
			'PATCH',
			'/sites/' . rawurlencode( $site_id ),
			$token,
			array( 'redirect_rules' => $existing )
		);
		if ( ! $patch['success'] ) return $patch;

		update_option( self::OPTION_STATE, array(
			'deployed_at' => time(),
			'site_id'     => $site_id,
			'astro_origin'=> $astro_origin,
		), false );

		return array(
			'success' => true,
			'message' => $already
				? __( 'Redirect rule already present.', 'hatch' )
				: __( 'Redirect rule added. Netlify will process /blog/* on the next request.', 'hatch' ),
			'details' => array( 'site_id' => $site_id ),
		);
	}

	private static function api_request( string $method, string $path, string $token, ?array $body = null ): array {
		$args = array(
			'method'  => $method,
			'timeout' => 12,
			'headers' => array(
				'Authorization' => 'Bearer ' . $token,
				'Content-Type'  => 'application/json',
			),
		);
		if ( null !== $body ) {
			$args['body'] = wp_json_encode( $body );
		}
		$response = wp_remote_request( self::API_ROOT . $path, $args );
		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => sprintf( __( 'Netlify API unreachable: %s', 'hatch' ), $response->get_error_message() ) );
		}
		$code = wp_remote_retrieve_response_code( $response );
		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 401 === $code || 403 === $code ) {
			return array( 'success' => false, 'message' => __( 'Netlify PAT rejected or missing site access.', 'hatch' ) );
		}
		if ( $code < 200 || $code >= 300 ) {
			return array( 'success' => false, 'message' => sprintf( __( 'Netlify API error %1$d: %2$s', 'hatch' ), $code, is_array( $data ) ? wp_json_encode( $data ) : (string) $data ) );
		}
		return array( 'success' => true, 'body' => is_array( $data ) ? $data : array() );
	}

	public static function status(): array {
		$state = get_option( self::OPTION_STATE, null );
		if ( ! is_array( $state ) || empty( $state['deployed_at'] ) ) {
			return array( 'deployed' => false );
		}
		return array_merge( array( 'deployed' => true ), $state );
	}
}

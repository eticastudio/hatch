<?php
/**
 * Vercel 1-click onboarding — updates the money-domain Vercel project's
 * rewrites config to forward /blog/* to the Astro origin.
 *
 * User pastes a Vercel personal access token (create at
 * https://vercel.com/account/tokens with full scope).
 *
 * NOTE: If the money-domain project is itself an Astro deployment on
 * Vercel, `vercel.json` rewrites will NOT work — Vercel's own docs
 * flag this. We detect that case via the project framework field and
 * return an "use middleware instead" message so the wizard can render
 * a copy-paste middleware snippet on that branch.
 *
 * @package Hatch
 * @since 0.5.2
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Onboarding_Vercel
 */
class Hatch_Onboarding_Vercel {

	const OPTION_STATE = 'hatch_vercel_state';
	const API_ROOT     = 'https://api.vercel.com';

	/**
	 * Push the /blog rewrite into the project's config.
	 *
	 * @param array{token:string, project_id:string, team_id?:string, astro_origin:string} $args
	 * @return array{success:bool, message:string, details?:array<string,mixed>}
	 */
	public static function deploy( array $args ): array {
		$token        = trim( (string) ( $args['token']        ?? '' ) );
		$project_id   = trim( (string) ( $args['project_id']   ?? '' ) );
		$team_id      = trim( (string) ( $args['team_id']      ?? '' ) );
		$astro_origin = trim( (string) ( $args['astro_origin'] ?? '' ) );

		if ( '' === $token )        return array( 'success' => false, 'message' => __( 'Vercel PAT required.', 'hatch' ) );
		if ( '' === $project_id )   return array( 'success' => false, 'message' => __( 'Project ID required.', 'hatch' ) );
		if ( '' === $astro_origin ) return array( 'success' => false, 'message' => __( 'Astro origin URL required.', 'hatch' ) );

		// Read current project to check framework (Astro conflict) + preserve existing rewrites.
		$fetch = self::api_request( 'GET', '/v10/projects/' . rawurlencode( $project_id ), $token, $team_id );
		if ( ! $fetch['success'] ) return $fetch;

		$project = $fetch['body'];
		if ( isset( $project['framework'] ) && 'astro' === $project['framework'] ) {
			return array(
				'success' => false,
				'message' => __( 'This is an Astro project — Vercel does not honour vercel.json rewrites on Astro. Use Astro Routing Middleware instead (copy-paste snippet below).', 'hatch' ),
				'details' => array( 'needs_middleware' => true ),
			);
		}

		// Preserve existing rewrites, prepend ours.
		$existing = isset( $project['rewrites'] ) && is_array( $project['rewrites'] ) ? $project['rewrites'] : array();
		$astro_root = untrailingslashit( $astro_origin );
		$new_rewrite = array(
			'source'      => '/blog/:path*',
			'destination' => $astro_root . '/blog/:path*',
		);
		// Idempotent: if the same source already routes there, skip.
		$already = false;
		foreach ( $existing as $rw ) {
			if ( ( $rw['source'] ?? '' ) === '/blog/:path*' && ( $rw['destination'] ?? '' ) === $new_rewrite['destination'] ) {
				$already = true;
				break;
			}
		}
		if ( ! $already ) {
			array_unshift( $existing, $new_rewrite );
		}

		// PATCH the project.
		$patch = self::api_request(
			'PATCH',
			'/v10/projects/' . rawurlencode( $project_id ),
			$token,
			$team_id,
			array( 'rewrites' => $existing )
		);
		if ( ! $patch['success'] ) return $patch;

		update_option( self::OPTION_STATE, array(
			'deployed_at' => time(),
			'project_id'  => $project_id,
			'team_id'     => $team_id,
			'astro_origin'=> $astro_origin,
			'rewrite'     => $new_rewrite,
		), false );

		return array(
			'success' => true,
			'message' => $already
				? __( 'Rewrite already present. Trigger a Vercel redeploy for it to take effect.', 'hatch' )
				: __( 'Rewrite added. Trigger a Vercel redeploy of the project for it to take effect.', 'hatch' ),
			'details' => array( 'project_id' => $project_id ),
		);
	}

	private static function api_request( string $method, string $path, string $token, string $team_id = '', ?array $body = null ): array {
		$url = self::API_ROOT . $path;
		if ( '' !== $team_id ) {
			$url .= ( false === strpos( $url, '?' ) ? '?' : '&' ) . 'teamId=' . rawurlencode( $team_id );
		}
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
		$response = wp_remote_request( $url, $args );
		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => sprintf( __( 'Vercel API unreachable: %s', 'hatch' ), $response->get_error_message() ) );
		}
		$code = wp_remote_retrieve_response_code( $response );
		$data = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( 401 === $code || 403 === $code ) {
			return array( 'success' => false, 'message' => __( 'PAT rejected or missing project access.', 'hatch' ) );
		}
		if ( $code < 200 || $code >= 300 ) {
			return array( 'success' => false, 'message' => sprintf( __( 'Vercel API error %1$d: %2$s', 'hatch' ), $code, is_array( $data ) ? wp_json_encode( $data ) : (string) $data ) );
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

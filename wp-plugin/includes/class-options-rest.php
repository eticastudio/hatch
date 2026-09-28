<?php
/**
 * Cache refresh REST route.
 *
 *   POST /hatch/v1/refresh-cache   Ask the frontend to purge its edge cache.
 *
 * Administrator only. When a revalidate endpoint is saved it receives a
 * signed ping; the shared secret travels in a request header, never in the
 * URL. Without an endpoint the route still answers so the admin gets feedback,
 * because the edge cache expires on its own within 60 seconds.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Cache refresh route.
 */
class Hatch_Options_Rest {

	/**
	 * Register the route.
	 *
	 * @return void
	 */
	public static function register_routes(): void {
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/refresh-cache',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'route_refresh_cache' ),
				'permission_callback' => array( __CLASS__, 'require_admin' ),
			)
		);
	}

	/**
	 * Permission check.
	 *
	 * @return bool
	 */
	public static function require_admin(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Owner-facing result line for the refresh button.
	 *
	 * @param bool $pinged   Whether the webhook answered.
	 * @param bool $rejected Whether the saved URL was refused before any request.
	 * @return string
	 */
	private static function message( bool $pinged, bool $rejected ): string {
		if ( $pinged ) {
			return __( 'Edge cache refresh signal sent. Live content within seconds.', 'hatch-bridge' );
		}
		if ( $rejected ) {
			return __( 'The revalidate webhook URL must use https, so nothing was sent. Content still propagates within the 60 second cache lifetime.', 'hatch-bridge' );
		}
		return __( 'No revalidate webhook configured. Content still propagates within the 60 second cache lifetime.', 'hatch-bridge' );
	}

	/**
	 * POST: ping the revalidate webhook, if one is saved.
	 *
	 * @return WP_REST_Response
	 */
	public static function route_refresh_cache() {
		$endpoint = trim( (string) get_option( 'hatch_revalidate_endpoint', '' ) );
		$secret   = (string) get_option( 'hatch_webhook_secret', '' );
		$pinged   = false;
		$status   = 0;
		$rejected = '' !== $endpoint && ! Hatch_Revalidate::endpoint_allowed( $endpoint );

		if ( '' !== $endpoint && ! $rejected ) {
			$headers = array(
				'Content-Type'   => 'application/json',
				'X-Hatch-Test'   => '1',
				'X-Hatch-Action' => 'refresh-cache',
			);
			if ( '' !== $secret ) {
				$headers['X-Hatch-Secret'] = $secret;
			}
			$res = Hatch_Revalidate::safe_request(
				'POST',
				$endpoint,
				array(
					'timeout'     => 6,
					'redirection' => 0,
					'blocking'    => true,
					'headers'     => $headers,
					'body'        => wp_json_encode(
						array(
							'event' => 'hatch_refresh',
							'ts'    => time(),
						)
					),
				)
			);
			if ( ! is_wp_error( $res ) ) {
				$pinged = true;
				$status = (int) wp_remote_retrieve_response_code( $res );
			}
		}

		return new WP_REST_Response(
			array(
				'ok'          => true,
				'pinged'      => $pinged,
				'status'      => $status,
				'has_webhook' => '' !== $endpoint,
				'message'     => self::message( $pinged, $rejected ),
			),
			200
		);
	}
}

add_action( 'rest_api_init', array( 'Hatch_Options_Rest', 'register_routes' ) );

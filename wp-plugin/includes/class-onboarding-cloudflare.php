<?php
/**
 * Cloudflare 1-click onboarding — deploys the /blog reverse-proxy Worker
 * to the user's Cloudflare account via the Workers API, then attaches it
 * to a route pattern on their money-domain zone.
 *
 * User pastes a Cloudflare API token with these scopes:
 *   - Workers Scripts:Edit
 *   - Zone:Workers Routes:Edit
 *   - Zone:DNS:Read (used to auto-discover the zone_id)
 *
 * We POST /workers/scripts/hatch-blog with the multipart Worker upload,
 * then POST /zones/{zone_id}/workers/routes with the pattern
 * `{money_domain}/blog/*` bound to the same script.
 *
 * @package Hatch
 * @since 0.5.2
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Onboarding_Cloudflare
 */
class Hatch_Onboarding_Cloudflare {

	const OPTION_STATE = 'hatch_cf_worker_state';
	const SCRIPT_NAME  = 'hatch-blog';
	const API_ROOT     = 'https://api.cloudflare.com/client/v4';

	/**
	 * Deploy the Worker + attach route.
	 *
	 * @param array{token:string, astro_origin:string, money_domain:string, zone_id?:string, account_id?:string} $args
	 * @return array{success:bool, message:string, details?:array<string,mixed>}
	 */
	public static function deploy( array $args ): array {
		$token        = trim( (string) ( $args['token']        ?? '' ) );
		$astro_origin = trim( (string) ( $args['astro_origin'] ?? '' ) );
		$money_domain = trim( (string) ( $args['money_domain'] ?? '' ) );
		$zone_id      = trim( (string) ( $args['zone_id']      ?? '' ) );
		$account_id   = trim( (string) ( $args['account_id']   ?? '' ) );

		if ( '' === $token )        return array( 'success' => false, 'message' => __( 'Cloudflare API token required.', 'hatch' ) );
		if ( '' === $astro_origin ) return array( 'success' => false, 'message' => __( 'Astro origin URL required.',      'hatch' ) );
		if ( '' === $money_domain ) return array( 'success' => false, 'message' => __( 'Money domain required.',           'hatch' ) );

		// Discover account_id + zone_id if not provided (uses one token call each).
		if ( '' === $zone_id || '' === $account_id ) {
			$discovered = self::discover_zone_and_account( $token, $money_domain );
			if ( isset( $discovered['error'] ) ) {
				return array( 'success' => false, 'message' => $discovered['error'] );
			}
			$zone_id    = $zone_id    ?: $discovered['zone_id'];
			$account_id = $account_id ?: $discovered['account_id'];
		}

		// Step 1 — upload the Worker script.
		$script_result = self::upload_worker_script( $token, $account_id, $astro_origin, $money_domain );
		if ( ! $script_result['success'] ) {
			return $script_result;
		}

		// Step 2 — attach the route pattern to the zone.
		$route_result = self::attach_route( $token, $zone_id, $money_domain );
		if ( ! $route_result['success'] ) {
			return $route_result;
		}

		// Persist state so admin can show "deployed at" + a "redeploy" button.
		update_option( self::OPTION_STATE, array(
			'deployed_at'  => time(),
			'account_id'   => $account_id,
			'zone_id'      => $zone_id,
			'route_id'     => $route_result['details']['route_id'] ?? '',
			'money_domain' => $money_domain,
			'astro_origin' => $astro_origin,
			'script_name'  => self::SCRIPT_NAME,
		), false );

		return array(
			'success' => true,
			'message' => sprintf(
				/* translators: 1: money domain */
				__( 'Deployed. Visit %1$s/blog/ to verify.', 'hatch' ),
				esc_url( 'https://' . $money_domain )
			),
			'details' => array(
				'account_id'   => $account_id,
				'zone_id'      => $zone_id,
				'route_id'     => $route_result['details']['route_id'] ?? '',
				'money_domain' => $money_domain,
			),
		);
	}

	/**
	 * Look up zone_id + account_id from an API-token + naked money-domain.
	 *
	 * @return array{zone_id:string, account_id:string}|array{error:string}
	 */
	private static function discover_zone_and_account( string $token, string $money_domain ): array {
		$response = wp_remote_get( self::API_ROOT . '/zones?name=' . rawurlencode( $money_domain ), array(
			'timeout' => 8,
			'headers' => array( 'Authorization' => 'Bearer ' . $token ),
		) );
		if ( is_wp_error( $response ) ) {
			return array( 'error' => sprintf( __( 'Cloudflare API unreachable: %s', 'hatch' ), $response->get_error_message() ) );
		}
		$code = wp_remote_retrieve_response_code( $response );
		if ( 401 === $code || 403 === $code ) {
			return array( 'error' => __( 'API token rejected. Check scopes: Workers Scripts Edit + Zone Workers Routes Edit + Zone DNS Read.', 'hatch' ) );
		}
		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( empty( $body['result'][0]['id'] ) ) {
			return array( 'error' => sprintf( __( 'Zone %s not found in Cloudflare account.', 'hatch' ), $money_domain ) );
		}
		return array(
			'zone_id'    => (string) $body['result'][0]['id'],
			'account_id' => (string) ( $body['result'][0]['account']['id'] ?? '' ),
		);
	}

	/**
	 * PUT the Worker script to /accounts/{acct}/workers/scripts/{script}.
	 *
	 * The Worker is a small reverse-proxy that rewrites paths from
	 * `{money_domain}/blog/<X>` → `{astro_origin}/<X>`, streams the
	 * response back, and swaps origin URLs in the HTML canonicals so
	 * search engines never see the origin.
	 */
	private static function upload_worker_script( string $token, string $account_id, string $astro_origin, string $money_domain ): array {
		$script = self::build_worker_source( $astro_origin, $money_domain );

		// Multipart upload — Cloudflare requires the metadata part FIRST, then the script body.
		$boundary  = wp_generate_password( 24, false );
		$body_lines = array();
		// Part 1: metadata
		$body_lines[] = "--{$boundary}";
		$body_lines[] = 'Content-Disposition: form-data; name="metadata"; filename="metadata.json"';
		$body_lines[] = 'Content-Type: application/json';
		$body_lines[] = '';
		$body_lines[] = wp_json_encode( array( 'main_module' => 'worker.js' ) );
		// Part 2: script
		$body_lines[] = "--{$boundary}";
		$body_lines[] = 'Content-Disposition: form-data; name="worker.js"; filename="worker.js"';
		$body_lines[] = 'Content-Type: application/javascript+module';
		$body_lines[] = '';
		$body_lines[] = $script;
		$body_lines[] = "--{$boundary}--";
		$body        = implode( "\r\n", $body_lines );

		$response = wp_remote_request(
			self::API_ROOT . '/accounts/' . rawurlencode( $account_id ) . '/workers/scripts/' . self::SCRIPT_NAME,
			array(
				'method'  => 'PUT',
				'timeout' => 20,
				'headers' => array(
					'Authorization' => 'Bearer ' . $token,
					'Content-Type'  => 'multipart/form-data; boundary=' . $boundary,
				),
				'body'    => $body,
			)
		);
		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => sprintf( __( 'Worker upload failed: %s', 'hatch' ), $response->get_error_message() ) );
		}
		$code = wp_remote_retrieve_response_code( $response );
		if ( $code < 200 || $code >= 300 ) {
			$body = wp_remote_retrieve_body( $response );
			return array( 'success' => false, 'message' => sprintf( __( 'Worker upload rejected (%1$d): %2$s', 'hatch' ), $code, substr( $body, 0, 500 ) ) );
		}
		return array( 'success' => true, 'message' => __( 'Worker uploaded.', 'hatch' ) );
	}

	/**
	 * POST /zones/{zone_id}/workers/routes with pattern {money_domain}/blog/*.
	 */
	private static function attach_route( string $token, string $zone_id, string $money_domain ): array {
		$pattern = $money_domain . '/blog/*';
		$response = wp_remote_post(
			self::API_ROOT . '/zones/' . rawurlencode( $zone_id ) . '/workers/routes',
			array(
				'timeout' => 10,
				'headers' => array(
					'Authorization' => 'Bearer ' . $token,
					'Content-Type'  => 'application/json',
				),
				'body'    => wp_json_encode( array( 'pattern' => $pattern, 'script' => self::SCRIPT_NAME ) ),
			)
		);
		if ( is_wp_error( $response ) ) {
			return array( 'success' => false, 'message' => sprintf( __( 'Route attach failed: %s', 'hatch' ), $response->get_error_message() ) );
		}
		$code = wp_remote_retrieve_response_code( $response );
		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( $code < 200 || $code >= 300 ) {
			// Route already exists = idempotent success (redeploy path).
			if ( isset( $body['errors'][0]['code'] ) && 10020 === (int) $body['errors'][0]['code'] ) {
				return array( 'success' => true, 'message' => __( 'Route already attached (redeploy).', 'hatch' ), 'details' => array( 'route_id' => '' ) );
			}
			return array( 'success' => false, 'message' => sprintf( __( 'Route attach rejected (%1$d): %2$s', 'hatch' ), $code, wp_json_encode( $body ) ) );
		}
		return array(
			'success' => true,
			'message' => sprintf( __( 'Route attached: %s', 'hatch' ), $pattern ),
			'details' => array( 'route_id' => (string) ( $body['result']['id'] ?? '' ) ),
		);
	}

	/**
	 * Build the Worker source. Reverse-proxies /blog/* to the Astro origin
	 * and rewrites HTML canonicals so Google never sees the origin URL.
	 */
	private static function build_worker_source( string $astro_origin, string $money_domain ): string {
		$astro_origin_safe = wp_json_encode( untrailingslashit( $astro_origin ) );
		$money_domain_safe = wp_json_encode( $money_domain );
		return <<<JS
// Hatch /blog reverse-proxy Worker — auto-generated by wp-admin.
// v0.5.2 — do not edit here; redeploy from wp-admin to update.
const ASTRO_ORIGIN = $astro_origin_safe;
const MONEY_DOMAIN = $money_domain_safe;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    // v0.5.4 P0 fix — exact-match /blog OR strict /blog/ prefix. Was
    // .startsWith('/blog') which greedily matched /blogroll, /blog-post,
    // /blogs — those all 404'd via the Astro origin.
    if (url.pathname !== '/blog' && !url.pathname.startsWith('/blog/')) {
      return fetch(request);
    }
    const target = new URL(url.pathname + url.search, ASTRO_ORIGIN);
    const upstream = await fetch(target.toString(), {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers),
        'Host': new URL(ASTRO_ORIGIN).host,
        'X-Forwarded-Host': MONEY_DOMAIN,
      },
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    });
    // Rewrite absolute canonical URLs from origin → money domain so search
    // engines index the customer-facing path, not the origin URL.
    const contentType = upstream.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return new HTMLRewriter()
        .on('link[rel="canonical"]', {
          element(el) {
            const href = el.getAttribute('href') || '';
            if (href.startsWith(ASTRO_ORIGIN)) {
              el.setAttribute('href', 'https://' + MONEY_DOMAIN + href.substring(ASTRO_ORIGIN.length));
            }
          },
        })
        .transform(upstream);
    }
    return upstream;
  },
};
JS;
	}

	/**
	 * State summary for admin UI.
	 *
	 * @return array{deployed:bool, deployed_at?:int, money_domain?:string, astro_origin?:string, route_id?:string}
	 */
	public static function status(): array {
		$state = get_option( self::OPTION_STATE, null );
		if ( ! is_array( $state ) || empty( $state['deployed_at'] ) ) {
			return array( 'deployed' => false );
		}
		return array_merge( array( 'deployed' => true ), $state );
	}
}

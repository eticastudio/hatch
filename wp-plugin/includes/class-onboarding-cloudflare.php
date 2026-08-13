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
	 * v0.5.5 — subpath is now a first-class parameter. Wizard passes whatever
	 * the user picked ("/blog", "/docs", "/learn", "/kb"). The route pattern,
	 * Worker path check, and canonical rewrite all key off the same value so
	 * an enterprise install can mount at any subfolder without editing code.
	 *
	 * v0.5.9 — mount_mode is now a first-class parameter too. "root" proxies
	 * every path from the money-domain to the Astro origin (whole-site
	 * headless). "subfolder" preserves the previous behavior and only takes
	 * over $subpath (default /blog). The route pattern, Worker source, and
	 * persisted state all key off the selected mode so the wizard's Root vs
	 * Subfolder choice actually reaches the edge.
	 *
	 * @param array{token:string, astro_origin:string, money_domain:string, subpath?:string, mount_mode?:string, zone_id?:string, account_id?:string} $args
	 * @return array{success:bool, message:string, details?:array<string,mixed>}
	 */
	public static function deploy( array $args ): array {
		$token        = trim( (string) ( $args['token']        ?? '' ) );
		$astro_origin = trim( (string) ( $args['astro_origin'] ?? '' ) );
		$money_domain = trim( (string) ( $args['money_domain'] ?? '' ) );
		$zone_id      = trim( (string) ( $args['zone_id']      ?? '' ) );
		$account_id   = trim( (string) ( $args['account_id']   ?? '' ) );
		$subpath      = self::normalize_subpath( (string) ( $args['subpath'] ?? '/blog' ) );
		$mount_mode   = self::normalize_mount_mode( (string) ( $args['mount_mode'] ?? 'subfolder' ) );

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
		$script_result = self::upload_worker_script( $token, $account_id, $astro_origin, $money_domain, $subpath, $mount_mode );
		if ( ! $script_result['success'] ) {
			return $script_result;
		}

		// Step 2 — attach the route pattern to the zone.
		$route_result = self::attach_route( $token, $zone_id, $money_domain, $subpath, $mount_mode );
		if ( ! $route_result['success'] ) {
			return $route_result;
		}

		// Persist state so admin can show "deployed at" + a "redeploy" button,
		// and so the SEO subfolder-rewriter (Hatch_Cf_Seo) knows which prefix
		// to prepend to canonicals / sitemap / robots.
		update_option( self::OPTION_STATE, array(
			'deployed_at'  => time(),
			'account_id'   => $account_id,
			'zone_id'      => $zone_id,
			'route_id'     => $route_result['details']['route_id'] ?? '',
			'money_domain' => $money_domain,
			'astro_origin' => $astro_origin,
			'subpath'      => $subpath,
			'mount_mode'   => $mount_mode,
			'script_name'  => self::SCRIPT_NAME,
		), false );

		// Mirror to top-level option so React admin can read it without
		// unpacking OPTION_STATE. Broker also writes this on prepare.
		update_option( 'hatch_mount_mode', $mount_mode, false );

		$visit_path = 'root' === $mount_mode ? '/' : $subpath . '/';
		return array(
			'success' => true,
			'message' => sprintf(
				/* translators: 1: money domain, 2: path to visit */
				__( 'Deployed. Visit %1$s%2$s to verify.', 'hatch' ),
				esc_url( 'https://' . $money_domain ),
				esc_html( $visit_path )
			),
			'details' => array(
				'account_id'   => $account_id,
				'zone_id'      => $zone_id,
				'route_id'     => $route_result['details']['route_id'] ?? '',
				'money_domain' => $money_domain,
				'subpath'      => $subpath,
				'mount_mode'   => $mount_mode,
			),
		);
	}

	/**
	 * Whitelist mount_mode to the two supported values. Default 'subfolder'
	 * keeps back-compat with any caller that has not been updated to pass
	 * the parameter explicitly.
	 */
	private static function normalize_mount_mode( string $raw ): string {
		$m = strtolower( trim( $raw ) );
		return in_array( $m, array( 'root', 'subfolder' ), true ) ? $m : 'subfolder';
	}

	/**
	 * Coerce a user-typed path into "/xxx" — no trailing slash, always one leading.
	 * Empty/root input falls back to "/blog" (the wizard default) so a partially
	 * filled form never deploys a route that captures the whole domain.
	 */
	private static function normalize_subpath( string $raw ): string {
		$s = trim( $raw );
		if ( '' === $s || '/' === $s ) return '/blog';
		$s = '/' . ltrim( $s, '/' );
		$s = rtrim( $s, '/' );
		// Only ASCII path chars — strip anything a hostile paste could sneak in.
		$s = preg_replace( '#[^a-zA-Z0-9/_-]#', '', $s );
		return '' === $s ? '/blog' : $s;
	}

	/**
	 * List the zones this token can see. Wizard uses it to render a dropdown
	 * of the user's domains so they don't have to type / mis-type the host.
	 *
	 * @return array{success:bool, message?:string, zones?:array<int,array{id:string,name:string,account_id:string}>}
	 */
	public static function list_zones( string $token ): array {
		$token = trim( $token );
		if ( '' === $token ) {
			return array( 'success' => false, 'message' => __( 'Cloudflare API token required.', 'hatch' ) );
		}
		$out  = array();
		$page = 1;
		do {
			$response = wp_remote_get( self::API_ROOT . '/zones?per_page=50&page=' . $page, array(
				'timeout' => 8,
				'headers' => array( 'Authorization' => 'Bearer ' . $token ),
			) );
			if ( is_wp_error( $response ) ) {
				return array( 'success' => false, 'message' => sprintf( /* translators: %s: transport error */ __( 'Cloudflare API unreachable: %s', 'hatch' ), $response->get_error_message() ) );
			}
			$code = wp_remote_retrieve_response_code( $response );
			if ( 401 === $code || 403 === $code ) {
				return array( 'success' => false, 'message' => __( 'API token rejected. Add scopes: Workers Scripts Edit + Zone Workers Routes Edit + Zone DNS Read.', 'hatch' ) );
			}
			$body = json_decode( wp_remote_retrieve_body( $response ), true );
			if ( empty( $body['result'] ) || ! is_array( $body['result'] ) ) break;
			foreach ( $body['result'] as $zone ) {
				$out[] = array(
					'id'         => (string) ( $zone['id']   ?? '' ),
					'name'       => (string) ( $zone['name'] ?? '' ),
					'account_id' => (string) ( $zone['account']['id'] ?? '' ),
				);
			}
			$total_pages = (int) ( $body['result_info']['total_pages'] ?? 1 );
			$page++;
		} while ( $page <= $total_pages && $page <= 10 ); // hard cap 500 zones
		return array( 'success' => true, 'zones' => $out );
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
	private static function upload_worker_script( string $token, string $account_id, string $astro_origin, string $money_domain, string $subpath, string $mount_mode = 'subfolder' ): array {
		$script = self::build_worker_source( $astro_origin, $money_domain, $subpath, $mount_mode );

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
	 * POST /zones/{zone_id}/workers/routes.
	 *
	 * Pattern depends on mount_mode:
	 *   - 'root'      → {money_domain}/*      (whole-site headless)
	 *   - 'subfolder' → {money_domain}{subpath}/*  (e.g. /blog/*)
	 */
	private static function attach_route( string $token, string $zone_id, string $money_domain, string $subpath = '/blog', string $mount_mode = 'subfolder' ): array {
		$pattern = 'root' === $mount_mode
			? $money_domain . '/*'
			: $money_domain . $subpath . '/*';
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
	 * Build the Worker source. Two variants keyed on $mount_mode:
	 *
	 *   - 'subfolder' — reverse-proxies {money_domain}{subpath}/* to the
	 *     Astro origin, rewriting HTML canonicals so Google indexes the
	 *     customer path, not the origin.
	 *   - 'root'      — proxies EVERY path from {money_domain} to the Astro
	 *     origin. No gate. Same canonical rewrite. redirect:'manual' so
	 *     Astro-issued 3xx responses are surfaced unchanged (avoids
	 *     origin URLs leaking through Location headers).
	 */
	private static function build_worker_source( string $astro_origin, string $money_domain, string $subpath = '/blog', string $mount_mode = 'subfolder' ): string {
		$astro_origin_safe = wp_json_encode( untrailingslashit( $astro_origin ) );
		$money_domain_safe = wp_json_encode( $money_domain );
		$subpath_safe      = wp_json_encode( $subpath );

		if ( 'root' === $mount_mode ) {
			return <<<JS
// Hatch root-mount reverse-proxy Worker — auto-generated by wp-admin.
// v0.5.9 — do not edit here; redeploy from wp-admin to update.
// Proxies ALL paths on MONEY_DOMAIN to ASTRO_ORIGIN. Whole-site headless.
const ASTRO_ORIGIN = $astro_origin_safe;
const MONEY_DOMAIN = $money_domain_safe;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = new URL(url.pathname + url.search, ASTRO_ORIGIN);
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set('Host', new URL(ASTRO_ORIGIN).host);
    forwardedHeaders.set('X-Forwarded-Host', MONEY_DOMAIN);
    const upstream = await fetch(target.toString(), {
      method: request.method,
      headers: forwardedHeaders,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    });
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

		// Default: subfolder mount.
		return <<<JS
// Hatch subfolder reverse-proxy Worker — auto-generated by wp-admin.
// v0.5.9 — do not edit here; redeploy from wp-admin to update.
// Proxies {SUBPATH}/* on MONEY_DOMAIN to ASTRO_ORIGIN. Anything outside
// SUBPATH falls through to the money-domain origin unchanged.
const ASTRO_ORIGIN = $astro_origin_safe;
const MONEY_DOMAIN = $money_domain_safe;
const SUBPATH      = $subpath_safe;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    // Exact-match SUBPATH OR strict SUBPATH/ prefix. Prevents greedy
    // matches like /blog matching /blogroll, /blog-post, /blogs.
    if (url.pathname !== SUBPATH && !url.pathname.startsWith(SUBPATH + '/')) {
      return fetch(request);
    }
    const target = new URL(url.pathname + url.search, ASTRO_ORIGIN);
    const forwardedHeaders = new Headers(request.headers);
    forwardedHeaders.set('Host', new URL(ASTRO_ORIGIN).host);
    forwardedHeaders.set('X-Forwarded-Host', MONEY_DOMAIN);
    const upstream = await fetch(target.toString(), {
      method: request.method,
      headers: forwardedHeaders,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    });
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
	 * Always includes mount_mode so React can label the connection card
	 * without a second round-trip. Old installs (deployed pre v0.5.9) that
	 * never wrote the key back-fill to 'subfolder' — that is what they had.
	 *
	 * @return array{deployed:bool, deployed_at?:int, money_domain?:string, astro_origin?:string, route_id?:string, mount_mode?:string}
	 */
	public static function status(): array {
		$state = get_option( self::OPTION_STATE, null );
		if ( ! is_array( $state ) || empty( $state['deployed_at'] ) ) {
			return array( 'deployed' => false, 'mount_mode' => (string) get_option( 'hatch_mount_mode', 'subfolder' ) );
		}
		if ( empty( $state['mount_mode'] ) ) {
			$state['mount_mode'] = (string) get_option( 'hatch_mount_mode', 'subfolder' );
		}
		return array_merge( array( 'deployed' => true ), $state );
	}
}

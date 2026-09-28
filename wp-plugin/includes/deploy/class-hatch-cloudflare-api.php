<?php
/**
 * Minimal Cloudflare REST API client.
 *
 * Original implementation of the public Cloudflare API v4 contract
 * (https://developers.cloudflare.com/api/). It does three things for every
 * call: send the token only to the configured API root, refuse to follow
 * redirects (a redirect would carry the Authorization header to another
 * host), and turn every failure mode into a distinct WP_Error with a
 * message that is safe to show an administrator. Response bodies that are
 * not valid Cloudflare JSON are never echoed.
 *
 * @package Hatch
 * @since   1.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Cloudflare API client bound to one bearer token.
 */
final class Hatch_Cloudflare_Api {

	const DEFAULT_ROOT = 'https://api.cloudflare.com/client/v4';

	/**
	 * Bearer token used for calls that do not override it.
	 *
	 * @var string
	 */
	private $token;

	/**
	 * Create a client.
	 *
	 * @param string $token Cloudflare API token.
	 */
	public function __construct( string $token ) {
		$this->token = trim( $token );
	}

	/**
	 * Keep the token out of var_dump() and print_r() output.
	 *
	 * @return array<string,string>
	 */
	public function __debugInfo() {
		return array( 'token' => '' === $this->token ? '' : '[redacted]' );
	}

	/**
	 * API root, without a trailing slash. Filterable so tests and
	 * self-hosted gateways can point the client elsewhere.
	 *
	 * @return string
	 */
	public static function api_root(): string {
		/**
		 * Filters the Cloudflare API base URL.
		 *
		 * @param string $root Base URL, no trailing slash.
		 */
		$root = (string) apply_filters( 'hatch_cloudflare_api_root', self::DEFAULT_ROOT );
		$root = untrailingslashit( esc_url_raw( $root ) );
		if ( '' === $root ) {
			return self::DEFAULT_ROOT;
		}

		// The token travels to this address, so plain HTTP is accepted only for local test hosts.
		$parts  = wp_parse_url( $root );
		$scheme = is_array( $parts ) && isset( $parts['scheme'] ) ? $parts['scheme'] : '';
		$host   = is_array( $parts ) && isset( $parts['host'] ) ? strtolower( $parts['host'] ) : '';
		if ( 'https' === $scheme && '' !== $host ) {
			return $root;
		}
		$local = array( 'localhost', '127.0.0.1', '[::1]', 'host.docker.internal' );
		if ( 'http' === $scheme && ( in_array( $host, $local, true ) || substr( $host, -10 ) === '.localhost' ) ) {
			return $root;
		}
		return self::DEFAULT_ROOT;
	}

	/**
	 * Send a JSON request.
	 *
	 * @param string              $method HTTP method.
	 * @param string              $path   Path below the API root, starting with a slash.
	 * @param array<string,mixed> $args   Optional: query (array), body (array), timeout (int).
	 * @return array<string,mixed>|WP_Error Decoded Cloudflare envelope on success.
	 */
	public function request( string $method, string $path, array $args = array() ) {
		$url = self::api_root() . $path;
		if ( ! empty( $args['query'] ) && is_array( $args['query'] ) ) {
			$url = add_query_arg( array_map( 'strval', $args['query'] ), $url );
		}

		$headers = array( 'Accept' => 'application/json' );
		$request = array(
			'method'      => strtoupper( $method ),
			'timeout'     => isset( $args['timeout'] ) ? (int) $args['timeout'] : 20,
			'redirection' => 0,
			'headers'     => $headers,
		);
		if ( isset( $args['body'] ) ) {
			$request['headers']['Content-Type'] = 'application/json';
			$request['body']                    = wp_json_encode( $args['body'] );
		}

		return $this->send( $url, $request, isset( $args['bearer'] ) ? (string) $args['bearer'] : $this->token );
	}

	/**
	 * Send a multipart/form-data request.
	 *
	 * @param string                                                            $method  HTTP method.
	 * @param string                                                            $path    Path below the API root.
	 * @param array<int,array{name:string,filename?:string,type?:string,content:string}> $parts Body parts, in order.
	 * @param array<string,mixed>                                               $args    Optional: query (array), timeout (int), bearer (string).
	 * @return array<string,mixed>|WP_Error Decoded Cloudflare envelope on success.
	 */
	public function request_multipart( string $method, string $path, array $parts, array $args = array() ) {
		$url = self::api_root() . $path;
		if ( ! empty( $args['query'] ) && is_array( $args['query'] ) ) {
			$url = add_query_arg( array_map( 'strval', $args['query'] ), $url );
		}

		$boundary = 'hatch' . bin2hex( random_bytes( 12 ) );
		$body     = '';
		foreach ( $parts as $part ) {
			$disposition = 'form-data; name="' . self::quote_header_value( $part['name'] ) . '"';
			if ( isset( $part['filename'] ) ) {
				$disposition .= '; filename="' . self::quote_header_value( $part['filename'] ) . '"';
			}
			$body .= '--' . $boundary . "\r\n";
			$body .= 'Content-Disposition: ' . $disposition . "\r\n";
			if ( isset( $part['type'] ) ) {
				$body .= 'Content-Type: ' . $part['type'] . "\r\n";
			}
			$body .= "\r\n" . $part['content'] . "\r\n";
		}
		$body .= '--' . $boundary . "--\r\n";

		$request = array(
			'method'      => strtoupper( $method ),
			'timeout'     => isset( $args['timeout'] ) ? (int) $args['timeout'] : 60,
			'redirection' => 0,
			'headers'     => array(
				'Accept'       => 'application/json',
				'Content-Type' => 'multipart/form-data; boundary=' . $boundary,
			),
			'body'        => $body,
		);

		return $this->send( $url, $request, isset( $args['bearer'] ) ? (string) $args['bearer'] : $this->token );
	}

	/**
	 * Execute a prepared request and classify the outcome.
	 *
	 * @param string              $url     Full URL.
	 * @param array<string,mixed> $request wp_remote_request() arguments.
	 * @param string              $bearer  Bearer credential for this call.
	 * @return array<string,mixed>|WP_Error
	 */
	private function send( string $url, array $request, string $bearer ) {
		if ( '' === $bearer ) {
			return new WP_Error( 'hatch_cf_no_token', __( 'A Cloudflare API token is required.', 'hatch-bridge' ) );
		}
		$request['headers']['Authorization'] = 'Bearer ' . $bearer;

		$response = wp_remote_request( $url, $request );

		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'hatch_cf_unreachable',
				sprintf(
					/* translators: %s: network error text from the HTTP transport. */
					__( 'Could not reach Cloudflare: %s', 'hatch-bridge' ),
					wp_strip_all_tags( $response->get_error_message() )
				),
				array( 'status' => 502 )
			);
		}

		$status  = (int) wp_remote_retrieve_response_code( $response );
		$raw     = (string) wp_remote_retrieve_body( $response );
		$decoded = json_decode( $raw, true );
		$is_env  = is_array( $decoded ) && array_key_exists( 'success', $decoded );
		$cf_code = 0;
		$cf_text = '';
		if ( $is_env && ! empty( $decoded['errors'][0] ) && is_array( $decoded['errors'][0] ) ) {
			$cf_code = (int) ( $decoded['errors'][0]['code'] ?? 0 );
			$cf_text = sanitize_text_field( (string) ( $decoded['errors'][0]['message'] ?? '' ) );
			$cf_text = function_exists( 'mb_substr' ) ? mb_substr( $cf_text, 0, 200 ) : substr( $cf_text, 0, 200 );
		}
		$data = array(
			'status'  => $status,
			'cf_code' => $cf_code,
		);

		if ( $status >= 300 && $status < 400 ) {
			return new WP_Error(
				'hatch_cf_redirect',
				__( 'Cloudflare answered with a redirect, which Hatch does not follow because it would forward your API token. Check the API address filter.', 'hatch-bridge' ),
				$data
			);
		}

		if ( 429 === $status ) {
			$retry               = min( 3600, max( 0, (int) wp_remote_retrieve_header( $response, 'retry-after' ) ) );
			$data['retry_after'] = $retry;
			return new WP_Error(
				'hatch_cf_rate_limited',
				$retry > 0
					? sprintf(
						/* translators: %d: seconds to wait. */
						_n(
							'Cloudflare is rate limiting this token. Wait %d second and try again.',
							'Cloudflare is rate limiting this token. Wait %d seconds and try again.',
							$retry,
							'hatch-bridge'
						),
						$retry
					)
					: __( 'Cloudflare is rate limiting this token. Wait a minute and try again.', 'hatch-bridge' ),
				$data
			);
		}

		if ( $status >= 500 ) {
			return new WP_Error(
				'hatch_cf_unavailable',
				sprintf(
					/* translators: %d: HTTP status code. */
					__( 'Cloudflare is having trouble right now (HTTP %d). Nothing was changed on your account. Try again in a few minutes.', 'hatch-bridge' ),
					$status
				),
				$data
			);
		}

		if ( 401 === $status ) {
			return new WP_Error(
				'hatch_cf_auth',
				__( 'Cloudflare rejected the API token. Check that it was copied in full and has not been revoked or expired.', 'hatch-bridge' ),
				$data
			);
		}

		if ( 403 === $status ) {
			return new WP_Error(
				'hatch_cf_permission',
				'' !== $cf_text
					? sprintf(
						/* translators: %s: message returned by Cloudflare. */
						__( 'The API token does not have permission for this step. Cloudflare said: %s', 'hatch-bridge' ),
						$cf_text
					)
					: __( 'The API token does not have permission for this step. Add the missing permission and try again.', 'hatch-bridge' ),
				$data
			);
		}

		if ( $status < 200 || $status >= 300 ) {
			return new WP_Error(
				'hatch_cf_rejected',
				'' !== $cf_text
					? sprintf(
						/* translators: 1: HTTP status code, 2: message returned by Cloudflare. */
						__( 'Cloudflare rejected the request (HTTP %1$d): %2$s', 'hatch-bridge' ),
						$status,
						$cf_text
					)
					: sprintf(
						/* translators: %d: HTTP status code. */
						__( 'Cloudflare rejected the request (HTTP %d).', 'hatch-bridge' ),
						$status
					),
				$data
			);
		}

		// A 2xx that is not a Cloudflare envelope (captive portal, proxy error page, truncated JSON).
		if ( ! $is_env ) {
			return new WP_Error(
				'hatch_cf_bad_response',
				__( 'Cloudflare returned a reply Hatch could not read, so nothing was marked as deployed. A proxy or firewall on this server may be rewriting outbound traffic.', 'hatch-bridge' ),
				$data
			);
		}

		if ( true !== $decoded['success'] ) {
			return new WP_Error(
				'hatch_cf_failed',
				'' !== $cf_text
					? sprintf(
						/* translators: %s: message returned by Cloudflare. */
						__( 'Cloudflare reported a failure: %s', 'hatch-bridge' ),
						$cf_text
					)
					: __( 'Cloudflare reported a failure without a reason.', 'hatch-bridge' ),
				$data
			);
		}

		return $decoded;
	}

	/**
	 * Strip characters that could break out of a quoted multipart header value.
	 *
	 * @param string $value Raw value.
	 * @return string
	 */
	private static function quote_header_value( string $value ): string {
		return str_replace( array( '"', "\r", "\n", '\\' ), '', $value );
	}
}

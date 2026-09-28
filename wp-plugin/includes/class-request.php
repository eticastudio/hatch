<?php
/**
 * Sanitised readers for the few request values Hatch takes from $_SERVER and $_COOKIE.
 *
 * Every value is unslashed and sanitised at the single place it is read, so
 * callers never handle a raw superglobal. None of these values is trusted:
 * callers still validate the shape they need (an IP with filter_var(), a token
 * with its signature check, a path against an allowlist).
 *
 * @package Hatch
 * @since   1.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Request value readers.
 */
final class Hatch_Request {

	/**
	 * A $_SERVER value as a plain-text string, or "" when it is not set.
	 *
	 * @param string $key Server variable name, for example "REMOTE_ADDR".
	 * @return string
	 */
	public static function server( string $key ): string {
		if ( ! isset( $_SERVER[ $key ] ) || ! is_string( $_SERVER[ $key ] ) ) {
			return '';
		}
		return sanitize_text_field( wp_unslash( $_SERVER[ $key ] ) );
	}

	/**
	 * A cookie value as a plain-text string, or "" when it is not set.
	 *
	 * @param string $name Cookie name.
	 * @return string
	 */
	public static function cookie( string $name ): string {
		if ( ! isset( $_COOKIE[ $name ] ) || ! is_string( $_COOKIE[ $name ] ) ) {
			return '';
		}
		return sanitize_text_field( wp_unslash( $_COOKIE[ $name ] ) );
	}

	/**
	 * The requested path and query, percent-encoding preserved.
	 *
	 * @return string "" when the server did not provide one.
	 */
	public static function request_uri(): string {
		if ( ! isset( $_SERVER['REQUEST_URI'] ) || ! is_string( $_SERVER['REQUEST_URI'] ) ) {
			return '';
		}
		return esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) );
	}

	/**
	 * The Authorization header, including the value some hosts rewrite to REDIRECT_HTTP_AUTHORIZATION.
	 *
	 * @return string
	 */
	public static function authorization(): string {
		$header = self::server( 'HTTP_AUTHORIZATION' );
		return '' !== $header ? $header : self::server( 'REDIRECT_HTTP_AUTHORIZATION' );
	}
}

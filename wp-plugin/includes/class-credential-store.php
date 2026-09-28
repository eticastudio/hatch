<?php
/**
 * Encrypted storage for the deploy API token.
 *
 * The Cloudflare API token is encrypted at rest with AES-256-GCM so a
 * database dump or a stray option export does not expose it. The key is
 * derived from the site's own WordPress salt (wp_salt( 'auth' )) and is
 * never stored. Anyone who can read both the database and wp-config.php can
 * still decrypt it, which is the same trust boundary WordPress applies to
 * its own auth cookies.
 *
 * The token is never returned by a REST route, never written to a log and
 * never placed in a URL. A stored token that cannot be decrypted (for
 * example because the site salts were rotated) is reported as missing and
 * left in place; the administrator pastes a new one.
 *
 * Storage: option "hatch_enc_token_{provider}", autoload off.
 * Format:  "v2:" . hex( IV[12] . GCM tag[16] . ciphertext ).
 *
 * @package Hatch
 * @since   0.48.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Credential store.
 */
final class Hatch_Credential_Store {

	const OPTION_PREFIX = 'hatch_enc_token_';
	const CIPHER        = 'aes-256-gcm';
	const IV_LEN        = 12;
	const TAG_LEN       = 16;
	const FORMAT        = 'v2:';

	/**
	 * Derive the 32-byte encryption key. Recomputed on demand, never stored.
	 *
	 * @return string Raw binary key.
	 */
	private static function derive_key(): string {
		return hash_hmac( 'sha256', 'hatch-credential-store-v2', wp_salt( 'auth' ), true );
	}

	/**
	 * Whether this server can encrypt with AES-256-GCM.
	 *
	 * @return bool
	 */
	public static function is_supported(): bool {
		return function_exists( 'openssl_encrypt' )
			&& function_exists( 'random_bytes' )
			&& in_array( self::CIPHER, openssl_get_cipher_methods(), true );
	}

	/**
	 * Encrypt and store a token.
	 *
	 * @param string $provider Provider id, for example "cloudflare".
	 * @param string $token    Raw API token.
	 * @return bool True when the token was stored.
	 */
	public static function store( string $provider, string $token ): bool {
		$provider = sanitize_key( $provider );
		if ( '' === $token || '' === $provider || ! self::is_supported() ) {
			return false;
		}

		try {
			$iv = random_bytes( self::IV_LEN );
		} catch ( Exception $e ) {
			return false;
		}
		$tag    = '';
		$cipher = openssl_encrypt( $token, self::CIPHER, self::derive_key(), OPENSSL_RAW_DATA, $iv, $tag, '', self::TAG_LEN );
		if ( false === $cipher || self::TAG_LEN !== strlen( $tag ) ) {
			return false;
		}

		update_option( self::OPTION_PREFIX . $provider, self::FORMAT . bin2hex( $iv . $tag . $cipher ), false );
		return true;
	}

	/**
	 * Decrypt and return a stored token.
	 *
	 * @param string $provider Provider id.
	 * @return string Plaintext token, or "" when nothing usable is stored.
	 */
	public static function retrieve( string $provider ): string {
		if ( ! self::is_supported() ) {
			return '';
		}
		$blob = (string) get_option( self::OPTION_PREFIX . sanitize_key( $provider ), '' );
		if ( 0 !== strpos( $blob, self::FORMAT ) ) {
			return '';
		}
		$hex = substr( $blob, strlen( self::FORMAT ) );
		if ( '' === $hex || 0 !== strlen( $hex ) % 2 || ! ctype_xdigit( $hex ) ) {
			return '';
		}
		$raw = hex2bin( $hex );
		if ( false === $raw || strlen( $raw ) <= self::IV_LEN + self::TAG_LEN ) {
			return '';
		}

		$iv     = substr( $raw, 0, self::IV_LEN );
		$tag    = substr( $raw, self::IV_LEN, self::TAG_LEN );
		$cipher = substr( $raw, self::IV_LEN + self::TAG_LEN );
		$plain  = openssl_decrypt( $cipher, self::CIPHER, self::derive_key(), OPENSSL_RAW_DATA, $iv, $tag );

		return false === $plain ? '' : $plain;
	}

	/**
	 * Whether a token is stored and can be decrypted on this site.
	 *
	 * @param string $provider Provider id.
	 * @return bool
	 */
	public static function has( string $provider ): bool {
		return '' !== self::retrieve( $provider );
	}

	/**
	 * Delete the stored token.
	 *
	 * @param string $provider Provider id.
	 * @return void
	 */
	public static function clear( string $provider ): void {
		delete_option( self::OPTION_PREFIX . sanitize_key( $provider ) );
	}
}

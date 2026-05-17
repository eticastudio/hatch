<?php
/**
 * Hatch Credential Store — v0.48.0.
 *
 * Encrypts deploy tokens (Cloudflare API token, Vercel access token) at rest
 * using AES-256-GCM. Lets users re-deploy without re-pasting their token.
 *
 * Storage  : wp_options rows 'hatch_enc_token_{provider}' (autoload=false).
 * Key      : HMAC-SHA256( AUTH_KEY, home_url() + '|hatch-cred-v1' ) — 32 bytes.
 * Blob     : base64( IV[12] + GCM-Tag[16] + Ciphertext ).
 *
 * @package Hatch
 * @since   0.48.0
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Credential_Store {

	const OPTION_PREFIX = 'hatch_enc_token_';
	const CIPHER        = 'aes-256-gcm';
	const IV_LEN        = 12;
	const TAG_LEN       = 16;

	/**
	 * Derive a 32-byte encryption key from WP secret keys + site URL.
	 * Never stored; recomputed on demand.
	 */
	private static function derive_key(): string {
		$salt = defined( 'AUTH_KEY' ) ? AUTH_KEY : 'hatch-fallback-no-auth-key';
		return hash_hmac( 'sha256', home_url() . '|hatch-cred-v1', $salt, true );
	}

	/**
	 * Encrypt and store a deploy token.
	 *
	 * @param string $provider 'cloudflare' or 'vercel'.
	 * @param string $token    Raw API token.
	 * @return bool True on success.
	 */
	public static function store( string $provider, string $token ): bool {
		$provider = sanitize_key( $provider );
		if ( '' === $token || '' === $provider ) {
			return false;
		}
		if ( ! function_exists( 'openssl_encrypt' ) ) {
			return false;
		}

		$key = self::derive_key();
		$iv  = random_bytes( self::IV_LEN );
		$tag = '';

		$cipher = openssl_encrypt(
			$token,
			self::CIPHER,
			$key,
			OPENSSL_RAW_DATA,
			$iv,
			$tag,
			'',
			self::TAG_LEN
		);

		if ( false === $cipher ) {
			return false;
		}

		// Blob layout: IV (12 bytes) | GCM-Tag (16 bytes) | Ciphertext
		update_option( self::OPTION_PREFIX . $provider, base64_encode( $iv . $tag . $cipher ), false );
		return true;
	}

	/**
	 * Decrypt and return a stored token.
	 *
	 * @param string $provider 'cloudflare' or 'vercel'.
	 * @return string Plaintext token, or '' if not stored / decryption fails.
	 */
	public static function retrieve( string $provider ): string {
		$provider = sanitize_key( $provider );
		$blob     = (string) get_option( self::OPTION_PREFIX . $provider, '' );
		if ( '' === $blob ) {
			return '';
		}

		$raw = base64_decode( $blob, true );
		if ( false === $raw || strlen( $raw ) <= ( self::IV_LEN + self::TAG_LEN ) ) {
			return '';
		}

		$iv     = substr( $raw, 0, self::IV_LEN );
		$tag    = substr( $raw, self::IV_LEN, self::TAG_LEN );
		$cipher = substr( $raw, self::IV_LEN + self::TAG_LEN );
		$key    = self::derive_key();

		$plain = openssl_decrypt( $cipher, self::CIPHER, $key, OPENSSL_RAW_DATA, $iv, $tag );

		// v0.49.3: if decryption fails (e.g., AUTH_KEY salts rotated by host),
		// the stored blob is permanently unrecoverable. Auto-clear so the UI
		// falls back to the wizard re-paste flow instead of silently failing.
		if ( false === $plain ) {
			delete_option( self::OPTION_PREFIX . $provider );
			return '';
		}
		return $plain;
	}

	/**
	 * Whether an encrypted token exists for the given provider.
	 *
	 * @param string $provider 'cloudflare' or 'vercel'.
	 */
	public static function has( string $provider ): bool {
		return '' !== (string) get_option( self::OPTION_PREFIX . sanitize_key( $provider ), '' );
	}

	/**
	 * Delete the stored token for the given provider.
	 *
	 * @param string $provider 'cloudflare' or 'vercel'.
	 */
	public static function clear( string $provider ): void {
		delete_option( self::OPTION_PREFIX . sanitize_key( $provider ) );
	}

	/**
	 * Map a hosting-model string (from Hatch_Connection_Status) to the
	 * provider key used by this store.
	 *
	 * @param string $model e.g. 'cloudflare-pages', 'vercel'.
	 * @return string 'cloudflare', 'vercel', or '' for unknown models.
	 */
	public static function provider_for_model( string $model ): string {
		if ( 'vercel' === $model ) {
			return 'vercel';
		}
		if ( str_starts_with( $model, 'cloudflare' ) ) {
			return 'cloudflare';
		}
		return '';
	}
}

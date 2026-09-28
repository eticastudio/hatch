<?php
/**
 * Reader for the prebuilt frontend bundle that ships inside the plugin.
 *
 * The bundle directory holds the compiled Astro server build. It is
 * generated from the public source in this repository by
 * scripts/build-frontend-bundle.sh and contains:
 *
 *   bundle.json   Metadata (versions, compatibility date and flags, main module,
 *                 and the placeholder addresses the build was compiled with).
 *   worker/       Worker modules (.mjs, .wasm), uploaded as script parts.
 *   assets/       Static files served by Workers Static Assets.
 *
 * This class only reads and validates those files. It never executes them.
 *
 * @package Hatch
 * @since   1.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Prebuilt frontend bundle.
 */
final class Hatch_Frontend_Bundle {

	const MAX_FILES = 20000;
	const MAX_BYTES = 67108864; // 64 MB of files in total.

	/**
	 * Names of the build-time addresses that are replaced when the Worker is uploaded.
	 *
	 * Astro writes public server variables into the compiled code at build time, so the
	 * shipped build carries fixed placeholder addresses (see scripts/build-frontend-bundle.sh)
	 * and each site's real addresses are substituted here.
	 */
	const PLACEHOLDER_KEYS = array( 'wp_api_url', 'site_url', 'wp_origin' );

	/**
	 * Absolute bundle directory, with trailing slash.
	 *
	 * @var string
	 */
	private $dir;

	/**
	 * Parsed bundle.json.
	 *
	 * @var array<string,mixed>|null
	 */
	private $meta = null;

	/**
	 * Cached manifest: path => array(hash, size, file, type).
	 *
	 * @var array<string,array<string,mixed>>|null
	 */
	private $manifest = null;

	/**
	 * Create a reader.
	 *
	 * @param string $dir Bundle directory. Defaults to the plugin's own.
	 */
	public function __construct( string $dir = '' ) {
		if ( '' === $dir ) {
			$dir = HATCH_PLUGIN_DIR . 'frontend-bundle';
		}
		$this->dir = trailingslashit( $dir );
	}

	/**
	 * Check that the bundle is present and consistent.
	 *
	 * @return true|WP_Error
	 */
	public function validate() {
		$meta = $this->get_meta();
		if ( is_wp_error( $meta ) ) {
			return $meta;
		}
		$modules = $this->list_worker_files();
		if ( is_wp_error( $modules ) ) {
			return $modules;
		}
		if ( ! isset( $modules[ $meta['main_module'] ] ) ) {
			return new WP_Error( 'hatch_bundle_invalid', __( 'The bundled frontend is incomplete: its entry module is missing.', 'hatch-bridge' ) );
		}
		$manifest = $this->get_manifest();
		if ( is_wp_error( $manifest ) ) {
			return $manifest;
		}
		return true;
	}

	/**
	 * Bundle metadata.
	 *
	 * @return array{version:string,main_module:string,compatibility_date:string,compatibility_flags:array<int,string>,assets_config:array<string,string>,placeholders:array<string,string>}|WP_Error
	 */
	public function get_meta() {
		if ( null !== $this->meta ) {
			return $this->meta;
		}
		$file = $this->dir . 'bundle.json';
		if ( ! is_readable( $file ) ) {
			return new WP_Error( 'hatch_bundle_missing', __( 'The bundled frontend is missing from this copy of the plugin. Reinstall the plugin from WordPress.org.', 'hatch-bridge' ) );
		}
		$raw  = file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local plugin file, not a remote URL.
		$data = is_string( $raw ) ? json_decode( $raw, true ) : null;
		if ( ! is_array( $data ) || empty( $data['main_module'] ) || empty( $data['compatibility_date'] ) ) {
			return new WP_Error( 'hatch_bundle_invalid', __( 'The bundled frontend metadata is unreadable. Reinstall the plugin from WordPress.org.', 'hatch-bridge' ) );
		}
		if ( ! self::is_safe_relative_path( (string) $data['main_module'] ) ) {
			return new WP_Error( 'hatch_bundle_invalid', __( 'The bundled frontend metadata is invalid.', 'hatch-bridge' ) );
		}
		$flags = array();
		if ( isset( $data['compatibility_flags'] ) && is_array( $data['compatibility_flags'] ) ) {
			foreach ( $data['compatibility_flags'] as $flag ) {
				if ( is_string( $flag ) && 1 === preg_match( '/^[a-z0-9_]+$/', $flag ) ) {
					$flags[] = $flag;
				}
			}
		}
		$config = array();
		if ( isset( $data['assets_config'] ) && is_array( $data['assets_config'] ) ) {
			foreach ( array( 'html_handling', 'not_found_handling' ) as $key ) {
				if ( isset( $data['assets_config'][ $key ] ) && is_string( $data['assets_config'][ $key ] ) ) {
					$config[ $key ] = $data['assets_config'][ $key ];
				}
			}
		}
		$placeholders = array();
		if ( isset( $data['placeholders'] ) && is_array( $data['placeholders'] ) ) {
			foreach ( self::PLACEHOLDER_KEYS as $key ) {
				if ( isset( $data['placeholders'][ $key ] ) && is_string( $data['placeholders'][ $key ] ) && 1 === preg_match( '#^https://[a-z0-9.-]+\.invalid(/[A-Za-z0-9._/-]*)?$#', $data['placeholders'][ $key ] ) ) {
					$placeholders[ $key ] = $data['placeholders'][ $key ];
				}
			}
		}
		$this->meta = array(
			'version'             => isset( $data['version'] ) ? sanitize_text_field( (string) $data['version'] ) : '',
			'main_module'         => (string) $data['main_module'],
			'compatibility_date'  => sanitize_text_field( (string) $data['compatibility_date'] ),
			'compatibility_flags' => $flags,
			'assets_config'       => $config,
			'placeholders'        => $placeholders,
		);
		return $this->meta;
	}

	/**
	 * Worker module parts, ready for a multipart upload.
	 *
	 * @param array<string,string> $values Real addresses keyed like PLACEHOLDER_KEYS; each replaces its build-time placeholder in the JavaScript modules.
	 * @return array<int,array{name:string,filename:string,type:string,content:string}>|WP_Error
	 */
	public function get_worker_parts( array $values = array() ) {
		$files = $this->list_worker_files();
		if ( is_wp_error( $files ) ) {
			return $files;
		}
		$meta = $this->get_meta();
		if ( is_wp_error( $meta ) ) {
			return $meta;
		}
		$search  = array();
		$replace = array();
		foreach ( $meta['placeholders'] as $key => $placeholder ) {
			if ( isset( $values[ $key ] ) && '' !== $values[ $key ] ) {
				$search[]  = $placeholder;
				$replace[] = $values[ $key ];
			}
		}
		$parts = array();
		foreach ( $files as $name => $file ) {
			$content = file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local plugin file, not a remote URL.
			if ( false === $content ) {
				return new WP_Error( 'hatch_bundle_unreadable', __( 'A bundled frontend file could not be read.', 'hatch-bridge' ) );
			}
			$is_wasm = 'wasm' === strtolower( self::extension_of( $name ) );
			if ( ! $is_wasm && ! empty( $search ) ) {
				$content = str_replace( $search, $replace, $content );
			}
			$parts[] = array(
				'name'     => $name,
				'filename' => $name,
				'type'     => $is_wasm ? 'application/wasm' : 'application/javascript+module',
				'content'  => $content,
			);
		}
		return $parts;
	}

	/**
	 * Static asset manifest in the shape the Cloudflare upload session expects.
	 *
	 * @return array<string,array{hash:string,size:int}>|WP_Error
	 */
	public function get_asset_manifest() {
		$manifest = $this->get_manifest();
		if ( is_wp_error( $manifest ) ) {
			return $manifest;
		}
		$out = array();
		foreach ( $manifest as $path => $entry ) {
			$out[ $path ] = array(
				'hash' => $entry['hash'],
				'size' => $entry['size'],
			);
		}
		return $out;
	}

	/**
	 * Load one asset by its manifest hash.
	 *
	 * @param string $hash Manifest hash.
	 * @return array{content:string,type:string}|WP_Error Base64 content and MIME type.
	 */
	public function get_asset_payload( string $hash ) {
		$manifest = $this->get_manifest();
		if ( is_wp_error( $manifest ) ) {
			return $manifest;
		}
		foreach ( $manifest as $entry ) {
			if ( $entry['hash'] !== $hash ) {
				continue;
			}
			$content = file_get_contents( $entry['file'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local plugin file, not a remote URL.
			if ( false === $content ) {
				return new WP_Error( 'hatch_bundle_unreadable', __( 'A bundled frontend file could not be read.', 'hatch-bridge' ) );
			}
			return array(
				'content' => self::encode( $content ),
				'type'    => $entry['type'],
			);
		}
		return new WP_Error( 'hatch_bundle_unknown_asset', __( 'Cloudflare asked for a file that is not part of the bundled frontend.', 'hatch-bridge' ) );
	}

	/**
	 * Build the asset manifest by scanning assets/.
	 *
	 * @return array<string,array<string,mixed>>|WP_Error
	 */
	private function get_manifest() {
		if ( null !== $this->manifest ) {
			return $this->manifest;
		}
		$files = $this->scan( $this->dir . 'assets' );
		if ( is_wp_error( $files ) ) {
			return $files;
		}
		if ( empty( $files ) ) {
			return new WP_Error( 'hatch_bundle_invalid', __( 'The bundled frontend has no static files. Reinstall the plugin from WordPress.org.', 'hatch-bridge' ) );
		}
		$manifest = array();
		foreach ( $files as $relative => $file ) {
			$content = file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local plugin file, not a remote URL.
			if ( false === $content ) {
				return new WP_Error( 'hatch_bundle_unreadable', __( 'A bundled frontend file could not be read.', 'hatch-bridge' ) );
			}
			$extension = self::extension_of( $relative );
			// Content hash defined by the Cloudflare static assets API: first 32 hex characters of sha256(base64(content) + extension).
			$hash                        = substr( hash( 'sha256', self::encode( $content ) . $extension ), 0, 32 );
			$manifest[ '/' . $relative ] = array(
				'hash' => $hash,
				'size' => strlen( $content ),
				'file' => $file,
				'type' => self::mime_for( strtolower( $extension ) ),
			);
		}
		$this->manifest = $manifest;
		return $this->manifest;
	}

	/**
	 * Worker module files, keyed by their path inside worker/.
	 *
	 * @return array<string,string>|WP_Error
	 */
	private function list_worker_files() {
		$files = $this->scan( $this->dir . 'worker' );
		if ( is_wp_error( $files ) ) {
			return $files;
		}
		foreach ( array_keys( $files ) as $name ) {
			if ( ! in_array( strtolower( self::extension_of( $name ) ), array( 'mjs', 'js', 'wasm' ), true ) ) {
				return new WP_Error( 'hatch_bundle_invalid', __( 'The bundled frontend contains an unexpected file type.', 'hatch-bridge' ) );
			}
		}
		return $files;
	}

	/**
	 * Recursively list files below a directory.
	 *
	 * @param string $root Directory to scan.
	 * @return array<string,string>|WP_Error Relative path => absolute path.
	 */
	private function scan( string $root ) {
		if ( ! is_dir( $root ) ) {
			return new WP_Error( 'hatch_bundle_missing', __( 'The bundled frontend is missing from this copy of the plugin. Reinstall the plugin from WordPress.org.', 'hatch-bridge' ) );
		}
		$root  = untrailingslashit( $root );
		$found = array();
		$bytes = 0;
		$iter  = new RecursiveIteratorIterator(
			new RecursiveDirectoryIterator( $root, FilesystemIterator::SKIP_DOTS ),
			RecursiveIteratorIterator::LEAVES_ONLY
		);
		foreach ( $iter as $file ) {
			if ( ! $file->isFile() || $file->isLink() ) {
				continue;
			}
			$relative = ltrim( str_replace( '\\', '/', substr( $file->getPathname(), strlen( $root ) ) ), '/' );
			if ( ! self::is_safe_relative_path( $relative ) ) {
				return new WP_Error( 'hatch_bundle_invalid', __( 'The bundled frontend contains an unexpected file name.', 'hatch-bridge' ) );
			}
			$bytes += (int) $file->getSize();
			if ( count( $found ) >= self::MAX_FILES || $bytes > self::MAX_BYTES ) {
				return new WP_Error( 'hatch_bundle_invalid', __( 'The bundled frontend is larger than expected.', 'hatch-bridge' ) );
			}
			$found[ $relative ] = $file->getPathname();
		}
		ksort( $found );
		return $found;
	}

	/**
	 * Base64 encode file content, as the Cloudflare upload API requires.
	 *
	 * @param string $content Raw bytes.
	 * @return string
	 */
	private static function encode( string $content ): string {
		return base64_encode( $content ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode -- Transport encoding mandated by the Cloudflare static assets API, not obfuscation.
	}

	/**
	 * Allow only plain relative paths made of safe characters.
	 *
	 * @param string $path Relative path.
	 * @return bool
	 */
	private static function is_safe_relative_path( string $path ): bool {
		if ( '' === $path || strlen( $path ) > 255 ) {
			return false;
		}
		if ( '/' === $path[0] || 1 !== preg_match( '#^[A-Za-z0-9._@+/-]+$#', $path ) ) {
			return false;
		}
		// Reject traversal by path segment: a file name such as "_.._abc.mjs" is fine, a segment of "." or ".." is not.
		foreach ( explode( '/', $path ) as $segment ) {
			if ( '' === $segment || '.' === $segment || '..' === $segment ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Extension without the dot, in its original case.
	 *
	 * @param string $path File path.
	 * @return string
	 */
	private static function extension_of( string $path ): string {
		$dot = strrpos( basename( $path ), '.' );
		return false === $dot ? '' : substr( basename( $path ), $dot + 1 );
	}

	/**
	 * MIME type Cloudflare will serve a static file with.
	 *
	 * @param string $extension Lowercase extension without the dot.
	 * @return string
	 */
	private static function mime_for( string $extension ): string {
		$map = array(
			'html'        => 'text/html',
			'css'         => 'text/css',
			'js'          => 'application/javascript',
			'mjs'         => 'application/javascript',
			'json'        => 'application/json',
			'webmanifest' => 'application/manifest+json',
			'xml'         => 'application/xml',
			'txt'         => 'text/plain',
			'svg'         => 'image/svg+xml',
			'png'         => 'image/png',
			'jpg'         => 'image/jpeg',
			'jpeg'        => 'image/jpeg',
			'gif'         => 'image/gif',
			'webp'        => 'image/webp',
			'avif'        => 'image/avif',
			'ico'         => 'image/x-icon',
			'woff'        => 'font/woff',
			'woff2'       => 'font/woff2',
			'map'         => 'application/json',
		);
		return $map[ $extension ] ?? 'application/octet-stream';
	}
}

<?php
/**
 * Hatch Design Loader — user-editable design tokens via a `design.md` paste.
 *
 * Concept: the user describes their brand in a single Markdown file with a
 * YAML frontmatter block. Hatch parses it, validates the known keys, and
 * exposes them on /hatch/v1/design. The Astro starter reads that endpoint
 * at SSR time and injects CSS variables + swaps fonts. No AI tokens needed
 * at runtime — the schema is rule-based and predictable.
 *
 * Expected frontmatter shape:
 *
 *   ---
 *   brand:
 *     name: My Blog
 *     primary: "#5b21b6"
 *     accent: "#f59e0b"
 *     fg: "#0a0a0a"
 *     bg: "#ffffff"
 *     font_heading: "Outfit"
 *     font_body: "Inter"
 *     font_mono: "JetBrains Mono"
 *     mode: light | dark | auto
 *   layout:
 *     density: compact | comfortable | spacious
 *     rounded: sharp | smooth | extra
 *     max_width: 720 | 1080 | 1280
 *   voice:
 *     tone: professional | casual | playful
 *     pronouns: we | I | you
 *   ---
 *
 * Body below the frontmatter is stored verbatim — used later for AI rebuilds
 * (v0.30+) but currently rendered as a Markdown preview in the admin tab.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Design_Loader {

	const OPTION_KEY      = 'hatch_design_md';     // raw markdown
	const OPTION_PARSED   = 'hatch_design_parsed'; // parsed array, cached

	/**
	 * Allowed values per token. Keeps the JSON shape tight + predictable.
	 *
	 * @return array
	 */
	public static function allowed(): array {
		return array(
			'brand.mode'                   => array( 'light', 'dark', 'auto' ),
			'layout.density'               => array( 'compact', 'comfortable', 'spacious' ),
			'layout.rounded'               => array( 'sharp', 'smooth', 'extra' ),
			'layout.max_width'             => array( '720', '1080', '1280' ),
			'voice.tone'                   => array( 'professional', 'casual', 'playful' ),
			'voice.pronouns'               => array( 'we', 'I', 'you' ),
			// Templates — layout control per page type.
			'templates.single_sidebar'     => array( 'right', 'left', 'none' ),
			'templates.single_hero'        => array( 'featured', 'compact', 'none' ),
			'templates.single_width'       => array( 'narrow', 'medium', 'wide' ),
			'templates.archive_grid'       => array( '1', '2', '3' ),
			'templates.archive_card_style' => array( 'default', 'minimal', 'text' ),
			'templates.archive_excerpt'    => array( 'true', 'false' ),
			'templates.not_found_search'   => array( 'true', 'false' ),
		);
	}

	/**
	 * Defaults applied when a key is missing.
	 *
	 * @return array
	 */
	public static function defaults(): array {
		return array(
			'brand' => array(
				'name'         => '',
				'primary'      => '#ff6b35',
				'accent'       => '#0a0a0a',
				'fg'           => '#0a0a0a',
				'bg'           => '#ffffff',
				'font_heading' => 'Inter',
				'font_body'    => 'Inter',
				'font_mono'    => 'JetBrains Mono',
				'mode'         => 'auto',
			),
			'layout' => array(
				'density'   => 'comfortable',
				'rounded'   => 'smooth',
				'max_width' => '1080',
			),
			'voice' => array(
				'tone'     => 'professional',
				'pronouns' => 'we',
			),
			'templates' => array(
				'single_sidebar'     => 'right',
				'single_hero'        => 'featured',
				'single_width'       => 'medium',
				'archive_grid'       => '2',
				'archive_card_style' => 'default',
				'archive_excerpt'    => 'true',
				'not_found_search'   => 'true',
			),
			'body' => '',
		);
	}

	/**
	 * Get the parsed design tokens, merged with defaults.
	 *
	 * @return array
	 */
	public static function get_design(): array {
		$cached = get_option( self::OPTION_PARSED, null );
		if ( is_array( $cached ) ) {
			return self::merge_with_defaults( $cached );
		}
		return self::defaults();
	}

	/**
	 * Save a raw markdown string. Parses, validates, and caches the result.
	 *
	 * @param string $raw_md Raw design.md content.
	 * @return array{ok:bool, parsed:array, errors:array}
	 */
	public static function save( string $raw_md ): array {
		$raw_md = (string) wp_unslash( $raw_md );

		// Hard limit: 64 KB. Designs are tokens, not novels.
		if ( strlen( $raw_md ) > 65536 ) {
			return array( 'ok' => false, 'parsed' => array(), 'errors' => array( 'design.md exceeds 64 KB. Keep it tight.' ) );
		}

		$parsed = self::parse( $raw_md );
		if ( ! empty( $parsed['errors'] ) ) {
			return array( 'ok' => false, 'parsed' => $parsed['data'], 'errors' => $parsed['errors'] );
		}

		update_option( self::OPTION_KEY, $raw_md, false );
		update_option( self::OPTION_PARSED, $parsed['data'], false );

		return array( 'ok' => true, 'parsed' => $parsed['data'], 'errors' => array() );
	}

	/**
	 * Get the raw markdown source (for re-editing in the admin tab).
	 *
	 * @return string
	 */
	public static function get_raw(): string {
		return (string) get_option( self::OPTION_KEY, '' );
	}

	/**
	 * Reset everything to defaults.
	 *
	 * @return void
	 */
	public static function clear(): void {
		delete_option( self::OPTION_KEY );
		delete_option( self::OPTION_PARSED );
	}

	/* ----------------------------------------------------------------
	 * Parser
	 * ---------------------------------------------------------------- */

	/**
	 * Parse a design.md file. Returns { data: array, errors: array<string> }.
	 *
	 * @param string $md
	 * @return array
	 */
	public static function parse( string $md ): array {
		$errors = array();
		$body   = $md;
		$front  = '';

		if ( preg_match( '/^---\s*\n(.*?)\n---\s*\n?(.*)$/s', $md, $m ) ) {
			$front = $m[1];
			$body  = isset( $m[2] ) ? trim( $m[2] ) : '';
		} else {
			// No frontmatter → treat the whole thing as body, run with defaults.
			return array(
				'data'   => array_merge( self::defaults(), array( 'body' => trim( $md ) ) ),
				'errors' => array(),
			);
		}

		$tokens = self::parse_simple_yaml( $front );
		$data   = self::defaults();

		foreach ( $tokens as $dotted_key => $value ) {
			[ $group, $key ] = array_pad( explode( '.', $dotted_key, 2 ), 2, '' );
			if ( '' === $key || ! isset( $data[ $group ] ) || ! is_array( $data[ $group ] ) ) {
				$errors[] = sprintf( 'Unknown key: %s', $dotted_key );
				continue;
			}
			if ( ! array_key_exists( $key, $data[ $group ] ) ) {
				$errors[] = sprintf( 'Unknown key: %s', $dotted_key );
				continue;
			}

			$value = self::sanitize_token( $dotted_key, $value, $errors );
			if ( null !== $value ) {
				$data[ $group ][ $key ] = $value;
			}
		}

		$data['body'] = $body;
		return array( 'data' => $data, 'errors' => $errors );
	}

	/**
	 * Tiny indentation-aware YAML-ish parser. Handles the 2-level shape we
	 * advertise: top-level keys + indented children. No flow style, no
	 * anchors, no multi-line values. Quoted strings supported.
	 *
	 * @param string $yaml
	 * @return array<string,string> dotted key => string value
	 */
	private static function parse_simple_yaml( string $yaml ): array {
		$lines  = preg_split( '/\r\n|\n/', $yaml );
		$result = array();
		$parent = '';

		foreach ( $lines as $line ) {
			if ( preg_match( '/^\s*#/', $line ) || trim( $line ) === '' ) {
				continue;
			}

			if ( preg_match( '/^([a-zA-Z_][a-zA-Z0-9_]*):\s*$/', $line, $m ) ) {
				$parent = $m[1];
				continue;
			}

			if ( preg_match( '/^\s+([a-zA-Z_][a-zA-Z0-9_]*):\s*(.+?)\s*$/', $line, $m ) ) {
				$key = $m[1];
				$val = self::strip_quotes( $m[2] );
				if ( '' !== $parent ) {
					$result[ $parent . '.' . $key ] = $val;
				}
				continue;
			}

			if ( preg_match( '/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.+?)\s*$/', $line, $m ) ) {
				$result[ $m[1] ] = self::strip_quotes( $m[2] );
				continue;
			}
		}
		return $result;
	}

	private static function strip_quotes( string $v ): string {
		$v = trim( $v );
		if ( ( $v[0] ?? '' ) === '"' && substr( $v, -1 ) === '"' ) {
			return substr( $v, 1, -1 );
		}
		if ( ( $v[0] ?? '' ) === "'" && substr( $v, -1 ) === "'" ) {
			return substr( $v, 1, -1 );
		}
		return $v;
	}

	/**
	 * Sanitize a single token. Returns null if the value is rejected (errors logged).
	 *
	 * @param string $dotted Dotted key.
	 * @param string $value Raw value.
	 * @param array  $errors Errors accumulator (by ref).
	 * @return mixed|null
	 */
	private static function sanitize_token( string $dotted, $value, array &$errors ) {
		$value = (string) $value;

		// Color tokens.
		if ( in_array( $dotted, array( 'brand.primary', 'brand.accent', 'brand.fg', 'brand.bg' ), true ) ) {
			$ok = preg_match( '/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $value );
			if ( ! $ok ) {
				$errors[] = sprintf( '%s must be a hex color (#abc, #aabbcc, or #aabbccff). Got: %s', $dotted, $value );
				return null;
			}
			return strtolower( $value );
		}

		// Font names — accept anything printable, single line, <= 60 chars.
		if ( in_array( $dotted, array( 'brand.font_heading', 'brand.font_body', 'brand.font_mono' ), true ) ) {
			$value = preg_replace( '/[^a-zA-Z0-9 _\-]/', '', $value );
			return substr( trim( $value ), 0, 60 );
		}

		// Name — short string.
		if ( 'brand.name' === $dotted ) {
			return substr( sanitize_text_field( $value ), 0, 60 );
		}

		// Enum tokens — must match allowed list.
		$allowed = self::allowed();
		if ( isset( $allowed[ $dotted ] ) ) {
			if ( ! in_array( $value, $allowed[ $dotted ], true ) ) {
				$errors[] = sprintf( '%s must be one of: %s. Got: %s', $dotted, implode( ' | ', $allowed[ $dotted ] ), $value );
				return null;
			}
			return $value;
		}

		// Anything else: drop.
		$errors[] = sprintf( 'Unknown key: %s', $dotted );
		return null;
	}

	private static function merge_with_defaults( array $parsed ): array {
		$defaults = self::defaults();
		foreach ( $defaults as $group => $vals ) {
			if ( ! isset( $parsed[ $group ] ) || ! is_array( $parsed[ $group ] ) ) {
				$parsed[ $group ] = $vals;
				continue;
			}
			$parsed[ $group ] = array_merge( $vals, $parsed[ $group ] );
		}
		if ( ! isset( $parsed['body'] ) ) {
			$parsed['body'] = '';
		}
		return $parsed;
	}

	/* ----------------------------------------------------------------
	 * REST
	 * ---------------------------------------------------------------- */

	public static function register_routes(): void {
		register_rest_route( HATCH_REST_NAMESPACE, '/design', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'route_get_design' ),
			'permission_callback' => '__return_true',
		) );
	}

	public static function route_get_design(): WP_REST_Response {
		$d = self::get_design();
		// Don't ship the body in the public endpoint — it's purely for the
		// admin/AI-rebuild flow, not the frontend renderer.
		unset( $d['body'] );
		return new WP_REST_Response( $d, 200 );
	}
}

add_action( 'rest_api_init', array( 'Hatch_Design_Loader', 'register_routes' ) );

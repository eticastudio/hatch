<?php
/**
 * Server-side render_callback injectors for Hatch dynamic blocks.
 *
 * Some Hatch blocks (custom-code, future RSS/menu/etc.) cannot survive
 * KSES on save because they emit <script>, <style>, or non-standard
 * elements. We convert them to dynamic blocks: save() returns null, and
 * PHP emits the final markup at request time — bypassing KSES entirely.
 *
 * Hooked via `block_type_metadata_settings` so we don't have to edit the
 * registry loop. The filter fires once per block during registration.
 *
 * @package HatchBlocks
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Blocks_Renderers {

	public static function init(): void {
		add_filter( 'block_type_metadata_settings', array( __CLASS__, 'inject_render_callback' ), 10, 2 );
	}

	/**
	 * Inject a render_callback for blocks that need server-side output.
	 *
	 * @param array $settings Block settings about to be passed to WP_Block_Type.
	 * @param array $metadata Raw block.json contents.
	 * @return array
	 */
	public static function inject_render_callback( $settings, $metadata ): array {
		$name = isset( $metadata['name'] ) ? (string) $metadata['name'] : '';
		if ( 'hatch/custom-code' === $name ) {
			$settings['render_callback'] = array( __CLASS__, 'render_custom_code' );
		}
		return $settings;
	}

	/**
	 * Render the Custom Code block. Three modes: inline, shadow, iframe.
	 *
	 * @param array $attrs Block attributes.
	 * @return string
	 */
	public static function render_custom_code( $attrs ): string {
		$mode   = isset( $attrs['mode'] ) ? (string) $attrs['mode'] : 'inline';
		$html   = isset( $attrs['html'] ) ? (string) $attrs['html'] : '';
		$css    = isset( $attrs['css'] )  ? (string) $attrs['css']  : '';
		$js     = isset( $attrs['js'] )   ? (string) $attrs['js']   : '';
		$height = isset( $attrs['iframeHeight'] ) ? (int) $attrs['iframeHeight'] : 320;

		// Stable wrapper class for CSS scoping — same algorithm as the editor.
		$hash = substr( hash( 'crc32b', $html . $css ), 0, 8 );
		$wrapper_class = 'hatch-cc-' . $hash;
		$full_class = 'hatch-custom-code ' . $wrapper_class . ' hatch-cc-mode-' . esc_attr( $mode );

		if ( 'iframe' === $mode ) {
			$srcdoc = '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}'
				. $css . '</style></head><body>' . $html . '<script>' . $js . '</script></body></html>';
			return sprintf(
				'<div class="%s" data-iframe-height="%d"><iframe title="Custom code" sandbox="allow-scripts allow-forms allow-popups allow-same-origin" srcdoc="%s" style="width:100%%;height:%dpx;border:0;display:block"></iframe></div>',
				esc_attr( $full_class ),
				$height,
				esc_attr( $srcdoc ),
				$height
			);
		}

		if ( 'shadow' === $mode ) {
			return sprintf(
				'<div class="%s"><hatch-shadow-code data-html="%s" data-css="%s" data-js="%s"></hatch-shadow-code></div>',
				esc_attr( $full_class ),
				esc_attr( rawurlencode( $html ) ),
				esc_attr( rawurlencode( $css ) ),
				esc_attr( rawurlencode( $js ) )
			);
		}

		// inline — scoped CSS, no JS.
		$scoped_css = self::scope_css( $css, $wrapper_class );
		return sprintf(
			'<div class="%s"><style>%s</style>%s</div>',
			esc_attr( $full_class ),
			$scoped_css,
			$html
		);
	}

	/**
	 * Prefix every top-level CSS selector with the wrapper class so the
	 * block's CSS cannot leak. Mirrors the JS scopeCss() in index.js.
	 *
	 * @param string $css
	 * @param string $wrapper
	 * @return string
	 */
	private static function scope_css( string $css, string $wrapper ): string {
		if ( '' === $css ) return '';
		return (string) preg_replace_callback(
			'/(^|\})\s*([^@{][^{]*)\{/',
			static function ( $m ) use ( $wrapper ) {
				$prefix = $m[1];
				$selectors = array_map(
					static fn( $s ) => '.' . $wrapper . ' ' . trim( $s ),
					explode( ',', $m[2] )
				);
				return $prefix . ' ' . implode( ', ', $selectors ) . ' {';
			},
			$css
		);
	}
}

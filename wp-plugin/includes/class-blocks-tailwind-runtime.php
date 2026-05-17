<?php
/**
 * Tailwind runtime — for editor preview only.
 *
 * In the editor, blocks emit Tailwind utility classes (e.g. "py-24 bg-blue-500").
 * To make them visible in the editor preview, we load a tiny Tailwind CDN build
 * inside the editor iframe. This is EDITOR-ONLY — not loaded on the frontend.
 *
 * Production sites have Tailwind compiled into their theme/Astro frontend.
 *
 * @package HatchBlocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Blocks_Tailwind_Runtime
 */
class Hatch_Blocks_Tailwind_Runtime {

	/**
	 * @var Hatch_Blocks_Tailwind_Runtime|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Blocks_Tailwind_Runtime
	 */
	public static function instance(): Hatch_Blocks_Tailwind_Runtime {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire hooks.
	 */
	private function __construct() {
		// Inject Tailwind CSS into the block editor iframe (Gutenberg renders blocks
		// inside an iframe since WP 6.3).
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_tailwind' ) );
	}

	/**
	 * Enqueue a small compiled Tailwind stylesheet into the editor for preview parity.
	 *
	 * If we ship a precompiled build/editor-tailwind.css it's used; otherwise we
	 * inline a CDN fallback (last resort — large download).
	 *
	 * @return void
	 */
	public function enqueue_editor_tailwind(): void {
		if ( ! get_option( 'hatch_blocks_load_tailwind_editor', 1 ) ) {
			return;
		}
		$css_path = HATCH_PLUGIN_DIR . 'build/editor-tailwind.css';
		if ( file_exists( $css_path ) ) {
			wp_enqueue_style(
				'hatch-blocks-editor-tailwind',
				HATCH_PLUGIN_URL . 'build/editor-tailwind.css',
				array(),
				HATCH_VERSION
			);
			return;
		}
		// Fallback — keep it simple; CDN serves the precompiled subset.
		add_action( 'admin_footer', array( $this, 'print_editor_tailwind_fallback' ) );
	}

	/**
	 * Last-resort CDN fallback (only used if compiled CSS missing).
	 *
	 * @return void
	 */
	public function print_editor_tailwind_fallback(): void {
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '<script>
			(function() {
				if ( document.querySelector( "script[data-hatch-tw]" ) ) return;
				var s = document.createElement( "script" );
				s.src = "https://cdn.tailwindcss.com";
				s.setAttribute( "data-hatch-tw", "1" );
				document.head.appendChild( s );
			})();
		</script>';
	}
}

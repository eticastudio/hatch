<?php
/**
 * Block registry — walks build/blocks/ and registers every block via block.json.
 *
 * @package HatchBlocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Blocks_Registry
 */
class Hatch_Blocks_Registry {

	/**
	 * Register all blocks found in a directory.
	 *
	 * Expected structure:
	 *   build/blocks/section/block.json
	 *   build/blocks/section/index.js   (optional)
	 *   build/blocks/section/style.css  (optional)
	 *
	 * @param string $dir Absolute directory path.
	 * @return void
	 */
	public static function register_all( string $dir ): void {
		if ( ! function_exists( 'register_block_type' ) ) {
			return;
		}
		if ( ! is_dir( $dir ) ) {
			return;
		}

		$entries = scandir( $dir );
		if ( false === $entries ) {
			return;
		}

		foreach ( $entries as $entry ) {
			if ( '.' === $entry || '..' === $entry ) {
				continue;
			}
			$path = trailingslashit( $dir ) . $entry;
			if ( ! is_dir( $path ) ) {
				continue;
			}
			if ( ! file_exists( trailingslashit( $path ) . 'block.json' ) ) {
				continue;
			}
			register_block_type( $path );
		}
	}
}

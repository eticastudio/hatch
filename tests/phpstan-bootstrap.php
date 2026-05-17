<?php
/**
 * PHPStan bootstrap — defines the Hatch constants so static analysis
 * doesn't trip on undefined-constant errors in our PHP files.
 *
 * @package Hatch\Tests
 */

defined( 'HATCH_VERSION' )           || define( 'HATCH_VERSION', '0.5.0' );
defined( 'HATCH_PLUGIN_FILE' )       || define( 'HATCH_PLUGIN_FILE', __FILE__ );
defined( 'HATCH_PLUGIN_DIR' )        || define( 'HATCH_PLUGIN_DIR', __DIR__ . '/' );
defined( 'HATCH_PLUGIN_URL' )        || define( 'HATCH_PLUGIN_URL', '' );
defined( 'HATCH_REST_NAMESPACE' )    || define( 'HATCH_REST_NAMESPACE', 'hatch/v1' );
defined( 'HATCH_BLOCKS_CATEGORY' )   || define( 'HATCH_BLOCKS_CATEGORY', 'hatch' );
defined( 'SODIUM_CRYPTO_SECRETBOX_NONCEBYTES' ) || define( 'SODIUM_CRYPTO_SECRETBOX_NONCEBYTES', 24 );

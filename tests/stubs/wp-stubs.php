<?php
/**
 * WordPress function stubs for unit tests.
 *
 * Only stubs what Hatch's classes actually call. Each stub is the minimal
 * shape needed for tests to compile + run. Tests using these are PURE UNIT
 * tests — they verify our own logic, not WordPress's.
 *
 * For tests that exercise hook integration, REST routing, DB, etc., use
 * the WP_TESTS_DIR integration mode instead.
 *
 * @package Hatch\Tests
 */

defined( 'ABSPATH' ) || define( 'ABSPATH', sys_get_temp_dir() . '/wp/' );
defined( 'WPINC' ) || define( 'WPINC', 'wp-includes' );
defined( 'HATCH_VERSION' ) || define( 'HATCH_VERSION', '0.5.0' );
defined( 'HATCH_REST_NAMESPACE' ) || define( 'HATCH_REST_NAMESPACE', 'hatch/v1' );
defined( 'HATCH_PLUGIN_DIR' ) || define( 'HATCH_PLUGIN_DIR', HATCH_ROOT_DIR . '/wp-plugin/' );
defined( 'HATCH_PLUGIN_URL' ) || define( 'HATCH_PLUGIN_URL', 'https://example.test/wp-content/plugins/hatch/' );
defined( 'HATCH_PLUGIN_FILE' ) || define( 'HATCH_PLUGIN_FILE', HATCH_PLUGIN_DIR . 'hatch.php' );
defined( 'HATCH_BLOCKS_CATEGORY' ) || define( 'HATCH_BLOCKS_CATEGORY', 'hatch' );

// Time constants
defined( 'MINUTE_IN_SECONDS' ) || define( 'MINUTE_IN_SECONDS', 60 );
defined( 'HOUR_IN_SECONDS' ) || define( 'HOUR_IN_SECONDS', 3600 );
defined( 'DAY_IN_SECONDS' ) || define( 'DAY_IN_SECONDS', 86400 );
defined( 'WEEK_IN_SECONDS' ) || define( 'WEEK_IN_SECONDS', 604800 );
defined( 'MONTH_IN_SECONDS' ) || define( 'MONTH_IN_SECONDS', 2592000 );
defined( 'YEAR_IN_SECONDS' ) || define( 'YEAR_IN_SECONDS', 31536000 );

/* ----------------------------------------------------------------
 * In-memory option/transient store for unit tests
 * ---------------------------------------------------------------- */

global $hatch_test_options, $hatch_test_transients, $hatch_test_hooks, $hatch_test_home_url;
$hatch_test_options    = array();
$hatch_test_transients = array();
$hatch_test_hooks      = array();
$hatch_test_home_url   = 'https://example.test';

function hatch_test_reset(): void {
	global $hatch_test_options, $hatch_test_transients, $hatch_test_hooks, $hatch_test_home_url;
	$hatch_test_options    = array();
	$hatch_test_transients = array();
	$hatch_test_hooks      = array();
	$hatch_test_home_url   = 'https://example.test';
}

function hatch_test_set_home_url( string $url ): void {
	global $hatch_test_home_url;
	$hatch_test_home_url = $url;
}

/* ----------------------------------------------------------------
 * WordPress function stubs (alphabetical)
 * ---------------------------------------------------------------- */

if ( ! function_exists( 'add_action' ) ) {
	function add_action( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
		global $hatch_test_hooks;
		$hatch_test_hooks[ $hook ][] = array( 'cb' => $callback, 'priority' => $priority );
		return true;
	}
}
if ( ! function_exists( 'add_filter' ) ) {
	function add_filter( $hook, $callback, $priority = 10, $accepted_args = 1 ) {
		return add_action( $hook, $callback, $priority, $accepted_args );
	}
}
if ( ! function_exists( 'apply_filters' ) ) {
	function apply_filters( $hook, $value ) { return $value; }
}
if ( ! function_exists( 'do_action' ) ) {
	function do_action( $hook ) {}
}
if ( ! function_exists( 'remove_action' ) ) {
	function remove_action( $hook, $callback, $priority = 10 ) { return true; }
}

if ( ! function_exists( 'get_option' ) ) {
	function get_option( $name, $default = false ) {
		global $hatch_test_options;
		return array_key_exists( $name, $hatch_test_options ) ? $hatch_test_options[ $name ] : $default;
	}
}
if ( ! function_exists( 'update_option' ) ) {
	function update_option( $name, $value ) {
		global $hatch_test_options;
		$hatch_test_options[ $name ] = $value;
		return true;
	}
}
if ( ! function_exists( 'add_option' ) ) {
	function add_option( $name, $value ) {
		global $hatch_test_options;
		if ( ! array_key_exists( $name, $hatch_test_options ) ) {
			$hatch_test_options[ $name ] = $value;
		}
		return true;
	}
}
if ( ! function_exists( 'delete_option' ) ) {
	function delete_option( $name ) {
		global $hatch_test_options;
		unset( $hatch_test_options[ $name ] );
		return true;
	}
}

if ( ! function_exists( 'get_transient' ) ) {
	function get_transient( $name ) {
		global $hatch_test_transients;
		if ( ! isset( $hatch_test_transients[ $name ] ) ) {
			return false;
		}
		$entry = $hatch_test_transients[ $name ];
		if ( $entry['expires'] > 0 && $entry['expires'] < time() ) {
			unset( $hatch_test_transients[ $name ] );
			return false;
		}
		return $entry['value'];
	}
}
if ( ! function_exists( 'set_transient' ) ) {
	function set_transient( $name, $value, $expiration = 0 ) {
		global $hatch_test_transients;
		$hatch_test_transients[ $name ] = array(
			'value'   => $value,
			'expires' => $expiration > 0 ? ( time() + (int) $expiration ) : 0,
		);
		return true;
	}
}
if ( ! function_exists( 'delete_transient' ) ) {
	function delete_transient( $name ) {
		global $hatch_test_transients;
		unset( $hatch_test_transients[ $name ] );
		return true;
	}
}

if ( ! function_exists( 'home_url' ) ) {
	function home_url( $path = '', $scheme = null ) {
		global $hatch_test_home_url;
		return rtrim( $hatch_test_home_url, '/' ) . ( $path ? '/' . ltrim( $path, '/' ) : '' );
	}
}
if ( ! function_exists( 'site_url' ) ) {
	function site_url( $path = '', $scheme = null ) { return home_url( $path, $scheme ); }
}
if ( ! function_exists( 'admin_url' ) ) {
	function admin_url( $path = '' ) { return home_url( 'wp-admin/' . $path ); }
}
if ( ! function_exists( 'rest_url' ) ) {
	function rest_url( $path = '' ) { return home_url( 'wp-json/' . $path ); }
}

if ( ! function_exists( 'wp_parse_url' ) ) {
	function wp_parse_url( $url, $component = -1 ) { return parse_url( $url, $component ); }
}

if ( ! function_exists( 'sanitize_text_field' ) ) {
	function sanitize_text_field( $s ) {
		$s = is_scalar( $s ) ? (string) $s : '';
		$s = strip_tags( $s );
		return trim( preg_replace( '/[\r\n\t]+/', ' ', $s ) );
	}
}
if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( $s ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $s ) ); }
}
if ( ! function_exists( 'sanitize_title_with_dashes' ) ) {
	function sanitize_title_with_dashes( $s ) {
		$s = strtolower( (string) $s );
		$s = preg_replace( '/[^a-z0-9\-]/', '-', $s );
		$s = preg_replace( '/-+/', '-', $s );
		return trim( $s, '-' );
	}
}
if ( ! function_exists( 'esc_url_raw' ) ) {
	function esc_url_raw( $url ) { return filter_var( (string) $url, FILTER_SANITIZE_URL ); }
}
if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $url ) { return htmlspecialchars( esc_url_raw( $url ), ENT_QUOTES, 'UTF-8' ); }
}
if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES, 'UTF-8' ); }
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $s ) { return esc_html( $s ); }
}
if ( ! function_exists( 'esc_html__' ) ) {
	function esc_html__( $s, $domain = '' ) { return esc_html( $s ); }
}
if ( ! function_exists( 'esc_html_e' ) ) {
	function esc_html_e( $s, $domain = '' ) { echo esc_html( $s ); }
}
if ( ! function_exists( 'esc_attr__' ) ) {
	function esc_attr__( $s, $domain = '' ) { return esc_attr( $s ); }
}
if ( ! function_exists( '__' ) ) {
	function __( $s, $domain = '' ) { return (string) $s; }
}
if ( ! function_exists( '_n' ) ) {
	function _n( $single, $plural, $count, $domain = '' ) { return $count === 1 ? $single : $plural; }
}
if ( ! function_exists( 'absint' ) ) {
	function absint( $v ) { return abs( (int) $v ); }
}
if ( ! function_exists( 'rest_sanitize_boolean' ) ) {
	function rest_sanitize_boolean( $v ) {
		if ( is_bool( $v ) ) return $v;
		if ( is_int( $v ) ) return $v !== 0;
		$v = strtolower( (string) $v );
		return in_array( $v, array( '1', 'true', 'on', 'yes' ), true );
	}
}

if ( ! function_exists( 'wp_generate_password' ) ) {
	function wp_generate_password( $length = 12, $special = true, $extra = false ) {
		$chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		$out = '';
		for ( $i = 0; $i < $length; $i++ ) {
			$out .= $chars[ random_int( 0, strlen( $chars ) - 1 ) ];
		}
		return $out;
	}
}
if ( ! function_exists( 'wp_salt' ) ) {
	function wp_salt( $scheme = 'auth' ) {
		// Deterministic per-scheme so tests are stable.
		return 'test-salt-' . $scheme . '-fixed-for-unit-tests-do-not-use-in-production';
	}
}

if ( ! function_exists( 'is_user_logged_in' ) ) {
	function is_user_logged_in() { return false; }
}
if ( ! function_exists( 'current_user_can' ) ) {
	function current_user_can( $cap ) { return true; }
}

if ( ! function_exists( 'is_admin' ) ) {
	function is_admin() { return false; }
}
if ( ! function_exists( 'is_multisite' ) ) {
	function is_multisite() { return false; }
}

if ( ! function_exists( 'wp_remote_get' ) ) {
	function wp_remote_get( $url, $args = array() ) {
		return array( 'response' => array( 'code' => 200 ), 'body' => '' );
	}
}
if ( ! function_exists( 'wp_remote_post' ) ) {
	function wp_remote_post( $url, $args = array() ) {
		return array( 'response' => array( 'code' => 200 ), 'body' => '' );
	}
}
if ( ! function_exists( 'wp_remote_retrieve_response_code' ) ) {
	function wp_remote_retrieve_response_code( $res ) {
		return is_array( $res ) ? (int) ( $res['response']['code'] ?? 0 ) : 0;
	}
}
if ( ! function_exists( 'wp_remote_retrieve_body' ) ) {
	function wp_remote_retrieve_body( $res ) {
		return is_array( $res ) ? (string) ( $res['body'] ?? '' ) : '';
	}
}
if ( ! function_exists( 'is_wp_error' ) ) {
	function is_wp_error( $thing ) { return $thing instanceof WP_Error; }
}

if ( ! function_exists( 'add_query_arg' ) ) {
	function add_query_arg( ...$args ) {
		if ( is_array( $args[0] ) ) {
			$query = $args[0];
			$url   = $args[1] ?? '';
		} else {
			$query = array( $args[0] => $args[1] );
			$url   = $args[2] ?? '';
		}
		$sep = ( strpos( $url, '?' ) === false ) ? '?' : '&';
		return $url . $sep . http_build_query( $query );
	}
}
if ( ! function_exists( 'remove_query_arg' ) ) {
	function remove_query_arg( $key, $url = '' ) { return $url; }
}

if ( ! function_exists( 'get_post_types' ) ) {
	function get_post_types( $args = array(), $output = 'names' ) {
		// Default to core post types only.
		return array(
			'post'       => (object) array( 'name' => 'post',       'public' => true, 'show_in_rest' => true ),
			'page'       => (object) array( 'name' => 'page',       'public' => true, 'show_in_rest' => true ),
			'attachment' => (object) array( 'name' => 'attachment', 'public' => true, 'show_in_rest' => true ),
		);
	}
}

if ( ! function_exists( 'rest_do_request' ) ) {
	function rest_do_request( $request ) {
		return new class {
			public function is_error() { return false; }
		};
	}
}

if ( ! function_exists( 'get_bloginfo' ) ) {
	function get_bloginfo( $what = '' ) {
		switch ( $what ) {
			case 'version': return '6.9.0';
			case 'name':    return 'Hatch Test Site';
			default:        return '';
		}
	}
}

// WP_Error stub.
if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		private $code;
		private $message;
		private $data;
		public function __construct( $code = '', $message = '', $data = array() ) {
			$this->code = $code;
			$this->message = $message;
			$this->data = $data;
		}
		public function get_error_code() { return $this->code; }
		public function get_error_message() { return $this->message; }
		public function get_error_data() { return $this->data; }
	}
}

// WP_REST_Request shim — covers param-getting calls.
if ( ! class_exists( 'WP_REST_Request' ) ) {
	class WP_REST_Request {
		private $params = array();
		public function __construct( $method = '', $route = '' ) {}
		public function get_param( $key ) { return $this->params[ $key ] ?? null; }
		public function set_param( $key, $value ) { $this->params[ $key ] = $value; }
		public function get_json_params() { return $this->params; }
	}
}
if ( ! class_exists( 'WP_REST_Response' ) ) {
	class WP_REST_Response {
		public $data;
		public $status;
		public function __construct( $data = null, $status = 200 ) {
			$this->data = $data;
			$this->status = $status;
		}
		public function get_data() { return $this->data; }
		public function set_data( $d ) { $this->data = $d; }
		public function get_status() { return $this->status; }
	}
}
if ( ! class_exists( 'WP_REST_Server' ) ) {
	class WP_REST_Server {
		const READABLE  = 'GET';
		const CREATABLE = 'POST';
		const EDITABLE  = 'POST, PUT, PATCH';
		const DELETABLE = 'DELETE';
	}
}

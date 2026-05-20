<?php
/**
 * Hatch · Cloudflare Turnstile on the WordPress side.
 *
 * v0.22 wired Turnstile for the HEADLESS frontend (Comments + Forms via REST).
 * v0.25 adds protection for the WP backend itself:
 *
 *   1. wp-login.php — Turnstile widget on the login form; verify on submit.
 *      Protects brute-force surface even when the headless frontend hides
 *      the WP domain.
 *   2. wp-comments-post — Turnstile on the classic WordPress comment form
 *      so the same anti-spam runs whether visitors comment via the headless
 *      frontend OR (rare but real) hit wp-comments-post.php directly.
 *
 * Reuses Hatch_Integrations::verify_turnstile(). Site key + secret key are
 * configured once in Tools → Hatch → Integrations and apply everywhere.
 *
 * No effect when Turnstile is not enabled — every hook short-circuits early.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Turnstile_WP {

	public static function instance(): self {
		static $i = null;
		if ( null === $i ) {
			$i = new self();
		}
		return $i;
	}

	private function __construct() {
		// v0.50.31 — wp-login.php protection is GATED by an explicit toggle so
		// users can opt in without forcing it. Default OFF; turn on in Security
		// tab → "Spam protection for WP Admin login". Requires Turnstile keys
		// (set in Content tab) — silently no-op when keys are missing.
		if ( get_option( 'hatch_security_turnstile_login', false ) && self::has_keys() ) {
			add_action( 'login_enqueue_scripts',     array( __CLASS__, 'enqueue_turnstile_login' ) );
			add_action( 'login_form',                array( __CLASS__, 'render_widget_login' ) );
			add_action( 'lostpassword_form',         array( __CLASS__, 'render_widget_login' ) );
			add_action( 'register_form',             array( __CLASS__, 'render_widget_login' ) );
			add_filter( 'authenticate',              array( __CLASS__, 'verify_login' ), 99, 3 );
			add_filter( 'lostpassword_post',         array( __CLASS__, 'verify_lostpassword' ), 10, 1 );
			add_action( 'login_head',                array( __CLASS__, 'login_inline_style' ) );
		}

		// --- WP classic comment form (only matters if user has WP comments enabled
		// AND visible on the WP-rendered side; on a headless setup this is rare,
		// but kept gated for parity). ---
		if ( get_option( 'hatch_security_turnstile_comments', false ) && self::has_keys() ) {
			add_action( 'comment_form_after_fields',          array( __CLASS__, 'render_widget_comments' ) );
			add_action( 'comment_form_logged_in_after',       array( __CLASS__, 'render_widget_comments' ) );
			add_filter( 'preprocess_comment',                 array( __CLASS__, 'verify_comment' ), 10, 1 );
		}
	}

	/** Cheap check — do we have a usable key pair? */
	private static function has_keys(): bool {
		if ( ! class_exists( 'Hatch_Integrations' ) ) return false;
		$ts = (array) ( Hatch_Integrations::get_all()['turnstile'] ?? array() );
		return ! empty( $ts['site_key'] ) && ! empty( $ts['secret_key'] );
	}

	/* ----------------------------------------------------------------
	 * Helpers
	 * ---------------------------------------------------------------- */

	private static function config(): array {
		if ( ! class_exists( 'Hatch_Integrations' ) ) {
			return array( 'enabled' => false, 'site_key' => '' );
		}
		$cfg = Hatch_Integrations::get_all()['turnstile'] ?? array();
		return array(
			'enabled'  => ! empty( $cfg['enabled'] ),
			'site_key' => (string) ( $cfg['site_key'] ?? '' ),
		);
	}

	private static function active(): bool {
		$c = self::config();
		return $c['enabled'] && '' !== $c['site_key'];
	}

	private static function client_ip(): string {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? (string) $_SERVER['REMOTE_ADDR'] : '';
		if ( isset( $_SERVER['HTTP_CF_CONNECTING_IP'] ) ) {
			$ip = (string) $_SERVER['HTTP_CF_CONNECTING_IP'];
		} elseif ( isset( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
			$ip = trim( explode( ',', (string) $_SERVER['HTTP_X_FORWARDED_FOR'] )[0] );
		}
		return preg_replace( '/[^0-9a-fA-F:\.]/', '', $ip ) ?? '';
	}

	/* ----------------------------------------------------------------
	 * wp-login
	 * ---------------------------------------------------------------- */

	public static function enqueue_turnstile_login(): void {
		if ( ! self::active() ) {
			return;
		}
		wp_enqueue_script(
			'cf-turnstile',
			'https://challenges.cloudflare.com/turnstile/v0/api.js',
			array(),
			null,
			array( 'in_footer' => false, 'strategy' => 'defer' )
		);
	}

	public static function render_widget_login(): void {
		if ( ! self::active() ) {
			return;
		}
		$c = self::config();
		printf(
			'<div class="cf-turnstile" data-sitekey="%s" data-theme="auto" style="margin: 0 0 16px;"></div>',
			esc_attr( $c['site_key'] )
		);
	}

	public static function login_inline_style(): void {
		if ( ! self::active() ) {
			return;
		}
		echo '<style>.login form #wp-submit{margin-top:8px;} .login .cf-turnstile{display:flex;justify-content:center;}</style>';
	}

	/**
	 * Hooked into authenticate at priority 99 so it runs AFTER the standard
	 * user-password checks; only blocks when the user has otherwise passed.
	 * That way a missing Turnstile doesn't leak "user exists" via the error
	 * message.
	 *
	 * @param WP_User|WP_Error|null $user
	 * @param string                $username
	 * @param string                $password
	 * @return WP_User|WP_Error|null
	 */
	public static function verify_login( $user, $username, $password ) {
		if ( ! self::active() ) {
			return $user;
		}
		// Skip when the credentials already failed — let WP show its native error.
		if ( is_wp_error( $user ) || empty( $username ) || empty( $password ) ) {
			return $user;
		}
		// Skip programmatic logins (XML-RPC, app passwords, REST cookie auth) —
		// the Turnstile token only makes sense on a browser-rendered form.
		if ( ! isset( $_POST['log'], $_POST['pwd'] ) ) {
			return $user;
		}
		$token = isset( $_POST['cf-turnstile-response'] ) ? (string) wp_unslash( $_POST['cf-turnstile-response'] ) : '';
		$ok    = Hatch_Integrations::verify_turnstile( $token, self::client_ip() );
		if ( ! $ok ) {
			return new WP_Error(
				'hatch_turnstile_login',
				__( '<strong>Anti-spam check failed.</strong> Try again.', 'hatch' )
			);
		}
		return $user;
	}

	/**
	 * Lost-password form: same gate.
	 *
	 * @param WP_Error $errors
	 * @return WP_Error
	 */
	public static function verify_lostpassword( $errors ) {
		if ( ! self::active() ) {
			return $errors;
		}
		$token = isset( $_POST['cf-turnstile-response'] ) ? (string) wp_unslash( $_POST['cf-turnstile-response'] ) : '';
		$ok    = Hatch_Integrations::verify_turnstile( $token, self::client_ip() );
		if ( ! $ok ) {
			$err = ( $errors instanceof WP_Error ) ? $errors : new WP_Error();
			$err->add( 'hatch_turnstile_lost', __( '<strong>Anti-spam check failed.</strong> Try again.', 'hatch' ) );
			return $err;
		}
		return $errors;
	}

	/* ----------------------------------------------------------------
	 * Classic WP comment form (when someone hits wp-comments-post.php)
	 * ---------------------------------------------------------------- */

	public static function render_widget_comments(): void {
		if ( ! self::active() ) {
			return;
		}
		$c = self::config();
		printf(
			'<p class="comment-form-turnstile"><div class="cf-turnstile" data-sitekey="%s" data-theme="auto"></div></p>',
			esc_attr( $c['site_key'] )
		);
		// Enqueue the API script on the same response.
		add_action( 'wp_footer', function () {
			echo '<script async defer src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>';
		}, 99 );
	}

	/**
	 * Hooked into preprocess_comment — last chance to reject before WP inserts.
	 *
	 * @param array $data
	 * @return array|never
	 */
	public static function verify_comment( $data ) {
		if ( ! self::active() ) {
			return $data;
		}
		// Skip pingbacks / trackbacks — they don't go through the comment form.
		$type = isset( $data['comment_type'] ) ? (string) $data['comment_type'] : '';
		if ( in_array( $type, array( 'pingback', 'trackback' ), true ) ) {
			return $data;
		}
		$token = isset( $_POST['cf-turnstile-response'] ) ? (string) wp_unslash( $_POST['cf-turnstile-response'] ) : '';
		$ok    = Hatch_Integrations::verify_turnstile( $token, self::client_ip() );
		if ( ! $ok ) {
			wp_die(
				esc_html__( 'Anti-spam check failed. Please go back and try again.', 'hatch' ),
				esc_html__( 'Comment rejected', 'hatch' ),
				array( 'response' => 400, 'back_link' => true )
			);
		}
		return $data;
	}
}

Hatch_Turnstile_WP::instance();

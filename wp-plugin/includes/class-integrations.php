<?php
/**
 * Hatch Integrations — auto-detect SEO + Form + Anti-spam plugins, expose
 * settings, and surface them on /hatch/v1/integrations for the frontend.
 *
 * Detection is intentionally simple: function_exists() / class_exists() /
 * is_plugin_active() — no fragile version sniffing.
 *
 * Settings stored as ONE option key (`hatch_integrations`) keyed by sub-system
 * so the JSON shape stays stable.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Integrations {

	const OPTION_KEY = 'hatch_integrations';

	/**
	 * Defaults applied when a key is missing.
	 *
	 * @return array
	 */
	public static function defaults(): array {
		return array(
			'seo'      => array(
				'mode'     => 'auto', // auto | yoast | rankmath | seopress | aioseo | off
				'schema'   => true,   // pass-through JSON-LD to frontend
				'sitemap'  => true,   // merge with Astro sitemap
			),
			'forms'    => array(
				'mode'      => 'auto', // auto | fluent_forms | wpforms | gravity | off
				'default_form_id' => 0,
				'newsletter_list_id' => 0, // FluentCRM list id for newsletter signups
			),
			'turnstile' => array(
				'enabled'    => false,
				'site_key'   => '',
				'secret_key' => '',
			),
			'comments' => array(
				'enabled'        => true,
				'require_login'  => false,
				'moderate'       => true,
				'turnstile'      => true,
			),
		);
	}

	/**
	 * Get full settings, merged with defaults.
	 *
	 * @return array
	 */
	public static function get_all(): array {
		$stored   = (array) get_option( self::OPTION_KEY, array() );
		$defaults = self::defaults();
		$out      = array();
		foreach ( $defaults as $group => $vals ) {
			$out[ $group ] = array_merge( $vals, isset( $stored[ $group ] ) ? (array) $stored[ $group ] : array() );
		}
		return $out;
	}

	/**
	 * Save a sub-group of settings.
	 *
	 * @param string $group seo|forms|turnstile|comments
	 * @param array  $values
	 * @return void
	 */
	public static function save_group( string $group, array $values ): void {
		$all      = self::get_all();
		$defaults = self::defaults();
		if ( ! isset( $defaults[ $group ] ) ) {
			return;
		}
		$clean = array();
		foreach ( $defaults[ $group ] as $key => $default ) {
			if ( ! array_key_exists( $key, $values ) ) {
				$clean[ $key ] = $default;
				continue;
			}
			if ( is_bool( $default ) ) {
				$clean[ $key ] = (bool) $values[ $key ];
			} elseif ( is_int( $default ) ) {
				$clean[ $key ] = (int) $values[ $key ];
			} else {
				$clean[ $key ] = sanitize_text_field( (string) $values[ $key ] );
			}
		}
		$all[ $group ] = $clean;
		update_option( self::OPTION_KEY, $all );
	}

	/* ----------------------------------------------------------------
	 * Detection
	 * ---------------------------------------------------------------- */

	/**
	 * Detect SEO plugin. Returns slug + label.
	 *
	 * @return array{slug:string,label:string,active:bool}
	 */
	public static function detect_seo(): array {
		if ( defined( 'WPSEO_VERSION' ) || class_exists( 'WPSEO_Options' ) ) {
			return array( 'slug' => 'yoast', 'label' => 'Yoast SEO', 'active' => true );
		}
		if ( defined( 'RANK_MATH_VERSION' ) || class_exists( 'RankMath' ) ) {
			return array( 'slug' => 'rankmath', 'label' => 'Rank Math', 'active' => true );
		}
		if ( defined( 'SEOPRESS_VERSION' ) || function_exists( 'seopress_titles_single_titles_meta_pages_hook' ) ) {
			return array( 'slug' => 'seopress', 'label' => 'SEOPress', 'active' => true );
		}
		if ( defined( 'AIOSEO_VERSION' ) || function_exists( 'aioseo' ) ) {
			return array( 'slug' => 'aioseo', 'label' => 'All in One SEO', 'active' => true );
		}
		return array( 'slug' => 'none', 'label' => 'None (Hatch fallback)', 'active' => false );
	}

	/**
	 * Detect form plugin. Returns slug + label.
	 *
	 * @return array{slug:string,label:string,active:bool}
	 */
	public static function detect_forms(): array {
		if ( defined( 'FLUENTFORM' ) || function_exists( 'wpFluentForm' ) ) {
			return array( 'slug' => 'fluent_forms', 'label' => 'Fluent Forms', 'active' => true );
		}
		if ( defined( 'WPFORMS_VERSION' ) || class_exists( 'WPForms\\WPForms' ) ) {
			return array( 'slug' => 'wpforms', 'label' => 'WPForms', 'active' => true );
		}
		if ( class_exists( 'GFForms' ) ) {
			return array( 'slug' => 'gravity', 'label' => 'Gravity Forms', 'active' => true );
		}
		return array( 'slug' => 'none', 'label' => 'None (Hatch built-in form)', 'active' => false );
	}

	/**
	 * Deprecated as of v0.30 — FluentCRM is no longer a first-class integration.
	 * Use Fluent Forms' native CRM connector instead. Kept as a stub so any
	 * downstream code that still calls it doesn't fatal.
	 *
	 * @return bool
	 */
	public static function has_fluentcrm(): bool {
		return false;
	}

	/**
	 * Deprecated as of v0.30 — see has_fluentcrm() note.
	 *
	 * @return array<int,string>
	 */
	public static function fluentcrm_lists(): array {
		return array();
	}

	/**
	 * Get Fluent Forms forms.
	 *
	 * @return array<int,string>
	 */
	public static function fluent_forms_list(): array {
		global $wpdb;
		$table = $wpdb->prefix . 'fluentform_forms';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery
		$rows = $wpdb->get_results( "SELECT id, title FROM {$table} WHERE status='published' ORDER BY id DESC LIMIT 50" );
		if ( ! $rows ) {
			return array();
		}
		$out = array();
		foreach ( $rows as $r ) {
			$out[ (int) $r->id ] = (string) $r->title;
		}
		return $out;
	}

	/* ----------------------------------------------------------------
	 * REST
	 * ---------------------------------------------------------------- */

	public static function register_routes(): void {
		register_rest_route( HATCH_REST_NAMESPACE, '/integrations', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'route_integrations' ),
			'permission_callback' => '__return_true',
		) );
	}

	/**
	 * GET /hatch/v1/integrations — public snapshot the frontend uses to render
	 * Comment + Form blocks with the right Turnstile site key. The SECRET key
	 * is NEVER exposed here.
	 *
	 * @return WP_REST_Response
	 */
	public static function route_integrations(): WP_REST_Response {
		$all  = self::get_all();
		$seo  = self::detect_seo();
		$form = self::detect_forms();

		return new WP_REST_Response( array(
			'seo' => array(
				'detected' => $seo,
				'mode'     => $all['seo']['mode'],
				'schema'   => (bool) $all['seo']['schema'],
				'sitemap'  => (bool) $all['seo']['sitemap'],
			),
			'forms' => array(
				'detected'        => $form,
				'mode'            => $all['forms']['mode'],
				'default_form_id' => (int) $all['forms']['default_form_id'],
			),
			'turnstile' => array(
				'enabled'  => (bool) $all['turnstile']['enabled'],
				// SAFE TO EXPOSE: site_key is meant to live in the client.
				'site_key' => (string) $all['turnstile']['site_key'],
				// secret_key NEVER returned.
			),
			'comments' => array(
				'enabled'       => (bool) $all['comments']['enabled'],
				'require_login' => (bool) $all['comments']['require_login'],
				'moderate'      => (bool) $all['comments']['moderate'],
				'turnstile'     => (bool) $all['comments']['turnstile'],
			),
		), 200 );
	}

	/* ----------------------------------------------------------------
	 * Turnstile server-side verification
	 * ---------------------------------------------------------------- */

	/**
	 * Verify a Cloudflare Turnstile token. Returns true if valid OR if
	 * Turnstile is disabled (so caller can blanket-call this without branching).
	 *
	 * @param string $token Token from cf-turnstile-response.
	 * @param string $remote_ip Submitter IP (optional).
	 * @return bool
	 */
	public static function verify_turnstile( string $token, string $remote_ip = '' ): bool {
		$cfg = self::get_all()['turnstile'];
		if ( ! $cfg['enabled'] || empty( $cfg['secret_key'] ) ) {
			return true; // Not configured = no verification gate.
		}
		if ( empty( $token ) ) {
			return false;
		}
		$body = array(
			'secret'   => $cfg['secret_key'],
			'response' => $token,
		);
		if ( $remote_ip ) {
			$body['remoteip'] = $remote_ip;
		}
		$res = wp_remote_post( 'https://challenges.cloudflare.com/turnstile/v0/siteverify', array(
			'timeout' => 8,
			'body'    => $body,
		) );
		if ( is_wp_error( $res ) ) {
			return false;
		}
		$json = json_decode( (string) wp_remote_retrieve_body( $res ), true );
		return ! empty( $json['success'] );
	}
}

add_action( 'rest_api_init', array( 'Hatch_Integrations', 'register_routes' ) );

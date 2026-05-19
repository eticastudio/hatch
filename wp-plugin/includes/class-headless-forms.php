<?php
/**
 * Hatch Headless Forms — single POST endpoint that accepts a form submission
 * from the Astro frontend and routes it to the best available backend:
 *
 *   1. Fluent Forms (via FluentForm API) if installed + form_id set
 *   2. WPForms (via process flow) if installed
 *   3. FluentCRM "subscribe" if the form is a newsletter (uses list_id)
 *   4. Native fallback: store as a comment-like submission CPT
 *
 * Turnstile verified server-side.
 *
 * POST /hatch/v1/forms/submit
 *   form_id     (int)   optional — Fluent/WPForms ID
 *   list_id     (int)   optional — FluentCRM list for subscribe
 *   email       (str)   required
 *   name        (str)   optional
 *   fields      (obj)   arbitrary other fields
 *   cf-turnstile-response (str) Turnstile token
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Headless_Forms {

	const SUBMISSIONS_CPT = 'hatch_submission';

	public static function register_routes(): void {
		// v0.50.14 — Hatch does not bridge form submissions anymore. Form
		// plugins (Fluent / Gravity / WPForms / CF7) expose their own REST
		// endpoints and the Astro frontend talks to them directly. Surfacing
		// "/hatch/v1/forms/*" was a duplicate path that confused users about
		// which endpoint to call. Plugin Bridge in the Content tab still
		// auto-detects whichever form plugin is installed so the user knows
		// the integration works — just not via this class.
		return;
		register_rest_route( HATCH_REST_NAMESPACE, '/forms/submit', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( __CLASS__, 'route_submit' ),
			'permission_callback' => '__return_true',
		) );
		// v0.24: native embed for Fluent Forms / WPForms / Gravity. Returns
		// pre-rendered HTML + the script/style URLs that the form plugin
		// would normally enqueue on a classic-WP page. The Astro side just
		// drops the HTML in via set:html and lazy-loads the assets.
		register_rest_route( HATCH_REST_NAMESPACE, '/forms/(?P<id>\d+)/embed', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'route_embed' ),
			'permission_callback' => '__return_true',
		) );
	}

	/**
	 * GET /hatch/v1/forms/{id}/embed — render the form plugin's own shortcode.
	 *
	 * The plugin's CSS/JS would normally enqueue when the shortcode runs.
	 * We capture both the HTML and the asset URLs so the frontend gets a
	 * complete, working form — including the plugin's validation + AJAX.
	 *
	 * @param WP_REST_Request $req
	 * @return WP_REST_Response
	 */
	public static function route_embed( WP_REST_Request $req ): WP_REST_Response {
		$id  = (int) $req['id'];
		$det = Hatch_Integrations::detect_forms();

		$shortcode = '';
		if ( 'fluent_forms' === $det['slug'] ) {
			$shortcode = sprintf( '[fluentform id="%d"]', $id );
		} elseif ( 'wpforms' === $det['slug'] ) {
			$shortcode = sprintf( '[wpforms id="%d"]', $id );
		} elseif ( 'gravity' === $det['slug'] ) {
			$shortcode = sprintf( '[gravityform id="%d" title="false" description="false"]', $id );
		}

		if ( '' === $shortcode ) {
			return new WP_REST_Response( array(
				'ok'      => false,
				'message' => 'No supported form plugin detected. Install Fluent Forms.',
			), 200 );
		}

		// Run the shortcode + capture the enqueued asset URLs.
		ob_start();
		$html = do_shortcode( $shortcode );
		$html = $html . ob_get_clean();

		$scripts = self::collect_enqueued_assets( 'wp_scripts' );
		$styles  = self::collect_enqueued_assets( 'wp_styles' );

		return new WP_REST_Response( array(
			'ok'        => true,
			'backend'   => $det['slug'],
			'form_id'   => $id,
			'html'      => $html,
			'scripts'   => $scripts,
			'styles'    => $styles,
		), 200 );
	}

	/**
	 * Snapshot the URLs of every currently-enqueued asset from a registry.
	 *
	 * @param string $kind 'wp_scripts' | 'wp_styles'
	 * @return array<int,string>
	 */
	private static function collect_enqueued_assets( string $kind ): array {
		$registry = ( 'wp_scripts' === $kind ) ? wp_scripts() : wp_styles();
		if ( ! $registry ) {
			return array();
		}
		$out = array();
		foreach ( (array) $registry->queue as $handle ) {
			$data = $registry->registered[ $handle ] ?? null;
			if ( ! $data || empty( $data->src ) ) {
				continue;
			}
			$src = $data->src;
			if ( str_starts_with( $src, '/' ) && ! str_starts_with( $src, '//' ) ) {
				// v0.50.4 — home_url, not site_url. WP_HOME (public address) is the
				// correct origin for form actions; site_url returns the wp-admin
				// install URL which differs in Bedrock / WP_SITEURL != WP_HOME setups.
				$src = home_url( $src );
			}
			$out[] = (string) $src;
		}
		return array_values( array_unique( $out ) );
	}

	public static function register_cpt(): void {
		// v0.32 — hide from main menu. Native CPT fallback is a rarely-used
		// last-resort path (most users have Fluent Forms / WPForms). When it
		// IS used, submissions still live in the DB and can be accessed via
		// /wp-admin/edit.php?post_type=hatch_submission directly, just not
		// as a menu item polluting the admin sidebar.
		register_post_type( self::SUBMISSIONS_CPT, array(
			'labels'             => array(
				'name'          => __( 'Hatch Submissions', 'hatch' ),
				'singular_name' => __( 'Submission', 'hatch' ),
			),
			'public'             => false,
			'show_ui'            => true,
			'show_in_menu'       => false,
			'show_in_rest'       => false,
			'supports'           => array( 'title', 'editor', 'custom-fields' ),
			'capability_type'    => 'post',
			'map_meta_cap'       => true,
			'capabilities'       => array(
				'create_posts' => 'do_not_allow',
			),
		) );
	}

	public static function route_submit( WP_REST_Request $req ) {
		$integ    = Hatch_Integrations::get_all();
		$form_id  = (int) $req->get_param( 'form_id' );
		$list_id  = (int) $req->get_param( 'list_id' );
		$email    = sanitize_email( (string) $req->get_param( 'email' ) );
		$name     = sanitize_text_field( (string) $req->get_param( 'name' ) );
		$fields   = (array) $req->get_param( 'fields' );
		$token    = (string) $req->get_param( 'cf-turnstile-response' );

		if ( ! is_email( $email ) ) {
			return new WP_Error( 'hatch_bad_email', __( 'A valid email is required.', 'hatch' ), array( 'status' => 400 ) );
		}

		// Turnstile gate.
		if ( ! empty( $integ['turnstile']['enabled'] ) ) {
			if ( ! Hatch_Integrations::verify_turnstile( $token, self::ip() ) ) {
				return new WP_Error( 'hatch_turnstile', __( 'Anti-spam challenge failed. Try again.', 'hatch' ), array( 'status' => 400 ) );
			}
		}

		$fluent_forms = Hatch_Integrations::detect_forms();
		$forms_mode   = $integ['forms']['mode'];
		$mode         = ( 'auto' === $forms_mode ) ? $fluent_forms['slug'] : $forms_mode;
		if ( $form_id <= 0 ) {
			$form_id = (int) $integ['forms']['default_form_id'];
		}

		// 1. Fluent Forms submission.
		if ( 'fluent_forms' === $mode && $form_id > 0 && function_exists( 'wpFluentForm' ) ) {
			return self::submit_to_fluent_forms( $form_id, $email, $name, $fields );
		}

		// 2. WPForms (record entry programmatically).
		if ( 'wpforms' === $mode && $form_id > 0 && class_exists( 'WPForms\\WPForms' ) ) {
			return self::submit_to_wpforms( $form_id, $email, $name, $fields );
		}

		// 3. Native fallback — create a hatch_submission CPT. Newsletter signups
		// can be wired via Fluent Forms native integrations (it has built-in CRM
		// connectors) — Hatch no longer ships a separate FluentCRM subscribe path.
		return self::submit_native( $email, $name, $fields );
	}

	/* ---------------- backend handlers ---------------- */

	private static function submit_to_fluent_forms( int $form_id, string $email, string $name, array $fields ) {
		try {
			$payload = array_merge( array(
				'email' => $email,
				'names' => array( 'first_name' => $name ),
			), $fields );

			// Lazy require: Fluent Forms has an API class.
			if ( class_exists( '\\FluentForm\\Framework\\Foundation\\Application' ) ) {
				$api = wpFluentForm()->getApp()->make( 'app' );
				$submission_service = $api->make( '\\FluentForm\\App\\Services\\Submission\\SubmissionService' );
				$submission_service->store( array(
					'form_id'         => $form_id,
					'response'        => wp_json_encode( $payload ),
					'source_url'      => esc_url_raw( (string) ( $_SERVER['HTTP_REFERER'] ?? '' ) ),
					'ip'              => self::ip(),
					'browser'         => substr( (string) ( $_SERVER['HTTP_USER_AGENT'] ?? '' ), 0, 254 ),
					'created_at'      => current_time( 'mysql' ),
					'updated_at'      => current_time( 'mysql' ),
					'status'          => 'unread',
				) );
				return new WP_REST_Response( array( 'ok' => true, 'backend' => 'fluent_forms' ), 201 );
			}
		} catch ( \Throwable $e ) {
			// Fall through to native.
		}
		return self::submit_native( $email, $name, $fields );
	}

	private static function submit_to_wpforms( int $form_id, string $email, string $name, array $fields ) {
		try {
			$entry = array_merge( array(
				'email' => $email,
				'name'  => $name,
			), $fields );
			$entry_id = wpforms()->entry->add( array(
				'form_id'  => $form_id,
				'user_id'  => get_current_user_id(),
				'user_ip'  => self::ip(),
				'fields'   => wp_json_encode( $entry ),
				'date'     => current_time( 'mysql' ),
				'status'   => '',
				'type'     => '',
				'viewed'   => '0',
				'starred'  => '0',
			) );
			if ( $entry_id ) {
				return new WP_REST_Response( array( 'ok' => true, 'backend' => 'wpforms', 'id' => (int) $entry_id ), 201 );
			}
		} catch ( \Throwable $e ) {}
		return self::submit_native( $email, $name, $fields );
	}

	// FluentCRM subscribe path removed in v0.30 — use Fluent Forms native CRM integration instead.

	private static function submit_native( string $email, string $name, array $fields ) {
		$title = sprintf( '%s <%s>', $name ?: 'Anonymous', $email );
		$body  = wp_json_encode( $fields, JSON_PRETTY_PRINT );
		$id    = wp_insert_post( array(
			'post_type'    => self::SUBMISSIONS_CPT,
			'post_status'  => 'private',
			'post_title'   => $title,
			'post_content' => $body,
			'meta_input'   => array(
				'email' => $email,
				'name'  => $name,
				'ip'    => self::ip(),
			),
		), true );
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		return new WP_REST_Response( array( 'ok' => true, 'backend' => 'native', 'id' => (int) $id ), 201 );
	}

	private static function ip(): string {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? (string) $_SERVER['REMOTE_ADDR'] : '';
		if ( isset( $_SERVER['HTTP_CF_CONNECTING_IP'] ) ) {
			$ip = (string) $_SERVER['HTTP_CF_CONNECTING_IP'];
		} elseif ( isset( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
			$ip = trim( explode( ',', (string) $_SERVER['HTTP_X_FORWARDED_FOR'] )[0] );
		}
		return preg_replace( '/[^0-9a-fA-F:\.]/', '', $ip ) ?? '';
	}
}

add_action( 'init', array( 'Hatch_Headless_Forms', 'register_cpt' ) );
add_action( 'rest_api_init', array( 'Hatch_Headless_Forms', 'register_routes' ) );

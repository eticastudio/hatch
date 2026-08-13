<?php
/**
 * Forms Bridge: WPForms / Fluent Forms / Gravity / CF7.
 *
 * Contract (Hatch Bridge rule): Zero plugin CSS or JS ships to the frontend.
 * WP normalizes each provider's form into `{fields[], submit_endpoint, nonce}`.
 * Astro renders its own <HatchForm> using Hatch tokens and POSTs values here.
 * WP replays the plugin's own submission pipeline (validation, spam, notify).
 *
 * Routes:
 *   GET  /hatch/v1/forms                            list all detected forms
 *   GET  /hatch/v1/forms/{provider}/{id}            normalized schema
 *   POST /hatch/v1/forms/{provider}/{id}/submit     validated submission
 *
 * @package Hatch
 * @since   0.7.6
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Forms_Bridge {

	private static $instance = null;

	public static function instance(): Hatch_Forms_Bridge {
		if ( null === self::$instance ) {
			self::$instance = new self();
			add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
			add_filter( 'hatch/content/html', array( __CLASS__, 'rewrite_form_shortcodes' ), 10, 2 );
			// v0.52 — ensure the Hatch-owned submissions table exists so
			// every provider (including WPForms Lite, which has no entries
			// API) persists to DB. Cheap: only runs schema-check once per
			// process, dbDelta is a no-op when up to date.
			add_action( 'init', array( __CLASS__, 'ensure_submissions_table' ), 5 );
		}
		return self::$instance;
	}

	/* --------------------------------------------------------------------- *
	 * Hatch-owned submissions store (works for every provider)
	 * v0.52 — WPForms Lite has no entries API, Pro's entry->add is the
	 * only path that natively persists. We mirror EVERY submission into
	 * wp_hatch_form_submissions so operators always have a queryable log.
	 * --------------------------------------------------------------------- */

	public static function ensure_submissions_table(): void {
		if ( get_option( 'hatch_forms_submissions_schema' ) === '0.52.0' ) {
			return;
		}
		global $wpdb;
		$table   = $wpdb->prefix . 'hatch_form_submissions';
		$charset = $wpdb->get_charset_collate();
		$sql = "CREATE TABLE {$table} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			provider VARCHAR(32) NOT NULL,
			form_id BIGINT UNSIGNED NOT NULL,
			fields LONGTEXT NOT NULL,
			ip_address VARCHAR(64) NOT NULL DEFAULT '',
			user_agent VARCHAR(255) NOT NULL DEFAULT '',
			created_at DATETIME NOT NULL,
			PRIMARY KEY (id),
			KEY provider_form (provider, form_id),
			KEY created (created_at)
		) {$charset};";
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
		update_option( 'hatch_forms_submissions_schema', '0.52.0', false );
	}

	private static function persist_submission( string $provider, int $form_id, array $fields ): int {
		global $wpdb;
		$table = $wpdb->prefix . 'hatch_form_submissions';
		$ip    = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		$ua    = isset( $_SERVER['HTTP_USER_AGENT'] ) ? substr( sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ), 0, 254 ) : '';
		$ok = $wpdb->insert( $table, array(
			'provider'   => $provider,
			'form_id'    => $form_id,
			'fields'     => wp_json_encode( $fields ),
			'ip_address' => $ip,
			'user_agent' => $ua,
			'created_at' => current_time( 'mysql' ),
		), array( '%s', '%d', '%s', '%s', '%s', '%s' ) );
		return $ok ? (int) $wpdb->insert_id : 0;
	}

	private function __construct() {}

	public static function register_routes(): void {
		$ns = defined( 'HATCH_REST_NAMESPACE' ) ? HATCH_REST_NAMESPACE : 'hatch/v1';

		register_rest_route( $ns, '/forms', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'list_forms' ),
			'permission_callback' => '__return_true',
		) );

		register_rest_route( $ns, '/forms/(?P<provider>[a-z_]+)/(?P<id>\d+)', array(
			'methods'             => WP_REST_Server::READABLE,
			'callback'            => array( __CLASS__, 'get_schema' ),
			'permission_callback' => '__return_true',
			'args'                => array(
				'provider' => array( 'sanitize_callback' => 'sanitize_key' ),
				'id'       => array( 'sanitize_callback' => 'absint' ),
			),
		) );

		register_rest_route( $ns, '/forms/(?P<provider>[a-z_]+)/(?P<id>\d+)/submit', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( __CLASS__, 'submit_form' ),
			'permission_callback' => '__return_true',
			'args'                => array(
				'provider' => array( 'sanitize_callback' => 'sanitize_key' ),
				'id'       => array( 'sanitize_callback' => 'absint' ),
			),
		) );
	}

	/* --------------------------------------------------------------------- *
	 * Listing
	 * --------------------------------------------------------------------- */

	public static function list_forms(): WP_REST_Response {
		$out = array();
		$out = array_merge( $out, self::list_wpforms() );
		$out = array_merge( $out, self::list_fluent() );
		$out = array_merge( $out, self::list_gravity() );
		$out = array_merge( $out, self::list_cf7() );
		return new WP_REST_Response( $out, 200 );
	}

	private static function list_wpforms(): array {
		if ( ! function_exists( 'wpforms' ) ) {
			return array();
		}
		$forms = wpforms()->form->get( '', array( 'orderby' => 'title' ) );
		$out   = array();
		foreach ( (array) $forms as $form ) {
			$out[] = array( 'id' => (int) $form->ID, 'title' => $form->post_title, 'provider' => 'wpforms' );
		}
		return $out;
	}

	private static function list_fluent(): array {
		if ( ! class_exists( '\FluentForm\App\Models\Form' ) ) {
			return array();
		}
		try {
			$forms = \FluentForm\App\Models\Form::orderBy( 'title' )->get();
			$out   = array();
			foreach ( $forms as $f ) {
				$out[] = array( 'id' => (int) $f->id, 'title' => $f->title, 'provider' => 'fluent' );
			}
			return $out;
		} catch ( \Throwable $e ) {
			return array();
		}
	}

	private static function list_gravity(): array {
		if ( ! class_exists( 'GFAPI' ) ) {
			return array();
		}
		$forms = GFAPI::get_forms();
		$out   = array();
		foreach ( (array) $forms as $form ) {
			$out[] = array( 'id' => (int) $form['id'], 'title' => (string) $form['title'], 'provider' => 'gravity' );
		}
		return $out;
	}

	private static function list_cf7(): array {
		$cf7 = get_posts( array(
			'post_type'      => 'wpcf7_contact_form',
			'posts_per_page' => 200,
			'post_status'    => 'publish',
		) );
		$out = array();
		foreach ( $cf7 as $post ) {
			$out[] = array( 'id' => (int) $post->ID, 'title' => $post->post_title, 'provider' => 'cf7' );
		}
		return $out;
	}

	/* --------------------------------------------------------------------- *
	 * Schema (GET)
	 * --------------------------------------------------------------------- */

	public static function get_schema( WP_REST_Request $req ) {
		$provider = (string) $req->get_param( 'provider' );
		$id       = (int) $req->get_param( 'id' );
		if ( ! $id ) {
			return new WP_Error( 'hatch_forms_bad_id', 'Missing form id', array( 'status' => 400 ) );
		}
		switch ( $provider ) {
			case 'fluent':  return self::schema_fluent( $id );
			case 'wpforms': return self::schema_wpforms( $id );
			case 'gravity': return self::schema_gravity( $id );
			case 'cf7':     return self::schema_cf7( $id );
		}
		return new WP_Error( 'hatch_forms_unsupported', 'Unknown provider', array( 'status' => 400 ) );
	}

	private static function schema_fluent( int $id ) {
		if ( ! class_exists( '\FluentForm\App\Models\Form' ) ) {
			return new WP_Error( 'hatch_fluent_missing', 'Fluent Forms not active', array( 'status' => 503 ) );
		}
		$form = \FluentForm\App\Models\Form::find( $id );
		if ( ! $form ) {
			return new WP_Error( 'hatch_form_not_found', 'Form not found', array( 'status' => 404 ) );
		}
		$raw    = json_decode( $form->form_fields, true );
		$fields = array();
		if ( ! empty( $raw['fields'] ) && is_array( $raw['fields'] ) ) {
			foreach ( $raw['fields'] as $f ) {
				$fields[] = self::normalize_fluent_field( $f );
			}
		}
		return self::response( 'fluent', $id, $form->title, array_values( array_filter( $fields ) ) );
	}

	private static function normalize_fluent_field( array $f ): ?array {
		$attrs = isset( $f['attributes'] ) ? $f['attributes'] : array();
		$sett  = isset( $f['settings'] ) ? $f['settings'] : array();
		$type  = isset( $attrs['type'] ) ? $attrs['type'] : ( isset( $f['element'] ) ? $f['element'] : '' );
		$name  = isset( $attrs['name'] ) ? $attrs['name'] : '';
		if ( ! $name ) {
			return null;
		}
		$map = array(
			'input_text'     => 'text',
			'input_email'    => 'email',
			'input_number'   => 'number',
			'input_url'      => 'url',
			'input_password' => 'password',
			'input_date'     => 'date',
			'input_hidden'   => 'hidden',
			'textarea'       => 'textarea',
			'select'         => 'select',
			'input_checkbox' => 'checkbox',
			'input_radio'    => 'radio',
			'phone'          => 'tel',
			'phone_field'    => 'tel',
		);
		$native = isset( $map[ $type ] ) ? $map[ $type ] : ( in_array( $type, array( 'text', 'email', 'textarea', 'select', 'checkbox', 'radio', 'hidden', 'tel', 'number', 'url', 'date' ), true ) ? $type : 'text' );

		$out = array(
			'name'        => $name,
			'type'        => $native,
			'label'       => isset( $sett['label'] ) ? $sett['label'] : '',
			'placeholder' => isset( $attrs['placeholder'] ) ? $attrs['placeholder'] : '',
			'required'    => ! empty( $sett['validation_rules']['required']['value'] ),
			'default'     => isset( $attrs['value'] ) ? $attrs['value'] : '',
			'rules'       => self::rules_from_fluent( $sett, $native ),
		);
		if ( in_array( $native, array( 'select', 'radio', 'checkbox' ), true ) && ! empty( $sett['advanced_options'] ) ) {
			$out['options'] = array_map( static function ( $o ) {
				return array( 'value' => isset( $o['value'] ) ? $o['value'] : '', 'label' => isset( $o['label'] ) ? $o['label'] : '' );
			}, $sett['advanced_options'] );
		}
		return $out;
	}

	/**
	 * Parse Fluent Forms `validation_rules` into the flat rules[] array the
	 * Astro client validator consumes. Only the rules we can run client-side
	 * are emitted; server-side revalidation still runs inside Fluent's own
	 * SubmissionService on POST /submit.
	 */
	private static function rules_from_fluent( array $sett, string $native ): array {
		$vr = isset( $sett['validation_rules'] ) && is_array( $sett['validation_rules'] ) ? $sett['validation_rules'] : array();
		$rules = array();

		if ( ! empty( $vr['required']['value'] ) ) {
			$rules[] = self::rule( 'required', null, isset( $vr['required']['message'] ) ? $vr['required']['message'] : '' );
		}
		if ( ! empty( $vr['email']['value'] ) || 'email' === $native ) {
			$rules[] = self::rule( 'email', null, isset( $vr['email']['message'] ) ? $vr['email']['message'] : '' );
		}
		if ( ! empty( $vr['url']['value'] ) || 'url' === $native ) {
			$rules[] = self::rule( 'url', null, isset( $vr['url']['message'] ) ? $vr['url']['message'] : '' );
		}
		if ( ! empty( $vr['numeric']['value'] ) || 'number' === $native ) {
			$rules[] = self::rule( 'numeric', null, isset( $vr['numeric']['message'] ) ? $vr['numeric']['message'] : '' );
		}
		// Fluent uses `min` / `max` for numeric and `min_length` / `max_length`
		// for strings. Collapse into the shared rule shape; the client picks
		// numeric-vs-length based on the value type.
		foreach ( array( 'min', 'min_length' ) as $k ) {
			if ( isset( $vr[ $k ]['value'] ) && '' !== $vr[ $k ]['value'] ) {
				$rules[] = self::rule( 'min', (float) $vr[ $k ]['value'], isset( $vr[ $k ]['message'] ) ? $vr[ $k ]['message'] : '' );
			}
		}
		foreach ( array( 'max', 'max_length' ) as $k ) {
			if ( isset( $vr[ $k ]['value'] ) && '' !== $vr[ $k ]['value'] ) {
				$rules[] = self::rule( 'max', (float) $vr[ $k ]['value'], isset( $vr[ $k ]['message'] ) ? $vr[ $k ]['message'] : '' );
			}
		}
		if ( ! empty( $vr['regex']['value'] ) ) {
			$rules[] = self::rule( 'regex', (string) $vr['regex']['value'], isset( $vr['regex']['message'] ) ? $vr['regex']['message'] : '' );
		}

		// De-dupe by type+value (email may show up twice: element=email + rule=email).
		$seen = array();
		$out  = array();
		foreach ( $rules as $r ) {
			$key = $r['type'] . '|' . ( isset( $r['value'] ) ? $r['value'] : '' );
			if ( isset( $seen[ $key ] ) ) {
				continue;
			}
			$seen[ $key ] = true;
			$out[]        = $r;
		}
		return $out;
	}

	private static function rule( string $type, $value = null, string $message = '' ): array {
		$r = array( 'type' => $type );
		if ( null !== $value ) {
			$r['value'] = $value;
		}
		if ( '' !== $message ) {
			$r['message'] = $message;
		}
		return $r;
	}

	private static function schema_wpforms( int $id ) {
		if ( ! function_exists( 'wpforms' ) ) {
			return new WP_Error( 'hatch_wpforms_missing', 'WPForms not active', array( 'status' => 503 ) );
		}
		$form = wpforms()->form->get( $id );
		if ( ! $form ) {
			return new WP_Error( 'hatch_form_not_found', 'Form not found', array( 'status' => 404 ) );
		}
		$data   = json_decode( $form->post_content, true );
		$fields = array();
		if ( ! empty( $data['fields'] ) && is_array( $data['fields'] ) ) {
			foreach ( $data['fields'] as $f ) {
				$type = isset( $f['type'] ) ? $f['type'] : 'text';
				$map  = array( 'name' => 'text', 'email' => 'email', 'textarea' => 'textarea', 'select' => 'select', 'radio' => 'radio', 'checkbox' => 'checkbox', 'number' => 'number', 'url' => 'url', 'phone' => 'tel', 'date-time' => 'date' );
				$native = isset( $map[ $type ] ) ? $map[ $type ] : 'text';
				$rules  = array();
				if ( ! empty( $f['required'] ) ) {
					$rules[] = self::rule( 'required' );
				}
				if ( 'email' === $native ) {
					$rules[] = self::rule( 'email' );
				}
				if ( 'url' === $native ) {
					$rules[] = self::rule( 'url' );
				}
				if ( 'number' === $native ) {
					$rules[] = self::rule( 'numeric' );
				}
				if ( isset( $f['min_length'] ) && '' !== $f['min_length'] ) {
					$rules[] = self::rule( 'min', (float) $f['min_length'] );
				}
				if ( isset( $f['max_length'] ) && '' !== $f['max_length'] ) {
					$rules[] = self::rule( 'max', (float) $f['max_length'] );
				}
				$fields[] = array(
					'name'        => 'wpforms[fields][' . ( isset( $f['id'] ) ? $f['id'] : 0 ) . ']',
					'type'        => $native,
					'label'       => isset( $f['label'] ) ? $f['label'] : '',
					'placeholder' => isset( $f['placeholder'] ) ? $f['placeholder'] : '',
					'required'    => ! empty( $f['required'] ),
					'default'     => isset( $f['default_value'] ) ? $f['default_value'] : '',
					'rules'       => $rules,
				);
			}
		}
		return self::response( 'wpforms', $id, $form->post_title, $fields );
	}

	private static function schema_gravity( int $id ) {
		if ( ! class_exists( 'GFAPI' ) ) {
			return new WP_Error( 'hatch_gf_missing', 'Gravity Forms not active', array( 'status' => 503 ) );
		}
		$form = GFAPI::get_form( $id );
		if ( ! $form ) {
			return new WP_Error( 'hatch_form_not_found', 'Form not found', array( 'status' => 404 ) );
		}
		$fields = array();
		foreach ( (array) $form['fields'] as $f ) {
			$map = array( 'text' => 'text', 'email' => 'email', 'textarea' => 'textarea', 'select' => 'select', 'radio' => 'radio', 'checkbox' => 'checkbox', 'number' => 'number', 'phone' => 'tel', 'website' => 'url', 'date' => 'date', 'hidden' => 'hidden' );
			$type = isset( $f->type ) ? $f->type : 'text';
			$fields[] = array(
				'name'        => 'input_' . $f->id,
				'type'        => isset( $map[ $type ] ) ? $map[ $type ] : 'text',
				'label'       => isset( $f->label ) ? $f->label : '',
				'placeholder' => isset( $f->placeholder ) ? $f->placeholder : '',
				'required'    => ! empty( $f->isRequired ),
				'default'     => isset( $f->defaultValue ) ? $f->defaultValue : '',
			);
		}
		return self::response( 'gravity', $id, $form['title'], $fields );
	}

	private static function schema_cf7( int $id ) {
		$post = get_post( $id );
		if ( ! $post || 'wpcf7_contact_form' !== $post->post_type ) {
			return new WP_Error( 'hatch_form_not_found', 'CF7 form not found', array( 'status' => 404 ) );
		}
		$fields = array();
		if ( class_exists( 'WPCF7_ContactForm' ) ) {
			$cf = WPCF7_ContactForm::get_instance( $id );
			if ( $cf ) {
				foreach ( $cf->scan_form_tags() as $tag ) {
					$basetype = isset( $tag->basetype ) ? $tag->basetype : ( isset( $tag['basetype'] ) ? $tag['basetype'] : '' );
					$name     = isset( $tag->name ) ? $tag->name : ( isset( $tag['name'] ) ? $tag['name'] : '' );
					if ( ! $name || in_array( $basetype, array( 'submit', '' ), true ) ) {
						continue;
					}
					$map = array( 'text' => 'text', 'email' => 'email', 'textarea' => 'textarea', 'select' => 'select', 'checkbox' => 'checkbox', 'radio' => 'radio', 'tel' => 'tel', 'url' => 'url', 'number' => 'number', 'date' => 'date' );
					$fields[] = array(
						'name'     => $name,
						'type'     => isset( $map[ $basetype ] ) ? $map[ $basetype ] : 'text',
						'label'    => $name,
						'required' => ( isset( $tag->is_required ) && $tag->is_required() ),
						'default'  => '',
					);
				}
			}
		}
		return self::response( 'cf7', $id, $post->post_title, $fields );
	}

	private static function response( string $provider, int $id, string $title, array $fields ): WP_REST_Response {
		// v0.51 (#208): shape aligned with HatchForm.astro + the Astro proxy.
		// Client checks `schema.ok` and posts to `schema.submit.url` (proxy
		// rewrites the URL to same-origin /api/hatch-form/{provider}/{id}/submit).
		return new WP_REST_Response( array(
			'ok'              => true,
			'provider'        => $provider,
			'id'              => $id,
			'title'           => $title,
			'fields'          => $fields,
			'submit'          => array(
				'url'    => rest_url( 'hatch/v1/forms/' . $provider . '/' . $id . '/submit' ),
				'method' => 'POST',
			),
			// Kept for backwards-compat with any existing consumers.
			'submit_endpoint' => rest_url( 'hatch/v1/forms/' . $provider . '/' . $id . '/submit' ),
		), 200 );
	}

	/* --------------------------------------------------------------------- *
	 * Submit (POST)
	 * --------------------------------------------------------------------- */

	public static function submit_form( WP_REST_Request $req ) {
		$provider = (string) $req->get_param( 'provider' );
		$id       = (int) $req->get_param( 'id' );
		$payload  = $req->get_json_params();
		if ( ! is_array( $payload ) ) {
			$payload = $req->get_body_params();
		}
		if ( ! is_array( $payload ) ) {
			$payload = array();
		}
		$fields = isset( $payload['fields'] ) && is_array( $payload['fields'] ) ? $payload['fields'] : $payload;

		$result = null;
		switch ( $provider ) {
			case 'fluent':  $result = self::submit_fluent( $id, $fields ); break;
			case 'gravity': $result = self::submit_gravity( $id, $fields ); break;
			case 'wpforms': $result = self::submit_wpforms_real( $id, $fields ); break;
			case 'cf7':     $result = self::submit_cf7_real( $id, $fields, $req ); break;
			default:
				return new WP_Error( 'hatch_forms_unsupported', 'Unknown provider', array( 'status' => 400 ) );
		}
		// v0.52 — mirror every successful submission to the Hatch-owned
		// table so operators have a queryable log even when the plugin
		// itself (e.g. WPForms Lite) does not persist entries.
		$is_success = ( $result instanceof WP_REST_Response )
			&& is_array( $result->get_data() )
			&& ! empty( $result->get_data()['ok'] );
		if ( $is_success ) {
			self::ensure_submissions_table();
			$sid = self::persist_submission( $provider, $id, $fields );
			if ( $sid ) {
				$data = $result->get_data();
				$data['submission_id'] = $sid;
				$result->set_data( $data );
			}
		}
		return $result;
	}

	private static function submit_fluent( int $id, array $fields ) {
		if ( ! class_exists( '\FluentForm\App\Models\Form' ) ) {
			return new WP_Error( 'hatch_fluent_missing', 'Fluent Forms not active', array( 'status' => 503 ) );
		}
		$form = \FluentForm\App\Models\Form::find( $id );
		if ( ! $form ) {
			return new WP_Error( 'hatch_form_not_found', 'Form not found', array( 'status' => 404 ) );
		}

		// Replay Fluent's full submission pipeline via its own service so
		// validators + honeypot + spam + notifications + confirmations run.
		// Backlog #158 rule: on failure we return 503 rather than fall back
		// to a raw insert. Bypassing validation to save data was the
		// security regression.
		//
		// v0.51 (#208): Fluent Forms renamed its submission entrypoint to
		// SubmissionHandlerService::handleSubmission(). The old
		// SubmissionService::submit() only exists in very old Fluent
		// builds. Try the new service first, fall back to the old only if
		// the new class is missing. Both replay the same pipeline.
		if ( class_exists( '\FluentForm\App\Services\Form\SubmissionHandlerService' ) ) {
			try {
				$_POST['data']    = http_build_query( $fields );
				$_POST['form_id'] = $id;
				$_REQUEST         = array_merge( (array) $_REQUEST, $_POST );
				$service          = new \FluentForm\App\Services\Form\SubmissionHandlerService();
				$result           = $service->handleSubmission( $fields, $id );
				$msg = 'Thanks for submitting.';
				$entry = 0;
				if ( is_array( $result ) ) {
					if ( isset( $result['message'] ) ) $msg = (string) $result['message'];
					if ( isset( $result['insert_id'] ) ) $entry = (int) $result['insert_id'];
				}
				return new WP_REST_Response( array(
					'ok'      => true,
					'message' => $msg,
					'entry'   => $entry,
				), 200 );
			} catch ( \FluentForm\Framework\Validator\ValidationException $ve ) {
				return new WP_REST_Response( array(
					'ok'     => false,
					'errors' => method_exists( $ve, 'errors' ) ? $ve->errors() : array(),
				), 422 );
			} catch ( \Throwable $e ) {
				return new WP_Error(
					'hatch_fluent_handler_failed',
					'Fluent SubmissionHandlerService failed: ' . $e->getMessage(),
					array( 'status' => 503 )
				);
			}
		}

		if ( class_exists( '\FluentForm\App\Services\Submission\SubmissionService' )
			&& method_exists( '\FluentForm\App\Services\Submission\SubmissionService', 'submit' ) ) {
			try {
				$_POST['data']    = http_build_query( $fields );
				$_POST['form_id'] = $id;
				$_REQUEST         = array_merge( (array) $_REQUEST, $_POST );
				$service          = new \FluentForm\App\Services\Submission\SubmissionService();
				$result           = $service->submit();
				return new WP_REST_Response( array(
					'ok'      => true,
					'message' => isset( $result['message'] ) ? (string) $result['message'] : 'Thanks for submitting.',
					'entry'   => isset( $result['insert_id'] ) ? (int) $result['insert_id'] : 0,
				), 200 );
			} catch ( \Throwable $e ) {
				return new WP_Error(
					'hatch_fluent_service_failed',
					'Fluent SubmissionService failed: ' . $e->getMessage(),
					array( 'status' => 503 )
				);
			}
		}

		return new WP_Error(
			'hatch_fluent_service_missing',
			'Fluent Forms submission service is unavailable on this site; refusing to bypass validation. Update Fluent Forms.',
			array( 'status' => 503 )
		);
	}

	private static function submit_gravity( int $id, array $fields ) {
		if ( ! class_exists( 'GFAPI' ) ) {
			return new WP_Error( 'hatch_gf_missing', 'Gravity Forms not active', array( 'status' => 503 ) );
		}
		$result = GFAPI::submit_form( $id, $fields );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$valid = ! empty( $result['is_valid'] );
		return new WP_REST_Response( array(
			'ok'      => $valid,
			'message' => $valid ? ( isset( $result['confirmation_message'] ) ? wp_strip_all_tags( (string) $result['confirmation_message'] ) : 'Submitted' ) : 'Validation failed',
			'errors'  => isset( $result['validation_messages'] ) ? $result['validation_messages'] : array(),
			'entry'   => isset( $result['entry_id'] ) ? (int) $result['entry_id'] : 0,
		), $valid ? 200 : 422 );
	}

	private static function submit_wpforms_real( int $id, array $fields ) {
		if ( ! function_exists( 'wpforms' ) ) {
			return new WP_Error( 'hatch_wpforms_missing', 'WPForms not active', array( 'status' => 503 ) );
		}
		$form = wpforms()->form->get( $id );
		if ( ! $form ) {
			return new WP_Error( 'hatch_form_not_found', 'Form not found', array( 'status' => 404 ) );
		}
		$form_data = wpforms_decode( $form->post_content );
		$entry_id  = 0;
		if ( function_exists( 'wpforms' ) && isset( wpforms()->entry ) ) {
			$entry_id = (int) wpforms()->entry->add( array(
				'form_id'      => $id,
				'user_id'      => get_current_user_id(),
				'fields'       => wp_json_encode( $fields ),
				'ip_address'   => isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '',
				'user_agent'   => isset( $_SERVER['HTTP_USER_AGENT'] ) ? substr( sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ), 0, 254 ) : '',
				'date'         => current_time( 'mysql' ),
				'status'       => '',
				'type'         => '',
				'viewed'       => 0,
				'starred'      => 0,
			) );
		}
		do_action( 'wpforms_process_complete', $fields, array(), $id, $form_data );
		return new WP_REST_Response( array(
			'ok'      => true,
			'message' => isset( $form_data['settings']['confirmations'][1]['message'] ) ? wp_strip_all_tags( (string) $form_data['settings']['confirmations'][1]['message'] ) : 'Thanks.',
			'entry'   => $entry_id,
		), 200 );
	}

	private static function submit_cf7_real( int $id, array $fields, WP_REST_Request $req ) {
		if ( ! class_exists( 'WPCF7_ContactForm' ) ) {
			return new WP_Error( 'hatch_cf7_missing', 'Contact Form 7 not active', array( 'status' => 503 ) );
		}
		// CF7 has its own REST at /contact-form-7/v1/contact-forms/{id}/feedback.
		// We proxy internally so callers use Hatch's uniform endpoint.
		$url  = rest_url( 'contact-form-7/v1/contact-forms/' . $id . '/feedback' );
		$body = array();
		foreach ( $fields as $k => $v ) {
			$body[ $k ] = is_array( $v ) ? $v : (string) $v;
		}
		$res = wp_remote_post( $url, array(
			'body'    => $body,
			'timeout' => 15,
			'headers' => array( 'Accept' => 'application/json' ),
		) );
		if ( is_wp_error( $res ) ) {
			return $res;
		}
		$code = wp_remote_retrieve_response_code( $res );
		$json = json_decode( wp_remote_retrieve_body( $res ), true );
		$ok   = isset( $json['status'] ) && 'mail_sent' === $json['status'];
		return new WP_REST_Response( array(
			'ok'      => $ok,
			'message' => isset( $json['message'] ) ? (string) $json['message'] : '',
			'errors'  => isset( $json['invalid_fields'] ) ? $json['invalid_fields'] : array(),
		), $code ?: 200 );
	}

	/* --------------------------------------------------------------------- *
	 * Shortcode rewriter: [fluentform id=X] -> <div class="hatch-form-mount">
	 * Hooked to `hatch/content/html` filter (from route_content_by_slug).
	 * --------------------------------------------------------------------- */

	public static function rewrite_form_shortcodes( string $html, $post = null ): string {
		$patterns = array(
			'fluent'  => '/\[fluentform\s+id=[\'"]?(\d+)[\'"]?[^\]]*\]/i',
			'wpforms' => '/\[wpforms\s+id=[\'"]?(\d+)[\'"]?[^\]]*\]/i',
			'gravity' => '/\[gravityform\s+id=[\'"]?(\d+)[\'"]?[^\]]*\]/i',
			'cf7'     => '/\[contact-form-7\s+id=[\'"]?(\d+)[\'"]?[^\]]*\]/i',
		);
		foreach ( $patterns as $provider => $regex ) {
			$html = preg_replace_callback( $regex, static function ( $m ) use ( $provider ) {
				return sprintf(
					'<div class="hatch-form-mount" data-hatch-form-provider="%s" data-hatch-form-id="%d"></div>',
					esc_attr( $provider ),
					(int) $m[1]
				);
			}, $html );
		}
		return $html;
	}
}

// Self-boot: registers rest_api_init + content filter on first load.
Hatch_Forms_Bridge::instance();

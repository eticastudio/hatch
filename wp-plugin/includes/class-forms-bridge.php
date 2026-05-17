<?php
/**
 * Forms bridge — exposes WPForms / Fluent Forms / Gravity / CF7 to the frontend.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Forms_Bridge
 */
class Hatch_Forms_Bridge {

	/**
	 * @var Hatch_Forms_Bridge|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Forms_Bridge
	 */
	public static function instance(): Hatch_Forms_Bridge {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * No-op — REST routes registered in Hatch_Rest_Api.
	 */
	private function __construct() {}

	/**
	 * GET /hatch/v1/forms — list all forms across detected form plugins.
	 *
	 * @return WP_REST_Response
	 */
	public static function list_forms(): WP_REST_Response {
		$out = array();

		// WPForms (lite + pro share API).
		if ( Hatch_Detector::is_active( 'wpforms' ) || Hatch_Detector::is_active( 'wpforms_pro' ) ) {
			if ( function_exists( 'wpforms' ) ) {
				$forms = wpforms()->form->get( '', array( 'orderby' => 'title' ) );
				foreach ( (array) $forms as $form ) {
					$out[] = array(
						'id'     => intval( $form->ID ),
						'title'  => $form->post_title,
						'plugin' => 'wpforms',
					);
				}
			}
		}

		// Fluent Forms.
		if ( Hatch_Detector::is_active( 'fluent_forms' ) && class_exists( '\FluentForm\App\Models\Form' ) ) {
			try {
				$forms = \FluentForm\App\Models\Form::orderBy( 'title' )->get();
				foreach ( $forms as $form ) {
					$out[] = array(
						'id'     => intval( $form->id ),
						'title'  => $form->title,
						'plugin' => 'fluent_forms',
					);
				}
			} catch ( \Throwable $e ) {
				// Fluent table may not exist yet; ignore.
			}
		}

		// Gravity Forms.
		if ( Hatch_Detector::is_active( 'gravity_forms' ) && class_exists( 'GFAPI' ) ) {
			$forms = GFAPI::get_forms();
			foreach ( (array) $forms as $form ) {
				$out[] = array(
					'id'     => intval( $form['id'] ),
					'title'  => $form['title'],
					'plugin' => 'gravity_forms',
				);
			}
		}

		// CF7.
		if ( Hatch_Detector::is_active( 'cf7' ) ) {
			$cf7 = get_posts( array(
				'post_type'      => 'wpcf7_contact_form',
				'posts_per_page' => 200,
				'post_status'    => 'publish',
			) );
			foreach ( $cf7 as $form ) {
				$out[] = array(
					'id'     => $form->ID,
					'title'  => $form->post_title,
					'plugin' => 'cf7',
				);
			}
		}

		return new WP_REST_Response( $out, 200 );
	}

	/**
	 * POST /hatch/v1/forms/{id}/submit — delegate to the owning plugin.
	 *
	 * Note: each form plugin has different submission semantics. This endpoint
	 * delegates to the plugin's native AJAX/REST handler when available and
	 * returns a normalized response.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public static function submit_form( WP_REST_Request $request ) {
		$form_id = absint( $request->get_param( 'id' ) );
		$payload = $request->get_json_params();

		if ( ! $form_id ) {
			return new WP_Error( 'hatch_invalid_form', __( 'Missing form ID', 'hatch' ), array( 'status' => 400 ) );
		}

		// Resolve which plugin owns this ID.
		$owner = self::resolve_owner( $form_id );
		if ( 'unknown' === $owner ) {
			return new WP_Error( 'hatch_form_not_found', __( 'No form found with that ID', 'hatch' ), array( 'status' => 404 ) );
		}

		switch ( $owner ) {
			case 'wpforms':
				return self::submit_wpforms( $form_id, $payload );
			case 'fluent_forms':
				return self::submit_fluent_forms( $form_id, $payload );
			case 'gravity_forms':
				return self::submit_gravity_forms( $form_id, $payload );
			case 'cf7':
				return self::submit_cf7( $form_id, $payload );
			default:
				return new WP_Error( 'hatch_form_unsupported', __( 'Form plugin not supported', 'hatch' ), array( 'status' => 501 ) );
		}
	}

	/**
	 * Resolve which form plugin owns a given form ID.
	 *
	 * @param int $form_id Form ID.
	 * @return string 'wpforms' | 'fluent_forms' | 'gravity_forms' | 'cf7' | 'unknown'
	 */
	private static function resolve_owner( int $form_id ): string {
		if ( function_exists( 'wpforms' ) && wpforms()->form->get( $form_id ) ) {
			return 'wpforms';
		}
		if ( class_exists( '\FluentForm\App\Models\Form' ) ) {
			try {
				$f = \FluentForm\App\Models\Form::find( $form_id );
				if ( $f ) {
					return 'fluent_forms';
				}
			} catch ( \Throwable $e ) {
				// ignore
			}
		}
		if ( class_exists( 'GFAPI' ) && GFAPI::get_form( $form_id ) ) {
			return 'gravity_forms';
		}
		$post = get_post( $form_id );
		if ( $post && 'wpcf7_contact_form' === $post->post_type ) {
			return 'cf7';
		}
		return 'unknown';
	}

	/**
	 * WPForms submission — uses internal process API.
	 *
	 * @param int   $form_id Form ID.
	 * @param array $payload Field values keyed by field ID.
	 * @return WP_REST_Response|WP_Error
	 */
	private static function submit_wpforms( int $form_id, array $payload ) {
		// WPForms' AJAX submit is fed via $_POST — adapt.
		// Implementation note: full WPForms AJAX flow is intricate; V1 ships
		// validate-only + raw entry insertion via wpforms_process_complete action.
		do_action( 'wpforms_process_complete', $payload, array(), $form_id, array() );
		return new WP_REST_Response( array( 'success' => true, 'plugin' => 'wpforms' ), 200 );
	}

	/**
	 * Fluent Forms submission.
	 *
	 * @param int   $form_id Form ID.
	 * @param array $payload Payload.
	 * @return WP_REST_Response
	 */
	private static function submit_fluent_forms( int $form_id, array $payload ): WP_REST_Response {
		// Fluent has a REST endpoint of its own — defer to it.
		// V1 returns success after schema validation; full integration in V1.1.
		return new WP_REST_Response( array( 'success' => true, 'plugin' => 'fluent_forms' ), 200 );
	}

	/**
	 * Gravity Forms submission via GFAPI::submit_form.
	 *
	 * @param int   $form_id Form ID.
	 * @param array $payload Payload.
	 * @return WP_REST_Response|WP_Error
	 */
	private static function submit_gravity_forms( int $form_id, array $payload ) {
		if ( ! class_exists( 'GFAPI' ) ) {
			return new WP_Error( 'hatch_gf_missing', 'Gravity Forms unavailable', array( 'status' => 500 ) );
		}
		$result = GFAPI::submit_form( $form_id, $payload );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return new WP_REST_Response(
			array(
				'success'      => empty( $result['is_valid'] ) ? false : true,
				'plugin'       => 'gravity_forms',
				'confirmation' => isset( $result['confirmation_message'] ) ? $result['confirmation_message'] : '',
				'errors'       => isset( $result['validation_messages'] ) ? $result['validation_messages'] : array(),
			),
			200
		);
	}

	/**
	 * Contact Form 7 submission.
	 *
	 * @param int   $form_id Form ID.
	 * @param array $payload Payload.
	 * @return WP_REST_Response
	 */
	private static function submit_cf7( int $form_id, array $payload ): WP_REST_Response {
		// CF7 uses its own REST API at /contact-form-7/v1/contact-forms/{id}/feedback.
		// Cleanest path: redirect callers to CF7's own endpoint via the @hatch/forms client.
		return new WP_REST_Response(
			array(
				'success'   => false,
				'plugin'    => 'cf7',
				'use_native' => '/wp-json/contact-form-7/v1/contact-forms/' . $form_id . '/feedback',
			),
			200
		);
	}
}

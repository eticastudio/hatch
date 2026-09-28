<?php
/**
 * Hatch Headless Forms: registers the private "Hatch Submissions" post type.
 *
 * Form submissions are handled by the form plugin's own REST endpoints, which the
 * frontend calls directly, so Hatch exposes no submit or embed route of its own.
 * The post type stays registered so that submissions stored by earlier versions
 * remain readable under Tools in the admin, and so uninstall can remove them.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Registers the submissions post type.
 */
class Hatch_Headless_Forms {

	const SUBMISSIONS_CPT = 'hatch_submission';

	/**
	 * Register the private submissions post type (no menu entry, no REST).
	 *
	 * @return void
	 */
	public static function register_cpt(): void {
		register_post_type(
			self::SUBMISSIONS_CPT,
			array(
				'labels'          => array(
					'name'          => __( 'Hatch Submissions', 'hatch-bridge' ),
					'singular_name' => __( 'Submission', 'hatch-bridge' ),
				),
				'public'          => false,
				'show_ui'         => true,
				'show_in_menu'    => false,
				'show_in_rest'    => false,
				'supports'        => array( 'title', 'editor', 'custom-fields' ),
				'capability_type' => 'post',
				'map_meta_cap'    => true,
				'capabilities'    => array(
					'create_posts' => 'do_not_allow',
				),
			)
		);
	}
}

add_action( 'init', array( 'Hatch_Headless_Forms', 'register_cpt' ) );

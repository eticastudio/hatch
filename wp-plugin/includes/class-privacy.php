<?php
/**
 * Privacy tools: policy text, personal data export and erasure.
 *
 * Hatch keeps one thing about visitors: headless form submissions, with the
 * visitor's address and browser string, in its own table for 90 days. This
 * class tells site owners that for their privacy policy and plugs the table
 * into the WordPress Tools > Export and Erase Personal Data screens.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Privacy
 */
class Hatch_Privacy {

	/** Rows handled per exporter or eraser page. */
	const PER_PAGE = 50;

	/**
	 * Hook everything up.
	 *
	 * @return void
	 */
	public static function boot(): void {
		add_action( 'admin_init', array( __CLASS__, 'add_policy_content' ) );
		add_filter( 'wp_privacy_personal_data_exporters', array( __CLASS__, 'register_exporter' ) );
		add_filter( 'wp_privacy_personal_data_erasers', array( __CLASS__, 'register_eraser' ) );
	}

	/**
	 * Suggested text for the site's privacy policy.
	 *
	 * @return void
	 */
	public static function add_policy_content(): void {
		if ( ! function_exists( 'wp_add_privacy_policy_content' ) ) {
			return;
		}
		$text  = '<h2>' . esc_html__( 'Form submissions sent through Hatch', 'hatch-connect' ) . '</h2>';
		$text .= '<p>' . esc_html__( 'When a form on the connected frontend is submitted, Hatch passes it to your form plugin and also keeps a copy in this site\'s database: the fields the visitor filled in, their IP address and their browser user agent. Copies are deleted automatically after 90 days. Cloudflare, which serves the frontend, processes visitor requests under its own privacy policy.', 'hatch-connect' ) . '</p>';
		wp_add_privacy_policy_content( 'Hatch Connect', wp_kses_post( wpautop( $text, false ) ) );
	}

	/**
	 * Add the exporter.
	 *
	 * @param array $exporters Registered exporters.
	 * @return array
	 */
	public static function register_exporter( $exporters ) {
		$exporters['hatch-connect'] = array(
			'exporter_friendly_name' => __( 'Hatch form submissions', 'hatch-connect' ),
			'callback'               => array( __CLASS__, 'export' ),
		);
		return $exporters;
	}

	/**
	 * Add the eraser.
	 *
	 * @param array $erasers Registered erasers.
	 * @return array
	 */
	public static function register_eraser( $erasers ) {
		$erasers['hatch-connect'] = array(
			'eraser_friendly_name' => __( 'Hatch form submissions', 'hatch-connect' ),
			'callback'             => array( __CLASS__, 'erase' ),
		);
		return $erasers;
	}

	/**
	 * Stored submissions whose fields mention an email address.
	 *
	 * @param string $email Email address.
	 * @param int    $page  1-based page.
	 * @return array<int, object>
	 */
	private static function rows_for( string $email, int $page ): array {
		global $wpdb;
		$table = $wpdb->prefix . 'hatch_form_submissions';
		$like  = '%' . $wpdb->esc_like( wp_json_encode( $email ) ) . '%';
		$limit = self::PER_PAGE;
		// Always page from the start for erasure; export passes its own page.
		$offset = max( 0, $page - 1 ) * $limit;
		$rows   = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Plugin-owned table, personal-data lookup.
			$wpdb->prepare( 'SELECT id, provider, form_id, fields, ip_address, user_agent, created_at FROM %i WHERE fields LIKE %s ORDER BY id ASC LIMIT %d OFFSET %d', $table, $like, $limit, $offset )
		);
		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Export callback.
	 *
	 * @param string $email Email address.
	 * @param int    $page  1-based page.
	 * @return array
	 */
	public static function export( $email, $page = 1 ) {
		$items = array();
		$rows  = self::rows_for( (string) $email, (int) $page );
		foreach ( $rows as $row ) {
			$data    = array(
				array(
					'name'  => __( 'Form', 'hatch-connect' ),
					'value' => $row->provider . ' #' . $row->form_id,
				),
				array(
					'name'  => __( 'Submitted', 'hatch-connect' ),
					'value' => $row->created_at,
				),
				array(
					'name'  => __( 'Fields', 'hatch-connect' ),
					'value' => (string) $row->fields,
				),
				array(
					'name'  => __( 'IP address', 'hatch-connect' ),
					'value' => $row->ip_address,
				),
				array(
					'name'  => __( 'Browser', 'hatch-connect' ),
					'value' => $row->user_agent,
				),
			);
			$items[] = array(
				'group_id'    => 'hatch-form-submissions',
				'group_label' => __( 'Form submissions', 'hatch-connect' ),
				'item_id'     => 'hatch-submission-' . (int) $row->id,
				'data'        => $data,
			);
		}
		return array(
			'data' => $items,
			'done' => count( $rows ) < self::PER_PAGE,
		);
	}

	/**
	 * Erase callback. Always reads page 1: removed rows drop out of the result.
	 *
	 * @param string $email Email address.
	 * @param int    $page  Ignored.
	 * @return array
	 */
	public static function erase( $email, $page = 1 ) {
		unset( $page );
		global $wpdb;
		$table   = $wpdb->prefix . 'hatch_form_submissions';
		$rows    = self::rows_for( (string) $email, 1 );
		$removed = 0;
		foreach ( $rows as $row ) {
			$removed += (int) $wpdb->delete( $table, array( 'id' => (int) $row->id ), array( '%d' ) ); // phpcs:ignore WordPress.DB.DirectDatabaseQuery -- Plugin-owned table, erasure request.
		}
		return array(
			'items_removed'  => $removed > 0,
			'items_retained' => false,
			'messages'       => array(),
			'done'           => count( $rows ) < self::PER_PAGE,
		);
	}
}

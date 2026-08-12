<?php
/**
 * Hatch Headless Comments — minimal REST endpoint for the Astro frontend to
 * post comments back to WP without bouncing the user through wp-comments-post.
 *
 *  - GET  /hatch/v1/comments?post={id}   → flat tree of approved comments
 *  - POST /hatch/v1/comments              → submit a new comment (guest-friendly)
 *
 * Guest-friendly by design: no JWT, no cookie, no session gate. Anyone can
 * post with just name + email + content (matches WordPress default anonymous
 * flow). Turnstile is enforced server-side when the site turns it on.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Headless_Comments {

	/**
	 * Max submissions per IP inside RATE_WINDOW seconds.
	 */
	const RATE_LIMIT  = 3;
	const RATE_WINDOW = 300;

	public static function register_routes(): void {
		// v0.50.13 — gated by the Content tab "Enable headless comments"
		// toggle. If off, route does not register and the frontend component
		// falls back to "comments disabled".
		$flags = (array) get_option( 'hatch_content_flags', array() );
		if ( isset( $flags['comments_enabled'] ) && ! $flags['comments_enabled'] ) {
			return;
		}
		register_rest_route( HATCH_REST_NAMESPACE, '/comments', array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'route_list' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'post' => array( 'type' => 'integer', 'required' => true ),
				),
			),
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'route_submit' ),
				'permission_callback' => '__return_true',
			),
		) );
	}

	public static function route_list( WP_REST_Request $req ): WP_REST_Response {
		$post_id = (int) $req->get_param( 'post' );
		if ( $post_id <= 0 ) {
			return new WP_REST_Response( array( 'comments' => array(), 'count' => 0 ), 200 );
		}
		$comments = get_comments( array(
			'post_id' => $post_id,
			'status'  => 'approve',
			'orderby' => 'comment_date_gmt',
			'order'   => 'ASC',
			'number'  => 200,
		) );
		$out = array();
		foreach ( $comments as $c ) {
			$out[] = array(
				'id'         => (int) $c->comment_ID,
				'parent'     => (int) $c->comment_parent,
				'author'     => $c->comment_author,
				'avatar'     => get_avatar_url( $c, array( 'size' => 64 ) ),
				'date_gmt'   => mysql_to_rfc3339( $c->comment_date_gmt ),
				'content'    => apply_filters( 'comment_text', $c->comment_content, $c ),
				'is_author'  => ( (int) $c->user_id > 0 ) && user_can( (int) $c->user_id, 'edit_posts' ),
			);
		}
		return new WP_REST_Response( array( 'comments' => $out, 'count' => count( $out ) ), 200 );
	}

	public static function route_submit( WP_REST_Request $req ) {
		$cfg = Hatch_Integrations::get_all()['comments'];
		if ( ! $cfg['enabled'] ) {
			return self::field_error( 'hatch_comments_disabled', __( 'Comments are disabled.', 'hatch' ), 403 );
		}

		// Honeypot: bots fill everything. Real humans never touch a hidden field.
		$honey = trim( (string) $req->get_param( 'hatch_hp' ) );
		if ( $honey !== '' ) {
			// Silently accept-and-drop to avoid teaching spammers what tripped.
			return new WP_REST_Response( array(
				'ok'         => true,
				'comment_id' => 0,
				'status'     => 'pending',
				'id'         => 0,
				'approved'   => false,
				'message'    => __( 'Thanks — your comment is awaiting moderation.', 'hatch' ),
			), 201 );
		}

		// Per-IP rate limit: 3 submissions per 5 minutes.
		$ip     = self::ip();
		$rate_k = 'hatch_cmt_rl_' . md5( $ip );
		$count  = (int) get_transient( $rate_k );
		if ( $count >= self::RATE_LIMIT ) {
			return self::field_error(
				'hatch_rate_limited',
				__( 'You are commenting too quickly. Please wait a few minutes and try again.', 'hatch' ),
				429
			);
		}

		$post_id = (int) $req->get_param( 'post' );
		if ( $post_id <= 0 ) {
			$post_id = (int) $req->get_param( 'post_id' );
		}
		$author  = sanitize_text_field( (string) ( $req->get_param( 'author' ) ?? $req->get_param( 'author_name' ) ) );
		$email   = sanitize_email( (string) ( $req->get_param( 'email' ) ?? $req->get_param( 'author_email' ) ) );
		$url     = esc_url_raw( (string) $req->get_param( 'url' ) );
		$content = wp_kses_post( (string) $req->get_param( 'content' ) );
		$parent  = (int) $req->get_param( 'parent' );
		$token   = (string) $req->get_param( 'cf-turnstile-response' );

		$field_errors = array();
		if ( $post_id <= 0 || ! get_post( $post_id ) ) {
			return self::field_error( 'hatch_invalid_post', __( 'Invalid post.', 'hatch' ), 400, 'post' );
		}
		if ( 'publish' !== get_post_status( $post_id ) ) {
			return self::field_error( 'hatch_invalid_post', __( 'Post is not published.', 'hatch' ), 400, 'post' );
		}
		if ( ! comments_open( $post_id ) ) {
			return self::field_error( 'hatch_comments_closed', __( 'Comments are closed on this post.', 'hatch' ), 403 );
		}
		if ( $author === '' ) {
			$field_errors['author'] = __( 'Name is required.', 'hatch' );
		}
		if ( ! is_email( $email ) ) {
			$field_errors['email'] = __( 'A valid email is required.', 'hatch' );
		}
		if ( strlen( trim( wp_strip_all_tags( $content ) ) ) < 3 ) {
			$field_errors['content'] = __( 'Please write a longer comment.', 'hatch' );
		}
		if ( ! empty( $field_errors ) ) {
			return new WP_REST_Response( array(
				'ok'           => false,
				'code'         => 'hatch_invalid_fields',
				'message'      => __( 'Please fix the highlighted fields.', 'hatch' ),
				'field_errors' => $field_errors,
			), 400 );
		}

		if ( ! empty( $cfg['turnstile'] ) ) {
			$ok = Hatch_Integrations::verify_turnstile( $token, $ip );
			if ( ! $ok ) {
				return self::field_error( 'hatch_turnstile', __( 'Anti-spam challenge failed. Try again.', 'hatch' ), 400 );
			}
		}

		// wp_new_comment runs the full comment pipeline: wp_allow_comment
		// (duplicate detection, flood control, moderation-keys check),
		// wp_check_comment_disallowed_keys, plus notify hooks. Uses core's
		// comment_moderation option so admin toggles behave the same as a
		// WP-native theme.
		$moderate = ! empty( $cfg['moderate'] ) || (bool) get_option( 'comment_moderation' );

		// Temporarily force moderation flag onto the pipeline via filter if
		// the admin toggle asked for it but WP core option is off.
		$filter_added = false;
		if ( $moderate && ! (int) get_option( 'comment_moderation' ) ) {
			$force_pending = function ( $approved ) { return 0; };
			add_filter( 'pre_comment_approved', $force_pending, 20 );
			$filter_added = true;
		}

		$commentdata = array(
			'comment_post_ID'      => $post_id,
			'comment_author'       => $author,
			'comment_author_email' => $email,
			'comment_author_url'   => $url,
			'comment_content'      => $content,
			'comment_parent'       => $parent,
			'comment_type'         => 'comment',
			'user_id'              => 0,
		);

		$comment = wp_new_comment( $commentdata, true );

		if ( $filter_added && isset( $force_pending ) ) {
			remove_filter( 'pre_comment_approved', $force_pending, 20 );
		}

		if ( is_wp_error( $comment ) ) {
			$msg  = $comment->get_error_message();
			$code = $comment->get_error_code();
			// Core's flood control fires when the same IP or email posts
			// again inside a short window. Surface that as 429 so the client
			// UI can render "slow down" rather than a generic 400.
			$is_flood = ( 'comment_flood' === $code ) || ( stripos( (string) $msg, 'flood' ) !== false );
			if ( $is_flood ) {
				set_transient( $rate_k, self::RATE_LIMIT, self::RATE_WINDOW );
				return self::field_error(
					'hatch_rate_limited',
					__( 'You are commenting too quickly. Please wait a few minutes and try again.', 'hatch' ),
					429
				);
			}
			return self::field_error( 'hatch_insert_failed', $msg ?: __( 'Could not save comment.', 'hatch' ), 400 );
		}

		$comment_id = (int) $comment;
		if ( $comment_id <= 0 ) {
			return self::field_error( 'hatch_insert_failed', __( 'Could not save comment.', 'hatch' ), 500 );
		}

		$status_str = wp_get_comment_status( $comment_id );
		$approved   = ( 'approved' === $status_str );
		$status_out = $approved ? 'approved' : 'pending';

		// Bump rate limit after a successful save. Validation failures do
		// not count against the limit (fixing a typo should not lock you out).
		set_transient( $rate_k, $count + 1, self::RATE_WINDOW );

		return new WP_REST_Response( array(
			'ok'         => true,
			'comment_id' => $comment_id,
			'status'     => $status_out,
			// Legacy keys the current frontend script reads. Kept alongside
			// the new keys so we do not break the deployed page while the
			// component upgrades.
			'id'         => $comment_id,
			'approved'   => $approved,
			'message'    => $approved
				? __( 'Comment posted.', 'hatch' )
				: __( 'Held for moderation.', 'hatch' ),
		), 201 );
	}

	private static function field_error( string $code, string $message, int $status, string $field = '' ): WP_REST_Response {
		$body = array(
			'ok'      => false,
			'code'    => $code,
			'message' => $message,
		);
		if ( $field !== '' ) {
			$body['field_errors'] = array( $field => $message );
		}
		return new WP_REST_Response( $body, $status );
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

add_action( 'rest_api_init', array( 'Hatch_Headless_Comments', 'register_routes' ) );

<?php
/**
 * Hatch Headless Comments — minimal REST endpoint for the Astro frontend to
 * post comments back to WP without bouncing the user through wp-comments-post.
 *
 *  - GET  /hatch/v1/comments?post={id}   → flat tree of approved comments
 *  - POST /hatch/v1/comments              → submit a new comment
 *
 * Turnstile is enforced server-side via Hatch_Integrations::verify_turnstile().
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Headless_Comments {

	public static function register_routes(): void {
		// v0.50.13 — gated by the Content tab "Enable headless comments"
		// toggle (stored as content.comments_enabled inside the hatch_content_flags
		// nested option). If it's off, the route doesn't register and the
		// frontend component gracefully falls back to "comments disabled".
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
			return new WP_Error( 'hatch_comments_disabled', __( 'Comments are disabled.', 'hatch' ), array( 'status' => 403 ) );
		}

		$post_id = (int) $req->get_param( 'post' );
		$author  = sanitize_text_field( (string) $req->get_param( 'author' ) );
		$email   = sanitize_email( (string) $req->get_param( 'email' ) );
		$url     = esc_url_raw( (string) $req->get_param( 'url' ) ); // v0.50 — fixes "Undefined array key" warning in core.
		$content = wp_kses_post( (string) $req->get_param( 'content' ) );
		$parent  = (int) $req->get_param( 'parent' );
		$token   = (string) $req->get_param( 'cf-turnstile-response' );

		if ( $post_id <= 0 || ! get_post( $post_id ) ) {
			return new WP_Error( 'hatch_invalid_post', __( 'Invalid post.', 'hatch' ), array( 'status' => 400 ) );
		}
		if ( ! comments_open( $post_id ) ) {
			return new WP_Error( 'hatch_comments_closed', __( 'Comments are closed on this post.', 'hatch' ), array( 'status' => 403 ) );
		}
		if ( strlen( $content ) < 2 ) {
			return new WP_Error( 'hatch_empty', __( 'Please write a comment.', 'hatch' ), array( 'status' => 400 ) );
		}
		if ( ! is_email( $email ) ) {
			return new WP_Error( 'hatch_bad_email', __( 'A valid email is required.', 'hatch' ), array( 'status' => 400 ) );
		}
		if ( $author === '' ) {
			return new WP_Error( 'hatch_no_author', __( 'Name is required.', 'hatch' ), array( 'status' => 400 ) );
		}

		// Turnstile.
		if ( ! empty( $cfg['turnstile'] ) ) {
			$ok = Hatch_Integrations::verify_turnstile( $token, self::ip() );
			if ( ! $ok ) {
				return new WP_Error( 'hatch_turnstile', __( 'Anti-spam challenge failed. Try again.', 'hatch' ), array( 'status' => 400 ) );
			}
		}

		$user_id = 0;
		if ( ! empty( $cfg['require_login'] ) ) {
			if ( ! is_user_logged_in() ) {
				return new WP_Error( 'hatch_login_required', __( 'Sign-in required to comment.', 'hatch' ), array( 'status' => 401 ) );
			}
			$user_id = get_current_user_id();
		}

		$approved = empty( $cfg['moderate'] ) ? 1 : 0;

		$comment_id = wp_insert_comment( wp_filter_comment( array(
			'comment_post_ID'      => $post_id,
			'comment_author'       => $author,
			'comment_author_email' => $email,
			'comment_author_url'   => $url, // v0.50 — always pass; core's wp_filter_comment errors on undefined key.
			'comment_content'      => $content,
			'comment_parent'       => $parent,
			'comment_approved'     => $approved,
			'comment_type'         => 'comment',
			'comment_author_IP'    => self::ip(),
			'comment_agent'        => substr( (string) ( $_SERVER['HTTP_USER_AGENT'] ?? '' ), 0, 254 ),
			'user_id'              => $user_id,
		) ) );

		if ( ! $comment_id ) {
			return new WP_Error( 'hatch_insert_failed', __( 'Could not save comment.', 'hatch' ), array( 'status' => 500 ) );
		}

		return new WP_REST_Response( array(
			'ok'        => true,
			'id'        => (int) $comment_id,
			'approved'  => (bool) $approved,
			'message'   => $approved
				? __( 'Comment posted!', 'hatch' )
				: __( 'Thanks — your comment is awaiting moderation.', 'hatch' ),
		), 201 );
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

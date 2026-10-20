<?php
/**
 * REST permission callbacks.
 *
 * Every Hatch route names the permission callback that applies to it, so a
 * reader can see at a glance why a route is open and what protects it.
 *
 * Hatch is a headless bridge: the visitor-facing frontend reads published
 * content and submits forms while signed out. Those routes are public on
 * purpose. They return only what WordPress itself shows any visitor, and each
 * handler that accepts input validates and rate limits it. Anything that
 * exposes a signed-in user's data requires a verified session instead.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Rest_Permission
 */
class Hatch_Rest_Permission {

	/**
	 * Read-only route that returns published, already-public data.
	 *
	 * Used for menus, published content, SEO meta, feature flags, design tokens
	 * and the storefront catalogue: the same data any visitor can see on the
	 * site. The REST-lock option in class-security.php can still restrict these
	 * to signed-in users.
	 *
	 * @return bool
	 */
	public static function public_read(): bool {
		return true;
	}

	/**
	 * Route a signed-out visitor submits to: login, registration, comments, forms.
	 *
	 * Open by nature, like wp-login.php, wp-comments-post.php and a contact
	 * form. The handler behind it validates every field, applies its own nonce,
	 * key or rate limit, and never trusts the caller with more than the
	 * submission itself.
	 *
	 * @return bool
	 */
	public static function public_submit(): bool {
		return true;
	}

	/**
	 * Route that needs a verified Hatch session token.
	 *
	 * @param WP_REST_Request $request Current request.
	 * @return bool|WP_Error
	 */
	public static function session_required( $request ) {
		if ( class_exists( 'Hatch_Auth' ) && Hatch_Auth::has_valid_session( $request ) ) {
			return true;
		}
		return new WP_Error(
			'hatch_auth_unauthorized',
			__( 'Not authenticated.', 'hatch-connect' ),
			array( 'status' => 401 )
		);
	}
}

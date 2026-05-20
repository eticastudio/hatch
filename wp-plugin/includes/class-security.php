<?php
/**
 * Security hardening for headless WordPress.
 *
 * Each measure is opt-out via wp-admin settings (defaults: ON).
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Security
 */
class Hatch_Security {

	/**
	 * @var Hatch_Security|null
	 */
	private static $instance = null;

	/**
	 * Get singleton.
	 *
	 * @return Hatch_Security
	 */
	public static function instance(): Hatch_Security {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire up filters.
	 */
	private function __construct() {
		if ( get_option( 'hatch_security_harden_rest', 1 ) ) {
			// v0.50.10 — switched from rest_authentication_errors (which fires
			// BEFORE WP's lazy auth chain — the $current_user global gets
			// cached as the empty user before our check even runs) to
			// rest_pre_dispatch (which fires AFTER auth resolution, so
			// is_user_logged_in() reflects valid App Password credentials).
			add_filter( 'rest_pre_dispatch', array( $this, 'block_rest_unauthenticated_dispatch' ), 5, 3 );
			add_filter( 'rest_endpoints', array( $this, 'block_users_endpoint' ) );
			add_filter( 'rest_pre_dispatch', array( $this, 'block_users_list_for_anon' ), 10, 3 );
			// v0.50.10 — WP refuses to validate Application Passwords on non-HTTPS
			// sites by default. That's correct for unknown HTTP visitors but
			// breaks every reverse-proxy / Docker / RunCloud setup where WP
			// terminates as HTTP behind the proxy. Enable App Passwords for
			// REST requests that carry a Basic auth header — the auth itself
			// is the security control (random unauthenticated visitors are
			// still blocked by is_user_logged_in() below).
			add_filter( 'wp_is_application_passwords_available', array( $this, 'enable_app_passwords_for_rest_basic_auth' ), 99 );
			remove_action( 'xmlrpc_rsd_apis', 'rest_output_rsd' );
			remove_action( 'wp_head', 'rest_output_link_wp_head', 10 );
			remove_action( 'template_redirect', 'rest_output_link_header', 11 );
		}
		if ( get_option( 'hatch_security_disable_xmlrpc', 1 ) ) {
			add_filter( 'xmlrpc_enabled', '__return_false' );
			add_filter( 'wp_headers', array( $this, 'remove_xmlrpc_pingback_header' ) );
			// 403 the endpoint itself so scanners get a hard reject, matching the
			// admin label ("`/xmlrpc.php` returns 403"). Without this WP still
			// accepts the POST and responds with a method-list message.
			add_action( 'init', array( $this, 'block_xmlrpc_endpoint' ), 1 );
		}
		if ( get_option( 'hatch_security_block_user_enum', 1 ) ) {
			add_action( 'init', array( $this, 'block_user_enumeration' ) );
			// Also block the REST users endpoint independently so the claim holds
			// even when the REST lock is off (the lock is a separate toggle).
			add_filter( 'rest_endpoints', array( $this, 'remove_users_endpoint' ) );
		}
		// Force CMS subdomain to noindex/nofollow always (this is a headless backend, must never appear in search)
		if ( get_option( 'hatch_security_force_noindex', 1 ) ) {
			add_action( 'wp_head', array( $this, 'force_noindex_meta' ), 1 );
			add_filter( 'wp_robots', array( $this, 'force_noindex_robots' ) );
			// Emit `Disallow: /` in robots.txt so crawlers honor it before they
			// even fetch HTML. Matches the admin label promise.
			add_filter( 'robots_txt', array( $this, 'force_disallow_robots_txt' ), 10, 2 );
		}
	}

	/**
	 * Output `<meta name="robots" content="noindex, nofollow"/>` site-wide.
	 *
	 * The CMS subdomain is internal infrastructure — must never appear in search engines.
	 * RankMath / Yoast users may already do this; we enforce it as a safety net.
	 */
	public function force_noindex_meta(): void {
		echo '<meta name="robots" content="noindex, nofollow, noarchive, nosnippet"/>' . "\n";
	}

	/**
	 * Filter wp_robots() output (used by WP core + RankMath/Yoast in some paths).
	 *
	 * @param array $robots Existing robots directives.
	 * @return array
	 */
	public function force_noindex_robots( array $robots ): array {
		$robots['noindex']   = true;
		$robots['nofollow']  = true;
		$robots['noarchive'] = true;
		$robots['nosnippet'] = true;
		unset( $robots['index'], $robots['follow'] );
		return $robots;
	}

	/**
	 * Block REST API for non-authenticated users — EXCEPT explicit public routes.
	 *
	 * Hatch frontends authenticate with Application Passwords for /wp/v2/*.
	 * BUT several Hatch routes are public-by-design (comments, form submits,
	 * WC Store, heartbeat) — those must bypass this filter or the visitor-facing
	 * features break. Bug found in production v0.32: comments endpoint returned
	 * 401 to unauthenticated browsers even though its permission_callback was
	 * `__return_true`, because this filter ran first.
	 *
	 * @param mixed $result Existing auth result, may be WP_Error.
	 * @return mixed
	 */
	public function block_rest_unauthenticated( $result ) {
		// v0.50.10 — kept for back-compat; new hook path is below
		// (block_rest_unauthenticated_dispatch on rest_pre_dispatch).
		return $result;
	}

	/**
	 * v0.50.10 — runs on rest_pre_dispatch (priority 5, BEFORE route handler
	 * fires). By this point WP has fully resolved auth — `is_user_logged_in()`
	 * reflects valid Application Password, cookie, or any other auth method.
	 *
	 * @param mixed            $result   null (or pre-existing response)
	 * @param WP_REST_Server   $server   the REST server
	 * @param WP_REST_Request  $request  the incoming request
	 * @return mixed
	 */
	public function block_rest_unauthenticated_dispatch( $result, $server, $request ) {
		// If someone else already short-circuited with a response, respect it.
		if ( null !== $result ) {
			return $result;
		}
		if ( is_user_logged_in() ) {
			return $result;
		}
		// Allow Hatch public routes (designed for anonymous visitors).
		$route = $request instanceof WP_REST_Request ? (string) $request->get_route() : '';
		$method = $request instanceof WP_REST_Request ? (string) $request->get_method() : 'GET';
		// OPTIONS = CORS preflight — always allow.
		if ( 'OPTIONS' === strtoupper( $method ) ) {
			return $result;
		}
		// Hatch public routes (more reliable than path-string scan on REQUEST_URI).
		$public_patterns = array(
			'#^/hatch/v1/comments$#',
			'#^/hatch/v1/forms/[^/]+/embed$#',
			'#^/hatch/v1/forms/\d+/submit$#',
			'#^/hatch/v1/forms/submit$#',
			'#^/hatch/v1/menus(/.+)?$#',
			'#^/hatch/v1/features$#',
			'#^/hatch/v1/seo-head$#',
			'#^/hatch/v1/schema$#',
			'#^/hatch/v1/redirects$#',
			'#^/hatch/v1/code-snippets$#',
			'#^/hatch/v1/seo-meta$#',
		);
		foreach ( $public_patterns as $re ) {
			if ( preg_match( $re, $route ) ) return $result;
		}
		return new WP_Error(
			'hatch_rest_not_logged_in',
			__( 'REST API restricted to authenticated users.', 'hatch' ),
			array( 'status' => 401 )
		);
	}

	/**
	 * Is the current REST request hitting a route that's meant to be public?
	 * Reads the request URI directly — runs before route dispatch so we can't
	 * inspect the registered route at this point.
	 *
	 * @return bool
	 */
	/**
	 * v0.50.10 — selective override for wp_is_application_passwords_available.
	 *
	 * Behaviour:
	 *   - HTTPS already-true case: passthrough (no change).
	 *   - REST request + Basic auth header present: return true so WP processes
	 *     the credentials. The Basic auth itself is the security control —
	 *     wrong credentials still fail, no auth still fails.
	 *   - Everything else: passthrough.
	 *
	 * Why this is safe: enabling the check doesn't grant access. It just lets
	 * WP TRY to validate. Invalid passwords still return WP_Error, which we
	 * then 401 in block_rest_unauthenticated_dispatch.
	 *
	 * @param bool $is_available WP's default (false on non-HTTPS).
	 * @return bool
	 */
	public function enable_app_passwords_for_rest_basic_auth( $is_available ): bool {
		if ( $is_available ) {
			return $is_available;
		}
		$is_rest = ( defined( 'REST_REQUEST' ) && REST_REQUEST )
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended
			|| ( isset( $_SERVER['REQUEST_URI'] ) && false !== strpos( (string) $_SERVER['REQUEST_URI'], '/wp-json/' ) );
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$has_basic_auth = ! empty( $_SERVER['PHP_AUTH_USER'] ) && ! empty( $_SERVER['PHP_AUTH_PW'] );
		return ( $is_rest && $has_basic_auth ) ? true : $is_available;
	}

	private function is_public_hatch_route(): bool {
		$uri = isset( $_SERVER['REQUEST_URI'] ) ? (string) wp_unslash( $_SERVER['REQUEST_URI'] ) : '';
		if ( '' === $uri ) {
			return false;
		}
		// Strip query string and the /wp-json (or rest_url_prefix) prefix.
		$path = (string) parse_url( $uri, PHP_URL_PATH );
		$rest_prefix = '/' . rest_get_url_prefix() . '/';
		$pos = strpos( $path, $rest_prefix );
		if ( false === $pos ) {
			return false;
		}
		$route = '/' . ltrim( substr( $path, $pos + strlen( $rest_prefix ) ), '/' );

		$public_patterns = array(
			// Comments — read and submit are public.
			'#^/hatch/v1/comments(/.*)?$#',
			// Form submissions (with + without form id) — Turnstile-protected.
			'#^/hatch/v1/forms/\d+/submit$#',
			'#^/hatch/v1/forms/submit$#',
			// Agent heartbeat — HMAC-signed, no WP user.
			'#^/hatch/v1/agent/heartbeat$#',
			// WooCommerce store routes — public by design.
			'#^/hatch/v1/store/#',
		);
		foreach ( $public_patterns as $pattern ) {
			if ( preg_match( $pattern, $route ) ) {
				return true;
			}
		}
		return (bool) apply_filters( 'hatch/is_public_rest_route', false, $route );
	}

	/**
	 * Allow ALL user endpoints to remain registered — removing them breaks
	 * the WP admin Users page (it loads the list via REST) AND breaks _embed
	 * author payloads on posts. Instead, anonymous requests to the LIST are
	 * blocked via rest_pre_dispatch (enum protection) while authenticated
	 * admins go through normally.
	 *
	 * v0.46 — Was removing /wp/v2/users entirely → admin Users page showed
	 * empty list / spinner forever. Switched to a runtime auth check.
	 *
	 * @param array $endpoints Existing REST endpoints.
	 * @return array
	 */
	public function block_users_endpoint( array $endpoints ): array {
		// No removals. See block_users_list_for_anon for the actual gate.
		return $endpoints;
	}

	/**
	 * Block anonymous user LIST requests (the enum vector). Authenticated
	 * users see the list as they always have. Individual user reads stay
	 * fully open since WP core only exposes public byline fields there.
	 *
	 * @param mixed           $result  Existing dispatch result.
	 * @param WP_REST_Server  $server  REST server.
	 * @param WP_REST_Request $request Current request.
	 * @return mixed
	 */
	public function block_users_list_for_anon( $result, $server, $request ) {
		unset( $server );
		if ( null !== $result ) {
			return $result;
		}
		if ( is_user_logged_in() ) {
			return $result;
		}
		$route = $request instanceof WP_REST_Request ? (string) $request->get_route() : '';
		if ( '/wp/v2/users' === $route && 'GET' === $request->get_method() ) {
			return new WP_Error(
				'hatch_users_list_protected',
				__( 'User listing requires authentication.', 'hatch' ),
				array( 'status' => 401 )
			);
		}
		return $result;
	}

	/**
	 * Remove pingback HTTP header.
	 *
	 * @param array $headers Headers being sent.
	 * @return array
	 */
	public function remove_xmlrpc_pingback_header( array $headers ): array {
		unset( $headers['X-Pingback'] );
		return $headers;
	}

	/**
	 * Block ?author=N enumeration on the frontend.
	 *
	 * Returns a hard 404 (matching the admin label) so scanners see a dead URL
	 * rather than a redirect they could follow back to find the user index.
	 */
	public function block_user_enumeration(): void {
		if ( is_admin() ) {
			return;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( isset( $_GET['author'] ) ) {
			status_header( 404 );
			nocache_headers();
			wp_die( '', '', array( 'response' => 404 ) );
		}
	}

	/**
	 * Remove /wp-json/wp/v2/users from the REST API surface entirely.
	 *
	 * Independent of the REST-lock toggle so the "stops credential-stuffing
	 * recon" promise on the Hide-usernames toggle is true unconditionally.
	 */
	public function remove_users_endpoint( array $endpoints ): array {
		foreach ( array( '/wp/v2/users', '/wp/v2/users/(?P<id>[\d]+)' ) as $route ) {
			if ( isset( $endpoints[ $route ] ) ) unset( $endpoints[ $route ] );
		}
		return $endpoints;
	}

	/**
	 * Hard-403 any request to /xmlrpc.php so scanners get a dead endpoint.
	 *
	 * `xmlrpc_enabled => false` only blocks method dispatch; the endpoint
	 * itself still responds 200 with a method-list message. This makes the
	 * endpoint return 403 to anyone, matching the admin label.
	 */
	public function block_xmlrpc_endpoint(): void {
		$req = isset( $_SERVER['REQUEST_URI'] ) ? (string) $_SERVER['REQUEST_URI'] : '';
		if ( '' === $req ) return;
		$path = wp_parse_url( $req, PHP_URL_PATH );
		if ( ! is_string( $path ) ) return;
		// Match `/xmlrpc.php` exactly (case-insensitive) — not anything that
		// happens to contain the string as a substring.
		if ( preg_match( '#^/xmlrpc\.php/?$#i', $path ) ) {
			status_header( 403 );
			nocache_headers();
			wp_die( '', '', array( 'response' => 403 ) );
		}
	}

	/**
	 * Inject `Disallow: /` into the dynamic robots.txt when the noindex toggle
	 * is on, matching the admin label ("Disallow robots.txt").
	 *
	 * @param string $output Existing robots.txt body.
	 * @param int    $public 1 when site is public, 0 when "Discourage" is set.
	 * @return string
	 */
	public function force_disallow_robots_txt( string $output, $public ): string {
		// If WP is already discouraging (search-engine-visibility off), let WP's
		// default Disallow stand. Otherwise replace any User-agent: * block.
		$replacement = "User-agent: *\nDisallow: /\n";
		// Strip any prior `User-agent: *` block so ours wins.
		$cleaned = preg_replace( '/User-agent:\s*\*\s*\n(?:[^\n]*\n)*/i', '', (string) $output );
		return trim( $replacement . "\n" . (string) $cleaned ) . "\n";
	}
}

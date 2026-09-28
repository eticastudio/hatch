<?php
/**
 * Guest-safe order lookup for the headless Astro frontend.
 *
 * Woo Store API's GET /wc/store/v1/order/{id}?key=X requires the same
 * Cart-Token JWT that placed the order. Astro's order-summary page can
 * lose that token (page navigations, share links, refresh), so guests
 * see 401 even with the correct order_key in the URL.
 *
 * This bridge exposes GET /hatch/v1/order/{id}?key=X, validates the key
 * against wc_get_order()->get_order_key() with a timing-safe compare,
 * then returns a shape that mirrors Woo Store API's response so the
 * existing order-summary.astro renderer works unchanged.
 *
 * @since 0.7.6
 */

defined( 'ABSPATH' ) || exit;

class Hatch_Order_Lookup {

	/**
	 * Rate limit: max lookups per IP per window.
	 */
	const RATE_LIMIT_MAX    = 10;
	const RATE_LIMIT_WINDOW = 60; // seconds

	/**
	 * Failed-key limit per order id, across all IPs, so a spread-out guesser
	 * cannot work one order from many addresses.
	 */
	const ORDER_FAIL_MAX    = 10;
	const ORDER_FAIL_WINDOW = 900; // seconds

	public static function boot(): void {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Client IP used for rate limiting.
	 *
	 * The direct peer (REMOTE_ADDR) unless the site owner has switched on the
	 * `hatch_trust_cf_ip` option and the request arrives from a Cloudflare
	 * edge, in which case Hatch_Auth::client_ip() reads the forwarded address.
	 * Proxy headers are never read from an untrusted peer, so a caller cannot
	 * pick its own rate-limit bucket. Returns "unknown" when nothing usable is
	 * present so anonymous callers share one bucket instead of bypassing the limit.
	 *
	 * @return string
	 */
	protected static function client_ip(): string {
		if ( class_exists( 'Hatch_Auth' ) ) {
			$ip = Hatch_Auth::client_ip();
		} else {
			$ip = Hatch_Request::server( 'REMOTE_ADDR' );
		}
		$valid = filter_var( trim( $ip ), FILTER_VALIDATE_IP );
		return $valid ? (string) $valid : 'unknown';
	}

	/**
	 * Lightweight per-IP transient counter. Returns true if the caller is
	 * OVER the limit for the current window. Uses a hashed key so raw IPs
	 * never land in the options table.
	 */
	protected static function is_rate_limited( string $ip ): bool {
		$key   = 'hatch_ol_rl_' . substr( md5( $ip ), 0, 16 );
		$count = (int) get_transient( $key );
		if ( $count >= self::RATE_LIMIT_MAX ) {
			return true;
		}
		// Re-set the transient every hit so the window slides forward from the
		// first request in the burst; simpler than a fixed-window scheduler
		// and good enough to blunt enumeration attempts.
		set_transient( $key, $count + 1, self::RATE_LIMIT_WINDOW );
		return false;
	}

	/**
	 * Has this order id collected too many wrong keys in the current window?
	 *
	 * @param int $order_id Order id.
	 * @return bool
	 */
	protected static function order_locked( int $order_id ): bool {
		return (int) get_transient( 'hatch_ol_id_' . $order_id ) >= self::ORDER_FAIL_MAX;
	}

	/**
	 * Record one wrong-key attempt against an order id.
	 *
	 * @param int $order_id Order id.
	 * @return void
	 */
	protected static function note_failed_key( int $order_id ): void {
		$key = 'hatch_ol_id_' . $order_id;
		set_transient( $key, (int) get_transient( $key ) + 1, self::ORDER_FAIL_WINDOW );
	}

	public static function register_routes(): void {
		register_rest_route(
			'hatch/v1',
			'/order/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'get_order' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'id'  => array(
						'required'          => true,
						'sanitize_callback' => 'absint',
					),
					'key' => array(
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
	}

	public static function get_order( WP_REST_Request $req ) {
		if ( ! function_exists( 'wc_get_order' ) ) {
			return new WP_Error( 'hatch_woo_missing', esc_html__( 'WooCommerce not active', 'hatch-bridge' ), array( 'status' => 500 ) );
		}

		// Rate-limit BEFORE any DB work so an abuser cannot cheaply enumerate
		// order IDs even under the 404-mask branch below.
		$ip = self::client_ip();
		if ( self::is_rate_limited( $ip ) ) {
			return new WP_Error(
				'hatch_rate_limited',
				esc_html__( 'Too many requests. Try again in a minute.', 'hatch-bridge' ),
				array( 'status' => 429 )
			);
		}

		$id  = (int) $req->get_param( 'id' );
		$key = (string) $req->get_param( 'key' );
		if ( $id <= 0 || '' === $key ) {
			return new WP_Error( 'hatch_bad_request', esc_html__( 'Missing id or key', 'hatch-bridge' ), array( 'status' => 400 ) );
		}

		if ( self::order_locked( $id ) ) {
			return new WP_Error(
				'hatch_rate_limited',
				esc_html__( 'Too many requests. Try again in a few minutes.', 'hatch-bridge' ),
				array( 'status' => 429 )
			);
		}

		$order = wc_get_order( $id );
		// Anti-enumeration: return the SAME 404 for both "no order" and "wrong key"
		// so an attacker cannot map which order IDs exist by watching 401 vs 404.
		// hash_equals runs when order exists so the branch stays timing-safe.
		if ( ! $order || ! hash_equals( (string) $order->get_order_key(), $key ) ) {
			self::note_failed_key( $id );
			return new WP_Error( 'hatch_not_found', esc_html__( 'Order not found', 'hatch-bridge' ), array( 'status' => 404 ) );
		}

		$items = array();
		foreach ( $order->get_items() as $item ) {
			$items[] = array(
				'name'     => $item->get_name(),
				'quantity' => (int) $item->get_quantity(),
				'total'    => wc_format_decimal( $item->get_total(), 2 ),
			);
		}

		$currency = $order->get_currency();
		$sym      = get_woocommerce_currency_symbol( $currency );

		return rest_ensure_response(
			array(
				'id'               => $order->get_id(),
				'order_number'     => (string) $order->get_order_number(),
				'status'           => (string) $order->get_status(),
				'created_at'       => $order->get_date_created() ? $order->get_date_created()->date( 'c' ) : '',
				'items'            => $items,
				'totals'           => array(
					'currency_code'       => $currency,
					'currency_symbol'     => $sym,
					'currency_minor_unit' => wc_get_price_decimals(),
					'subtotal'            => wc_format_decimal( $order->get_subtotal(), 2 ),
					'shipping'            => wc_format_decimal( $order->get_shipping_total(), 2 ),
					'tax'                 => wc_format_decimal( $order->get_total_tax(), 2 ),
					'total'               => wc_format_decimal( $order->get_total(), 2 ),
				),
				'billing_address'  => $order->get_address( 'billing' ),
				'shipping_address' => $order->get_address( 'shipping' ),
				'payment_method'   => (string) $order->get_payment_method_title(),
			)
		);
	}
}

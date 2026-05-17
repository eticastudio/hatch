<?php
/**
 * WooCommerce Bridge — read-only product catalog exposure for headless storefronts.
 *
 * **Scope (v0.8.0): read-only.** No cart, no checkout, no orders.
 * That lives in v0.9+ once we've designed a proper session/auth model that
 * doesn't expose WP nonces to a separate origin.
 *
 * What this gives Astro frontends:
 *
 *   GET /wp-json/hatch/v1/store/products
 *   GET /wp-json/hatch/v1/store/products/{id}
 *   GET /wp-json/hatch/v1/store/products/{id}/variations
 *   GET /wp-json/hatch/v1/store/categories
 *   GET /wp-json/hatch/v1/store/featured
 *
 * Why not just use Woo's built-in /wc/v3/products?
 *   - Built-in routes require authenticated consumer keys, which complicates
 *     static-site builds and edge fetches.
 *   - Built-in payload is huge and tightly coupled to Woo internals.
 *   - We want a stable, minimal, headless-friendly shape that doesn't change
 *     when Woo internals change.
 *
 * All endpoints are PUBLIC (read-only catalog data, same visibility as the
 * /shop page). Stock & price filtering follow Woo's visibility settings.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_WooCommerce_Bridge
 */
class Hatch_WooCommerce_Bridge {

	/**
	 * Max page size (defensive — prevents accidental DOS via per_page=99999).
	 */
	const MAX_PER_PAGE = 100;

	/**
	 * Cache TTL for the lightweight category map (seconds).
	 */
	const CATEGORIES_TTL = 5 * MINUTE_IN_SECONDS;

	/**
	 * @var Hatch_WooCommerce_Bridge|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_WooCommerce_Bridge
	 */
	public static function instance(): Hatch_WooCommerce_Bridge {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire routes — but only if WooCommerce is actually loaded.
	 */
	private function __construct() {
		add_action( 'rest_api_init', array( $this, 'maybe_register_routes' ) );

		// When products change, fire deploy hooks.
		add_action( 'woocommerce_update_product',  array( $this, 'on_product_change' ), 10, 1 );
		add_action( 'woocommerce_new_product',     array( $this, 'on_product_change' ), 10, 1 );
		add_action( 'woocommerce_delete_product',  array( $this, 'on_product_change' ), 10, 1 );
	}

	/**
	 * Is WooCommerce active and loaded?
	 *
	 * @return bool
	 */
	public static function is_available(): bool {
		return class_exists( 'WooCommerce' ) && function_exists( 'wc_get_product' );
	}

	/**
	 * Register routes only if Woo is present.
	 *
	 * @return void
	 */
	public function maybe_register_routes(): void {
		if ( ! self::is_available() ) {
			return;
		}
		$this->register_routes();
	}

	/**
	 * Register the read-only store routes.
	 *
	 * @return void
	 */
	private function register_routes(): void {
		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/store/products',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_products' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'page'     => array( 'default' => 1,  'sanitize_callback' => 'absint' ),
					'per_page' => array( 'default' => 24, 'sanitize_callback' => 'absint' ),
					'category' => array( 'default' => '', 'sanitize_callback' => 'sanitize_text_field' ),
					'search'   => array( 'default' => '', 'sanitize_callback' => 'sanitize_text_field' ),
					'orderby'  => array(
						'default'           => 'date',
						'enum'              => array( 'date', 'price', 'popularity', 'rating', 'title' ),
						'sanitize_callback' => 'sanitize_key',
					),
					'order'    => array(
						'default'           => 'desc',
						'enum'              => array( 'asc', 'desc' ),
						'sanitize_callback' => 'sanitize_key',
					),
					'on_sale'  => array( 'default' => false, 'sanitize_callback' => 'rest_sanitize_boolean' ),
				),
			)
		);

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/store/products/(?P<id>\d+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_product' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'id' => array( 'required' => true, 'sanitize_callback' => 'absint' ),
				),
			)
		);

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/store/products/(?P<id>\d+)/variations',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_variations' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'id' => array( 'required' => true, 'sanitize_callback' => 'absint' ),
				),
			)
		);

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/store/categories',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_categories' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			HATCH_REST_NAMESPACE,
			'/store/featured',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'route_featured' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'per_page' => array( 'default' => 8, 'sanitize_callback' => 'absint' ),
				),
			)
		);
	}

	/* ------------------------------------------------------------------------
	 * Route callbacks
	 * --------------------------------------------------------------------- */

	/**
	 * GET /store/products — paginated, filtered product list.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function route_products( WP_REST_Request $request ): WP_REST_Response {
		$page     = max( 1, (int) $request['page'] );
		$per_page = min( self::MAX_PER_PAGE, max( 1, (int) $request['per_page'] ) );
		$category = (string) $request['category'];
		$search   = (string) $request['search'];
		$orderby  = (string) $request['orderby'];
		$order    = (string) $request['order'];
		$on_sale  = (bool) $request['on_sale'];

		$args = array(
			'status'   => 'publish',
			'limit'    => $per_page,
			'page'     => $page,
			'paginate' => true,
			'orderby'  => $orderby,
			'order'    => strtoupper( $order ),
		);

		// Map our friendly orderby names to WC's expectations.
		if ( 'price' === $orderby ) {
			$args['orderby'] = 'price';
		} elseif ( 'popularity' === $orderby ) {
			$args['orderby'] = 'popularity';
		} elseif ( 'rating' === $orderby ) {
			$args['orderby'] = 'rating';
		} elseif ( 'title' === $orderby ) {
			$args['orderby'] = 'title';
		} else {
			$args['orderby'] = 'date';
		}

		if ( '' !== $category ) {
			$args['category'] = array_map( 'sanitize_title', explode( ',', $category ) );
		}
		if ( '' !== $search ) {
			$args['s'] = $search;
		}
		if ( $on_sale ) {
			// wc_get_products supports `wc_query=on_sale` via a meta lookup.
			add_filter( 'woocommerce_product_query_meta_query', array( $this, 'filter_on_sale_meta_query' ) );
		}

		$query    = wc_get_products( $args );
		$products = is_object( $query ) && isset( $query->products ) ? $query->products : array();
		$total    = is_object( $query ) && isset( $query->total )    ? (int) $query->total : count( $products );
		$pages    = is_object( $query ) && isset( $query->max_num_pages ) ? (int) $query->max_num_pages : 1;

		if ( $on_sale ) {
			remove_filter( 'woocommerce_product_query_meta_query', array( $this, 'filter_on_sale_meta_query' ) );
		}

		$payload = array(
			'page'        => $page,
			'per_page'    => $per_page,
			'total'       => $total,
			'total_pages' => $pages,
			'products'    => array_map( array( $this, 'normalize_product' ), $products ),
		);

		$response = rest_ensure_response( $payload );
		$response->header( 'X-Hatch-Total',       (string) $total );
		$response->header( 'X-Hatch-Total-Pages', (string) $pages );
		return $response;
	}

	/**
	 * GET /store/products/{id} — single product (full payload).
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function route_product( WP_REST_Request $request ) {
		$id      = (int) $request['id'];
		$product = wc_get_product( $id );
		if ( ! $product ) {
			return new WP_Error( 'hatch_store_not_found', __( 'Product not found.', 'hatch' ), array( 'status' => 404 ) );
		}
		if ( 'publish' !== $product->get_status() ) {
			return new WP_Error( 'hatch_store_not_public', __( 'Product is not public.', 'hatch' ), array( 'status' => 403 ) );
		}
		return rest_ensure_response( $this->normalize_product( $product, true ) );
	}

	/**
	 * GET /store/products/{id}/variations — for variable products.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response|WP_Error
	 */
	public function route_variations( WP_REST_Request $request ) {
		$id      = (int) $request['id'];
		$product = wc_get_product( $id );
		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return new WP_Error( 'hatch_store_not_variable', __( 'Not a variable product.', 'hatch' ), array( 'status' => 400 ) );
		}
		$variations = array();
		foreach ( $product->get_available_variations() as $variation ) {
			$variations[] = array(
				'id'             => (int) $variation['variation_id'],
				'sku'            => (string) ( $variation['sku'] ?? '' ),
				'price'          => (string) ( $variation['display_price'] ?? '' ),
				'regular_price'  => (string) ( $variation['display_regular_price'] ?? '' ),
				'is_in_stock'    => (bool) ( $variation['is_in_stock'] ?? false ),
				'is_purchasable' => (bool) ( $variation['is_purchasable'] ?? false ),
				'image'          => isset( $variation['image']['src'] ) ? (string) $variation['image']['src'] : '',
				'attributes'     => (array) ( $variation['attributes'] ?? array() ),
			);
		}
		return rest_ensure_response( array( 'product_id' => $id, 'variations' => $variations ) );
	}

	/**
	 * GET /store/categories — flat list with parent IDs.
	 *
	 * @return WP_REST_Response
	 */
	public function route_categories(): WP_REST_Response {
		$cached = get_transient( 'hatch_store_categories' );
		if ( is_array( $cached ) ) {
			return rest_ensure_response( $cached );
		}

		$terms = get_terms(
			array(
				'taxonomy'   => 'product_cat',
				'hide_empty' => false,
			)
		);

		$out = array();
		if ( is_array( $terms ) ) {
			foreach ( $terms as $t ) {
				if ( ! $t instanceof WP_Term ) {
					continue;
				}
				$thumb_id = (int) get_term_meta( $t->term_id, 'thumbnail_id', true );
				$out[]    = array(
					'id'     => (int) $t->term_id,
					'name'   => (string) $t->name,
					'slug'   => (string) $t->slug,
					'parent' => (int) $t->parent,
					'count'  => (int) $t->count,
					'image'  => $thumb_id ? (string) wp_get_attachment_image_url( $thumb_id, 'medium' ) : '',
				);
			}
		}

		set_transient( 'hatch_store_categories', $out, self::CATEGORIES_TTL );
		return rest_ensure_response( $out );
	}

	/**
	 * GET /store/featured — first N featured products.
	 *
	 * @param WP_REST_Request $request Request.
	 * @return WP_REST_Response
	 */
	public function route_featured( WP_REST_Request $request ): WP_REST_Response {
		$per_page = min( self::MAX_PER_PAGE, max( 1, (int) $request['per_page'] ) );
		$products = wc_get_products(
			array(
				'status'   => 'publish',
				'featured' => true,
				'limit'    => $per_page,
				'orderby'  => 'date',
				'order'    => 'DESC',
			)
		);
		return rest_ensure_response(
			array(
				'products' => array_map( array( $this, 'normalize_product' ), $products ),
			)
		);
	}

	/* ------------------------------------------------------------------------
	 * Hooks — fire deploys on product change
	 * --------------------------------------------------------------------- */

	/**
	 * Trigger deploys when a product changes (debounced inside Deploy_Hooks).
	 *
	 * @param int $product_id Product ID.
	 * @return void
	 */
	public function on_product_change( $product_id ): void {
		// Invalidate the category cache.
		delete_transient( 'hatch_store_categories' );

		if ( class_exists( 'Hatch_Deploy_Hooks' ) ) {
			$hooks = Hatch_Deploy_Hooks::instance();
			foreach ( array_keys( Hatch_Deploy_Hooks::providers() ) as $provider ) {
				$hooks->fire( $provider, 'product_' . (int) $product_id );
			}
		}
	}

	/* ------------------------------------------------------------------------
	 * Normalization
	 * --------------------------------------------------------------------- */

	/**
	 * Convert a WC_Product into our stable, minimal payload.
	 *
	 * @param mixed $product  A WC_Product or null.
	 * @param bool  $full     Include the long-form description + gallery + attributes.
	 * @return array<string, mixed>
	 */
	private function normalize_product( $product, bool $full = false ): array {
		if ( ! $product instanceof WC_Product ) {
			return array();
		}

		$id      = (int) $product->get_id();
		$gallery = array();
		foreach ( $product->get_gallery_image_ids() as $img_id ) {
			$src = wp_get_attachment_image_url( (int) $img_id, 'large' );
			if ( $src ) {
				$gallery[] = $src;
			}
		}

		$primary_image = wp_get_attachment_image_url( (int) $product->get_image_id(), 'large' );

		$payload = array(
			'id'             => $id,
			'slug'           => (string) $product->get_slug(),
			'name'           => (string) $product->get_name(),
			'type'           => (string) $product->get_type(),
			'permalink'      => (string) get_permalink( $id ),
			'short'          => wp_kses_post( $product->get_short_description() ),
			'price'          => (string) $product->get_price(),
			'regular_price'  => (string) $product->get_regular_price(),
			'sale_price'     => (string) $product->get_sale_price(),
			'currency'       => function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : 'USD',
			'on_sale'        => (bool) $product->is_on_sale(),
			'in_stock'       => (bool) $product->is_in_stock(),
			'stock_quantity' => $product->managing_stock() ? (int) $product->get_stock_quantity() : null,
			'featured'       => (bool) $product->is_featured(),
			'image'          => $primary_image ?: '',
			'rating'         => (float) $product->get_average_rating(),
			'rating_count'   => (int) $product->get_rating_count(),
			'categories'     => wp_list_pluck( get_the_terms( $id, 'product_cat' ) ?: array(), 'slug' ),
		);

		if ( $full ) {
			$payload['description'] = wp_kses_post( $product->get_description() );
			$payload['gallery']     = $gallery;
			$payload['sku']         = (string) $product->get_sku();
			$payload['attributes']  = $this->normalize_attributes( $product );
			$payload['variation_ids'] = $product->is_type( 'variable' )
				? array_map( 'intval', $product->get_children() )
				: array();
		}

		return $payload;
	}

	/**
	 * Flatten product attributes into [ {slug, name, options[]} ].
	 *
	 * @param WC_Product $product Product.
	 * @return array<int, array<string, mixed>>
	 */
	private function normalize_attributes( WC_Product $product ): array {
		$out = array();
		foreach ( $product->get_attributes() as $attr ) {
			if ( ! $attr instanceof WC_Product_Attribute ) {
				continue;
			}
			$options = $attr->is_taxonomy()
				? wp_list_pluck( get_terms( array( 'taxonomy' => $attr->get_name(), 'hide_empty' => false ) ) ?: array(), 'name' )
				: $attr->get_options();
			$out[] = array(
				'slug'    => (string) $attr->get_name(),
				'name'    => (string) wc_attribute_label( $attr->get_name() ),
				'options' => array_values( array_filter( array_map( 'strval', $options ) ) ),
				'is_variation' => (bool) $attr->get_variation(),
			);
		}
		return $out;
	}

	/**
	 * Filter callback: products on sale only.
	 *
	 * @param array<int, array<string, mixed>> $meta_query Existing meta query.
	 * @return array<int, array<string, mixed>>
	 */
	public function filter_on_sale_meta_query( array $meta_query ): array {
		$meta_query[] = array(
			'key'     => '_sale_price',
			'value'   => 0,
			'compare' => '>',
			'type'    => 'NUMERIC',
		);
		return $meta_query;
	}
}

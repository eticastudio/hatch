<?php
/**
 * Hatch Menus Bridge — exposes registered WP nav menus to the frontend.
 *
 * GET /hatch/v1/menus            → all registered locations with their assigned menu names
 * GET /hatch/v1/menus/{location} → flat item list for a specific nav menu location
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Menus_Bridge
 */
class Hatch_Menus_Bridge {

	/**
	 * Return all registered nav menu locations and which menu (if any) is assigned.
	 *
	 * @return array<int, array{location: string, name: string, menu: string|null, menu_id: int|null}>
	 */
	public static function get_locations(): array {
		$assigned   = get_nav_menu_locations();
		$registered = get_registered_nav_menus();
		$result     = array();

		foreach ( $registered as $slug => $name ) {
			$menu_id = isset( $assigned[ $slug ] ) ? (int) $assigned[ $slug ] : 0;
			$menu    = $menu_id ? wp_get_nav_menu_object( $menu_id ) : null;
			$result[] = array(
				'location' => $slug,
				'name'     => $name,
				'menu'     => ( $menu && ! is_wp_error( $menu ) ) ? $menu->name : null,
				'menu_id'  => $menu_id ?: null,
			);
		}

		return $result;
	}

	/**
	 * Return flat array of menu items for a given nav menu location.
	 * Internal absolute WP URLs are converted to root-relative paths so the
	 * Astro frontend can use them directly regardless of WP/frontend domain split.
	 *
	 * @param string $location  Registered nav menu location slug (e.g. "primary", "footer").
	 * @return array<int, array{id: int, parent: int, order: int, title: string, url: string, target: string, classes: string[]}>
	 */
	public static function get_items( string $location ): array {
		$assigned = get_nav_menu_locations();
		$menu_id  = isset( $assigned[ $location ] ) ? (int) $assigned[ $location ] : 0;

		// v0.44 — Hatch override: user can pick a specific menu in the admin
		// (Connector → Menu) without having to assign locations in Appearance → Menus.
		if ( 'primary' === $location ) {
			$override = (int) get_option( 'hatch_menu_primary_id', 0 );
			if ( $override > 0 ) {
				$menu_id = $override;
			}
		} elseif ( 'footer' === $location ) {
			$override = (int) get_option( 'hatch_menu_footer_id', 0 );
			if ( $override > 0 ) {
				$menu_id = $override;
			}
		}

		// v0.44 — fallback: if STILL no menu, auto-use the first menu that
		// exists. Means "create a menu in WP and it just shows up" — no
		// Appearance → Menus → Manage Locations checkbox needed.
		if ( ! $menu_id && in_array( $location, array( 'primary', 'footer' ), true ) ) {
			$all_menus = wp_get_nav_menus();
			if ( ! empty( $all_menus ) ) {
				$menu_id = (int) $all_menus[0]->term_id;
			}
		}

		if ( ! $menu_id ) {
			return array();
		}

		$items = wp_get_nav_menu_items( $menu_id );
		if ( ! $items || is_wp_error( $items ) ) {
			return array();
		}

		$wp_home          = home_url();
		$wp_home_slash    = trailingslashit( $wp_home );
		$wp_home_noslash  = untrailingslashit( $wp_home );

		$out = array();
		foreach ( $items as $item ) {
			$url = (string) $item->url;

			// Convert absolute internal WP URLs to root-relative paths.
			if ( 0 === strpos( $url, $wp_home_slash ) ) {
				$url = '/' . ltrim( substr( $url, strlen( $wp_home_slash ) ), '/' );
			} elseif ( $url === $wp_home_noslash || $url === $wp_home_slash ) {
				$url = '/';
			}

			$out[] = array(
				'id'      => (int) $item->ID,
				'parent'  => (int) $item->menu_item_parent,
				'order'   => (int) $item->menu_order,
				'title'   => (string) $item->title,
				'url'     => $url,
				'target'  => (string) $item->target,
				'classes' => array_values( array_filter( (array) $item->classes ) ),
			);
		}

		return $out;
	}
}

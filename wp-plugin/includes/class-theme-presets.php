<?php
/**
 * Hatch · Theme presets.
 *
 * v0.4.0 — Each foundation theme ships a niche-aware starter preset:
 * brand colours, heading + body font, layout density, corner radius,
 * default colour mode. When the user picks a theme for the first time
 * (or explicitly hits "Apply preset"), we merge the preset into the
 * design option groups so the WordPress admin pickers and the Astro
 * tokens both reflect the theme's signature look from second one.
 *
 * Three rules keep us honest:
 *   1. We NEVER overwrite a value the user typed by hand. Each preset
 *      apply records itself in `hatch_design_preset_applied` ({slug, ts})
 *      and we only auto-apply when the recorded slug differs from the
 *      newly selected theme — i.e. on the first theme switch since the
 *      last preset was applied.
 *   2. The `Hatch · Apply [theme] preset` action in the Design tab is
 *      the user's explicit override — it stomps existing values on
 *      purpose, but bumps the recorded slug so the next theme switch
 *      keeps a clean baseline.
 *   3. Presets only touch the FOUR brand pickers + the TWO font picks
 *      + density + radius. Aesthetic-group toggles (header style, share
 *      buttons, etc.) are user opinion and we leave them alone.
 *
 * @since 0.4.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class Hatch_Theme_Presets {

	const APPLIED_OPT = 'hatch_design_preset_applied';

	/**
	 * Preset packages per foundation theme.
	 *
	 * Each preset is a flat shape we expand into the relevant option
	 * groups: brand (primary + accent + background), font_heading,
	 * font_body, layout (density + rounded + max_width + button_style),
	 * mode. The signature colour values mirror theme-{slug}.css :root
	 * declarations so the admin and the Astro render show identical hues.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	public static function packages(): array {
		return array(
			'blog' => array(
				'label'        => 'Editorial — warm paper, saffron, Fraunces serif',
				'brand'        => array(
					'primary'    => '#c2410c',  // saffron
					'accent'     => '#5b5547',  // warm slate (eyebrows, dividers)
					'secondary'  => '#0e0f10',  // graphite ink
					'background' => '#fdfaf3',  // warm paper
				),
				'font_heading' => 'Fraunces',
				'font_body'    => 'Inter Tight',
				'layout'       => array(
					'density'      => 'comfortable',
					'rounded'      => 'sharp',     // editorial — minimal corner softness
					'max_width'    => '1180',
					'button_style' => 'pill',
				),
				'mode'         => 'auto',
			),
			'tech' => array(
				'label'        => 'Terminal — inky dark, terminal cyan, JetBrains Mono',
				'brand'        => array(
					'primary'    => '#22d3ee',  // full terminal cyan
					'accent'     => '#a855f7',  // keyword purple
					'secondary'  => '#e6e9ee',  // soft ink (legible on dark)
					'background' => '#0b0d10',  // deep terminal
				),
				'font_heading' => 'JetBrains Mono',
				'font_body'    => 'Inter',
				'layout'       => array(
					'density'      => 'compact',   // changelog feel
					'rounded'      => 'sharp',
					'max_width'    => '1240',
					'button_style' => 'rounded',
				),
				'mode'         => 'dark',
			),
			'docs' => array(
				'label'        => 'Reference — clean neutral, indigo, Geist',
				'brand'        => array(
					'primary'    => '#4f46e5',  // indigo
					'accent'     => '#16a34a',  // status green for inline chips
					'secondary'  => '#0f1115',  // ink
					'background' => '#fafbfc',  // cool neutral
				),
				'font_heading' => 'Geist',
				'font_body'    => 'Geist',
				'layout'       => array(
					'density'      => 'comfortable',
					'rounded'      => 'smooth',    // soft panels
					'max_width'    => '1180',
					'button_style' => 'rounded',
				),
				'mode'         => 'auto',
			),
		);
	}

	/**
	 * Apply a theme's preset to the design options.
	 *
	 * @param string $slug  Theme slug.
	 * @param bool   $force When true, overwrite existing values (explicit
	 *                       "Apply preset" button). When false, only apply
	 *                       if the recorded preset slug doesn't match the
	 *                       requested one (first switch since last apply).
	 * @return bool True if anything was written.
	 */
	public static function apply( string $slug, bool $force = false ): bool {
		$packages = self::packages();
		if ( ! isset( $packages[ $slug ] ) ) {
			return false;
		}
		$applied = (array) get_option( self::APPLIED_OPT, array() );
		$last    = isset( $applied['slug'] ) ? (string) $applied['slug'] : '';
		if ( ! $force && $last === $slug ) {
			// Already aligned — don't stomp the user's tweaks.
			return false;
		}

		$preset = $packages[ $slug ];

		// Brand block — merge so any keys the preset omits stay untouched.
		// Mirror the preset's `background` / `secondary` values onto the
		// legacy `bg` / `fg` keys too. The codebase has two parallel naming
		// conventions: the React admin Brand pickers (background / accent /
		// secondary) and the Hatch_Design_Loader defaults (bg / fg). The
		// Astro frontend's designToCssVars reads from the parsed array,
		// which inherits from loader defaults — meaning `bg` shows
		// through unless we set it. Writing both keys keeps every reader
		// happy without forcing a global rename.
		$existing_brand   = (array) get_option( 'hatch_design_brand', array() );
		$preset_brand     = (array) $preset['brand'];
		$brand_compat     = $preset_brand;
		if ( isset( $preset_brand['background'] ) ) $brand_compat['bg'] = $preset_brand['background'];
		if ( isset( $preset_brand['secondary'] ) )  $brand_compat['fg'] = $preset_brand['secondary'];
		$new_brand        = array_merge( $existing_brand, $brand_compat );
		update_option( 'hatch_design_brand', $new_brand );

		// Fonts — flat option keys.
		update_option( 'hatch_design_font_heading', (string) $preset['font_heading'] );
		update_option( 'hatch_design_font_body',    (string) $preset['font_body'] );

		// Layout — same merge contract as brand.
		$existing_layout = (array) get_option( 'hatch_design_layout', array() );
		$new_layout      = array_merge( $existing_layout, (array) $preset['layout'] );
		update_option( 'hatch_design_layout', $new_layout );

		// Color mode — we ARE in a fresh apply (the early-return guard
		// above filters out re-apply for the same slug), so always set
		// the preset's mode. The user can override on the Design tab; if
		// they switch themes again, the new theme's mode wins.
		update_option( 'hatch_design_mode', (string) $preset['mode'] );

		update_option( self::APPLIED_OPT, array(
			'slug' => $slug,
			'ts'   => time(),
			'mode' => $force ? 'forced' : 'auto',
		) );

		// CRITICAL: the React admin writes scattered hatch_design_* option
		// keys, then dashboard.php::hatch_regenerate_design_artifacts()
		// rebuilds the consolidated `hatch_design_parsed` array that the
		// /hatch/v1/features endpoint actually reads. Without this call,
		// the preset stays siloed in individual options and the Astro
		// frontend keeps rendering the old brand/font tokens.
		if ( function_exists( 'hatch_regenerate_design_artifacts' ) ) {
			hatch_regenerate_design_artifacts();
		} else {
			// Dashboard not loaded (CLI / cron / activation path). Mark
			// the artifact stale so the next admin page-view rebuilds.
			delete_option( 'hatch_design_parsed' );
		}

		// Bust the upstream cache so frontend pageviews don't hold the
		// old design for the 60s TTL window after a preset apply.
		if ( class_exists( 'Hatch_Revalidate' ) ) {
			Hatch_Revalidate::trigger( 'theme-preset-' . $slug );
		}

		return true;
	}

	/**
	 * Hook: when the theme option is updated, auto-apply the preset.
	 *
	 * @param mixed $old   Previous value.
	 * @param mixed $new   New value.
	 */
	public static function on_theme_change( $old, $new ): void {
		$slug = is_string( $new ) ? $new : '';
		if ( '' === $slug ) return;
		self::apply( $slug, /* force */ false );
	}

	/**
	 * REST: explicit "Apply preset" action from the Design tab.
	 * Stomps existing brand/fonts/layout with the theme's signature.
	 */
	public static function register_routes(): void {
		register_rest_route( 'hatch/v1', '/design/apply-preset', array(
			'methods'             => 'POST',
			'permission_callback' => function () { return current_user_can( 'manage_options' ); },
			'callback'            => function ( $req ) {
				$slug = (string) ( $req->get_param( 'theme' ) ?? '' );
				if ( ! array_key_exists( $slug, self::packages() ) ) {
					return new WP_Error( 'hatch_bad_theme', 'Unknown theme slug.', array( 'status' => 400 ) );
				}
				$applied = self::apply( $slug, /* force */ true );
				return rest_ensure_response( array(
					'ok'      => true,
					'applied' => $applied,
					'theme'   => $slug,
				) );
			},
		) );
	}
}

// Wire the change hook. WordPress fires `update_option_<key>` with ($old, $new).
add_action( 'update_option_hatch_selected_theme', array( 'Hatch_Theme_Presets', 'on_theme_change' ), 10, 2 );
// And for the first-ever set (no prior value -> add_option, not update).
add_action( 'add_option_hatch_selected_theme', function ( $option, $value ) {
	Hatch_Theme_Presets::on_theme_change( '', (string) $value );
}, 10, 2 );

add_action( 'rest_api_init', array( 'Hatch_Theme_Presets', 'register_routes' ) );

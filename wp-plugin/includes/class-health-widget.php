<?php
/**
 * Health Widget — single-glance dashboard view of Hatch state.
 *
 * Surfaces the data that matters in one place, all from REAL sources
 * (no vibe-coded "everything's fine" placeholders):
 *
 *   - Connection state    → Hatch_Connection_Status::report()
 *   - Last deploy         → Hatch_Deploy_Hooks::status_report()
 *   - Block count + posts → fast SQL counts
 *   - Domain check        → Hatch_Domain_Check::classify()
 *
 * Renders as a standard WP dashboard widget at the top of /wp-admin.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Health_Widget
 */
class Hatch_Health_Widget {

	const WIDGET_ID = 'hatch_health';

	/**
	 * @var Hatch_Health_Widget|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Health_Widget
	 */
	public static function instance(): Hatch_Health_Widget {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire hooks.
	 */
	private function __construct() {
		add_action( 'wp_dashboard_setup', array( $this, 'register_widget' ) );
	}

	/**
	 * Register the widget for users who can see the connection.
	 *
	 * @return void
	 */
	public function register_widget(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		wp_add_dashboard_widget(
			self::WIDGET_ID,
			'🐣 ' . __( 'Hatch — Headless Engine', 'hatch' ),
			array( $this, 'render' )
		);

		// Pin to top.
		global $wp_meta_boxes;
		if ( isset( $wp_meta_boxes['dashboard']['normal']['core'][ self::WIDGET_ID ] ) ) {
			$widget                                                 = $wp_meta_boxes['dashboard']['normal']['core'][ self::WIDGET_ID ];
			unset( $wp_meta_boxes['dashboard']['normal']['core'][ self::WIDGET_ID ] );
			$wp_meta_boxes['dashboard']['normal']['core']           = array( self::WIDGET_ID => $widget ) + $wp_meta_boxes['dashboard']['normal']['core'];
		}
	}

	/**
	 * Render the widget body.
	 *
	 * @return void
	 */
	public function render(): void {
		$connection = class_exists( 'Hatch_Connection_Status' ) ? Hatch_Connection_Status::report() : array();
		$deploys    = class_exists( 'Hatch_Deploy_Hooks' )      ? Hatch_Deploy_Hooks::status_report() : array();
		$domain     = class_exists( 'Hatch_Domain_Check' )      ? Hatch_Domain_Check::classify()      : 'unknown';

		// Real counts.
		$counts = wp_count_posts();
		$post_count = isset( $counts->publish ) ? (int) $counts->publish : 0;

		$conn_state   = $connection['state']     ?? 'unknown';
		$conn_seen    = $connection['last_seen'] ?? 0;
		$conn_seen_ago = $conn_seen ? human_time_diff( $conn_seen, time() ) : '';

		// Pick the "primary" deploy (first one in connected/stale state).
		$primary_deploy = null;
		foreach ( $deploys as $id => $entry ) {
			if ( in_array( $entry['state'], array( 'connected', 'stale' ), true ) ) {
				$primary_deploy = array( 'id' => $id ) + $entry;
				break;
			}
		}

		?>
		<style>
			.hatch-health { font-size: 13px; line-height: 1.5; }
			.hatch-health-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
			.hatch-health-tile { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
			.hatch-health-tile h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; font-weight: 600; }
			.hatch-health-tile .v { font-size: 17px; font-weight: 600; color: #0f172a; }
			.hatch-health-tile .s { font-size: 12px; color: #475569; margin-top: 2px; }
			.hatch-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
			.hatch-dot.green  { background: #10b981; }
			.hatch-dot.yellow { background: #f59e0b; }
			.hatch-dot.red    { background: #ef4444; }
			.hatch-dot.gray   { background: #94a3b8; }
			.hatch-health-foot { margin-top: 12px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; gap: 12px; }
			.hatch-health-foot a { text-decoration: none; }
		</style>
		<div class="hatch-health">
			<div class="hatch-health-grid">

				<div class="hatch-health-tile">
					<h4><?php esc_html_e( 'Connection', 'hatch' ); ?></h4>
					<div class="v">
						<?php echo self::dot_for_state( $conn_state ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						<?php echo esc_html( self::label_for_state( $conn_state ) ); ?>
					</div>
					<?php if ( $conn_seen_ago ) : ?>
						<div class="s">
							<?php
							/* translators: %s: relative time, e.g. "2 minutes" */
							echo esc_html( sprintf( __( 'Last seen %s ago', 'hatch' ), $conn_seen_ago ) );
							?>
						</div>
					<?php else : ?>
						<div class="s"><?php esc_html_e( 'No heartbeat yet', 'hatch' ); ?></div>
					<?php endif; ?>
				</div>

				<div class="hatch-health-tile">
					<h4><?php esc_html_e( 'Last deploy', 'hatch' ); ?></h4>
					<?php if ( $primary_deploy && ! empty( $primary_deploy['last_fire'] ) ) :
						$fire = $primary_deploy['last_fire'];
						$ago  = human_time_diff( (int) $fire['ts'], time() );
						?>
						<div class="v">
							<?php echo self::dot_for_state( $primary_deploy['state'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
							<?php echo esc_html( $primary_deploy['label'] ); ?>
						</div>
						<div class="s">
							<?php
							/* translators: 1: status code, 2: relative time */
							echo esc_html( sprintf( __( '%1$d · %2$s ago', 'hatch' ), (int) $fire['status'], $ago ) );
							?>
						</div>
					<?php else : ?>
						<div class="v">
							<span class="hatch-dot gray"></span>
							<?php esc_html_e( 'Not configured', 'hatch' ); ?>
						</div>
						<div class="s">
							<a href="<?php echo esc_url( admin_url( 'admin.php?page=hatch&tab=connector' ) ); ?>">
								<?php esc_html_e( 'Add a deploy hook →', 'hatch' ); ?>
							</a>
						</div>
					<?php endif; ?>
				</div>

				<div class="hatch-health-tile">
					<h4><?php esc_html_e( 'Content', 'hatch' ); ?></h4>
					<div class="v"><?php echo esc_html( number_format_i18n( $post_count ) ); ?></div>
					<div class="s"><?php esc_html_e( 'Published posts', 'hatch' ); ?></div>
				</div>

				<div class="hatch-health-tile">
					<h4><?php esc_html_e( 'Architecture', 'hatch' ); ?></h4>
					<div class="v">
						<?php echo self::dot_for_domain( $domain ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						<?php echo esc_html( self::label_for_domain( $domain ) ); ?>
					</div>
					<div class="s"><?php echo esc_html( self::sub_for_domain( $domain ) ); ?></div>
				</div>

			</div>

			<div class="hatch-health-foot">
				<a href="<?php echo esc_url( admin_url( 'admin.php?page=hatch' ) ); ?>">
					<?php esc_html_e( 'Open Hatch dashboard →', 'hatch' ); ?>
				</a>
				<a href="https://github.com/adityaarsharma/hatch/blob/main/docs/" target="_blank" rel="noopener noreferrer">
					<?php esc_html_e( 'Documentation', 'hatch' ); ?>
				</a>
			</div>
		</div>
		<?php
	}

	/* ------------------------------------------------------------------ */

	/**
	 * Status dot HTML for a connection state.
	 *
	 * @param string $state State.
	 * @return string
	 */
	private static function dot_for_state( string $state ): string {
		$color = 'gray';
		if ( 'connected' === $state ) {
			$color = 'green';
		} elseif ( 'stale' === $state ) {
			$color = 'yellow';
		} elseif ( in_array( $state, array( 'failed', 'disconnected' ), true ) ) {
			$color = 'red';
		}
		return '<span class="hatch-dot ' . esc_attr( $color ) . '"></span>';
	}

	/**
	 * Human label for a connection state.
	 *
	 * @param string $state State.
	 * @return string
	 */
	private static function label_for_state( string $state ): string {
		switch ( $state ) {
			case 'connected':    return __( 'Connected', 'hatch' );
			case 'stale':        return __( 'Stale',     'hatch' );
			case 'failed':       return __( 'Failed',    'hatch' );
			case 'disconnected': return __( 'Disconnected', 'hatch' );
			case 'never_fired':  return __( 'Never seen', 'hatch' );
			default:             return __( 'Unknown',   'hatch' );
		}
	}

	/**
	 * Dot for the domain classification.
	 *
	 * @param string $domain Classification.
	 * @return string
	 */
	private static function dot_for_domain( string $domain ): string {
		$color = 'gray';
		if ( in_array( $domain, array( 'subdomain', 'dev', 'ip' ), true ) ) {
			$color = 'green';
		} elseif ( 'root' === $domain ) {
			$color = 'yellow';
		}
		return '<span class="hatch-dot ' . esc_attr( $color ) . '"></span>';
	}

	/**
	 * Human label for a domain classification.
	 *
	 * @param string $domain Classification.
	 * @return string
	 */
	private static function label_for_domain( string $domain ): string {
		switch ( $domain ) {
			case 'subdomain': return __( 'Subdomain', 'hatch' );
			case 'root':      return __( 'Root domain', 'hatch' );
			case 'dev':       return __( 'Dev host', 'hatch' );
			case 'ip':        return __( 'IP', 'hatch' );
			default:          return __( 'Unknown', 'hatch' );
		}
	}

	/**
	 * Sub-label for the domain tile.
	 *
	 * @param string $domain Classification.
	 * @return string
	 */
	private static function sub_for_domain( string $domain ): string {
		switch ( $domain ) {
			case 'subdomain': return __( 'Correct — frontend owns the root', 'hatch' );
			case 'root':      return __( 'Move WP to a subdomain', 'hatch' );
			case 'dev':       return __( 'Local development', 'hatch' );
			case 'ip':        return __( 'Direct IP access', 'hatch' );
			default:          return '';
		}
	}
}

<?php
/**
 * Root Domain Check — flags WordPress installs running on a "naked" domain.
 *
 * In a headless architecture, WordPress should NEVER live on the root domain
 * (`mysite.com`). It belongs on a subdomain (`cms.mysite.com`, `wp.mysite.com`,
 * `admin.mysite.com`) so the public frontend can own the root.
 *
 * This class detects the violation and shows a persistent, dismissible warning
 * with a clear migration guide.
 *
 * Detection logic:
 *   - parse home_url() host
 *   - count dots: 2 dots = subdomain (cms.mysite.com), 1 dot = root (mysite.com)
 *   - except: localhost, *.local, IP addresses → ignore
 *   - except: well-known dev TLDs (.test, .ddev.site) → ignore
 *   - whitelist common "headless backend" prefixes: cms.*, wp.*, admin.*, api.*, headless.*
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Domain_Check
 */
class Hatch_Domain_Check {

	const DISMISS_KEY = 'hatch_root_domain_dismissed';
	const DISMISS_TTL = MONTH_IN_SECONDS; // user can dismiss for 30 days, then re-warned

	/**
	 * Common "headless backend" subdomain prefixes — these are GOOD.
	 *
	 * @var array<string>
	 */
	private const BACKEND_PREFIXES = array( 'cms', 'wp', 'admin', 'api', 'headless', 'backend', 'manage', 'editor' );

	/**
	 * Dev TLDs / hosts we should ignore (no warning).
	 *
	 * @var array<string>
	 */
	private const DEV_HOSTS = array( 'localhost', '.local', '.test', '.ddev.site', '.lndo.site' );

	/**
	 * @var Hatch_Domain_Check|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Domain_Check
	 */
	public static function instance(): Hatch_Domain_Check {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire hooks.
	 */
	private function __construct() {
		add_action( 'admin_notices', array( $this, 'maybe_show_notice' ) );
		add_action( 'admin_init', array( $this, 'maybe_dismiss_notice' ) );
	}

	/**
	 * Categorize the current site URL.
	 *
	 * @return string 'subdomain' | 'root' | 'dev' | 'ip' | 'unknown'
	 */
	public static function classify(): string {
		$home = (string) home_url();
		$host = wp_parse_url( $home, PHP_URL_HOST );
		if ( ! $host ) {
			return 'unknown';
		}
		$host = strtolower( (string) $host );

		// IP address → don't warn.
		if ( filter_var( $host, FILTER_VALIDATE_IP ) ) {
			return 'ip';
		}

		// Dev hosts → don't warn.
		foreach ( self::DEV_HOSTS as $dev ) {
			if ( 'localhost' === $dev && 'localhost' === $host ) {
				return 'dev';
			}
			if ( '.' === substr( $dev, 0, 1 ) && substr( $host, -strlen( $dev ) ) === $dev ) {
				return 'dev';
			}
		}

		// Count parts. "mysite.com" = 2 parts. "cms.mysite.com" = 3 parts.
		$parts = explode( '.', $host );

		// Two parts: definitely root.
		if ( count( $parts ) === 2 ) {
			return 'root';
		}

		// Three+ parts: check if first segment is a known backend prefix or known
		// public-facing prefix (www).
		if ( count( $parts ) >= 3 ) {
			$first = $parts[0];
			if ( 'www' === $first ) {
				// www.mysite.com — public-facing, equivalent to root.
				return 'root';
			}
			// Some country TLDs need different handling (mysite.co.uk = root).
			$known_country_tlds = array(
				'co.uk', 'co.in', 'co.jp', 'co.za', 'co.nz', 'com.au', 'com.br', 'com.mx',
			);
			$last_two = $parts[ count( $parts ) - 2 ] . '.' . $parts[ count( $parts ) - 1 ];
			if ( in_array( $last_two, $known_country_tlds, true ) && count( $parts ) === 3 ) {
				return 'root';
			}
			if ( in_array( $first, self::BACKEND_PREFIXES, true ) ) {
				return 'subdomain';
			}
			// Some other subdomain — treat as subdomain (probably fine).
			return 'subdomain';
		}

		return 'unknown';
	}

	/**
	 * Maybe show the root-domain warning.
	 *
	 * @return void
	 */
	public function maybe_show_notice(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( get_transient( self::DISMISS_KEY ) ) {
			return;
		}
		if ( 'root' !== self::classify() ) {
			return;
		}

		$dismiss_url = wp_nonce_url(
			add_query_arg( 'hatch_dismiss_root_domain', '1' ),
			'hatch_dismiss_root_domain'
		);
		$current_host = (string) wp_parse_url( home_url(), PHP_URL_HOST );
		?>
		<div class="notice notice-warning is-dismissible" style="border-left-color:#f59e0b;">
			<p style="font-size:14px; line-height:1.5;">
				<strong>⚠ <?php esc_html_e( 'Hatch — Headless WordPress', 'hatch' ); ?>:</strong>
				<?php esc_html_e( 'WordPress is running on a publicly-accessible root address.', 'hatch' ); ?>
				<code><?php echo esc_html( $current_host ); ?></code>
			</p>
			<p style="font-size:13px; line-height:1.5; color:#475569;">
				<?php esc_html_e( 'In a headless setup, your public frontend owns the root address. WordPress should live on a separate, non-public-facing address (any subdomain works — name it whatever you want).', 'hatch' ); ?>
				<br/>
				<?php esc_html_e( 'Why this matters: visitors should not be able to reach WordPress directly. If they can, search engines will index it, your frontend will conflict on the same host, and SEO suffers.', 'hatch' ); ?>
			</p>
			<p>
				<a href="https://github.com/adityaarsharma/hatch/blob/main/docs/what-is-headless-wordpress.md" target="_blank" rel="noopener noreferrer" class="button button-primary">
					<?php esc_html_e( 'Read the migration guide →', 'hatch' ); ?>
				</a>
				<a href="<?php echo esc_url( $dismiss_url ); ?>" style="margin-left:12px; font-size:12px; color:#64748b;">
					<?php esc_html_e( 'Dismiss for 30 days', 'hatch' ); ?>
				</a>
			</p>
		</div>
		<?php
	}

	/**
	 * Handle dismiss link.
	 *
	 * @return void
	 */
	public function maybe_dismiss_notice(): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( empty( $_GET['hatch_dismiss_root_domain'] ) ) {
			return;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$nonce = isset( $_GET['_wpnonce'] ) ? sanitize_text_field( wp_unslash( (string) $_GET['_wpnonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'hatch_dismiss_root_domain' ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		set_transient( self::DISMISS_KEY, 1, self::DISMISS_TTL );
		wp_safe_redirect( remove_query_arg( array( 'hatch_dismiss_root_domain', '_wpnonce' ) ) );
		exit;
	}
}

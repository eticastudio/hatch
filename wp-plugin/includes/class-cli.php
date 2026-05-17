<?php
/**
 * Hatch WP-CLI commands.
 *
 * The "no Claude Code needed" path — one terminal command sets up everything
 * a headless frontend needs from the WordPress side.
 *
 * Commands:
 *   wp hatch setup [--frontend=<url>] [--name=<name>]
 *     Runs full setup: diagnose → generate App Password → set webhook URL.
 *     Outputs a ready-to-paste .env block.
 *
 *   wp hatch diagnose [--format=table|json]
 *     Runs 12 preflight checks and prints results.
 *
 *   wp hatch generate-token [--name=<name>]
 *     Generates an Application Password. Prints once.
 *
 *   wp hatch info [--format=table|json]
 *     Prints detected plugins + site state.
 *
 *   wp hatch revalidate [--reason=<reason>]
 *     Manually fires the revalidation webhook.
 *
 *   wp hatch env
 *     Outputs the .env block (without regenerating the App Password).
 *     Use when you already have a token saved elsewhere.
 *
 * Loaded only when WP_CLI is defined (see hatch.php bootstrap).
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

if ( ! defined( 'WP_CLI' ) || ! WP_CLI ) {
	return;
}

/**
 * Hatch CLI command group.
 */
class Hatch_CLI {

	/**
	 * Full setup — diagnose, generate App Password, set webhook URL, print .env.
	 *
	 * ## OPTIONS
	 *
	 * [--frontend=<url>]
	 * : URL of your headless frontend (used for the revalidation webhook).
	 *
	 * [--name=<name>]
	 * : Friendly name for the Application Password.
	 *
	 * [--skip-diagnose]
	 * : Skip the preflight diagnostic.
	 *
	 * ## EXAMPLES
	 *
	 *     # Full setup in one command:
	 *     wp hatch setup --frontend=https://mysite.com
	 *
	 *     # Pre-set the App Password name:
	 *     wp hatch setup --frontend=https://mysite.com --name="Production frontend"
	 *
	 * @param array $args       Positional args.
	 * @param array $assoc_args Flags.
	 * @return void
	 */
	public function setup( $args, $assoc_args ) {
		unset( $args );

		$frontend = isset( $assoc_args['frontend'] ) ? esc_url_raw( (string) $assoc_args['frontend'] ) : '';
		$name     = isset( $assoc_args['name'] ) ? sanitize_text_field( (string) $assoc_args['name'] ) : 'Hatch CLI Frontend';
		$skip_dx  = ! empty( $assoc_args['skip-diagnose'] );

		WP_CLI::log( '' );
		WP_CLI::log( WP_CLI::colorize( '%c╭─ Hatch Setup ───────────────────────────────────────%n' ) );
		WP_CLI::log( WP_CLI::colorize( '%c│%n' ) );
		WP_CLI::log( WP_CLI::colorize( sprintf( '%%c│%%n WordPress URL : %s', home_url() ) ) );
		WP_CLI::log( WP_CLI::colorize( sprintf( '%%c│%%n Frontend URL  : %s', $frontend ?: '(skipping webhook)' ) ) );
		WP_CLI::log( WP_CLI::colorize( '%c│%n' ) );
		WP_CLI::log( WP_CLI::colorize( '%c╰─────────────────────────────────────────────────────%n' ) );
		WP_CLI::log( '' );

		// Step 1: Diagnose.
		if ( ! $skip_dx ) {
			WP_CLI::log( WP_CLI::colorize( '%y▶ Step 1/4: Running preflight diagnostic…%n' ) );
			$report = Hatch_Diagnostic::run();
			$this->print_diagnostic_inline( $report );
			if ( 'fail' === $report['overall'] ) {
				WP_CLI::warning( 'Diagnostic failed. Fix blockers above, then re-run setup.' );
				WP_CLI::halt( 1 );
			}
			WP_CLI::log( '' );
		}

		// Step 2: Generate Application Password.
		WP_CLI::log( WP_CLI::colorize( '%y▶ Step 2/4: Generating Application Password…%n' ) );
		if ( ! class_exists( 'WP_Application_Passwords' ) ) {
			WP_CLI::error( 'Application Passwords are not available on this WordPress.' );
		}
		$user_id = get_current_user_id();
		if ( ! $user_id ) {
			$user = get_user_by( 'login', 'admin' );
			if ( ! $user ) {
				$users = get_users( array( 'role' => 'administrator', 'number' => 1 ) );
				$user  = $users[0] ?? null;
			}
			if ( ! $user ) {
				WP_CLI::error( 'No administrator user found. Run as an admin: wp --user=admin hatch setup' );
			}
			$user_id = $user->ID;
		}
		$user = get_userdata( $user_id );

		$created = WP_Application_Passwords::create_new_application_password( $user_id, array( 'name' => $name ) );
		if ( is_wp_error( $created ) ) {
			WP_CLI::error( 'Could not create App Password: ' . $created->get_error_message() );
		}
		list( $password, $item ) = $created;
		unset( $item );

		WP_CLI::success( sprintf( 'App Password created for user %s.', $user->user_login ) );

		// Step 3: Set webhook URL (if provided).
		if ( '' !== $frontend ) {
			WP_CLI::log( '' );
			WP_CLI::log( WP_CLI::colorize( '%y▶ Step 3/4: Configuring revalidation webhook…%n' ) );
			$revalidate_url = rtrim( $frontend, '/' ) . '/api/revalidate';
			update_option( 'hatch_revalidate_endpoint', esc_url_raw( $revalidate_url ) );
			WP_CLI::success( sprintf( 'Webhook URL set to %s', $revalidate_url ) );
		} else {
			WP_CLI::log( '' );
			WP_CLI::log( WP_CLI::colorize( '%y▶ Step 3/4: Webhook URL (skipped — no --frontend flag)%n' ) );
		}

		// Step 4: Print .env.
		WP_CLI::log( '' );
		WP_CLI::log( WP_CLI::colorize( '%y▶ Step 4/4: Copy this into your frontend .env file:%n' ) );
		WP_CLI::log( '' );
		$webhook_secret = (string) get_option( 'hatch_webhook_secret', '' );
		$lines = array(
			'HATCH_WP_URL=' . home_url(),
			'WORDPRESS_USER=' . $user->user_login,
			'WORDPRESS_APP_PASSWORD=' . $password,
			'HATCH_WEBHOOK_SECRET=' . $webhook_secret,
		);
		WP_CLI::log( WP_CLI::colorize( '%g' . str_repeat( '─', 56 ) . '%n' ) );
		foreach ( $lines as $l ) {
			WP_CLI::log( WP_CLI::colorize( '%g' . $l . '%n' ) );
		}
		WP_CLI::log( WP_CLI::colorize( '%g' . str_repeat( '─', 56 ) . '%n' ) );
		WP_CLI::log( '' );
		WP_CLI::log( WP_CLI::colorize( '%c⚠ This is the only time the password is shown. Save it now.%n' ) );
		WP_CLI::log( '' );
		WP_CLI::success( 'Setup complete.' );
	}

	/**
	 * Run preflight diagnostic.
	 *
	 * ## OPTIONS
	 *
	 * [--format=<format>]
	 * : Output format.
	 * ---
	 * default: table
	 * options:
	 *   - table
	 *   - json
	 * ---
	 *
	 * ## EXAMPLES
	 *
	 *     wp hatch diagnose
	 *     wp hatch diagnose --format=json
	 *
	 * @param array $args       Positional args.
	 * @param array $assoc_args Flags.
	 * @return void
	 */
	public function diagnose( $args, $assoc_args ) {
		unset( $args );
		$format = isset( $assoc_args['format'] ) ? (string) $assoc_args['format'] : 'table';

		$report = Hatch_Diagnostic::run();

		if ( 'json' === $format ) {
			WP_CLI::log( wp_json_encode( $report, JSON_PRETTY_PRINT ) );
			WP_CLI::halt( 'fail' === $report['overall'] ? 1 : 0 );
		}

		$this->print_diagnostic_inline( $report );

		if ( 'fail' === $report['overall'] ) {
			WP_CLI::halt( 1 );
		}
	}

	/**
	 * Print diagnostic results as a nice CLI table.
	 *
	 * @param array $report Report from Hatch_Diagnostic::run().
	 * @return void
	 */
	private function print_diagnostic_inline( array $report ): void {
		foreach ( $report['checks'] as $c ) {
			switch ( $c['severity'] ) {
				case 'pass':
					$icon = WP_CLI::colorize( '%g✓%n' );
					break;
				case 'warn':
					$icon = WP_CLI::colorize( '%y!%n' );
					break;
				case 'fail':
					$icon = WP_CLI::colorize( '%r✕%n' );
					break;
				default:
					$icon = '·';
			}
			WP_CLI::log( sprintf( '  %s %s — %s', $icon, $c['label'], $c['message'] ) );
			if ( ! empty( $c['fix'] ) && 'pass' !== $c['severity'] ) {
				WP_CLI::log( '      ' . WP_CLI::colorize( '%n→ ' ) . $c['fix'] );
			}
		}
		WP_CLI::log( '' );
		WP_CLI::log( sprintf(
			'  %s %d pass · %s %d warn · %s %d fail',
			WP_CLI::colorize( '%g✓%n' ),
			(int) $report['pass_count'],
			WP_CLI::colorize( '%y!%n' ),
			(int) $report['warn_count'],
			WP_CLI::colorize( '%r✕%n' ),
			(int) $report['fail_count']
		) );
	}

	/**
	 * Generate an Application Password.
	 *
	 * ## OPTIONS
	 *
	 * [--name=<name>]
	 * : Friendly name (default: "Hatch CLI Token").
	 *
	 * ## EXAMPLES
	 *
	 *     wp hatch generate-token
	 *     wp hatch generate-token --name="Production"
	 *
	 * @param array $args       Positional args.
	 * @param array $assoc_args Flags.
	 * @return void
	 */
	public function generate_token( $args, $assoc_args ) {
		unset( $args );
		$name = isset( $assoc_args['name'] ) ? sanitize_text_field( (string) $assoc_args['name'] ) : 'Hatch CLI Token';

		if ( ! class_exists( 'WP_Application_Passwords' ) ) {
			WP_CLI::error( 'Application Passwords are not available on this WordPress.' );
		}
		$user_id = get_current_user_id();
		if ( ! $user_id ) {
			WP_CLI::error( 'Run as an admin: wp --user=<admin> hatch generate-token' );
		}
		$created = WP_Application_Passwords::create_new_application_password( $user_id, array( 'name' => $name ) );
		if ( is_wp_error( $created ) ) {
			WP_CLI::error( 'Could not create App Password: ' . $created->get_error_message() );
		}
		list( $password ) = $created;
		$user = get_userdata( $user_id );

		WP_CLI::log( sprintf( 'Username: %s', $user->user_login ) );
		WP_CLI::log( sprintf( 'Password: %s', $password ) );
		WP_CLI::log( '' );
		WP_CLI::warning( 'This is the only time the password is shown. Save it now.' );
	}

	/**
	 * Print plugin detection + site info.
	 *
	 * ## OPTIONS
	 *
	 * [--format=<format>]
	 * : Output format.
	 * ---
	 * default: table
	 * options:
	 *   - table
	 *   - json
	 * ---
	 */
	public function info( $args, $assoc_args ) {
		unset( $args );
		$format = isset( $assoc_args['format'] ) ? (string) $assoc_args['format'] : 'table';

		$data = array(
			'hatch_version' => HATCH_VERSION,
			'wp_version'    => get_bloginfo( 'version' ),
			'php_version'   => PHP_VERSION,
			'site_url'      => home_url(),
			'site_name'     => get_bloginfo( 'name' ),
			'detected'      => Hatch_Detector::report(),
			'webhook_url'   => (string) get_option( 'hatch_revalidate_endpoint', '' ),
			'has_secret'    => '' !== (string) get_option( 'hatch_webhook_secret', '' ),
		);

		if ( 'json' === $format ) {
			WP_CLI::log( wp_json_encode( $data, JSON_PRETTY_PRINT ) );
			return;
		}

		WP_CLI::log( sprintf( 'Hatch %s on WordPress %s (PHP %s)', HATCH_VERSION, $data['wp_version'], PHP_VERSION ) );
		WP_CLI::log( sprintf( 'Site: %s', home_url() ) );
		WP_CLI::log( sprintf( 'Webhook: %s', $data['webhook_url'] ?: '(not configured)' ) );
		WP_CLI::log( '' );
		WP_CLI::log( sprintf( 'SEO plugin    : %s', $data['detected']['seo'] ) );
		WP_CLI::log( sprintf( 'Forms         : %s', implode( ', ', $data['detected']['forms'] ) ?: 'none' ) );
		WP_CLI::log( sprintf( 'Custom fields : %s', $data['detected']['custom_fields'] ) );
		WP_CLI::log( sprintf( 'CPT manager   : %s', $data['detected']['cpt_manager'] ) );
		WP_CLI::log( sprintf( 'i18n          : %s', $data['detected']['i18n'] ) );
	}

	/**
	 * Manually trigger the revalidation webhook.
	 *
	 * ## OPTIONS
	 *
	 * [--reason=<reason>]
	 * : Reason string sent in the payload (default: "cli-manual").
	 */
	public function revalidate( $args, $assoc_args ) {
		unset( $args );
		$reason = isset( $assoc_args['reason'] ) ? sanitize_text_field( (string) $assoc_args['reason'] ) : 'cli-manual';
		$fired  = Hatch_Revalidate::trigger( $reason );
		if ( ! $fired ) {
			WP_CLI::error( 'Webhook not configured. Run: wp hatch setup --frontend=https://your-site.com' );
		}
		WP_CLI::success( sprintf( 'Webhook fired (reason: %s).', $reason ) );
	}

	/**
	 * Print the frontend .env block (uses existing webhook secret; does not generate password).
	 */
	public function env( $args, $assoc_args ) {
		unset( $args, $assoc_args );

		$user = wp_get_current_user();
		if ( ! $user || ! $user->exists() ) {
			WP_CLI::error( 'Run as a user: wp --user=<admin> hatch env' );
		}
		$secret = (string) get_option( 'hatch_webhook_secret', '' );
		WP_CLI::log( 'HATCH_WP_URL=' . home_url() );
		WP_CLI::log( 'WORDPRESS_USER=' . $user->user_login );
		WP_CLI::log( 'WORDPRESS_APP_PASSWORD=<paste-from-wp-admin>' );
		WP_CLI::log( 'HATCH_WEBHOOK_SECRET=' . $secret );
	}
}

WP_CLI::add_command( 'hatch', 'Hatch_CLI' );

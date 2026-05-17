<?php
/**
 * Hatch Frontend Installer Route — serves the agent install script.
 *
 * Listens on the public URL /hatch-agent-installer (also accepts the legacy
 * query string ?hatch_agent_installer=1). Requires a valid one-time token
 * passed as ?hatch_agent_token=… or as the path segment after the URL.
 *
 * Token is consumed (single-use) on successful read. Without a valid token,
 * the endpoint returns 404 — it does NOT reveal that the route exists.
 *
 * Substitutes placeholders in the agent/install-template.sh shipped with the
 * plugin, embeds the agent.js source as base64, returns as text/x-shellscript.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Hatch_Frontend_Installer_Route
 */
class Hatch_Frontend_Installer_Route {

	/**
	 * @var Hatch_Frontend_Installer_Route|null
	 */
	private static $instance = null;

	/**
	 * Singleton accessor.
	 *
	 * @return Hatch_Frontend_Installer_Route
	 */
	public static function instance(): Hatch_Frontend_Installer_Route {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Wire hooks.
	 */
	private function __construct() {
		add_action( 'init', array( $this, 'maybe_handle' ), 5 );
	}

	/**
	 * Detect installer requests and route them.
	 *
	 * @return void
	 */
	public function maybe_handle(): void {
		if ( ! empty( $_SERVER['REQUEST_URI'] ) ) {
			$path = wp_parse_url( (string) $_SERVER['REQUEST_URI'], PHP_URL_PATH );
		} else {
			$path = '';
		}

		$is_installer_path  = ( '/hatch-agent-installer' === rtrim( (string) $path, '/' ) );
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$is_installer_query = ! empty( $_GET['hatch_agent_installer'] );

		if ( ! $is_installer_path && ! $is_installer_query ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$token = isset( $_GET['hatch_agent_token'] ) ? (string) wp_unslash( $_GET['hatch_agent_token'] ) : '';
		if ( '' === $token ) {
			$this->respond_not_found();
		}

		$secret = Hatch_Frontend_Agent::consume_install_token( $token );
		if ( null === $secret ) {
			// Don't reveal "token expired" — same 404 as no token at all.
			$this->respond_not_found();
		}

		// Build install script.
		$script = $this->build_install_script( $secret );

		// Serve.
		nocache_headers();
		header( 'Content-Type: text/x-shellscript; charset=utf-8' );
		header( 'X-Content-Type-Options: nosniff' );
		header( 'Cache-Control: no-store, no-cache, must-revalidate, max-age=0' );
		header( 'Pragma: no-cache' );
		echo $script; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		exit;
	}

	/**
	 * Send a generic 404 and stop.
	 *
	 * @return void
	 */
	private function respond_not_found(): void {
		status_header( 404 );
		nocache_headers();
		header( 'Content-Type: text/plain; charset=utf-8' );
		echo 'Not found.';
		exit;
	}

	/**
	 * Build the install script — substitute placeholders, embed agent.js.
	 *
	 * @param string $secret Plaintext HMAC secret.
	 * @return string Full bash script.
	 */
	private function build_install_script( string $secret ): string {
		$template_path = HATCH_PLUGIN_DIR . 'agent/install-template.sh';
		$agent_path    = HATCH_PLUGIN_DIR . 'agent/agent.js';

		if ( ! is_readable( $template_path ) || ! is_readable( $agent_path ) ) {
			status_header( 500 );
			exit( "# Hatch installer template missing on the WordPress server.\nexit 1\n" );
		}

		$template = (string) file_get_contents( $template_path );
		$agent_js = (string) file_get_contents( $agent_path );

		$port    = (int) ( get_option( 'hatch_agent_port', 34210 ) );
		$workdir = (string) get_option( 'hatch_agent_workdir', '/var/www/hatch-frontend' );
		$repo    = (string) get_option( Hatch_Frontend_Agent::OPT_GIT_REPO, '' );
		$branch  = (string) get_option( Hatch_Frontend_Agent::OPT_GIT_BRANCH, 'main' );
		$pm2name = (string) get_option( 'hatch_agent_pm2_name', 'hatch-frontend' );

		$replacements = array(
			'{{HATCH_SECRET}}'    => self::escape_for_shell_double_quoted( $secret ),
			'{{HATCH_PORT}}'      => (string) $port,
			'{{HATCH_WORKDIR}}'   => self::escape_for_shell_double_quoted( $workdir ),
			'{{HATCH_WP_URL}}'    => self::escape_for_shell_double_quoted( (string) home_url() ),
			'{{HATCH_GIT_REPO}}'  => self::escape_for_shell_double_quoted( $repo ),
			'{{HATCH_BRANCH}}'    => self::escape_for_shell_double_quoted( $branch ),
			'{{HATCH_PM2_NAME}}'  => self::escape_for_shell_double_quoted( $pm2name ),
			'{{AGENT_JS_BASE64}}' => base64_encode( $agent_js ),
		);

		return strtr( $template, $replacements );
	}

	/**
	 * Defang for double-quoted shell context (template uses "{{X}}").
	 *
	 * @param string $v Value to escape.
	 * @return string
	 */
	private static function escape_for_shell_double_quoted( string $v ): string {
		// Forbid characters that could break out of a "..." context.
		return str_replace( array( '"', '`', '$', '\\' ), array( '\"', '\`', '\$', '\\\\' ), $v );
	}
}

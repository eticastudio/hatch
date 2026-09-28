<?php
/**
 * Deploy provider contract.
 *
 * A provider publishes the bundled Hatch frontend to one hosting platform
 * using credentials the site owner supplies. Version 1 ships one provider
 * (Cloudflare Workers). Another platform is added by implementing this
 * interface and registering it through the `hatch_deploy_providers` filter,
 * so the controller and the REST layer stay unchanged.
 *
 * @package Hatch
 * @since   1.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Contract every deploy provider implements.
 */
interface Hatch_Deploy_Provider {

	/**
	 * Stable machine id, lowercase letters and digits only ("cloudflare").
	 * Used as the credential store key and in REST routes.
	 *
	 * @return string
	 */
	public function get_id(): string;

	/**
	 * Human readable name for admin screens.
	 *
	 * @return string
	 */
	public function get_label(): string;

	/**
	 * Value written to the hosting model option after a successful deploy.
	 *
	 * @return string
	 */
	public function get_hosting_model(): string;

	/**
	 * Permissions the API token needs, as the names Cloudflare (or the
	 * platform) shows in its own token screen. Used to build help text.
	 *
	 * @return array<int,array{scope:string,permission:string,access:string,required:bool,reason:string}>
	 */
	public function get_required_permissions(): array;

	/**
	 * Check a token without changing anything on the remote account.
	 *
	 * @param string $token API token.
	 * @return array<string,mixed>|WP_Error Summary on success, WP_Error with a user-safe message on failure.
	 */
	public function verify_token( string $token );

	/**
	 * Publish the frontend.
	 *
	 * Options understood by every provider:
	 *  - mount_mode  "root" or "subfolder".
	 *  - subpath     Path prefix for subfolder mode, such as "/blog".
	 *  - domain      Host name of a zone in the same account, or "".
	 *  - wp_url      Public URL of this WordPress site.
	 *  - wp_user     WordPress user name the frontend authenticates as.
	 *  - wp_pass     Application password for that user.
	 *  - webhook_secret Shared secret for the revalidate webhook.
	 *
	 * @param string              $token   API token.
	 * @param array<string,mixed> $options Deploy options.
	 * @return array<string,mixed>|WP_Error Result (url, name, details) or WP_Error.
	 */
	public function deploy( string $token, array $options );
}

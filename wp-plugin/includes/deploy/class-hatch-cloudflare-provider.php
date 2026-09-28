<?php
/**
 * Cloudflare Workers deploy provider.
 *
 * Publishes the frontend bundled inside this plugin to the site owner's own
 * Cloudflare account, using an API token the owner supplies. Nothing is sent
 * to any server other than Cloudflare's API and the resulting Worker runs in
 * the owner's account.
 *
 * Steps, each one a separate Cloudflare API contract call:
 *  1. Token check (user or account owned token).
 *  2. Account lookup.
 *  3. Optional zone lookup for a custom domain.
 *  4. workers.dev subdomain check, before anything is uploaded.
 *  5. Static asset upload session and upload of any files Cloudflare asks for.
 *  6. Worker script upload with runtime bindings (WordPress credentials are
 *     secret_text bindings, never part of the uploaded code).
 *  7. workers.dev route enabled for the script.
 *  8. Optional edge proxy Worker plus Workers routes for the custom domain.
 *
 * @package Hatch
 * @since   1.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Cloudflare Workers provider.
 */
final class Hatch_Cloudflare_Provider implements Hatch_Deploy_Provider {

	/**
	 * Hosting model recorded after a successful deploy.
	 */
	const HOSTING_MODEL = 'cloudflare-workers';

	/**
	 * Prefix of the frontend Worker name.
	 */
	const SCRIPT_PREFIX = 'hatch';

	/**
	 * Suffix of the edge proxy Worker name.
	 */
	const PROXY_SUFFIX = '-edge';

	/**
	 * Optional bundle override, for tests.
	 *
	 * @var Hatch_Frontend_Bundle|null
	 */
	private $bundle;

	/**
	 * Create the provider.
	 *
	 * @param Hatch_Frontend_Bundle|null $bundle Bundle reader. Defaults to the plugin's own.
	 */
	public function __construct( ?Hatch_Frontend_Bundle $bundle = null ) {
		$this->bundle = $bundle;
	}

	/**
	 * Machine id.
	 *
	 * @return string
	 */
	public function get_id(): string {
		return 'cloudflare';
	}

	/**
	 * Label.
	 *
	 * @return string
	 */
	public function get_label(): string {
		return __( 'Cloudflare Workers', 'hatch-bridge' );
	}

	/**
	 * Hosting model value.
	 *
	 * @return string
	 */
	public function get_hosting_model(): string {
		return self::HOSTING_MODEL;
	}

	/**
	 * Permission names, as shown in the Cloudflare "Create Custom Token" screen.
	 *
	 * @return array<int,array{scope:string,permission:string,access:string,required:bool,reason:string}>
	 */
	public function get_required_permissions(): array {
		return array(
			array(
				'scope'      => 'Account',
				'permission' => 'Workers Scripts',
				'access'     => 'Edit',
				'required'   => true,
				'reason'     => __( 'Uploads the frontend Worker and its static files.', 'hatch-bridge' ),
			),
			array(
				'scope'      => 'Account',
				'permission' => 'Account Settings',
				'access'     => 'Read',
				'required'   => false,
				'reason'     => __( 'Lets Hatch find your Cloudflare account automatically.', 'hatch-bridge' ),
			),
			array(
				'scope'      => 'Zone',
				'permission' => 'Zone',
				'access'     => 'Read',
				'required'   => false,
				'reason'     => __( 'Only for a custom domain: finds the domain in your account.', 'hatch-bridge' ),
			),
			array(
				'scope'      => 'Zone',
				'permission' => 'Workers Routes',
				'access'     => 'Edit',
				'required'   => false,
				'reason'     => __( 'Only for a custom domain: routes the domain to the Worker.', 'hatch-bridge' ),
			),
		);
	}

	/**
	 * Check a token and list the accounts it can see.
	 *
	 * @param string $token API token.
	 * @return array{status:string,accounts:array<int,array{id:string,name:string}>,account_lookup:bool}|WP_Error
	 */
	public function verify_token( string $token ) {
		$token = trim( $token );
		if ( '' === $token ) {
			return new WP_Error( 'hatch_cf_no_token', __( 'A Cloudflare API token is required.', 'hatch-bridge' ), array( 'status' => 400 ) );
		}
		$api = new Hatch_Cloudflare_Api( $token );

		$verified = $api->request( 'GET', '/user/tokens/verify' );
		$accounts = null;

		if ( is_wp_error( $verified ) ) {
			$code = $verified->get_error_code();
			if ( ! in_array( $code, array( 'hatch_cf_auth', 'hatch_cf_permission', 'hatch_cf_rejected' ), true ) ) {
				return $verified;
			}
			// An account owned token cannot use the user endpoint. Find its account, then use the account endpoint.
			$accounts = $this->list_accounts( $api );
			if ( is_wp_error( $accounts ) || empty( $accounts ) ) {
				return $verified;
			}
			$verified = $api->request( 'GET', '/accounts/' . rawurlencode( $accounts[0]['id'] ) . '/tokens/verify' );
			if ( is_wp_error( $verified ) ) {
				return $verified;
			}
		}

		$status = isset( $verified['result']['status'] ) ? (string) $verified['result']['status'] : '';
		if ( 'active' !== $status ) {
			return new WP_Error(
				'hatch_cf_token_inactive',
				'expired' === $status
					? __( 'This Cloudflare API token has expired. Create a new one and try again.', 'hatch-bridge' )
					: __( 'This Cloudflare API token is not active. Check it in your Cloudflare dashboard, or create a new one.', 'hatch-bridge' ),
				array( 'status' => 400 )
			);
		}

		$lookup = true;
		if ( null === $accounts ) {
			$accounts = $this->list_accounts( $api );
			if ( is_wp_error( $accounts ) ) {
				$accounts = array();
				$lookup   = false;
			}
		}

		return array(
			'status'         => 'active',
			'accounts'       => $accounts,
			'account_lookup' => $lookup,
		);
	}

	/**
	 * Publish the frontend.
	 *
	 * @param string              $token   API token.
	 * @param array<string,mixed> $options See Hatch_Deploy_Provider::deploy().
	 * @return array<string,mixed>|WP_Error
	 */
	public function deploy( string $token, array $options ) {
		$token  = trim( $token );
		$bundle = $this->bundle ? $this->bundle : new Hatch_Frontend_Bundle();
		$valid  = $bundle->validate();
		if ( is_wp_error( $valid ) ) {
			return $valid;
		}
		$meta = $bundle->get_meta();
		if ( is_wp_error( $meta ) ) {
			return $meta;
		}

		$wp_url = isset( $options['wp_url'] ) ? untrailingslashit( (string) $options['wp_url'] ) : '';
		foreach ( array( 'wp_user', 'wp_pass', 'webhook_secret' ) as $required ) {
			if ( empty( $options[ $required ] ) ) {
				return new WP_Error( 'hatch_deploy_incomplete', __( 'Deploy could not start because a WordPress credential is missing.', 'hatch-bridge' ), array( 'status' => 400 ) );
			}
		}
		// The address is handed to the Worker, never requested from here, so only its shape matters: http(s) with a host.
		$wp_parts = wp_parse_url( $wp_url );
		if ( ! is_array( $wp_parts ) || empty( $wp_parts['host'] ) || ! isset( $wp_parts['scheme'] ) || ! in_array( $wp_parts['scheme'], array( 'http', 'https' ), true ) ) {
			return new WP_Error( 'hatch_deploy_bad_wp_url', __( 'The public WordPress address is not a valid URL.', 'hatch-bridge' ), array( 'status' => 400 ) );
		}

		$mount_mode = Hatch_Cloudflare_Proxy_Worker::normalize_mount_mode( isset( $options['mount_mode'] ) ? (string) $options['mount_mode'] : 'root' );
		$subpath    = 'subfolder' === $mount_mode ? Hatch_Cloudflare_Proxy_Worker::normalize_subpath( isset( $options['subpath'] ) ? (string) $options['subpath'] : '' ) : '';
		$domain     = self::normalize_domain( isset( $options['domain'] ) ? (string) $options['domain'] : '' );
		if ( isset( $options['domain'] ) && '' !== trim( (string) $options['domain'] ) && '' === $domain ) {
			return new WP_Error( 'hatch_deploy_bad_domain', __( 'That domain name is not valid. Enter a host name such as example.com, without https:// or a path.', 'hatch-bridge' ), array( 'status' => 400 ) );
		}

		$api = new Hatch_Cloudflare_Api( $token );

		// Steps 1 and 2: token and account.
		$verified = $this->verify_token( $token );
		if ( is_wp_error( $verified ) ) {
			return $this->step_error( $verified, __( 'Checking the token', 'hatch-bridge' ), 'verify' );
		}
		$account_id = $this->choose_account( $verified, isset( $options['account_id'] ) ? (string) $options['account_id'] : '' );
		if ( is_wp_error( $account_id ) ) {
			return $account_id;
		}

		// Step 3: zone for the custom domain, if any.
		$zone_id = '';
		if ( '' !== $domain ) {
			$zone = $this->find_zone( $api, $domain, $account_id );
			if ( is_wp_error( $zone ) ) {
				return $this->step_error( $zone, __( 'Looking up your domain', 'hatch-bridge' ), 'zone' );
			}
			$zone_id = $zone;
		}

		// Step 4: workers.dev address, checked before any upload.
		$subdomain = $this->get_workers_subdomain( $api, $account_id );
		if ( is_wp_error( $subdomain ) ) {
			return $this->step_error( $subdomain, __( 'Checking your workers.dev address', 'hatch-bridge' ), 'subdomain' );
		}

		$script = $this->script_name();
		$acct   = rawurlencode( $account_id );
		$name   = rawurlencode( $script );

		// Step 5: static assets.
		$manifest = $bundle->get_asset_manifest();
		if ( is_wp_error( $manifest ) ) {
			return $manifest;
		}
		$completion = $this->upload_assets( $api, $bundle, $acct, $name, $manifest );
		if ( is_wp_error( $completion ) ) {
			return $this->step_error( $completion, __( 'Uploading the site files', 'hatch-bridge' ), 'assets' );
		}

		// Step 6: the Worker script. The addresses that were fixed at build time are replaced with this site's own.
		$workers_origin = 'https://' . $script . '.' . $subdomain . '.workers.dev';
		$wp_origin      = $wp_parts['scheme'] . '://' . $wp_parts['host'] . ( isset( $wp_parts['port'] ) ? ':' . $wp_parts['port'] : '' );
		$parts          = $bundle->get_worker_parts(
			array(
				'wp_api_url' => $wp_url . '/wp-json/wp/v2',
				'site_url'   => '' !== $domain ? 'https://' . $domain : $workers_origin,
				'wp_origin'  => $wp_origin,
			)
		);
		if ( is_wp_error( $parts ) ) {
			return $parts;
		}
		$assets_block = array( 'jwt' => $completion );
		if ( ! empty( $meta['assets_config'] ) ) {
			$assets_block['config'] = $meta['assets_config'];
		}
		$metadata = array(
			'main_module'        => $meta['main_module'],
			'compatibility_date' => $meta['compatibility_date'],
			'assets'             => $assets_block,
			'bindings'           => array(
				array(
					'type' => 'assets',
					'name' => 'ASSETS',
				),
				array(
					'type' => 'plain_text',
					'name' => 'WP_API_URL',
					'text' => $wp_url . '/wp-json/wp/v2',
				),
				array(
					'type' => 'secret_text',
					'name' => 'WP_API_USER',
					'text' => (string) $options['wp_user'],
				),
				array(
					'type' => 'secret_text',
					'name' => 'WP_API_PASS',
					'text' => (string) $options['wp_pass'],
				),
				array(
					'type' => 'secret_text',
					'name' => 'HATCH_WEBHOOK_SECRET',
					'text' => (string) $options['webhook_secret'],
				),
			),
		);
		if ( ! empty( $meta['compatibility_flags'] ) ) {
			$metadata['compatibility_flags'] = $meta['compatibility_flags'];
		}
		array_unshift(
			$parts,
			array(
				'name'    => 'metadata',
				'type'    => 'application/json',
				'content' => (string) wp_json_encode( $metadata ),
			)
		);
		$uploaded = $api->request_multipart( 'PUT', '/accounts/' . $acct . '/workers/scripts/' . $name, $parts );
		if ( is_wp_error( $uploaded ) ) {
			return $this->step_error( $uploaded, __( 'Publishing the Worker', 'hatch-bridge' ), 'script' );
		}

		// Step 7: workers.dev address.
		$enabled = $api->request( 'POST', '/accounts/' . $acct . '/workers/scripts/' . $name . '/subdomain', array( 'body' => array( 'enabled' => true ) ) );
		if ( is_wp_error( $enabled ) ) {
			return $this->step_error( $enabled, __( 'Turning on the workers.dev address', 'hatch-bridge' ), 'script_subdomain' );
		}
		$origin = $workers_origin;

		$result = array(
			'name'         => $script,
			'url'          => $origin,
			'account_id'   => $account_id,
			'zone_id'      => $zone_id,
			'domain'       => $domain,
			'mount_mode'   => $mount_mode,
			'subpath'      => $subpath,
			'route_ids'    => array(),
			'public_url'   => $origin,
			'proxy_script' => '',
			'bundle'       => $meta['version'],
		);

		// Step 8: custom domain.
		if ( '' !== $domain ) {
			$proxy = $this->publish_proxy( $api, $account_id, $zone_id, $script, $origin, $domain, $subpath, $mount_mode );
			if ( is_wp_error( $proxy ) ) {
				$data           = (array) $proxy->get_error_data();
				$data['result'] = $result;
				return new WP_Error(
					$proxy->get_error_code(),
					sprintf(
						/* translators: %s: error detail. */
						__( 'The frontend is live on its workers.dev address, but connecting your domain failed. %s', 'hatch-bridge' ),
						$proxy->get_error_message()
					),
					$data
				);
			}
			$result['route_ids']    = $proxy['route_ids'];
			$result['proxy_script'] = $proxy['script'];
			$result['public_url']   = 'https://' . $domain . ( 'subfolder' === $mount_mode ? $subpath : '' );
		}

		return $result;
	}

	/**
	 * Zones (domains) the token can see, for the custom domain picker.
	 *
	 * @param string $token API token.
	 * @return array<int,array{id:string,name:string,account_id:string}>|WP_Error
	 */
	public function list_zones( string $token ) {
		$api   = new Hatch_Cloudflare_Api( trim( $token ) );
		$zones = array();
		for ( $page = 1; $page <= 5; $page++ ) {
			$response = $api->request(
				'GET',
				'/zones',
				array(
					'query' => array(
						'page'     => $page,
						'per_page' => 50,
					),
				)
			);
			if ( is_wp_error( $response ) ) {
				return $this->step_error( $response, __( 'Listing your domains', 'hatch-bridge' ), 'zones' );
			}
			$rows = (array) ( $response['result'] ?? array() );
			foreach ( $rows as $zone ) {
				if ( is_array( $zone ) && ! empty( $zone['id'] ) && ! empty( $zone['name'] ) ) {
					$zones[] = array(
						'id'         => (string) $zone['id'],
						'name'       => sanitize_text_field( (string) $zone['name'] ),
						'account_id' => isset( $zone['account']['id'] ) ? (string) $zone['account']['id'] : '',
					);
				}
			}
			$total_pages = isset( $response['result_info']['total_pages'] ) ? (int) $response['result_info']['total_pages'] : 1;
			if ( $page >= $total_pages || count( $rows ) < 50 ) {
				break;
			}
		}
		return $zones;
	}

	/**
	 * List the accounts a token can see.
	 *
	 * @param Hatch_Cloudflare_Api $api Client.
	 * @return array<int,array{id:string,name:string}>|WP_Error
	 */
	private function list_accounts( Hatch_Cloudflare_Api $api ) {
		$response = $api->request( 'GET', '/accounts', array( 'query' => array( 'per_page' => 50 ) ) );
		if ( is_wp_error( $response ) ) {
			return $response;
		}
		$accounts = array();
		foreach ( (array) ( $response['result'] ?? array() ) as $row ) {
			if ( is_array( $row ) && ! empty( $row['id'] ) && is_string( $row['id'] ) && 1 === preg_match( '/^[a-f0-9]{32}$/i', $row['id'] ) ) {
				$accounts[] = array(
					'id'   => $row['id'],
					'name' => isset( $row['name'] ) ? sanitize_text_field( (string) $row['name'] ) : '',
				);
			}
		}
		return $accounts;
	}

	/**
	 * Pick the account to deploy into.
	 *
	 * @param array<string,mixed> $verified  verify_token() result.
	 * @param string              $requested Account id the administrator chose, or "".
	 * @return string|WP_Error
	 */
	private function choose_account( array $verified, string $requested ) {
		$accounts  = $verified['accounts'];
		$requested = strtolower( trim( $requested ) );
		if ( '' !== $requested ) {
			if ( 1 !== preg_match( '/^[a-f0-9]{32}$/', $requested ) ) {
				return new WP_Error( 'hatch_cf_bad_account', __( 'That Cloudflare account ID is not valid. It is 32 letters and digits.', 'hatch-bridge' ), array( 'status' => 400 ) );
			}
			if ( ! empty( $accounts ) ) {
				foreach ( $accounts as $account ) {
					if ( strtolower( $account['id'] ) === $requested ) {
						return $account['id'];
					}
				}
				return new WP_Error( 'hatch_cf_bad_account', __( 'This token cannot access that Cloudflare account.', 'hatch-bridge' ), array( 'status' => 400 ) );
			}
			return $requested;
		}
		if ( 1 === count( $accounts ) ) {
			return $accounts[0]['id'];
		}
		if ( count( $accounts ) > 1 ) {
			$names = array();
			foreach ( $accounts as $account ) {
				$names[] = '' !== $account['name'] ? $account['name'] : $account['id'];
			}
			return new WP_Error(
				'hatch_cf_choose_account',
				sprintf(
					/* translators: %s: comma separated account names. */
					__( 'This token can reach more than one Cloudflare account (%s). Choose which one to use.', 'hatch-bridge' ),
					implode( ', ', $names )
				),
				array(
					'status'   => 409,
					'accounts' => $accounts,
				)
			);
		}
		return new WP_Error(
			'hatch_cf_no_account',
			__( 'Hatch could not find a Cloudflare account for this token. Add the "Account Settings Read" permission to the token, or enter your account ID.', 'hatch-bridge' ),
			array( 'status' => 400 )
		);
	}

	/**
	 * Find the zone that serves a domain, walking up from the host name.
	 *
	 * @param Hatch_Cloudflare_Api $api        Client.
	 * @param string               $domain     Host name.
	 * @param string               $account_id Account the zone must belong to.
	 * @return string|WP_Error Zone id.
	 */
	private function find_zone( Hatch_Cloudflare_Api $api, string $domain, string $account_id ) {
		$labels = explode( '.', $domain );
		while ( isset( $labels[1] ) ) {
			$candidate = implode( '.', $labels );
			$response  = $api->request( 'GET', '/zones', array( 'query' => array( 'name' => $candidate ) ) );
			if ( is_wp_error( $response ) ) {
				return $response;
			}
			foreach ( (array) ( $response['result'] ?? array() ) as $zone ) {
				if ( ! is_array( $zone ) || empty( $zone['id'] ) || ( $zone['name'] ?? '' ) !== $candidate ) {
					continue;
				}
				$zone_account = isset( $zone['account']['id'] ) ? (string) $zone['account']['id'] : '';
				if ( '' !== $zone_account && strtolower( $zone_account ) !== strtolower( $account_id ) ) {
					return new WP_Error(
						'hatch_cf_zone_other_account',
						__( 'That domain belongs to a different Cloudflare account than the one this token deploys to.', 'hatch-bridge' ),
						array( 'status' => 400 )
					);
				}
				return (string) $zone['id'];
			}
			array_shift( $labels );
		}
		return new WP_Error(
			'hatch_cf_zone_missing',
			__( 'That domain is not in this Cloudflare account, or the token cannot see it. Add the domain to Cloudflare first, and give the token "Zone Read".', 'hatch-bridge' ),
			array( 'status' => 404 )
		);
	}

	/**
	 * The account's workers.dev subdomain label.
	 *
	 * @param Hatch_Cloudflare_Api $api        Client.
	 * @param string               $account_id Account id.
	 * @return string|WP_Error
	 */
	private function get_workers_subdomain( Hatch_Cloudflare_Api $api, string $account_id ) {
		$response = $api->request( 'GET', '/accounts/' . rawurlencode( $account_id ) . '/workers/subdomain' );
		if ( is_wp_error( $response ) ) {
			$data = (array) $response->get_error_data();
			if ( isset( $data['status'] ) && 404 === (int) $data['status'] ) {
				return $this->missing_subdomain_error();
			}
			return $response;
		}
		$label = isset( $response['result']['subdomain'] ) ? (string) $response['result']['subdomain'] : '';
		if ( '' === $label || 1 !== preg_match( '/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i', $label ) ) {
			return $this->missing_subdomain_error();
		}
		return strtolower( $label );
	}

	/**
	 * Error for an account with no workers.dev subdomain.
	 *
	 * @return WP_Error
	 */
	private function missing_subdomain_error(): WP_Error {
		return new WP_Error(
			'hatch_cf_no_subdomain',
			__( 'Your Cloudflare account has no workers.dev address yet. Open Workers and Pages in the Cloudflare dashboard once to create it, then try again. Nothing was uploaded.', 'hatch-bridge' ),
			array( 'status' => 409 )
		);
	}

	/**
	 * Register the static files and upload the ones Cloudflare does not already have.
	 *
	 * @param Hatch_Cloudflare_Api                              $api      Client.
	 * @param Hatch_Frontend_Bundle                             $bundle   Bundle.
	 * @param string                                            $acct     URL encoded account id.
	 * @param string                                            $name     URL encoded script name.
	 * @param array<string,array{hash:string,size:int}>         $manifest Manifest.
	 * @return string|WP_Error Completion token.
	 */
	private function upload_assets( Hatch_Cloudflare_Api $api, Hatch_Frontend_Bundle $bundle, string $acct, string $name, array $manifest ) {
		$session = $api->request(
			'POST',
			'/accounts/' . $acct . '/workers/scripts/' . $name . '/assets-upload-session',
			array( 'body' => array( 'manifest' => $manifest ) )
		);
		if ( is_wp_error( $session ) ) {
			return $session;
		}
		$upload_jwt = isset( $session['result']['jwt'] ) ? (string) $session['result']['jwt'] : '';
		$buckets    = isset( $session['result']['buckets'] ) && is_array( $session['result']['buckets'] ) ? $session['result']['buckets'] : array();
		if ( '' === $upload_jwt ) {
			return new WP_Error( 'hatch_cf_bad_response', __( 'Cloudflare did not start the file upload. Nothing was marked as deployed.', 'hatch-bridge' ) );
		}
		if ( empty( $buckets ) ) {
			// Every file is already stored on Cloudflare; the session token is the completion token.
			return $upload_jwt;
		}

		$completion = '';
		foreach ( $buckets as $bucket ) {
			if ( ! is_array( $bucket ) || empty( $bucket ) ) {
				continue;
			}
			$parts = array();
			foreach ( $bucket as $hash ) {
				$payload = $bundle->get_asset_payload( (string) $hash );
				if ( is_wp_error( $payload ) ) {
					return $payload;
				}
				$parts[] = array(
					'name'     => (string) $hash,
					'filename' => (string) $hash,
					'type'     => $payload['type'],
					'content'  => $payload['content'],
				);
			}
			$response = $api->request_multipart(
				'POST',
				'/accounts/' . $acct . '/workers/assets/upload',
				$parts,
				array(
					'query'  => array( 'base64' => 'true' ),
					'bearer' => $upload_jwt,
				)
			);
			if ( is_wp_error( $response ) ) {
				return $response;
			}
			if ( ! empty( $response['result']['jwt'] ) ) {
				$completion = (string) $response['result']['jwt'];
			}
		}
		if ( '' === $completion ) {
			return new WP_Error( 'hatch_cf_bad_response', __( 'Cloudflare did not confirm the file upload. Nothing was marked as deployed.', 'hatch-bridge' ) );
		}
		return $completion;
	}

	/**
	 * Deploy the edge proxy Worker and connect it to the domain.
	 *
	 * @param Hatch_Cloudflare_Api $api        Client.
	 * @param string               $account_id Account id.
	 * @param string               $zone_id    Zone id.
	 * @param string               $script     Frontend Worker name.
	 * @param string               $origin     Frontend Worker origin.
	 * @param string               $domain     Public host name.
	 * @param string               $subpath    Path prefix, "" in root mode.
	 * @param string               $mount_mode "root" or "subfolder".
	 * @return array{script:string,route_ids:array<int,string>}|WP_Error
	 */
	private function publish_proxy( Hatch_Cloudflare_Api $api, string $account_id, string $zone_id, string $script, string $origin, string $domain, string $subpath, string $mount_mode ) {
		$proxy_name = substr( $script, 0, 63 - strlen( self::PROXY_SUFFIX ) ) . self::PROXY_SUFFIX;
		$proxy_name = rtrim( $proxy_name, '-' );
		$source     = Hatch_Cloudflare_Proxy_Worker::build( $origin, $domain, $subpath, $mount_mode );
		$metadata   = array(
			'main_module'        => 'proxy.mjs',
			'compatibility_date' => gmdate( 'Y-m-d', strtotime( '-7 days' ) ),
		);
		$put        = $api->request_multipart(
			'PUT',
			'/accounts/' . rawurlencode( $account_id ) . '/workers/scripts/' . rawurlencode( $proxy_name ),
			array(
				array(
					'name'    => 'metadata',
					'type'    => 'application/json',
					'content' => (string) wp_json_encode( $metadata ),
				),
				array(
					'name'     => 'proxy.mjs',
					'filename' => 'proxy.mjs',
					'type'     => 'application/javascript+module',
					'content'  => $source,
				),
			)
		);
		if ( is_wp_error( $put ) ) {
			return $this->step_error( $put, __( 'Publishing the domain proxy', 'hatch-bridge' ), 'proxy' );
		}

		$patterns = 'subfolder' === $mount_mode
			? array( $domain . $subpath, $domain . $subpath . '/*' )
			: array( $domain . '/*' );

		$existing = $api->request( 'GET', '/zones/' . rawurlencode( $zone_id ) . '/workers/routes' );
		if ( is_wp_error( $existing ) ) {
			return $this->step_error( $existing, __( 'Reading the domain routes', 'hatch-bridge' ), 'routes' );
		}
		$taken = array();
		foreach ( (array) ( $existing['result'] ?? array() ) as $route ) {
			if ( is_array( $route ) && isset( $route['pattern'] ) ) {
				$taken[ (string) $route['pattern'] ] = array(
					'id'     => isset( $route['id'] ) ? (string) $route['id'] : '',
					'script' => isset( $route['script'] ) ? (string) $route['script'] : '',
				);
			}
		}

		$route_ids = array();
		foreach ( $patterns as $pattern ) {
			if ( isset( $taken[ $pattern ] ) ) {
				if ( $taken[ $pattern ]['script'] === $proxy_name ) {
					$route_ids[] = $taken[ $pattern ]['id'];
					continue;
				}
				return new WP_Error(
					'hatch_cf_route_taken',
					sprintf(
						/* translators: 1: route pattern, 2: name of another Worker. */
						__( 'The route %1$s already points at another Worker (%2$s). Hatch will not overwrite it. Remove that route in Cloudflare, then try again.', 'hatch-bridge' ),
						$pattern,
						'' !== $taken[ $pattern ]['script'] ? $taken[ $pattern ]['script'] : __( 'none', 'hatch-bridge' )
					),
					array( 'status' => 409 )
				);
			}
			$created = $api->request(
				'POST',
				'/zones/' . rawurlencode( $zone_id ) . '/workers/routes',
				array(
					'body' => array(
						'pattern' => $pattern,
						'script'  => $proxy_name,
					),
				)
			);
			if ( is_wp_error( $created ) ) {
				return $this->step_error( $created, __( 'Connecting the domain route', 'hatch-bridge' ), 'route' );
			}
			$route_ids[] = isset( $created['result']['id'] ) ? (string) $created['result']['id'] : '';
		}

		return array(
			'script'    => $proxy_name,
			'route_ids' => array_values( array_filter( $route_ids ) ),
		);
	}

	/**
	 * Name of the frontend Worker: stable per site, valid as a DNS label.
	 *
	 * @return string
	 */
	private function script_name(): string {
		$state = get_option( 'hatch_cf_worker_state' );
		if ( is_array( $state ) && ! empty( $state['script_name'] ) && is_string( $state['script_name'] ) ) {
			$saved = strtolower( $state['script_name'] );
			if ( 1 === preg_match( '/^[a-z0-9]([a-z0-9-]{0,52}[a-z0-9])?$/', $saved ) ) {
				return $saved;
			}
		}
		$host = wp_parse_url( home_url(), PHP_URL_HOST );
		$slug = sanitize_title( is_string( $host ) ? $host : '' );
		$slug = trim( (string) preg_replace( '/[^a-z0-9-]+/', '-', strtolower( $slug ) ), '-' );
		$name = self::SCRIPT_PREFIX . ( '' !== $slug ? '-' . $slug : '' );
		$name = substr( $name, 0, 50 );
		return rtrim( $name, '-' );
	}

	/**
	 * Reduce user input to a bare lowercase host name, or "" when it is not one.
	 *
	 * @param string $raw User input.
	 * @return string
	 */
	public static function normalize_domain( string $raw ): string {
		$host = strtolower( trim( $raw ) );
		$host = (string) preg_replace( '#^https?://#', '', $host );
		$host = rtrim( $host, '/' );
		if ( '' === $host ) {
			return '';
		}
		if ( strlen( $host ) > 253 || 1 !== preg_match( '/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/', $host ) ) {
			return '';
		}
		return $host;
	}

	/**
	 * Prefix an error message with the step that failed, keeping its code and data.
	 *
	 * @param WP_Error $error Original error.
	 * @param string   $step  Human readable step.
	 * @param string   $stage Machine stage id.
	 * @return WP_Error
	 */
	private function step_error( WP_Error $error, string $step, string $stage ): WP_Error {
		$data          = (array) $error->get_error_data();
		$data['stage'] = $stage;
		if ( ! isset( $data['status'] ) ) {
			$data['status'] = 400;
		}
		return new WP_Error(
			$error->get_error_code(),
			sprintf(
				/* translators: 1: step that failed, 2: error detail. */
				__( '%1$s failed. %2$s', 'hatch-bridge' ),
				$step,
				$error->get_error_message()
			),
			$data
		);
	}
}

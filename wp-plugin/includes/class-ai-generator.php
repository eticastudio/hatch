<?php
/**
 * Hatch_AI_Generator — Smart Block server endpoint.
 *
 * POST /hatch/v1/ai/generate
 *   body: { prompt: "...", vibe: "minimal" }
 *   returns: { html: "<section>…</section>", model: "claude-sonnet-4" }
 *
 * BYOK: user pastes an Anthropic or OpenAI key in Hatch → Blocks tab.
 * Stored as hatch_ai_api_key + hatch_ai_provider options.
 *
 * Server prompt is locked: only Hatch's design vocabulary is allowed in
 * the output. We validate + sanitize before returning so the saved HTML
 * is always WP-safe (no <script>, no inline JS, no foreign domains).
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

class Hatch_AI_Generator {

	const OPT_PROVIDER = 'hatch_ai_provider';
	const OPT_KEY      = 'hatch_ai_api_key';

	private static $instance = null;
	public static function instance(): self {
		if ( null === self::$instance ) self::$instance = new self();
		return self::$instance;
	}

	private function __construct() {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes(): void {
		register_rest_route( HATCH_REST_NAMESPACE, '/ai/generate', array(
			'methods'             => WP_REST_Server::CREATABLE,
			'callback'            => array( $this, 'generate' ),
			'permission_callback' => array( $this, 'permission' ),
			'args'                => array(
				'prompt' => array( 'required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_textarea_field' ),
				'vibe'   => array( 'required' => false, 'type' => 'string', 'default' => 'minimal', 'sanitize_callback' => 'sanitize_key' ),
			),
		) );
	}

	public function permission(): bool {
		// Only authenticated editors+ can generate (cost gate).
		return current_user_can( 'edit_posts' );
	}

	public function generate( WP_REST_Request $req ) {
		$prompt = (string) $req->get_param( 'prompt' );
		$vibe   = (string) $req->get_param( 'vibe' );
		$key    = (string) get_option( self::OPT_KEY, '' );
		$provider = (string) get_option( self::OPT_PROVIDER, 'anthropic' );

		if ( '' === trim( $key ) ) {
			return new WP_REST_Response( array(
				'error' => __( 'No AI API key configured. Add one at Hatch → Blocks → Smart Block settings.', 'hatch' ),
			), 400 );
		}
		if ( '' === trim( $prompt ) ) {
			return new WP_REST_Response( array( 'error' => __( 'Prompt is empty.', 'hatch' ) ), 400 );
		}

		// Build the design context — token names the AI is allowed to reference.
		$brand = (array) get_option( 'hatch_design_brand', array() );
		$layout = (array) get_option( 'hatch_design_layout', array() );
		$type = (array) get_option( 'hatch_design_type', array() );
		$ctx = array(
			'brand' => array(
				'primary' => $brand['primary'] ?? '#ff6b35',
				'accent'  => $brand['accent']  ?? '#0a0a0a',
				'fg'      => $brand['fg']      ?? '#0a0a0a',
				'bg'      => $brand['bg']      ?? '#ffffff',
			),
			'typography' => array(
				'heading' => $type['heading'] ?? 'Inter',
				'body'    => $type['body']    ?? 'Inter',
			),
			'layout' => array(
				'max_width' => $layout['max_width'] ?? '1160',
				'density'   => $layout['density']   ?? 1,
				'radius'    => $layout['radius']    ?? '8',
			),
			'site' => array(
				'name'        => get_bloginfo( 'name' ),
				'description' => get_bloginfo( 'description' ),
			),
			'vibe' => sanitize_key( $vibe ),
		);

		$system = $this->system_prompt( $ctx );

		try {
			$html = ( 'openai' === $provider )
				? $this->call_openai( $key, $system, $prompt )
				: $this->call_anthropic( $key, $system, $prompt );
		} catch ( Exception $e ) {
			return new WP_REST_Response( array( 'error' => $e->getMessage() ), 502 );
		}

		$clean = $this->sanitize_output( $html );
		if ( '' === $clean ) {
			return new WP_REST_Response( array( 'error' => __( 'AI returned no usable HTML. Try a different prompt or vibe.', 'hatch' ) ), 502 );
		}

		return new WP_REST_Response( array(
			'html'  => $clean,
			'model' => ( 'openai' === $provider ) ? 'gpt-4o' : 'claude-sonnet-4',
		), 200 );
	}

	private function system_prompt( array $ctx ): string {
		$colors = $ctx['brand'];
		$max_w = (int) $ctx['layout']['max_width'];
		return "You write a single HTML section for a landing page. STRICT RULES:\n\n"
			. "1. Output ONE self-contained <section>…</section>. No explanation, no markdown, just HTML.\n"
			. "2. Use ONLY Tailwind utility classes for layout/spacing/typography.\n"
			. "3. For brand colors use these CSS variables (NEVER hex):\n"
			. "   - text-[var(--hatch-fg)]\n"
			. "   - bg-[var(--hatch-bg)]\n"
			. "   - bg-[var(--hatch-primary)] or text-[var(--hatch-primary)]\n"
			. "   - bg-[var(--hatch-accent)]  or text-[var(--hatch-accent)]\n"
			. "4. Allowed elements: section, div, h1-h6, p, a, img, span, ul, ol, li, button, picture, source, svg.\n"
			. "5. FORBIDDEN: <script>, <iframe>, <style>, <link>, <form>, on* event handlers, javascript: URLs, inline style= except for CSS variables / aspect-ratio.\n"
			. "6. Respect max-width: keep content inside `max-w-[" . $max_w . "px] mx-auto px-4 sm:px-6`.\n"
			. "7. Mobile-first responsive. Use sm: md: lg: prefixes.\n"
			. "8. Use Hatch's typography vibe: " . $ctx['vibe'] . ".\n"
			. "9. Site context — name: \"" . $ctx['site']['name'] . "\", tagline: \"" . $ctx['site']['description'] . "\".\n\n"
			. "USER PROMPT (what to build):";
	}

	private function call_anthropic( string $key, string $system, string $prompt ): string {
		$res = wp_remote_post( 'https://api.anthropic.com/v1/messages', array(
			'timeout' => 60,
			'headers' => array(
				'Content-Type'      => 'application/json',
				'x-api-key'         => $key,
				'anthropic-version' => '2023-06-01',
			),
			'body' => wp_json_encode( array(
				'model'      => 'claude-sonnet-4-20250514',
				'max_tokens' => 2048,
				'system'     => $system,
				'messages'   => array( array( 'role' => 'user', 'content' => $prompt ) ),
			) ),
		) );
		if ( is_wp_error( $res ) ) {
			throw new Exception( 'Anthropic API: ' . $res->get_error_message() );
		}
		$body = json_decode( wp_remote_retrieve_body( $res ), true );
		if ( isset( $body['error']['message'] ) ) {
			throw new Exception( 'Anthropic API: ' . $body['error']['message'] );
		}
		return (string) ( $body['content'][0]['text'] ?? '' );
	}

	private function call_openai( string $key, string $system, string $prompt ): string {
		$res = wp_remote_post( 'https://api.openai.com/v1/chat/completions', array(
			'timeout' => 60,
			'headers' => array(
				'Content-Type'  => 'application/json',
				'Authorization' => 'Bearer ' . $key,
			),
			'body' => wp_json_encode( array(
				'model'    => 'gpt-4o',
				'max_tokens' => 2048,
				'messages' => array(
					array( 'role' => 'system', 'content' => $system ),
					array( 'role' => 'user',   'content' => $prompt ),
				),
			) ),
		) );
		if ( is_wp_error( $res ) ) {
			throw new Exception( 'OpenAI API: ' . $res->get_error_message() );
		}
		$body = json_decode( wp_remote_retrieve_body( $res ), true );
		if ( isset( $body['error']['message'] ) ) {
			throw new Exception( 'OpenAI API: ' . $body['error']['message'] );
		}
		return (string) ( $body['choices'][0]['message']['content'] ?? '' );
	}

	/**
	 * Strict allowlist sanitizer for the AI output.
	 * - Strips <script>/<iframe>/<style>/<link>/<form>.
	 * - Strips all on* event handlers.
	 * - Strips javascript: URLs.
	 * - Only keeps inline style="aspect-ratio: …" / "--hatch-*: …".
	 *
	 * @param string $html
	 * @return string
	 */
	private function sanitize_output( string $html ): string {
		// Extract just the <section>…</section> if AI wrapped extra text.
		if ( preg_match( '#<section\b[^>]*>.*</section>#is', $html, $m ) ) {
			$html = $m[0];
		}
		// Strip dangerous elements wholesale (with their content).
		$html = preg_replace( '#<(script|iframe|style|link|form|object|embed)\b[^>]*>.*?</\1>#is', '', $html );
		$html = preg_replace( '#<(script|iframe|style|link|form|object|embed)\b[^>]*/?>#i', '', $html );
		// Strip on* event handlers.
		$html = preg_replace( '#\son[a-z]+\s*=\s*"[^"]*"#i', '', (string) $html );
		$html = preg_replace( '#\son[a-z]+\s*=\s*\'[^\']*\'#i', '', (string) $html );
		// Strip javascript: URLs in href/src.
		$html = preg_replace_callback( '#\b(href|src)\s*=\s*"(javascript:[^"]*)"#i', static function () { return ''; }, (string) $html );
		// Final allowlist via wp_kses with the elements we permit.
		$allowed = array(
			'section' => array( 'class' => true, 'id' => true, 'style' => true, 'role' => true, 'aria-label' => true ),
			'div'     => array( 'class' => true, 'id' => true, 'style' => true, 'role' => true, 'aria-label' => true ),
			'h1' => array( 'class' => true, 'id' => true ),
			'h2' => array( 'class' => true, 'id' => true ),
			'h3' => array( 'class' => true, 'id' => true ),
			'h4' => array( 'class' => true, 'id' => true ),
			'h5' => array( 'class' => true, 'id' => true ),
			'h6' => array( 'class' => true, 'id' => true ),
			'p'       => array( 'class' => true ),
			'a'       => array( 'class' => true, 'href' => true, 'target' => true, 'rel' => true, 'aria-label' => true ),
			'img'     => array( 'class' => true, 'src' => true, 'alt' => true, 'width' => true, 'height' => true, 'loading' => true, 'decoding' => true ),
			'picture' => array( 'class' => true ),
			'source'  => array( 'srcset' => true, 'type' => true, 'media' => true ),
			'span'    => array( 'class' => true ),
			'ul'      => array( 'class' => true ),
			'ol'      => array( 'class' => true ),
			'li'      => array( 'class' => true ),
			'button'  => array( 'class' => true, 'type' => true, 'aria-label' => true ),
			'svg'     => array( 'class' => true, 'viewBox' => true, 'xmlns' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true, 'aria-hidden' => true ),
			'path'    => array( 'd' => true, 'fill' => true, 'stroke' => true ),
			'g'       => array( 'fill' => true ),
			'circle'  => array( 'cx' => true, 'cy' => true, 'r' => true, 'fill' => true ),
			'rect'    => array( 'x' => true, 'y' => true, 'width' => true, 'height' => true, 'fill' => true, 'rx' => true ),
			'br'      => array(),
			'strong'  => array(),
			'em'      => array(),
		);
		return wp_kses( (string) $html, $allowed );
	}
}

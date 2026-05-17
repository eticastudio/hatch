<?php
/**
 * Hatch First-Run Setup Wizard — v0.6.
 *
 * 4 steps, reordered per your feedback:
 *   1. Welcome     — diagnostic only (NO URL ask yet)
 *   2. Theme       — pick Blog / Tech / Docs
 *   3. Connect     — paste your Headless Website URL, generate App Password
 *   4. Done        — copy .env block + show hosting options
 *
 * Auto-redirects to step 1 on first activation. After completion, never
 * auto-redirects again — accessible only via direct admin URL or the
 * "Run setup wizard again" link in the dashboard footer.
 *
 * @package Hatch
 */

defined( 'ABSPATH' ) || exit;

add_action( 'admin_init', 'hatch_setup_wizard_route' );
add_action( 'admin_init', 'hatch_setup_wizard_maybe_redirect_first_run', 1 );
add_action( 'admin_menu', 'hatch_setup_wizard_menu' );

/**
 * Auto-redirect on first activation.
 *
 * Set by Hatch::on_activate() — transient lives ~30 seconds.
 *
 * @return void
 */
function hatch_setup_wizard_maybe_redirect_first_run(): void {
	if ( ! get_transient( 'hatch_just_activated' ) ) {
		return;
	}
	if ( wp_doing_ajax() || ( defined( 'DOING_CRON' ) && DOING_CRON ) ) {
		return;
	}
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if ( isset( $_GET['page'] ) && 'hatch-setup' === $_GET['page'] ) {
		return; // already there
	}
	// Don't bounce if wizard already completed.
	if ( get_option( 'hatch_setup_wizard_completed' ) ) {
		delete_transient( 'hatch_just_activated' );
		return;
	}
	delete_transient( 'hatch_just_activated' );
	wp_safe_redirect( admin_url( 'admin.php?page=hatch-setup' ) );
	exit;
}

function hatch_setup_wizard_menu(): void {
	add_submenu_page(
		null,
		__( 'Hatch Setup', 'hatch' ),
		'Hatch Setup',
		'manage_options',
		'hatch-setup',
		'hatch_setup_wizard_render'
	);
}

function hatch_setup_wizard_route(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	// Skip link.
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if ( isset( $_GET['hatch_skip_setup'] ) ) {
		check_admin_referer( 'hatch_skip_setup' );
		update_option( 'hatch_setup_wizard_completed', time() );
		wp_safe_redirect( admin_url( 'tools.php?page=hatch' ) );
		exit;
	}

	// Step 2 — Theme. After saving, also generate the App Password upfront so
	// the deploy step has it ready (no separate URL/host-picker step needed —
	// the broker auto-fills the URL after Direct Upload completes, and the host
	// is implicitly picked by which deploy button the user clicks).
	if ( isset( $_POST['hatch_setup_step'] ) && '2' === (string) $_POST['hatch_setup_step'] ) {
		check_admin_referer( 'hatch_setup_step2' );
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$theme = isset( $_POST['hatch_theme'] ) ? sanitize_key( wp_unslash( (string) $_POST['hatch_theme'] ) ) : 'blog';
		Hatch_Features::set_theme( $theme );

		// Pre-generate App Password so the next step has credentials ready.
		if ( class_exists( 'Hatch_App_Password_Helper' ) ) {
			Hatch_App_Password_Helper::generate_and_stash( 'Hatch (Setup Wizard)' );
		}

		wp_safe_redirect( admin_url( 'admin.php?page=hatch-setup&step=3' ) );
		exit;
	}

	// Step 3 (Deploy) complete marker.
	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	if ( isset( $_GET['hatch_complete_setup'] ) ) {
		check_admin_referer( 'hatch_complete_setup' );
		update_option( 'hatch_setup_wizard_completed', time() );
		wp_safe_redirect( admin_url( 'tools.php?page=hatch&tab=connector' ) );
		exit;
	}
}

/**
 * Wizard renderer.
 *
 * @return void
 */
function hatch_setup_wizard_render(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'Permission denied.', 'hatch' ), '', array( 'response' => 403 ) );
	}

	// Make sure CSS is loaded (the admin_enqueue_scripts hook only fires for
	// the regular admin page — this is a hidden submenu).
	wp_enqueue_style( 'hatch-admin-font', 'https://rsms.me/inter/inter.css', array(), HATCH_VERSION );
	wp_enqueue_style( 'hatch-admin', HATCH_PLUGIN_URL . 'admin/assets/hatch-admin.css', array( 'hatch-admin-font' ), HATCH_VERSION );
	require_once HATCH_PLUGIN_DIR . 'admin/assets/icons.php';

	// phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$raw_step = isset( $_GET['step'] ) ? absint( $_GET['step'] ) : 1;
	// Back-compat: any link to old step=4 lands on step 3 (we collapsed
	// "Connect (URL + host picker)" since v0.16.0 Direct Upload auto-fills both.
	if ( $raw_step >= 4 ) {
		$raw_step = 3;
	}
	$step = max( 1, min( 3, $raw_step ) );
	?>
	<div class="wrap hatch-admin" style="max-width:720px;">

		<div class="hx-header">
			<div class="hx-header-logo" aria-hidden="true">🐣</div>
			<div class="hx-header-text">
				<h1><?php esc_html_e( 'Hatch Setup', 'hatch' ); ?></h1>
				<div class="hx-header-text-sub"><?php esc_html_e( 'Connect WordPress to your headless frontend in 3 steps.', 'hatch' ); ?></div>
			</div>
		</div>

		<?php hatch_setup_wizard_steps_bar( $step ); ?>

		<div class="hx-card" style="margin-top:20px;">
			<?php
			switch ( $step ) {
				case 2: hatch_setup_wizard_step_2_theme(); break;
				case 3: hatch_setup_wizard_step_3_deploy(); break;
				case 1:
				default: hatch_setup_wizard_step_1_welcome(); break;
			}
			?>
		</div>

		<p style="text-align:center; margin-top:20px; color:var(--hx-subtle); font-size:12px;">
			<?php esc_html_e( 'Prefer the terminal?', 'hatch' ); ?>
			<code>wp hatch setup --frontend=https://your-site.com</code>
		</p>
	</div>
	<?php
}

function hatch_setup_wizard_steps_bar( int $current ): void {
	$labels = array(
		1 => __( 'Welcome', 'hatch' ),
		2 => __( 'Theme',   'hatch' ),
		3 => __( 'Deploy',  'hatch' ),
	);
	$total = count( $labels );
	echo '<div style="display:flex; justify-content:center; gap:0; margin-top:8px;">';
	foreach ( $labels as $n => $label ) {
		$state = $n < $current ? 'done' : ( $n === $current ? 'active' : 'todo' );
		$color = 'done' === $state ? '#10b981' : ( 'active' === $state ? '#2563eb' : '#cbd5e1' );
		$bg    = 'done' === $state ? '#d1fae5' : ( 'active' === $state ? '#dbeafe' : '#f1f5f9' );
		echo '<div style="display:flex; align-items:center;">';
		echo '<div style="width:32px; height:32px; border-radius:50%; background:' . esc_attr( $bg ) . '; color:' . esc_attr( $color ) . '; display:grid; place-items:center; font-weight:700; font-size:13px;">';
		echo 'done' === $state ? '✓' : esc_html( (string) $n );
		echo '</div>';
		echo '<span style="margin-left:8px; margin-right:14px; font-size:13px; font-weight:600; color:' . esc_attr( 'todo' === $state ? '#94a3b8' : '#0f172a' ) . ';">' . esc_html( $label ) . '</span>';
		if ( $n < $total ) {
			echo '<div style="width:30px; height:2px; background:' . esc_attr( $n < $current ? '#10b981' : '#e2e8f0' ) . '; margin-right:14px;"></div>';
		}
		echo '</div>';
	}
	echo '</div>';
}

/* ============ STEP 1 — WELCOME + DIAGNOSTIC ============ */
function hatch_setup_wizard_step_1_welcome(): void {
	?>
	<h2 style="margin:0 0 8px;"><?php esc_html_e( 'Welcome.', 'hatch' ); ?></h2>
	<p style="color:var(--hx-muted); font-size:14.5px; line-height:1.6;">
		<?php esc_html_e( 'Hatch turns this WordPress install into a headless CMS — Astro-first. Your content lives here. Your Astro frontend ships to Cloudflare Workers, Vercel, or your own VPS in one click.', 'hatch' ); ?>
	</p>
	<p style="color:var(--hx-muted); font-size:14.5px; line-height:1.6;">
		<?php esc_html_e( 'Before we connect anything — let\'s check this site is ready.', 'hatch' ); ?>
	</p>

	<div style="margin-top:18px;">
		<?php hatch_render_diagnostic_grid(); ?>
	</div>

	<div style="display:flex; justify-content:space-between; align-items:center; margin-top:24px; padding-top:20px; border-top:1px solid var(--hx-border);">
		<a href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin.php?page=hatch-setup&hatch_skip_setup=1' ), 'hatch_skip_setup' ) ); ?>" style="font-size:13px; color:var(--hx-muted);">
			<?php esc_html_e( 'Skip wizard — I\'ll configure manually', 'hatch' ); ?>
		</a>
		<a href="<?php echo esc_url( admin_url( 'admin.php?page=hatch-setup&step=2' ) ); ?>" class="hx-btn is-primary is-lg">
			<?php esc_html_e( 'Continue', 'hatch' ); ?>
			<?php echo hatch_icon( 'arrow-right' ); // phpcs:ignore ?>
		</a>
	</div>
	<?php
}

/* ============ STEP 2 — THEME PICKER ============ */
function hatch_setup_wizard_step_2_theme(): void {
	$themes  = Hatch_Features::themes();
	$current = Hatch_Features::get_theme();
	?>
	<h2 style="margin:0 0 8px;"><?php esc_html_e( 'Pick your theme.', 'hatch' ); ?></h2>
	<p style="color:var(--hx-muted); font-size:14.5px; line-height:1.6;">
		<?php esc_html_e( 'The starter design your Astro frontend ships with. You can change this later in Features.', 'hatch' ); ?>
	</p>

	<form method="post" action="<?php echo esc_url( admin_url( 'admin.php?page=hatch-setup' ) ); ?>">
		<?php wp_nonce_field( 'hatch_setup_step2' ); ?>
		<input type="hidden" name="hatch_setup_step" value="2"/>

		<div class="hx-grid hx-mt-3 hx-theme-cards" style="grid-template-columns:repeat(3, 1fr);">
			<?php foreach ( $themes as $slug => $t ): ?>
				<label class="hx-theme-card hx-card<?php echo $current === $slug ? ' is-selected' : ''; ?>" style="cursor:pointer; padding:18px; text-align:center;">
					<input type="radio" name="hatch_theme" value="<?php echo esc_attr( $slug ); ?>" <?php checked( $current, $slug ); ?>/>
					<div style="font-size:28px; line-height:1; margin-bottom:8px;"><?php echo esc_html( $t['icon'] ); ?></div>
					<div class="hx-card-title" style="font-size:14px;"><?php echo esc_html( $t['label'] ); ?></div>
					<div class="hx-text-xs hx-text-muted" style="margin-top:4px;"><?php echo esc_html( $t['description'] ); ?></div>
				</label>
			<?php endforeach; ?>
		</div>

		<script>
		(function(){
			var cards = document.querySelectorAll('.hx-theme-cards .hx-theme-card');
			cards.forEach(function(card){
				card.addEventListener('click', function(){
					cards.forEach(function(c){ c.classList.remove('is-selected'); });
					card.classList.add('is-selected');
				});
			});
		})();
		</script>

		<div style="display:flex; justify-content:space-between; align-items:center; margin-top:24px; padding-top:20px; border-top:1px solid var(--hx-border);">
			<a href="<?php echo esc_url( admin_url( 'admin.php?page=hatch-setup&step=1' ) ); ?>" class="hx-btn is-ghost">
				<?php echo hatch_icon( 'arrow-right', array( 'style' => 'transform:rotate(180deg)' ) ); // phpcs:ignore ?>
				<?php esc_html_e( 'Back', 'hatch' ); ?>
			</a>
			<button type="submit" class="hx-btn is-primary is-lg">
				<?php esc_html_e( 'Continue', 'hatch' ); ?>
				<?php echo hatch_icon( 'arrow-right' ); // phpcs:ignore ?>
			</button>
		</div>
	</form>
	<?php
}

/* ============ STEP 3 — DEPLOY (Direct Upload / OAuth / one-liner) ============ */
function hatch_setup_wizard_step_3_deploy(): void {
	$user     = wp_get_current_user();
	$secret   = (string) get_option( 'hatch_webhook_secret', '' );
	$endpoint = (string) get_option( 'hatch_revalidate_endpoint', '' );
	$theme    = Hatch_Features::get_theme();
	$host     = class_exists( 'Hatch_Connection_Status' ) ? Hatch_Connection_Status::get_hosting_model() : '';
	if ( '' === $host ) {
		$host = 'cloudflare-pages';
	}

	// Lazy-generate webhook secret if it doesn't exist yet.
	if ( '' === $secret ) {
		$secret = wp_generate_password( 48, false );
		update_option( 'hatch_webhook_secret', $secret, false );
	}

	// Pop the freshly-generated App Password (created by step 3 handler).
	// IMPORTANT: For Vercel/CF the broker handler will generate its OWN fresh
	// password during /handle_start_deploy — so users pressing the 1-click
	// button never need this displayed value. We show it here ONLY for the VPS
	// path (where the user copies the .env manually).
	$fresh = class_exists( 'Hatch_App_Password_Helper' ) ? Hatch_App_Password_Helper::pop_fresh_password() : null;
	$pw    = ( $fresh && ! empty( $fresh['password'] ) ) ? (string) $fresh['password'] : '';

	// .env block — uses the same variable names the Astro starter actually
	// reads (WP_API_URL / WP_API_USER / WP_API_PASS), so a copy-paste works
	// without any rename step.
	$env_block  = 'WP_API_URL=' . untrailingslashit( home_url() ) . "\n";
	$env_block .= 'WP_API_USER=' . $user->user_login . "\n";
	$env_block .= 'WP_API_PASS=' . ( '' !== $pw ? $pw : '<get-from-WP-admin-Tools-Hatch-Connector-tab>' ) . "\n";
	$env_block .= 'HATCH_WEBHOOK_SECRET=' . $secret . "\n";

	$repo_url   = 'https://github.com/adityaarsharma/hatch';

	// Pre-build the admin-post.php URLs for each 1-click button.
	$start_action_url = wp_nonce_url(
		add_query_arg( 'action', 'hatch_start_deploy', admin_url( 'admin-post.php' ) ),
		'hatch_start_deploy'
	);
	?>
	<h2 style="margin:0 0 8px;"><?php esc_html_e( "Deploy your frontend. 🐣", 'hatch' ); ?></h2>
	<p style="color:var(--hx-muted); font-size:14.5px; line-height:1.6;">
		<?php
		/* translators: %s: theme name */
		printf(
			esc_html__( 'WordPress is connected. Pick where the public frontend lives — starting with the %s theme.', 'hatch' ),
			'<strong>' . esc_html( ucfirst( $theme ) ) . '</strong>'
		);
		?>
	</p>

	<?php // ---------- THE THREE DEPLOY OPTIONS — collapsible, one at a time ---------- ?>
	<?php
	// Per-env-var values used by both CF and Vercel cards. CF asks the user
	// to paste them into individual form fields, so we render row-per-var
	// copy buttons. Vercel does the same — separate fields, separate copies.
	$wp_url_full = untrailingslashit( home_url() ) . '/wp-json/wp/v2';
	$wp_user_v   = $user->user_login;
	$wp_pass_v   = '' !== $pw ? $pw : '<get-from-Connector-tab>';
	$env_pairs   = array(
		array( 'WP_API_URL',           $wp_url_full,                     'WordPress REST API root (auto-detected from this site)' ),
		array( 'WP_API_USER',          $wp_user_v,                       'The WP user the App Password belongs to' ),
		array( 'WP_API_PASS',          $wp_pass_v,                       'Application Password — mark as secret in CF/Vercel' ),
		array( 'HATCH_WEBHOOK_SECRET', $secret,                          'Webhook signing secret — mark as secret in CF/Vercel' ),
	);

	// Helper closure to render a copy-row.
	$render_env_row = static function ( $key, $value, $hint, $prefix ) {
		$id = $prefix . '-' . strtolower( str_replace( '_', '-', $key ) );
		?>
		<div style="display:flex; gap:8px; align-items:center; padding:8px 10px; background:var(--hx-surface); border:1px solid var(--hx-border); border-radius:8px; margin-top:6px;">
			<code style="font-size:11.5px; font-weight:600; min-width:185px; padding:0;"><?php echo esc_html( $key ); ?></code>
			<input type="text" readonly id="<?php echo esc_attr( $id ); ?>" value="<?php echo esc_attr( $value ); ?>" style="flex:1; font-family:ui-monospace,SFMono-Regular,monospace; font-size:12px; padding:5px 8px; border:1px solid var(--hx-border); border-radius:5px; background:#fff; min-width:0;"/>
			<button type="button" class="hx-btn is-ghost is-sm hx-copy-btn" data-target="<?php echo esc_attr( $id ); ?>" style="flex-shrink:0; padding:5px 10px; font-size:11.5px;">
				<?php esc_html_e( 'Copy', 'hatch' ); ?>
			</button>
		</div>
		<?php
	};

	$cf_token_create_url = 'https://dash.cloudflare.com/profile/api-tokens?' . http_build_query( array(
		'permissionGroupKeys' => wp_json_encode( array(
			array( 'key' => 'e086da7e2179491d91ee5f35b3ca210a' ), // Workers Scripts: Edit
			array( 'key' => 'c8fed203ed3043cba015a93ad1616f1f' ), // (optional) Pages: Edit for fallback
		) ),
		'name' => 'Hatch — 1-click deploy',
	) );
	$vercel_token_create_url = 'https://vercel.com/account/tokens';
	?>
	<div class="hx-deploy-cards" style="margin-top:18px; display:flex; flex-direction:column; gap:10px;">

		<?php // ===== Cloudflare Workers (Recommended) — broker pipeline ===== ?>
		<details class="hx-card" style="padding:0; margin:0; overflow:hidden;">
			<summary style="cursor:pointer; list-style:none; padding:16px 18px; display:flex; align-items:center; justify-content:space-between; gap:16px;">
				<div style="flex:1;">
					<div style="display:flex; align-items:center; gap:8px;">
						<strong style="font-size:15px;">⚡ <?php esc_html_e( 'Cloudflare Workers', 'hatch' ); ?></strong>
						<span class="hx-pill is-success"><?php esc_html_e( 'Recommended · 1 click', 'hatch' ); ?></span>
					</div>
					<div class="hx-text-xs hx-text-muted" style="margin-top:4px;">
						<?php esc_html_e( 'Free, global edge, unlimited bandwidth. Paste a CF API token — broker builds + deploys (~90s). No GitHub fork on your account.', 'hatch' ); ?>
					</div>
				</div>
				<span class="hx-text-xs hx-text-muted hx-summary-toggle"><?php esc_html_e( 'Show steps ▾', 'hatch' ); ?></span>
			</summary>
			<form method="post" action="<?php echo esc_url( $start_action_url ); ?>" target="_blank" rel="noopener noreferrer" style="padding:14px 18px 18px; border-top:1px solid var(--hx-border);">
				<input type="hidden" name="provider" value="cloudflare"/>
				<h4 style="margin:0 0 6px; font-size:13px;"><?php esc_html_e( 'Step 1 — Create a Cloudflare API token (~30 sec)', 'hatch' ); ?></h4>
				<a href="<?php echo esc_url( $cf_token_create_url ); ?>" target="_blank" rel="noopener noreferrer" class="hx-btn is-ghost is-sm">
					<?php esc_html_e( 'Open CF token creator ↗', 'hatch' ); ?>
				</a>
				<div class="hx-text-xs hx-text-muted" style="margin-top:6px; line-height:1.5;">
					<?php esc_html_e( 'Permissions pre-selected: Workers Scripts: Edit. Expiry: 1 day is fine (you only need it for the next ~90 sec). Click Continue → Create Token → copy.', 'hatch' ); ?>
				</div>

				<h4 style="margin:14px 0 6px; font-size:13px;"><?php esc_html_e( 'Step 2 — Paste it here', 'hatch' ); ?></h4>
				<input class="hx-input" type="password" name="cf_token"
				       placeholder="paste CF API token (starts with cfat_ or random chars)"
				       autocomplete="off" spellcheck="false" required
				       style="font-family:ui-monospace,SFMono-Regular,monospace; font-size:13px; width:100%;"/>
				<div class="hx-text-xs hx-text-muted" style="margin-top:6px;">
					<?php esc_html_e( 'Token is sent over HTTPS to the build broker, used in memory only, dropped on completion. Used ONCE for this deploy — content updates after this flow automatically via SSR, no token re-use needed.', 'hatch' ); ?>
				</div>

				<label style="display:flex; align-items:flex-start; gap:8px; margin-top:10px; cursor:pointer; font-size:13px;">
					<input type="checkbox" name="save_token" value="1" checked style="margin-top:2px; flex-shrink:0;"/>
					<span>
						<strong><?php esc_html_e( 'Save token for one-click re-deploys', 'hatch' ); ?></strong>
						<span class="hx-text-xs hx-text-muted" style="display:block; margin-top:2px;">
							<?php esc_html_e( 'Encrypted with AES-256-GCM using your WordPress secret keys. Stored only in your database — never on the broker. Lets the Connector tab rebuild your site without pasting the token again.', 'hatch' ); ?>
						</span>
					</span>
				</label>

				<div style="margin-top:14px;">
					<button type="submit" class="hx-btn is-primary">
						<?php echo hatch_icon( 'bolt' ); // phpcs:ignore ?>
						<?php esc_html_e( 'Build & deploy to Cloudflare ↗', 'hatch' ); ?>
					</button>
				</div>
				<p class="hx-text-xs hx-text-muted" style="margin:10px 0 0;">
					<?php esc_html_e( 'Opens a build-log tab; you\'ll get a live *.workers.dev URL in ~90s, then auto-redirect back here. You do NOT need to paste env vars anywhere — broker handles them automatically.', 'hatch' ); ?>
				</p>

				<details style="margin-top:14px;">
					<summary style="cursor:pointer; font-size:12px; color:var(--hx-muted);"><?php esc_html_e( 'For transparency: see exactly what gets sent to the broker', 'hatch' ); ?></summary>
					<div style="margin-top:8px; padding:10px; background:var(--hx-surface); border:1px solid var(--hx-border); border-radius:6px;">
						<div class="hx-text-xs hx-text-muted" style="margin-bottom:8px;">
							<?php esc_html_e( 'These 4 values + your CF token are POSTed to hatch.adityaarsharma.com over HTTPS. The broker uses them in memory during the build, then drops them. Nothing persisted on the broker server.', 'hatch' ); ?>
						</div>
						<?php foreach ( $env_pairs as $pair ) {
							$render_env_row( $pair[0], $pair[1], $pair[2], 'hatch-cf' );
						} ?>
					</div>
				</details>
			</form>
		</details>

		<?php // ===== Vercel — broker pipeline (no GitHub fork) ===== ?>
		<details class="hx-card" style="padding:0; margin:0; overflow:hidden;">
			<summary style="cursor:pointer; list-style:none; padding:16px 18px; display:flex; align-items:center; justify-content:space-between; gap:16px;">
				<div style="flex:1;">
					<div style="display:flex; align-items:center; gap:8px;">
						<strong style="font-size:15px;">▲ <?php esc_html_e( 'Vercel', 'hatch' ); ?></strong>
						<span class="hx-pill is-soft"><?php esc_html_e( '1 click · No fork', 'hatch' ); ?></span>
					</div>
					<div class="hx-text-xs hx-text-muted" style="margin-top:4px;">
						<?php esc_html_e( 'Paste a Vercel access token — broker builds + deploys (~90s). No GitHub fork, no Vercel UI dance.', 'hatch' ); ?>
					</div>
				</div>
				<span class="hx-text-xs hx-text-muted hx-summary-toggle"><?php esc_html_e( 'Show steps ▾', 'hatch' ); ?></span>
			</summary>
			<form method="post" action="<?php echo esc_url( $start_action_url ); ?>" target="_blank" rel="noopener noreferrer" style="padding:14px 18px 18px; border-top:1px solid var(--hx-border);">
				<input type="hidden" name="provider" value="vercel"/>
				<h4 style="margin:0 0 6px; font-size:13px;"><?php esc_html_e( 'Step 1 — Create a Vercel access token (~30 sec)', 'hatch' ); ?></h4>
				<a href="<?php echo esc_url( $vercel_token_create_url ); ?>" target="_blank" rel="noopener noreferrer" class="hx-btn is-ghost is-sm">
					<?php esc_html_e( 'Open Vercel tokens page ↗', 'hatch' ); ?>
				</a>
				<div class="hx-text-xs hx-text-muted" style="margin-top:6px; line-height:1.5;">
					<?php esc_html_e( 'Click Create Token → Scope: Full Account → Expiration: 1 day (you only need it for the next ~90 sec). Copy the token.', 'hatch' ); ?>
				</div>

				<h4 style="margin:14px 0 6px; font-size:13px;"><?php esc_html_e( 'Step 2 — Paste it here', 'hatch' ); ?></h4>
				<input class="hx-input" type="password" name="vercel_token"
				       placeholder="paste Vercel access token (starts with vcp_)"
				       autocomplete="off" spellcheck="false" required
				       style="font-family:ui-monospace,SFMono-Regular,monospace; font-size:13px; width:100%;"/>
				<div class="hx-text-xs hx-text-muted" style="margin-top:6px;">
					<?php esc_html_e( 'Token is sent over HTTPS to the build broker, used in memory only, dropped on completion. Used ONCE for this deploy — content updates after this flow automatically via SSR, no token re-use needed.', 'hatch' ); ?>
				</div>

				<label style="display:flex; align-items:flex-start; gap:8px; margin-top:10px; cursor:pointer; font-size:13px;">
					<input type="checkbox" name="save_token" value="1" checked style="margin-top:2px; flex-shrink:0;"/>
					<span>
						<strong><?php esc_html_e( 'Save token for one-click re-deploys', 'hatch' ); ?></strong>
						<span class="hx-text-xs hx-text-muted" style="display:block; margin-top:2px;">
							<?php esc_html_e( 'Encrypted with AES-256-GCM using your WordPress secret keys. Stored only in your database — never on the broker. Lets the Connector tab rebuild your site without pasting the token again.', 'hatch' ); ?>
						</span>
					</span>
				</label>

				<div style="margin-top:14px;">
					<button type="submit" class="hx-btn is-primary">
						<?php echo hatch_icon( 'rocket' ); // phpcs:ignore ?>
						<?php esc_html_e( 'Build & deploy to Vercel ↗', 'hatch' ); ?>
					</button>
				</div>
				<p class="hx-text-xs hx-text-muted" style="margin:10px 0 0;">
					<?php esc_html_e( 'Opens a build-log tab; you\'ll get a live *.vercel.app URL in ~90s, then auto-redirect back here. You do NOT need to paste env vars anywhere — broker handles them automatically.', 'hatch' ); ?>
				</p>

				<details style="margin-top:14px;">
					<summary style="cursor:pointer; font-size:12px; color:var(--hx-muted);"><?php esc_html_e( 'For transparency: see exactly what gets sent to the broker', 'hatch' ); ?></summary>
					<div style="margin-top:8px; padding:10px; background:var(--hx-surface); border:1px solid var(--hx-border); border-radius:6px;">
						<div class="hx-text-xs hx-text-muted" style="margin-bottom:8px;">
							<?php esc_html_e( 'These 4 values + your Vercel token are POSTed to hatch.adityaarsharma.com over HTTPS. The broker uses them in memory during the build, then drops them. Nothing persisted on the broker server.', 'hatch' ); ?>
						</div>
						<?php foreach ( $env_pairs as $pair ) {
							$render_env_row( $pair[0], $pair[1], $pair[2], 'hatch-vercel' );
						} ?>
					</div>
				</details>
			</form>
		</details>

		<?php // ===== VPS — bash one-liner ===== ?>
		<?php
		$install_script = (string) apply_filters(
			'hatch/vps_install_script_url',
			'https://raw.githubusercontent.com/adityaarsharma/hatch/main/scripts/install-vps.sh'
		);
		$one_liner =
			'curl -fsSL ' . $install_script . ' | sudo bash -s --' .
			' --wp-url "' . untrailingslashit( home_url() ) . '"' .
			' --wp-user "' . $user->user_login . '"' .
			' --wp-pass "' . $wp_pass_v . '"' .
			' --webhook-secret "' . $secret . '"';
		?>
		<details class="hx-card" style="padding:0; margin:0; overflow:hidden;">
			<summary style="cursor:pointer; list-style:none; padding:16px 18px; display:flex; align-items:center; justify-content:space-between; gap:16px;">
				<div style="flex:1;">
					<div style="display:flex; align-items:center; gap:8px;">
						<strong style="font-size:15px;">🖥 <?php esc_html_e( 'Your VPS / Server', 'hatch' ); ?></strong>
						<span class="hx-pill is-soft"><?php esc_html_e( 'One curl command', 'hatch' ); ?></span>
					</div>
					<div class="hx-text-xs hx-text-muted" style="margin-top:4px;">
						<?php esc_html_e( 'Hetzner, DigitalOcean, RunCloud, Coolify — anywhere with SSH.', 'hatch' ); ?>
					</div>
				</div>
				<span class="hx-text-xs hx-text-muted hx-summary-toggle"><?php esc_html_e( 'Show steps ▾', 'hatch' ); ?></span>
			</summary>
			<div style="padding:14px 18px 18px; border-top:1px solid var(--hx-border);">
				<?php if ( '' === $pw ) : ?>
					<div class="notice notice-warning inline" style="margin:0 0 10px; padding:8px 10px; font-size:12.5px;">
						<?php esc_html_e( 'No Application Password generated yet. Go to Connector tab → Generate Application Password, then return to this wizard.', 'hatch' ); ?>
					</div>
				<?php endif; ?>

				<h4 style="margin:0 0 6px; font-size:13px;"><?php esc_html_e( 'SSH into your server, paste this one command:', 'hatch' ); ?></h4>
				<textarea class="hx-textarea is-full" readonly rows="3" id="hatch-vps-oneliner" style="font-family:ui-monospace,SFMono-Regular,monospace; font-size:12.5px; line-height:1.5; white-space:pre; overflow-x:auto;"><?php echo esc_textarea( $one_liner ); ?></textarea>
				<div class="hx-text-xs hx-text-muted" style="margin-top:6px; line-height:1.5;">
					<?php esc_html_e( 'Installs Node 20+ (if missing), clones the Hatch repo, writes astro-starter/.env with your credentials, runs npm install + npm run build. Your panel handles nginx / SSL / process management.', 'hatch' ); ?>
				</div>

				<div class="hx-flex hx-gap-2 hx-mt-3">
					<button type="button" class="hx-btn is-primary hx-copy-btn" data-target="hatch-vps-oneliner">
						<?php echo hatch_icon( 'copy' ); // phpcs:ignore ?>
						<?php esc_html_e( 'Copy command', 'hatch' ); ?>
					</button>
				</div>

				<p class="hx-text-xs hx-text-muted" style="margin:14px 0 0; line-height:1.5;">
					<?php
					/* translators: 1: dist path, 2: docs URL */
					printf(
						esc_html__( 'After install, point your webapp at %1$s. Full RunCloud / Coolify / Dokploy guide: %2$s.', 'hatch' ),
						'<code>astro-starter/dist/</code>',
						'<a href="' . esc_url( $repo_url . '/blob/main/docs/hosting/vps-runcloud.md' ) . '" target="_blank" rel="noopener noreferrer">docs/hosting/vps-runcloud.md</a>'
					);
					?>
				</p>
			</div>

		</details>
	</div>

	<script>
	(function(){
		// 1) Mutual-exclusion: when user opens one deploy card, close the others
		//    so only the selected host's steps are visible.
		var cards = document.querySelectorAll('.hx-deploy-cards > details');
		cards.forEach(function(card){
			card.addEventListener('toggle', function(){
				if (card.open) {
					cards.forEach(function(other){
						if (other !== card) other.open = false;
					});
					// Replace the "Show steps ▾" toggle hint with "Hide ▴"
					var hint = card.querySelector('.hx-summary-toggle');
					if (hint) hint.textContent = 'Hide ▴';
				} else {
					var hint = card.querySelector('.hx-summary-toggle');
					if (hint) hint.textContent = 'Show steps ▾';
				}
			});
		});

		// 2) Per-row copy buttons. Any element with class .hx-copy-btn and a
		//    data-target attribute copies the value of that input/textarea.
		document.querySelectorAll('.hx-copy-btn').forEach(function(btn){
			btn.addEventListener('click', function(){
				var target = document.getElementById(btn.dataset.target);
				if (!target) return;
				target.select();
				try { document.execCommand('copy'); } catch (e) {}
				var orig = btn.innerHTML;
				btn.innerHTML = '✓';
				setTimeout(function(){ btn.innerHTML = orig; }, 1200);
			});
		});
	})();
	</script>

	<p class="hx-text-xs hx-text-muted" style="margin-top:16px; line-height:1.5;">
		<?php esc_html_e( 'All three deploy paths run directly on the host\'s own infrastructure — Vercel\'s template URL, Cloudflare\'s deploy.workers.cloudflare.com, or your VPS via a GitHub-hosted install script. No third-party server sees your WordPress credentials.', 'hatch' ); ?>
		<a href="<?php echo esc_url( $repo_url . '/blob/main/docs/privacy.md' ); ?>" target="_blank" rel="noopener noreferrer">
			<?php esc_html_e( 'Privacy policy', 'hatch' ); ?>
		</a>
	</p>

	<div style="display:flex; justify-content:space-between; align-items:center; margin-top:24px; padding-top:20px; border-top:1px solid var(--hx-border);">
		<a href="<?php echo esc_url( admin_url( 'admin.php?page=hatch-setup&step=2' ) ); ?>" class="hx-btn is-ghost">
			<?php esc_html_e( 'Back', 'hatch' ); ?>
		</a>
		<a href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin.php?page=hatch-setup&hatch_complete_setup=1' ), 'hatch_complete_setup' ) ); ?>" class="hx-btn is-primary is-lg">
			<?php echo hatch_icon( 'check' ); // phpcs:ignore ?>
			<?php esc_html_e( 'Finish setup', 'hatch' ); ?>
		</a>
	</div>
	<?php
}

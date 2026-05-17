<?php
/**
 * Hatch Companion — fallback splash when no frontend URL is configured AND
 * for any non-logged-in browser hit that escaped the redirect logic.
 *
 * Visual goals (v0.24+): match the Hatch brand. Big confident type. Two
 * primary CTAs — "Visit live site" (when frontend URL is set) goes to the
 * Astro frontend. WordPress admin moves to a secondary link below.
 *
 * @package Hatch_Companion
 */

defined( 'ABSPATH' ) || exit;

$front = function_exists( 'hatch_companion_frontend_url' ) ? hatch_companion_frontend_url() : '';
$site_name = get_bloginfo( 'name' );
$tagline   = get_bloginfo( 'description' );
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="robots" content="noindex, follow">
	<title><?php echo esc_html( $site_name ); ?> — Headless mode</title>
	<link rel="preconnect" href="https://rsms.me">
	<link rel="stylesheet" href="https://rsms.me/inter/inter.css">
	<?php wp_head(); ?>
	<style>
		:root {
			color-scheme: light dark;
			--fg:#0a0a0a; --fg-muted:#525252; --fg-subtle:#737373;
			--bg:#fafafa; --surface:#ffffff; --border:#e5e7eb;
			--primary:#ff6b00; --primary-soft:#fff3e8;
		}
		@media (prefers-color-scheme: dark) {
			:root {
				--fg:#fafafa; --fg-muted:#a3a3a3; --fg-subtle:#737373;
				--bg:#0a0a0a; --surface:#18181b; --border:#27272a;
				--primary-soft:rgba(255,107,0,.12);
			}
		}
		*, *:before, *:after { box-sizing: border-box; }
		html, body { margin:0; padding:0; }
		body {
			font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
			background: var(--bg); color: var(--fg);
			-webkit-font-smoothing: antialiased;
			font-feature-settings: "ss01","cv11","cv02";
			min-height: 100vh; display: flex; align-items: center; justify-content: center;
			padding: 24px;
			background-image:
				radial-gradient(60% 50% at 50% 0%, var(--primary-soft), transparent 60%),
				radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--fg) 6%, transparent) 1px, transparent 0);
			background-size: auto, 22px 22px;
		}
		.wrap {
			max-width: 560px; width: 100%;
			padding: 44px 36px;
			border-radius: 16px;
			background: var(--surface);
			border: 1px solid var(--border);
			box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 20px 60px -20px rgba(0,0,0,.08);
			text-align: center;
		}
		.brand { font-size: 42px; line-height: 1; margin-bottom: 12px; }
		.pill {
			display: inline-flex; align-items: center; gap: 6px;
			background: var(--primary-soft); color: var(--primary);
			padding: 4px 10px; border-radius: 999px;
			font-size: 11.5px; font-weight: 600; letter-spacing: 0.02em;
			margin-bottom: 18px;
		}
		.pill .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary); }
		h1 {
			font-size: clamp(26px, 4vw, 34px);
			letter-spacing: -0.025em; font-weight: 700; line-height: 1.1;
			margin: 0 0 8px;
		}
		.tag { color: var(--fg-muted); font-size: 14.5px; margin: 0 0 28px; line-height: 1.55; }
		.cta-row {
			display: flex; flex-wrap: wrap; gap: 10px;
			justify-content: center; margin-bottom: 16px;
		}
		.btn {
			display: inline-flex; align-items: center; gap: 8px;
			padding: 11px 22px; border-radius: 10px;
			font-size: 14px; font-weight: 600;
			text-decoration: none;
			transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
		}
		.btn.primary { background: var(--primary); color: #fff; box-shadow: 0 4px 12px -4px rgba(255,107,0,.55); }
		.btn.primary:hover { transform: translateY(-1px); box-shadow: 0 8px 20px -6px rgba(255,107,0,.6); }
		.btn.ghost { background: transparent; color: var(--fg); border: 1px solid var(--border); }
		.btn.ghost:hover { border-color: var(--fg); }
		.urlchip {
			display: inline-flex; align-items: center; gap: 6px;
			font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
			font-size: 12px; color: var(--fg-subtle);
			padding: 6px 10px; border-radius: 6px;
			background: color-mix(in srgb, var(--fg) 4%, transparent);
			margin-top: 14px;
			word-break: break-all;
		}
		.foot {
			margin-top: 28px; padding-top: 20px;
			border-top: 1px solid var(--border);
			font-size: 12.5px; color: var(--fg-subtle);
		}
		.foot a { color: var(--fg-muted); text-decoration: none; }
		.foot a:hover { color: var(--fg); }
	</style>
</head>
<body>
	<main class="wrap">
		<div class="brand" aria-hidden="true">🐣</div>
		<span class="pill"><span class="dot"></span> Headless mode · powered by Hatch</span>
		<h1><?php echo esc_html( $site_name ); ?></h1>
		<?php if ( $tagline ): ?>
			<p class="tag"><?php echo esc_html( $tagline ); ?></p>
		<?php else: ?>
			<p class="tag">The live site lives on a fast, edge-rendered frontend. This URL is the headless WordPress backend.</p>
		<?php endif; ?>

		<div class="cta-row">
			<?php if ( $front ): ?>
				<a class="btn primary" href="<?php echo esc_url( $front ); ?>">
					Visit live site →
				</a>
				<a class="btn ghost" href="<?php echo esc_url( admin_url() ); ?>">
					WordPress admin
				</a>
			<?php else: ?>
				<a class="btn primary" href="<?php echo esc_url( admin_url( 'tools.php?page=hatch' ) ); ?>">
					Set up Hatch →
				</a>
				<a class="btn ghost" href="<?php echo esc_url( admin_url() ); ?>">
					WordPress admin
				</a>
			<?php endif; ?>
		</div>

		<?php if ( $front ): ?>
			<div class="urlchip"><?php echo esc_html( preg_replace( '#^https?://#', '', $front ) ); ?></div>
		<?php endif; ?>

		<div class="foot">
			Want the same? Hatch is open-source on
			<a href="https://github.com/adityaarsharma/hatch" target="_blank" rel="noopener noreferrer">GitHub</a>
			· <a href="https://hatch.adityaarsharma.com" target="_blank" rel="noopener noreferrer">hatch.adityaarsharma.com</a>
		</div>
	</main>
	<?php wp_footer(); ?>
</body>
</html>

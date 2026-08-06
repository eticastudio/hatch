import { useState } from '@wordpress/element';
import { HxCard, HxHead } from '../components.jsx';

// v0.7.2 — tiny inline status dot. Replaces the plain-text `○` that WAS
// rendering as a visible letter-O next to plugin names. Now: filled green
// on active, filled blue on installed-not-active, hollow grey on not-installed.
function StatusDot({ state }) {
	const fill = state === 'active' ? 'var(--hx-success)' : state === 'installed' ? '#2563eb' : 'transparent';
	const stroke = state === 'off' ? 'var(--hx-border)' : fill;
	return (
		<svg width="10" height="10" viewBox="0 0 10 10" style={{ flexShrink: 0, verticalAlign: 'middle' }}>
			<circle cx="5" cy="5" r="4" fill={fill} stroke={stroke} strokeWidth="1.5" />
		</svg>
	);
}

/**
 * Plugin Bridge tab — one place to see what Hatch detected and every
 * plugin Hatch knows how to talk to. Read-only status; no settings.
 *
 * v0.8 — de-cluttered: 2-column grid, 1-liner outcomes, common-5 by
 * default + "Show all bridges" toggle. Gutenberg blocks matrix moved
 * out (belongs on Content, not here).
 *
 * @since 0.5.3
 */

const ICON = {
	plug:   <><path d="M9 2v6" /><path d="M15 2v6" /><path d="M6 8h12v3a6 6 0 01-6 6 6 6 0 01-6-6V8z" /><path d="M12 17v5" /></>,
	info:   <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
	chev:   <polyline points="6 9 12 15 18 9" />,
};

// v0.7.7 — REST endpoints Hatch actually exposes per bridge category.
// Shown when the user toggles "What's exposed" on a card. Sourced from
// class-rest-api.php route registrations — not marketing copy.
const REST_ENDPOINTS = {
	seo:           ['/hatch/v1/seo-head', '/hatch/v1/schema'],
	forms:         ['/hatch/v1/forms/{provider}/{id}', '/hatch/v1/forms/{provider}/{id}/submit'],
	redirects:     ['/hatch/v1/redirects'],
	woocommerce:   ['/wc/v3/products', '/wc/v3/orders'],
	custom_fields: ['/wp/v2/{type}?_fields=acf', '/hatch/v1/acf-status'],
	cpt_manager:   ['/wp/v2/{slug}', '/hatch/v1/cpt-health'],
	membership:    ['/hatch/v1/membership/check'],
};

// `outcome` = 1-liner user-visible result. `common` = show above the fold.
const CATS = [
	{
		id: 'seo',
		label: 'SEO',
		common: true,
		outcome: 'SEO tags + schema on every page, automatically.',
		fieldFromFeatures: (ig) => ig?.seo?.detected?.slug || (ig?.rankready?.active ? 'rankready' : null),
		plugins: [
			{ slug: 'rankmath',      label: 'Rank Math',       priority: 1, ships: 'Meta, schema, sitemap, breadcrumbs, redirects (Pro).', exposes: ['Meta tags', 'Schema.org', 'Sitemap', 'Breadcrumbs', 'Redirects'] },
			{ slug: 'rankmath_pro',  label: 'Rank Math Pro',   priority: 1, ships: 'Adds AI content, tracking, watchlist.', exposes: ['Meta tags', 'Schema.org', 'Sitemap', 'Breadcrumbs', 'Redirects', 'AI content'] },
			{ slug: 'yoast',         label: 'Yoast SEO',       priority: 2, ships: 'Meta, schema, sitemap, breadcrumbs.', exposes: ['Meta tags', 'Schema.org', 'Sitemap', 'Breadcrumbs'] },
			{ slug: 'yoast_premium', label: 'Yoast Premium',   priority: 2, ships: 'Adds redirects, content insights.', exposes: ['Meta tags', 'Schema.org', 'Sitemap', 'Breadcrumbs', 'Redirects', 'Content insights'] },
			{ slug: 'rankready',     label: 'RankReady (AI)',  priority: 3, ships: 'AI-layer bridge: llms.txt + /.well-known/mcp.json + per-post AI Summary + FAQ JSON-LD.', exposes: ['llms.txt', 'mcp.json', 'AI Summary', 'FAQ JSON-LD'] },
		],
	},
	{
		id: 'forms',
		label: 'Forms',
		common: true,
		outcome: 'Forms submit from Astro straight to WordPress.',
		fieldFromFeatures: (ig) => ig?.forms?.detected?.slug,
		plugins: [
			{ slug: 'wpforms_pro',    label: 'WPForms Pro',       priority: 1, ships: 'Full REST, conditional logic, payments.', exposes: ['Form rendering', 'Submissions', 'Conditional logic', 'Payments', 'Spam protection'] },
			{ slug: 'wpforms',        label: 'WPForms Lite',      priority: 1, ships: 'Free. Contact forms via REST.', exposes: ['Form rendering', 'Submissions', 'Spam protection'] },
			{ slug: 'fluent_forms',   label: 'Fluent Forms',      priority: 2, ships: 'Own REST, conditional logic, integrations.', exposes: ['Form rendering', 'Submissions', 'Conditional logic', 'Integrations'] },
			{ slug: 'gravity_forms',  label: 'Gravity Forms',     priority: 3, ships: 'Own /gf/v2/ REST.', exposes: ['Form rendering', 'Submissions', '/gf/v2/ REST'] },
			{ slug: 'cf7',            label: 'Contact Form 7',    priority: 4, ships: 'No native REST. Server-render only.', exposes: ['Server-rendered forms only'] },
		],
	},
	{
		id: 'redirects',
		label: 'Redirects',
		common: true,
		outcome: '301/302 rules enforced at the edge.',
		fieldFromFeatures: (ig) => ig?.redirects,
		plugins: [
			{ slug: 'redirection', label: 'Redirection', priority: 1, ships: 'Free. Unlimited 301/302 rules with logs.', exposes: ['301/302 rules', 'Regex matching', 'Redirect logs', '404 tracking'] },
			{ slug: 'rankmath',    label: 'Rank Math (redirects module)', priority: 2, ships: 'If Rank Math’s redirects module is active.', exposes: ['301/302 rules', 'Regex matching'] },
			{ slug: 'yoast_premium', label: 'Yoast Premium (redirects)', priority: 3, ships: 'Bundled with Yoast Premium.', exposes: ['301/302 rules', 'Regex matching'] },
		],
	},
	{
		id: 'woocommerce',
		label: 'E-commerce',
		common: true,
		outcome: 'WooCommerce products readable from Astro.',
		fieldFromFeatures: (ig) => ig?.woocommerce ? 'woocommerce' : 'none',
		plugins: [
			{ slug: 'woocommerce', label: 'WooCommerce', priority: 1, ships: 'Own /wc/v3/ REST for products, orders, customers.', exposes: ['Products', 'Orders', 'Customers', '/wc/v3/ REST'] },
		],
	},
	{
		id: 'custom_fields',
		label: 'Custom Fields',
		common: true,
		outcome: 'ACF fields exposed in REST for Astro.',
		fieldFromFeatures: (ig) => ig?.custom_fields,
		plugins: [
			{ slug: 'acf_pro',   label: 'ACF Pro',                priority: 1, ships: 'All field types + repeaters + flexible content.', exposes: ['Field values in REST', 'Repeaters', 'Flexible content', 'Options pages'] },
			{ slug: 'acf',       label: 'ACF (free)',             priority: 2, ships: 'Core field types + basic layouts.', exposes: ['Field values in REST', 'Core field types'] },
			{ slug: 'secure_cf', label: 'Secure Custom Fields',   priority: 3, ships: 'WP.org fork. Same shape.', exposes: ['Field values in REST', 'Core field types'] },
			{ slug: 'meta_box',  label: 'Meta Box',               priority: 4, ships: 'Rival field builder.', exposes: ['Field values in REST'] },
			{ slug: 'pods',      label: 'Pods',                   priority: 5, ships: 'Also handles CPTs.', exposes: ['Field values in REST', 'Custom post types'] },
		],
	},
	{
		// v0.5.7 — SMTP category. Astro never sends email directly; every
		// email-producing action (form notifications, comments, Woo orders,
		// password resets, admin alerts) round-trips into wp_mail() inside
		// WordPress. Any of these SMTP plugins hooks wp_mail() and hands the
		// message to a real transport — so the whole headless email pipeline
		// is delivered reliably with one activation.
		id: 'smtp',
		label: 'Email delivery (SMTP)',
		common: true,
		outcome: 'Astro forms, comments, Woo orders, and password resets get delivered via real SMTP.',
		fieldFromFeatures: (ig) => ig?.smtp?.detected?.slug || ig?.smtp,
		plugins: [
			{ slug: 'fluent_smtp',   label: 'FluentSMTP',       priority: 1, ships: 'Free. Ties into Gmail, Amazon SES, Postmark, SendGrid, Brevo, generic SMTP. Log + retry.', exposes: ['wp_mail() transport', 'Delivery log', 'Failure retry', 'Test-send'] },
			{ slug: 'wp_mail_smtp',  label: 'WP Mail SMTP',     priority: 2, ships: 'Same transports + white-label. Free tier covers most needs.', exposes: ['wp_mail() transport', 'Delivery log', 'Test-send'] },
			{ slug: 'post_smtp',     label: 'Post SMTP',        priority: 3, ships: 'OAuth for Gmail/Outlook, mobile push alerts on failure.', exposes: ['wp_mail() transport', 'Delivery log', 'Failure alerts'] },
			{ slug: 'easy_wp_smtp',  label: 'Easy WP SMTP',     priority: 4, ships: 'Minimal config, generic SMTP transport.', exposes: ['wp_mail() transport'] },
		],
	},
	{
		id: 'cpt_manager',
		label: 'Custom Post Types',
		common: false,
		comingSoon: true,
		outcome: 'CPTs auto-picked-up via /wp/v2/{slug}.',
		fieldFromFeatures: (ig) => ig?.cpt_manager,
		plugins: [
			{ slug: 'cpt_ui',      label: 'Custom Post Type UI', priority: 1, ships: 'Simple CPT + taxonomy registration.', exposes: ['CPTs via /wp/v2/{slug}', 'Custom taxonomies'] },
			{ slug: 'jet_engine',  label: 'JetEngine',           priority: 2, ships: 'Crocoblock: heavy but full-featured.', exposes: ['CPTs via /wp/v2/{slug}', 'Custom taxonomies', 'Relations'] },
			{ slug: 'pods',        label: 'Pods',                priority: 3, ships: 'Also handles custom fields.', exposes: ['CPTs via /wp/v2/{slug}', 'Custom fields'] },
		],
	},
	{
		id: 'membership',
		label: 'Membership',
		common: false,
		comingSoon: true,
		outcome: 'Detects gated tiers (frontend enforcement v0.6).',
		fieldFromFeatures: (ig) => ig?.membership,
		plugins: [
			{ slug: 'memberpress',      label: 'MemberPress',           priority: 1, ships: 'Full membership + course + drip.', exposes: ['Tier detection', 'Course + drip (v0.6)'] },
			{ slug: 'restrict_content', label: 'Restrict Content Pro',  priority: 2, ships: 'Restrict Content Pro.', exposes: ['Tier detection'] },
			{ slug: 'paid_memberships', label: 'Paid Memberships Pro',  priority: 3, ships: 'Free tier available.', exposes: ['Tier detection'] },
		],
	},
];

// v0.7.6 — Unified Pill. One shape / one padding / one radius for every
// chip on this tab: the active-plugin badge, the Exposes list, the
// Supported plugin roster. Variants only change color, never geometry.
function Pill({ variant = 'neutral', dot, children, title }) {
	// v0.5.6 — active + installed pills desaturated to a neutral surface.
	// The green dot from StatusDot carries the "active" signal instead of
	// tinting the entire pill; keeps the row calm and lets typography +
	// spacing do the work. Colored pills were shouting in every card.
	const V = {
		active:    { bg: 'var(--hx-surface-2)', bd: 'var(--hx-border)', fg: 'var(--hx-fg)',     weight: 500 },
		installed: { bg: 'var(--hx-surface-2)', bd: 'var(--hx-border)', fg: 'var(--hx-muted)',  weight: 500 },
		exposes:   { bg: 'var(--hx-surface-2)', bd: 'var(--hx-border)', fg: 'var(--hx-muted)',  weight: 500 },
		neutral:   { bg: 'transparent',         bd: 'var(--hx-border)', fg: 'var(--hx-subtle)', weight: 400 },
	}[variant] || {};
	return (
		<span
			title={title}
			style={{
				display: 'inline-flex', alignItems: 'center', gap: dot ? 6 : 0,
				padding: '4px 10px', borderRadius: 999,
				background: V.bg, border: `1px solid ${V.bd}`, color: V.fg,
				fontSize: 12, fontWeight: V.weight, lineHeight: 1.4, whiteSpace: 'nowrap',
			}}
		>
			{dot}{children}
		</span>
	);
}

// v0.7.7 — Compact BridgeCard. Three visual zones only:
//   1. Header row  : icon · title · desc  |  active-plugin pill (right)
//   2. Plugin roster (collapsed by default when not-detected — replaced
//      with a one-line "Install X or Y to enable" sentence + a tooltip
//      listing everything supported, so cards stay tight)
//   3. "What's exposed" toggle → reveals capability chips + REST endpoints
//
// Motion: cubic-bezier(0.32, 0.72, 0, 1) for the expand — feels like
// spring physics rather than a linear ramp.
function BridgeCard({ cat, ig, plugMap }) {
	const [showExpose, setShowExpose] = useState(false);
	const isInstalled = (slug) => !!plugMap[slug];
	const active = cat.fieldFromFeatures(ig) || 'none';
	const isOn = active && active !== 'none' && active !== false;
	const activePlug = isOn
		? cat.plugins.find((p) => p.slug === active) || (cat.id === 'woocommerce' ? cat.plugins.find((p) => p.slug === 'woocommerce') : null)
		: null;
	const exposes   = activePlug?.exposes || [];
	const endpoints = REST_ENDPOINTS[cat.id] || [];

	const supportedNames = cat.plugins.map((p) => p.label).join(', ');
	const anyInstalled   = cat.plugins.some((p) => isInstalled(p.slug));

	return (
		<HxCard>
			{/* Zone 1 — header. Active plugin pill sits top-right as action. */}
			<HxHead
				iconChildren={ICON.plug}
				iconColor={isOn ? '#16a34a' : cat.comingSoon ? 'var(--hx-warning)' : 'var(--hx-subtle)'}
				title={cat.label}
				desc={cat.outcome}
				action={
					cat.comingSoon
						? <Pill variant="neutral" title="Bridge detects the plugin today; full Astro-side render lands in a later release.">Coming soon</Pill>
						: isOn
							? <Pill variant="active" dot="✓">{activePlug?.label || active}</Pill>
							: <Pill variant="neutral" title={`Supported: ${supportedNames}`}>None yet</Pill>
				}
			/>

			{/* Zone 2 — plugin roster.
			    - Detected: show only installed plugins as pills (compact).
			    - Not detected: single sentence + hover tooltip on the whole
			      sentence lists every supported option. No wall of grey. */}
			{isOn || anyInstalled ? (
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 0 4px' }}>
					{cat.plugins
						.filter((p) => isInstalled(p.slug))
						.map((p) => {
							const isActive = p.slug === active || (cat.id === 'woocommerce');
							return (
								<Pill
									key={p.slug}
									variant={isActive ? 'active' : 'installed'}
									dot={<StatusDot state={isActive ? 'active' : 'installed'} />}
									title={p.ships}
								>{p.label}</Pill>
							);
						})}
				</div>
			) : (
				<p
					className="hx-help"
					style={{ margin: 0, color: 'var(--hx-subtle)', lineHeight: 1.55, cursor: 'help' }}
					title={`Supported: ${supportedNames}`}
				>
					Install <span style={{ color: 'var(--hx-fg)', fontWeight: 500 }}>{cat.plugins[0]?.label}</span>
					{cat.plugins.length > 1 && <> or <span style={{ color: 'var(--hx-fg)', fontWeight: 500 }}>{cat.plugins[1]?.label}</span></>}
					{cat.plugins.length > 2 && <> ({cat.plugins.length - 2} more)</>} to enable this bridge.
				</p>
			)}

			{/* Zone 3 — collapsible expose panel. Only rendered when a plugin
			    is active — nothing to expose otherwise. */}
			{isOn && (exposes.length > 0 || endpoints.length > 0) && (
				<div style={{ marginTop: 12, borderTop: '1px solid var(--hx-border)', paddingTop: 12 }}>
					<button
						type="button"
						onClick={() => setShowExpose((s) => !s)}
						style={{
							display: 'inline-flex', alignItems: 'center', gap: 6,
							padding: 0, background: 'none', border: 'none', cursor: 'pointer',
							outline: 'none', WebkitTapHighlightColor: 'transparent',
							fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
							color: 'var(--hx-muted)',
							transition: 'color .2s cubic-bezier(0.32, 0.72, 0, 1)',
						}}
						onFocus={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
						onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--hx-primary)'; }}
						onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--hx-muted)'; }}
					>
						What's exposed
						<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showExpose ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .28s cubic-bezier(0.32, 0.72, 0, 1)' }}>
							{ICON.chev}
						</svg>
					</button>
					<div
						style={{
							overflow: 'hidden',
							maxHeight: showExpose ? 500 : 0,
							opacity: showExpose ? 1 : 0,
							transition: 'max-height .32s cubic-bezier(0.32, 0.72, 0, 1), opacity .24s ease-out',
							marginTop: showExpose ? 10 : 0,
						}}
					>
						{exposes.length > 0 && (
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: endpoints.length ? 12 : 0 }}>
								{exposes.map((chip) => (
									<Pill key={chip} variant="exposes">{chip}</Pill>
								))}
							</div>
						)}
						{endpoints.length > 0 && (
							<div>
								<div className="hx-help" style={{ fontSize: 11, fontWeight: 500, color: 'var(--hx-subtle)', marginBottom: 4 }}>REST endpoints</div>
								<ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
									{endpoints.map((ep) => (
										<li key={ep} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, color: 'var(--hx-muted)' }}>
											<span style={{ color: 'var(--hx-subtle)' }}>GET</span> {ep}
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>
			)}
		</HxCard>
	);
}

export default function PluginBridge({ state }) {
	// v0.5.6 — dropped the top summary card + "Show all" toggle per user
	// feedback. Every bridge is always visible; the grid is the whole tab.
	const ig = state?.integrations || {};
	const plugMap = ig?.plugins || {};

	return (
		<div style={{
			display: 'grid',
			gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
			gap: 16,
		}}>
			{CATS.map((cat) => (
				<BridgeCard key={cat.id} cat={cat} ig={ig} plugMap={plugMap} />
			))}
		</div>
	);
}

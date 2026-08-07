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
 * Plugin Bridge tab — one place to see what Hatch detected, what the
 * currently-active plugin is per category, and every plugin Hatch knows
 * how to talk to. No settings here; every row is read-only status.
 *
 * The user's job is to install the plugin they want in Plugins → Add New.
 * Hatch's job is to detect it and reflect state here.
 *
 * @since 0.5.3
 */

const CATS = [
	{
		id: 'seo',
		label: 'SEO',
		icon: '🔍',
		howto: 'Install any supported SEO plugin. Rank Math wins priority when multiple active. Astro reads meta + schema from the plugin’s output. RankReady adds an AI layer (llms.txt + MCP + AI summaries) on top — coexists with the others, not a replacement.',
		fieldFromFeatures: (ig) => ig?.seo?.detected?.slug || (ig?.rankready?.active ? 'rankready' : null),
		plugins: [
			{ slug: 'rankmath',      label: 'Rank Math',       priority: 1, ships: 'Meta, schema, sitemap, breadcrumbs, redirects (Pro).' },
			{ slug: 'rankmath_pro',  label: 'Rank Math Pro',   priority: 1, ships: 'Adds AI content, tracking, watchlist.' },
			{ slug: 'yoast',         label: 'Yoast SEO',       priority: 2, ships: 'Meta, schema, sitemap, breadcrumbs.' },
			{ slug: 'yoast_premium', label: 'Yoast Premium',   priority: 2, ships: 'Adds redirects, content insights.' },
			{ slug: 'rankready',     label: 'RankReady (AI)',  priority: 3, ships: 'AI-layer bridge — llms.txt + /.well-known/mcp.json + per-post AI Summary + FAQ JSON-LD. Needs Headless mode toggle in the plugin.' },
		],
	},
	{
		id: 'forms',
		label: 'Forms',
		icon: '📝',
		howto: 'Install a supported form plugin. Astro talks to the plugin’s own REST endpoint. WPForms + Fluent Forms + Gravity have native REST; CF7 does not (documented limitation).',
		fieldFromFeatures: (ig) => ig?.forms?.detected?.slug,
		plugins: [
			{ slug: 'wpforms_pro',    label: 'WPForms Pro',       priority: 1, ships: 'Full REST, conditional logic, payments.' },
			{ slug: 'wpforms',        label: 'WPForms Lite',      priority: 1, ships: 'Free — contact forms via REST.' },
			{ slug: 'fluent_forms',   label: 'Fluent Forms',      priority: 2, ships: 'Own REST, conditional logic, integrations.' },
			{ slug: 'gravity_forms',  label: 'Gravity Forms',     priority: 3, ships: 'Own /gf/v2/ REST.' },
			{ slug: 'cf7',            label: 'Contact Form 7',    priority: 4, ships: 'No native REST — server-render only.' },
		],
	},
	{
		id: 'redirects',
		label: 'Redirects',
		icon: '↪',
		howto: 'Install Redirection, then add 301/302 rules in its admin. Astro fetches /hatch/v1/redirects and enforces them at the edge.',
		fieldFromFeatures: (ig) => ig?.redirects,
		plugins: [
			{ slug: 'redirection', label: 'Redirection', priority: 1, ships: 'Free — unlimited 301/302 rules with logs.' },
			{ slug: 'rankmath',    label: 'Rank Math (redirects module)', priority: 2, ships: 'If Rank Math’s redirects module is active.' },
			{ slug: 'yoast_premium', label: 'Yoast Premium (redirects)', priority: 3, ships: 'Bundled with Yoast Premium.' },
		],
	},
	{
		id: 'custom_fields',
		label: 'Custom Fields',
		icon: '🔧',
		howto: 'Install ACF (free) or ACF Pro. Create your field group, then check "Show in REST" on the group — that’s the one manual step. Hatch surfaces the field-group status here.',
		fieldFromFeatures: (ig) => ig?.custom_fields,
		plugins: [
			{ slug: 'acf_pro',   label: 'ACF Pro',                priority: 1, ships: 'All field types + repeaters + flexible content.' },
			{ slug: 'acf',       label: 'ACF (free)',             priority: 2, ships: 'Core field types + basic layouts.' },
			{ slug: 'secure_cf', label: 'Secure Custom Fields',   priority: 3, ships: 'WP.org fork — same shape.' },
			{ slug: 'meta_box',  label: 'Meta Box',               priority: 4, ships: 'Rival field builder.' },
			{ slug: 'pods',      label: 'Pods',                   priority: 5, ships: 'Also handles CPTs.' },
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
		icon: '📄',
		howto: 'Install CPT UI, register a custom post type. Astro auto-picks it up via /wp/v2/{slug} — no extra config.',
		fieldFromFeatures: (ig) => ig?.cpt_manager,
		plugins: [
			{ slug: 'cpt_ui',      label: 'Custom Post Type UI', priority: 1, ships: 'Simple CPT + taxonomy registration.' },
			{ slug: 'jet_engine',  label: 'JetEngine',           priority: 2, ships: 'Crocoblock — heavy but full-featured.' },
			{ slug: 'pods',        label: 'Pods',                priority: 3, ships: 'Also handles custom fields.' },
		],
	},
	{
		id: 'membership',
		label: 'Membership / Gated Content',
		icon: '🔐',
		howto: 'Install a membership plugin, set up your tiers. Detection surfaces now; per-post gating enforcement on Astro lands in v0.6.',
		fieldFromFeatures: (ig) => ig?.membership,
		plugins: [
			{ slug: 'memberpress',      label: 'MemberPress',           priority: 1, ships: 'Full membership + course + drip.' },
			{ slug: 'restrict_content', label: 'Restrict Content Pro',  priority: 2, ships: 'Restrict Content Pro.' },
			{ slug: 'paid_memberships', label: 'Paid Memberships Pro',  priority: 3, ships: 'Free tier available.' },
		],
	},
	{
		id: 'woocommerce',
		label: 'E-commerce',
		icon: '🛒',
		howto: 'Install WooCommerce. Detection surfaces now. To read products from Astro, generate a Consumer Key/Secret in Woo → Settings → Advanced → REST API. Full storefront on Astro is v0.7 scope.',
		fieldFromFeatures: (ig) => ig?.woocommerce ? 'woocommerce' : 'none',
		plugins: [
			{ slug: 'woocommerce', label: 'WooCommerce', priority: 1, ships: 'Own /wc/v3/ REST for products, orders, customers.' },
		],
	},
];

export default function PluginBridge({ state }) {
	const [open, setOpen] = useState({});
	const ig = state?.integrations || {};
	const plugMap = ig?.plugins || {};

	const isInstalled = (slug) => !!plugMap[slug];
	const activeCount = Object.values(plugMap).filter(Boolean).length;
	const knownCount  = Object.keys(plugMap).length;

	return (
		<>
			<HxCard>
				<HxHead icon="Plug" title="Plugin Bridge" desc={
					`Every WordPress plugin Hatch knows how to talk to. ${activeCount}/${knownCount} detected active. Install any supported plugin — it just works. No toggles needed except where noted.`
				} />
				<HxRow label="Summary" desc="Rows below break out per category — the currently-active plugin is highlighted.">
					<span style={{ fontSize: 12, color: 'var(--h-fg-2)', fontFamily: 'monospace' }}>{activeCount} / {knownCount} active</span>
				</HxRow>
			</HxCard>

			{CATS.map((cat) => {
				const active = cat.fieldFromFeatures(ig) || 'none';
				const isOn = active && active !== 'none' && active !== false;
				return (
					<HxCard key={cat.id}>
						<HxHead icon="Plug" title={`${cat.icon} ${cat.label}`} desc={cat.howto} />

						<HxRow
							label="Currently active"
							desc={isOn ? `Hatch is bridging: ${active}` : 'No supported plugin active — install one below.'}
						>
							{isOn ? (
								<span style={{
									display: 'inline-flex',
									alignItems: 'center',
									gap: 6,
									padding: '4px 10px',
									borderRadius: 999,
									background: 'rgba(16,185,129,0.10)',
									border: '1px solid rgba(16,185,129,0.30)',
									color: '#065f46',
									fontSize: 12,
									fontWeight: 600,
								}}>✓ {active}</span>
							) : (
								<span style={{ fontSize: 12, color: 'var(--h-fg-2)' }}>none</span>
							)}
						</HxRow>

						<HxRow
							label="Supported plugins"
							desc="Green = installed. Grey = install to activate. Priority order matters when multiple are installed."
						>
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
								{cat.plugins.map((p) => {
									const installed = isInstalled(p.slug);
									const isActive  = installed && (p.slug === active || (cat.id === 'woocommerce' && installed));
									return (
										<span
											key={p.slug}
											title={p.ships + (installed ? '' : '  ·  Not installed.')}
											style={{
												display: 'inline-flex',
												alignItems: 'center',
												gap: 6,
												padding: '4px 10px',
												borderRadius: 6,
												border: `1px solid ${isActive ? 'rgba(16,185,129,0.35)' : installed ? 'rgba(59,130,246,0.35)' : 'var(--h-line)'}`,
												background:
													isActive  ? 'rgba(16,185,129,0.08)' :
													installed ? 'rgba(59,130,246,0.05)' :
													            'transparent',
												color:
													isActive  ? '#065f46' :
													installed ? '#1e40af' :
													            'var(--h-fg-2)',
												fontSize: 12,
												fontWeight: isActive ? 600 : 400,
											}}
										>
											<StatusDot state={isActive ? 'active' : installed ? 'installed' : 'off'} /> {p.label}
											{p.priority && <span style={{ opacity: 0.55, fontSize: 10 }}>#{p.priority}</span>}
										</span>
									);
								})}
							</div>
						</HxRow>

						<HxRow
							label="What Hatch does with this bridge"
							desc={
								open[cat.id]
									? cat.plugins.map((p) => `${p.label}: ${p.ships}`).join('\n')
									: 'Click "Show details" to see what each plugin adds when installed.'
							}
						>
							<HxBtn
								variant="ghost"
								onClick={() => setOpen((s) => ({ ...s, [cat.id]: !s[cat.id] }))}
							>
								{open[cat.id] ? 'Hide details' : 'Show details'}
							</HxBtn>
						</HxRow>
					</HxCard>
				);
			})}

			<HxCard>
				<HxHead icon="Layers" title="Gutenberg blocks Hatch styles per-theme" desc="46 core WordPress blocks with per-theme visual signatures. Writers use the standard Gutenberg editor; Hatch's theme system paints each block distinctively per Blog / Tech / Docs." />
				{[
					{ group: 'Writing (9)',    items: ['paragraph','heading','list','list-item','quote','pullquote','code','preformatted','verse'] },
					{ group: 'Media (6)',      items: ['image','gallery','video','audio','cover','embed'] },
					{ group: 'Structure (7)',  items: ['columns','column','group','separator','spacer','table','details'] },
					{ group: 'Interactive (2)',items: ['button','buttons'] },
					{ group: 'Utility (2)',    items: ['html','file'] },
					{ group: 'Query loop (15)',items: ['query','post-template','post-title','post-excerpt','post-date','post-featured-image','post-terms','post-author','post-content','query-title','query-pagination','query-pagination-next','query-pagination-previous','query-pagination-numbers','query-no-results'] },
					{ group: 'Widget (5)',     items: ['latest-posts','categories','tag-cloud','rss','search'] },
				].map((g) => (
					<HxRow key={g.group} label={g.group} desc="core/*">
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
							{g.items.map((b) => (
								<span key={b} style={{
									padding: '2px 8px',
									borderRadius: 4,
									border: '1px solid var(--h-line)',
									fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
									fontSize: 11,
									color: 'var(--h-fg-2)',
								}}>core/{b}</span>
							))}
						</div>
					</HxRow>
				))}
			</HxCard>

			<HxCard>
				<HxHead icon="Layers" title="Gutenberg blocks Hatch styles per-theme" desc="46 core WordPress blocks with per-theme visual signatures. Writers use the standard Gutenberg editor; Hatch's theme system paints each block distinctively per Blog / Tech / Docs." />
				{[
					{ group: 'Writing (9)',    items: ['paragraph','heading','list','list-item','quote','pullquote','code','preformatted','verse'] },
					{ group: 'Media (6)',      items: ['image','gallery','video','audio','cover','embed'] },
					{ group: 'Structure (7)',  items: ['columns','column','group','separator','spacer','table','details'] },
					{ group: 'Interactive (2)',items: ['button','buttons'] },
					{ group: 'Utility (2)',    items: ['html','file'] },
					{ group: 'Query loop (15)',items: ['query','post-template','post-title','post-excerpt','post-date','post-featured-image','post-terms','post-author','post-content','query-title','query-pagination','query-pagination-next','query-pagination-previous','query-pagination-numbers','query-no-results'] },
					{ group: 'Widget (5)',     items: ['latest-posts','categories','tag-cloud','rss','search'] },
				].map((g) => (
					<HxRow key={g.group} label={g.group} desc="core/*">
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
							{g.items.map((b) => (
								<span key={b} style={{
									padding: '2px 8px',
									borderRadius: 4,
									border: '1px solid var(--h-line)',
									fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
									fontSize: 11,
									color: 'var(--h-fg-2)',
								}}>core/{b}</span>
							))}
						</div>
					</HxRow>
				))}
			</HxCard>

			<HxCard>
				<HxHead icon="Layers" title="Gutenberg blocks Hatch styles per-theme" desc="46 core WordPress blocks with per-theme visual signatures. Writers use the standard Gutenberg editor; Hatch's theme system paints each block distinctively per Blog / Tech / Docs." />
				{[
					{ group: 'Writing (9)',    items: ['paragraph','heading','list','list-item','quote','pullquote','code','preformatted','verse'] },
					{ group: 'Media (6)',      items: ['image','gallery','video','audio','cover','embed'] },
					{ group: 'Structure (7)',  items: ['columns','column','group','separator','spacer','table','details'] },
					{ group: 'Interactive (2)',items: ['button','buttons'] },
					{ group: 'Utility (2)',    items: ['html','file'] },
					{ group: 'Query loop (15)',items: ['query','post-template','post-title','post-excerpt','post-date','post-featured-image','post-terms','post-author','post-content','query-title','query-pagination','query-pagination-next','query-pagination-previous','query-pagination-numbers','query-no-results'] },
					{ group: 'Widget (5)',     items: ['latest-posts','categories','tag-cloud','rss','search'] },
				].map((g) => (
					<HxRow key={g.group} label={g.group} desc="core/*">
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
							{g.items.map((b) => (
								<span key={b} style={{
									padding: '2px 8px',
									borderRadius: 4,
									border: '1px solid var(--h-line)',
									fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
									fontSize: 11,
									color: 'var(--h-fg-2)',
								}}>core/{b}</span>
							))}
						</div>
					</HxRow>
				))}
			</HxCard>

			<HxCard>
				<HxHead icon="Info" title="Not yet auto-consumed on Astro" desc="Detected, but full Astro-side rendering is roadmap." />
				<HxRow label="Per-post membership gate" desc="Detects MemberPress/RCP/PMP; frontend enforcement lands in v0.6."><span style={{ fontSize: 12, color: 'var(--h-fg-2)' }}>v0.6</span></HxRow>
				<HxRow label="Multilingual (Polylang / WPML)" desc="Detected via Hatch_Detector; Plugin Bridge card + language switcher UI = v0.6."><span style={{ fontSize: 12, color: 'var(--h-fg-2)' }}>v0.6</span></HxRow>
				<HxRow label="Woo storefront on Astro" desc="Product cards + checkout templates in v0.7."><span style={{ fontSize: 12, color: 'var(--h-fg-2)' }}>v0.7</span></HxRow>
				<HxRow label="Contact Form 7 auto-render" desc="CF7 has no native REST; switch to WPForms or Fluent for headless."><span style={{ fontSize: 12, color: 'var(--h-fg-2)' }}>docs</span></HxRow>
			</HxCard>
		</>
	);
}

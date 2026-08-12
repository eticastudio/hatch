import { useState, useEffect } from '@wordpress/element';
import { HxCard, HxBadge } from '../components.jsx';

/**
 * Live probe for the Hatch WooCommerce bridge. Hits /hatch/v1/store/products
 * (public read-only route) to render product count + a "View sample" link that
 * jumps to the Astro frontend `/product/<slug>` page for the first product.
 *
 * @since 0.7.4
 */
function useWooProbe(enabled) {
	const [state, setState] = useState({ loading: false, total: null, sample: null, err: null });
	useEffect(() => {
		if (!enabled) return;
		const boot = typeof window !== 'undefined' ? window.hatchBoot : null;
		const restUrl = boot?.restUrl;
		const nonce = boot?.nonce;
		if (!restUrl) { setState((s) => ({ ...s, err: 'restUrl missing' })); return; }
		setState((s) => ({ ...s, loading: true }));
		fetch(`${restUrl}store/products?per_page=1`, {
			headers: nonce ? { 'X-WP-Nonce': nonce } : {},
		})
			.then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
			.then((data) => {
				const first = Array.isArray(data?.products) && data.products[0] ? data.products[0] : null;
				setState({ loading: false, total: Number(data?.total || 0), sample: first, err: null });
			})
			.catch((err) => setState({ loading: false, total: null, sample: null, err: String(err.message || err) }));
	}, [enabled]);
	return state;
}

/**
 * Plugin Bridge — 2-col grid of category cards. Compact by default, click to
 * unfold. Each card shows category label + status pill. Unfolded reveals
 * plugin roster (with StatusDot + tooltip of what each plugin ships) plus
 * chip list of REST abilities Hatch exposes when the bridge is active.
 *
 * @since 0.7.3 — full rewrite from stacked HxRow layout.
 */

function StatusDot({ state }) {
	const fill = state === 'active' ? 'var(--hx-success)' : state === 'installed' ? '#2563eb' : 'transparent';
	const stroke = state === 'off' ? 'var(--hx-border)' : fill;
	return (
		<svg width="9" height="9" viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
			<circle cx="5" cy="5" r="4" fill={fill} stroke={stroke} strokeWidth="1.5" />
		</svg>
	);
}

function Chevron({ open }) {
	return (
		<svg width="14" height="14" viewBox="0 0 16 16" fill="none"
			style={{ transition: 'transform .15s ease', transform: open ? 'rotate(90deg)' : 'none' }}>
			<path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

const CATS = [
	{
		id: 'seo',
		label: 'SEO',
		icon: '🔍',
		outcome: 'Meta tags, schema, sitemap, and canonical URLs flow to Astro from your SEO plugin.',
		exposes: [
			'/hatch/v1/seo-head?url={url}',
			'/hatch/v1/seo-meta',
			'/hatch/v1/schema?post_id={id}',
			'/hatch/v1/menus/{location}',
			'/llms.txt (RankReady)',
			'/.well-known/mcp.json (RankReady)',
		],
		fieldFromFeatures: (ig) => ig?.seo?.detected?.slug || (ig?.rankready?.active ? 'rankready' : null),
		plugins: [
			{ slug: 'rankmath',      label: 'Rank Math',      priority: 1, ships: 'Meta, schema, sitemap, breadcrumbs, redirects (Pro).' },
			{ slug: 'rankmath_pro',  label: 'Rank Math Pro',  priority: 1, ships: 'Adds AI content, tracking, watchlist.' },
			{ slug: 'yoast',         label: 'Yoast SEO',      priority: 2, ships: 'Meta, schema, sitemap, breadcrumbs.' },
			{ slug: 'yoast_premium', label: 'Yoast Premium',  priority: 2, ships: 'Adds redirects, content insights.' },
			{ slug: 'rankready',     label: 'RankReady (AI)', priority: 3, ships: 'AI layer: llms.txt + /.well-known/mcp.json + per-post AI summary + FAQ JSON-LD.' },
		],
	},
	{
		id: 'forms',
		label: 'Forms',
		icon: '📝',
		outcome: 'Astro renders native <HatchForm> from schema; POSTs back through WordPress. Zero plugin CSS or JS ships.',
		exposes: [
			'/hatch/v1/forms',
			'/hatch/v1/forms/{provider}/{id}',
			'/hatch/v1/forms/{provider}/{id}/submit',
			'shortcode auto-rewrite ([fluentform] etc)',
		],
		fieldFromFeatures: (ig) => ig?.forms?.detected?.slug,
		plugins: [
			{ slug: 'wpforms_pro',   label: 'WPForms Pro',    priority: 1, ships: 'Full REST, conditional logic, payments.' },
			{ slug: 'wpforms',       label: 'WPForms Lite',   priority: 1, ships: 'Free — contact forms via REST.' },
			{ slug: 'fluent_forms',  label: 'Fluent Forms',   priority: 2, ships: 'Own REST, conditional logic, integrations.' },
			{ slug: 'gravity_forms', label: 'Gravity Forms',  priority: 3, ships: 'Own /gf/v2/ REST.' },
			{ slug: 'cf7',           label: 'Contact Form 7', priority: 4, ships: 'No native REST — server-render only.' },
		],
	},
	{
		id: 'redirects',
		label: 'Redirects',
		icon: '↪',
		outcome: 'Astro enforces 301/302 rules at the edge, pulled from the plugin.',
		exposes: [
			'/hatch/v1/redirects',
			'301 / 302 rule list',
			'regex source patterns',
			'enforced by Astro middleware.ts',
		],
		fieldFromFeatures: (ig) => ig?.redirects,
		plugins: [
			{ slug: 'redirection',    label: 'Redirection',                 priority: 1, ships: 'Free — unlimited 301/302 rules with logs.' },
			{ slug: 'rankmath',       label: 'Rank Math (redirects)',       priority: 2, ships: 'If Rank Math\'s redirects module is active.' },
			{ slug: 'yoast_premium',  label: 'Yoast Premium (redirects)',   priority: 3, ships: 'Bundled with Yoast Premium.' },
		],
	},
	{
		id: 'woocommerce',
		label: 'E-commerce',
		icon: '🛒',
		outcome: 'Products, categories, cart, and checkout exposed over REST. Astro renders /product/<slug> live.',
		// Full endpoint list — Hatch's own /hatch/v1/store/* (nonce-friendly,
		// no consumer-key handshake needed for reads) PLUS the native
		// /wc/v3/* endpoints so devs know both are available.
		exposes: [
			'/hatch/v1/store/products',
			'/hatch/v1/store/products/{id}',
			'/hatch/v1/store/categories',
			'/hatch/v1/store/featured',
			'/wc/v3/products',
			'/wc/v3/orders',
			'/wc/v3/customers',
			'/wc/v3/coupons',
			'/wc/store/v1/cart',
			'/wc/store/v1/checkout',
		],
		fieldFromFeatures: (ig) => (ig?.woocommerce || ig?.plugins?.woocommerce) ? 'woocommerce' : 'none',
		hasLiveProbe: true,
		plugins: [
			{ slug: 'woocommerce', label: 'WooCommerce', priority: 1, ships: 'Own /wc/v3/ REST for products, orders, customers, coupons; Store API for cart + checkout.' },
		],
	},
	{
		id: 'smtp',
		label: 'Email delivery (SMTP)',
		icon: '✉',
		outcome: 'Server-side only. Astro form submissions trigger wp_mail() through your SMTP transport. No REST needed on the frontend.',
		exposes: [
			'wp_mail() transport (server-side)',
			'delivery log (admin only)',
			'failure retry (admin only)',
			'no frontend REST by design',
		],
		fieldFromFeatures: (ig) => ig?.smtp?.detected?.slug || ig?.smtp,
		plugins: [
			{ slug: 'fluent_smtp',  label: 'FluentSMTP',   priority: 1, ships: 'Free. Ties into Gmail, SES, Postmark, SendGrid, Brevo, generic SMTP. Log + retry.' },
			{ slug: 'wp_mail_smtp', label: 'WP Mail SMTP', priority: 2, ships: 'Same transports + white-label. Free tier covers most needs.' },
			{ slug: 'post_smtp',    label: 'Post SMTP',    priority: 3, ships: 'OAuth for Gmail/Outlook, mobile push alerts on failure.' },
			{ slug: 'easy_wp_smtp', label: 'Easy WP SMTP', priority: 4, ships: 'Minimal config, generic SMTP transport.' },
		],
	},
	{
		id: 'custom_fields',
		label: 'Custom Fields',
		icon: '🔧',
		outcome: 'Custom field values ride on WP core REST when the group has Show-in-REST enabled. Astro reads them at page render.',
		exposes: [
			'/wp/v2/{post_type}?acf_format=standard',
			'/wp/v2/{post_type}/{id} (fields on .acf)',
			'/hatch/v1/acf-status (admin diagnostic)',
			'repeaters + flexible content supported',
		],
		fieldFromFeatures: (ig) => ig?.custom_fields,
		plugins: [
			{ slug: 'acf_pro',   label: 'ACF Pro',              priority: 1, ships: 'All field types + repeaters + flexible content.' },
			{ slug: 'acf',       label: 'ACF (free)',           priority: 2, ships: 'Core field types + basic layouts.' },
			{ slug: 'secure_cf', label: 'Secure Custom Fields', priority: 3, ships: 'WP.org fork — same shape.' },
			{ slug: 'meta_box',  label: 'Meta Box',             priority: 4, ships: 'Rival field builder.' },
			{ slug: 'pods',      label: 'Pods',                 priority: 5, ships: 'Also handles CPTs.' },
		],
	},
	{
		id: 'cpt_manager',
		label: 'Custom Post Types',
		icon: '📄',
		outcome: 'Registered CPTs auto-picked up by Astro via WP core REST plus Hatch content router. Zero extra config.',
		exposes: [
			'/wp/v2/{cpt}',
			'/hatch/v1/content?slug={slug} (universal resolver)',
			'/hatch/v1/content/list?post_type={cpt}',
			'/hatch/v1/cpt-health (admin diagnostic)',
		],
		fieldFromFeatures: (ig) => ig?.cpt_manager,
		plugins: [
			{ slug: 'cpt_ui',     label: 'Custom Post Type UI', priority: 1, ships: 'Simple CPT + taxonomy registration.' },
			{ slug: 'jet_engine', label: 'JetEngine',           priority: 2, ships: 'Crocoblock — heavy but full-featured.' },
			{ slug: 'pods',       label: 'Pods',                priority: 3, ships: 'Also handles custom fields.' },
		],
	},
	{
		id: 'membership',
		label: 'Memberships',
		icon: '🔐',
		outcome: 'Membership tiers detected now; per-post gating enforcement on Astro lands in v0.6.',
		exposes: ['Tier list', 'Member status', 'Content gating (v0.6)'],
		comingSoon: true,
		fieldFromFeatures: (ig) => ig?.membership,
		plugins: [
			{ slug: 'memberpress',      label: 'MemberPress',          priority: 1, ships: 'Full membership + course + drip.' },
			{ slug: 'restrict_content', label: 'Restrict Content Pro', priority: 2, ships: 'Restrict Content Pro.' },
			{ slug: 'paid_memberships', label: 'Paid Memberships Pro', priority: 3, ships: 'Free tier available.' },
		],
	},
];

function CategoryCard({ cat, active, isOn, plugMap, frontendUrl }) {
	const [open, setOpen] = useState(false);
	const activePlugin = isOn ? cat.plugins.find((p) => p.slug === active) : null;
	const activeLabel = activePlugin?.label || (isOn ? active : null);
	// Only fire the live probe on the WooCommerce card once it is unfolded
	// AND the bridge is on — no wasted requests when the plugin is inactive.
	const probe = useWooProbe(cat.hasLiveProbe && open && isOn);

	return (
		<div
			style={{
				border: '1px solid var(--hx-border)',
				borderRadius: 10,
				background: 'var(--hx-surface, #fff)',
				overflow: 'hidden',
				transition: 'border-color .15s ease',
			}}
		>
			<button
				type="button"
				onClick={() => setOpen((s) => !s)}
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					width: '100%',
					padding: '14px 16px',
					background: 'transparent',
					border: 0,
					cursor: 'pointer',
					textAlign: 'left',
					color: 'var(--hx-fg)',
					gap: 12,
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
					<span style={{ color: 'var(--hx-muted)' }}><Chevron open={open} /></span>
					<span style={{ fontSize: 16 }}>{cat.icon}</span>
					<span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
						{cat.label}
					</span>
				</div>
				<span
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						padding: '3px 10px',
						borderRadius: 999,
						fontSize: 11,
						fontWeight: 600,
						flexShrink: 0,
						background: cat.comingSoon
							? 'rgba(245,158,11,0.10)'
							: (isOn ? 'rgba(16,185,129,0.10)' : 'transparent'),
						border: `1px solid ${cat.comingSoon
							? 'rgba(245,158,11,0.35)'
							: (isOn ? 'rgba(16,185,129,0.35)' : 'var(--hx-border)')}`,
						color: cat.comingSoon ? '#b45309' : (isOn ? '#047857' : 'var(--hx-muted)'),
					}}
					title={cat.comingSoon
						? 'Detection works; frontend rendering ships in a later release'
						: (isOn ? `Bridging via ${activeLabel}` : 'Install a supported plugin to enable this bridge')}
				>
					<StatusDot state={cat.comingSoon ? 'installed' : (isOn ? 'active' : 'off')} />
					{cat.comingSoon ? 'Coming soon' : (isOn ? 'Active' : 'Not detected')}
				</span>
			</button>

			{!open && (
				<div style={{ padding: '0 16px 14px', fontSize: 12, color: 'var(--hx-muted)', lineHeight: 1.5 }}>
					{isOn ? (
						<>via <strong style={{ color: 'var(--hx-fg)' }}>{activeLabel}</strong> — {cat.outcome}</>
					) : (
						cat.outcome
					)}
				</div>
			)}

			{open && (
				<div style={{ padding: '4px 16px 16px', borderTop: '1px solid var(--hx-border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
					<div style={{ fontSize: 12, color: 'var(--hx-muted)', lineHeight: 1.5, paddingTop: 12 }}>
						{cat.outcome}
					</div>

					<div>
						<div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--hx-muted)', marginBottom: 8 }}>
							Exposes as REST
						</div>
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
							{cat.exposes.map((chip) => (
								<span
									key={chip}
									style={{
										padding: '3px 8px',
										borderRadius: 4,
										border: '1px solid var(--hx-border)',
										background: isOn ? 'rgba(59,130,246,0.06)' : 'transparent',
										fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
										fontSize: 11,
										color: isOn ? '#1e40af' : 'var(--hx-muted)',
									}}
								>
									{chip}
								</span>
							))}
						</div>
					</div>

					<div>
						<div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--hx-muted)', marginBottom: 8 }}>
							Supported plugins
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
							{cat.plugins.map((p) => {
								const installed = !!plugMap[p.slug];
								const isActivePlugin = installed && p.slug === active;
								const state = isActivePlugin ? 'active' : installed ? 'installed' : 'off';
								return (
									<div
										key={p.slug}
										title={p.ships + (installed ? '' : '  ·  Not installed.')}
										style={{
											display: 'flex',
											alignItems: 'center',
											gap: 8,
											padding: '6px 8px',
											borderRadius: 6,
											border: '1px solid transparent',
											background: isActivePlugin ? 'rgba(16,185,129,0.06)' : 'transparent',
											cursor: 'help',
										}}
									>
										<StatusDot state={state} />
										<span style={{
											fontSize: 12,
											color: isActivePlugin ? 'var(--hx-fg)' : installed ? 'var(--hx-fg)' : 'var(--hx-muted)',
											fontWeight: isActivePlugin ? 600 : 500,
											flex: 1,
											minWidth: 0,
											whiteSpace: 'nowrap',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
										}}>
											{p.label}
										</span>
										{isActivePlugin && (
											<HxBadge color="green">Active</HxBadge>
										)}
										{!isActivePlugin && installed && (
											<HxBadge color="blue">Installed</HxBadge>
										)}
										{p.priority && (
											<span style={{ fontSize: 10, color: 'var(--hx-muted)', opacity: 0.7 }}>#{p.priority}</span>
										)}
									</div>
								);
							})}
						</div>
					</div>

					{!isOn && (
						<div style={{
							padding: '8px 12px',
							background: 'rgba(148,163,184,0.08)',
							border: '1px dashed var(--hx-border)',
							borderRadius: 6,
							fontSize: 12,
							color: 'var(--hx-muted)',
						}}>
							Install any plugin above to enable this bridge. Hatch auto-detects on activation.
						</div>
					)}

					{cat.hasLiveProbe && isOn && (
						<div style={{
							padding: '10px 12px',
							background: 'rgba(59,130,246,0.06)',
							border: '1px solid rgba(59,130,246,0.20)',
							borderRadius: 6,
							fontSize: 12,
							color: 'var(--hx-fg)',
							display: 'flex',
							flexDirection: 'column',
							gap: 6,
						}}>
							<div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--hx-muted)' }}>
								Live probe
							</div>
							{probe.loading && <div>Fetching from <code>/hatch/v1/store/products?per_page=1</code>…</div>}
							{probe.err && <div style={{ color: '#b91c1c' }}>Probe failed: {probe.err}</div>}
							{probe.total !== null && !probe.loading && (
								<>
									<div>
										<strong>{probe.total}</strong> published product{probe.total === 1 ? '' : 's'} exposed to Astro.
									</div>
									{probe.sample && (
										<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
											<span style={{ color: 'var(--hx-muted)' }}>Sample:</span>
											<code style={{ fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' }}>{probe.sample.slug}</code>
											{frontendUrl && (
												<a
													href={`${frontendUrl.replace(/\/$/, '')}/product/${probe.sample.slug}`}
													target="_blank"
													rel="noopener noreferrer"
													style={{ color: '#2563eb', fontWeight: 500 }}
												>
													View on frontend ↗
												</a>
											)}
										</div>
									)}
									{probe.total === 0 && (
										<div style={{ color: 'var(--hx-muted)' }}>
											No published products yet — add one in WooCommerce → Products.
										</div>
									)}
								</>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default function PluginBridge({ state }) {
	// Boot state doesn't carry integrations/plugins — fetch the /features
	// endpoint once on mount so the cards can render real "Active" / "Not
	// detected" pills without duplicating detection code on the JS side.
	const [fetched, setFetched] = useState(null);
	useEffect(() => {
		const boot = typeof window !== 'undefined' ? window.hatchBoot : null;
		if (!boot?.restUrl) return;
		fetch(`${boot.restUrl}features`, {
			headers: boot.nonce ? { 'X-WP-Nonce': boot.nonce } : {},
		})
			.then((r) => r.ok ? r.json() : null)
			.then((data) => { if (data) setFetched(data); })
			.catch(() => {});
	}, []);
	const ig = (fetched?.integrations) || state?.integrations || {};
	// Merge in a synthetic `plugins` map from the /features detected slugs
	// so the plugin-row `installed` chips light up correctly.
	const plugMap = ig?.plugins || {
		woocommerce: !!fetched?.integrations?.woocommerce,
	};
	// Astro frontend origin — used to build "View on frontend" deep-links.
	const frontendUrl = state?.connection?.frontendUrl || '';
	const activeCount = CATS.filter((c) => {
		const a = c.fieldFromFeatures(ig);
		return a && a !== 'none' && a !== false;
	}).length;

	return (
		<>
			<HxCard>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
					<div style={{ minWidth: 0, flex: 1 }}>
						<div style={{ fontSize: 16, fontWeight: 600, color: 'var(--hx-fg)', marginBottom: 4 }}>
							Plugin Bridge
						</div>
						<div style={{ fontSize: 13, color: 'var(--hx-muted)', lineHeight: 1.5 }}>
							Every WordPress plugin Hatch knows how to talk to. Install a supported plugin — Hatch detects it and exposes its data to Astro.
						</div>
					</div>
					<span style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						padding: '4px 10px',
						borderRadius: 999,
						background: 'rgba(16,185,129,0.10)',
						border: '1px solid rgba(16,185,129,0.30)',
						color: '#047857',
						fontSize: 12,
						fontWeight: 600,
					}}>
						{activeCount} / {CATS.length} bridges active
					</span>
				</div>
			</HxCard>

			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
				gap: 12,
				marginTop: 16,
			}}>
				{CATS.map((cat) => {
					const active = cat.fieldFromFeatures(ig) || 'none';
					const isOn = active && active !== 'none' && active !== false;
					return (
						<CategoryCard
							key={cat.id}
							cat={cat}
							active={active}
							isOn={isOn}
							plugMap={plugMap}
							frontendUrl={frontendUrl}
						/>
					);
				})}
			</div>

			<HxCard style={{ marginTop: 16 }}>
				<div style={{ fontSize: 14, fontWeight: 600, color: 'var(--hx-fg)', marginBottom: 4 }}>
					Gutenberg blocks styled per-theme
				</div>
				<div style={{ fontSize: 12, color: 'var(--hx-muted)', marginBottom: 12, lineHeight: 1.5 }}>
					46 core WordPress blocks get per-theme visual signatures. Writers use the standard editor; Hatch paints each block distinctively per Blog / Tech / Docs.
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{[
						{ group: 'Writing',     items: ['paragraph','heading','list','list-item','quote','pullquote','code','preformatted','verse'] },
						{ group: 'Media',       items: ['image','gallery','video','audio','cover','embed'] },
						{ group: 'Structure',   items: ['columns','column','group','separator','spacer','table','details'] },
						{ group: 'Interactive', items: ['button','buttons'] },
						{ group: 'Utility',     items: ['html','file'] },
						{ group: 'Query loop',  items: ['query','post-template','post-title','post-excerpt','post-date','post-featured-image','post-terms','post-author','post-content','query-title','query-pagination','query-pagination-next','query-pagination-previous','query-pagination-numbers','query-no-results'] },
						{ group: 'Widget',      items: ['latest-posts','categories','tag-cloud','rss','search'] },
					].map((g) => (
						<div key={g.group}>
							<div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--hx-muted)', marginBottom: 6 }}>
								{g.group} ({g.items.length})
							</div>
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
								{g.items.map((b) => (
									<span key={b} style={{
										padding: '2px 8px',
										borderRadius: 4,
										border: '1px solid var(--hx-border)',
										fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
										fontSize: 11,
										color: 'var(--hx-muted)',
									}}>core/{b}</span>
								))}
							</div>
						</div>
					))}
				</div>
			</HxCard>

			<HxCard style={{ marginTop: 16 }}>
				<div style={{ fontSize: 14, fontWeight: 600, color: 'var(--hx-fg)', marginBottom: 4 }}>
					Not yet auto-consumed on Astro
				</div>
				<div style={{ fontSize: 12, color: 'var(--hx-muted)', marginBottom: 12 }}>
					Detected in WordPress, but full Astro-side rendering is roadmap.
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					{[
						{ label: 'Per-post membership gate',       ver: 'v0.6', desc: 'Detects MemberPress/RCP/PMP; frontend enforcement lands in v0.6.' },
						{ label: 'Multilingual (Polylang / WPML)', ver: 'v0.6', desc: 'Detected via Hatch_Detector; language switcher UI = v0.6.' },
						{ label: 'Woo storefront on Astro',        ver: 'v0.7', desc: 'Product cards + checkout templates in v0.7.' },
						{ label: 'Contact Form 7 auto-render',     ver: 'docs', desc: 'CF7 has no native REST; switch to WPForms or Fluent for headless.' },
					].map((r) => (
						<div key={r.label} style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							gap: 12,
							padding: '8px 12px',
							border: '1px solid var(--hx-border)',
							borderRadius: 6,
						}}>
							<div style={{ minWidth: 0, flex: 1 }}>
								<div style={{ fontSize: 13, fontWeight: 500, color: 'var(--hx-fg)' }}>{r.label}</div>
								<div style={{ fontSize: 11, color: 'var(--hx-muted)', marginTop: 2 }}>{r.desc}</div>
							</div>
							<span style={{
								fontSize: 11,
								fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
								color: 'var(--hx-muted)',
								padding: '2px 8px',
								borderRadius: 4,
								border: '1px solid var(--hx-border)',
								flexShrink: 0,
							}}>{r.ver}</span>
						</div>
					))}
				</div>
			</HxCard>
		</>
	);
}

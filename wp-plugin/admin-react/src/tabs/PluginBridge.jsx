import { useState, useEffect, createInterpolateElement } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { HxCard, HxHead, HxBadge, HxGL, ibg } from '../components.jsx';

const MONO = 'ui-monospace,SFMono-Regular,Menlo,monospace';

/**
 * Live probe for the Hatch WooCommerce bridge. Hits /hatch/v1/store/products
 * (public read-only route) to render product count + a "View on frontend" link
 * that jumps to the Astro frontend `/product/<slug>` page for the first product.
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
		if (!restUrl) {
			setState((s) => ({ ...s, err: __('The REST address is missing from this page.', 'hatch-bridge') }));
			return;
		}
		setState((s) => ({ ...s, loading: true }));
		fetch(`${restUrl}store/products?per_page=1`, {
			headers: nonce ? { 'X-WP-Nonce': nonce } : {},
		})
			.then((r) => (r.ok
				? r.json()
				: Promise.reject(new Error(
					/* translators: %d: HTTP status code, for example 500. */
					sprintf(__('The request failed with status %d.', 'hatch-bridge'), r.status)
				))))
			.then((data) => {
				const first = Array.isArray(data?.products) && data.products[0] ? data.products[0] : null;
				setState({ loading: false, total: Number(data?.total || 0), sample: first, err: null });
			})
			.catch((err) => setState({ loading: false, total: null, sample: null, err: String(err.message || err) }));
	}, [enabled]);
	return state;
}

/**
 * Plugin Bridge: grid of category cards. Compact by default, click to unfold.
 * Each card shows the category label and a status pill. Unfolded, it lists the
 * supported plugins (with a status dot) and the endpoints Hatch uses when the
 * bridge is active.
 *
 * @since 0.7.3
 */

function StatusDot({ state }) {
	const fill = state === 'active' ? 'var(--hx-success)' : state === 'installed' ? 'var(--hx-info)' : 'transparent';
	const stroke = state === 'off' ? 'var(--hx-border)' : fill;
	return (
		<svg width="9" height="9" viewBox="0 0 10 10" style={{ flexShrink: 0 }} aria-hidden="true">
			<circle cx="5" cy="5" r="4" fill={fill} stroke={stroke} strokeWidth="1.5" />
		</svg>
	);
}

function Chevron({ open }) {
	return (
		<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
			style={{ transition: 'transform .15s ease', transform: open ? 'rotate(90deg)' : 'none' }}>
			<path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

/**
 * Clean-room line-art glyphs for the Bridge category header. Drawn fresh from
 * geometric primitives. No derivative work from Lucide, Phosphor, Feather,
 * Heroicons, or any other icon library. 18x18 viewBox, 1.5 stroke, round
 * caps and joins so the strokes read consistently at the 32-square container.
 */
function HatchIcon({ children, size = 18 }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 18 18"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			style={{ display: 'block', flexShrink: 0 }}
		>
			{children}
		</svg>
	);
}

const ICONS = {
	seo: (
		<HatchIcon>
			<circle cx="8" cy="8" r="4.5" />
			<path d="M11.4 11.4 15 15" />
		</HatchIcon>
	),
	forms: (
		<HatchIcon>
			<path d="M4 2.5h6.5L14 6v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" />
			<path d="M10.5 2.5V6H14" />
			<path d="M5.5 9.5h6M5.5 12.5h4" />
		</HatchIcon>
	),
	redirects: (
		<HatchIcon>
			<path d="M4 6h7.5a3.5 3.5 0 0 1 0 7H8.5" />
			<path d="m6.5 3.5-2.5 2.5 2.5 2.5" />
		</HatchIcon>
	),
	woocommerce: (
		<HatchIcon>
			<path d="M4 6h10l-.85 8.5a1 1 0 0 1-1 .9H5.85a1 1 0 0 1-1-.9L4 6z" />
			<path d="M6.75 6V4.25a2.25 2.25 0 0 1 4.5 0V6" />
		</HatchIcon>
	),
	smtp: (
		<HatchIcon>
			<path d="M15.5 2.5 2.5 7.75l5 1.75 2 5 6-12z" />
			<path d="m7.5 9.5 3-3" />
		</HatchIcon>
	),
	custom_fields: (
		<HatchIcon>
			<path d="M3 5h4M11 5h4" />
			<circle cx="9" cy="5" r="1.5" />
			<path d="M3 9h8M14 9h1" />
			<circle cx="12" cy="9" r="1.5" />
			<path d="M3 13h2M9 13h6" />
			<circle cx="7" cy="13" r="1.5" />
		</HatchIcon>
	),
	cpt_manager: (
		<HatchIcon>
			<path d="M9 2 2.5 5 9 8l6.5-3L9 2z" />
			<path d="M2.5 9 9 12l6.5-3" />
			<path d="M2.5 13 9 16l6.5-3" />
		</HatchIcon>
	),
	membership: (
		<HatchIcon>
			<path d="M9 2 3 4v5c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V4L9 2z" />
			<path d="m6.5 9 2 2 3.5-3.5" />
		</HatchIcon>
	),
};

/**
 * Lower-case, letters and digits only. Compares a plugin label here with the
 * provider name the PHP detector reports ("RankMath" vs "Rank Math").
 */
const norm = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// `bridgeFeature` is the `feature` name used by hatch_react_plugin_bridge() in
// dashboard.php. It is a technical key and stays untranslated.
const CATS = [
	{
		id: 'seo',
		label: __('SEO', 'hatch-bridge'),
		bridgeFeature: 'SEO + Sitemap',
		outcome: __('Meta tags, schema and sitemap data from your SEO plugin reach the Astro frontend.', 'hatch-bridge'),
		exposes: [
			'/hatch/v1/seo-head?url={url}',
			'/hatch/v1/seo-meta',
			'/hatch/v1/schema?url={url}',
			'/hatch/v1/menus/{location}',
			'/llms.txt (RankReady)',
			'/.well-known/mcp.json (RankReady)',
		],
		fieldFromFeatures: (ig) => ig?.seo?.detected?.slug || (ig?.plugins?.rankready ? 'rankready' : null),
		plugins: [
			{ slug: 'rankmath',      label: 'Rank Math',      priority: 1, note: __('Hatch reads its meta and schema data.', 'hatch-bridge') },
			{ slug: 'rankmath_pro',  label: 'Rank Math Pro',  priority: 1, note: __('Paid edition of Rank Math.', 'hatch-bridge') },
			{ slug: 'yoast',         label: 'Yoast SEO',      priority: 2, note: __('Hatch reads its meta and schema data.', 'hatch-bridge') },
			{ slug: 'yoast_premium', label: 'Yoast Premium',  priority: 2, note: __('Paid edition of Yoast SEO.', 'hatch-bridge') },
			{ slug: 'rankready',     label: 'RankReady',      priority: 3, note: __('Adds /llms.txt and /.well-known/mcp.json, plus an AI summary and FAQ schema for posts.', 'hatch-bridge') },
		],
	},
	{
		id: 'forms',
		label: __('Forms', 'hatch-bridge'),
		bridgeFeature: 'Forms',
		outcome: __('Astro draws its own form from the form schema and submits through WordPress. No plugin CSS or JS is sent to the frontend.', 'hatch-bridge'),
		exposes: [
			'/hatch/v1/forms',
			'/hatch/v1/forms/{provider}/{id}',
			'/hatch/v1/forms/{provider}/{id}/submit',
		],
		fieldFromFeatures: (ig) => ig?.forms?.detected?.slug,
		plugins: [
			{ slug: 'wpforms_pro',   label: 'WPForms Pro',    priority: 1, note: __('Paid edition of WPForms.', 'hatch-bridge') },
			{ slug: 'wpforms',       label: 'WPForms Lite',   priority: 1, note: __('Free edition of WPForms.', 'hatch-bridge') },
			{ slug: 'fluent_forms',  label: 'Fluent Forms',   priority: 2, note: __('Hatch reads its form schema.', 'hatch-bridge') },
			{ slug: 'gravity_forms', label: 'Gravity Forms',  priority: 3, note: __('Hatch reads its form schema.', 'hatch-bridge') },
			{ slug: 'cf7',           label: 'Contact Form 7', priority: 4, note: __('Hatch reads its form schema.', 'hatch-bridge') },
		],
	},
	{
		id: 'redirects',
		label: __('Redirects', 'hatch-bridge'),
		bridgeFeature: 'Redirects',
		outcome: __('Astro applies the redirect rules from your plugin before it serves a page.', 'hatch-bridge'),
		exposes: [
			'/hatch/v1/redirects',
		],
		fieldFromFeatures: (ig) => (ig?.plugins?.redirection ? 'redirection' : null),
		plugins: [
			{ slug: 'redirection',    label: 'Redirection',                 priority: 1, note: __('Hatch reads its redirect rules.', 'hatch-bridge') },
			{ slug: 'rankmath',       label: 'Rank Math (redirects)',       priority: 2, note: __('Used when the redirects module in Rank Math is active.', 'hatch-bridge') },
			{ slug: 'yoast_premium',  label: 'Yoast Premium (redirects)',   priority: 3, note: __('Used when Yoast Premium is active.', 'hatch-bridge') },
		],
	},
	{
		id: 'woocommerce',
		label: __('E-commerce', 'hatch-bridge'),
		bridgeFeature: 'eCommerce',
		outcome: __('Products, categories, cart and checkout are available over REST. Astro draws each product page from live data.', 'hatch-bridge'),
		// Hatch's own /hatch/v1/store/* routes (no consumer-key handshake needed
		// for reads) plus the native /wc/v3/* and Store API routes.
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
		fieldFromFeatures: (ig) => ((ig?.woocommerce || ig?.plugins?.woocommerce) ? 'woocommerce' : null),
		hasLiveProbe: true,
		plugins: [
			{ slug: 'woocommerce', label: 'WooCommerce', priority: 1, note: __('Provides the /wc/v3 and Store API routes listed above.', 'hatch-bridge') },
		],
	},
	{
		id: 'smtp',
		label: __('Email delivery (SMTP)', 'hatch-bridge'),
		outcome: __('Server side only. Email sent from WordPress, including Astro form submissions, goes through your SMTP plugin. Nothing is exposed over REST.', 'hatch-bridge'),
		exposes: [
			'wp_mail()',
		],
		fieldFromFeatures: (ig) => (ig?.plugins?.fluent_smtp ? 'fluent_smtp' : null),
		plugins: [
			{ slug: 'fluent_smtp',  label: 'FluentSMTP',   priority: 1, note: __('Sends WordPress email through an SMTP or API provider.', 'hatch-bridge') },
			{ slug: 'wp_mail_smtp', label: 'WP Mail SMTP', priority: 2, note: __('Sends WordPress email through an SMTP or API provider.', 'hatch-bridge') },
			{ slug: 'post_smtp',    label: 'Post SMTP',    priority: 3, note: __('Sends WordPress email through an SMTP or API provider.', 'hatch-bridge') },
			{ slug: 'easy_wp_smtp', label: 'Easy WP SMTP', priority: 4, note: __('Sends WordPress email through an SMTP or API provider.', 'hatch-bridge') },
		],
	},
	{
		id: 'custom_fields',
		label: __('Custom Fields', 'hatch-bridge'),
		bridgeFeature: 'Custom Fields',
		outcome: __('Custom field values travel with WordPress core REST when the field group is set to show in REST. Astro reads them when it draws a page.', 'hatch-bridge'),
		exposes: [
			'/wp/v2/{post_type}',
			'/wp/v2/{post_type}/{id}',
			'/hatch/v1/acf-status',
		],
		fieldFromFeatures: (ig) => (ig?.plugins?.acf ? 'acf' : null),
		plugins: [
			{ slug: 'acf_pro',   label: 'ACF Pro',              priority: 1, note: __('Paid edition of Advanced Custom Fields.', 'hatch-bridge') },
			{ slug: 'acf',       label: 'ACF (free)',           priority: 2, note: __('Advanced Custom Fields from WordPress.org.', 'hatch-bridge') },
			{ slug: 'secure_cf', label: 'Secure Custom Fields', priority: 3, note: __('WordPress.org fork of Advanced Custom Fields.', 'hatch-bridge') },
			{ slug: 'meta_box',  label: 'Meta Box',             priority: 4, note: __('Custom field builder.', 'hatch-bridge') },
			{ slug: 'pods',      label: 'Pods',                 priority: 5, note: __('Custom field and post type builder.', 'hatch-bridge') },
		],
	},
	{
		id: 'cpt_manager',
		label: __('Custom Post Types', 'hatch-bridge'),
		outcome: __('Custom post types that show in the REST API reach Astro through WordPress core REST and the Hatch content routes.', 'hatch-bridge'),
		exposes: [
			'/wp/v2/{cpt}',
			'/hatch/v1/content?slug={slug}',
			'/hatch/v1/content/list?post_type={cpt}',
			'/hatch/v1/cpt-health',
		],
		fieldFromFeatures: () => null,
		plugins: [
			{ slug: 'cpt_ui',     label: 'Custom Post Type UI', priority: 1, note: __('Registers post types and taxonomies.', 'hatch-bridge') },
			{ slug: 'jet_engine', label: 'JetEngine',           priority: 2, note: __('Registers post types, taxonomies and fields.', 'hatch-bridge') },
			{ slug: 'pods',       label: 'Pods',                priority: 3, note: __('Custom field and post type builder.', 'hatch-bridge') },
		],
	},
	{
		id: 'membership',
		label: __('Memberships', 'hatch-bridge'),
		bridgeFeature: 'Memberships',
		outcome: __('Membership plugins are detected. Hatch does not enforce content gating on the frontend yet.', 'hatch-bridge'),
		exposes: ['/hatch/v1/membership/check'],
		comingSoon: true,
		fieldFromFeatures: () => null,
		plugins: [
			{ slug: 'memberpress',      label: 'MemberPress',          priority: 1, note: __('Membership plugin.', 'hatch-bridge') },
			{ slug: 'restrict_content', label: 'Restrict Content Pro', priority: 2, note: __('Membership plugin.', 'hatch-bridge') },
			{ slug: 'paid_memberships', label: 'Paid Memberships Pro', priority: 3, note: __('Membership plugin.', 'hatch-bridge') },
		],
	},
];

/**
 * Work out whether a category is on and which plugin provides it. The
 * /features payload only names a few plugins, so the list PHP puts in boot
 * state (`state.pluginBridge`) fills in the rest.
 *
 * @return {{slug: (string|null), label: (string|null)}|null}
 */
function detectCategory(cat, ig, bridgeRows, cpts) {
	const slug = cat.fieldFromFeatures(ig);
	if (typeof slug === 'string' && slug) {
		const known = cat.plugins.find((p) => p.slug === slug);
		return { slug, label: known ? known.label : slug };
	}
	if (cat.id === 'cpt_manager') {
		return cpts.length > 0
			? {
				slug: null,
				label: sprintf(
					/* translators: %d: number of custom post types registered on this site. */
					_n('%d custom post type', '%d custom post types', cpts.length, 'hatch-bridge'),
					cpts.length
				),
			}
			: null;
	}
	const row = bridgeRows.find((r) => r && r.feature === cat.bridgeFeature && r.detected);
	return row ? { slug: null, label: row.providerName || row.n || null } : null;
}

/**
 * Category card. Parallel-designed on the shared primitives: HxCard as the
 * shell, HxHead for the icon-box + title + status action, HxGL for the
 * sub-section labels inside the reveal panel. The whole card is the accordion
 * trigger.
 */
function CategoryCard({ cat, detected, plugMap, frontendUrl }) {
	const [open, setOpen] = useState(false);
	const isOn = !!detected;
	const active = detected?.slug || null;
	const activeLabel = detected?.label || null;
	const probe = useWooProbe(!!cat.hasLiveProbe && open && isOn);
	const toggle = () => setOpen((s) => !s);
	const monoStyle = { fontFamily: MONO };

	// When PHP reports a provider by name only, highlight the first roster entry
	// whose label starts with that name.
	const nameMatchIdx = !active && activeLabel
		? cat.plugins.findIndex((p) => norm(p.label).startsWith(norm(activeLabel)))
		: -1;

	const statusColor = cat.comingSoon ? 'yellow' : (isOn ? 'green' : 'neutral');
	const statusText  = cat.comingSoon ? __('Coming soon', 'hatch-bridge') : (isOn ? __('Active', 'hatch-bridge') : __('Not detected', 'hatch-bridge'));
	const statusTitle = cat.comingSoon
		? __('Detection works. Frontend support is not available yet.', 'hatch-bridge')
		: (isOn
			/* translators: %s: name of the plugin that provides this bridge. */
			? sprintf(__('Bridging through %s', 'hatch-bridge'), activeLabel || cat.label)
			: __('Install a supported plugin to enable this bridge.', 'hatch-bridge'));

	// HxHead action slot: status badge + chevron. The whole card is the
	// accordion trigger so the chevron is visual, not a separate control.
	const headAction = (
		<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
			<span title={statusTitle}>
				<HxBadge color={statusColor}>{statusText}</HxBadge>
			</span>
			<span style={{ color: 'var(--hx-muted)' }} aria-hidden="true">
				<Chevron open={open} />
			</span>
		</div>
	);

	// Icon colour drives HxHead's ibg() tint, which needs a hex value. Green when
	// on, muted when off, amber for a category that is coming soon.
	const iconColor = cat.comingSoon ? '#d97706' : (isOn ? '#16a34a' : 'var(--hx-muted)');
	const desc = isOn && activeLabel
		/* translators: 1: plugin name, 2: sentence describing what the bridge does. */
		? sprintf(__('Through %1$s. %2$s', 'hatch-bridge'), activeLabel, cat.outcome)
		: cat.outcome;

	return (
		<HxCard style={{ padding: 0, overflow: 'hidden' }}>
			<button
				type="button"
				onClick={toggle}
				aria-expanded={open}
				aria-controls={`bridge-${cat.id}-panel`}
				style={{
					width: '100%',
					background: 'transparent',
					border: 0,
					padding: 22,
					cursor: 'pointer',
					textAlign: 'start',
					fontFamily: 'inherit',
					color: 'var(--hx-fg)',
				}}
			>
				<HxHead
					iconChildren={ICONS[cat.id]}
					iconColor={iconColor}
					title={cat.label}
					desc={desc}
					mb={0}
					action={headAction}
				/>
			</button>

			{open && (
				<div
					id={`bridge-${cat.id}-panel`}
					style={{
						borderTop: '1px solid var(--hx-border)',
						padding: 22,
						display: 'flex',
						flexDirection: 'column',
						gap: 6,
					}}
				>
					<div>
						<HxGL>{__('Endpoints and hooks', 'hatch-bridge')}</HxGL>
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
							{cat.exposes.map((chip) => (
								<HxBadge key={chip} color="mono">{chip}</HxBadge>
							))}
						</div>
					</div>

					<div>
						<HxGL>{__('Supported plugins', 'hatch-bridge')}</HxGL>
						<div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
							{cat.plugins.map((p, idx) => {
								const installed = !!plugMap[p.slug] || p.slug === active;
								const isActivePlugin = (!!active && p.slug === active) || idx === nameMatchIdx;
								const dotState = isActivePlugin ? 'active' : installed ? 'installed' : 'off';
								const last = idx === cat.plugins.length - 1;
								return (
									<div
										key={p.slug}
										title={installed || isActivePlugin
											? p.note
											/* translators: %s: short description of a plugin. */
											: sprintf(__('%s Not installed.', 'hatch-bridge'), p.note)}
										style={{
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'space-between',
											gap: 12,
											padding: '10px 0',
											borderBottom: last ? 'none' : '1px solid var(--hx-border)',
											cursor: 'help',
										}}
									>
										<div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
											<StatusDot state={dotState} />
											<span
												className="hx-label"
												style={{
													color: 'var(--hx-fg)',
													fontWeight: isActivePlugin ? 600 : 500,
													whiteSpace: 'nowrap',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
												}}
											>
												{p.label}
											</span>
										</div>
										<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
											{isActivePlugin && <HxBadge color="green">{__('Active', 'hatch-bridge')}</HxBadge>}
											{!isActivePlugin && installed && <HxBadge color="blue">{__('Installed', 'hatch-bridge')}</HxBadge>}
											{p.priority && (
												<span
													title={__('Detection order. Lower numbers are checked first.', 'hatch-bridge')}
													style={{ fontSize: 11, color: 'var(--hx-subtle)' }}
												>
													{`#${p.priority}`}
												</span>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{!isOn && !cat.comingSoon && (
						<div
							style={{
								marginTop: 6,
								padding: '10px 12px',
								borderRadius: 10,
								background: 'var(--hx-surface-2)',
								border: '1px dashed var(--hx-border-2)',
								fontSize: 12,
								color: 'var(--hx-muted)',
								lineHeight: 1.5,
							}}
						>
							{__('Install and activate any plugin above and Hatch detects it automatically.', 'hatch-bridge')}
						</div>
					)}

					{cat.hasLiveProbe && isOn && (
						<div
							style={{
								marginTop: 6,
								padding: '12px 14px',
								borderRadius: 10,
								background: ibg('#2563eb'),
								border: '1px solid var(--hx-border)',
								fontSize: 12,
								color: 'var(--hx-fg)',
								display: 'flex',
								flexDirection: 'column',
								gap: 6,
							}}
						>
							<HxGL>{__('Live check', 'hatch-bridge')}</HxGL>
							{probe.loading && (
								<div>
									{createInterpolateElement(
										__('Fetching from <code>/hatch/v1/store/products?per_page=1</code>...', 'hatch-bridge'),
										{ code: <code style={monoStyle} /> }
									)}
								</div>
							)}
							{probe.err && (
								<div style={{ color: 'var(--hx-danger)' }}>
									{
										/* translators: %s: error message. */
										sprintf(__('The check failed. %s', 'hatch-bridge'), probe.err)
									}
								</div>
							)}
							{probe.total !== null && !probe.loading && (
								<>
									<div>
										{sprintf(
											/* translators: %d: number of published products. */
											_n('%d published product is available to Astro.', '%d published products are available to Astro.', probe.total, 'hatch-bridge'),
											probe.total
										)}
									</div>
									{probe.sample && (
										<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
											<span style={{ color: 'var(--hx-muted)' }}>{__('Sample:', 'hatch-bridge')}</span>
											<code style={monoStyle}>{probe.sample.slug}</code>
											{frontendUrl && (
												<a
													href={`${frontendUrl.replace(/\/$/, '')}/product/${probe.sample.slug}`}
													target="_blank"
													rel="noopener noreferrer"
													onClick={(e) => e.stopPropagation()}
													style={{ color: 'var(--hx-info)', fontWeight: 500 }}
												>
													{__('View on frontend', 'hatch-bridge')}
												</a>
											)}
										</div>
									)}
									{probe.total === 0 && (
										<div style={{ color: 'var(--hx-muted)' }}>
											{__('No published products yet. Add one in WooCommerce under Products.', 'hatch-bridge')}
										</div>
									)}
								</>
							)}
						</div>
					)}
				</div>
			)}
		</HxCard>
	);
}

/**
 * Master toggle: narrow the Gutenberg inserter to the core blocks Hatch styles
 * in the Astro frontend. Ships default OFF. Existing content is never touched;
 * only the inserter list for NEW blocks shrinks. Backed by the
 * `hatch_blocks_disable_unsupported` option via `blocks.disable_unsupported`
 * in the settings map.
 *
 * @since 0.7.5
 */
function SupportedBlocksToggle({ initialOn, count, list }) {
	const [on, setOn] = useState(!!initialOn);
	const [expanded, setExpanded] = useState(false);
	const [saving, setSaving] = useState(false);
	const [err, setErr] = useState(null);
	const boot = typeof window !== 'undefined' ? window.hatchBoot : null;
	const restUrl = boot?.restUrl;
	const nonce = boot?.nonce;

	const save = (next) => {
		if (!restUrl) return;
		setSaving(true);
		setErr(null);
		fetch(`${restUrl}options`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(nonce ? { 'X-WP-Nonce': nonce } : {}),
			},
			body: JSON.stringify({ 'blocks.disable_unsupported': !!next }),
		})
			.then((r) => (r.ok
				? r.json()
				: Promise.reject(new Error(
					/* translators: %d: HTTP status code, for example 500. */
					sprintf(__('The request failed with status %d.', 'hatch-bridge'), r.status)
				))))
			.then(() => { setOn(!!next); })
			.catch((e) => setErr(String(e.message || e)))
			.finally(() => setSaving(false));
	};

	const hasList = Array.isArray(list) && list.length > 0;
	const total = hasList ? list.length : count;

	return (
		<HxCard>
			<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
				<div style={{ minWidth: 0, flex: 1 }}>
					<div style={{ fontSize: 15, fontWeight: 600, color: 'var(--hx-fg)', marginBottom: 4 }}>
						{__('Supported Gutenberg blocks', 'hatch-bridge')}
					</div>
					<div style={{ fontSize: 12, color: 'var(--hx-muted)', lineHeight: 1.5, marginBottom: 8 }}>
						{sprintf(
							/* translators: %d: number of core blocks Hatch styles for the frontend. */
							_n(
								'When on, the block inserter offers only the %d core block that Hatch styles for the frontend. Existing content stays as it is.',
								'When on, the block inserter offers only the %d core blocks that Hatch styles for the frontend. Existing content stays as it is.',
								total,
								'hatch-bridge'
							),
							total
						)}
					</div>
					{err && (
						<div style={{ fontSize: 11, color: 'var(--hx-danger)', marginBottom: 8 }}>
							{
								/* translators: %s: error message. */
								sprintf(__('Save failed. %s', 'hatch-bridge'), err)
							}
						</div>
					)}
					{hasList && (
						<button
							type="button"
							onClick={() => setExpanded((v) => !v)}
							aria-expanded={expanded}
							style={{
								background: 'none',
								border: 'none',
								padding: 0,
								cursor: 'pointer',
								color: 'var(--hx-muted)',
								fontSize: 11,
								textDecoration: 'underline',
							}}
						>
							{expanded
								? __('Hide the list of supported blocks', 'hatch-bridge')
								: __('Show the list of supported blocks', 'hatch-bridge')}
						</button>
					)}
					{expanded && hasList && (
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
							{list.map((slug) => (
								<span key={slug} style={{
									padding: '2px 8px',
									borderRadius: 4,
									border: '1px solid var(--hx-border)',
									fontFamily: MONO,
									fontSize: 11,
									color: 'var(--hx-muted)',
								}}>{slug}</span>
							))}
						</div>
					)}
				</div>
				<label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1 }}>
					<span style={{ fontSize: 12, color: 'var(--hx-muted)' }}>
						{on ? __('On', 'hatch-bridge') : __('Off', 'hatch-bridge')}
					</span>
					<input
						type="checkbox"
						checked={on}
						disabled={saving}
						onChange={(e) => save(e.target.checked)}
						aria-label={__('Limit the block inserter to supported blocks', 'hatch-bridge')}
					/>
				</label>
			</div>
		</HxCard>
	);
}

export default function PluginBridge({ state }) {
	// Boot state carries the PHP plugin list (`pluginBridge`) but not the
	// integrations detail, so fetch /features once on mount for the "Active" and
	// "Not detected" pills.
	const [fetched, setFetched] = useState(null);
	useEffect(() => {
		const boot = typeof window !== 'undefined' ? window.hatchBoot : null;
		if (!boot?.restUrl) return;
		fetch(`${boot.restUrl}features`, {
			headers: boot.nonce ? { 'X-WP-Nonce': boot.nonce } : {},
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => { if (data) setFetched(data); })
			.catch(() => {});
	}, []);
	const ig = fetched?.integrations || state?.integrations || {};
	// Plugin detection map from /features so the plugin-row "Installed" chips light up.
	const plugMap = ig?.plugins || {};
	const bridgeRows = Array.isArray(state?.pluginBridge) ? state.pluginBridge : [];
	const cpts = Array.isArray(fetched?.cpts) ? fetched.cpts : [];
	// Astro frontend origin, used to build "View on frontend" links.
	const frontendUrl = state?.connection?.frontendUrl || '';

	const detections = CATS.map((c) => detectCategory(c, ig, bridgeRows, cpts));
	const activeCount = detections.filter(Boolean).length;

	const blocksState = state?.blocks || {};
	const supportedList = Array.isArray(blocksState.supported_list) ? blocksState.supported_list : [];
	const supportedCount = typeof blocksState.supported_count === 'number' ? blocksState.supported_count : supportedList.length;

	return (
		<>
			<SupportedBlocksToggle
				initialOn={!!blocksState.disable_unsupported}
				count={supportedCount}
				list={supportedList}
			/>

			<div style={{ marginTop: 16 }} />

			<HxCard>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
					<div style={{ minWidth: 0, flex: 1 }}>
						<div style={{ fontSize: 16, fontWeight: 600, color: 'var(--hx-fg)', marginBottom: 4 }}>
							{__('Plugin Bridge', 'hatch-bridge')}
						</div>
						<div style={{ fontSize: 13, color: 'var(--hx-muted)', lineHeight: 1.5 }}>
							{__('These are the plugins Hatch can read from. Install one and Hatch detects it and passes its data to your Astro frontend.', 'hatch-bridge')}
						</div>
					</div>
					<span style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						padding: '4px 10px',
						borderRadius: 999,
						background: 'var(--hx-success-subtle)',
						border: '1px solid var(--hx-success)',
						color: 'var(--hx-success)',
						fontSize: 12,
						fontWeight: 600,
					}}>
						{sprintf(
							/* translators: 1: number of active bridges, 2: total number of bridges. */
							__('%1$d of %2$d bridges active', 'hatch-bridge'),
							activeCount,
							CATS.length
						)}
					</span>
				</div>
			</HxCard>

			<div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
				gap: 12,
				marginTop: 16,
			}}>
				{CATS.map((cat, i) => (
					<CategoryCard
						key={cat.id}
						cat={cat}
						detected={detections[i]}
						plugMap={plugMap}
						frontendUrl={frontendUrl}
					/>
				))}
			</div>
		</>
	);
}

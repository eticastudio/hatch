import { useState, useEffect } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { HxCard, HxHead, HxRow, HxBadge, HxGL, HxToggle, HxIcon, HxNotice, HxSpinner, HxCode, HxDisclosure } from '../components.jsx';
import { IC } from '../icons';

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
			setState((s) => ({ ...s, err: __('The REST address is missing from this page.', 'hatch-connect') }));
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
					sprintf(__('The request failed with status %d.', 'hatch-connect'), r.status)
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

// Category glyphs, all from the shared Lucide set in ../icons.
const ICONS = {
	seo: IC.search,
	forms: IC.fileText,
	redirects: IC.cornerUpLeft,
	woocommerce: IC.shoppingBag,
	smtp: IC.send,
	custom_fields: IC.slidersHorizontal,
	cpt_manager: IC.layers,
	membership: IC.shieldUser,
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
		label: __('SEO', 'hatch-connect'),
		bridgeFeature: 'SEO + Sitemap',
		outcome: __('Titles, descriptions and search data from your SEO plugin reach your frontend.', 'hatch-connect'),
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
			{ slug: 'rankmath',      label: 'Rank Math',      priority: 1, note: __('Hatch reads its titles, descriptions and search data.', 'hatch-connect') },
			{ slug: 'rankmath_pro',  label: 'Rank Math Pro',  priority: 1, note: __('Paid edition of Rank Math.', 'hatch-connect') },
			{ slug: 'yoast',         label: 'Yoast SEO',      priority: 2, note: __('Hatch reads its titles, descriptions and search data.', 'hatch-connect') },
			{ slug: 'yoast_premium', label: 'Yoast Premium',  priority: 2, note: __('Paid edition of Yoast SEO.', 'hatch-connect') },
			{ slug: 'rankready',     label: 'RankReady',      priority: 3, note: __('Adds /llms.txt and /.well-known/mcp.json, plus an AI summary and FAQ schema for posts.', 'hatch-connect') },
		],
	},
	{
		id: 'forms',
		label: __('Forms', 'hatch-connect'),
		bridgeFeature: 'Forms',
		outcome: __('Your frontend shows its own form and sends entries to WordPress. No styles or scripts from the form plugin are sent to the frontend.', 'hatch-connect'),
		exposes: [
			'/hatch/v1/forms',
			'/hatch/v1/forms/{provider}/{id}',
			'/hatch/v1/forms/{provider}/{id}/submit',
		],
		fieldFromFeatures: (ig) => ig?.forms?.detected?.slug,
		plugins: [
			{ slug: 'wpforms_pro',   label: 'WPForms Pro',    priority: 1, note: __('Paid edition of WPForms.', 'hatch-connect') },
			{ slug: 'wpforms',       label: 'WPForms Lite',   priority: 1, note: __('Free edition of WPForms.', 'hatch-connect') },
			{ slug: 'fluent_forms',  label: 'Fluent Forms',   priority: 2, note: __('Hatch reads its form fields.', 'hatch-connect') },
			{ slug: 'gravity_forms', label: 'Gravity Forms',  priority: 3, note: __('Hatch reads its form fields.', 'hatch-connect') },
			{ slug: 'cf7',           label: 'Contact Form 7', priority: 4, note: __('Hatch reads its form fields.', 'hatch-connect') },
		],
	},
	{
		id: 'redirects',
		label: __('Redirects', 'hatch-connect'),
		bridgeFeature: 'Redirects',
		outcome: __('Your frontend follows the redirect rules from your plugin before it shows a page.', 'hatch-connect'),
		exposes: [
			'/hatch/v1/redirects',
		],
		fieldFromFeatures: (ig) => (ig?.plugins?.redirection ? 'redirection' : null),
		plugins: [
			{ slug: 'redirection',    label: 'Redirection',                 priority: 1, note: __('Hatch reads its redirects.', 'hatch-connect') },
			{ slug: 'rankmath',       label: 'Rank Math (redirects)',       priority: 2, note: __('Used when the redirects module in Rank Math is active.', 'hatch-connect') },
			{ slug: 'yoast_premium',  label: 'Yoast Premium (redirects)',   priority: 3, note: __('Used when Yoast Premium is active.', 'hatch-connect') },
		],
	},
	{
		id: 'woocommerce',
		label: __('E-commerce', 'hatch-connect'),
		bridgeFeature: 'eCommerce',
		outcome: __('Products, categories, cart and checkout reach your frontend. Each product page shows live data from your shop.', 'hatch-connect'),
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
			{ slug: 'woocommerce', label: 'WooCommerce', priority: 1, note: __('Gives the frontend access to your products and checkout.', 'hatch-connect') },
		],
	},
	{
		id: 'smtp',
		label: __('Email delivery (SMTP)', 'hatch-connect'),
		outcome: __('Works on your WordPress server only. Email from WordPress, including form entries from your frontend, goes through your email plugin. Nothing is shared with the frontend.', 'hatch-connect'),
		exposes: [
			'wp_mail()',
		],
		fieldFromFeatures: (ig) => (ig?.plugins?.fluent_smtp ? 'fluent_smtp' : null),
		plugins: [
			{ slug: 'fluent_smtp',  label: 'FluentSMTP',   priority: 1, note: __('Sends WordPress email through your email service.', 'hatch-connect') },
			{ slug: 'wp_mail_smtp', label: 'WP Mail SMTP', priority: 2, note: __('Sends WordPress email through your email service.', 'hatch-connect') },
			{ slug: 'post_smtp',    label: 'Post SMTP',    priority: 3, note: __('Sends WordPress email through your email service.', 'hatch-connect') },
			{ slug: 'easy_wp_smtp', label: 'Easy WP SMTP', priority: 4, note: __('Sends WordPress email through your email service.', 'hatch-connect') },
		],
	},
	{
		id: 'custom_fields',
		label: __('Custom Fields', 'hatch-connect'),
		bridgeFeature: 'Custom Fields',
		outcome: __('Your custom field values reach the frontend when the field group is set to show in REST. The frontend reads them when it shows a page.', 'hatch-connect'),
		exposes: [
			'/wp/v2/{post_type}',
			'/wp/v2/{post_type}/{id}',
			'/hatch/v1/acf-status',
		],
		fieldFromFeatures: (ig) => (ig?.plugins?.acf ? 'acf' : null),
		plugins: [
			{ slug: 'acf_pro',   label: 'ACF Pro',              priority: 1, note: __('Paid edition of Advanced Custom Fields.', 'hatch-connect') },
			{ slug: 'acf',       label: 'ACF (free)',           priority: 2, note: __('Advanced Custom Fields from WordPress.org.', 'hatch-connect') },
			{ slug: 'secure_cf', label: 'Secure Custom Fields', priority: 3, note: __('WordPress.org fork of Advanced Custom Fields.', 'hatch-connect') },
			{ slug: 'meta_box',  label: 'Meta Box',             priority: 4, note: __('Custom field builder.', 'hatch-connect') },
			{ slug: 'pods',      label: 'Pods',                 priority: 5, note: __('Custom field and post type builder.', 'hatch-connect') },
		],
	},
	{
		id: 'cpt_manager',
		label: __('Custom Post Types', 'hatch-connect'),
		outcome: __('Custom post types that are set to show in REST reach your frontend.', 'hatch-connect'),
		exposes: [
			'/wp/v2/{cpt}',
			'/hatch/v1/content?slug={slug}',
			'/hatch/v1/content/list?post_type={cpt}',
			'/hatch/v1/cpt-health',
		],
		fieldFromFeatures: () => null,
		plugins: [
			{ slug: 'cpt_ui',     label: 'Custom Post Type UI', priority: 1, note: __('Registers post types and taxonomies.', 'hatch-connect') },
			{ slug: 'jet_engine', label: 'JetEngine',           priority: 2, note: __('Registers post types, taxonomies and fields.', 'hatch-connect') },
			{ slug: 'pods',       label: 'Pods',                priority: 3, note: __('Custom field and post type builder.', 'hatch-connect') },
		],
	},
	{
		id: 'membership',
		label: __('Memberships', 'hatch-connect'),
		bridgeFeature: 'Memberships',
		outcome: __('Hatch can see your membership plugin, but it does not yet hide members-only content on the frontend.', 'hatch-connect'),
		exposes: ['/hatch/v1/membership/check'],
		comingSoon: true,
		fieldFromFeatures: () => null,
		plugins: [
			{ slug: 'memberpress',      label: 'MemberPress',          priority: 1, note: __('Membership plugin.', 'hatch-connect') },
			{ slug: 'restrict_content', label: 'Restrict Content Pro', priority: 2, note: __('Membership plugin.', 'hatch-connect') },
			{ slug: 'paid_memberships', label: 'Paid Memberships Pro', priority: 3, note: __('Membership plugin.', 'hatch-connect') },
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
	if (typeof slug === 'string' && slug && slug !== 'none') {
		const known = cat.plugins.find((p) => p.slug === slug);
		return { slug, label: known ? known.label : slug };
	}
	if (cat.id === 'cpt_manager') {
		return cpts.length > 0
			? {
				slug: null,
				label: sprintf(
					/* translators: %d: number of custom post types registered on this site. */
					_n('%d custom post type', '%d custom post types', cpts.length, 'hatch-connect'),
					cpts.length
				),
			}
			: null;
	}
	const row = bridgeRows.find((r) => r && r.feature === cat.bridgeFeature && r.detected);
	return row ? { slug: null, label: row.providerName || row.n || null } : null;
}

/**
 * One category row inside the "Plugin connections" card. HxHead is the row
 * header (icon-box, title, status badge, chevron), the whole row header is the
 * accordion trigger, and the reveal panel is built from HxGL, HxRow, HxBadge
 * and HxNotice. Rows are divided by a 1px hairline rather than being 8 cards.
 */
function CategoryRow({ cat, detected, plugMap, frontendUrl, checking, first }) {
	const [open, setOpen] = useState(false);
	const isOn = !!detected;
	const active = detected?.slug || null;
	const activeLabel = detected?.label || null;
	const probe = useWooProbe(!!cat.hasLiveProbe && open && isOn);

	// When PHP reports a provider by name only, highlight the first roster entry
	// whose label starts with that name.
	const nameMatchIdx = !active && activeLabel
		? cat.plugins.findIndex((p) => norm(p.label).startsWith(norm(activeLabel)))
		: -1;

	const isChecking = checking && !isOn && !cat.comingSoon;
	const statusColor = cat.comingSoon ? 'yellow' : (isOn ? 'green' : 'neutral');
	const statusText = cat.comingSoon
		? __('Coming soon', 'hatch-connect')
		: (isChecking ? __('Checking', 'hatch-connect') : (isOn ? __('Active', 'hatch-connect') : __('Not detected', 'hatch-connect')));
	const statusTitle = cat.comingSoon
		? __('Hatch can see it. Frontend support is not ready yet.', 'hatch-connect')
		: (isOn
			/* translators: %s: name of the plugin that provides this bridge. */
			? sprintf(__('Connected through %s', 'hatch-connect'), activeLabel || cat.label)
			: __('Install a supported plugin to turn this on.', 'hatch-connect'));

	const headAction = (
		<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
			<span title={statusTitle}>
				<HxBadge color={statusColor}>{statusText}</HxBadge>
			</span>
			<HxIcon size={14} sw={2.2} color="var(--hx-muted)" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s var(--hx-ease)' }}>{IC.chevronRight}</HxIcon>
		</div>
	);

	// Icon colour drives HxHead's ibg() tint: green when on, neutral when off,
	// amber for a category that is coming soon.
	const iconColor = cat.comingSoon ? '#d97706' : (isOn ? '#16a34a' : '#737373');
	const desc = isOn && activeLabel
		/* translators: 1: plugin name, 2: sentence describing what the bridge does. */
		? sprintf(__('Through %1$s. %2$s', 'hatch-connect'), activeLabel, cat.outcome)
		: cat.outcome;

	return (
		<div style={{ borderTop: first ? 'none' : '1px solid var(--hx-border)' }}>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				aria-controls={`bridge-${cat.id}-panel`}
				style={{
					width: '100%',
					background: 'transparent',
					border: 0,
					padding: '16px 0',
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
					nowrap
					action={headAction}
				/>
			</button>

			{open && (
				<div id={`bridge-${cat.id}-panel`} style={{ paddingBottom: 16 }}>
					<HxGL>{__('Technical details', 'hatch-connect')}</HxGL>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
						{cat.exposes.map((chip) => (
							<HxBadge key={chip} color="mono">{chip}</HxBadge>
						))}
					</div>

					<HxGL>{__('Supported plugins', 'hatch-connect')}</HxGL>
					{cat.plugins.map((p, idx) => {
						const installed = !!plugMap[p.slug] || p.slug === active;
						const isActivePlugin = (!!active && p.slug === active) || idx === nameMatchIdx;
						const dotState = isActivePlugin ? 'active' : installed ? 'installed' : 'off';
						return (
							<HxRow
								key={p.slug}
								last={idx === cat.plugins.length - 1}
								label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><StatusDot state={dotState} />{p.label}</span>}
								desc={installed || isActivePlugin
									? p.note
									/* translators: %s: short description of a plugin. */
									: sprintf(__('%s Not installed.', 'hatch-connect'), p.note)}
							>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
									{isActivePlugin && <HxBadge color="green">{__('Active', 'hatch-connect')}</HxBadge>}
									{!isActivePlugin && installed && <HxBadge color="blue">{__('Installed', 'hatch-connect')}</HxBadge>}
									{p.priority && (
										<span
											className="hx-help"
											title={__('Check order. Hatch tries lower numbers first.', 'hatch-connect')}
											style={{ color: 'var(--hx-subtle)' }}
										>
											{`#${p.priority}`}
										</span>
									)}
								</div>
							</HxRow>
						);
					})}

					{!isOn && !cat.comingSoon && (
						<HxNotice tone="info" style={{ marginTop: 12 }}>
							{__('Install and activate any plugin above and Hatch finds it on its own.', 'hatch-connect')}
						</HxNotice>
					)}

					{cat.hasLiveProbe && isOn && (
						<div style={{ marginTop: 12 }}>
							{probe.loading && <HxSpinner label={__('Fetching one product from your shop', 'hatch-connect')} />}
							{probe.err && (
								<HxNotice tone="error" title={__('The check failed', 'hatch-connect')}>{probe.err}</HxNotice>
							)}
							{probe.total !== null && !probe.loading && (
								<HxNotice tone={probe.total === 0 ? 'warning' : 'success'} title={__('Try it now', 'hatch-connect')}>
									{probe.total === 0
										? __('No published products yet. Add one in WooCommerce under Products.', 'hatch-connect')
										: sprintf(
											/* translators: %d: number of published products. */
											_n('%d published product is available to Astro.', '%d published products are available to Astro.', probe.total, 'hatch-connect'),
											probe.total
										)}
									{probe.sample && (
										<span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 6 }}>
											<span>{__('Sample:', 'hatch-connect')}</span>
											<HxCode>{probe.sample.slug}</HxCode>
											{frontendUrl && (
												<a
													className="hx-link"
													href={`${frontendUrl.replace(/\/$/, '')}/product/${probe.sample.slug}`}
													target="_blank"
													rel="noopener noreferrer"
													style={{ fontWeight: 500 }}
												>
													{__('View on frontend', 'hatch-connect')}
												</a>
											)}
										</span>
									)}
								</HxNotice>
							)}
						</div>
					)}
				</div>
			)}
		</div>
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
					sprintf(__('The request failed with status %d.', 'hatch-connect'), r.status)
				))))
			.then(() => { setOn(!!next); })
			.catch((e) => setErr(String(e.message || e)))
			.finally(() => setSaving(false));
	};

	const hasList = Array.isArray(list) && list.length > 0;
	const total = hasList ? list.length : count;

	return (
		<HxCard>
			<HxHead
				iconChildren={IC.layoutDashboard}
				iconColor="#8b5cf6"
				title={__('Supported editor blocks', 'hatch-connect')}
				desc={sprintf(
					/* translators: %d: number of core blocks Hatch styles for the frontend. */
					_n(
						'When on, the block inserter offers only the %d core block that Hatch styles for the frontend. Existing content stays as it is.',
						'When on, the block inserter offers only the %d core blocks that Hatch styles for the frontend. Existing content stays as it is.',
						total,
						'hatch-connect'
					),
					total
				)}
				mb={err || hasList ? 14 : 0}
				action={
					<HxToggle
						on={on}
						disabled={saving}
						onChange={(v) => save(v)}
						ariaLabel={__('Show only supported blocks in the editor', 'hatch-connect')}
					/>
				}
			/>
			{err && (
				<HxNotice tone="error" title={__('Save failed', 'hatch-connect')}>{err}</HxNotice>
			)}
			{hasList && (
				<HxDisclosure
					open={expanded}
					onToggle={setExpanded}
					label={expanded
						? __('Hide the list of supported blocks', 'hatch-connect')
						: __('Show the list of supported blocks', 'hatch-connect')}
				>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
						{list.map((slug) => (
							<HxBadge key={slug} color="mono">{slug}</HxBadge>
						))}
					</div>
				</HxDisclosure>
			)}
		</HxCard>
	);
}

export default function PluginBridge({ state }) {
	// Boot state carries the PHP plugin list (`pluginBridge`) but not the
	// integrations detail, so fetch /features once on mount for the "Active" and
	// "Not detected" pills.
	const [fetched, setFetched] = useState(null);
	const [checking, setChecking] = useState(true);
	useEffect(() => {
		const boot = typeof window !== 'undefined' ? window.hatchBoot : null;
		if (!boot?.restUrl) { setChecking(false); return; }
		fetch(`${boot.restUrl}features`, {
			headers: boot.nonce ? { 'X-WP-Nonce': boot.nonce } : {},
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => { if (data) setFetched(data); })
			.catch(() => {})
			.finally(() => setChecking(false));
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
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
			<SupportedBlocksToggle
				initialOn={!!blocksState.disable_unsupported}
				count={supportedCount}
				list={supportedList}
			/>

			<HxCard>
				<HxHead
					iconChildren={IC.link}
					iconColor="#2563eb"
					title={__('Plugin connections', 'hatch-connect')}
					desc={__('These are the plugins Hatch can read from. Install one and Hatch finds it and passes its data to your frontend.', 'hatch-connect')}
					mb={6}
					action={
						<HxBadge color={activeCount > 0 ? 'green' : 'neutral'}>
							{sprintf(
								/* translators: 1: number of connected plugins, 2: total number of plugin types. */
								__('%1$d of %2$d connected', 'hatch-connect'),
								activeCount,
								CATS.length
							)}
						</HxBadge>
					}
				/>
				{CATS.map((cat, i) => (
					<CategoryRow
						key={cat.id}
						first={i === 0}
						cat={cat}
						detected={detections[i]}
						plugMap={plugMap}
						frontendUrl={frontendUrl}
						checking={checking}
					/>
				))}
			</HxCard>
		</div>
	);
}

/**
 * Performance tab.
 *
 * Copy rules:
 *   - Label: 3 to 5 words, noun phrase.
 *   - Description: one sentence that says what the setting does and why.
 *   - The toggle shows the on/off state, so descriptions do not repeat it.
 *   - No numeric claims that are not measured on the site.
 */
import { __, sprintf } from '@wordpress/i18n';
import { HxCard, HxHead, HxRow, HxToggle, HxIcon } from '../components.jsx';

// The slug is the stored key. Only label and desc are shown to the user.
const getBloatItems = () => [
	{ slug: 'emoji',          label: __('Emoji script', 'hatch-bridge'),                desc: __('Removes the WordPress emoji script, its inline detector and the s.w.org DNS prefetch. Browsers draw emoji on their own.', 'hatch-bridge') },
	{ slug: 'embed',          label: __('wp-embed script', 'hatch-bridge'),             desc: __('Removes the script that lets other sites embed your posts. Your Astro frontend is not embedded in third-party sites.', 'hatch-bridge') },
	{ slug: 'xmlrpc',         label: __('XML-RPC and pingbacks', 'hatch-bridge'),       desc: __('Turns off xmlrpc.php and removes the RSD link and the X-Pingback header. XML-RPC is a common target for password guessing.', 'hatch-bridge') },
	{ slug: 'head_cruft',     label: __('Extra tags in the page head', 'hatch-bridge'), desc: __('Removes the RSD link, WLW manifest, WordPress version tag, shortlinks, adjacent-post links, feed links and the REST API link.', 'hatch-bridge') },
	{ slug: 'block_css',      label: __('Block library CSS', 'hatch-bridge'),           desc: __('Stops WordPress from loading its block library, global styles and classic theme styles on the WordPress site itself.', 'hatch-bridge') },
	{ slug: 'jquery_migrate', label: __('jQuery Migrate (public pages)', 'hatch-bridge'), desc: __('Removes jQuery Migrate from public pages only. The admin keeps it so older plugins still work.', 'hatch-bridge') },
	{ slug: 'oembed',         label: __('oEmbed discovery', 'hatch-bridge'),            desc: __('Removes the oEmbed discovery links, the host script and the oEmbed REST route. A headless site does not use them.', 'hatch-bridge') },
	{ slug: 'rest_users',     label: __('Lock the users REST route', 'hatch-bridge'),   desc: __('Requires a login to list users through /wp/v2/users, so visitors cannot look up author names.', 'hatch-bridge') },
	{ slug: 'self_pingback',  label: __('Self-pingbacks', 'hatch-bridge'),              desc: __('Stops WordPress from sending pingbacks to your own posts when you link between them.', 'hatch-bridge') },
	{ slug: 'feeds',          label: __('WordPress feeds', 'hatch-bridge'),             desc: __('Sends /feed and related URLs to /blog/rss.xml on your Astro site. If no frontend URL is set, they return 410 Gone. This one stays off unless you turn it on.', 'hatch-bridge') },
];

export default function Performance({ state, onDirty, setSetting }) {
	const perf     = state.performance || {};
	const snippets = state.snippets    || {};
	const bloat    = perf.bloat        || {};
	const master   = !!perf.bloat_kill;
	const onToggle = (path) => (v) => { setSetting(path, v); onDirty(); };
	const bloatItems = getBloatItems();

	const showSmartTip = !!snippets.gtm_id && !perf.partytown;

	// Count individual killers currently on, for the summary line.
	const activeCount = bloatItems.filter((i) => bloat[i.slug]).length;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

			{/* Remove WordPress bloat: one switch for the headless tune-up. */}
			<HxCard status={master ? 'success' : undefined}>
				<HxHead
					iconChildren={<>
						<path d="M3 6h18" />
						<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
						<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
					</>}
					iconColor="#ef4444"
					title={__('Remove WordPress bloat', 'hatch-bridge')}
					desc={__('One switch that turns off the emoji script, wp-embed, XML-RPC, extra head tags, block library CSS, jQuery Migrate, oEmbed discovery and self-pingbacks, and locks the users REST route. Safe for a headless site, because visitors see your Astro frontend and not the WordPress theme.', 'hatch-bridge')}
					mb={14}
				/>

				<HxRow
					label={__('Remove bloat and harden the origin', 'hatch-bridge')}
					desc={master
						? __('On. WordPress pages send less HTML, make fewer requests and no longer show the WordPress version.', 'hatch-bridge')
						: __('Removes extra head tags, scripts and block CSS from pages served by WordPress itself.', 'hatch-bridge')}
					last
				>
					<HxToggle on={master} onChange={onToggle('performance.bloat_kill')} ariaLabel={__('Remove WordPress bloat', 'hatch-bridge')} />
				</HxRow>

				<details style={{ marginTop: 14, borderTop: '1px solid var(--hx-border)', paddingTop: 12 }}>
					<summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--hx-muted)', userSelect: 'none' }}>
						{__('Advanced: choose individual items', 'hatch-bridge')}
					</summary>
					<div style={{ marginTop: 10, opacity: master ? 0.55 : 1, pointerEvents: master ? 'none' : 'auto' }}>
						{master && (
							<div className="hx-desc" style={{ marginBottom: 8, fontSize: 12 }}>
								{__('The main switch is on, so every safe item is already active. Turn it off to choose a subset.', 'hatch-bridge')}
							</div>
						)}
						{!master && activeCount > 0 && (
							<div className="hx-desc" style={{ marginBottom: 8, fontSize: 12 }}>
								{sprintf(
									/* translators: 1: number of items turned on, 2: total number of items. */
									__('%1$d of %2$d items are on.', 'hatch-bridge'),
									activeCount,
									bloatItems.length
								)}
							</div>
						)}
						{bloatItems.map((item, i) => (
							<HxRow
								key={item.slug}
								label={item.label}
								desc={item.desc}
								last={i === bloatItems.length - 1}
							>
								<HxToggle
									on={!!bloat[item.slug]}
									onChange={onToggle(`performance.bloat.${item.slug}`)}
									ariaLabel={item.label}
								/>
							</HxRow>
						))}
					</div>
				</details>
			</HxCard>

			{/* Live tuning: settings that change the frontend on the next page load. */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
					</>}
					iconColor="#10b981"
					title={__('Live tuning', 'hatch-bridge')}
					desc={__('These settings apply on the next page load. No rebuild needed.', 'hatch-bridge')}
					mb={14}
				/>

				<HxRow
					label={__('Clean media URLs', 'hatch-bridge')}
					desc={__('Hides /wp-content/uploads in your page HTML and serves images in WebP or AVIF when the browser supports it.', 'hatch-bridge')}
				>
					<HxToggle on={!!perf.image_proxy} onChange={onToggle('performance.image_proxy')} ariaLabel={__('Clean media URLs', 'hatch-bridge')} />
				</HxRow>

				<HxRow
					label={__('Instant navigation', 'hatch-bridge')}
					desc={__('The browser starts loading the next page when a visitor hovers over a link, so the click feels faster.', 'hatch-bridge')}
				>
					<HxToggle on={!!perf.prefetch_enabled} onChange={onToggle('performance.prefetch_enabled')} ariaLabel={__('Instant navigation', 'hatch-bridge')} />
				</HxRow>

				<HxRow
					label={__('Analytics off the main thread', 'hatch-bridge')}
					desc={__('Runs Google Tag Manager in a web worker so it does not block the page while it loads.', 'hatch-bridge')}
				>
					<HxToggle on={!!perf.partytown} onChange={onToggle('performance.partytown')} ariaLabel={__('Analytics off the main thread', 'hatch-bridge')} />
				</HxRow>

				<HxRow
					label={__('Real-visitor timing', 'hatch-bridge')}
					desc={__('Sends page load timings (TTFB and LCP) from real visitors so you can spot slowdowns.', 'hatch-bridge')}
					last
				>
					<HxToggle on={!!perf.telemetry} onChange={onToggle('performance.telemetry')} ariaLabel={__('Real-visitor timing', 'hatch-bridge')} />
				</HxRow>
			</HxCard>

			{showSmartTip && (
				<HxCard status="warning" style={{ padding: '12px 14px' }}>
					<div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
						<HxIcon size={14} color="#f97316" style={{ marginTop: 2, flexShrink: 0 }}>
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</HxIcon>
						<div className="hx-desc" style={{ flex: 1, color: 'var(--hx-fg)' }}>
							<strong>{__('Google Tag Manager is set, but the web worker option is off.', 'hatch-bridge')}</strong>
							{' '}
							{__('Turn on "Analytics off the main thread" to keep it from blocking the page.', 'hatch-bridge')}
						</div>
						<button
							type="button"
							onClick={() => { setSetting('performance.partytown', true); onDirty(); }}
							className="hx-help"
							style={{ fontWeight: 600, color: 'var(--hx-link)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', paddingInlineStart: 8 }}
						>
							{__('Turn on', 'hatch-bridge')}
						</button>
					</div>
				</HxCard>
			)}

		</div>
	);
}

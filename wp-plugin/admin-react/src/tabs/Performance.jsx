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
import { HxCard, HxHead, HxRow, HxToggle, HxDisclosure } from '../components.jsx';
import { IC } from '../icons';

// The slug is the stored key. Only label and desc are shown to the user.
const getBloatItems = () => [
	{ slug: 'emoji',          label: __('Emoji script', 'hatch-connect'),                desc: __('Removes a small script WordPress adds to draw emoji. Browsers already show emoji on their own.', 'hatch-connect') },
	{ slug: 'embed',          label: __('Embed script', 'hatch-connect'),             desc: __('Removes the script that lets other sites embed your posts. Your frontend does not need it.', 'hatch-connect') },
	{ slug: 'xmlrpc',         label: __('Old remote access and pingbacks', 'hatch-connect'),       desc: __('Turns off XML-RPC, an old WordPress feature that attackers like to try for password guessing, and the pingback notices that go with it.', 'hatch-connect') },
	{ slug: 'head_cruft',     label: __('Extra page header tags', 'hatch-connect'), desc: __('Removes hidden tags WordPress adds to the top of every page, such as the version number, short links and feed links.', 'hatch-connect') },
	{ slug: 'block_css',      label: __('Block styles', 'hatch-connect'),           desc: __('Stops WordPress from loading its block styling on the WordPress site itself. Your frontend has its own.', 'hatch-connect') },
	{ slug: 'jquery_migrate', label: __('Old-plugin helper (public pages)', 'hatch-connect'), desc: __('Removes a compatibility script for very old plugins from public pages. The dashboard keeps it, so nothing breaks there.', 'hatch-connect') },
	{ slug: 'oembed',         label: __('Embed discovery', 'hatch-connect'),            desc: __('Removes the links that let other sites find and embed your posts. Your frontend does not use them.', 'hatch-connect') },
	{ slug: 'rest_users',     label: __('Hide the user list', 'hatch-connect'),   desc: __('Visitors must sign in to see a list of users, so they cannot look up author names.', 'hatch-connect') },
	{ slug: 'self_pingback',  label: __('Self-pingbacks', 'hatch-connect'),              desc: __('Stops WordPress from sending a notice to itself when your posts link to each other.', 'hatch-connect') },
	{ slug: 'feeds',          label: __('WordPress feeds', 'hatch-connect'),             desc: __('Sends WordPress feed addresses to the feed on your frontend. Without a frontend address they show a "gone" page. This stays off unless you turn it on.', 'hatch-connect') },
];

export default function Performance({ state, onDirty, setSetting }) {
	const perf     = state.performance || {};
	const bloat    = perf.bloat        || {};
	const master   = !!perf.bloat_kill;
	const onToggle = (path) => (v) => { setSetting(path, v); onDirty(); };
	const bloatItems = getBloatItems();

	// Count individual killers currently on, for the summary line.
	const activeCount = bloatItems.filter((i) => bloat[i.slug]).length;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

			{/* Remove WordPress bloat: one switch for the headless tune-up. */}
			<HxCard status={master ? 'success' : undefined}>
				<HxHead
					iconChildren={IC.gauge}
					iconColor="#16a34a"
					title={__('Remove extra WordPress weight', 'hatch-connect')}
					desc={__('One switch that removes the extra scripts and tags WordPress adds to its own pages. It is safe here, because visitors see your frontend and not the WordPress theme.', 'hatch-connect')}
					mb={14}
				/>

				<HxRow
					label={__('Slim down and protect WordPress', 'hatch-connect')}
					desc={master
						? __('On. WordPress pages are lighter and no longer show the WordPress version.', 'hatch-connect')
						: __('Removes extra tags, scripts and styles from pages that WordPress serves itself.', 'hatch-connect')}
					last
				>
					<HxToggle on={master} onChange={onToggle('performance.bloat_kill')} ariaLabel={__('Remove extra WordPress weight', 'hatch-connect')} />
				</HxRow>

				<HxDisclosure label={__('Choose items one by one', 'hatch-connect')} style={{ marginTop: 14, borderTop: '1px solid var(--hx-border)', paddingTop: 12 }}>
					<div style={{ marginTop: 4, opacity: master ? 0.55 : 1, pointerEvents: master ? 'none' : 'auto' }}>
						{master && (
							<div className="hx-desc" style={{ marginBottom: 8, fontSize: 12 }}>
								{__('The main switch is on, so every safe item is already active. Turn it off to choose items yourself.', 'hatch-connect')}
							</div>
						)}
						{!master && activeCount > 0 && (
							<div className="hx-desc" style={{ marginBottom: 8, fontSize: 12 }}>
								{sprintf(
									/* translators: 1: number of items turned on, 2: total number of items. */
									__('%1$d of %2$d items are on.', 'hatch-connect'),
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
									disabled={master && 'feeds' !== item.slug}
								/>
							</HxRow>
						))}
					</div>
				</HxDisclosure>
			</HxCard>

			{/* Live tuning: settings that change the frontend on the next page load. */}
			<HxCard>
				<HxHead
					iconChildren={IC.zap}
					iconColor="#10b981"
					title={__('Live tuning', 'hatch-connect')}
					desc={__('These apply on the next page load. You do not need to deploy again.', 'hatch-connect')}
					mb={14}
				/>

				<HxRow
					label={__('Clean media URLs', 'hatch-connect')}
					desc={__('Shortens image addresses and sends smaller image formats (WebP or AVIF) to browsers that support them.', 'hatch-connect')}
				>
					<HxToggle on={!!perf.image_proxy} onChange={onToggle('performance.image_proxy')} ariaLabel={__('Clean media URLs', 'hatch-connect')} />
				</HxRow>

				<HxRow
					label={__('Instant navigation', 'hatch-connect')}
					desc={__('The next page starts loading when a visitor points at a link, so the click feels faster.', 'hatch-connect')}
				>
					<HxToggle on={!!perf.prefetch_enabled} onChange={onToggle('performance.prefetch_enabled')} ariaLabel={__('Instant navigation', 'hatch-connect')} />
				</HxRow>

				<HxRow
					label={__('Measure real visitor speed', 'hatch-connect')}
					desc={__('Records how fast pages load for real visitors, so you can spot slowdowns.', 'hatch-connect')}
					last
				>
					<HxToggle on={!!perf.telemetry} onChange={onToggle('performance.telemetry')} ariaLabel={__('Measure real visitor speed', 'hatch-connect')} />
				</HxRow>
			</HxCard>

		</div>
	);
}

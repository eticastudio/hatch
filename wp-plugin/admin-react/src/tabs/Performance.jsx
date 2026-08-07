/**
 * Performance tab — tight, scannable copy.
 *
 * Voice rules:
 *   - Label: 3-5 words, noun phrase, scannable
 *   - Desc:  ONE sentence (≈15-22 words). Concrete benefit + why.
 *   - No "ON:/OFF:" prose — the toggle's state shows that visually.
 *   - Keep numbers where they matter (Lighthouse points, payload size).
 */
import { HxCard, HxHead, HxRow, HxToggle, HxIcon, HxGL, HxBadge, HxBtn } from '../components.jsx';

const BLOAT_ITEMS = [
	{ slug: 'emoji',          label: 'Emoji script',           desc: 'Removes wp-emoji-release.min.js + inline detector + s.w.org DNS-prefetch. Browsers render unicode natively.' },
	{ slug: 'embed',          label: 'wp-embed.js',            desc: 'Dequeues the oEmbed provider script. Astro is not embedded in third-party sites.' },
	{ slug: 'xmlrpc',         label: 'XML-RPC + pingbacks',    desc: 'Disables xmlrpc.php entirely and drops the RSD link + X-Pingback header. Closes a top brute-force vector.' },
	{ slug: 'head_cruft',     label: 'Head discoverability tags', desc: 'Strips RSD, WLW manifest, wp_generator (version leak), shortlinks, adjacent-post links, feed discovery, and REST root link.' },
	{ slug: 'block_css',      label: 'Block library CSS',      desc: 'Dequeues wp-block-library, block-library-theme, global-styles, classic-theme-styles from the WP frontend.' },
	{ slug: 'jquery_migrate', label: 'jQuery Migrate (frontend)', desc: 'Deregisters jquery-migrate on the public frontend only. Admin keeps it for legacy plugin BC.' },
	{ slug: 'oembed',         label: 'oEmbed discovery',       desc: 'Removes oEmbed discovery links + host JS + REST route. Zero use in a headless setup.' },
	{ slug: 'rest_users',     label: 'REST /wp/v2/users lockdown', desc: 'Requires auth to list users. Stops anonymous author enumeration (top brute-force recon target).' },
	{ slug: 'self_pingback',  label: 'Self-pingbacks',         desc: 'Prevents WP from pinging its own URLs when you publish internal links.' },
	{ slug: 'feeds',          label: 'WP feeds → Astro feed',  desc: 'Redirects /feed and friends to your Astro /blog/rss.xml (or 410 if no frontend URL yet). Opt-in even with master ON.' },
];

export default function Performance({ state, onDirty, setSetting }) {
	const perf     = state.performance || {};
	const snippets = state.snippets    || {};
	const bloat    = perf.bloat        || {};
	const master   = !!perf.bloat_kill;
	const onToggle = (path) => (v) => { setSetting(path, v); onDirty(); };

	const showSmartTip = !!snippets.gtm_id && !perf.partytown;

	// Count killers currently active for the summary line.
	const activeCount = BLOAT_ITEMS.filter(i => bloat[i.slug]).length;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

			{/* ─── KILL WP BLOAT — one-click headless tune-up ─── */}
			<HxCard status={master ? 'success' : undefined}>
				<HxHead
					iconChildren={<>
						<path d="M3 6h18" />
						<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
						<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
					</>}
					iconColor="#ef4444"
					title="Kill WordPress bloat"
					desc="One switch: strip emoji script, wp-embed, XML-RPC, RSD/generator/shortlink tags, block-library CSS, jQuery Migrate, oEmbed discovery, self-pingbacks, and lock down /wp/v2/users. Safe for headless — WP frontend isn't shown to end users."
					mb={14}
				/>

				<HxRow
					label="Kill bloat + harden origin"
					desc={master
						? `${activeCount} bloat sources removed. Every WP page now ships less HTML, fewer requests, and no version leak.`
						: 'Removes ~9 unnecessary head elements, 2–4 HTTP requests, and 40–60KB of block CSS on every WP-origin page.'}
					last
				>
					<HxToggle on={master} onChange={onToggle('performance.bloat_kill')} ariaLabel="Kill WordPress bloat" />
				</HxRow>

				<details style={{ marginTop: 14, borderTop: '1px solid var(--hx-border)', paddingTop: 12 }}>
					<summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--hx-muted)', userSelect: 'none' }}>
						Advanced — pick individual killers
					</summary>
					<div style={{ marginTop: 10, opacity: master ? 0.55 : 1, pointerEvents: master ? 'none' : 'auto' }}>
						{master && (
							<div className="hx-desc" style={{ marginBottom: 8, fontSize: 12 }}>
								Master switch is on — every safe killer is already active. Turn it off to pick a subset.
							</div>
						)}
						{BLOAT_ITEMS.map((item, i) => (
							<HxRow
								key={item.slug}
								label={item.label}
								desc={item.desc}
								last={i === BLOAT_ITEMS.length - 1}
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

			{/* ─── LIVE — toggles that change frontend instantly ─── */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
					</>}
					iconColor="#10b981"
					title="Live tuning"
					desc="Every switch here takes effect on the next page load. No rebuild required."
					mb={14}
				/>

				<HxRow
					label="Clean media URLs"
					desc="Hides /wp-content/uploads in your HTML and auto-serves WebP/AVIF. Typically ~40% smaller images."
				>
					<HxToggle on={!!perf.image_proxy} onChange={onToggle('performance.image_proxy')} />
				</HxRow>

				<HxRow
					label="Instant navigation"
					desc="Browser pre-renders the next page on hover. Click feels sub-100ms instead of 300–800ms."
				>
					<HxToggle on={!!perf.prefetch_enabled} onChange={onToggle('performance.prefetch_enabled')} />
				</HxRow>

				<HxRow
					label="Analytics off main thread"
					desc="Runs Google Tag Manager in a Web Worker. Typical Lighthouse Performance gain: 15–30 points."
				>
					<HxToggle on={!!perf.partytown} onChange={onToggle('performance.partytown')} />
				</HxRow>

				<HxRow
					label="Real-user telemetry"
					desc="Beams TTFB + LCP from real visitors so you spot regressions. Zero PII, ~200 bytes per pageview."
					last
				>
					<HxToggle on={!!perf.telemetry} onChange={onToggle('performance.telemetry')} />
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
							<strong>GTM is set, Partytown is off.</strong> Flip Partytown on for an instant Lighthouse boost.
						</div>
						<button
							type="button"
							onClick={() => { setSetting('performance.partytown', true); onDirty(); }}
							className="hx-help"
							style={{ fontWeight: 600, color: 'var(--hx-primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', paddingLeft: 8 }}
						>Enable →</button>
					</div>
				</HxCard>
			)}

			{/* v0.50.31 — Auto-tuned card removed from UI. Per user direction:
			    these always work best for headless WordPress, no user attention
			    needed. SSR, HTML compression, Sharp on your own server, Constrained
			    layout, and auto critical-CSS all stay locked in code; we just
			    don't surface them as a "look at all the things you can't change"
			    card. Less cognitive load on every visit. */}

		</div>
	);
}

/**
 * Performance tab — tight, scannable copy.
 *
 * Voice rules:
 *   - Label: 3-5 words, noun phrase, scannable
 *   - Desc:  ONE sentence (≈15-22 words). Concrete benefit + why.
 *   - No "ON:/OFF:" prose — the toggle's state shows that visually.
 *   - Keep numbers where they matter (Lighthouse points, payload size).
 */
import { HxCard, HxHead, HxRow, HxToggle, HxIcon, HxGL, HxBadge } from '../components.jsx';

export default function Performance({ state, onDirty, setSetting }) {
	const perf     = state.performance || {};
	const snippets = state.snippets    || {};
	const onToggle = (path) => (v) => { setSetting(path, v); onDirty(); };

	const showSmartTip = !!snippets.gtm_id && !perf.partytown;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

			{/* ─── LIVE — toggles that change frontend instantly ─── */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
					</>}
					iconColor="#10b981"
					title="Live tuning"
					desc="Every switch here takes effect on the next page load — no rebuild required."
					mb={14}
				/>

				<HxRow
					label="Clean media URLs"
					desc="Hides /wp-content/uploads in your HTML and auto-serves WebP/AVIF — typically ~40% smaller images."
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
					desc="Runs Google Tag Manager in a Web Worker — typical Lighthouse Performance gain: 15–30 points."
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

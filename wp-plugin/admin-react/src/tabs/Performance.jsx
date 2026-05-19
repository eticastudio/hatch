/**
 * Performance tab — simple toggles. Best defaults baked in.
 *
 * Decision: no "Advanced" disclosures. Each toggle ships with the right
 * default for Astro + WordPress (Sharp + constrained layout for images,
 * 'viewport' prefetch strategy, Auto inline-stylesheets). Power users who
 * really need to override can write a small PHP filter.
 */
import { HxCard, HxHead, HxToggle, HxIcon } from '../components.jsx';

export default function Performance({ state, onDirty, setSetting }) {
	const perf     = state.performance || {};
	const snippets = state.snippets    || {};

	const onToggle = (path) => (v) => { setSetting(path, v); onDirty(); };

	const showSmartTip = !!snippets.gtm_id && !perf.partytown;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
			{/* ── Image optimization ─────────────────────────────────────── */}
			<HxCard>
				<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
					<HxHead
						iconChildren={<>
							<rect x="3" y="3" width="18" height="18" rx="2" />
							<circle cx="8.5" cy="8.5" r="1.5" />
							<polyline points="21 15 16 10 5 21" />
						</>}
						iconColor="#10b981"
						title="Smart media URLs"
						desc="Rewrites every wp-content/uploads link to your frontend (yoursite.com/hatch-media/…). Visitors never see WordPress in the HTML. The frontend transparently optimizes to WebP/AVIF via Astro's image service."
						mb={0}
					/>
					<HxToggle on={!!perf.image_proxy} onChange={onToggle('performance.image_proxy')} />
				</div>
			</HxCard>

			{/* ── Instant page loads (Astro prefetch) ─────────────────────── */}
			<HxCard>
				<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
					<HxHead
						iconChildren={<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></>}
						iconColor="#6366f1"
						title="Instant page loads"
						desc="Astro prefetches linked pages as they enter the viewport, so the next click feels instant. Default strategy is balanced for mobile + desktop."
						mb={0}
					/>
					<HxToggle on={!!perf.prefetch_enabled} onChange={onToggle('performance.prefetch_enabled')} />
				</div>
			</HxCard>

			{/* ── Run analytics off the main thread (Partytown) ──────────── */}
			<HxCard>
				<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
					<HxHead
						iconChildren={<>
							<circle cx="12" cy="12" r="10" />
							<polyline points="12 6 12 12 16 14" />
						</>}
						iconColor="#f97316"
						title="Run analytics off the main thread"
						desc="Partytown moves GTM, GA, and other third-party scripts into a Web Worker so they never block your page. One of the biggest Lighthouse wins available."
						mb={0}
					/>
					<HxToggle on={!!perf.partytown} onChange={onToggle('performance.partytown')} />
				</div>
			</HxCard>

			{/* Smart inline tip — fires when GTM is set and Partytown is off */}
			{showSmartTip && (
				<HxCard status="warning" style={{ padding: '12px 14px' }}>
					<div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
						<HxIcon size={14} color="#f97316" style={{ marginTop: 2, flexShrink: 0 }}>
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</HxIcon>
						<div style={{ flex: 1, fontSize: 13, color: 'var(--hx-fg)', lineHeight: 1.55 }}>
							<strong style={{ fontWeight: 600 }}>GTM is set, Partytown is off.</strong> Run GTM in a background worker for an instant Lighthouse score boost.
						</div>
						<button
							type="button"
							onClick={() => { setSetting('performance.partytown', true); onDirty(); }}
							style={{
								fontSize: 12,
								fontWeight: 600,
								color: 'var(--hx-primary)',
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								fontFamily: 'inherit',
								whiteSpace: 'nowrap',
								paddingLeft: 8,
							}}
						>
							Enable →
						</button>
					</div>
				</HxCard>
			)}

			{/* ── HTML compression ───────────────────────────────────────── */}
			<HxCard>
				<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
					<HxHead
						iconChildren={<>
							<path d="M21 8V21H3V8" />
							<rect x="1" y="3" width="22" height="5" rx="1" />
							<line x1="10" y1="12" x2="14" y2="12" />
						</>}
						iconColor="#737373"
						title="Compress HTML"
						desc="Strip whitespace from generated HTML. Saves a few KB per page. Safe default for production."
						mb={0}
					/>
					<HxToggle on={!!perf.compress_html} onChange={onToggle('performance.compress_html')} />
				</div>
			</HxCard>

			{/* ── Telemetry ──────────────────────────────────────────────── */}
			<HxCard>
				<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
					<HxHead
						iconChildren={<>
							<path d="M3 3v18h18" />
							<polyline points="7 14 11 10 14 13 21 6" />
						</>}
						iconColor="#0d9488"
						title="Performance telemetry"
						desc="Beams build duration and TTFB scores after each deploy so you can spot regressions. Requires the cloud heartbeat probe to be active."
						mb={0}
					/>
					<HxToggle on={!!perf.telemetry} onChange={onToggle('performance.telemetry')} />
				</div>
			</HxCard>
		</div>
	);
}

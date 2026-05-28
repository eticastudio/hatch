/**
 * Blocks tab — v0.2.0
 *
 * Two controls right now:
 *   1. Hatch Blocks Only — restrict the editor inserter to hatch/* blocks.
 *   2. Individual block enable/disable list — flip a Hatch block off without
 *      losing its registration globally.
 *
 * Per-block toggles read from state.blocks_catalog (provided by the WP side
 * via Hatch_Blocks_Control::catalog()), so the React list updates whenever
 * a new Hatch block ships — no React change required.
 */
import { HxCard, HxHead, HxRow, HxToggle, HxBadge } from '../components.jsx';

export default function Blocks({ state, setSetting, onDirty }) {
	const blocks = (state && state.blocks) || {};
	const catalog = (state && state.blocks_catalog) || {};
	const enabled = (state && state.blocks_enabled) || {};
	const hatchOnly = !!blocks.hatch_only;
	const masterOn = blocks.master === undefined ? true : !!blocks.master;

	const list = Object.keys(catalog).map((slug) => ({
		slug,
		label: catalog[slug].label || slug,
		description: catalog[slug].description || '',
		category: catalog[slug].category || 'block',
		enabled: enabled[slug] === undefined ? true : !!enabled[slug],
	}));

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
			<HxCard>
				<HxHead
					iconChildren={<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>}
					iconColor="#ff6b00"
					title="Block library"
					desc="Hatch ships its own block set tuned for the headless / Astro pipeline — semantic HTML, Tailwind tokens, zero PHP at render time."
				/>
				<HxRow
					label="Hatch Blocks Only"
					desc="Hide every WordPress core / third-party block from the editor inserter. Authors only see hatch/* blocks. Already-saved core blocks still render — they just disappear from the picker."
				>
					<HxToggle
						on={hatchOnly}
						onChange={(v) => { setSetting('blocks.hatch_only', v); onDirty(); }}
					/>
				</HxRow>
				<HxRow
					label="Master switch — Hatch blocks active"
					desc="Off = unregister every Hatch block, leave existing content as invalid-block placeholders for recovery. Use this if you ever need to fall back to pure core Gutenberg without uninstalling."
					last
				>
					<HxToggle
						on={masterOn}
						onChange={(v) => { setSetting('blocks.master', v); onDirty(); }}
					/>
				</HxRow>
			</HxCard>

			{list.length > 0 && (
				<HxCard>
					<HxHead
						iconChildren={<><polyline points="20 6 9 17 4 12" /></>}
						iconColor="#16a34a"
						title="Individual Hatch blocks"
						desc="Flip a single block off without changing the global setup. Disabled blocks no longer appear in the inserter; saved instances become invalid-block placeholders."
					/>
					{list.map((b, idx) => (
						<HxRow
							key={b.slug}
							label={<><span>{b.label}</span> <HxBadge color="neutral">{b.category}</HxBadge></>}
							desc={b.description}
							last={idx === list.length - 1}
						>
							<HxToggle
								on={b.enabled}
								onChange={(v) => { setSetting(`blocks_enabled.${b.slug}`, v); onDirty(); }}
							/>
						</HxRow>
					))}
				</HxCard>
			)}
		</div>
	);
}

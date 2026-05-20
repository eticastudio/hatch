/**
 * Status tab — read-only diagnostic, design-system aligned.
 *
 * Every section uses the shared primitives (HxCard / HxHead / HxGL / HxRow).
 * Rows compose label + value badge so the visual rhythm matches every other
 * settings tab. No bespoke padding, no ad-hoc colours.
 */
import { HxCard, HxBadge, HxHead, HxGL } from '../components.jsx';

const ICON = {
	pulse: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
};

function Value({ v, type }) {
	if (type === 'on')   return <HxBadge color="green">on</HxBadge>;
	if (type === 'off')  return <HxBadge color="neutral">off</HxBadge>;
	if (type === 'set')  return <HxBadge color="blue">set</HxBadge>;
	if (type === 'warn') return <HxBadge color="yellow">{v}</HxBadge>;
	if (type === 'num') {
		return (
			<span style={{
				fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
				fontSize: 13, fontWeight: 600, color: 'var(--hx-fg)',
			}}>{v}</span>
		);
	}
	return (
		<span style={{
			fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
			fontSize: 12, color: 'var(--hx-muted)', wordBreak: 'break-all',
			maxWidth: 360, textAlign: 'right',
		}}>{v || '—'}</span>
	);
}

export default function Status({ state }) {
	const sections = (state.status || {}).sections || [];

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
			<HxCard>
				<HxHead
					iconChildren={ICON.pulse}
					iconColor="#2563eb"
					title="Diagnostic"
					desc="Read-only snapshot of every flag, credential, and cron Hatch is currently using. The one place to answer “where does this come from?” without leaving the dashboard."
				/>

				{sections.map((sec) => {
					const rows = sec.rows || [];
					if (rows.length === 0) return null;
					return (
						<div key={sec.label}>
							<HxGL>{sec.label}</HxGL>
							{rows.map((r, i) => (
								<div
									key={i}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										gap: 20,
										padding: '12px 0',
										borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--hx-border)',
										minHeight: 44,
									}}
								>
									<span style={{
										fontSize: 13,
										color: 'var(--hx-muted)',
										fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
									}}>
										{r.label}
									</span>
									<Value v={r.value} type={r.type} />
								</div>
							))}
						</div>
					);
				})}

				{sections.length === 0 && (
					<div className="hx-desc" style={{ color: 'var(--hx-subtle)', padding: '24px 0', textAlign: 'center' }}>
						No diagnostic data available yet. Run setup to populate.
					</div>
				)}
			</HxCard>
		</div>
	);
}

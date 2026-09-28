/**
 * Status tab - read-only diagnostic, design-system aligned.
 *
 * Every section uses the shared primitives (HxCard / HxHead / HxGL / HxRow).
 * Rows compose label + value badge so the visual rhythm matches every other
 * settings tab.
 */
import { __ } from '@wordpress/i18n';
import { HxCard, HxBadge, HxHead, HxGL } from '../components.jsx';

const ICON = {
	pulse: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
};

function Value({ v, type }) {
	if (type === 'on')   return <HxBadge color="green">{ __( 'On', 'hatch-bridge' ) }</HxBadge>;
	if (type === 'off')  return <HxBadge color="neutral">{ __( 'Off', 'hatch-bridge' ) }</HxBadge>;
	if (type === 'set')  return <HxBadge color="blue">{ __( 'Set', 'hatch-bridge' ) }</HxBadge>;
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
			maxWidth: 360, textAlign: 'end',
		}}>{v || __( 'Not set', 'hatch-bridge' )}</span>
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
					title={ __( 'Diagnostic', 'hatch-bridge' ) }
						desc={ __( 'A read-only list of the flags, credentials and scheduled tasks Hatch is using right now. Use it to see where a setting comes from.', 'hatch-bridge' ) }
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
						{ __( 'No diagnostic data yet. Finish setup to fill this in.', 'hatch-bridge' ) }
					</div>
				)}
			</HxCard>
		</div>
	);
}

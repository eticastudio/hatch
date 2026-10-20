/**
 * Status tab - read-only diagnostic, design-system aligned.
 *
 * Every section uses the shared primitives (HxCard / HxHead / HxGL / HxRow).
 * Rows compose label + value badge so the visual rhythm matches every other
 * settings tab.
 */
import { __ } from '@wordpress/i18n';
import { HxCard, HxBadge, HxHead, HxGL, HxRow } from '../components.jsx';
import { IC } from '../icons';

function Value({ v, type }) {
	if (type === 'on')   return <HxBadge color="green">{ __( 'On', 'hatch-connect' ) }</HxBadge>;
	if (type === 'off')  return <HxBadge color="neutral">{ __( 'Off', 'hatch-connect' ) }</HxBadge>;
	if (type === 'set')  return <HxBadge color="blue">{ __( 'Set', 'hatch-connect' ) }</HxBadge>;
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
		}}>{v || __( 'Not set', 'hatch-connect' )}</span>
	);
}

export default function Status({ state }) {
	const sections = (state.status || {}).sections || [];

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
			<HxCard>
				<HxHead
					iconChildren={IC.activity}
					iconColor="#2563eb"
					title={ __( 'Technical details', 'hatch-connect' ) }
						desc={ __( 'A read-only list of what Hatch is using right now. Share it with support if something is not working.', 'hatch-connect' ) }
				/>

				{sections.map((sec) => {
					const rows = sec.rows || [];
					if (rows.length === 0) return null;
					return (
						<div key={sec.label}>
							<HxGL>{sec.label}</HxGL>
							{rows.map((r, i) => (
								<HxRow key={i} label={r.label} last={i === rows.length - 1}>
									<Value v={r.value} type={r.type} />
								</HxRow>
							))}
						</div>
					);
				})}

				{sections.length === 0 && (
					<div className="hx-desc" style={{ color: 'var(--hx-subtle)', padding: '24px 0', textAlign: 'center' }}>
						{ __( 'Nothing to show yet. Finish the setup and this fills in.', 'hatch-connect' ) }
					</div>
				)}
			</HxCard>
		</div>
	);
}

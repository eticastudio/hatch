/**
 * Connection tab — full action restoration.
 *
 * Surfaces every PHP admin-post handler the OLD v0.50.10 plugin exposed:
 *   - hatch_save_frontend_url    (Edit frontend URL inline)
 *   - hatch_generate_app_password (mint a fresh App Password for VPS install)
 *   - hatch_rotate_app_pwds      (advanced: rotate all)
 *   - hatch_test_webhook         (verify webhook delivery)
 *   - hatch_mark_deployed        (manually mark deployed, skip broker)
 *   - hatch_clear_token          (clear encrypted broker token)
 *
 * All use real <form method=post> to boot.adminPostUrl with nonces from
 * setup.nonces.* in boot state. No fake setTimeouts.
 */
import { useState, useRef } from '@wordpress/element';
import { HxIcon, HxBtn, HxBadge, HxCard, HxHead, HxRow, HxInp, hxFetch } from '../components.jsx';

const ICON = {
	link: <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></>,
	offline: <><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></>,
	pulse: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
	alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
	check: <polyline points="20 6 9 17 4 12" />,
	x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
	refresh: <><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></>,
	chev: <polyline points="9 18 15 12 9 6" />,
	external: <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>,
	key: <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></>,
	bolt: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
	tool: <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />,
};

const HEART = {
	good: { color: '#16a34a', badge: 'green',   label: 'Healthy' },
	warn: { color: '#d97706', badge: 'yellow',  label: 'Slow'    },
	bad:  { color: '#b91c1c', badge: 'red',     label: 'Down'    },
	muted:{ color: 'var(--hx-subtle)', badge: 'neutral', label: 'Pending' },
};

export default function Connection({ state, onSetup }) {
	const [openPreflight, setOpenPreflight] = useState(false);
	const [redeployPhase, setRedeployPhase] = useState('idle'); // idle | running | sent | error

	const redeploy = async () => {
		setRedeployPhase('running');
		try {
			await hxFetch('revalidate', { method: 'POST', body: JSON.stringify({ reason: 'react-admin-redeploy' }) });
			setRedeployPhase('sent');
			setTimeout(() => setRedeployPhase('idle'), 2400);
		} catch (e) {
			console.error('[hatch] redeploy failed', e);
			setRedeployPhase('error');
			setTimeout(() => setRedeployPhase('idle'), 3000);
		}
	};

	const conn      = state.connection || {};
	const setup     = state.setup || {};
	const nonces    = setup.nonces || {};
	const adminPost = (window.hatchBoot || {}).adminPostUrl;
	const companion = setup.companionTheme || { installed: false, active: false, slug: 'hatch-companion' };


	const url       = conn.frontendUrl || '';
	const isLive    = !!url;
	const hostLabel = conn.hostLabel || 'Self-hosted';
	const heartRaw  = conn.heartbeat || {};
	const heart     = HEART[heartRaw.healthClass] || HEART.muted;
	const heartDesc = heartRaw.healthLabel || 'No heartbeat yet. First probe runs within 5 minutes.';
	const checks    = conn.preflight || [];
	const passed    = checks.filter((c) => c.ok).length;
	const total     = checks.length;
	const allGood   = total > 0 && passed === total;
	const prettyUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
			{/* ── Frontline status ────────────────────────────────────── */}
			<HxCard>
				<HxHead
					iconChildren={isLive ? ICON.link : ICON.offline}
					iconColor={isLive ? '#16a34a' : 'var(--hx-muted)'}
					title={isLive ? 'Frontline is live' : 'Not connected yet'}
					desc={
						isLive
							? 'Saves invalidate the frontend cache in about 60 seconds. No redeploy needed.'
							: 'Run the setup wizard to point Hatch at your Astro frontend.'
					}
					mb={isLive ? 16 : 18}
				/>

				{isLive ? (
					<>
						<FrontendUrlRow url={url} prettyUrl={prettyUrl} adminPost={adminPost} nonce={nonces.save_frontend_url} />

						<HxRow label="Heartbeat" desc={heartDesc}>
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
								<HxIcon size={14} color={heart.color}>{ICON.pulse}</HxIcon>
								<HxBadge color={heart.badge}>{heart.label}</HxBadge>
								<form method="post" action={adminPost} style={{ display: 'inline' }}>
									<input type="hidden" name="action"   value="hatch_probe_heartbeat" />
									<input type="hidden" name="_wpnonce" value={nonces.probe_heartbeat || ''} />
									<HxBtn type="submit" variant="ghost">Probe now</HxBtn>
								</form>
							</span>
						</HxRow>

						<HxRow label="Host" desc="Where your Astro build runs. Change via the setup wizard." last>
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
								<HxBadge color="neutral">{hostLabel}</HxBadge>
								<HxBtn variant="ghost" onClick={onSetup}>Change</HxBtn>
							</span>
						</HxRow>

						<div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
							<HxBtn href={url} target="_blank" rel="noopener noreferrer">
								<HxIcon size={13} color="currentColor">{ICON.external}</HxIcon>
								Visit live site
							</HxBtn>
							<HxBtn variant="ghost" onClick={() => { window.location.hash = '#status'; }}>
								<HxIcon size={13}>{ICON.pulse}</HxIcon>
								View Status
							</HxBtn>
							<HxBtn variant="ghost" onClick={redeploy} disabled={redeployPhase === 'running'}>
								<PhaseGlyph phase={redeployPhase} idleIcon={ICON.refresh} />
								{redeployPhase === 'running' ? 'Redeploying' : redeployPhase === 'sent' ? 'Done' : redeployPhase === 'error' ? 'Failed' : 'Redeploy'}
							</HxBtn>
						</div>
					</>
				) : (
					<HxBtn variant="brand" onClick={onSetup}>Run setup wizard</HxBtn>
				)}
			</HxCard>

			{/* ── Companion theme ─────────────────────────────────────── */}
			{isLive && (
				<HxCard>
					<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
						<HxHead
							iconChildren={<><path d="M3 9h18M9 21V9M3 3h18v18H3z" /></>}
							iconColor={companion.active ? '#16a34a' : (companion.installed ? '#d97706' : 'var(--hx-muted)')}
							title="Companion theme"
							desc={
								companion.active
									? 'Active. Visitors to this WordPress URL 302-redirect to your Astro frontend automatically.'
									: companion.installed
										? 'Installed but not active. Activate to flip this site into headless mode — visitors will redirect to the frontend.'
										: 'A 1-file WP theme that 302-redirects every page to your Astro frontend. Required to flip into headless mode.'
							}
							mb={0}
							action={
								<HxBadge color={companion.active ? 'green' : (companion.installed ? 'yellow' : 'neutral')}>
									{companion.active ? 'Active' : (companion.installed ? 'Installed' : 'Not installed')}
								</HxBadge>
							}
						/>
					</div>
					{!companion.active && (
						<div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--hx-border)' }}>
							<form method="post" action={adminPost}>
								<input type="hidden" name="action"   value="hatch_install_companion_theme" />
								<input type="hidden" name="_wpnonce" value={nonces.install_companion || ''} />
								<HxBtn type="submit" variant={companion.installed ? 'default' : 'ghost'}>
									{companion.installed ? 'Activate companion theme' : 'Install + activate'}
								</HxBtn>
							</form>
						</div>
					)}
				</HxCard>
			)}

			{/* ── Preflight ────────────────────────────────────────────── */}
			{total > 0 && (
				<HxCard hover style={{ cursor: 'pointer' }}>
					<div
						onClick={() => setOpenPreflight((o) => !o)}
						style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}
					>
						<div style={{ flex: 1 }}>
							<HxHead
								iconChildren={ICON.alert}
								iconColor={allGood ? '#16a34a' : '#d97706'}
								title="Preflight diagnostic"
								desc={
									allGood
										? 'Every check passing. Your stack is configured correctly.'
										: `${total - passed} suggestion${total - passed === 1 ? '' : 's'}. Connection works, items below polish the deploy.`
								}
								mb={0}
							/>
						</div>
						<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
							<HxBadge color={allGood ? 'green' : 'yellow'}>{passed} / {total}</HxBadge>
							<HxIcon
								size={15}
								color="var(--hx-subtle)"
								style={{ transform: openPreflight ? 'rotate(90deg)' : 'none', transition: 'transform .18s var(--hx-ease)' }}
							>
								{ICON.chev}
							</HxIcon>
						</div>
					</div>

					{openPreflight && (
						<div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--hx-border)' }} onClick={(e) => e.stopPropagation()}>
							{checks.map((c, i) => (
								<CheckRow key={i} check={c} last={i === checks.length - 1} />
							))}
						</div>
					)}
				</HxCard>
			)}
</div>
	);
}

// ── FrontendUrlRow: inline edit ────────────────────────────────────────────

function FrontendUrlRow({ url, prettyUrl, adminPost, nonce }) {
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(url);
	const formRef = useRef(null);

	if (!editing) {
		return (
			<HxRow label="Frontend URL" desc="Where visitors land. Click Edit to change without re-running the wizard.">
				<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						style={{
							display: 'inline-flex', alignItems: 'center', gap: 6,
							padding: '5px 11px', borderRadius: 999,
							background: 'var(--hx-surface-2)', border: '1px solid var(--hx-border)',
							color: 'var(--hx-fg)', fontSize: 12,
							fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
							textDecoration: 'none', maxWidth: 280,
							overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
						}}
					>
						{prettyUrl}
						<HxIcon size={11} color="var(--hx-subtle)">
							<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
							<polyline points="15 3 21 3 21 9" />
							<line x1="10" y1="14" x2="21" y2="3" />
						</HxIcon>
					</a>
					<HxBtn variant="ghost" onClick={() => setEditing(true)}>Edit</HxBtn>
				</span>
			</HxRow>
		);
	}

	return (
		<HxRow label="Frontend URL" desc="Press Save to update. The companion theme will redirect to the new URL.">
			<form ref={formRef} method="post" action={adminPost} style={{ display: 'flex', gap: 6 }}>
				<input type="hidden" name="action"   value="hatch_save_frontend_url" />
				<input type="hidden" name="_wpnonce" value={nonce || ''} />
				<HxInp
					name="hatch_frontend_url"
					mono
					value={value}
					onChange={(e) => setValue(e.target.value)}
					autoComplete="off"
					full={false}
				/>
				<HxBtn type="submit">Save</HxBtn>
				<HxBtn variant="ghost" onClick={() => { setEditing(false); setValue(url); }} type="button">Cancel</HxBtn>
			</form>
		</HxRow>
	);
}



// ── Small helpers ──────────────────────────────────────────────────────────

function PhaseGlyph({ phase, idleIcon }) {
	if (phase === 'running') {
		return (
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'hxSpin 0.8s linear infinite' }}>
				<path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" />
				<path d="M21 12a9 9 0 01-9 9" />
			</svg>
		);
	}
	if (phase === 'sent')  return <HxIcon size={13} color="#16a34a" sw={2.5}>{ICON.check}</HxIcon>;
	if (phase === 'error') return <HxIcon size={13} color="#b91c1c" sw={2.5}>{ICON.x}</HxIcon>;
	return <HxIcon size={13}>{idleIcon}</HxIcon>;
}

function CheckRow({ check: c, last }) {
	const state = c.ok ? 'ok' : c.warn ? 'warn' : 'fail';
	const fg    = state === 'ok' ? '#16a34a' : state === 'warn' ? '#d97706' : '#b91c1c';
	const icon  = state === 'ok' ? ICON.check : state === 'warn' ? ICON.alert : ICON.x;
	return (
		<div
			style={{
				display: 'flex', alignItems: 'flex-start', gap: 12,
				padding: '10px 0',
				borderBottom: last ? 'none' : '1px solid var(--hx-border)',
			}}
		>
			<div style={{ flexShrink: 0, marginTop: 1 }}>
				<HxIcon size={14} color={fg} sw={state === 'warn' ? 2 : 2.5}>{icon}</HxIcon>
			</div>
			<div style={{ flex: 1 }}>
				<div className="hx-label" style={{ color: state === 'fail' ? fg : 'var(--hx-fg)' }}>
					{c.label || c.l}
				</div>
				{c.note && (
					<div className="hx-help" style={{ color: 'var(--hx-subtle)', marginTop: 3 }}>
						{c.note}
					</div>
				)}
			</div>
		</div>
	);
}

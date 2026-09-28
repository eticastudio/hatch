/**
 * Connection tab.
 *
 * Shows whether the frontend is deployed and where, the health of the link
 * between WordPress and the frontend, the companion theme, and the preflight
 * checks. Deploying and changing the deploy happens on the setup screen.
 *
 * Data: GET /hatch/v1/deploy/status for the deploy, boot state for the
 * heartbeat, companion theme and preflight. Two actions are real admin-post
 * forms (probe the heartbeat, install the companion theme), each with its own
 * nonce from setup.nonces. The cache refresh is POST /hatch/v1/revalidate.
 */
import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { HxIcon, HxBtn, HxBadge, HxCard, HxHead, HxRow, HxNotice, HxSpinner, hxFetch, hxErrorNode } from '../components.jsx';

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
	layout: <path d="M3 9h18M9 21V9M3 3h18v18H3z" />,
};

const HEART = {
	good: { color: 'var(--hx-success)', badge: 'green', label: () => __('Healthy', 'hatch-bridge') },
	warn: { color: 'var(--hx-warning)', badge: 'yellow', label: () => __('Slow', 'hatch-bridge') },
	bad: { color: 'var(--hx-danger)', badge: 'red', label: () => __('Down', 'hatch-bridge') },
	muted: { color: 'var(--hx-subtle)', badge: 'neutral', label: () => __('Pending', 'hatch-bridge') },
};

/**
 * The address visitors use, from the saved deploy state.
 *
 * @param {Object} st Deploy state from GET /deploy/status.
 * @return {string} Full URL, or an empty string.
 */
function publicUrlOf(st) {
	if (!st) return '';
	if (st.domain) {
		return 'https://' + st.domain + (st.mount_mode === 'subfolder' ? st.subpath || '' : '');
	}
	return st.origin || '';
}

/**
 * Read the result of the companion theme install from the URL hash. The
 * install form redirects to #connection&companion=ok or =fail.
 *
 * @return {string} "ok", "fail" or an empty string.
 */
function companionResult() {
	const m = /[#&]companion=(ok|fail)\b/.exec(window.location.hash || '');
	return m ? m[1] : '';
}

export default function Connection({ state }) {
	const boot = window.hatchBoot || {};
	const conn = state.connection || {};
	const setup = state.setup || {};
	const nonces = setup.nonces || {};
	const adminPost = boot.adminPostUrl;
	const setupUrl = boot.setupUrl || 'admin.php?page=hatch-setup';
	const companion = setup.companionTheme || { installed: false, active: false, error: '' };

	const [data, setData] = useState({ phase: 'loading', error: '', status: null });
	const [openPreflight, setOpenPreflight] = useState(false);
	const [refresh, setRefresh] = useState({ phase: 'idle', error: '' });
	const [installResult] = useState(companionResult);

	const load = useCallback(async () => {
		setData((d) => ({ ...d, phase: 'loading', error: '' }));
		try {
			const status = await hxFetch('deploy/status');
			setData({ phase: 'ready', error: '', status });
		} catch (e) {
			setData({ phase: 'error', error: hxErrorNode(e), status: null });
		}
	}, []);

	useEffect(() => { load(); }, [load]);

	const refreshCache = async () => {
		setRefresh({ phase: 'running', error: '' });
		try {
			await hxFetch('revalidate', { method: 'POST', body: JSON.stringify({ reason: 'admin-refresh' }) });
			setRefresh({ phase: 'sent', error: '' });
		} catch (e) {
			setRefresh({ phase: 'error', error: hxErrorNode(e) });
		}
	};

	if (data.phase === 'loading') {
		return (
			<HxCard>
				<HxSpinner label={__('Loading the deploy status', 'hatch-bridge')} />
			</HxCard>
		);
	}
	if (data.phase === 'error') {
		return (
			<HxNotice
				tone="error"
				title={__('Could not load the deploy status', 'hatch-bridge')}
				action={<HxBtn size="sm" variant="ghost" onClick={load}>{__('Try again', 'hatch-bridge')}</HxBtn>}
			>
				{data.error}
			</HxNotice>
		);
	}

	const status = data.status || {};
	const st = status.state || {};
	const last = status.last;
	const isLive = !!status.deployed;
	const url = publicUrlOf(st);
	const prettyUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

	let servedFrom = __('A workers.dev address', 'hatch-bridge');
	if (st.domain && st.mount_mode === 'subfolder') {
		/* translators: 1: domain name, 2: folder path such as /blog. */
		servedFrom = sprintf(__('%1$s, in the folder %2$s', 'hatch-bridge'), st.domain, st.subpath || '');
	} else if (st.domain) {
		/* translators: %s: domain name. */
		servedFrom = sprintf(__('%s, the whole domain', 'hatch-bridge'), st.domain);
	}

	const heartRaw = conn.heartbeat || {};
	const heart = HEART[heartRaw.healthClass] || HEART.muted;
	const heartDesc = heartRaw.healthLabel || __('No check has run yet. The first one runs within a few minutes.', 'hatch-bridge');
	const checks = conn.preflight || [];
	const passed = checks.filter((c) => c.ok).length;
	const total = checks.length;
	const allGood = total > 0 && passed === total;
	const remaining = total - passed;
	/* translators: %d: number of checks that need attention. */
	const attentionDesc = sprintf(_n('%d check needs attention. The connection works. This item can make deploys smoother.', '%d checks need attention. The connection works. These items can make deploys smoother.', remaining, 'hatch-bridge'), remaining);

	let companionDesc = __('A small theme that sends visitors of your WordPress address to the frontend. The frontend does not work for visitors without it.', 'hatch-bridge');
	if (companion.active) {
		companionDesc = __('Active. Visitors of your WordPress address are sent to the frontend.', 'hatch-bridge');
	} else if (companion.installed) {
		companionDesc = __('Installed but not active. Activating it switches your current theme off.', 'hatch-bridge');
	}
	let companionBadge = ['neutral', __('Not installed', 'hatch-bridge')];
	if (companion.active) companionBadge = ['green', __('Active', 'hatch-bridge')];
	else if (companion.installed) companionBadge = ['yellow', __('Installed', 'hatch-bridge')];

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
			{last && last.ok === false && (
				<HxNotice tone="error" title={__('The last deploy failed', 'hatch-bridge')}>{last.message}</HxNotice>
			)}

			{/* Frontend status */}
			<HxCard>
				<HxHead
					iconChildren={isLive ? ICON.link : ICON.offline}
					iconColor={isLive ? 'var(--hx-success)' : 'var(--hx-muted)'}
					title={isLive ? __('Your frontend is live', 'hatch-bridge') : __('Not deployed yet', 'hatch-bridge')}
					desc={
						isLive
							? __('Visitors see the frontend. WordPress stays where you edit.', 'hatch-bridge')
							: __('Connect your Cloudflare account to publish the frontend. It takes a few minutes.', 'hatch-bridge')
					}
					mb={isLive ? 12 : 18}
				/>

				{isLive ? (
					<>
						<HxRow label={__('Address', 'hatch-bridge')} desc={servedFrom}>
							{url ? (
								<a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hx-link)', overflowWrap: 'anywhere' }}>{prettyUrl}</a>
							) : (
								<span className="hx-desc" style={{ color: 'var(--hx-subtle)' }}>{__('Not available', 'hatch-bridge')}</span>
							)}
						</HxRow>

						<HxRow label={__('Connection check', 'hatch-bridge')} desc={heartDesc}>
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
								<HxBadge color={heart.badge}>{heart.label()}</HxBadge>
								<form method="post" action={adminPost} style={{ display: 'inline' }}>
									<input type="hidden" name="action" value="hatch_probe_heartbeat" />
									<input type="hidden" name="_wpnonce" value={nonces.probe_heartbeat || ''} />
									<HxBtn type="submit" variant="ghost" size="sm">{__('Check now', 'hatch-bridge')}</HxBtn>
								</form>
							</span>
						</HxRow>

						<HxRow
							label={__('Cloudflare token', 'hatch-bridge')}
							desc={status.has_token ? __('Saved on this site, encrypted.', 'hatch-bridge') : __('Not saved. You will paste it again to deploy.', 'hatch-bridge')}
							last
						>
							<HxBadge color={status.has_token ? 'green' : 'neutral'}>{status.has_token ? __('Saved', 'hatch-bridge') : __('Not saved', 'hatch-bridge')}</HxBadge>
						</HxRow>

						{refresh.phase === 'sent' && (
							<HxNotice tone="success" style={{ marginTop: 14 }}>
								{__('Cache refresh requested. The frontend picks up your latest content shortly.', 'hatch-bridge')}
							</HxNotice>
						)}
						{refresh.phase === 'error' && (
							<HxNotice tone="error" title={__('Could not refresh the cache', 'hatch-bridge')} style={{ marginTop: 14 }}>
								{refresh.error}
							</HxNotice>
						)}

						<div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
							{url && (
								<HxBtn href={url} variant="brand">
									<HxIcon size={13} color="currentColor">{ICON.external}</HxIcon>
									{__('Open the frontend', 'hatch-bridge')}
								</HxBtn>
							)}
							<HxBtn variant="ghost" onClick={refreshCache} disabled={refresh.phase === 'running'}>
								<HxIcon size={13}>{ICON.refresh}</HxIcon>
								{refresh.phase === 'running' ? __('Refreshing', 'hatch-bridge') : __('Refresh frontend cache', 'hatch-bridge')}
							</HxBtn>
							<HxBtn variant="ghost" href={setupUrl}>{__('Deploy again or change the domain', 'hatch-bridge')}</HxBtn>
						</div>
					</>
				) : (
					<HxBtn variant="brand" href={setupUrl}>{__('Set up Hatch', 'hatch-bridge')}</HxBtn>
				)}
			</HxCard>

			{/* Companion theme */}
			{isLive && (
				<HxCard>
					{installResult === 'ok' && (
						<HxNotice tone="success" title={__('Companion theme activated', 'hatch-bridge')} style={{ marginBottom: 14 }} />
					)}
					{(installResult === 'fail' || !!companion.error) && (
						<HxNotice tone="error" title={__('The companion theme could not be installed', 'hatch-bridge')} style={{ marginBottom: 14 }}>
							{companion.error
								? companion.error
								: __('Check that WordPress can write to the themes folder, then try again.', 'hatch-bridge')}
						</HxNotice>
					)}
					<HxHead
						iconChildren={ICON.layout}
						iconColor={companion.active ? 'var(--hx-success)' : (companion.installed ? 'var(--hx-warning)' : 'var(--hx-muted)')}
						title={__('Companion theme', 'hatch-bridge')}
						desc={companionDesc}
						mb={0}
						action={<HxBadge color={companionBadge[0]}>{companionBadge[1]}</HxBadge>}
					/>
					{!companion.active && (
						<div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--hx-border)' }}>
							<form method="post" action={adminPost}>
								<input type="hidden" name="action" value="hatch_install_companion_theme" />
								<input type="hidden" name="_wpnonce" value={nonces.install_companion || ''} />
								<HxBtn type="submit" variant={companion.installed ? 'brand' : 'ghost'}>
									{companion.installed ? __('Activate companion theme', 'hatch-bridge') : __('Install and activate', 'hatch-bridge')}
								</HxBtn>
							</form>
						</div>
					)}
				</HxCard>
			)}

			{/* Preflight */}
			{total > 0 && (
				<HxCard>
					<button
						type="button"
						aria-expanded={openPreflight}
						aria-controls="hatch-preflight-list"
						onClick={() => setOpenPreflight((o) => !o)}
						style={{
							boxSizing: 'border-box',
							width: '100%',
							margin: 0,
							padding: 0,
							border: 0,
							background: 'none',
							color: 'inherit',
							font: 'inherit',
							textAlign: 'start',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							gap: 14,
						}}
					>
						<span style={{ flex: 1, minWidth: 0 }}>
							<HxHead
								iconChildren={allGood ? ICON.check : ICON.alert}
								iconColor={allGood ? 'var(--hx-success)' : 'var(--hx-warning)'}
								title={__('Preflight checks', 'hatch-bridge')}
								desc={
									allGood
										? __('Every check passes.', 'hatch-bridge')
										: attentionDesc
								}
								mb={0}
							/>
						</span>
						<span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
							<HxBadge color={allGood ? 'green' : 'yellow'}>{passed} / {total}</HxBadge>
							<HxIcon
								size={15}
								color="var(--hx-subtle)"
								style={{ transform: openPreflight ? 'rotate(90deg)' : 'none', transition: 'transform .18s var(--hx-ease)' }}
							>
								{ICON.chev}
							</HxIcon>
						</span>
					</button>

					{openPreflight && (
						<div id="hatch-preflight-list" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--hx-border)' }}>
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

function CheckRow({ check: c, last }) {
	const kind = c.ok ? 'ok' : c.warn ? 'warn' : 'fail';
	const fg = kind === 'ok' ? 'var(--hx-success)' : kind === 'warn' ? 'var(--hx-warning)' : 'var(--hx-danger)';
	const icon = kind === 'ok' ? ICON.check : kind === 'warn' ? ICON.alert : ICON.x;
	const word = kind === 'ok' ? __('Passed', 'hatch-bridge') : kind === 'warn' ? __('Warning', 'hatch-bridge') : __('Failed', 'hatch-bridge');
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'flex-start',
				gap: 12,
				padding: '10px 0',
				borderBottom: last ? 'none' : '1px solid var(--hx-border)',
			}}
		>
			<div style={{ flexShrink: 0, marginTop: 1 }}>
				<HxIcon size={14} color={fg} sw={kind === 'warn' ? 2 : 2.5}>{icon}</HxIcon>
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div className="hx-label" style={{ color: 'var(--hx-fg)' }}>
					<span className="screen-reader-text">{word}: </span>
					{c.label || c.l}
				</div>
				{c.note && (
					<div className="hx-help" style={{ color: 'var(--hx-subtle)', marginTop: 3 }}>{c.note}</div>
				)}
			</div>
		</div>
	);
}

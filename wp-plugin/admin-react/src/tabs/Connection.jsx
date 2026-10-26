/**
 * Connection tab.
 *
 * Shows whether the frontend is deployed and where, the health of the link
 * between WordPress and the frontend, and every ongoing action as one row:
 * open, refresh the cache, redeploy, change the domain, change the token and
 * disconnect. None of them leaves this screen. Below that: the deploy history
 * and the preflight checks.
 *
 * Data: GET /hatch/v1/deploy/status and /deploy/history, boot state for the
 * heartbeat and preflight. Actions: POST /connection-check,
 * POST /revalidate, POST /deploy/redeploy (with an optional new domain),
 * POST /deploy/cloudflare/token (verifies, then saves) and POST
 * /deploy/disconnect, which sits behind a confirm step.
 */
import { useState, useEffect, useCallback, useRef } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { IC } from '../icons';
import { HxEmpty, HxIcon, HxBtn, HxBadge, HxCard, HxHead, HxRow, HxNotice, HxSpinner, HxField, HxInp, hxFetch, hxErrorNode, hxErrorFix } from '../components.jsx';

const ICON = {
	link: IC.link,
	offline: IC.circleSlash,
	pulse: IC.activity,
	alert: IC.triangleAlert,
	check: IC.check,
	x: IC.x,
	refresh: IC.refreshCw,
	chev: IC.chevronRight,
	external: IC.externalLink,
	layout: IC.layoutDashboard,
	history: IC.history,
};

const HEART = {
	good: { color: 'var(--hx-success)', badge: 'green', label: () => __('Healthy', 'hatch-connect') },
	warn: { color: 'var(--hx-warning)', badge: 'yellow', label: () => __('Slow', 'hatch-connect') },
	bad: { color: 'var(--hx-danger)', badge: 'red', label: () => __('Down', 'hatch-connect') },
	muted: { color: 'var(--hx-text-subtle)', badge: 'neutral', label: () => __('Pending', 'hatch-connect') },
	stale: { color: 'var(--hx-text-subtle)', badge: 'neutral', label: () => __('Not checked recently', 'hatch-connect') },
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

// How long to wait before giving up on each request, in milliseconds. A deploy
// legitimately takes a while, so it gets the longest wait.
const CHECK_TIMEOUT = 25000;
const TOKEN_TIMEOUT = 45000;
const DEPLOY_TIMEOUT = 240000;

const TYPE_LABEL = {
	initial: () => __('First deploy', 'hatch-connect'),
	redeploy: () => __('Redeploy', 'hatch-connect'),
	domain_change: () => __('Domain change', 'hatch-connect'),
};

/**
 * Quick check of a typed domain before it is sent. The server repeats this
 * and is the real gate, so this only saves a round trip for obvious slips.
 *
 * @param {string} raw Typed value.
 * @return {string} A plain message, or an empty string when it looks fine.
 */
function domainProblem(raw) {
	const v = raw.trim();
	if (!v) return __('Type the new domain first, for example blog.example.com.', 'hatch-connect');
	if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v) || /[/\\?#@\s:]/.test(v)) {
		return __('Enter only the domain, like blog.example.com. Remove https://, any path, port or spaces.', 'hatch-connect');
	}
	if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(v)) {
		return __('That does not look like a domain name. Use a name like blog.example.com.', 'hatch-connect');
	}
	return '';
}

/** A live region that is always in the page, so what lands inside it is announced. */
function Live({ children }) {
	return <div aria-live="polite" aria-atomic="true">{children}</div>;
}

/** The area under a row that opens for an inline form or a confirmation. */
function Panel({ children, id, label, onClose }) {
	return (
		<div
			id={id}
			role="group"
			aria-label={label}
			onKeyDown={(ev) => { if (ev.key === 'Escape' && onClose) onClose(); }}
			style={{
				margin: '0 0 6px',
				padding: 16,
				background: 'var(--hx-gray-2)',
				border: '1px solid var(--hx-border)',
				borderRadius: 10,
			}}
		>
			{children}
		</div>
	);
}

const fmtTime = (ts) => {
	try {
		return new Date(ts * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
	} catch (e) {
		return '';
	}
};

export default function Connection({ state }) {
	const boot = window.hatchBoot || {};
	const conn = state.connection || {};
	const setup = state.setup || {};
	const setupUrl = boot.setupUrl || 'admin.php?page=hatch-setup';

	const [data, setData] = useState({ phase: 'loading', error: '', status: null });
	const [history, setHistory] = useState({ phase: 'loading', entries: [], error: '' });
	const [openPreflight, setOpenPreflight] = useState(false);
	const [check, setCheck] = useState({ phase: 'idle', result: null, error: null });
	const [refresh, setRefresh] = useState({ phase: 'idle', error: '' });
	const [deploy, setDeploy] = useState({ phase: 'idle', source: '', outcome: null, error: null, fix: '' });
	const [panel, setPanel] = useState('');
	const [domain, setDomain] = useState('');
	const [domainMsg, setDomainMsg] = useState('');
	const [token, setToken] = useState('');
	const [tokenState, setTokenState] = useState({ phase: 'idle', message: '', error: null, fix: '' });
	const [disc, setDisc] = useState({ phase: 'idle', message: '', error: '' });

	// Guards against a double click: state updates are async, a ref is not.
	const busy = useRef({ check: false, deploy: false, token: false, refresh: false, disc: false });
	const lastDeploy = useRef({ source: 'redeploy', domain: '' });
	const triggers = useRef({});
	const redeployRow = useRef(null);
	const cancelDisc = useRef(null);

	const load = useCallback(async (silent) => {
		if (!silent) setData((d) => ({ ...d, phase: 'loading', error: '' }));
		try {
			const status = await hxFetch('deploy/status');
			setData({ phase: 'ready', error: '', status });
		} catch (e) {
			// A refresh in the background must not replace a screen that already works.
			setData((d) => (silent && d.status ? d : { phase: 'error', error: hxErrorNode(e), status: null }));
		}
	}, []);

	const loadHistory = useCallback(async () => {
		setHistory((h) => ({ ...h, phase: h.entries.length ? 'ready' : 'loading', error: '' }));
		try {
			const res = await hxFetch('deploy/history');
			setHistory({ phase: 'ready', entries: (res && res.entries) || [], error: '' });
		} catch (e) {
			setHistory({ phase: 'error', entries: [], error: hxErrorNode(e) });
		}
	}, []);

	useEffect(() => { load(false); loadHistory(); }, [load, loadHistory]);

	// Return keyboard focus to the control that opened a panel when it closes.
	const closePanel = (name) => {
		setPanel('');
		const el = triggers.current[name];
		if (el && el.focus) window.setTimeout(() => el.focus(), 0);
	};
	const openPanel = (name) => {
		setPanel(name);
		window.setTimeout(() => {
			// A confirmation starts on its safe choice, a form on its field.
			const el = name === 'disconnect' ? cancelDisc.current : document.getElementById('hatch-panel-focus-' + name);
			if (el && el.focus) el.focus();
		}, 0);
	};

	const runCheck = async () => {
		if (busy.current.check) return;
		busy.current.check = true;
		setCheck({ phase: 'running', result: null, error: null });
		try {
			const result = await hxFetch('connection-check', { method: 'POST', timeout: CHECK_TIMEOUT });
			setCheck({ phase: 'done', result, error: null });
		} catch (e) {
			setCheck({ phase: 'error', result: null, error: e });
		} finally {
			busy.current.check = false;
		}
	};

	const refreshCache = async () => {
		if (busy.current.refresh) return;
		busy.current.refresh = true;
		setRefresh({ phase: 'running', error: '' });
		try {
			await hxFetch('revalidate', { method: 'POST', body: JSON.stringify({ reason: 'admin-refresh' }), timeout: CHECK_TIMEOUT });
			setRefresh({ phase: 'sent', error: '' });
		} catch (e) {
			setRefresh({ phase: 'error', error: hxErrorNode(e) });
		} finally {
			busy.current.refresh = false;
		}
	};

	// One path for Redeploy, Change domain and "redeploy now" after a token change.
	const runDeploy = async (source, newDomain) => {
		if (busy.current.deploy) return;
		busy.current.deploy = true;
		lastDeploy.current = { source, domain: newDomain || '' };
		setDeploy({ phase: 'running', source, outcome: null, error: null, fix: '' });
		// The "Token saved, redeploy now" prompt has done its job once a deploy starts.
		setTokenState((t) => (t.phase === 'saved' ? { phase: 'idle', message: '', error: null, fix: '' } : t));
		if (source === 'redeploy' && redeployRow.current && redeployRow.current.scrollIntoView) {
			redeployRow.current.scrollIntoView({ block: 'nearest' });
		}
		try {
			const outcome = await hxFetch('deploy/redeploy', {
				method: 'POST',
				body: JSON.stringify(newDomain ? { domain: newDomain } : {}),
				timeout: DEPLOY_TIMEOUT,
			});
			setDeploy({ phase: 'done', source, outcome, error: null, fix: '' });
			if (newDomain) {
				setDomain('');
				setDomainMsg('');
				setPanel('');
			}
		} catch (e) {
			setDeploy({ phase: 'error', source, outcome: null, error: hxErrorNode(e), fix: hxErrorFix(e) });
			if (newDomain) {
				// The submit button was disabled while the deploy ran, so keyboard focus is lost. Put it back in the field.
				window.setTimeout(() => {
					const el = document.getElementById('hatch-panel-focus-domain');
					if (el && el.focus) el.focus();
				}, 0);
			}
		} finally {
			busy.current.deploy = false;
			// The server is the source of truth, whatever the browser saw.
			load(true);
			loadHistory();
		}
	};

	const submitDomain = (ev) => {
		ev.preventDefault();
		const problem = domainProblem(domain);
		setDomainMsg(problem);
		if (problem) {
			const el = document.getElementById('hatch-panel-focus-domain');
			if (el && el.focus) el.focus();
			return;
		}
		runDeploy('domain', domain.trim().toLowerCase());
	};

	const submitToken = async (ev) => {
		ev.preventDefault();
		if (busy.current.token) return;
		const typed = token.trim();
		if (!typed) {
			setTokenState({ phase: 'error', message: '', error: __('Paste the Cloudflare API token first.', 'hatch-connect'), fix: '' });
			return;
		}
		busy.current.token = true;
		setTokenState({ phase: 'running', message: '', error: null, fix: '' });
		try {
			const res = await hxFetch('deploy/cloudflare/token', { method: 'POST', body: JSON.stringify({ token: typed }), timeout: TOKEN_TIMEOUT });
			setToken('');
			setPanel('');
			setTokenState({ phase: 'saved', message: (res && res.message) || '', error: null, fix: '' });
			load(true);
		} catch (e) {
			setTokenState({ phase: 'error', message: '', error: hxErrorNode(e), fix: hxErrorFix(e) });
			// The submit button was disabled while the check ran, so keyboard focus is lost. Put it back in the field.
			window.setTimeout(() => {
				const el = document.getElementById('hatch-panel-focus-token');
				if (el && el.focus) el.focus();
			}, 0);
		} finally {
			busy.current.token = false;
		}
	};

	const disconnect = async () => {
		if (busy.current.disc) return;
		busy.current.disc = true;
		setDisc({ phase: 'running', message: '', error: '' });
		try {
			const res = await hxFetch('deploy/disconnect', { method: 'POST', timeout: DEPLOY_TIMEOUT });
			setDisc({ phase: 'done', message: (res && res.message) || '', profileUrl: (res && res.profile_url) || '', error: '' });
		} catch (e) {
			setDisc({ phase: 'error', message: '', error: hxErrorNode(e) });
		} finally {
			busy.current.disc = false;
		}
	};

	// The button that fixes an error, named by the server in data.fix.
	const fixButton = (fix, retry) => {
		if (fix === 'change_token') {
			return <HxBtn size="sm" variant="ghost" onClick={() => openPanel('token')}>{__('Change token', 'hatch-connect')}</HxBtn>;
		}
		if (fix === 'change_domain') {
			return <HxBtn size="sm" variant="ghost" onClick={() => openPanel('domain')}>{__('Change domain', 'hatch-connect')}</HxBtn>;
		}
		if (fix === 'setup') {
			return <HxBtn size="sm" variant="ghost" href={setupUrl}>{__('Open setup', 'hatch-connect')}</HxBtn>;
		}
		if (fix === 'wp_credential') {
			return <HxBtn size="sm" variant="ghost" href={setupUrl}>{__('Enter WordPress account', 'hatch-connect')}</HxBtn>;
		}
		if (fix === 'retry' && retry) {
			return <HxBtn size="sm" variant="ghost" onClick={retry}>{__('Try again', 'hatch-connect')}</HxBtn>;
		}
		return undefined;
	};

	if (data.phase === 'loading') {
		return (
			<HxCard>
				<HxSpinner label={__('Loading the deploy status', 'hatch-connect')} />
			</HxCard>
		);
	}
	if (data.phase === 'error') {
		return (
			<HxNotice
				tone="error"
				title={__('Could not load the deploy status', 'hatch-connect')}
				action={<HxBtn size="sm" variant="ghost" onClick={() => load(false)}>{__('Try again', 'hatch-connect')}</HxBtn>}
			>
				{data.error}
			</HxNotice>
		);
	}

	if (disc.phase === 'done') {
		return (
			<HxCard>
				<HxNotice
					tone="success"
					title={__('Disconnected', 'hatch-connect')}
					action={disc.profileUrl ? <HxBtn size="sm" variant="ghost" href={disc.profileUrl}>{__('Revoke in your profile', 'hatch-connect')}</HxBtn> : undefined}
				>{disc.message}</HxNotice>
				<div style={{ marginTop: 18 }}>
					<HxBtn variant="brand" href={setupUrl}>{__('Set up Hatch', 'hatch-connect')}</HxBtn>
				</div>
			</HxCard>
		);
	}

	const status = data.status || {};
	const st = status.state || {};
	const last = status.last;
	const isLive = !!status.deployed;
	const hasToken = !!status.has_token;
	const url = publicUrlOf(st);
	const prettyUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
	const working = deploy.phase === 'running' || tokenState.phase === 'running' || disc.phase === 'running';

	let servedFrom = __('A workers.dev address', 'hatch-connect');
	if (st.domain && st.mount_mode === 'subfolder') {
		/* translators: 1: domain name, 2: folder path such as /blog. */
		servedFrom = sprintf(__('%1$s, in the folder %2$s', 'hatch-connect'), st.domain, st.subpath || '');
	} else if (st.domain) {
		/* translators: %s: domain name. */
		servedFrom = sprintf(__('%s, the whole domain', 'hatch-connect'), st.domain);
	}

	// The newest check wins over what the page loaded with.
	const heartRaw = check.result && check.result.healthClass
		? { healthClass: check.result.healthClass, healthLabel: check.result.healthLabel }
		: conn.heartbeat || {};
	const heart = HEART[heartRaw.healthClass] || HEART.muted;
	const heartDesc = heartRaw.healthLabel || __('No check has run yet. The first one runs within a few minutes.', 'hatch-connect');
	const checks = conn.preflight || [];
	const passed = checks.filter((c) => c.ok).length;
	const total = checks.length;
	const allGood = total > 0 && passed === total;
	const remaining = total - passed;
	/* translators: %d: number of checks that need attention. */
	const attentionDesc = sprintf(_n('%d check needs attention. The connection works. This item can make deploys smoother.', '%d checks need attention. The connection works. These items can make deploys smoother.', remaining, 'hatch-connect'), remaining);

	const deployHere = (source) => deploy.source === source;
	const retryDeploy = () => runDeploy(lastDeploy.current.source, lastDeploy.current.domain);

	// What the Redeploy / Change domain rows show once a deploy has been started from them.
	const deployResult = (source) => {
		if (!deployHere(source)) return null;
		if (deploy.phase === 'running') {
			return (
				<div style={{ padding: '4px 0 10px' }}>
					<HxSpinner label={__('Deploying to Cloudflare. This can take up to a minute. Keep this page open.', 'hatch-connect')} />
				</div>
			);
		}
		if (deploy.phase === 'done' && deploy.outcome) {
			const o = deploy.outcome;
			const warnings = Array.isArray(o.warnings) ? o.warnings : [];
			return (
				<HxNotice
					tone="success"
					role={null}
					title={o.type === 'domain_change' ? __('Domain changed and frontend redeployed', 'hatch-connect') : __('Frontend redeployed', 'hatch-connect')}
					style={{ marginBottom: 10 }}
				>
					{o.public_url && (
						<span style={{ display: 'block' }}>
							{__('Live at', 'hatch-connect')}{' '}
							<a href={o.public_url} target="_blank" rel="noopener noreferrer" className="hx-link" style={{ overflowWrap: 'anywhere' }}>
								{o.public_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
							</a>
						</span>
					)}
					{warnings.map((w, i) => (
						<span key={i} style={{ display: 'block', marginTop: 6 }}>{w}</span>
					))}
				</HxNotice>
			);
		}
		if (deploy.phase === 'error') {
			return (
				<HxNotice
					tone="error"
					role={null}
					title={__('The frontend was not redeployed', 'hatch-connect')}
					action={fixButton(deploy.fix, retryDeploy)}
					style={{ marginBottom: 10 }}
				>
					{deploy.error}
				</HxNotice>
			);
		}
		return null;
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
			{last && last.ok === false && deploy.phase === 'idle' && (
				<HxNotice tone="error" title={__('The last deploy failed', 'hatch-connect')}>{last.message}</HxNotice>
			)}

			{/* Frontend status and actions */}
			<HxCard>
				<HxHead
					iconChildren={isLive ? ICON.link : ICON.offline}
					iconColor={isLive ? 'var(--hx-success)' : 'var(--hx-text-muted)'}
					title={isLive ? __('Your frontend is live', 'hatch-connect') : __('Not deployed yet', 'hatch-connect')}
					desc={
						isLive
							? __('Visitors see the frontend. WordPress stays where you edit.', 'hatch-connect')
							: __('Connect your Cloudflare account to publish the frontend. It takes a few minutes.', 'hatch-connect')
					}
					mb={isLive ? 12 : 18}
				/>

				{isLive ? (
					<>
						<HxRow label={__('Address', 'hatch-connect')} desc={servedFrom}>
							{url ? (
								<a href={url} target="_blank" rel="noopener noreferrer" className="hx-link" style={{ overflowWrap: 'anywhere' }}>{prettyUrl}</a>
							) : (
								<span className="hx-desc" style={{ color: 'var(--hx-text-subtle)' }}>{__('Not available', 'hatch-connect')}</span>
							)}
						</HxRow>

						<HxRow stack label={__('Connection check', 'hatch-connect')} desc={heartDesc}>
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
								<HxBadge color={heart.badge}>{heart.label()}</HxBadge>
								<HxBtn variant="ghost" size="sm" onClick={runCheck} disabled={check.phase === 'running'}>
									{check.phase === 'running' ? __('Checking', 'hatch-connect') : __('Check now', 'hatch-connect')}
								</HxBtn>
							</span>
						</HxRow>
						<Live>
							{check.phase === 'running' && (
								<div style={{ padding: '2px 0 12px' }}>
									<HxSpinner label={__('Checking your frontend. This takes a few seconds.', 'hatch-connect')} />
								</div>
							)}
							{check.phase === 'done' && check.result && (
								<HxNotice
									tone={check.result.tone === 'success' || check.result.tone === 'warning' ? check.result.tone : 'error'}
									role={null}
									title={check.result.title}
									style={{ marginBottom: 6 }}
								>
									{check.result.reason}
									{check.result.next_step && <span style={{ display: 'block', marginTop: 4 }}>{check.result.next_step}</span>}
								</HxNotice>
							)}
							{check.phase === 'error' && (
								<HxNotice
									tone="error"
									role={null}
									title={__('The check could not run', 'hatch-connect')}
									action={<HxBtn size="sm" variant="ghost" onClick={runCheck}>{__('Try again', 'hatch-connect')}</HxBtn>}
									style={{ marginBottom: 6 }}
								>
									{hxErrorNode(check.error)}
								</HxNotice>
							)}
						</Live>

						<HxRow stack label={__('Open frontend', 'hatch-connect')} desc={__('See your live site as a visitor does. Opens in a new tab.', 'hatch-connect')}>
							{url ? (
								<HxBtn variant="ghost" size="sm" href={url}>
									{__('Open frontend', 'hatch-connect')}
									<HxIcon size={13} color="currentColor">{ICON.external}</HxIcon>
								</HxBtn>
							) : (
								<span className="hx-desc" style={{ color: 'var(--hx-text-subtle)' }}>{__('Not available', 'hatch-connect')}</span>
							)}
						</HxRow>

						<HxRow stack label={__('Frontend cache', 'hatch-connect')} desc={__('Make the frontend fetch your latest content now. Use it when a change is not showing.', 'hatch-connect')}>
							<HxBtn variant="ghost" size="sm" onClick={refreshCache} disabled={refresh.phase === 'running'}>
								<HxIcon size={13}>{ICON.refresh}</HxIcon>
								{refresh.phase === 'running' ? __('Refreshing', 'hatch-connect') : __('Refresh', 'hatch-connect')}
							</HxBtn>
						</HxRow>
						<Live>
							{refresh.phase === 'sent' && (
								<HxNotice tone="success" role={null} style={{ marginBottom: 6 }}>
									{__('Cache refresh requested. The frontend picks up your latest content shortly.', 'hatch-connect')}
								</HxNotice>
							)}
							{refresh.phase === 'error' && (
								<HxNotice
									tone="error"
									role={null}
									title={__('Could not refresh the cache', 'hatch-connect')}
									action={<HxBtn size="sm" variant="ghost" onClick={refreshCache}>{__('Try again', 'hatch-connect')}</HxBtn>}
									style={{ marginBottom: 6 }}
								>
									{refresh.error}
								</HxNotice>
							)}
						</Live>

						<div ref={redeployRow}>
							<HxRow stack
								label={__('Redeploy', 'hatch-connect')}
								desc={
									hasToken
										? __('Publish the frontend again with your current settings. It takes up to a minute.', 'hatch-connect')
										: __('Needs a saved Cloudflare token. Use Change token first.', 'hatch-connect')
								}
							>
								<HxBtn
									variant="ghost"
									size="sm"
									onClick={() => runDeploy('redeploy', '')}
									disabled={working || !hasToken}
								>
									{deploy.phase === 'running' && deployHere('redeploy') ? __('Redeploying', 'hatch-connect') : __('Redeploy', 'hatch-connect')}
								</HxBtn>
							</HxRow>
						</div>
						<Live>{deployResult('redeploy')}</Live>

						<HxRow stack
							label={__('Change domain', 'hatch-connect')}
							desc={
								st.domain
									/* translators: %s: where the frontend is served from now, for example "blog.example.com, the whole domain". */
									? sprintf(__('Now served from %s. Move the frontend to a different domain.', 'hatch-connect'), servedFrom)
									: __('Now on a workers.dev address. Move the frontend to your own domain.', 'hatch-connect')
							}
						>
							<HxBtn
								variant="ghost"
								size="sm"
								btnRef={(el) => { triggers.current.domain = el; }}
								ariaExpanded={panel === 'domain'}
								ariaControls="hatch-panel-domain"
								onClick={() => (panel === 'domain' ? closePanel('domain') : openPanel('domain'))}
								disabled={working || !hasToken}
							>
								{__('Change domain', 'hatch-connect')}
							</HxBtn>
						</HxRow>
						{panel === 'domain' && (
							<Panel id="hatch-panel-domain" label={__('Change domain', 'hatch-connect')} onClose={() => { if (deploy.phase !== 'running') closePanel('domain'); }}>
								<form onSubmit={submitDomain} noValidate>
									<HxField
										label={__('New domain', 'hatch-connect')}
										htmlFor="hatch-panel-focus-domain"
										help={__('Only the domain, like blog.example.com. It must already be added to the Cloudflare account that hosts your frontend.', 'hatch-connect')}
									>
										<HxInp
											id="hatch-panel-focus-domain"
											value={domain}
											onChange={(ev) => { setDomain(ev.target.value); setDomainMsg(''); }}
											placeholder="blog.example.com"
											autoComplete="off"
											spellCheck={false}
											mono
											readOnly={deploy.phase === 'running'}
										/>
									</HxField>
									{domainMsg && (
										<div role="alert" className="hx-desc" style={{ color: 'var(--hx-danger)', marginTop: 8 }}>{domainMsg}</div>
									)}
									<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
										<HxBtn type="submit" variant="brand" size="sm" disabled={deploy.phase === 'running'}>
											{deploy.phase === 'running' && deployHere('domain') ? __('Moving', 'hatch-connect') : __('Move to this domain', 'hatch-connect')}
										</HxBtn>
										<HxBtn variant="ghost" size="sm" onClick={() => closePanel('domain')} disabled={deploy.phase === 'running'}>
											{__('Cancel', 'hatch-connect')}
										</HxBtn>
									</div>
								</form>
							</Panel>
						)}
						<Live>{deployResult('domain')}</Live>

						<HxRow stack
							label={__('Change token', 'hatch-connect')}
							last
							desc={
								hasToken
									? __('Replace the Cloudflare token Hatch deploys with. The current one is saved on this site, encrypted.', 'hatch-connect')
									: __('No token is saved. Add one so Hatch can redeploy.', 'hatch-connect')
							}
						>
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
								<HxBadge color={hasToken ? 'green' : 'neutral'}>{hasToken ? __('Saved', 'hatch-connect') : __('Not saved', 'hatch-connect')}</HxBadge>
								<HxBtn
									variant="ghost"
									size="sm"
									btnRef={(el) => { triggers.current.token = el; }}
									ariaExpanded={panel === 'token'}
									ariaControls="hatch-panel-token"
									onClick={() => (panel === 'token' ? closePanel('token') : openPanel('token'))}
									disabled={working}
								>
									{__('Change token', 'hatch-connect')}
								</HxBtn>
							</span>
						</HxRow>
						{panel === 'token' && (
							<Panel id="hatch-panel-token" label={__('Change token', 'hatch-connect')} onClose={() => { if (tokenState.phase !== 'running') closePanel('token'); }}>
								<form onSubmit={submitToken} noValidate>
									<HxField
										label={__('New Cloudflare API token', 'hatch-connect')}
										htmlFor="hatch-panel-focus-token"
										help={__('Hatch checks it with Cloudflare first and saves it only if it works. It is never shown again.', 'hatch-connect')}
									>
										<HxInp
											id="hatch-panel-focus-token"
											type="password"
											value={token}
											onChange={(ev) => setToken(ev.target.value)}
											autoComplete="off"
											spellCheck={false}
											mono
											readOnly={tokenState.phase === 'running'}
											data-lpignore="true"
											data-1p-ignore="true"
										/>
									</HxField>
									<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
										<HxBtn type="submit" variant="brand" size="sm" disabled={tokenState.phase === 'running'}>
											{tokenState.phase === 'running' ? __('Verifying', 'hatch-connect') : __('Verify and save', 'hatch-connect')}
										</HxBtn>
										<HxBtn
											variant="ghost"
											size="sm"
											onClick={() => { setToken(''); setTokenState({ phase: 'idle', message: '', error: null, fix: '' }); closePanel('token'); }}
											disabled={tokenState.phase === 'running'}
										>
											{__('Cancel', 'hatch-connect')}
										</HxBtn>
									</div>
								</form>
							</Panel>
						)}
						<Live>
							{tokenState.phase === 'running' && (
								<div style={{ padding: '4px 0 10px' }}>
									<HxSpinner label={__('Checking the token with Cloudflare', 'hatch-connect')} />
								</div>
							)}
							{tokenState.phase === 'saved' && (
								<HxNotice
									tone="success"
									role={null}
									title={__('Token saved', 'hatch-connect')}
									action={
										<HxBtn size="sm" variant="brand" onClick={() => runDeploy('redeploy', '')} disabled={working}>
											{__('Redeploy now', 'hatch-connect')}
										</HxBtn>
									}
									style={{ marginBottom: 6 }}
								>
									{tokenState.message}
								</HxNotice>
							)}
							{tokenState.phase === 'error' && (
								<HxNotice
									tone="error"
									role={null}
									title={__('The token was not saved', 'hatch-connect')}
									action={fixButton(tokenState.fix === 'change_token' ? '' : tokenState.fix, submitToken)}
									style={{ marginBottom: 6 }}
								>
									{tokenState.error}
								</HxNotice>
							)}
						</Live>

						{/* Danger zone: always last. */}
						<div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--hx-border)' }}>
							<div id="hatch-danger-heading" className="hx-label" style={{ color: 'var(--hx-danger)' }}>
								{__('Danger zone', 'hatch-connect')}
							</div>
							<HxRow stack
								tone="danger"
								label={__('Disconnect', 'hatch-connect')}
								desc={__('Stops WordPress from feeding the frontend and sends visitors to your WordPress site again. Your theme is never changed. The frontend stays online at Cloudflare until you delete it there.', 'hatch-connect')}
								last
							>
								<HxBtn
									variant="ghost"
									size="sm"
									btnRef={(el) => { triggers.current.disc = el; }}
									ariaExpanded={panel === 'disconnect'}
									ariaControls="hatch-panel-disconnect"
									onClick={() => (panel === 'disconnect' ? closePanel('disc') : openPanel('disconnect'))}
									disabled={working}
								>
									{__('Disconnect', 'hatch-connect')}
								</HxBtn>
							</HxRow>
							{panel === 'disconnect' && (
								<div
									id="hatch-panel-disconnect"
									role="group"
									aria-labelledby="hatch-disc-title"
									onKeyDown={(ev) => { if (ev.key === 'Escape' && disc.phase !== 'running') closePanel('disc'); }}
									style={{ marginTop: 6, padding: 16, border: '1px solid var(--hx-danger-edge)', borderRadius: 10, background: 'var(--hx-danger-soft)' }}
								>
									<div id="hatch-disc-title" className="hx-label" style={{ color: 'var(--hx-text)' }}>
										{__('Disconnect this site from the frontend?', 'hatch-connect')}
									</div>
									<p className="hx-desc" style={{ margin: '4px 0 12px', color: 'var(--hx-text)' }}>
										{__('Hatch forgets the saved WordPress account and application password and the saved Cloudflare token. Hatch did not create that application password, so you revoke it yourself in your profile afterwards. This cannot be undone from here. You would run the setup again to reconnect.', 'hatch-connect')}
									</p>
									<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
										<HxBtn variant="danger" size="sm" onClick={disconnect} disabled={disc.phase === 'running'}>
											{disc.phase === 'running' ? __('Disconnecting', 'hatch-connect') : __('Yes, disconnect', 'hatch-connect')}
										</HxBtn>
										<HxBtn
											variant="ghost"
											size="sm"
											btnRef={(el) => { cancelDisc.current = el; }}
											onClick={() => closePanel('disc')}
											disabled={disc.phase === 'running'}
										>
											{__('Cancel', 'hatch-connect')}
										</HxBtn>
									</div>
								</div>
							)}
							<Live>
								{disc.phase === 'error' && (
									<HxNotice tone="error" role={null} title={__('Could not disconnect', 'hatch-connect')} style={{ marginTop: 10 }}>
										{disc.error}
									</HxNotice>
								)}
							</Live>
						</div>
					</>
				) : (
					<HxBtn variant="brand" href={setupUrl}>{__('Set up Hatch', 'hatch-connect')}</HxBtn>
				)}
			</HxCard>

			{/* Deployment history */}
			{isLive && (
				<HxCard>
					<HxHead
						iconChildren={ICON.history}
						iconColor="var(--hx-text-muted)"
						title={__('Deployment history', 'hatch-connect')}
						desc={__('The latest deploys from this site. Cache refreshes are not listed.', 'hatch-connect')}
						mb={14}
					/>
					{history.phase === 'loading' && <HxSpinner label={__('Loading the history', 'hatch-connect')} />}
					{history.phase === 'error' && (
						<HxNotice
							tone="error"
							title={__('Could not load the history', 'hatch-connect')}
							action={<HxBtn size="sm" variant="ghost" onClick={loadHistory}>{__('Try again', 'hatch-connect')}</HxBtn>}
						>
							{history.error}
						</HxNotice>
					)}
					{history.phase === 'ready' && history.entries.length === 0 && (
						<HxEmpty icon={IC.history} title={__('No deploys recorded yet', 'hatch-connect')}>
							{__('Redeploys and domain changes will appear here.', 'hatch-connect')}
						</HxEmpty>
					)}
					{history.phase === 'ready' && history.entries.length > 0 && (
						<table className="hx-hist">
							<thead>
								<tr>
									<th scope="col">{__('When', 'hatch-connect')}</th>
									<th scope="col">{__('Action', 'hatch-connect')}</th>
									<th scope="col">{__('Result', 'hatch-connect')}</th>
									<th scope="col">{__('Details', 'hatch-connect')}</th>
								</tr>
							</thead>
							<tbody>
								{history.entries.map((h, i) => (
									<tr key={h.ts + '-' + i}>
										<td data-label={__('When', 'hatch-connect')}>{fmtTime(h.ts)}</td>
										<td data-label={__('Action', 'hatch-connect')}>{(TYPE_LABEL[h.type] || TYPE_LABEL.initial)()}</td>
										<td data-label={__('Result', 'hatch-connect')}>
											<HxBadge color={h.status === 'success' ? 'green' : 'red'}>
												{h.status === 'success' ? __('Success', 'hatch-connect') : __('Failed', 'hatch-connect')}
											</HxBadge>
										</td>
										<td data-label={__('Details', 'hatch-connect')}>{h.message}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</HxCard>
			)}

			{/* Preflight */}
			{total > 0 && (
				<HxCard>
					<HxHead
						iconChildren={allGood ? ICON.check : ICON.alert}
						iconColor={allGood ? 'var(--hx-success)' : 'var(--hx-warning)'}
						title={__('Setup checks', 'hatch-connect')}
						desc={allGood ? __('Every check passes.', 'hatch-connect') : attentionDesc}
						mb={0}
						action={
							<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
								<HxBadge color={allGood ? 'green' : 'yellow'}>{passed} / {total}</HxBadge>
								<HxBtn
									variant="ghost"
									size="sm"
									ariaExpanded={openPreflight}
									ariaControls="hatch-preflight-list"
									onClick={() => setOpenPreflight((o) => !o)}
								>
									{openPreflight ? __('Hide checks', 'hatch-connect') : __('Show checks', 'hatch-connect')}
									<HxIcon size={13} sw={2} style={{ transform: openPreflight ? 'rotate(90deg)' : 'none', transition: 'transform .2s var(--hx-ease)' }}>{ICON.chev}</HxIcon>
								</HxBtn>
							</span>
						}
					/>

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
	const word = kind === 'ok' ? __('Passed', 'hatch-connect') : kind === 'warn' ? __('Warning', 'hatch-connect') : __('Failed', 'hatch-connect');
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
				<div className="hx-label" style={{ color: 'var(--hx-text)' }}>
					<span className="screen-reader-text">{word}: </span>
					{c.label || c.l}
				</div>
				{c.note && (
					<div className="hx-help" style={{ color: 'var(--hx-text-subtle)', marginTop: 3 }}>{c.note}</div>
				)}
			</div>
		</div>
	);
}

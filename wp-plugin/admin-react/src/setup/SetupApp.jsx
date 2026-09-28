/**
 * Hatch setup screen.
 *
 * One path: paste a Cloudflare API token, verify it, choose an account and an
 * optional domain, read what a deploy changes, deploy, see the live address.
 *
 * Everything talks to the /hatch/v1/deploy/* REST routes. The token is typed
 * here only long enough to send it to this site; the server stores it
 * encrypted if the administrator asks it to.
 */
import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { HxIcon, HxBtn, HxBadge, HxCard, HxInp, HxSeg, Chip, HxNotice, HxSpinner, HxField, hxFetch, hxErrorNode } from '../components.jsx';

const PROVIDER = 'cloudflare';
const ACCOUNT_ID_PATTERN = /^[a-f0-9]{32}$/i;

const ICON = {
	external: <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>,
	check: <polyline points="20 6 9 17 4 12" />,
	rocket: <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></>,
};

const selectStyle = {
	width: '100%',
	minHeight: 38,
	padding: '6px 10px',
	borderRadius: 6,
	border: '1px solid var(--hx-border-2)',
	background: 'var(--hx-surface)',
	color: 'var(--hx-fg)',
	fontFamily: 'inherit',
	fontSize: 14,
};

const IDLE_DEPLOY = { phase: 'idle', error: '', message: '', warnings: [] };
const IDLE_VERIFY = { phase: 'idle', error: '', accounts: [] };

/**
 * The address visitors use, from the saved deploy state.
 *
 * @param {Object} state Deploy state returned by GET /deploy/status.
 * @return {string} Full URL, or an empty string.
 */
function publicUrlOf(state) {
	if (!state) return '';
	if (state.domain) {
		return 'https://' + state.domain + (state.mount_mode === 'subfolder' ? state.subpath || '' : '');
	}
	return state.origin || '';
}

function StepCard({ n, title, desc, done, children }) {
	return (
		<HxCard style={{ padding: 20 }}>
			<div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
				<div
					aria-hidden="true"
					style={{
						width: 28,
						height: 28,
						borderRadius: '50%',
						flexShrink: 0,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: 13,
						fontWeight: 600,
						background: done ? 'var(--hx-success)' : 'var(--hx-surface-2)',
						color: done ? 'var(--hx-on-primary)' : 'var(--hx-fg)',
						border: done ? 'none' : '1px solid var(--hx-border-2)',
					}}
				>
					{done ? <HxIcon size={14} color="currentColor" sw={2.5}>{ICON.check}</HxIcon> : n}
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<h2 className="hx-title" style={{ margin: 0, padding: 0, color: 'var(--hx-fg)' }}>{title}</h2>
					{desc && <div className="hx-byline" style={{ color: 'var(--hx-subtle)', marginTop: 3 }}>{desc}</div>}
				</div>
			</div>
			{children}
		</HxCard>
	);
}

function FactRow({ label, children, last }) {
	return (
		<div
			style={{
				display: 'flex',
				gap: 16,
				justifyContent: 'space-between',
				flexWrap: 'wrap',
				padding: '11px 0',
				borderBottom: last ? 'none' : '1px solid var(--hx-border)',
			}}
		>
			<div className="hx-desc" style={{ color: 'var(--hx-subtle)', minWidth: 120 }}>{label}</div>
			<div className="hx-label" style={{ color: 'var(--hx-fg)', flex: '1 1 200px', minWidth: 0, overflowWrap: 'anywhere', textAlign: 'end' }}>{children}</div>
		</div>
	);
}

export default function SetupApp() {
	const boot = window.hatchBoot || {};
	const setup = (boot.state && boot.state.setup) || {};
	const disc = setup.disclosure || {};
	const companion = setup.companionTheme || {};

	const [data, setData] = useState({ phase: 'loading', error: '', provider: null, status: null });
	const [changing, setChanging] = useState(false);

	const [token, setToken] = useState('');
	const [replacing, setReplacing] = useState(false);
	const [verify, setVerify] = useState(IDLE_VERIFY);
	const [accountId, setAccountId] = useState('');
	const [zones, setZones] = useState({ phase: 'idle', error: '', list: [] });
	const [domain, setDomain] = useState('');
	const [mountMode, setMountMode] = useState('root');
	const [subpath, setSubpath] = useState('/blog');
	const [saveToken, setSaveToken] = useState(true);
	const [publicAddress, setPublicAddress] = useState('');
	const [ack, setAck] = useState(false);
	const [allowPermalinks, setAllowPermalinks] = useState(false);
	const [deploy, setDeploy] = useState(IDLE_DEPLOY);
	const [forget, setForget] = useState({ phase: 'idle', error: '' });

	const loadData = useCallback(async () => {
		setData((d) => ({ ...d, phase: 'loading', error: '' }));
		try {
			const [prov, status] = await Promise.all([hxFetch('deploy/providers'), hxFetch('deploy/status')]);
			const provider = ((prov && prov.providers) || []).find((p) => p.id === PROVIDER) || null;
			setData({ phase: 'ready', error: '', provider, status });
		} catch (e) {
			setData({ phase: 'error', error: hxErrorNode(e), provider: null, status: null });
		}
	}, []);

	useEffect(() => { loadData(); }, [loadData]);

	const status = data.status || {};
	const provider = data.provider;
	const hasSavedToken = !!status.has_token;
	const typedToken = token.trim();
	const usingSavedToken = hasSavedToken && !replacing && !typedToken;
	const tokenBody = typedToken ? { token: typedToken } : {};
	const verified = verify.phase === 'ok';
	const accounts = verify.accounts || [];

	const resetVerification = () => {
		setVerify(IDLE_VERIFY);
		setAccountId('');
		setZones({ phase: 'idle', error: '', list: [] });
		setAck(false);
		setAllowPermalinks(false);
	};

	const loadZones = async (body) => {
		setZones({ phase: 'loading', error: '', list: [] });
		try {
			const res = await hxFetch(`deploy/${PROVIDER}/zones`, { method: 'POST', body: JSON.stringify(body) });
			setZones({ phase: 'ok', error: '', list: (res && res.zones) || [] });
		} catch (e) {
			setZones({ phase: 'error', error: hxErrorNode(e), list: [] });
		}
	};

	const runVerify = async () => {
		setVerify({ phase: 'loading', error: '', accounts: [] });
		setDeploy(IDLE_DEPLOY);
		try {
			const res = await hxFetch(`deploy/${PROVIDER}/verify`, { method: 'POST', body: JSON.stringify(tokenBody) });
			const list = (res && res.accounts) || [];
			setVerify({ phase: 'ok', error: '', accounts: list });
			if (list.length === 1) setAccountId(list[0].id);
			loadZones(tokenBody);
		} catch (e) {
			setVerify({ phase: 'error', error: hxErrorNode(e), accounts: [] });
		}
	};

	const startAgain = () => {
		const st = status.state || {};
		setDomain(st.domain || '');
		setMountMode(st.mount_mode === 'subfolder' ? 'subfolder' : 'root');
		setSubpath(st.subpath || '/blog');
		setToken('');
		setReplacing(false);
		resetVerification();
		setDeploy(IDLE_DEPLOY);
		setChanging(true);
	};

	const forgetToken = async () => {
		setForget({ phase: 'busy', error: '' });
		try {
			await hxFetch(`deploy/${PROVIDER}/token`, { method: 'DELETE' });
			setForget({ phase: 'idle', error: '' });
			resetVerification();
			setReplacing(false);
			await loadData();
		} catch (e) {
			setForget({ phase: 'error', error: hxErrorNode(e) });
		}
	};

	const accountReady = accounts.length > 1
		? accountId !== ''
		: accounts.length === 1 || ACCOUNT_ID_PATTERN.test(accountId.trim());
	const needsPublicAddress = !!disc.wpUrlIsPrivate;
	const canDeploy = verified && accountReady && ack && disc.appPasswordsOn !== false && deploy.phase !== 'running';

	const runDeploy = async () => {
		setDeploy({ phase: 'running', error: '', message: '', warnings: [] });
		try {
			const trimmedAddress = publicAddress.trim();
			if (needsPublicAddress && trimmedAddress !== '') {
				const saved = await hxFetch('options', { method: 'POST', body: JSON.stringify({ 'connection.wp_public_url': trimmedAddress }) });
				if (!saved || !saved.applied || saved.applied['connection.wp_public_url'] === undefined) {
					setDeploy({ phase: 'error', error: __('That public address is not a valid web address. Use the form https://example.com.', 'hatch-bridge'), message: '', warnings: [] });
					return;
				}
			}
			const res = await hxFetch(`deploy/${PROVIDER}/run`, {
				method: 'POST',
				body: JSON.stringify({
					...tokenBody,
					save_token: typedToken ? saveToken : false,
					mount_mode: domain.trim() ? mountMode : 'root',
					subpath,
					domain: domain.trim(),
					account_id: accountId.trim(),
					consent: ack === true,
					allow_permalinks: !!disc.permalinksPlain && allowPermalinks,
				}),
			});
			setDeploy({ phase: 'done', error: '', message: (res && res.message) || '', warnings: (res && res.warnings) || [] });
			setToken('');
			setReplacing(false);
			resetVerification();
			setChanging(false);
			await loadData();
		} catch (e) {
			if (e.code === 'hatch_cf_choose_account' && e.data && Array.isArray(e.data.accounts)) {
				setVerify((v) => ({ ...v, accounts: e.data.accounts }));
			}
			setDeploy({ phase: 'error', error: hxErrorNode(e), message: '', warnings: [] });
		}
	};

	// Screen frame.
	const frame = (body) => (
		<div className="hatch-react" style={{ minHeight: '100vh', paddingBottom: 60, background: 'var(--hx-bg)' }}>
			<div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px 0' }}>
				<h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--hx-fg)', lineHeight: 1.2, margin: 0, padding: 0 }}>
					{__('Set up Hatch', 'hatch-bridge')}
				</h1>
				<p style={{ fontSize: 14, color: 'var(--hx-subtle)', margin: '6px 0 0' }}>
					{__('Publish a fast frontend for this WordPress site on your own Cloudflare account.', 'hatch-bridge')}
				</p>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>{body}</div>
				<div style={{ marginTop: 24, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
					{setup.completeUrl && status.deployed && (
						<a href={setup.completeUrl} style={{ color: 'var(--hx-link)' }}>{__('Finish and open the dashboard', 'hatch-bridge')}</a>
					)}
					{setup.skipUrl && !status.deployed && (
						<a href={setup.skipUrl} style={{ color: 'var(--hx-link)' }}>{__('Skip setup for now', 'hatch-bridge')}</a>
					)}
				</div>
			</div>
		</div>
	);

	// Loading, error and empty states.
	if (data.phase === 'loading') {
		return frame(
			<HxCard style={{ padding: 24 }}>
				<HxSpinner label={__('Loading your deploy settings', 'hatch-bridge')} />
			</HxCard>
		);
	}
	if (data.phase === 'error') {
		return frame(
			<HxNotice
				tone="error"
				title={__('Could not load the setup screen', 'hatch-bridge')}
				action={<HxBtn size="sm" variant="ghost" onClick={loadData}>{__('Try again', 'hatch-bridge')}</HxBtn>}
			>
				{data.error}
			</HxNotice>
		);
	}
	if (!provider) {
		return frame(
			<HxNotice
				tone="warning"
				title={__('Cloudflare deploys are not available', 'hatch-bridge')}
				action={<HxBtn size="sm" variant="ghost" onClick={loadData}>{__('Check again', 'hatch-bridge')}</HxBtn>}
			>
				{__('This site did not report a Cloudflare deploy option. Reactivate the plugin and reload this page.', 'hatch-bridge')}
			</HxNotice>
		);
	}

	// Live view.
	if (status.deployed && !changing) {
		const st = status.state || {};
		const url = publicUrlOf(st);
		const last = status.last;
		let servedFrom = __('A workers.dev address, no custom domain', 'hatch-bridge');
		if (st.domain && st.mount_mode === 'subfolder') {
			/* translators: 1: domain name, 2: folder path such as /blog. */
			servedFrom = sprintf(__('%1$s, in the folder %2$s', 'hatch-bridge'), st.domain, st.subpath || '');
		} else if (st.domain) {
			/* translators: %s: domain name. */
			servedFrom = sprintf(__('%s, the whole domain', 'hatch-bridge'), st.domain);
		}
		return frame(
			<>
				{deploy.phase === 'done' && (
					<HxNotice tone="success" title={__('Deployed', 'hatch-bridge')}>{deploy.message}</HxNotice>
				)}
				{last && last.ok === false && (
					<HxNotice tone="error" title={__('The last deploy failed', 'hatch-bridge')}>{last.message}</HxNotice>
				)}
				<HxCard style={{ padding: 20 }}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
						<h2 className="hx-title" style={{ margin: 0, padding: 0, color: 'var(--hx-fg)' }}>{__('Your frontend is deployed', 'hatch-bridge')}</h2>
						<HxBadge color="green">{__('Live', 'hatch-bridge')}</HxBadge>
					</div>
					<FactRow label={__('Address', 'hatch-bridge')}>
						{url ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hx-link)' }}>{url}</a> : __('Not available', 'hatch-bridge')}
					</FactRow>
					<FactRow label={__('Served from', 'hatch-bridge')}>{servedFrom}</FactRow>
					{st.script_name && <FactRow label={__('Worker name', 'hatch-bridge')}>{st.script_name}</FactRow>}
					{st.deployed_at ? (
						<FactRow label={__('Last deployed', 'hatch-bridge')} last>
							{new Date(st.deployed_at * 1000).toLocaleString()}
						</FactRow>
					) : null}
					<div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
						{url && (
							<HxBtn href={url} variant="brand">
								<HxIcon size={13} color="currentColor">{ICON.external}</HxIcon>
								{__('Open the frontend', 'hatch-bridge')}
							</HxBtn>
						)}
						<HxBtn variant="ghost" onClick={startAgain}>{__('Deploy again or change the domain', 'hatch-bridge')}</HxBtn>
					</div>
				</HxCard>
				{deploy.warnings.map((w, i) => (
					<HxNotice key={i} tone="warning">{w}</HxNotice>
				))}
				{hasSavedToken && (
					<HxCard style={{ padding: 20 }}>
						<h2 className="hx-title" style={{ margin: 0, padding: 0, color: 'var(--hx-fg)' }}>{__('Saved Cloudflare token', 'hatch-bridge')}</h2>
						<p className="hx-desc" style={{ color: 'var(--hx-muted)', margin: '6px 0 14px' }}>
							{__('A token is stored, encrypted, on this site so you can deploy again without pasting it. Forgetting it removes it from this site. It does not revoke the token in Cloudflare.', 'hatch-bridge')}
						</p>
						{forget.phase === 'error' && (
							<HxNotice tone="error" style={{ marginBottom: 12 }}>{forget.error}</HxNotice>
						)}
						{forget.phase === 'confirm' ? (
							<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
								<span className="hx-label">{__('Forget the saved token?', 'hatch-bridge')}</span>
								<HxBtn size="sm" variant="danger" onClick={forgetToken}>{__('Yes, forget it', 'hatch-bridge')}</HxBtn>
								<HxBtn size="sm" variant="ghost" onClick={() => setForget({ phase: 'idle', error: '' })}>{__('Cancel', 'hatch-bridge')}</HxBtn>
							</div>
						) : (
							<HxBtn
								size="sm"
								variant="ghost"
								disabled={forget.phase === 'busy'}
								onClick={() => setForget({ phase: 'confirm', error: '' })}
							>
								{forget.phase === 'busy' ? __('Forgetting', 'hatch-bridge') : __('Forget saved token', 'hatch-bridge')}
							</HxBtn>
						)}
					</HxCard>
				)}
			</>
		);
	}

	// Deploy flow.
	const permissions = provider.permissions || [];
	const zoneChoices = (zones.list || []).filter((z) => !accountId || !z.account_id || z.account_id === accountId);
	const themeName = disc.themeName || '';
	let themeLine;
	if (companion.active) {
		themeLine = __('The Hatch Companion theme is already active. It sends visitors of your WordPress address to the frontend. Your earlier theme is put back if you disconnect or deactivate Hatch.', 'hatch-bridge');
	} else if (themeName) {
		/* translators: %s: name of the theme that is active now (used twice). */
		themeLine = sprintf(__('Installs and activates the Hatch Companion theme. Your current theme, %s, is switched off and remembered. Visitors who open your WordPress address are sent to the frontend. %s is put back if you disconnect or deactivate Hatch.', 'hatch-bridge'), themeName, themeName);
	} else {
		themeLine = __('Installs and activates the Hatch Companion theme. Your current theme is switched off and remembered. Visitors who open your WordPress address are sent to the frontend. Your earlier theme is put back if you disconnect or deactivate Hatch.', 'hatch-bridge');
	}
	const readerUser = disc.readerUser || 'hatch-reader';
	/* translators: 1: user name of the read-only account, 2: name of the application password. */
	const appPasswordLine = disc.readerExists
		? sprintf(__('Uses the read-only user %1$s (role Hatch Reader, it can only read). Creates an application password named "%2$s" for it and gives it to the Worker as a secret. Older passwords with that name are removed. No password of your own account is used.', 'hatch-bridge'), readerUser, disc.appPasswordName || '')
		: sprintf(__('Creates a read-only user named %1$s (role Hatch Reader, it can only read and has no password anyone knows). Creates an application password named "%2$s" for it and gives it to the Worker as a secret. No password of your own account is used. Disconnecting removes the user again.', 'hatch-bridge'), readerUser, disc.appPasswordName || '');

	return frame(
		<>
			{changing && status.deployed && (
				<HxNotice
					tone="info"
					title={__('You are deploying again', 'hatch-bridge')}
					action={<HxBtn size="sm" variant="ghost" onClick={() => setChanging(false)}>{__('Cancel', 'hatch-bridge')}</HxBtn>}
				>
					{__('This replaces the frontend that is live now.', 'hatch-bridge')}
				</HxNotice>
			)}

			{/* Step 1: token */}
			<StepCard
				n={1}
				done={verified}
				title={__('Connect your Cloudflare account', 'hatch-bridge')}
				desc={__('Hatch uses a Cloudflare API token to upload the frontend for you.', 'hatch-bridge')}
			>
				{!verified && (
					<div style={{ marginBottom: 16 }}>
						<p className="hx-desc" style={{ color: 'var(--hx-muted)', margin: '0 0 10px' }}>
							{__('Create an API token in Cloudflare with these permissions, then paste it below.', 'hatch-bridge')}
						</p>
						<ul style={{ listStyle: 'none', margin: '0 0 12px', padding: 0 }}>
							{permissions.map((p, i) => (
								<li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '7px 0', borderBottom: i === permissions.length - 1 ? 'none' : '1px solid var(--hx-border)' }}>
									<div style={{ flexShrink: 0, minWidth: 74 }}>
										<HxBadge color={p.required ? 'orange' : 'neutral'}>{p.required ? __('Required', 'hatch-bridge') : __('Optional', 'hatch-bridge')}</HxBadge>
									</div>
									<div style={{ minWidth: 0 }}>
										<div className="hx-label" style={{ color: 'var(--hx-fg)' }}>
											{ /* translators: 1: permission area such as Account, 2: permission name, 3: access level such as Edit. */ sprintf(__('%1$s: %2$s (%3$s)', 'hatch-bridge'), p.scope, p.permission, p.access) }
										</div>
										<div className="hx-desc" style={{ color: 'var(--hx-subtle)' }}>{p.reason}</div>
									</div>
								</li>
							))}
						</ul>
						{setup.cfTokenUrl && (
							<a href={setup.cfTokenUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hx-link)' }}>
								{__('Open Cloudflare API tokens', 'hatch-bridge')}
							</a>
						)}
					</div>
				)}

				{usingSavedToken && !verified && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						<HxNotice tone="info">{__('A Cloudflare token is already saved on this site.', 'hatch-bridge')}</HxNotice>
						<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
							<HxBtn variant="brand" onClick={runVerify} disabled={verify.phase === 'loading'}>
								{verify.phase === 'loading' ? __('Checking', 'hatch-bridge') : __('Check saved token', 'hatch-bridge')}
							</HxBtn>
							<HxBtn variant="ghost" onClick={() => { setReplacing(true); setVerify(IDLE_VERIFY); }}>
								{__('Use a different token', 'hatch-bridge')}
							</HxBtn>
						</div>
					</div>
				)}

				{!usingSavedToken && !verified && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						<HxField
							label={__('Cloudflare API token', 'hatch-bridge')}
							htmlFor="hatch-cf-token"
							help={__('It goes from your browser to this site, and from this site to Cloudflare. Nowhere else.', 'hatch-bridge')}
						>
							<HxInp
								id="hatch-cf-token"
								type="password"
								mono
								autoComplete="off"
								data-1p-ignore="true"
								data-lpignore="true"
								data-bwignore="true"
								spellCheck={false}
								value={token}
								onChange={(e) => { setToken(e.target.value); if (verify.phase !== 'idle') setVerify(IDLE_VERIFY); }}
								onKeyDown={(e) => { if (e.key === 'Enter' && typedToken && verify.phase !== 'loading') { e.preventDefault(); runVerify(); } }}
							/>
						</HxField>
						<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
							<HxBtn variant="brand" onClick={runVerify} disabled={!typedToken || verify.phase === 'loading'}>
								{verify.phase === 'loading' ? __('Checking', 'hatch-bridge') : __('Check token', 'hatch-bridge')}
							</HxBtn>
							{hasSavedToken && (
								<HxBtn variant="ghost" onClick={() => { setReplacing(false); setToken(''); setVerify(IDLE_VERIFY); }}>
									{__('Use the saved token', 'hatch-bridge')}
								</HxBtn>
							)}
						</div>
					</div>
				)}

				{verify.phase === 'loading' && (
					<div style={{ marginTop: 12 }}><HxSpinner label={__('Checking the token with Cloudflare', 'hatch-bridge')} /></div>
				)}
				{verify.phase === 'error' && (
					<HxNotice tone="error" title={__('The token was not accepted', 'hatch-bridge')} style={{ marginTop: 12 }}>
						{verify.error}
					</HxNotice>
				)}
				{verified && (
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
						<span className="hx-label" style={{ color: 'var(--hx-fg)' }}>{__('Token accepted by Cloudflare.', 'hatch-bridge')}</span>
						<HxBtn size="sm" variant="ghost" onClick={() => { resetVerification(); setToken(''); }}>
							{__('Change token', 'hatch-bridge')}
						</HxBtn>
					</div>
				)}
			</StepCard>

			{/* Step 2: account and address */}
			{verified && (
				<StepCard
					n={2}
					title={__('Choose where it will live', 'hatch-bridge')}
					desc={__('Without a domain, the frontend gets a workers.dev address. Add a domain to serve it from your own.', 'hatch-bridge')}
				>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
						{accounts.length > 1 && (
							<HxField label={__('Cloudflare account', 'hatch-bridge')} htmlFor="hatch-cf-account" help={__('This token can reach more than one account.', 'hatch-bridge')}>
								<select id="hatch-cf-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} style={selectStyle}>
									<option value="">{__('Choose an account', 'hatch-bridge')}</option>
									{accounts.map((a) => (
										<option key={a.id} value={a.id}>{a.name || a.id}</option>
									))}
								</select>
							</HxField>
						)}
						{accounts.length === 1 && (
							<FactRow label={__('Cloudflare account', 'hatch-bridge')} last>{accounts[0].name || accounts[0].id}</FactRow>
						)}
						{accounts.length === 0 && (
							<HxField
								label={__('Cloudflare account ID', 'hatch-bridge')}
								htmlFor="hatch-cf-account-id"
								help={__('This token cannot list your accounts. Paste the 32 character account ID from your Cloudflare dashboard, or add the optional Account Settings permission and check the token again.', 'hatch-bridge')}
							>
								<HxInp id="hatch-cf-account-id" mono autoComplete="off" spellCheck={false} value={accountId} onChange={(e) => setAccountId(e.target.value)} />
							</HxField>
						)}

						<HxField
							label={__('Domain (optional)', 'hatch-bridge')}
							htmlFor="hatch-cf-domain"
							help={__('A domain that is already in this Cloudflare account, such as example.com. Leave it empty to use a workers.dev address.', 'hatch-bridge')}
						>
							<HxInp id="hatch-cf-domain" mono autoComplete="off" spellCheck={false} placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
						</HxField>
						{zones.phase === 'loading' && <HxSpinner label={__('Looking up your domains', 'hatch-bridge')} />}
						{zones.phase === 'error' && (
							<HxNotice tone="info" title={__('Could not list your domains', 'hatch-bridge')}>
								{zones.error} {__('You can still type a domain above.', 'hatch-bridge')}
							</HxNotice>
						)}
						{zones.phase === 'ok' && zoneChoices.length === 0 && (
							<div className="hx-desc" style={{ color: 'var(--hx-subtle)' }}>
								{__('This token sees no domains. Type one above, or add the optional Zone permissions to the token.', 'hatch-bridge')}
							</div>
						)}
						{zoneChoices.length > 0 && (
							<div>
								<div className="hx-desc" style={{ color: 'var(--hx-subtle)', marginBottom: 8 }}>{__('Your domains', 'hatch-bridge')}</div>
								<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
									{zoneChoices.slice(0, 24).map((z) => (
										<Chip key={z.id} label={z.name} active={domain.trim() === z.name} onClick={() => setDomain(domain.trim() === z.name ? '' : z.name)} />
									))}
								</div>
							</div>
						)}

						{domain.trim() !== '' && (
							<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
								<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
									<div className="hx-label" style={{ color: 'var(--hx-fg)' }}>{__('How much of the domain', 'hatch-bridge')}</div>
									<HxSeg
										options={[
											{ value: 'root', label: __('Whole domain', 'hatch-bridge') },
											{ value: 'subfolder', label: __('One folder', 'hatch-bridge') },
										]}
										value={mountMode}
										onChange={setMountMode}
									/>
								</div>
								{mountMode === 'subfolder' && (
									<HxField label={__('Folder', 'hatch-bridge')} htmlFor="hatch-cf-subpath" help={__('Letters, digits, dashes and slashes. For example /blog.', 'hatch-bridge')}>
										<HxInp id="hatch-cf-subpath" mono autoComplete="off" spellCheck={false} value={subpath} onChange={(e) => setSubpath(e.target.value)} />
									</HxField>
								)}
							</div>
						)}
					</div>
				</StepCard>
			)}

			{/* Step 3: review and deploy */}
			{verified && (
				<StepCard
					n={3}
					done={deploy.phase === 'done'}
					title={__('Review the changes, then deploy', 'hatch-bridge')}
					desc={__('Deploying changes this WordPress site as well as your Cloudflare account. Nothing changes until you press Deploy.', 'hatch-bridge')}
				>
					<ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
						<li className="hx-desc" style={{ color: 'var(--hx-fg)' }}>
							<strong>{__('Cloudflare.', 'hatch-bridge')}</strong>{' '}
							{domain.trim()
								? __('Uploads the frontend as a Worker, turns on its workers.dev address, and adds Workers routes so your domain serves it.', 'hatch-bridge')
								: __('Uploads the frontend as a Worker and turns on its workers.dev address.', 'hatch-bridge')}
						</li>
						<li className="hx-desc" style={{ color: 'var(--hx-fg)' }}>
							<strong>{__('Theme.', 'hatch-bridge')}</strong>{' '}{themeLine}
						</li>
						<li className="hx-desc" style={{ color: 'var(--hx-fg)' }}>
							<strong>{__('Permalinks.', 'hatch-bridge')}</strong>{' '}
							{disc.permalinksPlain
								? __('Your permalinks are set to Plain. The frontend needs Post name (/%postname%/) to find your content. They are changed only if you tick the box below.', 'hatch-bridge')
								: __('Your permalink settings stay as they are.', 'hatch-bridge')}
						</li>
						<li className="hx-desc" style={{ color: 'var(--hx-fg)' }}>
							<strong>{__('Application password.', 'hatch-bridge')}</strong>{' '}{appPasswordLine}
						</li>
					</ul>

					{disc.appPasswordsOn === false && (
						<HxNotice
							tone="error"
							title={__('Application passwords are turned off', 'hatch-bridge')}
							style={{ marginBottom: 14 }}
							action={disc.appPasswordsUrl ? <HxBtn size="sm" variant="ghost" href={disc.appPasswordsUrl}>{__('Open your profile', 'hatch-bridge')}</HxBtn> : null}
						>
							{__('WordPress turns application passwords off when the site is not on HTTPS, and when a plugin or setting disables them. Switch the site to HTTPS or turn them back on, then come back to deploy.', 'hatch-bridge')}
						</HxNotice>
					)}

					{needsPublicAddress && (
						<div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
							<HxNotice tone="warning" title={__('Cloudflare cannot reach this site yet', 'hatch-bridge')}>
								{ /* translators: %s: this site's address, for example http://localhost:8810. */ sprintf(__('%s is a local or private address. The deployed frontend will not be able to load your content until this site has an address that is reachable from the internet.', 'hatch-bridge'), disc.wpUrl || '') }
							</HxNotice>
							<HxField
								label={__('Public address of this site (optional)', 'hatch-bridge')}
								htmlFor="hatch-wp-public"
								help={__('If this site is reachable from the internet at another address, enter it here. The frontend will read content from it.', 'hatch-bridge')}
							>
								<HxInp id="hatch-wp-public" mono autoComplete="off" spellCheck={false} placeholder="https://example.com" value={publicAddress} onChange={(e) => setPublicAddress(e.target.value)} />
							</HxField>
						</div>
					)}

					{typedToken && (
						<label className="hx-checkbox" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12, color: 'var(--hx-fg)' }}>
							<input type="checkbox" checked={saveToken} onChange={(e) => setSaveToken(e.target.checked)} style={{ marginTop: 2 }} />
							<span className="hx-desc" style={{ color: 'var(--hx-fg)' }}>
								{__('Keep this token on this site, encrypted, so I can deploy again without pasting it. You can forget it later.', 'hatch-bridge')}
							</span>
						</label>
					)}

					{disc.permalinksPlain && (
						<label className="hx-checkbox" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12, color: 'var(--hx-fg)' }}>
							<input type="checkbox" checked={allowPermalinks} onChange={(e) => setAllowPermalinks(e.target.checked)} style={{ marginTop: 2 }} />
							<span className="hx-desc" style={{ color: 'var(--hx-fg)' }}>
								{__('Change my permalinks from Plain to Post name. Leave this off to change them yourself under Settings, Permalinks. Until then the frontend cannot look up your posts.', 'hatch-bridge')}
							</span>
						</label>
					)}

					<label className="hx-checkbox" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16, color: 'var(--hx-fg)' }}>
						<input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} style={{ marginTop: 2 }} />
						<span className="hx-desc" style={{ color: 'var(--hx-fg)' }}>
							{__('I have read these changes and want to deploy.', 'hatch-bridge')}
						</span>
					</label>

					{!accountReady && (
						<div className="hx-desc" style={{ color: 'var(--hx-subtle)', marginBottom: 10 }}>
							{accounts.length > 1
								? __('Choose a Cloudflare account above to continue.', 'hatch-bridge')
								: __('Enter a valid Cloudflare account ID above to continue.', 'hatch-bridge')}
						</div>
					)}

					{deploy.phase === 'error' && (
						<HxNotice tone="error" title={__('The deploy did not finish', 'hatch-bridge')} style={{ marginBottom: 14 }}>
							{deploy.error}
						</HxNotice>
					)}

					{deploy.phase === 'running' ? (
						<HxSpinner label={__('Deploying to Cloudflare. This can take a few minutes. Keep this tab open.', 'hatch-bridge')} />
					) : (
						<HxBtn variant="brand" onClick={runDeploy} disabled={!canDeploy}>
							<HxIcon size={14} color="currentColor">{ICON.rocket}</HxIcon>
							{__('Deploy to Cloudflare', 'hatch-bridge')}
						</HxBtn>
					)}
				</StepCard>
			)}
		</>
	);
}

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
import { useState, useEffect, useCallback, useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { HxIcon, HxBtn, HxBadge, HxCard, HxRow, HxToggle, HxInp, HxSelect, HxSeg, Chip, HxNotice, HxSpinner, HxField, hxFetch, hxErrorNode } from '../components.jsx';
import { IC } from '../icons.jsx';

const PROVIDER = 'cloudflare';
const ACCOUNT_ID_PATTERN = /^[a-f0-9]{32}$/i;

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

function StepCard({ n, title, desc, done, titleRef, children }) {
	return (
		<HxCard>
			<div style={{ display: 'flex', gap: '10px 14px', alignItems: 'flex-start', marginBottom: 20 }}>
				<div
					aria-hidden="true"
					style={{
						width: 38,
						height: 38,
						borderRadius: 10,
						flexShrink: 0,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: 15,
						fontWeight: 600,
						background: done ? 'var(--hx-success-subtle)' : 'var(--hx-surface-2)',
						color: done ? 'var(--hx-success)' : 'var(--hx-fg)',
					}}
				>
					{done ? <HxIcon size={18} color="currentColor">{IC.check}</HxIcon> : n}
				</div>
				<div style={{ flex: '1 1 190px', minWidth: 0, paddingTop: 1 }}>
					<h2 ref={titleRef} tabIndex={titleRef ? -1 : undefined} className="hx-title" style={{ margin: 0, padding: 0, color: 'var(--hx-fg)' }}>{title}</h2>
					{desc && <div className="hx-byline" style={{ color: 'var(--hx-subtle)', marginTop: 3 }}>{desc}</div>}
				</div>
			</div>
			{children}
		</HxCard>
	);
}

/**
 * Three-step tracker. Each step shows a number or a tick plus its name, and the
 * current one is marked with aria-current, so the state never rests on colour.
 *
 * @param {number} current 1, 2 or 3. 4 means every step is done.
 */
function Stepper({ current }) {
	const steps = [
		__('Connect Cloudflare', 'hatch-connect'),
		__('Choose an address', 'hatch-connect'),
		__('Review and deploy', 'hatch-connect'),
	];
	return (
		<ol className="hx-stepper" aria-label={__('Setup steps', 'hatch-connect')}>
			{steps.map((label, i) => {
				const n = i + 1;
				const done = current > n;
				return (
					<li key={n} className={done ? 'is-done' : undefined} aria-current={current === n ? 'step' : undefined}>
						<span className="hx-step-dot" aria-hidden="true">
							{done ? <HxIcon size={12} color="currentColor" sw={3}>{IC.check}</HxIcon> : n}
						</span>
						<span>
							{label}
							{done && <span className="screen-reader-text">{' ' + __('(done)', 'hatch-connect')}</span>}
						</span>
					</li>
				);
			})}
		</ol>
	);
}

function Ticks({ items }) {
	return (
		<ul className="hx-ticks">
			{items.map((it, i) => (
				<li key={i}>
					<HxIcon size={14} color="currentColor" sw={2.5}>{IC.check}</HxIcon>
					<span>{it}</span>
				</li>
			))}
		</ul>
	);
}

/**
 * Plain-text list of the permissions, ready to read off while Cloudflare's own
 * token form is open in another tab.
 *
 * @param {Array} permissions Permission rows from the provider.
 * @return {string} One line per permission.
 */
function permissionsAsText(permissions) {
	return permissions
		.map((p) => {
			const line = p.scope + ', ' + p.permission + ', ' + p.access;
			return p.required ? line : line + ' ' + __('(optional)', 'hatch-connect');
		})
		.join('\n');
}

function CopyPermissions({ text }) {
	const [state, setState] = useState('idle');
	const copy = async () => {
		try {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(text);
			} else {
				const area = document.createElement('textarea');
				area.value = text;
				area.setAttribute('readonly', '');
				area.style.position = 'fixed';
				area.style.insetBlockStart = '-1000px';
				document.body.appendChild(area);
				area.select();
				const ok = document.execCommand('copy');
				document.body.removeChild(area);
				if (!ok) throw new Error('copy');
			}
			setState('done');
		} catch (e) {
			setState('failed');
		}
		window.setTimeout(() => setState('idle'), 2500);
	};
	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
			<HxBtn size="sm" variant="ghost" onClick={copy}>
				<HxIcon size={13} color="currentColor">{IC.copy}</HxIcon>
				{__('Copy the list', 'hatch-connect')}
			</HxBtn>
			<span role="status" className="hx-desc" style={{ color: 'var(--hx-muted)' }}>
				{state === 'done' && __('Copied.', 'hatch-connect')}
				{state === 'failed' && __('Could not copy. Select the list and copy it by hand.', 'hatch-connect')}
			</span>
		</span>
	);
}

function FactRow({ label, children, last }) {
	return (
		<HxRow label={label} last={last}>
			<span className="hx-desc" style={{ color: 'var(--hx-fg)', overflowWrap: 'anywhere' }}>{children}</span>
		</HxRow>
	);
}

export default function SetupApp() {
	const boot = window.hatchBoot || {};
	const setup = (boot.state && boot.state.setup) || {};
	const disc = setup.disclosure || {};
	const tabUrl = (tab) => (boot.adminUrl || 'admin.php?page=hatch') + '#' + tab;

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
	const [wpUser, setWpUser] = useState('');
	const [wpPass, setWpPass] = useState('');
	const [replacingWp, setReplacingWp] = useState(false);
	const [allowPermalinks, setAllowPermalinks] = useState(false);
	const [deploy, setDeploy] = useState(IDLE_DEPLOY);
	const [forget, setForget] = useState({ phase: 'idle', error: '' });
	const [showToken, setShowToken] = useState(false);
	const step2Ref = useRef(null);
	const liveRef = useRef(null);

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
	const savedWp = status.wp_credential || {};
	const usingSavedWp = !!savedWp.saved && !replacingWp;
	const wpCredentialReady = usingSavedWp || (wpUser.trim() !== '' && wpPass.trim() !== '');
	const tokenBody = typedToken ? { token: typedToken } : {};
	const verified = verify.phase === 'ok';
	const accounts = verify.accounts || [];

	// Move keyboard and screen-reader focus to the new heading when the step
	// changes, so nobody is left on a button that has just disappeared.
	useEffect(() => {
		if (verified && step2Ref.current) step2Ref.current.focus();
	}, [verified]);
	useEffect(() => {
		if (deploy.phase === 'done' && liveRef.current) liveRef.current.focus();
	}, [deploy.phase, data.phase]);
	// A deploy can take a few minutes. Ask before the tab is closed mid-way.
	useEffect(() => {
		if (deploy.phase !== 'running') return undefined;
		const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
		window.addEventListener('beforeunload', warn);
		return () => window.removeEventListener('beforeunload', warn);
	}, [deploy.phase]);

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
	const canDeploy = verified && accountReady && ack && wpCredentialReady && disc.appPasswordsOn !== false && deploy.phase !== 'running';

	const runDeploy = async () => {
		setDeploy({ phase: 'running', error: '', message: '', warnings: [] });
		try {
			const trimmedAddress = publicAddress.trim();
			if (needsPublicAddress && trimmedAddress !== '') {
				const saved = await hxFetch('options', { method: 'POST', body: JSON.stringify({ 'connection.wp_public_url': trimmedAddress }) });
				if (!saved || !saved.applied || saved.applied['connection.wp_public_url'] === undefined) {
					setDeploy({ phase: 'error', error: __('That public address is not a valid web address. Use the form https://example.com.', 'hatch-connect'), message: '', warnings: [] });
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
					...(usingSavedWp ? {} : { wp_user: wpUser.trim(), wp_password: wpPass }),
					allow_permalinks: !!disc.permalinksPlain && allowPermalinks,
				}),
			});
			setDeploy({ phase: 'done', error: '', message: (res && res.message) || '', warnings: (res && res.warnings) || [] });
			setToken('');
			setReplacing(false);
			setWpPass('');
			setReplacingWp(false);
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

	// Screen frame. stepperAt is 0 to hide the step tracker.
	const frame = (body, stepperAt = 0) => (
		<div className="hatch-react" style={{ minHeight: '100vh', paddingBottom: 60, background: 'var(--hx-bg)' }}>
			<div className="hx-wiz">
				<div className="hx-wiz-head">
					<h1>{__('Set up Hatch', 'hatch-connect')}</h1>
					<p>{__('Publish a fast frontend for this site on your own Cloudflare account. It takes a few minutes, and you can undo it.', 'hatch-connect')}</p>
					{stepperAt > 0 && <Stepper current={stepperAt} />}
				</div>
				<div className="hx-wiz-stack">{body}</div>
				<div className="hx-wiz-foot">
					{setup.completeUrl && status.deployed && (
						<a href={setup.completeUrl} className="hx-link">{__('Finish and open the dashboard', 'hatch-connect')}</a>
					)}
					{setup.skipUrl && !status.deployed && (
						<a href={setup.skipUrl} className="hx-link">{__('Skip setup for now', 'hatch-connect')}</a>
					)}
				</div>
			</div>
		</div>
	);

	// Loading, error and empty states.
	if (data.phase === 'loading') {
		return frame(
			<HxCard>
				<HxSpinner label={__('Loading your deploy settings', 'hatch-connect')} />
			</HxCard>
		);
	}
	if (data.phase === 'error') {
		return frame(
			<HxNotice
				tone="error"
				title={__('Could not load the setup screen', 'hatch-connect')}
				action={<HxBtn size="sm" variant="ghost" onClick={loadData}>{__('Try again', 'hatch-connect')}</HxBtn>}
			>
				{data.error}
			</HxNotice>
		);
	}
	if (!provider) {
		return frame(
			<HxNotice
				tone="warning"
				title={__('Cloudflare deploys are not available', 'hatch-connect')}
				action={<HxBtn size="sm" variant="ghost" onClick={loadData}>{__('Check again', 'hatch-connect')}</HxBtn>}
			>
				{__('This site did not report a Cloudflare deploy option. Reactivate the plugin and reload this page.', 'hatch-connect')}
			</HxNotice>
		);
	}

	// Live view.
	if (status.deployed && !changing) {
		const st = status.state || {};
		const url = publicUrlOf(st);
		const last = status.last;
		const justDone = deploy.phase === 'done';
		let servedFrom = __('A free workers.dev address, no custom domain', 'hatch-connect');
		if (st.domain && st.mount_mode === 'subfolder') {
			/* translators: 1: domain name, 2: folder path such as /blog. */
			servedFrom = sprintf(__('%1$s, in the folder %2$s', 'hatch-connect'), st.domain, st.subpath || '');
		} else if (st.domain) {
			/* translators: %s: domain name. */
			servedFrom = sprintf(__('%s, the whole domain', 'hatch-connect'), st.domain);
		}
		const nextSteps = [
			{ href: tabUrl('design'), title: __('Change the design', 'hatch-connect'), desc: __('Pick a theme, colours and fonts for your frontend.', 'hatch-connect') },
			{ href: tabUrl('security'), title: __('Add spam protection', 'hatch-connect'), desc: __('Turn on Cloudflare Turnstile, a check that keeps bots out of your forms and login page. It is optional.', 'hatch-connect') },
			{ href: tabUrl('connection'), title: __('Check the connection', 'hatch-connect'), desc: __('See that your frontend answers and when it last updated.', 'hatch-connect') },
		];
		return frame(
			<>
				{justDone && deploy.message && (
					<HxNotice tone="success" title={__('Deployed', 'hatch-connect')}>{deploy.message}</HxNotice>
				)}
				{last && last.ok === false && (
					<HxNotice tone="error" title={__('The last deploy failed', 'hatch-connect')}>{last.message}</HxNotice>
				)}
				<HxCard>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
						<h2 ref={liveRef} tabIndex={-1} className="hx-title" style={{ margin: 0, padding: 0, color: 'var(--hx-fg)' }}>
							{justDone ? __('Your frontend is live', 'hatch-connect') : __('Your frontend is deployed', 'hatch-connect')}
						</h2>
						<HxBadge color="green">{__('Live', 'hatch-connect')}</HxBadge>
					</div>
					{url ? (
						<a className="hx-live-url" href={url} target="_blank" rel="noopener noreferrer">
							{url}
							<span className="screen-reader-text">{' ' + __('(opens in a new tab)', 'hatch-connect')}</span>
						</a>
					) : null}
					<div style={{ marginTop: 12 }}>
						<FactRow label={__('Served from', 'hatch-connect')}>{servedFrom}</FactRow>
						{st.script_name && <FactRow label={__('Worker name', 'hatch-connect')}>{st.script_name}</FactRow>}
						{st.deployed_at ? (
							<FactRow label={__('Last deployed', 'hatch-connect')} last>
								{new Date(st.deployed_at * 1000).toLocaleString()}
							</FactRow>
						) : null}
					</div>
					<div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
						{url && (
							<HxBtn href={url} variant="brand">
								<HxIcon size={13} color="currentColor">{IC.externalLink}</HxIcon>
								{__('Open your frontend', 'hatch-connect')}
								<span className="screen-reader-text">{__('(opens in a new tab)', 'hatch-connect')}</span>
							</HxBtn>
						)}
						<HxBtn variant="ghost" onClick={startAgain}>{__('Run the setup again', 'hatch-connect')}</HxBtn>
					</div>
				</HxCard>
				{deploy.warnings.map((w, i) => (
					<HxNotice key={i} tone="warning">{w}</HxNotice>
				))}
				<HxCard>
					<h2 className="hx-title" style={{ margin: 0, padding: 0, color: 'var(--hx-fg)' }}>{__('What to do next', 'hatch-connect')}</h2>
					<ul className="hx-next">
						{nextSteps.map((n) => (
							<li key={n.href}>
								<a href={n.href}>
									<span>
										<span className="hx-next-title">{n.title}</span>
										<span className="hx-next-desc" style={{ display: 'block' }}>{n.desc}</span>
									</span>
									<HxIcon size={16} color="currentColor">{IC.chevronRight}</HxIcon>
								</a>
							</li>
						))}
					</ul>
											<HxNotice tone="info" title={__('Want to undo this?', 'hatch-connect')} style={{ marginTop: 14 }}>
							{__('Open the Connection tab and choose Disconnect. Hatch forgets the stored account and visitors see your WordPress site again. The Worker stays in your Cloudflare account until you delete it there.', 'hatch-connect')}
						</HxNotice>
				</HxCard>
				{hasSavedToken && (
					<HxCard>
						<h2 className="hx-title" style={{ margin: 0, padding: 0, color: 'var(--hx-fg)' }}>{__('Saved Cloudflare token', 'hatch-connect')}</h2>
						<p className="hx-desc" style={{ color: 'var(--hx-muted)', margin: '6px 0 14px' }}>
							{__('Your token is saved on this site, encrypted, so you can deploy again without pasting it. Forgetting it removes it from this site. It does not cancel the token in Cloudflare.', 'hatch-connect')}
						</p>
						{forget.phase === 'error' && (
							<HxNotice tone="error" style={{ marginBottom: 12 }}>{forget.error}</HxNotice>
						)}
						{forget.phase === 'confirm' ? (
							<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
								<span className="hx-label">{__('Forget the saved token?', 'hatch-connect')}</span>
								<HxBtn size="sm" variant="danger" onClick={forgetToken}>{__('Yes, forget it', 'hatch-connect')}</HxBtn>
								<HxBtn size="sm" variant="ghost" onClick={() => setForget({ phase: 'idle', error: '' })}>{__('Cancel', 'hatch-connect')}</HxBtn>
							</div>
						) : (
							<HxBtn
								size="sm"
								variant="ghost"
								disabled={forget.phase === 'busy'}
								onClick={() => setForget({ phase: 'confirm', error: '' })}
							>
								{forget.phase === 'busy' ? __('Forgetting', 'hatch-connect') : __('Forget saved token', 'hatch-connect')}
							</HxBtn>
						)}
					</HxCard>
				)}
			</>,
			justDone ? 4 : 0
		);
	}

	// Deploy flow.
	const permissions = provider.permissions || [];
	const zoneChoices = (zones.list || []).filter((z) => !accountId || !z.account_id || z.account_id === accountId);
	const stepAt = !verified ? 1 : (accountReady ? 3 : 2);

	return frame(
		<>
			{changing && status.deployed && (
				<HxNotice
					tone="info"
					title={__('You are deploying again', 'hatch-connect')}
					action={<HxBtn size="sm" variant="ghost" onClick={() => setChanging(false)}>{__('Cancel', 'hatch-connect')}</HxBtn>}
				>
					{__('This replaces the frontend that is live now.', 'hatch-connect')}
				</HxNotice>
			)}

			{/* Before you start: shown until the token has been accepted. */}
			{!verified && !status.deployed && (
				<HxCard>
					<h2 className="hx-title" style={{ margin: 0, padding: 0, color: 'var(--hx-fg)' }}>{__('Before you start', 'hatch-connect')}</h2>
					<p className="hx-desc" style={{ color: 'var(--hx-muted)', margin: '6px 0 0' }}>
						{__('Hatch shows your WordPress content through a fast frontend: the website your visitors see. It runs on Cloudflare, a hosting service. You keep writing in WordPress as you do now.', 'hatch-connect')}
					</p>
					<div className="hx-intro-grid">
						<div>
							<h3>{__('What you need', 'hatch-connect')}</h3>
							<Ticks
								items={[
									<>
										{__('A Cloudflare account. The free plan is enough.', 'hatch-connect')}{' '}
										<a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noopener noreferrer" className="hx-link">
											{__('Create one', 'hatch-connect')}
											<span className="screen-reader-text">{' ' + __('(opens in a new tab)', 'hatch-connect')}</span>
										</a>
									</>,
									__('A Cloudflare token with the permissions in step 1. It is a long password that lets Hatch upload your frontend to your account.', 'hatch-connect'),
									__('A site that is online and uses https.', 'hatch-connect'),
								]}
							/>
						</div>
						<div>
							<h3>{__('What will change', 'hatch-connect')}</h3>
							<Ticks
								items={[
									__('Your Cloudflare account gets one Worker: the small program that runs your frontend.', 'hatch-connect'),
									__('Visitors who open your WordPress address are sent on to the frontend.', 'hatch-connect'),
									__('The frontend reads your content with a WordPress account you create (Subscriber). The deploy creates no users.', 'hatch-connect'),
								]}
							/>
						</div>
					</div>
										<HxNotice tone="info" title={__('Nothing changes until you press Deploy in step 3.', 'hatch-connect')} style={{ marginTop: 16 }}>
						{__('To undo it later, open the Connection tab and choose Disconnect. Hatch forgets the stored account and visitors see your WordPress site again.', 'hatch-connect')}
					</HxNotice>
				</HxCard>
			)}

			{/* Step 1: token */}
			<StepCard
				n={1}
				done={verified}
				title={__('Connect your Cloudflare account', 'hatch-connect')}
				desc={__('Cloudflare gives you a token: a password that lets Hatch upload your frontend, and nothing beyond the permissions you tick.', 'hatch-connect')}
			>
				{!verified && (
					<div style={{ marginBottom: 16 }}>
						<h3 className="hx-label" style={{ margin: '0 0 8px', color: 'var(--hx-fg)' }}>{__('How to create the token', 'hatch-connect')}</h3>
						<ol className="hx-how">
							<li>
								<span>
									{setup.cfTokenUrl ? (
										<a href={setup.cfTokenUrl} target="_blank" rel="noopener noreferrer" className="hx-link">
											{__('Open Cloudflare API tokens', 'hatch-connect')}
											<span className="screen-reader-text">{' ' + __('(opens in a new tab)', 'hatch-connect')}</span>
										</a>
									) : __('Open Cloudflare API tokens', 'hatch-connect')}
									{'. '}{__('Sign in if Cloudflare asks.', 'hatch-connect')}
								</span>
							</li>
							<li><span>{__('Choose Create Token, then a custom token.', 'hatch-connect')}</span></li>
							<li><span>{__('Name it, for example "Hatch", and add the permissions listed below.', 'hatch-connect')}</span></li>
							<li><span>{__('Choose Continue to summary, then Create Token.', 'hatch-connect')}</span></li>
							<li><span>{__('Copy the token before you leave that page, and paste it into the box below.', 'hatch-connect')}</span></li>
						</ol>
						<div className="hx-perm-head">
							<h3 className="hx-label" style={{ margin: 0, color: 'var(--hx-fg)' }}>{__('Permissions to add', 'hatch-connect')}</h3>
							<CopyPermissions text={permissionsAsText(permissions)} />
						</div>
						<ul className="hx-perms">
							{permissions.map((p, i) => (
								<li key={i}>
									<div>
										<HxBadge color={p.required ? 'green' : 'neutral'}>{p.required ? __('Required', 'hatch-connect') : __('Optional', 'hatch-connect')}</HxBadge>
									</div>
									<div style={{ minWidth: 0 }}>
										<div className="hx-label" style={{ color: 'var(--hx-fg)' }}>
											{ /* translators: 1: permission area such as Account, 2: permission name, 3: access level such as Edit. */ sprintf(__('%1$s: %2$s (%3$s)', 'hatch-connect'), p.scope, p.permission, p.access) }
										</div>
										<div className="hx-desc" style={{ color: 'var(--hx-muted)' }}>{p.reason}</div>
									</div>
								</li>
							))}
						</ul>
					</div>
				)}

				{usingSavedToken && !verified && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						<HxNotice tone="info">{__('A Cloudflare token is already saved on this site. Hatch checks it with Cloudflare before going on.', 'hatch-connect')}</HxNotice>
						<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
							<HxBtn variant="brand" onClick={runVerify} disabled={verify.phase === 'loading'}>
								{verify.phase === 'loading' ? __('Checking', 'hatch-connect') : __('Continue', 'hatch-connect')}
							</HxBtn>
							<HxBtn variant="ghost" onClick={() => { setReplacing(true); setVerify(IDLE_VERIFY); }}>
								{__('Use a different token', 'hatch-connect')}
							</HxBtn>
						</div>
					</div>
				)}

				{!usingSavedToken && !verified && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						<HxField
							label={__('Cloudflare API token', 'hatch-connect')}
							htmlFor="hatch-cf-token"
							help={__('Paste the whole token. Spaces at either end are ignored. It goes from your browser to this site, and from this site to Cloudflare. Nowhere else.', 'hatch-connect')}
						>
							<HxInp
								id="hatch-cf-token"
								type={showToken ? 'text' : 'password'}
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
												<HxRow label={__('Show the token as I type', 'hatch-connect')} last>
							<HxToggle on={showToken} onChange={setShowToken} />
						</HxRow>
						<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
							<HxBtn variant="brand" onClick={runVerify} disabled={!typedToken || verify.phase === 'loading'}>
								{verify.phase === 'loading' ? __('Checking', 'hatch-connect') : __('Check token', 'hatch-connect')}
							</HxBtn>
							{hasSavedToken && (
								<HxBtn variant="ghost" onClick={() => { setReplacing(false); setToken(''); setVerify(IDLE_VERIFY); }}>
									{__('Use the saved token', 'hatch-connect')}
								</HxBtn>
							)}
						</div>
					</div>
				)}

				{verify.phase === 'loading' && (
					<div style={{ marginTop: 12 }}><HxSpinner label={__('Checking the token with Cloudflare', 'hatch-connect')} /></div>
				)}
				{verify.phase === 'error' && (
					<HxNotice tone="error" title={__('Cloudflare did not accept the token', 'hatch-connect')} style={{ marginTop: 12 }}>
						{verify.error}
					</HxNotice>
				)}
				{verified && (
					<div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
						<span className="hx-label" style={{ color: 'var(--hx-fg)' }}>{__('Cloudflare accepted the token.', 'hatch-connect')}</span>
						<HxBtn size="sm" variant="ghost" onClick={() => { resetVerification(); setToken(''); }}>
							{__('Use a different token', 'hatch-connect')}
						</HxBtn>
					</div>
				)}
			</StepCard>

			{/* Step 2: account and address */}
			{verified && (
				<StepCard
					n={2}
					done={accountReady}
					titleRef={step2Ref}
					title={__('Choose where it will live', 'hatch-connect')}
					desc={__('Without a domain, your frontend gets a free address ending in workers.dev. You can use your own domain instead.', 'hatch-connect')}
				>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
						{accounts.length > 1 && (
							<HxField label={__('Cloudflare account', 'hatch-connect')} htmlFor="hatch-cf-account" help={__('This token can reach more than one account.', 'hatch-connect')}>
								<HxSelect id="hatch-cf-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
									<option value="">{__('Choose an account', 'hatch-connect')}</option>
									{accounts.map((a) => (
										<option key={a.id} value={a.id}>{a.name || a.id}</option>
									))}
								</HxSelect>
							</HxField>
						)}
						{accounts.length === 1 && (
							<FactRow label={__('Cloudflare account', 'hatch-connect')} last>{accounts[0].name || accounts[0].id}</FactRow>
						)}
						{accounts.length === 0 && (
							<HxField
								label={__('Cloudflare account ID', 'hatch-connect')}
								htmlFor="hatch-cf-account-id"
								help={__('This token cannot list your accounts. Paste the 32 character account ID from your Cloudflare dashboard, or add the optional Account Settings permission and check the token again.', 'hatch-connect')}
							>
								<HxInp id="hatch-cf-account-id" mono autoComplete="off" spellCheck={false} value={accountId} onChange={(e) => setAccountId(e.target.value)} />
							</HxField>
						)}

						<HxField
							label={__('Your own domain (optional)', 'hatch-connect')}
							htmlFor="hatch-cf-domain"
							help={__('A domain that is already in this Cloudflare account, such as example.com. Leave it empty to use the free workers.dev address.', 'hatch-connect')}
						>
							<HxInp id="hatch-cf-domain" mono autoComplete="off" spellCheck={false} placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
						</HxField>
						{zones.phase === 'loading' && <HxSpinner label={__('Looking up your domains', 'hatch-connect')} />}
						{zones.phase === 'error' && (
							<HxNotice tone="info" title={__('Could not list your domains', 'hatch-connect')}>
								{zones.error} {__('You can still type a domain above.', 'hatch-connect')}
							</HxNotice>
						)}
						{zones.phase === 'ok' && zoneChoices.length === 0 && (
														<HxNotice tone="info" title={__('No domains found', 'hatch-connect')}>
								{__('This token cannot see any domains. Type one above, or add the optional Zone permissions to the token.', 'hatch-connect')}
							</HxNotice>
						)}
						{zoneChoices.length > 0 && (
							<div>
								<div className="hx-desc" style={{ color: 'var(--hx-muted)', marginBottom: 8 }}>{__('Pick one of your domains', 'hatch-connect')}</div>
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
									<div className="hx-label" style={{ color: 'var(--hx-fg)' }}>{__('How much of the domain', 'hatch-connect')}</div>
									<HxSeg
										options={[
											{ value: 'root', label: __('Whole domain', 'hatch-connect') },
											{ value: 'subfolder', label: __('One folder', 'hatch-connect') },
										]}
										value={mountMode}
										onChange={setMountMode}
									/>
								</div>
								{mountMode === 'subfolder' && (
									<HxField label={__('Folder', 'hatch-connect')} htmlFor="hatch-cf-subpath" help={__('Letters, digits, dashes and slashes. For example /blog.', 'hatch-connect')}>
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
					title={__('Review the changes, then deploy', 'hatch-connect')}
					desc={__('Deploying changes this WordPress site as well as your Cloudflare account. Nothing changes until you press Deploy.', 'hatch-connect')}
				>
					<ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
						<li className="hx-desc" style={{ color: 'var(--hx-fg)' }}>
							<strong>{__('Cloudflare.', 'hatch-connect')}</strong>{' '}
							{domain.trim()
								? __('Adds one Worker (the small program that runs your frontend), turns on its free workers.dev address, and points your domain at it.', 'hatch-connect')
								: __('Adds one Worker (the small program that runs your frontend) and turns on its free workers.dev address.', 'hatch-connect')}
						</li>
						<li className="hx-desc" style={{ color: 'var(--hx-fg)' }}>
							<strong>{__('Visitors.', 'hatch-connect')}</strong>{' '}{__('Visitors who open your WordPress address are sent on to the frontend. Your theme is not changed.', 'hatch-connect')}
						</li>
						<li className="hx-desc" style={{ color: 'var(--hx-fg)' }}>
							<strong>{__('Permalinks.', 'hatch-connect')}</strong>{' '}
							{disc.permalinksPlain
								? __('Your permalinks (the link format of your posts) are set to Plain, which the frontend cannot read. They are changed to Post name only if you tick the box below.', 'hatch-connect')
								: __('Your permalink settings stay as they are.', 'hatch-connect')}
						</li>
						<li className="hx-desc" style={{ color: 'var(--hx-fg)' }}>
							<strong>{__('WordPress account.', 'hatch-connect')}</strong>{' '}{__('Hatch does not create users or passwords. The user name and application password you enter below are stored encrypted on this site and given to the Worker, which uses them to read your content.', 'hatch-connect')}
						</li>
					</ul>

					{disc.appPasswordsOn === false && (
						<HxNotice
							tone="error"
							title={__('Application passwords are turned off', 'hatch-connect')}
							style={{ marginBottom: 14 }}
							action={disc.appPasswordsUrl ? <HxBtn size="sm" variant="ghost" href={disc.appPasswordsUrl}>{__('Open your profile', 'hatch-connect')}</HxBtn> : null}
						>
							{__('Hatch needs application passwords. WordPress turns them off when the site does not use https, or when a plugin or setting disables them. Switch the site to https or turn them back on, then come back to deploy.', 'hatch-connect')}
						</HxNotice>
					)}

				<div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
					<div className="hx-label" style={{ color: 'var(--hx-fg)' }}>{__('Account the frontend reads your site as', 'hatch-connect')}</div>
					<p className="hx-desc" style={{ margin: 0 }}>
						{__('Create a dedicated account with the Subscriber role, then add an application password to its profile. The frontend only needs to be logged in to read, so Hatch refuses any account that can edit or manage the site.', 'hatch-connect')}
						{' '}
						{disc.newUserUrl && <a href={disc.newUserUrl} target="_blank" rel="noopener noreferrer">{__('Add a user', 'hatch-connect')}<span className="screen-reader-text">{' ' + __('(opens in a new tab)', 'hatch-connect')}</span></a>}
						{disc.newUserUrl && disc.appPasswordsUrl ? ' · ' : ''}
						{disc.appPasswordsUrl && <a href={disc.appPasswordsUrl} target="_blank" rel="noopener noreferrer">{__('Application passwords', 'hatch-connect')}<span className="screen-reader-text">{' ' + __('(opens in a new tab)', 'hatch-connect')}</span></a>}
					</p>
					{usingSavedWp ? (
						<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
							<HxBadge color="green">{__('Saved', 'hatch-connect')}</HxBadge>
							<span className="hx-desc" style={{ color: 'var(--hx-fg)' }}>
								{ /* translators: 1: WordPress user name, 2: masked end of the application password. */ sprintf(__('%1$s, password ends in %2$s', 'hatch-connect'), savedWp.user || '', savedWp.hint || '')}
							</span>
							<HxBtn size="sm" variant="ghost" onClick={() => setReplacingWp(true)}>{__('Replace', 'hatch-connect')}</HxBtn>
						</div>
					) : (
						<>
							<HxField label={__('WordPress user name', 'hatch-connect')} htmlFor="hatch-wp-user">
								<HxInp id="hatch-wp-user" autoComplete="off" spellCheck={false} value={wpUser} onChange={(e) => setWpUser(e.target.value)} />
							</HxField>
							<HxField
								label={__('Application password', 'hatch-connect')}
								htmlFor="hatch-wp-pass"
								help={__('24 letters and numbers, shown once by WordPress in groups of four. Spaces are fine. It is not the account password.', 'hatch-connect')}
							>
								<HxInp id="hatch-wp-pass" type="password" mono autoComplete="new-password" spellCheck={false} value={wpPass} onChange={(e) => setWpPass(e.target.value)} />
							</HxField>
							{savedWp.saved && (
								<div><HxBtn size="sm" variant="ghost" onClick={() => { setReplacingWp(false); setWpUser(''); setWpPass(''); }}>{__('Keep the saved account', 'hatch-connect')}</HxBtn></div>
							)}
						</>
					)}
				</div>

					{needsPublicAddress && (
						<div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
							<HxNotice tone="warning" title={__('Cloudflare cannot reach this site yet', 'hatch-connect')}>
								{ /* translators: %s: this site's address, for example http://localhost:8810. */ sprintf(__('%s is a local or private address, so the deployed frontend will not be able to load your content. Use a site address that works on the internet.', 'hatch-connect'), disc.wpUrl || '') }
							</HxNotice>
							<HxField
								label={__('Public address of this site (optional)', 'hatch-connect')}
								htmlFor="hatch-wp-public"
								help={__('If this site can be reached from the internet at another address, enter it here. The frontend will read your content from it.', 'hatch-connect')}
							>
								<HxInp id="hatch-wp-public" mono autoComplete="off" spellCheck={false} placeholder="https://example.com" value={publicAddress} onChange={(e) => setPublicAddress(e.target.value)} />
							</HxField>
						</div>
					)}

					<div style={{ marginBottom: 16 }}>
							{typedToken && (
								<HxRow
									label={__('Keep this token on this site', 'hatch-connect')}
									desc={__('It is stored encrypted, so you can deploy again without pasting it. You can forget it later.', 'hatch-connect')}
								>
									<HxToggle on={saveToken} onChange={setSaveToken} />
								</HxRow>
							)}
							{disc.permalinksPlain && (
								<HxRow
									label={__('Change my permalinks from Plain to Post name', 'hatch-connect')}
									desc={__('If you leave this off, change them yourself under Settings, Permalinks. Until then the frontend cannot find your posts.', 'hatch-connect')}
								>
									<HxToggle on={allowPermalinks} onChange={setAllowPermalinks} />
								</HxRow>
							)}
							<HxRow
								label={__('I have read these changes and want to deploy', 'hatch-connect')}
								desc={accountReady && !ack && deploy.phase !== 'running' ? __('Turn this on to enable the Deploy button.', 'hatch-connect') : undefined}
								last
							>
								<HxToggle on={ack} onChange={setAck} />
							</HxRow>
						</div>

						{!accountReady && (
							<HxNotice tone="info" style={{ marginBottom: 14 }}>
								{accounts.length > 1
									? __('Choose a Cloudflare account above to continue.', 'hatch-connect')
									: __('Enter a valid Cloudflare account ID above to continue.', 'hatch-connect')}
							</HxNotice>
						)}

						{deploy.phase === 'error' && (
						<HxNotice tone="error" title={__('The deploy did not finish', 'hatch-connect')} style={{ marginBottom: 14 }}>
							{deploy.error}
						</HxNotice>
					)}

					{deploy.phase === 'running' ? (
						<HxSpinner label={__('Deploying to Cloudflare. This takes a few minutes. Keep this tab open until it finishes.', 'hatch-connect')} />
					) : (
						<HxBtn variant="brand" onClick={runDeploy} disabled={!canDeploy}>
							<HxIcon size={14} color="currentColor">{IC.rocket}</HxIcon>
							{__('Deploy to Cloudflare', 'hatch-connect')}
						</HxBtn>
					)}
				</StepCard>
			)}
		</>,
		stepAt
	);
}

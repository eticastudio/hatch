/**
 * Hatch setup screen.
 *
 * Four steps, one question on each screen: connect Cloudflare, choose where the
 * frontend lives, choose the WordPress account it reads with, then review and
 * deploy. Back and Next move between them. Nothing changes until Deploy.
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
const STEP_COUNT = 4;

const IDLE_DEPLOY = { phase: 'idle', error: '', message: '', warnings: [] };
const IDLE_VERIFY = { phase: 'idle', error: '', code: '', accounts: [] };

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

/**
 * Plain-language cause and fix for each token error the server returns.
 * A code that is not listed falls back to the server's own message.
 *
 * @param {string} code Error code from the verify route.
 * @return {{title: string, fix: string}|null} Copy to show, or null.
 */
function tokenErrorCopy(code) {
	const again = {
		title: __('Cloudflare did not answer', 'hatch-connect'),
		fix: __('Nothing was changed. Wait a minute, then press Check token again.', 'hatch-connect'),
	};
	const rejected = {
		title: __('Cloudflare does not recognise this token', 'hatch-connect'),
		fix: __('Copy the whole token again, with nothing missing at the start or the end. If you cannot find it, create a new token with the button above.', 'hatch-connect'),
	};
	const map = {
		hatch_cf_no_token: {
			title: __('Paste your token first', 'hatch-connect'),
			fix: __('Copy the token from Cloudflare, paste it in the box, then press Check token.', 'hatch-connect'),
		},
		hatch_cf_auth: rejected,
		hatch_cf_rejected: rejected,
		hatch_cf_token_inactive: {
			title: __('This token is no longer active', 'hatch-connect'),
			fix: __('It may have expired or been turned off in Cloudflare. Create a new token with the button above.', 'hatch-connect'),
		},
		hatch_cf_permission: {
			title: __('The token is missing a permission', 'hatch-connect'),
			fix: __('Create a new token with the button above. That page sets the permissions for you. Then paste the new token here.', 'hatch-connect'),
		},
		hatch_cf_rate_limited: again,
		hatch_cf_unavailable: again,
		hatch_cf_unreachable: again,
		hatch_cf_bad_response: again,
	};
	return map[code] || null;
}

/**
 * Progress indicator: "Step n of 4" and the four step names. The current step
 * carries aria-current, so the position never rests on colour alone.
 *
 * @param {number} current 1 to STEP_COUNT. STEP_COUNT + 1 means every step is done.
 */
function Stepper({ current }) {
	const steps = [
		__('Connect Cloudflare', 'hatch-connect'),
		__('Choose where it lives', 'hatch-connect'),
		__('WordPress account', 'hatch-connect'),
		__('Review and deploy', 'hatch-connect'),
	];
	return (
		<div className="hx-wiz-progress">
			<p className="hx-wiz-count">
				{/* translators: 1: current step number, 2: total number of steps. */}
				{sprintf(__('Step %1$d of %2$d', 'hatch-connect'), Math.min(current, STEP_COUNT), STEP_COUNT)}
			</p>
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
		</div>
	);
}

/**
 * Title of one step and the one thing the user needs before starting it.
 */
function StepHead({ headRef, title, need }) {
	return (
		<div style={{ marginBottom: 20 }}>
			<h2 ref={headRef} tabIndex={-1} className="hx-title" style={{ margin: 0, padding: 0, color: 'var(--hx-text)' }}>{title}</h2>
			{need && (
				<p className="hx-desc" style={{ color: 'var(--hx-text-muted)', margin: '6px 0 0' }}>
					<strong style={{ color: 'var(--hx-text)' }}>{__('You need:', 'hatch-connect')}</strong>{' '}{need}
				</p>
			)}
		</div>
	);
}

/**
 * Back and Next for a step. Back is hidden on the first step.
 */
function StepNav({ onBack, onNext, nextLabel, nextDisabled }) {
	return (
		<div className="hx-wiz-nav">
			{onBack ? <HxBtn variant="ghost" onClick={onBack}>{__('Back', 'hatch-connect')}</HxBtn> : <span />}
			<HxBtn variant="brand" onClick={onNext} disabled={nextDisabled}>{nextLabel}</HxBtn>
		</div>
	);
}

function FactRow({ label, children, last }) {
	return (
		<HxRow label={label} last={last}>
			<span className="hx-desc" style={{ color: 'var(--hx-text)', overflowWrap: 'anywhere' }}>{children}</span>
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
	const [wizStep, setWizStep] = useState(1);

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
	const stepHeadRef = useRef(null);
	const stepMovedRef = useRef(false);
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
	// Steps after the first need a verified token. Without one, the screen is step 1.
	const step = verified ? wizStep : 1;

	// Move focus to the new step heading, so keyboard and screen-reader users land
	// on the step they moved to. The first render is skipped.
	useEffect(() => {
		if (!stepMovedRef.current) {
			stepMovedRef.current = true;
			return;
		}
		if (stepHeadRef.current) stepHeadRef.current.focus();
	}, [step]);
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
		setVerify({ phase: 'loading', error: '', code: '', accounts: [] });
		setDeploy(IDLE_DEPLOY);
		try {
			const res = await hxFetch(`deploy/${PROVIDER}/verify`, { method: 'POST', body: JSON.stringify(tokenBody) });
			const list = (res && res.accounts) || [];
			setVerify({ phase: 'ok', error: '', code: '', accounts: list });
			if (list.length === 1) setAccountId(list[0].id);
			loadZones(tokenBody);
		} catch (e) {
			setVerify({ phase: 'error', error: hxErrorNode(e), code: e.code || '', accounts: [] });
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
		setWizStep(1);
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
	const appPasswordsOff = disc.appPasswordsOn === false;
	const canDeploy = verified && accountReady && ack && wpCredentialReady && !appPasswordsOff && deploy.phase !== 'running';

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

	// Screen frame. stepperAt is 0 to hide the progress indicator.
	const frame = (body, stepperAt = 0) => (
		<div className="hatch-react" style={{ minHeight: '100vh', paddingBottom: 60, background: 'var(--hx-bg)' }}>
			<div className="hx-wiz">
				<div className="hx-wiz-head">
					<h1>{__('Set up Hatch', 'hatch-connect')}</h1>
					<p>{__('Publish a fast frontend for this site on your own Cloudflare account. You can undo it from the Connection tab.', 'hatch-connect')}</p>
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
			{ href: tabUrl('design'), title: __('Change the design', 'hatch-connect'), desc: __('Pick a theme, colors and fonts for your frontend.', 'hatch-connect') },
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
						<h2 ref={liveRef} tabIndex={-1} className="hx-title" style={{ margin: 0, padding: 0, color: 'var(--hx-text)' }}>
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
								{new Date(st.deployed_at * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
							</FactRow>
						) : null}
					</div>
					<div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
						{url && (
							<HxBtn href={url} external variant="brand">
								<HxIcon size={13} color="currentColor">{IC.externalLink}</HxIcon>
								{__('Open your frontend', 'hatch-connect')}
							</HxBtn>
						)}
						<HxBtn variant="ghost" onClick={startAgain}>{__('Run the setup again', 'hatch-connect')}</HxBtn>
					</div>
				</HxCard>
				{deploy.warnings.map((w, i) => (
					<HxNotice key={i} tone="warning">{w}</HxNotice>
				))}
				<HxCard>
					<h2 className="hx-title" style={{ margin: 0, padding: 0, color: 'var(--hx-text)' }}>{__('What to do next', 'hatch-connect')}</h2>
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
						<h2 className="hx-title" style={{ margin: 0, padding: 0, color: 'var(--hx-text)' }}>{__('Saved Cloudflare token', 'hatch-connect')}</h2>
						<p className="hx-desc" style={{ color: 'var(--hx-text-muted)', margin: '6px 0 14px' }}>
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
			justDone ? STEP_COUNT + 1 : 0
		);
	}

	// Deploy wizard. One step on screen at a time.
	const permissions = provider.permissions || [];
	const zoneChoices = (zones.list || []).filter((z) => !accountId || !z.account_id || z.account_id === accountId);
	const tokenError = verify.phase === 'error' ? tokenErrorCopy(verify.code) : null;
	const goTo = (n) => setWizStep(n);

	// Step 1: connect Cloudflare.
	const stepOne = (
		<HxCard>
			<StepHead
				headRef={step === 1 ? stepHeadRef : undefined}
				title={__('Connect your Cloudflare account', 'hatch-connect')}
				need={__('your Cloudflare account. The free plan is enough.', 'hatch-connect')}
			/>

			{changing && status.deployed && (
				<HxNotice tone="info" style={{ marginBottom: 16 }}>
					{__('You are setting up a new frontend. It replaces the one that is live now, and only when you press Deploy.', 'hatch-connect')}
				</HxNotice>
			)}

			{usingSavedToken && !verified && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					<HxNotice tone="info">{__('A token is already saved on this site. Hatch checks it with Cloudflare before going on.', 'hatch-connect')}</HxNotice>
					<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
						<HxBtn variant="brand" onClick={runVerify} disabled={verify.phase === 'loading'}>
							{verify.phase === 'loading' ? __('Checking', 'hatch-connect') : __('Check saved token', 'hatch-connect')}
						</HxBtn>
						<HxBtn variant="ghost" onClick={() => { setReplacing(true); setVerify(IDLE_VERIFY); }}>
							{__('Use a different token', 'hatch-connect')}
						</HxBtn>
					</div>
				</div>
			)}

			{!usingSavedToken && !verified && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
						{setup.cfTokenUrl && (
							<HxBtn variant="brand" href={setup.cfTokenUrl} external>
								<HxIcon size={13} color="currentColor">{IC.externalLink}</HxIcon>
								{__('Create my Cloudflare token', 'hatch-connect')}
							</HxBtn>
						)}
						<p className="hx-desc" style={{ color: 'var(--hx-text-muted)', margin: 0 }}>
							{__('The button opens Cloudflare in a new tab. The settings are filled in for you.', 'hatch-connect')}
						</p>
					</div>

					<ol className="hx-how">
						<li><span>{__('On the Cloudflare page, follow the steps to the end and create the token.', 'hatch-connect')}</span></li>
						<li><span>{__('Copy the token before you close that page.', 'hatch-connect')}</span></li>
						<li><span>{__('Come back here and paste it below.', 'hatch-connect')}</span></li>
					</ol>

					<details className="hx-key-perms">
						<summary className="hx-label" style={{ color: 'var(--hx-text)', cursor: 'pointer' }}>
							{__('Which permissions the token gets', 'hatch-connect')}
						</summary>
						<ul className="hx-perms" style={{ marginTop: 12 }}>
							{permissions.map((p, i) => (
								<li key={i}>
									<div>
										<HxBadge color={p.required ? 'green' : 'neutral'}>{p.required ? __('Required', 'hatch-connect') : __('Optional', 'hatch-connect')}</HxBadge>
									</div>
									<div style={{ minWidth: 0 }}>
										<div className="hx-label" style={{ color: 'var(--hx-text)' }}>
											{ /* translators: 1: permission area such as Account, 2: permission name, 3: access level such as Edit. */ sprintf(__('%1$s: %2$s (%3$s)', 'hatch-connect'), p.scope, p.permission, p.access) }
										</div>
										<div className="hx-desc" style={{ color: 'var(--hx-text-muted)' }}>{p.reason}</div>
									</div>
								</li>
							))}
						</ul>
					</details>

					<HxField
						label={__('Your Cloudflare token', 'hatch-connect')}
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
					<HxRow label={__('Show the token', 'hatch-connect')} last>
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
				<div style={{ marginTop: 16 }}><HxSpinner label={__('Checking the token with Cloudflare', 'hatch-connect')} /></div>
			)}
			{verify.phase === 'error' && (
				<div style={{ marginTop: 16 }}>
					{tokenError ? (
						<HxNotice tone="error" title={tokenError.title}>{tokenError.fix}</HxNotice>
					) : (
						<HxNotice tone="error" title={__('Cloudflare did not accept the token', 'hatch-connect')}>{verify.error}</HxNotice>
					)}
				</div>
			)}
			{verified && (
				<div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '14px 16px', borderRadius: 12, background: 'var(--hx-success-subtle)' }}>
					<span style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--hx-text)' }}>
						<HxIcon size={18} color="var(--hx-success)" sw={2.5}>{IC.check}</HxIcon>
						<span className="hx-label">{__('Cloudflare accepted your token.', 'hatch-connect')}</span>
					</span>
					<HxBtn size="sm" variant="ghost" onClick={() => { resetVerification(); setToken(''); }}>
						{__('Use a different token', 'hatch-connect')}
					</HxBtn>
				</div>
			)}

			<StepNav onNext={() => goTo(2)} nextLabel={__('Next', 'hatch-connect')} nextDisabled={!verified} />
		</HxCard>
	);

	// Step 2: account and address.
	const stepTwo = (
		<HxCard>
			<StepHead
				headRef={step === 2 ? stepHeadRef : undefined}
				title={__('Choose where your frontend lives', 'hatch-connect')}
				need={accounts.length === 0
					? __('the 32 character ID of your Cloudflare account. Hatch could not find it.', 'hatch-connect')
					: __('nothing new. Your account was found from the token.', 'hatch-connect')}
			/>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
				{accounts.length > 1 && (
					<HxField label={__('Which Cloudflare account?', 'hatch-connect')} htmlFor="hatch-cf-account" help={__('Your token can reach more than one account. Pick the one this site should use.', 'hatch-connect')}>
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
						help={__('Hatch could not list your accounts with this token. Find the 32 character ID in your Cloudflare dashboard and paste it here. Or add the Account Settings, Read permission to the token and check it again.', 'hatch-connect')}
					>
						<HxInp id="hatch-cf-account-id" mono autoComplete="off" spellCheck={false} value={accountId} onChange={(e) => setAccountId(e.target.value)} />
					</HxField>
				)}

				<HxField
					label={__('Your own domain (optional)', 'hatch-connect')}
					htmlFor="hatch-cf-domain"
					help={__('Leave this empty to use Cloudflare\'s free workers.dev address. To use your own domain, it must already be in this Cloudflare account, such as example.com.', 'hatch-connect')}
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
						{__('This token cannot see any domains. Type one above, or leave it empty for the free address.', 'hatch-connect')}
					</HxNotice>
				)}
				{zoneChoices.length > 0 && (
					<div>
						<div className="hx-desc" style={{ color: 'var(--hx-text-muted)', marginBottom: 8 }}>{__('Pick one of your domains', 'hatch-connect')}</div>
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
							<div className="hx-label" style={{ color: 'var(--hx-text)' }}>{__('Use', 'hatch-connect')}</div>
							<HxSeg
								options={[
									{ value: 'root', label: __('The whole domain', 'hatch-connect') },
									{ value: 'subfolder', label: __('One folder only', 'hatch-connect') },
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

			<StepNav
				onBack={() => goTo(1)}
				onNext={() => goTo(3)}
				nextLabel={__('Next', 'hatch-connect')}
				nextDisabled={!accountReady}
			/>
		</HxCard>
	);

	// Step 3: the WordPress account the frontend reads with.
	const stepThree = (
		<HxCard>
			<StepHead
				headRef={step === 3 ? stepHeadRef : undefined}
				title={__('Choose the WordPress account the frontend uses', 'hatch-connect')}
				need={__('a WordPress user account for the frontend to read with. Hatch does not create one.', 'hatch-connect')}
			/>
			<p className="hx-desc" style={{ color: 'var(--hx-text-muted)', margin: '0 0 16px' }}>
				{__('Use a Subscriber account and add an application password to it. The frontend only reads, so Hatch refuses any account that can edit or manage your site.', 'hatch-connect')}
				{' '}
				{disc.newUserUrl && <a href={disc.newUserUrl} target="_blank" rel="noopener noreferrer">{__('Add a user', 'hatch-connect')}<span className="screen-reader-text">{' ' + __('(opens in a new tab)', 'hatch-connect')}</span></a>}
				{disc.newUserUrl && disc.appPasswordsUrl ? ' · ' : ''}
				{disc.appPasswordsUrl && <a href={disc.appPasswordsUrl} target="_blank" rel="noopener noreferrer">{__('Application passwords', 'hatch-connect')}<span className="screen-reader-text">{' ' + __('(opens in a new tab)', 'hatch-connect')}</span></a>}
			</p>

			{appPasswordsOff && (
				<HxNotice
					tone="error"
					title={__('Application passwords are turned off', 'hatch-connect')}
					style={{ marginBottom: 16 }}
					action={disc.appPasswordsUrl ? <HxBtn size="sm" variant="ghost" href={disc.appPasswordsUrl}>{__('Open your profile', 'hatch-connect')}</HxBtn> : null}
				>
					{__('WordPress turns them off when the site is not on https, or when a plugin or setting turns them off. Switch the site to https or turn them back on, then come back here.', 'hatch-connect')}
				</HxNotice>
			)}

			{usingSavedWp ? (
				<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
					<HxBadge color="green">{__('Saved', 'hatch-connect')}</HxBadge>
					<span className="hx-desc" style={{ color: 'var(--hx-text)' }}>
						{ /* translators: %s: WordPress user name. */ sprintf(__('%s, password saved', 'hatch-connect'), savedWp.user || '')}
					</span>
					<HxBtn size="sm" variant="ghost" onClick={() => setReplacingWp(true)}>{__('Replace', 'hatch-connect')}</HxBtn>
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					<HxField label={__('WordPress user name', 'hatch-connect')} htmlFor="hatch-wp-user">
						<HxInp id="hatch-wp-user" autoComplete="off" spellCheck={false} value={wpUser} onChange={(e) => setWpUser(e.target.value)} />
					</HxField>
					<HxField
						label={__('Application password', 'hatch-connect')}
						htmlFor="hatch-wp-pass"
						help={__('The 24 characters WordPress showed you when you made it. Spaces are fine. It is not the account password.', 'hatch-connect')}
					>
						<HxInp id="hatch-wp-pass" type="password" mono autoComplete="new-password" spellCheck={false} value={wpPass} onChange={(e) => setWpPass(e.target.value)} />
					</HxField>
					{savedWp.saved && (
						<div><HxBtn size="sm" variant="ghost" onClick={() => { setReplacingWp(false); setWpUser(''); setWpPass(''); }}>{__('Keep the saved account', 'hatch-connect')}</HxBtn></div>
					)}
				</div>
			)}

			<StepNav
				onBack={() => goTo(2)}
				onNext={() => goTo(4)}
				nextLabel={__('Next', 'hatch-connect')}
				nextDisabled={!wpCredentialReady || appPasswordsOff}
			/>
		</HxCard>
	);

	// Step 4: review and deploy.
	const stepFour = (
		<HxCard>
			<StepHead
				headRef={step === 4 ? stepHeadRef : undefined}
				title={__('Check the changes, then deploy', 'hatch-connect')}
				need={__('about two minutes. Nothing changes until you press Deploy.', 'hatch-connect')}
			/>

			<ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
				<li className="hx-desc" style={{ color: 'var(--hx-text)' }}>
					<strong>{__('Cloudflare.', 'hatch-connect')}</strong>{' '}
					{domain.trim()
						? __('Adds one Worker, the small program that runs your frontend. Turns on its free workers.dev address and points your domain at it.', 'hatch-connect')
						: __('Adds one Worker, the small program that runs your frontend. Turns on its free workers.dev address.', 'hatch-connect')}
				</li>
				<li className="hx-desc" style={{ color: 'var(--hx-text)' }}>
					<strong>{__('Your site.', 'hatch-connect')}</strong>{' '}{__('Visitors who open your WordPress address are sent to the frontend. Your theme stays as it is.', 'hatch-connect')}
				</li>
				{disc.permalinksPlain && (
					<li className="hx-desc" style={{ color: 'var(--hx-text)' }}>
						<strong>{__('Post addresses.', 'hatch-connect')}</strong>{' '}
						{__('Your post addresses are set to Plain, which the frontend cannot read. They change to Post name only if you turn on the switch below.', 'hatch-connect')}
					</li>
				)}
			</ul>

			{needsPublicAddress && (
				<div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
					<HxNotice tone="warning" title={__('Cloudflare cannot reach this site yet', 'hatch-connect')}>
						{ /* translators: %s: this site's address, for example http://localhost:8810. */ sprintf(__('%s is a local or private address, so the frontend cannot load your posts from it. Enter an address that works on the internet, or deploy later.', 'hatch-connect'), disc.wpUrl || '')}
					</HxNotice>
					<HxField
						label={__('Public address of this site (optional)', 'hatch-connect')}
						htmlFor="hatch-wp-public"
						help={__('If this site can also be reached at another address from the internet, enter it here. The frontend reads your posts from it.', 'hatch-connect')}
					>
						<HxInp id="hatch-wp-public" mono autoComplete="off" spellCheck={false} placeholder="https://example.com" value={publicAddress} onChange={(e) => setPublicAddress(e.target.value)} />
					</HxField>
				</div>
			)}

			<div style={{ marginBottom: 16 }}>
				{typedToken && (
					<HxRow
						label={__('Keep this token on this site, encrypted', 'hatch-connect')}
						desc={__('So you can deploy again without pasting it. You can forget it later.', 'hatch-connect')}
					>
						<HxToggle on={saveToken} onChange={setSaveToken} />
					</HxRow>
				)}
				{disc.permalinksPlain && (
					<HxRow
						label={__('Change my post addresses from Plain to Post name', 'hatch-connect')}
						desc={__('If you leave this off, change them yourself under Settings, then Permalinks. Until then the frontend cannot find your posts.', 'hatch-connect')}
					>
						<HxToggle on={allowPermalinks} onChange={setAllowPermalinks} />
					</HxRow>
				)}
				<HxRow
					label={__('I have read these changes and want to deploy', 'hatch-connect')}
					desc={!ack && deploy.phase !== 'running' ? __('Turn this on to enable the Deploy button.', 'hatch-connect') : undefined}
					last
				>
					<HxToggle on={ack} onChange={setAck} />
				</HxRow>
			</div>

			{deploy.phase === 'error' && (
				<HxNotice tone="error" title={__('The deploy did not finish', 'hatch-connect')} style={{ marginBottom: 14 }}>
					{deploy.error}
				</HxNotice>
			)}

			{deploy.phase === 'running' ? (
				<HxSpinner label={__('Deploying to Cloudflare. This takes a few minutes. Keep this tab open until it finishes.', 'hatch-connect')} />
			) : (
				<div className="hx-wiz-nav">
					<HxBtn variant="ghost" onClick={() => goTo(3)}>{__('Back', 'hatch-connect')}</HxBtn>
					<HxBtn variant="brand" onClick={runDeploy} disabled={!canDeploy}>
						<HxIcon size={14} color="currentColor">{IC.rocket}</HxIcon>
						{__('Deploy to Cloudflare', 'hatch-connect')}
					</HxBtn>
				</div>
			)}
		</HxCard>
	);

	const screens = [stepOne, stepTwo, stepThree, stepFour];
	return frame(screens[step - 1], step);
}

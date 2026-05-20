/**
 * Setup Wizard — React shell.
 *
 * Same Claude Design system as the dashboard. PHP supplies the data + nonces
 * via window.hatchBoot.state.setup; each step's form submits to the existing
 * admin-post handlers via real form POSTs so all legacy server logic runs
 * unchanged (theme save, App Password generation, deploy broker flow).
 *
 * Rules from DESIGN-SYSTEM.md enforced here:
 *  • One progress strip (the pill stepper). No second indicator.
 *  • No em-dashes in any copy.
 *  • Section heads use HxHead, not hand-rolled icon boxes.
 *  • Info / callout panels use HxCard, not ad-hoc styled <div>.
 */
import { useState } from '@wordpress/element';
import { HxIcon, HxBtn, HxBadge, HxCard, HxHead, HxInp, HxGL, HxSeg } from '../components.jsx';
import { TP } from '../theme-previews.jsx';

// ── Shared icon snippets ────────────────────────────────────────────────────

const I = {
	arrowR: <path d="M5 12h14M12 5l7 7-7 7" />,
	arrowL: <path d="M19 12H5M12 19l-7-7 7-7" />,
	check:  <polyline points="20 6 9 17 4 12" />,
	alert:  <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
	x:      <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
	chev:   <polyline points="9 18 15 12 9 6" />,
	info:   <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
	rocket: <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></>,
	globe:  <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></>,
	vercel: <path d="M12 2L2 20h20L12 2z" />,
	server: <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></>,
};

// ── Progress strip (single source of truth) ────────────────────────────────

function StepStrip({ step }) {
	const steps = [
		{ n: 1, label: 'Welcome' },
		{ n: 2, label: 'Theme' },
		{ n: 3, label: 'Deploy' },
	];
	return (
		<div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
			{steps.map((s, i) => {
				const done   = s.n < step;
				const active = s.n === step;
				return (
					<div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
						<div
							style={{
								display: 'inline-flex',
								alignItems: 'center',
								gap: 8,
								padding: '5px 12px 5px 5px',
								borderRadius: 999,
								background: active ? 'var(--hx-fg)' : 'var(--hx-surface)',
								border: `1px solid ${active ? 'var(--hx-fg)' : 'var(--hx-border)'}`,
								transition: 'all .2s var(--hx-ease)',
							}}
						>
							<div
								style={{
									width: 20,
									height: 20,
									borderRadius: '50%',
									background: done ? 'var(--hx-success)' : active ? 'var(--hx-surface)' : 'var(--hx-surface-2)',
									color: done ? '#fff' : active ? 'var(--hx-fg)' : 'var(--hx-subtle)',
									display: 'grid',
									placeItems: 'center',
									fontSize: 11,
									fontWeight: 700,
								}}
							>
								{done ? '✓' : s.n}
							</div>
							<span
								style={{
									fontSize: 12,
									fontWeight: 600,
									color: active ? 'var(--hx-surface)' : done ? 'var(--hx-fg)' : 'var(--hx-subtle)',
								}}
							>
								{s.label}
							</span>
						</div>
						{i < steps.length - 1 && (
							<div
								style={{
									width: 32,
									height: 1,
									background: done ? 'var(--hx-success)' : 'var(--hx-border)',
								}}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}

// ── Dark code block (reusable) ─────────────────────────────────────────────

function CodeBlock({ children, copyText, label = 'Copy' }) {
	const [copied, setCopied] = useState(false);
	const copy = () => {
		navigator.clipboard?.writeText(copyText);
		setCopied(true);
		setTimeout(() => setCopied(false), 1400);
	};
	return (
		<div
			style={{
				background: '#18181b',
				borderRadius: 10,
				padding: '44px 16px 14px',
				fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
				fontSize: 12,
				lineHeight: 1.7,
				color: '#fafafa',
				position: 'relative',
				whiteSpace: 'pre-wrap',
				wordBreak: 'break-all',
				overflowWrap: 'anywhere',
				overflowX: 'hidden',
				width: '100%',
				maxWidth: '100%',
				boxSizing: 'border-box',
				minWidth: 0,
			}}
		>
			{/* Copy button sits in the top toolbar strip so it never overlaps
			    the command. The strip is created via padding-top above. */}
			<button
				type="button"
				onClick={copy}
				style={{
					position: 'absolute',
					top: 8,
					right: 8,
					padding: '5px 12px',
					fontSize: 11,
					fontWeight: 600,
					background: copied ? '#16a34a' : 'rgba(255,255,255,.1)',
					border: `1px solid ${copied ? '#16a34a' : 'rgba(255,255,255,.18)'}`,
					borderRadius: 999,
					cursor: 'pointer',
					color: '#fff',
					fontFamily: 'inherit',
					transition: 'background .12s var(--hx-ease), border-color .12s var(--hx-ease)',
				}}
			>
				{copied ? '✓ Copied' : label}
			</button>
			{children}
		</div>
	);
}

function EnvBlock({ pairs }) {
	const text = pairs.map((p) => `${p.k}=${p.v}`).join('\n');
	return (
		<CodeBlock copyText={text} label="Copy .env">
			{pairs.map((p) => (
				<div key={p.k} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
					<span style={{ color: 'rgba(255,255,255,.55)' }}>{p.k}=</span>{p.v}
				</div>
			))}
		</CodeBlock>
	);
}

// ── Page heading (consistent across steps) ─────────────────────────────────

function PageHeading({ title, lede }) {
	return (
		<div>
			<h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--hx-fg)', letterSpacing: '-0.025em', margin: 0, lineHeight: 1.2 }}>
				{title}
			</h2>
			{lede && (
				<p className="hx-label" style={{ color: 'var(--hx-subtle)', lineHeight: 1.6, marginTop: 8, marginBottom: 0 }}>
					{lede}
				</p>
			)}
		</div>
	);
}

// ── Step 1: Welcome ────────────────────────────────────────────────────────

function Step1Welcome({ boot, onContinue }) {
	const checks = boot.state?.connection?.preflight || [];
	const passed = checks.filter((c) => c.ok).length;
	const total  = checks.length;
	const allGood = total > 0 && passed === total;
	const hasChecks = total > 0;

	const headIcon  = !hasChecks ? I.info    : allGood ? I.check : I.alert;
	const headColor = !hasChecks ? 'var(--hx-muted)' : allGood ? 'var(--hx-success)' : 'var(--hx-warning)';
	const headTitle = !hasChecks
		? 'Preflight skipped'
		: allGood
			? 'Your install is ready'
			: `${total - passed} suggestion${total - passed === 1 ? '' : 's'} found`;
	const headDesc = !hasChecks
		? 'No diagnostic checks available. You can continue to the next step.'
		: allGood
			? `Ran ${total} checks. Everything green. You can continue to the next step.`
			: `Ran ${total} checks. Most are passing. Review below before continuing.`;

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
			<PageHeading
				title="Welcome"
				lede="Hatch turns this WordPress install into a headless CMS. Astro frontend, edge deploy, your content stays here. Before we wire anything together, let's check the site is ready."
			/>

			<HxCard>
				<HxHead
					iconChildren={headIcon}
					iconColor={headColor}
					title={headTitle}
					desc={headDesc}
					mb={hasChecks && checks.length > 0 ? 14 : 0}
					action={hasChecks && (
						<HxBadge color={allGood ? 'green' : 'yellow'}>{passed} / {total}</HxBadge>
					)}
				/>

				{hasChecks && checks.map((c, i) => (
					<CheckRow key={i} check={c} last={i === checks.length - 1} />
				))}
			</HxCard>

			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
				<a
					href={boot.state?.setup?.skipUrl || '#'}
					className="hx-desc"
					style={{ color: 'var(--hx-subtle)', textDecoration: 'none' }}
				>
					Skip wizard, I'll configure manually
				</a>
				<HxBtn variant="brand" onClick={onContinue}>
					Continue
					<HxIcon size={14} color="currentColor">{I.arrowR}</HxIcon>
				</HxBtn>
			</div>
		</div>
	);
}

function CheckRow({ check: c, last }) {
	const state = c.ok ? 'ok' : c.warn ? 'warn' : 'fail';
	const fg    = state === 'ok' ? 'var(--hx-success)' : state === 'warn' ? 'var(--hx-warning)' : 'var(--hx-danger)';
	const icon  = state === 'ok' ? I.check : state === 'warn' ? I.alert : I.x;
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

// ── Step 2: Theme ──────────────────────────────────────────────────────────

function Step2Theme({ boot, onBack }) {
	// v0.50.27 — Source themes from boot state so the Onboarding wizard and
	// the Design tab show the SAME authoritative theme catalog (exact upstream
	// names, demo links, author credits, MIT license). Local map only carries
	// the SVG preview key + chip tint color per slug — visual metadata that
	// doesn't belong in PHP.
	const themeMeta = {
		blog:       { previewKey: 'Blog',       col: '#3b82f6' },
		tech:       { previewKey: 'Tech',       col: '#8b5cf6' },
		docs:       { previewKey: 'Data',       col: '#0d9488' },
		astropaper: { previewKey: 'AstroPaper', col: '#ff6b00' },
		astrowind:  { previewKey: 'AstroWind',  col: '#2563eb' },
		astronano:  { previewKey: 'Astro Nano', col: '#737373' },
	};
	const themes = (boot.state?.themes || []).map((t) => ({
		id:      t.id,
		name:    t.label || t.id,
		desc:    t.desc  || '',
		demo:    t.demo  || '',
		author:  t.author|| '',
		repo:    t.repo  || '',
		license: t.license || '',
		preview: themeMeta[t.id]?.previewKey || 'Blog',
		col:     themeMeta[t.id]?.col || '#737373',
	}));
	const current = boot.state?.design?.theme || 'astropaper';
	const [selected, setSelected] = useState(current);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
			<PageHeading
				title="Pick a theme"
				lede="The starter design your Astro frontend ships with. You can change it later from the Design tab."
			/>

			<form method="post" action={boot.setupUrl} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
				<input type="hidden" name="_wpnonce" value={boot.state?.setup?.nonces?.setup_step2 || ''} />
				<input type="hidden" name="hatch_setup_step" value="2" />
				<input type="hidden" name="hatch_theme" value={selected} />

				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
					{themes.map((t) => {
						const sel = selected === t.id;
						return (
							<div
								key={t.id}
								onClick={() => setSelected(t.id)}
								style={{
									border: '1px solid var(--hx-border)',
									boxShadow: sel ? `0 0 0 2px ${t.col}` : 'none',
									borderRadius: 12,
									padding: '14px 16px',
									cursor: 'pointer',
									background: sel ? t.col + '0d' : 'var(--hx-surface-2)',
									transition: 'box-shadow .18s var(--hx-ease), background .18s var(--hx-ease)',
								}}
							>
								<div style={{ marginBottom: 10, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', opacity: sel ? 1 : 0.75 }}>
									{TP[t.preview] || TP.Blog}
								</div>
								<div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
									<div className="hx-desc" style={{ fontWeight: 700, color: 'var(--hx-fg)' }}>{t.name}</div>
									{t.demo && (
										<a
											href={t.demo}
											target="_blank"
											rel="noopener noreferrer"
											onClick={(e) => e.stopPropagation()}
											className="hx-help"
											style={{ color: 'var(--hx-subtle)', textDecoration: 'none', whiteSpace: 'nowrap' }}
											title={`Live demo of ${t.name}`}
										>
											Demo ↗
										</a>
									)}
								</div>
								{t.author && (
									<div className="hx-help" style={{ color: 'var(--hx-subtle)', marginBottom: 6 }}>
										by{' '}
										{t.repo ? (
											<a
												href={t.repo}
												target="_blank"
												rel="noopener noreferrer"
												onClick={(e) => e.stopPropagation()}
												style={{ color: 'var(--hx-muted)', textDecoration: 'none' }}
											>
												{t.author}
											</a>
										) : <span style={{ color: 'var(--hx-muted)' }}>{t.author}</span>}
										{t.license && <span> · {t.license}</span>}
									</div>
								)}
								<div
									className="hx-help"
									style={{
										color: 'var(--hx-subtle)',
										lineHeight: 1.5,
										display: '-webkit-box',
										WebkitLineClamp: 2,
										WebkitBoxOrient: 'vertical',
										overflow: 'hidden',
										minHeight: 36,
									}}
									title={t.desc}
								>
									{t.desc}
								</div>
							</div>
						);
					})}
				</div>

				<HxCard status="info" style={{ padding: '14px 16px' }}>
					<div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
						<HxIcon size={16} color="#2563eb" style={{ marginTop: 2, flexShrink: 0 }}>{I.info}</HxIcon>
						<div className="hx-desc" style={{ flex: 1, color: 'var(--hx-fg)' }}>
							<strong>Going headless</strong>{' '}
							means WordPress keeps running here as the editor — wp-admin, REST API, and login stay the same. After your first deploy, visitors to this URL redirect to your new frontend. You can switch back any time from Appearance, Themes.
						</div>
					</div>
				</HxCard>

				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<HxBtn variant="ghost" onClick={onBack} type="button">
						<HxIcon size={14} color="currentColor">{I.arrowL}</HxIcon>
						Back
					</HxBtn>
					<HxBtn variant="brand" type="submit">
						Continue
						<HxIcon size={14} color="currentColor">{I.arrowR}</HxIcon>
					</HxBtn>
				</div>
			</form>
		</div>
	);
}

// ── Step 3 helper: broker form (Cloudflare + Vercel share this shape) ─────

function BrokerForm({ provider, tokenName, tokenUrl, tokenUrlLabel, tokenPagePrompt, adminPostUrl, deployNonce }) {
	const [token, setToken] = useState('');
	const [save, setSave]   = useState(true);
	const providerLabel = provider === 'cloudflare' ? 'Cloudflare' : 'Vercel';

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
			<HxGL>Step 1. Get an API token</HxGL>
			<p className="hx-desc" style={{ color: 'var(--hx-muted)', lineHeight: 1.55, margin: '4px 0 10px' }}>
				{tokenPagePrompt}
			</p>
			<div>
				<HxBtn href={tokenUrl}>
					{tokenUrlLabel}
					<HxIcon size={13} color="currentColor">
						<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
						<polyline points="15 3 21 3 21 9" />
						<line x1="10" y1="14" x2="21" y2="3" />
					</HxIcon>
				</HxBtn>
			</div>

			<HxGL>Step 2. Paste and deploy</HxGL>
			<form
				method="post"
				action={adminPostUrl}
				style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}
			>
				<input type="hidden" name="action"   value="hatch_start_deploy" />
				<input type="hidden" name="_wpnonce" value={deployNonce} />
				<input type="hidden" name="provider" value={provider} />

				<HxInp
					type="password"
					name={tokenName}
					placeholder={`Paste your ${providerLabel} API token`}
					value={token}
					onChange={(e) => setToken(e.target.value)}
					mono
					autoComplete="off"
					spellCheck={false}
				/>

				<label className="hx-checkbox hx-help" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--hx-muted)', cursor: 'pointer' }}>
					<input
						type="checkbox"
						name="save_token"
						value="1"
						checked={save}
						onChange={(e) => setSave(e.target.checked)}
					/>
					Save token (encrypted) so future redeploys are one-click.
				</label>

				<div>
					<HxBtn type="submit" disabled={!token.trim()}>
						Build and deploy
						<HxIcon size={13} color="currentColor"><path d="M5 12h14M12 5l7 7-7 7" /></HxIcon>
					</HxBtn>
				</div>

				<p className="hx-help" style={{ color: 'var(--hx-subtle)', lineHeight: 1.5, margin: '4px 0 0' }}>
					Build runs on <span className="hx-mono">hatch.adityaarsharma.com</span>. Tokens pass through in memory only, never written to disk. You'll be sent to a live build log, then back here when the deploy finishes.
				</p>
			</form>
		</div>
	);
}

// ── Step 3: Deploy ─────────────────────────────────────────────────────────

function Step3Deploy({ boot, onBack }) {
	const setup = boot.state?.setup || {};
	const [open, setOpen] = useState('cloudflare');
	const [manualUrl, setManualUrl] = useState('');
	const [selfMode, setSelfMode] = useState('agent');

	const envPairs = [
		{ k: 'WP_API_URL',           v: setup.wpApiUrl     || '' },
		{ k: 'WP_API_USER',          v: setup.wpUser       || '' },
		{ k: 'WP_API_PASS',          v: setup.appPassword  || '<generate-from-connection-tab>' },
		{ k: 'HATCH_WEBHOOK_SECRET', v: setup.webhookSecret || '' },
	];

	const options = [
		{
			id: 'cloudflare',
			icon: I.globe,
			iconColor: '#f97316',
			label: 'Cloudflare',
			desc: 'Free global edge network. One-click deploy.',
			badge: 'Recommended',
		},
		{
			id: 'vercel',
			icon: I.vercel,
			iconColor: 'var(--hx-fg)',
			label: 'Vercel',
			desc: 'Best-in-class DX. Free hobby tier. One-click deploy.',
		},
		{
			id: 'self',
			icon: I.server,
			iconColor: 'var(--hx-success)',
			label: 'Self-hosted',
			desc: 'VPS, dedicated, or local. Install the agent or paste a URL.',
		},
	];

	// Use the server-built one-liner from PHP boot state. Old plugin
	// (v0.50.10) built this same command in admin/setup-wizard.php at line ~500.
	// It already embeds WP URL, user, app password, webhook secret as script
	// flags — single copy-paste installs.
	const installCmd  = setup.vpsOneLiner || '';
	const deployNonce = setup.nonces?.start_deploy || '';

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
			<PageHeading
				title="Deploy your frontend"
				lede="WordPress is connected. Pick where the public frontend lives. Hatch handles the build automatically."
			/>

			<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
				{options.map((o) => {
					const isOpen = open === o.id;
					return (
						<HxCard key={o.id} style={{ padding: 0, overflow: 'hidden' }}>
							<div
								onClick={() => setOpen(isOpen ? null : o.id)}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 14,
									padding: '14px 18px',
									cursor: 'pointer',
								}}
							>
								<div
									style={{
										width: 36,
										height: 36,
										borderRadius: 9,
										background: 'var(--hx-surface-2)',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										flexShrink: 0,
									}}
								>
									<HxIcon size={18} color={o.iconColor}>{o.icon}</HxIcon>
								</div>
								<div style={{ flex: 1 }}>
									<div className="hx-label" style={{ fontWeight: 600, color: 'var(--hx-fg)', display: 'flex', alignItems: 'center', gap: 8 }}>
										{o.label}
										{o.badge && <HxBadge color="orange">{o.badge}</HxBadge>}
									</div>
									<div
									className="hx-desc"
									style={{
										color: 'var(--hx-subtle)',
										marginTop: 2,
										whiteSpace: 'nowrap',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
									}}
									title={o.desc}
								>
									{o.desc}
								</div>
								</div>
								<HxIcon
									size={14}
									color="var(--hx-subtle)"
									style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .18s var(--hx-ease)' }}
								>
									{I.chev}
								</HxIcon>
							</div>

							{isOpen && (
								<div
									style={{ padding: '18px 22px 22px', background: 'var(--hx-surface-2)', borderTop: '1px solid var(--hx-border)' }}
									onClick={(e) => e.stopPropagation()}
								>
									{o.id === 'cloudflare' && (
										<BrokerForm
											provider="cloudflare"
											tokenName="cf_token"
											tokenUrl={setup.cfTokenUrl || '#'}
											tokenUrlLabel="Open Cloudflare token page"
											tokenPagePrompt="Required permissions are pre-filled. On the Cloudflare page, click Create Token, then copy the value."
											adminPostUrl={boot.adminPostUrl}
											deployNonce={deployNonce}
										/>
									)}

									{o.id === 'vercel' && (
										<BrokerForm
											provider="vercel"
											tokenName="vercel_token"
											tokenUrl={setup.vercelTokenUrl || '#'}
											tokenUrlLabel="Open Vercel tokens page"
											tokenPagePrompt="On the Vercel page, click Create Token, give it any name, scope to your personal account, then copy the value."
											adminPostUrl={boot.adminPostUrl}
											deployNonce={deployNonce}
										/>
									)}

									{o.id === 'self' && (
										<>
											{/* v0.50.21 — Paste-existing-URL tab removed. Self-hosted
											    is ALWAYS the install agent (one bash command).
											    Editing the frontend URL after first install lives
											    in the Connection tab. */}
											<p className="hx-desc" style={{ color: 'var(--hx-muted)', lineHeight: 1.6, margin: '0 0 10px' }}>
												SSH into your server (Hetzner, DigitalOcean, RunCloud, Coolify — anywhere). Paste this one command. The script installs Node, clones the Hatch repo, writes your .env, and runs the first build.
											</p>
											{!setup.appPassword && (
												<HxCard status="warning" className="hx-help" style={{ padding: '10px 12px', marginBottom: 12, color: 'var(--hx-fg)', lineHeight: 1.5 }}>
													<strong>No Application Password generated yet.</strong> The command below has a placeholder for <span className="hx-mono">--wp-pass</span>. Generate one from Connection tab, then come back, or the agent build will fail to authenticate against WordPress.
												</HxCard>
											)}
											<CodeBlock copyText={installCmd}>{installCmd}</CodeBlock>
											<p className="hx-help" style={{ color: 'var(--hx-subtle)', lineHeight: 1.55, margin: '10px 0 0' }}>
												After install, point your webapp at <span className="hx-mono">astro-starter/dist/</span>. Full RunCloud / Coolify / Dokploy guide: <a href={setup.vpsDocsUrl || 'https://github.com/adityaarsharma/hatch/blob/main/docs/hosting/vps-runcloud.md'} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hx-primary)', textDecoration: 'underline', textDecorationColor: 'var(--hx-primary-3)' }}>docs/hosting/vps-runcloud.md ↗</a>
											</p>
											<details style={{ marginTop: 14 }}>
												<summary className="hx-help" style={{ cursor: 'pointer', listStyle: 'none', color: 'var(--hx-subtle)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
													<HxIcon size={11} color="currentColor">{I.chev}</HxIcon>
													Need just the .env block?
												</summary>
												<div style={{ marginTop: 10 }}>
													<EnvBlock pairs={envPairs} />
												</div>
											</details>
										</>
									)}
								</div>
							)}
						</HxCard>
					);
				})}
			</div>

			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
				<HxBtn variant="ghost" onClick={onBack}>
					<HxIcon size={14} color="currentColor">{I.arrowL}</HxIcon>
					Back
				</HxBtn>
				<HxBtn variant="brand" href={setup.completeUrl || '#'}>
					Launch site ↗
				</HxBtn>
			</div>

			<p className="hx-help" style={{ textAlign: 'center', marginTop: 6, color: 'var(--hx-subtle)' }}>
				Prefer the terminal? <span className="hx-mono">wp hatch setup --frontend=https://your-site.com</span>
			</p>
		</div>
	);
}

// ── Root ───────────────────────────────────────────────────────────────────

export default function SetupApp() {
	const boot = window.hatchBoot || {};
	const initialStep = Math.max(1, Math.min(3, parseInt(boot.step, 10) || 1));
	const [step, setStep] = useState(initialStep);

	return (
		<div className="hatch-react" style={{ minHeight: '100vh', paddingBottom: 60, background: 'var(--hx-bg)' }}>
			{/* Header */}
			<div style={{ textAlign: 'center', padding: '40px 24px 0' }}>
				<div style={{ fontSize: 38, lineHeight: 1, marginBottom: 8 }}>🐣</div>
				<h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--hx-fg)', letterSpacing: '-0.025em', lineHeight: 1.1, margin: 0 }}>
					Hatch setup
				</h1>
				<p className="hx-desc" style={{ color: 'var(--hx-subtle)', marginTop: 6 }}>
					Connect WordPress to your headless frontend in 3 steps.
				</p>
			</div>

			{/* Single progress strip */}
			<div style={{ maxWidth: 640, margin: '20px auto 0', padding: '0 24px' }}>
				<StepStrip step={step} />
			</div>

			{/* Step content */}
			<div style={{ maxWidth: 640, margin: '28px auto 0', padding: '0 24px' }}>
				<div key={step} className="hatch-tab-enter">
					{step === 1 && <Step1Welcome boot={boot} onContinue={() => setStep(2)} />}
					{step === 2 && <Step2Theme    boot={boot} onBack={() => setStep(1)} />}
					{step === 3 && <Step3Deploy   boot={boot} onBack={() => setStep(2)} />}
				</div>
			</div>
		</div>
	);
}

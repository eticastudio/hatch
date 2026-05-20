/**
 * Hatch admin — React SPA entrypoint.
 *
 * Mounts on <div id="hatch-react-root"> rendered by hatch_render_admin_page().
 * Reads initial state from window.hatchBoot.state for SSR-style first paint —
 * no fetch round-trip on mount. Saves go through hxFetch() to POST
 * /hatch/v1/options which the plugin's REST controller accepts as a flat
 * key/value batch.
 *
 * Design contract: admin-react/DESIGN-SYSTEM.md. Locked from Claude Design v2.
 */
import { createRoot, useState, useMemo, useEffect, useCallback } from '@wordpress/element';
import { HxIcon, hxFetch } from './components.jsx';
import Connection from './tabs/Connection.jsx';
import Design from './tabs/Design.jsx';
import Content from './tabs/Content.jsx';
import Performance from './tabs/Performance.jsx';
import Security from './tabs/Security.jsx';
import Status from './tabs/Status.jsx';
import SetupApp from './setup/SetupApp.jsx';
import './styles.css';

const TABS = [
	{ id: 'connection',  label: 'Connection',  Component: Connection },
	{ id: 'design',      label: 'Design',      Component: Design },
	{ id: 'content',     label: 'Content',     Component: Content },
	{ id: 'performance', label: 'Performance', Component: Performance },
	{ id: 'security',    label: 'Security',    Component: Security },
	{ id: 'status',      label: 'Status',      Component: Status },
];

function App() {
	const boot = window.hatchBoot || {};
	const initialState = boot.state || {};

	// Hash routing keeps tab state shareable / survivable across refresh.
	const initialTab = (window.location.hash || '#connection').slice(1);
	const [tab, setTabRaw] = useState(TABS.some((t) => t.id === initialTab) ? initialTab : 'connection');
	const setTab = (id) => {
		setTabRaw(id);
		if (window.history.replaceState) window.history.replaceState(null, '', `#${id}`);
	};
	useEffect(() => {
		const onHash = () => {
			const id = window.location.hash.slice(1);
			if (TABS.some((t) => t.id === id)) setTabRaw(id);
		};
		window.addEventListener('hashchange', onHash);
		return () => window.removeEventListener('hashchange', onHash);
	}, []);

	const [state, setState] = useState(initialState);
	const [pending, setPending] = useState({});
	const [phase, setPhase] = useState('idle'); // idle | saving | saved | error
	const [lastSaved, setLastSaved] = useState(null);
	const setupUrl = boot.setupUrl || 'admin.php?page=hatch-setup';
	const openWizard = () => { window.location.href = setupUrl; };

	const dirtyCount = useMemo(() => Object.keys(pending).length, [pending]);

	const setSetting = useCallback((path, value) => {
		setPending((p) => ({ ...p, [path]: value }));
		setState((s) => {
			const next = structuredClone(s);
			const keys = path.split('.');
			let cursor = next;
			for (let i = 0; i < keys.length - 1; i++) {
				cursor[keys[i]] = cursor[keys[i]] || {};
				cursor = cursor[keys[i]];
			}
			cursor[keys[keys.length - 1]] = value;
			return next;
		});
	}, []);

	const onDirty = useCallback(() => { setPhase('idle'); }, []);

	const save = useCallback(async () => {
		if (Object.keys(pending).length === 0) return;
		setPhase('saving');
		try {
			await hxFetch('options', { method: 'POST', body: JSON.stringify(pending) });
			setPending({});
			setPhase('saved');
			setLastSaved(new Date());
			setTimeout(() => setPhase('idle'), 2200);
		} catch (e) {
			console.error('[hatch] save failed', e);
			setPhase('error');
		}
	}, [pending]);

	const discard = useCallback(() => {
		setPending({});
		setState(initialState);
		setPhase('idle');
	}, [initialState]);

	// ⌘S / Ctrl-S keyboard shortcut.
	useEffect(() => {
		const h = (e) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 's') {
				e.preventDefault();
				if (dirtyCount > 0 && phase === 'idle') save();
			}
		};
		window.addEventListener('keydown', h);
		return () => window.removeEventListener('keydown', h);
	}, [dirtyCount, phase, save]);

	const fmtSaved = (d) => {
		if (!d) return null;
		const m = Math.round((Date.now() - d.getTime()) / 60000);
		return m < 1 ? 'just now' : m === 1 ? '1 min ago' : `${m} mins ago`;
	};

	const Current = TABS.find((t) => t.id === tab)?.Component || Connection;
	// Disabled by request — users don't want a constant attention dot on Security.
	const securityBadge = false;

	return (
		<div className="hatch-react" style={{ minHeight: '100vh', paddingBottom: 100, background: 'var(--hx-bg)' }}>
			{/* ── Header ───────────────────────────────────────────────── */}
			<div style={{ textAlign: 'center', padding: '44px 24px 0' }}>
				<div style={{ fontSize: 44, lineHeight: 1, marginBottom: 10 }}>🐣</div>
				<h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--hx-fg)', letterSpacing: '-0.035em', lineHeight: 1, margin: 0 }}>
					Hatch
				</h1>
				<p style={{ fontSize: 14, color: 'var(--hx-subtle)', marginTop: 6 }}>The Headless Engine for WordPress</p>

				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
					<span
						style={{
							padding: '4px 12px',
							borderRadius: 999,
							border: '1px solid var(--hx-border)',
							fontSize: 12,
							color: 'var(--hx-subtle)',
							fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
						}}
					>
						v{boot.version || ''}
					</span>
					{[
						{
							label: 'GitHub',
							href: 'https://github.com/adityaarsharma/hatch',
							icon: <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />,
						},
						{
							label: 'Docs',
							href: 'https://github.com/adityaarsharma/hatch/tree/main/docs',
							icon: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
						},
					].map((l) => (
						<a
							key={l.label}
							href={l.href}
							target="_blank"
							rel="noopener noreferrer"
							className="hatch-meta-pill"
						>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{l.icon}</svg>
							{l.label}
						</a>
					))}
				</div>
			</div>

			{/* ── Pill segmented tab nav ───────────────────────────────── */}
			<div style={{ display: 'flex', justifyContent: 'center', padding: '28px 24px 0' }}>
				<div
					style={{
						display: 'inline-flex',
						background: 'var(--hx-surface-2)',
						borderRadius: 999,
						padding: 4,
						gap: 2,
						border: '1px solid var(--hx-border)',
					}}
				>
					{TABS.map(({ id, label }) => {
						const active = tab === id;
						const badge = id === 'security' && securityBadge;
						return (
							<button
								key={id}
								onClick={() => setTab(id)}
								style={{
									padding: '8px 18px',
									borderRadius: 999,
									border: 'none',
									background: active ? 'var(--hx-surface)' : 'transparent',
									color: active ? 'var(--hx-fg)' : 'var(--hx-subtle)',
									fontWeight: active ? 600 : 500,
									fontSize: 13,
									cursor: 'pointer',
									fontFamily: 'inherit',
									boxShadow: active ? '0 1px 4px rgba(0,0,0,.1), 0 0 0 0.5px rgba(0,0,0,.06)' : 'none',
									transition: 'all .18s var(--hx-ease)',
									whiteSpace: 'nowrap',
									position: 'relative',
								}}
							>
								{label}
								{badge && (
									<span
										style={{
											position: 'absolute',
											top: 6,
											right: 8,
											width: 6,
											height: 6,
											borderRadius: '50%',
											background: '#d97706',
											display: 'inline-block',
										}}
										aria-label="Needs attention"
									/>
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* ── Tab content ──────────────────────────────────────────── */}
			<div style={{ maxWidth: 760, margin: '24px auto 0', padding: '0 24px' }}>
				<div key={tab} className="hatch-tab-enter">
					<Current
						state={state}
						onDirty={onDirty}
						setSetting={setSetting}
						onSetup={openWizard}
					/>
				</div>
			</div>

			{/* ── Footer ───────────────────────────────────────────────── */}
			<div
				style={{
					maxWidth: 760,
					margin: '40px auto 0',
					padding: '0 24px 24px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					flexWrap: 'wrap',
					gap: 12,
				}}
			>
				<div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
					<a href="https://github.com/adityaarsharma/hatch" target="_blank" rel="noopener noreferrer" className="hatch-foot-link">GitHub</a>
					<a href="https://github.com/adityaarsharma/hatch/tree/main/docs" target="_blank" rel="noopener noreferrer" className="hatch-foot-link">Docs</a>
					<a href={setupUrl} className="hatch-foot-link">Run setup wizard again</a>
					<a href="https://adityaarsharma.com/connect" target="_blank" rel="noopener noreferrer" className="hatch-foot-link">Need help with setup?</a>
				</div>
				<span style={{ fontSize: 12, color: 'var(--hx-subtle)', fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' }}>
					{lastSaved ? `Saved ${fmtSaved(lastSaved)} · ` : ''}Hatch v{boot.version || ''} · MIT licensed
				</span>
			</div>

			{/* ── Floating save bar (warm dark #18181b, ⌘S badge) ─────── */}
			{(dirtyCount > 0 || phase !== 'idle') && (
				<div
					className="hatch-save-bar"
					style={{
						position: 'fixed',
						bottom: 24,
						left: '50%',
						transform: 'translateX(-50%)',
						zIndex: 200,
						borderRadius: 999,
						overflow: 'hidden',
						boxShadow: '0 8px 32px rgba(0,0,0,.16), 0 2px 8px rgba(0,0,0,.1)',
						display: 'flex',
						alignItems: 'center',
						gap: 12,
						whiteSpace: 'nowrap',
						background: '#18181b',
							border: '1px solid rgba(255,255,255,.08)',
							padding: '12px 20px',
					}}
				>
					{phase === 'saved' && (
						<span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: '#ffffff' }}>
							<HxIcon size={16} color="#22c55e" sw={2.5}>
								<polyline points="20 6 9 17 4 12" />
							</HxIcon>
							Saved. Frontend picks up in ~60 seconds.
						</span>
					)}
					{phase === 'saving' && (
						<span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: '#ffffff' }}>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'hxSpin 0.8s linear infinite' }}>
								<path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" />
								<path d="M21 12a9 9 0 01-9 9" />
							</svg>
							Saving...
						</span>
					)}
					{phase === 'error' && (
						<span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: '#ffffff' }}>
							<HxIcon size={16} color="#f87171" sw={2.5}>
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</HxIcon>
							Save failed. Check console.
							<button onClick={save} className="hatch-sb-retry">Retry</button>
						</span>
					)}
					{phase === 'idle' && dirtyCount > 0 && (
						<>
							<span style={{ fontSize: 13, color: '#ffffff', fontWeight: 500 }}>
								{dirtyCount} unsaved change{dirtyCount !== 1 ? 's' : ''}
							</span>
							<span style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>·</span>
							<span style={{ fontSize: 13, color: 'rgba(255,255,255,.75)' }}>
								Frontend picks up in ~60s · no redeploy needed
							</span>
							<span
								style={{
									fontSize: 11,
									color: 'rgba(255,255,255,.28)',
									border: '1px solid rgba(255,255,255,.12)',
									borderRadius: 5,
									padding: '2px 6px',
									fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
									marginLeft: 2,
								}}
							>
								⌘S
							</span>
							<div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
								<button onClick={discard} className="hatch-sb-discard">Discard</button>
								<button onClick={save} className="hatch-sb-save">Save</button>
							</div>
						</>
					)}
				</div>
			)}

		</div>
	);
}

const root = document.getElementById('hatch-react-root');
if (root) {
	const page = (window.hatchBoot && window.hatchBoot.page) || 'dashboard';
	createRoot(root).render(page === 'setup' ? <SetupApp /> : <App />);
}

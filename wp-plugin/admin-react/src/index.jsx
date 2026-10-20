/**
 * Hatch admin: React entry point.
 *
 * Mounts on <div id="hatch-react-root">, rendered by the PHP admin page.
 * Reads initial state from window.hatchBoot.state, so there is no fetch on
 * first paint. Saves go through hxFetch() to POST /hatch/v1/options, which
 * accepts a flat batch of dot-path keys and values.
 *
 * Design contract: admin-react/DESIGN-SYSTEM.md.
 */
import { createRoot, useState, useMemo, useEffect, useCallback, useRef } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { HxIcon, hxFetch } from './components.jsx';
import { IC } from './icons';
import Connection from './tabs/Connection.jsx';
import Design from './tabs/Design.jsx';
import Content from './tabs/Content.jsx';
import Performance from './tabs/Performance.jsx';
import Security from './tabs/Security.jsx';
import Status from './tabs/Status.jsx';
import SetupApp from './setup/SetupApp.jsx';
import './styles.css';

import PluginBridge from './tabs/PluginBridge.jsx';

/* Dark mode: resolve preference and apply BEFORE first paint so there is no
   flash of light. Reads localStorage first, then prefers-color-scheme, then
   falls back to light. The value lives on <html data-hx-theme="..."> AND on
   <body> so WordPress admin chrome (which we cannot scope to .hatch-react)
   can react through the [data-hx-theme="dark"] rules in styles.css. */
const THEME_KEY = 'hx-theme';
function resolveTheme() {
	try {
		const saved = window.localStorage.getItem(THEME_KEY);
		if (saved === 'light' || saved === 'dark') return saved;
	} catch (e) { /* privacy mode: fall through */ }
	if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
	return 'light';
}
function applyTheme(next) {
	document.documentElement.setAttribute('data-hx-theme', next);
	document.body.setAttribute('data-hx-theme', next);
}
/* Apply immediately on script load so first paint is correct. */
applyTheme(resolveTheme());

const TABS = [
	{ id: 'connection',  label: () => __( 'Connection', 'hatch-connect' ),  Component: Connection },
	{ id: 'design',      label: () => __( 'Design', 'hatch-connect' ),      Component: Design },
	{ id: 'content',     label: () => __( 'Content', 'hatch-connect' ),     Component: Content },
	{ id: 'bridge',      label: () => __( 'Plugins', 'hatch-connect' ),     Component: PluginBridge },
	{ id: 'performance', label: () => __( 'Performance', 'hatch-connect' ), Component: Performance },
	{ id: 'security',    label: () => __( 'Security', 'hatch-connect' ),    Component: Security },
	{ id: 'status',      label: () => __( 'Status', 'hatch-connect' ),      Component: Status },
];

function App() {
	const boot = window.hatchBoot || {};
	const initialState = boot.state || {};

	// Hash routing keeps tab state shareable / survivable across refresh.
	const initialTab = (window.location.hash || '#connection').slice(1).split('&')[0];
	const [tab, setTabRaw] = useState(TABS.some((t) => t.id === initialTab) ? initialTab : 'connection');
	const setTab = (id) => {
		setTabRaw(id);
		if (window.history.replaceState) window.history.replaceState(null, '', `#${id}`);
	};
	useEffect(() => {
		const onHash = () => {
			const id = window.location.hash.slice(1).split('&')[0];
			if (TABS.some((t) => t.id === id)) setTabRaw(id);
		};
		window.addEventListener('hashchange', onHash);
		return () => window.removeEventListener('hashchange', onHash);
	}, []);

	const [state, setState] = useState(initialState);
	const [pending, setPending] = useState({});
	/* The last values the server confirmed. A change that puts a setting back
	   to its saved value is not a change, and Discard returns to these. */
	const baseline = useRef({
		...initialState,
		core: {
			default_comment_status: initialState.coreSync?.discussion?.default_comment_status,
			...(initialState.core || {}),
		},
	});
	const [phase, setPhase] = useState('idle'); // idle | saving | saved | error
	const [lastSaved, setLastSaved] = useState(null);
	const [saveError, setSaveError] = useState('');
	const tabRefs = useRef({});

	/* Theme state: seeded from the same resolver used at boot so React and
	   the DOM never disagree. Toggle flips DOM attribute + persists + updates
	   React state so any tab reading `theme` from context/prop stays in sync. */
	const [theme, setTheme] = useState(() => (
		document.documentElement.getAttribute('data-hx-theme') || resolveTheme()
	));
	const toggleTheme = useCallback(() => {
		const next = theme === 'dark' ? 'light' : 'dark';
		applyTheme(next);
		try { window.localStorage.setItem(THEME_KEY, next); } catch (e) { /* privacy mode */ }
		setTheme(next);
	}, [theme]);
	/* Follow system changes only when the user has not made an explicit choice. */
	useEffect(() => {
		if (!window.matchMedia) return;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const onChange = (e) => {
			let saved = null;
			try { saved = window.localStorage.getItem(THEME_KEY); } catch (err) { /* privacy mode */ }
			if (saved === 'light' || saved === 'dark') return;
			const next = e.matches ? 'dark' : 'light';
			applyTheme(next);
			setTheme(next);
		};
		mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
		return () => {
			mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange);
		};
	}, []);
	const setupUrl = boot.setupUrl || 'admin.php?page=hatch-setup';
	const openWizard = () => { window.location.href = setupUrl; };

	/* Tabs that need a look get the amber dot (DESIGN-SYSTEM.md section 4).
	   Security: the one-switch hardening is still off. */
	const attention = {
		security: !(state.security && state.security.fortress_mode),
	};

	const dirtyCount = useMemo(() => Object.keys(pending).length, [pending]);

	const setSetting = useCallback((path, value) => {
		const saved = path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), baseline.current);
		setPending((p) => {
			const next = { ...p };
			/* A switch never saved before reads as off, so off is not a change. */
			const same = typeof value === 'boolean' ? Boolean(saved) === value : JSON.stringify(saved) === JSON.stringify(value);
			if (same) {
				delete next[path];
			} else {
				next[path] = value;
			}
			return next;
		});
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
		setSaveError('');
		try {
			await hxFetch('options', { method: 'POST', body: JSON.stringify(pending) });
			const confirmed = structuredClone(baseline.current);
			Object.keys(pending).forEach((path) => {
				const keys = path.split('.');
				let cursor = confirmed;
				for (let i = 0; i < keys.length - 1; i++) {
					cursor[keys[i]] = cursor[keys[i]] || {};
					cursor = cursor[keys[i]];
				}
				cursor[keys[keys.length - 1]] = pending[path];
			});
			baseline.current = confirmed;
			setPending({});
			setPhase('saved');
			setLastSaved(new Date());
			setTimeout(() => setPhase('idle'), 2200);
		} catch (e) {
			setSaveError(e && e.message ? e.message : '');
			setPhase('error');
		}
	}, [pending]);

	const discard = useCallback(() => {
		setPending({});
		setState(baseline.current);
		setPhase('idle');
	}, []);

	// Cmd+S or Ctrl+S saves.
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

	const saveHint = /Mac|iPhone|iPad/.test((navigator.platform || '') + (navigator.userAgent || '')) ? '\u2318S' : 'Ctrl S';

	const fmtSaved = (d) => {
		if (!d) return null;
		const m = Math.round((Date.now() - d.getTime()) / 60000);
		/* translators: %d: number of minutes. */
		return m < 1 ? __( 'just now', 'hatch-connect' ) : sprintf( _n( '%d minute ago', '%d minutes ago', m, 'hatch-connect' ), m );
	};

	/* On a narrow screen the strip scrolls sideways: keep the active tab visible. */
	useEffect(() => {
		const el = tabRefs.current[tab];
		const strip = el && el.parentElement;
		if (!el || !strip || strip.scrollWidth <= strip.clientWidth) return;
		const target = el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2;
		const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		strip.scrollTo({ left: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' });
	}, [tab]);

	const Current = TABS.find((t) => t.id === tab)?.Component || Connection;
	const onTabKey = (e) => {
		const keys = { ArrowRight: 1, ArrowLeft: -1 };
		if (!keys[e.key]) return;
		e.preventDefault();
		const dir = document.documentElement.dir === 'rtl' ? -keys[e.key] : keys[e.key];
		const idx = TABS.findIndex((t) => t.id === tab);
		const next = TABS[(idx + dir + TABS.length) % TABS.length];
		setTab(next.id);
		const el = tabRefs.current[next.id];
		if (el) el.focus();
	};

	return (
		<div className="hatch-react" style={{ minHeight: '100vh', paddingBottom: 100, background: 'var(--hx-bg)' }}>
			{/* Header */}
			<div style={{ textAlign: 'center', padding: '32px 16px 0' }}>
				<h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--hx-fg)', lineHeight: 1.2, margin: 0, padding: 0 }}>
					{ __( 'Hatch', 'hatch-connect' ) }
				</h1>
				<p style={{ fontSize: 14, color: 'var(--hx-subtle)', margin: '6px 0 0' }}>
					{ __( 'Connect this WordPress site to a fast frontend on Cloudflare.', 'hatch-connect' ) }
				</p>

				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
					<span
						style={{
							padding: '4px 12px',
							borderRadius: 999,
							border: '1px solid var(--hx-border)',
							fontSize: 12,
							color: 'var(--hx-subtle)',
						}}
					>
						{ /* translators: %s: plugin version number, for example 1.0.0. */ sprintf( __( 'Version %s', 'hatch-connect' ), boot.version || '' ) }
					</span>
					<button
						type="button"
						className="hx-theme-toggle"
						onClick={toggleTheme}
						aria-label={ theme === 'dark' ? __( 'Switch to the light theme', 'hatch-connect' ) : __( 'Switch to the dark theme', 'hatch-connect' ) }
						title={ theme === 'dark' ? __( 'Light theme', 'hatch-connect' ) : __( 'Dark theme', 'hatch-connect' ) }
					>
						<HxIcon size={14} sw={2}>{theme === 'dark' ? IC.sun : IC.moon}</HxIcon>
					</button>
				</div>
			</div>

			{/* Tab navigation. Scrolls sideways on a narrow screen instead of overflowing the page. */}
			<div style={{ display: 'flex', justifyContent: 'center', padding: '24px 16px 0' }}>
				<div
					className="hx-tabstrip"
					style={{
						display: 'inline-flex',
						position: 'relative',
						maxWidth: '100%',
						overflowX: 'auto',
						background: 'var(--hx-surface-2)',
						borderRadius: 999,
						padding: 4,
						gap: 2,
					}}
					role="tablist"
					aria-label={ __( 'Hatch settings', 'hatch-connect' ) }
					onKeyDown={onTabKey}
				>
					{TABS.map(({ id, label }) => {
						const active = tab === id;
						return (
							<button
								key={id}
								ref={(el) => { tabRefs.current[id] = el; }}
								type="button"
								role="tab"
								id={`hatch-tab-${id}`}
								aria-selected={active}
								aria-controls={`hatch-panel-${id}`}
								tabIndex={active ? 0 : -1}
								onClick={() => setTab(id)}
								style={{
									position: 'relative',
									padding: '8px 16px',
									borderRadius: 999,
									border: '1.5px solid transparent',
									boxShadow: active ? 'var(--hx-shadow-1)' : 'none',
									background: active ? 'var(--hx-surface)' : 'transparent',
									color: active ? 'var(--hx-fg)' : 'var(--hx-subtle)',
									fontWeight: active ? 600 : 500,
									fontSize: 13,
									cursor: 'pointer',
									fontFamily: 'inherit',
									transition: 'background .2s var(--hx-ease), box-shadow .2s var(--hx-ease), color .2s var(--hx-ease)',
									whiteSpace: 'nowrap',
								}}
							>
								{label()}
								{attention[id] && !active && (
									<>
										<span className="hx-tab-dot" aria-hidden="true" />
										<span className="screen-reader-text">{ __( 'Needs attention', 'hatch-connect' ) }</span>
									</>
								)}
							</button>
						);
					})}
				</div>
			</div>

			{/* ── Tab content ──────────────────────────────────────────── */}
			<div style={{ maxWidth: 792, margin: '24px auto 0', padding: '0 16px' }}>
				<div
					key={tab}
					className="hatch-tab-enter"
					role="tabpanel"
					id={`hatch-panel-${tab}`}
					aria-labelledby={`hatch-tab-${tab}`}
				>
					<Current
						state={state}
						onDirty={onDirty}
						setSetting={setSetting}
						onSetup={openWizard}
					/>
				</div>
			</div>

			{/* Footer */}
			<div
				style={{
					maxWidth: 760,
					margin: '32px auto 0',
					padding: '0 16px 24px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					flexWrap: 'wrap',
					gap: 12,
				}}
			>
				<a href={setupUrl} className="hatch-foot-link">{ __( 'Run the setup guide again', 'hatch-connect' ) }</a>
				<span style={{ fontSize: 12, color: 'var(--hx-subtle)' }}>
					{ lastSaved ? /* translators: %s: how long ago, for example "2 minutes ago". */ sprintf( __( 'Saved %s', 'hatch-connect' ), fmtSaved( lastSaved ) ) : '' }
				</span>
			</div>

			{/* Floating save bar: dark pill, 24px up, bottom-centre (DESIGN-SYSTEM.md section 1). */}
			{(dirtyCount > 0 || phase !== 'idle') && (
				<div
					className="hatch-save-bar"
					role="region"
					aria-label={ __( 'Unsaved changes', 'hatch-connect' ) }
					style={{
						position: 'fixed',
						bottom: 24,
						left: '50%',
						transform: 'translateX(-50%)',
						zIndex: 200,
						maxWidth: 'calc(100vw - 24px)',
						borderRadius: 999,
						boxShadow: 'var(--hx-shadow-bar)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexWrap: 'wrap',
						gap: '8px 12px',
						background: phase === 'saved' ? 'var(--hx-success-soft)' : 'var(--hx-bar)',
						color: phase === 'saved' ? 'var(--hx-fg)' : 'var(--hx-bar-fg)',
						border: `1px solid ${phase === 'saved' ? 'var(--hx-success-edge)' : 'var(--hx-bar-line)'}`,
						padding: '8px 10px 8px 20px',
						transition: 'background .2s var(--hx-ease), border-color .2s var(--hx-ease)',
					}}
				>
					{phase === 'saved' && (
						<span role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, paddingInlineEnd: 10 }}>
							<HxIcon size={16} color="var(--hx-success)" sw={2.5}>{IC.check}</HxIcon>
							{ __( 'Saved.', 'hatch-connect' ) }
						</span>
					)}
					{phase === 'saving' && (
						<span role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, paddingInlineEnd: 10 }}>
							<HxIcon size={16} sw={2} style={{ animation: 'hxSpin 0.8s linear infinite' }}>{IC.loaderCircle}</HxIcon>
							{ __( 'Saving...', 'hatch-connect' ) }
						</span>
					)}
					{phase === 'error' && (
						<span role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, flexWrap: 'wrap' }}>
							<HxIcon size={16} color="var(--hx-danger)" sw={2.5}>{IC.circleAlert}</HxIcon>
							{ saveError || __( 'Your changes were not saved.', 'hatch-connect' ) }
							<button type="button" onClick={save} className="hatch-sb-retry">{ __( 'Try again', 'hatch-connect' ) }</button>
						</span>
					)}
					{phase === 'idle' && dirtyCount > 0 && (
						<>
							<span style={{ fontSize: 13, fontWeight: 500 }}>
								{ /* translators: %d: number of unsaved changes. */ sprintf( _n( '%d unsaved change', '%d unsaved changes', dirtyCount, 'hatch-connect' ), dirtyCount ) }
							</span>
							<kbd className="hatch-sb-kbd" aria-hidden="true">{saveHint}</kbd>
							<div style={{ display: 'flex', gap: 6 }}>
								<button type="button" onClick={discard} className="hatch-sb-discard">{ __( 'Discard', 'hatch-connect' ) }</button>
								<button type="button" onClick={save} className="hatch-sb-save" aria-keyshortcuts="Control+S Meta+S">{ __( 'Save changes', 'hatch-connect' ) }</button>
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

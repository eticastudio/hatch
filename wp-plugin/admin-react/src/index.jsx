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

const TABS = [
	{ id: 'connection',  label: () => __( 'Connection', 'hatch-connect' ),  Component: Connection },
	{ id: 'design',      label: () => __( 'Design', 'hatch-connect' ),      Component: Design },
	{ id: 'content',     label: () => __( 'Content', 'hatch-connect' ),     Component: Content },
	{ id: 'bridge',      label: () => __( 'Plugins', 'hatch-connect' ),     Component: PluginBridge },
	{ id: 'performance', label: () => __( 'Performance', 'hatch-connect' ), Component: Performance },
	{ id: 'security',    label: () => __( 'Security', 'hatch-connect' ),    Component: Security },
	{ id: 'status',      label: () => __( 'Status', 'hatch-connect' ),      Component: Status },
];

/* Protections that exist under more than one name. The first path is the one
   that is sent; the others are kept in step on screen, and the server writes
   every name. Mirrors hatch_twin_groups() in admin/dashboard.php. */
const TWIN_GROUPS = [
	['security.fortress_block_xmlrpc', 'security.disable_xmlrpc', 'performance.bloat.xmlrpc'],
	['security.fortress_disable_rest_users', 'security.block_enum', 'performance.bloat.rest_users'],
	['security.fortress_disable_file_edit', 'security.disallow_file_edit'],
	['security.fortress_headers', 'security.send_headers'],
];
const twinsOf = (path) => TWIN_GROUPS.find((g) => g.includes(path)) || [path];

const FORTRESS_PATHS = [
	'block_xmlrpc', 'disable_rest_users', 'disable_file_edit', 'app_password_only',
	'headers', 'hide_wp_version', 'disable_directory_browsing',
].map((k) => 'security.fortress_' + k);

const readPath = (obj, path) => path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), obj);
const writePath = (obj, path, value) => {
	const keys = path.split('.');
	let cursor = obj;
	for (let i = 0; i < keys.length - 1; i++) {
		cursor[keys[i]] = cursor[keys[i]] || {};
		cursor = cursor[keys[i]];
	}
	cursor[keys[keys.length - 1]] = value;
};

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
	const [, setClock] = useState(0);
	// Re-render each 30 seconds so "Saved just now" does not go stale.
	useEffect(() => {
		const t = setInterval(() => setClock((n) => n + 1), 30000);
		return () => clearInterval(t);
	}, []);
	const [saveError, setSaveError] = useState('');
	const [saveNotes, setSaveNotes] = useState([]);
	const tabRefs = useRef({});

	const setupUrl = boot.setupUrl || 'admin.php?page=hatch-setup';
	const openWizard = () => { window.location.href = setupUrl; };

	/* Tabs that need a look get the amber dot (DESIGN-SYSTEM.md section 4).
	   Security: the one-switch hardening is still off. */
	const attention = {
		security: !FORTRESS_PATHS.every((path) => !!readPath(state, path)),
	};

	/* The master Fortress switch moves together with the protections under it,
	   so it is not counted as a second change. */
	const dirtyCount = useMemo(() => {
		return Object.keys(pending).filter((k) => 'security.fortress_mode' !== k).length;
	}, [pending]);

	const setSetting = useCallback((path, value) => {
		const group = twinsOf(path);
		const sendPath = group[0];
		const saved = readPath(baseline.current, sendPath);
		setPending((p) => {
			const next = { ...p };
			/* A switch never saved before reads as off, so off is not a change. */
			const same = typeof value === 'boolean' ? Boolean(saved) === value : JSON.stringify(saved) === JSON.stringify(value);
			if (same) {
				delete next[sendPath];
			} else {
				next[sendPath] = value;
			}
			return next;
		});
		setState((s) => {
			const next = structuredClone(s);
			group.forEach((member) => writePath(next, member, value));
			return next;
		});
	}, []);

	const onDirty = useCallback(() => { setPhase('idle'); }, []);

	const save = useCallback(async () => {
		if (Object.keys(pending).length === 0) return;
		setPhase('saving');
		setSaveError('');
		try {
			const res = await hxFetch('options', { method: 'POST', body: JSON.stringify(pending) });
			const applied = (res && res.applied) || {};
			const hydrated = (res && res.hydrated) || {};
			const notes = (res && res.notes) || {};
			const confirmed = structuredClone(baseline.current);
			const shown = {};
			Object.keys(pending).forEach((path) => {
				/* The server may keep a different value than was typed (a number
				   it clamped, an ID it rejected). What it kept is what is saved. */
				const kept = Object.prototype.hasOwnProperty.call(notes, path) && Object.prototype.hasOwnProperty.call(applied, path) ? applied[path] : pending[path];
				twinsOf(path).forEach((member) => writePath(confirmed, member, kept));
				shown[path] = kept;
			});
			Object.keys(hydrated).forEach((path) => {
				twinsOf(path).forEach((member) => writePath(confirmed, member, hydrated[path]));
				shown[path] = hydrated[path];
			});
			baseline.current = confirmed;
			setState((s) => {
				const next = structuredClone(s);
				Object.keys(shown).forEach((path) => twinsOf(path).forEach((member) => writePath(next, member, shown[path])));
				return next;
			});
			setPending({});
			setSaveNotes(Object.keys(notes).map((k) => notes[k]).filter(Boolean));
			setPhase('saved');
			setLastSaved(new Date());
			setTimeout(() => setPhase('idle'), Object.keys(notes).length ? 8000 : 2200);
		} catch (e) {
			setSaveError(e && e.message ? e.message : '');
			setPhase('error');
		}
	}, [pending]);

	const discard = useCallback(() => {
		setPending({});
		setState(baseline.current);
		setSaveNotes([]);
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
				<h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--hx-text)', lineHeight: 1.2, margin: 0, padding: 0 }}>
					{ boot.brandLogoUrl ? (
						<img src={ boot.brandLogoUrl } alt={ __( 'Hatch', 'hatch-connect' ) } style={{ display: 'block', height: 22, width: 'auto', margin: '0 auto' }} />
					) : (
						__( 'Hatch', 'hatch-connect' )
					) }
				</h1>
				<p style={{ fontSize: 14, color: 'var(--hx-text-subtle)', margin: '6px 0 0' }}>
					{ __( 'Connect this WordPress site to a fast frontend on Cloudflare.', 'hatch-connect' ) }
				</p>

				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
					<span
						style={{
							padding: '4px 12px',
							borderRadius: 999,
							border: '1px solid var(--hx-border)',
							fontSize: 12,
							color: 'var(--hx-text-subtle)',
						}}
					>
						{ /* translators: %s: plugin version number, for example 1.0.0. */ sprintf( __( 'Version %s', 'hatch-connect' ), boot.version || '' ) }
					</span>
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
									color: active ? 'var(--hx-text)' : 'var(--hx-text-subtle)',
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
						pendingPaths={Object.keys(pending)}
						saveNotes={saveNotes}
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
				<span style={{ fontSize: 12, color: 'var(--hx-text-subtle)' }}>
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
						background: phase === 'saved' ? (saveNotes.length ? 'var(--hx-warning-soft)' : 'var(--hx-success-soft)') : 'var(--hx-bar)',
						color: phase === 'saved' ? 'var(--hx-text)' : 'var(--hx-bar-fg)',
						border: `1px solid ${phase === 'saved' ? (saveNotes.length ? 'var(--hx-warning-edge)' : 'var(--hx-success-edge)') : 'var(--hx-bar-line)'}`,
						padding: '8px 10px 8px 20px',
						transition: 'background .2s var(--hx-ease), border-color .2s var(--hx-ease)',
					}}
				>
					{phase === 'saved' && (
						<span role="status" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 14, fontWeight: 600, paddingInlineEnd: 10, color: saveNotes.length ? 'var(--hx-warning)' : undefined }}>
							{ saveNotes.length
								? <HxIcon size={16} color="var(--hx-warning)" sw={2.5}>{IC.triangleAlert}</HxIcon>
								: <HxIcon size={16} color="var(--hx-success)" sw={2.5}>{IC.check}</HxIcon> }
							{ saveNotes.length ? __( 'Saved, with notes:', 'hatch-connect' ) : __( 'Saved.', 'hatch-connect' ) }
							{ saveNotes.map((note) => (
								<span key={note} style={{ fontWeight: 400, fontSize: 13, flexBasis: '100%' }}>{note}</span>
							)) }
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

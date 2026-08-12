import { HxCard, HxHead, HxRow, HxToggle, HxBtn, HxInp, HxIcon, HxBadge } from '../components.jsx';
import { useState, useMemo } from 'react';

/**
 * v0.50.32 Fortress Mode.
 *
 * One-click hardening for the WordPress origin. When the master toggle is on,
 * all seven sub-features enable together and the "Advanced" section reflects
 * their forced state. When off, the individual toggles are honored as before.
 *
 * Visual system:
 *   concentric radii (card 20px, chip 12px, toggle 8px)
 *   layered box-shadow (no borders on the fortress card)
 *   --hx-primary accent when active, --hx-surface when off
 *   staggered chip enter animation via inline transition + CSS delay
 *
 * CLEAN-ROOM. Standards followed: OWASP Secure Headers Project, WordPress
 * Security Guide, RFC 6797 (HSTS).
 */
const FORTRESS_KEYS = [
	'hide_login',
	'block_xmlrpc',
	'disable_rest_users',
	'disable_file_edit',
	'app_password_only',
	'headers',
	'hide_wp_version',
	'disable_directory_browsing',
];

const FORTRESS_CHIPS = [
	{ key: 'hide_login',                 label: 'Hidden login URL',        title: '/wp-login.php returns 404 unless the operator holds the generated key.' },
	{ key: 'block_xmlrpc',               label: 'XML-RPC killed',          title: '/xmlrpc.php returns 403. Removes the biggest brute-force amplification vector.' },
	{ key: 'disable_rest_users',         label: 'User enumeration blocked', title: '/wp/v2/users returns 401 for anonymous. No username leakage.' },
	{ key: 'disable_file_edit',          label: 'Editor + updates locked', title: 'DISALLOW_FILE_EDIT + DISALLOW_FILE_MODS defined. Attackers cannot write PHP through wp-admin.' },
	{ key: 'app_password_only',          label: 'App-Password mutations',  title: 'REST POST/PUT/DELETE requires an Application Password. Basic-auth with a real user password is rejected.' },
	{ key: 'headers',                    label: 'OWASP headers',           title: 'HSTS, X-Frame, nosniff, Referrer-Policy, Permissions-Policy on every WP response.' },
	{ key: 'hide_wp_version',            label: 'Version stripped',        title: 'Generator meta + ?ver=x.y query args stripped from CSS/JS. Fingerprinting harder.' },
	{ key: 'disable_directory_browsing', label: 'Directory listings off',  title: 'Bare uploads directory URLs return 403. Options -Indexes added to .htaccess.' },
];

export default function Security({ state, onDirty, setSetting }) {
	const sec = state.security || {};
	const ts  = state.turnstile || {};
	const hasTsKeys = !!(ts.site_key && ts.secret_key);
	const [advancedOpen, setAdvancedOpen] = useState(false);

	const fortressOn = !!sec.fortress_mode;
	const anyAdvancedDivergent = useMemo(
		() => fortressOn && FORTRESS_KEYS.some((k) => !sec['fortress_' + k]),
		[fortressOn, sec]
	);

	const toggleFortress = (v) => {
		setSetting('security.fortress_mode', v);
		if (v) {
			FORTRESS_KEYS.forEach((k) => setSetting('security.fortress_' + k, true));
		}
		onDirty();
	};

	// v0.50.31 — When user tries to flip a Turnstile-gated toggle without
	// keys, deep-link to Content tab and flash the key inputs so it's
	// obvious where to go next.
	const flashTurnstileKeys = () => {
		window.location.hash = '#content';
		setTimeout(() => {
			const el = document.getElementById('hatch-turnstile-keys');
			if (!el) return;
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			el.classList.remove('hatch-flash');
			void el.offsetWidth;
			el.classList.add('hatch-flash');
		}, 200);
	};

	const onToggle = (path) => (v) => { setSetting(path, v); onDirty(); };
	const onText   = (path) => (e) => { setSetting(path, e.target.value); onDirty(); };

	const setup     = state.setup || {};
	const nonces    = setup.nonces || {};
	const adminPost = (window.hatchBoot || {}).adminPostUrl;

	const inp = {
		height: 36,
		padding: '0 10px',
		borderRadius: 8,
		border: '1px solid var(--hx-border-2)',
		fontSize: 13,
		outline: 'none',
		fontFamily: 'inherit',
		color: 'var(--hx-fg)',
		background: 'var(--hx-surface)',
		boxSizing: 'border-box',
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
			{/* v0.50.32 Fortress Mode: prominent 1-click hardening card */}
			<div
				role="region"
				aria-label="Fortress Mode"
				style={{
					position: 'relative',
					borderRadius: 20,
					padding: 24,
					background: fortressOn
						? 'linear-gradient(135deg, var(--hx-surface), var(--hx-surface-2, var(--hx-surface)))'
						: 'var(--hx-surface)',
					boxShadow: fortressOn
						? '0 1px 0 0 rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.14), 0 0 0 1px var(--hx-primary)'
						: '0 1px 0 0 rgba(0,0,0,0.04), 0 4px 12px -8px rgba(0,0,0,0.10), 0 0 0 1px var(--hx-border)',
					transition: 'box-shadow var(--hx-ease, 200ms ease), background var(--hx-ease, 200ms ease)',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
					<div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', minWidth: 0 }}>
						<div
							aria-hidden="true"
							style={{
								flex: '0 0 auto',
								width: 44, height: 44, borderRadius: 12,
								display: 'grid', placeItems: 'center',
								background: fortressOn ? 'var(--hx-primary)' : 'var(--hx-surface-2, var(--hx-surface))',
								color: fortressOn ? 'var(--hx-primary-fg, #fff)' : 'var(--hx-muted)',
								boxShadow: fortressOn ? '0 4px 10px -4px var(--hx-primary)' : 'inset 0 0 0 1px var(--hx-border)',
								transition: 'background var(--hx-ease, 200ms ease), color var(--hx-ease, 200ms ease)',
							}}
						>
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
								<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
								<path d="M9 12l2 2 4-4" />
							</svg>
						</div>
						<div style={{ minWidth: 0 }}>
							<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
								<h3 style={{ margin: 0, fontSize: 17, fontWeight: 650, color: 'var(--hx-fg)', letterSpacing: '-0.01em' }}>
									Fortress Mode
								</h3>
								<HxBadge color={fortressOn ? 'green' : 'neutral'}>
									{fortressOn ? 'Active' : 'Off'}
								</HxBadge>
								{anyAdvancedDivergent && (
									<HxBadge color="yellow">Advanced overrides</HxBadge>
								)}
							</div>
							<p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--hx-muted)', maxWidth: 620 }}>
								One switch. Every wp-login, xmlrpc, and user-enum surface goes dark. Astro stays your only front door.
							</p>
						</div>
					</div>
					<div style={{ flex: '0 0 auto', paddingTop: 4 }}>
						<HxToggle on={fortressOn} onChange={toggleFortress} aria-label="Enable Fortress Mode" />
					</div>
				</div>

				{/* Chip list of the 7 (actually 8) protections */}
				<ul
					aria-label="Fortress protections"
					style={{
						listStyle: 'none', margin: '18px 0 0', padding: 0,
						display: 'flex', flexWrap: 'wrap', gap: 8,
					}}
				>
					{FORTRESS_CHIPS.map((chip, i) => {
						const on = fortressOn && !!sec['fortress_' + chip.key];
						return (
							<li
								key={chip.key}
								title={chip.title}
								style={{
									display: 'inline-flex', alignItems: 'center', gap: 6,
									padding: '6px 10px', borderRadius: 12,
									fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums',
									color: on ? 'var(--hx-primary-fg, #fff)' : 'var(--hx-muted)',
									background: on ? 'var(--hx-primary)' : 'var(--hx-surface-2, var(--hx-surface))',
									boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--hx-border)',
									opacity: fortressOn ? 1 : 0.6,
									transform: fortressOn ? 'translateY(0)' : 'translateY(2px)',
									transition: `opacity var(--hx-ease, 200ms ease) ${i * 60}ms, transform var(--hx-ease, 200ms ease) ${i * 60}ms, background var(--hx-ease, 200ms ease) ${i * 100}ms, color var(--hx-ease, 200ms ease) ${i * 100}ms`,
								}}
							>
								<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
									{on
										? <polyline points="20 6 9 17 4 12" />
										: <circle cx="12" cy="12" r="9" />}
								</svg>
								{chip.label}
							</li>
						);
					})}
				</ul>

				{fortressOn && sec.fortress_login_url && (
					<div style={{
						marginTop: 18, padding: '10px 12px',
						borderRadius: 12,
						background: 'var(--hx-surface-2, var(--hx-surface))',
						boxShadow: 'inset 0 0 0 1px var(--hx-border)',
						fontSize: 12, color: 'var(--hx-muted)',
					}}>
						<div style={{ fontWeight: 600, color: 'var(--hx-fg)', marginBottom: 4 }}>Bookmark your login URL</div>
						<code style={{
							display: 'block',
							fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
							fontSize: 12, wordBreak: 'break-all', color: 'var(--hx-fg)',
						}}>{sec.fortress_login_url}</code>
						<div style={{ marginTop: 4 }}>
							Anyone hitting /wp-login.php without this key gets a 404. Logged-in admins are always allowed through as a lockout safeguard.
						</div>
					</div>
				)}

				{/* Advanced collapsible */}
				<div style={{ marginTop: 18, borderTop: '1px solid var(--hx-border)', paddingTop: 14 }}>
					<button
						type="button"
						onClick={() => setAdvancedOpen((v) => !v)}
						aria-expanded={advancedOpen}
						aria-controls="hatch-fortress-advanced"
						style={{
							background: 'transparent', border: 'none', padding: 0,
							cursor: 'pointer', color: 'var(--hx-muted)',
							fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
							display: 'inline-flex', alignItems: 'center', gap: 6,
							outline: 'none',
						}}
						onFocus={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px var(--hx-primary)'}
						onBlur={(e) => e.currentTarget.style.boxShadow = 'none'}
					>
						<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: advancedOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform var(--hx-ease, 200ms ease)' }}>
							<polyline points="9 18 15 12 9 6" />
						</svg>
						Advanced (per-feature toggles)
					</button>
					{advancedOpen && (
						<div id="hatch-fortress-advanced" className="hx-grid-stack hx-gap-2" style={{ marginTop: 12 }}>
							{FORTRESS_CHIPS.map((chip) => (
								<label
									key={chip.key}
									style={{
										display: 'flex', alignItems: 'center', justifyContent: 'space-between',
										gap: 10, padding: '10px 12px', borderRadius: 12,
										background: 'var(--hx-surface-2, var(--hx-surface))',
										boxShadow: 'inset 0 0 0 1px var(--hx-border)',
										fontSize: 12.5, color: 'var(--hx-fg)',
										cursor: 'pointer',
									}}
								>
									<span style={{ minWidth: 0 }}>
										<span style={{ display: 'block', fontWeight: 600 }}>{chip.label}</span>
										<span style={{ display: 'block', color: 'var(--hx-subtle)', fontSize: 11.5, marginTop: 2 }}>{chip.title}</span>
									</span>
									<HxToggle
										on={!!sec['fortress_' + chip.key]}
										onChange={(v) => { setSetting('security.fortress_' + chip.key, v); onDirty(); }}
									/>
								</label>
							))}
						</div>
					)}
				</div>
			</div>

			{/* REST API hardening: tight, scannable */}
			<HxCard>
				<div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }} data-hatch-card-head="attack-surface">
					<div
						aria-hidden="true"
						style={{
							flex: '0 0 auto',
							width: 44,
							height: 44,
							borderRadius: 12,
							display: 'grid',
							placeItems: 'center',
							background: 'color-mix(in oklab, #2563eb 12%, var(--hx-surface-2, var(--hx-surface)))',
							color: 'var(--hx-info)',
							boxShadow: 'inset 0 0 0 1px var(--hx-border)',
						}}
					>
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
							<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
						</svg>
					</div>
					<div style={{ flex: 1, paddingTop: 1 }}>
						<div className="hx-title" style={{ color: 'var(--hx-fg)' }}>WordPress attack surface</div>
						<div className="hx-byline" style={{ color: 'var(--hx-subtle)', marginTop: 3 }}>
							Shut down the endpoints WordPress exposes by default that headless sites never use.
						</div>
					</div>
				</div>
				<HxRow
					label="Lock the REST API"
					desc="Anonymous /wp-json/* returns 401. Your Astro frontend uses an Application Password — unaffected."
				>
					<HxToggle on={!!sec.block_rest} onChange={onToggle('security.block_rest')} />
				</HxRow>
				<HxRow
					label="Kill XML-RPC"
					desc="/xmlrpc.php returns 403. Source of most brute-force amplification — one request can test thousands of passwords."
				>
					<HxToggle on={!!sec.disable_xmlrpc} onChange={onToggle('security.disable_xmlrpc')} />
				</HxRow>
				<HxRow
					label="Hide usernames"
					desc="/?author=1 returns 404 and /wp-json/wp/v2/users returns 401 for anonymous visitors. Your frontend still reads authors. Stops credential-stuffing recon."
				>
					<HxToggle on={!!sec.block_enum} onChange={onToggle('security.block_enum')} />
				</HxRow>
				<HxRow
					label="Hide WP from Google"
					desc="Noindex on the WP origin + Disallow robots.txt. Only your Astro frontend gets indexed — no duplicate-content penalty."
					last
				>
					<HxToggle on={!!sec.noindex_cms} onChange={onToggle('security.noindex_cms')} />
				</HxRow>
			</HxCard>

			{/* Custom login URL */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<rect x="3" y="11" width="18" height="11" rx="2" />
						<path d="M7 11V7a5 5 0 0110 0v4" />
					</>}
					iconColor="#d97706"
					title="Hide wp-login.php"
					desc="Move the login form to a secret slug. Bots scanning /wp-login.php hit 404 — they can't attempt passwords against a form they can't find."
				/>
				<div className="hx-grid-cols-2" style={{ gap: 14 }}>
					<div>
						<div className="hx-help" style={{ fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Login slug</div>
						<input
							type="text"
							placeholder="hatch-login"
							value={sec.login_slug || ''}
							onChange={onText('security.login_slug')}
							style={{ ...inp, width: '100%' }}
						/>
						<div className="hx-help" style={{ color: 'var(--hx-subtle)', marginTop: 4 }}>Lives under your domain. Avoid: wp-login, admin, login, dashboard.</div>
					</div>
					<div>
						<div className="hx-help" style={{ fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Anyone hitting old wp-login.php sees</div>
						{/* v0.50.31 — Segmented control (no dropdown). 2 options. */}
						{(() => {
							const v = sec.login_redirect === '' ? 'home' : '404';
							const opts = [
								{ id: '404',  label: 'Hard 404' },
								{ id: 'home', label: 'Homepage' },
							];
							return (
								<div style={{ display: 'flex', gap: 4, background: 'var(--hx-surface)', border: '1px solid var(--hx-border)', borderRadius: 999, padding: 3 }}>
									{opts.map((o) => (
										<button
											key={o.id}
											type="button"
											onClick={() => { setSetting('security.login_redirect', o.id === 'home' ? '' : '404'); onDirty(); }}
											style={{
												flex: 1,
												padding: '7px 14px',
												borderRadius: 999,
												border: 'none',
												background: v === o.id ? 'var(--hx-fg)' : 'transparent',
												color: v === o.id ? 'var(--hx-bg)' : 'var(--hx-muted)',
												fontSize: 12.5,
												fontWeight: v === o.id ? 600 : 500,
												cursor: 'pointer',
												fontFamily: 'inherit',
												transition: 'background .15s, color .15s',
											}}
										>{o.label}</button>
									))}
								</div>
							);
						})()}
						<div className="hx-help" style={{ color: 'var(--hx-subtle)', marginTop: 6 }}>
							Hard 404 confuses scanners best — most bots stop trying once they hit a dead URL.
						</div>
					</div>
				</div>
			</HxCard>

			{/* Role guard */}
			<HxCard>
				<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
					<HxHead
						iconChildren={<>
							<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
							<circle cx="9" cy="7" r="4" />
							<path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
						</>}
						iconColor="#8b5cf6"
						title="Restrict wp-admin access"
						desc="Roles not on the allow-list are redirected to the frontend at login. Stops subscribers/customers from ever seeing the dashboard."
						mb={0}
					/>
					<HxToggle on={!!sec.role_guard} onChange={onToggle('security.role_guard')} />
				</div>
				{sec.role_guard && (
					<div style={{ paddingTop: 14, borderTop: '1px solid var(--hx-border)', marginTop: 16 }}>
						<div className="hx-help" style={{ fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Roles allowed in wp-admin</div>
						<input
							type="text"
							value={sec.allowed_roles || 'administrator, editor, author'}
							onChange={onText('security.allowed_roles')}
							style={{ ...inp, width: '100%' }}
						/>
						<div className="hx-help" style={{ color: 'var(--hx-subtle)', marginTop: 4 }}>Comma-separated WordPress role slugs. "administrator" is always included automatically — you can't lock yourself out.</div>
					</div>
				)}
			</HxCard>

			{/* Brute-force lockout */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<rect x="5" y="2" width="14" height="20" rx="2" />
						<line x1="12" y1="18" x2="12.01" y2="18" />
					</>}
					iconColor="#ef4444"
					title="Brute-force lockout"
					desc="Blocks an IP after N failed logins in the window. Defaults (5 in 60 min) catch bots without bothering humans."
				/>
				<div className="hx-grid-cols-2" style={{ gap: 14 }}>
					<div>
						<div className="hx-help" style={{ fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Failed attempts before lockout</div>
						<input
							type="number"
							min="1"
							max="20"
							value={sec.bf_threshold || 5}
							onChange={onText('security.bf_threshold')}
							style={{ ...inp, width: '100%' }}
						/>
						<div className="hx-help" style={{ color: 'var(--hx-subtle)', marginTop: 4 }}>5 is the security-industry default. Raise if your team mistypes a lot.</div>
					</div>
					<div>
						<div className="hx-help" style={{ fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Rolling window (minutes)</div>
						<input
							type="number"
							min="5"
							value={sec.bf_window || 60}
							onChange={onText('security.bf_window')}
							style={{ ...inp, width: '100%' }}
						/>
						<div className="hx-help" style={{ color: 'var(--hx-subtle)', marginTop: 4 }}>How long the IP stays blocked after hitting the threshold.</div>
					</div>
				</div>
			</HxCard>

			{/* v0.50.31 — Spam protection card. Per-surface toggles for where
			    Turnstile is applied. Keys live in Content tab → Third-party
			    keys. Each toggle is gated on keys being present (guardTs). */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
						<circle cx="12" cy="11" r="2" />
					</>}
					iconColor="#0d9488"
					title="Bot & spam protection"
					desc="Invisible Cloudflare Turnstile challenge — no puzzles for humans. Configure keys once in Content tab; toggle which surfaces use it below."
					action={<HxBadge color={(ts.site_key && ts.secret_key) ? 'green' : 'yellow'}>{(ts.site_key && ts.secret_key) ? 'Keys saved' : 'Keys missing'}</HxBadge>}
				/>
				<HxRow
					label="Gate wp-login.php"
					desc="Adds Turnstile to the WP login form. Stops 99% of credential-stuffing before it touches auth."
				>
					<HxToggle
						on={!!sec.turnstile_login && hasTsKeys}
						onChange={(v) => {
							if (v && !hasTsKeys) { flashTurnstileKeys(); return; }
							setSetting('security.turnstile_login', v); onDirty();
						}}
					/>
				</HxRow>
				<HxRow
					label="Gate WP classic comment form"
					desc="Protects WordPress's native comment form. Most headless sites leave OFF — Astro comments are gated in Content tab."
					last
				>
					<HxToggle
						on={!!sec.turnstile_comments && hasTsKeys}
						onChange={(v) => {
							if (v && !hasTsKeys) { flashTurnstileKeys(); return; }
							setSetting('security.turnstile_comments', v); onDirty();
						}}
					/>
				</HxRow>
				<div className="hx-help" style={{ paddingTop: 10, color: 'var(--hx-subtle)' }}>
					Get keys free from <a href="https://dash.cloudflare.com/?to=/:account/turnstile" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hx-primary)' }}>Cloudflare dashboard ↗</a> · Saved in <a href="?page=hatch#content" style={{ color: 'var(--hx-primary)' }}>Content tab → Third-party keys ↗</a>
				</div>
			</HxCard>

			{/* Fortress mode — server-side hardening: file edits, headers, 2FA */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
					</>}
					iconColor="#0a0a0a"
					title="Server-side fortress"
					desc="PHP-level hardening — invisible to visitors, devastating to attackers. Safe to leave on."
				/>
				<HxRow
					label="Lock the editor + uploads"
					desc="Disables file editor, blocks raw <script> in admin posts, and stops PHP execution in /uploads/. Three layers, one toggle."
				>
					<HxToggle on={!!sec.disallow_file_edit} onChange={onToggle('security.disallow_file_edit')} />
				</HxRow>
				<HxRow
					label="Security headers on WP"
					desc="HSTS, X-Frame, Referrer-Policy, nosniff, Permissions-Policy. Matches what Astro already sends — same fortress everywhere."
				>
					<HxToggle on={!!sec.send_headers} onChange={onToggle('security.send_headers')} />
				</HxRow>
				<HxRow
					label="Require 2FA for admins"
					desc={
						!sec.twofa_provider
							? "Needs a 2FA plugin first. Recommended: WP 2FA or Two-Factor (free, by WP core team)."
							: !sec.twofa_user_configured
								? `${sec.twofa_provider} installed — enroll your account first so you don't lock yourself out.`
								: `${sec.twofa_provider} active. Toggle on to require it for every Administrator login.`
					}
					last
				>
					{!sec.twofa_provider && (
						<span title={'Supported plugins (install any one):\n• WP 2FA\n• Two-Factor\n• miniOrange 2FA\n• Wordfence 2FA\n• Solid Security'} style={{ cursor: 'help' }}>
							<HxBadge color="neutral">No provider</HxBadge>
						</span>
					)}
					{sec.twofa_provider && !sec.twofa_user_configured && (
						<HxBtn href={sec.twofa_settings_url || '#'} variant="ghost">
							Setup
						</HxBtn>
					)}
					{sec.twofa_provider && sec.twofa_user_configured && (
						<HxToggle on={!!sec.enforce_2fa} onChange={onToggle('security.enforce_2fa')} />
					)}
				</HxRow>
			</HxCard>

			{/* Application Passwords — generate + rotate in one card */}
			<HxCard>
				<HxHead
					iconChildren={<><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></>}
					iconColor="#6366f1"
					title="Application Passwords"
					desc={
						setup.appPassword
							? 'A fresh password was just generated. Copy it now — it is shown only this once. It is also baked into the VPS install command on the setup wizard.'
							: 'Hatch uses a WordPress Application Password to authenticate the Astro frontend against the REST API. Generate one for the VPS install command, or rotate after a suspected token leak.'
					}
					mb={setup.appPassword ? 14 : 16}
				/>

				{setup.appPassword && (
					<div
						style={{
							background: '#18181b', borderRadius: 10, padding: '12px 14px',
							fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
							fontSize: 12, color: 'var(--hx-bg)', marginBottom: 14,
							wordBreak: 'break-all',
						}}
					>
						{setup.appPassword}
					</div>
				)}

				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
					<form method="post" action={adminPost} style={{ display: 'inline' }}>
						<input type="hidden" name="action"   value="hatch_generate_app_password" />
						<input type="hidden" name="_wpnonce" value={nonces.generate_app_password || ''} />
						<HxBtn type="submit" variant={setup.appPassword ? 'ghost' : 'default'}>
							<HxIcon size={13} color="currentColor">
								<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
							</HxIcon>
							{setup.appPassword ? 'Generate another' : 'Generate new'}
						</HxBtn>
					</form>
					<form
						method="post"
						action={adminPost}
						style={{ display: 'inline' }}
						onSubmit={(e) => {
							if (!window.confirm('Revoke every existing Hatch Application Password and mint a single fresh one? Your Astro frontend will need the new password before it can authenticate again.')) e.preventDefault();
						}}
					>
						<input type="hidden" name="action"   value="hatch_rotate_app_pwds" />
						<input type="hidden" name="_wpnonce" value={nonces.rotate_app_pwds || ''} />
						<HxBtn type="submit" variant="ghost">
							<HxIcon size={13}><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 102.13-9.36L1 10" /></HxIcon>
							Rotate all
						</HxBtn>
					</form>
				</div>
			</HxCard>

			{/* Uninstall behaviour — danger card. Toggle lives at the top
			    next to the title (matches Cloudflare Turnstile / Role guard
			    pattern). Body becomes context-only since the toggle controls
			    the only setting on the card. */}
			<HxCard status="danger">
				<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
					<HxHead
						iconChildren={<>
							<polyline points="3 6 5 6 21 6" />
							<path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4a1 1 0 011-1h2a1 1 0 011 1v2" />
						</>}
						iconColor="#b91c1c"
						title="Remove all data on uninstall"
						desc="By default, deleting the plugin preserves all settings for a clean re-install. Toggle on to wipe every Hatch option (deploy token, Application Passwords, scheduled events). This cannot be undone."
						mb={0}
					/>
					<HxToggle on={!!sec.remove_on_uninstall} onChange={onToggle('security.remove_on_uninstall')} />
				</div>
			</HxCard>
		</div>
	);
}

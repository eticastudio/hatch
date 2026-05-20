import { HxCard, HxHead, HxRow, HxToggle, HxBtn, HxInp, HxIcon, HxBadge } from '../components.jsx';

export default function Security({ state, onDirty, setSetting }) {
	const sec = state.security || {};
	const ts  = state.turnstile || {};
	const hasTsKeys = !!(ts.site_key && ts.secret_key);

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
			{/* REST API hardening — tight, scannable */}
			<HxCard>
				<HxHead
					iconChildren={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>}
					iconColor="#2563eb"
					title="WordPress attack surface"
					desc="Shut down the endpoints WordPress exposes by default that headless sites never use."
				/>
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
					desc="/?author=1 and /wp-json/wp/v2/users return 404. Stops credential-stuffing recon."
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
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
							fontSize: 12, color: '#fafafa', marginBottom: 14,
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

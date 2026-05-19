import { HxCard, HxHead, HxRow, HxToggle, HxBtn, HxInp, HxIcon, HxBadge } from '../components.jsx';

export default function Security({ state, onDirty, setSetting }) {
	const sec = state.security || {};
	const ts  = state.turnstile || {};

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
			{/* REST API hardening */}
			<HxCard>
				<HxHead
					iconChildren={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>}
					iconColor="#2563eb"
					title="REST API hardening"
					desc="Enable these by default. Only disable if you are certain your setup requires open access."
				/>
				<HxRow
					label="Block unauthenticated REST API"
					desc="Anonymous requests to /wp-json/* get a 401 response. Your headless frontend uses an Application Password so it is not affected."
				>
					<HxToggle on={!!sec.block_rest} onChange={onToggle('security.block_rest')} />
				</HxRow>
				<HxRow
					label="Disable XML-RPC"
					desc="Removes the XML-RPC endpoint entirely. Standard headless setups have no use for it."
				>
					<HxToggle on={!!sec.disable_xmlrpc} onChange={onToggle('security.disable_xmlrpc')} />
				</HxRow>
				<HxRow
					label="Block user enumeration"
					desc="Prevents anonymous REST requests from listing WordPress user accounts."
				>
					<HxToggle on={!!sec.block_enum} onChange={onToggle('security.block_enum')} />
				</HxRow>
				<HxRow
					label="Hide CMS from search engines"
					desc="Adds a noindex tag to the raw WordPress install so only your headless site gets indexed."
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
					title="Custom login URL"
					desc="Move wp-login.php to a custom slug. Stops bots from even finding the login form."
				/>
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
					<div>
						<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Login slug</div>
						<input
							type="text"
							placeholder="hatch-login"
							value={sec.login_slug || ''}
							onChange={onText('security.login_slug')}
							style={{ ...inp, width: '100%' }}
						/>
						<div style={{ fontSize: 11, color: 'var(--hx-subtle)', marginTop: 4 }}>Lives under your domain. Avoid: wp-login, admin, login, dashboard.</div>
					</div>
					<div>
						<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Anyone hitting old wp-login.php sees</div>
						<select
							value={sec.login_redirect || '404'}
							onChange={(e) => { setSetting('security.login_redirect', e.target.value); onDirty(); }}
							style={{ ...inp, width: '100%', cursor: 'pointer' }}
						>
							<option value="404">Hard 404 (recommended — bots give up)</option>
							<option value="">Home page (/)</option>
							<option value="custom">Custom path…</option>
						</select>
						{sec.login_redirect === 'custom' && (
							<input
								type="text"
								placeholder="go-away"
								value={sec.login_redirect_custom || ''}
								onChange={(e) => { setSetting('security.login_redirect_custom', e.target.value); onDirty(); }}
								style={{ ...inp, width: '100%', marginTop: 8 }}
							/>
						)}
						<div style={{ fontSize: 11, color: 'var(--hx-subtle)', marginTop: 4 }}>
							404 confuses scanners best.
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
						title="Headless role guard"
						desc="Locks down wp-admin. Non-allowed roles are immediately redirected away — they have no reason to be there in a headless setup."
						mb={0}
					/>
					<HxToggle on={!!sec.role_guard} onChange={onToggle('security.role_guard')} />
				</div>
				{sec.role_guard && (
					<div style={{ paddingTop: 14, borderTop: '1px solid var(--hx-border)', marginTop: 16 }}>
						<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Allowed roles</div>
						<input
							type="text"
							value={sec.allowed_roles || 'administrator, editor, author'}
							onChange={onText('security.allowed_roles')}
							style={{ ...inp, width: '100%' }}
						/>
						<div style={{ fontSize: 11, color: 'var(--hx-subtle)', marginTop: 4 }}>"administrator" is always included for safety.</div>
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
					desc="Locks an IP address after N failed login attempts within a rolling time window."
				/>
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
					<div>
						<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Failed attempts threshold</div>
						<input
							type="number"
							min="1"
							max="20"
							value={sec.bf_threshold || 5}
							onChange={onText('security.bf_threshold')}
							style={{ ...inp, width: '100%' }}
						/>
					</div>
					<div>
						<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Lockout window (minutes)</div>
						<input
							type="number"
							min="5"
							value={sec.bf_window || 60}
							onChange={onText('security.bf_window')}
							style={{ ...inp, width: '100%' }}
						/>
					</div>
				</div>
			</HxCard>

			{/* Cloudflare Turnstile — keys live in Content tab, this is just a quick link */}
			<HxCard>
				<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
					<HxHead
						iconChildren={<>
							<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
							<circle cx="12" cy="11" r="2" />
						</>}
						iconColor="#0d9488"
						title="Cloudflare Turnstile"
						desc="Privacy-friendly bot protection for comments and form submissions. Keys + per-surface toggles live in the Content tab."
						mb={0}
						action={<HxBadge color={(ts.site_key && ts.secret_key) ? 'green' : 'neutral'}>{(ts.site_key && ts.secret_key) ? 'Keys saved' : 'Not configured'}</HxBadge>}
					/>
				</div>
				<div style={{ paddingTop: 14, marginTop: 14, borderTop: '1px solid var(--hx-border)' }}>
					<a href="?page=hatch#content" style={{ color: 'var(--hx-primary)', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Open Content tab → Core integrations ↗</a>
				</div>
			</HxCard>

			{/* Fortress mode — server-side hardening: file edits, headers, 2FA */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
					</>}
					iconColor="#0a0a0a"
					title="Fortress mode"
					desc="Server-side hardening that's safe to leave on for every headless site. Each toggle wires a single, well-tested measure."
				/>
				<HxRow
					label="Disable Theme + Plugin file editor"
					desc="Defines DISALLOW_FILE_EDIT so a compromised admin account can't paste a backdoor into theme files. WP's safest one-line defense."
				>
					<HxToggle on={!!sec.disallow_file_edit} onChange={onToggle('security.disallow_file_edit')} />
				</HxRow>
				<HxRow
					label="Send security headers on WordPress"
					desc="HSTS (1y), X-Frame-Options: SAMEORIGIN, Referrer-Policy: strict-origin-when-cross-origin, X-Content-Type-Options: nosniff, Permissions-Policy. The Astro frontend already sends these — this matches the WP origin so both speak the same fortress."
				>
					<HxToggle on={!!sec.send_headers} onChange={onToggle('security.send_headers')} />
				</HxRow>
				<HxRow
					label="Enforce 2FA on admin"
					desc={
						!sec.twofa_provider
							? 'No 2FA plugin detected. Recommended: WP 2FA (free, polished UX) or Two-Factor (lightweight, core team).'
							: !sec.twofa_user_configured
								? `${sec.twofa_provider} is installed but you haven't configured a method for your account yet. Set one up first, then come back to enforce it for every admin.`
								: `${sec.twofa_provider} active and configured for your account. Toggle on to require it for every admin.`
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

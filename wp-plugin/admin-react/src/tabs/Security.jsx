import { HxCard, HxHead, HxRow, HxToggle, HxBtn, HxIcon, HxBadge, HxField, HxNativeInput, Chip } from '../components.jsx';
import { useState, useMemo } from 'react';
import { __, sprintf } from '@wordpress/i18n';

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
	'block_xmlrpc',
	'disable_rest_users',
	'disable_file_edit',
	'app_password_only',
	'headers',
	'hide_wp_version',
	'disable_directory_browsing',
];

const getFortressChips = () => [
	{
		key: 'block_xmlrpc',
		label: __( 'XML-RPC blocked', 'hatch-bridge' ),
		title: __( '/xmlrpc.php returns 403. Apps that still use XML-RPC will stop working.', 'hatch-bridge' ),
	},
	{
		key: 'disable_rest_users',
		label: __( 'Usernames hidden from REST', 'hatch-bridge' ),
		title: __( 'The /wp/v2/users REST route is closed to signed-out visitors, so usernames are not listed.', 'hatch-bridge' ),
	},
	{
		key: 'disable_file_edit',
		label: __( 'Editors and updates locked', 'hatch-bridge' ),
		title: __( 'Turns off the theme and plugin file editors and blocks installing or updating plugins and themes from wp-admin.', 'hatch-bridge' ),
	},
	{
		key: 'app_password_only',
		label: __( 'Application Password for writes', 'hatch-bridge' ),
		title: __( 'Creating, changing or deleting content through the REST API needs an Application Password. Hatch\'s own routes use their own checks.', 'hatch-bridge' ),
	},
	{
		key: 'headers',
		label: __( 'Security headers', 'hatch-bridge' ),
		title: __( 'Sends HSTS (on HTTPS), X-Frame-Options, nosniff, Referrer-Policy and Permissions-Policy on WordPress pages and the login page.', 'hatch-bridge' ),
	},
	{
		key: 'hide_wp_version',
		label: __( 'WordPress version hidden', 'hatch-bridge' ),
		title: __( 'Removes the generator tag and the ?ver= query string from CSS and JavaScript links.', 'hatch-bridge' ),
	},
	{
		key: 'disable_directory_browsing',
		label: __( 'Directory listings off', 'hatch-bridge' ),
		title: __( 'Requests for a bare uploads folder return 403. On Apache, Options -Indexes is also added to the uploads .htaccess.', 'hatch-bridge' ),
	},
];

export default function Security({ state, onDirty, setSetting }) {
	const sec = state.security || {};
	const ts  = state.turnstile || {};
	const fortressChips = useMemo( () => getFortressChips(), [] );
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

	// When the user tries to flip a Turnstile-gated toggle without
	// keys, deep-link to the Content tab and flash the key inputs so it is
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
			{/* v0.50.32 Fortress Mode. Rebuilt on the shared primitives so the
			    hero card matches every other card on the page: HxCard defaults
			    (radius 14, padding 22, 1px border), HxHead for the icon-box +
			    title + status action, Chip primitives for the protection list.
			    No custom gradient background, no triple-shadow ring, no fourth
			    pill primitive. */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
						<path d="M9 12l2 2 4-4" />
					</>}
					iconColor={fortressOn ? '#16a34a' : 'var(--hx-muted)'}
					title={ __( 'Fortress Mode', 'hatch-bridge' ) }
						desc={ __( 'One switch turns on every protection listed below. Visitors only use your frontend, so XML-RPC and the user list can be closed to the public.', 'hatch-bridge' ) }
					mb={16}
					action={
						<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
							<HxBadge color={fortressOn ? 'green' : 'neutral'}>
								{fortressOn ? __( 'Active', 'hatch-bridge' ) : __( 'Off', 'hatch-bridge' )}
							</HxBadge>
							{anyAdvancedDivergent && (
								<HxBadge color="yellow">{ __( 'Advanced overrides', 'hatch-bridge' ) }</HxBadge>
							)}
							<HxToggle on={fortressOn} onChange={toggleFortress} ariaLabel={ __( 'Enable Fortress Mode', 'hatch-bridge' ) } />
						</div>
					}
				/>

				{/* Chip list of the 7 protections. Uses the shared Chip
				    primitive so the visual language matches Density, Roundness,
				    and every other picker in the admin. */}
				<div
					role="list"
					aria-label={ __( 'Fortress protections', 'hatch-bridge' ) }
					style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
				>
					{fortressChips.map((chip) => {
						const on = fortressOn && !!sec['fortress_' + chip.key];
						return (
							<span key={chip.key} role="listitem" title={chip.title}>
								<Chip label={chip.label} active={on} onClick={() => {}} />
							</span>
						);
					})}
				</div>

				{/* Advanced collapsible: per-feature HxRow list. Matches every
				    other setting-row in the admin. */}
				<div style={{ marginTop: 16, borderTop: '1px solid var(--hx-border)', paddingTop: 14 }}>
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
					>
						<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: advancedOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform var(--hx-ease, 200ms ease)' }}>
							<polyline points="9 18 15 12 9 6" />
						</svg>
						{ __( 'Advanced (per-feature toggles)', 'hatch-bridge' ) }
						</button>
					{advancedOpen && (
						<div id="hatch-fortress-advanced" style={{ marginTop: 6 }}>
							{fortressChips.map((chip, i) => (
								<HxRow
									key={chip.key}
									label={chip.label}
									desc={chip.title}
									last={i === fortressChips.length - 1}
								>
									<HxToggle
										on={!!sec['fortress_' + chip.key]}
										onChange={(v) => { setSetting('security.fortress_' + chip.key, v); onDirty(); }}
									/>
								</HxRow>
							))}
						</div>
					)}
				</div>
			</HxCard>

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
						<div className="hx-title" style={{ color: 'var(--hx-fg)' }}>{ __( 'WordPress attack surface', 'hatch-bridge' ) }</div>
						<div className="hx-byline" style={{ color: 'var(--hx-subtle)', marginTop: 3 }}>
							{ __( 'Close endpoints that WordPress opens by default and a headless site does not need.', 'hatch-bridge' ) }
						</div>
					</div>
				</div>
				<HxRow
					label={ __( 'Lock the REST API', 'hatch-bridge' ) }
					desc={ __( 'Signed-out requests to /wp-json/ return 401, except a short list of public Hatch routes your frontend needs. Requests that sign in with an Application Password still work.', 'hatch-bridge' ) }
				>
					<HxToggle on={!!sec.block_rest} onChange={onToggle('security.block_rest')} />
				</HxRow>
				<HxRow
					label={ __( 'Block XML-RPC', 'hatch-bridge' ) }
					desc={ __( '/xmlrpc.php returns 403. Attackers often use it to try many passwords in a single request.', 'hatch-bridge' ) }
				>
					<HxToggle on={!!sec.disable_xmlrpc} onChange={onToggle('security.disable_xmlrpc')} />
				</HxRow>
				<HxRow
					label={ __( 'Hide usernames', 'hatch-bridge' ) }
					desc={ __( 'Author URLs such as /?author=1 return 404 and /wp-json/wp/v2/users returns 401 for signed-out visitors. This makes it harder to find valid usernames.', 'hatch-bridge' ) }
				>
					<HxToggle on={!!sec.block_enum} onChange={onToggle('security.block_enum')} />
				</HxRow>
				<HxRow
					label={ __( 'Keep this site out of search results', 'hatch-bridge' ) }
					desc={ __( 'Adds a noindex tag to WordPress pages and a Disallow rule to robots.txt, so only your frontend is indexed.', 'hatch-bridge' ) }
					last
				>
					<HxToggle on={!!sec.noindex_cms} onChange={onToggle('security.noindex_cms')} />
				</HxRow>
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
						title={ __( 'Restrict wp-admin access', 'hatch-bridge' ) }
						desc={ __( 'People whose role is not on the list are sent to the frontend when they sign in. Subscribers and customers never see the dashboard.', 'hatch-bridge' ) }
						mb={0}
					/>
					<HxToggle on={!!sec.role_guard} onChange={onToggle('security.role_guard')} ariaLabel={ __( 'Restrict wp-admin access', 'hatch-bridge' ) } />
				</div>
				{sec.role_guard && (
					<div style={{ paddingTop: 14, borderTop: '1px solid var(--hx-border)', marginTop: 16 }}>
						<HxField label={ __( 'Roles allowed in wp-admin', 'hatch-bridge' ) } help={ __( 'Comma-separated role slugs. Administrators are always allowed, so you cannot lock yourself out.', 'hatch-bridge' ) }>
							<HxNativeInput
								type="text"
								value={sec.allowed_roles || 'administrator, editor, author'}
								onChange={onText('security.allowed_roles')}
								style={{ ...inp, width: '100%' }}
							/>
						</HxField>
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
					title={ __( 'Brute-force lockout', 'hatch-bridge' ) }
					desc={ __( 'Blocks logins from an IP address after too many failed attempts. The defaults stop bots and rarely affect real users.', 'hatch-bridge' ) }
				/>
				<div className="hx-grid-cols-2" style={{ gap: 14 }}>
					<HxField label={ __( 'Failed attempts before lockout', 'hatch-bridge' ) } help={ __( 'Between 3 and 20. Raise it if your team often mistypes passwords.', 'hatch-bridge' ) }>
						<HxNativeInput
							type="number"
							min="3" max="20"
							value={sec.bf_threshold || 5}
							onChange={onText('security.bf_threshold')}
							style={{ ...inp, width: '100%' }}
						/>
					</HxField>
					<HxField label={ __( 'Lockout window (minutes)', 'hatch-bridge' ) } help={ __( 'Between 5 and 240. An IP stays blocked for this long after its last failed attempt.', 'hatch-bridge' ) }>
						<HxNativeInput
							type="number"
							min="5" max="240" value={sec.bf_window || 60}
							onChange={onText('security.bf_window')}
							style={{ ...inp, width: '100%' }}
						/>
					</HxField>
				</div>
			</HxCard>

			{/* Spam protection card. Per-surface toggles for where Turnstile is
			    applied. Keys live in the Content tab under Third-party keys.
			    Each toggle is gated on keys being present. */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
						<circle cx="12" cy="11" r="2" />
					</>}
					iconColor="#0d9488"
					title={ __( 'Bot & spam protection', 'hatch-bridge' ) }
					desc={ __( 'Cloudflare Turnstile is a CAPTCHA alternative that usually needs no puzzle. Enter your keys once in the Content tab, then choose where to use it below.', 'hatch-bridge' ) }
					action={<HxBadge color={hasTsKeys ? 'green' : 'yellow'}>{hasTsKeys ? __( 'Keys saved', 'hatch-bridge' ) : __( 'Keys missing', 'hatch-bridge' )}</HxBadge>}
				/>
				<HxRow
					label={ __( 'Protect wp-login.php', 'hatch-bridge' ) }
					desc={ __( 'Adds a Turnstile check to the WordPress login form, so automated login attempts are stopped before passwords are checked.', 'hatch-bridge' ) }
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
					label={ __( 'Protect the WordPress comment form', 'hatch-bridge' ) }
					desc={ __( 'Adds a Turnstile check to the comment form built into WordPress. Most headless sites leave this off because comments are posted from the frontend, which is protected in the Content tab.', 'hatch-bridge' ) }
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
				<div className="hx-help" style={{ paddingTop: 10, color: 'var(--hx-subtle)', display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
						<a href="https://dash.cloudflare.com/?to=/:account/turnstile" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hx-link)' }}>{ __( 'Get keys in the Cloudflare dashboard', 'hatch-bridge' ) } ↗</a>
						<a href="?page=hatch#content" style={{ color: 'var(--hx-link)' }}>{ __( 'Enter keys in Content, Third-party keys', 'hatch-bridge' ) }</a>
					</div>
			</HxCard>

			{/* Server-side hardening: file edits, headers, 2FA */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
					</>}
					iconColor="#0a0a0a"
					title={ __( 'Server-side hardening', 'hatch-bridge' ) }
					desc={ __( 'Extra protections that run on the WordPress server. Visitors do not see them.', 'hatch-bridge' ) }
				/>
				<HxRow
					label={ __( 'Lock file editors', 'hatch-bridge' ) }
					desc={ __( 'Turns off the theme and plugin file editors and removes the unfiltered HTML permission, so raw script tags in posts are filtered out.', 'hatch-bridge' ) }
				>
					<HxToggle on={!!sec.disallow_file_edit} onChange={onToggle('security.disallow_file_edit')} />
				</HxRow>
				<HxRow
					label={ __( 'Security headers', 'hatch-bridge' ) }
					desc={ __( 'Sends HSTS (on HTTPS), X-Frame-Options, Referrer-Policy, nosniff and Permissions-Policy on WordPress pages. On Apache it also stops PHP files in /uploads/ from running.', 'hatch-bridge' ) }
				>
					<HxToggle on={!!sec.send_headers} onChange={onToggle('security.send_headers')} />
				</HxRow>
				<HxRow
					label={ __( 'Remind admins to use 2FA', 'hatch-bridge' ) }
					desc={
						!sec.twofa_provider
							? __( 'Needs a supported two-factor plugin first, such as WP 2FA or Two-Factor.', 'hatch-bridge' )
							: !sec.twofa_user_configured
								/* translators: %s: name of the installed two-factor plugin. */
								? sprintf( __( '%s is installed. Set up two-factor for your own account first.', 'hatch-bridge' ), sec.twofa_provider )
								/* translators: %s: name of the active two-factor plugin. */
								: sprintf( __( '%s is active. Turn this on to show a reminder to Administrators who have not set up two-factor. Nothing is blocked.', 'hatch-bridge' ), sec.twofa_provider )
					}
					last
				>
					{!sec.twofa_provider && (
						<span title={ [ __( 'Supported plugins (install any one):', 'hatch-bridge' ), '• WP 2FA', '• Two-Factor', '• miniOrange 2FA', '• Wordfence 2FA', '• Solid Security' ].join( '\n' ) } style={{ cursor: 'help' }}>
							<HxBadge color="neutral">{ __( 'No provider', 'hatch-bridge' ) }</HxBadge>
						</span>
					)}
					{sec.twofa_provider && !sec.twofa_user_configured && (
						<HxBtn href={sec.twofa_settings_url || '#'} variant="ghost">
							{ __( 'Set up', 'hatch-bridge' ) }
						</HxBtn>
					)}
					{sec.twofa_provider && sec.twofa_user_configured && (
						<HxToggle on={!!sec.enforce_2fa} onChange={onToggle('security.enforce_2fa')} />
					)}
				</HxRow>
			</HxCard>

			{/* Application password: explain it and point to WordPress's own screen. */}
			<HxCard>
				<HxHead
					iconChildren={<><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></>}
					iconColor="#6366f1"
					title={ __( 'Application password', 'hatch-bridge' ) }
					desc={ __( 'When you deploy, Hatch creates a WordPress application password named "Hatch (Cloudflare deploy)" so your Cloudflare-hosted frontend can read this site. To replace it, deploy again from the Connection tab: Hatch creates a new one and removes the old one. To revoke it right away, use your profile page. The frontend will stop working until you deploy again.', 'hatch-bridge' ) }
					mb={16}
				/>
				<HxBtn href={setup.disclosure && setup.disclosure.appPasswordsUrl ? setup.disclosure.appPasswordsUrl : '#'} variant="ghost">
					{ __( 'Open application passwords', 'hatch-bridge' ) }
				</HxBtn>
			</HxCard>

			{/* Uninstall behaviour: danger card. The toggle sits next to the
			    title, like the Role guard card. */}
			<HxCard status="danger">
				<div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
					<HxHead
						iconChildren={<>
							<polyline points="3 6 5 6 21 6" />
							<path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4a1 1 0 011-1h2a1 1 0 011 1v2" />
						</>}
						iconColor="#b91c1c"
						title={ __( 'Remove all data on uninstall', 'hatch-bridge' ) }
						desc={ __( 'By default, deleting the plugin keeps your settings so a reinstall picks up where you left off. Turn this on to delete every Hatch option, including the deploy token, when the plugin is deleted. This cannot be undone.', 'hatch-bridge' ) }
						mb={0}
					/>
					<HxToggle on={!!sec.remove_on_uninstall} onChange={onToggle('security.remove_on_uninstall')} ariaLabel={ __( 'Remove all data on uninstall', 'hatch-bridge' ) } />
				</div>
			</HxCard>
		</div>
	);
}

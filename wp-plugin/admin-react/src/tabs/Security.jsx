import { HxDisclosure, HxCard, HxHead, HxRow, HxToggle, HxBtn, HxIcon, HxBadge, HxField, HxInp, Chip } from '../components.jsx';
import { IC } from '../icons';
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
		label: __( 'Old remote access closed', 'hatch-connect' ),
		title: __( 'Blocks XML-RPC, an old WordPress feature that attackers like to try. Apps that still use it will stop working.', 'hatch-connect' ),
	},
	{
		key: 'disable_rest_users',
		label: __( 'Usernames hidden', 'hatch-connect' ),
		title: __( 'Signed-out visitors can no longer get a list of your usernames.', 'hatch-connect' ),
	},
	{
		key: 'disable_file_edit',
		label: __( 'Code editors and updates locked', 'hatch-connect' ),
		title: __( 'Turns off the theme and plugin code editors, and blocks installing or updating plugins and themes from the dashboard.', 'hatch-connect' ),
	},
	{
		key: 'app_password_only',
		label: __( 'Changes need an Application Password', 'hatch-connect' ),
		title: __( 'Apps that create, change or delete content must sign in with an Application Password (a separate password made for one app). Editing in the WordPress dashboard keeps working. Hatch has its own checks.', 'hatch-connect' ),
	},
	{
		key: 'headers',
		label: __( 'Security headers', 'hatch-connect' ),
		title: __( 'Adds extra safety instructions that browsers follow on your WordPress pages and login page, such as forcing https and blocking other sites from framing your pages.', 'hatch-connect' ),
	},
	{
		key: 'hide_wp_version',
		label: __( 'WordPress version hidden', 'hatch-connect' ),
		title: __( 'Stops WordPress from telling the world which version you run, so attackers cannot target known weaknesses.', 'hatch-connect' ),
	},
	{
		key: 'disable_directory_browsing',
		label: __( 'Folder listings off', 'hatch-connect' ),
		title: __( 'Visitors cannot browse the list of files in your uploads folder.', 'hatch-connect' ),
	},
];

export default function Security({ state, onDirty, setSetting }) {
	const sec = state.security || {};
	const ts  = state.turnstile || {};
	const fortressChips = useMemo( () => getFortressChips(), [] );
	const hasTsKeys = !!(ts.site_key && ts.secret_key);

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
					iconChildren={IC.shieldCheck}
					iconColor={fortressOn ? '#16a34a' : '#737373'}
					title={ __( 'Fortress Mode', 'hatch-connect' ) }
						desc={ __( 'One switch turns on every protection below. Your visitors use the frontend, so WordPress can close the doors it no longer needs.', 'hatch-connect' ) }
					mb={16}
					action={
						<div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
							<HxBadge color={fortressOn ? 'green' : 'neutral'}>
								{fortressOn ? __( 'Active', 'hatch-connect' ) : __( 'Off', 'hatch-connect' )}
							</HxBadge>
							{anyAdvancedDivergent && (
								<HxBadge color="yellow">{ __( 'Custom choices', 'hatch-connect' ) }</HxBadge>
							)}
							<HxToggle on={fortressOn} onChange={toggleFortress} ariaLabel={ __( 'Enable Fortress Mode', 'hatch-connect' ) } />
						</div>
					}
				/>

				{/* Chip list of the 7 protections. Uses the shared Chip
				    primitive so the visual language matches Density, Roundness,
				    and every other picker in the admin. */}
				<div
					role="list"
					aria-label={ __( 'Fortress protections', 'hatch-connect' ) }
					style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
				>
					{fortressChips.map((chip) => {
						const on = fortressOn && !!sec['fortress_' + chip.key];
						return (
							<span key={chip.key} role="listitem" title={chip.title}>
								<Chip label={chip.label} active={on} readOnly />
							</span>
						);
					})}
				</div>

				{/* Advanced collapsible: per-feature HxRow list. Matches every
				    other setting-row in the admin. */}
				<div style={{ marginTop: 16, borderTop: '1px solid var(--hx-border)', paddingTop: 14 }}>
					<HxDisclosure label={ __( 'Choose protections one by one', 'hatch-connect' ) }>
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
					</HxDisclosure>
				</div>
			</HxCard>

			{/* REST API hardening: tight, scannable */}
			<HxCard>
				<HxHead
					iconChildren={IC.shield}
					iconColor="#2563eb"
					title={ __( 'WordPress doors to close', 'hatch-connect' ) }
					desc={ __( 'Close the access points WordPress opens by default that your site does not need.', 'hatch-connect' ) }
				/>
				<HxRow
					label={ __( 'Lock the WordPress data feed', 'hatch-connect' ) }
					desc={ __( 'Signed-out visitors cannot read your WordPress data directly. A short list of routes your frontend needs stays open, and apps that sign in with an Application Password still work.', 'hatch-connect' ) }
				>
					<HxToggle on={!!sec.block_rest} onChange={onToggle('security.block_rest')} />
				</HxRow>
				<HxRow
					label={ __( 'Close the old remote access (XML-RPC)', 'hatch-connect' ) }
					desc={ __( 'Attackers often use it to try many passwords in one request. Most sites do not need it.', 'hatch-connect' ) }
				>
					<HxToggle on={!!sec.disable_xmlrpc} onChange={onToggle('security.disable_xmlrpc')} />
				</HxRow>
				<HxRow
					label={ __( 'Hide usernames', 'hatch-connect' ) }
					desc={ __( 'Hides your usernames from signed-out visitors, which makes it harder to guess a login.', 'hatch-connect' ) }
				>
					<HxToggle on={!!sec.block_enum} onChange={onToggle('security.block_enum')} />
				</HxRow>
				<HxRow
					label={ __( 'Keep this site out of search results', 'hatch-connect' ) }
					desc={ __( 'Asks search engines to skip your WordPress address, so only your frontend shows up in search.', 'hatch-connect' ) }
					last
				>
					<HxToggle on={!!sec.noindex_cms} onChange={onToggle('security.noindex_cms')} />
				</HxRow>
			</HxCard>

			{/* Role guard */}
			<HxCard>
				<HxHead
					iconChildren={IC.users}
					iconColor="#8b5cf6"
					title={ __( 'Keep some people out of the dashboard', 'hatch-connect' ) }
					desc={ __( 'People whose role is not on the list are sent to the frontend when they sign in. Subscribers and customers never see the WordPress dashboard.', 'hatch-connect' ) }
					mb={0}
					nowrap
					action={<HxToggle on={!!sec.role_guard} onChange={onToggle('security.role_guard')} ariaLabel={ __( 'Keep some people out of the dashboard', 'hatch-connect' ) } />}
				/>
				{sec.role_guard && (
					<div style={{ paddingTop: 14, borderTop: '1px solid var(--hx-border)', marginTop: 16 }}>
						<HxField label={ __( 'Roles allowed in wp-admin', 'hatch-connect' ) } help={ __( 'Roles separated by commas, for example editor, author. Administrators are always allowed, so you cannot lock yourself out.', 'hatch-connect' ) }>
							<HxInp
								value={sec.allowed_roles || 'administrator, editor, author'}
								onChange={onText('security.allowed_roles')}
								/>
						</HxField>
					</div>
				)}
			</HxCard>

			{/* Brute-force lockout */}
			<HxCard>
				<HxHead
					iconChildren={IC.shieldBan}
					iconColor="#ef4444"
					title={ __( 'Lock out repeated wrong passwords', 'hatch-connect' ) }
					desc={ __( 'Blocks a visitor after too many failed sign-ins. The defaults stop bots and rarely bother real people.', 'hatch-connect' ) }
				/>
				<div className="hx-grid-cols-2" style={{ gap: 14 }}>
					<HxField label={ __( 'Failed attempts before lockout', 'hatch-connect' ) } help={ __( 'Choose 3 to 20. Raise it if your team often mistypes passwords.', 'hatch-connect' ) }>
						<HxInp
							type="number"
							min="3"
							max="20"
							value={sec.bf_threshold || 5}
							onChange={onText('security.bf_threshold')}
							/>
					</HxField>
					<HxField label={ __( 'Lockout window (minutes)', 'hatch-connect' ) } help={ __( 'Choose 5 to 240 minutes. A blocked visitor can try again after this long.', 'hatch-connect' ) }>
						<HxInp
							type="number"
							min="5"
							max="240"
							value={sec.bf_window || 60}
							onChange={onText('security.bf_window')}
							/>
					</HxField>
				</div>
			</HxCard>

			{/* Spam protection card. Per-surface toggles for where Turnstile is
			    applied. Keys live in the Content tab under Third-party keys.
			    Each toggle is gated on keys being present. */}
			<HxCard>
				<HxHead
					iconChildren={IC.bot}
					iconColor="#0d9488"
					title={ __( 'Bot and spam protection', 'hatch-connect' ) }
					desc={ __( 'Cloudflare Turnstile checks that a visitor is human, usually without a puzzle. Enter your keys once in the Content tab, then choose where to use it below.', 'hatch-connect' ) }
					action={<HxBadge color={hasTsKeys ? 'green' : 'yellow'}>{hasTsKeys ? __( 'Keys saved', 'hatch-connect' ) : __( 'Keys missing', 'hatch-connect' )}</HxBadge>}
				/>
				<HxRow
					label={ __( 'Protect the WordPress sign-in page', 'hatch-connect' ) }
					desc={ __( 'Adds a Turnstile check to the sign-in form, so bots are stopped before any password is tried.', 'hatch-connect' ) }
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
					label={ __( 'Protect the WordPress comment form', 'hatch-connect' ) }
					desc={ __( 'Adds a Turnstile check to the comment form built into WordPress. Most sites leave this off because comments are posted from the frontend, which you protect in the Content tab.', 'hatch-connect' ) }
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
						<a href="https://dash.cloudflare.com/?to=/:account/turnstile" target="_blank" rel="noopener noreferrer" className="hx-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{ __( 'Get your keys in Cloudflare', 'hatch-connect' ) }<HxIcon size={12}>{IC.externalLink}</HxIcon></a>
						<a href="?page=hatch#content" className="hx-link">{ __( 'Enter keys in Content, Third-party keys', 'hatch-connect' ) }</a>
					</div>
			</HxCard>

			{/* Server-side hardening: file edits, headers, 2FA */}
			<HxCard>
				<HxHead
					iconChildren={IC.shieldCheck}
					iconColor="#737373"
					title={ __( 'Extra protection on your server', 'hatch-connect' ) }
					desc={ __( 'These run on your WordPress server. Visitors do not see them.', 'hatch-connect' ) }
				/>
				<HxRow
					label={ __( 'Lock the code editors', 'hatch-connect' ) }
					desc={ __( 'Turns off the theme and plugin code editors, and filters raw script code out of posts.', 'hatch-connect' ) }
				>
					<HxToggle on={!!sec.disallow_file_edit} onChange={onToggle('security.disallow_file_edit')} />
				</HxRow>
				<HxRow
					label={ __( 'Security headers', 'hatch-connect' ) }
					desc={ __( 'Adds extra safety instructions that browsers follow on your WordPress pages. On Apache servers it also stops program files in your uploads folder from running.', 'hatch-connect' ) }
				>
					<HxToggle on={!!sec.send_headers} onChange={onToggle('security.send_headers')} />
				</HxRow>
				<HxRow
					label={ __( 'Remind admins to use two-factor sign-in', 'hatch-connect' ) }
					desc={
						!sec.twofa_provider
							? __( 'Needs a two-factor plugin first, such as WP 2FA or Two-Factor.', 'hatch-connect' )
							: !sec.twofa_user_configured
								/* translators: %s: name of the installed two-factor plugin. */
								? sprintf( __( '%s is installed. Set up two-factor for your own account first, then turn this on.', 'hatch-connect' ), sec.twofa_provider )
								/* translators: %s: name of the active two-factor plugin. */
								: sprintf( __( '%s is active. Turn this on to remind administrators who have not set up two-factor. Nothing is blocked.', 'hatch-connect' ), sec.twofa_provider )
					}
					last
				>
					{!sec.twofa_provider && (
						<span title={ [ __( 'Supported plugins (install any one):', 'hatch-connect' ), '• WP 2FA', '• Two-Factor', '• miniOrange 2FA', '• Wordfence 2FA', '• Solid Security' ].join( '\n' ) } style={{ cursor: 'help' }}>
							<HxBadge color="neutral">{ __( 'No provider', 'hatch-connect' ) }</HxBadge>
						</span>
					)}
					{sec.twofa_provider && !sec.twofa_user_configured && (
						<HxBtn href={sec.twofa_settings_url || '#'} variant="ghost">
							{ __( 'Set up', 'hatch-connect' ) }
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
					iconChildren={IC.keyRound}
					iconColor="#6366f1"
					title={ __( 'Application password', 'hatch-connect' ) }
					desc={ __( 'When you deploy, Hatch makes an application password named "Hatch (Cloudflare deploy)" (a separate password for one job) so your frontend can read this site. To replace it, deploy again from the Connection tab. To remove it right now, use your profile page. The frontend stops working until you deploy again.', 'hatch-connect' ) }
					mb={16}
				/>
				<HxBtn href={setup.disclosure && setup.disclosure.appPasswordsUrl ? setup.disclosure.appPasswordsUrl : '#'} variant="ghost">
					{ __( 'Open my application passwords', 'hatch-connect' ) }
				</HxBtn>
			</HxCard>

			{/* Uninstall behaviour: danger card. The toggle sits next to the
			    title, like the Role guard card. */}
			<HxCard status="danger">
				<HxHead
					iconChildren={IC.trash2}
					iconColor="#b91c1c"
					title={ __( 'Remove all data on uninstall', 'hatch-connect' ) }
					desc={ __( 'Normally, deleting the plugin keeps your settings so a reinstall picks up where you left off. Turn this on to erase every Hatch setting, including the saved Cloudflare token, when you delete the plugin. This cannot be undone.', 'hatch-connect' ) }
					mb={0}
					nowrap
					action={<HxToggle on={!!sec.remove_on_uninstall} onChange={onToggle('security.remove_on_uninstall')} ariaLabel={ __( 'Remove all data on uninstall', 'hatch-connect' ) } />}
				/>
			</HxCard>
		</div>
	);
}

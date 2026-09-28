import { createInterpolateElement } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { HxCard, HxHead, HxRow, HxToggle, HxBadge, HxInp, HxGL, HxField } from '../components.jsx';

// WP Core Sync card.
// Uses the same shared components as Design / Performance / Security:
//   HxCard + HxHead → card chrome
//   HxGL            → section group labels
//   HxRow           → key/value rows (consistent padding, divider, alignment)
//   HxBadge         → status pills
const codeStyle = {
	fontFamily: 'ui-monospace, monospace',
	fontSize: 12.5,
	padding: '2px 6px',
	background: 'var(--hx-surface)',
	borderRadius: 4,
	color: 'var(--hx-fg)',
};

function ManageLink({ href, label }) {
	return (
		<a href={href} target="_blank" rel="noopener noreferrer"
			className="hx-help"
			style={{ fontWeight: 500, color: 'var(--hx-link)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
			{label || __( 'Manage', 'hatch-bridge' )} →
		</a>
	);
}
function MenuSelect({ value, options, onChange, ariaLabel }) {
	return (
		<select
			value={value || 0}
			aria-label={ariaLabel}
			onChange={(e) => onChange(Number(e.target.value))}
			style={{
				fontSize: 13, padding: '6px 10px',
				border: '1px solid var(--hx-border)', borderRadius: 8,
				background: 'var(--hx-bg)', color: 'var(--hx-fg)',
				fontFamily: 'inherit', minWidth: 200,
			}}
		>
			<option value="0">{ __( 'None', 'hatch-bridge' ) }</option>
			{options.map((mn) => (
				<option key={mn.id} value={mn.id}>{mn.name} ({mn.count})</option>
			))}
		</select>
	);
}
function CoreSync({ data, content, setSetting, onDirty, guardTurnstile }) {
	if (!data) return null;
	const { site, permalink, homepage, menus, all_menus, discussion, reading, privacy, post_types, taxonomies, languages, roles, authors } = data;
	const assignedCount = menus.filter(m => m.assigned_id > 0).length;
	const chipStyle = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: '1px solid var(--hx-border)', borderRadius: 999, background: 'var(--hx-surface)', fontSize: 12 };
	const userTotal = roles.reduce((s, r) => s + r.count, 0);

	return (
		<HxCard>
			<HxHead
				iconChildren={<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>}
				iconColor="#3b82f6"
				title={ __( 'WordPress Core Sync', 'hatch-bridge' ) }
				desc={ __( 'The WordPress settings your frontend depends on. Hatch can change some of them here. For the rest, a link opens the WordPress screen where you change them.', 'hatch-bridge' ) }
			/>

			{/* Site identity */}
			<HxGL>{ __( 'Site identity', 'hatch-bridge' ) }</HxGL>
			<HxRow
				label={site.title || __( 'Untitled site', 'hatch-bridge' )}
				desc={[ site.tagline || __( 'No tagline', 'hatch-bridge' ), site.url, site.language ].join( ' · ' )}
			>
				<ManageLink href={site.customizer_url} label={ __( 'Customizer', 'hatch-bridge' ) } />
			</HxRow>
			<HxRow
				label={ __( 'Logo & Favicon', 'hatch-bridge' ) }
				desc={ __( 'Set in the Customizer under Site Identity. Your frontend uses both.', 'hatch-bridge' ) }
				last
			>
				<div style={{ display: 'flex', gap: 6 }}>
					<HxBadge color={site.logo_url ? 'green' : 'neutral'}>{site.logo_url ? __( 'Logo set', 'hatch-bridge' ) : __( 'No logo', 'hatch-bridge' )}</HxBadge>
					<HxBadge color={site.favicon_url ? 'green' : 'neutral'}>{site.favicon_url ? __( 'Favicon set', 'hatch-bridge' ) : __( 'No favicon', 'hatch-bridge' )}</HxBadge>
				</div>
			</HxRow>

			{/* URL structure */}
			<HxGL>{ __( 'URL structure', 'hatch-bridge' ) }</HxGL>
			<HxRow
				label={ __( 'Post URL format', 'hatch-bridge' ) }
				desc={permalink.pretty
					? createInterpolateElement(
						/* translators: %s: example post URL path. The <code> tags must stay. */
						sprintf( __( 'Your frontend can route posts. Post URLs look like <code>%s</code>.', 'hatch-bridge' ), permalink.example ),
						{ code: <code style={codeStyle} /> }
					)
					: createInterpolateElement(
						__( 'WordPress is using the default <code>?p=123</code> format. Hatch cannot route posts with it. Switch to any other permalink structure.', 'hatch-bridge' ),
						{ code: <code style={{ ...codeStyle, color: 'var(--hx-warning)' }} /> }
					)}
				last
			>
				<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
					<HxBadge color={permalink.pretty ? 'green' : 'yellow'}>{permalink.pretty ? __( 'Clean URLs', 'hatch-bridge' ) : __( 'Needs fixing', 'hatch-bridge' )}</HxBadge>
					<ManageLink href={permalink.admin_url} />
				</div>
			</HxRow>

			{/* Homepage and reading */}
			<HxGL>{ __( 'Homepage & reading', 'hatch-bridge' ) }</HxGL>
			<HxRow
				label={ __( 'Homepage', 'hatch-bridge' ) }
				desc={homepage.mode === 'page'
					/* translators: %s: title of the static homepage. */
					? sprintf( __( 'Showing: %s', 'hatch-bridge' ), homepage.static_title || sprintf(
						/* translators: %d: page ID. */
						__( 'Page #%d', 'hatch-bridge' ), homepage.static_id ) )
					: sprintf(
						/* translators: %d: number of posts shown per page. */
						_n( 'Latest posts, %d post per page', 'Latest posts, %d posts per page', reading.posts_per_page, 'hatch-bridge' ),
						reading.posts_per_page
					)}
			>
				<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
					<HxBadge color={homepage.mode === 'page' ? 'green' : 'neutral'}>{homepage.mode === 'page' ? __( 'Static page', 'hatch-bridge' ) : __( 'Latest posts', 'hatch-bridge' )}</HxBadge>
					<ManageLink href={homepage.admin_url} />
				</div>
			</HxRow>
			<HxRow
				label={ __( 'Search engine visibility', 'hatch-bridge' ) }
				desc={reading.blog_public
					? __( 'WordPress allows search engines to index this site.', 'hatch-bridge' )
					: __( 'WordPress is asking search engines to skip this site. That can keep your frontend out of search results too.', 'hatch-bridge' )}
				last
			>
				<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
					<HxBadge color={reading.blog_public ? 'green' : 'yellow'}>{reading.blog_public ? __( 'Public', 'hatch-bridge' ) : __( 'Discouraged', 'hatch-bridge' )}</HxBadge>
					<ManageLink href={reading.admin_url} />
				</div>
			</HxRow>

			{/* Menu locations, with an inline picker */}
			<HxGL>
				{ __( 'Menu locations', 'hatch-bridge' ) } · <HxBadge color={assignedCount === menus.length && menus.length > 0 ? 'green' : 'yellow'}>{
					/* translators: 1: number of menu locations with a menu assigned, 2: total number of menu locations. */
					sprintf( __( '%1$d/%2$d assigned', 'hatch-bridge' ), assignedCount, menus.length || 0 )
				}</HxBadge>
			</HxGL>
			{menus.length === 0 && (
				<HxRow label={ __( 'No locations registered', 'hatch-bridge' ) } desc={ __( 'Activate the Hatch companion theme to add Primary, Footer and Mobile menu locations.', 'hatch-bridge' ) } last />
			)}
			{menus.map((m, i) => (
				<HxRow
					key={m.loc}
					label={m.label}
					desc={m.assigned
						? ( m.count > 0
							/* translators: 1: menu name, 2: number of items in the menu. */
							? sprintf( _n( 'Assigned: %1$s (%2$d item)', 'Assigned: %1$s (%2$d items)', m.count, 'hatch-bridge' ), m.assigned, m.count )
							/* translators: %s: menu name. */
							: sprintf( __( 'Assigned: %s', 'hatch-bridge' ), m.assigned ) )
						: __( 'Choose a menu from the list.', 'hatch-bridge' )}
					last={i === menus.length - 1 && all_menus.length > 0}
				>
					<MenuSelect
						value={m.assigned_id}
						options={all_menus}
						/* translators: %s: menu location name. */
						ariaLabel={ sprintf( __( 'Menu for %s', 'hatch-bridge' ), m.label ) }
						onChange={(v) => { setSetting(`core.menu_location.${m.loc}`, v); onDirty(); }}
					/>
				</HxRow>
			))}
			{all_menus.length === 0 && menus.length > 0 && (
				<HxRow
					label={ __( 'No menus exist yet', 'hatch-bridge' ) }
					desc={ __( 'Create one under Appearance, Menus in WordPress, then come back here to assign it.', 'hatch-bridge' ) }
					last
				>
					<ManageLink href="nav-menus.php" label={ __( 'Create menu', 'hatch-bridge' ) } />
				</HxRow>
			)}

			{/* Discussion and comments */}
			<HxGL>
				{ __( 'Discussion', 'hatch-bridge' ) } · <HxBadge color={discussion.pending_count > 0 ? 'yellow' : 'neutral'}>{
					/* translators: 1: number of approved comments, 2: number of comments waiting for approval. */
					sprintf( __( '%1$d approved, %2$d pending', 'hatch-bridge' ), discussion.approved_count, discussion.pending_count )
				}</HxBadge>
			</HxGL>
			<HxRow
				label={ __( 'Show comments on posts', 'hatch-bridge' ) }
				desc={ __( 'Shows a comments section below every post on your frontend. Moderation still happens in WordPress.', 'hatch-bridge' ) }
			>
				<HxToggle on={!!content.comments_enabled} onChange={(v) => { setSetting('content.comments_enabled', v); onDirty(); }} />
			</HxRow>
			<HxRow
				label={ __( 'Block comment spam', 'hatch-bridge' ) }
				desc={ __( 'Runs a Cloudflare Turnstile check before a comment is posted from your frontend. Needs Turnstile keys, which you enter below.', 'hatch-bridge' ) }
			>
				<HxToggle on={!!content.comments_turnstile} onChange={guardTurnstile('content.comments_turnstile')} />
			</HxRow>
			<HxRow
				label={ __( 'Close comments on new posts', 'hatch-bridge' ) }
				desc={ __( 'New posts start with comments turned off. You can still change it on each post. Existing posts are not changed.', 'hatch-bridge' ) }
			>
				<HxToggle
					on={discussion.default_comment_status !== 'open'}
					onChange={(v) => { setSetting('core.default_comment_status', v ? 'closed' : 'open'); onDirty(); }}
				/>
			</HxRow>
			<HxRow
				label={ __( 'WordPress comment defaults (read-only)', 'hatch-bridge' ) }
				desc={[
					discussion.comment_moderation ? __( 'Every comment waits for approval', 'hatch-bridge' ) : __( 'Comments are not held for approval', 'hatch-bridge' ),
					discussion.comment_registration ? __( 'Sign-in required to comment', 'hatch-bridge' ) : __( 'Visitors can comment without an account', 'hatch-bridge' ),
				].join( ' · ' )}
				last
			>
				<ManageLink href={discussion.admin_url} />
			</HxRow>

			{/* Content types */}
			<HxGL>{ __( 'Content types', 'hatch-bridge' ) } · <HxBadge color="neutral">{post_types.length}</HxBadge></HxGL>
			<HxRow
				label={ __( 'Public post types in the REST API', 'hatch-bridge' ) }
				desc={ __( 'Your frontend can fetch and show any of these. Custom post types appear here when they are registered with show_in_rest set to true.', 'hatch-bridge' ) }
				last
			>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: 460 }}>
					{post_types.map((p) => (
						<span key={p.slug} style={chipStyle}>
							<strong style={{ color: 'var(--hx-fg)' }}>{p.label}</strong>
							<span style={{ color: 'var(--hx-subtle)' }}>{p.builtin
								? p.count
								/* translators: %d: number of published items in a custom post type. */
								: sprintf( __( '%d · custom', 'hatch-bridge' ), p.count )}</span>
						</span>
					))}
				</div>
			</HxRow>

			{/* Taxonomies */}
			<HxGL>{ __( 'Taxonomies', 'hatch-bridge' ) } · <HxBadge color="neutral">{taxonomies.length}</HxBadge></HxGL>
			<HxRow
				label={ __( 'Public taxonomies', 'hatch-bridge' ) }
				desc={ __( 'Categories, tags and any custom taxonomy registered with show_in_rest set to true.', 'hatch-bridge' ) }
				last
			>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: 460 }}>
					{taxonomies.map((t) => (
						<span key={t.slug} style={chipStyle}>
							<strong style={{ color: 'var(--hx-fg)' }}>{t.label}</strong>
							<span style={{ color: 'var(--hx-subtle)' }}>{t.count}</span>
						</span>
					))}
				</div>
			</HxRow>

			{/* Users and roles */}
			<HxGL>{ __( 'Users & roles', 'hatch-bridge' ) } · <HxBadge color="neutral">{
				/* translators: %d: number of users. */
				sprintf( _n( '%d user', '%d users', userTotal, 'hatch-bridge' ), userTotal )
			}</HxBadge></HxGL>
			<HxRow
				label={ __( 'Role breakdown', 'hatch-bridge' ) }
				desc={ __( 'Users grouped by their WordPress role.', 'hatch-bridge' ) }
			>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: 460 }}>
					{roles.filter(r => r.count > 0).map(r => (
						<span key={r.slug} style={chipStyle}>
							<strong style={{ color: 'var(--hx-fg)' }}>{r.name}</strong>
							<span style={{ color: 'var(--hx-subtle)' }}>{r.count}</span>
						</span>
					))}
				</div>
			</HxRow>
			<HxRow
				label={ __( 'Authors (with published posts)', 'hatch-bridge' ) }
				desc={authors && authors.total > 0
					? sprintf(
						/* translators: 1: number of authors, 2: number of authors who have a bio. */
						_n( '%1$d author, %2$d with a bio. Bios and avatars appear on the author pages of your frontend.', '%1$d authors, %2$d with a bio. Bios and avatars appear on the author pages of your frontend.', authors.total, 'hatch-bridge' ),
						authors.total,
						authors.with_bio
					)
					: __( 'No authors yet. Anyone who publishes a post will show up here.', 'hatch-bridge' )}
				last
			>
				<div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 460 }}>
					{authors && authors.list.slice(0, 4).map((a) => (
						<a key={a.id} href={a.profile_url} target="_blank" rel="noopener noreferrer" style={{ ...chipStyle, textDecoration: 'none', color: 'var(--hx-fg)' }}
							/* translators: %s: author display name. */
							title={ sprintf( __( 'Edit profile for %s', 'hatch-bridge' ), a.name ) }>
							<strong>{a.name}</strong>
							<span style={{ color: 'var(--hx-subtle)' }}>{a.post_count}</span>
							{!a.has_bio && <HxBadge color="yellow">{ __( 'No bio', 'hatch-bridge' ) }</HxBadge>}
						</a>
					))}
					{authors && authors.total > 4 && (
						<span style={{ ...chipStyle, color: 'var(--hx-subtle)' }}>{
							/* translators: %d: number of authors not shown. */
							sprintf( __( '+%d more', 'hatch-bridge' ), authors.total - 4 )
						}</span>
					)}
					<ManageLink href={(authors && authors.profile_url) || 'profile.php'} label={ __( 'My profile', 'hatch-bridge' ) } />
				</div>
			</HxRow>

			{/* Privacy */}
			<HxGL>{ __( 'Privacy', 'hatch-bridge' ) }</HxGL>
			<HxRow
				label={ __( 'Privacy policy page', 'hatch-bridge' ) }
				desc={privacy.page_id
					/* translators: %s: title of the privacy policy page. */
					? sprintf( __( 'Current page: %s', 'hatch-bridge' ), privacy.page_title )
					: __( 'Choose your privacy policy page in WordPress under Settings, Privacy.', 'hatch-bridge' )}
				last
			>
				<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
					<HxBadge color={privacy.page_id ? 'green' : 'yellow'}>{privacy.page_id ? __( 'Set', 'hatch-bridge' ) : __( 'Not set', 'hatch-bridge' )}</HxBadge>
					<ManageLink href={privacy.admin_url} />
				</div>
			</HxRow>

			{/* Languages */}
			<HxGL>{ __( 'Languages', 'hatch-bridge' ) }</HxGL>
			<HxRow
				label={languages.length > 0 ? __( 'Multilingual site', 'hatch-bridge' ) : __( 'Single-language site', 'hatch-bridge' )}
				desc={languages.length > 0
					/* translators: %s: comma-separated list of language codes. */
					? sprintf( __( 'Languages found: %s.', 'hatch-bridge' ), languages.map(l => l.code).join(', ') )
					: __( 'Hatch lists languages here when Polylang or WPML is installed.', 'hatch-bridge' )}
				last
			>
				<HxBadge color={languages.length > 0 ? 'green' : 'neutral'}>{languages.length > 0
					/* translators: %d: number of languages. */
					? sprintf( _n( '%d language', '%d languages', languages.length, 'hatch-bridge' ), languages.length )
					: __( 'Single', 'hatch-bridge' )}</HxBadge>
			</HxRow>
		</HxCard>
	);
}

export default function Content({ state, onDirty, setSetting }) {
	const snippets = state.snippets || {};
	const content  = state.content  || {};
	const ts       = state.turnstile || {};
	const coreSync = state.coreSync || null;

	const onText = (path) => (e) => { setSetting(path, e.target.value); onDirty(); };

	// Turnstile gating: turning Turnstile on without keys does nothing useful
	// (the frontend widget never renders and the server never verifies). Refuse
	// the flip, scroll to the key inputs, and flash the section so it is obvious
	// where to go next.
	const hasKeys = !!(ts.site_key && ts.secret_key);
	const guardTurnstile = (path) => (v) => {
		if (v && !hasKeys) {
			const el = document.getElementById('hatch-turnstile-keys');
			if (el) {
				el.scrollIntoView({ behavior: 'smooth', block: 'center' });
				el.classList.remove('hatch-flash');
				// force reflow so the animation restarts on repeated clicks
				void el.offsetWidth;
				el.classList.add('hatch-flash');
				const input = el.querySelector('input:not([type="password"])');
				if (input) setTimeout(() => input.focus(), 350);
			}
			return; // do NOT flip the toggle, do NOT mark dirty
		}
		setSetting(path, v);
		onDirty();
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

			{/* WP Core Sync sits at the top: one status view of every
			    WordPress-owned setting Hatch syncs. The comment toggles live
			    inside its Discussion section, next to WordPress's own comment
			    settings. */}
			<CoreSync
				data={coreSync}
				content={content}
				setSetting={setSetting}
				onDirty={onDirty}
				guardTurnstile={guardTurnstile}
			/>

			{/* Third-party keys and services. Google Tag Manager only: GA4,
			    Plausible and Pixel are managed as tags inside the GTM
			    container, so there are no separate fields for them. */}
			<HxCard>
				<HxHead
					iconChildren={<><circle cx="12" cy="12" r="3" /><path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" /></>}
					iconColor="#0d9488"
					title={ __( 'Third-party keys & services', 'hatch-bridge' ) }
					desc={ __( 'Keys that other tabs use. Enter them once here.', 'hatch-bridge' ) }
				/>

				<HxGL>{ __( 'Google Tag Manager (analytics)', 'hatch-bridge' ) }</HxGL>
				<div style={{ paddingTop: 4, paddingBottom: 14, borderBottom: '1px solid var(--hx-border)' }}>
					<HxField label={ __( 'Container ID', 'hatch-bridge' ) } help={ __( 'Added to every page on your frontend. Add GA4, Meta Pixel or any other tag inside your GTM container. Hatch connects to Google Tag Manager only.', 'hatch-bridge' ) }>
					<HxInp
						placeholder="GTM-XXXXXXX"
						mono
						value={snippets.gtm_id || ''}
						onChange={(e) => { setSetting('snippets.gtm_id', e.target.value); onDirty(); }}
						pattern="GTM-[A-Z0-9]+"
						autoComplete="off"
						spellCheck="false"
					/>
					</HxField>
				</div>

				<HxGL>{ __( 'Cloudflare Turnstile (spam protection)', 'hatch-bridge' ) }</HxGL>
				<div id="hatch-turnstile-keys" style={{ padding: 12, margin: '-12px', borderRadius: 10, transition: 'box-shadow .25s var(--hx-ease), background .25s var(--hx-ease)' }}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
						<div className="hx-help" style={{ color: 'var(--hx-subtle)' }}>
							{ __( 'One key pair is shared by every place Turnstile is turned on: frontend comments, the WordPress login and the WordPress comment form.', 'hatch-bridge' ) }
						</div>
						<HxBadge color={hasKeys ? 'green' : 'yellow'}>
							{hasKeys ? __( 'Configured', 'hatch-bridge' ) : __( 'Keys missing', 'hatch-bridge' )}
						</HxBadge>
					</div>
					<div className="hx-grid-cols-2">
						<HxField label={ __( 'Site key', 'hatch-bridge' ) }>
							<HxInp placeholder="0x4AAAA..." mono value={ts.site_key || ''} onChange={onText('turnstile.site_key')} autoComplete="off" />
						</HxField>
						<HxField label={ __( 'Secret key', 'hatch-bridge' ) }>
							<HxInp placeholder="0x4AAAA..." type="password" value={ts.secret_key || ''} onChange={onText('turnstile.secret_key')} autoComplete="off" />
						</HxField>
					</div>
					<div className="hx-help" style={{ color: 'var(--hx-subtle)', marginTop: 8 }}>
						<a href="https://dash.cloudflare.com/?to=/:account/turnstile" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hx-link)' }}>{ __( 'Get keys in the Cloudflare dashboard', 'hatch-bridge' ) } ↗</a>
					</div>
				</div>
			</HxCard>
		</div>
	);
}

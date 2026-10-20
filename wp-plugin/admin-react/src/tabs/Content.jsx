import { createInterpolateElement } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { HxCard, HxHead, HxRow, HxToggle, HxBadge, HxInp, HxGL, HxField, HxIcon, HxSelect, HxTag, HxCode } from '../components.jsx';
import { IC } from '../icons';

// WP Core Sync card.
// Uses the same shared components as Design / Performance / Security:
//   HxCard + HxHead → card chrome
//   HxGL            → section group labels
//   HxRow           → key/value rows (consistent padding, divider, alignment)
//   HxBadge         → status pills
function ManageLink({ href, label }) {
	return (
		<a href={href} target="_blank" rel="noopener noreferrer" className="hx-link hx-help" style={{ fontWeight: 500, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
			{label || __( 'Manage', 'hatch-connect' )}
			<HxIcon size={12} sw={2}>{IC.externalLink}</HxIcon>
		</a>
	);
}
function MenuSelect({ value, options, onChange, ariaLabel }) {
	return (
		<HxSelect value={value || 0} ariaLabel={ariaLabel} onChange={(e) => onChange(Number(e.target.value))} minWidth={200}>
			<option value="0">{ __( 'None', 'hatch-connect' ) }</option>
			{options.map((mn) => (
				<option key={mn.id} value={mn.id}>{mn.name} ({mn.count})</option>
			))}
		</HxSelect>
	);
}
function CoreSync({ data, content, core, setSetting, onDirty, guardTurnstile }) {
	if (!data) return null;
	const { site, permalink, homepage, menus, all_menus, discussion, reading, privacy, post_types, taxonomies, languages, roles, authors } = data;
	const assignedCount = menus.filter(m => m.assigned_id > 0).length;
	const userTotal = roles.reduce((s, r) => s + r.count, 0);

	return (
		<HxCard>
			<HxHead
				iconChildren={IC.refreshCw}
				iconColor="#2563eb"
				title={ __( 'WordPress settings your frontend uses', 'hatch-connect' ) }
				desc={ __( 'The WordPress settings your frontend depends on. Hatch can change some of them here. For the rest, a link opens the WordPress screen where you change them.', 'hatch-connect' ) }
			/>

			{/* Site identity */}
			<HxGL>{ __( 'Site identity', 'hatch-connect' ) }</HxGL>
			<HxRow
				label={site.title || __( 'Untitled site', 'hatch-connect' )}
				desc={[ site.tagline || __( 'No tagline', 'hatch-connect' ), site.url, site.language ].join( ' · ' )}
			>
				<ManageLink href={site.customizer_url} label={ __( 'Customizer', 'hatch-connect' ) } />
			</HxRow>
			<HxRow
				label={ __( 'Logo & Favicon', 'hatch-connect' ) }
				desc={ __( 'Set in the Customizer under Site Identity. Your frontend uses both.', 'hatch-connect' ) }
				last
			>
				<div style={{ display: 'flex', gap: 6 }}>
					<HxBadge color={site.logo_url ? 'green' : 'neutral'}>{site.logo_url ? __( 'Logo set', 'hatch-connect' ) : __( 'No logo', 'hatch-connect' )}</HxBadge>
					<HxBadge color={site.favicon_url ? 'green' : 'neutral'}>{site.favicon_url ? __( 'Favicon set', 'hatch-connect' ) : __( 'No favicon', 'hatch-connect' )}</HxBadge>
				</div>
			</HxRow>

			{/* URL structure */}
			<HxGL>{ __( 'URL structure', 'hatch-connect' ) }</HxGL>
			<HxRow
				label={ __( 'Post URL format', 'hatch-connect' ) }
				desc={permalink.pretty
					? createInterpolateElement(
						/* translators: %s: example post URL path. The <code> tags must stay. */
						sprintf( __( 'Your frontend can find your posts. Post links look like <code>%s</code>.', 'hatch-connect' ), permalink.example ),
						{ code: <HxCode /> }
					)
					: createInterpolateElement(
						__( 'WordPress is using the plain <code>?p=123</code> link format, which the frontend cannot read. Choose any other link format in Settings, Permalinks.', 'hatch-connect' ),
						{ code: <HxCode tone="warning" /> }
					)}
				last
			>
				<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
					<HxBadge color={permalink.pretty ? 'green' : 'yellow'}>{permalink.pretty ? __( 'Readable links', 'hatch-connect' ) : __( 'Needs fixing', 'hatch-connect' )}</HxBadge>
					<ManageLink href={permalink.admin_url} />
				</div>
			</HxRow>

			{/* Homepage and reading */}
			<HxGL>{ __( 'Homepage & reading', 'hatch-connect' ) }</HxGL>
			<HxRow
				label={ __( 'Homepage', 'hatch-connect' ) }
				desc={homepage.mode === 'page'
					/* translators: %s: title of the static homepage. */
					? sprintf( __( 'Showing: %s', 'hatch-connect' ), homepage.static_title || sprintf(
						/* translators: %d: page ID. */
						__( 'Page #%d', 'hatch-connect' ), homepage.static_id ) )
					: sprintf(
						/* translators: %d: number of posts shown per page. */
						_n( 'Latest posts, %d post per page', 'Latest posts, %d posts per page', reading.posts_per_page, 'hatch-connect' ),
						reading.posts_per_page
					)}
			>
				<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
					<HxBadge color={homepage.mode === 'page' ? 'green' : 'neutral'}>{homepage.mode === 'page' ? __( 'Static page', 'hatch-connect' ) : __( 'Latest posts', 'hatch-connect' )}</HxBadge>
					<ManageLink href={homepage.admin_url} />
				</div>
			</HxRow>
			<HxRow
				label={ __( 'Search engine visibility', 'hatch-connect' ) }
				desc={reading.blog_public
					? __( 'WordPress allows search engines to index this site.', 'hatch-connect' )
					: __( 'WordPress is asking search engines to skip this site. That can keep your frontend out of search results too.', 'hatch-connect' )}
				last
			>
				<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
					<HxBadge color={reading.blog_public ? 'green' : 'yellow'}>{reading.blog_public ? __( 'Public', 'hatch-connect' ) : __( 'Discouraged', 'hatch-connect' )}</HxBadge>
					<ManageLink href={reading.admin_url} />
				</div>
			</HxRow>

			{/* Menu locations, with an inline picker */}
			<HxGL badge={<HxBadge color={assignedCount === menus.length && menus.length > 0 ? 'green' : 'yellow'}>{
				/* translators: 1: number of menu locations with a menu assigned, 2: total number of menu locations. */
				sprintf( __( '%1$d/%2$d assigned', 'hatch-connect' ), assignedCount, menus.length || 0 )
			}</HxBadge>}>{ __( 'Menu locations', 'hatch-connect' ) }</HxGL>
			{menus.length === 0 && (
				<HxRow label={ __( 'No locations registered', 'hatch-connect' ) } desc={ __( 'Primary and Footer menu locations appear here once a menu location is registered by your theme or by Hatch.', 'hatch-connect' ) } last />
			)}
			{menus.map((m, i) => (
				<HxRow
					key={m.loc}
					label={m.label}
					desc={m.assigned
						? ( m.count > 0
							/* translators: 1: menu name, 2: number of items in the menu. */
							? sprintf( _n( 'Assigned: %1$s (%2$d item)', 'Assigned: %1$s (%2$d items)', m.count, 'hatch-connect' ), m.assigned, m.count )
							/* translators: %s: menu name. */
							: sprintf( __( 'Assigned: %s', 'hatch-connect' ), m.assigned ) )
						: __( 'Choose a menu from the list.', 'hatch-connect' )}
					last={i === menus.length - 1 && all_menus.length > 0}
				>
					<MenuSelect
						value={m.assigned_id}
						options={all_menus}
						/* translators: %s: menu location name. */
						ariaLabel={ sprintf( __( 'Menu for %s', 'hatch-connect' ), m.label ) }
						onChange={(v) => { setSetting(`core.menu_location.${m.loc}`, v); onDirty(); }}
					/>
				</HxRow>
			))}
			{all_menus.length === 0 && menus.length > 0 && (
				<HxRow
					label={ __( 'No menus exist yet', 'hatch-connect' ) }
					desc={ __( 'Create one under Appearance, Menus in WordPress, then come back here to assign it.', 'hatch-connect' ) }
					last
				>
					<ManageLink href="nav-menus.php" label={ __( 'Create menu', 'hatch-connect' ) } />
				</HxRow>
			)}

			{/* Discussion and comments */}
			<HxGL badge={<HxBadge color={discussion.pending_count > 0 ? 'yellow' : 'neutral'}>{
				/* translators: 1: number of approved comments, 2: number of comments waiting for approval. */
				sprintf( __( '%1$d approved, %2$d pending', 'hatch-connect' ), discussion.approved_count, discussion.pending_count )
			}</HxBadge>}>{ __( 'Discussion', 'hatch-connect' ) }</HxGL>
			<HxRow
				label={ __( 'Show comments on posts', 'hatch-connect' ) }
				desc={ __( 'Shows a comments section below every post on your frontend. Moderation still happens in WordPress.', 'hatch-connect' ) }
			>
				<HxToggle on={!!content.comments_enabled} onChange={(v) => { setSetting('content.comments_enabled', v); onDirty(); }} />
			</HxRow>
			<HxRow
				label={ __( 'Block comment spam', 'hatch-connect' ) }
				desc={ __( 'Runs a Cloudflare Turnstile check before a comment is posted from your frontend. Needs Turnstile keys, which you enter below.', 'hatch-connect' ) }
			>
				<HxToggle on={!!content.comments_turnstile} onChange={guardTurnstile('content.comments_turnstile')} />
			</HxRow>
			<HxRow
				label={ __( 'Close comments on new posts', 'hatch-connect' ) }
				desc={ __( 'New posts start with comments turned off. You can still change it on each post. Existing posts are not changed.', 'hatch-connect' ) }
			>
				<HxToggle
					on={(core.default_comment_status || discussion.default_comment_status) !== 'open'}
					onChange={(v) => { setSetting('core.default_comment_status', v ? 'closed' : 'open'); onDirty(); }}
				/>
			</HxRow>
			<HxRow
				label={ __( 'WordPress comment defaults (read-only)', 'hatch-connect' ) }
				desc={[
					discussion.comment_moderation ? __( 'Every comment waits for approval', 'hatch-connect' ) : __( 'Comments are not held for approval', 'hatch-connect' ),
					discussion.comment_registration ? __( 'Sign-in required to comment', 'hatch-connect' ) : __( 'Visitors can comment without an account', 'hatch-connect' ),
				].join( ' · ' )}
				last
			>
				<ManageLink href={discussion.admin_url} />
			</HxRow>

			{/* Frontend accounts: off until the site owner turns it on. */}
			<HxGL badge={<HxBadge color={content.accounts_enabled ? 'green' : 'neutral'}>{ content.accounts_enabled ? __( 'On', 'hatch-connect' ) : __( 'Off', 'hatch-connect' ) }</HxBadge>}>{ __( 'Accounts', 'hatch-connect' ) }</HxGL>
			<HxRow
				label={ __( 'Frontend accounts', 'hatch-connect' ) }
				desc={ __( 'Lets visitors sign in on your frontend with their WordPress account, for example to see orders or comment under their name. Off means Hatch adds no sign-in route at all.', 'hatch-connect' ) }
			>
				<HxToggle on={!!content.accounts_enabled} onChange={(v) => { setSetting('content.accounts_enabled', v); onDirty(); }} ariaLabel={ __( 'Frontend accounts', 'hatch-connect' ) } />
			</HxRow>
			<HxRow
				label={ __( 'New sign-ups', 'hatch-connect' ) }
				desc={ __( 'Sign-up follows the WordPress "Anyone can register" setting and its default role. Hatch never changes either one.', 'hatch-connect' ) }
				last
			>
				<ManageLink href="options-general.php" />
			</HxRow>

			{/* Content types */}
			<HxGL badge={<HxBadge color="neutral">{post_types.length}</HxBadge>}>{ __( 'Content types', 'hatch-connect' ) }</HxGL>
			<HxRow
				label={ __( 'Content types your frontend can show', 'hatch-connect' ) }
				desc={ __( 'Your frontend can show any of these. Custom post types appear here when their plugin allows it to be shown in REST.', 'hatch-connect' ) }
				last
			>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: 460 }}>
					{post_types.map((p) => (
						<HxTag key={p.slug} count={p.builtin ? p.count : sprintf( __( '%d · custom', 'hatch-connect' ), p.count )}>{p.label}</HxTag>
					))}
				</div>
			</HxRow>

			{/* Taxonomies */}
			<HxGL badge={<HxBadge color="neutral">{taxonomies.length}</HxBadge>}>{ __( 'Taxonomies', 'hatch-connect' ) }</HxGL>
			<HxRow
				label={ __( 'Ways to group content', 'hatch-connect' ) }
				desc={ __( 'Categories, tags and any custom groupings that their plugin allows to be shown in REST.', 'hatch-connect' ) }
				last
			>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: 460 }}>
					{taxonomies.map((t) => (
						<HxTag key={t.slug} count={t.count}>{t.label}</HxTag>
					))}
				</div>
			</HxRow>

			{/* Users and roles */}
			<HxGL badge={<HxBadge color="neutral">{
				/* translators: %d: number of users. */
				sprintf( _n( '%d user', '%d users', userTotal, 'hatch-connect' ), userTotal )
			}</HxBadge>}>{ __( 'Users & roles', 'hatch-connect' ) }</HxGL>
			<HxRow
				label={ __( 'Role breakdown', 'hatch-connect' ) }
				desc={ __( 'Users grouped by their WordPress role.', 'hatch-connect' ) }
			>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: 460 }}>
					{roles.filter(r => r.count > 0).map(r => (
						<HxTag key={r.slug} count={r.count}>{r.name}</HxTag>
					))}
				</div>
			</HxRow>
			<HxRow
				label={ __( 'Authors (with published posts)', 'hatch-connect' ) }
				desc={authors && authors.total > 0
					? sprintf(
						/* translators: 1: number of authors, 2: number of authors who have a bio. */
						_n( '%1$d author, %2$d with a bio. Bios and avatars appear on the author pages of your frontend.', '%1$d authors, %2$d with a bio. Bios and avatars appear on the author pages of your frontend.', authors.total, 'hatch-connect' ),
						authors.total,
						authors.with_bio
					)
					: __( 'No authors yet. Anyone who publishes a post will show up here.', 'hatch-connect' )}
				last
			>
				<div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 460 }}>
					{authors && authors.list.slice(0, 4).map((a) => (
						<HxTag
							key={a.id}
							href={a.profile_url}
							count={a.post_count}
							/* translators: %s: author display name. */
							title={ sprintf( __( 'Edit profile for %s', 'hatch-connect' ), a.name ) }
						>
							{a.name}
							{!a.has_bio && <> <HxBadge color="yellow">{ __( 'No bio', 'hatch-connect' ) }</HxBadge></>}
						</HxTag>
					))}
					{authors && authors.total > 4 && (
						<HxTag>{
							/* translators: %d: number of authors not shown. */
							sprintf( __( '+%d more', 'hatch-connect' ), authors.total - 4 )
						}</HxTag>
					)}
					<ManageLink href={(authors && authors.profile_url) || 'profile.php'} label={ __( 'My profile', 'hatch-connect' ) } />
				</div>
			</HxRow>

			{/* Privacy */}
			<HxGL>{ __( 'Privacy', 'hatch-connect' ) }</HxGL>
			<HxRow
				label={ __( 'Privacy policy page', 'hatch-connect' ) }
				desc={privacy.page_id
					/* translators: %s: title of the privacy policy page. */
					? sprintf( __( 'Current page: %s', 'hatch-connect' ), privacy.page_title || __( 'Untitled page', 'hatch-connect' ) )
					: __( 'Choose your privacy policy page in WordPress under Settings, Privacy.', 'hatch-connect' )}
				last
			>
				<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
					<HxBadge color={privacy.page_id ? 'green' : 'yellow'}>{privacy.page_id ? __( 'Set', 'hatch-connect' ) : __( 'Not set', 'hatch-connect' )}</HxBadge>
					<ManageLink href={privacy.admin_url} />
				</div>
			</HxRow>

			{/* Languages */}
			<HxGL>{ __( 'Languages', 'hatch-connect' ) }</HxGL>
			<HxRow
				label={languages.length > 0 ? __( 'Multilingual site', 'hatch-connect' ) : __( 'Single-language site', 'hatch-connect' )}
				desc={languages.length > 0
					/* translators: %s: comma-separated list of language codes. */
					? sprintf( __( 'Languages found: %s.', 'hatch-connect' ), languages.map(l => l.code).join(', ') )
					: __( 'Hatch lists languages here when Polylang or WPML is installed.', 'hatch-connect' )}
				last
			>
				<HxBadge color={languages.length > 0 ? 'green' : 'neutral'}>{languages.length > 0
					/* translators: %d: number of languages. */
					? sprintf( _n( '%d language', '%d languages', languages.length, 'hatch-connect' ), languages.length )
					: __( 'Single', 'hatch-connect' )}</HxBadge>
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
				core={state.core || {}}
				setSetting={setSetting}
				onDirty={onDirty}
				guardTurnstile={guardTurnstile}
			/>

			{/* Third-party keys and services. Google Tag Manager only: GA4,
			    Plausible and Pixel are managed as tags inside the GTM
			    container, so there are no separate fields for them. */}
			<HxCard>
				<HxHead
					iconChildren={IC.keyRound}
					iconColor="#0d9488"
					title={ __( 'Third-party keys & services', 'hatch-connect' ) }
					desc={ __( 'Keys that other tabs use. Enter them once here.', 'hatch-connect' ) }
				/>

				<HxGL>{ __( 'Google Tag Manager (analytics)', 'hatch-connect' ) }</HxGL>
				<div style={{ paddingTop: 4, paddingBottom: 14, borderBottom: '1px solid var(--hx-border)' }}>
					<HxField label={ __( 'Container ID', 'hatch-connect' ) } help={ __( 'Added to every page on your frontend. Put Google Analytics, Meta Pixel or any other tag inside your Tag Manager container. Hatch connects to Google Tag Manager only.', 'hatch-connect' ) }>
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

				<HxGL>{ __( 'Cloudflare Turnstile (spam protection)', 'hatch-connect' ) }</HxGL>
				<div id="hatch-turnstile-keys" style={{ padding: '12px 0', borderRadius: 10, transition: 'box-shadow .2s var(--hx-ease), background .2s var(--hx-ease)' }}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
						<div className="hx-help" style={{ color: 'var(--hx-subtle)' }}>
							{ __( 'One pair of keys covers every place Turnstile is turned on: frontend comments, the WordPress sign-in page and the WordPress comment form.', 'hatch-connect' ) }
						</div>
						<HxBadge color={hasKeys ? 'green' : 'yellow'}>
							{hasKeys ? __( 'Configured', 'hatch-connect' ) : __( 'Keys missing', 'hatch-connect' )}
						</HxBadge>
					</div>
					<div className="hx-grid-cols-2">
						<HxField label={ __( 'Site key', 'hatch-connect' ) }>
							<HxInp placeholder="0x4AAAA..." mono value={ts.site_key || ''} onChange={onText('turnstile.site_key')} autoComplete="off" />
						</HxField>
						<HxField label={ __( 'Secret key', 'hatch-connect' ) }>
							<HxInp placeholder="0x4AAAA..." type="password" value={ts.secret_key || ''} onChange={onText('turnstile.secret_key')} autoComplete="off" />
						</HxField>
					</div>
					<div className="hx-help" style={{ color: 'var(--hx-subtle)', marginTop: 8 }}>
						<a href="https://dash.cloudflare.com/?to=/:account/turnstile" target="_blank" rel="noopener noreferrer" className="hx-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{ __( 'Get your keys in Cloudflare', 'hatch-connect' ) }<HxIcon size={12} sw={2}>{IC.externalLink}</HxIcon></a>
					</div>
				</div>
			</HxCard>
		</div>
	);
}

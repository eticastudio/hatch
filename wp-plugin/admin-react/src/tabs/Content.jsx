import { HxCard, HxHead, HxRow, HxToggle, HxBadge, HxInp, HxIcon, HxGL, ibg } from '../components.jsx';

// v0.50.31 — WP Core Sync card.
// Uses the SAME global components as Design / Performance / Security:
//   HxCard + HxHead → card chrome
//   HxGL            → section group labels
//   HxRow           → key/value rows (consistent padding, divider, alignment)
//   HxBadge         → status pills
// No bespoke <div style={...}> grids — visual consistency across tabs.
function ManageLink({ href, label = 'Manage' }) {
	return (
		<a href={href} target="_blank" rel="noopener noreferrer"
			className="hx-help"
			style={{ fontWeight: 500, color: 'var(--hx-primary)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
			{label} →
		</a>
	);
}
function MenuSelect({ value, options, onChange }) {
	return (
		<select
			value={value || 0}
			onChange={(e) => onChange(Number(e.target.value))}
			style={{
				fontSize: 13, padding: '6px 10px',
				border: '1px solid var(--hx-border)', borderRadius: 8,
				background: 'var(--hx-bg)', color: 'var(--hx-fg)',
				fontFamily: 'inherit', minWidth: 200,
			}}
		>
			<option value="0">— None —</option>
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

	return (
		<HxCard>
			<HxHead
				iconChildren={<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>}
				iconColor="#3b82f6"
				title="WordPress Core Sync"
				desc="Single status view of every WP-owned setting Hatch syncs to the headless frontend. Inline controls where Hatch can edit; deep-links where WordPress owns the canonical UI."
			/>

			{/* ─── SITE IDENTITY ──────────────────────────────────── */}
			<HxGL>Site identity</HxGL>
			<HxRow
				label={site.title || '—'}
				desc={`${site.tagline || 'No tagline'} · ${site.url} · ${site.language}`}
			>
				<ManageLink href={site.customizer_url} label="Customizer" />
			</HxRow>
			<HxRow
				label="Logo & Favicon"
				desc="Set in Customizer → Site Identity. Hatch frontend reads both."
				last
			>
				<div style={{ display: 'flex', gap: 6 }}>
					<HxBadge color={site.logo_url ? 'green' : 'neutral'}>{site.logo_url ? 'Logo ✓' : 'No logo'}</HxBadge>
					<HxBadge color={site.favicon_url ? 'green' : 'neutral'}>{site.favicon_url ? 'Favicon ✓' : 'No favicon'}</HxBadge>
				</div>
			</HxRow>

			{/* ─── URL STRUCTURE ──────────────────────────────────── */}
			<HxGL>URL structure</HxGL>
			<HxRow
				label="Post URL format"
				desc={permalink.pretty
					? <>Frontend routing works. Posts will live at <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5, padding: '2px 6px', background: 'var(--hx-surface)', borderRadius: 4, color: 'var(--hx-fg)' }}>{permalink.example}</code></>
					: <>WordPress is using the default <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5, padding: '2px 6px', background: 'var(--hx-surface)', borderRadius: 4, color: 'var(--hx-warning)' }}>?p=123</code> format. This breaks Hatch's frontend routing — switch to any structured format.</>}
				last
			>
				<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
					<HxBadge color={permalink.pretty ? 'green' : 'yellow'}>{permalink.pretty ? 'Clean URLs ✓' : 'Needs fixing'}</HxBadge>
					<ManageLink href={permalink.admin_url} />
				</div>
			</HxRow>

			{/* ─── HOMEPAGE & READING ──────────────────────────────────── */}
			<HxGL>Homepage & reading</HxGL>
			<HxRow
				label="Homepage"
				desc={homepage.mode === 'page' ? `Showing: ${homepage.static_title || `Page #${homepage.static_id}`}` : `Latest posts feed · ${reading.posts_per_page} posts per page`}
			>
				<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
					<HxBadge color={homepage.mode === 'page' ? 'green' : 'neutral'}>{homepage.mode === 'page' ? 'Static page' : 'Latest posts'}</HxBadge>
					<ManageLink href={homepage.admin_url} />
				</div>
			</HxRow>
			<HxRow
				label="Search engines visibility"
				desc={reading.blog_public ? 'Site is crawlable by search engines.' : 'WP is asking crawlers to skip this site. Headless or not, this hides you from Google.'}
				last
			>
				<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
					<HxBadge color={reading.blog_public ? 'green' : 'yellow'}>{reading.blog_public ? 'Public ✓' : 'Discouraged'}</HxBadge>
					<ManageLink href={reading.admin_url} />
				</div>
			</HxRow>

			{/* ─── MENU LOCATIONS (with inline picker) ──────────────────────────────────── */}
			<HxGL>
				Menu locations · <HxBadge color={assignedCount === menus.length && menus.length > 0 ? 'green' : 'yellow'}>{assignedCount}/{menus.length || 0} assigned</HxBadge>
			</HxGL>
			{menus.length === 0 && (
				<HxRow label="No locations registered" desc="Activate Hatch's companion theme to expose Primary + Footer + Mobile menu locations." last />
			)}
			{menus.map((m, i) => (
				<HxRow
					key={m.loc}
					label={m.label}
					desc={m.assigned ? `Assigned: ${m.assigned}${m.count > 0 ? ` (${m.count} items)` : ''}` : 'Pick a WP menu from the dropdown →'}
					last={i === menus.length - 1 && all_menus.length > 0}
				>
					<MenuSelect
						value={m.assigned_id}
						options={all_menus}
						onChange={(v) => { setSetting(`core.menu_location.${m.loc}`, v); onDirty(); }}
					/>
				</HxRow>
			))}
			{all_menus.length === 0 && menus.length > 0 && (
				<HxRow
					label="No WP menus exist yet"
					desc="Create one in WP Appearance → Menus, then come back here to assign it."
					last
				>
					<ManageLink href="/wp-admin/nav-menus.php" label="Create menu" />
				</HxRow>
			)}

			{/* ─── DISCUSSION / COMMENTS ──────────────────────────────────── */}
			<HxGL>
				Discussion · <HxBadge color={discussion.pending_count > 0 ? 'yellow' : 'neutral'}>{discussion.approved_count} approved · {discussion.pending_count} pending</HxBadge>
			</HxGL>
			<HxRow
				label="Show comments on posts"
				desc="Renders a comments section below every post on your Astro frontend. Moderation still runs through WordPress."
			>
				<HxToggle on={!!content.comments_enabled} onChange={(v) => { setSetting('content.comments_enabled', v); onDirty(); }} />
			</HxRow>
			<HxRow
				label="Block comment spam"
				desc="Invisible Turnstile challenge before any comment posts. Stops 99% of spam without bothering humans."
			>
				<HxToggle on={!!content.comments_turnstile} onChange={guardTurnstile('content.comments_turnstile')} />
			</HxRow>
			<HxRow
				label="Close comments on new posts"
				desc="New posts start with comments off. Per-post override still works. Existing posts unchanged."
			>
				<HxToggle
					on={discussion.default_comment_status !== 'open'}
					onChange={(v) => { setSetting('core.default_comment_status', v ? 'closed' : 'open'); onDirty(); }}
				/>
			</HxRow>
			<HxRow
				label="WP comment defaults (read-only)"
				desc={`${discussion.comment_moderation ? 'Manual moderation enabled' : 'Auto-approve after first comment'} · ${discussion.comment_registration ? 'login required' : 'anonymous comments OK'}`}
				last
			>
				<ManageLink href={discussion.admin_url} />
			</HxRow>

			{/* ─── CONTENT TYPES ──────────────────────────────────── */}
			<HxGL>Content types · <HxBadge color="neutral">{post_types.length}</HxBadge></HxGL>
			<HxRow
				label="Public post types exposed via REST"
				desc="Headless frontend can fetch + render any of these. CPTs hook in automatically via show_in_rest=true."
				last
			>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', maxWidth: 460 }}>
					{post_types.map((p) => (
						<span key={p.slug} style={chipStyle}>
							<strong style={{ color: 'var(--hx-fg)' }}>{p.label}</strong>
							<span style={{ color: 'var(--hx-subtle)' }}>{p.count}{!p.builtin && ' · CPT'}</span>
						</span>
					))}
				</div>
			</HxRow>

			{/* ─── TAXONOMIES ──────────────────────────────────── */}
			<HxGL>Taxonomies · <HxBadge color="neutral">{taxonomies.length}</HxBadge></HxGL>
			<HxRow
				label="Public taxonomies"
				desc="Categories, tags, and any custom taxonomies registered with show_in_rest."
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

			{/* ─── USERS & ROLES ──────────────────────────────────── */}
			<HxGL>Users & roles · <HxBadge color="neutral">{roles.reduce((s, r) => s + r.count, 0)} users</HxBadge></HxGL>
			<HxRow
				label="Role breakdown"
				desc="Hatch maps WP roles 1:1 — they drive author archives, membership gating, and admin capabilities on the frontend."
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
				label="Authors (with published posts)"
				desc={authors && authors.total > 0
					? `${authors.total} author${authors.total === 1 ? '' : 's'} active · ${authors.with_bio}/${authors.total} have a bio set. Bios + avatars sync to /blog/author/<slug> pages on the Astro frontend.`
					: 'No published authors yet. The first user to publish a post becomes an author archive automatically.'}
				last
			>
				<div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 460 }}>
					{authors && authors.list.slice(0, 4).map((a) => (
						<a key={a.id} href={a.profile_url} target="_blank" rel="noopener noreferrer" style={{ ...chipStyle, textDecoration: 'none', color: 'var(--hx-fg)' }} title={`Edit ${a.name}'s profile`}>
							<strong>{a.name}</strong>
							<span style={{ color: 'var(--hx-subtle)' }}>{a.post_count}</span>
							{!a.has_bio && <HxBadge color="yellow">no bio</HxBadge>}
						</a>
					))}
					{authors && authors.total > 4 && (
						<span style={{ ...chipStyle, color: 'var(--hx-subtle)' }}>+{authors.total - 4} more</span>
					)}
					<ManageLink href={(authors && authors.profile_url) || '/wp-admin/profile.php'} label="My profile" />
				</div>
			</HxRow>

			{/* ─── PRIVACY ──────────────────────────────────── */}
			<HxGL>Privacy</HxGL>
			<HxRow
				label="Privacy policy page"
				desc={privacy.page_id ? `Currently set: ${privacy.page_title}` : 'Required for GDPR. Set in WP Settings → Privacy.'}
				last
			>
				<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
					<HxBadge color={privacy.page_id ? 'green' : 'yellow'}>{privacy.page_id ? 'Set ✓' : 'Not set'}</HxBadge>
					<ManageLink href={privacy.admin_url} />
				</div>
			</HxRow>

			{/* ─── LANGUAGES ──────────────────────────────────── */}
			<HxGL>Languages</HxGL>
			<HxRow
				label={languages.length > 0 ? 'Multilingual site' : 'Single-language site'}
				desc={languages.length > 0
					? `Locales: ${languages.map(l => l.code).join(', ')}. Hatch auto-bridges to the active multilingual plugin.`
					: 'Install Polylang or WPML to enable multilingual; Hatch auto-detects.'}
				last
			>
				<HxBadge color={languages.length > 0 ? 'green' : 'neutral'}>{languages.length > 0 ? `${languages.length} locales` : 'Single'}</HxBadge>
			</HxRow>
		</HxCard>
	);
}

export default function Content({ state, onDirty, setSetting }) {
	const snippets = state.snippets || {};
	const content  = state.content  || {};
	const menus    = state.menus    || [];
	const forms    = state.forms    || { detected: false, plugin: null, count: 0 };
	const plugins  = state.pluginBridge || [];
	const ts       = state.turnstile || {};
	const coreSync = state.coreSync || null;

	const onToggle = (path) => (v) => { setSetting(path, v); onDirty(); };
	const onText   = (path) => (e) => { setSetting(path, e.target.value); onDirty(); };

	// Turnstile gating — a user toggling Turnstile ON without keys is meaningless
	// (the frontend widget never renders, the server side never verifies). Instead
	// of letting the save succeed and break silently, refuse the flip, scroll to
	// the key inputs, and flash the section so it's obvious where to go next.
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

	// Plugin Bridge — capability-based. Each entry is a frontend feature; Hatch
	// auto-detects which WordPress plugin is providing it. Server overrides via
	// `state.pluginBridge`. Forms / SEO / Sitemap live here (not as their own
	// Hatch routes) because the established WP plugins already do these well
	// — Hatch's job is to surface them, not duplicate them.
	const featureBridges = plugins.length > 0 ? plugins : [
		{ feature: 'Forms',           providers: ['Fluent Forms', 'Gravity Forms', 'WPForms', 'Contact Form 7'],  detected: false, providerName: null, d: 'Form rendering + submissions handled by the form plugin itself; Hatch just relays the embed shortcode.' },
		{ feature: 'SEO + Sitemap',   providers: ['RankMath', 'Yoast SEO', 'AIOSEO'],                              detected: false, providerName: null, d: 'sitemap.xml, rss.xml, robots.txt, and JSON-LD schema all sourced from your SEO plugin.' },
		{ feature: 'Redirects',       providers: ['RankMath', 'Yoast Premium', 'Redirection'],                     detected: false, providerName: null, d: 'Redirect rules pulled live so the Astro middleware honors them.' },
		{ feature: 'eCommerce',       providers: ['WooCommerce', 'Easy Digital Downloads', 'WP EasyCart'],         detected: false, providerName: null, d: 'Products, cart, and checkout on the frontend.' },
		{ feature: 'Custom Fields',   providers: ['ACF', 'Meta Box', 'Pods', 'JetEngine'],                         detected: false, providerName: null, d: 'Custom field values exposed in REST + post meta.' },
		{ feature: 'Email Newsletter',providers: ['FluentCRM', 'Mailchimp for WP', 'Newsletter', 'MailPoet'],      detected: false, providerName: null, d: 'Opt-in forms and subscriber lists bridged to the frontend.' },
		{ feature: 'Memberships',     providers: ['MemberPress', 'Paid Memberships Pro', 'Restrict Content Pro'],  detected: false, providerName: null, d: 'Gated content, member-only routes, paid tiers.' },
		{ feature: 'Code Snippets',   providers: ['WPCode', 'Code Snippets', 'Advanced Scripts'],                  detected: false, providerName: null, d: 'Inject your snippets globally without editing theme files.' },
		{ feature: 'Data Tables',     providers: ['TablePress', 'wpDataTables', 'Posts Table Pro'],                detected: false, providerName: null, d: 'Responsive tables rendered as frontend components.' },
	];

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

			{/* v0.50.31 — WP Core Sync sits at the top — single status view
			    of every WP-owned setting Hatch syncs (site identity, perms,
			    homepage, menus w/ inline picker, comments toggles, post
			    types, taxonomies, roles, privacy, languages). Comments now
			    live INSIDE this card (was a separate card above). */}
			<CoreSync
				data={coreSync}
				content={content}
				setSetting={setSetting}
				onDirty={onDirty}
				guardTurnstile={guardTurnstile}
				hasTurnstileKeys={hasKeys}
			/>

			{/* v0.50.31 — Standalone Comments card REMOVED. Toggles moved
			    INSIDE the Core Sync card (Discussion section) where they
			    sit alongside WP's native comment settings → one mental
			    model instead of split UI. */}


			{/* Plugin Bridge — capability-based */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<path d="M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5zM16 8L2 22M17.5 15H9" />
					</>}
					iconColor="#8b5cf6"
					title="Plugin Bridge"
					desc="Frontend capabilities Hatch can wire up. Each one auto-detects whichever WordPress plugin is installed and bridges its data to your headless site."
				/>
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
					{featureBridges.map((b) => {
						const detected = !!b.detected;
						// Tolerate the legacy PHP shape ({n, d, detected}) by deriving
						// a feature category from the plugin name when needed.
						const LEGACY_CATEGORY = {
							WooCommerce: 'eCommerce',
							ACF:         'Custom Fields',
							FluentCRM:   'Email Newsletter',
							MemberPress: 'Memberships',
							WPCode:      'Code Snippets',
							TablePress:  'Data Tables',
						};
						const name = b.feature || LEGACY_CATEGORY[b.n] || b.n || 'Capability';
						const providers = b.providers && b.providers.length ? b.providers : (b.n ? [b.n] : []);
						return (
							<div
								key={name}
								style={{
									border: '1px solid var(--hx-border)',
									borderRadius: 10,
									padding: '12px 14px',
									background: detected ? ibg('#8b5cf6') : 'var(--hx-surface)',
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
									<span className="hx-desc" style={{ fontWeight: 600, color: 'var(--hx-fg)' }}>{name}</span>
									<span title={detected ? '' : `Supported plugins:\n• ${providers.join('\n• ')}`} style={{ cursor: detected ? 'default' : 'help' }}>
                                        <HxBadge color={detected ? 'green' : 'neutral'}>
                                            {detected ? `Detected · ${b.providerName || b.n || ''}`.replace(/ · $/, '') : 'Not detected'}
                                        </HxBadge>
                                    </span>
								</div>
								<div className="hx-help" style={{ color: 'var(--hx-subtle)', lineHeight: 1.5, marginBottom: 6 }}>{b.d}</div>
								{providers.length > 0 && (
									<div className="hx-help" style={{ color: 'var(--hx-subtle)' }}>
										Supports: <span style={{ color: 'var(--hx-muted)' }}>{providers.join(', ')}</span>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</HxCard>


			{/* v0.50.31 — Third-party keys & services. Two integrations, that's
			    it. We intentionally do NOT ship direct GA4 / Plausible / Pixel
			    fields — managing those inside GTM is the right pattern (one
			    container, all tags). User explicitly asked for GTM only. */}
			<HxCard>
				<HxHead
					iconChildren={<><circle cx="12" cy="12" r="3" /><path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" /></>}
					iconColor="#0d9488"
					title="Third-party keys & services"
					desc="Keys that other tabs consume. Saved once here, used everywhere."
				/>

				<HxGL>Google Tag Manager (analytics)</HxGL>
				<div style={{ paddingTop: 4, paddingBottom: 14, borderBottom: '1px solid var(--hx-border)' }}>
					<div className="hx-help" style={{ fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Container ID</div>
					<HxInp
						placeholder="GTM-XXXXXXX"
						mono
						value={snippets.gtm_id || ''}
						onChange={(e) => { setSetting('snippets.gtm_id', e.target.value); onDirty(); }}
						pattern="GTM-[A-Z0-9]+"
						autoComplete="off"
						spellCheck="false"
					/>
					<div className="hx-help" style={{ color: 'var(--hx-subtle)', marginTop: 6 }}>
						Auto-injected into every frontend page (head + body noscript). Add GA4, Pixel, Plausible, or any other tag inside your GTM container — Hatch ships only GTM by design.
					</div>
				</div>

				<HxGL>Cloudflare Turnstile (spam protection)</HxGL>
				<div id="hatch-turnstile-keys" style={{ paddingTop: 4, padding: 12, margin: '-12px', borderRadius: 10, transition: 'box-shadow .25s var(--hx-ease), background .25s var(--hx-ease)' }}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
						<div className="hx-help" style={{ color: 'var(--hx-subtle)' }}>
							One key pair, used wherever spam protection is enabled (comments today; form submissions / login when those surfaces opt in).
						</div>
						<HxBadge color={(ts.site_key && ts.secret_key) ? 'green' : 'yellow'}>
							{(ts.site_key && ts.secret_key) ? 'Configured' : 'Keys missing'}
						</HxBadge>
					</div>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
						<div>
							<div className="hx-help" style={{ fontWeight: 600, color: 'var(--hx-subtle)', marginBottom: 6 }}>Site key</div>
							<HxInp placeholder="0x4AAAA..." mono value={ts.site_key || ''} onChange={onText('turnstile.site_key')} autoComplete="off" />
						</div>
						<div>
							<div className="hx-help" style={{ fontWeight: 600, color: 'var(--hx-subtle)', marginBottom: 6 }}>Secret key</div>
							<HxInp placeholder="0x4AAAA..." type="password" value={ts.secret_key || ''} onChange={onText('turnstile.secret_key')} autoComplete="off" />
						</div>
					</div>
					<div className="hx-help" style={{ color: 'var(--hx-subtle)', marginTop: 8 }}>
						Get keys free from <a href="https://dash.cloudflare.com/?to=/:account/turnstile" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hx-primary)' }}>Cloudflare dashboard ↗</a>.
					</div>
				</div>
			</HxCard>
		</div>
	);
}

import { HxCard, HxHead, HxRow, HxToggle, HxBadge, HxInp, HxIcon, HxGL, ibg } from '../components.jsx';

export default function Content({ state, onDirty, setSetting }) {
	const snippets = state.snippets || {};
	const content  = state.content  || {};
	const menus    = state.menus    || [];
	const forms    = state.forms    || { detected: false, plugin: null, count: 0 };
	const plugins  = state.pluginBridge || [];
	const ts       = state.turnstile || {};

	const onToggle = (path) => (v) => { setSetting(path, v); onDirty(); };
	const onText   = (path) => (e) => { setSetting(path, e.target.value); onDirty(); };

	// Plugin Bridge — capability-based. Each entry is a frontend feature; Hatch
	// auto-detects which WordPress plugin (if any) is providing it. Server can
	// override via `state.pluginBridge` (each item: {feature, providers[], detected, providerName}).
	const featureBridges = plugins.length > 0 ? plugins : [
		{ feature: 'eCommerce',       providers: ['WooCommerce', 'Easy Digital Downloads', 'WP EasyCart'],     detected: false, providerName: null, d: 'Products, cart, and checkout on the frontend.' },
		{ feature: 'Custom Fields',   providers: ['ACF', 'Meta Box', 'Pods', 'JetEngine'],                      detected: false, providerName: null, d: 'Custom field values exposed in REST + post meta.' },
		{ feature: 'Email Newsletter',providers: ['FluentCRM', 'Mailchimp for WP', 'Newsletter', 'MailPoet'],   detected: false, providerName: null, d: 'Opt-in forms and subscriber lists bridged to the frontend.' },
		{ feature: 'Memberships',     providers: ['MemberPress', 'Paid Memberships Pro', 'Restrict Content Pro'], detected: false, providerName: null, d: 'Gated content, member-only routes, paid tiers.' },
		{ feature: 'Code Snippets',   providers: ['WPCode', 'Code Snippets', 'Advanced Scripts'],               detected: false, providerName: null, d: 'Inject your snippets globally without editing theme files.' },
		{ feature: 'Data Tables',     providers: ['TablePress', 'wpDataTables', 'Posts Table Pro'],             detected: false, providerName: null, d: 'Responsive tables rendered as frontend components.' },
	];

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

			{/* Core integrations — merged: Comments, Forms, Redirects, Sitemap/RSS/robots */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
						<polyline points="3.27 6.96 12 12.01 20.73 6.96" />
						<line x1="12" y1="22.08" x2="12" y2="12" />
					</>}
					iconColor="#0d9488"
					title="Core integrations"
					desc="WordPress core capabilities Hatch bridges to your headless frontend. Each toggle wires its REST endpoint and registers the frontend route."
				/>

				{/* Comments */}
				<HxGL>Comments</HxGL>
				<HxRow label="Enable headless comments" desc="Server-rendered on first load, progressively enhanced via /hatch/v1/comments.">
					<HxToggle on={!!content.comments_enabled} onChange={onToggle('content.comments_enabled')} />
				</HxRow>
				<HxRow label="Turnstile on comment submissions" desc="Cloudflare Turnstile bot check before a comment posts." last>
					<HxToggle on={!!content.comments_turnstile} onChange={onToggle('content.comments_turnstile')} />
				</HxRow>

				{/* Forms */}
				<HxGL>Forms</HxGL>
				<div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0 10px' }}>
					{forms.detected ? (
						<>
							<HxIcon size={14} color="#16a34a" sw={2.5}>
								<polyline points="20 6 9 17 4 12" />
							</HxIcon>
							<span style={{ fontSize: 12, color: 'var(--hx-muted)' }}>
								{forms.plugin} detected, {forms.count} form{forms.count === 1 ? '' : 's'} available.
							</span>
						</>
					) : (
						<span style={{ fontSize: 12, color: 'var(--hx-subtle)' }}>
							No form plugin detected. Install Fluent Forms, Gravity Forms, WPForms, or CF7 to enable.
						</span>
					)}
				</div>
				<HxRow label="Enable form bridge" desc="Exposes forms via /hatch/v1/forms. Submissions POST back to WordPress.">
					<HxToggle on={!!content.forms_enabled} onChange={onToggle('content.forms_enabled')} />
				</HxRow>
				<HxRow label="Turnstile on form submissions" desc="Bot check applied to every bridged form before it submits." last>
					<HxToggle on={!!content.forms_turnstile} onChange={onToggle('content.forms_turnstile')} />
				</HxRow>

				{/* When either Comments or Forms Turnstile is on, just show a one-line
				    pointer. Actual keys live in the Third-party services card below. */}
				{(content.comments_turnstile || content.forms_turnstile) && (
					<div style={{ paddingTop: 10, marginTop: 4, borderTop: '1px solid var(--hx-border)', fontSize: 12, color: 'var(--hx-subtle)', lineHeight: 1.55 }}>
						{(ts.site_key && ts.secret_key)
							? <>Turnstile keys are configured below. <span style={{ color: 'var(--hx-success)' }}>✓</span></>
							: <>Add your Cloudflare Turnstile keys below in <strong style={{ color: 'var(--hx-fg)', fontWeight: 600 }}>Third-party services</strong> to activate the bot check.</>
						}
					</div>
				)}

				{/* Redirects */}
				<HxGL>Redirects</HxGL>
				<HxRow
					label="Enable redirect bridge"
					desc="Pulls redirect rules from RankMath, Yoast, or the Redirection plugin. Applied at the Astro middleware layer."
					last
				>
					<HxToggle on={!!content.redirects_enabled} onChange={onToggle('content.redirects_enabled')} />
				</HxRow>

				{/* Sitemap & Feeds */}
				<HxGL>Sitemap, feeds, robots</HxGL>
				<HxRow label="XML sitemap (sitemap-index.xml)" desc="SSR sitemap with all published posts, pages, and custom post types.">
					<HxToggle on={!!content.sitemap_enabled} onChange={onToggle('content.sitemap_enabled')} />
				</HxRow>
				<HxRow label="RSS feed (rss.xml)" desc="Full-content RSS feed generated from WordPress posts.">
					<HxToggle on={!!content.rss_enabled} onChange={onToggle('content.rss_enabled')} />
				</HxRow>
				<HxRow label="robots.txt from SEO plugin" desc="Source robots.txt from RankMath or Yoast SEO." last>
					<HxToggle on={!!content.robots_from_seo} onChange={onToggle('content.robots_from_seo')} />
				</HxRow>
			</HxCard>


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
									<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--hx-fg)' }}>{name}</span>
									<span title={detected ? '' : `Supported plugins:\n• ${providers.join('\n• ')}`} style={{ cursor: detected ? 'default' : 'help' }}>
                                        <HxBadge color={detected ? 'green' : 'neutral'}>
                                            {detected ? `Detected · ${b.providerName || b.n || ''}`.replace(/ · $/, '') : 'Not detected'}
                                        </HxBadge>
                                    </span>
								</div>
								<div style={{ fontSize: 12, color: 'var(--hx-subtle)', lineHeight: 1.5, marginBottom: 6 }}>{b.d}</div>
								{providers.length > 0 && (
									<div style={{ fontSize: 11, color: 'var(--hx-subtle)' }}>
										Supports: <span style={{ color: 'var(--hx-muted)' }}>{providers.join(', ')}</span>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</HxCard>


			{/* Third-party services — single home for any key Hatch features consume. */}
			<HxCard>
				<HxHead
					iconChildren={<><circle cx="12" cy="12" r="3" /><path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" /></>}
					iconColor="#0d9488"
					title="Third-party services"
					desc="One place for the keys other tabs and the WP admin consume. Saved once here, used everywhere."
				/>

				<HxGL>Google Tag Manager</HxGL>
				<div style={{ paddingTop: 4, paddingBottom: 14, borderBottom: '1px solid var(--hx-border)' }}>
					<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Container ID</div>
					<HxInp
						placeholder="GTM-XXXXXXX"
						mono
						value={snippets.gtm_id || ''}
						onChange={(e) => { setSetting('snippets.gtm_id', e.target.value); onDirty(); }}
						pattern="GTM-[A-Z0-9]+"
						autoComplete="off"
						spellCheck="false"
					/>
					<div style={{ fontSize: 11, color: 'var(--hx-subtle)', marginTop: 6 }}>
						Auto-injected into every frontend page (head + body noscript). Manage every other tag from inside GTM. Leave blank to disable.
					</div>
				</div>

				<HxGL>Cloudflare Turnstile</HxGL>
				<div style={{ paddingTop: 4 }}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
						<div style={{ fontSize: 12, color: 'var(--hx-subtle)' }}>
							One key pair, used by Comments / Forms / any future surface.
						</div>
						<HxBadge color={(ts.site_key && ts.secret_key) ? 'green' : 'yellow'}>
							{(ts.site_key && ts.secret_key) ? 'Configured' : 'Keys missing'}
						</HxBadge>
					</div>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
						<div>
							<div style={{ fontSize: 11, fontWeight: 600, color: 'var(--hx-subtle)', marginBottom: 6 }}>Site key</div>
							<HxInp placeholder="0x4AAAA..." mono value={ts.site_key || ''} onChange={onText('turnstile.site_key')} autoComplete="off" />
						</div>
						<div>
							<div style={{ fontSize: 11, fontWeight: 600, color: 'var(--hx-subtle)', marginBottom: 6 }}>Secret key</div>
							<HxInp placeholder="0x4AAAA..." type="password" value={ts.secret_key || ''} onChange={onText('turnstile.secret_key')} autoComplete="off" />
						</div>
					</div>
					<div style={{ fontSize: 11, color: 'var(--hx-subtle)', marginTop: 8 }}>
						Get keys free from <a href="https://dash.cloudflare.com/?to=/:account/turnstile" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hx-primary)' }}>Cloudflare dashboard ↗</a>.
					</div>
				</div>
			</HxCard>
		</div>
	);
}

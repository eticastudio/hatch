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

			{/* Comments — the only real Hatch-owned content bridge.
			    Form embedding, SEO/sitemap/RSS/robots are handled by their
			    respective WP plugins (visible in Plugin Bridge below). */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
					</>}
					iconColor="#0d9488"
					title="Comments"
					desc="The only Hatch-owned content bridge. Frontend reads a flat comment tree from /hatch/v1/comments. Disable to remove the route entirely."
				/>
				<HxRow
					label="Enable headless comments"
					desc="Server-rendered on first load, progressively enhanced via /hatch/v1/comments."
					last={!content.comments_enabled}
				>
					<HxToggle on={!!content.comments_enabled} onChange={onToggle('content.comments_enabled')} />
				</HxRow>
				{content.comments_enabled && (
					<HxRow label="Turnstile on comment submissions" desc="Cloudflare Turnstile bot check before a comment posts. Requires keys below." last>
						<HxToggle
							on={!!content.comments_turnstile && hasKeys}
							onChange={guardTurnstile('content.comments_turnstile')}
						/>
					</HxRow>
				)}
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
				<div id="hatch-turnstile-keys" style={{ paddingTop: 4, padding: 12, margin: '-12px', borderRadius: 10, transition: 'box-shadow .25s var(--hx-ease), background .25s var(--hx-ease)' }}>
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

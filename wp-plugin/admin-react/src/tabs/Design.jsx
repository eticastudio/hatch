import { useState } from '@wordpress/element';
import { HxIcon, HxToggle, HxCard, HxHead, HxRow, HxGL, HxInp, Chip, HxMediaInput } from '../components.jsx';
import { TP } from '../theme-previews.jsx';
import { FontSelect } from '../fonts.jsx';

export default function Design({ state, onDirty, setSetting }) {
	// id = slug (lowercase, matches what PHP `sanitize_key()` stores)
	// name = display label
	// `previewKey` = key into the TP map for the SVG preview
	const themes = [
		{ id: 'blog',       name: 'Blog',       previewKey: 'Blog',       col: '#3b82f6', desc: 'Reading-first, minimal. Personal blogs, news, magazines.' },
		{ id: 'tech',       name: 'Tech',       previewKey: 'Tech',       col: '#8b5cf6', desc: 'Code blocks + dark mode. Next.js / developer blog vibe.' },
		{ id: 'data',       name: 'Data',       previewKey: 'Data',       col: '#0d9488', desc: 'Sidebar nav + search. Version docs and knowledge bases.' },
		{ id: 'astropaper', name: 'AstroPaper', previewKey: 'AstroPaper', col: '#ff6b00', desc: 'Minimal clean blogging theme. Lightweight, featured images.' },
		{ id: 'astrowind',  name: 'AstroWind',  previewKey: 'AstroWind',  col: '#2563eb', desc: 'Business / marketing theme with hero, features, CTA sections.' },
		{ id: 'astro-nano', name: 'Astro Nano', previewKey: 'Astro Nano', col: '#737373', desc: 'Ultra-minimal. Just words, no sidebars. No-distraction writing.' },
	];

	const theme = (state.design?.theme || 'astropaper').toLowerCase();
	const brand = state.design?.brand || { primary: '#ff6b00', secondary: '#0a0a0a', accent: '#6366f1', background: '#fafafa' };
	// v0.50.14 — Canonical IDs (lowercase, no units) are the contract between
	// WP and the Astro frontend. Display labels stay pretty in the UI but the
	// values written via setSetting() are what the regenerator + Astro consume.
	// Migration tolerant: previously-saved capitalized labels are still
	// recognised by the comparison below until the user re-clicks.
	const layout = state.design?.layout || { density: 'comfortable', rounded: 'smooth', max_width: '1160', button_style: 'pill' };
	const isActiveLayout = (saved, id) => {
		if (saved == null) return false;
		const s = String(saved).toLowerCase().replace('px', '').replace(/\s+/g, '_');
		return s === id || s === id.replace('_', '');
	};
	const fontHead = state.design?.font_heading || 'Inter';
	const fontBody = state.design?.font_body || 'Inter';
	const mode = state.design?.mode || 'auto';

	const identity = state.identity || { logo_url: '', favicon_url: '', og_image_url: '', site_title: '', tagline: '' };
	const templates = state.templates || {
		single_sidebar: 'right',
		single_hero: 'featured',
		single_width: 'medium',
		archive_grid: '2',
		archive_excerpt: true,
		not_found_search: true,
	};
	const borders = state.borders || { color: '#e5e5e5', shadow: 'soft' };
	const breakpoints = state.breakpoints || { mobile: 640, tablet: 1024, desktop: 1280 };
	const credit = state.show_credit !== false; // default on

	const features = state.features || {};
	const featureCatalog = state.featureCatalog || [];
	const featureGroups = state.featureGroups || [];

	const [openAdv, setOpenAdv] = useState(null);

	const onText = (path) => (e) => { setSetting(path, e.target.value); onDirty(); };

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
			{/* Theme picker */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<circle cx="12" cy="12" r="3" />
						<path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
					</>}
					iconColor="#ff6b00"
					title="Theme"
					desc="The starter design your Astro frontend ships with. Tune fonts, colors, and layout below."
				/>
				<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
					{themes.map((t) => {
						const sel = theme === t.id;
						return (
							<div
								key={t.id}
								onClick={() => { setSetting('design.theme', t.id); onDirty(); }}
								style={{
									border: '1px solid var(--hx-border)',
									boxShadow: sel ? `0 0 0 2px ${t.col}` : 'none',
									borderRadius: 12,
									padding: '14px 16px',
									cursor: 'pointer',
									background: sel ? t.col + '0d' : 'var(--hx-surface-2)',
									transition: 'box-shadow .18s var(--hx-ease), background .18s var(--hx-ease)',
								}}
							>
								<div style={{ marginBottom: 10, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', opacity: sel ? 1 : 0.7, transition: 'opacity .18s' }}>
									{TP[t.previewKey] || TP.Blog}
								</div>
								<div style={{ fontSize: 13, fontWeight: 700, color: 'var(--hx-fg)', marginBottom: 4 }}>{t.name}</div>
								<div
									style={{
										fontSize: 12,
										color: 'var(--hx-subtle)',
										lineHeight: 1.5,
										display: '-webkit-box',
										WebkitLineClamp: 2,
										WebkitBoxOrient: 'vertical',
										overflow: 'hidden',
										minHeight: 36,
									}}
									title={t.desc}
								>
									{t.desc}
								</div>
							</div>
						);
					})}
				</div>
			</HxCard>

			{/* Brand Colors */}
			<HxCard>
				<HxHead
					iconChildren={<><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" /></>}
					iconColor="#ff6b00"
					title="Brand Colors"
					desc="Inject CSS custom properties into every Astro page. Light/dark/auto mode picker controls which palette ships."
					mb={16}
				/>
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
					{Object.entries(brand).map(([k, v]) => (
						<div key={k}>
							<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6, textTransform: 'capitalize' }}>{k}</div>
							<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
								<input
									type="color"
									value={v}
									onChange={(e) => { setSetting(`design.brand.${k}`, e.target.value); onDirty(); }}
									style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--hx-border-2)', cursor: 'pointer', padding: 3, background: 'var(--hx-surface)' }}
								/>
								<HxInp value={v} mono onChange={(e) => { setSetting(`design.brand.${k}`, e.target.value); onDirty(); }} />
							</div>
						</div>
					))}
				</div>
				<div>
					<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 8 }}>Color mode</div>
					<div style={{ display: 'flex', gap: 6 }}>
						{['light', 'dark', 'auto'].map((o) => (
							<Chip key={o} label={o.charAt(0).toUpperCase() + o.slice(1)} active={mode === o} onClick={() => { setSetting('design.mode', o); onDirty(); }} />
						))}
					</div>
				</div>
			</HxCard>

			{/* Typography */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<polyline points="4 7 4 4 20 4 20 7" />
						<line x1="9" y1="20" x2="15" y2="20" />
						<line x1="12" y1="4" x2="12" y2="20" />
					</>}
					iconColor="#8b5cf6"
					title="Typography"
					desc="Font choices propagate to your frontend via CSS variables. Changes reflect in ~60 seconds. Type the first few letters of a font to jump to it."
					mb={16}
				/>
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
					<div>
						<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Heading font</div>
						<FontSelect value={fontHead} onChange={(e) => { setSetting('design.font_heading', e.target.value); onDirty(); }} />
					</div>
					<div>
						<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Body font</div>
						<FontSelect value={fontBody} onChange={(e) => { setSetting('design.font_body', e.target.value); onDirty(); }} />
					</div>
				</div>
			</HxCard>

			{/* Layout — 2-column grid */}
			<HxCard>
				<HxHead
					iconChildren={<>
						<rect x="3" y="3" width="18" height="18" rx="2" />
						<path d="M9 3v18M3 9h18" />
					</>}
					iconColor="#0d9488"
					title="Layout"
					desc="Controls the rhythm and scale of your frontend layout."
					mb={16}
				/>
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
					<div>
						<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 8 }}>Density</div>
						<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
							{[{id: 'compact', label: 'Compact'}, {id: 'comfortable', label: 'Comfortable'}, {id: 'spacious', label: 'Spacious'}].map((o) => (
								<Chip key={o.id} label={o.label} active={isActiveLayout(layout.density, o.id)} onClick={() => { setSetting('design.layout.density', o.id); onDirty(); }} />
							))}
						</div>
					</div>
					<div>
						<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 8 }}>Roundness</div>
						<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
							{[{id: 'sharp', label: 'Sharp'}, {id: 'smooth', label: 'Default'}, {id: 'extra', label: 'Extra round'}].map((o) => (
								<Chip key={o.id} label={o.label} active={isActiveLayout(layout.rounded ?? layout.roundness, o.id)} onClick={() => { setSetting('design.layout.rounded', o.id); onDirty(); }} />
							))}
						</div>
					</div>
					<div>
						<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 8 }}>Max content width</div>
						<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
							{[{id: '720', label: '720px'}, {id: '1160', label: '1160px'}, {id: '1320', label: '1320px'}].map((o) => (
								<Chip key={o.id} label={o.label} active={isActiveLayout(layout.max_width ?? layout.maxWidth, o.id)} onClick={() => { setSetting('design.layout.max_width', o.id); onDirty(); }} />
							))}
						</div>
					</div>
					<div>
						<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 8 }}>Button style</div>
						<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
							{[{id: 'pill', label: 'Pill'}, {id: 'rounded', label: 'Rounded'}, {id: 'sharp', label: 'Sharp'}].map((o) => (
								<Chip key={o.id} label={o.label} active={isActiveLayout(layout.button_style ?? layout.buttonStyle, o.id)} onClick={() => { setSetting('design.layout.button_style', o.id); onDirty(); }} />
							))}
						</div>
					</div>
				</div>
			</HxCard>

			{/* Theme Features */}
			{featureCatalog.length > 0 && (
				<HxCard>
					<HxHead
						iconChildren={<><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></>}
						iconColor="#6366f1"
						title={`${theme} — Frontend Features`}
						desc={`Features your frontend exposes for the ${theme} theme. Toggles reach your site in ~60 seconds with no redeploy.`}
					/>
					{featureGroups.map((g) => {
						const rows = featureCatalog.filter((f) => f.group === g.slug);
						if (rows.length === 0) return null;
						return (
							<div key={g.slug}>
								<HxGL>{g.label}</HxGL>
								<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4, marginBottom: 4 }}>
									{rows.map((f) => {
										const on = !!features[f.slug];
										return (
											<div
												key={f.slug}
												style={{
													display: 'flex',
													alignItems: 'flex-start',
													gap: 12,
													padding: '12px 14px',
													border: '1px solid var(--hx-border)',
													borderRadius: 10,
													background: 'var(--hx-surface)',
												}}
											>
												<div style={{ flex: 1, minWidth: 0 }}>
													<div style={{ fontSize: 13, fontWeight: 500, color: 'var(--hx-fg)', marginBottom: 2 }}>{f.label}</div>
													<div style={{ fontSize: 12, color: 'var(--hx-subtle)', lineHeight: 1.5 }}>{f.description}</div>
												</div>
												<HxToggle on={on} onChange={(v) => { setSetting(`features.${f.slug}`, v); onDirty(); }} />
											</div>
										);
									})}
								</div>
							</div>
						);
					})}
				</HxCard>
			)}

			{/* Advanced: real controls in collapsible cards */}
			<HxCard style={{ padding: 0, overflow: 'hidden' }}>
				{[
					{ id: 'borders',     l: 'Borders & Shadows', s: `Color · ${borders.shadow}` },
					{ id: 'breakpoints', l: 'Breakpoints',       s: `${breakpoints.mobile} · ${breakpoints.tablet} · ${breakpoints.desktop}` },
					{ id: 'identity',    l: 'Site Identity',     s: 'Logo · Favicon · OG image' },
					{ id: 'templates',   l: 'Page Templates',    s: 'Sidebar · hero · archive grid' },
				].map((s, i, arr) => (
					<div key={s.id} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--hx-border)' : 'none' }}>
						<div
							onClick={() => setOpenAdv((x) => (x === s.id ? null : s.id))}
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								padding: '13px 22px',
								cursor: 'pointer',
								background: openAdv === s.id ? 'var(--hx-surface-2)' : 'var(--hx-surface)',
								transition: 'background .12s var(--hx-ease)',
							}}
						>
							<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
								<HxIcon
									size={14}
									color={openAdv === s.id ? 'var(--hx-primary)' : 'var(--hx-subtle)'}
									style={{
										transform: openAdv === s.id ? 'rotate(90deg)' : 'none',
										transition: 'transform .18s var(--hx-ease)',
									}}
								>
									<polyline points="9 18 15 12 9 6" />
								</HxIcon>
								<span style={{ fontSize: 12, fontWeight: 700, color: 'var(--hx-fg)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.l}</span>
							</div>
							<span style={{ fontSize: 12, color: 'var(--hx-subtle)' }}>{s.s}</span>
						</div>
						{openAdv === s.id && (
							<div style={{ padding: '18px 22px 22px', background: 'var(--hx-surface-2)', borderTop: '1px solid var(--hx-border)' }}>
								{s.id === 'borders' && (
									<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
										<div>
											<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Border color</div>
											<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
												<input
													type="color"
													value={borders.color || '#e5e5e5'}
													onChange={(e) => { setSetting('borders.color', e.target.value); onDirty(); }}
													style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--hx-border-2)', cursor: 'pointer', padding: 3, background: 'var(--hx-surface)' }}
												/>
												<HxInp value={borders.color || '#e5e5e5'} mono onChange={onText('borders.color')} />
											</div>
										</div>
										<div>
											<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 8 }}>Shadow preset</div>
											<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
												{['none', 'soft', 'medium', 'dramatic'].map((o) => (
													<Chip key={o} label={o.charAt(0).toUpperCase() + o.slice(1)} active={borders.shadow === o} onClick={() => { setSetting('borders.shadow', o); onDirty(); }} />
												))}
											</div>
										</div>
									</div>
								)}
								{s.id === 'breakpoints' && (
									<div>
										<div style={{ fontSize: 13, color: 'var(--hx-subtle)', marginBottom: 12 }}>
											Pixel widths where responsive rules kick in on your frontend. Below mobile = phone, above desktop = wide screens.
										</div>
										<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
											{['mobile', 'tablet', 'desktop'].map((k) => (
												<div key={k}>
													<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6, textTransform: 'capitalize' }}>{k}</div>
													<input
														type="number"
														min="0"
														step="1"
														value={breakpoints[k] || 0}
														onChange={(e) => { setSetting(`breakpoints.${k}`, parseInt(e.target.value, 10) || 0); onDirty(); }}
														style={{ width: '100%', height: 36, padding: '0 10px', borderRadius: 8, border: '1px solid var(--hx-border-2)', fontSize: 13, outline: 'none', fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', color: 'var(--hx-fg)', background: 'var(--hx-surface)', boxSizing: 'border-box' }}
													/>
												</div>
											))}
										</div>
									</div>
								)}
								{s.id === 'identity' && (
									<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
										<div>
											<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Site title</div>
											<HxInp placeholder="My Site" value={identity.site_title || ''} onChange={onText('identity.site_title')} />
										</div>
										<div>
											<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Tagline</div>
											<HxInp placeholder="One sentence describing your site" value={identity.tagline || ''} onChange={onText('identity.tagline')} />
										</div>
										<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
											<div>
												<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Logo</div>
												<HxMediaInput
													value={identity.logo_url || ''}
													onChange={onText('identity.logo_url')}
													frameTitle="Choose site logo"
													placeholder="https://…/logo.svg"
												/>
											</div>
											<div>
												<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Favicon</div>
												<HxMediaInput
													value={identity.favicon_url || ''}
													onChange={onText('identity.favicon_url')}
													frameTitle="Choose favicon"
													placeholder="https://…/favicon.ico"
												/>
											</div>
										</div>
										<div>
											<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 6 }}>Default OG image</div>
											<HxMediaInput
												value={identity.og_image_url || ''}
												onChange={onText('identity.og_image_url')}
												frameTitle="Choose default OG image"
												placeholder="https://…/og.png"
											/>
											<div style={{ fontSize: 12, color: 'var(--hx-subtle)', marginTop: 4 }}>1200×630 recommended. Used when a post has no featured image.</div>
										</div>
									</div>
								)}
								{s.id === 'templates' && (
									<div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
										{/* 2-column chip grid so short pickers don't waste vertical space */}
										<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
											<div>
												<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 8 }}>Single post sidebar</div>
												<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
													{['none', 'left', 'right'].map((o) => (
														<Chip key={o} label={o.charAt(0).toUpperCase() + o.slice(1)} active={templates.single_sidebar === o} onClick={() => { setSetting('templates.single_sidebar', o); onDirty(); }} />
													))}
												</div>
											</div>
											<div>
												<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 8 }}>Single post hero</div>
												<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
													{['featured', 'full', 'none'].map((o) => (
														<Chip key={o} label={o.charAt(0).toUpperCase() + o.slice(1)} active={templates.single_hero === o} onClick={() => { setSetting('templates.single_hero', o); onDirty(); }} />
													))}
												</div>
											</div>
											<div>
												<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 8 }}>Single post width</div>
												<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
													{['narrow', 'medium', 'wide'].map((o) => (
														<Chip key={o} label={o.charAt(0).toUpperCase() + o.slice(1)} active={templates.single_width === o} onClick={() => { setSetting('templates.single_width', o); onDirty(); }} />
													))}
												</div>
											</div>
											<div>
												<div style={{ fontSize: 12, fontWeight: 600, color: 'var(--hx-muted)', marginBottom: 8 }}>Archive grid columns</div>
												<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
													{['1', '2', '3', '4'].map((o) => (
														<Chip key={o} label={`${o} col${o === '1' ? '' : 's'}`} active={String(templates.archive_grid) === o} onClick={() => { setSetting('templates.archive_grid', o); onDirty(); }} />
													))}
												</div>
											</div>
										</div>
										<div>
											<HxRow
												label="Show excerpt on archive cards"
												desc="Renders the post excerpt below the title on category/tag/archive pages."
											>
												<HxToggle on={!!templates.archive_excerpt} onChange={(v) => { setSetting('templates.archive_excerpt', v); onDirty(); }} />
											</HxRow>
											<HxRow
												label="Show search on 404 page"
												desc="Adds a search box on the 404 page so visitors can recover from a broken link."
												last
											>
												<HxToggle on={!!templates.not_found_search} onChange={(v) => { setSetting('templates.not_found_search', v); onDirty(); }} />
											</HxRow>
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				))}
			</HxCard>
		</div>
	);
}

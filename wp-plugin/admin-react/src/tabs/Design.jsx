import { __, sprintf } from '@wordpress/i18n';
import { HxIcon, HxToggle, HxCard, HxHead, HxRow, HxGL, HxInp, Chip, HxBadge } from '../components.jsx';
import { TP } from '../theme-previews.jsx';
import { FontSelect } from '../fonts.jsx';

// The native colour input only accepts #rrggbb. Anything else (a CSS variable,
// an empty value, a partial save) falls back so the picker never receives an
// invalid value.
const hexOr = (value, fallback) => (/^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback);

export default function Design({ state, onDirty, setSetting }) {
	// v0.50.25 - Themes are sourced from boot state (state.themes) so the
	// authoritative label and description come from
	// PHP Hatch_Features::themes(). Local map adds the SVG previewKey + chip
	// color tint per slug: pure visual metadata that does not belong in PHP.
	const themeMeta = {
		blog:       { previewKey: 'Blog',       col: '#3b82f6' },
		tech:       { previewKey: 'Tech',       col: '#8b5cf6' },
		docs:       { previewKey: 'Data',       col: '#0d9488' },
		astropaper: { previewKey: 'AstroPaper', col: 'var(--hx-primary)' },
		astrowind:  { previewKey: 'AstroWind',  col: 'var(--hx-info)' },
		astronano:  { previewKey: 'Astro Nano', col: 'var(--hx-text-subtle)' },
	};
	const themes = (state.themes || []).map((t) => ({
		id:         t.id,
		name:       t.label || t.id,
		desc:       t.desc  || '',
		previewKey: themeMeta[t.id]?.previewKey || 'Blog',
		col:        themeMeta[t.id]?.col || 'var(--hx-text-subtle)',
	}));

	const theme = (state.design?.theme || 'astropaper').toLowerCase();
	const brand = state.design?.brand || { primary: '', secondary: '', accent: '', background: '' };
	// v0.50.14 - Canonical IDs (lowercase, no units) are the contract between
	// WP and the Astro frontend. Display labels stay readable in the UI but the
	// values written via setSetting() are what the regenerator + Astro consume.
	const layout = state.design?.layout || { density: 'comfortable', rounded: 'smooth', max_width: '1160', button_style: 'pill' };
	const fontHead = state.design?.font_heading || 'Inter';
	const fontBody = state.design?.font_body || 'Inter';
	const mode = state.design?.mode || 'auto';

	const templates = state.templates || {
		single_sidebar: 'right',
		single_hero: 'featured',
		single_width: 'medium',
		archive_grid: '2',
		archive_excerpt: true,
		not_found_search: true,
	};
	const borders = state.borders || { color: '', shadow: 'soft' };
	const breakpoints = state.breakpoints || { mobile: 640, tablet: 1024, desktop: 1280 };

	const features = state.features || {};
	const featureCatalog = state.featureCatalog || [];

	// v0.50.15 - Aesthetic option groups. Defaults mirror PHP so the UI stays
	// fully usable even before the first save reaches the dispatcher.
	const share = state.share || { x: true, linkedin: true, whatsapp: true, copy: true, facebook: false, reddit: false, email: false, position: 'inline' };
	const header = state.header || { sticky: 'sticky', blur: true, color_mode_button: true, brand_mark: 'icon_text' };
	const reading = state.reading || { date_format: 'long', reading_time_label: 'min_read', breadcrumb_separator: 'slash', toc_depth: 'h2_h3', toc_label: 'On this page', author_avatar_shape: 'circle', progress_bar_position: 'top', progress_bar_color: 'primary', heading_anchors: false };
	const images = state.images || { lightbox: true, lazy_load: true, hover_zoom: true, fallback_gradient: true, retina_2x: true, aspect_ratio: '2_1' };
	const animation = state.animation || { page_transitions: true, respect_reduced_motion: true };
	const blogIndex = state.blog_index || { archive_grid: '3', pagination_style: 'load_more', show_hero: true, show_topics: true };
	const postNav = state.post_navigation || { related_count: 3, related_source: 'category' };

	const onText   = (path) => (e) => { setSetting(path, e.target.value); onDirty(); };
	const onToggle = (path) => (v) => { setSetting(path, v); onDirty(); };
	const onChip   = (path, id) => () => { setSetting(path, id); onDirty(); };

	const colorInputStyle = { width: 32, height: 32, borderRadius: 6, border: '1px solid var(--hx-border-2)', cursor: 'pointer', padding: 2, background: 'var(--hx-surface)' };

	// v0.50.19 - ChipRow renders as an HxRow so every chip-pick setting uses
	// the SAME label/desc/control rhythm as every toggle.
	const ChipRow = ({ label, desc, path, current, options, last }) => (
		<HxRow label={label} desc={desc} last={last}>
			<div role="group" aria-label={label} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
				{options.map((o) => (
					<Chip key={o.id} label={o.label} active={String(current) === o.id} onClick={onChip(path, o.id)} />
				))}
			</div>
		</HxRow>
	);

	// v0.50.17 - Render a single Theme Features toggle by slug, so each one
	// can live inside the semantic card it belongs to. Label and description
	// come from featureCatalog (PHP), so the copy is not duplicated here.
	const FeatureToggle = ({ slug, last = false }) => {
		const meta = featureCatalog.find((f) => f.slug === slug);
		if (!meta) return null;
		return (
			<HxRow label={meta.label} desc={meta.description} last={last}>
				<HxToggle ariaLabel={meta.label} on={!!features[slug]} onChange={(v) => { setSetting(`features.${slug}`, v); onDirty(); }} />
			</HxRow>
		);
	};

	const selectTheme = (id) => { setSetting('design.theme', id); onDirty(); };

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
					title={__( 'Theme', 'hatch-bridge' )}
					desc={__( 'Choose the starter design for your Astro frontend. You can adjust fonts, colors, and layout below.', 'hatch-bridge' )}
				/>
				<div className="hx-grid-cols-3" role="radiogroup" aria-label={__( 'Theme', 'hatch-bridge' )} style={{ gap: 10 }}>
					{themes.map((t) => {
						const sel = theme === t.id;
						return (
							<div
								key={t.id}
								role="radio"
								aria-checked={sel}
								tabIndex={0}
								onClick={() => selectTheme(t.id)}
								onKeyDown={(e) => {
									if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
										e.preventDefault();
										selectTheme(t.id);
									}
								}}
								style={{
									border: '1px solid var(--hx-border)',
									boxShadow: sel ? `0 0 0 2px ${t.col}` : 'none',
									borderRadius: 12,
									padding: '14px 16px',
									cursor: 'pointer',
									background: sel ? `color-mix(in srgb, ${t.col} 5%, transparent)` : 'var(--hx-surface-2)',
									transition: 'box-shadow .18s var(--hx-ease), background .18s var(--hx-ease)',
								}}
							>
								<div style={{ marginBottom: 10, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', opacity: sel ? 1 : 0.7, transition: 'opacity .18s' }}>
									{TP[t.previewKey] || TP.Blog}
								</div>
								<div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
									<div className="hx-desc" style={{ fontWeight: 700, color: 'var(--hx-fg)' }}>{t.name}</div>
								</div>
								<div
									className="hx-help"
									style={{
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

			{/* v0.50.26. "Bring your own theme" is a separate informational
			    card so the shipped themes stay the only selectable options.
			    This card is not clickable. */}
			<HxCard>
				<div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
					<div style={{
						flex: '0 0 44px',
						width: 44,
						height: 44,
						borderRadius: 10,
						background: 'var(--hx-surface-2)',
						display: 'inline-flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: 'var(--hx-text-muted)',
					}}>
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
							<path d="M8 3h5l6 6v12H8z" />
							<path d="M13 3v6h6" />
							<path d="M12 13v6" />
							<path d="M9 16h6" />
						</svg>
					</div>
					<div style={{ flex: '1 1 320px', minWidth: 0 }}>
						<div className="hx-title" style={{ marginBottom: 4 }}>{__( 'Bring your own theme', 'hatch-bridge' )}</div>
						<div className="hx-desc" style={{ color: 'var(--hx-text-muted)', marginBottom: 10 }}>
							{__( 'Use your own Astro theme instead of the built-in starters. This is not available yet.', 'hatch-bridge' )}
						</div>
						<HxBadge color="orange">{__( 'Coming soon', 'hatch-bridge' )}</HxBadge>
					</div>
				</div>
			</HxCard>

			{/* v0.50.16. Brand colors + color mode + typography + layout in one
			    card, with a design.md upload row at the bottom so users who
			    already have a token file can drop it in and skip every
			    individual picker. */}
			<HxCard>
				<HxHead
					iconChildren={<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></>}
					iconColor="#ff6b00"
					title={__( 'Typography, colors and layout', 'hatch-bridge' )}
					desc={__( 'Set brand colors, fonts, spacing, and borders. Upload a design.md file to fill in all of them at once, or adjust each one below.', 'hatch-bridge' )}
					mb={16}
				/>

				<HxGL>{__( 'Brand colors', 'hatch-bridge' )}</HxGL>
				{/* Whitelist canonical brand color slots. The stored option can carry
				    legacy siblings (bg, fg, font_heading); rendering ALL keys as
				    <input type="color"> created duplicate rows and a broken picker
				    on the font_heading string. */}
				{[
					['primary',    __( 'Primary', 'hatch-bridge' )],
					['secondary',  __( 'Secondary', 'hatch-bridge' )],
					['accent',     __( 'Accent', 'hatch-bridge' )],
					['background', __( 'Background', 'hatch-bridge' )],
				].map(([k, label]) => {
					const v = brand[k] || '';
					return (
						<HxRow
							key={k}
							label={label}
							desc={null}
						>
							<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
								<input
									type="color"
									value={hexOr(v, '#000000')}
									/* translators: %s: brand color name, for example Primary or Accent */
									aria-label={sprintf( __( '%s color picker', 'hatch-bridge' ), label )}
									onChange={(e) => { setSetting(`design.brand.${k}`, e.target.value); onDirty(); }}
									style={colorInputStyle}
								/>
								<div style={{ width: 140 }}>
									<HxInp value={v} mono onChange={(e) => { setSetting(`design.brand.${k}`, e.target.value); onDirty(); }} />
								</div>
							</div>
						</HxRow>
					);
				})}
				<ChipRow
					label={__( 'Color mode', 'hatch-bridge' )}
					desc={__( 'Light or Dark locks the site to one look. Auto follows the visitor\'s device setting.', 'hatch-bridge' )}
					path="design.mode"
					current={mode}
					options={[
						{ id: 'light', label: __( 'Light', 'hatch-bridge' ) },
						{ id: 'dark',  label: __( 'Dark', 'hatch-bridge' ) },
						{ id: 'auto',  label: __( 'Auto', 'hatch-bridge' ) },
					]}
					last
				/>

				<HxGL>{__( 'Typography', 'hatch-bridge' )}</HxGL>
				<HxRow label={__( 'Heading font', 'hatch-bridge' )} desc={__( 'Used for headings (H1 to H4) across the site.', 'hatch-bridge' )}>
					<div style={{ width: 220 }}>
						<FontSelect ariaLabel={__( 'Heading font', 'hatch-bridge' )} value={fontHead} onChange={(e) => { setSetting('design.font_heading', e.target.value); onDirty(); }} />
					</div>
				</HxRow>
				<HxRow label={__( 'Body font', 'hatch-bridge' )} desc={__( 'Used for paragraphs, lists, and interface text.', 'hatch-bridge' )} last>
					<div style={{ width: 220 }}>
						<FontSelect ariaLabel={__( 'Body font', 'hatch-bridge' )} value={fontBody} onChange={(e) => { setSetting('design.font_body', e.target.value); onDirty(); }} />
					</div>
				</HxRow>

				<HxGL>{__( 'Layout', 'hatch-bridge' )}</HxGL>
				<ChipRow
					label={__( 'Density', 'hatch-bridge' )}
					desc={__( 'How much space sits between elements on every page.', 'hatch-bridge' )}
					path="design.layout.density"
					current={layout.density}
					options={[
						{ id: 'compact',     label: __( 'Compact', 'hatch-bridge' ) },
						{ id: 'comfortable', label: __( 'Comfortable', 'hatch-bridge' ) },
						{ id: 'spacious',    label: __( 'Spacious', 'hatch-bridge' ) },
					]}
				/>
				<ChipRow
					label={__( 'Roundness', 'hatch-bridge' )}
					desc={__( 'Corner radius of cards and containers. Buttons use the Button style setting below.', 'hatch-bridge' )}
					path="design.layout.rounded"
					current={layout.rounded ?? layout.roundness}
					options={[
						{ id: 'sharp',  label: __( 'Sharp', 'hatch-bridge' ) },
						{ id: 'smooth', label: __( 'Default', 'hatch-bridge' ) },
						{ id: 'extra',  label: __( 'Extra round', 'hatch-bridge' ) },
					]}
				/>
				<ChipRow
					label={__( 'Max content width', 'hatch-bridge' )}
					desc={__( 'The widest the page content can be.', 'hatch-bridge' )}
					path="design.layout.max_width"
					current={layout.max_width ?? layout.maxWidth}
					options={[
						{ id: '720',  label: '720px' },
						{ id: '1160', label: '1160px' },
						{ id: '1320', label: '1320px' },
					]}
				/>
				<ChipRow
					label={__( 'Button style', 'hatch-bridge' )}
					desc={__( 'Corner shape for buttons, set separately from container roundness.', 'hatch-bridge' )}
					path="design.layout.button_style"
					current={layout.button_style ?? layout.buttonStyle}
					options={[
						{ id: 'pill',    label: __( 'Pill', 'hatch-bridge' ) },
						{ id: 'rounded', label: __( 'Rounded', 'hatch-bridge' ) },
						{ id: 'sharp',   label: __( 'Sharp', 'hatch-bridge' ) },
					]}
					last
				/>

				<HxGL>{__( 'Borders & shadows', 'hatch-bridge' )}</HxGL>
				<HxRow label={__( 'Border color', 'hatch-bridge' )} desc={__( 'Used by cards, dividers, and outlined buttons.', 'hatch-bridge' )}>
					<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
						<input
							type="color"
							value={hexOr(borders.color, '#e5e5e5')}
							aria-label={__( 'Border color picker', 'hatch-bridge' )}
							onChange={(e) => { setSetting('borders.color', e.target.value); onDirty(); }}
							style={colorInputStyle}
						/>
						<div style={{ width: 140 }}>
							<HxInp value={borders.color || ''} mono onChange={onText('borders.color')} />
						</div>
					</div>
				</HxRow>
				<ChipRow
					label={__( 'Shadow preset', 'hatch-bridge' )}
					desc={__( 'How raised cards and popovers look. None gives a flat design.', 'hatch-bridge' )}
					path="borders.shadow"
					current={borders.shadow}
					options={[
						{ id: 'none',     label: __( 'None', 'hatch-bridge' ) },
						{ id: 'soft',     label: __( 'Soft', 'hatch-bridge' ) },
						{ id: 'medium',   label: __( 'Medium', 'hatch-bridge' ) },
						{ id: 'dramatic', label: __( 'Dramatic', 'hatch-bridge' ) },
					]}
					last
				/>

				<HxGL>{__( 'Breakpoints', 'hatch-bridge' )}</HxGL>
				{[
					{ key: 'mobile',  label: __( 'Mobile', 'hatch-bridge' ),  desc: __( 'Screens narrower than this width use the mobile layout.', 'hatch-bridge' ) },
					{ key: 'tablet',  label: __( 'Tablet', 'hatch-bridge' ),  desc: __( 'Screens narrower than this width use the tablet layout.', 'hatch-bridge' ) },
					{ key: 'desktop', label: __( 'Desktop', 'hatch-bridge' ), desc: __( 'Screens wider than this width use the wide-screen layout.', 'hatch-bridge' ) },
				].map((bp, i, arr) => (
					<HxRow
						key={bp.key}
						label={bp.label}
						desc={bp.desc}
						last={i === arr.length - 1}
					>
						<input
							type="number" min="0" step="1"
							value={breakpoints[bp.key] || 0}
							/* translators: %s: device size name, for example Mobile or Tablet */
							aria-label={sprintf( __( '%s breakpoint in pixels', 'hatch-bridge' ), bp.label )}
							onChange={(e) => { setSetting(`breakpoints.${bp.key}`, parseInt(e.target.value, 10) || 0); onDirty(); }}
							style={{ width: 110, height: 32, padding: '0 10px', borderRadius: 6, border: '1px solid var(--hx-border-2)', fontSize: 13, outline: 'none', fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', color: 'var(--hx-fg)', background: 'var(--hx-surface)', boxSizing: 'border-box', textAlign: 'end' }}
						/>
					</HxRow>
				))}

				{/* v0.50.18 - Compact design.md upload row at the bottom of the
				    card: the CTA, an upload button, and a saved/none status. */}
				<div
					style={{
						marginTop: 18,
						paddingTop: 14,
						borderTop: '1px solid var(--hx-border)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 12,
						flexWrap: 'wrap',
					}}
				>
					<div className="hx-desc" style={{ color: 'var(--hx-fg)' }}>
						{__( 'Import all of these settings from a design.md file.', 'hatch-bridge' )}
						<span className="hx-help" style={{ marginInlineStart: 8, color: 'var(--hx-subtle)' }}>
							{state.design_md ? __( 'A design.md file is saved.', 'hatch-bridge' ) : __( 'No design.md file uploaded.', 'hatch-bridge' )}
						</span>
					</div>
					<label
						htmlFor="hatch-designmd-file"
						className="hx-label"
						style={{
							display: 'inline-flex', alignItems: 'center', gap: 6,
							padding: '7px 14px', borderRadius: 8,
							border: '1px solid var(--hx-border-2)', background: 'var(--hx-surface)',
							color: 'var(--hx-fg)',
							cursor: 'pointer', whiteSpace: 'nowrap',
						}}
					>
						<HxIcon size={13}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></HxIcon>
						{__( 'Upload', 'hatch-bridge' )}
					</label>
					<input
						id="hatch-designmd-file"
						type="file"
						accept=".md,.markdown,text/markdown,text/plain"
						style={{ display: 'none' }}
						onChange={(e) => {
							const f = e.target.files && e.target.files[0];
							if (!f) return;
							const r = new FileReader();
							r.onload = () => {
								setSetting('design.md', String(r.result || ''));
								onDirty();
							};
							r.readAsText(f);
							e.target.value = '';
						}}
					/>
				</div>
			</HxCard>

			{/* v0.50.17 - Theme Features toggles render inside their semantic
			    cards below via <FeatureToggle slug="..." />: one source of
			    truth, no duplicate scrolling between cards. */}

			{/* Header & Footer */}
			<HxCard>
				<HxHead
					iconChildren={<><rect x="3" y="4" width="18" height="4" rx="1" /><rect x="3" y="16" width="18" height="4" rx="1" /></>}
					iconColor="#0ea5e9"
					title={__( 'Header & Footer', 'hatch-bridge' )}
					desc={__( 'The header and footer shown on every page: scroll behavior, color-mode button, and brand mark.', 'hatch-bridge' )}
					mb={16}
				/>
				<HxGL>{__( 'Header', 'hatch-bridge' )}</HxGL>
				<ChipRow
					label={__( 'Header scroll behavior', 'hatch-bridge' )}
					desc={__( 'Sticky keeps the header at the top of the screen. Hide on scroll tucks it away while scrolling down.', 'hatch-bridge' )}
					path="header.sticky"
					current={header.sticky}
					options={[
						{ id: 'sticky',         label: __( 'Sticky', 'hatch-bridge' ) },
						{ id: 'static',         label: __( 'Static', 'hatch-bridge' ) },
						{ id: 'hide_on_scroll', label: __( 'Hide on scroll', 'hatch-bridge' ) },
					]}
				/>
				<ChipRow
					label={__( 'Brand mark', 'hatch-bridge' )}
					desc={__( 'What appears next to the navigation.', 'hatch-bridge' )}
					path="header.brand_mark"
					current={header.brand_mark}
					options={[
						{ id: 'icon_text', label: __( 'Icon + text', 'hatch-bridge' ) },
						{ id: 'text',      label: __( 'Text only', 'hatch-bridge' ) },
						{ id: 'initial',   label: __( 'Initial only', 'hatch-bridge' ) },
					]}
				/>
				{/* v0.50.31 - Logo / Text / Both control. When a logo is set in
				    the WP Customizer (Site Identity), the header can show logo
				    only, text only, both, or auto (logo if present, else text).
				    Independent from brand_mark above. */}
				<ChipRow
					label={__( 'Brand display', 'hatch-bridge' )}
					desc={__( 'Show the site logo, the site title, or both. Auto uses the logo if you have uploaded one, otherwise the title.', 'hatch-bridge' )}
					path="header.brand_display"
					current={header.brand_display || 'auto'}
					options={[
						{ id: 'auto', label: __( 'Auto', 'hatch-bridge' ) },
						{ id: 'logo', label: __( 'Logo only', 'hatch-bridge' ) },
						{ id: 'text', label: __( 'Text only', 'hatch-bridge' ) },
						{ id: 'both', label: __( 'Logo + text', 'hatch-bridge' ) },
					]}
				/>
				{/* v0.50.21 - Blur is meaningless on a static (non-overlapping) header. */}
				{header.sticky !== 'static' && (
					<HxRow label={__( 'Translucent blur background', 'hatch-bridge' )} desc={__( 'Blurs the page content behind the header so it shows through.', 'hatch-bridge' )}>
						<HxToggle ariaLabel={__( 'Translucent blur background', 'hatch-bridge' )} on={!!header.blur} onChange={onToggle('header.blur')} />
					</HxRow>
				)}
				<HxRow label={__( 'Color-mode toggle button', 'hatch-bridge' )} desc={__( 'Adds a sun and moon button to the header so visitors can switch between light and dark.', 'hatch-bridge' )} last>
					<HxToggle ariaLabel={__( 'Color-mode toggle button', 'hatch-bridge' )} on={!!header.color_mode_button} onChange={onToggle('header.color_mode_button')} />
				</HxRow>

				<HxGL>{__( 'Footer', 'hatch-bridge' )}</HxGL>
				<FeatureToggle slug="built_by_hatch" last />
			</HxCard>

			{/* Reading Experience (single posts) */}
			<HxCard>
				<HxHead
					iconChildren={<><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></>}
					iconColor="#16a34a"
					title={__( 'Reading Experience', 'hatch-bridge' )}
					desc={__( 'Settings for individual blog posts: dates, reading time, breadcrumbs, table of contents, and author. Turn features on first, then style them.', 'hatch-bridge' )}
					mb={16}
				/>

				<HxGL>{__( 'Show on single posts', 'hatch-bridge' )}</HxGL>
				<FeatureToggle slug="progress_bar" />
				<FeatureToggle slug="toc_sidebar" />
				<FeatureToggle slug="breadcrumb" />
				<FeatureToggle slug="reading_time" />
				<FeatureToggle slug="last_updated" />
				<FeatureToggle slug="author_bio" last />

				<HxGL>{__( 'Single-post template', 'hatch-bridge' )}</HxGL>
				<ChipRow
					label={__( 'Sidebar on single posts', 'hatch-bridge' )}
					desc={__( 'None makes posts full width. Left or Right places the table of contents in a sidebar when the post has H2 or H3 headings. Themes may adjust this to fit their own layout.', 'hatch-bridge' )}
					path="templates.single_sidebar"
					current={templates.single_sidebar}
					options={[
						{ id: 'none',  label: __( 'None', 'hatch-bridge' ) },
						{ id: 'left',  label: __( 'Left', 'hatch-bridge' ) },
						{ id: 'right', label: __( 'Right', 'hatch-bridge' ) },
					]}
				/>
				<ChipRow
					label={__( 'Hero style', 'hatch-bridge' )}
					desc={__( 'How the featured image appears above the post title.', 'hatch-bridge' )}
					path="templates.single_hero"
					current={templates.single_hero}
					options={[
						{ id: 'featured', label: __( 'Featured', 'hatch-bridge' ) },
						{ id: 'compact',  label: __( 'Compact', 'hatch-bridge' ) },
						{ id: 'none',     label: __( 'None', 'hatch-bridge' ) },
					]}
				/>
				<ChipRow
					label={__( 'Content width', 'hatch-bridge' )}
					desc={__( 'Post width relative to the Max content width setting above.', 'hatch-bridge' )}
					path="templates.single_width"
					current={templates.single_width}
					options={[
						{ id: 'narrow', label: __( 'Narrow', 'hatch-bridge' ) },
						{ id: 'medium', label: __( 'Medium', 'hatch-bridge' ) },
						{ id: 'wide',   label: __( 'Wide', 'hatch-bridge' ) },
					]}
					last
				/>

				{/* v0.50.21 - Style controls render only while their parent
				    visibility toggle is on, so there is no dead UI. */}
				<HxGL>{__( 'Style', 'hatch-bridge' )}</HxGL>
				<ChipRow
					label={__( 'Date format', 'hatch-bridge' )}
					desc={__( 'Examples: May 19, 2026 / May 19 / 3 days ago.', 'hatch-bridge' )}
					path="reading.date_format"
					current={reading.date_format}
					options={[
						{ id: 'long',     label: __( 'Long', 'hatch-bridge' ) },
						{ id: 'short',    label: __( 'Short', 'hatch-bridge' ) },
						{ id: 'relative', label: __( 'Relative', 'hatch-bridge' ) },
					]}
				/>
				{!!features.reading_time && (
					<ChipRow
						label={__( 'Reading-time wording', 'hatch-bridge' )}
						desc={__( 'How the reading-time label reads, or hide it.', 'hatch-bridge' )}
						path="reading.reading_time_label"
						current={reading.reading_time_label}
						options={[
							{ id: 'min_read', label: __( '“5 min read”', 'hatch-bridge' ) },
							{ id: 'mins',     label: __( '“5 mins”', 'hatch-bridge' ) },
							{ id: 'hidden',   label: __( 'Hide', 'hatch-bridge' ) },
						]}
					/>
				)}
				{!!features.breadcrumb && (
					<ChipRow
						label={__( 'Breadcrumb separator', 'hatch-bridge' )}
						desc={__( 'Character shown between breadcrumb items.', 'hatch-bridge' )}
						path="reading.breadcrumb_separator"
						current={reading.breadcrumb_separator}
						options={[
							{ id: 'slash',   label: '/' },
							{ id: 'chevron', label: '›' },
							{ id: 'arrow',   label: '→' },
						]}
					/>
				)}
				{!!features.toc_sidebar && (
					<>
						<ChipRow
							label={__( 'TOC depth', 'hatch-bridge' )}
							desc={__( 'Which heading levels appear in the table of contents.', 'hatch-bridge' )}
							path="reading.toc_depth"
							current={reading.toc_depth}
							options={[
								{ id: 'h2',       label: __( 'H2 only', 'hatch-bridge' ) },
								{ id: 'h2_h3',    label: __( 'H2 + H3', 'hatch-bridge' ) },
								{ id: 'h2_h3_h4', label: __( 'H2 to H4', 'hatch-bridge' ) },
							]}
						/>
						<HxRow label={__( 'TOC heading label', 'hatch-bridge' )} desc={__( 'Heading shown above the table of contents, for example "On this page".', 'hatch-bridge' )}>
							<div style={{ width: 200 }}>
								<HxInp value={reading.toc_label || ''} onChange={onText('reading.toc_label')} placeholder={__( 'On this page', 'hatch-bridge' )} />
							</div>
						</HxRow>
					</>
				)}
				{!!features.author_bio && (
					<ChipRow
						label={__( 'Author avatar shape', 'hatch-bridge' )}
						desc={__( 'Used on the author byline and the author bio card.', 'hatch-bridge' )}
						path="reading.author_avatar_shape"
						current={reading.author_avatar_shape}
						options={[
							{ id: 'circle',  label: __( 'Circle', 'hatch-bridge' ) },
							{ id: 'rounded', label: __( 'Rounded', 'hatch-bridge' ) },
							{ id: 'square',  label: __( 'Square', 'hatch-bridge' ) },
						]}
					/>
				)}
				{!!features.progress_bar && (
					<>
						<ChipRow
							label={__( 'Progress bar position', 'hatch-bridge' )}
							desc={__( 'Show the progress bar at the top or bottom of the screen.', 'hatch-bridge' )}
							path="reading.progress_bar_position"
							current={reading.progress_bar_position}
							options={[
								{ id: 'top',    label: __( 'Top', 'hatch-bridge' ) },
								{ id: 'bottom', label: __( 'Bottom', 'hatch-bridge' ) },
							]}
						/>
						<ChipRow
							label={__( 'Progress bar color', 'hatch-bridge' )}
							desc={__( 'Uses one of your brand colors.', 'hatch-bridge' )}
							path="reading.progress_bar_color"
							current={reading.progress_bar_color}
							options={[
								{ id: 'primary', label: __( 'Primary', 'hatch-bridge' ) },
								{ id: 'accent',  label: __( 'Accent', 'hatch-bridge' ) },
							]}
						/>
					</>
				)}
				<HxRow
					label={__( 'Heading anchor links', 'hatch-bridge' )}
					desc={__( 'Shows a # icon on hover so readers can link straight to a section.', 'hatch-bridge' )}
					last
				>
					<HxToggle ariaLabel={__( 'Heading anchor links', 'hatch-bridge' )} on={!!reading.heading_anchors} onChange={onToggle('reading.heading_anchors')} />
				</HxRow>
			</HxCard>

			{/* Post Navigation & Sharing */}
			<HxCard>
				<HxHead
					iconChildren={<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></>}
					iconColor="#6366f1"
					title={__( 'Post Navigation & Sharing', 'hatch-bridge' )}
					desc={__( 'Share buttons, previous and next links, and related posts. Choose which share networks appear.', 'hatch-bridge' )}
					mb={16}
				/>

				{/* v0.50.21 - sub-option groups below render only while their
				    parent toggle is on. */}
				<HxGL>{__( 'Show on single posts', 'hatch-bridge' )}</HxGL>
				<FeatureToggle slug="next_prev_nav" />
				<FeatureToggle slug="related_posts" />
				<FeatureToggle slug="sticky_share" last />

				{!!features.sticky_share && (
					<>
						<HxGL>{__( 'Share networks', 'hatch-bridge' )}</HxGL>
						{[
							['x',        'X'],
							['linkedin', 'LinkedIn'],
							['whatsapp', 'WhatsApp'],
							['copy',     __( 'Copy link', 'hatch-bridge' )],
							['facebook', 'Facebook'],
							['reddit',   'Reddit'],
							['email',    __( 'Email', 'hatch-bridge' )],
						].map(([k, label], i, arr) => (
							<HxRow key={k} label={label} desc={null} last={i === arr.length - 1}>
								<HxToggle ariaLabel={label} on={!!share[k]} onChange={onToggle(`share.${k}`)} />
							</HxRow>
						))}

						<HxGL>{__( 'Share bar', 'hatch-bridge' )}</HxGL>
						<ChipRow
							label={__( 'Share bar position', 'hatch-bridge' )}
							desc={__( 'Where the share buttons appear on single posts.', 'hatch-bridge' )}
							path="share.position"
							current={share.position}
							options={[
								{ id: 'inline', label: __( 'Inline (bottom)', 'hatch-bridge' ) },
								{ id: 'sticky', label: __( 'Sticky (side)', 'hatch-bridge' ) },
								{ id: 'both',   label: __( 'Both', 'hatch-bridge' ) },
							]}
							last
						/>
					</>
				)}

				{!!features.related_posts && (
					<>
						<HxGL>{__( 'Related posts', 'hatch-bridge' )}</HxGL>
						<ChipRow
							label={__( 'Count', 'hatch-bridge' )}
							desc={__( 'How many related posts appear below each post.', 'hatch-bridge' )}
							path="post_navigation.related_count"
							current={String(postNav.related_count)}
							options={[
								{ id: '2', label: '2' },
								{ id: '3', label: '3' },
								{ id: '4', label: '4' },
								{ id: '6', label: '6' },
							]}
						/>
						<ChipRow
							label={__( 'Source', 'hatch-bridge' )}
							desc={__( 'How related posts are chosen.', 'hatch-bridge' )}
							path="post_navigation.related_source"
							current={postNav.related_source}
							options={[
								{ id: 'category', label: __( 'Same category', 'hatch-bridge' ) },
								{ id: 'tags',     label: __( 'Same tags', 'hatch-bridge' ) },
								{ id: 'mixed',    label: __( 'Mixed', 'hatch-bridge' ) },
							]}
							last
						/>
					</>
				)}
			</HxCard>

			{/* Blog Index & Homepage */}
			<HxCard>
				<HxHead
					iconChildren={<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>}
					iconColor="#f59e0b"
					title={__( 'Blog Index & Homepage', 'hatch-bridge' )}
					desc={__( 'Layout of the post list page: columns, pagination, featured post, and topics.', 'hatch-bridge' )}
					mb={16}
				/>

				<HxGL>{__( 'Visibility', 'hatch-bridge' )}</HxGL>
				<FeatureToggle slug="category_tabs" />
				<HxRow label={__( 'Featured post on blog index', 'hatch-bridge' )} desc={__( 'A large card that highlights the latest post.', 'hatch-bridge' )}>
					<HxToggle ariaLabel={__( 'Featured post on blog index', 'hatch-bridge' )} on={!!blogIndex.show_hero} onChange={onToggle('blog_index.show_hero')} />
				</HxRow>
				<HxRow label={__( 'Topics section on homepage', 'hatch-bridge' )} desc={__( 'Category tiles so visitors can browse by topic.', 'hatch-bridge' )} last>
					<HxToggle ariaLabel={__( 'Topics section on homepage', 'hatch-bridge' )} on={!!blogIndex.show_topics} onChange={onToggle('blog_index.show_topics')} />
				</HxRow>

				<HxGL>{__( 'Card style', 'hatch-bridge' )}</HxGL>
				<HxRow label={__( 'Show excerpt under post titles', 'hatch-bridge' )} desc={__( 'Shows the post excerpt below the title on archive cards.', 'hatch-bridge' )}>
					<HxToggle ariaLabel={__( 'Show excerpt under post titles', 'hatch-bridge' )} on={templates.archive_excerpt !== 'false' && templates.archive_excerpt !== false} onChange={(v) => { setSetting('templates.archive_excerpt', v ? 'true' : 'false'); onDirty(); }} />
				</HxRow>
				<HxRow label={__( 'Show search on 404 page', 'hatch-bridge' )} desc={__( 'Adds a search box to the 404 page so visitors can look for what they were after.', 'hatch-bridge' )} last>
					<HxToggle ariaLabel={__( 'Show search on 404 page', 'hatch-bridge' )} on={templates.not_found_search !== 'false' && templates.not_found_search !== false} onChange={(v) => { setSetting('templates.not_found_search', v ? 'true' : 'false'); onDirty(); }} />
				</HxRow>

				<HxGL>{__( 'Layout', 'hatch-bridge' )}</HxGL>
				<ChipRow
					label={__( 'Archive grid columns', 'hatch-bridge' )}
					desc={__( 'How many post cards appear per row on the blog index.', 'hatch-bridge' )}
					path="blog_index.archive_grid"
					current={blogIndex.archive_grid}
					options={[
						{ id: '1', label: '1' },
						{ id: '2', label: '2' },
						{ id: '3', label: '3' },
						{ id: '4', label: '4' },
					]}
				/>
				<ChipRow
					label={__( 'Pagination style', 'hatch-bridge' )}
					desc={__( 'How readers move through older posts.', 'hatch-bridge' )}
					path="blog_index.pagination_style"
					current={blogIndex.pagination_style}
					options={[
						{ id: 'load_more', label: __( 'Load more', 'hatch-bridge' ) },
						{ id: 'numbered',  label: __( 'Numbered', 'hatch-bridge' ) },
						{ id: 'infinite',  label: __( 'Infinite scroll', 'hatch-bridge' ) },
					]}
					last
				/>
			</HxCard>

			{/* Images & Media */}
			<HxCard>
				<HxHead
					iconChildren={<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>}
					iconColor="#ec4899"
					title={__( 'Images & Media', 'hatch-bridge' )}
					desc={__( 'How images load and how they respond when visitors interact with them.', 'hatch-bridge' )}
					mb={16}
				/>
				<HxRow label={__( 'Lightbox on click', 'hatch-bridge' )} desc={__( 'Clicking an image in a post opens it in a full-screen overlay.', 'hatch-bridge' )}>
					<HxToggle ariaLabel={__( 'Lightbox on click', 'hatch-bridge' )} on={!!images.lightbox} onChange={onToggle('images.lightbox')} />
				</HxRow>
				<HxRow label={__( 'Hover zoom on cards', 'hatch-bridge' )} desc={__( 'Slightly enlarges post-card thumbnails when the cursor is over them.', 'hatch-bridge' )}>
					<HxToggle ariaLabel={__( 'Hover zoom on cards', 'hatch-bridge' )} on={!!images.hover_zoom} onChange={onToggle('images.hover_zoom')} />
				</HxRow>
				<HxRow label={__( 'Lazy-load below the fold', 'hatch-bridge' )} desc={__( 'Waits to load off-screen images until they are needed, for a faster first load.', 'hatch-bridge' )}>
					<HxToggle ariaLabel={__( 'Lazy-load below the fold', 'hatch-bridge' )} on={!!images.lazy_load} onChange={onToggle('images.lazy_load')} />
				</HxRow>
				<HxRow label={__( 'High-resolution images (2x)', 'hatch-bridge' )} desc={__( 'Serves larger image versions to high-density screens.', 'hatch-bridge' )}>
					<HxToggle ariaLabel={__( 'High-resolution images (2x)', 'hatch-bridge' )} on={!!images.retina_2x} onChange={onToggle('images.retina_2x')} />
				</HxRow>
				<HxRow label={__( 'Fallback gradient', 'hatch-bridge' )} desc={__( 'Shows a soft brand-colored gradient when a post has no featured image.', 'hatch-bridge' )}>
					<HxToggle ariaLabel={__( 'Fallback gradient', 'hatch-bridge' )} on={!!images.fallback_gradient} onChange={onToggle('images.fallback_gradient')} />
				</HxRow>
				<ChipRow
					label={__( 'Featured-image aspect ratio', 'hatch-bridge' )}
					desc={__( 'Shape of post-card thumbnails and the single-post hero image.', 'hatch-bridge' )}
					path="images.aspect_ratio"
					current={images.aspect_ratio}
					options={[
						{ id: '2_1',  label: '2:1' },
						{ id: '3_1',  label: '3:1' },
						{ id: '16_9', label: '16:9' },
					]}
					last
				/>
			</HxCard>

			{/* Animation & Motion */}
			<HxCard>
				<HxHead
					iconChildren={<><polyline points="13 17 18 12 13 7" /><polyline points="6 17 11 12 6 7" /></>}
					iconColor="#a855f7"
					title={__( 'Animation & Motion', 'hatch-bridge' )}
					desc={__( 'Page transitions and motion preferences. Reduced motion follows the accessibility setting on the visitor\'s device.', 'hatch-bridge' )}
					mb={16}
				/>
				<HxRow label={__( 'Page transitions', 'hatch-bridge' )} desc={__( 'Pages fade in instead of reloading fully.', 'hatch-bridge' )}>
					<HxToggle ariaLabel={__( 'Page transitions', 'hatch-bridge' )} on={!!animation.page_transitions} onChange={onToggle('animation.page_transitions')} />
				</HxRow>
				<HxRow label={__( 'Respect reduced-motion setting', 'hatch-bridge' )} desc={__( 'Turns off animation for visitors whose device asks for reduced motion.', 'hatch-bridge' )} last>
					<HxToggle ariaLabel={__( 'Respect reduced-motion setting', 'hatch-bridge' )} on={!!animation.respect_reduced_motion} onChange={onToggle('animation.respect_reduced_motion')} />
				</HxRow>
			</HxCard>

			{/* v0.50.31 - Site Identity card removed. WordPress owns site
			    title and tagline (Settings, General); RankMath/Yoast own the
			    default OG image; logo and favicon come from the Customizer.
			    One source of truth per concern. */}

		</div>
	);
}

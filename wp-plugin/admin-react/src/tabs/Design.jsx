import { __, sprintf } from '@wordpress/i18n';
import { createContext, useContext } from '@wordpress/element';
import { HxIcon, HxToggle, HxCard, HxHead, HxRow, HxGL, HxInp, Chip, HxBadge, HxBtn } from '../components.jsx';
import { IC } from '../icons';
import { TP } from '../theme-previews.jsx';
import { FontSelect } from '../fonts.jsx';

// The native colour input only accepts #rrggbb. Anything else (a CSS variable,
// an empty value, a partial save) falls back so the picker never receives an
// invalid value.
const hexOr = (value, fallback) => (/^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback);

// ChipRow renders as an HxRow so every chip-pick setting shares the label,
// description and control rhythm of every toggle. Hoisted to module level so
// it keeps a stable identity across renders; state arrives through context.
const DesignCtx = createContext(null);

const ChipRow = ({ label, desc, path, current, options, last }) => {
	const { onChip } = useContext(DesignCtx);
	return (
		<HxRow label={label} desc={desc} last={last}>
			<div role="group" aria-label={label} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
				{options.map((o) => (
					<Chip key={o.id} label={o.label} active={String(current) === o.id} onClick={onChip(path, o.id)} />
				))}
			</div>
		</HxRow>
	);
};

// Renders one Theme Features toggle by slug. Label and description come from
// featureCatalog (PHP), so the copy is not duplicated here.
const FeatureToggle = ({ slug, last = false }) => {
	const { features, featureCatalog, setSetting, onDirty } = useContext(DesignCtx);
	const meta = featureCatalog.find((f) => f.slug === slug);
	if (!meta) return null;
	return (
		<HxRow label={meta.label} desc={meta.description} last={last}>
			<HxToggle ariaLabel={meta.label} on={!!features[slug]} onChange={(v) => { setSetting(`features.${slug}`, v); onDirty(); }} />
		</HxRow>
	);
};

export default function Design({ state, onDirty, setSetting }) {
	// v0.50.25 - Themes are sourced from boot state (state.themes) so the
	// authoritative label and description come from
	// PHP Hatch_Features::themes(). Local map adds the SVG previewKey + chip
	// color tint per slug: pure visual metadata that does not belong in PHP.
	const themeMeta = {
		blog:       { previewKey: 'Blog',       col: '#2563eb' },
		tech:       { previewKey: 'Tech',       col: '#8b5cf6' },
		docs:       { previewKey: 'Data',       col: '#0d9488' },
	};
	const themes = (state.themes || []).map((t) => ({
		id:         t.id,
		name:       t.label || t.id,
		desc:       t.desc  || '',
		previewKey: themeMeta[t.id]?.previewKey || 'Blog',
		col:        themeMeta[t.id]?.col || 'var(--hx-text-subtle)',
	}));

	const theme = (state.design?.theme || 'blog').toLowerCase();
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

	const colorInputStyle = { width: 36, height: 36, borderRadius: 8, border: '1px solid var(--hx-border-2)', cursor: 'pointer', padding: 2, background: 'var(--hx-surface)' };

	const ctxValue = { onChip, features, featureCatalog, setSetting, onDirty };

	const selectTheme = (id) => { setSetting('design.theme', id); onDirty(); };

	return (
		<DesignCtx.Provider value={ctxValue}>
		<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
			{/* Theme picker */}
			<HxCard>
				<HxHead
					iconChildren={IC.palette}
					iconColor="#ff6b00"
					title={__( 'Frontend design', 'hatch-connect' )}
					desc={__( 'Choose the look of your frontend. You can change fonts, colors and layout below.', 'hatch-connect' )}
				/>
				<div className="hx-grid-cols-3" role="radiogroup" aria-label={__( 'Frontend design', 'hatch-connect' )} style={{ gap: 10 }}>
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
									border: sel ? '2px solid var(--hx-primary)' : '2px solid var(--hx-border)',
									borderRadius: 12,
									padding: '12px 14px',
									cursor: 'pointer',
									background: sel ? 'color-mix(in srgb, var(--hx-primary) 5%, var(--hx-surface))' : 'var(--hx-surface-2)',
									transition: 'border-color .2s var(--hx-ease), background .2s var(--hx-ease)',
								}}
							>
								<div style={{ marginBottom: 10, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--hx-border)', opacity: sel ? 1 : 0.7, transition: 'opacity .2s var(--hx-ease)' }}>
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
				<HxHead
					iconChildren={IC.filePlus}
					iconColor="#737373"
					title={__( 'Bring your own design', 'hatch-connect' )}
					desc={__( 'Use a design of your own instead of the three above. This is not available yet.', 'hatch-connect' )}
					mb={0}
					action={<HxBadge color="neutral">{__( 'Coming soon', 'hatch-connect' )}</HxBadge>}
				/>
			</HxCard>

			{/* v0.50.16. Brand colors + color mode + typography + layout in one
			    card, with a design.md upload row at the bottom so users who
			    already have a token file can drop it in and skip every
			    individual picker. */}
			<HxCard>
				<HxHead
					iconChildren={IC.slidersHorizontal}
					iconColor="#ff6b00"
					title={__( 'Typography, colors and layout', 'hatch-connect' )}
					desc={__( 'Set your brand colors, fonts, spacing and borders. Upload a design.md file to fill them all in at once, or change each one below.', 'hatch-connect' )}
					mb={16}
				/>

				<HxGL>{__( 'Brand colors', 'hatch-connect' )}</HxGL>
				{/* Whitelist canonical brand color slots. The stored option can carry
				    legacy siblings (bg, fg, font_heading); rendering ALL keys as
				    <input type="color"> created duplicate rows and a broken picker
				    on the font_heading string. */}
				{[
					['primary',    __( 'Primary', 'hatch-connect' )],
					['secondary',  __( 'Secondary', 'hatch-connect' )],
					['accent',     __( 'Accent', 'hatch-connect' )],
					['background', __( 'Background', 'hatch-connect' )],
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
									value={hexOr(v, '#0a0a0a')}
									/* translators: %s: brand color name, for example Primary or Accent */
									aria-label={sprintf( __( '%s color picker', 'hatch-connect' ), label )}
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
					label={__( 'Color mode', 'hatch-connect' )}
					desc={__( 'Light or Dark keeps the site in one look. Auto follows each visitor\'s device setting.', 'hatch-connect' )}
					path="design.mode"
					current={mode}
					options={[
						{ id: 'light', label: __( 'Light', 'hatch-connect' ) },
						{ id: 'dark',  label: __( 'Dark', 'hatch-connect' ) },
						{ id: 'auto',  label: __( 'Auto', 'hatch-connect' ) },
					]}
					last
				/>

				<HxGL>{__( 'Typography', 'hatch-connect' )}</HxGL>
				<HxRow label={__( 'Heading font', 'hatch-connect' )} desc={__( 'Used for headings across the site.', 'hatch-connect' )}>
					<div style={{ width: 220 }}>
						<FontSelect ariaLabel={__( 'Heading font', 'hatch-connect' )} value={fontHead} onChange={(e) => { setSetting('design.font_heading', e.target.value); onDirty(); }} />
					</div>
				</HxRow>
				<HxRow label={__( 'Body font', 'hatch-connect' )} desc={__( 'Used for paragraphs, lists, and interface text.', 'hatch-connect' )} last>
					<div style={{ width: 220 }}>
						<FontSelect ariaLabel={__( 'Body font', 'hatch-connect' )} value={fontBody} onChange={(e) => { setSetting('design.font_body', e.target.value); onDirty(); }} />
					</div>
				</HxRow>

				<HxGL>{__( 'Layout', 'hatch-connect' )}</HxGL>
				<ChipRow
					label={__( 'Density', 'hatch-connect' )}
					desc={__( 'How much space sits between elements on every page.', 'hatch-connect' )}
					path="design.layout.density"
					current={layout.density}
					options={[
						{ id: 'compact',     label: __( 'Compact', 'hatch-connect' ) },
						{ id: 'comfortable', label: __( 'Comfortable', 'hatch-connect' ) },
						{ id: 'spacious',    label: __( 'Spacious', 'hatch-connect' ) },
					]}
				/>
				<ChipRow
					label={__( 'Roundness', 'hatch-connect' )}
					desc={__( 'How round the corners of cards and boxes are. Buttons use the Button style setting below.', 'hatch-connect' )}
					path="design.layout.rounded"
					current={layout.rounded ?? layout.roundness}
					options={[
						{ id: 'sharp',  label: __( 'Sharp', 'hatch-connect' ) },
						{ id: 'smooth', label: __( 'Default', 'hatch-connect' ) },
						{ id: 'extra',  label: __( 'Extra round', 'hatch-connect' ) },
					]}
				/>
				<ChipRow
					label={__( 'Max content width', 'hatch-connect' )}
					desc={__( 'The widest the page content can be.', 'hatch-connect' )}
					path="design.layout.max_width"
					current={layout.max_width ?? layout.maxWidth}
					options={[
						{ id: '720',  label: '720px' },
						{ id: '1160', label: '1160px' },
						{ id: '1320', label: '1320px' },
					]}
				/>
				<ChipRow
					label={__( 'Button style', 'hatch-connect' )}
					desc={__( 'Corner shape for buttons, set separately from container roundness.', 'hatch-connect' )}
					path="design.layout.button_style"
					current={layout.button_style ?? layout.buttonStyle}
					options={[
						{ id: 'pill',    label: __( 'Pill', 'hatch-connect' ) },
						{ id: 'rounded', label: __( 'Rounded', 'hatch-connect' ) },
						{ id: 'sharp',   label: __( 'Sharp', 'hatch-connect' ) },
					]}
					last
				/>

				<HxGL>{__( 'Borders & shadows', 'hatch-connect' )}</HxGL>
				<HxRow label={__( 'Border color', 'hatch-connect' )} desc={__( 'Used on cards, dividers and outlined buttons.', 'hatch-connect' )}>
					<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
						<input
							type="color"
							value={hexOr(borders.color, '#e5e5e5')}
							aria-label={__( 'Border color picker', 'hatch-connect' )}
							onChange={(e) => { setSetting('borders.color', e.target.value); onDirty(); }}
							style={colorInputStyle}
						/>
						<div style={{ width: 140 }}>
							<HxInp value={borders.color || ''} mono onChange={onText('borders.color')} />
						</div>
					</div>
				</HxRow>
				<ChipRow
					label={__( 'Shadow preset', 'hatch-connect' )}
					desc={__( 'How raised cards and popovers look. None gives a flat design.', 'hatch-connect' )}
					path="borders.shadow"
					current={borders.shadow}
					options={[
						{ id: 'none',     label: __( 'None', 'hatch-connect' ) },
						{ id: 'soft',     label: __( 'Soft', 'hatch-connect' ) },
						{ id: 'medium',   label: __( 'Medium', 'hatch-connect' ) },
						{ id: 'dramatic', label: __( 'Dramatic', 'hatch-connect' ) },
					]}
					last
				/>

				<HxGL>{__( 'Screen sizes', 'hatch-connect' )}</HxGL>
				{[
					{ key: 'mobile',  label: __( 'Mobile', 'hatch-connect' ),  desc: __( 'Screens narrower than this (in pixels) use the phone layout.', 'hatch-connect' ) },
					{ key: 'tablet',  label: __( 'Tablet', 'hatch-connect' ),  desc: __( 'Screens narrower than this (in pixels) use the tablet layout.', 'hatch-connect' ) },
					{ key: 'desktop', label: __( 'Desktop', 'hatch-connect' ), desc: __( 'Screens wider than this (in pixels) use the wide-screen layout.', 'hatch-connect' ) },
				].map((bp, i, arr) => (
					<HxRow
						key={bp.key}
						label={bp.label}
						desc={bp.desc}
						last={i === arr.length - 1}
					>
						<div style={{ width: 110 }}>
							<HxInp
								type="number"
								mono
								min={0}
								step={1}
								value={breakpoints[bp.key] || 0}
								/* translators: %s: device size name, for example Mobile or Tablet */
								ariaLabel={sprintf( __( '%s breakpoint in pixels', 'hatch-connect' ), bp.label )}
								onChange={(e) => { setSetting(`breakpoints.${bp.key}`, parseInt(e.target.value, 10) || 0); onDirty(); }}
							/>
						</div>
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
						{__( 'Import all of these settings from a design.md file.', 'hatch-connect' )}
						<span className="hx-help" style={{ marginInlineStart: 8, color: 'var(--hx-subtle)' }}>
							{state.design_md ? __( 'A design.md file is saved.', 'hatch-connect' ) : __( 'No design.md file uploaded.', 'hatch-connect' )}
						</span>
					</div>
					<HxBtn
						variant="ghost"
						size="sm"
						onClick={() => { const el = document.getElementById('hatch-designmd-file'); if (el) el.click(); }}
					>
						<HxIcon size={13}>{IC.upload}</HxIcon>
						{__( 'Upload', 'hatch-connect' )}
					</HxBtn>
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
					iconChildren={IC.panelsTopBottom}
					iconColor="#2563eb"
					title={__( 'Header & footer', 'hatch-connect' )}
					desc={__( 'The header and footer shown on every page: how the header behaves when scrolling, the light and dark button, and your brand name or logo.', 'hatch-connect' )}
					mb={16}
				/>
				<HxGL>{__( 'Header', 'hatch-connect' )}</HxGL>
				<ChipRow
					label={__( 'Header scroll behavior', 'hatch-connect' )}
					desc={__( 'Sticky keeps the header at the top of the screen. Hide on scroll tucks it away while scrolling down.', 'hatch-connect' )}
					path="header.sticky"
					current={header.sticky}
					options={[
						{ id: 'sticky',         label: __( 'Sticky', 'hatch-connect' ) },
						{ id: 'static',         label: __( 'Static', 'hatch-connect' ) },
						{ id: 'hide_on_scroll', label: __( 'Hide on scroll', 'hatch-connect' ) },
					]}
				/>
				<ChipRow
					label={__( 'Brand name or logo', 'hatch-connect' )}
					desc={__( 'What appears next to the navigation.', 'hatch-connect' )}
					path="header.brand_mark"
					current={header.brand_mark}
					options={[
						{ id: 'icon_text', label: __( 'Icon + text', 'hatch-connect' ) },
						{ id: 'text',      label: __( 'Text only', 'hatch-connect' ) },
						{ id: 'initial',   label: __( 'Initial only', 'hatch-connect' ) },
					]}
				/>
				{/* v0.50.31 - Logo / Text / Both control. When a logo is set in
				    the WP Customizer (Site Identity), the header can show logo
				    only, text only, both, or auto (logo if present, else text).
				    Independent from brand_mark above. */}
				<ChipRow
					label={__( 'Brand display', 'hatch-connect' )}
					desc={__( 'Show the site logo, the site title, or both. Auto uses the logo if you have uploaded one, otherwise the title.', 'hatch-connect' )}
					path="header.brand_display"
					current={header.brand_display || 'auto'}
					options={[
						{ id: 'auto', label: __( 'Auto', 'hatch-connect' ) },
						{ id: 'logo', label: __( 'Logo only', 'hatch-connect' ) },
						{ id: 'text', label: __( 'Text only', 'hatch-connect' ) },
						{ id: 'both', label: __( 'Logo + text', 'hatch-connect' ) },
					]}
				/>
				{/* v0.50.21 - Blur is meaningless on a static (non-overlapping) header. */}
				{header.sticky !== 'static' && (
					<HxRow label={__( 'Blurred header background', 'hatch-connect' )} desc={__( 'Lets the page show through the header as a soft blur.', 'hatch-connect' )}>
						<HxToggle ariaLabel={__( 'Blurred header background', 'hatch-connect' )} on={!!header.blur} onChange={onToggle('header.blur')} />
					</HxRow>
				)}
				<HxRow label={__( 'Light and dark button', 'hatch-connect' )} desc={__( 'Adds a sun and moon button to the header so visitors can switch between light and dark.', 'hatch-connect' )} last>
					<HxToggle ariaLabel={__( 'Light and dark button', 'hatch-connect' )} on={!!header.color_mode_button} onChange={onToggle('header.color_mode_button')} />
				</HxRow>

				<HxGL>{__( 'Footer', 'hatch-connect' )}</HxGL>
				<FeatureToggle slug="built_by_hatch" last />
			</HxCard>

			{/* Reading Experience (single posts) */}
			<HxCard>
				<HxHead
					iconChildren={IC.bookOpen}
					iconColor="#16a34a"
					title={__( 'Reading experience', 'hatch-connect' )}
					desc={__( 'Settings for single posts: dates, reading time, breadcrumbs, table of contents and author. Turn a feature on first, then adjust how it looks.', 'hatch-connect' )}
					mb={16}
				/>

				<HxGL>{__( 'Show on single posts', 'hatch-connect' )}</HxGL>
				<FeatureToggle slug="progress_bar" />
				<FeatureToggle slug="toc_sidebar" />
				<FeatureToggle slug="breadcrumb" />
				<FeatureToggle slug="reading_time" />
				<FeatureToggle slug="last_updated" />
				<FeatureToggle slug="author_bio" last />

				<HxGL>{__( 'Single-post template', 'hatch-connect' )}</HxGL>
				<ChipRow
					label={__( 'Sidebar on single posts', 'hatch-connect' )}
					desc={__( 'This applies to single posts only, not to the blog list or other pages. None makes posts full width. Left or Right adds a sidebar with the table of contents, shown when the post has headings. The Docs design shows its category menu there instead.', 'hatch-connect' )}
					path="templates.single_sidebar"
					current={templates.single_sidebar}
					options={[
						{ id: 'none',  label: __( 'None', 'hatch-connect' ) },
						{ id: 'left',  label: __( 'Left', 'hatch-connect' ) },
						{ id: 'right', label: __( 'Right', 'hatch-connect' ) },
					]}
				/>
				<ChipRow
					label={__( 'Hero style', 'hatch-connect' )}
					desc={__( 'How the featured image appears above the post title.', 'hatch-connect' )}
					path="templates.single_hero"
					current={templates.single_hero}
					options={[
						{ id: 'featured', label: __( 'Featured', 'hatch-connect' ) },
						{ id: 'compact',  label: __( 'Compact', 'hatch-connect' ) },
						{ id: 'none',     label: __( 'None', 'hatch-connect' ) },
					]}
				/>
				<ChipRow
					label={__( 'Content width', 'hatch-connect' )}
					desc={__( 'Post width relative to the Max content width setting above.', 'hatch-connect' )}
					path="templates.single_width"
					current={templates.single_width}
					options={[
						{ id: 'narrow', label: __( 'Narrow', 'hatch-connect' ) },
						{ id: 'medium', label: __( 'Medium', 'hatch-connect' ) },
						{ id: 'wide',   label: __( 'Wide', 'hatch-connect' ) },
					]}
					last
				/>

				{/* v0.50.21 - Style controls render only while their parent
				    visibility toggle is on, so there is no dead UI. */}
				<HxGL>{__( 'Style', 'hatch-connect' )}</HxGL>
				<ChipRow
					label={__( 'Date format', 'hatch-connect' )}
					desc={__( 'Examples: May 19, 2026 / May 19 / 3 days ago.', 'hatch-connect' )}
					path="reading.date_format"
					current={reading.date_format}
					options={[
						{ id: 'long',     label: __( 'Long', 'hatch-connect' ) },
						{ id: 'short',    label: __( 'Short', 'hatch-connect' ) },
						{ id: 'relative', label: __( 'Relative', 'hatch-connect' ) },
					]}
				/>
				{!!features.reading_time && (
					<ChipRow
						label={__( 'Reading-time wording', 'hatch-connect' )}
						desc={__( 'How the reading-time label reads, or hide it.', 'hatch-connect' )}
						path="reading.reading_time_label"
						current={reading.reading_time_label}
						options={[
							{ id: 'min_read', label: __( '“5 min read”', 'hatch-connect' ) },
							{ id: 'mins',     label: __( '“5 mins”', 'hatch-connect' ) },
							{ id: 'hidden',   label: __( 'Hide', 'hatch-connect' ) },
						]}
					/>
				)}
				{!!features.breadcrumb && (
					<ChipRow
						label={__( 'Breadcrumb separator', 'hatch-connect' )}
						desc={__( 'Character shown between breadcrumb items.', 'hatch-connect' )}
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
							label={__( 'Table of contents depth', 'hatch-connect' )}
							desc={__( 'Which heading levels appear in the table of contents.', 'hatch-connect' )}
							path="reading.toc_depth"
							current={reading.toc_depth}
							options={[
								{ id: 'h2',       label: __( 'H2 only', 'hatch-connect' ) },
								{ id: 'h2_h3',    label: __( 'H2 + H3', 'hatch-connect' ) },
								{ id: 'h2_h3_h4', label: __( 'H2 to H4', 'hatch-connect' ) },
							]}
						/>
						<HxRow label={__( 'Table of contents title', 'hatch-connect' )} desc={__( 'The title above the table of contents, for example "On this page".', 'hatch-connect' )}>
							<div style={{ width: 200 }}>
								<HxInp value={reading.toc_label || ''} onChange={onText('reading.toc_label')} placeholder={__( 'On this page', 'hatch-connect' )} />
							</div>
						</HxRow>
					</>
				)}
				{!!features.author_bio && (
					<ChipRow
						label={__( 'Author avatar shape', 'hatch-connect' )}
						desc={__( 'Used on the author byline and the author bio card.', 'hatch-connect' )}
						path="reading.author_avatar_shape"
						current={reading.author_avatar_shape}
						options={[
							{ id: 'circle',  label: __( 'Circle', 'hatch-connect' ) },
							{ id: 'rounded', label: __( 'Rounded', 'hatch-connect' ) },
							{ id: 'square',  label: __( 'Square', 'hatch-connect' ) },
						]}
					/>
				)}
				{!!features.progress_bar && (
					<>
						<ChipRow
							label={__( 'Progress bar position', 'hatch-connect' )}
							desc={__( 'Show the progress bar at the top or bottom of the screen.', 'hatch-connect' )}
							path="reading.progress_bar_position"
							current={reading.progress_bar_position}
							options={[
								{ id: 'top',    label: __( 'Top', 'hatch-connect' ) },
								{ id: 'bottom', label: __( 'Bottom', 'hatch-connect' ) },
							]}
						/>
						<ChipRow
							label={__( 'Progress bar color', 'hatch-connect' )}
							desc={__( 'Uses one of your brand colors.', 'hatch-connect' )}
							path="reading.progress_bar_color"
							current={reading.progress_bar_color}
							options={[
								{ id: 'primary', label: __( 'Primary', 'hatch-connect' ) },
								{ id: 'accent',  label: __( 'Accent', 'hatch-connect' ) },
							]}
						/>
					</>
				)}
				<HxRow
					label={__( 'Links to headings', 'hatch-connect' )}
					desc={__( 'Shows a # next to a heading when a reader points at it, so they can share a link to that section.', 'hatch-connect' )}
					last
				>
					<HxToggle ariaLabel={__( 'Links to headings', 'hatch-connect' )} on={!!reading.heading_anchors} onChange={onToggle('reading.heading_anchors')} />
				</HxRow>
			</HxCard>

			{/* Post Navigation & Sharing */}
			<HxCard>
				<HxHead
					iconChildren={IC.share2}
					iconColor="#6366f1"
					title={__( 'Post navigation & sharing', 'hatch-connect' )}
					desc={__( 'Share buttons, previous and next links, and related posts. Choose which share networks appear.', 'hatch-connect' )}
					mb={16}
				/>

				{/* v0.50.21 - sub-option groups below render only while their
				    parent toggle is on. */}
				<HxGL>{__( 'Show on single posts', 'hatch-connect' )}</HxGL>
				<FeatureToggle slug="next_prev_nav" />
				<FeatureToggle slug="related_posts" />
				<FeatureToggle slug="sticky_share" last />

				{!!features.sticky_share && (
					<>
						<HxGL>{__( 'Share networks', 'hatch-connect' )}</HxGL>
						{[
							['x',        'X'],
							['linkedin', 'LinkedIn'],
							['whatsapp', 'WhatsApp'],
							['copy',     __( 'Copy link', 'hatch-connect' )],
							['facebook', 'Facebook'],
							['reddit',   'Reddit'],
							['email',    __( 'Email', 'hatch-connect' )],
						].map(([k, label], i, arr) => (
							<HxRow key={k} label={label} desc={null} last={i === arr.length - 1}>
								<HxToggle ariaLabel={label} on={!!share[k]} onChange={onToggle(`share.${k}`)} />
							</HxRow>
						))}

						<HxGL>{__( 'Share bar', 'hatch-connect' )}</HxGL>
						<ChipRow
							label={__( 'Share bar position', 'hatch-connect' )}
							desc={__( 'Where the share buttons appear on single posts.', 'hatch-connect' )}
							path="share.position"
							current={share.position}
							options={[
								{ id: 'inline', label: __( 'Inline (bottom)', 'hatch-connect' ) },
								{ id: 'sticky', label: __( 'Sticky (side)', 'hatch-connect' ) },
								{ id: 'both',   label: __( 'Both', 'hatch-connect' ) },
							]}
							last
						/>
					</>
				)}

				{!!features.related_posts && (
					<>
						<HxGL>{__( 'Related posts', 'hatch-connect' )}</HxGL>
						<ChipRow
							label={__( 'Count', 'hatch-connect' )}
							desc={__( 'How many related posts appear below each post.', 'hatch-connect' )}
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
							label={__( 'Source', 'hatch-connect' )}
							desc={__( 'How related posts are chosen.', 'hatch-connect' )}
							path="post_navigation.related_source"
							current={postNav.related_source}
							options={[
								{ id: 'category', label: __( 'Same category', 'hatch-connect' ) },
								{ id: 'tags',     label: __( 'Same tags', 'hatch-connect' ) },
								{ id: 'mixed',    label: __( 'Mixed', 'hatch-connect' ) },
							]}
							last
						/>
					</>
				)}
			</HxCard>

			{/* Blog Index & Homepage */}
			<HxCard>
				<HxHead
					iconChildren={IC.layoutGrid}
					iconColor="#d97706"
					title={__( 'Blog index & homepage', 'hatch-connect' )}
					desc={__( 'How the list of posts looks: columns, page numbers, featured post and topics.', 'hatch-connect' )}
					mb={16}
				/>

				<HxGL>{__( 'Visibility', 'hatch-connect' )}</HxGL>
				<FeatureToggle slug="category_tabs" />
				<HxRow label={__( 'Featured post on blog index', 'hatch-connect' )} desc={__( 'A large card that highlights the latest post.', 'hatch-connect' )}>
					<HxToggle ariaLabel={__( 'Featured post on blog index', 'hatch-connect' )} on={!!blogIndex.show_hero} onChange={onToggle('blog_index.show_hero')} />
				</HxRow>
				<HxRow label={__( 'Topics section on homepage', 'hatch-connect' )} desc={__( 'Category tiles so visitors can browse by topic.', 'hatch-connect' )} last>
					<HxToggle ariaLabel={__( 'Topics section on homepage', 'hatch-connect' )} on={!!blogIndex.show_topics} onChange={onToggle('blog_index.show_topics')} />
				</HxRow>

				<HxGL>{__( 'Card style', 'hatch-connect' )}</HxGL>
				<HxRow label={__( 'Show excerpt under post titles', 'hatch-connect' )} desc={__( 'Shows the post excerpt below the title on archive cards.', 'hatch-connect' )}>
					<HxToggle ariaLabel={__( 'Show excerpt under post titles', 'hatch-connect' )} on={templates.archive_excerpt !== 'false' && templates.archive_excerpt !== false} onChange={(v) => { setSetting('templates.archive_excerpt', v ? 'true' : 'false'); onDirty(); }} />
				</HxRow>
				<HxRow label={__( 'Show search on 404 page', 'hatch-connect' )} desc={__( 'Adds a search box to the 404 page so visitors can look for what they were after.', 'hatch-connect' )} last>
					<HxToggle ariaLabel={__( 'Show search on 404 page', 'hatch-connect' )} on={templates.not_found_search !== 'false' && templates.not_found_search !== false} onChange={(v) => { setSetting('templates.not_found_search', v ? 'true' : 'false'); onDirty(); }} />
				</HxRow>

				<HxGL>{__( 'Layout', 'hatch-connect' )}</HxGL>
				<ChipRow
					label={__( 'Archive grid columns', 'hatch-connect' )}
					desc={__( 'How many post cards appear per row on the blog index.', 'hatch-connect' )}
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
					label={__( 'Pagination style', 'hatch-connect' )}
					desc={__( 'How readers move through older posts.', 'hatch-connect' )}
					path="blog_index.pagination_style"
					current={blogIndex.pagination_style}
					options={[
						{ id: 'load_more', label: __( 'Load more', 'hatch-connect' ) },
						{ id: 'numbered',  label: __( 'Numbered', 'hatch-connect' ) },
						{ id: 'infinite',  label: __( 'Infinite scroll', 'hatch-connect' ) },
					]}
					last
				/>
			</HxCard>

			{/* Images & Media */}
			<HxCard>
				<HxHead
					iconChildren={IC.image}
					iconColor="#8b5cf6"
					title={__( 'Images & media', 'hatch-connect' )}
					desc={__( 'How images load and how they respond when visitors interact with them.', 'hatch-connect' )}
					mb={16}
				/>
				<HxRow label={__( 'Lightbox on click', 'hatch-connect' )} desc={__( 'Clicking an image in a post opens it in a full-screen overlay.', 'hatch-connect' )}>
					<HxToggle ariaLabel={__( 'Lightbox on click', 'hatch-connect' )} on={!!images.lightbox} onChange={onToggle('images.lightbox')} />
				</HxRow>
				<HxRow label={__( 'Hover zoom on cards', 'hatch-connect' )} desc={__( 'Slightly enlarges post thumbnails when a visitor points at them.', 'hatch-connect' )}>
					<HxToggle ariaLabel={__( 'Hover zoom on cards', 'hatch-connect' )} on={!!images.hover_zoom} onChange={onToggle('images.hover_zoom')} />
				</HxRow>
				<HxRow label={__( 'Load images as people scroll', 'hatch-connect' )} desc={__( 'Waits to load images that are off screen until they are needed, so the page opens faster.', 'hatch-connect' )}>
					<HxToggle ariaLabel={__( 'Load images as people scroll', 'hatch-connect' )} on={!!images.lazy_load} onChange={onToggle('images.lazy_load')} />
				</HxRow>
				<HxRow label={__( 'Sharp images on high-resolution screens', 'hatch-connect' )} desc={__( 'Sends larger image versions to screens that show fine detail.', 'hatch-connect' )}>
					<HxToggle ariaLabel={__( 'Sharp images on high-resolution screens', 'hatch-connect' )} on={!!images.retina_2x} onChange={onToggle('images.retina_2x')} />
				</HxRow>
				<HxRow label={__( 'Colored backup for missing images', 'hatch-connect' )} desc={__( 'Shows a soft gradient in your brand colors when a post has no featured image.', 'hatch-connect' )}>
					<HxToggle ariaLabel={__( 'Colored backup for missing images', 'hatch-connect' )} on={!!images.fallback_gradient} onChange={onToggle('images.fallback_gradient')} />
				</HxRow>
				<ChipRow
					label={__( 'Featured image shape', 'hatch-connect' )}
					desc={__( 'The shape of post thumbnails and the large image at the top of a post.', 'hatch-connect' )}
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
					iconChildren={IC.chevronsRight}
					iconColor="#0d9488"
					title={__( 'Animation & motion', 'hatch-connect' )}
					desc={__( 'Page transitions and motion. Visitors whose device asks for less motion are respected.', 'hatch-connect' )}
					mb={16}
				/>
				<HxRow label={__( 'Page transitions', 'hatch-connect' )} desc={__( 'Pages fade in instead of flashing white.', 'hatch-connect' )}>
					<HxToggle ariaLabel={__( 'Page transitions', 'hatch-connect' )} on={!!animation.page_transitions} onChange={onToggle('animation.page_transitions')} />
				</HxRow>
				<HxRow label={__( 'Respect the less-motion setting', 'hatch-connect' )} desc={__( 'Turns off animation for visitors whose device asks for less motion.', 'hatch-connect' )} last>
					<HxToggle ariaLabel={__( 'Respect the less-motion setting', 'hatch-connect' )} on={!!animation.respect_reduced_motion} onChange={onToggle('animation.respect_reduced_motion')} />
				</HxRow>
			</HxCard>

			{/* v0.50.31 - Site Identity card removed. WordPress owns site
			    title and tagline (Settings, General); RankMath/Yoast own the
			    default OG image; logo and favicon come from the Customizer.
			    One source of truth per concern. */}

		</div>
		</DesignCtx.Provider>
	);
}

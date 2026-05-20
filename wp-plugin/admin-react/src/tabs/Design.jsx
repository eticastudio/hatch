import { useState } from '@wordpress/element';
import { HxIcon, HxToggle, HxCard, HxHead, HxRow, HxGL, HxInp, Chip, HxMediaInput } from '../components.jsx';
import { TP } from '../theme-previews.jsx';
import { FontSelect } from '../fonts.jsx';

export default function Design({ state, onDirty, setSetting }) {
	// v0.50.25 — Themes now sourced from boot state (state.themes) so the
	// authoritative label / description / demo URL / author / repo come from
	// PHP Hatch_Features::themes(). Local map adds the SVG previewKey + chip
	// color tint per slug — pure visual metadata that doesn't belong in PHP.
	const themeMeta = {
		blog:       { previewKey: 'Blog',       col: '#3b82f6' },
		tech:       { previewKey: 'Tech',       col: '#8b5cf6' },
		docs:       { previewKey: 'Data',       col: '#0d9488' },
		astropaper: { previewKey: 'AstroPaper', col: '#ff6b00' },
		astrowind:  { previewKey: 'AstroWind',  col: '#2563eb' },
		astronano:  { previewKey: 'Astro Nano', col: '#737373' },
	};
	const themes = (state.themes || []).map((t) => ({
		id:         t.id,
		name:       t.label || t.id,
		desc:       t.desc  || '',
		demo:       t.demo  || '',
		author:     t.author|| '',
		repo:       t.repo  || '',
		license:    t.license || '',
		previewKey: themeMeta[t.id]?.previewKey || 'Blog',
		col:        themeMeta[t.id]?.col || '#737373',
	}));

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

	// v0.50.15 — Aesthetic option groups. Defaults mirror PHP so the UI stays
	// fully usable even before the first save reaches the dispatcher.
	const share = state.share || { x: true, linkedin: true, whatsapp: true, copy: true, facebook: false, reddit: false, email: false, position: 'inline' };
	const header = state.header || { sticky: 'sticky', blur: true, color_mode_button: true, brand_mark: 'icon_text' };
	const reading = state.reading || { date_format: 'long', reading_time_label: 'min_read', breadcrumb_separator: 'slash', toc_depth: 'h2_h3', toc_label: 'On this page', author_avatar_shape: 'circle', progress_bar_position: 'top', progress_bar_color: 'primary', heading_anchors: false };
	const images = state.images || { lightbox: true, lazy_load: true, hover_zoom: true, fallback_gradient: true, retina_2x: true, aspect_ratio: '2_1' };
	const animation = state.animation || { page_transitions: true, respect_reduced_motion: true };
	const blogIndex = state.blog_index || { archive_grid: '3', pagination_style: 'load_more', show_hero: true, show_topics: true };
	const postNav = state.post_navigation || { related_count: 3, related_source: 'category' };

	const [openAdv, setOpenAdv] = useState(null);

	const onText   = (path) => (e) => { setSetting(path, e.target.value); onDirty(); };
	const onToggle = (path) => (v) => { setSetting(path, v); onDirty(); };
	const onChip   = (path, id) => () => { setSetting(path, id); onDirty(); };

	// v0.50.19 — ChipRow renders as an HxRow so every chip-pick setting uses
	// the SAME label/desc/control rhythm as every toggle. One byline style,
	// one vertical gap, one bottom border. Caller can pass `desc` + `last`.
	const ChipRow = ({ label, desc, path, current, options, last }) => (
		<HxRow label={label} desc={desc} last={last}>
			<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
				{options.map((o) => (
					<Chip key={o.id} label={o.label} active={String(current) === o.id} onClick={onChip(path, o.id)} />
				))}
			</div>
		</HxRow>
	);

	// v0.50.17 — Render a single Theme Features toggle by slug, so each one
	// can live inside the semantic card it belongs to (Reading / Sharing /
	// Blog Index / Footer) instead of clumped into a standalone Features card.
	// Looks up label + description from featureCatalog so we don't duplicate copy.
	const FeatureToggle = ({ slug, last = false }) => {
		const meta = featureCatalog.find((f) => f.slug === slug);
		if (!meta) return null;
		return (
			<HxRow label={meta.label} desc={meta.description} last={last}>
				<HxToggle on={!!features[slug]} onChange={(v) => { setSetting(`features.${slug}`, v); onDirty(); }} />
			</HxRow>
		);
	};

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
								<div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
									<div className="hx-desc" style={{ fontWeight: 700, color: 'var(--hx-fg)' }}>{t.name}</div>
									{t.demo && (
										<a
											href={t.demo}
											target="_blank"
											rel="noopener noreferrer"
											onClick={(e) => e.stopPropagation()}
											className="hx-help"
											style={{ color: 'var(--hx-subtle)', textDecoration: 'none', whiteSpace: 'nowrap' }}
											title={`Live demo of ${t.name}`}
										>
											Demo ↗
										</a>
									)}
								</div>
								{t.author && (
									<div className="hx-help" style={{ color: 'var(--hx-subtle)', marginBottom: 6 }}>
										by{' '}
										{t.repo ? (
											<a
												href={t.repo}
												target="_blank"
												rel="noopener noreferrer"
												onClick={(e) => e.stopPropagation()}
												style={{ color: 'var(--hx-muted)', textDecoration: 'none' }}
											>
												{t.author}
											</a>
										) : <span style={{ color: 'var(--hx-muted)' }}>{t.author}</span>}
										{t.license && <span> · {t.license}</span>}
									</div>
								)}
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

			{/* v0.50.16 — Theme → GLOBAL → Structure ordering per user request.
			    Brand colors + color mode + typography + layout merged into one
			    "Global Typography, Colors & Systems" card, with a design.md
			    upload row at the very top so users who already have a token
			    file can drop it in and skip every individual picker. */}
			<HxCard>
				<HxHead
					iconChildren={<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></>}
					iconColor="#ff6b00"
					title="Global Typography, Colors & Systems"
					desc="Everything tokens. Drop in a design.md to set every value at once, or tune each below."
					mb={16}
				/>

				{/* Brand Colors — one HxRow per color so every row has the
				    same label/desc/control rhythm as the toggles. */}
				<HxGL>Brand colors</HxGL>
				{Object.entries(brand).map(([k, v], idx, arr) => (
					<HxRow
						key={k}
						label={k.charAt(0).toUpperCase() + k.slice(1)}
						desc={null}
					>
						<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
							<input
								type="color"
								value={v}
								onChange={(e) => { setSetting(`design.brand.${k}`, e.target.value); onDirty(); }}
								style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--hx-border-2)', cursor: 'pointer', padding: 2, background: 'var(--hx-surface)' }}
							/>
							<div style={{ width: 140 }}>
								<HxInp value={v} mono onChange={(e) => { setSetting(`design.brand.${k}`, e.target.value); onDirty(); }} />
							</div>
						</div>
					</HxRow>
				))}
				<ChipRow
					label="Color mode"
					desc="Light / Dark / Auto. Auto follows the visitor's OS preference."
					path="design.mode"
					current={mode}
					options={[
						{ id: 'light', label: 'Light' },
						{ id: 'dark',  label: 'Dark' },
						{ id: 'auto',  label: 'Auto' },
					]}
					last
				/>

				{/* Typography — one HxRow per font slot. */}
				<HxGL>Typography</HxGL>
				<HxRow label="Heading font" desc="Used for h1–h4 across the site.">
					<div style={{ width: 220 }}>
						<FontSelect value={fontHead} onChange={(e) => { setSetting('design.font_heading', e.target.value); onDirty(); }} />
					</div>
				</HxRow>
				<HxRow label="Body font" desc="Default for paragraphs, lists, and UI text." last>
					<div style={{ width: 220 }}>
						<FontSelect value={fontBody} onChange={(e) => { setSetting('design.font_body', e.target.value); onDirty(); }} />
					</div>
				</HxRow>

				{/* Layout — every chip-pick is a ChipRow now. */}
				<HxGL>Layout</HxGL>
				<ChipRow
					label="Density"
					desc="Controls the vertical breathing room across every page."
					path="design.layout.density"
					current={layout.density}
					options={[
						{ id: 'compact',     label: 'Compact' },
						{ id: 'comfortable', label: 'Comfortable' },
						{ id: 'spacious',    label: 'Spacious' },
					]}
				/>
				<ChipRow
					label="Roundness"
					desc="Container corner radius. Buttons use the Button style picker below."
					path="design.layout.rounded"
					current={layout.rounded ?? layout.roundness}
					options={[
						{ id: 'sharp',  label: 'Sharp' },
						{ id: 'smooth', label: 'Default' },
						{ id: 'extra',  label: 'Extra round' },
					]}
				/>
				<ChipRow
					label="Max content width"
					desc="The outer page wrapper width. Every CPT / post / page respects this."
					path="design.layout.max_width"
					current={layout.max_width ?? layout.maxWidth}
					options={[
						{ id: '720',  label: '720px' },
						{ id: '1160', label: '1160px' },
						{ id: '1320', label: '1320px' },
					]}
				/>
				<ChipRow
					label="Button style"
					desc="Per-button radius — pick pill, rounded, or sharp independently of container roundness."
					path="design.layout.button_style"
					current={layout.button_style ?? layout.buttonStyle}
					options={[
						{ id: 'pill',    label: 'Pill' },
						{ id: 'rounded', label: 'Rounded' },
						{ id: 'sharp',   label: 'Sharp' },
					]}
					last
				/>

				{/* Borders + Breakpoints — one HxRow per setting. */}
				<HxGL>Borders & shadows</HxGL>
				<HxRow label="Border color" desc="Used by cards, dividers, and outlined buttons.">
					<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
						<input
							type="color"
							value={borders.color || '#e5e5e5'}
							onChange={(e) => { setSetting('borders.color', e.target.value); onDirty(); }}
							style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--hx-border-2)', cursor: 'pointer', padding: 2, background: 'var(--hx-surface)' }}
						/>
						<div style={{ width: 140 }}>
							<HxInp value={borders.color || '#e5e5e5'} mono onChange={onText('borders.color')} />
						</div>
					</div>
				</HxRow>
				<ChipRow
					label="Shadow preset"
					desc="Card / popover elevation. None ships a perfectly flat design."
					path="borders.shadow"
					current={borders.shadow}
					options={[
						{ id: 'none',     label: 'None' },
						{ id: 'soft',     label: 'Soft' },
						{ id: 'medium',   label: 'Medium' },
						{ id: 'dramatic', label: 'Dramatic' },
					]}
					last
				/>

				<HxGL>Breakpoints</HxGL>
				{['mobile', 'tablet', 'desktop'].map((k, i, arr) => (
					<HxRow
						key={k}
						label={k.charAt(0).toUpperCase() + k.slice(1)}
						desc={k === 'mobile' ? 'Below this width — single column.' : k === 'tablet' ? 'Below this width — tablet-grade layout.' : 'Above this width — wide-screen layout.'}
						last={i === arr.length - 1}
					>
						<input
							type="number" min="0" step="1"
							value={breakpoints[k] || 0}
							onChange={(e) => { setSetting(`breakpoints.${k}`, parseInt(e.target.value, 10) || 0); onDirty(); }}
							style={{ width: 110, height: 32, padding: '0 10px', borderRadius: 6, border: '1px solid var(--hx-border-2)', fontSize: 13, outline: 'none', fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', color: 'var(--hx-fg)', background: 'var(--hx-surface)', boxSizing: 'border-box', textAlign: 'right' }}
						/>
					</HxRow>
				))}

				{/* v0.50.18 — Compact design.md upload row at the bottom of the
				    Global card. One line, no textarea — just the CTA + upload
				    button + "present/none" status. */}
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
						Configure all automatically from your{' '}
						<code style={{ fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: 12 }}>design.md</code>{' '}
						file
						<span className="hx-help" style={{ marginLeft: 8, color: 'var(--hx-subtle)' }}>
							{state.design_md ? '· present' : '· none uploaded'}
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
						Upload
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

			{/* v0.50.17 — Standalone Theme Features card REMOVED. Its 11
			    toggles are now rendered inside their semantic cards below
			    via <FeatureToggle slug="..." />, one source of truth, no
			    duplicate scrolling between cards. */}

			{/* ───────────────────────────────────────────────────────────────
			    v0.50.15 — Seven new aesthetic groups. Order picked for the user
			    mental model: chrome surrounding content first (Header / Footer),
			    then the content itself (Reading), then the journey out of
			    content (Post nav + Sharing), then the listing surface (Blog
			    index), then media, then motion. Each card writes to its own
			    `hatch_design_*` option group via the unified dispatcher.
			   ─────────────────────────────────────────────────────────────── */}

			{/* Header & Footer */}
			<HxCard>
				<HxHead
					iconChildren={<><rect x="3" y="4" width="18" height="4" rx="1" /><rect x="3" y="16" width="18" height="4" rx="1" /></>}
					iconColor="#0ea5e9"
					title="Header & Footer"
					desc="Site chrome that wraps every page. Sticky behaviour, color-mode button, brand mark."
					mb={16}
				/>
				<HxGL>Header</HxGL>
				<ChipRow
					label="Header scroll behavior"
					desc="Sticky pins it to the top; Hide-on-scroll tucks it away when scrolling down."
					path="header.sticky"
					current={header.sticky}
					options={[
						{ id: 'sticky',         label: 'Sticky' },
						{ id: 'static',         label: 'Static' },
						{ id: 'hide_on_scroll', label: 'Hide on scroll' },
					]}
				/>
				<ChipRow
					label="Brand mark"
					desc="What sits to the left of the nav."
					path="header.brand_mark"
					current={header.brand_mark}
					options={[
						{ id: 'icon_text', label: 'Icon + text' },
						{ id: 'text',      label: 'Text only' },
						{ id: 'initial',   label: 'Initial only' },
					]}
				/>
				{/* v0.50.31 — Logo / Text / Both control. When a logo URL is set in
				    WP Customizer → Site Identity, the header can show logo only,
				    text only, both side-by-side, or auto (logo if present, else
				    text). Independent from brand_mark above. */}
				<ChipRow
					label="Brand display"
					desc="Show the site logo, the site title text, or both. Auto picks logo if uploaded, else text."
					path="header.brand_display"
					current={header.brand_display || 'auto'}
					options={[
						{ id: 'auto', label: 'Auto' },
						{ id: 'logo', label: 'Logo only' },
						{ id: 'text', label: 'Text only' },
						{ id: 'both', label: 'Logo + text' },
					]}
				/>
				{/* v0.50.21 — Blur is meaningless on a static (non-overlapping) header. */}
				{header.sticky !== 'static' && (
					<HxRow label="Translucent blur background" desc="Backdrop blur behind the header so content shows through.">
						<HxToggle on={!!header.blur} onChange={onToggle('header.blur')} />
					</HxRow>
				)}
				<HxRow label="Color-mode toggle button" desc="Adds a sun/moon button in the header so visitors flip light/dark themselves." last>
					<HxToggle on={!!header.color_mode_button} onChange={onToggle('header.color_mode_button')} />
				</HxRow>

				<HxGL>Footer</HxGL>
				<FeatureToggle slug="built_by_hatch" last />
			</HxCard>

			{/* Reading Experience (single posts) */}
			<HxCard>
				<HxHead
					iconChildren={<><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></>}
					iconColor="#16a34a"
					title="Reading Experience"
					desc="Chrome on individual blog posts — dates, reading time, breadcrumbs, TOC, author. Toggle visibility first, then style each one."
					mb={16}
				/>

				{/* Visibility toggles — single column of HxRows. */}
				<HxGL>Show on single posts</HxGL>
				<FeatureToggle slug="progress_bar" />
				<FeatureToggle slug="toc_sidebar" />
				<FeatureToggle slug="breadcrumb" />
				<FeatureToggle slug="reading_time" />
				<FeatureToggle slug="last_updated" />
				<FeatureToggle slug="author_bio" last />

				<HxGL>Single-post template</HxGL>
				<ChipRow
					label="Sidebar on single posts"
					desc="None = full-width content, no sidebar (post fills the whole container). Left / Right = table-of-contents sidebar at that position when the post has h2/h3 headings. Newspaper + Minimal themes render the TOC as a horizontal strip instead of a side column, so they always look single-column even with Left/Right selected."
					path="templates.single_sidebar"
					current={templates.single_sidebar}
					options={[
						{ id: 'none',  label: 'None' },
						{ id: 'left',  label: 'Left' },
						{ id: 'right', label: 'Right' },
					]}
				/>
				<ChipRow
					label="Hero style"
					desc="How the featured image renders above the post title."
					path="templates.single_hero"
					current={templates.single_hero}
					options={[
						{ id: 'featured', label: 'Featured' },
						{ id: 'compact',  label: 'Compact' },
						{ id: 'none',     label: 'None' },
					]}
				/>
				<ChipRow
					label="Content width"
					desc="Multiplier applied to the global Max content width for single posts."
					path="templates.single_width"
					current={templates.single_width}
					options={[
						{ id: 'narrow', label: 'Narrow' },
						{ id: 'medium', label: 'Medium' },
						{ id: 'wide',   label: 'Wide' },
					]}
					last
				/>

				{/* v0.50.21 — Style controls render conditionally on the
				    parent visibility toggle (Pro-dev relationship pattern). */}
				<HxGL>Style</HxGL>
				<ChipRow
					label="Date format"
					desc='"May 19, 2026" / "May 19" / "3 days ago".'
					path="reading.date_format"
					current={reading.date_format}
					options={[
						{ id: 'long',     label: 'Long' },
						{ id: 'short',    label: 'Short' },
						{ id: 'relative', label: 'Relative' },
					]}
				/>
				{!!features.reading_time && (
					<ChipRow
						label="Reading-time wording"
						desc="How the pill reads (or hide it entirely)."
						path="reading.reading_time_label"
						current={reading.reading_time_label}
						options={[
							{ id: 'min_read', label: '“5 min read”' },
							{ id: 'mins',     label: '“5 mins”' },
							{ id: 'hidden',   label: 'Hide' },
						]}
					/>
				)}
				{!!features.breadcrumb && (
					<ChipRow
						label="Breadcrumb separator"
						desc="Character between breadcrumb items."
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
							label="TOC depth"
							desc="Which heading levels appear in the Table of Contents."
							path="reading.toc_depth"
							current={reading.toc_depth}
							options={[
								{ id: 'h2',       label: 'H2 only' },
								{ id: 'h2_h3',    label: 'H2 + H3' },
								{ id: 'h2_h3_h4', label: 'H2 – H4' },
							]}
						/>
						<HxRow label="TOC heading label" desc='Heading shown above the TOC list (e.g. "On this page").'>
							<div style={{ width: 200 }}>
								<HxInp value={reading.toc_label || ''} onChange={onText('reading.toc_label')} placeholder="On this page" />
							</div>
						</HxRow>
					</>
				)}
				{!!features.author_bio && (
					<ChipRow
						label="Author avatar shape"
						desc="Used on the inline author byline and the author bio card."
						path="reading.author_avatar_shape"
						current={reading.author_avatar_shape}
						options={[
							{ id: 'circle',  label: 'Circle' },
							{ id: 'rounded', label: 'Rounded' },
							{ id: 'square',  label: 'Square' },
						]}
					/>
				)}
				{!!features.progress_bar && (
					<>
						<ChipRow
							label="Progress bar position"
							desc="Top or bottom of the viewport."
							path="reading.progress_bar_position"
							current={reading.progress_bar_position}
							options={[
								{ id: 'top',    label: 'Top' },
								{ id: 'bottom', label: 'Bottom' },
							]}
						/>
						<ChipRow
							label="Progress bar color"
							desc="Reads from your Global brand tokens."
							path="reading.progress_bar_color"
							current={reading.progress_bar_color}
							options={[
								{ id: 'primary', label: 'Primary' },
								{ id: 'accent',  label: 'Accent' },
							]}
						/>
					</>
				)}
				<HxRow
					label="Heading anchor links"
					desc="Show a # icon on hover so readers can permalink to a section."
					last
				>
					<HxToggle on={!!reading.heading_anchors} onChange={onToggle('reading.heading_anchors')} />
				</HxRow>
			</HxCard>

			{/* Post Navigation & Sharing */}
			<HxCard>
				<HxHead
					iconChildren={<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></>}
					iconColor="#6366f1"
					title="Post Navigation & Sharing"
					desc="Share rail, prev/next, related posts. Pick exactly which networks render — no force-installing buttons your audience doesn't use."
					mb={16}
				/>

				{/* Visibility toggles — single-column HxRow stack.
				    v0.50.21 — sub-option groups below render conditionally on
				    their parent. No dead UI when the parent is off. */}
				<HxGL>Show below each post</HxGL>
				<FeatureToggle slug="next_prev_nav" />
				<FeatureToggle slug="related_posts" />
				<FeatureToggle slug="sticky_share" last />

				{!!features.sticky_share && (
					<>
						<HxGL>Share networks</HxGL>
						{[
							['x',        'X (Twitter)'],
							['linkedin', 'LinkedIn'],
							['whatsapp', 'WhatsApp'],
							['copy',     'Copy link'],
							['facebook', 'Facebook'],
							['reddit',   'Reddit'],
							['email',    'Email'],
						].map(([k, label], i, arr) => (
							<HxRow key={k} label={label} desc={null} last={i === arr.length - 1}>
								<HxToggle on={!!share[k]} onChange={onToggle(`share.${k}`)} />
							</HxRow>
						))}

						<HxGL>Share bar</HxGL>
						<ChipRow
							label="Share bar position"
							desc="Where the network buttons sit on single posts."
							path="share.position"
							current={share.position}
							options={[
								{ id: 'inline', label: 'Inline (bottom)' },
								{ id: 'sticky', label: 'Sticky (side)' },
								{ id: 'both',   label: 'Both' },
							]}
							last
						/>
					</>
				)}

				{!!features.related_posts && (
					<>
						<HxGL>Related posts</HxGL>
						<ChipRow
							label="Count"
							desc="How many related posts to show below each single post."
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
							label="Source"
							desc="How related posts are picked."
							path="post_navigation.related_source"
							current={postNav.related_source}
							options={[
								{ id: 'category', label: 'Same category' },
								{ id: 'tags',     label: 'Same tags' },
								{ id: 'mixed',    label: 'Mixed' },
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
					title="Blog Index & Homepage"
					desc="Listing page layout, pagination style, hero section, topics."
					mb={16}
				/>

				{/* Visibility */}
				<HxGL>Visibility</HxGL>
				<FeatureToggle slug="category_tabs" />
				<HxRow label="Featured hero on blog index" desc="Big card highlighting the latest or most-popular post.">
					<HxToggle on={!!blogIndex.show_hero} onChange={onToggle('blog_index.show_hero')} />
				</HxRow>
				<HxRow label="Topics section on homepage" desc="Category tiles so visitors browse by topic." last>
					<HxToggle on={!!blogIndex.show_topics} onChange={onToggle('blog_index.show_topics')} />
				</HxRow>

				<HxGL>Card style</HxGL>
				<HxRow label="Show excerpt under post titles" desc="Renders the post excerpt below the title on archive cards.">
					<HxToggle on={templates.archive_excerpt !== 'false' && templates.archive_excerpt !== false} onChange={(v) => { setSetting('templates.archive_excerpt', v ? 'true' : 'false'); onDirty(); }} />
				</HxRow>
				<HxRow label="Show search on 404 page" desc="Adds a search box on the 404 page so visitors can recover from a broken link." last>
					<HxToggle on={templates.not_found_search !== 'false' && templates.not_found_search !== false} onChange={(v) => { setSetting('templates.not_found_search', v ? 'true' : 'false'); onDirty(); }} />
				</HxRow>

				<HxGL>Layout</HxGL>
				<ChipRow
					label="Archive grid columns"
					desc="How many post cards fit per row on the blog index."
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
					label="Pagination style"
					desc="How readers move through older posts."
					path="blog_index.pagination_style"
					current={blogIndex.pagination_style}
					options={[
						{ id: 'load_more', label: 'Load More' },
						{ id: 'numbered',  label: 'Numbered' },
						{ id: 'infinite',  label: 'Infinite' },
					]}
					last
				/>
			</HxCard>

			{/* Images & Media */}
			<HxCard>
				<HxHead
					iconChildren={<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></>}
					iconColor="#ec4899"
					title="Images & Media"
					desc="How images load, render, and respond to user interaction."
					mb={16}
				/>
				<HxRow label="Lightbox / popup on click" desc="In-content images open in a full-screen overlay on click.">
					<HxToggle on={!!images.lightbox} onChange={onToggle('images.lightbox')} />
				</HxRow>
				<HxRow label="Hover zoom on cards" desc="Slight scale-up on post-card thumbnails when the cursor hovers.">
					<HxToggle on={!!images.hover_zoom} onChange={onToggle('images.hover_zoom')} />
				</HxRow>
				<HxRow label="Lazy-load below the fold" desc="Defer loading off-screen images for a faster first paint.">
					<HxToggle on={!!images.lazy_load} onChange={onToggle('images.lazy_load')} />
				</HxRow>
				<HxRow label="Retina (2× srcset)" desc="Serve higher-DPI variants to Retina / 4K displays.">
					<HxToggle on={!!images.retina_2x} onChange={onToggle('images.retina_2x')} />
				</HxRow>
				<HxRow label="Fallback gradient" desc="When a post has no featured image, render a soft brand-colored gradient instead of a blank.">
					<HxToggle on={!!images.fallback_gradient} onChange={onToggle('images.fallback_gradient')} />
				</HxRow>
				<ChipRow
					label="Featured-image aspect ratio"
					desc="Shape of post-card thumbnails and the single-post hero image."
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
					title="Animation & Motion"
					desc="Page transitions and motion preferences. Reduced-motion respects the OS-level accessibility flag."
					mb={16}
				/>
				<HxRow label="Page transitions" desc="Astro ClientRouter — pages fade in instead of full reload.">
					<HxToggle on={!!animation.page_transitions} onChange={onToggle('animation.page_transitions')} />
				</HxRow>
				<HxRow label="Respect prefers-reduced-motion" desc="Auto-disable animation when the visitor's OS asks for reduced motion." last>
					<HxToggle on={!!animation.respect_reduced_motion} onChange={onToggle('animation.respect_reduced_motion')} />
				</HxRow>
			</HxCard>

			{/* v0.50.31 — Site Identity card DELETED. WordPress already owns
			    site title + tagline (Settings → General). RankMath/Yoast own
			    the default OG image. Logo + favicon come from the WP
			    Customizer (Site Identity panel). Hatch shouldn't duplicate
			    those — Plugin Bridge auto-detects RankMath/Yoast so the
			    user gets one source of truth per concern. */}

		</div>
	);
}

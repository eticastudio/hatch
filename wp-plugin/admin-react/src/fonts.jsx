import { __ } from '@wordpress/i18n';

/**
 * Curated Google Fonts catalog. 5 optgroups, ~145 families.
 * Sourced from fonts.google.com top 100 + designer-favourite picks.
 *
 * The native <select> supports type-ahead: typing "Lo" jumps to "Lora",
 * "Mont" jumps to "Montserrat", etc. The optgroup labels also help eye-scan.
 * Update by appending here when a font goes viral.
 */
export const FONT_GROUPS = [
	{
		id: 'sans',
		label: __( 'Sans serif', 'hatch-bridge' ),
		fonts: [
			'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway', 'Nunito', 'Nunito Sans',
			'Work Sans', 'Outfit', 'Manrope', 'DM Sans', 'Plus Jakarta Sans', 'Space Grotesk', 'Geist', 'Albert Sans',
			'IBM Plex Sans', 'Source Sans 3', 'Public Sans', 'Figtree', 'Mulish', 'Karla', 'Rubik', 'Heebo',
			'Hind', 'Cabin', 'Ubuntu', 'PT Sans', 'Noto Sans', 'Mukta', 'Quicksand', 'Barlow', 'Oxygen',
			'Fira Sans', 'Titillium Web', 'Asap', 'Hanken Grotesk', 'Onest', 'Sora', 'Inter Tight', 'Be Vietnam Pro',
			'Lexend', 'Lexend Deca', 'Urbanist', 'Dosis', 'Anek Latin', 'Schibsted Grotesk',
		],
	},
	{
		id: 'serif',
		label: __( 'Serif', 'hatch-bridge' ),
		fonts: [
			'Merriweather', 'Playfair Display', 'Lora', 'Crimson Pro', 'Crimson Text', 'EB Garamond',
			'Source Serif 4', 'Libre Baskerville', 'Roboto Slab', 'Cardo', 'Cormorant Garamond', 'Cormorant',
			'PT Serif', 'Bitter', 'Domine', 'Spectral', 'Vollkorn', 'Frank Ruhl Libre', 'Noto Serif',
			'Libre Caslon Text', 'Newsreader', 'Fraunces', 'Instrument Serif', 'DM Serif Display',
			'DM Serif Text', 'IBM Plex Serif', 'Bricolage Grotesque', 'Literata', 'Old Standard TT',
			'Tinos', 'Faustina', 'Gentium Plus', 'Alegreya',
		],
	},
	{
		id: 'display',
		label: __( 'Display', 'hatch-bridge' ),
		fonts: [
			'Oswald', 'Bebas Neue', 'Anton', 'Archivo Black', 'Archivo', 'Russo One', 'Big Shoulders Display',
			'Boldonse', 'Abril Fatface', 'Comfortaa', 'Righteous', 'Pacifico', 'Lobster', 'Fjalla One',
			'Yeseva One', 'Alfa Slab One', 'Black Ops One', 'Bungee', 'Bungee Inline', 'Permanent Marker',
			'Press Start 2P', 'Limelight', 'Six Caps', 'Unica One', 'Sigmar', 'Climate Crisis',
			'Familjen Grotesk', 'Cabinet Grotesk', 'Migra', 'Tobi',
		],
	},
	{
		id: 'handwriting',
		label: __( 'Handwriting', 'hatch-bridge' ),
		fonts: [
			'Caveat', 'Kalam', 'Dancing Script', 'Shadows Into Light', 'Indie Flower', 'Patrick Hand',
			'Architects Daughter', 'Amatic SC', 'Satisfy', 'Sacramento', 'Great Vibes', 'Allura',
			'Homemade Apple', 'Reenie Beanie', 'Gloria Hallelujah', 'Cookie',
		],
	},
	{
		id: 'mono',
		label: __( 'Monospace', 'hatch-bridge' ),
		fonts: [
			'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'Source Code Pro', 'Roboto Mono', 'Space Mono',
			'DM Mono', 'Geist Mono', 'Inconsolata', 'Anonymous Pro', 'PT Mono', 'Cousine', 'Cutive Mono',
			'Major Mono Display', 'Nova Mono', 'Red Hat Mono',
		],
	},
];

export const MONO_FONTS = FONT_GROUPS.find((g) => g.id === 'mono').fonts;

/**
 * Renders a <select> with optgroups. Browser handles type-ahead natively.
 */
export function FontSelect({ value, onChange, monoOnly = false, style, ariaLabel }) {
	// v0.50.21: Explicit chevron via inline SVG background-image so the
	// caret renders consistently across browsers (default browser arrow
	// is hidden when appearance:none is set, which it must be for our
	// custom border/background to take effect).
	const caret = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2374797e' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")";
	const rtl = typeof document !== 'undefined' && 'rtl' === document.documentElement.dir;
	return (
		<select
			value={value}
			aria-label={ariaLabel}
			onChange={onChange}
			style={{
				width: '100%',
				height: 36,
				paddingBlock: 0,
				paddingInlineStart: 10,
				paddingInlineEnd: 32,
				borderRadius: 8,
				border: '1px solid var(--hx-border-2)',
				fontSize: 13,
				outline: 'none',
				color: 'var(--hx-fg)',
				background: `var(--hx-surface) ${caret} no-repeat ${ rtl ? 'left' : 'right' } 10px center`,
				backgroundSize: '12px',
				fontFamily: 'inherit',
				cursor: 'pointer',
				appearance: 'none',
				WebkitAppearance: 'none',
				MozAppearance: 'none',
				...style,
			}}
		>
			{FONT_GROUPS.filter((g) => !monoOnly || g.id === 'mono').map((g) => (
				<optgroup key={g.id} label={g.label}>
					{g.fonts.map((f) => (
						<option key={f} value={f}>{f}</option>
					))}
				</optgroup>
			))}
		</select>
	);
}

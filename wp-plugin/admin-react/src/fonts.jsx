import { __ } from '@wordpress/i18n';
import { HxSelect } from './components.jsx';

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
		label: __( 'Sans serif', 'hatch-connect' ),
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
		label: __( 'Serif', 'hatch-connect' ),
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
		label: __( 'Display', 'hatch-connect' ),
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
		label: __( 'Handwriting', 'hatch-connect' ),
		fonts: [
			'Caveat', 'Kalam', 'Dancing Script', 'Shadows Into Light', 'Indie Flower', 'Patrick Hand',
			'Architects Daughter', 'Amatic SC', 'Satisfy', 'Sacramento', 'Great Vibes', 'Allura',
			'Homemade Apple', 'Reenie Beanie', 'Gloria Hallelujah', 'Cookie',
		],
	},
	{
		id: 'mono',
		label: __( 'Monospace', 'hatch-connect' ),
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
	return (
		<HxSelect value={value} onChange={onChange} ariaLabel={ariaLabel} style={style}>
			{FONT_GROUPS.filter((g) => !monoOnly || g.id === 'mono').map((g) => (
				<optgroup key={g.id} label={g.label}>
					{g.fonts.map((f) => (
						<option key={f} value={f}>{f}</option>
					))}
				</optgroup>
			))}
		</HxSelect>
	);
}

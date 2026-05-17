/**
 * SpacingPanel — Top/Right/Bottom/Left controls × 5 breakpoints.
 *
 * Output: Tailwind utility classes (pt-12, md:pt-24 etc.).
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, __experimentalNumberControl as NumberControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import ResponsiveControl from './ResponsiveControl';
import { SPACING_OPTIONS } from '../utils/shared-attrs';

const SIDES = [
	{ key: 'top',    label: __( 'Top',    'hatch-blocks' ), tw: 'pt', mtw: 'mt' },
	{ key: 'right',  label: __( 'Right',  'hatch-blocks' ), tw: 'pr', mtw: 'mr' },
	{ key: 'bottom', label: __( 'Bottom', 'hatch-blocks' ), tw: 'pb', mtw: 'mb' },
	{ key: 'left',   label: __( 'Left',   'hatch-blocks' ), tw: 'pl', mtw: 'ml' },
];

/**
 * @param {Object}   props
 * @param {Object}   props.padding  { top, right, bottom, left } each a responsive object.
 * @param {Object}   props.margin   { top, right, bottom, left } each a responsive object.
 * @param {Function} props.onChangePadding
 * @param {Function} props.onChangeMargin
 */
export default function SpacingPanel( { padding, margin, onChangePadding, onChangeMargin } ) {
	const [ mode, setMode ] = useState( 'padding' );

	const value = mode === 'padding' ? padding : margin;
	const onChange = mode === 'padding' ? onChangePadding : onChangeMargin;

	return (
		<PanelBody title={ __( 'Spacing', 'hatch-blocks' ) } initialOpen={ false }>
			<SelectControl
				__nextHasNoMarginBottom
				label={ __( 'Type', 'hatch-blocks' ) }
				value={ mode }
				options={ [
					{ label: __( 'Padding', 'hatch-blocks' ), value: 'padding' },
					{ label: __( 'Margin',  'hatch-blocks' ), value: 'margin' },
				] }
				onChange={ setMode }
			/>
			{ SIDES.map( ( side ) => (
				<ResponsiveControl
					key={ side.key }
					label={ side.label }
					value={ value[ side.key ] }
					onChange={ ( newVal ) => {
						onChange( { ...value, [ side.key ]: newVal } );
					} }
				>
					{ ( currentVal, setForCurrent ) => (
						<SelectControl
							__nextHasNoMarginBottom
							value={ currentVal ?? '' }
							options={ [ { label: __( '— inherit —', 'hatch-blocks' ), value: '' }, ...SPACING_OPTIONS ] }
							onChange={ ( v ) => setForCurrent( v === '' ? null : Number( v ) ) }
						/>
					) }
				</ResponsiveControl>
			) ) }
		</PanelBody>
	);
}

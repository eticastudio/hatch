/**
 * ColorPanel — swatch picker over Hatch's color tokens.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, ColorIndicator, Button } from '@wordpress/components';
import { COLOR_TOKENS } from '../utils/shared-attrs';

/**
 * Swatch row.
 *
 * @param {Object} props
 */
function Swatches( { value, onChange } ) {
	return (
		<div style={ { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' } }>
			{ COLOR_TOKENS.map( ( t ) => (
				<Button
					key={ t.name }
					title={ t.label }
					aria-label={ t.label }
					onClick={ () => onChange( value === t.name ? '' : t.name ) }
					style={ {
						width: 28,
						height: 28,
						padding: 0,
						minWidth: 'auto',
						borderRadius: '50%',
						border: value === t.name ? '2px solid #1e293b' : '1px solid #cbd5e1',
						background: t.color,
					} }
				/>
			) ) }
		</div>
	);
}

/**
 * @param {Object}   props
 * @param {string}   props.background Background token.
 * @param {string}   props.text       Text color token.
 * @param {Function} props.onChange   ({ background, text }) partial update.
 */
export default function ColorPanel( { background, text, onChange } ) {
	return (
		<PanelBody title={ __( 'Color', 'hatch-blocks' ) } initialOpen={ false }>
			<div style={ { fontWeight: 500, marginBottom: 4 } }>{ __( 'Background', 'hatch-blocks' ) }</div>
			<Swatches value={ background } onChange={ ( v ) => onChange( { background: v } ) } />
			<div style={ { fontWeight: 500, marginTop: 12, marginBottom: 4 } }>{ __( 'Text', 'hatch-blocks' ) }</div>
			<Swatches value={ text } onChange={ ( v ) => onChange( { text: v } ) } />
		</PanelBody>
	);
}

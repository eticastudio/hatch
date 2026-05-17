/**
 * TypographyPanel — responsive font size + weight + line-height + alignment.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';
import ResponsiveControl from './ResponsiveControl';
import { TEXT_SIZE_OPTIONS, FONT_WEIGHT_OPTIONS, ALIGN_OPTIONS } from '../utils/shared-attrs';

/**
 * @param {Object}   props
 * @param {Object}   props.size      Responsive size object.
 * @param {string}   props.weight    Single weight value.
 * @param {Object}   props.align     Responsive align object.
 * @param {Function} props.onChange  ({ size, weight, align }) partial update.
 */
export default function TypographyPanel( { size, weight, align, onChange } ) {
	return (
		<PanelBody title={ __( 'Typography', 'hatch-blocks' ) } initialOpen={ false }>
			<ResponsiveControl
				label={ __( 'Size', 'hatch-blocks' ) }
				value={ size }
				onChange={ ( v ) => onChange( { size: v } ) }
			>
				{ ( current, set ) => (
					<SelectControl
						__nextHasNoMarginBottom
						value={ current ?? '' }
						options={ [ { label: __( '— inherit —', 'hatch-blocks' ), value: '' }, ...TEXT_SIZE_OPTIONS ] }
						onChange={ ( v ) => set( v === '' ? null : v ) }
					/>
				) }
			</ResponsiveControl>

			<SelectControl
				__nextHasNoMarginBottom
				label={ __( 'Weight', 'hatch-blocks' ) }
				value={ weight }
				options={ FONT_WEIGHT_OPTIONS }
				onChange={ ( v ) => onChange( { weight: v } ) }
			/>

			<ResponsiveControl
				label={ __( 'Alignment', 'hatch-blocks' ) }
				value={ align }
				onChange={ ( v ) => onChange( { align: v } ) }
			>
				{ ( current, set ) => (
					<SelectControl
						__nextHasNoMarginBottom
						value={ current ?? '' }
						options={ [ { label: __( '— inherit —', 'hatch-blocks' ), value: '' }, ...ALIGN_OPTIONS ] }
						onChange={ ( v ) => set( v === '' ? null : v ) }
					/>
				) }
			</ResponsiveControl>
		</PanelBody>
	);
}

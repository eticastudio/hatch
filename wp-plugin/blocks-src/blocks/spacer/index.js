/**
 * Hatch Spacer block.
 *
 * Vertical rhythm. Token-scaled (xs / sm / md / lg / xl / 2xl). Density
 * changes from the Design tab automatically scale the actual pixel height
 * because every preset maps to a --hatch-* CSS variable.
 *
 * Save markup is a single empty `<div class="hatch-spacer hatch-spacer-md sm:hatch-spacer-lg">`
 * — passthrough on Astro, no per-component renderer needed.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { Fragment } from '@wordpress/element';

const SIZES = [
	{ label: __( '— Default —', 'hatch' ),  value: '' },
	{ label: __( 'Extra small (xs)', 'hatch' ), value: 'xs' },
	{ label: __( 'Small (sm)', 'hatch' ),       value: 'sm' },
	{ label: __( 'Medium (md)', 'hatch' ),      value: 'md' },
	{ label: __( 'Large (lg)', 'hatch' ),       value: 'lg' },
	{ label: __( 'Extra large (xl)', 'hatch' ), value: 'xl' },
	{ label: __( '2× extra large (2xl)', 'hatch' ), value: '2xl' },
];

function computeClasses( attributes ) {
	const parts = [ 'hatch-spacer' ];
	if ( attributes.size )   parts.push( `hatch-spacer-${ attributes.size }` );
	if ( attributes.sizeSm ) parts.push( `sm:hatch-spacer-${ attributes.sizeSm }` );
	if ( attributes.sizeMd ) parts.push( `md:hatch-spacer-${ attributes.sizeMd }` );
	if ( attributes.sizeLg ) parts.push( `lg:hatch-spacer-${ attributes.sizeLg }` );
	return parts.join( ' ' );
}

registerBlockType( 'hatch/spacer', {
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( {
			className: computeClasses( attributes ),
			'aria-hidden': true,
		} );

		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'Size', 'hatch' ) } initialOpen={ true }>
						<SelectControl
							label={ __( 'Base', 'hatch' ) }
							value={ attributes.size }
							options={ SIZES.filter( ( o ) => o.value !== '' ) }
							onChange={ ( v ) => setAttributes( { size: v } ) }
						/>
						<SelectControl
							label={ __( 'Small breakpoint', 'hatch' ) }
							value={ attributes.sizeSm }
							options={ SIZES }
							onChange={ ( v ) => setAttributes( { sizeSm: v } ) }
						/>
						<SelectControl
							label={ __( 'Medium breakpoint', 'hatch' ) }
							value={ attributes.sizeMd }
							options={ SIZES }
							onChange={ ( v ) => setAttributes( { sizeMd: v } ) }
						/>
						<SelectControl
							label={ __( 'Large breakpoint', 'hatch' ) }
							value={ attributes.sizeLg }
							options={ SIZES }
							onChange={ ( v ) => setAttributes( { sizeLg: v } ) }
						/>
					</PanelBody>
				</InspectorControls>
				<div { ...blockProps } />
			</Fragment>
		);
	},
	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( {
			className: computeClasses( attributes ),
			'aria-hidden': true,
		} );
		return <div { ...blockProps } />;
	},
} );

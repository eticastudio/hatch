/**
 * Hatch Divider block — semantic <hr> with style + color + width variants.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { Fragment } from '@wordpress/element';

const STYLES = [
	{ label: 'Solid',  value: 'solid' },
	{ label: 'Dashed', value: 'dashed' },
	{ label: 'Dotted', value: 'dotted' },
	{ label: 'Double', value: 'double' },
	{ label: 'Fade',   value: 'fade' },
];
const COLORS = [
	{ label: 'Border (default)', value: 'border' },
	{ label: 'Foreground',       value: 'fg' },
	{ label: 'Muted',            value: 'muted' },
	{ label: 'Primary',          value: 'primary' },
	{ label: 'Accent',           value: 'accent' },
];
const WIDTHS = [
	{ label: 'Full',   value: 'full' },
	{ label: 'Wide',   value: 'wide' },
	{ label: 'Medium', value: 'md' },
	{ label: 'Narrow', value: 'narrow' },
];
const THICKS = [
	{ label: '1px', value: '1' }, { label: '2px', value: '2' },
	{ label: '3px', value: '3' }, { label: '4px', value: '4' },
];

function computeClasses( a ) {
	return [
		'hatch-divider',
		`hatch-divider-${ a.style }`,
		`hatch-divider-w-${ a.width }`,
		`hatch-divider-t-${ a.thickness }`,
		`hatch-divider-c-${ a.colorToken }`,
	].join( ' ' );
}

registerBlockType( 'hatch/divider', {
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( { className: computeClasses( attributes ) } );
		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'Divider', 'hatch' ) } initialOpen={ true }>
						<SelectControl label={ __( 'Style', 'hatch' ) } value={ attributes.style } options={ STYLES } onChange={ ( v ) => setAttributes( { style: v } ) } />
						<SelectControl label={ __( 'Color', 'hatch' ) } value={ attributes.colorToken } options={ COLORS } onChange={ ( v ) => setAttributes( { colorToken: v } ) } />
						<SelectControl label={ __( 'Width', 'hatch' ) } value={ attributes.width } options={ WIDTHS } onChange={ ( v ) => setAttributes( { width: v } ) } />
						<SelectControl label={ __( 'Thickness', 'hatch' ) } value={ attributes.thickness } options={ THICKS } onChange={ ( v ) => setAttributes( { thickness: v } ) } />
					</PanelBody>
				</InspectorControls>
				<hr { ...blockProps } />
			</Fragment>
		);
	},
	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( { className: computeClasses( attributes ) } );
		return <hr { ...blockProps } />;
	},
} );

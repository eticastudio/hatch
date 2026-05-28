/**
 * Hatch List block — semantic <ul>/<ol> with token-driven marker styles.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, SelectControl } from '@wordpress/components';
import { Fragment } from '@wordpress/element';

const MARKERS_BULLET = [
	{ label: 'Disc',     value: 'disc' },
	{ label: 'Circle',   value: 'circle' },
	{ label: 'Square',   value: 'square' },
	{ label: 'Check',    value: 'check' },
	{ label: 'Arrow',    value: 'arrow' },
	{ label: 'None',     value: 'none' },
];
const MARKERS_NUMBER = [
	{ label: 'Decimal',   value: 'decimal' },
	{ label: 'Decimal 0', value: 'decimal-leading-zero' },
	{ label: 'Lower-alpha', value: 'lower-alpha' },
	{ label: 'Upper-alpha', value: 'upper-alpha' },
	{ label: 'Lower-roman', value: 'lower-roman' },
	{ label: 'Upper-roman', value: 'upper-roman' },
];

function computeClasses( a ) {
	return [ 'hatch-list', `hatch-list-${ a.marker }` ].join( ' ' );
}

registerBlockType( 'hatch/list', {
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( { className: computeClasses( attributes ) } );
		const Tag = attributes.ordered ? 'ol' : 'ul';
		const markerOptions = attributes.ordered ? MARKERS_NUMBER : MARKERS_BULLET;
		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'List', 'hatch' ) } initialOpen={ true }>
						<ToggleControl
							label={ __( 'Numbered', 'hatch' ) }
							checked={ attributes.ordered }
							onChange={ ( v ) => setAttributes( { ordered: v, marker: v ? 'decimal' : 'disc' } ) }
						/>
						<SelectControl
							label={ __( 'Marker', 'hatch' ) }
							value={ attributes.marker }
							options={ markerOptions }
							onChange={ ( v ) => setAttributes( { marker: v } ) }
						/>
					</PanelBody>
				</InspectorControls>
				<RichText
					tagName={ Tag }
					multiline="li"
					value={ attributes.values }
					onChange={ ( v ) => setAttributes( { values: v } ) }
					placeholder={ __( 'Type list items…', 'hatch' ) }
					{ ...blockProps }
				/>
			</Fragment>
		);
	},
	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( { className: computeClasses( attributes ) } );
		const Tag = attributes.ordered ? 'ol' : 'ul';
		return <RichText.Content tagName={ Tag } value={ attributes.values } { ...blockProps } />;
	},
} );

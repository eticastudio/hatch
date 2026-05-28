/**
 * Hatch Group — flex/grid/stack wrapper for inner blocks.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls, InnerBlocks } from '@wordpress/block-editor';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { Fragment } from '@wordpress/element';

const LAYOUTS = [
	{ label: 'Stack (vertical)', value: 'stack' },
	{ label: 'Row (horizontal flex)', value: 'row' },
	{ label: 'Grid (2 / 3 / 4 col)', value: 'grid' },
];
const GAPS = [
	{ label: 'None', value: 'none' },
	{ label: 'XS',   value: 'xs' },
	{ label: 'SM',   value: 'sm' },
	{ label: 'MD',   value: 'md' },
	{ label: 'LG',   value: 'lg' },
	{ label: 'XL',   value: 'xl' },
];
const ALIGN = [
	{ label: 'Start',   value: 'start' },
	{ label: 'Center',  value: 'center' },
	{ label: 'End',     value: 'end' },
	{ label: 'Stretch', value: 'stretch' },
];
const JUSTIFY = [
	{ label: 'Start',         value: 'start' },
	{ label: 'Center',        value: 'center' },
	{ label: 'End',           value: 'end' },
	{ label: 'Space between', value: 'between' },
	{ label: 'Space around',  value: 'around' },
];
const TAGS = [
	{ label: 'div',     value: 'div' },
	{ label: 'section', value: 'section' },
	{ label: 'article', value: 'article' },
	{ label: 'aside',   value: 'aside' },
	{ label: 'header',  value: 'header' },
	{ label: 'footer',  value: 'footer' },
	{ label: 'main',    value: 'main' },
	{ label: 'nav',     value: 'nav' },
];

function computeClasses( a ) {
	const parts = [
		'hatch-group',
		`hatch-group-${ a.layout }`,
		`hatch-group-gap-${ a.gap }`,
		`hatch-group-align-${ a.align }`,
		`hatch-group-justify-${ a.justify }`,
	];
	if ( a.wrap ) parts.push( 'hatch-group-wrap' );
	return parts.join( ' ' );
}

registerBlockType( 'hatch/group', {
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( { className: computeClasses( attributes ) } );
		const Tag = attributes.tag || 'div';
		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'Group', 'hatch' ) } initialOpen={ true }>
						<SelectControl label={ __( 'Layout', 'hatch' ) } value={ attributes.layout } options={ LAYOUTS } onChange={ ( v ) => setAttributes( { layout: v } ) } />
						<SelectControl label={ __( 'Gap', 'hatch' ) } value={ attributes.gap } options={ GAPS } onChange={ ( v ) => setAttributes( { gap: v } ) } />
						<SelectControl label={ __( 'Align (cross-axis)', 'hatch' ) } value={ attributes.align } options={ ALIGN } onChange={ ( v ) => setAttributes( { align: v } ) } />
						<SelectControl label={ __( 'Justify (main-axis)', 'hatch' ) } value={ attributes.justify } options={ JUSTIFY } onChange={ ( v ) => setAttributes( { justify: v } ) } />
						{ attributes.layout === 'row' && (
							<ToggleControl
								label={ __( 'Wrap', 'hatch' ) }
								checked={ attributes.wrap }
								onChange={ ( v ) => setAttributes( { wrap: v } ) }
							/>
						) }
						<SelectControl label={ __( 'HTML element', 'hatch' ) } value={ attributes.tag } options={ TAGS } onChange={ ( v ) => setAttributes( { tag: v } ) } />
					</PanelBody>
				</InspectorControls>
				<Tag { ...blockProps }>
					<InnerBlocks />
				</Tag>
			</Fragment>
		);
	},
	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( { className: computeClasses( attributes ) } );
		const Tag = attributes.tag || 'div';
		return (
			<Tag { ...blockProps }>
				<InnerBlocks.Content />
			</Tag>
		);
	},
} );

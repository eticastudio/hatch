/**
 * Hatch Container block — max-width wrapper with flex/grid layout.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls, InnerBlocks } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import metadata from './block.json';
import ResponsiveControl from '../../components/ResponsiveControl';
import { responsiveClasses, cx } from '../../utils/classes';
import { SPACING_OPTIONS } from '../../utils/shared-attrs';

const MAX_WIDTHS = [
	{ label: 'Narrow (3xl, ~768px)',   value: '3xl' },
	{ label: 'Standard (5xl, ~1024px)', value: '5xl' },
	{ label: 'Wide (7xl, ~1280px)',     value: '7xl' },
	{ label: 'Full (no max)',           value: 'full' },
];

const LAYOUTS = [
	{ label: 'Vertical stack', value: 'stack' },
	{ label: 'Horizontal row', value: 'row' },
	{ label: 'Grid 2 cols',    value: 'grid-2' },
	{ label: 'Grid 3 cols',    value: 'grid-3' },
	{ label: 'Grid 4 cols',    value: 'grid-4' },
];

const ALIGN = [
	{ label: 'Start',   value: 'start' },
	{ label: 'Center',  value: 'center' },
	{ label: 'End',     value: 'end' },
	{ label: 'Stretch', value: 'stretch' },
];

const JUSTIFY = [
	{ label: 'Start',     value: 'start' },
	{ label: 'Center',    value: 'center' },
	{ label: 'End',       value: 'end' },
	{ label: 'Between',   value: 'between' },
	{ label: 'Around',    value: 'around' },
	{ label: 'Evenly',    value: 'evenly' },
];

function layoutClasses( layout ) {
	switch ( layout ) {
		case 'row':    return 'flex flex-row flex-wrap';
		case 'grid-2': return 'grid grid-cols-1 md:grid-cols-2';
		case 'grid-3': return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
		case 'grid-4': return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
		case 'stack':
		default:       return 'flex flex-col';
	}
}

function maxWidthClass( v ) {
	return v === 'full' ? 'w-full' : `max-w-${ v }`;
}

function computeClasses( a ) {
	return cx(
		'hatch-container w-full mx-auto',
		maxWidthClass( a.maxWidth ),
		layoutClasses( a.layout ),
		responsiveClasses( 'gap', a.gap ),
		`items-${ a.align }`,
		`justify-${ a.justify }`
	);
}

registerBlockType( metadata.name, {
	...metadata,
	edit: ( { attributes, setAttributes } ) => {
		const classes = computeClasses( attributes );
		const blockProps = useBlockProps( { className: classes } );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Width', 'hatch-blocks' ) } initialOpen={ true }>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Max width', 'hatch-blocks' ) }
							value={ attributes.maxWidth }
							options={ MAX_WIDTHS }
							onChange={ ( v ) => setAttributes( { maxWidth: v } ) }
						/>
					</PanelBody>

					<PanelBody title={ __( 'Layout', 'hatch-blocks' ) } initialOpen={ true }>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Direction', 'hatch-blocks' ) }
							value={ attributes.layout }
							options={ LAYOUTS }
							onChange={ ( v ) => setAttributes( { layout: v } ) }
						/>

						<ResponsiveControl
							label={ __( 'Gap', 'hatch-blocks' ) }
							value={ attributes.gap }
							onChange={ ( v ) => setAttributes( { gap: v } ) }
						>
							{ ( current, set ) => (
								<SelectControl
									__nextHasNoMarginBottom
									value={ current ?? '' }
									options={ [ { label: '— inherit —', value: '' }, ...SPACING_OPTIONS ] }
									onChange={ ( v ) => set( v === '' ? null : Number( v ) ) }
								/>
							) }
						</ResponsiveControl>

						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Align (cross-axis)', 'hatch-blocks' ) }
							value={ attributes.align }
							options={ ALIGN }
							onChange={ ( v ) => setAttributes( { align: v } ) }
						/>

						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Justify (main-axis)', 'hatch-blocks' ) }
							value={ attributes.justify }
							options={ JUSTIFY }
							onChange={ ( v ) => setAttributes( { justify: v } ) }
						/>
					</PanelBody>
				</InspectorControls>

				<div { ...blockProps }>
					<InnerBlocks templateLock={ false } />
				</div>
			</>
		);
	},

	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( { className: computeClasses( attributes ) } );
		return (
			<div { ...blockProps }>
				<InnerBlocks.Content />
			</div>
		);
	},
} );

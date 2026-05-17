/**
 * Hatch Heading block.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import {
	useBlockProps,
	InspectorControls,
	RichText,
	BlockControls,
	HeadingLevelDropdown,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import metadata from './block.json';
import TypographyPanel from '../../components/TypographyPanel';
import ColorPanel from '../../components/ColorPanel';
import { responsiveClasses, cx, colorClass } from '../../utils/classes';

const TRACKING = [
	{ label: 'Tighter', value: 'tighter' },
	{ label: 'Tight',   value: 'tight' },
	{ label: 'Normal',  value: 'normal' },
	{ label: 'Wide',    value: 'wide' },
	{ label: 'Wider',   value: 'wider' },
	{ label: 'Widest',  value: 'widest' },
];

const LEADING = [
	{ label: 'None',    value: 'none' },
	{ label: 'Tight',   value: 'tight' },
	{ label: 'Snug',    value: 'snug' },
	{ label: 'Normal',  value: 'normal' },
	{ label: 'Relaxed', value: 'relaxed' },
	{ label: 'Loose',   value: 'loose' },
];

const GRADIENTS = [
	{ label: '— None —', value: '' },
	{ label: 'Brand',    value: 'bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent' },
	{ label: 'Sunset',   value: 'bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent' },
	{ label: 'Ocean',    value: 'bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600 bg-clip-text text-transparent' },
	{ label: 'Aurora',   value: 'bg-gradient-to-r from-emerald-400 via-teal-500 to-violet-600 bg-clip-text text-transparent' },
];

function computeClasses( a ) {
	return cx(
		'hatch-heading m-0',
		responsiveClasses( 'text', a.size ),
		`font-${ a.weight }`,
		`tracking-${ a.letterSpacing }`,
		`leading-${ a.lineHeight }`,
		responsiveClasses( 'text', a.align ), // text-left, md:text-center etc.
		colorClass( 'text', a.colorToken ),
		a.gradient
	);
}

registerBlockType( metadata.name, {
	...metadata,
	edit: ( { attributes, setAttributes } ) => {
		const Tag = `h${ attributes.level }`;
		const classes = computeClasses( attributes );
		const blockProps = useBlockProps( { className: classes } );

		return (
			<>
				<BlockControls>
					<HeadingLevelDropdown
						value={ attributes.level }
						onChange={ ( v ) => setAttributes( { level: v } ) }
					/>
				</BlockControls>

				<InspectorControls>
					<TypographyPanel
						size={ attributes.size }
						weight={ attributes.weight }
						align={ attributes.align }
						onChange={ ( v ) => setAttributes( v ) }
					/>

					<PanelBody title={ __( 'Spacing & Rhythm', 'hatch-blocks' ) } initialOpen={ false }>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Letter spacing', 'hatch-blocks' ) }
							value={ attributes.letterSpacing }
							options={ TRACKING }
							onChange={ ( v ) => setAttributes( { letterSpacing: v } ) }
						/>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Line height', 'hatch-blocks' ) }
							value={ attributes.lineHeight }
							options={ LEADING }
							onChange={ ( v ) => setAttributes( { lineHeight: v } ) }
						/>
					</PanelBody>

					<PanelBody title={ __( 'Color', 'hatch-blocks' ) } initialOpen={ false }>
						<ColorPanel
							text={ attributes.colorToken }
							background=""
							onChange={ ( v ) => setAttributes( { colorToken: v.text ?? attributes.colorToken } ) }
						/>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Gradient text', 'hatch-blocks' ) }
							value={ attributes.gradient }
							options={ GRADIENTS }
							onChange={ ( v ) => setAttributes( { gradient: v } ) }
						/>
					</PanelBody>
				</InspectorControls>

				<RichText
					{ ...blockProps }
					tagName={ Tag }
					value={ attributes.content }
					onChange={ ( c ) => setAttributes( { content: c } ) }
					placeholder={ __( 'Heading…', 'hatch-blocks' ) }
					allowedFormats={ [ 'core/bold', 'core/italic', 'core/link' ] }
				/>
			</>
		);
	},

	save: ( { attributes } ) => {
		const Tag = `h${ attributes.level }`;
		const blockProps = useBlockProps.save( { className: computeClasses( attributes ) } );
		return <RichText.Content { ...blockProps } tagName={ Tag } value={ attributes.content } />;
	},
} );

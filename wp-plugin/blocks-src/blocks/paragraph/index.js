/**
 * Hatch Paragraph block.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import metadata from './block.json';
import TypographyPanel from '../../components/TypographyPanel';
import ColorPanel from '../../components/ColorPanel';
import { responsiveClasses, cx, colorClass } from '../../utils/classes';

const MAX_WIDTHS = [
	{ label: 'None (full)',           value: 'full' },
	{ label: 'Prose (~65ch)',         value: 'prose' },
	{ label: '2xl (672px)',           value: '2xl' },
	{ label: '3xl (768px)',           value: '3xl' },
	{ label: '4xl (896px)',           value: '4xl' },
];

const LEADING = [
	{ label: 'Tight',   value: 'tight' },
	{ label: 'Snug',    value: 'snug' },
	{ label: 'Normal',  value: 'normal' },
	{ label: 'Relaxed', value: 'relaxed' },
	{ label: 'Loose',   value: 'loose' },
];

function maxWidthClass( v ) {
	if ( v === 'full' ) return 'w-full';
	if ( v === 'prose' ) return 'max-w-prose';
	return `max-w-${ v }`;
}

function computeClasses( a ) {
	return cx(
		'hatch-paragraph m-0',
		responsiveClasses( 'text', a.size ),
		`font-${ a.weight }`,
		`leading-${ a.lineHeight }`,
		responsiveClasses( 'text', a.align ),
		colorClass( 'text', a.colorToken ),
		maxWidthClass( a.maxWidth )
	);
}

registerBlockType( metadata.name, {
	...metadata,
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( { className: computeClasses( attributes ) } );

		return (
			<>
				<InspectorControls>
					<TypographyPanel
						size={ attributes.size }
						weight={ attributes.weight }
						align={ attributes.align }
						onChange={ ( v ) => setAttributes( v ) }
					/>

					<PanelBody title={ __( 'Layout', 'hatch-blocks' ) } initialOpen={ false }>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Max width', 'hatch-blocks' ) }
							value={ attributes.maxWidth }
							options={ MAX_WIDTHS }
							onChange={ ( v ) => setAttributes( { maxWidth: v } ) }
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
					</PanelBody>
				</InspectorControls>

				<RichText
					{ ...blockProps }
					tagName="p"
					value={ attributes.content }
					onChange={ ( c ) => setAttributes( { content: c } ) }
					placeholder={ __( 'Write text…', 'hatch-blocks' ) }
				/>
			</>
		);
	},

	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( { className: computeClasses( attributes ) } );
		return <RichText.Content { ...blockProps } tagName="p" value={ attributes.content } />;
	},
} );

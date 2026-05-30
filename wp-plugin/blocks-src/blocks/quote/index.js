/**
 * Hatch Quote — semantic <blockquote> + <cite>, schema.org/Quotation markup.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { Fragment } from '@wordpress/element';

const VARIANTS = [
	{ label: 'Default (left border)', value: 'default' },
	{ label: 'Pull quote (large, centered)', value: 'pull' },
	{ label: 'Minimal (no border)', value: 'minimal' },
];
const SIZES = [
	{ label: 'Small', value: 'sm' },
	{ label: 'Medium', value: 'md' },
	{ label: 'Large', value: 'lg' },
	{ label: 'X-Large', value: 'xl' },
];

function computeClasses( a ) {
	return [ 'hatch-quote', `hatch-quote-${ a.variant }`, `hatch-quote-${ a.size }` ].join( ' ' );
}

registerBlockType( 'hatch/quote', {
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( {
			className: computeClasses( attributes ),
			itemScope: true,
			itemType: 'https://schema.org/Quotation',
		} );
		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'Quote', 'hatch' ) } initialOpen={ true }>
						<SelectControl label={ __( 'Variant', 'hatch' ) } value={ attributes.variant } options={ VARIANTS } onChange={ ( v ) => setAttributes( { variant: v } ) } />
						<SelectControl label={ __( 'Size', 'hatch' ) } value={ attributes.size } options={ SIZES } onChange={ ( v ) => setAttributes( { size: v } ) } />
					</PanelBody>
				</InspectorControls>
				<blockquote { ...blockProps }>
					<RichText
						tagName="p"
						className="hatch-quote-text"
						value={ attributes.value }
						onChange={ ( v ) => setAttributes( { value: v } ) }
						placeholder={ __( 'Write a quote…', 'hatch' ) }
						identifier="value"
					/>
					<RichText
						tagName="cite"
						className="hatch-quote-cite"
						value={ attributes.citation }
						onChange={ ( v ) => setAttributes( { citation: v } ) }
						placeholder={ __( '— Citation (optional)', 'hatch' ) }
						identifier="citation"
					/>
				</blockquote>
			</Fragment>
		);
	},
	save: ( { attributes } ) => {
		// itemScope/itemType dropped from save markup — KSES strips boolean
		// attribute order so the editor invalidates on reload. Schema markup
		// is emitted via Astro runtime / page-level JSON-LD when needed.
		const blockProps = useBlockProps.save( {
			className: computeClasses( attributes ),
		} );
		return (
			<blockquote { ...blockProps }>
				<RichText.Content tagName="p" className="hatch-quote-text" value={ attributes.value } />
				{ attributes.citation && <RichText.Content tagName="cite" className="hatch-quote-cite" value={ attributes.citation } /> }
			</blockquote>
		);
	},
} );

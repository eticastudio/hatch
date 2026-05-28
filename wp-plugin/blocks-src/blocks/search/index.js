/**
 * Hatch Search — semantic <form role="search"> with token styling.
 *
 * Posts via GET to the action URL (default /search). The Astro starter
 * already serves /search via src/pages/search.astro.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, SelectControl } from '@wordpress/components';
import { Fragment } from '@wordpress/element';

const VARIANTS = [
	{ label: 'Inline (text + button)', value: 'inline' },
	{ label: 'Pill',                   value: 'pill' },
	{ label: 'Boxed',                  value: 'boxed' },
];

registerBlockType( 'hatch/search', {
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( { className: `hatch-search hatch-search-${ attributes.variant }` } );
		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'Search', 'hatch' ) } initialOpen={ true }>
						<TextControl label={ __( 'Placeholder', 'hatch' ) } value={ attributes.placeholder } onChange={ ( v ) => setAttributes( { placeholder: v } ) } />
						<TextControl label={ __( 'Button label', 'hatch' ) } value={ attributes.buttonLabel } onChange={ ( v ) => setAttributes( { buttonLabel: v } ) } />
						<TextControl label={ __( 'Action URL', 'hatch' ) } value={ attributes.action } onChange={ ( v ) => setAttributes( { action: v } ) } />
						<SelectControl label={ __( 'Variant', 'hatch' ) } value={ attributes.variant } options={ VARIANTS } onChange={ ( v ) => setAttributes( { variant: v } ) } />
					</PanelBody>
				</InspectorControls>
				<form { ...blockProps } role="search" onSubmit={ ( e ) => e.preventDefault() }>
					<input type="search" placeholder={ attributes.placeholder } readOnly />
					<button type="submit">{ attributes.buttonLabel }</button>
				</form>
			</Fragment>
		);
	},
	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( {
			className: `hatch-search hatch-search-${ attributes.variant }`,
		} );
		return (
			<form { ...blockProps } role="search" action={ attributes.action } method="get">
				<label className="screen-reader-text" htmlFor="hatch-search-q">{ attributes.placeholder }</label>
				<input id="hatch-search-q" type="search" name="q" placeholder={ attributes.placeholder } required />
				<button type="submit">{ attributes.buttonLabel }</button>
			</form>
		);
	},
} );

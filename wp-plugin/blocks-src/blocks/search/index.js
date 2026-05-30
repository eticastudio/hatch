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
		// Save markup is intentionally minimal — KSES strips <form> AND <input>
		// elements from post_content unless the user has unfiltered_html.
		// We persist the search props as data-* attributes; the Astro runtime
		// rebuilds the real <input>/<button> on first hydration.
		const blockProps = useBlockProps.save( {
			className: `hatch-search hatch-search-${ attributes.variant }`,
			role: 'search',
			'data-hatch-search': '',
			'data-action': attributes.action,
			'data-placeholder': attributes.placeholder,
			'data-label': attributes.buttonLabel,
		} );
		return (
			<div { ...blockProps }>
				<span className="hatch-search-fallback">{ attributes.placeholder }</span>
			</div>
		);
	},
} );

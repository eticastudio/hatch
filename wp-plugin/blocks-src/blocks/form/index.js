/**
 * Hatch Form — embeds a form via the Plugin Bridge.
 *
 * Saved markup is a `<div data-hatch-form data-form-id="…">` placeholder.
 * The Astro frontend hydrates it by calling /hatch/v1/forms/{id}/embed
 * which auto-detects the active form plugin and returns its embed HTML.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { Fragment } from '@wordpress/element';

registerBlockType( 'hatch/form', {
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( { className: 'hatch-form-placeholder' } );
		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'Form', 'hatch' ) } initialOpen={ true }>
						<TextControl
							label={ __( 'Form ID', 'hatch' ) }
							value={ attributes.formId }
							onChange={ ( v ) => setAttributes( { formId: v } ) }
							placeholder="1"
							help={ __( 'ID of the form in your active form plugin.', 'hatch' ) }
						/>
						<TextControl
							label={ __( 'Visible label (optional)', 'hatch' ) }
							value={ attributes.label }
							onChange={ ( v ) => setAttributes( { label: v } ) }
							placeholder={ __( 'Contact form', 'hatch' ) }
						/>
					</PanelBody>
				</InspectorControls>
				<div { ...blockProps }>
					<div className="hatch-form-stub">
						<strong>🪶 { __( 'Form', 'hatch' ) }</strong>
						<span>{ attributes.label || ( attributes.formId ? `#${ attributes.formId }` : __( 'No form selected', 'hatch' ) ) }</span>
						<small>{ __( 'Renders via Plugin Bridge on the frontend.', 'hatch' ) }</small>
					</div>
				</div>
			</Fragment>
		);
	},
	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( {
			className: 'hatch-form',
			'data-hatch-form': '',
			'data-form-id': attributes.formId || '',
		} );
		if ( ! attributes.formId ) return null;
		return (
			<div { ...blockProps }>
				{ attributes.label && <h3 className="hatch-form-label">{ attributes.label }</h3> }
				<noscript>{ __( 'Form requires JavaScript to load.', 'hatch' ) }</noscript>
			</div>
		);
	},
} );

/**
 * Hatch Accordion — native <details>/<summary>, optional schema.org/FAQPage.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, Button } from '@wordpress/components';
import { Fragment } from '@wordpress/element';

registerBlockType( 'hatch/accordion', {
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( { className: 'hatch-accordion' } );
		const items = attributes.items || [];
		const update = ( idx, patch ) => setAttributes( { items: items.map( ( it, i ) => i === idx ? { ...it, ...patch } : it ) } );
		const add = () => setAttributes( { items: [ ...items, { q: '', a: '' } ] } );
		const remove = ( idx ) => setAttributes( { items: items.filter( ( _, i ) => i !== idx ) } );
		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'Accordion', 'hatch' ) } initialOpen={ true }>
						<ToggleControl label={ __( 'Allow multiple open', 'hatch' ) } checked={ attributes.allowMulti } onChange={ ( v ) => setAttributes( { allowMulti: v } ) } />
						<ToggleControl label={ __( 'Add FAQPage schema.org markup', 'hatch' ) } checked={ attributes.useSchema } onChange={ ( v ) => setAttributes( { useSchema: v } ) } />
						<Button variant="secondary" onClick={ add }>{ __( '+ Add item', 'hatch' ) }</Button>
					</PanelBody>
				</InspectorControls>
				<div { ...blockProps }>
					{ items.map( ( it, i ) => (
						<details key={ i } className="hatch-accordion-item" open={ i === 0 }>
							<summary>
								<RichText tagName="span" value={ it.q } onChange={ ( v ) => update( i, { q: v } ) } placeholder={ __( 'Question…', 'hatch' ) } />
							</summary>
							<div className="hatch-accordion-body">
								<RichText
									tagName="div"
									multiline="p"
									value={ it.a }
									onChange={ ( v ) => update( i, { a: v } ) }
									placeholder={ __( 'Answer…', 'hatch' ) }
								/>
								<Button variant="link" isDestructive onClick={ () => remove( i ) }>{ __( 'Remove item', 'hatch' ) }</Button>
							</div>
						</details>
					) ) }
				</div>
			</Fragment>
		);
	},
	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( {
			className: 'hatch-accordion',
			'data-hatch-accordion': attributes.allowMulti ? 'multi' : 'single',
		} );
		const items = attributes.items || [];
		return (
			<div { ...blockProps }>
				{ items.map( ( it, i ) => (
					<details key={ i } className="hatch-accordion-item" name={ attributes.allowMulti ? undefined : 'hatch-accordion' }>
						<summary>{ it.q }</summary>
						<div className="hatch-accordion-body">
							<RichText.Content value={ it.a } tagName="div" />
						</div>
					</details>
				) ) }
				{ attributes.useSchema && items.length > 0 && (
					<script type="application/ld+json" dangerouslySetInnerHTML={ { __html: JSON.stringify( {
						'@context': 'https://schema.org',
						'@type': 'FAQPage',
						mainEntity: items.map( ( it ) => ( {
							'@type': 'Question',
							name: ( it.q || '' ).replace( /<[^>]+>/g, '' ),
							acceptedAnswer: { '@type': 'Answer', text: ( it.a || '' ).replace( /<[^>]+>/g, '' ) },
						} ) ),
					} ) } } />
				) }
			</div>
		);
	},
} );

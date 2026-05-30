/**
 * Hatch Tabs — accessible tab panel with vanilla JS hydration on frontend.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import { PanelBody, SelectControl, Button } from '@wordpress/components';
import { Fragment, useState } from '@wordpress/element';

const VARIANTS = [
	{ label: 'Underline',   value: 'underline' },
	{ label: 'Pills',       value: 'pills' },
	{ label: 'Boxed',       value: 'boxed' },
];

function tabId( prefix, idx ) {
	return `${ prefix || 'tab' }-${ idx + 1 }`;
}

registerBlockType( 'hatch/tabs', {
	edit: ( { attributes, setAttributes, clientId } ) => {
		const blockProps = useBlockProps( { className: `hatch-tabs hatch-tabs-${ attributes.variant }` } );
		const [ active, setActive ] = useState( 0 );
		const tabs = attributes.tabs || [];

		const updateTab = ( idx, patch ) => {
			const next = tabs.map( ( t, i ) => ( i === idx ? { ...t, ...patch } : t ) );
			setAttributes( { tabs: next } );
		};
		const addTab = () => {
			const n = tabs.length + 1;
			setAttributes( { tabs: [ ...tabs, { id: tabId( clientId, n - 1 ), label: `Tab ${ n }`, content: '' } ] } );
		};
		const removeTab = ( idx ) => {
			setAttributes( { tabs: tabs.filter( ( _, i ) => i !== idx ) } );
			if ( active >= tabs.length - 1 ) setActive( Math.max( 0, tabs.length - 2 ) );
		};

		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'Tabs', 'hatch' ) } initialOpen={ true }>
						<SelectControl label={ __( 'Variant', 'hatch' ) } value={ attributes.variant } options={ VARIANTS } onChange={ ( v ) => setAttributes( { variant: v } ) } />
						<Button variant="secondary" onClick={ addTab }>{ __( '+ Add tab', 'hatch' ) }</Button>
					</PanelBody>
				</InspectorControls>
				<div { ...blockProps }>
					<div className="hatch-tabs-nav" role="tablist">
						{ tabs.map( ( t, i ) => (
							<button
								key={ i }
								type="button"
								role="tab"
								aria-selected={ i === active }
								className={ `hatch-tabs-tab${ i === active ? ' is-active' : '' }` }
								onClick={ () => setActive( i ) }
							>
								<RichText
									tagName="span"
									value={ t.label }
									onChange={ ( v ) => updateTab( i, { label: v } ) }
									placeholder={ `Tab ${ i + 1 }` }
								/>
							</button>
						) ) }
					</div>
					{ tabs[ active ] && (
						<div className="hatch-tabs-panel" role="tabpanel">
							<RichText
								tagName="div"
								multiline="p"
								value={ tabs[ active ].content }
								onChange={ ( v ) => updateTab( active, { content: v } ) }
								placeholder={ __( 'Panel content…', 'hatch' ) }
							/>
							{ tabs.length > 1 && (
								<Button variant="link" isDestructive onClick={ () => removeTab( active ) } style={ { marginTop: 8 } }>
									{ __( 'Delete this tab', 'hatch' ) }
								</Button>
							) }
						</div>
					) }
				</div>
			</Fragment>
		);
	},
	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( {
			className: `hatch-tabs hatch-tabs-${ attributes.variant }`,
			'data-hatch-tabs': '',
		} );
		const tabs = attributes.tabs || [];
		// Tabs save markup is intentionally minimal — runtime (hatch-blocks.js)
		// wires up roles, aria-selected, tabindex and hidden state on the
		// frontend. Editor save only emits stable markup so block validation
		// stays consistent across reloads.
		return (
			<div { ...blockProps }>
				<div className="hatch-tabs-nav">
					{ tabs.map( ( t, i ) => (
						<button
							key={ i }
							type="button"
							className={ `hatch-tabs-tab${ i === 0 ? ' is-active' : '' }` }
							data-hatch-tab={ t.id }
						>
							{ t.label }
						</button>
					) ) }
				</div>
				{ tabs.map( ( t, i ) => (
					<div
						key={ i }
						className={ `hatch-tabs-panel${ i === 0 ? ' is-active' : '' }` }
						data-hatch-panel={ t.id }
					>
						<RichText.Content value={ t.content } tagName="div" />
					</div>
				) ) }
			</div>
		);
	},
} );

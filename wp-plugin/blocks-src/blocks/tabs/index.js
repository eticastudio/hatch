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
		return (
			<div { ...blockProps }>
				<div className="hatch-tabs-nav" role="tablist">
					{ tabs.map( ( t, i ) => (
						<button
							key={ i }
							type="button"
							role="tab"
							id={ `${ t.id }-tab` }
							aria-controls={ `${ t.id }-panel` }
							aria-selected={ i === 0 ? 'true' : 'false' }
							className={ `hatch-tabs-tab${ i === 0 ? ' is-active' : '' }` }
							tabIndex={ i === 0 ? 0 : -1 }
						>
							{ t.label }
						</button>
					) ) }
				</div>
				{ tabs.map( ( t, i ) => (
					<div
						key={ i }
						role="tabpanel"
						id={ `${ t.id }-panel` }
						aria-labelledby={ `${ t.id }-tab` }
						className={ `hatch-tabs-panel${ i === 0 ? ' is-active' : '' }` }
						hidden={ i === 0 ? undefined : true }
					>
						<RichText.Content value={ t.content } tagName="div" />
					</div>
				) ) }
			</div>
		);
	},
} );

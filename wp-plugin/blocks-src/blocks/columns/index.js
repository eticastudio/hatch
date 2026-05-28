/**
 * Hatch Columns — N-col responsive grid with InnerBlocks.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType, createBlock } from '@wordpress/blocks';
import { useBlockProps, InspectorControls, InnerBlocks } from '@wordpress/block-editor';
import { PanelBody, RangeControl, SelectControl } from '@wordpress/components';
import { Fragment } from '@wordpress/element';

const GAPS = [
	{ label: 'None', value: 'none' },
	{ label: 'SM',   value: 'sm' },
	{ label: 'MD',   value: 'md' },
	{ label: 'LG',   value: 'lg' },
	{ label: 'XL',   value: 'xl' },
];
const STACK_AT = [
	{ label: 'Never stack',             value: 'never' },
	{ label: 'Stack on small (< sm)',   value: 'sm' },
	{ label: 'Stack on medium (< md)',  value: 'md' },
	{ label: 'Stack on large (< lg)',   value: 'lg' },
];
const ALIGN = [
	{ label: 'Start',   value: 'start' },
	{ label: 'Center',  value: 'center' },
	{ label: 'End',     value: 'end' },
	{ label: 'Stretch', value: 'stretch' },
];

function computeClasses( a ) {
	return [
		'hatch-columns',
		`hatch-cols-${ a.count }`,
		`hatch-cols-gap-${ a.gap }`,
		`hatch-cols-stack-${ a.stackAt }`,
		`hatch-cols-align-${ a.alignItems }`,
	].join( ' ' );
}

function templateFor( n ) {
	const t = [];
	for ( let i = 0; i < n; i++ ) {
		t.push( [ 'hatch/group', { layout: 'stack', gap: 'md' } ] );
	}
	return t;
}

registerBlockType( 'hatch/columns', {
	edit: ( { attributes, setAttributes, clientId } ) => {
		const blockProps = useBlockProps( { className: computeClasses( attributes ) } );
		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'Columns', 'hatch' ) } initialOpen={ true }>
						<RangeControl
							label={ __( 'Count', 'hatch' ) }
							value={ attributes.count }
							onChange={ ( v ) => setAttributes( { count: v } ) }
							min={ 1 }
							max={ 6 }
						/>
						<SelectControl label={ __( 'Gap', 'hatch' ) } value={ attributes.gap } options={ GAPS } onChange={ ( v ) => setAttributes( { gap: v } ) } />
						<SelectControl label={ __( 'Stack at', 'hatch' ) } value={ attributes.stackAt } options={ STACK_AT } onChange={ ( v ) => setAttributes( { stackAt: v } ) } />
						<SelectControl label={ __( 'Align items', 'hatch' ) } value={ attributes.alignItems } options={ ALIGN } onChange={ ( v ) => setAttributes( { alignItems: v } ) } />
					</PanelBody>
				</InspectorControls>
				<div { ...blockProps }>
					<InnerBlocks
						template={ templateFor( attributes.count ) }
						templateLock={ false }
						allowedBlocks={ [ 'hatch/group', 'hatch/section', 'hatch/container', 'hatch/heading', 'hatch/paragraph', 'hatch/image', 'hatch/button' ] }
					/>
				</div>
			</Fragment>
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

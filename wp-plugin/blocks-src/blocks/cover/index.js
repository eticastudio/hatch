/**
 * Hatch Cover — bg image + overlay color + nested blocks for text.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls, InnerBlocks, MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { PanelBody, RangeControl, SelectControl, Button, ColorPicker, FocalPointPicker } from '@wordpress/components';
import { Fragment } from '@wordpress/element';

const ALIGNS = [ { label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' } ];
const VALIGNS = [ { label: 'Top', value: 'top' }, { label: 'Center', value: 'center' }, { label: 'Bottom', value: 'bottom' } ];
const RATIOS = [
	{ label: '16:9', value: '16/9' }, { label: '4:3', value: '4/3' },
	{ label: '1:1',  value: '1/1' },  { label: '21:9', value: '21/9' },
	{ label: '9:16', value: '9/16' }, { label: 'Auto', value: 'auto' },
];

function computeStyles( a ) {
	const styles = { aspectRatio: a.aspectRatio === 'auto' ? undefined : a.aspectRatio };
	if ( a.image?.url ) {
		styles.backgroundImage = `url("${ a.image.url }")`;
		styles.backgroundSize = 'cover';
		const fp = a.focalPoint || { x: 0.5, y: 0.5 };
		styles.backgroundPosition = `${ Math.round( fp.x * 100 ) }% ${ Math.round( fp.y * 100 ) }%`;
	}
	return styles;
}

function computeClasses( a ) {
	return [
		'hatch-cover',
		`hatch-cover-text-${ a.textAlign }`,
		`hatch-cover-v-${ a.verticalAlign }`,
	].join( ' ' );
}

const TEMPLATE = [
	[ 'hatch/heading', { level: 2, sizePreset: 'xl' } ],
	[ 'hatch/paragraph', {} ],
];

registerBlockType( 'hatch/cover', {
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( {
			className: computeClasses( attributes ),
			style: computeStyles( attributes ),
		} );
		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'Background', 'hatch' ) } initialOpen={ true }>
						<MediaUploadCheck>
							<MediaUpload
								allowedTypes={ [ 'image' ] }
								value={ attributes.image?.id }
								onSelect={ ( m ) => setAttributes( { image: { id: m.id, url: m.url, alt: m.alt || '', width: m.width, height: m.height } } ) }
								render={ ( { open } ) => <Button variant="secondary" onClick={ open }>{ attributes.image?.url ? __( 'Change image', 'hatch' ) : __( 'Choose background image', 'hatch' ) }</Button> }
							/>
						</MediaUploadCheck>
						{ attributes.image?.url && (
							<FocalPointPicker
								url={ attributes.image.url }
								value={ attributes.focalPoint }
								onChange={ ( fp ) => setAttributes( { focalPoint: fp } ) }
							/>
						) }
						<SelectControl label={ __( 'Aspect ratio', 'hatch' ) } value={ attributes.aspectRatio } options={ RATIOS } onChange={ ( v ) => setAttributes( { aspectRatio: v } ) } />
					</PanelBody>
					<PanelBody title={ __( 'Overlay', 'hatch' ) } initialOpen={ false }>
						<ColorPicker color={ attributes.overlayColor } onChange={ ( v ) => setAttributes( { overlayColor: v } ) } />
						<RangeControl label={ __( 'Opacity %', 'hatch' ) } value={ attributes.overlayOpacity } min={ 0 } max={ 100 } onChange={ ( v ) => setAttributes( { overlayOpacity: v } ) } />
					</PanelBody>
					<PanelBody title={ __( 'Text alignment', 'hatch' ) } initialOpen={ false }>
						<SelectControl label={ __( 'Horizontal', 'hatch' ) } value={ attributes.textAlign } options={ ALIGNS } onChange={ ( v ) => setAttributes( { textAlign: v } ) } />
						<SelectControl label={ __( 'Vertical', 'hatch' ) } value={ attributes.verticalAlign } options={ VALIGNS } onChange={ ( v ) => setAttributes( { verticalAlign: v } ) } />
					</PanelBody>
				</InspectorControls>
				<div { ...blockProps }>
					<div className="hatch-cover-overlay" style={ { backgroundColor: attributes.overlayColor, opacity: attributes.overlayOpacity / 100 } } />
					<div className="hatch-cover-inner">
						<InnerBlocks template={ TEMPLATE } templateLock={ false } />
					</div>
				</div>
			</Fragment>
		);
	},
	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( {
			className: computeClasses( attributes ),
			style: computeStyles( attributes ),
		} );
		return (
			<div { ...blockProps }>
				<div className="hatch-cover-overlay" style={ { backgroundColor: attributes.overlayColor, opacity: attributes.overlayOpacity / 100 } } />
				<div className="hatch-cover-inner">
					<InnerBlocks.Content />
				</div>
			</div>
		);
	},
} );

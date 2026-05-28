/**
 * Hatch Gallery — image grid with lightbox attribute hook.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls, MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { PanelBody, RangeControl, SelectControl, ToggleControl, Button } from '@wordpress/components';
import { Fragment } from '@wordpress/element';

const GAPS = [
	{ label: 'None', value: 'none' }, { label: 'XS', value: 'xs' },
	{ label: 'SM',   value: 'sm' },   { label: 'MD', value: 'md' },
	{ label: 'LG',   value: 'lg' },
];
const LAYOUTS = [
	{ label: 'Grid', value: 'grid' },
	{ label: 'Masonry', value: 'masonry' },
];
const ASPECTS = [
	{ label: 'Square (1:1)',     value: '1/1' },
	{ label: 'Landscape (4:3)',  value: '4/3' },
	{ label: 'Wide (16:9)',      value: '16/9' },
	{ label: 'Portrait (3:4)',   value: '3/4' },
	{ label: 'Native',           value: 'auto' },
];

function computeClasses( a ) {
	return [
		'hatch-gallery',
		`hatch-gallery-${ a.layout }`,
		`hatch-gallery-cols-${ a.columns }`,
		`hatch-gallery-gap-${ a.gap }`,
	].join( ' ' );
}

registerBlockType( 'hatch/gallery', {
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( { className: computeClasses( attributes ) } );
		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'Gallery', 'hatch' ) } initialOpen={ true }>
						<MediaUploadCheck>
							<MediaUpload
								multiple
								gallery
								allowedTypes={ [ 'image' ] }
								value={ ( attributes.images || [] ).map( ( i ) => i.id ).filter( Boolean ) }
								onSelect={ ( picks ) =>
									setAttributes( {
										images: ( picks || [] ).map( ( m ) => ( {
											id: m.id,
											url: m.url || m.sizes?.large?.url || m.sizes?.full?.url,
											alt: m.alt || '',
											width: m.width || null,
											height: m.height || null,
										} ) ),
									} )
								}
								render={ ( { open } ) => <Button onClick={ open } variant="secondary">{ __( 'Choose / replace images', 'hatch' ) }</Button> }
							/>
						</MediaUploadCheck>
						<SelectControl label={ __( 'Layout', 'hatch' ) } value={ attributes.layout } options={ LAYOUTS } onChange={ ( v ) => setAttributes( { layout: v } ) } />
						<RangeControl label={ __( 'Columns', 'hatch' ) } value={ attributes.columns } min={ 1 } max={ 6 } onChange={ ( v ) => setAttributes( { columns: v } ) } />
						<SelectControl label={ __( 'Gap', 'hatch' ) } value={ attributes.gap } options={ GAPS } onChange={ ( v ) => setAttributes( { gap: v } ) } />
						<SelectControl label={ __( 'Aspect ratio', 'hatch' ) } value={ attributes.aspect } options={ ASPECTS } onChange={ ( v ) => setAttributes( { aspect: v } ) } />
						<ToggleControl label={ __( 'Click to enlarge (lightbox)', 'hatch' ) } checked={ attributes.lightbox } onChange={ ( v ) => setAttributes( { lightbox: v } ) } />
					</PanelBody>
				</InspectorControls>
				<div { ...blockProps }>
					{ ( attributes.images || [] ).length === 0 && (
						<div className="hatch-gallery-empty">{ __( 'Pick images in the sidebar →', 'hatch' ) }</div>
					) }
					{ ( attributes.images || [] ).map( ( img, idx ) => (
						<figure key={ idx } className="hatch-gallery-cell" style={ { aspectRatio: attributes.aspect } }>
							<img src={ img.url } alt={ img.alt } loading="lazy" decoding="async" />
						</figure>
					) ) }
				</div>
			</Fragment>
		);
	},
	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( {
			className: computeClasses( attributes ),
			'data-hatch-lightbox': attributes.lightbox ? '1' : '0',
		} );
		return (
			<div { ...blockProps }>
				{ ( attributes.images || [] ).map( ( img, idx ) => (
					<figure key={ idx } className="hatch-gallery-cell" style={ { aspectRatio: attributes.aspect } }>
						<img src={ img.url } alt={ img.alt } loading="lazy" decoding="async" width={ img.width || undefined } height={ img.height || undefined } />
					</figure>
				) ) }
			</div>
		);
	},
} );

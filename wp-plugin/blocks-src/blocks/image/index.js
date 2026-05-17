/**
 * Hatch Image block — responsive image with aspect ratio + shadow + radius.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	MediaPlaceholder,
	RichText,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl, Button as WpButton } from '@wordpress/components';
import metadata from './block.json';
import { cx } from '../../utils/classes';

const RATIOS = [
	{ label: 'Auto (natural)', value: 'auto' },
	{ label: 'Square 1:1',     value: 'square' },
	{ label: 'Video 16:9',     value: 'video' },
	{ label: 'Wide 21:9',      value: 'wide' },
	{ label: 'Portrait 3:4',   value: 'portrait' },
	{ label: 'Photo 4:3',      value: 'photo' },
];

const RATIO_CLASS = {
	auto:     '',
	square:   'aspect-square',
	video:    'aspect-video',
	wide:     'aspect-[21/9]',
	portrait: 'aspect-[3/4]',
	photo:    'aspect-[4/3]',
};

const FIT = [
	{ label: 'Cover',   value: 'cover' },
	{ label: 'Contain', value: 'contain' },
	{ label: 'Fill',    value: 'fill' },
	{ label: 'None',    value: 'none' },
];

const RADII = [
	{ label: 'None', value: 'none' },
	{ label: 'SM',   value: 'sm' },
	{ label: 'MD',   value: 'md' },
	{ label: 'LG',   value: 'lg' },
	{ label: 'XL',   value: 'xl' },
	{ label: '2XL',  value: '2xl' },
	{ label: 'Pill', value: 'full' },
];

const SHADOWS = [
	{ label: 'None', value: 'none' },
	{ label: 'SM',   value: 'sm' },
	{ label: 'MD',   value: 'md' },
	{ label: 'LG',   value: 'lg' },
	{ label: 'XL',   value: 'xl' },
	{ label: '2XL',  value: '2xl' },
];

const LOADING = [
	{ label: 'Lazy (default)', value: 'lazy' },
	{ label: 'Eager',          value: 'eager' },
];

function computeFigureClasses() {
	return 'hatch-image relative my-0';
}

function computeImageClasses( a ) {
	return cx(
		'block w-full h-auto',
		RATIO_CLASS[ a.aspectRatio ] || '',
		`object-${ a.objectFit }`,
		a.radius === 'none' ? 'rounded-none' : `rounded-${ a.radius }`,
		a.shadow === 'none' ? '' : `shadow-${ a.shadow }`
	);
}

registerBlockType( metadata.name, {
	...metadata,
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( { className: computeFigureClasses() } );

		if ( ! attributes.url ) {
			return (
				<div { ...blockProps }>
					<MediaPlaceholder
						icon="format-image"
						labels={ { title: __( 'Hatch Image', 'hatch-blocks' ) } }
						accept="image/*"
						allowedTypes={ [ 'image' ] }
						onSelect={ ( m ) => setAttributes( {
							id: m.id,
							url: m.url,
							alt: m.alt || '',
							width: m.width,
							height: m.height,
						} ) }
					/>
				</div>
			);
		}

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Image', 'hatch-blocks' ) } initialOpen={ true }>
						<MediaUploadCheck>
							<MediaUpload
								allowedTypes={ [ 'image' ] }
								value={ attributes.id }
								onSelect={ ( m ) => setAttributes( {
									id: m.id, url: m.url, alt: m.alt || '', width: m.width, height: m.height,
								} ) }
								render={ ( { open } ) => (
									<WpButton variant="secondary" onClick={ open }>{ __( 'Replace image', 'hatch-blocks' ) }</WpButton>
								) }
							/>
						</MediaUploadCheck>
						<TextControl
							__nextHasNoMarginBottom
							label={ __( 'Alt text', 'hatch-blocks' ) }
							value={ attributes.alt }
							onChange={ ( v ) => setAttributes( { alt: v } ) }
							help={ __( 'Describe the image for screen readers and SEO. Leave empty if decorative.', 'hatch-blocks' ) }
						/>
					</PanelBody>

					<PanelBody title={ __( 'Layout', 'hatch-blocks' ) } initialOpen={ true }>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Aspect ratio', 'hatch-blocks' ) }
							value={ attributes.aspectRatio }
							options={ RATIOS }
							onChange={ ( v ) => setAttributes( { aspectRatio: v } ) }
						/>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Object fit', 'hatch-blocks' ) }
							value={ attributes.objectFit }
							options={ FIT }
							onChange={ ( v ) => setAttributes( { objectFit: v } ) }
						/>
					</PanelBody>

					<PanelBody title={ __( 'Style', 'hatch-blocks' ) } initialOpen={ false }>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Corner radius', 'hatch-blocks' ) }
							value={ attributes.radius }
							options={ RADII }
							onChange={ ( v ) => setAttributes( { radius: v } ) }
						/>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Shadow', 'hatch-blocks' ) }
							value={ attributes.shadow }
							options={ SHADOWS }
							onChange={ ( v ) => setAttributes( { shadow: v } ) }
						/>
					</PanelBody>

					<PanelBody title={ __( 'Performance', 'hatch-blocks' ) } initialOpen={ false }>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Loading', 'hatch-blocks' ) }
							value={ attributes.loading }
							options={ LOADING }
							onChange={ ( v ) => setAttributes( { loading: v } ) }
							help={ __( 'Use Eager for hero images above-the-fold.', 'hatch-blocks' ) }
						/>
					</PanelBody>

					<PanelBody title={ __( 'Link', 'hatch-blocks' ) } initialOpen={ false }>
						<TextControl
							__nextHasNoMarginBottom
							type="url"
							label={ __( 'Link URL', 'hatch-blocks' ) }
							value={ attributes.linkUrl }
							onChange={ ( v ) => setAttributes( { linkUrl: v } ) }
						/>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Open in', 'hatch-blocks' ) }
							value={ attributes.linkTarget }
							options={ [
								{ label: 'Same tab', value: '' },
								{ label: 'New tab',  value: '_blank' },
							] }
							onChange={ ( v ) => setAttributes( { linkTarget: v } ) }
						/>
					</PanelBody>
				</InspectorControls>

				<figure { ...blockProps }>
					<img
						src={ attributes.url }
						alt={ attributes.alt }
						width={ attributes.width }
						height={ attributes.height }
						loading={ attributes.loading }
						className={ computeImageClasses( attributes ) }
					/>
					<RichText
						tagName="figcaption"
						className="text-sm text-muted mt-2 text-center"
						value={ attributes.caption }
						onChange={ ( v ) => setAttributes( { caption: v } ) }
						placeholder={ __( 'Optional caption…', 'hatch-blocks' ) }
						allowedFormats={ [ 'core/bold', 'core/italic', 'core/link' ] }
					/>
				</figure>
			</>
		);
	},

	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( { className: computeFigureClasses() } );
		const img = (
			<img
				src={ attributes.url }
				alt={ attributes.alt }
				width={ attributes.width }
				height={ attributes.height }
				loading={ attributes.loading }
				className={ computeImageClasses( attributes ) }
			/>
		);
		const wrapped = attributes.linkUrl
			? <a href={ attributes.linkUrl } target={ attributes.linkTarget || undefined } rel={ attributes.linkTarget === '_blank' ? 'noopener noreferrer' : undefined }>{ img }</a>
			: img;

		return (
			<figure { ...blockProps }>
				{ wrapped }
				{ attributes.caption && (
					<RichText.Content tagName="figcaption" className="text-sm text-muted mt-2 text-center" value={ attributes.caption } />
				) }
			</figure>
		);
	},
} );

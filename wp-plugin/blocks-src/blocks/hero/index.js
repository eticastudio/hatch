/**
 * Hatch Hero block — opinionated hero section with 3 variants.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import {
	useBlockProps,
	InspectorControls,
	RichText,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody, SelectControl, TextControl, ToggleControl, Button as WpButton,
} from '@wordpress/components';
import metadata from './block.json';
import { cx } from '../../utils/classes';

const VARIANTS = [
	{ label: 'Centered',         value: 'centered' },
	{ label: 'Left-aligned',     value: 'left' },
	{ label: 'Split (image right)', value: 'split' },
];

const BG_STYLES = [
	{ label: 'Gradient: Aurora',   value: 'gradient-aurora' },
	{ label: 'Gradient: Sunset',   value: 'gradient-sunset' },
	{ label: 'Gradient: Ocean',    value: 'gradient-ocean' },
	{ label: 'Gradient: Mint',     value: 'gradient-mint' },
	{ label: 'Gradient: Midnight', value: 'gradient-midnight' },
	{ label: 'Solid primary',      value: 'solid-primary' },
	{ label: 'Solid surface',      value: 'solid-surface' },
	{ label: 'Image with overlay', value: 'image' },
	{ label: 'Plain',              value: 'plain' },
];

function backgroundClass( style ) {
	switch ( style ) {
		case 'gradient-aurora':   return 'bg-gradient-to-br from-emerald-400 via-teal-500 to-violet-600';
		case 'gradient-sunset':   return 'bg-gradient-to-br from-rose-500 via-fuchsia-500 to-purple-600';
		case 'gradient-ocean':    return 'bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600';
		case 'gradient-mint':     return 'bg-gradient-to-br from-emerald-50 via-white to-cyan-50';
		case 'gradient-midnight': return 'bg-gradient-to-br from-slate-800 via-slate-900 to-black';
		case 'solid-primary':     return 'bg-primary';
		case 'solid-surface':     return 'bg-surface';
		case 'image':             return 'bg-cover bg-center relative';
		case 'plain':
		default:                  return 'bg-background';
	}
}

function variantInner( v, content ) {
	switch ( v ) {
		case 'split':
			return (
				<div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto px-6 py-24 lg:py-32">
					<div className="flex flex-col gap-6">{ content.text }</div>
					<div>{ content.image }</div>
				</div>
			);
		case 'left':
			return (
				<div className="max-w-5xl mx-auto px-6 py-24 lg:py-32">
					<div className="flex flex-col gap-6 items-start text-left max-w-2xl">{ content.text }</div>
				</div>
			);
		case 'centered':
		default:
			return (
				<div className="max-w-4xl mx-auto px-6 py-24 lg:py-32">
					<div className="flex flex-col gap-6 items-center text-center">{ content.text }</div>
				</div>
			);
	}
}

function computeWrapperClass( a ) {
	return cx(
		'hatch-hero relative isolate overflow-hidden',
		backgroundClass( a.backgroundStyle ),
		a.darkText ? 'text-foreground' : 'text-white'
	);
}

registerBlockType( metadata.name, {
	...metadata,
	edit: ( { attributes, setAttributes } ) => {
		const wrapperProps = useBlockProps( {
			className: computeWrapperClass( attributes ),
			style: ( attributes.backgroundStyle === 'image' && attributes.backgroundImage?.url )
				? { backgroundImage: `url("${ attributes.backgroundImage.url }")` }
				: undefined,
		} );

		const textBlock = (
			<>
				{ ( attributes.eyebrow || attributes.eyebrow === '' ) && (
					<RichText
						className="hatch-hero-eyebrow text-sm font-medium tracking-widest uppercase opacity-80"
						tagName="span"
						value={ attributes.eyebrow }
						onChange={ ( v ) => setAttributes( { eyebrow: v } ) }
						placeholder={ __( 'Eyebrow (optional)…', 'hatch-blocks' ) }
						allowedFormats={ [] }
					/>
				) }
				<RichText
					className="hatch-hero-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
					tagName="h1"
					value={ attributes.heading }
					onChange={ ( v ) => setAttributes( { heading: v } ) }
					placeholder={ __( 'Big headline…', 'hatch-blocks' ) }
					allowedFormats={ [ 'core/bold', 'core/italic' ] }
				/>
				<RichText
					className="hatch-hero-subhead text-lg md:text-xl opacity-90 max-w-2xl"
					tagName="p"
					value={ attributes.subhead }
					onChange={ ( v ) => setAttributes( { subhead: v } ) }
					placeholder={ __( 'Supporting paragraph…', 'hatch-blocks' ) }
				/>
				<div className="hatch-hero-ctas flex flex-wrap gap-3 mt-2">
					{ attributes.primaryCtaText && (
						<a
							href={ attributes.primaryCtaUrl || '#' }
							className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-6 py-3 text-base font-medium hover:opacity-90 transition"
							onClick={ ( e ) => e.preventDefault() }
						>
							{ attributes.primaryCtaText }
						</a>
					) }
					{ attributes.secondaryCtaText && (
						<a
							href={ attributes.secondaryCtaUrl || '#' }
							className="inline-flex items-center gap-2 rounded-lg border-2 border-current px-6 py-3 text-base font-medium hover:bg-current hover:text-background transition"
							onClick={ ( e ) => e.preventDefault() }
						>
							{ attributes.secondaryCtaText }
						</a>
					) }
				</div>
			</>
		);

		const imageBlock = attributes.backgroundImage?.url ? (
			<img src={ attributes.backgroundImage.url } alt="" className="rounded-2xl shadow-2xl w-full h-auto" />
		) : (
			<div className="rounded-2xl bg-white/10 aspect-video grid place-items-center text-sm opacity-60">
				{ __( 'Pick image in Inspector', 'hatch-blocks' ) }
			</div>
		);

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Layout', 'hatch-blocks' ) } initialOpen={ true }>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Variant', 'hatch-blocks' ) }
							value={ attributes.variant }
							options={ VARIANTS }
							onChange={ ( v ) => setAttributes( { variant: v } ) }
						/>
					</PanelBody>

					<PanelBody title={ __( 'Background', 'hatch-blocks' ) } initialOpen={ true }>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Style', 'hatch-blocks' ) }
							value={ attributes.backgroundStyle }
							options={ BG_STYLES }
							onChange={ ( v ) => setAttributes( { backgroundStyle: v } ) }
						/>
						{ ( attributes.backgroundStyle === 'image' || attributes.variant === 'split' ) && (
							<MediaUploadCheck>
								<MediaUpload
									allowedTypes={ [ 'image' ] }
									value={ attributes.backgroundImage?.id }
									onSelect={ ( img ) => setAttributes( {
										backgroundImage: { id: img.id, url: img.url, alt: img.alt },
									} ) }
									render={ ( { open } ) => (
										<WpButton variant="secondary" onClick={ open } style={ { marginTop: 8 } }>
											{ attributes.backgroundImage ? __( 'Replace image', 'hatch-blocks' ) : __( 'Choose image', 'hatch-blocks' ) }
										</WpButton>
									) }
								/>
							</MediaUploadCheck>
						) }
						<ToggleControl
							__nextHasNoMarginBottom
							label={ __( 'Dark text on light backgrounds', 'hatch-blocks' ) }
							checked={ attributes.darkText }
							onChange={ ( v ) => setAttributes( { darkText: v } ) }
						/>
					</PanelBody>

					<PanelBody title={ __( 'CTAs', 'hatch-blocks' ) } initialOpen={ false }>
						<TextControl
							__nextHasNoMarginBottom
							label={ __( 'Primary text', 'hatch-blocks' ) }
							value={ attributes.primaryCtaText }
							onChange={ ( v ) => setAttributes( { primaryCtaText: v } ) }
						/>
						<TextControl
							__nextHasNoMarginBottom
							type="url"
							label={ __( 'Primary URL', 'hatch-blocks' ) }
							value={ attributes.primaryCtaUrl }
							onChange={ ( v ) => setAttributes( { primaryCtaUrl: v } ) }
						/>
						<TextControl
							__nextHasNoMarginBottom
							label={ __( 'Secondary text', 'hatch-blocks' ) }
							value={ attributes.secondaryCtaText }
							onChange={ ( v ) => setAttributes( { secondaryCtaText: v } ) }
						/>
						<TextControl
							__nextHasNoMarginBottom
							type="url"
							label={ __( 'Secondary URL', 'hatch-blocks' ) }
							value={ attributes.secondaryCtaUrl }
							onChange={ ( v ) => setAttributes( { secondaryCtaUrl: v } ) }
						/>
					</PanelBody>
				</InspectorControls>

				<section { ...wrapperProps }>
					{ attributes.backgroundStyle === 'image' && (
						<div className="absolute inset-0 bg-black/40 pointer-events-none" aria-hidden="true" />
					) }
					<div className="relative">
						{ variantInner( attributes.variant, { text: textBlock, image: imageBlock } ) }
					</div>
				</section>
			</>
		);
	},

	save: ( { attributes } ) => {
		const wrapperProps = useBlockProps.save( {
			className: computeWrapperClass( attributes ),
			style: ( attributes.backgroundStyle === 'image' && attributes.backgroundImage?.url )
				? { backgroundImage: `url("${ attributes.backgroundImage.url }")` }
				: undefined,
		} );

		const textBlock = (
			<>
				{ attributes.eyebrow && (
					<RichText.Content
						className="hatch-hero-eyebrow text-sm font-medium tracking-widest uppercase opacity-80"
						tagName="span"
						value={ attributes.eyebrow }
					/>
				) }
				<RichText.Content
					className="hatch-hero-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
					tagName="h1"
					value={ attributes.heading }
				/>
				{ attributes.subhead && (
					<RichText.Content
						className="hatch-hero-subhead text-lg md:text-xl opacity-90 max-w-2xl"
						tagName="p"
						value={ attributes.subhead }
					/>
				) }
				<div className="hatch-hero-ctas flex flex-wrap gap-3 mt-2">
					{ attributes.primaryCtaText && (
						<a href={ attributes.primaryCtaUrl || '#' }
						   className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-6 py-3 text-base font-medium hover:opacity-90 transition">
							{ attributes.primaryCtaText }
						</a>
					) }
					{ attributes.secondaryCtaText && (
						<a href={ attributes.secondaryCtaUrl || '#' }
						   className="inline-flex items-center gap-2 rounded-lg border-2 border-current px-6 py-3 text-base font-medium hover:bg-current hover:text-background transition">
							{ attributes.secondaryCtaText }
						</a>
					) }
				</div>
			</>
		);

		const imageBlock = attributes.backgroundImage?.url
			? <img src={ attributes.backgroundImage.url } alt={ attributes.backgroundImage.alt || '' } className="rounded-2xl shadow-2xl w-full h-auto" />
			: null;

		return (
			<section { ...wrapperProps }>
				{ attributes.backgroundStyle === 'image' && (
					<div className="absolute inset-0 bg-black/40 pointer-events-none" aria-hidden="true" />
				) }
				<div className="relative">
					{ variantInner( attributes.variant, { text: textBlock, image: imageBlock } ) }
				</div>
			</section>
		);
	},
} );

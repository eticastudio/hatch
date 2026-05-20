/**
 * Hatch Button block — polished CTA with 5 variants.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import {
	useBlockProps,
	InspectorControls,
	RichText,
	__experimentalLinkControl as LinkControl,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	TextControl,
	Popover,
	Button as WpButton,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { link as linkIcon } from '@wordpress/icons';
import metadata from './block.json';
import { cx } from '../../utils/classes';

const VARIANTS = [
	{ label: 'Primary',   value: 'primary' },
	{ label: 'Secondary', value: 'secondary' },
	{ label: 'Outline',   value: 'outline' },
	{ label: 'Ghost',     value: 'ghost' },
	{ label: 'Link',      value: 'link' },
];

const SIZES = [
	{ label: 'XS', value: 'xs' },
	{ label: 'SM', value: 'sm' },
	{ label: 'MD', value: 'md' },
	{ label: 'LG', value: 'lg' },
	{ label: 'XL', value: 'xl' },
];

const RADII = [
	{ label: 'None',   value: 'none' },
	{ label: 'SM',     value: 'sm' },
	{ label: 'MD',     value: 'md' },
	{ label: 'LG',     value: 'lg' },
	{ label: 'XL',     value: 'xl' },
	{ label: 'Pill',   value: 'full' },
];

function variantClasses( v ) {
	switch ( v ) {
		case 'primary':   return 'bg-primary text-white hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2';
		case 'secondary': return 'bg-surface text-foreground hover:bg-border focus:ring-2 focus:ring-foreground/20';
		case 'outline':   return 'border-2 border-foreground text-foreground hover:bg-foreground hover:text-background';
		case 'ghost':     return 'text-foreground hover:bg-foreground/5';
		case 'link':      return 'text-primary underline-offset-4 hover:underline px-0 py-0';
		default:          return '';
	}
}

function sizeClasses( s ) {
	switch ( s ) {
		case 'xs': return 'text-xs px-2.5 py-1.5';
		case 'sm': return 'text-sm px-3 py-2';
		case 'md': return 'text-base px-5 py-2.5';
		case 'lg': return 'text-lg px-6 py-3';
		case 'xl': return 'text-xl px-8 py-4';
		default:   return '';
	}
}

function radiusClass( r ) {
	return r === 'none' ? 'rounded-none' : `rounded-${ r }`;
}

function computeClasses( a ) {
	return cx(
		'hatch-button inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
		variantClasses( a.variant ),
		sizeClasses( a.size ),
		radiusClass( a.radius ),
		a.fullWidth ? 'w-full' : ''
	);
}

registerBlockType( metadata.name, {
	...metadata,
	edit: ( { attributes, setAttributes, isSelected } ) => {
		const [ linkPopover, setLinkPopover ] = useState( false );
		const wrapperProps = useBlockProps( { className: 'hatch-button-wrap' } );

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Style', 'hatch-blocks' ) } initialOpen={ true }>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Variant', 'hatch-blocks' ) }
							value={ attributes.variant }
							options={ VARIANTS }
							onChange={ ( v ) => setAttributes( { variant: v } ) }
						/>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Size', 'hatch-blocks' ) }
							value={ attributes.size }
							options={ SIZES }
							onChange={ ( v ) => setAttributes( { size: v } ) }
						/>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Corner radius', 'hatch-blocks' ) }
							value={ attributes.radius }
							options={ RADII }
							onChange={ ( v ) => setAttributes( { radius: v } ) }
						/>
						<ToggleControl
							__nextHasNoMarginBottom
							label={ __( 'Full width', 'hatch-blocks' ) }
							checked={ attributes.fullWidth }
							onChange={ ( v ) => setAttributes( { fullWidth: v } ) }
						/>
					</PanelBody>

					<PanelBody title={ __( 'Icons', 'hatch-blocks' ) } initialOpen={ false }>
						<TextControl
							__nextHasNoMarginBottom
							label={ __( 'Left icon (heroicons name)', 'hatch-blocks' ) }
							value={ attributes.iconLeft }
							onChange={ ( v ) => setAttributes( { iconLeft: v } ) }
							placeholder="arrow-right"
							help={ __( 'Name of a Heroicon (outline). Leave empty for none.', 'hatch-blocks' ) }
						/>
						<TextControl
							__nextHasNoMarginBottom
							label={ __( 'Right icon', 'hatch-blocks' ) }
							value={ attributes.iconRight }
							onChange={ ( v ) => setAttributes( { iconRight: v } ) }
							placeholder="arrow-right"
						/>
					</PanelBody>

					<PanelBody title={ __( 'Link', 'hatch-blocks' ) } initialOpen={ false }>
						<TextControl
							__nextHasNoMarginBottom
							type="url"
							label={ __( 'URL', 'hatch-blocks' ) }
							value={ attributes.url }
							onChange={ ( v ) => setAttributes( { url: v } ) }
						/>
						<ToggleControl
							__nextHasNoMarginBottom
							label={ __( 'Open in new tab', 'hatch-blocks' ) }
							checked={ attributes.opensInNewTab }
							onChange={ ( v ) => setAttributes( {
								opensInNewTab: v,
								rel: v ? 'noopener noreferrer' : '',
							} ) }
						/>
						<TextControl
							__nextHasNoMarginBottom
							label={ __( 'rel attribute', 'hatch-blocks' ) }
							value={ attributes.rel }
							onChange={ ( v ) => setAttributes( { rel: v } ) }
							help={ __( 'e.g. "nofollow" or "noopener noreferrer"', 'hatch-blocks' ) }
						/>
					</PanelBody>
				</InspectorControls>

				<div { ...wrapperProps }>
					<a
						href={ attributes.url || '#' }
						className={ computeClasses( attributes ) }
						onClick={ ( e ) => e.preventDefault() }
					>
						{ attributes.iconLeft && <span aria-hidden="true" data-icon={ attributes.iconLeft } className="hatch-button-icon-left">⟶</span> }
						<RichText
							className="hatch-button-label"
							tagName="span"
							value={ attributes.text }
							onChange={ ( t ) => setAttributes( { text: t } ) }
							placeholder={ __( 'Button text', 'hatch-blocks' ) }
							allowedFormats={ [] }
						/>
						{ attributes.iconRight && <span aria-hidden="true" data-icon={ attributes.iconRight } className="hatch-button-icon-right">⟶</span> }
					</a>
				</div>
			</>
		);
	},

	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save();
		const rel = attributes.opensInNewTab && ! attributes.rel
			? 'noopener noreferrer'
			: attributes.rel;

		return (
			<div { ...blockProps }>
				<a
					href={ attributes.url || '#' }
					className={ computeClasses( attributes ) }
					target={ attributes.opensInNewTab ? '_blank' : undefined }
					rel={ rel || undefined }
				>
					{ attributes.iconLeft && (
						<span aria-hidden="true" data-icon={ attributes.iconLeft } className="hatch-button-icon-left" />
					) }
					<RichText.Content className="hatch-button-label" tagName="span" value={ attributes.text } />
					{ attributes.iconRight && (
						<span aria-hidden="true" data-icon={ attributes.iconRight } className="hatch-button-icon-right" />
					) }
				</a>
			</div>
		);
	},
} );

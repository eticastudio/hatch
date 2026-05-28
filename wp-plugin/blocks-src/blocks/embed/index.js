/**
 * Hatch generic Embed — iframe with sane allow + loading=lazy.
 *
 * Common URL normalization for Vimeo / Spotify / CodePen / Figma / Loom.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { Fragment } from '@wordpress/element';

function normalize( url ) {
	if ( ! url ) return '';
	const u = String( url ).trim();
	// Vimeo: convert vimeo.com/123 → player.vimeo.com/video/123
	const vimeo = u.match( /vimeo\.com\/(?!video\/)(\d+)/ );
	if ( vimeo ) return `https://player.vimeo.com/video/${ vimeo[1] }`;
	// Spotify: open.spotify.com/track/X → embed
	const spot = u.match( /open\.spotify\.com\/(track|album|episode|playlist|show|artist)\/([a-zA-Z0-9]+)/ );
	if ( spot ) return `https://open.spotify.com/embed/${ spot[1] }/${ spot[2] }`;
	// CodePen: codepen.io/x/pen/y → embed
	const pen = u.match( /codepen\.io\/([\w-]+)\/pen\/([\w-]+)/ );
	if ( pen ) return `https://codepen.io/${ pen[1] }/embed/${ pen[2] }`;
	// Loom share → embed
	const loom = u.match( /loom\.com\/share\/([\w-]+)/ );
	if ( loom ) return `https://www.loom.com/embed/${ loom[1] }`;
	// Otherwise: assume it's already an embed-ready URL
	return u;
}

registerBlockType( 'hatch/embed', {
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( {
			className: 'hatch-embed',
			style: { aspectRatio: attributes.aspectRatio },
		} );
		const src = normalize( attributes.url );
		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'Embed', 'hatch' ) } initialOpen={ true }>
						<TextControl label={ __( 'URL', 'hatch' ) } value={ attributes.url } onChange={ ( v ) => setAttributes( { url: v } ) } placeholder="https://…" />
						<TextControl label={ __( 'Accessible title', 'hatch' ) } value={ attributes.title } onChange={ ( v ) => setAttributes( { title: v } ) } />
						<TextControl label={ __( 'Aspect ratio (CSS)', 'hatch' ) } value={ attributes.aspectRatio } onChange={ ( v ) => setAttributes( { aspectRatio: v } ) } />
						<TextControl label={ __( 'iframe allow attribute', 'hatch' ) } value={ attributes.allowList } onChange={ ( v ) => setAttributes( { allowList: v } ) } />
					</PanelBody>
				</InspectorControls>
				<div { ...blockProps }>
					{ src ? (
						<iframe src={ src } title={ attributes.title } allow={ attributes.allowList } loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
					) : (
						<div className="hatch-embed-empty">{ __( 'Paste an embed URL →', 'hatch' ) }</div>
					) }
				</div>
			</Fragment>
		);
	},
	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( {
			className: 'hatch-embed',
			style: { aspectRatio: attributes.aspectRatio },
		} );
		const src = normalize( attributes.url );
		if ( ! src ) return null;
		return (
			<div { ...blockProps }>
				<iframe src={ src } title={ attributes.title } allow={ attributes.allowList } loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
			</div>
		);
	},
} );

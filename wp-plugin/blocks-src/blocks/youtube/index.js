/**
 * Hatch YouTube — facade-pattern lazy embed.
 *
 * Saved markup is a static <div data-hatch-youtube> with the thumbnail.
 * Hatch's interactive runtime upgrades it to a real iframe on click.
 * No iframe loads on page paint — biggest perf win for content sites.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl, SelectControl } from '@wordpress/components';
import { Fragment } from '@wordpress/element';

const RATIOS = [
	{ label: '16:9 (default)', value: '16/9' },
	{ label: '4:3',            value: '4/3' },
	{ label: '1:1 (square)',   value: '1/1' },
	{ label: '21:9 (cinema)',  value: '21/9' },
	{ label: '9:16 (vertical)',value: '9/16' },
];

function parseId( input ) {
	if ( ! input ) return '';
	const v = String( input ).trim();
	// Accept full URL or short URL or bare ID
	const reUrl = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/;
	const m = v.match( reUrl );
	if ( m ) return m[1];
	if ( /^[a-zA-Z0-9_-]{11}$/.test( v ) ) return v;
	return '';
}

function thumbUrl( id ) {
	return id ? `https://i.ytimg.com/vi/${ id }/hqdefault.jpg` : '';
}

registerBlockType( 'hatch/youtube', {
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( {
			className: 'hatch-youtube',
			style: { aspectRatio: attributes.aspectRatio },
		} );
		const thumb = attributes.thumbnail || thumbUrl( attributes.videoId );
		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'YouTube', 'hatch' ) } initialOpen={ true }>
						<TextControl
							label={ __( 'Video URL or ID', 'hatch' ) }
							value={ attributes.videoId }
							onChange={ ( v ) => {
								const id = parseId( v );
								setAttributes( { videoId: id, thumbnail: thumbUrl( id ) } );
							} }
							placeholder="https://youtube.com/watch?v=…"
						/>
						<TextControl
							label={ __( 'Custom thumbnail URL (optional)', 'hatch' ) }
							value={ attributes.thumbnail }
							onChange={ ( v ) => setAttributes( { thumbnail: v } ) }
							placeholder="https://…"
						/>
						<TextControl
							label={ __( 'Accessible title', 'hatch' ) }
							value={ attributes.title }
							onChange={ ( v ) => setAttributes( { title: v } ) }
						/>
						<SelectControl
							label={ __( 'Aspect ratio', 'hatch' ) }
							value={ attributes.aspectRatio }
							options={ RATIOS }
							onChange={ ( v ) => setAttributes( { aspectRatio: v } ) }
						/>
						<TextControl
							label={ __( 'Start time (seconds)', 'hatch' ) }
							value={ String( attributes.start || 0 ) }
							onChange={ ( v ) => setAttributes( { start: parseInt( v, 10 ) || 0 } ) }
						/>
						<ToggleControl
							label={ __( 'Show YouTube controls', 'hatch' ) }
							checked={ attributes.controls }
							onChange={ ( v ) => setAttributes( { controls: v } ) }
						/>
					</PanelBody>
				</InspectorControls>
				<div { ...blockProps }>
					{ attributes.videoId ? (
						<div className="hatch-youtube-facade">
							{ thumb && <img src={ thumb } alt={ attributes.title } /> }
							<button type="button" className="hatch-youtube-play" aria-label={ __( 'Play video', 'hatch' ) }>
								<span>▶</span>
							</button>
						</div>
					) : (
						<div className="hatch-youtube-empty">
							{ __( 'Paste a YouTube URL in the sidebar →', 'hatch' ) }
						</div>
					) }
				</div>
			</Fragment>
		);
	},
	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( {
			className: 'hatch-youtube',
			style: { aspectRatio: attributes.aspectRatio },
			'data-hatch-youtube': '',
			'data-video-id': attributes.videoId,
			'data-controls': attributes.controls ? '1' : '0',
			'data-start': attributes.start || 0,
		} );
		const thumb = attributes.thumbnail || thumbUrl( attributes.videoId );
		if ( ! attributes.videoId ) return null;
		return (
			<div { ...blockProps }>
				<img className="hatch-youtube-thumb" src={ thumb } alt={ attributes.title } loading="lazy" decoding="async" />
				<button type="button" className="hatch-youtube-play" aria-label={ `Play ${ attributes.title }` }>
					<svg viewBox="0 0 68 48" width="68" height="48" aria-hidden="true">
						<path d="M67 8.5C66.2 5.4 63.8 3 60.7 2.2 55 1 34 1 34 1S13 1 7.3 2.2C4.2 3 1.8 5.4 1 8.5 0 13.5 0 24 0 24s0 10.5 1 15.5c.8 3.1 3.2 5.5 6.3 6.3C13 47 34 47 34 47s21 0 26.7-1.2c3.1-.8 5.5-3.2 6.3-6.3 1-5 1-15.5 1-15.5s0-10.5-1-15.5z" fill="#f00"/>
						<path d="M27 34V14l18 10-18 10z" fill="#fff"/>
					</svg>
				</button>
			</div>
		);
	},
} );

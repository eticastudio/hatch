import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls, MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl, Button } from '@wordpress/components';
import { Fragment } from '@wordpress/element';

registerBlockType( 'hatch/video', {
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( {
			className: 'hatch-video',
			style: { aspectRatio: attributes.aspectRatio },
		} );
		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'Video', 'hatch' ) } initialOpen={ true }>
						<TextControl label={ __( 'MP4 URL', 'hatch' ) } value={ attributes.src } onChange={ ( v ) => setAttributes( { src: v } ) } />
						<MediaUploadCheck>
							<MediaUpload
								allowedTypes={ [ 'video' ] }
								value={ attributes.src }
								onSelect={ ( m ) => setAttributes( { src: m.url, poster: attributes.poster || m.image?.src || '' } ) }
								render={ ( { open } ) => <Button onClick={ open } variant="secondary">{ __( 'Pick from media library', 'hatch' ) }</Button> }
							/>
						</MediaUploadCheck>
						<TextControl label={ __( 'Poster image URL', 'hatch' ) } value={ attributes.poster } onChange={ ( v ) => setAttributes( { poster: v } ) } />
						<ToggleControl label={ __( 'Show controls', 'hatch' ) } checked={ attributes.controls } onChange={ ( v ) => setAttributes( { controls: v } ) } />
						<ToggleControl label={ __( 'Autoplay (requires muted)', 'hatch' ) } checked={ attributes.autoplay } onChange={ ( v ) => setAttributes( { autoplay: v, muted: v ? true : attributes.muted } ) } />
						<ToggleControl label={ __( 'Loop', 'hatch' ) } checked={ attributes.loop } onChange={ ( v ) => setAttributes( { loop: v } ) } />
						<ToggleControl label={ __( 'Muted', 'hatch' ) } checked={ attributes.muted } onChange={ ( v ) => setAttributes( { muted: v } ) } />
						<ToggleControl label={ __( 'Inline (mobile)', 'hatch' ) } checked={ attributes.playsinline } onChange={ ( v ) => setAttributes( { playsinline: v } ) } />
						<TextControl label={ __( 'Aspect ratio (CSS)', 'hatch' ) } value={ attributes.aspectRatio } onChange={ ( v ) => setAttributes( { aspectRatio: v } ) } />
					</PanelBody>
				</InspectorControls>
				<div { ...blockProps }>
					{ attributes.src ? (
						<video src={ attributes.src } poster={ attributes.poster } controls={ attributes.controls } muted preload="none" />
					) : (
						<div className="hatch-video-empty">{ __( 'Add a video URL or pick one →', 'hatch' ) }</div>
					) }
				</div>
			</Fragment>
		);
	},
	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( {
			className: 'hatch-video',
			style: { aspectRatio: attributes.aspectRatio },
		} );
		if ( ! attributes.src ) return null;
		return (
			<div { ...blockProps }>
				<video
					src={ attributes.src }
					poster={ attributes.poster || undefined }
					controls={ attributes.controls || undefined }
					autoPlay={ attributes.autoplay || undefined }
					loop={ attributes.loop || undefined }
					muted={ attributes.muted || undefined }
					playsInline={ attributes.playsinline || undefined }
					preload="none"
				/>
			</div>
		);
	},
} );

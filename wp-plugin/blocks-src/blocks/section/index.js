/**
 * Hatch Section block.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import {
	useBlockProps,
	InspectorControls,
	InnerBlocks,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	Button,
	__experimentalText as Text,
} from '@wordpress/components';
import metadata from './block.json';
import ColorPanel from '../../components/ColorPanel';
import SpacingPanel from '../../components/SpacingPanel';
import ResponsiveControl from '../../components/ResponsiveControl';
import { paddingClasses, marginClasses } from '../../utils/spacing-classes';
import { responsiveClasses, cx, colorClass } from '../../utils/classes';
import { SPACING_OPTIONS } from '../../utils/shared-attrs';

const GRADIENTS = [
	{ label: '— None —',           value: '' },
	{ label: 'Dawn (peach→pink)',  value: 'bg-gradient-to-br from-orange-300 via-rose-300 to-fuchsia-300' },
	{ label: 'Ocean (cyan→indigo)', value: 'bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600' },
	{ label: 'Aurora (green→violet)', value: 'bg-gradient-to-br from-emerald-400 via-teal-500 to-violet-600' },
	{ label: 'Sunset (red→purple)',  value: 'bg-gradient-to-br from-rose-500 via-fuchsia-500 to-purple-600' },
	{ label: 'Midnight (slate)',     value: 'bg-gradient-to-br from-slate-800 via-slate-900 to-black' },
	{ label: 'Mint (subtle)',        value: 'bg-gradient-to-br from-emerald-50 via-white to-cyan-50' },
];

const TAG_OPTIONS = [
	{ label: 'section', value: 'section' },
	{ label: 'div',     value: 'div' },
	{ label: 'header',  value: 'header' },
	{ label: 'footer',  value: 'footer' },
	{ label: 'main',    value: 'main' },
	{ label: 'aside',   value: 'aside' },
];

/**
 * Compute the section's full className string from attributes.
 *
 * @param {Object} a Attributes.
 * @returns {string}
 */
function computeClasses( a ) {
	return cx(
		'hatch-section relative',
		colorClass( 'bg', a.backgroundToken ),
		colorClass( 'text', a.textToken ),
		a.gradient,
		paddingClasses( a.padding ),
		marginClasses( a.margin ),
		responsiveClasses( 'min-h', a.minHeight ),
		a.backgroundImage ? 'bg-cover bg-center bg-no-repeat' : ''
	);
}

registerBlockType( metadata.name, {
	...metadata,
	edit: ( { attributes, setAttributes } ) => {
		const classes = computeClasses( attributes );
		const style = attributes.backgroundImage && attributes.backgroundImage.url
			? {
				backgroundImage: `url("${ attributes.backgroundImage.url }")`,
				backgroundSize: attributes.backgroundSize,
				backgroundPosition: attributes.backgroundPosition,
			}
			: undefined;

		const blockProps = useBlockProps( { className: classes, style } );

		return (
			<>
				<InspectorControls>
					<ColorPanel
						background={ attributes.backgroundToken }
						text={ attributes.textToken }
						onChange={ ( v ) => setAttributes( {
							backgroundToken: v.background ?? attributes.backgroundToken,
							textToken:       v.text       ?? attributes.textToken,
						} ) }
					/>

					<PanelBody title={ __( 'Background', 'hatch-blocks' ) } initialOpen={ false }>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Gradient preset', 'hatch-blocks' ) }
							value={ attributes.gradient }
							options={ GRADIENTS }
							onChange={ ( v ) => setAttributes( { gradient: v } ) }
						/>

						<MediaUploadCheck>
							<MediaUpload
								allowedTypes={ [ 'image' ] }
								value={ attributes.backgroundImage?.id }
								onSelect={ ( img ) => setAttributes( { backgroundImage: { id: img.id, url: img.url, alt: img.alt } } ) }
								render={ ( { open } ) => (
									<div style={ { marginTop: 12 } }>
										<div style={ { fontWeight: 500, marginBottom: 4 } }>{ __( 'Background image', 'hatch-blocks' ) }</div>
										{ attributes.backgroundImage?.url && (
											<img
												src={ attributes.backgroundImage.url }
												alt=""
												style={ { width: '100%', height: 80, objectFit: 'cover', borderRadius: 4, marginBottom: 6 } }
											/>
										) }
										<Button variant="secondary" onClick={ open }>
											{ attributes.backgroundImage ? __( 'Replace', 'hatch-blocks' ) : __( 'Choose image', 'hatch-blocks' ) }
										</Button>
										{ attributes.backgroundImage && (
											<Button
												variant="link"
												isDestructive
												onClick={ () => setAttributes( { backgroundImage: null } ) }
												style={ { marginLeft: 8 } }
											>
												{ __( 'Remove', 'hatch-blocks' ) }
											</Button>
										) }
									</div>
								) }
							/>
						</MediaUploadCheck>
					</PanelBody>

					<SpacingPanel
						padding={ attributes.padding }
						margin={ attributes.margin }
						onChangePadding={ ( v ) => setAttributes( { padding: v } ) }
						onChangeMargin={ ( v ) => setAttributes( { margin: v } ) }
					/>

					<PanelBody title={ __( 'Layout', 'hatch-blocks' ) } initialOpen={ false }>
						<ResponsiveControl
							label={ __( 'Min height', 'hatch-blocks' ) }
							value={ attributes.minHeight }
							onChange={ ( v ) => setAttributes( { minHeight: v } ) }
						>
							{ ( current, set ) => (
								<SelectControl
									__nextHasNoMarginBottom
									value={ current ?? '' }
									options={ [
										{ label: '— inherit —', value: '' },
										{ label: 'Auto',        value: 'auto' },
										{ label: 'screen',      value: 'screen' },
										{ label: '64',          value: '64' },
										{ label: '96',          value: '96' },
									] }
									onChange={ ( v ) => set( v === '' ? null : v ) }
								/>
							) }
						</ResponsiveControl>

						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'HTML tag', 'hatch-blocks' ) }
							value={ attributes.as }
							options={ TAG_OPTIONS }
							onChange={ ( v ) => setAttributes( { as: v } ) }
						/>
					</PanelBody>
				</InspectorControls>

				<div { ...blockProps }>
					<InnerBlocks
						templateLock={ false }
						orientation="vertical"
					/>
				</div>
			</>
		);
	},

	save: ( { attributes } ) => {
		const classes = computeClasses( attributes );
		const style = attributes.backgroundImage && attributes.backgroundImage.url
			? {
				backgroundImage: `url("${ attributes.backgroundImage.url }")`,
				backgroundSize: attributes.backgroundSize,
				backgroundPosition: attributes.backgroundPosition,
			}
			: undefined;

		const blockProps = useBlockProps.save( { className: classes, style } );
		const Tag = attributes.as || 'section';

		return (
			<Tag { ...blockProps }>
				<InnerBlocks.Content />
			</Tag>
		);
	},
} );

/**
 * Hatch Posts — ONE dynamic listing block for every post type.
 *
 * Save markup is a `<div data-hatch-posts>` placeholder with all the
 * query parameters as data-* attributes. Astro renders the real list
 * via /hatch/v1/content/list?…
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, RangeControl, SelectControl, ToggleControl } from '@wordpress/components';
import { Fragment } from '@wordpress/element';

const TEMPLATES = [
	{ label: 'Grid · 2 columns', value: 'grid-2' },
	{ label: 'Grid · 3 columns', value: 'grid-3' },
	{ label: 'Grid · 4 columns', value: 'grid-4' },
	{ label: 'List (full-width)', value: 'list' },
	{ label: 'Featured (1 large + 2 small)', value: 'featured' },
];
const ORDER_BY = [
	{ label: 'Date',          value: 'date' },
	{ label: 'Title',         value: 'title' },
	{ label: 'Modified',      value: 'modified' },
	{ label: 'Comment count', value: 'comment_count' },
	{ label: 'Random',        value: 'rand' },
];
const ORDER = [
	{ label: 'Descending', value: 'desc' },
	{ label: 'Ascending',  value: 'asc' },
];

registerBlockType( 'hatch/posts', {
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( { className: `hatch-posts hatch-posts-${ attributes.template }` } );
		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'Source', 'hatch' ) } initialOpen={ true }>
						<TextControl
							label={ __( 'Post type', 'hatch' ) }
							value={ attributes.postType }
							onChange={ ( v ) => setAttributes( { postType: v || 'post' } ) }
							help={ __( 'Default: post. Use any registered CPT slug — product, course, portfolio, etc.', 'hatch' ) }
						/>
						<TextControl label={ __( 'Taxonomy (optional)', 'hatch' ) } value={ attributes.taxonomy } onChange={ ( v ) => setAttributes( { taxonomy: v } ) } placeholder="category, tag, custom-tax" />
						<TextControl label={ __( 'Term slug (optional)', 'hatch' ) } value={ attributes.term } onChange={ ( v ) => setAttributes( { term: v } ) } />
						<TextControl label={ __( 'Author slug or ID (optional)', 'hatch' ) } value={ attributes.author } onChange={ ( v ) => setAttributes( { author: v } ) } />
					</PanelBody>
					<PanelBody title={ __( 'Display', 'hatch' ) } initialOpen={ true }>
						<SelectControl label={ __( 'Template', 'hatch' ) } value={ attributes.template } options={ TEMPLATES } onChange={ ( v ) => setAttributes( { template: v } ) } />
						<RangeControl label={ __( 'Per page', 'hatch' ) } value={ attributes.perPage } min={ 1 } max={ 24 } onChange={ ( v ) => setAttributes( { perPage: v } ) } />
						<SelectControl label={ __( 'Order by', 'hatch' ) } value={ attributes.orderBy } options={ ORDER_BY } onChange={ ( v ) => setAttributes( { orderBy: v } ) } />
						<SelectControl label={ __( 'Order', 'hatch' ) } value={ attributes.order } options={ ORDER } onChange={ ( v ) => setAttributes( { order: v } ) } />
						<ToggleControl label={ __( 'Show featured image', 'hatch' ) } checked={ attributes.showImage } onChange={ ( v ) => setAttributes( { showImage: v } ) } />
						<ToggleControl label={ __( 'Show excerpt', 'hatch' ) } checked={ attributes.showExcerpt } onChange={ ( v ) => setAttributes( { showExcerpt: v } ) } />
						<ToggleControl label={ __( 'Show meta (date + author)', 'hatch' ) } checked={ attributes.showMeta } onChange={ ( v ) => setAttributes( { showMeta: v } ) } />
					</PanelBody>
				</InspectorControls>
				<div { ...blockProps }>
					<div className="hatch-posts-placeholder">
						<strong>📰 { __( 'Posts', 'hatch' ) }</strong>
						<div>{ __( 'Type', 'hatch' ) }: <code>{ attributes.postType }</code> · { __( 'Template', 'hatch' ) }: <code>{ attributes.template }</code> · { attributes.perPage }/page</div>
						{ attributes.taxonomy && <div>{ __( 'Filter', 'hatch' ) }: <code>{ attributes.taxonomy }={ attributes.term || '*' }</code></div> }
						<small>{ __( 'Renders live on the Astro frontend.', 'hatch' ) }</small>
					</div>
				</div>
			</Fragment>
		);
	},
	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( {
			className: `hatch-posts hatch-posts-${ attributes.template }`,
			'data-hatch-posts': '',
			'data-post-type': attributes.postType,
			'data-per-page':  attributes.perPage,
			'data-taxonomy':  attributes.taxonomy || '',
			'data-term':      attributes.term || '',
			'data-author':    attributes.author || '',
			'data-order-by':  attributes.orderBy,
			'data-order':     attributes.order,
			'data-show-image':   attributes.showImage ? '1' : '0',
			'data-show-excerpt': attributes.showExcerpt ? '1' : '0',
			'data-show-meta':    attributes.showMeta ? '1' : '0',
		} );
		return (
			<div { ...blockProps }>
				<noscript>{ __( 'Loading posts…', 'hatch' ) }</noscript>
			</div>
		);
	},
} );

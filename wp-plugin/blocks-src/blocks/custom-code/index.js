/**
 * Hatch Custom Code block — controlled escape hatch.
 *
 * Three modes:
 *   inline — HTML + scoped CSS (no JS). Default. Safest.
 *   shadow — HTML + CSS + JS inside a Shadow DOM wrapper. Hydrated by Web Component.
 *   iframe — Full sandboxed iframe with allow-scripts. Auto-height via postMessage.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody, SelectControl, TextareaControl, RangeControl,
	Notice, Button as WpButton,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import metadata from './block.json';
import { SNIPPETS } from './snippets';

const MODES = [
	{ label: 'Inline (HTML + scoped CSS only)', value: 'inline' },
	{ label: 'Shadow DOM (with JS)',            value: 'shadow' },
	{ label: 'Iframe (full sandbox)',           value: 'iframe' },
];

/**
 * Prefix all CSS selectors so they only affect this block's wrapper.
 * Naive but effective — rejects @keyframes/@media as-is (they don't need scoping).
 *
 * @param {string} css
 * @param {string} wrapperClass
 * @returns {string}
 */
function scopeCss( css, wrapperClass ) {
	if ( ! css ) return '';
	// Quick scope: prepend wrapper class to top-level selectors.
	// We don't try to parse @rules; we leave them alone.
	return css.replace(
		/(^|\})\s*([^@{][^{]*)\{/g,
		( match, prefix, sel ) => {
			const scoped = sel.split( ',' ).map( ( s ) => `.${ wrapperClass } ${ s.trim() }` ).join( ', ' );
			return `${ prefix } ${ scoped } {`;
		}
	);
}

registerBlockType( metadata.name, {
	...metadata,
	edit: ( { attributes, setAttributes, clientId } ) => {
		const blockProps = useBlockProps( { className: 'hatch-custom-code-editor' } );
		const canUseRawHtml = useSelect( ( select ) => {
			const userId = select( 'core' ).getCurrentUser?.()?.id;
			return userId ? select( 'core' ).canUser( 'create', 'posts' ) : false;
		}, [] );
		const wrapperClass = `hatch-cc-${ clientId.slice( 0, 8 ) }`;

		const applySnippet = ( id ) => {
			const s = SNIPPETS.find( ( x ) => x.id === id );
			if ( ! s ) return;
			setAttributes( {
				snippetPreset: id,
				mode: s.mode || 'inline',
				html: s.html,
				css:  s.css,
				js:   s.js || '',
			} );
		};

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Mode', 'hatch-blocks' ) } initialOpen={ true }>
						<SelectControl
							__nextHasNoMarginBottom
							label={ __( 'Execution mode', 'hatch-blocks' ) }
							value={ attributes.mode }
							options={ MODES }
							onChange={ ( v ) => setAttributes( { mode: v } ) }
						/>
						{ attributes.mode === 'inline' && (
							<Notice status="info" isDismissible={ false }>
								{ __( 'JavaScript is stripped in Inline mode. Use Shadow DOM or Iframe to run JS.', 'hatch-blocks' ) }
							</Notice>
						) }
						{ attributes.mode === 'iframe' && (
							<RangeControl
								__nextHasNoMarginBottom
								label={ __( 'Iframe height (px)', 'hatch-blocks' ) }
								value={ attributes.iframeHeight }
								onChange={ ( v ) => setAttributes( { iframeHeight: v } ) }
								min={ 80 } max={ 1200 } step={ 20 }
							/>
						) }
					</PanelBody>

					<PanelBody title={ __( 'Snippets', 'hatch-blocks' ) } initialOpen={ true }>
						<p style={ { fontSize: 12, color: '#666', marginTop: 0 } }>
							{ __( 'Click to apply. You can edit afterwards.', 'hatch-blocks' ) }
						</p>
						<div style={ { display: 'flex', flexWrap: 'wrap', gap: 6 } }>
							{ SNIPPETS.map( ( s ) => (
								<WpButton
									key={ s.id }
									variant={ attributes.snippetPreset === s.id ? 'primary' : 'secondary' }
									size="small"
									onClick={ () => applySnippet( s.id ) }
								>
									{ s.label }
								</WpButton>
							) ) }
						</div>
					</PanelBody>
				</InspectorControls>

				<div { ...blockProps }>
					<div className="hatch-cc-editor-header">
						<span className="hatch-cc-mode-pill">{ attributes.mode.toUpperCase() }</span>
						{ ! canUseRawHtml && (
							<span className="hatch-cc-warning">
								🔒 { __( 'You lack unfiltered_html capability — code will be stripped on save.', 'hatch-blocks' ) }
							</span>
						) }
					</div>
					<TextareaControl
						__nextHasNoMarginBottom
						label="HTML"
						value={ attributes.html }
						onChange={ ( v ) => setAttributes( { html: v } ) }
						rows={ 6 }
						style={ { fontFamily: 'ui-monospace, monospace', fontSize: 13 } }
					/>
					<TextareaControl
						__nextHasNoMarginBottom
						label="CSS"
						value={ attributes.css }
						onChange={ ( v ) => setAttributes( { css: v } ) }
						rows={ 6 }
						style={ { fontFamily: 'ui-monospace, monospace', fontSize: 13 } }
					/>
					{ attributes.mode !== 'inline' && (
						<TextareaControl
							__nextHasNoMarginBottom
							label="JavaScript"
							value={ attributes.js }
							onChange={ ( v ) => setAttributes( { js: v } ) }
							rows={ 6 }
							style={ { fontFamily: 'ui-monospace, monospace', fontSize: 13 } }
						/>
					) }

					<div className="hatch-cc-preview-label">{ __( 'Preview', 'hatch-blocks' ) }</div>
					<div className={ `hatch-cc-preview ${ wrapperClass }` }>
						<style>{ scopeCss( attributes.css, wrapperClass ) }</style>
						<div dangerouslySetInnerHTML={ { __html: attributes.html } } />
					</div>
				</div>
			</>
		);
	},

	save: ( { attributes, clientId } ) => {
		const blockProps = useBlockProps.save( { className: 'hatch-custom-code' } );
		// clientId is not available on save — use a stable derivation.
		// We use a deterministic class from the HTML hash (best-effort uniqueness).
		const wrapperClass = `hatch-cc-${ Math.abs( hashCode( attributes.html + attributes.css ) ).toString( 36 ).slice( 0, 8 ) }`;

		const fullClass = `${ blockProps.className || '' } ${ wrapperClass } hatch-cc-mode-${ attributes.mode }`.trim();

		if ( 'iframe' === attributes.mode ) {
			const srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}${ attributes.css }</style></head><body>${ attributes.html }<script>${ attributes.js }<\/script></body></html>`;
			return (
				<div { ...blockProps } className={ fullClass } data-iframe-height={ attributes.iframeHeight }>
					<iframe
						title="Custom code"
						sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
						srcDoc={ srcdoc }
						style={ { width: '100%', height: `${ attributes.iframeHeight }px`, border: 0, display: 'block' } }
					/>
				</div>
			);
		}

		if ( 'shadow' === attributes.mode ) {
			// Render a custom element. The frontend Web Component attaches Shadow DOM.
			return (
				<div { ...blockProps } className={ fullClass }>
					<hatch-shadow-code
						data-html={ encodeURIComponent( attributes.html ) }
						data-css={ encodeURIComponent( attributes.css ) }
						data-js={ encodeURIComponent( attributes.js ) }
					/>
				</div>
			);
		}

		// inline mode (default).
		return (
			<div { ...blockProps } className={ fullClass }>
				<style dangerouslySetInnerHTML={ { __html: scopeCss( attributes.css, wrapperClass ) } } />
				<div dangerouslySetInnerHTML={ { __html: attributes.html } } />
			</div>
		);
	},
} );

/**
 * Simple deterministic hash used only for generating a stable wrapper class name.
 */
function hashCode( str ) {
	let h = 0;
	for ( let i = 0; i < str.length; i++ ) {
		h = ( h << 5 ) - h + str.charCodeAt( i );
		h |= 0;
	}
	return h;
}

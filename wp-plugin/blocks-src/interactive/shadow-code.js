/**
 * <hatch-shadow-code> — Web Component for the Custom Code block's shadow mode.
 *
 * Hydrates HTML+CSS+JS inside a Shadow DOM. Scopes everything to the component
 * boundary. JS runs in the page's main realm (use iframe mode for full isolation).
 *
 * Browsers: all modern (Shadow DOM v1 — Chrome 53+, Firefox 63+, Safari 10+).
 *
 * @package HatchBlocks
 */

class HatchShadowCode extends HTMLElement {
	connectedCallback() {
		if ( this._mounted ) return;
		this._mounted = true;

		const html = decodeURIComponent( this.dataset.html || '' );
		const css  = decodeURIComponent( this.dataset.css || '' );
		const js   = decodeURIComponent( this.dataset.js || '' );

		const root = this.attachShadow( { mode: 'open' } );

		if ( css ) {
			const style = document.createElement( 'style' );
			style.textContent = css;
			root.appendChild( style );
		}
		if ( html ) {
			const wrap = document.createElement( 'div' );
			wrap.innerHTML = html;
			root.appendChild( wrap );
		}
		if ( js ) {
			try {
				// JS runs in main realm but has shadowRoot in scope as `this`.
				const fn = new Function( 'shadowRoot', js );
				fn.call( this, root );
			} catch ( e ) {
				// eslint-disable-next-line no-console
				console.error( '[hatch-shadow-code]', e );
			}
		}
	}
}

if ( typeof window !== 'undefined' && ! customElements.get( 'hatch-shadow-code' ) ) {
	customElements.define( 'hatch-shadow-code', HatchShadowCode );
}

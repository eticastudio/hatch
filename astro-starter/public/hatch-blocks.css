/* Hatch Blocks — concatenated frontend stylesheets */

/* === accordion === */
.hatch-accordion { margin: var( --hatch-spacing, 1rem ) 0; border-radius: var( --hatch-radius, 6px ); }
.hatch-accordion-item { border-bottom: 1px solid var( --hatch-border, #e5e5e5 ); }
.hatch-accordion-item:first-child { border-top: 1px solid var( --hatch-border, #e5e5e5 ); }
.hatch-accordion-item summary { padding: 0.9em 0; cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; font-weight: 500; color: var( --hatch-fg, #0a0a0a ); }
.hatch-accordion-item summary::-webkit-details-marker { display: none; }
.hatch-accordion-item summary::after { content: '+'; font-size: 1.4em; line-height: 1; color: var( --hatch-muted, #737373 ); transition: transform 0.2s; }
.hatch-accordion-item[open] summary::after { content: '−'; }
.hatch-accordion-item summary:hover { color: var( --hatch-primary, #ff6b35 ); }
.hatch-accordion-body { padding: 0 0 1em; color: var( --hatch-fg, #0a0a0a ); }

/* === button === */
.hatch-button-wrap { display: inline-block; }
.hatch-button { text-decoration: none; cursor: pointer; }
.hatch-button-icon-left,
.hatch-button-icon-right {
	display: inline-flex;
	width: 1em;
	height: 1em;
	flex-shrink: 0;
}

/* === columns === */
.hatch-columns { display: grid; grid-template-columns: 1fr; margin: var( --hatch-spacing, 1rem ) 0; }

/* Gap tokens (use --hatch-spacing scale) */
.hatch-cols-gap-none { gap: 0; }
.hatch-cols-gap-sm   { gap: calc( var( --hatch-spacing, 1rem ) * 0.5 ); }
.hatch-cols-gap-md   { gap: calc( var( --hatch-spacing, 1rem ) * 1 ); }
.hatch-cols-gap-lg   { gap: calc( var( --hatch-spacing, 1rem ) * 2 ); }
.hatch-cols-gap-xl   { gap: calc( var( --hatch-spacing, 1rem ) * 3 ); }

/* Align items (cross-axis in grid) */
.hatch-cols-align-start   { align-items: start; }
.hatch-cols-align-center  { align-items: center; }
.hatch-cols-align-end     { align-items: end; }
.hatch-cols-align-stretch { align-items: stretch; }

/* Stack rules — when stackAt breakpoint NOT met, stack 1col */
.hatch-cols-stack-never  { grid-template-columns: repeat( var( --hatch-cols-count, 2 ), minmax( 0, 1fr ) ); }

@media ( min-width: 640px )  { .hatch-cols-stack-sm { grid-template-columns: repeat( var( --hatch-cols-count, 2 ), minmax( 0, 1fr ) ); } }
@media ( min-width: 768px )  { .hatch-cols-stack-md { grid-template-columns: repeat( var( --hatch-cols-count, 2 ), minmax( 0, 1fr ) ); } }
@media ( min-width: 1024px ) { .hatch-cols-stack-lg { grid-template-columns: repeat( var( --hatch-cols-count, 2 ), minmax( 0, 1fr ) ); } }

/* Column count token */
.hatch-cols-1 { --hatch-cols-count: 1; }
.hatch-cols-2 { --hatch-cols-count: 2; }
.hatch-cols-3 { --hatch-cols-count: 3; }
.hatch-cols-4 { --hatch-cols-count: 4; }
.hatch-cols-5 { --hatch-cols-count: 5; }
.hatch-cols-6 { --hatch-cols-count: 6; }

/* === container === */
.hatch-container {
	box-sizing: border-box;
}

/* === cover === */
.hatch-cover { position: relative; overflow: hidden; display: flex; padding: 2rem; border-radius: var( --hatch-radius, 6px ); margin: var( --hatch-spacing, 1rem ) 0; background: var( --hatch-surface-2, #f4f4f5 ); background-size: cover; background-position: center; min-height: 240px; color: #fff; }
.hatch-cover-overlay { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
.hatch-cover-inner { position: relative; z-index: 2; max-width: 100%; width: 100%; }

/* Text horizontal */
.hatch-cover-text-left   .hatch-cover-inner { text-align: left; }
.hatch-cover-text-center .hatch-cover-inner { text-align: center; margin: 0 auto; }
.hatch-cover-text-right  .hatch-cover-inner { text-align: right; margin-left: auto; }

/* Vertical alignment via flex */
.hatch-cover-v-top    { align-items: flex-start; }
.hatch-cover-v-center { align-items: center; }
.hatch-cover-v-bottom { align-items: flex-end; }

/* === custom-code === */
/* Editor preview affordances for the Custom Code block. */
.hatch-custom-code-editor {
	border: 1px dashed #cbd5e1;
	border-radius: 8px;
	padding: 12px;
	background: #f8fafc;
}
.hatch-cc-editor-header {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 8px;
}
.hatch-cc-mode-pill {
	font-size: 11px;
	font-weight: 600;
	padding: 2px 8px;
	border-radius: 999px;
	background: #1e293b;
	color: #fff;
	letter-spacing: 0.04em;
}
.hatch-cc-warning {
	font-size: 12px;
	color: #b45309;
}
.hatch-cc-preview-label {
	font-size: 12px;
	font-weight: 600;
	color: #475569;
	margin-top: 12px;
	margin-bottom: 6px;
}
.hatch-cc-preview {
	background: #fff;
	border: 1px solid #e2e8f0;
	border-radius: 6px;
	padding: 12px;
	overflow: auto;
}

/* Frontend wrapper — keep it neutral. */
.hatch-custom-code { display: block; }

/* === divider === */
.hatch-divider { border: 0; border-top-width: 1px; border-style: solid; border-color: var( --hatch-border, #e5e5e5 ); width: 100%; margin: var( --hatch-spacing, 1rem ) 0; }

/* Style variants */
.hatch-divider-solid  { border-top-style: solid; }
.hatch-divider-dashed { border-top-style: dashed; }
.hatch-divider-dotted { border-top-style: dotted; }
.hatch-divider-double { border-top-style: double; border-top-width: 3px; }
.hatch-divider-fade { border: 0; height: 1px; background: linear-gradient( 90deg, transparent, var( --hatch-border, #e5e5e5 ), transparent ); }

/* Thickness */
.hatch-divider-t-1 { border-top-width: 1px; }
.hatch-divider-t-2 { border-top-width: 2px; }
.hatch-divider-t-3 { border-top-width: 3px; }
.hatch-divider-t-4 { border-top-width: 4px; }

/* Color tokens */
.hatch-divider-c-border  { border-color: var( --hatch-border,  #e5e5e5 ); }
.hatch-divider-c-fg      { border-color: var( --hatch-fg,      #0a0a0a ); }
.hatch-divider-c-muted   { border-color: var( --hatch-muted,   #737373 ); }
.hatch-divider-c-primary { border-color: var( --hatch-primary, #ff6b35 ); }
.hatch-divider-c-accent  { border-color: var( --hatch-accent,  #0a0a0a ); }

/* Width */
.hatch-divider-w-full   { width: 100%; }
.hatch-divider-w-wide   { width: 75%; margin-left: auto; margin-right: auto; }
.hatch-divider-w-md     { width: 50%; margin-left: auto; margin-right: auto; }
.hatch-divider-w-narrow { width: 25%; margin-left: auto; margin-right: auto; }

/* === embed === */
.hatch-embed { position: relative; overflow: hidden; background: #000; border-radius: var( --hatch-radius, 6px ); margin: var( --hatch-spacing, 1rem ) 0; max-width: 100%; }
.hatch-embed iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.hatch-embed-empty { display: grid; place-items: center; min-height: 180px; color: var( --hatch-muted, #737373 ); background: var( --hatch-surface-2, #f4f4f5 ); }

/* === form === */
.hatch-form { margin: var( --hatch-spacing, 1rem ) 0; padding: 1rem; background: var( --hatch-surface, #fff ); border: 1px solid var( --hatch-border, #e5e5e5 ); border-radius: var( --hatch-radius, 6px ); }
.hatch-form-label { margin: 0 0 0.6em; font-weight: 600; color: var( --hatch-fg, #0a0a0a ); }

.hatch-form-placeholder .hatch-form-stub { padding: 1.25rem; background: var( --hatch-surface-2, #f4f4f5 ); border: 1px dashed var( --hatch-border-2, #d4d4d4 ); border-radius: var( --hatch-radius, 6px ); display: grid; gap: 0.25em; color: var( --hatch-muted, #737373 ); }
.hatch-form-placeholder strong { color: var( --hatch-fg, #0a0a0a ); }
.hatch-form-placeholder small { font-size: 0.8em; opacity: 0.7; }

/* === gallery === */
.hatch-gallery { display: grid; grid-template-columns: repeat( var( --hatch-gallery-cols, 3 ), minmax( 0, 1fr ) ); margin: var( --hatch-spacing, 1rem ) 0; }
.hatch-gallery-cell { margin: 0; overflow: hidden; border-radius: var( --hatch-radius, 6px ); background: var( --hatch-surface-2, #f4f4f5 ); }
.hatch-gallery-cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
.hatch-gallery-cell:has(img):hover img { transform: scale( 1.02 ); transition: transform 0.3s ease; }
.hatch-gallery-empty { grid-column: 1 / -1; padding: 3rem; text-align: center; color: var( --hatch-muted, #737373 ); background: var( --hatch-surface-2, #f4f4f5 ); border-radius: var( --hatch-radius, 6px ); }

.hatch-gallery-cols-1 { --hatch-gallery-cols: 1; }
.hatch-gallery-cols-2 { --hatch-gallery-cols: 2; }
.hatch-gallery-cols-3 { --hatch-gallery-cols: 3; }
.hatch-gallery-cols-4 { --hatch-gallery-cols: 4; }
.hatch-gallery-cols-5 { --hatch-gallery-cols: 5; }
.hatch-gallery-cols-6 { --hatch-gallery-cols: 6; }

.hatch-gallery-gap-none { gap: 0; }
.hatch-gallery-gap-xs   { gap: 0.25rem; }
.hatch-gallery-gap-sm   { gap: 0.5rem; }
.hatch-gallery-gap-md   { gap: 1rem; }
.hatch-gallery-gap-lg   { gap: 1.5rem; }

/* Masonry — CSS columns approach (no JS) */
.hatch-gallery-masonry { display: block; column-count: var( --hatch-gallery-cols, 3 ); column-gap: 1rem; }
.hatch-gallery-masonry .hatch-gallery-cell { break-inside: avoid; margin-bottom: 1rem; }
.hatch-gallery-masonry .hatch-gallery-cell img { aspect-ratio: auto !important; }

@media ( max-width: 640px ) { .hatch-gallery { grid-template-columns: 1fr; } .hatch-gallery-masonry { column-count: 1; } }

/* === group === */
.hatch-group { display: flex; flex-direction: column; }
.hatch-group-stack { flex-direction: column; }
.hatch-group-row   { flex-direction: row; }
.hatch-group-grid  { display: grid; grid-template-columns: repeat( var( --hatch-grid-cols, 1 ), minmax( 0, 1fr ) ); }
.hatch-group-wrap  { flex-wrap: wrap; }

/* Gap tokens */
.hatch-group-gap-none { gap: 0; }
.hatch-group-gap-xs   { gap: calc( var( --hatch-spacing, 1rem ) * 0.25 ); }
.hatch-group-gap-sm   { gap: calc( var( --hatch-spacing, 1rem ) * 0.5 ); }
.hatch-group-gap-md   { gap: calc( var( --hatch-spacing, 1rem ) * 1 ); }
.hatch-group-gap-lg   { gap: calc( var( --hatch-spacing, 1rem ) * 2 ); }
.hatch-group-gap-xl   { gap: calc( var( --hatch-spacing, 1rem ) * 3 ); }

/* Cross-axis (align-items) */
.hatch-group-align-start   { align-items: flex-start; }
.hatch-group-align-center  { align-items: center; }
.hatch-group-align-end     { align-items: flex-end; }
.hatch-group-align-stretch { align-items: stretch; }

/* Main-axis (justify-content) */
.hatch-group-justify-start   { justify-content: flex-start; }
.hatch-group-justify-center  { justify-content: center; }
.hatch-group-justify-end     { justify-content: flex-end; }
.hatch-group-justify-between { justify-content: space-between; }
.hatch-group-justify-around  { justify-content: space-around; }

/* Responsive grid: stack < md, multi-col >= md */
@media ( min-width: 768px ) {
	.hatch-group-grid { --hatch-grid-cols: 2; }
}
@media ( min-width: 1024px ) {
	.hatch-group-grid { --hatch-grid-cols: 3; }
}

/* === list === */
.hatch-list { padding-left: 1.5em; margin: var( --hatch-spacing, 1rem ) 0; color: var( --hatch-fg, #0a0a0a ); }
.hatch-list li { padding-left: 0.25em; margin: 0.4em 0; line-height: 1.55; }

.hatch-list-disc   { list-style: disc; }
.hatch-list-circle { list-style: circle; }
.hatch-list-square { list-style: square; }
.hatch-list-none   { list-style: none; padding-left: 0; }
.hatch-list-decimal               { list-style: decimal; }
.hatch-list-decimal-leading-zero  { list-style: decimal-leading-zero; }
.hatch-list-lower-alpha           { list-style: lower-alpha; }
.hatch-list-upper-alpha           { list-style: upper-alpha; }
.hatch-list-lower-roman           { list-style: lower-roman; }
.hatch-list-upper-roman           { list-style: upper-roman; }

/* Custom markers: check / arrow — use ::marker for native browsers */
.hatch-list-check  { list-style: none; padding-left: 1.75em; }
.hatch-list-check  li::before { content: '✓'; color: var( --hatch-primary, #ff6b35 ); position: absolute; transform: translateX( -1.5em ); font-weight: 600; }
.hatch-list-arrow  { list-style: none; padding-left: 1.75em; }
.hatch-list-arrow  li::before { content: '→'; color: var( --hatch-primary, #ff6b35 ); position: absolute; transform: translateX( -1.5em ); font-weight: 600; }
.hatch-list-check li, .hatch-list-arrow li { position: relative; }

/* === posts === */
.hatch-posts { margin: var( --hatch-spacing, 1rem ) 0; display: grid; gap: 1.5rem; }
.hatch-posts-grid-2 { grid-template-columns: repeat( 2, minmax( 0, 1fr ) ); }
.hatch-posts-grid-3 { grid-template-columns: repeat( 3, minmax( 0, 1fr ) ); }
.hatch-posts-grid-4 { grid-template-columns: repeat( 4, minmax( 0, 1fr ) ); }
.hatch-posts-list   { grid-template-columns: 1fr; }
.hatch-posts-featured { grid-template-columns: 2fr 1fr; grid-template-rows: auto auto; gap: 1rem; }
.hatch-posts-featured > :first-child { grid-row: 1 / 3; }

@media ( max-width: 768px ) { .hatch-posts { grid-template-columns: 1fr !important; } }

/* Editor placeholder */
.hatch-posts-placeholder { padding: 1.25rem; background: var( --hatch-surface-2, #f4f4f5 ); border: 1px dashed var( --hatch-border-2, #d4d4d4 ); border-radius: var( --hatch-radius, 6px ); color: var( --hatch-muted, #737373 ); display: grid; gap: 0.4em; grid-column: 1 / -1; }
.hatch-posts-placeholder strong { color: var( --hatch-fg, #0a0a0a ); }
.hatch-posts-placeholder code { background: var( --hatch-bg, #fff ); padding: 0.1em 0.4em; border-radius: 3px; font-size: 0.92em; }
.hatch-posts-placeholder small { font-size: 0.8em; opacity: 0.7; }

/* Rendered card */
.hatch-posts a.hatch-post-card { display: block; color: inherit; text-decoration: none; border-radius: var( --hatch-radius, 6px ); overflow: hidden; }
.hatch-posts .hatch-post-card-image { aspect-ratio: 16/10; background: var( --hatch-surface-2, #f4f4f5 ); }
.hatch-posts .hatch-post-card-image img { width: 100%; height: 100%; object-fit: cover; }
.hatch-posts .hatch-post-card-body { padding: 0.75em 0; }
.hatch-posts .hatch-post-card-title { font-weight: 600; font-size: 1.05em; margin: 0 0 0.4em; }
.hatch-posts .hatch-post-card-excerpt { color: var( --hatch-muted, #525252 ); font-size: 0.92em; margin: 0; }
.hatch-posts .hatch-post-card-meta { font-size: 0.82em; color: var( --hatch-subtle, #737373 ); margin-top: 0.4em; }

/* === quote === */
.hatch-quote { margin: var( --hatch-spacing, 1rem ) 0; padding: 0 0 0 1.25em; border-left: 3px solid var( --hatch-accent, #0a0a0a ); color: var( --hatch-fg, #0a0a0a ); font-style: italic; }
.hatch-quote-text { margin: 0 0 0.5em; line-height: 1.55; }
.hatch-quote-cite { display: block; font-style: normal; font-size: 0.875em; color: var( --hatch-muted, #525252 ); margin-top: 0.6em; }
.hatch-quote-cite:before { content: '— '; }

/* Variants */
.hatch-quote-pull { padding: 0; border: 0; text-align: center; font-style: normal; }
.hatch-quote-pull .hatch-quote-text { font-family: var( --hatch-font-heading ); font-weight: 600; }
.hatch-quote-minimal { border: 0; padding-left: 0; }

/* Sizes */
.hatch-quote-sm .hatch-quote-text  { font-size: 0.95em; }
.hatch-quote-md .hatch-quote-text  { font-size: 1.05em; }
.hatch-quote-lg .hatch-quote-text  { font-size: 1.3em; }
.hatch-quote-xl .hatch-quote-text  { font-size: 1.6em; }

/* === search === */
.hatch-search { display: flex; gap: 0.5rem; margin: var( --hatch-spacing, 1rem ) 0; align-items: center; max-width: 100%; }
.hatch-search input { flex: 1; padding: 0.6em 0.9em; border: 1px solid var( --hatch-border, #e5e5e5 ); border-radius: var( --hatch-radius, 6px ); font: inherit; background: var( --hatch-bg, #fff ); color: var( --hatch-fg, #0a0a0a ); }
.hatch-search input:focus { outline: 2px solid var( --hatch-primary, #ff6b35 ); outline-offset: 2px; }
.hatch-search button { padding: 0.6em 1.1em; border: 0; border-radius: var( --hatch-radius, 6px ); background: var( --hatch-fg, #0a0a0a ); color: var( --hatch-bg, #fff ); cursor: pointer; font: inherit; font-weight: 500; }
.hatch-search button:hover { background: var( --hatch-primary, #ff6b35 ); }

/* Variants */
.hatch-search-pill input, .hatch-search-pill button { border-radius: 999px; }
.hatch-search-boxed { padding: 0.4em; background: var( --hatch-surface-2, #f4f4f5 ); border-radius: var( --hatch-radius, 6px ); }
.hatch-search-boxed input { border-color: transparent; background: transparent; }

.screen-reader-text { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect( 0,0,0,0 ); white-space: nowrap; border: 0; }

/* === section === */
/* Hatch Section — base styles. Most styling comes from Tailwind utility classes
   applied at save time; this file only contains structural rules that Tailwind
   can't express via utilities (e.g. fallback when no padding is set). */

.hatch-section {
	display: block;
	width: 100%;
	box-sizing: border-box;
}

.hatch-section > .wp-block-hatch-container,
.hatch-section > .hatch-container {
	margin-left: auto;
	margin-right: auto;
}

/* === smart === */
.hatch-smart { margin: var( --hatch-spacing, 1rem ) 0; }
.hatch-smart-empty { padding: 3rem 1.5rem; text-align: center; background: linear-gradient( 135deg, var( --hatch-surface-2, #f4f4f5 ), var( --hatch-surface, #fff ) ); border: 1px dashed var( --hatch-border-2, #d4d4d4 ); border-radius: var( --hatch-radius, 6px ); color: var( --hatch-muted, #525252 ); }
.hatch-smart-empty strong { font-size: 1.25em; color: var( --hatch-fg, #0a0a0a ); display: block; margin-bottom: 0.5em; }
.hatch-smart-empty p { margin: 0; }

/* === spacer === */
/**
 * Hatch Spacer block — frontend + editor.
 *
 * Heights map to spacing tokens. Density token (--hatch-density) on
 * <html data-hatch-theme> scales all of them at once when set from the
 * Design tab.
 */
.hatch-spacer { display: block; width: 100%; height: calc( var(--hatch-spacing, 1rem) * 1 ); }
.hatch-spacer-xs  { height: calc( var(--hatch-spacing, 1rem) * 0.5 ); }
.hatch-spacer-sm  { height: calc( var(--hatch-spacing, 1rem) * 1 ); }
.hatch-spacer-md  { height: calc( var(--hatch-spacing, 1rem) * 2 ); }
.hatch-spacer-lg  { height: calc( var(--hatch-spacing, 1rem) * 3 ); }
.hatch-spacer-xl  { height: calc( var(--hatch-spacing, 1rem) * 5 ); }
.hatch-spacer-2xl { height: calc( var(--hatch-spacing, 1rem) * 8 ); }

/* Responsive: sm: ≥ 640px, md: ≥ 768px, lg: ≥ 1024px. */
@media ( min-width: 640px )  { .sm\:hatch-spacer-xs{height:calc(var(--hatch-spacing,1rem) * 0.5)} .sm\:hatch-spacer-sm{height:calc(var(--hatch-spacing,1rem) * 1)} .sm\:hatch-spacer-md{height:calc(var(--hatch-spacing,1rem) * 2)} .sm\:hatch-spacer-lg{height:calc(var(--hatch-spacing,1rem) * 3)} .sm\:hatch-spacer-xl{height:calc(var(--hatch-spacing,1rem) * 5)} .sm\:hatch-spacer-2xl{height:calc(var(--hatch-spacing,1rem) * 8)} }
@media ( min-width: 768px )  { .md\:hatch-spacer-xs{height:calc(var(--hatch-spacing,1rem) * 0.5)} .md\:hatch-spacer-sm{height:calc(var(--hatch-spacing,1rem) * 1)} .md\:hatch-spacer-md{height:calc(var(--hatch-spacing,1rem) * 2)} .md\:hatch-spacer-lg{height:calc(var(--hatch-spacing,1rem) * 3)} .md\:hatch-spacer-xl{height:calc(var(--hatch-spacing,1rem) * 5)} .md\:hatch-spacer-2xl{height:calc(var(--hatch-spacing,1rem) * 8)} }
@media ( min-width: 1024px ) { .lg\:hatch-spacer-xs{height:calc(var(--hatch-spacing,1rem) * 0.5)} .lg\:hatch-spacer-sm{height:calc(var(--hatch-spacing,1rem) * 1)} .lg\:hatch-spacer-md{height:calc(var(--hatch-spacing,1rem) * 2)} .lg\:hatch-spacer-lg{height:calc(var(--hatch-spacing,1rem) * 3)} .lg\:hatch-spacer-xl{height:calc(var(--hatch-spacing,1rem) * 5)} .lg\:hatch-spacer-2xl{height:calc(var(--hatch-spacing,1rem) * 8)} }

/* Editor-only: faint outline so block is visible while empty. */
.editor-styles-wrapper .hatch-spacer {
	background-image: repeating-linear-gradient( 45deg, rgba( 100, 100, 100, 0.08 ) 0 4px, transparent 4px 8px );
	border-radius: 4px;
}

/* === table === */
.hatch-table { margin: var( --hatch-spacing, 1rem ) 0; }
.hatch-table-scroll { overflow-x: auto; }
.hatch-table table { width: 100%; border-collapse: collapse; }
.hatch-table th, .hatch-table td { padding: 0.75em 1em; text-align: left; vertical-align: top; }
.hatch-table th { font-weight: 600; color: var( --hatch-fg, #0a0a0a ); background: var( --hatch-surface-2, #f4f4f5 ); border-bottom: 2px solid var( --hatch-border, #e5e5e5 ); }
.hatch-table td { color: var( --hatch-fg, #0a0a0a ); border-bottom: 1px solid var( --hatch-border, #e5e5e5 ); }
.hatch-table-caption { font-size: 0.875em; color: var( --hatch-muted, #525252 ); margin-top: 0.6em; text-align: center; }

/* Variants */
.hatch-table-striped tbody tr:nth-child( odd ) td { background: var( --hatch-surface-2, #f4f4f5 ); }
.hatch-table-bordered th, .hatch-table-bordered td { border: 1px solid var( --hatch-border, #e5e5e5 ); }
.hatch-table-compact th, .hatch-table-compact td { padding: 0.4em 0.7em; font-size: 0.92em; }

/* Editor-only delete buttons */
.editor-styles-wrapper .hatch-table-del, .editor-styles-wrapper .hatch-table-rowdel button {
	background: none; border: 0; color: #b91c1c; cursor: pointer; font-size: 1em; margin-left: 0.4em; opacity: 0.5;
}
.editor-styles-wrapper .hatch-table-del:hover, .editor-styles-wrapper .hatch-table-rowdel button:hover { opacity: 1; }

/* === tabs === */
.hatch-tabs { margin: var( --hatch-spacing, 1rem ) 0; }
.hatch-tabs-nav { display: flex; flex-wrap: wrap; gap: 0.25rem; border-bottom: 1px solid var( --hatch-border, #e5e5e5 ); margin-bottom: 1rem; }
.hatch-tabs-tab { background: none; border: 0; padding: 0.6em 1em; cursor: pointer; color: var( --hatch-muted, #525252 ); font: inherit; }
.hatch-tabs-tab.is-active { color: var( --hatch-fg, #0a0a0a ); }
.hatch-tabs-panel { color: var( --hatch-fg, #0a0a0a ); }
.hatch-tabs-panel:not(.is-active) { display: none; }

/* Variants */
.hatch-tabs-underline .hatch-tabs-tab.is-active { box-shadow: inset 0 -2px 0 var( --hatch-primary, #ff6b35 ); }
.hatch-tabs-pills .hatch-tabs-nav { border: 0; gap: 0.5rem; }
.hatch-tabs-pills .hatch-tabs-tab { border-radius: 999px; padding: 0.4em 0.9em; background: var( --hatch-surface-2, #f4f4f5 ); }
.hatch-tabs-pills .hatch-tabs-tab.is-active { background: var( --hatch-fg, #0a0a0a ); color: var( --hatch-bg, #fff ); }
.hatch-tabs-boxed .hatch-tabs-tab { border: 1px solid transparent; border-bottom: 0; border-radius: var( --hatch-radius, 6px ) var( --hatch-radius, 6px ) 0 0; }
.hatch-tabs-boxed .hatch-tabs-tab.is-active { border-color: var( --hatch-border, #e5e5e5 ); background: var( --hatch-bg, #fff ); margin-bottom: -1px; }

/* === video === */
.hatch-video { position: relative; overflow: hidden; background: #000; border-radius: var( --hatch-radius, 6px ); margin: var( --hatch-spacing, 1rem ) 0; max-width: 100%; }
.hatch-video video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hatch-video-empty { display: grid; place-items: center; min-height: 200px; color: var( --hatch-muted, #737373 ); background: var( --hatch-surface-2, #f4f4f5 ); }

/* === youtube === */
.hatch-youtube { position: relative; overflow: hidden; background: #000; border-radius: var( --hatch-radius, 6px ); margin: var( --hatch-spacing, 1rem ) 0; max-width: 100%; cursor: pointer; aspect-ratio: 16 / 9; }
.hatch-youtube-thumb, .hatch-youtube-facade img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.hatch-youtube-play { position: absolute; inset: 0; display: grid; place-items: center; background: linear-gradient( 180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 100% ); border: 0; cursor: pointer; transition: background 0.25s ease; }
.hatch-youtube-play:hover { background: linear-gradient( 180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 100% ); }
.hatch-youtube-play svg { width: 72px; height: 52px; filter: drop-shadow( 0 4px 12px rgba( 0,0,0,0.45 ) ); transition: transform 0.2s ease; }
.hatch-youtube-play:hover svg { transform: scale( 1.08 ); }
.hatch-youtube-empty { display: grid; place-items: center; height: 100%; min-height: 200px; color: var( --hatch-muted, #737373 ); background: var( --hatch-surface-2, #f4f4f5 ); }
.hatch-youtube-facade { position: absolute; inset: 0; }

/* ==========================================================================
   v0.3.2 — PREMIUM POLISH LAYER
   Refines the look of every visible block so demos feel intentional, not
   "unstyled WordPress output". Goal: confident typography, soft shadows,
   real hover affordances, gradient accents on Cover/Buttons/Smart.
   ========================================================================== */

/* ---- Cover: gradient overlay + dramatic typography ---- */
.hatch-cover {
	padding: clamp( 3rem, 6vw, 5rem ) clamp( 1.5rem, 4vw, 3rem );
	min-height: 360px;
	border-radius: 16px;
	background: linear-gradient( 135deg, #1e293b 0%, #0f172a 55%, #020617 100% );
	box-shadow: 0 24px 60px -28px rgba( 15, 23, 42, 0.6 );
}
.hatch-cover::before {
	content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 1;
	background:
		radial-gradient( circle at 18% 22%, rgba( 99, 102, 241, 0.28 ), transparent 45% ),
		radial-gradient( circle at 85% 75%, rgba( 236, 72, 153, 0.22 ), transparent 50% );
}
.hatch-cover .hatch-cover-inner { z-index: 2; }
.hatch-cover h1, .hatch-cover h2, .hatch-cover .hatch-heading {
	font-family: var( --hatch-font-heading, inherit );
	font-weight: 700;
	font-size: clamp( 2rem, 4vw + 0.5rem, 3.4rem );
	line-height: 1.08;
	letter-spacing: -0.02em;
	color: #fff;
	margin: 0 0 0.6em;
	text-shadow: 0 2px 24px rgba( 0, 0, 0, 0.35 );
}
.hatch-cover p, .hatch-cover .hatch-paragraph {
	font-size: clamp( 1rem, 0.7vw + 0.85rem, 1.18rem );
	line-height: 1.55;
	color: rgba( 255, 255, 255, 0.86 );
	max-width: 620px;
	margin-left: auto; margin-right: auto;
}

/* ---- Posts: card lift + image zoom ---- */
.hatch-posts { gap: 1.75rem; }
.hatch-posts a.hatch-post-card {
	background: #fff;
	border: 1px solid rgba( 15, 23, 42, 0.08 );
	border-radius: 14px;
	overflow: hidden;
	transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
	box-shadow: 0 1px 2px rgba( 15, 23, 42, 0.04 );
	display: flex; flex-direction: column;
}
.hatch-posts a.hatch-post-card:hover {
	transform: translateY( -4px );
	box-shadow: 0 24px 40px -20px rgba( 15, 23, 42, 0.18 );
	border-color: rgba( 15, 23, 42, 0.16 );
}
.hatch-posts .hatch-post-card-image { aspect-ratio: 16 / 10; overflow: hidden; }
.hatch-posts .hatch-post-card-image img {
	transition: transform 0.5s ease;
}
.hatch-posts a.hatch-post-card:hover .hatch-post-card-image img { transform: scale( 1.06 ); }
.hatch-posts .hatch-post-card-body { padding: 1.1rem 1.2rem 1.3rem; flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
.hatch-posts .hatch-post-card-title {
	font-family: var( --hatch-font-heading, inherit );
	font-size: 1.1rem; font-weight: 600; line-height: 1.3;
	color: var( --hatch-fg, #0f172a ); margin: 0;
	letter-spacing: -0.01em;
}
.hatch-posts .hatch-post-card-excerpt { color: #475569; font-size: 0.95rem; line-height: 1.55; margin: 0; }
.hatch-posts .hatch-post-card-meta {
	font-size: 0.78rem; font-weight: 500;
	color: #64748b; text-transform: uppercase; letter-spacing: 0.06em;
	margin-top: auto;
}

/* ---- Accordion: refined ---- */
.hatch-accordion-item { border-bottom: 1px solid rgba( 15, 23, 42, 0.08 ); }
.hatch-accordion-item:first-child { border-top: 1px solid rgba( 15, 23, 42, 0.08 ); }
.hatch-accordion-item summary {
	padding: 1.15em 0.25em; font-weight: 600; font-size: 1.02rem;
	color: var( --hatch-fg, #0f172a );
	transition: color 0.2s;
}
.hatch-accordion-item summary::after {
	content: ''; width: 18px; height: 18px;
	background-image: url( "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E" );
	background-size: contain; background-repeat: no-repeat;
	transition: transform 0.25s ease;
}
.hatch-accordion-item[open] summary::after { transform: rotate( 180deg ); }
.hatch-accordion-item summary:hover { color: var( --hatch-primary, #6366f1 ); }
.hatch-accordion-body { padding: 0 0.25em 1.25em; color: #475569; line-height: 1.6; }

/* ---- Headings: confident hierarchy ---- */
.hatch-heading {
	font-family: var( --hatch-font-heading, inherit );
	font-weight: 700;
	letter-spacing: -0.02em;
	line-height: 1.15;
	color: var( --hatch-fg, #0f172a );
}
h1.hatch-heading { font-size: clamp( 2rem, 3vw + 1rem, 2.8rem ); }
h2.hatch-heading { font-size: clamp( 1.5rem, 1.5vw + 1rem, 2rem ); margin-top: 1.5em; }
h3.hatch-heading { font-size: 1.25rem; font-weight: 600; }

/* ---- Paragraph: nicer reading rhythm ---- */
.hatch-paragraph { line-height: 1.65; color: #334155; font-size: 1rem; }

/* ---- Button: gradient pill ---- */
.hatch-button {
	display: inline-flex; align-items: center; gap: 0.5em;
	padding: 0.75em 1.4em;
	border-radius: 999px;
	font-weight: 600; font-size: 0.95rem;
	background: linear-gradient( 135deg, var( --hatch-primary, #6366f1 ) 0%, var( --hatch-accent, #8b5cf6 ) 100% );
	color: #fff;
	box-shadow: 0 8px 20px -8px rgba( 99, 102, 241, 0.55 );
	transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}
.hatch-button:hover { transform: translateY( -2px ); box-shadow: 0 14px 28px -10px rgba( 99, 102, 241, 0.65 ); filter: brightness( 1.05 ); }
.hatch-button:active { transform: translateY( 0 ); }

/* ---- Tabs: clean underline ---- */
.hatch-tabs-nav { border-bottom: 1px solid rgba( 15, 23, 42, 0.1 ); gap: 0.5rem; }
.hatch-tabs-tab { padding: 0.75em 1.1em; font-weight: 500; transition: color 0.2s; }
.hatch-tabs-tab.is-active { color: var( --hatch-primary, #6366f1 ); box-shadow: inset 0 -2px 0 var( --hatch-primary, #6366f1 ); }
.hatch-tabs-panel { padding-top: 1rem; line-height: 1.6; }

/* ---- Search: pill input ---- */
.hatch-search input {
	padding: 0.8em 1.1em;
	border-radius: 999px;
	border: 1px solid rgba( 15, 23, 42, 0.12 );
	background: #fff;
	box-shadow: 0 1px 2px rgba( 15, 23, 42, 0.04 );
	transition: border-color 0.2s, box-shadow 0.2s;
}
.hatch-search input:focus {
	outline: 0;
	border-color: var( --hatch-primary, #6366f1 );
	box-shadow: 0 0 0 4px rgba( 99, 102, 241, 0.15 );
}
.hatch-search button {
	padding: 0.8em 1.4em;
	border-radius: 999px;
	background: linear-gradient( 135deg, var( --hatch-primary, #6366f1 ), var( --hatch-accent, #8b5cf6 ) );
	box-shadow: 0 8px 20px -8px rgba( 99, 102, 241, 0.5 );
	transition: transform 0.2s, filter 0.2s;
}
.hatch-search button:hover { transform: translateY( -1px ); filter: brightness( 1.05 ); }

/* ---- Quote: editorial pull-quote ---- */
.hatch-quote {
	padding: 1.5em 1.75em;
	background: linear-gradient( 135deg, rgba( 99, 102, 241, 0.06 ), rgba( 139, 92, 246, 0.04 ) );
	border-left: 4px solid var( --hatch-primary, #6366f1 );
	border-radius: 0 12px 12px 0;
	font-style: normal;
}
.hatch-quote-text { font-size: 1.1rem; line-height: 1.55; color: #1e293b; font-weight: 500; }
.hatch-quote-cite { color: #6366f1; font-weight: 500; }

/* ---- Form: card frame ---- */
.hatch-form {
	padding: 1.5rem;
	border-radius: 14px;
	border: 1px solid rgba( 15, 23, 42, 0.08 );
	background: #fff;
	box-shadow: 0 12px 32px -16px rgba( 15, 23, 42, 0.12 );
}

/* ---- Smart Block empty: glow placeholder ---- */
.hatch-smart-empty {
	padding: 3.5rem 2rem;
	border-radius: 14px;
	background: linear-gradient( 135deg, rgba( 99, 102, 241, 0.06 ), rgba( 236, 72, 153, 0.04 ) );
	border: 1px dashed rgba( 99, 102, 241, 0.25 );
}

/* ---- Section + Container rhythm ---- */
.hatch-section { padding: clamp( 2.5rem, 5vw, 4.5rem ) 0; }
.hatch-container { max-width: var( --hatch-max-width, 1160px ); margin: 0 auto; padding: 0 clamp( 1rem, 3vw, 2rem ); }

/* ---- Posts loading state ---- */
.hatch-posts-loading { display: block; padding: 2rem; text-align: center; color: #94a3b8; font-size: 0.9rem; grid-column: 1 / -1; }

/* ==========================================================================
   v0.3.4 — Wide-block escape from reading column.
   Themes (esp. blog/astronano/astropaper) cap .hatch-prose at ~680px for
   comfortable reading. That's correct for paragraphs and headings — wrong
   for full-bleed elements like Cover, Posts grids, Columns sections,
   Galleries. These bust out to the parent article's max-width so they look
   like real heroes / showcase sections, not narrow cards with gutters.
   ========================================================================== */
.hatch-prose .hatch-cover,
.hatch-prose > .hatch-posts,
.hatch-prose > .hatch-columns,
.hatch-prose > .hatch-gallery,
.hatch-prose > .hatch-embed,
.hatch-prose > .hatch-video,
.hatch-prose > .hatch-youtube {
	max-width: none;
	width: 100%;
	margin-left: 0;
	margin-right: 0;
}

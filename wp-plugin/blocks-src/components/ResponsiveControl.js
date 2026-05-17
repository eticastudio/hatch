/**
 * ResponsiveControl — a tabbed control that surfaces 5 breakpoint inputs
 * for a single responsive attribute. Used by spacing, typography, alignment.
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { TabPanel, BaseControl } from '@wordpress/components';
import { useState } from '@wordpress/element';

const BREAKPOINTS = [
	{ name: 'base', title: __( 'All', 'hatch-blocks' ) },
	{ name: 'sm',   title: __( 'SM',  'hatch-blocks' ) },
	{ name: 'md',   title: __( 'MD',  'hatch-blocks' ) },
	{ name: 'lg',   title: __( 'LG',  'hatch-blocks' ) },
	{ name: 'xl',   title: __( 'XL',  'hatch-blocks' ) },
];

/**
 * @param {Object}   props
 * @param {string}   props.label   Field label.
 * @param {string=}  props.help    Help text under the control.
 * @param {Object}   props.value   { base, sm, md, lg, xl }.
 * @param {Function} props.onChange Receives full responsive object.
 * @param {Function} props.children Render prop: (currentValue, setForCurrent) => JSX.
 */
export default function ResponsiveControl( { label, help, value, onChange, children } ) {
	const [ activeBp, setActiveBp ] = useState( 'base' );

	const setForCurrent = ( newVal ) => {
		onChange( { ...value, [ activeBp ]: newVal } );
	};

	return (
		<BaseControl label={ label } help={ help } __nextHasNoMarginBottom>
			<TabPanel
				className="hatch-blocks-responsive-tabs"
				activeClass="is-active"
				tabs={ BREAKPOINTS }
				onSelect={ setActiveBp }
				initialTabName={ activeBp }
			>
				{ ( tab ) => children( value[ tab.name ], setForCurrent, tab.name ) }
			</TabPanel>
		</BaseControl>
	);
}

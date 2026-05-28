/**
 * Hatch Table — responsive (horizontal scroll on mobile).
 *
 * @package HatchBlocks
 */

import { __ } from '@wordpress/i18n';
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import { PanelBody, SelectControl, Button } from '@wordpress/components';
import { Fragment } from '@wordpress/element';

const VARIANTS = [
	{ label: 'Default',  value: 'default' },
	{ label: 'Striped',  value: 'striped' },
	{ label: 'Bordered', value: 'bordered' },
	{ label: 'Compact',  value: 'compact' },
];

registerBlockType( 'hatch/table', {
	edit: ( { attributes, setAttributes } ) => {
		const blockProps = useBlockProps( { className: `hatch-table hatch-table-${ attributes.variant }` } );
		const setHead = ( i, v ) => setAttributes( { head: attributes.head.map( ( h, idx ) => idx === i ? v : h ) } );
		const setCell = ( r, c, v ) => setAttributes( { rows: attributes.rows.map( ( row, ri ) => ri === r ? row.map( ( cell, ci ) => ci === c ? v : cell ) : row ) } );
		const addCol = () => setAttributes( { head: [ ...attributes.head, `Column ${ attributes.head.length + 1 }` ], rows: attributes.rows.map( ( row ) => [ ...row, '' ] ) } );
		const addRow = () => setAttributes( { rows: [ ...attributes.rows, new Array( attributes.head.length ).fill( '' ) ] } );
		const delCol = ( idx ) => setAttributes( { head: attributes.head.filter( ( _, i ) => i !== idx ), rows: attributes.rows.map( ( row ) => row.filter( ( _, i ) => i !== idx ) ) } );
		const delRow = ( idx ) => setAttributes( { rows: attributes.rows.filter( ( _, i ) => i !== idx ) } );
		return (
			<Fragment>
				<InspectorControls>
					<PanelBody title={ __( 'Table', 'hatch' ) } initialOpen={ true }>
						<SelectControl label={ __( 'Variant', 'hatch' ) } value={ attributes.variant } options={ VARIANTS } onChange={ ( v ) => setAttributes( { variant: v } ) } />
						<Button variant="secondary" onClick={ addCol } style={ { marginRight: 8 } }>{ __( '+ Column', 'hatch' ) }</Button>
						<Button variant="secondary" onClick={ addRow }>{ __( '+ Row', 'hatch' ) }</Button>
					</PanelBody>
				</InspectorControls>
				<div { ...blockProps }>
					<div className="hatch-table-scroll">
						<table>
							<thead>
								<tr>
									{ attributes.head.map( ( h, i ) => (
										<th key={ i }>
											<RichText tagName="span" value={ h } onChange={ ( v ) => setHead( i, v ) } placeholder={ `Col ${ i + 1 }` } />
											<button type="button" className="hatch-table-del" onClick={ () => delCol( i ) } title="Remove column">×</button>
										</th>
									) ) }
								</tr>
							</thead>
							<tbody>
								{ attributes.rows.map( ( row, ri ) => (
									<tr key={ ri }>
										{ row.map( ( cell, ci ) => (
											<td key={ ci }>
												<RichText tagName="span" value={ cell } onChange={ ( v ) => setCell( ri, ci, v ) } placeholder="—" />
											</td>
										) ) }
										<td className="hatch-table-rowdel"><button type="button" onClick={ () => delRow( ri ) } title="Remove row">×</button></td>
									</tr>
								) ) }
							</tbody>
						</table>
					</div>
					<RichText
						tagName="figcaption"
						className="hatch-table-caption"
						value={ attributes.caption }
						onChange={ ( v ) => setAttributes( { caption: v } ) }
						placeholder={ __( 'Caption (optional)', 'hatch' ) }
					/>
				</div>
			</Fragment>
		);
	},
	save: ( { attributes } ) => {
		const blockProps = useBlockProps.save( { className: `hatch-table hatch-table-${ attributes.variant }` } );
		return (
			<figure { ...blockProps }>
				<div className="hatch-table-scroll">
					<table>
						<thead>
							<tr>{ attributes.head.map( ( h, i ) => <th key={ i }><RichText.Content value={ h } /></th> ) }</tr>
						</thead>
						<tbody>
							{ attributes.rows.map( ( row, ri ) => (
								<tr key={ ri }>{ row.map( ( cell, ci ) => <td key={ ci }><RichText.Content value={ cell } /></td> ) }</tr>
							) ) }
						</tbody>
					</table>
				</div>
				{ attributes.caption && <RichText.Content tagName="figcaption" className="hatch-table-caption" value={ attributes.caption } /> }
			</figure>
		);
	},
} );

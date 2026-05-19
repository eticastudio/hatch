/**
 * Hatch Block types + fetch helper.
 *
 * The WordPress plugin exposes `/wp-json/hatch/v1/post/{id}/blocks` which returns
 * a normalized block tree. Astro renders each block with a native component
 * (see `src/components/blocks/registry.ts`).
 *
 * @package HatchAstro
 */

import { WP_API_URL, WP_API_USER, WP_API_PASS } from 'astro:env/server';
const WP_API  = WP_API_URL  || '';
const WP_USER = WP_API_USER || '';
const WP_PASS = WP_API_PASS || '';

/**
 * A normalized Hatch block, mirroring the WP serializer output.
 */
export interface HatchBlock {
	/** Block name, e.g. "core/paragraph", "core/gallery", "hatch/hero". */
	name: string;
	/** Block attributes as a flat object. Always an object, never null. */
	attrs: Record<string, unknown>;
	/** Inner HTML (for static blocks this is the saved HTML; for dynamic blocks
	 *  this is the server-rendered HTML). Safe to set:html as a fallback. */
	innerHTML: string;
	/** Nested children. Empty array if leaf. */
	innerBlocks: HatchBlock[];
}

/**
 * Response shape from /hatch/v1/post/{id}/blocks
 */
export interface HatchBlocksResponse {
	meta: {
		id: number;
		slug: string;
		title: string;
		modified: string;
		block_count: number;
	};
	blocks: HatchBlock[];
}

/**
 * Fetch the block tree for a WP post by ID.
 *
 * @param postId  WordPress post ID.
 * @param context "view" (public) or "edit" (auth required, returns drafts).
 */
export async function fetchPostBlocks(
	postId: number,
	context: 'view' | 'edit' = 'view'
): Promise<HatchBlocksResponse | null> {
	if ( ! WP_API ) {
		if ( import.meta.env.DEV ) {
			console.warn( '[hatch] WP_API_URL not set — cannot fetch blocks.' );
		}
		return null;
	}

	// Strip trailing /wp-json (so .env can store either the root or the API root).
	const base = WP_API.replace( /\/wp-json\/?$/, '' ).replace( /\/$/, '' );
	const url  = `${ base }/wp-json/hatch/v1/post/${ postId }/blocks?context=${ context }`;

	const headers: Record<string, string> = {
		Accept: 'application/json',
	};

	// Auth header is only needed for `edit` context (drafts, private posts).
	if ( context === 'edit' && WP_USER && WP_PASS ) {
		const token = Buffer.from( `${ WP_USER }:${ WP_PASS }` ).toString( 'base64' );
		headers.Authorization = `Basic ${ token }`;
	}

	try {
		const res = await fetch( url, { headers } );
		if ( ! res.ok ) {
			if ( import.meta.env.DEV ) {
				console.warn( `[hatch] fetchPostBlocks ${ postId } → ${ res.status }` );
			}
			return null;
		}
		return ( await res.json() ) as HatchBlocksResponse;
	} catch ( err ) {
		if ( import.meta.env.DEV ) {
			console.error( '[hatch] fetchPostBlocks failed:', err );
		}
		return null;
	}
}

/**
 * Pure helper: walk a block tree and collect every block of a given name.
 * Useful for SEO/preview tasks like "find first image".
 */
export function findBlocksByName( tree: HatchBlock[], name: string ): HatchBlock[] {
	const out: HatchBlock[] = [];
	const walk = ( nodes: HatchBlock[] ): void => {
		for ( const n of nodes ) {
			if ( n.name === name ) {
				out.push( n );
			}
			if ( n.innerBlocks.length ) {
				walk( n.innerBlocks );
			}
		}
	};
	walk( tree );
	return out;
}

/**
 * Block registry — maps WordPress block names to Astro components.
 *
 * To add a new block:
 *   1. Create `core/MyBlock.astro` (must accept { block: HatchBlock; depth: number } props).
 *   2. Import it here.
 *   3. Add the mapping below.
 *
 * Unknown blocks fall back to set:html on the innerHTML (see BlockRenderer.astro).
 * That means even un-mapped blocks display correctly — registering a component
 * is purely an upgrade path for performance / DX / design-system consistency.
 */

// Core text blocks
import Paragraph    from './core/Paragraph.astro';
import Heading      from './core/Heading.astro';
import List         from './core/List.astro';
import Quote        from './core/Quote.astro';
import Pullquote    from './core/Pullquote.astro';
import Code         from './core/Code.astro';
import Preformatted from './core/Preformatted.astro';
import Verse        from './core/Verse.astro';

// Core media blocks
import Image        from './core/Image.astro';
import Gallery      from './core/Gallery.astro';
import Video        from './core/Video.astro';
import Audio        from './core/Audio.astro';
import Cover        from './core/Cover.astro';
import MediaText    from './core/MediaText.astro';

// Core layout blocks
import Group        from './core/Group.astro';
import Columns      from './core/Columns.astro';
import Column       from './core/Column.astro';
import Separator    from './core/Separator.astro';
import Spacer       from './core/Spacer.astro';
import Buttons      from './core/Buttons.astro';
import Button       from './core/Button.astro';

// Core interactive
import Details      from './core/Details.astro';
import Embed        from './core/Embed.astro';
import HtmlBlock    from './core/Html.astro';
import Table        from './core/Table.astro';

// Hatch custom blocks (existing)
import HatchHero    from '../hatch-blocks/HatchHero.astro';
import HatchSection from '../hatch-blocks/HatchSection.astro';
import HatchContent from '../hatch-blocks/HatchContent.astro';

/**
 * The registry. Keys are exact WordPress block names.
 */
const REGISTRY: Record<string, unknown> = {
	// Text
	'core/paragraph':    Paragraph,
	'core/heading':      Heading,
	'core/list':         List,
	'core/list-item':    List,         // list-items render through List walker
	'core/quote':        Quote,
	'core/pullquote':    Pullquote,
	'core/code':         Code,
	'core/preformatted': Preformatted,
	'core/verse':        Verse,

	// Media
	'core/image':        Image,
	'core/gallery':      Gallery,
	'core/video':        Video,
	'core/audio':        Audio,
	'core/cover':        Cover,
	'core/media-text':   MediaText,

	// Layout
	'core/group':        Group,
	'core/columns':      Columns,
	'core/column':       Column,
	'core/separator':    Separator,
	'core/spacer':       Spacer,
	'core/buttons':      Buttons,
	'core/button':       Button,

	// Interactive / misc
	'core/details':      Details,
	'core/html':         HtmlBlock,
	'core/table':        Table,

	// Embeds — every core/embed-* variant routes to the same component.
	'core/embed':        Embed,

	// Hatch custom blocks
	'hatch/hero':        HatchHero,
	'hatch/section':     HatchSection,
	'hatch/content':     HatchContent,
};

/**
 * Resolve a block name to its Astro component.
 *
 * Falls back through:
 *   1. Exact match (e.g. "core/paragraph")
 *   2. Embed namespace check (any "core-embed/*" or "core/embed-*" → Embed)
 *   3. null (caller renders innerHTML fallback)
 */
export function resolveBlock( name: string ): unknown | null {
	if ( REGISTRY[ name ] ) {
		return REGISTRY[ name ];
	}
	if ( name.startsWith( 'core-embed/' ) || name.startsWith( 'core/embed-' ) ) {
		return REGISTRY[ 'core/embed' ];
	}
	return null;
}

/**
 * Allow consumers to extend or override at app boot.
 *
 * Example in src/pages/blog/[slug].astro frontmatter:
 *   import { registerBlock } from '~/components/blocks/registry';
 *   import MyHero from '~/components/MyHero.astro';
 *   registerBlock('acme/hero', MyHero);
 */
export function registerBlock( name: string, component: unknown ): void {
	REGISTRY[ name ] = component;
}

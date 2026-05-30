/**
 * Hatch Blocks — editor entry.
 *
 * Each block self-registers in its own index.js via registerBlockType.
 * Add new blocks here so the editor bundle picks them up.
 *
 * @package HatchBlocks
 */

// v0.3.5 — Working block catalog only. The blocks not yet visually
// production-ready (hero, custom-code, image, gallery, video, embed, table,
// form, smart) are commented out so they're literally not in the editor
// bundle — no Coming Soon clutter, no risk of an author dropping one.
// Mirror this list in includes/class-blocks-control.php::coming_soon().

// Tier 1 — Foundation
import './blocks/section';
import './blocks/container';
import './blocks/heading';
import './blocks/paragraph';
import './blocks/button';
// import './blocks/image';        // Coming Soon — needs lightbox + alt audit
// import './blocks/hero';         // Coming Soon — superseded by Cover for now
// import './blocks/custom-code';  // Coming Soon — dynamic-block conversion needs re-QA
import './blocks/spacer';
import './blocks/divider';
import './blocks/group';
import './blocks/columns';
import './blocks/list';
import './blocks/quote';

// Tier 2 — Media
import './blocks/youtube';
// import './blocks/video';        // Coming Soon — poster UX undesigned
// import './blocks/gallery';      // Coming Soon — masonry layout pending
import './blocks/cover';
// import './blocks/embed';        // Coming Soon — provider whitelist pending

// Tier 3 — Interactive
import './blocks/tabs';
import './blocks/accordion';
// import './blocks/table';        // Coming Soon — mobile scroll affordance
// import './blocks/form';         // Coming Soon — needs a real form plugin install
import './blocks/search';

// Tier 4 — Dynamic
import './blocks/posts';

// Tier 5 — AI
// import './blocks/smart';        // Coming Soon — BYOK key config flow

// Editor-only stylesheet.
import './styles/editor.css';

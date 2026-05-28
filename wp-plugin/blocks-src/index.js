/**
 * Hatch Blocks — editor entry.
 *
 * Each block self-registers in its own index.js via registerBlockType.
 * Add new blocks here so the editor bundle picks them up.
 *
 * @package HatchBlocks
 */

// Tier 1 — Foundation (14)
import './blocks/section';
import './blocks/container';
import './blocks/heading';
import './blocks/paragraph';
import './blocks/button';
import './blocks/image';
import './blocks/hero';
import './blocks/custom-code';
import './blocks/spacer';
import './blocks/divider';
import './blocks/group';
import './blocks/columns';
import './blocks/list';
import './blocks/quote';

// Tier 2 — Media (5)
import './blocks/youtube';
import './blocks/video';
import './blocks/gallery';
import './blocks/cover';
import './blocks/embed';

// Tier 3 — Interactive (5)
import './blocks/tabs';
import './blocks/accordion';
import './blocks/table';
import './blocks/form';
import './blocks/search';

// Tier 4 — Dynamic (1)
import './blocks/posts';

// Tier 5 — AI (1)
import './blocks/smart';

// Editor-only stylesheet.
import './styles/editor.css';

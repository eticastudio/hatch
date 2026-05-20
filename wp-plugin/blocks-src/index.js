/**
 * Hatch Blocks — editor entry.
 *
 * @package HatchBlocks
 */

// Register all blocks. Each block self-registers in its own index.js.
import './blocks/section';
import './blocks/container';
import './blocks/heading';
import './blocks/paragraph';
import './blocks/button';
import './blocks/image';
import './blocks/hero';
import './blocks/custom-code';

// Editor-only stylesheet.
import './styles/editor.css';

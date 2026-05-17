# Hatch Block Renderer

Native Astro components for every Gutenberg block. **No more `set:html` HTML soup.**

## How it works

```
WordPress (Hatch plugin)              Astro frontend
┌─────────────────────────────┐       ┌──────────────────────────────────┐
│ parse_blocks(post_content)  │       │ fetchPostBlocks(postId)          │
│       ↓                     │  GET  │       ↓                          │
│ Hatch_Block_Serializer      │ ────▶ │ HatchBlock[]                     │
│       ↓                     │       │       ↓                          │
│ {name, attrs, innerBlocks,  │       │ <BlockRenderer blocks={tree}/>  │
│  innerHTML} tree            │       │       ↓                          │
└─────────────────────────────┘       │ registry.ts → Astro component   │
                                      └──────────────────────────────────┘
```

## What you get vs. `post.content.rendered` dump

| | Old (set:html dump) | New (BlockRenderer) |
|---|---|---|
| Images | Raw `<img>` no optimization | Astro `<Image>` — AVIF/WebP + lazy |
| Galleries | Inert HTML | CSS Grid, lazy-loaded children |
| Embeds | Blocks main thread | `loading="lazy"`, aspect-ratio'd |
| Buttons | Default WP classes | Typed props, target/rel handled |
| Cover blocks | Static HTML | Configurable focal point + overlay |
| Unknown blocks | — | Graceful set:html fallback |
| Hydration | All-or-nothing | Per-block islands |

## Supported blocks (23)

**Text:** paragraph, heading, list, quote, pullquote, code, preformatted, verse

**Media:** image, gallery, video, audio, cover, media-text

**Layout:** group, columns, column, separator, spacer, buttons, button

**Interactive / misc:** details, html, table, embed (all providers via `core-embed/*`)

**Hatch custom:** hero, section, content

## Adding a new block

1. Create the component at `core/MyBlock.astro`:
   ```astro
   ---
   import type { BlockProps } from './_shared';
   import { blockClass, blockStyle } from './_shared';

   const { block } = Astro.props as BlockProps;
   ---
   <div class={ blockClass(block, 'wp-block-my-block') } style={ blockStyle(block) || undefined }>
     { /* your markup */ }
   </div>
   ```

2. Register it in `registry.ts`:
   ```ts
   import MyBlock from './core/MyBlock.astro';
   // ...
   'core/my-block': MyBlock,
   ```

For third-party blocks (`acme/whatever`), call `registerBlock('acme/whatever', YourComponent)` at app boot.

## Unknown blocks

Anything not in the registry falls back to `<div set:html={block.innerHTML} />` — so the page never breaks. Adding a component is purely an upgrade path.

## React islands

Need interactive components? Install `@astrojs/react` and use `client:visible` / `client:idle` directives on any block component. Hydration boundaries are scoped per-block, not per-page.

## API reference

- **WP endpoint:** `GET /wp-json/hatch/v1/post/{id}/blocks?context=view`
- **Fetch helper:** `import { fetchPostBlocks } from '~/lib/blocks'`
- **Renderer:** `import BlockRenderer from '~/components/blocks/BlockRenderer.astro'`
- **Registry:** `import { resolveBlock, registerBlock } from '~/components/blocks/registry'`

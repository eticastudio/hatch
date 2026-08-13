# Block CSS coverage audit, 2026-08-13

## Scope

For each `core/*` block on Hatch's inserter allowlist (`hatch_core_block_allowlist()` in `wp-plugin/includes/class-blocks-allowlist.php`, 46 entries), count `.wp-block-<slug>` selector occurrences in:

- `astro-starter/src/styles/theme-blog.css`
- `astro-starter/src/styles/theme-tech.css`
- `astro-starter/src/styles/theme-docs.css`
- `astro-starter/src/styles/core-blocks.css` (shared base)

## Honest finding first

The user's spec assumed each theme file carries its own `.wp-block-<slug>` rule set per block. Reality is different. Only a handful of per-theme block-specific selectors exist:

- `theme-blog.css`: 3 unique. `.wp-block-post-content`, `.wp-block-post-title`, `.wp-block-quote`
- `theme-tech.css`: 4 unique. `.wp-block-code`, `.wp-block-post`, `.wp-block-post-terms`, `.wp-block-preformatted`
- `theme-docs.css`: 4 unique. `.wp-block-hatch-callout`, `.wp-block-navigation`, `.wp-block-post-content`, `.wp-block-post-title`
- `core-blocks.css`: 139 `.wp-block-*` selector references (the real block-styling layer)

Zero blocks match "has CSS in ALL 3 theme files". Per-theme visual signatures ride on element selectors (h1, blockquote, code) plus design tokens scoped under `.hatch-theme-<name>`, not on `.wp-block-*` rules duplicated across themes.

## Adjusted whitelist criterion

A block is considered "styled end-to-end" if it has explicit `.wp-block-<slug>` CSS in `core-blocks.css` (the shared base every theme inherits). Per-theme differentiation then rides on element selectors plus tokens. This matches Hatch's actual design system, not a naive per-file duplicate check.

Result: 36 of 46 allowlist blocks pass. 10 excluded for having no `.wp-block-*` CSS anywhere.

## Table

| Block | blog | tech | docs | base | Verdict |
|---|---:|---:|---:|---:|---|
| paragraph | 0 | 0 | 0 | 4 | SUPPORTED |
| heading | 0 | 0 | 0 | 5 | SUPPORTED |
| list | 0 | 0 | 0 | 2 | SUPPORTED |
| list-item | 0 | 0 | 0 | 0 | EXCLUDED |
| quote | 1 | 0 | 0 | 5 | SUPPORTED |
| pullquote | 0 | 0 | 0 | 2 | SUPPORTED |
| code | 0 | 3 | 0 | 4 | SUPPORTED |
| preformatted | 0 | 2 | 0 | 1 | SUPPORTED |
| verse | 0 | 0 | 0 | 1 | SUPPORTED |
| image | 0 | 0 | 0 | 4 | SUPPORTED |
| gallery | 0 | 0 | 0 | 1 | SUPPORTED |
| video | 0 | 0 | 0 | 2 | SUPPORTED |
| audio | 0 | 0 | 0 | 1 | SUPPORTED |
| cover | 0 | 0 | 0 | 2 | SUPPORTED |
| embed | 0 | 0 | 0 | 2 | SUPPORTED |
| columns | 0 | 0 | 0 | 4 | SUPPORTED |
| column | 0 | 0 | 0 | 2 | SUPPORTED |
| group | 0 | 0 | 0 | 2 | SUPPORTED |
| separator | 0 | 0 | 0 | 6 | SUPPORTED |
| spacer | 0 | 0 | 0 | 1 | SUPPORTED |
| table | 0 | 0 | 0 | 4 | SUPPORTED |
| details | 0 | 0 | 0 | 5 | SUPPORTED |
| button | 0 | 0 | 0 | 4 | SUPPORTED |
| buttons | 0 | 0 | 0 | 11 | SUPPORTED |
| file | 0 | 0 | 0 | 4 | SUPPORTED |
| query | 0 | 0 | 0 | 0 | EXCLUDED |
| post-template | 0 | 0 | 0 | 3 | SUPPORTED |
| post-title | 1 | 0 | 1 | 3 | SUPPORTED |
| post-excerpt | 0 | 0 | 0 | 1 | SUPPORTED |
| post-date | 0 | 0 | 0 | 2 | SUPPORTED |
| post-featured-image | 0 | 0 | 0 | 3 | SUPPORTED |
| post-terms | 0 | 2 | 0 | 0 | EXCLUDED |
| post-author | 0 | 0 | 0 | 1 | SUPPORTED |
| post-content | 4 | 0 | 1 | 1 | SUPPORTED |
| query-title | 0 | 0 | 0 | 0 | EXCLUDED |
| query-pagination | 0 | 0 | 0 | 0 | EXCLUDED |
| query-pagination-next | 0 | 0 | 0 | 0 | EXCLUDED |
| query-pagination-previous | 0 | 0 | 0 | 0 | EXCLUDED |
| query-pagination-numbers | 0 | 0 | 0 | 0 | EXCLUDED |
| query-no-results | 0 | 0 | 0 | 0 | EXCLUDED |
| latest-posts | 0 | 0 | 0 | 5 | SUPPORTED |
| categories | 0 | 0 | 0 | 4 | SUPPORTED |
| tag-cloud | 0 | 0 | 0 | 3 | SUPPORTED |
| rss | 0 | 0 | 0 | 4 | SUPPORTED |
| search | 0 | 0 | 0 | 7 | SUPPORTED |
| html | 0 | 0 | 0 | 0 | EXCLUDED |

## Summary counts

- Allowlist total: 46 slugs in `hatch_core_block_allowlist()`. `html` was already removed in v0.5.4 so the effective inserter surface is 45.
- SUPPORTED (has `.wp-block-*` CSS in base layer): 36
- EXCLUDED (no `.wp-block-*` CSS anywhere): 10. `list-item`, `query`, `post-terms`, `query-title`, `query-pagination`, `query-pagination-next`, `query-pagination-previous`, `query-pagination-numbers`, `query-no-results`, `html`

Notable EXCLUDED nuance:
- `list-item` visually inherits from `list` plus generic `li` styling.
- `query` and `query-*` scaffolding blocks are layout wrappers with no visible surface. Hiding them from the inserter BREAKS the ability to add `core/query`. Kept out of the whitelist per the strict criterion. Users who need query loops must leave the master toggle OFF.
- `post-terms` has 2 hits in `theme-tech.css` but zero in base. Excluded to keep the criterion consistent (base is the design-intent layer).
- `html` was deliberately removed from the allowlist in v0.5.4 for CSP and XSS reasons.

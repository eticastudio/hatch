# Disabling Hatch Blocks

> **[← Back to README](../README.md)**

The **Blocks** tab in Tools → Hatch lets you turn individual Hatch Gutenberg blocks on or off. This page covers what happens when you do.

---

## How disabling works

When you uncheck a block and save:

1. Hatch calls WordPress's `unregister_block_type()` for that block on every page load
2. The block disappears from the inserter (you can't add new ones)
3. Existing instances of the block in saved posts show as "invalid block"

The "invalid block" experience is the standard Gutenberg flow — the block editor displays a yellow warning box with two options:

```
┌──────────────────────────────────────────────────┐
│  ⚠ This block has encountered an error and       │
│    cannot be previewed.                          │
│                                                  │
│  [ Attempt block recovery ]  [ Convert to HTML ] │
└──────────────────────────────────────────────────┘
```

- **Attempt block recovery** — only works if the block is re-enabled (Gutenberg tries to re-register it)
- **Convert to HTML** — turns the block into a standard HTML block, preserving its saved markup

---

## What happens on the frontend?

Your Astro / Next.js frontend uses the raw `content.rendered` from REST. The block's HTML markup is still in `post_content` even when the block is disabled — only the EDITOR sees it as invalid. The published frontend keeps rendering it.

**Bottom line:** disabling a block in Hatch is an editor concern. It doesn't affect what visitors see.

---

## Common scenarios

### "I want to stop using the Custom Code block — too risky"

Disable `hatch/custom-code` in the Blocks tab. New posts can't insert it. Existing posts:
- Editor: yellow warning, with the option to convert to HTML
- Frontend: still renders normally

You can leave existing instances untouched and just prevent new ones — that's a safe migration path.

### "I want to replace Hatch's Heading with my own custom block"

1. Register your custom block
2. Disable `hatch/heading` in the Blocks tab
3. Migrate existing instances via "Convert to HTML" or with a database query (advanced)

### "I disabled the master switch — what happened?"

All 8 Hatch blocks are simultaneously unregistered. Your individual toggle state is preserved — re-enable the master switch and your previous per-block selection comes back as it was.

### "I want to undo — re-enable a block"

1. Open Tools → Hatch → Blocks
2. Re-check the block
3. Save
4. Refresh the Gutenberg editor
5. Existing instances should auto-recover; if not, click "Attempt block recovery"

---

## What gets disabled when

The 8 Hatch blocks:

| Block | Slug | Disable risk |
|---|---|---|
| Section | `hatch/section` | Low — wrapper only, content survives |
| Container | `hatch/container` | Low — wrapper only |
| Heading | `hatch/heading` | Low — same as a core heading |
| Paragraph | `hatch/paragraph` | Low — same as core paragraph |
| Button | `hatch/button` | Medium — visual variants may not match core button |
| Image | `hatch/image` | Low — same as core image |
| Hero | `hatch/hero` | Medium — multiple variants, may convert imperfectly |
| Custom Code | `hatch/custom-code` | Medium — raw HTML/CSS/JS preserves but security gate is gone |

---

## Bulk-disable for a clean uninstall

If you're removing Hatch from a site entirely:

1. Tools → Hatch → Blocks → uncheck master switch → Save
2. Optional: run a `wp db query` to convert all Hatch block markers to HTML blocks (see [docs/uninstall.md](uninstall.md) — coming soon)
3. Tools → Plugins → Delete Hatch
4. The uninstall hook clears all `hatch_*` options. Block markup in posts remains as plain HTML.

---

> **[← Back to README](../README.md)** · [Custom Code Block security](../SECURITY.md#custom-code-block--three-layer-defense-v04)

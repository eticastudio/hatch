# CURRENT: Plugin Bridge complete build (2026-08-12)

## Rule (Aditya, brain: `drawer_Etica_architecture_a308840cf90cc7d7cf3a8ecf`)
Every Bridge = REST endpoints on WP + native Astro components using Hatch tokens.
Zero plugin CSS/JS ever ships to Astro.

## State per category (audit 2026-08-12)

| Category | WP REST | Astro component | Shortcode rewrite | Bridge tab REST chips |
|---|---|---|---|---|
| SEO (Yoast/RankMath) | done: `/seo-head`, `/seo-meta`, `/schema` | done: `HatchSchema.astro` + `PageLayout` head inject | n/a | done |
| Menus | done: `/menus/{location}` | done: `SiteHeader.astro` | n/a | done |
| Redirects | done: `/redirects` | audit: middleware may have drifted | n/a | done |
| WooCommerce | done: `/store/products` | done: `product/[slug].astro` | build: `[product_page]` to mount | done |
| Forms (Fluent/WPForms/CF7/Gravity) | **BUILD** `/forms/{provider}/{id}` + `/submit` | done: `HatchForm.astro` (waits for markers) | **BUILD** shortcode to `.hatch-form-mount` | enrich |
| ACF | done: `/acf-status` (detect only) | **BUILD** `<HatchAcfField>` | n/a | enrich |
| CPT UI | done: `/cpt-health` | generic via `/content` in `[...slug].astro` | n/a | enrich |
| SMTP | n/a (no frontend) | n/a | n/a | done (server only) |
| Membership | coming soon | n/a | n/a | done (coming-soon tag) |

## Build phases (sequential, commit each)

**Phase 1: Forms Bridge (biggest gap)**
- `wp-plugin/includes/class-forms-bridge.php` (new)
- `class-rest-api.php` `/content`: add shortcode rewriter for `[fluentform]`, `[wpforms]`, `[contact-form-7]`, `[gravityform]`
- Register class in `hatch.php` module loader
- Verify each provider E2E via curl (schema fetch, submit to DB row)
- Deprecate `HatchEmbedForm.astro` (violates rule; note in header)
- Commit

**Phase 2: ACF Bridge**
- Extend `/acf-status` to `/acf/{postId}` returning normalized field values
- Astro `<HatchAcfField field={...}/>` component using Hatch tokens
- Auto-inject ACF into `/content` payload for posts with field groups
- Commit

**Phase 3: WooCommerce shortcode Bridge**
- `[product_page id=X]` to mount that hydrates via `/store/products?id=X`
- Commit

**Phase 4: Bridge tab REST-abilities enrichment**
- PluginBridge.jsx already renders "Exposes" chips per plugin
- Verify chips list every real endpoint per provider
- Add copy-endpoint-URL button on unfold
- Commit

**Phase 5: Redirects middleware audit**
- Confirm `astro-starter/src/middleware.ts` reads `/redirects` and issues 301s
- Fix if drifted
- Commit

**Phase 6: Docs update**
- `docs/PLUGIN-BRIDGES.md` refresh with the new endpoints
- Commit

## Verification per phase
- PHP lint clean
- `curl` proves endpoint returns valid JSON
- Astro dev renders without error
- Green-gate (`.claude/check.sh`) passes

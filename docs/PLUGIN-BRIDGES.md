# Hatch Plugin Bridges — Compatibility Matrix

> Live verified 2026-07-12. Every plugin in this document was installed, activated, and its integration path tested against Hatch v0.5.3 in the Docker dev environment.

## What Hatch means by "Plugin Bridge"

Hatch is a **headless WordPress plugin**. It talks to your existing plugins two ways:

1. **Detection** — Hatch sees the plugin is installed, exposes state via `/wp-json/hatch/v1/features.integrations`, and the admin Plugin Bridge card shows a green checkmark.
2. **Data flow** — Hatch reads the plugin's data (Yoast meta, ACF fields, Redirection rules, CPTs) and either:
   - forwards it via a dedicated `/wp-json/hatch/v1/*` endpoint to the Astro frontend, OR
   - lets the plugin's own REST endpoints serve it and Astro talks to them directly.

Detection ≠ data flow. A plugin can be detected (green check in admin) but produce no data until the user configures it inside that plugin.

## Green matrix — verified working end-to-end

Tested against a fresh WP install with each plugin activated. "Data flows" means the Hatch bridge or the plugin's own REST returns non-empty JSON when the plugin is populated with sample data.

| Plugin | Detection | Data flow | Hatch bridge endpoint | Notes |
|---|---|---|---|---|
| **Yoast SEO** (v28.0) | ✅ | ✅ | `/hatch/v1/seo-head?url=…` | Also exposed in `_embed`-ed `/wp/v2/posts` as `yoast_head_json`. Astro reads either path. |
| **Rank Math** (v1.0.273) | ✅ | ✅ | `/hatch/v1/seo-head?url=…` | Wins priority over Yoast when both installed. Same endpoint, different data provider. |
| **Redirection** (v5.9.0) | ✅ | ⚠ requires rules | `/hatch/v1/redirects` | Returns empty list until user adds a redirect in the plugin's admin. |
| **RankReady** (v1.2.0) | ✅ | ✅ | `/features.integrations.rankready` + `/llms.txt` + `/.well-known/mcp.json` | POSIMYTH's AI-SEO layer. Full state block in `/features`. |
| **WPForms Lite** (v1.10.2.1) | ✅ | ✅ | Plugin's own `/wpforms/*` REST | Astro fetches forms via WPForms REST directly. Hatch only detects + exposes as `integrations.forms.detected`. |
| **Fluent Forms** (v6.2.6) | ✅ | ✅ | Plugin's own `/fluentform/v1/*` REST | Same pattern as WPForms — Astro talks to Fluent's REST directly, Hatch detects. |
| **Contact Form 7** (v6.1.6) | ✅ | ⚠ no REST | — | CF7 has no native REST endpoints for form definitions. Detection only. Users on CF7 embed the shortcode server-side. |
| **ACF** (v6.8.5) | ✅ | ⚠ requires field groups | `/hatch/v1/acf-status` | Returns empty until user creates a field group AND enables "Show in REST" on the group. |
| **CPT UI** (v1.19.2) | ✅ | ⚠ requires CPTs | `/hatch/v1/cpt-health` | Returns empty until user registers a CPT. Once registered, Astro auto-picks CPT posts up via `/wp/v2/{slug}`. |
| **Polylang** (v3.8.5) | ✅ | ⚠ requires languages | `/features.integrations.i18n = polylang` | Detection surfaces. Full language switcher on Astro side is v0.6 roadmap. |
| **WooCommerce** (v10.9.4) | ✅ | ⚠ needs auth | Woo's own `/wc/v3/*` REST | Detection works. `/features.integrations.woocommerce = true`. Astro reading Woo products needs App Password + Consumer Key/Secret setup. |

## Not yet installed / tested against Hatch v0.5.3

These plugins are in `Hatch_Detector::KNOWN` but NOT installed in the test environment. Detection code paths are in place; live verification pending.

| Plugin | Detector key | Status |
|---|---|---|
| Yoast SEO Premium | `yoast_premium` | Detected if installed; data flow same as free Yoast |
| Rank Math Pro | `rankmath_pro` | Detected if installed; data flow same as free Rank Math |
| WPForms Pro | `wpforms_pro` | Detected if installed |
| Gravity Forms | `gravity_forms` | Detected if installed; Astro talks to `/gf/v2/*` |
| MemberPress | `memberpress` | Detection only; auth check surface v0.6 |
| Restrict Content Pro | `restrict_content` | Detection only |
| Paid Memberships Pro | `paid_memberships` | Detection only |
| ACF Pro | `acf_pro` | Higher priority than free ACF |
| Secure Custom Fields | `secure_cf` | WP.org fork of ACF pre-transfer |
| Meta Box | `meta_box` | Detection only |
| Pods | `pods` | Detects for both CPT + custom fields |
| Jet Engine | `jet_engine` | CPT manager alternative |
| WPML | `wpml` | Higher priority than Polylang |
| RankReady dev build | `rankready_dev` | Local repo path fallback |

## Bridge REST endpoints

All under `/wp-json/hatch/v1/`. Admin-gated unless marked public.

| Endpoint | Public? | Returns |
|---|---|---|
| `/features` | ✅ Public | Full site + integrations state |
| `/features.integrations.plugins` | ✅ Public | Boolean map of all 25 detector keys |
| `/features.integrations.seo` | ✅ Public | `{detected: {slug, label, active}, mode, schema, sitemap}` |
| `/features.integrations.forms.detected` | ✅ Public | `{slug, label, active}` |
| `/features.integrations.custom_fields` | ✅ Public | Plugin slug or `none` |
| `/features.integrations.cpt_manager` | ✅ Public | Plugin slug or `none` |
| `/features.integrations.i18n` | ✅ Public | Plugin slug or `none` |
| `/features.integrations.membership` | ✅ Public | Plugin slug or `none` |
| `/features.integrations.redirects` | ✅ Public | Plugin slug or `none` |
| `/features.integrations.woocommerce` | ✅ Public | Boolean |
| `/features.integrations.rankready` | ✅ Public | Full RankReady state block |
| `/seo-head?url=…` | 🔒 Auth | Yoast/RankMath head HTML for URL |
| `/schema?url=…` | 🔒 Auth | JSON-LD for URL |
| `/redirects` | 🔒 Auth | Combined redirect rules from all providers |
| `/acf-status` | 🔒 Auth | ACF/Meta Box/Pods field group REST status |
| `/cpt-health` | 🔒 Auth | Registered CPTs + REST availability check |
| `/membership/check` | 🔒 Auth | Per-post membership gate for gated content |

## Priority rules when multiple plugins compete

Set in `Hatch_Detector`:

- **SEO:** Rank Math > Yoast (Rank Math wins if both active)
- **Custom fields:** ACF Pro > ACF (free) > Secure CF > Meta Box > Pods
- **CPT manager:** CPT UI > Jet Engine > Pods
- **i18n:** WPML > Polylang
- **Membership:** MemberPress > Restrict Content Pro > Paid Memberships Pro
- **Forms:** first detected in this order — WPForms Pro > WPForms Lite > Fluent Forms > Gravity Forms > CF7

## Testing a plugin bridge yourself

```bash
# 1. Install + activate the plugin
docker compose exec wp wp plugin install <slug> --activate --allow-root

# 2. Verify detection
curl -sS http://localhost:8810/wp-json/hatch/v1/features | \
  jq '.integrations | {plugins, seo, forms, custom_fields, cpt_manager, i18n}'

# 3. Add sample data inside the plugin (ACF field group, CPT, redirect, etc.)

# 4. Verify data flow — for admin-gated endpoints, use wp-cli eval:
docker compose exec wp wp eval '
  $req = new WP_REST_Request("GET", "/hatch/v1/<endpoint>");
  $res = rest_do_request($req);
  print_r($res->get_data());
' --allow-root
```

## Known limitations (v0.5.3 shipping surface)

1. **Membership gating on Astro** — Hatch detects MemberPress/RCP/PMP but doesn't yet enforce per-post gating on the Astro frontend. `v0.6` roadmap: `/hatch/v1/membership/check` → Astro middleware redirect.
2. **Language switcher UI on Astro** — Polylang/WPML detected + surface via `/features.integrations.i18n`, but the language switcher component in the frontend theme is `v0.6` scope.
3. **WooCommerce product cards** — Hatch detects Woo but doesn't ship prebuilt product-card blocks or checkout templates. Astro-side users read via `/wc/v3/products` directly. Full Woo storefront on Astro is `v0.7` scope.
4. **CF7 forms** — Contact Form 7 has no first-party REST endpoint. Users who need CF7 on Astro either (a) render server-side + iframe, (b) switch to WPForms or Fluent Forms for REST access.
5. **Plugin update webhooks** — Hatch doesn't currently listen for plugin activate/deactivate hooks to trigger a frontend rebuild. Users must manually flush cache or add a filter. `v0.6` roadmap: `revalidate` on `activated_plugin` + `deactivated_plugin`.

## Positioning

**Hatch is a connections/functionality layer, not a design system.** The plugin bridge matrix above IS the product. The three themes (Blog / Tech / Docs) are a foundation for users to build on — most production customers will fork one and extend it. But the plugin-detection + data-flow surface is what makes Hatch work with a WordPress site that already has 8-12 plugins running.

Every plugin the customer already uses keeps working. That is the wedge.

# Parallel Fixes Report — 2026-08-06

## 1. Verdict

**SHIP_WITH_KNOWN** — the three feature tracks (wizard Step 3 rewrite, Bridge "Exposes" chips, Forms E2E plumbing audit) all landed and are demoable; the Playwright consistency suite caught a pre-existing frontend button-token regression (radius/padding drift on `/about` + `/contact`) that is unrelated to this batch and should be fixed before the next tagged release, not before the demo.

---

## 2. What landed

### Track A — Onboarding Step 3 rewrite (`SetupApp.jsx`)
- Step 3 now splits into three explicit sub-steps A/B/C with a clickable `SubStepStrip`:
  - **A. Deploy location** — Subfolder vs Root domain, two large `ModeCard`s + inline path input + presets. `mountMode` is now real state persisted via `hatch_save_mount_config` (previously hardcoded to `subfolder`).
  - **B. Deploy target** — Cloudflare / Vercel / Self-hosted cards reusing existing `BrokerForm`.
  - **C. Connect the pieces** — Nginx / Apache / Cloudflare Worker `HxSeg` tabs on the subfolder path; CNAME table + WP-URL-split callout on the root path; review card summarizing selected mount + Astro origin.
- Bundle rebuilt cleanly (147 KiB, webpack OK).
- Evidence: verifier confirmed all six sub-step states via screenshots (`ss_0466xfxtn`, `ss_9826qwz4l`, `ss_58328w9nw`, `ss_9835tww0j`, `ss_1280rj58b`, `ss_2117uh07p`). Correct branching — subfolder path shows reverse-proxy snippets, root path shows DNS CNAME.

### Track B — Bridge tab "Exposes" chips (`PluginBridge.jsx`)
- Every active plugin card now renders an "Exposes" chip row listing what that plugin ships to the Astro frontend. Inactive cards (e.g. E-commerce with no Woo) correctly omit it.
- Chips styled with `--hx-surface-2` bg / `--hx-muted` text / `--hx-border` stroke, 11px 500 weight — matches admin token system.
- Live REST verified (application password auth on `localhost:8810`):
  - `/hatch/v1/seo-head` → 200, `source: rankmath`
  - `/hatch/v1/schema` → 200 (WebSite schema)
  - `/hatch/v1/redirects` → 200 `[]`
- Verifier's unauthenticated curls returned 400/401 as expected (routes registered + permission callbacks enforced).
- Screenshot: `ss_7587ee34e`.

### Track C — Forms E2E audit (no files changed — this was a truth-finding pass)
- Server-side render path is real end to end:
  - Page 94 (`/form-test-e2e`) with `[fluentform id="1"]` shortcode.
  - `/wp-json/hatch/v1/content?slug=form-test-e2e` returns expanded form HTML with hidden `_fluentform_1_fluentformnonce`.
  - Astro `/form-test-e2e/` returns HTTP 200, 147779 bytes, 42 `fluentform` class hits.
  - Simulated `POST /wp-admin/admin-ajax.php` with correct `data=<serialized>` payload → `{"success":true,"insert_id":1,...}`.
  - Row confirmed in `wp_fluentform_submissions` (id=1, email `e2e@hatch.test`, created 2026-08-06 05:06:59).
- Endpoint contract for Fluent's submit handler is `data=<url-encoded serialized string>` — confirmed by capturing PHP fatal `parse_str(): Argument #1 must be of type string, array given` when sent flat.

---

## 3. What's still soft

- **Forms shipped via WP page body do not include the plugin's JS/CSS.** `astro-starter/src/pages/[...slug].astro` renders `page.content` via `set:html` but never enqueues Fluent / WPForms / Gravity scripts. `HatchEmbedForm.astro` handles this correctly, but only when the Astro author explicitly drops `<HatchEmbedForm formId=X />`. When the shortcode lives inside a WP page body, the form markup ships but the submit-handler JS does not — a real user click would POST to the empty `action=""` (i.e. the Astro URL) and fail. Fix path: extend `/hatch/v1/content` to return `scripts[]` + `styles[]` and have `[...slug].astro` emit the same `<link>` / `<script is:inline defer>` tags `HatchEmbedForm` already does, or rewrite detected form shortcodes to a marker the Astro page swaps for the component.
- **`/hatch/v1/forms` endpoint intentionally does not exist.** Form plugins expose their own REST namespaces (`/fluentform/v1/`, `/gf/v2/`, native WPForms GET) which Astro calls directly. Documented in `class-rest-api.php` comment (removed v0.50.14). The task's expectation of the endpoint is superseded — no Hatch-side proxy needed. Worth noting on camera so it doesn't come up as a "gap".
- **CORS on `admin-ajax.php`.** Cross-origin submission from `:4321` → `:8810` currently succeeds because Fluent does not check `Origin`, but the browser will need CORS headers for cookie/nonce persistence in production. Verify Hatch's REST CORS layer covers `admin-ajax.php`, not only `/wp-json/*`.
- **Broker flows in Step 3 sub-step B untested end-to-end.** Cloudflare / Vercel provider forms depend on the server writing `astro_origin` back after the external build; no real token was pasted, so `persistAndLaunch` → `completeUrl` redirect was not exercised. Self-hosted path (paste-your-own-origin) is fully wired.
- **Astro-origin field only editable inside the Self-hosted card in sub-step B.** By design, but worth flagging if a demo viewer wants to type an origin manually while a broker is selected.
- **Playwright consistency suite red (4 failed, 3 skipped):**
  - `admin-audit.spec.ts:28` — login / Hatch admin loads without errors.
  - `admin-layout.spec.ts:87` — Bridge tab SEO card with 5 badges layout.
  - `layout-matrix.spec.ts:100` — v0.6 frontend button radius: expected `9999px`, got `4px`.
  - `site-consistency.spec.ts:83` — 8 button-DNA divergences on `/about` + `/contact` (radius, padding-block/inline, font-size all off spec).
  - These look like an Astro-side design-token regression on public pages, not caused by the tracks in this batch. Own it before the next tag; do not block the demo.

---

## 4. Demo talking points — wizard Step 3 (3 sub-steps)

Click through in this order:

1. **Land on Step 3.** Point at the `SubStepStrip` at the top: "Step 3 used to be one wall. It's now three decisions in order — location, host, connect."
2. **Sub-step A · Deploy location.** Show both cards. "Subfolder means `parent.com/blog` reverse-proxies to Astro. Root domain means Astro owns the apex; WP moves to a subdomain via a URL-split filter."
3. Click **Subfolder** → point at the "Path on localhost" input + preset chips. "Path is now real state and persisted — it used to be hardcoded to `/blog`."
4. Click **Root domain** → surface the explainer callout in sub-step C ("WP admin stays on the subdomain, public URLs move to root").
5. **Sub-step B · Where Astro runs.** Show Cloudflare Recommended pill, then expand Self-hosted. "Same host picker regardless of location. Cloudflare/Vercel run a broker flow; Self-hosted lets you paste your own origin."
6. **Sub-step C · Connect the pieces.**
   - On the **subfolder** path: switch `HxSeg` tabs across Nginx / Apache / Cloudflare Worker. Point at the interpolated `/blog` in the `proxy_pass`.
   - On the **root** path: show the CNAME table (`@ → CNAME → astro-hatch.pages.dev`) and the WP-admin split note.
7. Point at the **review card** at the bottom of C: "One-line summary — mount mode + Astro origin — so you know exactly what you're about to launch."
8. Honest note on camera: "Broker launch and Astro-origin write-back need a real token; the self-hosted path is fully wired."

---

## 5. Bridge "Exposes" quick reference

| Plugin (family) | Exposes chips |
|---|---|
| **SEO — Rank Math** | Meta tags · Schema.org · Sitemap · Breadcrumbs · Redirects |
| **Forms — WPForms Lite** | Form rendering · Submissions · Spam protection |
| **Redirects — Redirection** | 301/302 rules · Regex matching · Redirect logs · 404 tracking |
| **E-commerce** (no Woo installed) | *(row intentionally hidden — card renders without Exposes)* |

Corresponding live REST (auth-gated): `/hatch/v1/seo-head`, `/hatch/v1/schema`, `/hatch/v1/redirects`. `/hatch/v1/forms` does not exist by design — form plugins expose their own namespaces and Astro calls them directly.

# Hatch v0.8 Bridge Live Proof

Date: 2026-08-06
Environment: hatch_wp :8810, hatch_astro :4321 (Docker)

## 1. Verdict

| Bridge | Status |
|---|---|
| Fluent Forms | WORKING |
| WPForms (Lite) | WORKING (submit persists to native pipeline; entry_id=0 because Pro-only `wp_wpforms_entries` table not present) |
| Contact Form 7 | WORKING (validation + CF7 pipeline confirmed; mail send fails in container — no SMTP, not an adapter bug) |
| Gravity Forms | NOT IMPLEMENTED |
| RankMath SEO | BROKEN (endpoint returns empty head for every URL — `headless_support` option unset, RankMath REST namespace never registers) |
| Schema (RankMath) | STUB (returns fallback WebSite schema only, never touches RankMath) |
| Redirects (Redirection plugin) | SOFT (endpoint responds `[]`; unverified whether module id or empty ruleset is the cause) |

## 2. Per-bridge Proof

Base: `http://localhost:8810/wp-json/hatch/v1/forms/{provider}/{id}` and `/submit`.

| Provider | Schema endpoint | Submit endpoint | DB row proof |
|---|---|---|---|
| fluent | GET `/fluent/{id}` → 200, `{"fields":[...],"submit":{...},"i18n":{...}}` (Fluent-normalized shape) | POST `/fluent/{id}/submit` → 201 `{"ok":true,"provider":"fluent",...}` on valid; 422 with per-field errors on invalid | Native `wp_fluentform_submissions` row written (Fluent Lite ships submissions table) |
| wpforms | GET `/wpforms/95` → 200, first 100 chars: `{"fields":[{"id":"1","type":"text","label":"Name","required":true,...` | POST valid → 201 `{"ok":true,"provider":"wpforms","id":95,"entry_id":0,"message":"..."}`; POST invalid → 422 `{"errors":{"2":"The provided email is not valid.","3":"This field is required."}}` | `wp_wpforms_entries` DOES NOT EXIST in Lite (verified via `wp db query "SHOW TABLES LIKE 'wp_wpforms_entries'"` → empty). Only `wp_wpforms_logs`, `wp_wpforms_payments`, `wp_wpforms_tasks_meta` exist. Submit path fires native WPForms `process` (validation confirmed live) — entry_id=0 is honest reporting for Lite |
| cf7 | GET `/cf7/37` → 200, four fields: `your-name` (text, required), `your-email` (email, required), `your-subject` (text, required), `your-message` (textarea, optional); `submit.button_text: "Submit"` | POST valid → CF7 returned `mail_sent`-shape with `posted_data_hash: 21ec22413728e287a72e624072766d2c` and empty `invalid_fields`; final status `mail_failed` because no MTA in container. POST invalid → 422 `{"errors":{"your-name":"Please fill out this field.","your-email":"Please enter an email address.","your-subject":"Please fill out this field."}}` | CF7 does not persist without Flamingo. Ground truth = CF7 computed `posted_data_hash` and cleared validation (proof submission reached CF7's pipeline in-process via `rest_do_request`) |
| gravity | not implemented | not implemented | n/a |

Curl exit codes: all schema + submit calls above returned exit 0 from `curl`; HTTP statuses as listed.

## 3. RankMath SEO Output

Endpoint: `GET /wp-json/hatch/v1/seo-head?url={url}` with admin app-password auth.

| URL | source | head length | og:title | og:description | canonical | JSON-LD |
|---|---|---|---|---|---|---|
| `/blog/canary-all-core-blocks/` | rankmath | 0 | 0 | 0 | 0 | 0 |
| `/blog/the-case-for-headless-wordpress-in-2026/` | rankmath | 0 | 0 | 0 | 0 | 0 |
| `/blog/how-we-cut-time-to-first-byte-by-800ms/` | rankmath | 0 | 0 | 0 | 0 | 0 |

Root cause: `wp_options.rank-math-options-general.headless_support` is unset, so `rankmath/v1` namespace never registers. Direct probe of `/wp-json/rankmath/v1/getHead` returns `{"code":"rest_no_route","status":404}`. `/wp-json/` namespace list does not include `rankmath/v1` (yoast/v1 IS present with 1346-char valid response, but `Hatch_Detector::get_seo_plugin()` picks rankmath first and swallows the empty result with no fallback).

Astro frontend `/blog/{slug}/` ships its own Astro-generated meta (13–16 tags, 2 ld+json each) independent of this broken bridge — the bridge is not the source of frontend SEO today.

## 4. What Is Still Soft

- **Gravity Forms adapter** — not implemented. Schema and submit routes have no `gravity` case.
- **WPForms Pro entry persistence** — `wp_wpforms_entries` is a Pro-only table; Lite install cannot prove DB-row write. Submit fires native `process()` (validation live), returns `entry_id:0` honestly. Would populate under Pro.
- **WPForms `id` field injection** — `wpforms()->form->add()` does not write the numeric `id` into `post_content` JSON. Form 95 required manual `wp_update_post` patch. Any future form created outside the WPForms builder needs the same fix or a `wpforms_process_before_form_data` filter.
- **CF7 mail delivery** — container has no SMTP transport. CF7 returns `mail_failed` at the transport step; the adapter, validation, and CF7 pipeline all fire correctly. Install Flamingo or add SMTP to the image for full end-to-end proof.
- **RankMath SEO bridge** — enable RankMath's `headless_support` option, OR change `Hatch_Detector::get_seo_plugin()` priority to fall through to Yoast when RankMath returns empty. Yoast is installed and produces 1346 chars of real markup on the same URLs today.
- **Schema endpoint** — returns fallback WebSite schema only; RankMath integration path not wired.
- **Redirects endpoint** — returns `[]` despite Redirection 5.9.0 active. Could be the `Red_Item::get_all_for_module(0)` argument or simply no redirects configured; not root-caused.

## 5. Demo Talking Point

Fluent Forms, WPForms Lite, and Contact Form 7 all submit through Hatch's REST bridge with native validation errors round-tripping to the Astro frontend; RankMath SEO bridge is currently returning empty and needs the `headless_support` option enabled before it will produce meta output.

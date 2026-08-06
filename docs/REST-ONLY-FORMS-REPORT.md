# REST-Only Forms + Zero-Bloat Frontend — v0.8 Report

## 1. Verdict

**HOLD.** REST-only forms bridge is working end-to-end on Fluent Forms with zero plugin bloat on any audited route, but 3 Playwright specs fail and the "Run setup wizard again" entry point no longer surfaces Step 3, so demo readiness is not clean.

## 2. Architectural shift (v0.8)

Plugins now act as REST-only data providers. `/wp-json/hatch/v1/content` strips form shortcodes server-side and replaces them with neutral `<div class="hatch-form-mount" data-hatch-form-id data-hatch-form-provider>` markers before `the_content` runs, so plugin shortcodes never execute and their CSS/JS never enqueue. The Astro theme owns 100% of the visual render: it reads the marker, fetches a normalized schema from `/hatch/v1/forms/{provider}/{id}`, and renders a plain `.hatch-form` using `--hatch-*` tokens. Submissions POST back through `/hatch/v1/forms/{provider}/{id}/submit`, which hands the payload to the provider's native handler (Fluent's `SubmissionHandlerService`) so validation, notifications, and integrations still fire. Result: one design system on the frontend, provider logic still authoritative on the backend.

## 3. Per-route zero-bloat table

| Route | wp-content/plugins | frm-fluent-form | wpforms-* | gform_wrapper | fluentform-public | rank-math | yoast-* | redirection-* |
|---|---|---|---|---|---|---|---|---|
| `/` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/blog` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/blog/canary-all-core-blocks` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/about` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/contact` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `/form-test-e2e` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Verified via curl + grep post `docker compose restart astro`.

## 4. Forms flow (plain text)

```
WordPress editor
    [fluentform id="1"]
        |
        v
GET /wp-json/hatch/v1/content?slug=form-test-e2e
    class-rest-api.php
        -> Hatch_Headless_Forms::replace_form_shortcodes_with_markers()
        -> shortcode stripped, plugin assets never enqueue
        -> <div class="hatch-form-mount"
              data-hatch-form-id="1"
              data-hatch-form-provider="fluent"></div>
        |
        v
Astro SSR renders page with marker + <HatchForm /> hydrator once after article
        |
        v
Browser hydrator scans DOM, finds marker
    GET /api/hatch-form/fluent/1  (Astro origin proxy)
        -> proxies to /wp-json/hatch/v1/forms/fluent/1
        -> returns { fields[], submit.url, button_text }
        |
        v
Theme renders <form class="hatch-form"> using --hatch-* tokens only
        |
        v
User submits
    POST /api/hatch-form/fluent/1/submit  (Astro origin proxy)
        -> POST /wp-json/hatch/v1/forms/fluent/1/submit (JSON body)
        -> class-headless-forms.php hands payload to
           FluentForm SubmissionHandlerService (native validation,
           spam checks, notifications, integrations all fire)
        -> row written to wp_fluentform_submissions
        |
        v
Success/error banner shown inline in .hatch-form
```

## 5. Playwright delta

Prior run (pre-fix): 4 named failures across admin-audit / admin-layout / layout-matrix / site-consistency, most cascade-skipped by a stale-password login failure.

Current run (tests/consistency, 7.0 min): **26 passed / 3 failed / 1 did not run.**

New failures:
- `admin-audit.spec.ts:139` — Connection tab Preflight diagnostic returns `ok:false` (previously masked by cascade-skip).
- `admin-layout.spec.ts:29` — HxRow grid ratio below 0.9 threshold (left column <260px at 1440×900) on Bridge tab (previously vacuously-passing behind login failure).
- `density-impact.spec.ts:58` — `net::ERR_CONNECTION_RESET` on `http://localhost:4321/blog/` mid-run. Astro dropped the connection; likely infra flake, not verified reproducible.

The 4 originally-named failures all pass. The 2 newly-visible admin failures are pre-existing latent issues that were hidden by the cascade-skip, not regressions.

## 6. Still soft

- **Wizard Step 3 does not open from the "Run setup wizard again" footer link.** Clicked at `/wp-admin?page=hatch#onboarding` — no dialog, no `[role=dialog]`, no Step 3 UI in DOM. Only the Plugin Bridge tab body renders. A→B→C walk could not be executed. Likely regression in the wizard entry point.
- **Fluent grouped sub-fields** (`names[first_name]`, `names[last_name]`) ship flat and Fluent drops them from the stored response body. Required-field validation still fires correctly. v1 follow-up.
- **wpforms / gravity / cf7 adapters** stubbed as 501 `not_implemented`. Theme shows "Form is unavailable right now." placeholder. Fluent is the only fully-wired provider today.
- **admin-audit.spec.ts:139** (Preflight diagnostic returns ok:false) — out of scope for this pass per "do not touch admin React tabs".
- **admin-layout.spec.ts:29** (Bridge tab grid left column <260px, 13 rows) — same scope note.
- **density-impact.spec.ts:58 ERR_CONNECTION_RESET on /blog/** — needs a rerun to confirm flake vs real.
- **Astro host-mode dev server** hits `http://wp` for `/features` and 500s in host mode (needs `WP_URL=http://localhost:8810` in `astro-starter/.env`). Docker path unaffected.

## 7. Demo talking point

Every WordPress plugin talks to Hatch via REST only. Zero bloat, zero foreign styling, one design system on the frontend.

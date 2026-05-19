# Changelog

All notable changes to Hatch are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
adheres to semantic versioning.

## 0.50.11

Released 2026-05-19.

### Fixed

- **Critical save-flow bug**: the REST `/hatch/v1/options` endpoint was
  shadowed by a legacy whitelist handler that silently dropped every option
  outside its 10-key allowlist. The unified React dispatcher only loaded in
  `is_admin()` context, so frontend REST calls from the admin SPA never
  registered the right route. Theme, design tokens, voice, templates, and
  block toggles appeared to "save" but never persisted. Both bugs fixed —
  saves now propagate end-to-end. (Tested by `e2e/10-react-admin-smoke.spec.ts`.)
- React admin loaded a stale legacy handler that always returned `ignored: […]`
  with `ok: true`, masking the failure as a successful save.
- Design tab changes now regenerate `hatch_design_parsed` + `hatch_design_md`
  on save, so the Astro frontend actually sees the change after a revalidate.
- Block toggles now mirror to `hatch_blocks_state` (the prefixed shape the
  Astro block resolver reads), in addition to the React-side `hatch_blocks_enabled`.

### Added

- **Companion theme card** in Connection tab — surfaces install / activate
  status and provides a 1-click install + activate button.
- **Fortress mode card** in Security tab — three toggles for `DISALLOW_FILE_EDIT`,
  HSTS / Referrer-Policy / X-Frame-Options / Permissions-Policy / nosniff
  headers on the WP origin, and 2FA detection / soft-enforcement with five
  known providers (WP 2FA, Two-Factor, miniOrange, Wordfence, Solid Security).
- **`Hatch_Media_Rewriter`** — rewrites every `wp-content/uploads/` URL into a
  clean frontend `/hatch-media/…` path in content, REST API responses, and
  attachment URLs. Activated by the Smart Media URLs toggle on the Performance
  tab.
- **Astro `/hatch-media/[...path].ts`** — catch-all proxy that streams WP media
  back to the browser under the frontend origin. Images get AVIF / WebP via
  the existing `/img` backend; videos and other media stream with proper
  Accept-Ranges so `<video>` seek works.
- **Plugin Bridge** — capability-based detection that probes 23 popular
  plugins across six categories (eCommerce, Custom Fields, Email Newsletter,
  Memberships, Code Snippets, Data Tables) via `is_plugin_active()`.
- Heartbeat **Probe now** button — on-demand probe so heartbeat data appears
  without waiting for the 5-minute WP-cron cycle in dev.
- 14-test Playwright smoke suite covering every tab, hash navigation, save
  flow, setup wizard, broker forms, WP admin isolation, and back-compat.

### Changed

- React admin moved off legacy PHP form-post handlers — every save goes
  through the unified `POST /hatch/v1/options` REST endpoint with dot-path
  keys. **442 lines of orphaned admin-post handler code removed.**
- Plugin license changed from `MIT` → `GPLv2 or later` for WP.org compatibility.
- Stable tag in `readme.txt` synced to plugin header version.
- Setup wizard VPS install command now reads from PHP boot state
  (`vpsOneLiner`) so the GitHub-hosted install script URL is filterable via
  `hatch/vps_install_script_url` and embeds the live WP URL / user /
  Application Password / webhook secret in one copy-paste line.
- Cloudflare Turnstile keys consolidated to a single location in
  Content tab → Third-party services. Comments and Forms toggles show a
  cross-tab pointer when the keys are missing.
- Hatch Blocks card removed from the admin UI by request; site uses core
  WordPress Gutenberg blocks. Block source still ships for future revival
  but is unregistered.

### Removed

- Legacy `Hatch_Options_Rest::/options` route (superseded by React dispatcher).
- 14 orphaned `admin-post` handlers: `hatch_save_features`, `hatch_save_blocks`,
  `hatch_save_theme`, `hatch_save_integrations`, `hatch_save_design`,
  `hatch_save_design_visual`, `hatch_save_perf`, `hatch_save_code_snippets`,
  `hatch_save_security`, `hatch_mark_deployed`, `hatch_expose_acf`,
  `hatch_clear_token`, `hatch_probe_turnstile`, `hatch_test_webhook`.
- Voice (tone / pronouns) and Monospace font controls — removed at user
  request. Underlying option keys preserved for back-compat.

### Security

- DISALLOW_FILE_EDIT toggle prevents Theme + Plugin Editor PHP injection.
- 1-year HSTS, SAMEORIGIN X-Frame, strict-origin-when-cross-origin Referrer,
  nosniff, and Permissions-Policy headers added on the WP origin (when the
  toggle is on). Mirrors the Astro middleware so both origins speak the same
  fortress.
- Token paste inputs on broker forms are now `type=password` (was `text`).
- Custom login URL "anyone hitting old wp-login.php" picker — Hard 404 /
  Home page / Custom — replaces the cramped raw input.

## [0.50.10]

Last release before the React admin rewrite. Tag preserved in git history;
no upgrade path back from 0.50.11 (option schema is forward-compatible
but legacy form-post handlers are gone).

# Hatch WordPress Plugin — Changelog

## 0.2 (2026-10-20)

First public WordPress.org release. Renumbered from the internal 1.0.2 build so that 1.0 is kept for a later milestone. The code is the 1.0.2 build below; the 1.0.x and 0.8.x numbers were never published.

## 1.0.2 (2026-10-20, internal, shipped as 0.2)

Changes after the WordPress.org Plugin Review Team's review of 1.0.1.

Removed
- The `_headers` file from the bundled frontend. Its cache rule now travels in the Cloudflare upload settings (`bundle.json` → `assets_config._headers`).
- Partytown and its remote script from cdn.jsdelivr.net, plus the Partytown setting.
- The Hatch Reader user and role. Hatch no longer creates or deletes users, or creates application passwords.

Changed
- Deploy asks for a username and an Application Password the site owner creates in their own profile. Accounts that can manage options or edit others' posts are refused. The password is stored encrypted and never shown again.
- Frontend sign-in and registration (`hatch/v1/auth`) are off by default behind a new "Frontend accounts" switch (Hatch, Content; option `hatch_content_flags['accounts_enabled']`). While off, no auth routes or filters are registered and the Astro `/login`, `/register` and `/account` pages fall through to normal page lookup. Registration also needs WordPress's "Anyone can register".
- The frontend bundle build fails if a remote script outside the documented services, or a not-permitted file, ends up in the bundle.

Security
- Frontend sign-in refuses staff accounts (`edit_posts` or `manage_options`) and their tokens are ignored by `determine_current_user` and the comment-posting path; staff sign in at wp-admin.
- The comment-posting path now checks the token against the user's session version and password stamp, so tokens ended by logout or a password change no longer post comments.
- The deploy account check also refuses `unfiltered_html`, `list_users`, `create_users`, `edit_users`, `promote_users`, `delete_users`, `install_plugins`, `activate_plugins` and `edit_theme_options`, and runs again on every Application Password sign-in (`wp_authenticate_application_password_errors`).
- Registration rejects user names that `sanitize_user()` would change or `validate_username()` refuses.
- Registration is refused (403 `hatch_auth_staff_role`) when the New User Default Role is missing or has `edit_posts` or `manage_options`, so sign-up never creates a staff account.
- `/hatch/v1/info` returns `wp_version` to administrators only.
- Brand and border colour settings accept only hex colours (`sanitize_hex_color`); any other value keeps the stored one. Found in the 0.2 visual QA, where a test string had been saved as the border colour.

Fixed (0.2 visual QA)
- Status tab: "Hide this site from search engines" now reads "Hide the WordPress address from search engines", matching the Security setting it reports. "Supported plugins found" is now "Plugin integrations found", since it counts individual plugins while the Plugins tab counts types.

Cleanup
- On upgrade, the `hatch_prune_app_pwds_cron` event and the `hatch_reader_user_id` and `hatch_app_pwd_retention_days` options are removed once. Uninstall also removes the `hatch_reader` role.
- THIRD-PARTY.txt now carries the full Lucide (ISC) and Feather (MIT) licence texts.

## 1.0.1 (2026-10-01)

Changes after the WordPress.org Plugin Review Team's first review.

Removed
- The Hatch Companion theme and its installer. Hatch no longer bundles, installs or switches a theme.
- `Hatch_Admin_Quiet`, which removed other plugins' admin notices on Hatch screens.
- Advisory notices for ACF, custom post types, root domains and two-factor reminders.
- Raw head, body-start and body-end code injection through `/code-snippets` and the Astro `set:html` slots.
- The `Tested up to` line from the plugin file header (it stays in readme.txt).

Changed
- Visitors of the raw WordPress address are redirected to the frontend by `Hatch_Frontend_Redirect`, a plain plugin class.
- Text domain is now `hatch-connect`, matching the plugin slug.
- Every REST route names a permission callback (`Hatch_Rest_Permission`); `/auth/me` and `/auth/refresh` require a verified session.
- Remaining Hatch admin notices appear only on Hatch screens.
- `readme.txt` Contributors now lists the owner username `hmbhq`.

Fixed
- Forms bridge no longer merges `$_REQUEST`.
- The frontend URL is passed through `esc_url_raw()` before it reaches page output.

## 1.0.0 (2026-10-01)

First stable release for WordPress.org.

Changed
- Audited against the WordPress.org Plugin Check tool: no code changes were required, every flagged line is either a documented external service (see readme.txt "External services") or standard WordPress API usage on a custom table and a taxonomy filter.

Removed
- Two unused frontend routes left over from a retired hosted-deploy flow. Nothing in the codebase called them.

## 0.8.1 (2026-10-01)

Pre-submission stability pass (GitHub issues 2 to 12 plus a security review).

Fixed
- Disconnect leaves no "deployed" state behind (`Hatch_Deploy_Controller::mark_disconnected`): the frontend URL, cache-refresh endpoint and hosting model are cleared and the SEO rewrites stop. A deploy now warns if the Companion theme could not be switched on.
- Edge proxy: `//host` paths no longer turn it into an open proxy.
- `/post/{id}/blocks` no longer exposes stored form submissions.
- `route_login` rejects Application Passwords; logout ends the WP session.
- `app_password_only` no longer breaks block-editor and dashboard saves.
- Real client IP behind Cloudflare for lockouts and form entries.
- Astro `/login` and `/register` accept only same-site `redirect_to` paths; `robots.txt` Sitemap uses the frontend origin.

Added
- Deployment history; mu-plugin and Companion theme lifecycle (deactivate, uninstall); first-run setup guide.

Changed
- Text domain, slug and zip folder are `hatch` (was `hatch-bridge`).

## 0.8.0 (2026-09-28)

Cloudflare-only release for WordPress.org. Breaking cleanup, GPL-2.0-or-later, first version verified against a live Cloudflare deploy.

Added
- Disconnect button on the Connection tab, behind a confirm step. Calls `POST /hatch/v1/deploy/disconnect`: revokes the Hatch Application Passwords, deletes the Hatch Reader user and role, restores the previous theme.
- Read-only Hatch Reader user and role for the frontend, replacing use of an administrator account.
- Explicit consent gate before a deploy changes the theme, permalinks or creates the Application Password.
- Clear error when the Cloudflare account has no workers.dev address (`hatch_cf_no_subdomain`), raised before anything is uploaded.
- Frontend source ships inside the plugin (`source` folder) with THIRD-PARTY.txt.

Changed
- Deploy runs inside the site with a Cloudflare token the user supplies, stored AES-256-GCM encrypted, kept only if the user ticks the box.
- Frontend sign-in tokens are tied to the user's password and revoked on logout or password change. Earlier sessions are invalidated.
- Comments and store product routes no longer return draft, private, password-protected or withheld items.
- Form submissions older than 90 days are deleted automatically.
- License changed from MIT, then AGPL, to GPL-2.0-or-later.

Fixed
- PHP 8.1+ `strip_tags()` deprecation on the hidden setup page (registered under `options.php`).
- Broken image thumbnails through the image proxy on Cloudflare deploys.

Removed
- Hosted deploy service, VPS agent, Netlify and Vercel deploy paths, the plugin's own updater, all outbound telemetry, the AI helper and the Blocks tab, the legacy cleanup class, moved or hidden login URL.

## 0.7.6.1 — 2026-08-13
- fix(img): allow same-origin self-fetch through /img proxy (broken CF-deploy image thumbnails)

## 0.7.6.0 — 2026-08-13

Release wrap for today's session:

- HatchForms front-end CSS ships with the form block so the input rail no longer inherits raw theme styles.
- WPForms bridge now persists submissions to the WordPress DB (was only pushing to REST echo).
- The Astro-side mu-plugin auto-installs on activation so a fresh WP install does not need a manual step.
- Cloudflare-deploy wizard now honours `mount_mode` end-to-end (Worker source + route + label were previously drifting).
- Admin toggle labels moved to the shared truth source so mismatch between wizard copy and DB key is impossible.

## [0.1.3] — 2026-05-20

Fixed: REST-lock toggle 404'd the headless frontend. `/hatch/v1/content` and `/hatch/v1/post/{id}/blocks` are now in the public allowlist alongside `/features`, `/menus`, `/seo-meta` — they only return already-public data so the toggle stays safe to flip on.

## [0.1.2] — 2026-05-20

Cloudflare Workers deploy fix. The Astro starter's middleware had a top-level `setInterval` that the CF Workers v2 runtime rejects (error 10021). Removed; lazy in-handler sweep now keeps the rate-limiter bounded. No plugin-side changes — version bumped to keep the pair in sync.

## [0.1.1] — 2026-05-20

Post-launch polish — see the root `CHANGELOG.md` for the full release notes.

Plugin-specific fixes:

- `Kill XML-RPC` toggle now hard-403s `/xmlrpc.php` (was 200 with method message)
- `Hide usernames` returns 404 on `?author=N` (was 301 redirect); `/wp/v2/users` independently stripped from REST surface
- `Hide WP from Google` now emits `Disallow: /` in `robots.txt` (was only meta robots)
- `Real-user telemetry` option key wiring fixed (was a silent no-op)
- `CDN asset prefix` removed (returns in v0.2)
- Gutenberg editor URL preview now mirrors the saved slug

## [0.1.0] — 2026-05-20

First stable public release. See the root `CHANGELOG.md` for the full Hatch release notes.

Highlights for the plugin specifically:

- React admin SPA — 6 tabs, 105 KiB JS, 6.66 KiB CSS, five canonical typography classes
- 3-step setup wizard with preflight diagnostic
- Plugin Bridge — 12 auto-detected capability slots
- WP Core Sync — one card mirrors every WP-owned setting the headless frontend consumes
- Performance toggles: clean media URLs, instant navigation, Partytown analytics, real-user telemetry
- Hardening: REST lock, XML-RPC kill, username enum block, custom login slug, brute-force lockout, security headers, Turnstile gating
- Application Passwords with rotate and broker-side .env scaffolding
- Read-only Status diagnostic tab
- `DISALLOW_UNFILTERED_HTML`, `/uploads/.htaccess` PHP block, secure-by-default config

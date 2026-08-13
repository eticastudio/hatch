# Root-mode fix, 2026-08-13

## Files edited
- wp-plugin/includes/class-onboarding-cloudflare.php
  - deploy() accepts `mount_mode` (whitelist root|subfolder, default subfolder)
  - upload_worker_script() adds `$mount_mode` param
  - attach_route() adds `$subpath` and `$mount_mode` params, route pattern is `{domain}/*` for root and `{domain}{subpath}/*` for subfolder
  - build_worker_source() emits two variants (root proxies every path, subfolder gates on subpath); both use `redirect: 'manual'` on upstream fetch and share the canonical HTMLRewriter
  - status() always includes `mount_mode`, back-fills legacy state from `hatch_mount_mode` option
  - deploy() mirrors selected mode into `hatch_mount_mode` option
- wp-plugin/includes/class-deploy-broker.php
  - After validating mountMode/subPath from POST (line 158 area), persists `hatch_mount_mode` and `hatch_mount_subpath` options
  - Line 248 (`set_hosting_model`) now writes `'cloudflare-workers'`, not `'cloudflare-pages'`
- wp-plugin/admin/dashboard.php
  - Boot payload's `connection` block now carries `mountMode` and `mountSubpath` (read from options)
  - `hatch_host_label()` normalises `cloudflare-pages` (legacy) and new `cloudflare-workers` both to `Cloudflare`; React composes the `(root)` / `(subfolder)` suffix
- wp-plugin/admin-react/src/tabs/Connection.jsx
  - Removed the hardcoded `'Cloudflare Workers (subfolder)'` label
  - Reads `conn.mountMode`; falls back to `/workers\.dev/` heuristic if PHP payload is missing; otherwise defaults to `subfolder`
  - Renders `Cloudflare Workers (${mountMode})` for any Cloudflare host, non-Cloudflare hosts unchanged
  - Bottom hint row (`No DNS changes required` etc.) branches on `mountMode`: subfolder copy vs new root copy

## Verify
- `php -l class-onboarding-cloudflare.php`: PASS
- `php -l class-deploy-broker.php`: PASS
- `php -l dashboard.php`: PASS
- `npm run build` (admin-react): exit 0, `index.jsx.js 146 KiB emitted [minimized]`
- `wp option get hatch_mount_mode`: `root` (persisted per the wizard choice)
- Dashboard render (Playwright, chromium, headless):
  - screenshot: `docs/screenshots/root-mode-fix/dashboard-after.png`
  - `has_root_label` (regex `Cloudflare Workers \(root\)`): true
  - `has_subfolder_stale` (regex `Cloudflare Workers \(subfolder\)`): false
  - `window.hatchBoot.state.connection.mountMode`: `"root"`
  - `window.hatchBoot.state.connection.hostLabel`: `"Cloudflare"`
  - Legacy `hostModel` still `cloudflare-pages` on this test install (never re-ran the broker path since the fix); a fresh deploy will write `cloudflare-workers`. React normalises both.

## For tomorrow's live site
When the user runs the wizard on a real WP site with a real Astro origin URL:

- Selecting **Root**:
  - Broker persists `hatch_mount_mode=root`
  - Broker POSTs `mountMode: root` to the deploy broker service
  - When the Worker is uploaded through `Hatch_Onboarding_Cloudflare::deploy()` with `mount_mode=root`, the Worker source proxies every path from `MONEY_DOMAIN` to `ASTRO_ORIGIN` (no `/blog` gate)
  - Route pattern attached is `{money_domain}/*`
  - Dashboard label reads `Cloudflare Workers (root)`

- Selecting **Subfolder**:
  - `hatch_mount_mode=subfolder`, `hatch_mount_subpath=/blog` (or the user's subpath)
  - Worker source keeps the exact-match SUBPATH gate; anything outside falls through to the WP origin
  - Route pattern attached is `{money_domain}/blog/*` (or the chosen subpath)
  - Dashboard label reads `Cloudflare Workers (subfolder)`

Redeploy note: this session did NOT redeploy the live Worker because no public Astro origin was available in the local dev stack. The "Redeploy" button in the admin will use the new Worker template correctly when clicked from a live WP site with a public origin.

## Learnings captured
None new. Existing LEARNINGS.md rules honored: no em-dash in JSX (anti-slop gate caught one on first try and I rewrote); no git destructive commands; verified Docker container sees new PHP by using wp-cli through the container.

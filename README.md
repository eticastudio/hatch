<div align="center">

# Hatch: headless WordPress on Cloudflare, deployed from your dashboard

**A WordPress plugin and an Astro frontend. Paste one Cloudflare API token and Hatch publishes a fast frontend for your site to your own Cloudflare account.**

You keep writing in the normal block editor. Hatch serves your content over the WordPress REST API, hardens the WordPress side, and deploys the Astro frontend with no Hatch server, no Hatch account and no third-party deploy service.

**Version 1.0.0** · WordPress.org plugin name *Hatch Connect - Astro Headless for Cloudflare* · slug `hatch-connect`

[![License: GPL v2+](https://img.shields.io/badge/License-GPL_v2%2B-b91c1c?style=flat-square)](LICENSE)
[![Astro](https://img.shields.io/badge/Astro-frontend-ff5e1f?style=flat-square)](https://astro.build)
[![WordPress 6.4+](https://img.shields.io/badge/WordPress-6.4+-21759b?style=flat-square)](https://wordpress.org)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-f38020?style=flat-square)](https://workers.cloudflare.com)

</div>

---

## Contents

- [What is Hatch?](#what-is-hatch)
- [Quick start (site owners)](#quick-start-site-owners)
- [Key features](#key-features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local development](#local-development)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Available scripts](#available-scripts)
- [Testing](#testing)
- [Building and releasing](#building-and-releasing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

## What is Hatch?

Hatch is a headless WordPress plugin. "Headless" means the place you write (WordPress) and the website your visitors see (the frontend) are separate. WordPress stays your back office for posts, pages, menus, forms and comments. A small Astro site running on Cloudflare Workers shows that content to visitors.

Hatch sets the second half up for you. There is no command line, no server to manage and no build pipeline to wire together.

## Quick start (site owners)

1. Install and activate the plugin (requires WordPress 6.4+ and PHP 7.4+).
2. Open **Hatch** in wp-admin. The setup guide opens by itself.
3. Create a Cloudflare API token with the permissions the guide lists, paste it, and press **Check token**.
4. Create a Subscriber user and an Application Password for it with WordPress's own screens, and enter both in the guide. Hatch never creates users or passwords, and it refuses accounts that can edit other people's posts or manage the site.
5. Choose a free `workers.dev` address or one of your own domains, tick the box that confirms the changes, and press **Deploy**.

Nothing on your site or in your Cloudflare account changes until you press Deploy. **Disconnect** (Hatch, Connection) undoes the WordPress side later. The screen-by-screen flow, including every error state, is in [docs/SETUP-FLOW.md](docs/SETUP-FLOW.md).

Token permissions: Account, Workers Scripts, Edit is required. Account Settings, Read is optional. Zone Read and Workers Routes Edit are needed only for a custom domain.

## Key features

- **One-click Cloudflare deploy.** Uploads the Astro frontend as a Cloudflare Worker in your account, with a deployment history that explains every attempt in plain language.
- **REST bridge.** The `hatch/v1` namespace exposes what core REST does not: menus, SEO meta, features, forms and more (full list under [Architecture](#architecture)). Bridges for common plugins are described in [docs/PLUGIN-BRIDGES.md](docs/PLUGIN-BRIDGES.md).
- **SEO plugin support.** Titles, descriptions and social settings from RankMath and Yoast SEO reach the frontend.
- **Plugin connections.** Fluent Forms, WPForms, Contact Form 7, Gravity Forms, WooCommerce and Advanced Custom Fields are read when active. If none is installed, the matching feature stays off.
- **Forms, comments and sign-in** from the frontend are handled by your WordPress site, with optional Cloudflare Turnstile spam protection.
- **Security controls** (all off until you turn them on): lock the REST API for signed-out visitors, block XML-RPC, hide usernames, wp-admin access by role, login lockout, Turnstile on login and comments, security headers, file editor lock.
- **Performance controls.** One switch removes WordPress front-end extras a headless site does not need.
- **Design.** Pick one of three starter designs (Editorial, Terminal, Docs), then set colors, fonts and layout. Each design has a light and a dark mode.
- **Automatic refresh.** Publishing or updating content tells your frontend to show the change.

Nothing phones home. The plugin sends no usage data and does not check a Hatch server for updates. The exact list of outside services it can contact is in the *External services* section of [wp-plugin/readme.txt](wp-plugin/readme.txt).

## Tech stack

| Layer | Technology |
|---|---|
| Plugin language | PHP 7.4+ (`Requires PHP: 7.4`) |
| Platform | WordPress 6.4+, tested up to 7.1 |
| Plugin admin UI | React with `@wordpress/components`, built by `@wordpress/scripts` v28 |
| Frontend | Astro 7 with Tailwind CSS 4 and TypeScript |
| Frontend hosting | Cloudflare Workers (`@astrojs/cloudflare`). A Node build target (`@astrojs/node`) also exists |
| API | WordPress REST API, namespace `hatch/v1` |
| PHP quality tools | PHPUnit 9.6, PHPStan (WordPress and deprecation rules), PHP_CodeSniffer with WordPress Coding Standards and PHPCompatibility |
| Browser tests | Playwright |
| Local stack | Docker Compose: WordPress, MySQL 8.0, Astro on Node 22 |

## Prerequisites

For using the plugin: a WordPress site on https and a Cloudflare account (the free plan includes Workers).

For developing it:

- Docker Desktop (runs the local stack)
- PHP 7.4 or newer and Composer (for `phpcs`, `phpstan` and `phpunit`)
- Node.js 22 and npm (admin build, Astro starter, Playwright). The Docker stack runs the Astro starter on `node:22-alpine`
- Git

## Local development

### 1. Clone and install

```bash
git clone https://github.com/eticastudio/hatch-dev.git
cd hatch-dev
composer install
cd wp-plugin && npm install && cd ..
cd astro-starter && npm install && cd ..
cd test && npm install && cd ..
```

### 2. Start the stack

```bash
docker compose up -d
```

| Service | Container | URL |
|---|---|---|
| WordPress with the plugin mounted | `hatch_wp` | http://localhost:8810 |
| MySQL 8.0 | `hatch_db` | internal only |
| Astro starter (dev server) | `hatch_astro` | http://localhost:4321 |

The local WordPress admin is http://localhost:8810/wp-admin with user `admin` and password `admin`. This is a seed value for the local container only.

### 3. Confirm it is healthy

```bash
bash .claude/check.sh
```

It lints PHP across `wp-plugin`, checks that wp-admin answers with 200 or 302, and checks that `/wp-json/hatch/v1/features` returns valid JSON. It prints `green` and exits 0 on success.

### 4. Rebuild the admin screen after editing React

```bash
cd wp-plugin
npm run build        # one-off build into wp-plugin/build/admin
npm run watch:admin  # rebuild on change
```

The browser caches the built bundle. After a rebuild, hard-reload the admin page.

## Architecture

### Directory structure

The public repository (github.com/eticastudio/hatch) carries `wp-plugin/`, `astro-starter/` and `scripts/`. The other folders below belong to the development checkout.

```
hatch/
├── wp-plugin/                 The WordPress plugin (slug and text domain: hatch-connect)
│   ├── hatch.php              Plugin header, constants, bootstrap
│   ├── uninstall.php          Cleanup on delete
│   ├── includes/              PHP classes (REST, auth, bridges, hardening, deploy)
│   │   └── deploy/            Cloudflare API client, provider, deploy controller, bundle
│   ├── admin/                 PHP admin pages (dashboard.php, setup-wizard.php)
│   ├── admin-react/src/       React admin source (setup/, tabs/, components.jsx)
│   ├── build/admin/           Compiled admin bundle (generated)
│   ├── frontend-bundle/       Compiled Astro frontend that Hatch uploads (generated)
│   ├── optional-mu-plugin/    hatch-url-rewrite.php (local or temporary addresses only)
│   └── readme.txt             WordPress.org readme
├── astro-starter/             Astro frontend source (pages, components, lib, styles)
├── tests/                     PHPUnit tests
├── test/                      Playwright specs and configs
├── scripts/                   build-zip.sh, build-frontend-bundle.sh, hatch-static-scan.sh
├── docs/                      Guides (setup flow, plugin bridges, boilerplates)
├── build/                     Release zips (generated)
└── docker-compose.yml         Local stack
```

### How it fits together

```
WordPress (editor + REST)   your team keeps the workflow it has today
     |
     |  /wp-json/hatch/v1/*   menus, SEO meta, features, forms, auth, comments, store
     |  /wp-json/wp/v2/*      posts, pages, custom post types
     v
Astro frontend on Cloudflare Workers   (deployed by the plugin, into your account)
     |
     v
Your visitors
```

### Deploy lifecycle

1. The admin screen calls `hatch/v1/deploy/cloudflare/verify` with the pasted token. Hatch stores it encrypted (AES-256-GCM) and never returns it to the browser.
2. The user picks an account and an address. A custom domain looks up zones through `.../zones`.
3. On Deploy, `.../run` checks the user name and Application Password the owner entered (accounts with `manage_options` or `edit_others_posts` are refused), uploads the compiled frontend from `frontend-bundle/` as a Worker, and sets Worker secrets: `WP_API_URL`, `WP_API_USER`, `WP_API_PASS` and `HATCH_WEBHOOK_SECRET`. The cache rule for `/_astro/*` travels in the upload's `assets_config`, so no `_headers` file ships.
4. When content changes, WordPress calls the frontend's refresh endpoint with the webhook secret (`hatch/v1/revalidate`, `refresh-cache`) so visitors see the update.
5. `deploy/disconnect` turns the frontend redirect off and forgets the token and the stored frontend password. It never deletes users or revokes passwords; the owner revokes the Application Password in their profile. It never contacts Cloudflare. The Worker stays in the Cloudflare account until the owner deletes it.

### REST routes (`/wp-json/hatch/v1`)

| Group | Routes |
|---|---|
| Deploy | `deploy/providers`, `deploy/status`, `deploy/history`, `deploy/{provider}/verify`, `.../token`, `.../zones`, `.../run`, `deploy/redeploy`, `deploy/disconnect` |
| Content | `content`, `content/list`, `post/{id}/blocks`, `menus`, `menus/{location}`, `schema`, `redirects`, `code-snippets` |
| SEO and design | `seo-head`, `seo-meta`, `design`, `features`, `info` |
| Forms and comments | `forms`, `forms/{provider}/{id}`, `forms/{provider}/{id}/submit`, `comments` |
| Accounts (only while Frontend accounts is on) | `auth/login`, `auth/register`, `auth/logout`, `auth/refresh`, `auth/me` |
| Membership | `membership/check` |
| Store (WooCommerce) | `store/products`, `store/products/{id}`, `store/products/{id}/variations`, `store/categories`, `store/featured`, `order/{id}` |
| Integrations and health | `integrations`, `acf-status`, `cpt-health`, `connection-status`, `connection-check`, `verify-connection`, `diagnostic` |
| Refresh and settings | `revalidate`, `refresh-cache`, `options` |

Routes that change data are protected by a capability check, a nonce or a signed token. Public form, comment and sign-in routes have their own spam and lockout controls.

### Key components

**Admin screen.** A React app in `wp-plugin/admin-react/src`. The setup guide (`setup/SetupApp.jsx`) and seven tabs (Connection, Design, Content, Plugins, Performance, Security, Status). Changes are collected as a path-to-value map and saved in one POST to `hatch/v1/options`.

**Auth** (`class-auth.php`). Off until the owner switches on Frontend accounts (Hatch, Content); while off it registers no routes or filters. Sign-in uses core `wp_authenticate()`, registration uses `wp_create_user()` and follows "Anyone can register" and the default role. Signed tokens (JWT, 24 hours) for frontend visitors, carrying version and password claims so logout or a password change ends earlier sessions. Per-IP rate limit and a honeypot on registration.

**Bridges** (`class-*-bridge.php`). SEO (RankMath, Yoast), forms (Fluent Forms, WPForms, Contact Form 7, Gravity Forms), WooCommerce, ACF, menus. Each exposes REST routes and none ships plugin CSS or JavaScript to the frontend.

**Hardening** (`class-hardening.php`, `class-security.php`, `class-login-hardening.php`). The security switches. The login form stays at `/wp-login.php`.

**Performance** (`class-performance-bloat.php`). With the master switch on, every safe item is forced on except WordPress feeds.

**Astro frontend** (`astro-starter/src`). `pages/` for routes, `lib/` for the WordPress client, design and block rendering, `components/theme/` for the three designs, `middleware.ts`. It uses the Cloudflare adapter by default.

### Data stored

| Where | What |
|---|---|
| Table `{prefix}hatch_form_submissions` | `id`, `provider`, `form_id`, `fields`, `ip_address`, `user_agent`, `created_at`. Rows older than 90 days are deleted daily |
| Options (prefix `hatch_`) | Settings, deploy state (`hatch_cf_worker_state`, `hatch_deploy_last`), encrypted token (`hatch_enc_token_cloudflare`) |
| Transients | Short-lived login and rate-limit counters per IP |
| Scheduled events | A 15-minute check of the saved frontend address |

### WP-CLI

```bash
wp hatch setup --frontend-user=reader --frontend=https://mysite.com
wp hatch diagnose --format=json
wp hatch info
wp hatch revalidate --reason="manual"
wp hatch env
```

### Filters

`hatch_form_retention_days` (0 keeps entries), `hatch_form_rate_limit`, `hatch_form_max_body_bytes`, `hatch_turnstile_fail_open`, `hatch_revalidate_post_types`, `hatch_content_html`, `hatch_deploy_providers`, `hatch_plugin_bridge_catalog`, `hatch_seo_internal_url`, `hatch_url_rewriter_needed`, `hatch_cloudflare_api_root`, `hatch_diagnostic_include_webhook_check`.

## Configuration

A normal install needs no configuration files: the deploy sets everything. These matter when you run the Astro starter yourself.

### Astro starter variables (`astro-starter/.env.example`)

| Variable | Description |
|---|---|
| `WP_API_URL` | WordPress REST base, for example `https://cms.example.com/wp-json/wp/v2` |
| `WP_API_USER` | A Subscriber account you created for the frontend to read as |
| `WP_API_PASS` | That user's Application Password |
| `HATCH_WEBHOOK_SECRET` | Must match the secret Hatch generated, so refresh requests are accepted |
| `PUBLIC_SITE_URL` | Public address of the frontend (canonical URLs, sitemap, `og:url`) |
| `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Optional Cloudflare Turnstile keys |
| `PUBLIC_DISQUS_SHORTNAME` | Optional Disqus comments |

```bash
cp astro-starter/.env.example astro-starter/.env
```

Never commit `.env`. The starter also reads `HATCH_TARGET` (`cf` or `node`), `HATCH_IMG_BACKEND`, `PUBLIC_IMG_ALLOWED_HOSTS` and `PUBLIC_HATCH_CREDIT_URL`; see `astro-starter/src` for how.

### PHP and WordPress

`HATCH_VERSION`, `HATCH_PLUGIN_FILE`, `HATCH_PLUGIN_DIR`, `HATCH_PLUGIN_URL` and `HATCH_REST_NAMESPACE` are defined in `hatch.php`. There are no required `wp-config.php` constants.

## Available scripts

| Command | Where | What it does |
|---|---|---|
| `bash .claude/check.sh` | repo root | The green gate: PHP lint, wp-admin reachable, REST features JSON |
| `composer phpcs` | repo root | WordPress Coding Standards check |
| `composer phpcbf` | repo root | Auto-fix what phpcs can |
| `composer phpstan` | repo root | Static analysis |
| `composer test` | repo root | Full PHPUnit suite |
| `composer test:unit` | repo root | Unit suite only |
| `composer qa` | repo root | phpcs, then phpstan, then phpunit |
| `composer build-zip` | repo root | Build `build/hatch-connect.zip` |
| `composer build-frontend-bundle` | repo root | Compile the frontend bundle that ships inside the plugin |
| `npm run build` / `npm run watch:admin` | `wp-plugin/` | Build or watch the React admin |
| `npm run dev` | `astro-starter/` | Astro dev server |
| `npm run build` / `build:cf` / `build:node` | `astro-starter/` | Production build (Cloudflare by default) |
| `npm run typecheck` | `astro-starter/` | `astro check` |

## Testing

```bash
composer qa                       # phpcs, phpstan, phpunit (202 tests, 505 assertions at v1.0.0)
bash .claude/check.sh             # integration smoke against the running stack

cd test
npx playwright test --config=playwright.frontend.config.ts --workers=1   # frontend specs 20 to 24
npx playwright test --config=playwright.config.ts                          # admin specs
```

Run the PHP suite twice before calling it stable. Admin specs `01`, `02`, `03` to `06`, `08`, `10`, `11` and `12` assert the pre-1.0 admin and are known to fail; they are not part of the release gate. Specs prefixed with `_` are one-off debug scripts.

PHPUnit tests live in `tests/unit`. Playwright specs live in `test/e2e`; frontend specs are numbered 20 to 24, one per frontend behaviour.

## Building and releasing

```bash
cd wp-plugin && npm run build && cd ..
bash scripts/build-zip.sh                   # build/hatch-connect.zip, no source/ (default)
HATCH_ZIP_SOURCE=1 bash scripts/build-zip.sh  # same zip with source/ included
bash scripts/svn-stage.sh                   # stage a WordPress.org SVN copy in build/svn, never commits
```

Both modes write `build/hatch-connect.zip` and clear other zips in `build/`, so rename the first result before building the second. `source/` holds the git-tracked `astro-starter` (without `.env*`) and `scripts/build-frontend-bundle.sh`, so the compiled `frontend-bundle/` can be reviewed. By default the zip leaves it out and `readme.txt` points to the public repository (github.com/eticastudio/hatch) for source, which WordPress.org accepts.

`build-zip.sh` also runs the WordPress.org release gate (Plugin Check in the Docker lab). Keep `Stable tag` in `wp-plugin/readme.txt` equal to `Version` in `hatch.php`. `svn-stage.sh` puts the zip in `trunk/` and `tags/<version>/` and the store images from `.wordpress-org/` in `assets/`; the owner then runs the `svn ci` it prints.

## Deployment

**For users**, deployment is the plugin itself: Hatch deploys the frontend to Cloudflare Workers from wp-admin (see [Quick start](#quick-start-site-owners)).

**For developers** running the starter by hand:

```bash
cd astro-starter
cp .env.example .env     # fill in the WordPress values
npm run build:cf         # Cloudflare Workers build
npx wrangler deploy      # uses astro-starter/wrangler.toml (worker name hatch-frontend)
```

`npm run build:node` builds the Node target for any Node host. Set the same environment variables on the host.

## Troubleshooting

**WordPress admin or REST returns 500 after editing PHP (Docker on macOS).**
Docker Desktop can desync the bind mount so the container sees a truncated file while the host copy is fine.

```bash
wc -c wp-plugin/includes/class-security.php
docker exec hatch_wp wc -c /var/www/html/wp-content/plugins/hatch-connect/includes/class-security.php
docker exec hatch_wp php -l /var/www/html/wp-content/plugins/hatch-connect/includes/class-security.php
```

Different byte counts, or a parse error only in the container, mean desync. Fix with `docker restart hatch_wp`. Do this before trusting any failing test or toggle.

**The deploy says Cloudflare cannot reach the site.** The site is on `localhost` or a private address. Use a public https address or a tunnel, or enter a public address in step 3.

**"Application passwords are turned off."** WordPress disables them on non-https sites or when a plugin turns them off. Switch to https or re-enable them, then deploy again.

**Cloudflare did not accept the token.** Check the permissions listed under [Quick start](#quick-start-site-owners) and that the token is limited to the right account.

**An admin change does not show after a rebuild.** The browser cached the old bundle. Hard-reload.

**Frontend cannot read posts.** Plain permalinks. Set Settings, Permalinks to Post name, or tick the permalinks box during deploy.

## FAQ

**Do I need a Hatch account or pay for Hatch?** No. The plugin is free and talks to Cloudflare directly. Cloudflare sets its own limits and prices: see [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

**Can I deploy somewhere other than Cloudflare?** Not in this version. The `hatch/v1` REST API works with any frontend you build.

**What does Deploy change on my site?** After you tick the consent box it stores the frontend account you entered (password encrypted), redirects visitors of the raw WordPress address to your frontend, and (only if you tick it) sets pretty permalinks. It creates no users, no Application Passwords and no theme. Disconnect turns the redirect off. The full list is in [wp-plugin/readme.txt](wp-plugin/readme.txt).

**How do I remove it?** Hatch, Connection, Disconnect. The Worker stays in your Cloudflare account until you delete it under Workers & Pages.

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first, and run `composer qa` and `bash .claude/check.sh` before opening a pull request. Security reports go through [SECURITY.md](SECURITY.md).

Ground rule: Hatch code and design are original. Reference other projects to learn a pattern, then write it fresh. Never copy code or layouts from another repository.

## License

GPL-2.0-or-later. See [LICENSE](LICENSE). Built by [Aditya Sharma](https://adityaarsharma.com).

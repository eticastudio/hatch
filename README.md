<div align="center">

# Hatch: headless WordPress, deployed from your dashboard

**A WordPress plugin and an Astro starter. Paste one Cloudflare API token and Hatch publishes your frontend to your own Cloudflare account.**

You keep writing in the normal block editor. Hatch serves your content over REST, hardens the WordPress side, and deploys the Astro frontend without a Hatch server, a Hatch account or a third-party deploy service.

[![License: GPL v2+](https://img.shields.io/badge/License-GPL_v2%2B-b91c1c?style=flat-square)](LICENSE)
[![Astro](https://img.shields.io/badge/Astro-frontend-ff5e1f?style=flat-square)](https://astro.build)
[![WordPress 6.4+](https://img.shields.io/badge/WordPress-6.4+-21759b?style=flat-square)](https://wordpress.org)

</div>

---

## How it works

```
WordPress (editor + REST)   your team keeps the workflow it has today
     |
     |  /wp-json/hatch/v1/*   menus, SEO meta, features, forms
     |  /wp-json/wp/v2/*      posts, pages, custom post types
     v
Astro frontend on Cloudflare Workers   (deployed by the plugin, into your account)
     |
     v
Your visitors
```

1. Install and activate the plugin.
2. Open **Hatch** in wp-admin and choose **Set up Hatch**.
3. Create a Cloudflare API token with the permissions the screen lists, paste it, and press **Check token**.
4. Read the three changes Hatch will make (theme switch, permalinks, an Application Password for the frontend), then deploy.

The token is stored encrypted on your site. It goes from your browser to your site and from your site to Cloudflare. Nowhere else.

## What is in the plugin

- **Cloudflare deploy.** Uploads the Astro frontend as a Cloudflare Worker in your account. A custom domain is optional and needs the extra token permissions the setup screen lists.
- **REST bridge.** The `hatch/v1` namespace exposes what core REST does not: menus, SEO meta, features and forms. Bridges for common plugins are described in [docs/PLUGIN-BRIDGES.md](docs/PLUGIN-BRIDGES.md).
- **Security controls** (all off until you turn them on): lock the REST API for signed-out visitors, block XML-RPC, hide usernames, wp-admin access by role, login lockout, Cloudflare Turnstile on login and comments, security headers, file editor lock.
- **Performance controls.** One switch removes WordPress front-end extras the headless site does not need.
- **Design.** Pick one of three starter themes (Editorial, Terminal, Docs), then set colors, fonts and layout. Values are read by the Astro frontend. Each theme has a light and a dark mode.

Nothing phones home. The plugin does not send usage data and does not check a Hatch server for updates. The exact list of outside services it can contact is in the *External services* section of [wp-plugin/readme.txt](wp-plugin/readme.txt).

## Repository layout

| Path | What it is |
|---|---|
| `wp-plugin/` | The WordPress plugin (PHP and the React admin) |
| `astro-starter/` | The Astro frontend the plugin deploys |
| `nextjs-starter/` | An experimental Next.js frontend, not part of the plugin release |
| `scripts/` | Build scripts for the plugin zip and the frontend bundle, and a self-hosted VPS installer |
| `docs/` | Guides |
| `tests/`, `test/` | PHP unit tests and the Playwright suite |

## Local development

```bash
docker compose up -d          # WordPress on :8810, Astro on :4321, Next.js on :3000
bash .claude/check.sh         # PHP lint, wp-admin reachable, REST features endpoint returns JSON
composer qa                   # phpcs, phpstan, phpunit
```

Build the installable plugin zip with `composer build-zip`. The result is `build/hatch.zip`.

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. Security reports go through [SECURITY.md](SECURITY.md).

## License

GPL-2.0-or-later. See [LICENSE](LICENSE). Built by [Aditya Sharma](https://adityaarsharma.com).

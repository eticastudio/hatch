# Hatch — Local dev quickstart

Four-container stack:
- WordPress (with Hatch plugin) on `:8810`
- MySQL on the internal docker network
- **Astro** starter on `:4321`
- **Next.js 15** starter on `:3000`

Both frontends connect to the same WP backend so you can A/B them
side-by-side. Pick the one your team prefers — the WP plugin and the
REST contract are identical.

## Spin it up

```bash
docker compose up -d
```

First boot takes ~60–90 s — WP installs, `npm install` runs inside the Astro
container. After that it's a few seconds.

Watch both come alive:

```bash
docker compose logs -f
```

## Where to click

| What                | URL                                          |
|---------------------|----------------------------------------------|
| WP admin            | http://localhost:8810/wp-admin (admin / admin) |
| Astro frontend      | http://localhost:4321                        |
| Next.js frontend    | http://localhost:3000                        |
| Hatch admin tab     | http://localhost:8810/wp-admin/admin.php?page=hatch |
| Hatch REST          | http://localhost:8810/wp-json/hatch/v1/      |

## First-time WP setup (only once per fresh volume)

1. Open http://localhost:8810/wp-admin → standard 5-second WP install.
2. Activate the **Hatch** plugin (Plugins → installed).
3. Hatch admin → Connection → confirm the Astro URL is `http://localhost:4321`.
4. Hatch admin → Blocks → confirm the working catalog is enabled.
5. Open http://localhost:4321 — premium home should render.

## Edit-and-see-it loop

- **WP PHP / blocks**: edit anything under `wp-plugin/` on the host — changes
  are live (bind-mounted into `/var/www/html/wp-content/plugins/hatch`). For
  block JS edits, run `cd wp-plugin && npm run build` to rebuild the editor
  bundle.
- **Astro**: edit anything under `astro-starter/src/` on the host — Astro's
  HMR will hot-reload in the running container.

## Tear down

```bash
docker compose down            # stop containers, keep data
docker compose down -v         # also nuke the DB + uploads (fresh start)
```

## Common issues

- **Astro can't reach WP**: the WP container hostname inside the docker
  network is `wp`, not `localhost`. Server-side fetches use
  `http://wp/wp-json/...` (already configured in compose env); the browser
  uses `http://localhost:8810/...`.
- **Plugin doesn't activate**: tail `docker compose logs wp` — usually a
  PHP error. After fixing, `docker compose restart wp`.
- **Block bundle stale**: `cd wp-plugin && npm run build`, then refresh the
  editor in your browser.

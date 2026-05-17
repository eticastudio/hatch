# Deploy Hooks

When your WordPress content changes, your frontend needs to rebuild. Deploy hooks are how Hatch tells your hosting platform to do that.

## How it works

```
WordPress post saved/updated/deleted
            ↓
Hatch_Deploy_Hooks::on_post_status_change()
            ↓
For each configured provider →
    debounce check (30s lock per provider)
            ↓
    POST https://<your-deploy-hook-url>
            ↓
    log {status, ms, ok, ts} to ring buffer (last 50)
            ↓
    update last_fire for that provider
```

## Supported providers

### Cloudflare Pages

1. Go to your Pages project → **Settings → Builds & deployments → Deploy hooks**
2. Click **Add deploy hook** → name it `hatch` → pick the branch you deploy from (usually `main`)
3. Copy the URL — it looks like `https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/<token>`
4. In WP admin → **Hatch → Connector tab → Cloudflare Pages → Save**
5. Test with the **Fire test deploy** button — you should see a `200` in the log within seconds

[Cloudflare Pages full guide →](./hosting/cloudflare-pages.md)

### Vercel

1. Go to your Vercel project → **Settings → Git → Deploy Hooks**
2. **Create Hook** → name it `hatch` → pick the branch
3. Copy the URL — it looks like `https://api.vercel.com/v1/integrations/deploy/<token>`
4. In WP admin → **Hatch → Connector tab → Vercel → Save**
5. Test with **Fire test deploy**

[Vercel full guide →](./hosting/vercel.md)

### Generic

Any URL that returns `2xx` on `POST` works. Netlify, Render, DigitalOcean App Platform, your own CI runner — anything.

Hatch sends:
```json
POST <your-url>
Content-Type: application/json
User-Agent: Hatch/0.8.0 (+headless)

{ "source": "hatch", "reason": "post_publish_<id>" }
```

## What triggers a fire

| Event | Fires? |
|---|---|
| Post moves to `publish` | ✅ |
| Post moves from `publish` to `draft` / `pending` | ✅ |
| Published post deleted | ✅ |
| WooCommerce product created / updated / deleted | ✅ |
| Auto-save | ❌ |
| Revision | ❌ |
| Draft saved (never published) | ❌ |

The debounce window is 30 seconds **per provider** — so bulk-editing 20 posts fires once per provider, not twenty times.

## Security

- Hook URLs are encrypted at rest with **libsodium** (`sodium_crypto_secretbox`).
- The per-site encryption key lives in `wp_options.hatch_deploy_key` and never leaves your install.
- Admin UI never displays the full URL — only `https://api.cloudflare.com/clien…••••`.
- All management endpoints require `manage_options` capability.

## Why paste-the-URL instead of OAuth?

Full OAuth requires holding the app secret somewhere — and Cloudflare + Vercel both forbid distributing app secrets in plugin code. The paste-token model is what Faust.js, next-wp, and every headless tutorial in 2026 use — honest, no central server to leak, works offline.

**A first-party OAuth proxy lands in v0.9.0** — a Cloudflare Worker at `hatch.deploy` that holds Hatch's app secrets, performs the OAuth dance, and returns a paste-ready deploy-hook URL. The plugin itself stays exactly as it is today.

## Status reporting

The Connector tab and the Health Widget both pull from `Hatch_Deploy_Hooks::status_report()`. State semantics:

| State | Meaning |
|---|---|
| `connected` | Last fire OK, within the last 24 hours |
| `stale` | Last fire OK, but >24 hours ago |
| `failed` | Last fire returned non-2xx |
| `never_fired` | Hook configured but never invoked |

**There is no `connected` state without a real `2xx` in the last 24 hours.** This is the no-vibe-coding guardrail.

## Programmatic use

```php
// Fire a specific provider manually (respects debounce):
$hooks  = Hatch_Deploy_Hooks::instance();
$result = $hooks->fire( 'cloudflare', 'manual_resync' );
// $result === [ 'ok' => bool, 'status' => int, 'ms' => int, 'provider' => 'cloudflare', ... ]
```

## REST reference

| Method | Path | Cap | Purpose |
|---|---|---|---|
| `GET` | `/hatch/v1/deploy/hooks` | `manage_options` | List providers (URLs masked) |
| `POST` | `/hatch/v1/deploy/hooks` | `manage_options` | Save `{provider, url}` |
| `DELETE` | `/hatch/v1/deploy/hooks` | `manage_options` | Remove `{provider}` |
| `POST` | `/hatch/v1/deploy/fire` | `manage_options` | Manual test fire |
| `GET` | `/hatch/v1/deploy/status` | `manage_options` | Full status report |

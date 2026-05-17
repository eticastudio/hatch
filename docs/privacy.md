# Privacy Policy

_Last updated: May 14, 2026 · Version 1.0_

> **Plain English:** Hatch is open-source software you install on your own WordPress. It doesn't phone home. The only piece we run is `hatch.adityaarsharma.com` — a stateless OAuth broker. We never see your content, never store your tokens longer than 5 minutes, never track you.

---

## Who runs Hatch

**Aditya Sharma** (sole maintainer)
Contact: `seo@posimyth.com`
Open source: https://github.com/adityaarsharma/hatch (MIT license)

---

## What Hatch is, technically

Two pieces:

1. **WordPress plugin** — runs entirely on your own WordPress server. Does not call any Aditya-hosted service.
2. **`hatch.adityaarsharma.com`** — a small Node.js application running on Aditya's RunCloud server. Its only job is to broker OAuth between your browser and your Vercel / Cloudflare account when you click "1-click deploy."

The source code for both is public at the GitHub repo above. There is no closed-source backend.

---

## What data Hatch processes

### Data we NEVER touch
- Your WordPress posts, pages, media, users, or any other content
- Your hosting account passwords
- Your domain registrar credentials
- Any analytics about how you use your site

### Data that briefly touches `hatch.adityaarsharma.com` (the OAuth broker)

When you click "Deploy to Vercel" or paste a Cloudflare API token in the WP plugin's Connector tab, the following happens **for less than 60 seconds**:

| Data | Why it's needed | Retention |
|---|---|---|
| OAuth state nonce (random UUID) | CSRF protection for the OAuth callback | 5 minutes max, in-memory only |
| Your hosting platform access token (Vercel) / API token (Cloudflare) | To create the deployment project, set environment variables, and create the deploy hook on your behalf | Used once, never written to disk, garbage-collected when the OAuth dance completes (typically <30 seconds) |
| The deploy hook URL the platform returns | Sent back to your WP plugin so it can fire rebuilds when you publish content | Returned immediately, then dropped from broker memory |
| Your WordPress site URL | To know which install to send the deploy hook URL back to | Held only during the OAuth callback, dropped after redirect |

**The broker has no database.** State lives in Cloudflare KV with a 5-minute TTL, then expires automatically. There is no logging of token contents, post content, or user behavior.

### Server logs

`hatch.adityaarsharma.com` runs nginx + PM2 on RunCloud. Standard server access logs are written by nginx (request path, response code, IP, user-agent, timestamp) and retained for **30 days** for security/debugging. These logs do **not** contain:
- Request bodies
- Tokens
- Cookies
- Authorization headers

---

## What we don't do

- ❌ No telemetry from the WordPress plugin
- ❌ No "phone home" calls to check for updates (you check GitHub Releases yourself)
- ❌ No third-party analytics on `hatch.adityaarsharma.com`
- ❌ No cookies set by the broker (it's an OAuth relay, not a webapp with sessions)
- ❌ No email list, no marketing, no retargeting

---

## Third parties

When you use the 1-click deploy flow, your data flows through these parties **at your explicit request**:

| Party | Why involved | Privacy policy |
|---|---|---|
| **Vercel** (vercel.com) | Hosts your frontend if you pick the Vercel path | https://vercel.com/legal/privacy-policy |
| **Cloudflare** (cloudflare.com) | Hosts your frontend OR your DNS, depending on your choices | https://www.cloudflare.com/privacypolicy/ |
| **GitHub** (github.com) | Hosts the open-source repo your forked Hatch lives in | https://docs.github.com/site-policy/privacy-policies |

Hatch passes data **through** these services on your behalf — we don't add anything, we don't store anything. Each service's own privacy policy governs what they do with the data once it reaches them.

---

## Your rights

- **See your data**: there is no Hatch-side database to query. Whatever is in your WP install + your Vercel/Cloudflare account is in your control.
- **Delete your data**: uninstall the WordPress plugin. Revoke any API tokens you generated. Delete the Pages/Vercel project you created. Hatch holds nothing else.
- **Stop using the broker**: the WordPress plugin works fine without `hatch.adityaarsharma.com` — manual deploy paths via platform dashboards are documented in `docs/hosting/`.

---

## Changes

If this policy materially changes, the version at the top is bumped and the change is logged in `CHANGELOG.md` in the Hatch repo. Watch the repo on GitHub to be notified.

---

## Questions

Open an issue at https://github.com/adityaarsharma/hatch/issues or email `seo@posimyth.com`.

# Cloudflare API Token — where to get it, what scopes

**Read this if you're a Hatch USER setting up Cloudflare Pages.** Aditya doesn't need to do anything for the CF flow — there's no integration to register because Cloudflare doesn't offer OAuth like Vercel does.

The model: **you generate a scoped API token in your own Cloudflare dashboard, paste it into Hatch once, Hatch uses it to create your Pages project automatically, then discards it.**

---

## What this token can do — and what it can't

✅ **Can do** (you authorize):
- Create / read / edit your Cloudflare Pages projects
- Set environment variables on those projects
- Create deploy hooks
- Read your account ID (so it can target the right account)

🚫 **Can't do** (limited scope):
- DNS changes
- Workers / KV / R2 / D1
- Account billing or members
- Read your zones / domains (except Pages-specific subdomains)
- Anything in other accounts you're a member of

You can revoke it any time from your CF dashboard.

---

## Get the token (2 min)

### 1. Open the API Tokens page
https://dash.cloudflare.com/profile/api-tokens

### 2. Use the right template
Click **"Create Token"**.

Look for the template named **"Edit Cloudflare Pages"**. Click **"Use template"**.

*(If you don't see that exact template, scroll down to "Create Custom Token" and follow Step 3 below to set scopes manually.)*

### 3. Token settings

| Field | Value |
|---|---|
| **Token name** | `Hatch — Pages deploy` |
| **Permissions** | Account → Cloudflare Pages → **Edit** ✓ |
| **Account Resources** | Include → **your specific account** (don't pick "All accounts") |
| **Zone Resources** | Leave default (not needed) |
| **Client IP Address Filtering** | Leave blank (Hatch's server IP rotates) |
| **TTL** | Set an end date if you want (recommend 1 year, then rotate) |

### 4. Custom Token alternative (if no "Edit Cloudflare Pages" template)
If you went with **Create Custom Token**, set these exact scopes:

| Scope | Access |
|---|---|
| Account → Cloudflare Pages | Edit |
| Account → Account Settings | Read *(needed to fetch your account ID)* |

That's it. Don't add anything else — minimum surface, minimum risk.

### 5. Create + copy
- Click **"Continue to summary"** → review → **"Create Token"**
- Cloudflare shows your token ONCE — copy it now
- Paste it into Hatch where it asks (Setup wizard or Connector tab → "Cloudflare Pages → Paste API token")

---

## What happens after you paste

1. Hatch sends the token to `hatch.adityaarsharma.com/deploy/cloudflare` over HTTPS
2. That server uses the token to:
   - Fetch your account ID
   - Create a Pages project pointed at `github.com/adityaarsharma/hatch` (or your fork)
   - Set the 4 env vars (`WP_API_URL`, `WP_API_USER`, `WP_API_PASS`, `HATCH_WEBHOOK_SECRET`) from your WP install
   - Create a deploy hook URL
3. Server returns ONLY the deploy hook URL back to your WP plugin
4. **The token is wiped from server memory immediately.** Never stored.
5. Your WP plugin stores the deploy hook URL encrypted via libsodium

The token never persists on any external server. The single API call sequence takes ~4 seconds, then it's gone.

---

## Verify the audit trail

Cloudflare logs every API call this token makes:
- CF dashboard → **Manage Account** → **Audit Log**
- Filter by **"API Token Auth"**
- You'll see exactly: project create, env vars set, deploy hook create

If you ever see anything you didn't expect, revoke the token immediately at https://dash.cloudflare.com/profile/api-tokens.

---

## Why we don't ask for OAuth (like we do with Vercel)

Cloudflare doesn't offer a public OAuth program for Pages. Vercel does, Cloudflare doesn't. This isn't a Hatch limitation — it's the platform.

The paste-token flow is the cleanest alternative:
- Same end result (project + env vars + deploy hook automatically created)
- Token scope is narrower than Vercel OAuth (Pages only, single account)
- 30 seconds longer for the user (generating + pasting vs clicking "Authorize")

---

## Revoking later

When you no longer want Hatch to be able to touch your Pages projects:
1. CF dashboard → **My Profile** → **API Tokens**
2. Find "Hatch — Pages deploy" → click **Roll** or **Delete**
3. Done. Hatch can't do anything anymore.

The deploy hook URL Hatch already stored keeps working (deploy hooks are not bound to your token) — only NEW project creation breaks. So this won't accidentally take down your live site.

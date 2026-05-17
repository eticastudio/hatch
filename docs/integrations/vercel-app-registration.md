# Register a Vercel Integration (one-time, by Aditya)

This is what unlocks **real 1-click Deploy to Vercel** for every Hatch user. Without this, Vercel only offers their pre-filled deploy URL (good but not 1-click).

**You do this once.** The credentials live on `hatch.adityaarsharma.com` (your RunCloud server). Hatch users never see them.

---

## What you'll end up with

- `CLIENT_ID`
- `CLIENT_SECRET`
- A "Hatch" listing visible in your Vercel Integrations console

You'll send the two secrets to me (or paste them as env vars on your RunCloud webapp).

---

## Steps (10 min)

### 1. Open the Integrations console
- Visit https://vercel.com/integrations/console
- Sign in with the Vercel account that should own the integration
- Click **"Create Integration"**

### 2. Basic info
| Field | Value |
|---|---|
| Name | `Hatch` |
| Slug | `hatch` |
| Category | **Pick "CMS"** (closest fit — headless WordPress engine) |
| Short description | `Headless WordPress engine — connect WordPress, deploy frontend, auto-rebuild on content change.` |
| Logo | Upload the 🐣 chick logo from `github.com/adityaarsharma/hatch/blob/main/docs/assets/logo.png` (if it exists) or skip — can add later |

### 3. Redirect URLs
You'll see a field labeled **"Redirect URL"**. Add:
```
https://hatch.adityaarsharma.com/deploy/vercel/callback
```

This is where Vercel sends the user back after they authorize.

### 4. Permissions / scopes
Select these scopes — and **only these** (don't over-ask):

| Scope | Why |
|---|---|
| `read` on **User** | To name the project meaningfully |
| `read+write` on **Projects** | To create the project pointed at the user's fork |
| `read+write` on **Deployments** | To create the deploy hook URL we hand back |
| `read+write` on **Environment Variables** | To write the WP_API_* values into the project |
| `read+write` on **Domains** | (Optional — only if you want to also wire custom domain later) |

**Don't** select: Team management, Member access, Billing. Hatch never touches those.

### 5. URL fields
| Field | Value |
|---|---|
| Website | `https://github.com/adityaarsharma/hatch` |
| Documentation | `https://github.com/adityaarsharma/hatch/blob/main/docs/hosting/vercel.md` |
| Support email | `seo@posimyth.com` (or whatever you prefer) |
| Privacy policy URL | `https://github.com/adityaarsharma/hatch/blob/main/docs/privacy.md` (will create — see below) |
| Terms of service URL | Same — link to a markdown doc in repo |

The privacy/ToS URLs just need to resolve — they can be simple markdown pages.

### 6. Save → get credentials
After saving, Vercel shows you:
- `CLIENT_ID` (looks like `oac_xxxxxxxxxxxxxxxx`)
- `CLIENT_SECRET` (looks like `vc_secret_xxxxxxxxxxxxx`)

**Copy both immediately. The secret is shown ONCE.**

### 7. Hand them to the Worker
On your RunCloud server, set them as env vars on the `hatch-deploy` webapp:
```
VERCEL_CLIENT_ID=oac_xxxxxxxxxxxxxxxx
VERCEL_CLIENT_SECRET=vc_secret_xxxxxxxxxxxxx
HATCH_DEPLOY_BASE=https://hatch.adityaarsharma.com
```

RunCloud panel → your webapp → **Environment Variables** → Add the three lines.

---

## What happens after you do this

Once `hatch.adityaarsharma.com/deploy/vercel` is wired with these creds, the WP plugin's "Deploy to Vercel" button changes from "open Vercel's deploy URL with pre-fill" to **real OAuth 1-click**:

1. User clicks button in WP admin
2. Browser opens `hatch.adityaarsharma.com/deploy/vercel` with their WP info
3. Redirects them to Vercel OAuth consent
4. User clicks "Authorize Hatch"
5. Vercel sends code → our Worker → creates project + env vars + deploy hook
6. User redirected back to WP admin with deploy hook URL auto-filled
7. WP plugin encrypts + stores deploy hook URL
8. Done. **One click from user perspective.**

---

## Testing checklist

After you've registered + deployed the Worker:

- [ ] Visit `hatch.adityaarsharma.com/deploy/vercel` — should redirect to Vercel OAuth screen
- [ ] Authorize with a throwaway Vercel account
- [ ] Confirm project gets created in that account at `vercel.com/<account>/hatch-frontend`
- [ ] Confirm 4 env vars are set (`WP_API_URL`, `WP_API_USER`, `WP_API_PASS`, `HATCH_WEBHOOK_SECRET`)
- [ ] Confirm deploy hook URL comes back to WP admin
- [ ] Revoke the test integration in Vercel after testing

---

## If anything breaks

Vercel Integrations dashboard → your integration → **Logs** tab shows every OAuth attempt with error details. Common failures:

| Error | Fix |
|---|---|
| `redirect_uri_mismatch` | Add the exact URL to Redirect URLs in integration settings |
| `invalid_scope` | Scope name typo in our Worker code — let me know |
| `unauthorized_client` | Re-check `CLIENT_ID` env var on Worker matches integration |

Send me the error from the Vercel logs panel and I'll fix the Worker code.

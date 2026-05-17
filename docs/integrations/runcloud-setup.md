# RunCloud setup for `hatch.adityaarsharma.com`

Step-by-step to deploy the `hatch-deploy/` Node app onto your existing RunCloud server at `95.216.156.89` so it serves `hatch.adityaarsharma.com`.

**Time: ~15 minutes if RunCloud webapp + domain already exist.**

---

## What we're deploying

The minimal Node/Express app at `hatch-deploy/server.js` in this repo. It serves:

- `/` — landing page (host picker)
- `/deploy/vercel` — redirects to Vercel's pre-filled deploy URL (later: real OAuth)
- `/deploy/cloudflare` — instructions page (Cloudflare has no OAuth)
- `/deploy/vps` — bash one-liner instructions
- `/install.sh` — serves `scripts/install-vps.sh` raw
- `/health` — returns `200 ok` for RunCloud monitoring

Stack: Node 20+, Express 5, zero database, zero state. Memory footprint: ~50 MB.

---

## Prerequisites (you already have these)

- ✅ RunCloud server at `95.216.156.89`
- ✅ User `hatchuser`
- ✅ Webapp at `/home/hatchuser/webapps/Hatch-Headless`
- ✅ Domain `hatch.adityaarsharma.com` pointing at the webapp

If any of those don't exist yet, set them up in the RunCloud panel first (Servers → your server → Web Apps → Create).

---

## 1. Tell RunCloud the webapp is a Node app

By default RunCloud webapps run nginx + PHP-FPM. We need Node.

1. RunCloud panel → **Web Apps** → click `Hatch-Headless`
2. **Settings → General** → confirm:
   - Public Path: `/home/hatchuser/webapps/Hatch-Headless/current` (RunCloud's default for Git deploys)
   - PHP Version: `Custom Web App (Node.js)` if available, otherwise we'll proxy nginx → Node manually below
3. **Settings → Application Stack** → choose **Node.js** if RunCloud offers it
   - Set Node version: `20` or `22`

If your RunCloud version doesn't have a Node app type, skip to **Section 5 (nginx-proxy fallback)** below.

---

## 2. Git deployment

1. **Web App → Git** tab
2. Provider: **GitHub** (authorize if first time)
3. Repository: `adityaarsharma/hatch`
4. Branch: `main`
5. **Deploy Path on Server**: `/home/hatchuser/webapps/Hatch-Headless/hatch-deploy` *(important — we want only the subdirectory)*

If RunCloud doesn't support subdirectory deploys, clone the whole repo and we'll point Node at the subdir later. See **Section 6**.

6. **Auto-deploy script** (paste this):
   ```bash
   cd /home/hatchuser/webapps/Hatch-Headless/hatch-deploy
   npm ci --omit=dev --no-audit --no-fund
   pm2 reload hatch-deploy || pm2 start server.js --name hatch-deploy --time
   pm2 save
   ```

7. Click **Deploy Now**

---

## 3. Process manager (PM2)

RunCloud uses PM2 natively for Node apps. After first deploy:

```bash
# SSH in once to seed PM2 startup
pm2 startup
# Follow the printed instructions (usually a sudo command to paste)
pm2 save
```

Then PM2 will auto-restart your app on server reboot.

Verify:
```bash
pm2 list                    # should show hatch-deploy: online
pm2 logs hatch-deploy       # tail logs
```

---

## 4. Environment variables

In RunCloud panel → Web Apps → `Hatch-Headless` → **Environment Variables** tab.

For now (v0.9.1 — guided redirects only):
```
PORT=3000
HATCH_REPO=https://github.com/adityaarsharma/hatch
HATCH_ROOT_DIR=astro-starter
```

Later (when Vercel Integration is registered — see [vercel-app-registration.md](./vercel-app-registration.md)):
```
VERCEL_CLIENT_ID=oac_xxxxxxxxxxxxxxxx
VERCEL_CLIENT_SECRET=vc_secret_xxxxxxxxxxxxx
HATCH_DEPLOY_BASE=https://hatch.adityaarsharma.com
```

RunCloud reads these and exposes them to the Node process. The server reads them via `process.env.*`.

---

## 5. nginx → Node proxy (fallback if RunCloud's Node app type isn't available)

If you had to keep the webapp as "Static HTML" or "PHP", add this nginx config snippet:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

RunCloud panel → Web Apps → your webapp → **Nginx Config** → paste under "Location" section → Save → Restart nginx.

---

## 6. Subdirectory deploy (fallback if RunCloud only deploys repo root)

If the Git tab only clones the full repo:

1. Set Deploy Path to: `/home/hatchuser/webapps/Hatch-Headless/repo`
2. Change auto-deploy script to:
   ```bash
   cd /home/hatchuser/webapps/Hatch-Headless/repo/hatch-deploy
   npm ci --omit=dev --no-audit --no-fund
   pm2 reload hatch-deploy || pm2 start server.js --name hatch-deploy --time --cwd /home/hatchuser/webapps/Hatch-Headless/repo/hatch-deploy
   pm2 save
   ```

---

## 7. Verify everything

After deploy completes:

```bash
# From your laptop:
curl -i https://hatch.adityaarsharma.com/health
# Expect: HTTP/1.1 200 OK, body "ok"

curl -i https://hatch.adityaarsharma.com/
# Expect: HTML page with "Hatch — deploy your frontend"

curl -fsSL https://hatch.adityaarsharma.com/install.sh | head -5
# Expect: bash script starting with #!/usr/bin/env bash
```

If all three return 200, you're live.

---

## 8. Update the WP plugin to use the new domain

Once `hatch.adityaarsharma.com` is up, the WP plugin's wizard Step 4 + Connector tab should redirect users to it instead of opening the platform deploy URLs directly. That's a plugin-side change for v0.9.2 — I'll ship it once you confirm hatch-deploy is live.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `502 Bad Gateway` | Node process not running | `pm2 list` to check, `pm2 restart hatch-deploy` |
| `Cannot GET /` | Server crashed or wrong CWD | `pm2 logs hatch-deploy --lines 50` |
| `Module not found: 'express'` | `npm install` didn't run | Re-run the auto-deploy script manually |
| Domain shows nginx default page | DNS or proxy config issue | Section 5 above |
| OAuth flow fails when wired later | Wrong redirect URL in Vercel Integration | Must match exactly `/deploy/vercel/callback` |

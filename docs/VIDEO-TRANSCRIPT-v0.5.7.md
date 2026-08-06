# Hatch v0.5.7 — Launch Video Shooting Transcript

**State right now (verified live):**
- WordPress at `http://localhost:8810` — admin: `admin` / `hatchadmin`
- Only `hatch` plugin active. Bridge tab reads **0 of 29 active**.
- All wizard state cleared. Opening admin routes to first-run wizard.
- FluentSMTP + WooCommerce + ACF + WPForms + Fluent Forms + CF7 + RankMath + Yoast + Redirection are **installed but deactivated** — you activate them live on camera.
- Astro dev server on `http://localhost:4321`.
- Cloudflare deploy broker live on `hatch.adityaarsharma.com` (SSH-verified).

**About "localhost" in the wizard copy:**  Local Docker's host header IS `localhost:8810` — that's what appears in the wizard's "Path on localhost" label and "your web server proxies" blurb. Two clean options:
1. **Record against a real domain** — spin up a Hetzner box or use `hatch.adityaarsharma.com` fresh WP install; the wizard will say your real domain everywhere. This is the honest VPS demo.
2. **Local demo with `/etc/hosts`** — add `127.0.0.1  hatch.local` then use port-forwarding so the site loads at `hatch.local`. Copy strings look clean without changing code.

Do NOT try to fake the string in the code — it'll break the deploy broker's callback URL flow.

---

## Chapter 1 — The Problem (30s)

**Script:**
> "WordPress is unmatched for authoring. But every plugin ships its own CSS and JavaScript to the frontend. Ten plugins, ten stylesheets, ten scripts — your site is slow, hackable, and the plugins don't play well together on modern hosts.
>
> Headless WordPress fixes it, but building the frontend is a project of its own. Nobody wants to maintain a Next.js app on top of their blog.
>
> Hatch is the shortest path from "WordPress site" to "Astro frontend live" — pick a theme, pick a host, click Deploy. Every plugin you already use keeps working. Zero framework code."

**Show:** typical bloated WP site (or a Lighthouse report showing 40 network requests).

---

## Chapter 2 — Install Hatch (45s)

**Actions on camera:**
1. Fresh WP admin → **Plugins → Add New**
2. Type "Hatch" in search
3. Click **Install** on the Hatch card
4. Click **Activate**
5. WP redirects you to `admin.php?page=hatch-setup` — the wizard

**Script (voiceover):**
> "One plugin. No dependencies. No settings screen to configure — activation drops you straight into the wizard."

---

## Chapter 3 — The Wizard: Step 1 Welcome (30s)

**Show:** the pre-flight checks card, 10 of 11 passing.

**Script:**
> "Hatch runs 11 checks up front — HTTPS, permalinks, REST reachable, App Passwords enabled. This is the stuff that silently breaks headless later; catching it now saves hours of debugging.
>
> The one warning is a hint, not a blocker. Click Continue."

**Action:** click **Continue** → Step 2.

---

## Chapter 4 — Step 2 Theme (30s)

**Show:** three theme cards — Blog, Tech, Docs.

**Script:**
> "Hatch ships three themes and every core Gutenberg block is styled for all three. Pick Blog — that's the editorial layout most sites want. You can switch any time from the Design tab."

**Action:** click **Blog** → **Continue** → Step 3.

---

## Chapter 5 — Step 3A Deploy Location (30s)

**Show:** Subfolder vs Root domain cards. A/B/C strip centered above.

**Script:**
> "Two choices. Subfolder — `/blog` gets served by Astro, WordPress keeps the rest of the domain. This is the safe pick — works on any host, no DNS change. Root domain — the whole domain is Astro, WordPress admin moves to a private URL. Fastest, but you're changing DNS.
>
> Most sites want Subfolder. Keep the default `/blog` path."

**Action:** stays on Subfolder → click **Next: pick where Astro runs**.

---

## Chapter 6 — Step 3B Astro Host: Cloudflare One-Click (90s — the money shot)

**Show:** four provider tiles — Cloudflare (Recommended), Vercel, Self-hosted, Netlify (Coming soon).

**Script:**
> "Cloudflare is recommended because Hatch fully automates it — DNS, Worker, route, all one click. Vercel and Self-hosted work too, they just need a step you do manually. Netlify is coming soon.
>
> Pick Cloudflare."

**Action:** click **Choose** on Cloudflare → card expands with domain + token input.

**Script continues:**
> "Two fields. Your domain — this must already be in your Cloudflare account. And an API token — click Get Cloudflare API token, Cloudflare pre-fills the exact permissions needed, click Create Token, copy the value, paste it here."

**Action:**
1. Click **Get Cloudflare API token** — Cloudflare tab opens with pre-filled template.
2. Create token, copy.
3. Paste into API token field.
4. Type your real domain (e.g. `demo.adityaarsharma.com`) into the Domain field.

**Show the info banner** that reads:
> On Deploy: Hatch uploads the Worker, adds a proxied DNS record for `demo.adityaarsharma.com`, and routes `demo.adityaarsharma.com/blog/*` to it. WordPress keeps everything except `/blog`.

**Action:** click **Build and deploy to Cloudflare**.

**What you'll see:** live build-log page opens — terminal-style output streams for 60-90 seconds:
- Verifying Cloudflare token…
- Cloning repo…
- npm install…
- Building Astro…
- wrangler deploy…
- Looking up Cloudflare zone for `adityaarsharma.com`…
- Ensuring proxied DNS record for `demo.adityaarsharma.com`…
- Ensuring Worker route `demo.adityaarsharma.com/blog/*`…
- Live at `https://demo.adityaarsharma.com/blog`

**Script:**
> "That's it. Hatch built the Astro frontend, uploaded it as a Cloudflare Worker, added the DNS record, and pointed `demo.adityaarsharma.com/blog/*` at the Worker. Your site is live."

**Action:** click **Return to WordPress** → wizard Sub-step C.

---

## Chapter 7 — Step 3C Connect (auto-skip for CF) (10s)

**Show:** the green "Nothing to configure — Cloudflare handles it" card.

**Script:**
> "Because you picked Cloudflare, there's nothing to paste, no config to reload. Click Launch site."

**Action:** click **Launch site** → wizard closes, redirect to Hatch main dashboard.

---

## Chapter 8 — Bridge Tab: Install Plugins Live (2 min — the trust builder)

**Action:** click **Bridge** tab. Show `0 of 29 active`.

**Script:**
> "This is Hatch's plugin bridge. Twenty-nine popular WordPress plugins that Hatch already knows how to route to Astro. Right now nothing is installed. Watch."

**For each plugin, activate one live on camera:**

### 8.1 RankMath (SEO)
- Plugins → Add New → search RankMath → Install + Activate
- Back to Hatch → Bridge → **SEO card now green: 1 of 29**
- Voice: "SEO metadata, schema, sitemap — automatically served on your Astro pages via `/wp-json/hatch/v1/seo-head`."

### 8.2 WPForms (Forms)
- Install + Activate WPForms Lite
- Bridge → **Forms card green: 2 of 29**
- Voice: "Forms render natively on Astro, submit back to WordPress. Every entry lives in WP admin."

### 8.3 WooCommerce (E-commerce)
- Install + Activate WooCommerce (skip setup wizard)
- Bridge → **E-commerce card green: 3 of 29**
- Voice: "Products, orders, customers — accessible from Astro via `/wc/v3/`."

### 8.4 ACF (Custom Fields)
- Install + Activate Advanced Custom Fields
- Bridge → **Custom Fields card green: 4 of 29**
- Voice: "ACF field groups exposed in REST so your Astro templates can render custom content."

### 8.5 Redirection
- Install + Activate Redirection
- Bridge → **Redirects card green: 5 of 29**
- Voice: "301/302 rules travel with your content — Astro respects them at the edge."

### 8.6 FluentSMTP (email delivery)
- Install + Activate FluentSMTP
- Configure with any SMTP (Gmail app password / Amazon SES / Postmark)
- Send test email → confirm it lands
- Bridge → **Email delivery card green: 6 of 29**
- Voice: "Every email your Astro frontend triggers — form receipts, comments, Woo orders, password resets — routes through WordPress and gets delivered via real SMTP. One activation, whole pipeline done."

**Script wrap:**
> "Zero config on Hatch's side. Every one of these just works because they all speak REST — Hatch reads their endpoints, Astro consumes them. Six of twenty-nine done, and each one takes ten seconds."

---

## Chapter 9 — Content Roundtrip: WordPress → Astro (60s)

**Action:**
1. Posts → Add New
2. Title: "Hello from headless WordPress"
3. Body: paste 3 paragraphs, add a heading block, add a quote block, add an image
4. Set featured image (upload one)
5. Publish

**Voice:**
> "Write in Gutenberg — that's the whole point. Every core block is already styled for the theme you picked."

**Action:** switch browser to `demo.adityaarsharma.com/blog/hello-from-headless-wordpress/` (or `localhost:4321/blog/hello-from-headless-wordpress/`)

**Show:** the post rendered natively on Astro — hero image, prose, breadcrumbs, share buttons, comments form, related posts.

**Voice:**
> "Published in WordPress, live on Astro in under a second. Nothing was pushed, no rebuild triggered — the Astro frontend reads from WordPress REST and edge-caches for 60 seconds."

---

## Chapter 10 — Custom Fields via ACF (60s)

**Action:**
1. WP admin → Custom Fields → Add New
2. Field group: "Author bio extras"
3. Fields: `linkedin_url` (URL), `twitter_handle` (Text)
4. Location rule: "Post type is equal to Post"
5. Publish

**Voice:**
> "ACF field group added. Now every post has these two fields available in the editor."

**Action:**
- Edit an existing post → scroll down → fill both ACF fields → Update
- Curl `http://localhost:8810/wp-json/wp/v2/posts/{id}` and show the `.acf` object with `linkedin_url` + `twitter_handle`

**Voice:**
> "The field values are in the REST response — Astro can now render an author bio card with these links. Zero custom code in the plugin — this is ACF's own REST integration; Hatch just makes sure it's exposed."

---

## Chapter 11 — Forms End-to-End (90s)

**Action:**
1. WPForms → Add New → pick "Simple Contact Form" template → save
2. Copy the shortcode: `[wpforms id=X]`
3. Pages → Contact (or create one) → paste shortcode → Publish
4. Open `demo.adityaarsharma.com/contact/` on Astro
5. Fill and submit the form live

**Voice:**
> "This is the moment most headless setups break. Watch — I fill the form, click Send. Astro POSTs to `/wp-json/hatch/v1/forms/wpforms/{id}/submit`. WordPress runs WPForms' native handler — validation, spam check, notification email. All of it."

**Action:**
- WP admin → WPForms → Entries → show the new submission
- FluentSMTP → Email Log → show the notification email fired

**Voice:**
> "Entry in WP admin. FluentSMTP log shows the email went out. This is the whole headless-form problem solved without a single line of Astro code."

---

## Chapter 12 — Comments Bridge (60s)

**Action:**
1. On Astro post detail — scroll to the comment form
2. Fill name / email / comment → Post
3. Astro shows "Thanks — your comment is awaiting moderation"
4. WP admin → Comments → new pending comment there
5. FluentSMTP log → moderator notification email fired

**Voice:**
> "Comments posted from Astro land in WordPress's native comment queue. Moderation works, notification emails fire — same as if the visitor commented on WordPress itself. Nothing Hatch-specific to learn."

**Action:** approve the comment → refresh Astro → comment appears.

---

## Chapter 13 — WooCommerce (90s)

**Action:**
1. Products → Add New → "Demo Product" → $19 price → Publish
2. Open Astro `/products` or the product detail page
3. Add to cart → checkout (this happens on WP side, but purchase confirmation is via email)

**Voice:**
> "Products sync automatically. Astro reads from `/wc/v3/products` — no config. For checkout, the safest path is to keep it on the WordPress subdomain — Stripe integrations, tax logic, and shipping calc all keep working because they never left WordPress."

---

## Chapter 14 — Security Fortress Mode (60s)

**Action:** Hatch → **Security tab** — flip each toggle:
- Block REST for anonymous users
- Disable XML-RPC
- Block user enumeration
- Force noindex on `wp-admin`
- Enforce 2FA for admins
- Disable file edit
- Send security headers

**Voice:**
> "Hatch inherits WordPress's biggest attack surface — REST, XML-RPC, user enumeration. Fortress mode locks them down in one click. Your Astro frontend keeps working because it authenticates with an App Password; anonymous requests hit a wall."

**Action:** curl `/wp-json/wp/v2/users` from anonymous → 401. From authenticated → 200. Show both.

---

## Chapter 15 — Design Tab: Live Preview (60s)

**Action:** Hatch → **Design tab**:
- Change brand primary color from orange to teal
- Change density from "comfortable" to "compact"
- Change corner radius from "sharp" to "rounded"
- Save

**Action:** hard-refresh Astro frontend → colors and density updated.

**Voice:**
> "Design tokens live in WordPress. Change them here, they propagate to Astro on the next request — no rebuild, no redeploy."

---

## Chapter 16 — CF Turnstile Captcha (45s)

**Action:** Hatch → Content tab → Turnstile section
- Paste your Cloudflare Turnstile site key
- Paste secret key
- Toggle "Enable on comments" + "Enable on login"

**Action:** open a comment form on Astro → show the Turnstile widget renders → submit through it.

**Voice:**
> "Anti-spam via Cloudflare Turnstile — free, no reCAPTCHA privacy problems. Same site key and secret key across the whole install."

---

## Chapter 17 — Redeploy After Content Change (30s)

**Action:**
- Publish another post
- Go to Hatch → Connection tab → click **Refresh cache**
- Voice-over: "Or wait 60 seconds and the edge cache expires automatically."

---

## Chapter 18 — Recap + CTA (30s)

**Script:**
> "In under twelve minutes you saw: fresh install → Cloudflare deploy → six plugin bridges → content → custom fields → forms → comments → WooCommerce → security → design tokens. Every one of these is a battle-tested WordPress plugin, running unchanged. Your Astro frontend never had to know about any of them.
>
> Hatch is free, MIT-licensed, on WordPress.org and GitHub. Install it on a staging site today."

**End card:** Hatch logo · `github.com/adityaarsharma/hatch` · `hatch.adityaarsharma.com`

---

## Total runtime estimate: 13–16 minutes

## Pre-recording checklist

- [ ] Fresh WP install (current Docker is fresh: 0/29 bridges active, wizard state cleared)
- [ ] Screen resolution: **1440×900** (matches Playwright + real desktop viewport)
- [ ] Zoom: 100% for admin, 100% for frontend, DPR 2×
- [ ] Font size: WP admin default
- [ ] Close all other browser tabs
- [ ] `admin` / `hatchadmin` password (don't say it out loud on video)
- [ ] Cloudflare API token pre-created in a text file for quick paste (don't type it on-camera)
- [ ] Real domain to demo with — either `demo.adityaarsharma.com` on your CF account or a spare from Namecheap
- [ ] SMTP creds ready (Gmail app password / Postmark test key)
- [ ] Sample content ready to paste (3 post drafts, 1 page, 1 product)

## Reset commands (run before each take)

```bash
cd "/Users/adityasharma/Claude Projects/Hatch"

# Deactivate everything except Hatch
docker exec hatch_wp wp plugin deactivate --all --allow-root --exclude=hatch

# Clear wizard state
docker exec hatch_wp bash -c 'for opt in hatch_frontend_url hatch_astro_origin hatch_deploy_provider hatch_deploy_domain hatch_setup_complete hatch_setup_step hatch_mount_mode hatch_subfolder_path hatch_first_run_done ; do wp option delete $opt --allow-root 2>&1 | tail -1 ; done'

# Restart to be safe
docker compose restart wp astro
```

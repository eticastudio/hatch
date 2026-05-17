# Hatch — Extended FAQ

The honest answers to every question people ask about going headless on WordPress.

If yours isn't here, [open a Discussion](https://github.com/adityaarsharma/hatch/discussions).

---

## 🧠 Understanding Hatch

### What is Hatch — in one sentence?

The headless engine for WordPress. A free open-source toolkit (WordPress plugin + Astro starter + setup wizard) that makes WordPress fast, secure, and modern without changing how editors work.

### Is Hatch a WordPress plugin?

Partly. Hatch has **three pieces**:
1. A WordPress plugin (you install it on WP — handles security + API)
2. An Astro frontend starter (you scaffold a project from it — renders the public site)
3. A Claude Code setup wizard (walks you through installing the other two)

The WP plugin alone doesn't render a frontend. The frontend alone doesn't connect to WordPress. The wizard ties them together.

### Why three pieces and not one?

Because the work happens in three different places — WordPress, your frontend codebase, and your local machine during setup. A monolithic "do everything" plugin would be a 50MB monster impossible to maintain. Splitting cleanly = each piece stays focused, fast, and independently replaceable.

### Is Hatch a CMS?

No. **WordPress is the CMS.** Hatch makes WordPress easier to use as a *headless* CMS — meaning the editor (WordPress) is separate from the public website (Astro frontend).

### How is "headless" different from a static site?

| | Static site (Jekyll, Hugo, Eleventy) | Headless WordPress + Hatch |
|---|---|---|
| Editing | Git commits + markdown files | WordPress editor (Gutenberg) |
| Build trigger | Manual `npm run build` | Auto-rebuild on WP publish (webhook) |
| Live updates | Wait for build | ~ 5 seconds via webhook |
| Editor experience | Markdown + git | World-class CMS your team already knows |
| Performance | Same (both serve pre-rendered HTML) | Same |

Headless WordPress = the speed of a static site + the editor of WordPress. Best of both.

---

## 👥 For Editors / Non-Technical Teams

### Will my editors notice anything different?

No. They keep using WordPress exactly as today:
- Same login (just at `/hatch-login` instead of `/wp-login.php`)
- Same dashboard
- Same Gutenberg editor
- Same plugins (RankMath, Yoast, WPForms, etc.)
- Same publishing workflow

The only change: when they hit "Publish", the post appears on the new fast frontend instead of the old slow WordPress theme. Within ~5 seconds. Same URL structure.

### Can my editors still preview drafts?

V0.1: workaround needed — keep the WP theme accessible at a private URL for preview.

V0.2: `@hatch/preview` module ships secret-token preview URLs so editors hit "Preview" in WordPress and see the draft on the live frontend.

### Can my editors still upload images and use the media library?

Yes. WordPress media library works exactly as today. Hatch's Astro frontend serves images directly from your WordPress uploads folder, automatically optimized via Astro's `<Image>` component (WebP, AVIF, lazy loading).

### Will WordPress comments still work?

V0.1: we ship Disqus integration (free, drop-in, no auth setup).
V2: native WP comments + spam filter, after the auth module matures.

### Will my page builder (Elementor, Divi, Beaver Builder) work?

For your blog: yes — Hatch renders posts cleanly regardless of what built them.

For pages built entirely in a visual page builder: no — those need to be recreated as Astro pages. Most people use Hatch for the blog and keep their builder-pages on traditional WordPress (hybrid setup). It's a real tradeoff.

---

## 🤔 The "Headless is overkill for me" Question

### Is headless overkill for a basic blog?

Honest answer: **maybe yes** if all of these are true:
- < 1k monthly visits
- Currently loads in 2-3 seconds
- No security concerns
- No SEO ambition
- No plans to grow

Stick with traditional WordPress + a caching plugin like WP Rocket. You won't see the difference.

**Headless is worth it** if any of:
- 5k+ monthly visits (Core Web Vitals start mattering for Google ranking)
- Global audience (TTFB matters more than caching)
- You're tired of plugin bloat slowing things down
- Constant brute-force attacks on your login
- You want to grow / monetize / look professional
- You publish 5+ posts per week and want fresh content delivered fast

For these, the 15-minute setup pays back in saved ops + better SEO + faster site within weeks.

### Is headless overkill for a marketing website?

Marketing sites are the **best** Hatch use case. Mostly public content (Pattern 1 — see [docs/dynamic-content.md](dynamic-content.md)), where headless's static-fast advantage wins biggest.

### Is headless overkill for a personal blog?

Same logic as basic blog. Under 1k visits/month: probably overkill. Above 5k or growing: yes worth it. Anywhere in between: nice-to-have, depends on whether you enjoy modern dev or dislike WordPress maintenance.

### Is headless overkill for a 5-page brochure site?

Yes. 5 pages don't justify the setup overhead. Use a WordPress page builder + caching plugin, you're done in 30 min and it's fine.

---

## 😩 What People HATE About Headless WordPress (and how Hatch solves each)

These are the top complaints from r/WordPress, r/webdev, Stack Overflow, and headless WordPress dev forums in 2025-2026.

### "Live preview is broken"

Editors hit "Preview" in WP → opens the dead WordPress theme, not the headless frontend. They can't see drafts properly.

**How Hatch solves it:**
- V0.1: documented workaround (private WP URL for editor preview)
- V0.2: `@hatch/preview` module — secret-token preview URLs route the WP "Preview" button to `frontend.com/blog/[slug]?preview-token=XXX` which fetches the draft with auth.

### "Plugins don't work"

Many WordPress plugins emit shortcodes or HTML that the headless frontend can't render. Visual page builders especially.

**How Hatch solves it:**
- Auto-detects + bridges 16+ popular plugins (forms, SEO, membership, redirects, RankReady)
- For unsupported plugins: `@hatch/plugin-bridge` module suggests integration patterns
- Page builders for entire sites: honest answer is "use traditional WP for builder-pages, Hatch for blog" (hybrid)

### "Setup takes forever"

DIY headless WordPress: 30+ hours per project for forms, comments, search, SEO, schema, sitemap, redirects, auth, cache invalidation, spam protection.

**How Hatch solves it:**
- Setup wizard via Claude Code: 15 min start to finish
- Or one CLI command for devs: `npm create hatch@latest my-site`
- Every common headless problem already solved as a drop-in module

### "Lost my SEO when I migrated"

Migration breaks URL structure → 404 storm → Google deindexes you.

**How Hatch solves it:**
- Preserves URL structure (configurable to match your old WP permalinks)
- `@hatch/redirects` imports redirects from RankMath / Yoast / Redirection plugin
- `@hatch/seo` bridges RankMath/Yoast meta to the new frontend
- Most migrations see SEO **improvement** within 4 weeks because page speed jumps from 4-8s to under 1s, which Google rewards heavily.

### "Can't add features without coding"

Vanilla WordPress lets editors install plugins to add features. Headless seems to remove this.

**How Hatch solves it:**
- Editors couldn't really add features in vanilla WP either — features still need a developer to install and configure most plugins
- Hatch's modules are drop-in npm packages — your developer adds what's needed
- Auto-detection of common plugins means many features work zero-config

### "Cache invalidation is a nightmare"

Editor publishes a post → frontend shows old version for hours/days. Manual rebuilds suck.

**How Hatch solves it:**
- `@hatch/revalidate` — webhook fires on `save_post` / `delete_post` / `transition_post_status`
- Frontend purges the relevant cache within ~5 seconds
- Verified end-to-end via `/hatch-troubleshoot` skill

### "Forms and comments are extra work"

Forms in vanilla WP = install one plugin, drop a shortcode. In headless = build a custom submit handler from scratch.

**How Hatch solves it:**
- `@hatch/forms` — auto-detects WPForms / Fluent Forms / Gravity Forms / Contact Form 7. Drop in `<HatchForm id={3} />` and submit works.
- `@hatch/comments` — Disqus drop-in. Native WP comments coming V2.

### "WooCommerce doesn't work"

True. WooCommerce headless is famously hard.

**How Hatch handles it:**
- V1: not supported. If you need ecommerce now → traditional WP + WooCommerce, or Faust.js + WooGraphQL.
- V3: dedicated WooCommerce starter with cart, checkout, customer dashboard. Targeted for late 2026.

### "If the framework dies, I'm stuck (Frontity all over again)"

Legitimate concern. Frontity died in 2022 and stranded thousands of devs.

**How Hatch handles it:**
- Your **content stays in WordPress**, not in Hatch. Worst case: stop using Hatch, your WordPress keeps working.
- Hatch is **MIT-licensed**. Worst case: fork it and keep going.
- Hatch is **vendor-neutral** — not tied to any single host (Cloudflare, Vercel, VPS all work) or framework (Astro V1, more in V2). Diversification = resilience.
- Hatch is built on stable foundations (WordPress core REST API, Astro's standard adapter API) — those won't disappear.

### "Editors hate the new workflow"

Common complaint when teams move to headless setups that break editor habits.

**How Hatch solves it:** Hatch's whole architecture protects editors. Same WP login (just masked URL), same Gutenberg, same plugins, same workflow. Editors notice nothing except faster updates appearing on a faster public site.

### "Dynamic content is a mess"

This is the deepest concern from senior devs. Per-user dashboards, real-time updates, personalization, A/B testing — all break the static-fast model.

**How Hatch solves it:** Documents 4 distinct dynamic patterns, picks the right one per route. See [docs/dynamic-content.md](dynamic-content.md):
- Pattern 1: Public + ISR (blog posts, marketing pages)
- Pattern 2: Per-user SSR (account dashboards, membership-gated)
- Pattern 3: Edge personalization (A/B tests, geo, variants)
- Pattern 4: Real-time (use external services like Pusher/Crisp — don't reinvent)

Mix patterns intentionally instead of forcing everything into static cache. That's how it works.

### "Hosting is harder"

Multiple hosts (WordPress + frontend) sounds like more ops work.

**How Hatch solves it:** Frontend hosting is dead simple — Cloudflare Workers free tier, one `wrangler deploy` command. Your existing WordPress host doesn't change. Net ops complexity is similar or lower than traditional WP + caching plugins + CDN + security plugin stack.

---

## 🤔 "Will I regret going headless?"

You **might regret it** if:
- You rely on a visual page builder (Elementor / Divi) for your entire site
- Your site is mostly highly dynamic personalized content (not blog/marketing)
- You're not willing to spend 15 minutes on initial setup
- You need real-time features (live chat, presence) on most pages
- You publish < 1 post per month and have < 1k visits

You **won't regret it** if:
- You publish blog/marketing content regularly
- Page speed and security matter to your business
- You want a modern frontend without losing your editor

---

## 🔁 "Why not just keep WordPress + a caching plugin?"

Caching plugins (WP Rocket, W3 Total Cache, LiteSpeed Cache) make your existing WordPress *less slow*. Best case: 1-2s page load.

Hatch *replaces* the frontend entirely with a modern Astro app. Default: under 1s page load.

Caching also doesn't help with:
- Security hygiene (login masking, REST lockdown, brute-force protection)
- Mobile performance (Astro Islands ship 0 KB JS by default; WP themes ship 200-500 KB JS)
- LLM SEO (Speakable schemas, AEO patterns)
- Modern dev experience (TypeScript, hot reload, component model)
- API-first content (mobile apps, AI agents, etc.)

Caching is a band-aid. Hatch is the surgery.

---

## 💸 Cost

### Total cost to run a Hatch site?

| Component | Cost |
|---|---|
| WordPress hosting (DigitalOcean / Hetzner / RunCloud / Cloudways) | $5-15/mo |
| Frontend hosting (Cloudflare Workers free tier) | $0 |
| Domain | $10/yr |
| DNS / proxy (Cloudflare free) | $0 |
| Hatch (open source) | $0 |
| RankMath SEO (free version) | $0 |
| **Total** | **~$5-15/mo** |

Compare to: traditional WordPress with WP Rocket + caching CDN + security plugin = $30-100/mo for similar performance.

### Are there hidden costs?

No. Optional purchases:
- **RankMath Pro** (~$59/yr) — better LLM SEO
- **Tailwind UI Plus** ($299 one-time) — only if you build with the Agency theme
- **Migration consulting from Aditya** — only if you want done-for-you migration

All optional. Hatch itself is free forever.

### Will my Cloudflare bill explode?

Cloudflare Workers free tier: 100,000 requests/day = ~ 3M page views/month. **Most sites never need to upgrade.** $5/mo gets 10M req/day if you outgrow free.

---

## 🛠️ For Developers

### What's the architecture?

4 layers:
1. **Claude Code plugin** — 8 skills, setup wizard
2. **WordPress companion plugin** (PHP) — REST API, security hardening, plugin detection, webhook fires
3. **Astro starter** — production-ready, 5 themes, all V1 modules pre-wired
4. **16 npm modules** (`@hatch/*`) — drop-in problem-solvers

Full diagram: [ARCHITECTURE.md](../ARCHITECTURE.md)

### REST API or WPGraphQL?

V1 uses REST (no extra plugin needed, simpler for most users). V2 will add `@hatch/graphql` for users who want WPGraphQL's flexibility.

[Full comparison →](graphql-vs-rest.md)

### Does Hatch require Application Passwords?

Yes. Application Passwords (built into WP core since 5.6) are the secure way to authenticate API calls without exposing your main password. Each frontend gets its own app password — revocable per-frontend.

### How does cache invalidation work?

WordPress fires a webhook on `save_post`, `delete_post`, and `transition_post_status`. The webhook hits `/api/revalidate` on your frontend with a secret token. Frontend purges the relevant cached pages. Total invalidation latency: ~ 5 seconds.

### What's shipped on the wire to the browser?

Astro renders everything server-side. The browser receives:
- Pre-rendered HTML (immediate paint)
- CSS (~ 10-30 KB depending on theme)
- 0 KB JavaScript on most pages (Astro Islands only for interactive bits — share buttons, search bar, etc.)

Lighthouse Performance: 95-100 default.

### Where do React/Vue/Svelte fit?

Astro supports all of them as Islands. Need a React component for a fancy interactive widget? Drop it in:

```astro
---
import MyReactWidget from '../components/MyReactWidget.jsx';
---
<MyReactWidget client:load />
```

V2 will add Next.js, SvelteKit, Nuxt, Remix as full theme starters.

### What if my plugin isn't supported?

Open an issue or contribute a bridge module. The `@hatch/plugin-bridge` module detects unknown plugins and suggests integration patterns.

### How does Hatch handle dynamic content?

See [docs/dynamic-content.md](dynamic-content.md) — comprehensive guide with code examples for 4 distinct patterns.

---

## 🔒 Security

### Is the WordPress backend really hidden from the public?

Yes. Hatch enforces:
- `/wp-admin`, `/wp-login.php` masked to custom URL
- All `/wp-json/*` endpoints require authentication (anonymous = 401)
- `/wp-json/wp/v2/users` removed entirely
- `/xmlrpc.php` disabled
- `?author=N` enumeration blocked
- `cms.your-domain.com` set to `noindex, nofollow` site-wide
- Nginx/Caddy redirect for any non-WP URL → public frontend

Bots probing your CMS get 401s and 404s. Search engines never index it.

### Do I need to install Solid Security or other security plugins?

No. **Hatch handles WordPress security end-to-end.** That's the point.

V0.1 already bundles: REST hardening, XML-RPC kill, user enum block, CMS noindex.

V0.5 adds (no extra plugin needed): login URL masking, brute-force lockout (per-IP throttling), 2FA via WebAuthn / passkeys.

V0.6 adds: file integrity monitoring, activity log.

What Hatch does NOT replace (different product categories):
- **Backups** — your hosting provider may handle this. If not, install any WP backup plugin (UpdraftPlus, BlogVault, Solid Backups) — Hatch isn't a backup tool.
- **DDoS / WAF** — your hosting may include this. If not, put Cloudflare's free tier in front. Network infrastructure, not Hatch's job.

### How do I report a security vulnerability?

See [SECURITY.md](../SECURITY.md). Email `support@adityaarsharma.com` with details. Do NOT open public issues for security bugs.

---

## 🚀 Performance & Hosting

### What's a realistic Lighthouse score?

| Theme | Performance | SEO | Accessibility | Best Practices |
|---|---|---|---|---|
| Sprout (V0.1) | 100 | 100 | 100 | 100 |
| Magazine (V0.2) | 95+ | 100 | 95+ | 95+ |
| Tech (V0.2) | 95+ | 100 | 95+ | 95+ |
| Agency (V0.3) | 90+ | 100 | 95+ | 95+ |
| Newsletter (V0.3) | 100 | 100 | 100 | 100 |

Quality gate enforces these via CI — themes that fail can't merge.

### Can I use my existing hosting?

Yes. Path 3 (`docs/hosting/vps-runcloud.md`) covers deploying to your existing VPS via PM2 + Caddy/Nginx. Works on RunCloud, Cloudways, DigitalOcean, Hetzner, etc.

### What about CDN?

Cloudflare Workers = CDN built-in. Other hosts: Bunny CDN, Cloudflare in front, or KeyCDN.

### What's the latency?

- **Cloudflare Workers:** sub-100ms TTFB globally (edge cache)
- **Vercel:** sub-200ms TTFB (regional functions)
- **VPS:** depends on your server location

---

## 🤝 Contributing & Community

### Can I submit a theme?

Yes! See [themes/README.md](../themes/README.md). Quality-gated via CI — Lighthouse 90+, WCAG AA, full responsive.

### Can I submit a module?

Yes. See [CONTRIBUTING.md](../CONTRIBUTING.md). New module integrations (Forminator, Polylang, ACF, etc.) are exactly what Hatch needs.

### Can I translate the WP plugin to my language?

Yes. WP plugin uses standard `__()` / `_e()` patterns + a `.pot` file (V0.5). Submit translations via PR.

### How do I report bugs?

[Open a GitHub issue](https://github.com/adityaarsharma/hatch/issues/new) using the bug-report template. Include reproduction steps + WP version + Hatch version.

### How do I get help with setup?

- **DIY:** [GitHub Discussions](https://github.com/adityaarsharma/hatch/discussions) — community Q&A
- **Done-for-you:** [Connect with Aditya](https://adityaarsharma.com/connect/) — paid setup help, full migration, training

---

## ❓ Anything else?

[Open a discussion](https://github.com/adityaarsharma/hatch/discussions) and we'll add the answer here.

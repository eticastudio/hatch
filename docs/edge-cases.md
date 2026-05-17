# Headless WordPress Edge Cases — and how Hatch handles them

Research-backed list of every problem pro devs hit when going headless on WordPress, sourced from community discussions, agency blogs, and 2026 production case studies.

Each edge case is mapped to: **what breaks · why · how Hatch handles it**.

---

## 🎬 Editor & Content Workflow

### 1. Live preview button is broken

**What breaks:** Editor hits "Preview" in WordPress → opens the old theme preview, not the headless frontend. Drafts are invisible to the editorial team until published.

**Why:** WordPress's preview system assumes the WP theme renders the post. In headless, the frontend rendering happens elsewhere.

**How Hatch handles it:**
- **V0.1:** documented workaround — keep WP frontend running on a private URL for editor preview
- **V0.2 (`@hatch/preview` module):** secret-token preview URLs. WP "Preview" button rewrites to `frontend.com/blog/[slug]?preview-token=XXX`. Frontend fetches the draft with auth + renders normally.

Sources: [Forminit 2026 guide](https://forminit.com/blog/headless-wordpress-2026-guide/), [Pantheon learning center](https://pantheon.io/learning-center/hosting/headless-wordpress-hosting)

### 2. Scheduled posts don't appear at scheduled time

**What breaks:** Editor schedules a post for tomorrow 9 AM. It publishes in WordPress, but the frontend cache doesn't refresh → post invisible until next manual rebuild.

**Why:** Frontend has cached the listing page. WordPress doesn't tell the frontend "hey, refresh."

**How Hatch handles it:**
- `@hatch/revalidate` listens for `transition_post_status` hook → fires webhook the moment the schedule triggers
- Frontend re-fetches and invalidates within 5 seconds
- Fallback: time-based revalidation every 5 minutes via `next: { revalidate: 300 }`

### 3. Quick edits via WP admin don't reflect immediately

**What breaks:** Editor changes a typo in WP. Frontend shows the old typo for hours/days.

**How Hatch handles it:** Same webhook flow — `save_post` fires on every update. Frontend revalidates within 5s. Verified by user via `/hatch-troubleshoot` skill.

### 4. WP block editor (Gutenberg) won't render in REST output

**What breaks:** Custom Gutenberg blocks emit shortcodes or HTML that the frontend doesn't know how to render.

**Why:** WordPress REST returns `content.rendered` which is the post processed through WP's `the_content` filter — works for standard blocks but breaks for custom plugin blocks.

**How Hatch handles it:**
- V0.1: documents the rule — "if your post uses custom blocks, make sure they emit clean HTML/CSS, not shortcodes"
- V2: `@hatch/blocks` module to render specific blocks frontend-side (advanced)

---

## 🔌 Plugin Compatibility

### 5. Plugins that output shortcodes don't work

**What breaks:** `[contact-form-7 id="123"]` appears as raw text on the frontend.

**How Hatch handles it:**
- Form plugins (CF7, WPForms, Fluent, Gravity): `@hatch/forms` auto-detects + replaces shortcodes with native React/Astro components
- Other shortcode plugins: V2 `@hatch/shortcodes` module will let users register custom renderers

### 6. Cookie-based authentication breaks across domains

**What breaks:** Plugins that rely on WP login cookies (membership plugins, BuddyPress, bbPress) don't work because frontend and WP are on different domains.

**How Hatch handles it:**
- `@hatch/auth` uses JWT (stateless, works cross-domain) instead of WP cookies
- `@hatch/membership` translates membership plugin data → JWT claims

### 7. Visual page builders (Elementor, Divi, Beaver Builder) don't render

**What breaks:** Page built in Elementor → raw HTML in REST response, but missing the Elementor CSS/JS → page looks broken.

**How Hatch handles it:**
- V0.1: documented limitation — Hatch is for blog posts, not Elementor-built pages
- For Elementor users: keep WordPress frontend for pages, use Hatch for blog only (hybrid approach)
- V2: `@hatch/elementor-bridge` module (community contribution welcome)

### 8. Theme functions / hooks not running

**What breaks:** Code in `functions.php` (custom queries, post filters, taxonomy logic) doesn't run on the frontend.

**How Hatch handles it:** Move that logic into a custom WP plugin (it runs at REST API time) instead of `functions.php` (which only runs when the WP theme renders). Hatch's `/hatch-migrate` skill walks through this.

---

## 🔍 SEO

### 9. Sitemap split between WordPress and frontend

**What breaks:** WordPress generates `/sitemap_index.xml` for the CMS domain. Frontend has its own routes (category, author archives). Google sees fragmented data.

**How Hatch handles it:** `@hatch/sitemap` merges:
- All published posts from WP REST
- Frontend-only routes (homepage, /blog, category archives, author archives)
- Outputs unified sitemap at `[frontend]/sitemap.xml`
- WordPress sitemap stays internal-only (CMS subdomain noindex)

### 10. Canonical URLs point to wrong domain

**What breaks:** RankMath/Yoast generate canonical URLs based on WP's home URL (e.g. `cms.example.com/post-slug`). Frontend serves at `example.com/blog/post-slug`. Google sees two URLs for same content → SEO penalty.

**How Hatch handles it:** `@hatch/seo` proxies RankMath/Yoast's `getHead` endpoint and rewrites all `cms.example.com/[slug]` → `example.com/blog/[slug]` in the output. Verified in [our SproutOS test case](https://sproutos.ai/blog/hello-world).

### 11. RSS feed missing

**What breaks:** WP's default RSS at `/feed/` serves from WP theme. Headless = WP theme inactive = no RSS.

**How Hatch handles it:** Astro starter includes `/rss.xml` route built from WP REST data. Same content, served by the frontend.

### 12. JSON-LD schema graph fragmented

**What breaks:** Custom schema markup (BlogPosting, Author Person, Organization) needs to be re-implemented frontend-side or RankMath/Yoast's schemas don't get included.

**How Hatch handles it:** `@hatch/schema` includes the FULL RankMath/Yoast graph (Person, Organization, WebSite, ImageObject, WebPage, BlogPosting all @id-linked) — verified via Google Rich Results Test. Plus Hatch adds its own BreadcrumbList.

### 13. Page Speed Insights tests the wrong URL

**What breaks:** Google indexes both `cms.example.com` and `example.com` → PageSpeed Insights reports on the slow CMS subdomain, hurting Core Web Vitals scores.

**How Hatch handles it:** Forces `noindex, nofollow, noarchive, nosnippet` site-wide on CMS via `wp_head` and `wp_robots` filters. Only the public frontend appears in PageSpeed Insights.

---

## 🛡️ Security

### 14. /wp-json/wp/v2/users exposes team usernames

**What breaks:** Public bots scrape user list, use names as brute-force login candidates.

**How Hatch handles it:** `Hatch_Security::block_users_endpoint()` removes the endpoint entirely via `rest_endpoints` filter.

### 15. /wp-login.php gets brute-forced 24/7

**What breaks:** Bots probe wp-login.php millions of times per day across the internet. Even strong passwords waste server resources.

**How Hatch handles it:**
- V0.1: recommends + guides install of WPS Hide Login (free, 1M+ installs)
- V0.5: bundled into Hatch core — `Hatch_Security::custom_login_path` setting

### 16. XML-RPC attack vector

**What breaks:** `xmlrpc.php` is a brute-force amplifier (1 request → N login attempts) and pingback DDoS source.

**How Hatch handles it:** `Hatch_Security::disable_xmlrpc()` returns false to `xmlrpc_enabled` filter + removes `X-Pingback` header.

### 17. User enumeration via ?author=N

**What breaks:** `example.com/?author=1` redirects to `/author/admin/` revealing the admin's slug.

**How Hatch handles it:** `Hatch_Security::block_user_enumeration()` redirects all `?author=N` to homepage at `init` priority.

### 18. REST link tags leak endpoint URLs

**What breaks:** `<link rel="https://api.w.org/" href="/wp-json/" />` in `<head>` advertises the REST endpoint to scrapers.

**How Hatch handles it:** Hatch removes `rest_output_link_wp_head`, `rest_output_link_header`, and `rest_output_rsd` actions.

### 19. Application Password leaked = full WP access

**What breaks:** Frontend env files committed to git, screenshots leak credentials, etc.

**How Hatch handles it:**
- Documents `.env` best practices (gitignore, `chmod 600`, platform secrets managers)
- Per-frontend Application Password (revoke one without affecting others)
- Recommends rotating quarterly

---

## ⚡ Performance

### 20. REST API is slow for complex pages

**What breaks:** A page needs posts + categories + author bios → 3 REST calls per render. Latency adds up.

**How Hatch handles it:**
- `_embed=1` includes featured media + categories + author in single call (Hatch uses this everywhere)
- ISR with `revalidate: 300` (5min cache + webhook invalidation = always fresh)
- Recommends Redis Object Cache on WP for repeated queries
- V2: `@hatch/graphql` for sites that need single-query fetches

Sources: [Kinsta WPGraphQL vs REST](https://kinsta.com/blog/wpgraphql-vs-wp-rest-api/), [Atto WP performance guide](https://attowp.com/security-performance/wordpress-security-hardening-checklist/)

### 21. Image bloat

**What breaks:** WP uploads are full-size 5MB+ PNGs. Frontend serves them as-is → slow LCP.

**How Hatch handles it:** `@hatch/images` wraps WP media URLs in Astro's `<Image>` component → automatic format conversion (WebP/AVIF), responsive sizes, lazy loading.

### 22. Webfonts cause CLS

**What breaks:** Google Fonts load late → text shifts on load → poor Cumulative Layout Shift score.

**How Hatch handles it:** Themes use `<link rel="preconnect">` + `font-display: swap`. Sprout theme uses system fonts (zero CLS, zero network requests).

### 23. JavaScript bundle bloat

**What breaks:** Many Next.js headless starters ship 200-400 KB JS to browsers → slow First Input Delay.

**How Hatch handles it:** Astro Islands — ship zero JS for static pages, hydrate ONLY interactive components (share buttons, search, comments). Most pages: 0-30 KB JS.

---

## 🌐 Hosting & Operations

### 24. Webhook revalidation fails silently

**What breaks:** Editor publishes a post → frontend doesn't update. No error, just stale.

**How Hatch handles it:**
- Webhook POSTs to `[frontend]/api/revalidate?secret=XXX`
- Frontend logs every webhook hit (visible in Vercel/Cloudflare/Node logs)
- WP admin dashboard shows "Last webhook fired: 5 min ago ✅" or `❌ never`
- `/hatch-troubleshoot` skill diagnoses webhook chain end-to-end

### 25. Cold starts on serverless

**What breaks:** Vercel/Netlify free tier has cold starts (~ 1-2s on first request after idle). Hurts UX for occasional visitors.

**How Hatch handles it:**
- Recommends **Cloudflare Workers** for free hosting (no cold starts, sub-100ms TTFB)
- Vercel Pro tier eliminates cold starts ($20/mo) if you prefer Vercel
- VPS + PM2 = zero cold starts

### 26. CDN cache doesn't invalidate

**What breaks:** Editor publishes → frontend revalidates → but CDN (Cloudflare cache) still serves old version.

**How Hatch handles it:**
- Cloudflare Workers: Cache API tags (V0.5)
- Vercel: built-in cache tag invalidation
- VPS + Cloudflare in front: webhook also purges Cloudflare cache via their API (V0.5 module)

---

## 📦 Migration

### 27. URL structure breaks → 404 storm

**What breaks:** New frontend uses `/blog/[slug]` but WP had `/[year]/[month]/[slug]`. All old links 404. Google deindexes.

**How Hatch handles it:**
- `@hatch/redirects` imports redirects from Yoast/RankMath/Redirection
- Astro starter supports custom URL patterns via `astro.config.mjs`
- `/hatch-migrate` skill walks through URL parity checking before DNS cutover

### 28. Old WordPress theme has custom page templates

**What breaks:** Built a custom "Team" page template in your WP theme. After going headless, the team page doesn't render.

**How Hatch handles it:**
- Recreate as an Astro page (one-time work)
- `/hatch-migrate` inventories all custom templates + estimates rebuild effort

### 29. Multilingual content (Polylang/WPML)

**What breaks:** Language-prefixed URLs (`/en/`, `/fr/`) and post translations don't appear correctly.

**How Hatch handles it:** V2 `@hatch/i18n` module — locale-aware fetching, hreflang, URL routing.

---

## ⚠️ Honest unsolved problems

These edge cases are real and Hatch V1 doesn't solve them. Documenting honestly:

### 30. AMP support

WordPress AMP plugin output won't render on Hatch frontend. AMP is in decline (Google deprecated AMP-only ranking signals in 2021) but if you depend on it, Hatch isn't a fit.

### 31. Highly dynamic / personalized content

Pages that change per logged-in user (account dashboards, personalized recommendations) need authenticated API calls per render → can't be cached → loses headless's speed advantage.

For these pages, keep them on traditional WP and use Hatch only for the public/blog side. Hybrid approach.

### 32. Real-time content (BuddyPress activity feeds, bbPress threads)

Sub-second update requirements don't work with webhook-based revalidation. Use traditional WP for these features.

### 33. Visual page builder full-site editing

Elementor / Divi / Beaver Builder users who do their whole site visually → Hatch can render the blog cleanly, but custom page-builder pages need manual recreation in Astro.

---

## How to contribute new edge cases

Run into a problem not listed here? [Open a GitHub Discussion](https://github.com/adityaarsharma/hatch/discussions) with:
- What broke
- How you worked around it (or didn't)
- Whether Hatch should solve it natively or document a workaround

We update this doc monthly based on community reports.

---

## References & community sources

- [Forminit — Headless WordPress 2026 Build-to-Deploy Guide](https://forminit.com/blog/headless-wordpress-2026-guide/)
- [Pantheon — Headless WordPress Hosting Guide](https://pantheon.io/learning-center/hosting/headless-wordpress-hosting)
- [WordPress VIP — Headless Tradeoffs Explained](https://wpvip.com/blog/headless-wordpress-tradeoffs/)
- [Kinsta — WPGraphQL vs REST](https://kinsta.com/blog/wpgraphql-vs-wp-rest-api/)
- [ZeroToWP — Login Security 2026](https://zerotowp.com/wordpress-login-security)
- [rtCamp — Decoupled vs Headless WordPress](https://rtcamp.com/resources/decoupled-vs-headless-wordpress/)
- [LoginPress — Headless WordPress Login Security 2026](https://loginpress.pro/login-security-for-headless-wordpress/)
- [Elementor — Headless WordPress in 2026](https://elementor.com/blog/headless-wordpress/)

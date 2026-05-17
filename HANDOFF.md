# Hatch — Session Handoff

Paste this entire file into a new Claude Code conversation to resume with full context.

---

## What Hatch Is

**Hatch** is Aditya Sharma's 5th personal brand product (after Pickle, Jyotisha, YouTube MCP, RunCloud MCP).

**Elevator pitch:** Open-source headless WordPress engine. Three pieces: a WordPress companion plugin + an Astro frontend stack + a Claude Code plugin that walks you through setup. Free, MIT, community-first.

**GitHub:** https://github.com/adityaarsharma/hatch  
**Local path:** `~/Claude/products/Hatch/`  
**Docs site:** https://hatch.adityaarsharma.com (WIP)  
**Consulting link:** https://adityaarsharma.com/connect/

---

## Locked Decisions — Do Not Revisit

| Decision | Value |
|---|---|
| Name | **Hatch** (final) |
| Tagline | "Headless WordPress, Made Easy" |
| Description line | "The headless engine for WordPress" |
| Brand | Aditya Sharma personal (not POSIMYTH) |
| License | MIT |
| V1 frontend | Astro only |
| V2 frontend | Next.js (do not mention in V1 docs) |
| Monetization | Free OSS + paid consulting at /connect |
| Framing | NOT "AI-guided" — it's "Claude Code plugin" |
| Security | Hatch handles it all natively. No plugin shopping list. |
| Backups | Out of scope (hosting / any backup plugin — mentioned once only) |
| Contact URL | `/connect` everywhere (not /contact) |
| @hatch/membership | Moved to V2 wishlist. NOT in V1. |
| RankReady crossover | Approved. Recommended inside /hatch-llm-seo skill and @hatch/llm-seo module. |

---

## Repo Structure

```
~/Claude/products/Hatch/
├── README.md                          ← Main public face, multiple rewrites done
├── ROADMAP.md                         ← V0.1 → V3, V0.5 security milestone added
├── ARCHITECTURE.md
├── SECURITY.md                        ← Vulnerability disclosure + hardening checklist
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
│
├── wp-plugin/
│   ├── hatch.php                      ← Main plugin file, activation hooks
│   └── includes/
│       ├── class-security.php         ← REST hardening, XML-RPC kill, user enum block, noindex
│       ├── class-detector.php         ← Detects 17 known plugins (RankMath, Yoast, WPForms, etc.)
│       ├── class-rest-api.php         ← /wp-json/hatch/v1/* endpoints
│       ├── class-revalidate.php       ← save_post webhook firing
│       ├── class-seo-bridge.php       ← Auto-detects RankMath vs Yoast, proxies getHead
│       ├── class-forms-bridge.php     ← Unified form detection + submission (WPForms/Fluent/Gravity/CF7)
│       └── class-rankready-bridge.php ← Soft-recommends RankReady install
│   └── admin/dashboard.php            ← Admin UI with noindex toggle + custom login guidance
│
├── claude-plugin/
│   ├── .claude-plugin/plugin.json
│   └── skills/
│       ├── hatch-init/SKILL.md        ← Bootstrap entire project
│       ├── hatch-wp-setup/SKILL.md    ← WP install + security
│       ├── hatch-astro-setup/SKILL.md ← Frontend scaffold
│       ├── hatch-add-module/SKILL.md  ← Add modules
│       ├── hatch-migrate/SKILL.md     ← Frontity → Hatch migration
│       ├── hatch-deploy/SKILL.md      ← Deploy to CF/Vercel/VPS
│       ├── hatch-troubleshoot/SKILL.md← Debug common issues
│       └── hatch-llm-seo/SKILL.md    ← RankReady integration
│
├── astro-starter/
│   └── src/
│       ├── lib/hatch.ts               ← WP REST API client (server-only, Application Passwords)
│       ├── pages/blog/index.astro     ← Blog listing, category tabs, Load More
│       ├── pages/blog/[slug].astro    ← Single post, all features
│       ├── pages/blog/api/revalidate.ts ← Webhook receiver
│       └── layouts/PageLayout.astro   ← Base layout, rawHead injection
│
├── themes/
│   ├── THEME-CONTRACT.md              ← Required components, quality gate spec
│   ├── sprout/                        ← ✅ V0.1 ready, minimal typography-first
│   ├── magazine/                      ← 🔨 V0.2 scaffold
│   ├── tech/                          ← 🔨 V0.2 scaffold
│   ├── agency/                        ← 🔨 V0.3 scaffold
│   └── newsletter/                   ← 🔨 V0.3 scaffold
│
├── modules/                           ← 14 V1 modules (membership removed to V2)
│   ├── seo/                           ← getHead bridge, RankMath + Yoast
│   ├── schema/                        ← Full JSON-LD graph
│   ├── revalidate/                    ← Webhook cache invalidation
│   ├── sitemap/                       ← Merged WP + Astro sitemap
│   ├── next-prev/                     ← Adjacent post navigation
│   ├── forms/                         ← WPForms/Fluent/Gravity/CF7 bridge
│   ├── comments/                      ← Disqus V1, native V2
│   ├── shield/                        ← Honeypot + rate limit
│   ├── search-basic/                  ← Title + excerpt search
│   ├── auth/                          ← JWT login, cross-domain
│   ├── images/                        ← Astro Image wrapper for WP media
│   ├── redirects/                     ← Import from RankMath/Yoast/Redirection
│   ├── llm-seo/                       ← RankReady integration
│   └── plugin-bridge/                 ← Detects new WP plugins
│
├── packages/create-hatch/             ← CLI with @clack/prompts
│
├── docs/
│   ├── getting-started.md
│   ├── faq.md                         ← 30+ Q&As including "headless overkill?" and "what people hate"
│   ├── edge-cases.md                  ← 33 research-backed headless WP edge cases
│   ├── dynamic-content.md             ← 4-pattern model (Static+ISR / SSR / Edge / Real-time)
│   ├── security.md                    ← Hatch handles all; backups/WAF mentioned once
│   ├── graphql-vs-rest.md             ← When REST (V1) vs WPGraphQL (V2 opt-in)
│   ├── frontity-migration.md
│   ├── themes/index.md
│   └── hosting/                       ← Cloudflare Workers, Vercel, VPS/RunCloud, Netlify
│
├── .github/
│   ├── FUNDING.yml                    ← custom: adityaarsharma.com/connect
│   ├── ISSUE_TEMPLATE/                ← bug_report, feature_request, theme_submission
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── DISCUSSION_TEMPLATE/           ← ideas, showcase
│   └── workflows/theme-quality.yml    ← Lighthouse 95+ CI gate
│
└── marketing/
    ├── reddit/r-wordpress.md
    ├── twitter-thread.md
    ├── product-hunt.md
    └── youtube-script.md
```

---

## README State (latest — commit 4a39e32)

Sections in order:
1. Header + badges + nav links
2. "What is headless WordPress?" — restaurant analogy + 2 mermaid diagrams (traditional vs headless)
3. "Why this is faster / unhackable" — attack surface mermaid
4. "I already run WordPress. Why do I need Hatch?" — 7 bullet reasons
5. "Can't I just ask Claude/ChatGPT?" — comparison table, honest framing
6. "What is Hatch?" — 3-piece architecture mermaid (WP plugin / Astro stack / Claude Code plugin)
7. "How it works" — sequence diagram (publish → webhook → revalidate → visitor)
8. Install + Connect — 4-step guided flow with full /hatch-init Q&A verbatim
9. "What Hatch Solves" — 12-row problem/solution table
10. Comparison table (DIY starter vs Faust.js vs Hatch)
11. Security section — table of all protections + V0.5/V0.6 roadmap
12. Themes — 5 themes table + quality gate
13. Modules — 14 modules table + V2 wishlist
14. **SEO section** ← NEW, added last session
    - getHead bridge explanation (RankMath + Yoast both supported)
    - Full table of what flows automatically (14 rows, all ✅)
    - Schema graph JSON-LD example
    - Sitemap merge mermaid diagram
    - Redirects (compiled to static edge)
    - Lighthouse 100 SEO scores
    - LLM SEO via RankReady
15. Dynamic Content — 4-pattern table
16. Hosting — 4 paths table
17. FAQ — inline 4 Q&As + link to extended faq.md
18. Status
19. Community First — contribution table
20. Documentation index
21. License + footer

---

## Module Count

**V1: 14 modules** (membership removed from V1)  
**V2 wishlist:** Native WP comments · Membership gating (`@hatch/membership`) · CPT bridge · ACF bridge · Algolia/Meilisearch · Multilingual · Live Preview · WooCommerce · WPGraphQL bridge

---

## Security Model

V0.1 (shipped):
- `/wp-json/wp/v2/users` removed
- All `/wp-json/*` → 401 for anonymous
- `/xmlrpc.php` disabled
- `?author=N` blocked
- `<head>` REST link tags stripped
- CMS forced `noindex, nofollow`

V0.5 (roadmap):
- Custom login path native
- Brute-force per-IP lockout
- 2FA via WebAuthn/passkeys

V0.6 (roadmap):
- File integrity monitoring
- Activity log

---

## SEO Architecture (key technical detail)

RankMath endpoint: `GET /wp-json/rankmath/v1/getHead?url=/blog/slug`  
Yoast endpoint: `GET /wp-json/yoast/v1/get_head?url=/blog/slug`

Returns full `<head>` HTML. Hatch:
1. Auto-detects which plugin is active
2. Calls the right endpoint
3. Rewrites all URLs from `cms.example.com` → `mysite.com`
4. Injects verbatim into Astro `<head>` via `rawHead`

Everything flows: title, description, robots, canonical, OG, Twitter cards, full JSON-LD schema graph, article dates, author Person schema, breadcrumb schema.

Sitemap: WP-generated sitemap merged with Astro routes, served at `mysite.com/sitemap.xml`. CMS subdomain forced noindex so Google never sees it.

---

## SproutOS Blog — Separate Project (Already Shipped)

SproutOS blog is a SEPARATE headless WP project — Hatch is a framework, SproutOS blog is a real live implementation.

**Architecture:**
- WordPress CMS: `cms.sproutos.ai` (RunCloud server 49.13.66.133)
- Public frontend: `sproutos.ai/blog` (Next.js, on server 178.105.17.71)
- SEO: RankMath getHead bridge with URL rewriting

**Everything already working on SproutOS blog:**
- ✅ Reading progress bar (top)
- ✅ Sticky share sidebar (X, LinkedIn, WhatsApp, Copy link)
- ✅ TOC sidebar (sticky, auto H2/H3, active section highlight)
- ✅ Breadcrumb (Home → Blog → Post title)
- ✅ Next / Prev navigation (pulls adjacent posts from WP API)
- ✅ Related posts (by category)
- ✅ Author bio from WordPress (name, avatar, description — Sagar Patel etc.)
- ✅ Author archive pages `/blog/author/[slug]`
- ✅ Category archive pages `/blog/category/[slug]`
- ✅ Category tabs on index with Load More (no pagination)
- ✅ Word count + reading time
- ✅ Last updated date
- ✅ Schema auto-flows from RankMath getHead — NOT hardcoded
- ✅ CMS forced noindex (Hatch WP plugin)
- ✅ REST hardening

**SproutOS blog rule:** Only touch `app/blog/*` — never modify other SproutOS files.

---

## Marketing Assets (ready, not launched yet)

All at `~/Claude/products/Hatch/marketing/`:
- `reddit/r-wordpress.md` — 3 title variants, full body, comment-bait Q&As, cross-post plan
- `twitter-thread.md` — 10-tweet thread, engagement plan
- `product-hunt.md` — Full listing copy, maker comment, gallery spec, launch day plan
- `youtube-script.md` — 7-min script with timestamps, description, promotion plan

**Launch order (planned):** YouTube video → Product Hunt (Tue/Wed 12:01am PST) → Reddit r/WordPress → Twitter thread → LinkedIn

---

## What Needs Doing Next (pick up here)

Likely next tasks based on trajectory:
1. **Implement V1 modules** — seo, schema, revalidate, sitemap are highest priority (forms and comments next)
2. **Sprout theme completion** — it's marked ✅ V0.1 but may need polish
3. **docs/getting-started.md** — 5-min setup path needs to be complete
4. **Launch prep** — YouTube video recording, Product Hunt scheduling
5. **Marketing/launch execution** — all assets are written, need to go live

---

## Key People / Context

- **Aditya Sharma** — builder, adityaarsharma.com, @adityaarsharma on Twitter
- **Sagar Patel** — author in WordPress for SproutOS blog (example of WP author pulled headlessly)
- **Frontity** — died 2022, Hatch is the successor for that community
- **Faust.js** — main competitor, Next.js only, WP Engine locked. Hatch is vendor-neutral.

---

## Terminology Rules

| Say | Don't say |
|---|---|
| Claude Code plugin | AI guide / AI-guided / AI magic |
| The headless engine | AI framework |
| Guided setup | AI setup |
| `/hatch-init` | AI assistant |
| Modules | AI modules |

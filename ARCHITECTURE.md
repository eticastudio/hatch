# Hatch — Architecture

## Design principles

1. **Vendor-neutral** — no hosting, framework, or plugin lock-in
2. **guided over code-heavy** — Claude Code plugin does the work users would otherwise google for hours
3. **One opinionated path** + escape hatches everywhere — easy default, full control when needed
4. **Modular** — every problem is a separate npm package, users pick what they need
5. **WordPress is the source of truth** — frontend is a renderer, never a separate database
6. **Security by default** — REST hardening, spam protection, CORS, rate-limiting all on by default

---

## Four-layer architecture

```
┌────────────────────────────────────────────────────────────┐
│ LAYER 1: Hatch Claude Code Plugin                          │
│ Lives in: claude-plugin/                                   │
│ Distribution: Claude Code marketplace + GitHub             │
│                                                            │
│ Skills:                                                    │
│  - hatch-init           Bootstrap a new project            │
│  - hatch-wp-setup       Guide WP install + plugins         │
│  - hatch-astro-setup    Scaffold Astro frontend            │
│  - hatch-add-module     Add forms / comments / etc.        │
│  - hatch-migrate        Migrate existing WP → headless     │
│  - hatch-deploy         Cloudflare / Vercel / VPS guides   │
│  - hatch-troubleshoot   Debug common issues                │
│  - hatch-llm-seo        Set up RankReady for LLM SEO       │
└────────────────────────┬───────────────────────────────────┘
                         │ guides user to install
                         ↓
┌────────────────────────┴───────────────────────────────────┐
│ LAYER 2: Hatch WordPress Companion Plugin                  │
│ Lives in: wp-plugin/                                       │
│ Distribution: WordPress.org + GitHub                       │
│                                                            │
│ Responsibilities:                                          │
│  - Expose REST API at /wp-json/hatch/v1/*                  │
│  - Auto-detect installed plugins (RankMath, Yoast,         │
│    WPForms, Fluent, MemberPress, Redirection, RankReady)   │
│  - Apply security hardening (REST auth, XML-RPC, etc.)     │
│  - Fire webhook on post save → frontend revalidate         │
│  - Bridge SEO meta from RankMath OR Yoast (auto-detect)    │
│  - Bridge LLM SEO meta from RankReady (when installed)     │
│  - Provide WP admin dashboard showing connection status    │
└────────────────────────┬───────────────────────────────────┘
                         │ exposes JSON API to
                         ↓
┌────────────────────────┴───────────────────────────────────┐
│ LAYER 3: Hatch Astro Starter                               │
│ Lives in: astro-starter/                                   │
│ Distribution: npm `create hatch@latest`                    │
│                                                            │
│ Includes:                                                  │
│  - Blog listing, single post, category, author archives    │
│  - Reading progress, TOC, share buttons, breadcrumbs       │
│  - Next/prev navigation                                    │
│  - All V1 modules pre-wired                                │
│  - Tailwind 4 + shadcn (matches modern aesthetic)          │
│  - Zero JS shipped by default (Astro Islands for           │
│    interactive bits only)                                  │
└────────────────────────┬───────────────────────────────────┘
                         │ uses
                         ↓
┌────────────────────────┴───────────────────────────────────┐
│ LAYER 4: Hatch Modules (npm packages)                      │
│ Lives in: modules/*                                        │
│ Distribution: npm `@hatch/*`                               │
│                                                            │
│ V1: 15 modules covering every common headless WP problem   │
│ Each module:                                               │
│  - Has a clear contract (TypeScript types in @hatch/core)  │
│  - Works standalone (users can pick & choose)              │
│  - Documented with usage examples + WP plugin requirements │
└────────────────────────────────────────────────────────────┘
```

---

## Data flow (typical request)

### A) User loads `/blog/hello-world`

```
Browser → Astro page (server-rendered)
         ↓
         calls /api/posts/[slug] (Astro API route)
         ↓
         fetches https://cms.example.com/wp-json/wp/v2/posts?slug=hello-world&_embed
         (with Application Password auth)
         ↓
         in parallel: fetches /wp-json/hatch/v1/seo-head?url=...
         (which proxies RankMath OR Yoast getHead)
         ↓
         Astro page renders: HTML + JSON-LD schemas + meta tags
         ↓
         Browser receives full pre-rendered page (Lighthouse 100)
```

### B) Editor publishes a post in WordPress

```
WP `save_post` hook fires (in Hatch WP plugin)
         ↓
         POSTs to https://yourfrontend.com/api/revalidate?secret=XXX&tag=posts
         ↓
         Astro/Cloudflare invalidates cached pages tagged "posts"
         ↓
         Next visit re-fetches fresh data
```

### C) User submits a contact form

```
Browser → Astro <HatchForm id="3" /> component
         ↓
         POSTs to /wp-json/hatch/v1/forms/3/submit
         (with @hatch/shield protection: Turnstile + honeypot + rate-limit)
         ↓
         Hatch WP plugin detects which form plugin owns ID 3
         (WPForms / Fluent Forms / Gravity / CF7)
         ↓
         delegates to that plugin's native submit handler
         ↓
         response back to Astro form component
         ↓
         user sees success / error message
```

---

## Module contract

Every Hatch module exports the same shape (TypeScript types in `@hatch/core`):

```typescript
// modules/[name]/src/index.ts
import type { HatchModule } from '@hatch/core';

export const myModule: HatchModule = {
  name: 'my-module',
  version: '1.0.0',
  requires: { wpPlugin: ['some-plugin/some-plugin.php'] }, // optional
  detect: async (wp) => boolean, // is this module usable on this WP install?
  apiRoutes: { /* Astro API route handlers this module needs */ },
  components: { /* Astro components this module exposes */ },
  hooks: { /* lifecycle hooks: onSetup, onTeardown */ },
};
```

Anyone can write a new Hatch module by following this contract.

---

## Security model

| Surface | Protection |
|---|---|
| WP REST API | Hatch hardening: blocks `/wp/v2/users` to anonymous, kills XML-RPC, strips REST link headers |
| WP login | Custom path enforced (e.g. `/admin-login`), 2FA via Solid Security recommendation |
| Public POST endpoints (forms, comments) | `@hatch/shield`: Cloudflare Turnstile + honeypot + per-IP rate-limit |
| Application Password | Server-only, stored in `.env` (never exposed to browser) |
| Webhook revalidation | Secret token required, validated server-side |
| JWT auth | Short-lived access tokens (15 min) + httpOnly refresh tokens (7 days) |
| CORS | Allowlist only the configured frontend domain |

---

## SEO strategy

1. **Server-rendered HTML** — every page pre-rendered, crawlers see content
2. **RankMath OR Yoast bridge** — Hatch detects which is installed, uses correct getHead endpoint
3. **JSON-LD schema graph** — full graph (Person + Organization + WebSite + ImageObject + WebPage + BlogPosting) inherited from RankMath/Yoast
4. **Breadcrumb schema** — added by Hatch on top
5. **FAQ schema passthrough** — when post has FAQ block in RankMath
6. **Canonical URL rewriting** — cms.* → public domain
7. **Robots override** — CMS subdomain stays noindex, public domain is index/follow
8. **Sitemap merging** — combines WP sitemap + frontend routes
9. **LLM/AEO** — optional `@hatch/llm-seo` integrates with RankReady for ChatGPT/Perplexity ranking

---

## Performance targets

| Metric | Target |
|---|---|
| Lighthouse Performance | ≥ 95 |
| Lighthouse SEO | 100 |
| Lighthouse Accessibility | ≥ 95 |
| Lighthouse Best Practices | ≥ 95 |
| LCP | < 1.5s |
| FID / INP | < 100ms |
| CLS | < 0.1 |
| JS bundle (homepage) | < 30KB |

These are achievable on Cloudflare Workers free tier with no special tuning, thanks to Astro's zero-JS-by-default model.

---

## Brand & licensing decisions

- **License:** MIT — maximum adoption, GPL-compatible (so WordPress.org accepts the WP plugin part)
- **Brand:** Aditya Sharma personal brand (5th product alongside Pickle, Jyotisha, YouTube MCP, RunCloud MCP)
- **Monetization:** Free OSS forever; paid headless WordPress migration consulting via [adityaarsharma.com/connect](https://adityaarsharma.com/connect) (no public pricing — leads contact for quote)
- **RankReady cross-recommendation:** Hatch directly recommends installing RankReady for users who want LLM/AEO optimization. Brand crossover is intentional and approved.

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the V1 → V2 → V3 plan.

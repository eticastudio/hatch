# Dynamic Content in Headless WordPress — Patterns That Actually Work

> "Headless can't handle dynamic content" is half-true. Static-fast pages are the easy part. Per-user, real-time, and personalized content needs a different architecture. This guide walks through every dynamic-content pattern, when to use which, and how Hatch handles each.

The dynamic-content question is the #1 reason senior devs reject headless. This page exists to address it head-on.

---

## The four types of "dynamic" content

Not all dynamic content is the same. Pro devs conflate these and then conclude "headless can't do dynamic." Untrue — but you have to pick the right pattern per type.

| Type | Example | Headless Pattern | Hatch handles via |
|---|---|---|---|
| **1. Public, often-updated** | Latest blog posts, category list, search results | Static + ISR (Incremental Static Regeneration) | `@hatch/revalidate` |
| **2. Per-user, infrequently changing** | "My account" dashboard, membership-gated content | Server-render on demand (SSR) with auth | `@hatch/auth` + `@hatch/membership` |
| **3. Per-request, computed** | Personalized recommendations, A/B variants, geo content | Edge SSR per request | Cloudflare Workers + documented pattern (V2 module) |
| **4. Truly real-time** | Live chat, presence indicators, live counts, multiplayer | Server-Sent Events / WebSocket | Out of Hatch scope — recommend dedicated service |

**The golden rule:** statify by default, dynamicify only what genuinely needs it. Most "dynamic" content is actually type 1 or 2 in disguise.

---

## Pattern 1 — Public Content (the easy case)

This is what headless does best. Pages are pre-rendered when content changes, served from edge cache, invalidated when WordPress updates.

### Architecture

```
WP editor publishes post
        ↓
WordPress fires save_post hook
        ↓
Hatch WP plugin POSTs to your-frontend.com/api/revalidate?secret=XXX
        ↓
Frontend invalidates relevant cached pages
        ↓
Next visitor gets fresh content (cached after first hit)
```

### What Hatch does

- `@hatch/revalidate` — webhook receiver + cache purge
- Astro starter pages use `output: 'server'` with edge caching
- Cloudflare Workers Cache API tags (V0.5)

### Code example

```astro
---
// src/pages/blog/[slug].astro
import { getPostBySlug } from '@/lib/hatch';

const { slug } = Astro.params;
const post = await getPostBySlug(slug!);

// Set cache headers — page is fresh for 5 min, then revalidates
Astro.response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
---
<article>
  <h1>{post.title}</h1>
  <div set:html={post.content} />
</article>
```

When WordPress fires the webhook, the cache for this slug is purged immediately. Editors see updates within ~5 seconds.

### Performance

- TTFB: ~ 50-100ms (edge cache hit)
- Cold cache miss: 200-400ms (fetch WP REST + render)
- Lighthouse Performance: 95-100

---

## Pattern 2 — Per-User Content (logged-in dashboards, gated content)

The visitor is authenticated. They see content specific to them or their role. Can't be cached at the page level — but can be optimized.

### Architecture

```
User logs in via /api/auth/login
        ↓
Frontend issues short-lived JWT (15 min) + httpOnly refresh token (7 days)
        ↓
Subsequent requests include JWT in Authorization header
        ↓
SSR route fetches user-specific data using JWT
        ↓
Page rendered fresh per request (no cache)
        ↓
Static assets (CSS, JS, images) still cached at edge
```

### What Hatch does

- `@hatch/auth` — JWT issuance + refresh + verification
- `@hatch/membership` — role/level checks against MemberPress / RCP / PMPro

### Code example

```astro
---
// src/pages/account.astro
import { requireAuth } from '@hatch/auth/astro';
import { getUserData } from '@/lib/hatch';

// Redirects to /login if no valid JWT
const user = await requireAuth(Astro);
const myData = await getUserData(user.id);

// No caching — this page is per-user
Astro.response.headers.set('Cache-Control', 'private, no-store');
---
<h1>Welcome back, {user.name}</h1>
<MyAccount data={myData} />
```

```astro
---
// src/components/Gate.astro
// Wraps content that requires a specific membership level
import { hasRole } from '@hatch/membership';
const { role = 'subscriber' } = Astro.props;
const allowed = await hasRole(Astro, role);
---
{allowed ? <slot /> : <p>This content is for {role}+ members. <a href="/upgrade">Upgrade</a></p>}
```

### Performance

- TTFB: 200-500ms (no cache, fresh fetch per request)
- Lighthouse Performance: 80-90 (slightly lower because of no edge cache)
- Mitigations: HTTP/2 push for static assets, prefetch user data on login, cache user profile JWT-side

### Why JWT instead of WordPress cookies?

WordPress cookies are domain-scoped to your CMS subdomain. Frontend is on a different domain. Cookies don't cross. JWT is stateless, transport-agnostic, and works cross-domain.

Bonus: JWTs are easier to revoke (per-token), audit (claims-based), and rotate (refresh flow).

---

## Pattern 3 — Per-Request Computed (personalization, A/B testing, geo)

The page changes based on the visitor's IP, cookies, or experiment assignment. Page output varies per request but the data source is deterministic.

### Architecture

```
Visitor hits your-domain.com/article/X
        ↓
Cloudflare Worker reads:
  - request.cf.country (geo)
  - cookies (returning visitor? in experiment?)
  - URL parameters
        ↓
Worker decides: serve variant A, B, or C
        ↓
Worker returns rendered HTML for chosen variant
        ↓
Static + variant decision = sub-100ms TTFB still
```

### What Hatch will do (V2 module: `@hatch/edge-personalize`)

```js
// src/middleware/personalize.ts (V2)
import { onRequest as personalize } from '@hatch/edge-personalize';

export const onRequest = personalize({
  experiments: {
    'hero-headline': { variants: ['A', 'B'], split: [0.5, 0.5] },
  },
  geo: {
    'US': { showBanner: 'us-pricing' },
    'IN': { showBanner: 'india-pricing' },
  },
});
```

Then in your page:

```astro
---
const { variant, geo } = Astro.locals.personalize;
---
<h1>{variant === 'A' ? 'Buy now' : 'Get started today'}</h1>
{geo?.showBanner && <Banner type={geo.showBanner} />}
```

### Performance

- Cloudflare Workers run at edge — no extra round-trip
- TTFB: same as static (~ 50-100ms) because Workers are inline
- Page weight: same as static

### V0.1 — without the module

Use Cloudflare Workers' built-in `request.cf` object directly in your Astro middleware, or use Vercel Edge Config. Pattern documented; module formalizes it in V2.

---

## Pattern 4 — Real-Time (live chat, presence, multiplayer)

Sub-second updates without page reload. Examples: BuddyPress activity feeds, bbPress threads with new replies, live counters, chat widgets.

### The honest answer

**Hatch is the wrong tool for this.** Headless WordPress is request-response. Real-time needs persistent connections (WebSocket, Server-Sent Events).

### What to do instead

| Need | Recommendation |
|---|---|
| **Chat widget** | [Crisp](https://crisp.chat), [Intercom](https://intercom.com), or self-hosted [Chatwoot](https://www.chatwoot.com) — embed via script tag, runs on their infra |
| **Live counter / notifications** | [Pusher](https://pusher.com), [Ably](https://ably.com), [Soketi](https://soketi.app) self-hosted |
| **Forum / threaded comments** | Discourse (self-hosted) or Disqus — both handle real-time on their infra |
| **Multiplayer / collaborative editing** | [Liveblocks](https://liveblocks.io), [PartyKit](https://www.partykit.io) |

These are dedicated products that do real-time well. Don't try to replicate them in Hatch.

### When the page just needs occasional updates (not real-time)

If you need updates every 30 seconds or longer, just use polling:

```astro
---
// src/components/LiveCounter.astro
---
<div id="counter">0</div>
<script>
  setInterval(async () => {
    const res = await fetch('/api/count');
    document.getElementById('counter').textContent = (await res.json()).count;
  }, 30000); // every 30s
</script>
```

Polling is lightweight, works with Hatch's static model, and is good enough for most "live-ish" use cases.

---

## Hybrid Architecture — the realistic pattern

Most real Hatch sites use ALL FOUR patterns:

```
example.com/                  → static + ISR (Pattern 1)  ← public marketing
example.com/blog              → static + ISR (Pattern 1)
example.com/blog/post-x       → static + ISR (Pattern 1)
example.com/account           → SSR per-user (Pattern 2)  ← logged-in
example.com/account/billing   → SSR per-user (Pattern 2)
example.com/upgrade           → SSR + edge personalize (Pattern 3) ← experiment
example.com/embedded-chat     → external service (Pattern 4) ← Crisp/Intercom
```

Each route picks the right pattern for the content it serves. Hatch makes this explicit:

```ts
// astro.config.mjs
export default defineConfig({
  output: 'server',  // enables SSR for routes that need it
  prerender: {
    // these routes are prerendered (Pattern 1)
    routes: ['/', '/blog', '/blog/[slug]', '/blog/category/[slug]'],
  },
});
```

---

## When NOT to use Hatch

If your site is **mostly** Pattern 4 (real-time) or **mostly** Pattern 3 (per-request personalization for every page), Hatch's value drops. You're not gaining the static-fast advantage. Stick with traditional WordPress + a good caching plugin, or use a more app-focused framework like Next.js with full SSR.

If your site is **mostly** Pattern 1 (public blog/marketing) and **partially** Pattern 2 (member dashboards), Hatch is perfect. This is 90% of WordPress sites.

---

## Performance comparison — all four patterns

| Pattern | TTFB | Page weight | Cache strategy | Lighthouse Perf |
|---|---|---|---|---|
| 1. Public + ISR | 50-100ms | < 100KB | Edge-cached, webhook-purged | 95-100 |
| 2. Per-user SSR | 200-500ms | < 150KB | Per-request, no cache | 80-90 |
| 3. Edge personalize | 50-100ms | < 100KB | Edge-cached per variant | 90-95 |
| 4. Real-time | N/A | varies | N/A (persistent connection) | depends on widget |

For comparison: **traditional WordPress** with caching plugin: 800-2000ms TTFB, 200-500KB page weight, Lighthouse 60-80.

Hatch's worst case (Pattern 2) is still better than traditional WP's best case.

---

## Summary

The "headless can't do dynamic" complaint comes from people who tried to force every dynamic pattern into the static-cache model. That's the wrong abstraction.

Hatch's approach:
- **Pick the right pattern per route**
- **Static + ISR for public content** (90% of sites — this is where headless wins big)
- **JWT-based SSR for per-user** (membership, account, dashboards)
- **Edge personalization for variants** (Cloudflare Workers — V2 module formalizes)
- **External services for real-time** (Pusher/Ably/Crisp — don't reinvent the wheel)

When you mix patterns intentionally instead of fighting the model, headless is genuinely better than traditional WP for performance, security, and developer experience.

---

## Further reading

- [Astro SSR docs](https://docs.astro.build/en/guides/server-side-rendering/) — official patterns
- [Cloudflare Workers + Astro](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) — edge SSR
- [JWT best practices RFC 8725](https://datatracker.ietf.org/doc/html/rfc8725) — auth security
- [Hatch edge cases](edge-cases.md) — 33 documented production gotchas with workarounds
- [Hatch security model](security.md) — auth, JWT, CSRF, secret handling

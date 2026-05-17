# Migrating from Frontity to Hatch

[Frontity](https://frontity.org/) was discontinued by Automattic in 2022. If you're still running a Frontity site, your stack is increasingly stale and unmaintained. Hatch picks up where Frontity left off — vendor-neutral, guided, and actively maintained.

## TL;DR

| Frontity concept | Hatch equivalent |
|---|---|
| `@frontity/wp-source` | `src/lib/hatch.ts` (server-only WordPress client) |
| `@frontity/tiny-router` | Astro file-based routing (`src/pages/`) |
| Frontity packages | Hatch modules (`@hatch/*`) |
| Frontity state (Redux-like) | Astro server props + Astro Islands for client state |
| Frontity themes | Astro layouts + components |
| Frontity SSR (Node) | Astro SSR (multi-host: Cloudflare/Vercel/VPS) |
| Frontity build process | `npm run build` (Astro) |

## Why migrate?

- **Frontity is unmaintained** — last release Feb 2022. No bug fixes, security patches, or new features.
- **Frontity is React/Next.js only** — Hatch supports Astro now (Next.js coming in V2)
- **Hatch ships solutions** — forms, comments, search, membership, redirects all built in (Frontity left these as DIY)
- **Hatch is faster** — Lighthouse 95-100 default vs Frontity's 70-80
- **guided** — Hatch's Claude Code plugin walks you through migration

## Migration path

### Step 1 — Audit your Frontity site

```bash
# Find your Frontity packages
cat package.json | grep "@frontity\|frontity"

# Find your custom themes
ls packages/  # Frontity stores themes here

# Count your posts
curl -s [your-wp]/wp-json/wp/v2/posts?per_page=1 -I | grep x-wp-total
```

Make a list:
- Custom theme components → need to be ported to Astro
- Custom Frontity packages → check if a Hatch module exists, else write one
- Custom routes → map to Astro pages

### Step 2 — Run `/hatch-migrate`

If you have Claude Code, run:

```
/hatch-migrate
```

This walks you through:
1. Inventorying your existing setup
2. Mapping Frontity packages → Hatch modules
3. Setting up the Hatch Astro starter
4. Importing your URL structure (preserves SEO)

Or follow the manual path below.

### Step 3 — Manual migration

```bash
# 1. Create a parallel Hatch project
npm create hatch@latest my-site-hatch
cd my-site-hatch
cp .env.example .env
# Edit with your WP credentials

# 2. Run Hatch alongside Frontity
npm run dev
# Frontity runs at :3000, Hatch runs at :4321

# 3. Verify URL parity
# Visit /blog/some-post on both → confirm content matches

# 4. Port custom theme components
# Frontity uses Emotion (CSS-in-JS) → Hatch uses Tailwind 4
# Frontity uses styled.div → Hatch uses Astro components
```

#### Component porting example

**Before (Frontity):**

```jsx
// frontity-theme/components/post.js
import { connect, styled } from "frontity";

const Post = ({ state }) => {
  const data = state.source.get(state.router.link);
  const post = state.source[data.type][data.id];
  return (
    <Container>
      <Title dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
      <Body dangerouslySetInnerHTML={{ __html: post.content.rendered }} />
    </Container>
  );
};

const Container = styled.div`max-width: 800px; margin: 0 auto;`;
const Title = styled.h1`font-size: 3rem;`;
const Body = styled.div`color: #444;`;

export default connect(Post);
```

**After (Hatch / Astro):**

```astro
---
// src/pages/blog/[slug].astro
import { getPostBySlug } from '@/lib/hatch';
const { slug } = Astro.params;
const post = await getPostBySlug(slug!);
if (!post) return new Response('Not found', { status: 404 });
---
<div class="max-w-3xl mx-auto">
  <h1 class="text-5xl" set:html={post.title} />
  <div class="text-neutral-700" set:html={post.content} />
</div>
```

Cleaner, faster, type-safe. No Redux. No connect().

### Step 4 — URL parity

Frontity defaults to `/blog/[year]/[month]/[slug]` if your WP permalinks use date prefixes. Hatch defaults to `/blog/[slug]`.

To match Frontity's URLs, edit `astro.config.mjs` or rename your pages. Or update WP permalinks (Settings → Permalinks → Post name) and let Hatch take over.

### Step 5 — Cutover

```bash
# 1. Make Hatch project production-ready
npm run build
# Deploy to your chosen host (see docs/hosting/)

# 2. Verify on staging subdomain first
# staging.yourdomain.com → Hatch
# yourdomain.com → still Frontity

# 3. When ready, flip DNS
# yourdomain.com → Hatch
# (Frontity can stay running for a week as backup)

# 4. Resubmit sitemap to Google Search Console
# (URL structure should match — minimal SEO impact)
```

## Need help?

Frontity migrations are usually 1-3 hours of work for a typical blog. For large/custom sites or business-critical migrations, [contact Aditya for paid migration help](https://adityaarsharma.com/connect).

## Why Hatch is the right Frontity successor

- Same audience (headless WordPress devs)
- Same problem (decouple WP from a fast frontend)
- Same vendor-neutral philosophy (no host lock-in)
- More complete (modules for forms / comments / search / etc. — Frontity left these as DIY)
- guided (Claude Code plugin handles the boring parts)
- Better tech (Astro 6 vs Next.js — Lighthouse 95-100 vs 70-80)
- Actively maintained (Aditya commits weekly, plus community)

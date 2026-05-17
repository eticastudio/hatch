# What is Headless WordPress? (the plain-English version)

> **[← Back to README](../README.md)**

If you're new to headless, this is the page to start on. No jargon, no marketing-speak — just the actual concept with real diagrams.

---

## The restaurant analogy

> **Imagine your WordPress site like a restaurant.**
>
> 🍳 The **kitchen** (WordPress) is where your team prepares everything — writes posts, uploads images, manages SEO.
>
> 🍽️ The **dining room** (your public website) is where visitors actually eat.
>
> Today, the kitchen and dining room are mashed into one room. Every customer walking in can see the kitchen door, knock on it, try to break in. The kitchen also has 22 years of clutter slowing service down.
>
> **Headless WordPress** separates them: the kitchen stays private (only your team has the key), and the dining room is brand new — modern, fast, beautiful, and built differently so it's much harder to attack.

That's it. Same chefs, same recipes, same menu. Different dining room.

---

## Two pictures

### Today — traditional WordPress

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#fef2f2","primaryTextColor":"#0f172a","primaryBorderColor":"#dc2626","lineColor":"#64748b","secondaryColor":"#f1f5f9","tertiaryColor":"#f1f5f9","fontSize":"15px"}}}%%
flowchart LR
    Visitor("👤 Visitor"):::neutral
    Bot("🤖 Hacker bot"):::neutral
    Editor("✏️ Editor"):::neutral
    WordPress["🐢 WordPress<br/>━━━━━━━━━<br/>everything in one place<br/>4-8s page load<br/>public attack surface"]:::bad
    Theme["Theme + 30 plugins<br/>render the page"]:::bad

    Visitor -->|HTTP| WordPress
    Bot -->|brute-force /wp-login.php| WordPress
    Editor -->|edits| WordPress
    WordPress --> Theme
    Theme --> Visitor

    classDef neutral fill:#e2e8f0,color:#0f172a,stroke:#475569,stroke-width:2px
    classDef bad fill:#fee2e2,color:#7f1d1d,stroke:#dc2626,stroke-width:2px
```

The public, your team, AND every hacker bot all hit the same WordPress box. Page load drags. Bots probe `wp-login.php` 24/7. Every plugin is an attack surface.

### With Hatch — headless

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#dcfce7","primaryTextColor":"#0f172a","primaryBorderColor":"#16a34a","lineColor":"#64748b","secondaryColor":"#dbeafe","tertiaryColor":"#e2e8f0","fontSize":"15px"}}}%%
flowchart LR
    Visitor("👤 Visitor"):::neutral
    Bot("🤖 Hacker bot"):::neutral
    Editor("✏️ Editor"):::neutral
    WordPress["🔒 WordPress<br/>━━━━━━━━━<br/>HIDDEN backend<br/>private to your team"]:::good
    Frontend["⚡ Astro frontend<br/>━━━━━━━━━<br/>under 1s page load<br/>public, but no admin"]:::cool

    Visitor -->|HTTP| Frontend
    Bot -.->|blocked, cannot see backend| WordPress
    Editor -->|edits via /hatch-login| WordPress
    Editor -.->|publishes| WordPress
    WordPress -->|webhook + API| Frontend
    Frontend --> Visitor

    classDef neutral fill:#e2e8f0,color:#0f172a,stroke:#475569,stroke-width:2px
    classDef good fill:#dcfce7,color:#14532d,stroke:#16a34a,stroke-width:2px
    classDef cool fill:#dbeafe,color:#1e3a8a,stroke:#2563eb,stroke-width:2px
```

Visitors hit a separate static frontend that loads in under 1 second. WordPress lives somewhere else — your team accesses it on a private URL only you know. Bots that probe the old endpoints get 404s and 401s.

---

## Why this is faster

In traditional WordPress, your visitor waits while WordPress assembles the page on every visit:

```
Visitor request → WordPress boot → DB queries (10-50) → plugins run →
theme renders → assemble HTML → maybe cache it → ship to visitor
≈ 3-8 seconds
```

With Hatch, the page is **pre-rendered** and stored on a global edge network:

```
Visitor request → CDN edge serves cached HTML
≈ 150-400ms anywhere in the world
```

That's why Linear, Vercel docs, Stripe docs, and every modern marketing site is built this way. Speed is a competitive advantage now — Google penalizes slow sites in search rankings, and visitors abandon pages that take longer than 3 seconds.

---

## Why this is unhackable (or close to it)

WordPress is the most-attacked CMS on the internet because 43% of all websites run it. Attackers hit:

- `/wp-login.php` — millions of brute-force attempts per day
- `/wp-json/wp/v2/users` — scrapes your team's usernames
- `/xmlrpc.php` — amplifies brute-force attacks
- 30+ active plugins — each with its own vulnerability surface
- Old themes — known holes

With Hatch headless, **the public never sees any of this**:

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#dbeafe","primaryTextColor":"#0f172a","primaryBorderColor":"#2563eb","lineColor":"#64748b","clusterBkg":"#f8fafc","clusterBorder":"#475569","fontSize":"14px"}}}%%
flowchart TB
    subgraph Public["🌐 What the public sees"]
        Front["Static HTML pages<br/>No login form · No PHP<br/>No plugins · Nothing to attack"]:::cool
    end
    subgraph Hidden["🔒 What Hatch hides from the public"]
        Login["/wp-login.php → 404"]:::good
        Users["/wp-json/wp/v2/users → 401"]:::good
        XML["xmlrpc.php → disabled"]:::good
        Admin["/wp-admin → masked to custom slug"]:::good
    end
    Editor("✏️ Your team"):::neutral
    Editor -->|knows the secret URL| Admin

    classDef neutral fill:#e2e8f0,color:#0f172a,stroke:#475569,stroke-width:2px
    classDef good fill:#dcfce7,color:#14532d,stroke:#16a34a,stroke-width:2px
    classDef cool fill:#dbeafe,color:#1e3a8a,stroke:#2563eb,stroke-width:2px
```

The frontend is just static HTML — there's nothing to hack. The WordPress backend is hidden behind a custom URL only your team knows. Bots probing the old URLs get 404s. **Hatch automates all of this** in the [Security tab](../README.md#%EF%B8%8F-security) of the WP admin.

---

## "I already run WordPress. Why do I need Hatch?"

Maybe you don't. But if any of these are true, Hatch saves you weeks:

- 😩 Your WordPress site loads in **3–8 seconds** and Google penalizes you
- 🔓 You're tired of `wp-login.php` brute-force attacks and security work
- 🐢 Mobile performance stays bad no matter how many caching plugins you stack
- 🤖 You want to rank in **ChatGPT, Perplexity, Claude** answers, not just Google
- 💸 Your hosting + caching + CDN + security plugin bill keeps growing
- 🎨 You want a modern frontend but every headless tutorial is 30+ hours of plumbing
- 👥 You're not a developer and have been told this needs a senior engineer

---

## The technical flow

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#dbeafe","primaryTextColor":"#0f172a","primaryBorderColor":"#2563eb","lineColor":"#475569","actorBkg":"#dcfce7","actorBorder":"#16a34a","actorTextColor":"#14532d","noteBkgColor":"#fef3c7","noteTextColor":"#78350f","noteBorderColor":"#d97706","fontSize":"14px"}}}%%
sequenceDiagram
    participant Editor
    participant WP as WordPress<br/>(Hatch plugin)
    participant Frontend as Astro Frontend<br/>(Hatch starter)
    participant Visitor

    Note over Editor,Visitor: Editor publishes a post
    Editor->>WP: Click "Publish" in Gutenberg
    WP->>WP: save_post hook fires
    WP-->>Frontend: POST /api/revalidate (with secret)
    Frontend->>Frontend: Purge cached pages

    Note over Editor,Visitor: Visitor lands on the site
    Visitor->>Frontend: GET /blog/post-slug
    Frontend-->>Visitor: Pre-rendered HTML (under 400ms from edge)

    Note over Editor,Visitor: Behind the scenes
    Frontend->>WP: GET /wp-json/wp/v2/posts (build-time or ISR)
    WP-->>Frontend: JSON with App Password auth
```

---

## So what does Hatch actually DO in this picture?

Hatch is the **WordPress plugin** in those diagrams — the thing that:

1. **Hardens** WordPress so it's hidden from the public
2. **Bridges** your existing plugins (RankMath, Yoast, ACF, WPForms, etc.) so their data flows cleanly to the frontend
3. **Generates** the Application Password your frontend needs
4. **Fires webhooks** to your frontend when content changes
5. **Pushes updates** to your VPS frontend via the Hatch Agent (RunCloud-style daemon)
6. **Provides 8 Gutenberg blocks** that work headlessly with Tailwind output

The frontend half (Astro starter, themes) is separate — you deploy it on Cloudflare, Vercel, Netlify, or your own VPS.

---

## Ready to try?

→ **[Download Hatch v0.5.0](https://github.com/adityaarsharma/hatch/releases/latest/download/hatch.zip)**

Or read the [main README](../README.md) for the full feature list and install instructions.

---

## Related docs

- [Enterprise Readiness](enterprise-readiness.md) — what Hatch needs to graduate from "well-architected" to "production-proven"
- [GraphQL vs REST](graphql-vs-rest.md) — why Hatch uses REST instead of WPGraphQL
- [Edge Cases](edge-cases.md) — 33 documented headless WP gotchas and how Hatch handles them
- [Security](security.md) — the security model in detail
- [Dynamic Content](dynamic-content.md) — how to handle ISR, real-time, forms

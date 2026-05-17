# Getting started with Hatch

The 5-minute path to a headless WordPress site.

## Prerequisites

- A WordPress 6.0+ site (existing or fresh)
- Admin access to that WP site
- Node 20+ on your local machine
- A target deploy host (Cloudflare Workers / Vercel / VPS / Netlify)

## The 5 steps

### 1. Install the Hatch WordPress plugin

WP Admin → Plugins → Add New → search **"Hatch"** → Install + Activate.

(Or download from https://github.com/adityaarsharma/hatch/releases.)

After activation, go to **Tools → Hatch** to see the detection report.

### 2. Recommended companion plugins

Hatch auto-detects and bridges these. We recommend at least one of each:

| Purpose | Recommended | Notes |
|---|---|---|
| **SEO** | RankMath (free) | Or Yoast — Hatch supports both. |
| **LLM/AEO ranking** | RankReady | Optional. Adds Speakable + AEO schemas for ChatGPT/Perplexity ranking. |
| **Forms** | Fluent Forms (free) | Or WPForms / Gravity / Contact Form 7. |
| **Spam protection** | (frontend only) | Hatch's `@hatch/shield` handles this — install Cloudflare Turnstile. |
| **Backups** | UpdraftPlus or BlogVault | Always backup before going headless. |

### 3. Generate Application Password

WP Admin → Users → Profile → scroll to **Application Passwords** → name it "Hatch" → Add. Copy the generated password.

### 4. Scaffold the Astro frontend

```bash
npm create hatch@latest my-blog
cd my-blog
```

Edit `.env` with your WP credentials:

```
WP_API_URL=https://cms.example.com/wp-json/wp/v2
WP_API_USER=editor
WP_API_PASS="paste the application password"
HATCH_WEBHOOK_SECRET=copy from WP Admin → Tools → Hatch
PUBLIC_SITE_URL=http://localhost:4321
```

Run:

```bash
npm install
npm run dev
```

Visit `http://localhost:4321/blog` — your WordPress posts should appear with full SEO + JSON-LD schema.

### 5. Deploy

Pick a host:

- **[Cloudflare Workers](hosting/cloudflare-workers.md)** ← recommended (free, fast, global)
- **[Vercel](hosting/vercel.md)** ← fastest deploys
- **[Existing VPS](hosting/vps-runcloud.md)** ← if you already have a server
- **[Netlify](hosting/netlify.md)** ← Vercel alternative

After deploy, go back to WP Admin → Tools → Hatch and update the **Revalidation webhook URL** to your live frontend.

## Or: use the Claude Code plugin

If you have [Claude Code](https://claude.com/claude-code), install the Hatch plugin and run:

```
/hatch-init
```

Claude will guide you through every step interactively.

## Next steps

- [Add modules](modules/) (forms, comments, search, membership, ...)
- [Migrate from Frontity](frontity-migration.md)
- [Optimize for LLM ranking with RankReady](modules/llm-seo.md)

## Need help?

- [GitHub Discussions](https://github.com/adityaarsharma/hatch/discussions) — community support
- [GitHub Issues](https://github.com/adityaarsharma/hatch/issues) — bug reports
- [Paid migration consulting](https://adityaarsharma.com/connect) — for businesses

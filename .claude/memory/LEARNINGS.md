---
project: Hatch
wing: Etica
sub_wing: Hatch
created: 2026-08-05
brain: aditya
---

# LEARNINGS.md

Corrections + gotchas, feeds cross-session auto-learn.

---

## HARD LEGAL RULE: NEVER COPY CODE OR DESIGN (2026-08-12)

Verbatim from Aditya: "Make sure these guys never say oh Hatch copied form. I can't afford legal claim. NEVER EVER a person's code is copied. Anything ever. Be design, code, sab kuch."

### What it means
- **Zero lines** copied from any external repo, ever. This blocks copying from AGPL, GPL, MIT, Apache, BSD, StackOverflow snippets, and every other source outside Aditya's own products.
- **No design copies.** This blocks copying layouts, component structures, CSS class naming, and visual patterns pixel-for-pixel.
- **Reference only.** Read to LEARN the pattern. Then implement fresh from first principles.
- **Improvise + improve.** After learning, write it logically better.

### What IS fine
- Public REST/API contracts (WooCommerce Store API, WordPress REST, Stripe API, OAuth flows, JSON:API shapes, GraphQL schemas).
- Standards docs (WCAG, RFC, W3C, HTML/CSS specs).
- Personal reasoning + Aditya's own past code across his projects.
- Public technical writing (blog posts as concept for a fresh implementation).

### What is banned (even under permissive licenses)
- External repos even if MIT-licensed. Avoids "we copied you" claim regardless of license.
- Design system copies. Shadcn, Radix, Tailwind UI templates: reference only, never direct copy.
- AI-completion of another author's code. If a tool suggests "this is what WooNuxt does", reject and write fresh.
- Stack Overflow answers copied verbatim.

### Self-check before shipping any file
1. Did I copy any function, class, CSS rule, HTML structure, or comment verbatim from an external repo? → REWRITE from scratch.
2. Is my code a client of a public API contract? → Fine. Cite the API docs URL, never the reference repo.
3. Did I read another repo to LEARN the pattern? → OK. State in header: "pattern studied (not copied): <repo>. Original implementation of the public <API> contract."
4. Design ideas from a reference? → Improvise. Change spacings, radii, colors, timings to be logically better.

### Why the stakes are high
- Products ship at 500K+ install scale (RankReady, TPAE, Nexter, Sticky Header).
- A single license infringement claim would nuke the plugin from WP.org.
- "Vibe coded from repo X" is what a claimant seizes on. Every future session writes clean-room original code.

### Applied context (2026-08-12)
Built /checkout.astro + /order-summary.astro. Referenced READ ONLY:
- scottyzen/woonuxt (GPL-3.0) for UX flow. Zero lines copied.
- WooCommerce Store API docs for the public payload contract.
- Ardesh1r/astro-woocommerce (MIT) file structure inspection only. Zero lines copied.

Result: original Hatch implementation of the public /wc/store/v1/checkout endpoint. Diff against WooNuxt's checkout.vue shows independent implementation (Vue vs Astro, different naming, different structure, different CSS tokens).

---

## Prior learnings

### 2026-08-06: Git destructive commands banned
NEVER run: `git reset --hard`, `git reset HEAD~`, `git reset <commit>`, `git branch -D`, `git clean -fd`, `git rm -r`. Aug 6 2026 incident destroyed hours of work when a subagent ran these. Hook `deny-dangerous.sh` blocks at tool layer, but reverify.

### 2026-08-12: Bridge = REST only, no plugin CSS/JS
Every Bridge (SEO, Forms, Woo, ACF, CPT, Redirects, Menus, SMTP, Membership) exposes REST endpoints on WP side. Astro renders native components with Hatch tokens. Zero WordPress plugin CSS or JS ever ships to Astro. Brain: drawer_Etica_architecture_a308840cf90cc7d7cf3a8ecf.

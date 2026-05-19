# Hatch — Product brief

## What it is

Hatch is a WordPress plugin that turns a standard WP install into a **headless CMS** shipping an Astro frontend. WordPress stays the editor; Astro becomes the public site. Plugin source: `wp-plugin/`. Astro starter: `astro-starter/`. Broker: `hatch-deploy/`. Live marketing: `hatch.adityaarsharma.com`.

Two surfaces a designer touches:

1. **The marketing site** (`hatch.adityaarsharma.com`) — **brand register**. Sells the product. Pure orange, big type, hero energy.
2. **The plugin admin dashboard** (loaded inside wp-admin) — **product register**. Operates the product. Monochrome, restrained, Stripe/Vercel/Linear cadence.

Both share tokens (see DESIGN.md) but apply them at different intensities. Treat them as two registers of one voice, not two products.

## Users

Mid-technical WordPress site owners and small agency builders. They've heard "headless" but didn't want to write Next.js by hand. They open the dashboard ~3 times a week with a single question each visit:

- "Is my site connected and healthy?" — daily
- "How does it look?" — weekly while tuning
- "What does it expose?" — when adding a CPT/form/ACF
- "Is it fast?" — when something feels slow
- "Is it locked down?" — rare, high-stakes
- "Something's wrong, where do I look?" — when stuck

Each tab answers exactly one question. No overlap.

## Tone

**Direct, calm, operator-grade.** This is not a SaaS funnel. The user is already inside; we don't need to sell them. We need to keep their eye on data and never make them ask "is this thing on?"

Specific don'ts:
- No exclamation marks anywhere ("Great work!" / "Success!").
- No emojis in section headers (chick 🐣 is the brand mark — it appears in the masthead, once).
- No "Let me help you..." copywriter voice — just labels and verbs.
- No orange chrome. Orange is the brand color but in the admin it stays as accent only (focus rings, prose links, the chick mark, the alive-pulse).
- No motion that exceeds 240ms. Saving feels instantaneous; the bar slides in and out, doesn't bounce.

## Anti-references

What Hatch admin must NOT look like:

- **WordPress core admin** (`wp-admin` blue + grey). We're inside it but our pages should feel like a separate, calmer surface — not a continuation of WP's chrome.
- **WP plugin defaults** (Elementor / Yoast / Rank Math marketing-y page). Those pages sell you upgrades; ours doesn't sell anything.
- **Material Design** (heavy shadows, button shadows, ripple). Too consumer.
- **Tailwind-default Vercel rip-off** (purple/blue gradient cards). Too generic SaaS.
- **Bento-grid landing-page energy.** This is a settings panel, not a feature wall.

## Component invariants

These are the cheap-to-check, easy-to-break rules. If any of these breaks, the design has drifted. Verify EVERY time the dashboard is touched, not only when something is reported.

- **Toggles** — track off = `var(--hx-border-2)`, track on = `var(--hx-fg)` (black), knob white, focus ring orange. Never WP-admin green.
- **Toggle layout** — `label left, switch right`, in a row with `justify-content: space-between`. Never stacked.
- **Segment chips** — selected = black border + black text on white bg. Never orange.
- **Primary buttons** — black pill (`var(--hx-fg)`) by default. Orange (`.is-brand`) reserved for the one rare hero CTA per surface.
- **Pills** — `padding: 4px 10px`, `border-radius: 999px`, `font-size: 11.5px`. Use semantic `--hx-*-fg` on `--hx-*-2` backgrounds.
- **Cards** — `border-radius: 14px`, `padding: 22px`, `border: 1px solid var(--hx-border)`. Static cards do NOT get hover effects (false affordance).
- **Inputs / selects** — `height: 36px`, `padding: 0 12px`, `border: 1px solid var(--hx-border-2)`. Hover darkens border to `--hx-muted`. Focus = orange ring.
- **Section headers in collapsibles** — `<summary>` has a `▸ → ▾` chevron, hover bg, cursor pointer.
- **No em dashes anywhere in user-facing strings.**

## Verification process

When auditing the dashboard:

1. **Open every `<details>` section.** Bugs hide inside collapsed drawers; an audit that doesn't expand them is incomplete.
2. **Touch every form-control state.** Default, hover, focus, checked, disabled. Each gets a screenshot.
3. **Eyeball every screenshot.** A grep can confirm the absence of `#16a34a`, but only an eye can tell you the toggle is the wrong green.

## Strategic principles

1. **One question per tab.** Connection / Design / Content / Performance / Security / Status. No tab does two jobs.
2. **Bridge, don't duplicate.** Site Title comes from WP General Settings — don't re-ask. Redirects come from RankMath/Yoast — read, don't store. Code snippets bridge to WPCode plugin if installed — don't compete.
3. **One primary action per surface.** Black pill, no exceptions. Orange is reserved for the rare brand-action CTA, never for save/edit/run.
4. **Save bar handles all writes.** No in-card "Save" buttons. The sticky pill at the bottom is the single commit point; every form is AJAX-intercepted.
5. **Restraint reads as confidence.** The marketing site can shout; the admin whispers.
6. **Single source of truth for design tokens** — `DESIGN.md` mirrors the marketing site's `:root` block exactly. When the landing page updates, mirror it here.

## Frequency-of-use ordering

Most-touched on the left, rarest on the right:

`Connection · Design · Content · Performance · Security · Status`

Status is intentionally last — it's the "I'm stuck" destination, not a daily.

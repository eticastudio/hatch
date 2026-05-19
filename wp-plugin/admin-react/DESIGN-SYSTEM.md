# Hatch Admin Design System

The canonical reference for every component, token, and pattern used in the
Hatch WordPress admin React app. Locked from the Claude Design v2 bundle
(2026-05-18). All future features must follow these rules — no exceptions.

The point: the admin should feel premium and consistent regardless of who
builds the next tab. Designers and engineers both read from this doc.

---

## 1. Tokens

OKLCH-ish neutrals tinted toward the brand hue. Light surface, monochrome
chrome, orange used **only** as the accent (under 10% of total color).

```css
--hx-bg:        #fafafa;   /* page canvas */
--hx-surface:   #ffffff;   /* card / panel */
--hx-surface-2: #f4f4f5;   /* inset / pill bg */
--hx-fg:        #0a0a0a;   /* primary text */
--hx-muted:     #525252;   /* secondary text */
--hx-subtle:    #737373;   /* tertiary, captions */
--hx-border:    #e5e5e5;   /* standard separation */
--hx-border-2:  #d4d4d4;   /* hover / emphasis */
--hx-primary:   #ff6b00;   /* orange — sparingly */
--hx-primary-3: #fff3e8;   /* soft orange — selected bg */
--hx-success:   #16a34a;
--hx-warning:   #d97706;
--hx-danger:    #b91c1c;
--hx-info:      #2563eb;
--hx-ease:      cubic-bezier(0.16, 1, 0.3, 1);
```

**Save bar override:** `#18181b` (warm dark zinc-900) — not pure black, never
`var(--hx-fg)`. Pure black under heavy box-shadow looks harsh; the warm dark
softens the contrast against the orange Save button.

---

## 2. Component contracts

These are the only primitives allowed. Don't roll your own button, toggle, or
card — extend or compose these.

### HxIcon
SVG 24×24 viewBox, `strokeWidth=1.75`, `strokeLinecap=round`. Color via `color`
prop or inherits from parent. Size 12–22px depending on context (12 inline,
14 in row, 18 in icon-box, 22 in big icon-box).

### HxToggle
- 40 × 24 pill
- **ON = `--hx-fg` (black). OFF = `--hx-border-2` (grey).**
- **NEVER orange.** That's the absolute ban. Orange is for accents, not state.
- White thumb 18 × 18, 1px shadow.
- 180ms transition on `--hx-ease`.

### HxBtn
Pill, `border-radius: 999px`.
- **Default**: black bg, white fg. The "carry the surface" button.
- **Brand**: orange bg, **black fg** (not white — 6.4:1 contrast). One per surface max.
- **Ghost**: white bg, 1px border, black fg, font-weight 500 (quiet).
- **Danger**: red bg, white fg.

Padding: `10px 20px` (`md`), `7px 14px` (`sm`). 14px font, 600 weight (except ghost 500).
Hover: opacity 0.84 + translateY(-1px). Easing on `--hx-ease`.

### HxBadge
Pill, 12px font, 600 weight, `3px 10px` padding. Color variants:
neutral / orange / green / yellow / red / blue / mono.

### HxCard
- 14px radius, 22px padding, 1px hx-border.
- Static cards: **no hover effect** (lying about interactivity).
- Add `hover` prop only when the whole card IS the click target.
- Status variants (`is-success` / `is-warning` / `is-danger` / `is-info`) tint
  border + background.

### HxRow
Setting row inside a card: label left, control right, 1px border-bottom,
13/0 padding, 44px min-height. `last={true}` removes the bottom border.

### HxHead (was HxSectionHead)
Top-of-card header. **38×38 icon-box with `ibg()`-tinted background** + title
+ desc. Margin-bottom 20 (or 16 / 0 via `mb` prop when collapsing into a row).

```jsx
<HxHead
  iconChildren={<><circle .../></>}
  iconColor="#8b5cf6"   // resolved through ibg() to its soft variant
  title="Typography"
  desc="Font choices propagate to your frontend via CSS variables."
/>
```

### HxSeg
Segmented control: `surface-2` bg, padding 3, gap 2, white-thumb on the active
option with 1.5px black border. Selected weight 600.

### HxGL (GroupLabel)
11px uppercase, 700 weight, `0.07em` letter-spacing, padding `18 0 6`. Used
inside cards as a "sub-section" divider.

### HxInp
36px height, 8px radius, 1px hx-border-2, 13px font. Border colour shifts to
`--hx-fg` on focus. `mono` prop = monospaced (for IDs, slugs, hex).

### Chip
Pill, 13px, 500 weight. Active = black bg + white fg + 1.5px black border.
Inactive = white bg + grey border + muted text. **The base for Density,
Roundness, Width, Button style pickers.**

---

## 3. `ibg()` icon background helper

Every section icon-box uses a tinted bg behind a saturated icon. The helper
maps brand colours to their soft companions:

```js
const IBGS = {
  '#ff6b00': '#fff3e8',  // brand orange → soft orange
  '#2563eb': '#eff6ff',  // info blue
  '#16a34a': '#f0fdf4',  // success green
  '#d97706': '#fffbeb',  // warning amber
  '#b91c1c': '#fef2f2',  // danger red
  '#8b5cf6': '#f5f3ff',  // violet
  '#0d9488': '#f0fdfa',  // teal
  '#6366f1': '#eef2ff',  // indigo
  '#10b981': '#ecfdf5',  // emerald
  '#ef4444': '#fef2f2',  // red
  '#737373': '#f5f5f5',  // neutral
};
const ibg = c => IBGS[c] || c + '18';
```

Every `HxHead` icon-box must use this. Free-rolling colours fragment the
system; the map keeps tints harmonised.

---

## 4. Tab nav

**Pill segmented control**, centred, not full-width. Surface-2 background with
1px border + 4px padding wrapping `border-radius: 999`. Active tab = white bg
+ subtle shadow + black text. Inactive = transparent + subtle text.

Badge: orange/amber pulse dot in the top-right of a pill when that tab needs
attention (e.g. Security with hardening disabled).

---

## 5. Save bar

Fixed bottom-centre pill, 24px from the bottom. Three states:
- **Dirty**: `#18181b` warm dark, white text at varying opacity. Includes
  `⌘S` keyboard hint badge. Discard (ghost) + Save (orange).
- **Saving**: same dark surface, spinner + "Saving…".
- **Saved**: green tint (`#f0fdf4` bg, `#bbf7d0` border), 2.2s auto-dismiss.

Pop-in animation: `popIn 0.2s var(--hx-ease)`. Respects `prefers-reduced-motion`.

---

## 6. Animations

```css
@keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
@keyframes popIn  { from { opacity:0; transform:translateX(-50%) translateY(8px) scale(.97); } to { opacity:1; transform:translateX(-50%) translateY(0) scale(1); } }
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
.tab-enter   { animation: fadeUp .2s  var(--hx-ease) both; }
.save-enter  { animation: popIn  .2s  var(--hx-ease) both; }
.modal-enter { animation: fadeIn .18s var(--hx-ease) both; }
```

Tab switch re-mounts via `key={tab}` so the animation re-fires.

**Never** animate layout properties (`width`, `top`, `margin`). Only
`opacity`, `transform`, `background`, `border-color`, `box-shadow`.

---

## 7. Layout rhythm

- **Card stack gap**: 14px.
- **Card padding**: 22px (or 0 if hosting nested collapsibles → child padding `13px 22px`).
- **Header icon-box → title gap**: 14px.
- **HxHead `mb`**: 20 standard, 16 if directly followed by a grid, 0 if collapsing into a Row.
- **Page max-width**: 760 default, 640 / 900 via Tweaks. Header centered above.

---

## 8. Setup Wizard

3-step modal triggered from "Change host" + footer link.
1. **Preflight** — 6 visual checks (REST, Application Password, webhook,
   permalinks, HTTPS, custom domain).
2. **Theme** — 2-column grid with SVG mini-previews.
3. **Deploy** — Cloudflare / Vercel / VPS / Local options with details panel.

Footer has Back / Continue (or Cancel / Launch site ↗ on last step). Progress
strip = 3 pill segments at top, filled in orange as you go.

---

## 9. Smart inline tips

Amber alert: `#fff7ed` bg, `#fed7aa` border, 10px radius, `12px 14px` padding.
Triangle warning icon + bold heading + supporting text + ghost "Enable →"
button. Used when a setting combination produces a known suboptimal state
(e.g. GTM configured + Partytown off → "Run GTM in a background worker").

These trigger conditionally based on saved state. Never fire on every paint.

---

## 10. Theme cards

3-column grid (or 2-column inside the Setup Wizard). 12px radius, 14/16
padding, surface-2 bg. Selected: 2px brand border + 5% tint background.

**Every theme has a built-in SVG mini-preview** (80×48 viewbox) showing its
actual visual style:
- **Blog**: image header + article rows (blue)
- **Tech**: dark editor with code lines (violet)
- **Data**: sidebar + content grid (teal)
- **AstroPaper**: minimal centered (orange)
- **AstroWind**: marketing hero + feature cards (blue)
- **Astro Nano**: pure text column (neutral)

These are inlined as React fragments in `TP` (theme previews) map.

---

## 11. Copy rules

- **No em-dashes.** Use commas, colons, periods, semicolons, parentheses.
  Already enforced via `npm run lint` once added.
- **Sentence case** for everything except product names (Cloudflare, Vercel, GTM, etc.).
- **No "AI-slop" hero metric layouts.** No big-number-plus-tiny-label cards.
- **Tell the user the why**, not just the what:
  - Bad: "Enable image pipeline"
  - Good: "Auto-converts WP media to WebP/AVIF on the fly, served from your own domain"
- **No nested cards.** A card inside a card always reads as broken.
- **Each REST endpoint is named in copy** so users can debug:
  `/hatch/v1/features`, `/hatch/v1/comments`, etc.

---

## 12. Forbidden patterns

Match-and-refuse list. If a PR contains any of these, it gets rejected:

1. **Side-stripe borders** — `border-left: 3px solid <color>` on cards/rows.
   Always feels like an alert. Replace with full border + tinted bg or icon-box.
2. **Gradient text** — `background-clip: text` + gradient. Use weight/size for emphasis.
3. **Glassmorphism** as a default — `backdrop-filter: blur()` on cards. Reserved for the floating save bar at most, and even there only on dark surfaces.
4. **Hero metric template** — Big stat + small label + accent stripe. SaaS cliché.
5. **Identical card grids** — Same-size icon+heading+text cards repeated 6+ times in a row.
6. **Modal as first thought** — Use inline or progressive disclosure before reaching for a modal.
7. **Orange toggles**. ON = black, OFF = grey-2. Period.
8. **Pure `#fff` or `#000` in code** — always use the token. Tinting toward the brand hue is what makes the palette feel cohesive.

---

## 13. File-level conventions

- React app source lives in `admin-react/src/`. Files use `.jsx`.
- Build: `wp-scripts build admin-react/src/index.jsx --output-path=build/admin`
- One tab = one file under `admin-react/src/tabs/`. Each export defaults the
  tab component. Each tab receives `{ state, onDirty, setSetting }` props.
- Shared primitives in `admin-react/src/components.jsx`. Never duplicate.
- All saves: `setSetting('path.notation.key', value)` → React app batches and
  posts to `POST /hatch/v1/options`.

---

## 14. Why this doc exists

Past pain point: each new tab was hand-coded with slightly different spacing,
different icon-box sizes, different toggle colours, different copy tone. The
admin felt like 6 different apps stitched together. This doc is the contract
that prevents that.

When adding a feature:
1. Re-read this doc start to finish (under 10 minutes).
2. Build using the existing primitives. If you need a new primitive, add it
   to `components.jsx` AND update this doc in the same commit.
3. Run through the forbidden-patterns list before opening a PR.

The design wins by being boring and consistent — not by being clever per-tab.

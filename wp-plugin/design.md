# Hatch design system

Single source of truth for the Hatch plugin admin **and** the Astro frontend.
Tokens below are extracted verbatim from the live marketing site
(`hatch-deploy/server.js` :root block). Keep them in lockstep — when the
landing page updates, mirror the change here.

## Colors

| Token | Hex | Where used |
|---|---|---|
| `--fg` | `#0a0a0a` | Primary text |
| `--fg-muted` | `#525252` | Secondary text |
| `--fg-subtle` | `#737373` | Tertiary text (timestamps, captions) |
| `--bg` | `#fafafa` | Page canvas |
| `--surface` | `#ffffff` | Card / panel background |
| `--bg-3` | `#f4f4f5` | Inset / pill background |
| `--border` | `#e5e5e5` | Standard separation |
| `--border-2` | `#d4d4d4` | Emphasis border, hover state |
| `--primary` | `#ff6b00` | Brand action, links |
| `--primary-soft` | `#fff3e8` | Selected / hover background |
| `--primary-fg` | `#ffffff` | Text on primary background |
| `--green` | `#16a34a` | Success, healthy heartbeat |
| `--green-soft` | `#dcfce7` | Success background |
| `--amber` | `#d97706` | Warning, attention |
| `--amber-soft` | `#fff7f7` | Warning background |
| `--red` | `#b91c1c` | Error, danger |
| `--red-soft` | `#fef2f2` | Error background |

**Rule:** never invent new palette colors. Every UI surface uses a token from
the table above. New semantic needs get a new named token here first.

## Typography

```
--sans: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
--mono: ui-monospace, SFMono-Regular, Menlo, 'Cascadia Code', monospace;
```

Font feature settings: `"ss01","cv11","cv02"` (Inter stylistic alternates — soft
single-storey `a`, straight-leg `l`).

| Level | Size | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|
| H1 (hero) | `clamp(36px, 4.6vw, 56px)` | 700 | -0.03em | 1.08 |
| H1 (page) | 32px | 700 | -0.03em | 1.08 |
| H2 (wide) | 28px | 600 | -0.015em | 1.2 |
| H2 (page) | 20px | 600 | -0.015em | 1.2 |
| H3 | 16px | 600 | 0 | 1.3 |
| H4 | 14px | 600 | 0 | 1.4 |
| Body | 15px | 400 | 0 | 1.55 |
| Lead | 17–20px | 400 | 0 | 1.55 |
| Small | 13.5px | 400 | 0 | 1.6 |
| Mono inline | 13px | 400 | 0 | — |

Body text color is `--fg-muted`. Headings use `--fg`.

## Buttons

All buttons are **pills** — `border-radius: 999px`.

```
.btn          { padding: 11px 20px; font-weight: 600; font-size: 14px;
                background: var(--fg); color: var(--surface);
                transition: opacity .15s, transform .08s; }
.btn:hover    { opacity: .88; transform: translateY(-1px); }
.btn.primary  { background: var(--primary); color: var(--primary-fg); }
.btn.secondary{ background: var(--surface); color: var(--fg);
                border: 1px solid var(--border-2); }
.btn.secondary:hover { border-color: var(--fg); }
```

**Default** = black-on-white (`--fg` background). Used for the most common CTA.
**Primary** = orange (`--primary`). Used for the *single* destination action
(e.g. "Download Hatch").
**Secondary** = white pill with border. Used for tertiary actions.

Never put two `.btn.primary` orange buttons next to each other — only one
primary action per surface.

## Surfaces

| Component | Border-radius | Padding | Border |
|---|---|---|---|
| Card | 14px | 22px | `1px solid var(--border)` |
| Feature card | 10px | 22px (16px mobile) | `1px solid var(--border)` |
| Pill | 999px | 4px 10px | none |
| Inline code | 4px | 2px 6px | none |
| Pre block | 10px | 16px 18px | bg `#0a0a0a` |

## Spacing scale

Use these values for padding and gaps. No values outside this scale.

```
4 · 6 · 8 · 10 · 12 · 14 · 18 · 22 · 32 · 48
```

## Pulses + heartbeat

The signature pulse dot lives anywhere we show a live signal. Size 8px,
breathing animation 1.2s ease. Color encoded by health:

- Good (alive): `--green` `#16a34a`
- Warn: `--amber` `#d97706`
- Bad (offline): `--red` `#b91c1c`
- Muted (no data): `--fg-subtle` `#737373`

Reduced-motion users get a static dot.

## What changes vs. what doesn't

- **The orange (`#ff6b00`)** — locked. It IS the brand.
- **The black-on-white default button** — locked. Don't paint everything orange.
- **Pill button shape** — locked. No rounded-rectangle buttons.
- **Card radius 14px, feature 10px** — locked. No 8px or 16px outliers.
- **Inter + ui-monospace fonts** — locked.
- **Spacing scale** — extensible if there's a genuine new tier; talk first.

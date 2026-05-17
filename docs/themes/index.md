# Hatch Themes Gallery

Pick a design that matches your audience. Same content, same modules, same WordPress — different look.

---

## 🌱 Sprout (default)

> Minimal, typography-first. The "why are you reading this" theme. Content forward, decoration back.

- **Status:** ✅ V0.1 ships
- **Vibe:** System-font minimalism
- **References:** Paul Graham essays, Stripe Blog, Linear changelog
- **Lighthouse:** 100 / 100 / 100 / 100
- **Page weight:** ~ 45 KB homepage
- **Demo:** [hatch-demo.adityaarsharma.com](https://hatch-demo.adityaarsharma.com)

```bash
npm create hatch@latest my-blog
# Sprout is the default — no --theme flag needed
```

[View source →](https://github.com/adityaarsharma/hatch/tree/main/themes/sprout)

---

## 📰 Magazine

> Editorial. Newspaper-feel. Serif headlines. Photo-led hero. Multi-column on desktop.

- **Status:** 🔨 V0.2 scaffold
- **Vibe:** Drop-cap, pull quotes, magazine grid
- **References:** NYTimes, The Verge, Vox, The Atlantic
- **Source:** Forked from [astro-theme-cactus](https://github.com/chrismwilliams/astro-theme-cactus) (MIT)
- **Demo:** Coming V0.2

```bash
npm create hatch@latest my-blog -- --theme magazine
```

[View source →](https://github.com/adityaarsharma/hatch/tree/main/themes/magazine)

---

## 💻 Tech

> Developer-focused. Dark mode default. Sticky table of contents. Beautiful code blocks.

- **Status:** 🔨 V0.2 scaffold
- **Vibe:** Inter + JetBrains Mono, GitHub-inspired
- **References:** Vercel Blog, Dev.to, GitHub Pages, Tailwind Blog
- **Source:** Forked from [AstroPaper](https://github.com/satnaing/astro-paper) (MIT)
- **Demo:** Coming V0.2

```bash
npm create hatch@latest my-blog -- --theme tech
```

[View source →](https://github.com/adityaarsharma/hatch/tree/main/themes/tech)

---

## ✨ Agency

> Bold, animated, modern. Gradient hero. Bento grids. Subtle micro-animations. The marketing-page-as-a-blog theme.

- **Status:** 🔨 V0.3 scaffold
- **Vibe:** Stripe / Linear / Vercel marketing
- **References:** Stripe, Linear, Vercel, Resend, Magic UI, Aceternity
- **Source:** Built on Tailwind UI Plus components ($299 license)
- **Alt:** Free version via HyperUI + Magic UI + shadcn/ui (slightly less polished)
- **Demo:** Coming V0.3

```bash
npm create hatch@latest my-blog -- --theme agency
```

[View source →](https://github.com/adityaarsharma/hatch/tree/main/themes/agency)

---

## ✉️ Newsletter

> Substack-style reading focus. Single column. 600px max width. Words first, decoration zero.

- **Status:** 🔨 V0.3 scaffold
- **Vibe:** Crimson Pro serif, ruthless minimalism
- **References:** Substack, Beehiiv, Paul Graham essays, Lenny's Newsletter
- **Source:** Adapted from [astro-theme-resume](https://github.com/srleom/astro-theme-resume) (MIT)
- **Demo:** Coming V0.3

```bash
npm create hatch@latest my-blog -- --theme newsletter
```

[View source →](https://github.com/adityaarsharma/hatch/tree/main/themes/newsletter)

---

## Coming after V1 launch

Theme contributors welcome. Submit your own:

```bash
npx hatch theme create my-theme
# scaffolds themes/hatch-theme-my-theme with the contract
```

See [THEME-CONTRACT.md](https://github.com/adityaarsharma/hatch/blob/main/themes/THEME-CONTRACT.md) for what's required, and the [theme quality gate](https://github.com/adityaarsharma/hatch/blob/main/.github/workflows/theme-quality.yml) for what your PR must pass.

Roadmap themes (V2+, community welcome to claim):
- **Documentation** — like Astro Starlight but for WP-backed docs
- **Portfolio** — visual gallery, case studies (think Awwwards winners)
- **E-commerce** — product showcase (V3, ships with WooCommerce starter)
- **Photography** — full-bleed photo first
- **Podcast** — episode list + audio player + show notes
- **Course / Knowledge base** — structured content navigation

---

## Why a theme system?

Most headless WP starters give you ONE design. If you don't like it, fork.

Hatch ships multiple themes that all work with the same WordPress, modules, and config. Switch themes anytime without rewriting your content. Your WordPress doesn't know or care which theme renders the front-end.

This is how [Vercel templates](https://vercel.com/templates) and [Netlify templates](https://templates.netlify.com) work — and it's the only sustainable model for a community-grown framework.

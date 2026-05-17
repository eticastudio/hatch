# Contributing to Hatch

Thanks for considering a contribution! Hatch grows from community work.

## What we want

| Effort | Impact | Examples |
|---|---|---|
| Low | High | Bug reports with reproduction steps, doc typos, translation packs |
| Medium | High | New module integrations (form plugins, membership plugins, SEO tools) |
| High | Very high | New framework starters (Next.js, SvelteKit, Nuxt, Remix) |

## Process

1. **Open an issue first** for anything bigger than a typo. Saves us both time.
2. Fork → branch from `main` → PR back to `main`.
3. PR title: `type: short description` (e.g. `feat(forms): add Forminator support`).
4. Include:
   - What changed
   - Why (link to issue if applicable)
   - How tested
   - Screenshots if UI

## Branch naming

- `feat/[short-name]` — new feature
- `fix/[short-name]` — bug fix
- `docs/[short-name]` — docs only
- `chore/[short-name]` — tooling, deps, refactor

## Code standards

### TypeScript / JavaScript (modules + Astro starter)

- TypeScript strict mode
- Prefer `const` over `let`
- Explicit return types on exported functions
- ESLint + Prettier (configs in repo root)

### PHP (WP plugin)

- PHP 7.4+ syntax
- WordPress Coding Standards (WPCS) — run `composer phpcs` before PR
- Use namespaces / class autoloading
- Sanitize all input, escape all output, verify nonces

### Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` new feature
- `fix:` bug fix
- `docs:` docs only
- `refactor:` no behavior change
- `test:` tests
- `chore:` tooling

## Adding a new module

1. Create `modules/[slug]/` with the standard structure (see `modules/seo/` as reference)
2. Implement against the `HatchModule` contract in `@hatch/core`
3. Add docs in `docs/modules/[slug].md`
4. Add to the module table in main `README.md`
5. Open PR

## Adding a new framework starter

This is a big lift — please discuss in an issue first.

Current candidates (V2):
- Next.js (highest demand, Faust competitor)
- SvelteKit (rising)
- Nuxt (Vue community)
- Remix (React Router merger)

## License

By contributing, you agree your contributions are licensed under MIT (matching the repo).

## Code of conduct

Be kind. Critique code, not people. English is fine; broken English is also fine. We're all here to make headless WordPress less painful.

## Questions?

Open a discussion: https://github.com/adityaarsharma/hatch/discussions

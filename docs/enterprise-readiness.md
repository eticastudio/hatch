# Hatch Enterprise Readiness — Honest Roadmap

> **[← Back to README](../README.md)**

This is the honest path from v0.5 "well-architected" to v1.0 "production-proven."
Inspired by what 10up's HeadstartWP, Gatsby, and other mature WordPress projects
shipped before they hit enterprise scale.

---

## Current State (v0.5.0, May 14, 2026)

```
Code standards:     ★★★★★ — comparable to 10up's
Architecture:       ★★★★★ — sound, modern, defensive (HMAC, sodium, singletons, hooks)
Feature scope:      ★★★★★ — wider than HeadstartWP and Gatsby combined
Security posture:   ★★★★☆ — strong patterns, no external audit yet
Production-ready:   ★★☆☆☆ — no test suite, no CI, no real users yet
Documentation:      ★★★☆☆ — README + ROADMAP + 5 docs files
Community:          ★☆☆☆☆ — repo public, awaiting first users
```

**Translation:** the code is at HeadstartWP / 10up's level. The product isn't yet,
because it lacks automated testing, external audits, and production usage.

That's normal. Gatsby v0.5 wasn't enterprise-ready either. The path is concrete.

---

## What Hatch HAS at v0.5 (code-quality checklist)

| Standard | Status | Notes |
|---|---|---|
| WordPress Coding Standards (WPCS) | ✅ Throughout | Every PHP file |
| Singleton pattern + hook discipline | ✅ Consistent | All 24 PHP classes |
| Nonce verification on state changes | ✅ Every form | check_admin_referer + wp_verify_nonce |
| Capability checks on admin routes | ✅ Every handler | current_user_can('manage_options') |
| Sanitize input / escape output | ✅ Every value | sanitize_text_field / esc_html / esc_url |
| ABSPATH guards | ✅ All files | defined('ABSPATH') \|\| exit; |
| Crypto for sensitive data | ✅ Sodium secretbox | wp_salt-derived keys |
| HMAC-signed external calls | ✅ Agent + replay protection | timestamp + nonce + 5-min window |
| REST permission_callback | ✅ Every route | No `__return_true` except public form submit |
| Direct SQL queries via $wpdb->prepare() | ✅ Always | RankMath redirects table query is correct |
| Uninstall hook cleans options | ✅ Yes | 25+ options removed on plugin delete |
| WP-CLI commands documented | ✅ Yes | 6 commands with inline doc-comments |
| i18n text-domain wrappers | ✅ Yes | __() / _n() / esc_html__() throughout |
| No phone-home / telemetry | ✅ Zero external calls | Confirmed in audit |
| Premium admin UI scoped properly | ✅ .hatch-admin wrapper | No global CSS pollution |
| Performant asset enqueue | ✅ Only on Hatch pages | strpos check in admin_enqueue_scripts |

---

## What Hatch LACKS (the gap to close)

### Tier 1 — Critical for v1.0 (BLOCKING)

These are non-negotiable for WP.org submission + enterprise trust.

| # | Gap | Effort | Why it matters |
|---|---|---|---|
| 1 | **No automated test suite** | 2 weeks | Every code change risks regression. Pros run PHPUnit. |
| 2 | **No CI/CD on PRs** | 2 days | Code merges without quality gates today. |
| 3 | **No PHP version matrix testing** | 1 day | Bugs sneak in on PHP 7.4 that don't show on 8.3. |
| 4 | **No WP version matrix testing** | 1 day | WP 6.4 vs 6.9 behave differently for some hooks. |
| 5 | **No static analysis** (PHPStan / Psalm) | 3 days | Type errors caught at dev time, not user time. |
| 6 | **No external security audit** | 4-12 weeks waiting | Validates the HMAC / sodium / capability work. |
| 7 | **Zero production deployments** | 2 weeks | SproutOS blog can be the first proof point. |
| 8 | **No real users yet** | Ongoing | Real bug reports trump synthetic testing. |

### Tier 2 — Quality of life (HIGH PRIORITY)

| # | Gap | Effort | Why it matters |
|---|---|---|---|
| 9 | **No documentation site** | 2 weeks | README + 10 doc files is barely the surface. |
| 10 | **No i18n translations** (just gettext wrappers) | 1 week per language | Global reach. 10up ships in 30+ locales. |
| 11 | **No performance profiling** | 1 week | We assume the REST surface is fast — but never measured. |
| 12 | **No WP.org plugin listing** | 4-12 weeks review | Native discovery for millions of users. |
| 13 | **No bug bounty / responsible disclosure** | 1 week setup | Security researchers need a clear path. |
| 14 | **SemVer commitments not formalized** | 1 day | Enterprises need stability guarantees. |
| 15 | **No public release notes / changelog policy** | 1 day | Currently in git history only. |

### Tier 3 — Mature product (NICE TO HAVE)

| # | Gap | Effort |
|---|---|---|
| 16 | YouTube channel with tutorials | Ongoing |
| 17 | Discord community + office hours | Ongoing |
| 18 | Conference talks (WordCamp / JS-conf) | 1 talk per quarter |
| 19 | Pluggable architecture (`apply_filters` for every decision) | 2 weeks |
| 20 | Built-in profiler ("debug bar" extension) | 1 week |
| 21 | Multi-site support | 2 weeks |
| 22 | Activity log (V0.6 roadmap) | 1 week |
| 23 | File integrity monitoring (V0.6 roadmap) | 2 weeks |
| 24 | 2FA via WebAuthn / passkeys (V0.6 roadmap) | 2 weeks |
| 25 | Backup integration (UpdraftPlus recommendation flow) | 3 days |

---

## Phase 1 — Stabilization (target: June 2026)

**Goal:** Code stops being "trust me" and becomes "verified by machine on every PR."

### Step 1.1 — PHPUnit test suite

```bash
mkdir -p tests/unit tests/integration
composer require --dev phpunit/phpunit wp-phpunit/wp-phpunit yoast/phpunit-polyfills
```

**Target coverage:** 70% across the 24 PHP classes.

**Priority order to write tests:**

1. `class-diagnostic.php` — all 12 checks, pass/warn/fail paths
2. `class-detector.php` — plugin detection logic (mock active_plugins option)
3. `class-domain-check.php` — root/subdomain/IP/dev classification
4. `class-frontend-agent.php` — HMAC signing + verification, install token consume
5. `class-login-hardening.php` — slug validation, brute-force counter, role guard
6. `class-blocks-custom-code-security.php` — strip logic for non-capable users
7. `class-acf-bridge.php` — field group scan results
8. `class-cpt-scanner.php` — show_in_rest detection
9. `class-app-password-helper.php` — REST + admin-post flow
10. `class-rest-api.php` — endpoint registration + permission callbacks

### Step 1.2 — Playwright E2E for the admin UI

```bash
npm install -D @playwright/test
mkdir -p tests/e2e
```

**Critical user journeys:**

1. Plugin activation → first-run notice appears
2. Setup wizard: step 1 → step 4 → complete
3. Connector tab: generate App Password → see plaintext shown once
4. Frontend tab: generate install command → mock agent verify
5. Security tab: toggle settings → save → reload → confirm persisted
6. Health tab: confirm all status rows render
7. Plugins tab: render with no plugins + with active plugins

### Step 1.3 — GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        php: ['7.4', '8.0', '8.1', '8.2', '8.3']
        wp:  ['6.4', '6.6', '6.8', '6.9']
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ matrix.php }}
          coverage: xdebug
      - run: composer install
      - run: composer phpcs           # WPCS lint
      - run: composer phpstan         # static analysis
      - run: composer test            # PHPUnit
      - run: npx playwright test      # E2E

  build-zip:
    needs: test
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          mkdir -p build && cp -r wp-plugin build/hatch
          cd build && zip -r ../hatch.zip hatch
      - uses: softprops/action-gh-release@v1
        with:
          files: hatch.zip
```

### Step 1.4 — PHPStan static analysis

```bash
composer require --dev phpstan/phpstan szepeviktor/phpstan-wordpress
```

```neon
# phpstan.neon
includes:
    - vendor/szepeviktor/phpstan-wordpress/extension.neon
parameters:
    level: 5
    paths:
        - wp-plugin/
    excludePaths:
        - wp-plugin/blocks-src/  # JS, not PHP
```

Run on every PR. Fail PRs that don't pass.

### Step 1.5 — Composer scripts for one-command quality

```json
{
  "scripts": {
    "phpcs":   "phpcs --standard=WordPress wp-plugin/",
    "phpcbf":  "phpcbf --standard=WordPress wp-plugin/",
    "phpstan": "phpstan analyse --memory-limit=512M",
    "test":    "phpunit",
    "qa":      ["@phpcs", "@phpstan", "@test"]
  }
}
```

**Done state:** `composer qa` runs everything locally. CI runs the same thing.
A PR that doesn't pass `qa` doesn't merge.

---

## Phase 2 — Security Maturity (target: July 2026)

### Step 2.1 — Submit to Patchstack

Patchstack is the WordPress-focused equivalent of Snyk. Free audit for OSS:

```
1. Submit at patchstack.com/researchers/submit-a-plugin
2. Their team reviews HMAC implementation, sodium key handling,
   custom-code escape, agent endpoint hardening
3. Get a report — fix any findings
4. Earn the "audited by Patchstack" badge
```

**Estimated review time:** 4–8 weeks. **Cost:** free for OSS.

### Step 2.2 — WPScan responsible disclosure

```
1. Add SECURITY.md with responsible disclosure policy
2. Email security@adityaarsharma.com (subject: Hatch)
3. WPScan adds Hatch to their vulnerability database
4. Researchers know where to report
```

### Step 2.3 — CSP headers on admin assets

```php
// In class-asset-loader.php (new):
add_action( 'admin_init', function() {
    if ( strpos( get_current_screen()->id, 'hatch' ) === false ) return;
    header( "Content-Security-Policy: default-src 'self'; "
        . "style-src 'self' https://rsms.me 'unsafe-inline'; "
        . "script-src 'self' 'unsafe-inline';" );
});
```

### Step 2.4 — Rate-limit REST routes

```php
// In class-rate-limit.php (new):
// 60 requests/minute per user/IP on /hatch/v1/*
// 10 requests/minute on /app-password (lower limit on credential gen)
```

### Step 2.5 — Penetration test of agent endpoint

Spin up a test VPS, install the agent, run:

- HMAC signature timing attacks (constant-time check)
- Replay attempts within window
- Nonce collision testing
- Body tampering after signing
- Slowloris-style connection exhaustion
- DNS rebinding attacks on the agent host

Document findings in `docs/security-audit-2026-07.md`.

---

## Phase 3 — Distribution (target: August 2026)

### Step 3.1 — WordPress.org plugin submission

```
1. wp i18n make-pot wp-plugin/ wp-plugin/languages/hatch.pot
2. Update readme.txt to WP.org format (already done — verify)
3. Submit at wordpress.org/plugins/developers/add/
4. Wait 4-12 weeks for review
5. Push to SVN: svn co https://plugins.svn.wordpress.org/hatch/
6. Tag release in SVN
```

### Step 3.2 — Documentation site

Built with Hatch itself ("dogfooding"):

```
github.com/adityaarsharma/hatch
├── /docs              ← all the docs/*.md files
├── /docs/getting-started
├── /docs/admin-tabs   ← screenshot tour
├── /docs/frontend-agent
├── /docs/custom-code-block
├── /docs/api          ← REST endpoint reference
├── /docs/wp-cli       ← CLI command reference
├── /docs/migration    ← migrating from Faust / Gatsby / Frontity / traditional WP
├── /docs/themes       ← theme gallery + previews
└── /blog              ← release announcements, tutorials, case studies
```

Source: Astro + Hatch Blocks + Starlight (Astro's docs theme).

### Step 3.3 — i18n translation

```bash
wp i18n make-json wp-plugin/languages/
```

Auto-translate to top 10 locales via DeepL API, then native-review:

`es_ES`, `fr_FR`, `de_DE`, `ja`, `zh_CN`, `hi_IN`, `pt_BR`, `ru_RU`, `it_IT`, `nl_NL`.

### Step 3.4 — Demo + tutorial content

- Public demo at `github.com/adityaarsharma/hatch/tree/main/examples` (Astro frontend + a real WP backend)
- YouTube video: "Headless WordPress in 10 minutes with Hatch" (long-form)
- YouTube short: "Why I stopped using WordPress themes" (60-sec hook)
- Reddit r/WordPress launch post
- Hacker News launch post
- ProductHunt launch (Tue/Wed 12:01am PST)
- LinkedIn launch post
- Twitter/X thread (10 tweets)

---

## Phase 4 — Production Hardening (ongoing)

### Step 4.1 — Migrate SproutOS blog onto Hatch v1.0

SproutOS blog is already headless (Next.js). Migrating it to use the new Hatch
WP plugin proves end-to-end:

1. Install Hatch plugin on `cms.sproutos.ai`
2. Configure webhook to existing Next.js frontend
3. Run diagnostic → fix any issues
4. Document the migration as a case study

### Step 4.2 — Public roadmap on GitHub Projects

Move from `ROADMAP.md` flat file to a real GitHub Project board with:

- Backlog (idea triage)
- v0.6 / v0.7 / v0.8 milestones
- In progress (max 3 cards at a time — WIP limit)
- In review (PR-stage)
- Done (released)

### Step 4.3 — Monthly release cadence

```
Last Friday of every month: tag a release.
Always semver. Always with release notes.
Always with the hatch.zip artifact attached.
```

### Step 4.4 — Bug bounty

Modest tiers funded out of pocket:

- Critical (RCE, auth bypass, secret leak): $500
- High (XSS, CSRF, privilege escalation): $250
- Medium (info disclosure, DoS): $100
- Low (config issues, docs): $50

Hosted on huntr.com (free for OSS).

---

## Quality Gates — What Hatch Must Pass Before v1.0

```
[ ] PHPUnit suite with 70%+ coverage
[ ] Playwright E2E covering all 4 wizard steps + 6 admin tabs
[ ] PHPStan level 5 passing on all PHP code
[ ] PHPCS (WordPress standard) passing on all PHP code
[ ] CI green on PHP 7.4 / 8.0 / 8.1 / 8.2 / 8.3 × WP 6.4 / 6.6 / 6.8 / 6.9
[ ] Patchstack audit submitted (in queue or complete)
[ ] SECURITY.md with disclosure policy
[ ] Documentation site live (github.com/adityaarsharma/hatch)
[ ] i18n: EN + at least 5 other locales
[ ] WP.org plugin submission in review
[ ] At least 1 production site running Hatch (SproutOS blog)
[ ] At least 10 external GitHub stars (vanity metric, but proves discoverability)
[ ] At least 3 community-contributed issues / PRs
[ ] Public changelog with last 12 versions
[ ] Demo site live with sample content
```

When all 14 check, tag `v1.0.0`. Announce as "production-ready."

---

## Anti-Patterns to Avoid

### Don't fake maturity

- Don't claim "production-ready" before the gates are met
- Don't say "trusted by X companies" without permission + receipts
- Don't fabricate user counts or stars
- Don't run an "enterprise" version that's just the OSS with a different badge

### Don't over-engineer pre-v1.0

- No multisite until v1.0 demands it
- No backup integration in core — leave to UpdraftPlus
- No WPGraphQL bridge until users actually ask
- No commerce until v2

### Don't lose the wedge

What makes Hatch different (one plugin + premium admin + agent + Astro-first
+ block library) is the moat. Don't dilute it by chasing every feature request.
Reject features that don't fit the "headless engine for WordPress" identity.

---

## Phase 5 — Beyond v1.0 (long-term vision)

### v1.5 — In-admin AI assistant
- LLM-powered chat in wp-admin
- BYO API key
- Uses WP 7.0 Abilities API to perform real changes
- "Why isn't my frontend showing posts?" → diagnostic-driven debug

### v2.0 — Next.js parity
- Next.js starter alongside Astro
- Component-mapping mode for both
- `@hatch/membership`, `@hatch/cpt-bridge` modules

### v2.5 — Hatch Cloud (gated on demand)
- Managed `yourname.hatch.app` hosting
- Plugin remains forever free

### v3.0 — Commerce
- WooCommerce headless starter
- `@hatch/woo` module

---

## How to Contribute to Getting Hatch to v1.0

Highest-leverage areas right now:

1. **Write a test for one PHP class.** Pick from the list in Step 1.1.
2. **Add a Playwright E2E flow.** Pick one user journey, write it.
3. **Translate to your language.** Open a PR with `languages/hatch-XX_XX.po`.
4. **Run Hatch in production and file detailed bug reports.** This is gold.
5. **Write a blog post / tutorial / video.** Link to your post in Discussions.
6. **Build a new theme.** See `THEME-CONTRACT.md`.
7. **Submit a security finding.** See `SECURITY.md`.

---

**Hatch will hit v1.0 in October 2026 if Phases 1-3 execute on schedule.**

Track progress on the [GitHub Projects board](https://github.com/adityaarsharma/hatch/projects) (coming soon).

---

> **[← Back to README](../README.md)** · [Roadmap](../ROADMAP.md) · [CLAUDE.md](../CLAUDE.md)

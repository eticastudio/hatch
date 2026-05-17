# Hatch Security Model

> The WordPress backend is NEVER public. The frontend is fast and safe. They never collide.
>
> **Hatch handles WordPress security end-to-end.** No separate security plugin needed for the things Hatch covers.

This page documents Hatch's security posture, what's enforced by default, what you can configure, and what's outside Hatch's scope.

---

## TL;DR — what Hatch handles automatically

| Surface | Default behavior | Status |
|---|---|---|
| `/wp-json/wp/v2/users` | Removed entirely (kills enumeration) | ✅ V0.1 |
| `/wp-json/*` (any endpoint) | 401 for anonymous (Application Password required) | ✅ V0.1 |
| `/xmlrpc.php` | Disabled (was a brute-force amplification surface) | ✅ V0.1 |
| `?author=N` | Blocked (kills user enumeration) | ✅ V0.1 |
| `<head>` REST link tags | Stripped (no leaking endpoints) | ✅ V0.1 |
| Search engine indexing on CMS | Forced `noindex, nofollow, noarchive, nosnippet` | ✅ V0.1 |
| `cms.your-domain.com` (public visit) | 301 → frontend (via web server config) | ✅ V0.1 (config) |
| `/wp-admin`, `/wp-login.php` | Custom login path enforced (e.g. `/hatch-login`) | 🔨 V0.5 (recommends WPS Hide Login until then) |
| Brute-force lockout | Per-IP throttling (15min → 1hr → 24hr lockout) | 🔨 V0.5 |
| 2FA via WebAuthn / passkeys | Modern phishing-resistant auth | 🔨 V0.5 |
| File integrity monitoring | Flags any plugin/theme/core file changes | 🔨 V0.6 |
| Activity log | Who did what, when, from where | 🔨 V0.6 |

If you install Hatch + your hosting provider's backups, you have **enterprise-grade security**. No security plugin shopping list needed.

---

## What's outside Hatch's scope

Three categories — different product types, mention once, move on:

### Backups
Your hosting provider may handle this:
- **Kinsta, WP Engine, Cloudways, RunCloud, Pressable** — all include automated daily backups
- **DigitalOcean, Hetzner, AWS** — usually offer snapshot-based backup add-ons

If your host doesn't, install any WP backup plugin you trust:
- UpdraftPlus (free), BlogVault, Solid Backups

Backups are recovery, not prevention. Hatch is prevention. Different category, different tool.

### DDoS / WAF
If your hosting includes a WAF (most managed WordPress hosts do, including Cloudflare's free tier in front of any host), you're covered.

If not, put **Cloudflare's free tier** in front of both your CMS subdomain and your frontend domain. One-time DNS change. Free forever. Done.

### Malware scanning
Specialty product (Wordfence, Sucuri, MalCare). Has its own signature databases and deep scanning. Out of Hatch's scope. Optional — install if you've been compromised before.

That's it. Hatch (security) + your hosting (backups + WAF) = enterprise-grade.

---

## 1. Block public access to WordPress admin

### The problem

`/wp-admin` and `/wp-login.php` are the most-attacked URLs on the internet. Bots probe them millions of times per day. Even with strong passwords, brute-force attempts consume server resources, leak IP reputation, and increase attack surface.

### Hatch's solution (V0.5 native, V0.1 via WPS Hide Login)

**V0.5+:** Hatch's WP plugin includes built-in login URL masking. Set your custom path in WP Admin → Tools → Hatch → Custom Login URL.

**V0.1 today:** install [WPS Hide Login](https://wordpress.org/plugins/wps-hide-login/) (free, 1M+ installs) — Hatch's wizard walks you through this in 30 seconds. We're bundling natively in V0.5 so the dependency goes away.

After config:
- `cms.your-domain.com/wp-login.php` → 404 (or redirect)
- `cms.your-domain.com/wp-admin` → 404 (or redirect)
- `cms.your-domain.com/hatch-login` → WP login form (only your team knows this URL)

This stops 99% of brute-force attacks at the front door. They can't attack a URL they can't find.

---

## 2. Lock down the REST API

### The problem

By default, WordPress exposes:
- `/wp-json/wp/v2/users` → list of all users with names, slugs, IDs, gravatars
- `/wp-json/wp/v2/posts` → all posts (intended for headless)
- `/wp-json/oembed/*` → metadata
- `/wp-json/wp/v2/types` → all post types
- `/wp-json/wp/v2/taxonomies` → all taxonomies
- ...and dozens more

Anonymous bots scrape `/wp/v2/users` for brute-force username lists. Your team's identities become public.

### Hatch's solution (automatic, on by default since V0.1)

The Hatch WP plugin enforces:

```php
// wp-plugin/includes/class-security.php

// 1. Anonymous REST API access → 401
add_filter('rest_authentication_errors', function ($result) {
    if (!is_user_logged_in()) {
        return new WP_Error('hatch_rest_not_logged_in',
            'REST API restricted to authenticated users.',
            ['status' => 401]);
    }
    return $result;
});

// 2. /wp/v2/users endpoints removed entirely
add_filter('rest_endpoints', function ($endpoints) {
    unset($endpoints['/wp/v2/users']);
    unset($endpoints['/wp/v2/users/(?P<id>[\d]+)']);
    return $endpoints;
});

// 3. REST link tags stripped from <head> + HTTP headers
remove_action('wp_head', 'rest_output_link_wp_head', 10);
remove_action('template_redirect', 'rest_output_link_header', 11);
```

Hatch frontends authenticate using **Application Passwords** (WordPress core feature since 5.6) so they pass the auth check. Bots without auth get 401.

---

## 3. Disable XML-RPC

### The problem

`xmlrpc.php` is a legacy protocol used for:
- Brute-force amplification attacks (1 request = many login attempts)
- Pingback DDoS amplification
- Some app integrations (Jetpack)

For headless setups, you don't need any of this.

### Hatch's solution

```php
add_filter('xmlrpc_enabled', '__return_false');
```

Plus removes the `X-Pingback` HTTP header so attackers can't even discover the endpoint.

---

## 4. Block user enumeration via `?author=N`

### The problem

`https://example.com/?author=1` redirects to `/author/[username]/` — exposing usernames that should be private.

### Hatch's solution

```php
add_action('init', function () {
    if (!is_admin() && isset($_GET['author'])) {
        wp_safe_redirect(home_url(), 301);
        exit;
    }
});
```

Anonymous attempts → 301 redirect to homepage. Your usernames stay private.

---

## 5. Hide the CMS subdomain from search engines

### The problem

If `cms.your-domain.com` gets indexed by Google, you have:
- Duplicate content (same posts on cms + frontend)
- Canonical URL confusion
- Admin URLs leaked in search results
- SEO penalties

### Hatch's solution

Three layers of defense (all V0.1):

**Layer 1 — `<meta robots>` enforced site-wide:**
```php
// Hatch outputs on every page of the CMS subdomain:
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
```

**Layer 2 — `wp_robots()` filter:**
Hatch sets `noindex, nofollow, noarchive, nosnippet` via the WP `wp_robots` filter. Catches all the paths where the meta tag wouldn't fire.

**Layer 3 — server-level redirect (`docs/hosting/`):**
Configure your web server (Nginx/Caddy/Apache) to 301 redirect any non-WP path to the public frontend:

```nginx
# /etc/nginx/sites-enabled/cms.your-domain.com
if ($request_uri !~ "^/(wp-json|wp-admin|wp-content|wp-includes|hatch-login|wp-cron\.php|robots\.txt|favicon\.ico)") {
    return 301 https://your-domain.com;
}
```

Now `cms.your-domain.com/random-page` → 301 to `your-domain.com`. The CMS effectively has no public presence.

---

## 6. Application Passwords, not main passwords

### The problem

Sharing your WP admin password with the frontend = catastrophic if leaked.

### Hatch's solution

Use [Application Passwords](https://wordpress.org/documentation/article/application-passwords/) (built into WordPress core since 5.6):

1. WP Admin → Users → Profile → Application Passwords
2. Name: `Hatch Frontend`
3. Click Add → copy the generated 24-character password
4. Paste into `.env` as `WP_API_PASS`
5. Revoke anytime if leaked — main password unaffected

Each frontend, deploy environment, or integration gets its own Application Password. Granular revocation, no shared secrets.

---

## 7. Spam protection on all public POST routes

### The problem

Once forms / comments / search are exposed via headless API, bots will spam them.

### Hatch's solution

`@hatch/shield` module enforces three layers on every public POST endpoint:

1. **Honeypot field** — hidden form field bots fill, humans don't
2. **Per-IP rate limit** — 10 submissions / minute / IP
3. **Cloudflare Turnstile** (optional) — invisible CAPTCHA, free, privacy-respecting

Configure in `.env`:
```
PUBLIC_TURNSTILE_SITE_KEY=0xAAAAAAA   # optional
TURNSTILE_SECRET_KEY=0xBBBBBBB        # optional
```

Without Turnstile keys, the honeypot + rate limit still apply. Add Turnstile when you outgrow them.

---

## 8. Brute-force lockout (V0.5)

### Coming in V0.5

Hatch will bundle per-IP brute-force throttling natively. No separate Limit Login Attempts plugin needed.

```
Failed login 1-3:  ignored
Failed login 4-5:  15-min lockout
Failed login 6-7:  1-hour lockout
Failed login 8+:   24-hour lockout
```

Plus optional IP allowlist for `/hatch-login` access.

Until V0.5 ships, recommend [Limit Login Attempts Reloaded](https://wordpress.org/plugins/limit-login-attempts-reloaded/) (free, 2M+ installs) as a stopgap.

---

## 9. Two-factor authentication (V0.5)

### Coming in V0.5

Hatch will bundle WebAuthn / passkeys natively — phishing-resistant, no shared secret, modern UX.

For now, recommend the [WP 2FA plugin](https://wordpress.org/plugins/wp-2fa/) — easy setup, supports authenticator apps, email codes.

---

## 10. File integrity + activity log (V0.6)

### Coming in V0.6

- File integrity monitoring — detects any change to plugin / theme / core files since last verified state
- Activity log — who logged in, what they edited, from which IP
- Alerts on suspicious activity (logins from new countries, mass deletes, etc.)

For now, optional: [Solid Security free version](https://wordpress.org/plugins/better-wp-security/) provides similar functionality.

---

## 11. Secure deployment

### `.env` files
- Never commit `.env` to git (`.gitignore` does this)
- On VPS, `chmod 600 .env` so only the app user can read it
- On Cloudflare/Vercel/Netlify, use the platform's secrets manager (not env vars in repo)

### HTTPS everywhere
- Both `cms.*` and `your-domain.com` MUST be HTTPS
- Free via Let's Encrypt (Caddy auto-provisions, Nginx via Certbot, Cloudflare/Vercel automatic)

### Security headers
Hatch's Astro starter sets sensible defaults:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

CSP (Content Security Policy) is opt-in.

---

## 12. What Hatch can't protect against

Be realistic:

- **Compromised hosting account** → if attacker gets your hosting password, they can disable Hatch and unlock everything
- **Compromised admin account** → if your WP user gets phished (and 2FA isn't enabled), they have legitimate Application Password access
- **Vulnerable plugins** → Hatch can't audit every plugin you install. Use only well-maintained ones with recent updates.
- **Server-level vulnerabilities** → keep PHP, MySQL, Nginx/Caddy patched (your hosting handles this on managed plans)
- **Weak passwords** → use a password manager, enable 2FA on every WP account

Security is layered. Hatch hardens the WordPress + REST + frontend layers. You harden the human + hosting + plugin layers.

---

## Audit checklist (run monthly)

- [ ] All WP users have 2FA enabled
- [ ] All WP users have Application Passwords (not sharing main password)
- [ ] Custom login path is set + URL never appears in any committed file
- [ ] `curl https://cms.your-domain.com/wp-json/wp/v2/users` returns 401
- [ ] `curl https://cms.your-domain.com/wp-login.php` returns 404
- [ ] `curl https://cms.your-domain.com/xmlrpc.php` returns 444 or 403
- [ ] `curl https://cms.your-domain.com/?author=1` returns 301 to homepage
- [ ] `cms.your-domain.com` not in Google site:search results
- [ ] Frontend `.env` not in git
- [ ] WP + plugins + theme all updated to latest
- [ ] Backups verified (download last week's, confirm it restores)
- [ ] No outdated/abandoned plugins installed

If anything fails, see the relevant section above.

---

## Need a security audit?

For business-critical sites, [Connect with Aditya](https://adityaarsharma.com/connect/) — paid security audits include full headless WordPress posture review, penetration test, hardening implementation, and 30-day post-audit support.

# Client-side fetching from WordPress (CORS)

> **[← Back to README](../README.md)**

Hatch's setup wizard used to surface a CORS warning. In v0.6 we removed it because **CORS doesn't apply to 95% of headless WordPress sites.** Here's when it actually matters and what to do about it.

---

## TL;DR

If your headless site renders pages at **build time** (Astro, Next.js static export, Nuxt generate) — **you do NOT need CORS.** The fetch from your build process to WordPress happens server-to-server, where browsers aren't involved, and CORS doesn't apply.

If your headless site fetches WordPress data **from the browser at runtime** (client-side JavaScript calling `fetch('https://cms.mysite.com/wp-json/...')`), then yes — you need CORS headers on WordPress.

---

## What CORS actually is

CORS (Cross-Origin Resource Sharing) is a browser security rule. When JavaScript running on `https://mysite.com` tries to fetch from `https://cms.mysite.com`, the browser blocks the response unless `cms.mysite.com` explicitly says "yes, mysite.com is allowed."

Two characters of context:
- **Server-to-server requests** (Astro's build script → WordPress) → browser never involved → **no CORS**
- **Browser-to-server requests** (JS in the user's browser → WordPress) → CORS gate applies

---

## When you ACTUALLY need CORS in Hatch

Two real use cases:

### Use case 1 — Live search in the frontend
The user types into a search box. The browser calls `cms.mysite.com/wp-json/wp/v2/search?term=...` as they type. Without CORS, every request fails.

**Fix:** add CORS headers (see below).

**Better alternative:** index your content at build time into a static JSON file or use a service like Algolia/Meilisearch. Your browser fetches `/search.json` from your OWN domain → no CORS needed.

### Use case 2 — Authenticated client-side actions
The user submits a comment / form from the browser, which calls a WordPress REST endpoint. Without CORS, the call fails.

**Fix:** add CORS headers + send credentials.

**Better alternative:** route the form through a serverless function on YOUR domain. The function does the WordPress call server-side. No CORS needed in the browser.

---

## How to add CORS headers (if you actually need them)

Drop this in your theme's `functions.php` or a small must-use plugin:

```php
add_action( 'rest_api_init', function() {
    remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );
    add_filter( 'rest_pre_serve_request', function( $value ) {
        $allowed = array(
            'https://mysite.com',
            'https://www.mysite.com',
            'https://preview.mysite.com',
        );
        $origin = isset( $_SERVER['HTTP_ORIGIN'] ) ? $_SERVER['HTTP_ORIGIN'] : '';
        if ( in_array( $origin, $allowed, true ) ) {
            header( 'Access-Control-Allow-Origin: ' . $origin );
            header( 'Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS' );
            header( 'Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce' );
            header( 'Access-Control-Allow-Credentials: true' );
            header( 'Vary: Origin' );
        }
        return $value;
    }, 15 );
}, 15 );
```

**Critical:** never use `Access-Control-Allow-Origin: *` with `Allow-Credentials: true` — that's a security bug. Always allowlist specific origins.

---

## Why Hatch didn't bake CORS into the plugin

Three reasons:

1. **Most users don't need it.** Putting a CORS toggle in the admin where 95% of users don't need it creates a "what is this for" experience.
2. **Wrong CORS config is a security hole.** A toggle that says "allow all origins" is one click away from a vulnerability.
3. **The fix belongs in your theme / must-use plugin.** That way the allowed origins live with the deploy that knows what its domains are.

---

## What if your hosting / firewall strips the CORS header?

Some hosting (older shared hosts, certain WAF rules) strips response headers. If your `Access-Control-Allow-Origin` never reaches the browser:

- Check via curl: `curl -H "Origin: https://mysite.com" -I https://cms.mysite.com/wp-json/wp/v2/posts`
- If the header is missing in curl, your hosting is stripping it
- Move WordPress to a host that doesn't (Hetzner, DigitalOcean, RunCloud all preserve them)

---

> **[← Back to README](../README.md)** · [Security model](../SECURITY.md) · [Disabling blocks](disabling-blocks.md)

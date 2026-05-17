# WooCommerce — Read-only bridge

Hatch v0.8 ships a **read-only** WooCommerce bridge: enough to build a headless storefront that lists products, shows variations, and filters by category — but **no cart, no checkout, no orders**.

## Why read-only?

Cart + checkout require a session model that doesn't fit headless cleanly. WP nonces are origin-bound (your `cms.example.com` can't issue a nonce that `example.com` can spend), and exposing a guest checkout API without auth invites abuse. Designing that properly is a v0.9+ project.

In the meantime, **read-only is genuinely useful**: you can build a full catalog/discovery experience with Hatch, then link to your WP `/checkout` page for the actual transaction. Most stores need exactly this.

## What you get

### Endpoints (all public, all GET)

| Path | Returns |
|---|---|
| `/wp-json/hatch/v1/store/products` | Paginated product list (filters: category, search, on_sale, orderby) |
| `/wp-json/hatch/v1/store/products/{id}` | Full product (description, gallery, attributes, variation IDs) |
| `/wp-json/hatch/v1/store/products/{id}/variations` | Available variations for variable products |
| `/wp-json/hatch/v1/store/categories` | Flat list with parent IDs and image |
| `/wp-json/hatch/v1/store/featured` | Featured products |

### Product list query params

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | int | `1` | |
| `per_page` | int | `24` | Hard cap: **100** |
| `category` | string | `''` | Comma-separated slugs |
| `search` | string | `''` | Searches title + content |
| `orderby` | enum | `date` | `date`, `price`, `popularity`, `rating`, `title` |
| `order` | enum | `desc` | `asc` or `desc` |
| `on_sale` | bool | `false` | Only products with active sale price |

Response shape:
```json
{
  "page": 1,
  "per_page": 24,
  "total": 137,
  "total_pages": 6,
  "products": [
    {
      "id": 42,
      "slug": "blue-shirt",
      "name": "Blue Shirt",
      "type": "variable",
      "permalink": "https://cms.example.com/product/blue-shirt/",
      "short": "<p>A blue shirt.</p>",
      "price": "29.00",
      "regular_price": "39.00",
      "sale_price": "29.00",
      "currency": "USD",
      "on_sale": true,
      "in_stock": true,
      "stock_quantity": null,
      "featured": false,
      "image": "https://cms.example.com/wp-content/uploads/.../blue-shirt.jpg",
      "rating": 4.5,
      "rating_count": 12,
      "categories": ["clothing", "shirts"]
    }
  ]
}
```

The single-product endpoint additionally returns: `description`, `gallery`, `sku`, `attributes`, `variation_ids`.

### Pagination headers

`X-Hatch-Total` and `X-Hatch-Total-Pages` are surfaced on the products endpoint for easy clients.

## Astro usage example

```ts
// src/lib/store.ts
const BASE = import.meta.env.WP_API_URL.replace(/\/wp-json\/?$/, '').replace(/\/$/, '');

export async function listProducts(opts: {
  page?: number; per_page?: number; category?: string; search?: string; on_sale?: boolean;
} = {}) {
  const params = new URLSearchParams();
  if (opts.page)     params.set('page',     String(opts.page));
  if (opts.per_page) params.set('per_page', String(opts.per_page));
  if (opts.category) params.set('category', opts.category);
  if (opts.search)   params.set('search',   opts.search);
  if (opts.on_sale)  params.set('on_sale',  '1');

  const res = await fetch(`${BASE}/wp-json/hatch/v1/store/products?${params}`);
  if (!res.ok) return null;
  return await res.json();
}
```

```astro
---
// src/pages/shop/index.astro
import { listProducts } from '~/lib/store';
const { products = [], total = 0 } = (await listProducts({ per_page: 24 })) ?? {};
---
<section>
  <h1>Shop ({total})</h1>
  <ul class="grid grid-cols-1 md:grid-cols-3 gap-6">
    { products.map((p) => (
      <li>
        <a href={`/shop/${p.slug}`}>
          <img src={p.image} alt={p.name} loading="lazy" />
          <h2>{p.name}</h2>
          <p>{p.on_sale ? <s>{p.regular_price}</s> : null} {p.price} {p.currency}</p>
        </a>
      </li>
    )) }
  </ul>
</section>
```

## Auto-deploys on product change

When a product is created, updated, or deleted:

1. The category cache transient (`hatch_store_categories`, 5-min TTL) is invalidated
2. Every configured deploy hook fires (Cloudflare / Vercel / generic) — debounced at 30s per provider
3. The frontend rebuilds with the new catalog

## What's NOT in the bridge (deliberately)

| | Why |
|---|---|
| Cart endpoints | Session/auth model needs design first |
| Checkout endpoints | Same — see above |
| Order endpoints | Customer-data — auth-scoped, deferred |
| Customer endpoints | Same |
| Webhooks ⇄ Hatch | Use Woo's native webhooks for now; pipeline TBD |
| Subscriptions / Memberships | Out of scope for v0.x |

## v0.9+ direction

A separate `class-woocommerce-checkout.php` will land once the auth model is settled. Likely shape:

- Guest session tokens (HttpOnly cookie set by WP, scoped to the headless origin via `Sec-Fetch-Site` checks)
- A single `/wp-json/hatch/v1/store/checkout` endpoint that takes a cart payload + customer details and returns a redirect URL to the WP-hosted payment step
- No cart state in Hatch — the frontend holds it in localStorage; Hatch only converts cart → payment session

Nothing in v0.8 commits us to that shape — the read-only API is stable and independent.

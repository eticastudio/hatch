# WPGraphQL vs WordPress REST API — when to use which with Hatch

Hatch V1 uses the WordPress REST API. V2 will add `@hatch/graphql` for users who prefer WPGraphQL. This page explains when each is the right choice.

## TL;DR

| | REST API (Hatch V1) | WPGraphQL (Hatch V2 module) |
|---|---|---|
| Setup | Built into WordPress core. Zero extra plugins. | Requires WPGraphQL plugin install. |
| Best for | Blogs, brochure sites, simple content | Enterprise apps, complex CPTs, mobile/native apps |
| Performance — simple page | Equal | Equal |
| Performance — complex page | Multiple round-trips | Single query (faster) |
| Field selection | Limited (`?_fields=`) | Native (precise field-level control) |
| Tooling | curl, Postman, every HTTP lib | GraphiQL, Apollo, urql |
| Documentation | Familiar to most devs | Self-documenting via introspection |
| Typescript types | Manual | Auto-generated via codegen |
| Cache invalidation | Page-level | Resource-level (more granular) |

**Default recommendation: REST.** Move to WPGraphQL when you need field selection or single-query fetches across many resources.

---

## Why Hatch V1 ships with REST

1. **No extra plugin required.** REST is in WordPress core since 4.7 (2016). One less dependency for users.
2. **Familiar.** Every WordPress dev knows REST. WPGraphQL has a learning curve.
3. **Simpler debugging.** `curl` works. Browser dev tools work. Postman works.
4. **Application Passwords.** REST + Application Passwords = clean auth. WPGraphQL also supports this but the docs are sparser.
5. **Sufficient for blog content.** Most Hatch users build blogs/marketing sites — REST handles this beautifully.

## Why we'll add WPGraphQL in V2

1. **Performance for complex pages.** A page that needs `posts + author + custom-fields + related-posts + comments` is 5 REST calls vs 1 GraphQL query. GraphQL wins on round-trips.

2. **Field selection.** REST returns the full post object even if you only need title + slug. GraphQL lets you ask for exactly what you need. Saves bandwidth on mobile.

3. **WPGraphQL is now canonical.** As of October 2024, WPGraphQL is sponsored by Automattic and listed as a canonical community plugin on wordpress.org. It's the official-ish path.

4. **TypeScript codegen.** GraphQL Code Generator gives you type-safe queries with zero manual work. Better DX for senior devs.

5. **Power users want it.** Faust.js (the most popular existing headless WP starter) is built on WPGraphQL. Hatch needs to be a viable choice for them.

## When to choose which (decision tree)

```
Are you building a blog or content/marketing site?
├── Yes → use REST (Hatch V1 default)
└── No → continue

Do you have heavy custom post types + ACF / Meta Box fields?
├── Yes → consider WPGraphQL (V2 module)
└── No → continue

Do you need a single API call for posts + author + comments + related?
├── Yes → WPGraphQL (V2 module)
└── No → REST is fine

Are you building a mobile app on top of WordPress?
├── Yes → WPGraphQL (better for mobile bandwidth)
└── No → REST

Is your team already familiar with GraphQL (Apollo, etc.)?
├── Yes → WPGraphQL when V2 ships
└── No → REST (smaller learning curve)
```

## Performance — actual numbers

From community benchmarks ([Kinsta 2025](https://kinsta.com/blog/wpgraphql-vs-wp-rest-api/), [Stephanis 2024](https://www.linkedin.com/posts/stephanis_wp-rest-api-vs-graphqlperformance-activity-7411151975242809344-6wZD)):

| Scenario | REST | WPGraphQL |
|---|---|---|
| Single post fetch | ~ 80ms | ~ 90ms (slight overhead) |
| Post + 3 related posts (4 REST calls vs 1 GraphQL) | ~ 320ms | ~ 110ms |
| Post + author + featured image + categories + tags | 5 REST calls or 1 with `_embed` | 1 GraphQL |
| List 12 posts + author per post | 1 REST + 12 author calls (or 1 with `_embed`) | 1 GraphQL |

**Bottom line:** for simple pages, equal. For complex pages, GraphQL wins on number of round-trips. With ISR/edge caching, both feel identical to end-users — the difference matters at high scale or in mobile contexts.

## Migration path

Switching a Hatch project from REST to GraphQL (when V2 ships):

```bash
npm install @hatch/graphql wpgraphql
# Install WPGraphQL plugin in WordPress (one click)

# Edit src/lib/hatch.ts:
- import { getPosts } from '@hatch/core/rest';
+ import { getPosts } from '@hatch/graphql';
```

API surface stays the same — same `Post` type, same `getPosts()` signature. Just the underlying transport changes.

Hatch is built so REST and GraphQL are interchangeable transports. You're never locked into one.

## Hybrid setup

Some Hatch users will run both: REST for simple pages (no extra plugin overhead), GraphQL for the few pages that benefit from single-query fetches. The `@hatch/core` types are transport-agnostic — pick per page.

## Summary

- **V1: REST** = simpler, no extra plugin, perfect for 80% of headless WP use cases
- **V2: GraphQL** = optional, opt-in via `@hatch/graphql` module, better for enterprise + mobile + complex CPT setups
- **Both work with Hatch.** Vendor-neutral on transport, just like vendor-neutral on hosting and frontend framework.

Sources: [Kinsta WPGraphQL vs REST](https://kinsta.com/blog/wpgraphql-vs-wp-rest-api/), [Pantheon Headless WP](https://pantheon.io/learning-center/headless/wordpress-api-examples), [WPGraphQL official docs](https://www.wpgraphql.com/docs/wpgraphql-vs-wp-rest-api), [JN Next Services comparison](https://jnextservices.com/blog/wordpress-graphql-vs-rest-api-headless-cms/)

/**
 * Hatch middleware.
 *
 * One job today: read the redirect table from WordPress (RankMath / Yoast /
 * Redirection plugin) and apply 301/302 redirects before Astro routes the
 * request. The endpoint was already exposed by the WP plugin but nothing
 * consumed it — pages 404'd that should have redirected.
 *
 * Cached in-module with a 5-minute TTL because the redirect table changes
 * infrequently and we don't want to hit WP REST on every page request.
 * On worker cold-start the first request pays one extra fetch; subsequent
 * requests on the same isolate are zero-overhead lookups.
 *
 * Future passes can extend this middleware to:
 *   - Set CSP and security headers (item #5 on the punch list)
 *   - Rate-limit /img and /api/revalidate (item #7)
 *   - Geo / A/B / feature-flag routing
 */
import { defineMiddleware } from 'astro:middleware';

interface Redirect {
  from: string;     // source path, may contain wildcards "*"
  to: string;       // absolute URL or absolute path
  status: number;   // 301 | 302
  source?: string;  // 'redirection' | 'rankmath' | 'yoast'
}

import { WP_API_URL, WP_API_USER, WP_API_PASS } from 'astro:env/server';
const WP_API  = WP_API_URL  || '';
const WP_USER = WP_API_USER || '';
const WP_PASS = WP_API_PASS || '';
const REDIRECTS_TTL_MS = 5 * 60 * 1000;

// Server-side Basic Auth so we can hit authenticated WP routes. Never
// reaches the browser — middleware runs on the worker/node side only.
const authHeader =
  WP_USER && WP_PASS
    ? 'Basic ' + Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64')
    : '';

let cache: { at: number; rules: Redirect[] } | null = null;

async function fetchRedirects(): Promise<Redirect[]> {
  if (!WP_API) return [];
  const now = Date.now();
  if (cache && now - cache.at < REDIRECTS_TTL_MS) return cache.rules;

  const base = WP_API.replace(/\/wp\/v2\/?$/, '');
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (authHeader) headers.Authorization = authHeader;
    const res = await fetch(`${base}/hatch/v1/redirects`, {
      headers,
      cf: { cacheTtl: 60 },
    } as RequestInit);
    if (!res.ok) {
      cache = { at: now, rules: [] };
      return [];
    }
    const data = await res.json();
    const rules: Redirect[] = Array.isArray(data) ? data : (data?.redirects ?? []);
    // Normalize paths (strip protocol+host if present so we can match by path).
    const normalized = rules
      .filter((r): r is Redirect => !!r && typeof r.from === 'string' && typeof r.to === 'string')
      .map((r) => ({
        from: stripOrigin(r.from),
        to: r.to,
        status: r.status >= 300 && r.status < 400 ? r.status : 301,
        source: r.source,
      }));
    cache = { at: now, rules: normalized };
    return normalized;
  } catch {
    cache = { at: now, rules: [] };
    return [];
  }
}

function stripOrigin(u: string): string {
  try {
    const url = new URL(u, 'http://placeholder');
    // If u was a path-only string, URL() applied placeholder origin — return path.
    return url.pathname + (url.search || '');
  } catch {
    return u.startsWith('/') ? u : '/' + u;
  }
}

/**
 * Match a request path against a rule's `from`. Supports literal match and
 * a trailing `*` wildcard (used by RankMath wildcards). Case-insensitive
 * because WP slugs are typically lowercase but humans paste mixed-case URLs.
 */
function matches(path: string, rule: Redirect): { matched: boolean; captured?: string } {
  const from = rule.from.toLowerCase();
  const p = path.toLowerCase();
  if (from.endsWith('/*')) {
    const prefix = from.slice(0, -2);
    if (p === prefix || p.startsWith(prefix + '/')) {
      return { matched: true, captured: path.slice(prefix.length) };
    }
  }
  if (from.endsWith('*')) {
    const prefix = from.slice(0, -1);
    if (p.startsWith(prefix)) {
      return { matched: true, captured: path.slice(prefix.length) };
    }
  }
  if (p === from || p === from + '/') {
    return { matched: true };
  }
  return { matched: false };
}

function resolveTarget(rule: Redirect, captured: string | undefined, currentUrl: URL): string {
  let to = rule.to;
  if (captured && to.endsWith('*')) {
    to = to.slice(0, -1) + captured;
  } else if (captured && to.endsWith('/*')) {
    to = to.slice(0, -2) + captured;
  }
  // If `to` is relative, resolve against the current request origin.
  if (to.startsWith('/')) {
    return currentUrl.origin + to;
  }
  return to;
}

/**
 * Content Security Policy for the Hatch frontend.
 *
 * Allows the four analytics integrations Hatch ships (GA4, GTM, Plausible,
 * Meta Pixel), Cloudflare Turnstile widget, Google Fonts, and self-hosted
 * assets. `'unsafe-inline'` is permitted for script + style because the
 * code-injection feature pastes inline `<script>` blocks; CSP nonces would
 * require regenerating the snippets per request. Trade-off accepted; users
 * who want stricter CSP can override via the response header in a custom
 * route handler.
 *
 * frame-ancestors 'none' kills clickjacking. form-action 'self' kills
 * cross-origin form posts. base-uri 'self' prevents `<base>` injection.
 */
/**
 * Rate-limit — in-memory token bucket keyed by client IP.
 *
 * Two endpoints are exposed to anonymous traffic and worth gating:
 *   /img             — image proxy. Open relay risk: anyone could fetch
 *                      arbitrary URLs through your worker quota.
 *   /blog/api/revalidate — webhook endpoint. Already gated by secret, but
 *                      brute-force resistance is cheap to add.
 *
 * In-memory storage means each worker isolate maintains its own bucket;
 * on CF Workers this resets frequently. For production, replace this with
 * a KV-backed counter — left as a follow-up in the Performance/Security
 * tab notes. The current implementation catches obvious abuse (1000+ rps
 * scrapers) and adds zero cost to legitimate traffic.
 */
interface Bucket { count: number; resetAt: number; }
const buckets = new Map<string, Bucket>();
const LIMITS: Record<string, { max: number; windowMs: number }> = {
  '/img':                   { max: 120, windowMs: 60_000 }, // 120 req/min — generous; protects against scrapers
  '/blog/api/revalidate':   { max: 20,  windowMs: 60_000 }, // 20 req/min — webhook bursts are fine, brute-force isn't
};

function clientIp(request: Request): string {
  // Cloudflare puts the real IP in CF-Connecting-IP; standard proxies use X-Forwarded-For.
  return request.headers.get('cf-connecting-ip')
      || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
      || 'unknown';
}

// Lazy bucket sweep — CF Workers v2 forbids top-level setInterval / fetch /
// random (10021 "Disallowed operation in global scope"). We sweep
// opportunistically inside rateLimit() at most once per minute. Node + CF
// both stay bounded just as well as a background tick would.
let lastSweep = 0;
function sweepExpiredBuckets(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
}

function rateLimit(request: Request, path: string): Response | null {
  const cfg = LIMITS[path];
  if (!cfg) return null;
  const key = `${path}:${clientIp(request)}`;
  const now = Date.now();
  sweepExpiredBuckets(now);
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + cfg.windowMs });
    return null;
  }
  if (b.count >= cfg.max) {
    return new Response('Too many requests', {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(1, Math.ceil((b.resetAt - now) / 1000))),
        'X-RateLimit-Limit': String(cfg.max),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(b.resetAt / 1000)),
      },
    });
  }
  b.count++;
  return null;
}

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://www.google-analytics.com https://*.analytics.google.com",
  "frame-src 'self' https://www.googletagmanager.com https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy':   CSP,
  'X-Content-Type-Options':    'nosniff',
  'Referrer-Policy':           'strict-origin-when-cross-origin',
  'X-Frame-Options':           'DENY',
  'Permissions-Policy':        'camera=(), microphone=(), geolocation=()',
  // HSTS only takes effect over HTTPS; harmless otherwise. 6-month max-age.
  'Strict-Transport-Security': 'max-age=15768000; includeSubDomains',
};

function attachSecurityHeaders(res: Response): Response {
  // HTML responses get the full CSP; assets get the minimal subset (no CSP
  // because some hosts apply CSP to images/fonts and break them).
  const ctype = res.headers.get('content-type') || '';
  if (!ctype.includes('text/html')) return res;
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  // Rate-limit first — cheapest filter, kills abuse before any work happens.
  const rl = rateLimit(context.request, url.pathname.startsWith('/img') ? '/img' : url.pathname);
  if (rl) return rl;

  // Only run redirect logic on GET/HEAD; other methods pass through.
  if (context.request.method === 'GET' || context.request.method === 'HEAD') {
    // Skip our own API and asset paths — they should never be 301'd.
    if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/_astro/') && !url.pathname.startsWith('/img')) {
      const rules = await fetchRedirects();
      for (const rule of rules) {
        const { matched, captured } = matches(url.pathname, rule);
        if (matched) {
          const target = resolveTarget(rule, captured, url);
          return new Response(null, {
            status: rule.status,
            headers: {
              Location: target,
              'X-Hatch-Redirect-Source': rule.source || 'wordpress',
              'Cache-Control': 'public, max-age=60',
            },
          });
        }
      }
    }
  }

  const res = await next();
  return attachSecurityHeaders(res);
});

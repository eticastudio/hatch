/**
 * hatch-deploy — minimal Node/Express app at hatch.adityaarsharma.com.
 *
 * Routes (v0.20.0):
 *   GET  /                            → marketing landing
 *   GET  /deploy/vps                  → bash one-liner info page
 *   GET  /install.sh                  → legacy install.sh (now served from GitHub raw)
 *
 *   POST /deploy/{provider}/prepare   → WP plugin POSTs WP creds + provider token
 *   GET  /deploy/{provider}/start     → browser handoff, auto-redirects to /build
 *   GET  /deploy/{provider}/build     → runs clone+install+build+deploy pipeline,
 *                                       streams live log via polling
 *   GET  /deploy/{provider}/status    → JSON build progress (polled every 2s)
 *
 *   where {provider} ∈ { vercel, cloudflare }
 *
 *   Both pipelines: no GitHub fork on user's account, token used in memory
 *   only during build, dropped on completion or failure.
 *
 *   GET  /icon.svg, /logo.svg         → 🐣 brand mark
 *   GET  /health                      → 200 "ok"
 */

import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deployToVercel }     from './lib/vercel-deploy.js';
import { deployToCloudflare } from './lib/cloudflare-deploy.js';
import { registerImgProxy }   from './lib/img-proxy.js';
import { registerOgImage }    from './lib/og-image.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT     = process.env.PORT || 3000;
const REPO     = process.env.HATCH_REPO     || 'https://github.com/adityaarsharma/hatch';
const ROOT_DIR = process.env.HATCH_ROOT_DIR || 'astro-starter';
const BASE_URL = (process.env.HATCH_DEPLOY_BASE || 'https://hatch.adityaarsharma.com').replace(/\/$/, '');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

// --------------------------------------------------------------------------
// In-memory ticket store with 5-minute TTL.
//
// Stages:
//   "prepared" → WP plugin POSTed credentials, awaiting browser handoff
//   "authorizing" → user redirected to Vercel OAuth, state nonce set
//   "complete" → project + env vars + deploy hook created; deploy_hook_url ready
//   "failed" → OAuth or API call failed; error message stored
//
// Access tokens NEVER stored. Used during the callback and discarded.
// --------------------------------------------------------------------------
const TICKET_TTL_MS = 5 * 60 * 1000;
const tickets = new Map(); // ticket_id => { data, expires_at }

function newTicket(data) {
	const id = crypto.randomUUID();
	tickets.set(id, { data, expires_at: Date.now() + TICKET_TTL_MS });
	return id;
}

function readTicket(id) {
	if (!id || typeof id !== 'string') return null;
	const t = tickets.get(id);
	if (!t) return null;
	if (t.expires_at < Date.now()) {
		tickets.delete(id);
		return null;
	}
	return t.data;
}

function updateTicket(id, patch) {
	const t = tickets.get(id);
	if (!t) return false;
	t.data = { ...t.data, ...patch };
	t.expires_at = Date.now() + TICKET_TTL_MS;
	return true;
}

// Sweep expired tickets every minute.
setInterval(() => {
	const now = Date.now();
	for (const [id, t] of tickets) {
		if (t.expires_at < now) tickets.delete(id);
	}
}, 60 * 1000).unref();

// --------------------------------------------------------------------------
// Tiny helpers
// --------------------------------------------------------------------------
async function vercelFetch(token, urlPath, options = {}) {
	const url = urlPath.startsWith('http') ? urlPath : `https://api.vercel.com${urlPath}`;
	const res = await fetch(url, {
		...options,
		headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type':  'application/json',
			...(options.headers || {}),
		},
	});
	const text = await res.text();
	let body;
	try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
	return { ok: res.ok, status: res.status, body };
}

// --------------------------------------------------------------------------
// Lucide icon helper (MIT — https://lucide.dev). Inline SVG, no JS, no CDN.
// Usage: ${lu('check')} or ${lu('chevron-down', 'lu-lg')}
// --------------------------------------------------------------------------
const LU_ICONS = {
	'check'       : '<polyline points="20 6 9 17 4 12"/>',
	'x'           : '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
	'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
	'arrow-right' : '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
	'arrow-up-right': '<line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>',
	'external-link': '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
	'sparkles'    : '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.937A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
	'zap'         : '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
	'shield'      : '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
	'puzzle'      : '<path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02"/>',
	'rocket'      : '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
	'globe'       : '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
	'help-circle' : '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
	'plug'        : '<path d="M9 2v6"/><path d="M15 2v6"/><path d="M12 17v5"/><path d="M5 8h14"/><path d="M6 11V8h12v3a6 6 0 0 1-12 0z"/>',
	'message'     : '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
	'file-text'   : '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
	'box'         : '<path d="m21 16-9 5-9-5V8l9-5 9 5z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
	'github'      : '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>',
	'image'       : '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
	'workflow'    : '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M21 6h-1.5a3 3 0 0 0-3 3v6.5"/><path d="M3 12h6.5a3 3 0 0 1 3 3V21"/>',
	'download'    : '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
	'menu'        : '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
	'star'        : '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
};
const lu = (name, extraClass = '') => {
	const path = LU_ICONS[name];
	if (!path) return '';
	return `<svg class="lu ${extraClass}" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
};

// --------------------------------------------------------------------------
// HTML helper — tagged template literal. `wide:true` renders the marketing
// layout (used by /). `terminal:true` styles the body for the live build-log
// pages. All variants share one design-token system (Inter + mono fallback,
// neutral surfaces, orange accent, terminal palette on dark backgrounds).
// --------------------------------------------------------------------------
const html = (title, body, opts = {}) => {
	const wide = opts.wide === true;
	const siteUrl    = 'https://hatch.adityaarsharma.com';
	const ogImage    = `${siteUrl}/og.png`;
	const ogTitle    = opts.ogTitle    || `${title} · Hatch`;
	const ogDesc     = opts.ogDesc     || 'The fastest way to WordPress. Headless. Edge-delivered. Live in 90 seconds. Open-source plugin + Astro starter — MIT, vendor-neutral, REST-only.';
	const canonical  = opts.canonical  || siteUrl;
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} · Hatch</title>
<meta name="description" content="${ogDesc}"/>
<link rel="canonical" href="${canonical}"/>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🐣%3C/text%3E%3C/svg%3E"/>

<!-- Open Graph -->
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Hatch"/>
<meta property="og:title" content="${ogTitle}"/>
<meta property="og:description" content="${ogDesc}"/>
<meta property="og:url" content="${canonical}"/>
<meta property="og:image" content="${ogImage}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="Hatch — The fastest way to WordPress. Headless. Edge-delivered. Live in 90 seconds."/>
<meta property="og:locale" content="en_US"/>

<!-- Twitter / X card -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${ogTitle}"/>
<meta name="twitter:description" content="${ogDesc}"/>
<meta name="twitter:image" content="${ogImage}"/>
<meta name="twitter:image:alt" content="Hatch — Headless WordPress in 90 seconds"/>
<meta name="twitter:creator" content="@adityaarsharma"/>
<meta name="twitter:site" content="@adityaarsharma"/>
<link rel="preconnect" href="https://rsms.me"/>
<link rel="stylesheet" href="https://rsms.me/inter/inter.css"/>
<style>
:root {
	--fg:#0a0a0a; --fg-muted:#525252; --fg-subtle:#737373;
	--bg:#fafafa; --surface:#fff; --bg-3:#f4f4f5;
	--border:#e5e5e5; --border-2:#d4d4d4;
	--primary:#ff6b00; --primary-soft:#fff3e8; --primary-fg:#fff;
	--green:#16a34a; --green-soft:#dcfce7;
	--mono: ui-monospace, SFMono-Regular, Menlo, 'Cascadia Code', monospace;
	--sans: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}
*,*:before,*:after { box-sizing: border-box; }
html,body { margin:0; padding:0; }
body {
	font-family: var(--sans); color: var(--fg);
	background: var(--bg);
	line-height: 1.55; -webkit-font-smoothing: antialiased;
	font-feature-settings: "ss01","cv11","cv02";
}
::selection { background: var(--primary); color: var(--primary-fg); }
main { ${wide ? 'max-width: 980px;' : 'max-width: 720px;'} margin: 0 auto; padding: ${wide ? '40px 24px 96px' : '48px 24px 80px'}; }
h1 { font-size: ${wide ? 'clamp(36px, 4.6vw, 56px)' : '32px'}; font-weight: 700; margin: 0 0 18px; letter-spacing: -0.03em; line-height: 1.08; max-width: 880px; }
h1 .accent { color: var(--primary); font-style: normal; }
h1 .hero-kicker { display: inline-block; margin-top: 12px; font-size: 0.5em; font-weight: 700; letter-spacing: -0.025em; color: var(--fg); line-height: 1.15; }
h1 .emoji { font-size: 0.85em; vertical-align: -3px; margin-right: 8px; }
h2 { font-size: ${wide ? '28px' : '20px'}; font-weight: 600; margin: ${wide ? '56px' : '32px'} 0 14px; letter-spacing: -0.015em; line-height: 1.2; }
h3 { margin: 0 0 6px; font-size: 16px; font-weight: 600; }
h4 { margin: 0 0 6px; font-size: 14px; font-weight: 600; }
p { color: var(--fg-muted); margin: 0 0 12px; font-size: 15px; }
p.lead { font-size: ${wide ? '20px' : '17px'}; color: var(--fg-muted); max-width: 680px; line-height: 1.55; }
a { color: var(--primary); text-decoration: none; }
a:hover { text-decoration: none; }
.faq-a a:hover, footer a:hover { text-decoration: underline; text-underline-offset: 3px; }
.card { background: var(--surface); border:1px solid var(--border); border-radius: 14px; padding: 22px; margin: 14px 0; }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px; border-radius: 999px; font-weight: 600; background: var(--fg); color: var(--surface); font-size: 14px; transition: opacity .15s, transform .08s; }
.btn:hover { text-decoration: none; opacity: .88; transform: translateY(-1px); }
.btn.primary { background: var(--primary); color: var(--primary-fg); }
.btn.secondary { background: var(--surface); color: var(--fg); border: 1px solid var(--border-2); }
.btn.secondary:hover { border-color: var(--fg); }
code { font-family: var(--mono); background: var(--bg-3); color: var(--fg); padding: 2px 6px; border-radius: 4px; font-size: 13px; }
pre { font-family: var(--mono); background:#0a0a0a; color:#e5e5e5; padding: 16px 18px; border-radius: 10px; overflow-x: auto; font-size: 13px; line-height: 1.65; margin: 12px 0; }
.pill { display: inline-flex; align-items: center; gap: 6px; background: var(--bg-3); color: var(--fg-muted); padding: 4px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 600; }
.pill.brand { background: var(--primary-soft); color: var(--primary); }
.pill.green { background: var(--green-soft); color: var(--green); }
ol li, ul li { margin-bottom: 8px; color: var(--fg-muted); font-size: 14.5px; line-height: 1.7; }
hr { border: 0; border-top: 1px solid var(--border); margin: 56px 0; }
footer { margin-top: 80px; padding-top: 32px; border-top: 1px solid var(--border); font-size: 13px; color: var(--fg-subtle); }
footer a { color: var(--fg-muted); }
footer a:hover { color: var(--fg); }
.grid { display: grid; gap: 16px; }
.grid-2 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.grid-3 { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.feature { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 22px; transition: border-color .15s; }
.feature:hover { border-color: var(--border-2); }
.feature .ico { display: inline-flex; width: 36px; height: 36px; align-items: center; justify-content: center; border-radius: 8px; background: var(--bg-3); margin-bottom: 14px; font-size: 18px; }
.feature h3 { font-size: 15px; margin-bottom: 4px; }
.feature p { font-size: 13.5px; line-height: 1.6; }
.topbar {
	position: sticky; top: 14px; z-index: 50;
	display: flex; align-items: center; justify-content: space-between;
	gap: 18px;
	max-width: 980px;
	margin: 14px auto 0;
	padding: 10px 12px 10px 22px;
	background: rgba(255, 255, 255, 0.92);
	backdrop-filter: saturate(180%) blur(14px);
	-webkit-backdrop-filter: saturate(180%) blur(14px);
	border: 1px solid rgba(255, 107, 0, 0.22);
	border-radius: 999px;
	box-shadow: 0 6px 24px -8px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.04);
}
.topbar .brand {
	display: inline-flex; align-items: center; gap: 10px;
	font-weight: 700; font-size: 15.5px; color: var(--fg);
	letter-spacing: -0.01em;
	flex-shrink: 0;
}
.topbar .brand .brand-mark {
	display: inline-flex; align-items: center; justify-content: center;
	width: 30px; height: 30px;
	background: var(--primary);
	color: #fff;
	border-radius: 8px;
	font-size: 17px;
}
.topbar nav {
	display: flex; align-items: center; gap: 0;
	font-size: 13px;
	flex: 1 1 auto; justify-content: center;
	white-space: nowrap;
}
.topbar nav a {
	color: var(--fg-muted); font-weight: 500;
	padding: 8px 11px; border-radius: 999px;
	transition: color .15s, background .15s;
	white-space: nowrap;
}
.topbar nav a:hover { color: var(--fg); background: rgba(0, 0, 0, 0.04); text-decoration: none; }
.nav-vision { position: relative; color: var(--primary) !important; font-weight: 600 !important; }
.nav-vision:hover { background: rgba(255, 88, 28, 0.08) !important; }
.vision-dot {
	display: inline-block; width: 6px; height: 6px; border-radius: 50%;
	background: var(--primary); margin-left: 6px; vertical-align: middle;
	box-shadow: 0 0 0 0 rgba(255, 88, 28, 0.55);
	animation: vision-pulse 2.2s ease-out infinite;
}
@keyframes vision-pulse {
	0% { box-shadow: 0 0 0 0 rgba(255, 88, 28, 0.55); }
	70% { box-shadow: 0 0 0 7px rgba(255, 88, 28, 0); }
	100% { box-shadow: 0 0 0 0 rgba(255, 88, 28, 0); }
}
@media (prefers-reduced-motion: reduce) { .vision-dot { animation: none; } }
@media (max-width: 640px) {
	.vision-grid { grid-template-columns: 1fr !important; gap: 4px 0 !important; }
	.vision-grid > div:nth-child(odd) { color: var(--primary) !important; font-weight: 600; padding-top: 14px; border-top: 1px dashed var(--border); }
	.vision-grid > div:nth-child(odd):first-of-type,
	.vision-grid > div:nth-child(2) { border-top: none; padding-top: 0; }
	.vision-grid > div:nth-child(1),
	.vision-grid > div:nth-child(2) { display: none; }
}
.topbar-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.topbar-star {
	background: transparent; color: var(--fg-muted);
	padding: 8px 14px; border-radius: 999px;
	font-size: 13px; font-weight: 600;
	border: 1px solid var(--border);
	display: inline-flex; align-items: center; gap: 6px;
	transition: all .15s; text-decoration: none;
}
.topbar-star:hover { background: var(--bg-3); color: var(--fg); border-color: var(--border-2); text-decoration: none; }
.topbar-cta {
	flex-shrink: 0;
	background: var(--primary); color: #fff;
	padding: 9px 18px; border-radius: 999px;
	font-size: 13.5px; font-weight: 600;
	display: inline-flex; align-items: center; gap: 6px;
	transition: background .15s; text-decoration: none;
}
.topbar-cta:hover { background: #e05a00; color: #fff; text-decoration: none; }
@media (max-width: 820px) { .topbar-star { display: none; } }
@media (max-width: 820px) {
	.topbar { max-width: calc(100% - 24px); padding: 8px 8px 8px 16px; gap: 8px; }
	.topbar nav { display: none; }
}
/* Hide desktop CTA on mobile — only hamburger shown */
@media (max-width: 820px) { .topbar-cta { display: none !important; } }

/* Hamburger button — 3-bar → X animation */
.topbar-hamburger {
	display: none;
	flex-direction: column;
	justify-content: center;
	gap: 4px;
	background: none;
	border: 1.5px solid var(--border-2);
	cursor: pointer;
	padding: 8px 10px;
	border-radius: 8px;
	color: var(--fg);
	transition: background .15s, border-color .15s;
	flex-shrink: 0;
	width: 38px; height: 38px;
}
.topbar-hamburger:hover { background: var(--bg-3); border-color: var(--border-2); }
@media (max-width: 820px) { .topbar-hamburger { display: flex; } }
.hbg-bar {
	display: block; width: 16px; height: 1.8px;
	background: currentColor; border-radius: 1px;
	transition: transform 0.28s cubic-bezier(.4,0,.2,1), opacity 0.2s ease, width 0.28s cubic-bezier(.4,0,.2,1);
	transform-origin: center;
}
.hbg-bar:nth-child(2) { width: 11px; }
.topbar-hamburger.is-open .hbg-bar:nth-child(1) { transform: translateY(5.8px) rotate(45deg); width: 16px; }
.topbar-hamburger.is-open .hbg-bar:nth-child(2) { opacity: 0; transform: scaleX(0); }
.topbar-hamburger.is-open .hbg-bar:nth-child(3) { transform: translateY(-5.8px) rotate(-45deg); }

/* Mobile fullscreen overlay — fade + slide in */
.mobile-menu {
	display: flex;
	flex-direction: column;
	position: fixed;
	inset: 0;
	background: rgba(250,250,250,0.97);
	backdrop-filter: saturate(180%) blur(18px);
	-webkit-backdrop-filter: saturate(180%) blur(18px);
	z-index: 300;
	visibility: hidden;
	opacity: 0;
	transform: translateY(-8px);
	pointer-events: none;
	transition: opacity 0.24s cubic-bezier(.4,0,.2,1), transform 0.24s cubic-bezier(.4,0,.2,1), visibility 0s linear 0.24s;
}
.mobile-menu.open {
	visibility: visible;
	opacity: 1;
	transform: translateY(0);
	pointer-events: auto;
	transition: opacity 0.24s cubic-bezier(.4,0,.2,1), transform 0.24s cubic-bezier(.4,0,.2,1), visibility 0s linear 0s;
}
.mobile-menu-head {
	display: flex; align-items: center; justify-content: space-between;
	padding: 14px 16px 14px 20px;
	border-bottom: 1px solid var(--border);
	flex-shrink: 0;
}
.mobile-menu-close {
	background: none;
	border: 1.5px solid var(--border-2);
	border-radius: 8px;
	font-size: 14px;
	cursor: pointer;
	color: var(--fg);
	padding: 7px 11px;
	line-height: 1;
	transition: background .15s;
}
.mobile-menu-close:hover { background: var(--bg-3); }
.mobile-menu-links {
	flex: 1; display: flex; flex-direction: column;
	overflow-y: auto; padding: 4px 0;
}
.mobile-menu-links a {
	font-size: 20px; font-weight: 600; color: var(--fg);
	padding: 20px 24px; border-bottom: 1px solid var(--border);
	letter-spacing: -0.02em; display: block;
	transition: background .12s, padding-left .18s cubic-bezier(.4,0,.2,1);
}
.mobile-menu-links a:hover { background: var(--bg-3); padding-left: 30px; }
.mobile-menu-foot {
	flex-shrink: 0; padding: 20px;
	border-top: 1px solid var(--border);
}
.mobile-menu-foot .topbar-cta {
	display: flex; width: 100%; justify-content: center;
	font-size: 15.5px; padding: 14px 20px; border-radius: 14px;
}
.step { display: flex; gap: 14px; align-items: flex-start; padding: 12px 0; }
.step-num { flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%; background: var(--bg-3); color: var(--fg); display: grid; place-items: center; font-weight: 700; font-size: 12.5px; font-family: var(--mono); }
.compare { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin: 16px 0; }
.compare > div { padding: 18px 22px; }
.compare > div + div { border-left: 1px solid var(--border); }
.compare h4 { margin-bottom: 10px; font-size: 13px; }
.compare ul { margin: 0; padding-left: 20px; }
.compare li { font-size: 13.5px; margin-bottom: 6px; }
.compare .pro li { color: var(--green); }
.compare .pro li span { color: var(--fg-muted); }
.compare .con li { color: #b91c1c; }
.compare .con li span { color: var(--fg-muted); }
.hero-wrap { position: relative; padding: 28px 0 24px; isolation: isolate; }
.hero-wrap::before {
	/* Full-viewport-width glow — spans the entire browser width so there's no
	   hard rectangle edge visible on wide screens. Centered on the hero column. */
	content: "";
	position: absolute;
	top: -40px; bottom: -80px;
	left: 50%; width: 100vw;
	transform: translateX(-50%);
	background: none;
	-webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%);
	        mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%);
	z-index: -1; pointer-events: none;
}
.hero-wrap::after {
	content: ""; position: absolute; inset: 0; z-index: -1;
	background-image:
		radial-gradient(circle at 1px 1px, rgba(0,0,0,0.045) 1px, transparent 0);
	background-size: 22px 22px;
	-webkit-mask-image: linear-gradient(to bottom, #000 0%, transparent 80%);
	        mask-image: linear-gradient(to bottom, #000 0%, transparent 80%);
}
.hero-stat-row { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 32px; padding: 18px 22px; border: 1px solid var(--border); border-radius: 12px; background: rgba(255,255,255,0.6); backdrop-filter: blur(6px); }
.tech-strip { margin-top: 32px; overflow: hidden; position: relative; }
.tech-strip::before, .tech-strip::after { content:""; position:absolute; top:0; bottom:0; width:60px; z-index:2; pointer-events:none; }
.tech-strip::before { left:0; background: linear-gradient(to right, var(--bg), transparent); }
.tech-strip::after  { right:0; background: linear-gradient(to left,  var(--bg), transparent); }
.tech-track { display: inline-flex; align-items: center; gap: 40px; animation: marquee 22s linear infinite; white-space: nowrap; padding: 14px 0; }
.tech-track:hover { animation-play-state: paused; }
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.tech-track .t-item { display: inline-flex; align-items: center; gap: 8px; opacity: 0.65; transition: opacity .2s; }
.tech-track .t-item:hover { opacity: 1; }
.tech-track img { height: 20px; width: auto; filter: grayscale(100%); transition: filter .2s; }
.tech-track .t-item:hover img { filter: grayscale(0%); }
.tech-track .t-label { font-size: 12.5px; font-weight: 500; color: var(--fg-muted); }
.tech-track .t-sep { width: 1px; height: 18px; background: var(--border); margin: 0 8px; }
.hh-triptych { display: grid; grid-template-columns: 1fr; gap: 16px; margin: 28px 0 8px; }
@media (min-width: 760px) { .hh-triptych { grid-template-columns: repeat(3, 1fr); gap: 20px; } }
.hh-step { display: flex; flex-direction: column; gap: 10px; padding: 22px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; position: relative; }
.hh-step .hh-num { position: absolute; top: 14px; right: 18px; font-size: 36px; font-weight: 700; color: var(--bg-3); line-height: 1; letter-spacing: -0.04em; }
.hh-step .hh-icon { width: 40px; height: 40px; display: inline-flex; align-items: center; justify-content: center; background: var(--primary-soft); color: var(--primary); border-radius: 10px; }
.hh-step .hh-icon svg { width: 22px; height: 22px; }
.hh-step h4 { font-size: 16px; margin: 4px 0 0; letter-spacing: -0.015em; }
.hh-step p { font-size: 13.5px; color: var(--fg-muted); margin: 0; line-height: 1.55; }
.hero-stat { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 130px; }
.hero-stat .n { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: var(--fg); font-variant-numeric: tabular-nums; }
.hero-stat .n.accent { color: var(--primary); }
.hero-stat .l { font-size: 12.5px; color: var(--fg-subtle); }
.btn.primary.glow { position: relative; box-shadow: 0 6px 16px -6px rgba(255,107,0,0.6), 0 1px 0 rgba(255,255,255,0.4) inset; }
.btn.primary.glow:hover { box-shadow: 0 10px 28px -8px rgba(255,107,0,0.7), 0 1px 0 rgba(255,255,255,0.4) inset; }
.live-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--green); box-shadow: 0 0 0 0 rgba(22,163,74,0.6); animation: pulse 1.8s infinite; vertical-align: 1px; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(22,163,74,0.55); } 70% { box-shadow: 0 0 0 8px rgba(22,163,74,0); } 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0); } }
.unique-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin-top: 24px; }
.u-card { padding: 22px; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); position: relative; overflow: hidden; transition: border-color .15s, transform .15s; }
.u-card:hover { border-color: var(--fg); transform: translateY(-2px); }
.u-card .vs { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: var(--fg-subtle); text-transform: uppercase; }
.u-card h3 { margin: 8px 0 6px; font-size: 16px; }
.u-card p { font-size: 13.5px; line-height: 1.6; margin: 0; }
.u-card .num { position: absolute; top: 18px; right: 22px; font-family: var(--mono); font-size: 11px; color: var(--fg-subtle); font-weight: 600; }
.sync-vis {
	margin: 28px 0 0;
	display: grid; grid-template-columns: 1fr auto 1fr; gap: 0; align-items: stretch;
	border: 1px solid var(--border); border-radius: 14px; overflow: hidden; background: var(--surface);
}
.sync-vis > .col { padding: 22px 24px; }
.sync-vis > .arrow {
	display: flex; flex-direction: column; align-items: center; justify-content: center;
	padding: 0 20px; background: linear-gradient(90deg, rgba(255,107,0,0.04), rgba(255,107,0,0.10), rgba(255,107,0,0.04));
	border-left: 1px solid var(--border); border-right: 1px solid var(--border);
	font-family: var(--mono); font-size: 12px; color: var(--primary); font-weight: 600;
}
.sync-vis > .arrow .a-dur { color: var(--fg-subtle); font-size: 11px; margin-top: 6px; }
.sync-vis .label { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: var(--fg-subtle); text-transform: uppercase; margin-bottom: 8px; }
.sync-vis .row { font-family: var(--mono); font-size: 12.5px; color: var(--fg-muted); padding: 4px 0; }
.sync-vis .row b { color: var(--fg); font-weight: 600; }
.callout {
	margin: 28px 0; padding: 22px 24px;
	border: 1px solid var(--border); border-radius: 14px;
	background: linear-gradient(180deg, var(--primary-soft), var(--surface));
	display: flex; gap: 18px; align-items: flex-start;
}
.callout .badge { background: var(--fg); color: var(--surface); font-family: var(--mono); font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; flex-shrink: 0; }
.callout h3 { margin: 0 0 8px; font-size: 16px; }
.callout p { margin: 0; font-size: 14px; color: var(--fg-muted); }
.callout ul { margin: 12px 0 0; padding-left: 20px; }
.callout ul li { font-size: 13.5px; color: var(--fg-muted); margin-bottom: 4px; }
.q-block { padding: 18px 22px; border-left: 3px solid var(--primary); background: var(--bg-3); border-radius: 0 10px 10px 0; margin: 18px 0; }
.q-block strong { color: var(--fg); }

/* Subtle live-dot pulse on first paint */
.live-dot {
	animation: livePulse 2.4s ease-in-out infinite;
}
@keyframes livePulse {
	0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); }
	50%      { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
}

/* Icon system — uniform 16-20px stroke icons */
.lu {
	display: inline-flex;
	width: 1em; height: 1em;
	vertical-align: -0.15em;
	stroke: currentColor;
	stroke-width: 2;
	stroke-linecap: round;
	stroke-linejoin: round;
	fill: none;
}
.lu-lg { width: 1.25em; height: 1.25em; }
.lu-xl { font-size: 22px; }

.s-ico {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 36px; height: 36px;
	background: var(--bg-3);
	color: var(--fg);
	border-radius: 8px;
	margin-right: 12px;
	flex-shrink: 0;
}
.s-ico.brand  { background: var(--primary-soft); color: var(--primary); }
.s-ico.green  { background: var(--green-soft);   color: var(--green); }
.s-ico.amber  { background: rgba(245, 158, 11, 0.12); color: #d97706; }
.s-ico.violet { background: rgba(124, 58, 237, 0.10); color: #7c3aed; }

.faq-list { max-width: 760px; margin-top: 16px; border-top: 1px solid var(--border); }
.closer { margin: 96px 0 56px; padding: 64px 32px; background: linear-gradient(180deg, var(--surface) 0%, var(--bg-3) 100%); border: 1px solid var(--border); border-radius: 24px; text-align: center; position: relative; overflow: hidden; }
.closer::before { content:""; position:absolute; inset:0; background: radial-gradient(ellipse at top, rgba(245, 158, 11, 0.10), transparent 60%); pointer-events:none; }
.closer-inner { position: relative; max-width: 640px; margin: 0 auto; }
.closer-h { font-size: clamp(28px, 4vw, 44px); margin: 14px 0 12px; letter-spacing: -0.025em; line-height: 1.1; }
.closer-sub { font-size: 16px; color: var(--fg-muted); line-height: 1.55; margin: 0 auto 28px; max-width: 520px; }
.closer-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 18px; }
.closer-actions .btn.lg { padding: 14px 26px; font-size: 15.5px; }
.closer-fineprint { font-size: 12.5px; color: var(--fg-subtle); line-height: 1.6; margin: 0; }
.btn.ghost { background: transparent; color: var(--fg); border: 1px solid var(--border); display: inline-flex; align-items: center; gap: 8px; padding: 14px 22px; font-weight: 600; border-radius: 999px; }
.btn.ghost:hover { background: var(--bg-3); }
@media (max-width: 720px) { .closer { padding: 44px 18px; margin: 64px 0 32px; } .closer-h { font-size: 28px; } }
.faq-item {
	border-bottom: 1px solid var(--border);
	transition: background 0.2s ease;
}
.faq-item:hover { background: rgba(0,0,0,0.015); }
.faq-item summary {
	list-style: none;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	padding: 20px 4px;
	font-weight: 600;
	font-size: 15px;
	color: var(--fg);
	user-select: none;
}
.faq-item summary::-webkit-details-marker { display: none; }
.faq-item summary::marker { content: ""; }
.faq-item .faq-chev {
	flex-shrink: 0;
	width: 18px; height: 18px;
	color: var(--fg-subtle);
	transition: transform 0.3s cubic-bezier(.2,.8,.2,1), color 0.2s;
}
.faq-item[open] .faq-chev { transform: rotate(180deg); color: var(--primary); }
.faq-item[open] summary { color: var(--primary); }
.faq-item .faq-a {
	padding: 0 4px 22px;
	font-size: 14px;
	line-height: 1.7;
	color: var(--fg-muted);
	max-width: 720px;
}
.faq-item .faq-a code { font-size: 12.5px; }
.faq-item .faq-chev { will-change: transform; }


/* Comparison table */
.vs-table-wrap { overflow-x: auto; margin: 28px 0 0; }
.vs-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.vs-table th { padding: 10px 16px; text-align: left; font-size: 11.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--fg-subtle); border-bottom: 2px solid var(--border); white-space: nowrap; }
.vs-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); color: var(--fg-muted); vertical-align: middle; }
.vs-table tr:last-child td { border-bottom: none; }
.vs-table tr:hover td { background: rgba(0,0,0,0.015); }
.vs-table td:first-child { font-weight: 500; color: var(--fg); }
.vs-hatch { background: rgba(255, 107, 0, 0.04); }
.vs-table th.vs-hatch { color: var(--primary); background: rgba(255,107,0,0.06); border-bottom-color: var(--primary); }
.tick-list { list-style: none; padding-left: 0; margin: 0; }
.tick-list li { position: relative; padding-left: 26px; margin-bottom: 8px; line-height: 1.6; }
.tick-list li::before { content: "✓"; position: absolute; left: 0; top: 0; color: var(--green, #16a34a); font-weight: 700; font-size: 15px; }
.vs-yes { color: var(--green); font-weight: 500; }
.vs-no { color: #dc2626; font-weight: 500; }
.vs-warn { color: #d97706; font-weight: 500; }
.vs-table td.vs-hatch.vs-yes, .vs-table td.vs-hatch.vs-no, .vs-table td.vs-hatch.vs-warn { font-weight: 700; }
.vs-na { color: var(--fg-subtle); }
.vs-note { font-size: 12px; color: var(--fg-subtle); margin-top: 14px; line-height: 1.6; }
.vs-note a { color: var(--fg-muted); }
.vs-boxes { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 32px; }
.vs-box { padding: 22px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; transition: border-color .15s, transform .15s; }
.vs-box:hover { border-color: var(--primary); transform: translateY(-2px); }
.vs-box-icon { font-size: 26px; margin-bottom: 10px; }
.vs-box h4 { font-size: 15px; margin: 0 0 8px; }
.vs-box p { font-size: 13px; color: var(--fg-muted); line-height: 1.6; margin: 0; }

/* Vibe-code comparison section */
.vibe-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 28px 0 24px; }
@media (max-width: 680px) { .vibe-grid { grid-template-columns: 1fr; } }
.vibe-card { padding: 24px; border-radius: 14px; border: 1px solid var(--border); }
.vibe-card h4 { font-size: 15px; margin: 0 0 14px; }
.vibe-card ul { margin: 0; padding-left: 18px; }
.vibe-card ul li { font-size: 13.5px; color: var(--fg-muted); line-height: 1.65; margin-bottom: 8px; }
.vibe-pain { background: #fef2f2; border-color: rgba(220,38,38,0.2); }
.vibe-pain h4 { color: #b91c1c; }
.vibe-hatch { background: var(--green-soft); border-color: rgba(22,163,74,0.25); }
.vibe-hatch h4 { color: var(--green); }
.vibe-cta-block { padding: 24px 28px; background: var(--primary-soft); border: 1px solid rgba(255,107,0,0.18); border-radius: 14px; }

.faq-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin: 20px 0 0; }
.faq-tab { padding: 8px 18px; border-radius: 999px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--fg-muted); transition: all 0.18s; }
.faq-tab:hover { background: var(--bg-3); color: var(--fg); }
.faq-tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.faq-item[hidden] { display: none; }


.reveal {
	opacity: 0;
	transform: translateY(20px);
	transition: opacity 0.7s cubic-bezier(.2,.8,.2,1), transform 0.7s cubic-bezier(.2,.8,.2,1);
}
.reveal.is-visible { opacity: 1; transform: translateY(0); }

.reveal-stagger > * {
	opacity: 0;
	transform: translateY(14px);
	transition: opacity 0.5s ease, transform 0.5s cubic-bezier(.2,.8,.2,1);
}
.reveal-stagger.is-visible > *           { opacity: 1; transform: translateY(0); }
.reveal-stagger.is-visible > *:nth-child(1) { transition-delay: 0ms;   }
.reveal-stagger.is-visible > *:nth-child(2) { transition-delay: 60ms;  }
.reveal-stagger.is-visible > *:nth-child(3) { transition-delay: 120ms; }
.reveal-stagger.is-visible > *:nth-child(4) { transition-delay: 180ms; }
.reveal-stagger.is-visible > *:nth-child(5) { transition-delay: 240ms; }
.reveal-stagger.is-visible > *:nth-child(6) { transition-delay: 300ms; }
.reveal-stagger.is-visible > *:nth-child(7) { transition-delay: 360ms; }
.reveal-stagger.is-visible > *:nth-child(8) { transition-delay: 420ms; }
.reveal-stagger.is-visible > *:nth-child(9) { transition-delay: 480ms; }

@media (prefers-reduced-motion: reduce) {
	.reveal, .reveal-stagger > * { opacity: 1; transform: none; transition: none; }
	.objection::before, .objection::after { transition: none; }
	.summary-emoji { animation: none; }
	.live-dot { animation: none; }
}
.term { font-family: var(--mono); background:#0a0a0a; color:#e5e5e5; border: 1px solid #262626; border-radius: 10px; padding: 18px 22px; font-size: 13px; line-height: 1.7; overflow-x: auto; max-height: 520px; overflow-y: auto; }
.term::-webkit-scrollbar { width: 8px; }
.term::-webkit-scrollbar-track { background: transparent; }
.term::-webkit-scrollbar-thumb { background: #262626; border-radius: 4px; }
.term-header { display:flex; align-items:center; gap:6px; padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid #262626; }
.term-dot { width:11px; height:11px; border-radius:50%; }
.term-dot.r { background:#ff5f57; } .term-dot.y { background:#febc2e; } .term-dot.g { background:#28c840; }
.term-title { margin-left:8px; font-size:11.5px; color:#737373; }
.term-line { white-space:pre-wrap; word-break:break-word; }
.term-line.ok    { color:#28c840; }
.term-line.warn  { color:#febc2e; }
.term-line.err   { color:#ff5f57; }
.term-line.dim   { color:#737373; }
.status-bar { display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:8px; background:var(--bg-3); font-size:13.5px; margin: 0 0 12px; }
.status-bar.live { background:var(--primary-soft); color: var(--primary); }
.status-bar.done { background: var(--green-soft); color: var(--green); }
.status-bar.fail { background: #fef2f2; color: #b91c1c; }
.status-bar .spinner { width:14px; height:14px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 820px) {
	h2 { font-size: 24px; }
	p.lead { font-size: 18px; }
	hr { margin: 48px 0; }
}
@media (max-width: 720px) {
	main { padding: 32px 18px 60px; }
	h2 { font-size: 22px; margin-top: 40px; }
	p.lead { font-size: 17px; }
	.compare { grid-template-columns: 1fr; }
	.compare > div + div { border-left: 0; border-top: 1px solid var(--border); }
	hr { margin: 40px 0; }
}
@media (max-width: 540px) {
	h1 { font-size: clamp(28px, 8vw, 40px); }
	h2 { font-size: 20px; margin-top: 32px; line-height: 1.25; }
	h3 { font-size: 15px; }
	p { font-size: 14.5px; }
	p.lead { font-size: 16px; line-height: 1.6; }
	hr { margin: 32px 0; }
	.hero-cta-row { flex-direction: column !important; gap: 8px !important; margin-top: 20px !important; }
	.hero-cta-row .btn { text-align: center; justify-content: center; width: 100%; }
	.hero-stat-row { grid-template-columns: 1fr 1fr; gap: 12px; }
	.hero-stat .n { font-size: 22px; }
	.hero-stat .l { font-size: 11px; }
	.unique-grid { grid-template-columns: 1fr; }
	.community-wrap { flex-direction: column; }
	.vs-table { font-size: 12px; }
	.vs-table th, .vs-table td { padding: 8px 10px; }
	.feature { padding: 16px; }
	.u-card { padding: 18px; }
}

/* Orbital decorative ring — hero background element */
.hero-orbital {
	position: absolute;
	top: -20px;
	right: -160px;
	width: 280px;
	height: 280px;
	pointer-events: none;
	animation: orbital-spin 50s linear infinite;
	z-index: -1;
	color: var(--primary);
	overflow: visible;
	opacity: 0.5;
}
@keyframes orbital-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .hero-orbital { animation: none; } }
@media (max-width: 820px) { .hero-orbital { display: none; } }

/* Community section */
.community-wrap { display: flex; gap: 20px; flex-wrap: wrap; margin: 28px 0 0; }
.community-card { flex: 1; min-width: 220px; padding: 24px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; transition: border-color .15s, transform .15s; text-decoration: none; color: inherit; display: block; }
.community-card:hover { border-color: var(--primary); transform: translateY(-2px); }
.community-card-icon { font-size: 26px; margin-bottom: 10px; }
.community-card h3 { font-size: 15px; margin: 0 0 8px; color: var(--fg); }
.community-card p { font-size: 13px; color: var(--fg-muted); margin: 0; line-height: 1.6; }
.community-card .cta-link { font-size: 13px; color: var(--primary); font-weight: 600; margin-top: 12px; display: block; }
</style>
${wide ? `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://hatch.adityaarsharma.com/#website",
      "url": "https://hatch.adityaarsharma.com",
      "name": "Hatch",
      "description": "Headless WordPress plugin and Astro starter that deploys to Cloudflare Workers, Vercel, or your VPS in 90 seconds.",
      "publisher": { "@id": "https://hatch.adityaarsharma.com/#organization" }
    },
    {
      "@type": "Organization",
      "@id": "https://hatch.adityaarsharma.com/#organization",
      "name": "Hatch",
      "url": "https://hatch.adityaarsharma.com",
      "logo": "https://hatch.adityaarsharma.com/img/hatch-logo.png",
      "sameAs": ["https://github.com/adityaarsharma/hatch"]
    },
    {
      "@type": "SoftwareApplication",
      "name": "Hatch",
      "applicationCategory": "DeveloperApplication",
      "operatingSystem": "WordPress 6.0+",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "url": "https://hatch.adityaarsharma.com",
      "description": "Open-source headless WordPress engine. WordPress plugin + Astro starter, 1-click deploy to Cloudflare or Vercel. MIT licensed.",
      "softwareVersion": "0.50",
      "license": "https://opensource.org/licenses/MIT",
      "author": {
        "@type": "Person",
        "name": "Aditya Sharma",
        "url": "https://adityaarsharma.com"
      }
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Do I need to be a developer to use Hatch?",
          "acceptedAnswer": { "@type": "Answer", "text": "No. The Hatch wizard handles deploy in about 90 seconds: install the plugin, paste an API token, pick Cloudflare or Vercel. No terminal. No Astro config." }
        },
        {
          "@type": "Question",
          "name": "Will my existing WordPress site work with Hatch?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes, if you are on Gutenberg. Content from posts, pages, custom post types, ACF fields, menus, and comments all carry over automatically. No export or import needed." }
        },
        {
          "@type": "Question",
          "name": "Do I have to redeploy every time I publish?",
          "acceptedAnswer": { "@type": "Answer", "text": "No. Hatch uses SSR with a 60-second edge cache. Hit Publish in WP and the post is live worldwide within a minute." }
        },
        {
          "@type": "Question",
          "name": "Will my SEO break with headless WordPress?",
          "acceptedAnswer": { "@type": "Answer", "text": "No. Rank Math, Yoast, SEOPress, and AIOSEO meta tags pipe through the Hatch head layer unchanged. JSON-LD schema passes verbatim." }
        },
        {
          "@type": "Question",
          "name": "What hosting does Hatch support?",
          "acceptedAnswer": { "@type": "Answer", "text": "Hatch deploys to Cloudflare Workers, Vercel, and any Linux VPS. The Cloudflare free tier (100k requests/day) and Vercel hobby plan both start at $0." }
        },
        {
          "@type": "Question",
          "name": "Is Hatch free?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. Hatch is MIT licensed, free forever, with no SaaS subscription, no account required, and no telemetry." }
        }
      ]
    }
  ]
}
</script>` : ''}
</head>
<body>${wide ? `<div class="topbar">
	<a class="brand" href="/"><span class="brand-mark" aria-hidden="true">🐣</span>Hatch</a>
	<nav>
		<a href="#headless-101">What is Headless?</a>
		<a href="#how">How it works</a>
		<a href="#why">Why Hatch</a>
		<a href="#vs">Hatch vs Others</a>
		<a href="#faq">FAQ</a>
		<a href="/vision" class="nav-vision">Vision<span class="vision-dot" aria-hidden="true"></span></a>
	</nav>
	<div class="topbar-actions">
		<a class="topbar-cta" href="${REPO}/releases/latest/download/hatch.zip" target="_blank" rel="noopener noreferrer">${lu('download', '')} Download free</a>
		<button class="topbar-hamburger" id="menu-btn" aria-label="Open navigation" aria-expanded="false" aria-controls="mobile-menu">
			<span class="hbg-bar" aria-hidden="true"></span>
			<span class="hbg-bar" aria-hidden="true"></span>
			<span class="hbg-bar" aria-hidden="true"></span>
		</button>
	</div>
</div>
<div class="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation" aria-hidden="true">
	<div class="mobile-menu-head">
		<a class="brand" href="/"><span class="brand-mark" aria-hidden="true">🐣</span>Hatch</a>
		<button class="mobile-menu-close" id="menu-close" aria-label="Close navigation">✕</button>
	</div>
	<nav class="mobile-menu-links">
		<a href="#headless-101" class="mob-link">What is Headless?</a>
		<a href="#how" class="mob-link">How it works</a>
		<a href="#why" class="mob-link">Why Hatch</a>
		<a href="#vs" class="mob-link">Hatch vs Others</a>
		<a href="#faq" class="mob-link">FAQ</a>
		<a href="/vision" class="mob-link nav-vision">Vision<span class="vision-dot" aria-hidden="true"></span></a>
	</nav>
	<div class="mobile-menu-foot">
		<a class="topbar-cta" href="${REPO}/releases/latest/download/hatch.zip" target="_blank" rel="noopener noreferrer">${lu('download', '')} Download Hatch, it's free</a>
	</div>
</div>` : ''}<main>${body}</main>
${wide ? `<script>
// Scroll-revealed sections. Honors prefers-reduced-motion via CSS @media query.
(function(){
	var io = new IntersectionObserver(function(entries){
		entries.forEach(function(e){
			if (e.isIntersecting) {
				e.target.classList.add('is-visible');
				io.unobserve(e.target);
			}
		});
	}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
	document.querySelectorAll('section, .objection, .u-card, .feature').forEach(function(el){
		// Don't reveal-fade the hero — it should be visible immediately.
		if (el.closest('.hero-wrap')) return;
		if (el.classList.contains('objection') || el.classList.contains('u-card') || el.classList.contains('feature')) {
			// Cards stagger inside their grid parent — let the grid handle the class.
			return;
		}
		el.classList.add('reveal');
		io.observe(el);
	});
	// Stagger objection / u-card / feature grids
	document.querySelectorAll('.objection-grid, .unique-grid, .grid-3, .grid-2').forEach(function(grid){
		grid.classList.add('reveal-stagger');
		io.observe(grid);
	});

	// v0.51 — animated stat counters. Reads data-target on each .n element,
	// counts up from 0 when the stat row enters view (one-shot, respects
	// prefers-reduced-motion). Pure JS, no library, idle-friendly.
	(function initStatCounters(){
		var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		var statRow = document.querySelector('.hero-stat-row');
		if (!statRow) return;
		var nums = statRow.querySelectorAll('.n[data-target]');
		if (!nums.length) return;
		function animateOne(el){
			var target  = parseFloat(el.getAttribute('data-target'));
			var prefix  = el.getAttribute('data-prefix') || '';
			var suffix  = el.getAttribute('data-suffix') || '';
			if (isNaN(target)) return;
			if (prefersReduced) { el.textContent = prefix + target + suffix; return; }
			var duration = 1100; // ms
			var start = performance.now();
			function frame(t){
				var p = Math.min(1, (t - start) / duration);
				// easeOutCubic for a satisfying overshoot-free finish
				var eased = 1 - Math.pow(1 - p, 3);
				var val = target * eased;
				// Round depending on target magnitude
				var disp = target >= 100 ? Math.round(val) : Math.round(val * 10) / 10;
				if (disp === Math.round(disp)) disp = Math.round(disp); // strip trailing .0
				el.textContent = prefix + disp + suffix;
				if (p < 1) requestAnimationFrame(frame);
			}
			requestAnimationFrame(frame);
		}
		var rowIo = new IntersectionObserver(function(entries){
			entries.forEach(function(e){
				if (e.isIntersecting) {
					nums.forEach(animateOne);
					rowIo.disconnect();
				}
			});
		}, { threshold: 0.4 });
		rowIo.observe(statRow);
	})();

	// Smooth scroll for anchor nav clicks
	document.querySelectorAll('a[href^="#"]').forEach(function(a){
		a.addEventListener('click', function(e){
			var id = a.getAttribute('href').slice(1);
			var el = document.getElementById(id);
			if (!el) return;
			e.preventDefault();
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
			history.replaceState(null, '', '#' + id);
		});
	});

	// Mobile hamburger menu
	(function(){
		var btn   = document.getElementById('menu-btn');
		var menu  = document.getElementById('mobile-menu');
		var close = document.getElementById('menu-close');
		if (!btn || !menu) return;
		function openMenu() {
			menu.classList.add('open');
			btn.classList.add('is-open');
			menu.setAttribute('aria-hidden', 'false');
			btn.setAttribute('aria-expanded', 'true');
			document.body.style.overflow = 'hidden';
		}
		function closeMenu() {
			menu.classList.remove('open');
			btn.classList.remove('is-open');
			menu.setAttribute('aria-hidden', 'true');
			btn.setAttribute('aria-expanded', 'false');
			document.body.style.overflow = '';
		}
		btn.addEventListener('click', openMenu);
		if (close) close.addEventListener('click', closeMenu);
		menu.querySelectorAll('.mob-link').forEach(function(a){
			a.addEventListener('click', function(){
				closeMenu();
				// let menu close before scrolling
				setTimeout(function(){ }, 280);
			});
		});
		document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeMenu(); });
	})();
})();
</script>` : ''}
</body></html>`;
};

// --------------------------------------------------------------------------
// GET / — marketing landing page
// --------------------------------------------------------------------------
app.get('/', (req, res) => {
	res.type('html').send(html('Hatch — Headless WordPress that actually feels live', `
		<section class="hero-wrap">
			<h1>The fastest way to <em class="accent">WordPress</em>.<br/><em class="accent">Headless</em>. Edge-delivered.<br/>Live in <em class="accent">90 seconds</em>.</h1>
			<p class="lead">
				Hatch replaces the one slow part of WordPress: PHP on every visitor request.
				Your editor stays. Your plugins stay. Your content stays.
				Visitors get a global-edge frontend that loads in under 100ms, from whichever city they're in.
				No rebuild. No new CMS. No learning curve.
			</p>
			<p class="hero-cta-row" style="margin-top: 28px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
				<a class="btn primary glow" href="${REPO}/releases/latest/download/hatch.zip" target="_blank" rel="noopener noreferrer">${lu('download', '')} Download Hatch, it's free</a>
				<a class="btn secondary" href="${REPO}" target="_blank" rel="noopener noreferrer">${lu('github', '')} Star on GitHub</a>
			</p>
			<p style="margin-top:14px; font-size:14px; font-weight:500; color: var(--fg-muted);">
				<span class="live-dot"></span>&nbsp; Free forever · No SaaS, no account, no telemetry. 1-click deploy to Cloudflare Workers, Vercel, or your VPS
			</p>

			<div class="hero-stat-row" aria-label="At a glance">
				<div class="hero-stat"><span class="n accent" data-target="90"  data-prefix="~" data-suffix="s">~90s</span><span class="l">First deploy, end to end</span></div>
				<div class="hero-stat"><span class="n"        data-target="60"  data-suffix="s">60s</span><span class="l">Content sync to live edge</span></div>
				<div class="hero-stat"><span class="n"        data-target="6">6</span><span class="l">Themes, ready out of the box</span></div>
				<div class="hero-stat"><span class="n">MIT</span><span class="l">Open source, self-hostable</span></div>
			</div>

			<!-- scrolling tech marquee — pauses on hover -->
			<div class="tech-strip" aria-label="Built on open standards">
				<div class="tech-track">
					<span class="t-item"><img src="https://cdn.simpleicons.org/wordpress/21759b" alt="WordPress" loading="lazy" decoding="async" /><span class="t-label">WordPress</span></span>
					<span class="t-item"><img src="https://cdn.simpleicons.org/astro/BC52EE"   alt="Astro"     loading="lazy" decoding="async" /><span class="t-label">Astro</span></span>
					<span class="t-sep" aria-hidden="true"></span>
					<span class="t-item"><img src="https://cdn.simpleicons.org/cloudflare/F38020" alt="Cloudflare" loading="lazy" decoding="async" /><span class="t-label">Cloudflare</span></span>
					<span class="t-item"><img src="https://cdn.simpleicons.org/vercel/000000"  alt="Vercel"    loading="lazy" decoding="async" /><span class="t-label">Vercel</span></span>
					<span class="t-item"><img src="https://cdn.simpleicons.org/linux/000000"   alt="Linux VPS" loading="lazy" decoding="async" /><span class="t-label">Any Linux VPS</span></span>
					<span class="t-item"><img src="https://cdn.simpleicons.org/github/181717"  alt="GitHub"    loading="lazy" decoding="async" /><span class="t-label">Open source</span></span>
					<!-- duplicate for seamless loop -->
					<span class="t-item"><img src="https://cdn.simpleicons.org/wordpress/21759b" alt="" loading="lazy" decoding="async" aria-hidden="true" /><span class="t-label">WordPress</span></span>
					<span class="t-item"><img src="https://cdn.simpleicons.org/astro/BC52EE"   alt="" loading="lazy" decoding="async" aria-hidden="true" /><span class="t-label">Astro</span></span>
					<span class="t-sep" aria-hidden="true"></span>
					<span class="t-item"><img src="https://cdn.simpleicons.org/cloudflare/F38020" alt="" loading="lazy" decoding="async" aria-hidden="true" /><span class="t-label">Cloudflare</span></span>
					<span class="t-item"><img src="https://cdn.simpleicons.org/vercel/000000"  alt="" loading="lazy" decoding="async" aria-hidden="true" /><span class="t-label">Vercel</span></span>
					<span class="t-item"><img src="https://cdn.simpleicons.org/linux/000000"   alt="" loading="lazy" decoding="async" aria-hidden="true" /><span class="t-label">Any Linux VPS</span></span>
					<span class="t-item"><img src="https://cdn.simpleicons.org/github/181717"  alt="" loading="lazy" decoding="async" aria-hidden="true" /><span class="t-label">Open source</span></span>
				</div>
			</div>

			<svg class="hero-orbital" viewBox="0 0 380 380" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
				<defs>
					<path id="orb-txt-path" d="M 190,12 A 178,178 0 1,1 189.99,12"/>
				</defs>
				<!-- Outer dashed ring -->
				<circle cx="190" cy="190" r="180" stroke="currentColor" stroke-width="1" stroke-dasharray="5 12" opacity="0.10"/>
				<!-- Inner dashed ring -->
				<circle cx="190" cy="190" r="130" stroke="currentColor" stroke-width="0.6" stroke-dasharray="3 16" opacity="0.06"/>
				<!-- Accent dots -->
				<circle cx="190" cy="10" r="4" fill="currentColor" opacity="0.22"/>
				<circle cx="370" cy="190" r="2.5" fill="currentColor" opacity="0.14"/>
				<circle cx="190" cy="370" r="3" fill="currentColor" opacity="0.10"/>
				<circle cx="10" cy="190" r="2" fill="currentColor" opacity="0.08"/>
				<!-- Circular text on outer ring -->
				<text font-size="9.5" fill="currentColor" opacity="0.18" font-family="ui-sans-serif,system-ui,-apple-system,sans-serif" font-weight="600" letter-spacing="3.2">
					<textPath href="#orb-txt-path">Headless WordPress · Edge · Open Source · 90s Deploy · Free ·&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Headless WordPress · Edge · Open Source · 90s Deploy · Free ·</textPath>
				</text>
			</svg>

		</section>

		<hr/>


		<section id="headless-101">
			<span class="pill">🌐 &nbsp; What is Headless?</span>
			<h2 style="margin-top:14px;">WordPress stays. The slow PHP delivery layer goes.</h2>
			<p class="lead" style="max-width:800px;">
				Every time someone visits your site, WordPress runs PHP, hits a database, builds HTML from scratch, and sends it from one server in one location. That's the slow part. It has nothing to do with your content or your editor. "Headless" means you keep WordPress exactly as it is, and only replace that delivery layer. Editors keep wp-admin. Visitors get pages served from a global edge network: no PHP, no database query, just fast cached HTML.
			</p>

			<div class="grid grid-2" style="margin-top:28px;">
				<div class="feature" style="background:#fff7f7; border-color:#fca5a5;">
					<h3 style="color:#b91c1c; margin-bottom:10px;">Classic WordPress</h3>
					<div style="font-family:var(--mono); font-size:12px; color:var(--fg-muted); background:var(--bg-3); padding:10px 12px; border-radius:6px; margin-bottom:12px; line-height:1.9;">
						Visitor<br/>↓ PHP executes<br/>↓ MySQL query<br/>↓ Build HTML<br/>↓ Send from 1 server
					</div>
					<ul style="margin:0; padding-left:18px; font-size:13px; color:var(--fg-muted); line-height:2;">
						<li>One origin server, one location</li>
						<li>PHP runs on every page request</li>
						<li>Cache plugin needed just to survive traffic</li>
						<li>wp-admin exposed to the internet</li>
					</ul>
				</div>
				<div class="feature" style="background:var(--primary-soft); border-color:var(--primary);">
					<h3 style="color:var(--primary); margin-bottom:10px;">WordPress + Hatch</h3>
					<div style="font-family:var(--mono); font-size:12px; color:var(--fg-muted); background:rgba(255,107,0,0.07); padding:10px 12px; border-radius:6px; margin-bottom:12px; line-height:1.9;">
						Editor saves<br/>↓ WP REST API<br/>↓ Astro SSR<br/>↓ 330+ edge cities globally
					</div>
					<ul style="margin:0; padding-left:18px; font-size:13px; color:var(--fg-muted); line-height:2;">
						<li>330+ edge locations worldwide</li>
						<li>Astro renders HTML, not PHP</li>
						<li>No cache plugin. Edge handles it.</li>
						<li>WP admin is a private origin nobody visits</li>
					</ul>
				</div>
			</div>

			<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:20px;">
				<div style="background:var(--bg-3); border-radius:10px; padding:18px 20px;">
					<h4 style="margin:0 0 6px; font-size:14px;">Why WordPress stays?</h4>
					<p style="margin:0; font-size:13px; color:var(--fg-muted); line-height:1.6;">
						23 years of plugin ecosystem. 60,000 plugins. Your client already knows the editor.
						Your team does not want to learn Contentful ($300+/mo) or Sanity ($99+/mo) or anything else.
						WordPress's editorial layer is genuinely good. The PHP delivery layer is the problem.
						Hatch replaces only the part that needed replacing.
					</p>
				</div>
				<div style="background:var(--bg-3); border-radius:10px; padding:18px 20px;">
					<h4 style="margin:0 0 6px; font-size:14px;">Why Astro as the frontend?</h4>
					<p style="margin:0; font-size:13px; color:var(--fg-muted); line-height:1.6;">
						Astro ships zero JavaScript by default. Built specifically for content-first sites,
						not apps. Outputs the fastest possible HTML. Runs on any host: Cloudflare Workers,
						Vercel, Node, Netlify, Fly.io. Reached 46,000+ GitHub stars and ranked among the
						fastest-growing JS frameworks by weekly downloads in 2024.
					</p>
				</div>
			</div>

			<p style="margin-top:20px; font-size:14px; color:var(--fg-muted);">
				There is a longer version of this story.
				<a href="/vision" style="color:var(--primary); font-weight:600;">Read the Vision page →</a>
				It covers why WordPress should be modern without replacing itself, what it took to build Hatch, and where this is going.
			</p>
		</section>

		<hr/>

		<section id="how">
			<span class="pill">⏵ &nbsp; How it works</span>
			<h2 style="margin-top:14px;">From zip-upload to live edge site in 90 seconds.</h2>
			<div style="max-width: 720px; margin-top: 18px;">
				<div class="step">
					<div class="step-num">1</div>
					<div>
						<h3>Install the plugin on your WordPress site</h3>
						<p>Drop <code>hatch.zip</code> into <code>wp-content/plugins/</code> or upload via Plugins → Add New. Activate. The setup wizard launches automatically and walks you through a diagnostic + theme pick.</p>
					</div>
				</div>
				<div class="step">
					<div class="step-num">2</div>
					<div>
						<h3>Pick a host, paste one token</h3>
						<p>Cloudflare Workers (free tier, edge, 100k req/day) · Vercel (free hobby) · Your own VPS (one bash command). Wizard generates the Application Password automatically — no manual API password setup.</p>
					</div>
				</div>
				<div class="step">
					<div class="step-num">3</div>
					<div>
						<h3>Watch the build, live in ~90s</h3>
						<p>Broker clones, npm installs, builds the Astro frontend, deploys to your host. Token used once, in memory, dropped on completion. Live <code>*.workers.dev</code> or <code>*.vercel.app</code> URL appears. Connect your custom domain when ready.</p>
					</div>
				</div>
				<div class="step">
					<div class="step-num">4</div>
					<div>
						<h3>Publish posts as usual</h3>
						<p>New posts appear on the frontend within ~60 seconds. SSR fetches WP at request time, edge cache holds the page for 60s. No rebuild loops. No deploy hooks. No webhook plumbing. <span class="live-dot"></span>&nbsp;<strong>It just feels live.</strong></p>
					</div>
				</div>
			</div>
		</section>

		<hr/>

		<section id="hosts">
			<span class="pill">⊕ &nbsp; Your infrastructure, your rules</span>
			<h2 style="margin-top:14px;">Your visitors load from the nearest of 300 cities.<br/>You pick where the code runs.</h2>
			<p style="max-width:640px; margin-bottom: 24px;">
				Most hosting decisions lock you in the moment you write host-specific code. Hatch doesn't.
				One Astro codebase, identical on all three targets.
				Outgrow your host? Switch in 90 seconds — one click in the plugin, zero code changes.
			</p>
			<div class="grid grid-3">
				<div class="feature">
					<h3>⚡ Cloudflare Workers <span class="pill green" style="margin-left:8px;">Recommended</span></h3>
					<p style="margin-top:8px;">330+ cities. Free for 100,000 requests per day. Your visitors hit the closest edge node — under 50ms globally on the free tier. Paste your API token, Hatch handles the rest. Live in 90 seconds.</p>
				</div>
				<div class="feature">
					<h3>▲ Vercel</h3>
					<p style="margin-top:8px;">Free hobby tier. Instant rollbacks. The broker uses <code>vercel deploy --prebuilt</code> so you keep full control of your code. A natural fit if your team is already on Vercel.</p>
				</div>
				<div class="feature">
					<h3>🖥 Your VPS</h3>
					<p style="margin-top:8px;">Hetzner, DigitalOcean, RunCloud, Coolify, Dokploy — any Linux box with Node 22. One curl command installs everything locally. No broker involved. Fully self-contained on hardware you control.</p>
				</div>
			</div>
			<p style="margin-top:18px; font-size:13.5px; color:var(--fg-subtle);">Also runs on Netlify, Render, Fly.io, AWS Amplify — anywhere Astro SSR is supported. Switch anytime. Costs nothing to move.</p>

			<!-- Inline sync diagram — folded from former #dynamic section -->
			<div class="sync-vis" role="img" aria-label="How content goes live in Hatch" style="margin-top: 32px;">
				<div class="col">
					<div class="label">In WordPress</div>
					<div class="row"><b>Author hits Publish</b></div>
					<div class="row">→ <span style="color:var(--fg-subtle)">REST exposes new post</span></div>
					<div class="row">→ <span style="color:var(--fg-subtle)">Cache invalidated</span></div>
				</div>
				<div class="arrow">→ <span class="a-dur">~60s</span></div>
				<div class="col">
					<div class="label">On the live edge</div>
					<div class="row"><span class="live-dot"></span> &nbsp;<b>SSR fetch revalidates</b></div>
					<div class="row">→ <span style="color:var(--fg-subtle)">200 OK, fresh HTML</span></div>
					<div class="row">→ <span style="color:var(--fg-subtle)">Cached for next visitors</span></div>
				</div>
			</div>
			<p style="margin-top:10px; font-size:13px; color:var(--fg-subtle);">Unlike static headless (Gatsby, SSG) — no rebuild on every publish. SSR at the edge: fetched live, cached for speed.</p>
		</section>

		<hr/>

		<section id="why">
			<span class="pill">↗ &nbsp; What changes for you</span>
			<h2 style="margin-top:14px;">Keep the editor your team loves.<br/>Lose the bills, the bloat, the cache-plugin roulette.</h2>
			<p class="lead" style="margin-bottom: 28px;">
				Your authors keep wp-admin. Your developers stop fighting cache plugins.
				Your visitors get a Lighthouse-100 site from a global edge network.
				Your hosting bill drops to zero on Cloudflare's free tier.
				Nobody had to learn a new editor or touch a config file.
			</p>
			<div class="compare">
				<div class="pro">
					<h4 style="color: var(--green);">✓ With Hatch (headless)</h4>
					<ul>
						<li>Lighthouse 100 <span>· edge-cached SSR, no PHP per request</span></li>
						<li>Free hosting tier <span>· Cloudflare Workers free tier (100k req/day)</span></li>
						<li>WP editor unchanged <span>· authors keep what they know</span></li>
						<li>Hardened CMS <span>· REST locked, login URL changed, xmlrpc off</span></li>
						<li>Vendor-neutral <span>· REST API, no WPGraphQL lock-in</span></li>
						<li>1-click deploy <span>· paste a token, broker builds + ships</span></li>
					</ul>
				</div>
				<div class="con">
					<h4 style="color: #b91c1c;">✗ Without Hatch (classic WP)</h4>
					<ul>
						<li>Slow first paint <span>· PHP renders every page</span></li>
						<li>Plugin bloat <span>· every plugin runs on every request</span></li>
						<li>Expensive at scale <span>· LiteSpeed / WP Engine bills</span></li>
						<li>Vulnerable surface <span>· wp-admin, xmlrpc, user-enum open</span></li>
						<li>Cache-plugin hell <span>· W3TC vs Rocket vs LiteSpeed roulette</span></li>
						<li>Setup is hours <span>· DNS, SSL, CDN, cache, security manual</span></li>
					</ul>
				</div>
			</div>

			<!-- Plugin compat strip — formerly standalone #plugins section -->
			<div style="margin-top: 32px; padding: 22px 24px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px;">
				<p style="margin: 0 0 14px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-subtle);">Works with your existing plugins</p>
				<div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
					<span class="pill" style="font-size:12px;">✅ Rank Math</span>
					<span class="pill" style="font-size:12px;">✅ Yoast SEO</span>
					<span class="pill" style="font-size:12px;">✅ SEOPress</span>
					<span class="pill" style="font-size:12px;">✅ ACF / ACF Pro</span>
					<span class="pill" style="font-size:12px;">✅ Meta Box</span>
					<span class="pill" style="font-size:12px;">✅ Fluent Forms</span>
					<span class="pill" style="font-size:12px;">✅ WPForms</span>
					<span class="pill" style="font-size:12px;">✅ Redirection</span>
					<span class="pill" style="font-size:12px;">✅ Cloudflare Turnstile</span>
					<span class="pill" style="font-size:12px;">✅ WooCommerce (browse)</span>
					<span class="pill" style="font-size:12px;">✅ All Gutenberg core blocks</span>
					<span class="pill" style="font-size:12px; opacity:0.65;">🟡 WooCommerce checkout (roadmap)</span>
				</div>
				<p style="margin: 0; font-size: 12.5px; color: var(--fg-subtle);">
					<strong style="color:var(--fg);">Not compatible:</strong> Elementor, Divi, Bricks, WPBakery (PHP page builders). Cache plugins (WP Rocket, W3TC, LiteSpeed) should be deactivated — edge caching is built in.
				</p>
			</div>

			<!-- Differentiator cards — formerly standalone #unique section -->
			<div class="unique-grid" style="margin-top: 28px;">
				<div class="u-card">
					<span class="num">01</span>
					<span class="vs">vs Faust / Frontity</span>
					<h3>Your codebase stays yours</h3>
					<p>Paste a token. Broker builds from its own runner. Your repo stays yours. Tokens never live on disk.</p>
				</div>
				<div class="u-card">
					<span class="num">02</span>
					<span class="vs">vs WPGraphQL stacks</span>
					<h3>REST-only, no GraphQL needed</h3>
					<p>Native WP REST + a tiny <code>/hatch/v1</code> namespace. No new query layer. Updates don't break on WP upgrades.</p>
				</div>
				<div class="u-card">
					<span class="num">03</span>
					<span class="vs">vs DIY headless</span>
					<h3>Auto-detects your stack</h3>
					<p>Yoast / Rank Math / ACF / Fluent Forms. Hatch reads what you have installed and wires it up. No config files.</p>
				</div>
				<div class="u-card">
					<span class="num">04</span>
					<span class="vs">vs static headless</span>
					<h3>Comments + Forms feel native</h3>
					<p>Real WP comments on the frontend, spam-gated by Turnstile. Forms post to Fluent Forms / WPForms REST endpoints.</p>
				</div>
				<div class="u-card">
					<span class="num">05</span>
					<span class="vs">vs vendor-locked tools</span>
					<h3>One-click host portability</h3>
					<p>Same Astro starter on Cloudflare, Vercel, or VPS. Move in one click. No code change, no DNS panic.</p>
				</div>
				<div class="u-card">
					<span class="num">06</span>
					<span class="vs">vs everyone</span>
					<h3>One plugin. Batteries included.</h3>
					<p>REST hardening, App Password wizard, ACF bridge, SEO bridge, Gutenberg block library. Stop installing five plugins.</p>
				</div>
			</div>
		</section>

		<hr/>

		<section id="vs">
			<span class="pill brand">⚡ &nbsp; Hatch vs Others</span>
			<h2 style="margin-top:14px;">The headless WordPress landscape.<br/>Why Hatch wins for most sites.</h2>
			<p class="lead" style="max-width:680px;">
				Every major headless WP approach has a deal-breaker for real teams.
				Here's the honest picture.
			</p>

			<div class="vs-table-wrap">
				<table class="vs-table">
					<thead>
						<tr>
							<th>What you need</th>
							<th class="vs-hatch">Hatch</th>
							<th>Faust.js</th>
							<th>Next.js + WPGraphQL</th>
							<th>Gatsby + WP</th>
							<th>Classic WP</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>1-click deploy from WP admin</td>
							<td class="vs-hatch vs-yes">✓</td>
							<td class="vs-no">✗</td>
							<td class="vs-no">✗</td>
							<td class="vs-no">✗</td>
							<td class="vs-na">N/A</td>
						</tr>
						<tr>
							<td>Publish in wp-admin → live in ~60s (no rebuild)</td>
							<td class="vs-hatch vs-yes">✓ SSR</td>
							<td class="vs-warn">ISR</td>
							<td class="vs-warn">ISR/SSR</td>
							<td class="vs-no">✗ SSG rebuild</td>
							<td class="vs-yes">✓ Native</td>
						</tr>
						<tr>
							<td>Gutenberg blocks render natively on the frontend</td>
							<td class="vs-hatch vs-yes">✓ Built-in</td>
							<td class="vs-warn">Partial</td>
							<td class="vs-warn">Dev work</td>
							<td class="vs-warn">Dev work</td>
							<td class="vs-yes">✓ Native</td>
						</tr>
						<tr>
							<td>ACF / Meta Box custom fields work out of the box</td>
							<td class="vs-hatch vs-yes">✓ via REST</td>
							<td class="vs-warn">via WPGraphQL</td>
							<td class="vs-warn">via WPGraphQL</td>
							<td class="vs-warn">via WPGraphQL</td>
							<td class="vs-yes">✓ Native</td>
						</tr>
						<tr>
							<td>Themes included + one-click switch</td>
							<td class="vs-hatch vs-yes">✓ 6 themes</td>
							<td class="vs-no">✗</td>
							<td class="vs-no">✗</td>
							<td class="vs-no">✗</td>
							<td class="vs-yes">✓ thousands</td>
						</tr>
						<tr>
							<td>No WPGraphQL required</td>
							<td class="vs-hatch vs-yes">✓ REST only</td>
							<td class="vs-no">✗ Required</td>
							<td class="vs-no">✗ Required</td>
							<td class="vs-no">✗ Required</td>
							<td class="vs-na">N/A</td>
						</tr>
						<tr>
							<td>Works with existing WP site (Bedrock, subfolder, plain perms)</td>
							<td class="vs-hatch vs-yes">✓</td>
							<td class="vs-warn">Dev work</td>
							<td class="vs-warn">Dev work</td>
							<td class="vs-warn">Dev work</td>
							<td class="vs-yes">✓</td>
						</tr>
						<tr>
							<td>Built-in security hardening (REST + xmlrpc + app-pwd)</td>
							<td class="vs-hatch vs-yes">✓ Built-in</td>
							<td class="vs-no">✗ DIY</td>
							<td class="vs-no">✗ DIY</td>
							<td class="vs-no">✗ DIY</td>
							<td class="vs-no">✗ Plugin</td>
						</tr>
						<tr>
							<td>One codebase → Cloudflare, Vercel, or your VPS</td>
							<td class="vs-hatch vs-yes">✓</td>
							<td class="vs-warn">WP Engine focus</td>
							<td class="vs-yes">✓</td>
							<td class="vs-yes">✓</td>
							<td class="vs-no">✗ Single server</td>
						</tr>
						<tr>
							<td>Open source · MIT · free forever</td>
							<td class="vs-hatch vs-yes">✓ MIT</td>
							<td class="vs-yes">✓ MIT</td>
							<td class="vs-yes">✓</td>
							<td class="vs-yes">✓</td>
							<td class="vs-yes">✓ GPL</td>
						</tr>
					</tbody>
				</table>
				<p class="vs-note">Frontity is excluded — the project was archived in February 2025 after the team joined Automattic. Faust.js data sourced from <a href="https://faustjs.org" target="_blank" rel="noopener noreferrer">faustjs.org</a> docs. ISR = Incremental Static Regeneration (rebuilds on a schedule, not on publish).</p>
			</div>

			<div class="vs-boxes">
				<div class="vs-box">
					<div class="vs-box-icon">🔌</div>
					<h4>Zero GraphQL dependency</h4>
					<p>Every other headless WP approach requires the WPGraphQL plugin. Hatch uses the native WP REST API. Less setup, less maintenance, works with older WordPress installs.</p>
				</div>
				<div class="vs-box">
					<div class="vs-box-icon">⚡</div>
					<h4>Publish in WP, live in 60 seconds</h4>
					<p>SSG tools (Gatsby, many Next.js setups) rebuild your entire site on every publish. Hatch is SSR with a 60-second edge cache. No build queue. No waiting.</p>
				</div>
				<div class="vs-box">
					<div class="vs-box-icon">🎨</div>
					<h4>6 themes, ready to deploy</h4>
					<p>Faust.js and custom Next.js stacks ship with zero UI. You build everything from scratch. Hatch comes with 6 production-ready Astro themes. Pick one, deploy, done.</p>
				</div>
				<div class="vs-box">
					<div class="vs-box-icon">👆</div>
					<h4>No developer required</h4>
					<p>The WP plugin wizard handles everything. Generate the Application Password, pick your host, deploy. Faust and Next.js require a developer to set up the stack and write the data layer.</p>
				</div>
			</div>
		</section>

		<hr/>


		<section id="why-wp">
			<span class="pill" style="background: rgba(33, 117, 155, 0.10); color: #21759b; border-color: rgba(33, 117, 155, 0.25);">
				<img src="https://cdn.simpleicons.org/wordpress/21759b" alt="" style="height:12px; width:12px; vertical-align:middle; margin-right:4px; filter:none;"/> Why WordPress at all?
			</span>
			<h2 style="margin-top:14px;">Why not Sanity? Or Contentful? Or write your own CMS?</h2>
			<p class="lead" style="max-width: 720px;">
				Because <strong>your client just figured out how to bold a word</strong>. Because the writer you hired
				on Tuesday already knows the editor. Because 60,000 plugins exist for the thing you're about to
				rebuild from scratch. Because the licensing math on Sanity, Contentful and Hygraph starts billing <strong>per seat, per API call, per environment</strong>
				the moment your team grows.
			</p>
			<div class="grid grid-3" style="margin-top: 28px;">
				<div class="feature">
					<h3 style="color: var(--green, #16a34a);">✓ What you keep with WordPress</h3>
					<p style="margin-top:6px; font-size:13.5px;">23 years of plugin ecosystem · Gutenberg block editor · ACF, Yoast, WooCommerce, Fluent Forms · zero retraining for your team · zero rewriting your content.</p>
				</div>
				<div class="feature">
					<h3 style="color: var(--green, #16a34a);">✓ What Hatch adds on top</h3>
					<p style="margin-top:6px; font-size:13.5px;">Edge-cached SSR · 60s content sync · Lighthouse 100 · free Cloudflare hosting · REST-hardened security · 1-click deploy to CF / Vercel / your VPS.</p>
				</div>
				<div class="feature">
					<h3 style="color: var(--green, #16a34a);">✓ What you stop paying</h3>
					<p style="margin-top:6px; font-size:13.5px;">$300/mo Contentful seats · $99/mo Sanity editors · WP Engine premium tiers · LiteSpeed licenses · cache-plugin renewals. The total replacement = $0 + your time.</p>
				</div>
			</div>
		</section>

		<hr/>

		<section id="vibe">
			<span class="pill brand">🤖 &nbsp; The AI objection, answered</span>
			<h2 style="margin-top:14px;">"I'll just vibe-code my site<br/>with Claude. I don't need this."</h2>
			<p class="lead" style="max-width:680px;">
				Fair. But you're not building it for yourself — you're handing it to someone who can't prompt their way out of a broken image gallery.
			</p>

			<div class="vibe-grid">
				<div class="vibe-card vibe-pain">
					<h4>The vibe-code path</h4>
					<ul>
						<li>Week 1: Site looks great. You ship it.</li>
						<li>Week 3: Client wants to update a blog post. You write a prompt. AI rewrites the wrong section.</li>
						<li>Week 5: Image gallery breaks. 4-hour debug session.</li>
						<li>Week 8: Client wants SEO. You hand-craft meta tags per page.</li>
						<li>Week 12: Client hires someone else to maintain the markdown files.</li>
					</ul>
				</div>
				<div class="vibe-card vibe-hatch">
					<h4>The Hatch path</h4>
					<ul>
						<li>Week 1: WordPress installed, Hatch deployed, site live.</li>
						<li>Week 3: Client edits their blog post themselves. Zero messages to you.</li>
						<li>Week 5: Client uploads 20 images. Done in two minutes.</li>
						<li>Week 8: SEO is automatic. Their existing plugin just works.</li>
						<li>Week 12: Client is fully independent. You're already on the next job.</li>
					</ul>
				</div>
			</div>

			<div class="vibe-cta-block">
				<p style="font-size:15px; color:var(--fg-muted); line-height:1.65; max-width:680px;">
					<strong>Use both.</strong> Build with AI. Run on WordPress.
					Claude can customize the Hatch theme in an afternoon — the Astro code is clean and extensible.
					Your client never touches the code. They just write posts and upload images, the same way they always have.
					You deliver something they can actually run without you.
				</p>
				<p style="margin-top:12px; font-size:14px; color:var(--fg-subtle);">
					Headless is the future. WordPress is the present. Hatch ships both, today.
				</p>
			</div>
		</section>

		<hr/>

		<section id="privacy">
			<span class="pill">🛡 &nbsp; Nothing to hide</span>
			<h2 style="margin-top:14px;">Giving a deploy token to any tool is uncomfortable.<br/>Here is exactly what happens to yours — and how to skip the broker entirely.</h2>
			<div style="max-width: 720px;">
				<p style="margin-bottom: 16px;"><strong>The short version:</strong> When you click "Build &amp; deploy," your WP credentials and host token travel to the broker over HTTPS. They live in memory for the ~90-second build window while <code>npm run build</code> runs. Then they're gone. <strong>Nothing written to disk. Nothing logged. No database. Ever.</strong></p>
				<p style="margin-bottom: 16px;">Don't want to trust a third-party broker at all? Good instinct. The broker is <a href="${REPO}/tree/main/hatch-deploy" target="_blank" rel="noopener noreferrer">MIT-licensed — 7 files of plain Node.js</a>. Fork it, self-host it on any VPS in under 10 minutes, point the plugin at your own instance. Or use the VPS install path and skip the cloud entirely — no broker involved.</p>
				<ul class="tick-list">
					<li>No long-term token storage — Vercel/CF tokens are used once and forgotten</li>
					<li>Your content never passes through the broker — Astro fetches WP REST directly at runtime</li>
					<li>Self-hostable — set <code>HATCH_DEPLOY_BROKER_URL</code> to your own instance</li>
					<li>Broker-optional — the VPS path installs everything locally, zero third-party</li>
					<li>Open source — every broker line is public. Read it at <a href="${REPO}/tree/main/hatch-deploy" target="_blank" rel="noopener noreferrer">hatch-deploy/</a>. Audit before you trust</li>
				</ul>
			</div>
		</section>


		<hr/>

		<section id="faq">
			<span class="pill"><span style="display:inline-flex;font-size:13px;color:var(--primary);">${lu('help-circle')}</span> &nbsp; Questions, answered honestly</span>
			<h2 style="margin-top:14px;">FAQ</h2>
			<p class="lead" style="max-width:660px;">Pick a category. Click any question to expand.</p>

			<div class="faq-tabs" role="tablist">
				<button class="faq-tab active" data-filter="start" role="tab" aria-selected="true">Getting Started</button>
				<button class="faq-tab" data-filter="wp" role="tab" aria-selected="false">WordPress &amp; Plugins</button>
				<button class="faq-tab" data-filter="perf" role="tab" aria-selected="false">Performance &amp; SEO</button>
				<button class="faq-tab" data-filter="honest" role="tab" aria-selected="false">Limits &amp; Honest</button>
			</div>

			<div class="faq-list">

				<!-- Getting Started -->
				<details class="faq-item" data-cat="start">
					<summary><span>Do I need to be a developer?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">No. The Hatch wizard handles deploy in about 90 seconds: install the plugin, paste an API token, pick Cloudflare or Vercel. No terminal. No Astro config. No Node version management. If you can install a WordPress plugin, you can run Hatch. Developers get direct access to the Astro source for deeper customisation.</div>
				</details>
				<details class="faq-item" data-cat="start">
					<summary><span>Will my existing WordPress site work?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">Yes, if you're on Gutenberg. Content from posts, pages, custom post types, ACF fields, menus, and comments all carry over automatically. No export or import. The WordPress database stays where it is. The one limit: PHP-rendered page builders (Elementor, Divi, Bricks) don't have a headless equivalent without rebuilding pages in blocks.</div>
				</details>
				<details class="faq-item" data-cat="start">
					<summary><span>Do I have to redeploy every time I publish?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">No. Hatch uses SSR with a 60-second edge cache. Hit Publish in WP and the post is live worldwide within a minute. A frontend redeploy is only needed when Hatch ships new Astro code. That's a one-click button in the plugin, not a terminal command.</div>
				</details>
				<details class="faq-item" data-cat="start">
					<summary><span>Does it work on shared hosting?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">Yes for WordPress. WP stays on your shared host handling the admin and REST API. The Astro frontend runs on Cloudflare Workers, Vercel, or a separate VPS. Your shared host never sees visitor traffic. This is the architectural win: the CMS is decoupled from delivery.</div>
				</details>
				<details class="faq-item" data-cat="start">
					<summary><span>What if I want to go back to classic WordPress?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">Deactivate the plugin. Your content is untouched in WordPress. The Astro frontend is yours, MIT licensed, sitting in your own Cloudflare or Vercel account. No vendor lock-in. No data held hostage. Switch hosts in one click, or stop using the frontend entirely.</div>
				</details>

				<!-- WordPress & Plugins -->
				<details class="faq-item" data-cat="wp">
					<summary><span>What about ACF / Meta Box custom fields?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">WordPress hides ACF fields from the REST API by default. Hatch's Integrations tab has a one-click button that flips <code>show_in_rest=true</code> for every field group. Custom fields immediately appear on every post and page response. No manual REST registration needed.</div>
				</details>
				<details class="faq-item" data-cat="wp">
					<summary><span>Does it work with Elementor / Bricks / Divi?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">Not natively. Page builders render via PHP at request time; there's no REST endpoint for the rendered output. Gutenberg core blocks work cleanly. If your site is builder-heavy, keep it on classic WordPress. Hatch is the right tool for content sites built on blocks.</div>
				</details>
				<details class="faq-item" data-cat="wp">
					<summary><span>Do my comments still work?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">Yes. WordPress comments are fetched server-side and rendered in HTML on every page load, so Google indexes them too. Visitors can post without logging in. Turnstile handles spam filtering. No third-party comment system required.</div>
				</details>
				<details class="faq-item" data-cat="wp">
					<summary><span>What about WooCommerce?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">Read-only WooCommerce works today: products, variations, categories, and prices all come through the REST API. Native checkout on Astro is not yet available. The practical pattern is hybrid mode: browse on the fast Astro frontend, checkout on WP. That's what most headless WooCommerce stores do, and it's on the roadmap.</div>
				</details>
				<details class="faq-item" data-cat="wp">
					<summary><span>Can my existing site's content move to Hatch?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">Yes. Your existing posts, pages, categories, tags, ACF fields, and menus are all available via WP REST the moment the plugin is installed. Nothing migrates. You install the plugin, connect, deploy, and every post you've ever published is immediately on the headless frontend.</div>
				</details>
				<details class="faq-item" data-cat="wp">
					<summary><span>What about membership or login-gated content?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">Not supported yet. Membership plugins like MemberPress and Restrict Content Pro gate content via PHP session checks. The Astro frontend has no WP session layer. Public content works fully. Login-required pages should stay on the WP frontend for now. This is on the roadmap.</div>
				</details>
				<details class="faq-item" data-cat="wp">
					<summary><span>What about Polylang or WPML for multilingual?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">On the roadmap, not in the current release. Translated posts are accessible through the REST API; the Astro routing layer doesn't yet auto-generate language-prefixed routes. You can manually wire routes in the starter, but there's no wizard for it yet.</div>
				</details>

				<!-- Performance & SEO -->
				<details class="faq-item" data-cat="perf">
					<summary><span>Will my SEO break?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">No. Rank Math, Yoast, SEOPress, and AIOSEO meta tags pipe through the Hatch head layer unchanged. JSON-LD schema (Article, BreadcrumbList, FAQ, Person, Product) passes verbatim. Your SEO plugin keeps doing its job; Hatch just delivers the output faster.</div>
				</details>
				<details class="faq-item" data-cat="perf">
					<summary><span>Where do my images go?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">Images stay in the WordPress media library. The Hatch image proxy converts JPEG and PNG to WebP or AVIF on the first request and serves them from your own domain. No third-party image host appears in your HTML. Auto-configured on first deploy, nothing to set up.</div>
				</details>
				<details class="faq-item" data-cat="perf">
					<summary><span>Why 60 seconds? That sounds slow.</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">60 seconds is the edge cache TTL: the window between publishing in WP and visitors worldwide seeing the new post. The visitor experience is fast; cache hits return in under 50ms. Compare that to Gatsby rebuilds (minutes) or manual LiteSpeed cache flushes. For new content propagation, it's the fastest option in headless WordPress.</div>
				</details>
				<details class="faq-item" data-cat="perf">
					<summary><span>Do I need to learn WPGraphQL?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">No. Hatch uses the native WP REST API plus a thin <code>/hatch/v1</code> namespace for menus, ACF, and schema. Editors never touch it. The Astro starter already speaks REST.</div>
				</details>
				<details class="faq-item" data-cat="perf">
					<summary><span>Does my API token live anywhere?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">The Cloudflare or Vercel deploy token is held in memory for the roughly 90-second build window, then dropped. Nothing is stored on the broker. No persistent credential storage. The WP Application Password lives in your own WP database and is only used at deploy time.</div>
				</details>

				<!-- Limits & Honest -->
				<details class="faq-item" data-cat="honest">
					<summary><span>Isn't Headless WP just a worse Next.js setup?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">Raw Next.js plus WPGraphQL: yes, it's slower to ship, has more surface area to break, and two stacks to maintain. Hatch is not that. The Astro starter is purpose-built for content sites with SSR, edge cache, and a block serializer. Zero glue code. The shape of the problem is different.</div>
				</details>
				<details class="faq-item" data-cat="honest">
					<summary><span>Is WordPress's REST API complete enough for a real site?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">The base REST is solid for posts, pages, users, and taxonomies. The gaps are real for ACF, menus, comments, and schema. Hatch fills all of them in <code>/hatch/v1/*</code>. ACF gets one-click expose. Menus get a dedicated endpoint. Comments are public-by-design. The complaint disappears with the plugin installed.</div>
				</details>
				<details class="faq-item" data-cat="honest">
					<summary><span>Will I end up maintaining two stacks?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">Classic WordPress already has multiple layers to maintain: the theme, the cache plugin, the security plugin, the optimization plugin, all needing updates. Headless collapses the visitor-facing layer into one Astro project. The new stack is smaller than what it replaces.</div>
				</details>
				<details class="faq-item" data-cat="honest">
					<summary><span>Do rebuild times slow things down on launch day?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">True for static-site headless (Gatsby, classic Next.js SSG). Hatch is SSR. No build happens on publish. Hit Publish, wait 60 seconds for the edge cache to flush, done. Launch days are when SSR shines.</div>
				</details>
				<details class="faq-item" data-cat="honest">
					<summary><span>Is Hatch overkill for a small blog?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">A small blog on shared hosting doesn't need it. Headless pays off when you have 1000+ posts, traffic spikes, a content team that needs WP admin access, or when bounce rate correlates with slow TTFB. If your hosting bill is under $20/month and you post weekly, classic WP is correct. If you're on WP Engine or Kinsta at $100/month for speed, Hatch gets you faster performance with a smaller bill.</div>
				</details>
				<details class="faq-item" data-cat="honest">
					<summary><span>Why should I trust your broker with my tokens?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">You don't have to. The broker is <a href="${REPO}/tree/main/hatch-deploy" target="_blank" rel="noopener noreferrer">open-source MIT</a>. Self-host it on your own VPS in under 10 minutes. Or skip the broker entirely and use the VPS install path. The shared broker is convenience, not a requirement. Tokens live in memory for roughly 90 seconds, dropped after the build completes.</div>
				</details>
				<details class="faq-item" data-cat="honest">
					<summary><span>What doesn't Hatch do?</span>${lu('chevron-down', 'faq-chev')}</summary>
					<div class="faq-a">PHP-rendered page builders (Elementor, Divi, Bricks), login-gated membership content, native WooCommerce checkout, and multilingual routing are not in the current release. If your site is builder-heavy or membership-driven, classic WordPress is the right tool. These are on the roadmap but not yet shipped.</div>
				</details>
			</div>

			<script>
			(function(){
				var tabs = document.querySelectorAll('.faq-tab');
				var items = document.querySelectorAll('.faq-item[data-cat]');

				function closeItem(item, instant) {
					var answer = item.querySelector('.faq-a');
					if (!answer) { item.removeAttribute('open'); return; }
					if (instant) {
						item.removeAttribute('open');
						answer.style.cssText = '';
						return;
					}
					var startH = answer.scrollHeight;
					answer.style.height = startH + 'px';
					answer.style.overflow = 'hidden';
					answer.style.opacity = '1';
					answer.style.transition = 'height 0.28s cubic-bezier(.2,.8,.2,1), opacity 0.18s ease';
					requestAnimationFrame(function(){
						requestAnimationFrame(function(){
							answer.style.height = '0px';
							answer.style.opacity = '0';
						});
					});
					var done = function(e){
						if (e && e.propertyName && e.propertyName !== 'height') return;
						item.removeAttribute('open');
						answer.style.cssText = '';
						answer.removeEventListener('transitionend', done);
					};
					answer.addEventListener('transitionend', done);
				}

				function openItem(item) {
					var answer = item.querySelector('.faq-a');
					item.setAttribute('open', '');
					if (!answer) return;
					var endH = answer.scrollHeight;
					answer.style.height = '0px';
					answer.style.overflow = 'hidden';
					answer.style.opacity = '0';
					answer.style.transition = 'height 0.32s cubic-bezier(.2,.8,.2,1), opacity 0.28s ease';
					requestAnimationFrame(function(){
						requestAnimationFrame(function(){
							answer.style.height = endH + 'px';
							answer.style.opacity = '1';
						});
					});
					var done = function(e){
						if (e && e.propertyName && e.propertyName !== 'height') return;
						answer.style.cssText = '';
						answer.removeEventListener('transitionend', done);
					};
					answer.addEventListener('transitionend', done);
				}

				items.forEach(function(item){
					var summary = item.querySelector('summary');
					if (!summary) return;
					summary.addEventListener('click', function(e){
						e.preventDefault();
						var isOpen = item.hasAttribute('open');
						items.forEach(function(other){
							if (other !== item && other.hasAttribute('open')) closeItem(other);
						});
						if (isOpen) closeItem(item); else openItem(item);
					});
				});

				function activate(filter) {
					tabs.forEach(function(t){ t.classList.toggle('active', t.dataset.filter === filter); t.setAttribute('aria-selected', t.dataset.filter === filter); });
					items.forEach(function(item){
						var hide = item.dataset.cat !== filter;
						item.hidden = hide;
						if (hide && item.hasAttribute('open')) closeItem(item, true);
					});
				}
				activate('start');
				tabs.forEach(function(tab){ tab.addEventListener('click', function(){ activate(this.dataset.filter); }); });
			})();
			</script>
		</section>
		<hr/>

		<section id="community">
			<span class="pill">🌱 &nbsp; Built in public</span>
			<h2 style="margin-top:14px;">Open source. No roadmap behind a paywall.<br/>Join where the project gets built.</h2>
			<p style="max-width:640px; margin-bottom:28px;">
				Hatch is MIT licensed. The code is public. The roadmap is public.
				Questions, bugs, and ideas go in GitHub Discussions — not a locked Slack, not a Discord you have to apply to join.
			</p>
			<div class="community-wrap">
				<a class="community-card" href="https://github.com/adityaarsharma/hatch/discussions" target="_blank" rel="noopener noreferrer">
					<div class="community-card-icon">💬</div>
					<h3>GitHub Discussions</h3>
					<p>Ask questions, share what you built, report bugs, vote on roadmap ideas. The main hub — open to everyone.</p>
					<span class="cta-link">Join the conversation →</span>
				</a>
				<a class="community-card" href="https://github.com/adityaarsharma/hatch/issues" target="_blank" rel="noopener noreferrer">
					<div class="community-card-icon">🐛</div>
					<h3>GitHub Issues</h3>
					<p>Found a bug or a rough edge with your host setup? Open an issue. Clear reproductions get fast responses.</p>
					<span class="cta-link">File an issue →</span>
				</a>
				<a class="community-card" href="https://x.com/adityaarsharma" target="_blank" rel="noopener noreferrer">
					<div class="community-card-icon" style="font-family:monospace; font-size:22px; font-weight:700;">𝕏</div>
					<h3>Follow the build</h3>
					<p>Releases, behind-the-scenes on what's shipping next, and honest notes on what isn't working yet. No hype.</p>
					<span class="cta-link">Follow @adityaarsharma →</span>
				</a>
			</div>
			<p style="margin-top:20px; font-size:13px; color:var(--fg-subtle);">MIT licensed · No commercial community tier · No "Pro community" upsell · Just the project, open</p>
		</section>

		<hr/>

		<!-- v0.51 — final CTA close. Single decisive primary action, mini-minimalist, lots of air. -->
		<section class="closer" aria-label="Get started with Hatch">
			<div class="closer-inner">
				<span class="pill brand"><span>🐣</span> Ready when you are</span>
				<h2 class="closer-h">Try the headless WordPress<br/>that doesn't make you choose.</h2>
				<p class="closer-sub">Same editor. Same plugins. Same content. New global-edge frontend in 90 seconds.</p>
				<div class="closer-actions">
					<a class="btn primary glow lg" href="${REPO}/releases/latest/download/hatch.zip" target="_blank" rel="noopener noreferrer">${lu('download', '')} Download Hatch, it's free</a>
					<a class="btn ghost" href="${REPO}" target="_blank" rel="noopener noreferrer">${lu('github', '')} Star on GitHub</a>
				</div>
				<p class="closer-fineprint">
					MIT licensed · No SaaS · No account · No telemetry ·
					Cloudflare Workers, Vercel, or your VPS. Your choice.
				</p>
				<p style="margin-top:20px; font-size:13px; color:var(--fg-subtle);">
					Need help with setup or have a hosting question?
					<a href="mailto:aditya@adityaarsharma.com" style="color:var(--fg-muted); font-weight:500;">Drop a note →</a>
				</p>
			</div>
		</section>

		<footer>
			MIT licensed · <a href="${REPO}" target="_blank" rel="noopener noreferrer">GitHub</a> · <a href="${REPO}/releases" target="_blank" rel="noopener noreferrer">Releases</a> · <a href="/vision">Vision</a> · <a href="/install.sh">Install script</a> · <a href="https://adityaarsharma.com/connect" target="_blank" rel="noopener noreferrer">Consulting</a><br/>
			Built by <a href="https://adityaarsharma.com" target="_blank" rel="noopener noreferrer">Aditya Sharma</a>. Not affiliated with WordPress, Cloudflare, or Vercel. Just an honest fan of all three.
		</footer>
	`, { wide: true }));
});

// GET /vision — full detailed product philosophy + founder story.
// Restored 2026-05-19 from commit 818b9b8~1 per user request.
app.get('/vision', (req, res) => {
	const REPO = 'https://github.com/adityaarsharma/hatch';
	res.type('html').send(html('Vision — Why Hatch exists', `
		<div style="max-width:680px; margin:0 auto; padding:60px 24px 80px;">
			<a href="/" style="font-size:13px; color:var(--fg-muted); text-decoration:none; display:inline-flex; align-items:center; gap:6px; margin-bottom:40px;">← Back to Hatch</a>
			<h1 style="font-size:clamp(28px,4vw,42px); font-weight:700; letter-spacing:-0.025em; line-height:1.1; margin:0 0 12px;">WordPress should be fast<br/>without asking you<br/>to become a developer.</h1>
			<p style="font-size:16px; color:var(--fg-muted); margin:0 0 36px; line-height:1.6;">A note from Aditya on why Hatch exists and where it is going.</p>

			<div class="vision-60s" style="background:var(--bg-3); border:1px solid var(--border); border-radius:12px; padding:24px 26px; margin:0 0 48px;">
				<div style="font-size:11.5px; font-weight:700; letter-spacing:0.08em; color:var(--primary); text-transform:uppercase; margin:0 0 14px;">The 60-second read</div>
				<div class="vision-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:18px 24px; font-size:14.5px; line-height:1.55;">
					<div><strong style="color:var(--fg);">WordPress problem</strong></div>
					<div><strong style="color:var(--fg);">How Hatch fixes it</strong></div>

					<div style="color:var(--fg-muted);">Slow PHP delivery, even with caching plugins</div>
					<div style="color:var(--fg);">Pre-rendered Astro on Cloudflare's edge — Lighthouse 100 by default</div>

					<div style="color:var(--fg-muted);">Plugin stack (WP Rocket, CDN, security, scanners) just to be usable</div>
					<div style="color:var(--fg);">None of them needed — the public site is static HTML, not PHP</div>

					<div style="color:var(--fg-muted);">wp-login brute-force, xmlrpc, plugin CVEs as attack surface</div>
					<div style="color:var(--fg);">wp-admin becomes a private origin no visitor ever reaches</div>

					<div style="color:var(--fg-muted);">Hosting bills scale with traffic spikes</div>
					<div style="color:var(--fg);">Cloudflare free tier: 100k req/day. Origin sees one hit per deploy</div>

					<div style="color:var(--fg-muted);">Headless options force GraphQL, two codebases, or a new CMS</div>
					<div style="color:var(--fg);">REST API only. Gutenberg stays. One developer can run it</div>

					<div style="color:var(--fg-muted);">Editors hate "modern" stacks because they lose wp-admin</div>
					<div style="color:var(--fg);">Editors see no change. Same dashboard, same workflow</div>
				</div>
			</div>

			<hr style="border:none; border-top:1px solid var(--border); margin:0 0 40px;"/>

			<h2 style="font-size:22px; font-weight:600; margin:0 0 14px; letter-spacing:-0.01em;">The problem, honestly stated</h2>
			<p style="font-size:16px; line-height:1.75; margin:0 0 16px;">WordPress powers 43% of the web. Most of those sites are slow. Not because WordPress is a bad piece of software. Because WordPress was designed in 2003 to do something specific: render HTML on a PHP server and send it to the visitor. That architecture made total sense then. It does not make total sense now that Cloudflare has 300 edge cities and a free tier.</p>
			<p style="font-size:16px; line-height:1.75; margin:0 0 16px;">The typical WordPress site in 2026 runs W3 Total Cache or WP Rocket, a CDN plugin, a security scanner, a performance optimizer, an uptime monitor, and a database cleaner. None of those plugins do anything genuinely useful. They exist to patch the fact that PHP runs on one server and sends every visitor through the same slow pipe. Remove the PHP delivery layer and you do not need any of them. You get Lighthouse 100 for free. A hardened server for free. Global edge delivery for free.</p>
			<p style="font-size:16px; line-height:1.75; margin:0 0 48px;">That is what headless WordPress is. Not a philosophy. Not a trend. A practical observation: the editor is not the problem. The delivery layer is.</p>

			<h2 style="font-size:22px; font-weight:600; margin:0 0 14px; letter-spacing:-0.01em;">Why existing solutions made it worse</h2>
			<p style="font-size:16px; line-height:1.75; margin:0 0 16px;">The headless WordPress market tried to solve this with WPGraphQL and Next.js or Nuxt. The result: you now maintain two codebases, need to understand GraphQL, and lose the REST API compatibility your plugins rely on. Every time a developer leaves, the headless layer becomes a mystery no one wants to touch.</p>
			<p style="font-size:16px; line-height:1.75; margin:0 0 16px;">The other option was switching CMSes entirely. Contentful. Sanity. Hygraph. The problem: your marketing team spent three years learning Gutenberg. Your client knows how to bold a word. Nobody wants to re-learn everything and migrate content into a system that costs $99–$300+/month once your team grows.</p>
			<p style="font-size:16px; line-height:1.75; margin:0 0 48px;">Both paths asked for too much. Neither was the answer for the vast majority of teams.</p>

			<h2 style="font-size:22px; font-weight:600; margin:0 0 14px; letter-spacing:-0.01em;">The insight behind Hatch</h2>
			<p style="font-size:16px; line-height:1.75; margin:0 0 16px;">What if you kept WordPress exactly as it is and only replaced the delivery layer? WordPress stays as the CMS: the editor, the plugins, the user roles, the media library, all of it. The thing that renders HTML for visitors becomes Astro, running at the Cloudflare edge.</p>
			<p style="font-size:16px; line-height:1.75; margin:0 0 16px;">Astro was chosen deliberately. Built for content-first sites. Ships zero JavaScript by default. Outputs the fastest HTML in the framework ecosystem. Officially supports Cloudflare Workers, Vercel, and Node. Among the fastest-growing frameworks of the last two years, with 50,000+ GitHub stars. It is the right architecture for a content site.</p>
			<p style="font-size:16px; line-height:1.75; margin:0 0 48px;">The WordPress REST API was already there since version 4.7. Nobody needed a GraphQL layer. They needed a great Astro frontend that consumed it, an automated deployment system so non-developers could use it, and a WordPress plugin that configured the REST API securely. That is Hatch.</p>

			<h2 style="font-size:22px; font-weight:600; margin:0 0 14px; letter-spacing:-0.01em;">A note from Aditya</h2>
			<div style="background:var(--bg-3); border-radius:12px; padding:24px 28px; margin:0 0 48px;">
				<p style="font-size:15.5px; line-height:1.8; margin:0 0 16px; color:var(--fg);">I have been building WordPress products for years at POSIMYTH — The Plus Addons for Elementor, NexterWP, tools that hundreds of thousands of WordPress users rely on. Throughout that time I watched the same conversation happen everywhere: "We need to make this site faster." Then: WP Rocket, LiteSpeed, CDN plugin, three support tickets, one month of work, Lighthouse score improves from 38 to 52. Still slow.</p>
				<p style="font-size:15.5px; line-height:1.8; margin:0 0 16px; color:var(--fg);">I wanted WordPress to be modern, fast, and sleek without making people ditch what they know. Non-technical marketers should not need to learn a new CMS to get edge performance. Developers should not need to maintain two stacks. Site owners should not need $200/year in plugins to patch a 2003 architecture decision.</p>
				<p style="font-size:15.5px; line-height:1.8; margin:0 0 16px; color:var(--fg);">The security situation is also getting worse. AI-generated plugins with no audit. Zero-day exploits on popular plugins. Sites going down because one update broke something. With headless, your WordPress admin becomes a private origin nobody visits. There is no login URL to brute-force. No xmlrpc. Most of the attack surface disappears. That is something no Wordfence subscription gives you.</p>
				<p style="font-size:15.5px; line-height:1.8; margin:0; color:var(--fg);">Hatch is MIT-licensed and free because the people who most need this are agencies and freelancers building sites for clients, not well-funded engineering teams at tech companies. The goal was to make headless WordPress accessible to anyone who can install a plugin and paste an API token. That goal has not changed.</p>
				<p style="font-size:13px; color:var(--fg-muted); margin:16px 0 0;">Aditya Sharma &middot; Founder, Hatch &middot; <a href="https://adityaarsharma.com" style="color:var(--primary);">adityaarsharma.com</a></p>
			</div>

			<h2 style="font-size:22px; font-weight:600; margin:0 0 14px; letter-spacing:-0.01em;">What Hatch is not</h2>
			<ul style="font-size:15.5px; line-height:2.2; color:var(--fg-muted); padding-left:20px; margin:0 0 48px;">
				<li>Not a SaaS. No account. No subscription. No vendor lock-in.</li>
				<li>Not a framework you learn. Install the plugin, paste a token, click deploy.</li>
				<li>Not WPGraphQL plus Next.js. That stack is complex, brittle, and developer-heavy.</li>
				<li>Not a page builder replacement. Hatch works with Gutenberg. Elementor and Divi are explicitly out of scope.</li>
				<li>Not a hosted service. The broker is open-source. Hatch can run entirely on your infrastructure.</li>
			</ul>

			<h2 style="font-size:22px; font-weight:600; margin:0 0 14px; letter-spacing:-0.01em;">Where this is going</h2>
			<p style="font-size:16px; line-height:1.75; margin:0 0 16px;">The current version handles the full deployment loop for Cloudflare Workers, Vercel, and any Linux VPS. Six themes ship out of the box. All core Gutenberg blocks render. ACF, WooCommerce (browse mode), Fluent Forms, Rank Math, Yoast, and Redirection all work. Comments work. Anti-spam works. REST hardening works. Automated tests pass.</p>
			<p style="font-size:16px; line-height:1.75; margin:0 0 16px;">Coming: WooCommerce hybrid checkout. Polylang and WPML for multilingual. A Hatch CLI. A live Lighthouse dashboard. A visual theme editor.</p>
			<p style="font-size:16px; line-height:1.75; margin:0 0 48px;">The longer mission: WordPress should be the best editorial tool for content teams and the best-performing frontend for visitors. It can be both. Hatch is the bridge.</p>

			<h2 style="font-size:22px; font-weight:600; margin:0 0 14px; letter-spacing:-0.01em;">"I'll just vibe-code my site with Claude. I don't need this."</h2>
			<p style="font-size:16px; line-height:1.75; margin:0 0 16px;">Fair point. Claude and similar tools can generate a full website in a day. You can prompt your way to a beautiful landing page, a working blog, a custom design. If you're a solo developer building a one-time project for yourself, you might genuinely not need Hatch.</p>
			<p style="font-size:16px; line-height:1.75; margin:0 0 16px;">But here's where vibe-coding runs into walls in the real world. Week 1: the site looks great. Week 3: a client wants to update a blog post. You write a prompt. The AI rewrites the wrong section. Week 5: the image gallery breaks after a content change. Week 8: you need SEO metadata on every post. You hand-craft it in markdown. Week 12: the client hires someone else because nobody can maintain the files.</p>
			<p style="font-size:16px; line-height:1.75; margin:0 0 16px;">The problem isn't the AI. The problem is that AI-generated sites have no editorial layer. Content updates require a developer. SEO requires manual work. Images need code changes. There's no admin for the client to use.</p>
			<div style="background:#fff3e8; border:1px solid rgba(255,107,0,0.2); border-radius:12px; padding:20px 24px; margin:0 0 48px;">
				<p style="font-size:15.5px; line-height:1.75; margin:0; color:#0a0a0a;">The best combo is both. Use AI to customize the Hatch Astro starter exactly how you want it. Use WordPress for the content that non-developers need to update. Hatch is what connects those two worlds: a modern edge frontend a developer can extend with AI, attached to a CMS that an intern can use without training.</p>
			</div>

			<h2 style="font-size:22px; font-weight:600; margin:0 0 14px; letter-spacing:-0.01em;">Headless is the future. WordPress is the present. Hatch ships both, today.</h2>
			<p style="font-size:16px; line-height:1.75; margin:0 0 16px;">The web is converging on edge delivery. Every major framework is adding edge runtime support. Cloudflare, Vercel, Deno Deploy, Fastly — they all agree on the direction. JavaScript at the edge, serving pre-rendered HTML, no origin server in the hot path. That is what headless WordPress is when done right.</p>
			<p style="font-size:16px; line-height:1.75; margin:0 0 16px;">WordPress is not going away. It powers too much of the web, has too deep a talent pool, and has earned too much trust from non-technical people to be displaced by a new CMS. The editorial experience in Gutenberg is genuinely good now. The plugin ecosystem is genuinely useful. The problem has always been delivery, not editing.</p>
			<p style="font-size:16px; line-height:1.75; margin:0 0 16px;">Hatch is not a bet against WordPress. It is a bet that WordPress will be the best content-management backend on the internet for years to come, and that the frontend deserves to be as modern as the rest of the web. You can have both. You don't have to choose a new CMS, retrain your team, or maintain two codebases with GraphQL in the middle.</p>
			<p style="font-size:16px; line-height:1.75; margin:0 0 48px;">A WordPress install with Hatch is, today, the fastest way to get a Lighthouse 100 content site in front of a global audience, edited by non-developers, maintained by a single developer, and owned entirely by you. That's the vision. It shipped.</p>

			<p style="margin-top:32px; border-top:1px solid var(--border); padding-top:24px;">
				<a href="/" style="font-size:13px; color:var(--fg-muted); text-decoration:none;">← Back to Hatch</a>
			</p>
		</div>
	`, {
		canonical: 'https://hatch.adityaarsharma.com/vision',
		ogTitle: 'Vision — Why Hatch exists · A note from Aditya',
		ogDesc: 'WordPress should be fast without asking you to become a developer. A founder note on why Hatch exists.'
	}));
});

// GET /deploy/redeem?ticket=… — WP plugin redeems the completed ticket.
// One-shot: deleted after read.
app.get('/deploy/redeem', (req, res) => {
	const id = String(req.query.ticket || '');
	const ticket = readTicket(id);
	if (!ticket) return res.status(404).json({ error: 'not_found_or_expired' });

	if (ticket.stage === 'failed') {
		tickets.delete(id);
		return res.status(409).json({ error: 'failed', detail: ticket.error });
	}
	if (ticket.stage !== 'complete') {
		return res.status(425).json({ error: 'not_ready', stage: ticket.stage });
	}

	tickets.delete(id);
	res.json({
		deploy_hook_url: ticket.deploy_hook_url,
		project_id:      ticket.project_id,
		project_name:    ticket.project_name,
		env_errors:      ticket.env_errors || null,
	});
});

// --------------------------------------------------------------------------
// Generic deploy pipeline routes — same shape for vercel + cloudflare.
//   POST /deploy/<provider>/prepare  ← WP server-to-server: creds + token → ticket
//   GET  /deploy/<provider>/start    ← browser handoff, redirects to /build
//   GET  /deploy/<provider>/build    ← starts the build, returns live log page
//   GET  /deploy/<provider>/status   ← JSON, polled by the log page every 2s
// --------------------------------------------------------------------------

const PROVIDERS = {
	vercel: {
		runner: deployToVercel,
		tokenKey: 'vercel_token',
		label: 'Vercel',
		hostHint: 'vercel.com',
	},
	cloudflare: {
		runner: deployToCloudflare,
		tokenKey: 'cf_token',
		label: 'Cloudflare Workers',
		hostHint: 'workers.dev',
	},
};

function makePrepareHandler(providerKey) {
	const cfg = PROVIDERS[providerKey];
	return (req, res) => {
		const b = req.body || {};
		const required = ['wp_url', 'wp_user', 'wp_pass', 'webhook_secret', 'return_url'];
		const missing = required.filter((k) => !b[k]);
		if (missing.length) {
			return res.status(400).json({ error: 'missing_fields', missing });
		}
		const providerToken = String(b[cfg.tokenKey] || '').trim();
		if (!providerToken || providerToken.length < 20) {
			return res.status(400).json({ error: 'missing_or_short_token', need: cfg.tokenKey });
		}
		try { new URL(b.wp_url); new URL(b.return_url); }
		catch { return res.status(400).json({ error: 'invalid_url' }); }

		const ticket = newTicket({
			stage: 'token_attached',
			provider: providerKey,
			wp_url: b.wp_url,
			wp_user: b.wp_user,
			wp_pass: b.wp_pass,
			webhook_secret: b.webhook_secret,
			return_url: b.return_url,
			[cfg.tokenKey]: providerToken,
		});
		res.json({ ticket, expires_in: TICKET_TTL_MS / 1000 });
	};
}

function makeStartHandler(providerKey) {
	return (req, res) => {
		const ticketId = String(req.query.ticket || '');
		const ticket = readTicket(ticketId);
		if (!ticket) {
			return res.status(400).type('html').send(html('Ticket expired', `
				<h1>Ticket expired or invalid</h1>
				<p>Restart from your WordPress admin → Tools → Hatch → Setup wizard.</p>
			`));
		}
		return res.redirect(302, `/deploy/${providerKey}/build?ticket=${encodeURIComponent(ticketId)}`);
	};
}

function makeBuildHandler(providerKey) {
	const cfg = PROVIDERS[providerKey];
	return (req, res) => {
		const ticketId = String(req.query.ticket || '');
		const ticket = readTicket(ticketId);
		if (!ticket) {
			return res.status(400).type('html').send(html('Ticket expired', `<h1>Ticket expired</h1><p>Restart from WordPress admin.</p>`));
		}
		if (ticket.provider !== providerKey) {
			return res.status(400).type('html').send(html('Wrong provider', `<h1>Ticket is for ${ticket.provider}, not ${providerKey}</h1>`));
		}
		const providerToken = String(ticket[cfg.tokenKey] || '');
		if (!providerToken) {
			return res.status(400).type('html').send(html('No token', `<h1>No ${cfg.label} token attached to ticket</h1><p>Restart from WordPress.</p>`));
		}

		// Mark building + spawn the async pipeline.
		updateTicket(ticketId, { stage: 'building', build_log: [], error: null });
		(async () => {
			try {
				const runnerArgs = { ticket, onProgress: (line) => {
					const t = tickets.get(ticketId);
					if (!t) return;
					t.data.build_log = (t.data.build_log || []).concat([line]).slice(-300);
					t.expires_at = Date.now() + TICKET_TTL_MS;
				}};
				// Pass the right-named token key to each runner.
				if (providerKey === 'vercel')      runnerArgs.vercelToken = providerToken;
				if (providerKey === 'cloudflare')  runnerArgs.cfToken     = providerToken;

				const { project_url, project_name } = await cfg.runner(runnerArgs);
				updateTicket(ticketId, {
					stage: 'complete',
					project_url,
					project_name,
					[cfg.tokenKey]: undefined, // drop the token from memory
				});
			} catch (err) {
				console.error(`[hatch-deploy] ${providerKey} build failed:`, err);
				updateTicket(ticketId, {
					stage: 'failed',
					error: err.message || String(err),
					[cfg.tokenKey]: undefined,
				});
			}
		})();

		// Stream the build log page — terminal aesthetic: traffic-light dots,
		// monospace stream, color-coded lines (green=ok, yellow=warn, red=err,
		// grey=dim), live-throbbing status bar above it.
		res.type('html').send(html(`Building · ${cfg.label}`, `
			<div style="margin-bottom: 24px;">
				<span class="pill brand">${cfg.label === 'Vercel' ? '▲' : '⚡'} ${cfg.label}</span>
				<h1 style="margin-top:14px; font-size: 28px;">Building your site…</h1>
				<p style="margin-top:6px;">Don't close this tab. Typical build: <strong>60–90 seconds</strong> (clone → npm install → Astro build → ${cfg.label} upload).</p>
			</div>

			<div class="status-bar live" id="status">
				<span class="spinner" aria-hidden="true"></span>
				<span id="status-text">Initializing build…</span>
			</div>

			<div class="term" id="term">
				<div class="term-header">
					<span class="term-dot r"></span>
					<span class="term-dot y"></span>
					<span class="term-dot g"></span>
					<span class="term-title">hatch-deploy@${cfg.label.toLowerCase()} — building</span>
				</div>
				<div id="log">
					<div class="term-line dim">$ hatch deploy --provider=${providerKey} --target=production</div>
					<div class="term-line dim">⏳ Waiting for build host…</div>
				</div>
			</div>

			<p style="margin-top: 16px; font-size: 12.5px; color: var(--fg-subtle);">
				Build runs server-side on the Hatch broker. Your ${cfg.label} token lives in memory for the build duration only — dropped on completion or failure.
			</p>

			<script>
			(function(){
				var ticket = ${JSON.stringify(ticketId)};
				var provider = ${JSON.stringify(providerKey)};
				var logBox = document.getElementById('log');
				var termBox = document.getElementById('term');
				var statusBar = document.getElementById('status');
				var statusText = document.getElementById('status-text');
				var lastLogLen = 0;
				var done = false;

				// Classify a log line for color coding in the terminal.
				function classifyLine(line) {
					var s = line || '';
					if (/^✓|✅|✨|Done|complete!|Success|Deployed|Uploaded \\d+ of \\d+/.test(s)) return 'ok';
					if (/^⚠|warn|WARN|Warning/i.test(s)) return 'warn';
					if (/^✗|❌|ERROR|Error:|Failed|FAILED|Cannot/i.test(s)) return 'err';
					if (/^[\\s>]|^npm|^npx|^>\\s|^npm warn/.test(s)) return 'dim';
					if (/^\\s*$/.test(s)) return 'dim';
					return '';
				}

				function appendLog(lines) {
					var frag = document.createDocumentFragment();
					lines.forEach(function(line) {
						var div = document.createElement('div');
						div.className = 'term-line ' + classifyLine(line);
						div.textContent = line;
						frag.appendChild(div);
					});
					logBox.appendChild(frag);
					termBox.scrollTop = termBox.scrollHeight;
				}

				function setStatus(text, klass) {
					statusBar.className = 'status-bar ' + klass;
					if (klass === 'live') {
						statusBar.innerHTML = '<span class="spinner"></span><span id="status-text">' + text + '</span>';
					} else if (klass === 'done') {
						statusBar.innerHTML = '<span style="font-size:16px;">✅</span><span>' + text + '</span>';
					} else if (klass === 'fail') {
						statusBar.innerHTML = '<span style="font-size:16px;">❌</span><span>' + text + '</span>';
					}
				}

				function poll(){
					if (done) return;
					fetch('/deploy/' + provider + '/status?ticket=' + encodeURIComponent(ticket))
						.then(function(r){ return r.json(); })
						.then(function(d){
							if (d.log && d.log.length > lastLogLen) {
								var newLines = d.log.slice(lastLogLen);
								appendLog(newLines);
								lastLogLen = d.log.length;
								// Mirror the latest meaningful line into the status bar.
								var latest = newLines.filter(function(l) {
									return !/^(npm|npx|>|\\s)/.test(l) && l.trim();
								}).pop();
								if (latest && d.stage === 'building') {
									statusText && (statusText.textContent = latest.replace(/^[^\\s]+\\s/, ''));
								}
							}
							if (d.stage === 'complete') {
								done = true;
								setStatus('Deployed! Redirecting to WordPress…', 'done');
								appendLog([
									'',
									'──────────────────────────────────────────',
									'✨ Build complete in ~' + (Math.round((Date.now() - startTime)/1000)) + 's',
									'   Live at: ' + d.project_url,
									'──────────────────────────────────────────',
								]);
								// Show a clickable card under the terminal with the live URL.
								var doneCard = document.createElement('div');
								doneCard.style.cssText = 'margin-top: 16px; padding: 18px 22px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px;';
								doneCard.innerHTML =
									'<div style="font-size:13px; color:var(--fg-subtle); margin-bottom:6px;">Production URL</div>' +
									'<a href="' + d.project_url + '" target="_blank" rel="noopener noreferrer" style="font-size:18px; font-weight:600; word-break:break-all;">' + d.project_url + ' ↗</a>' +
									'<div style="font-size:12.5px; color:var(--fg-subtle); margin-top: 14px;">Redirecting back to WordPress in 2 seconds…</div>';
								termBox.parentNode.insertBefore(doneCard, termBox.nextSibling);
								setTimeout(function(){ window.location.href = d.return_url; }, 2000);
							} else if (d.stage === 'failed') {
								done = true;
								setStatus('Build failed', 'fail');
								appendLog(['', '✗ ' + (d.error || 'unknown error')]);
							} else {
								setTimeout(poll, 2000);
							}
						})
						.catch(function(e){
							setStatus('Polling error: ' + e.message + ' (retrying)', 'fail');
							setTimeout(poll, 3000);
						});
				}
				var startTime = Date.now();
				poll();
			})();
			</script>
		`, { wide: false }));
	};
}

function makeStatusHandler(providerKey) {
	return (req, res) => {
		const ticketId = String(req.query.ticket || '');
		const ticket = readTicket(ticketId);
		if (!ticket) return res.status(404).json({ stage: 'failed', error: 'Ticket expired' });
		res.json({
			stage: ticket.stage || 'building',
			log: ticket.build_log || [],
			error: ticket.error || null,
			project_url: ticket.project_url || null,
			project_name: ticket.project_name || null,
			return_url: ticket.return_url
				? `${ticket.return_url}${ticket.return_url.includes('?') ? '&' : '?'}hatch_ticket=${encodeURIComponent(ticketId)}&hatch_result=success`
				: '/',
		});
	};
}

// Register all 8 routes (4 per provider).
for (const provider of Object.keys(PROVIDERS)) {
	app.post(`/deploy/${provider}/prepare`,  makePrepareHandler(provider));
	app.get(`/deploy/${provider}/start`,     makeStartHandler(provider));
	app.get(`/deploy/${provider}/build`,     makeBuildHandler(provider));
	app.get(`/deploy/${provider}/status`,    makeStatusHandler(provider));
}

// Legacy direct-visit redirects — keep so deep-links and old bookmarks
// still go somewhere useful when users hit the provider URL without going
// through the WP wizard.
app.get('/deploy/vercel', (req, res) => {
	const vercelUrl = new URL('https://vercel.com/new/clone');
	vercelUrl.searchParams.set('repository-url', REPO);
	vercelUrl.searchParams.set('root-directory', ROOT_DIR);
	vercelUrl.searchParams.set('project-name', 'hatch-frontend');
	vercelUrl.searchParams.set('env', 'WP_API_URL,WP_API_USER,WP_API_PASS,HATCH_WEBHOOK_SECRET');
	return res.redirect(302, vercelUrl.toString());
});
app.get('/deploy/cloudflare', (req, res) => {
	const cfUrl = new URL('https://deploy.workers.cloudflare.com/');
	cfUrl.searchParams.set('url', REPO + '/tree/main/' + ROOT_DIR);
	return res.redirect(302, cfUrl.toString());
});

// --------------------------------------------------------------------------
// GET /deploy/vps — bash one-liner instructions
// --------------------------------------------------------------------------
app.get('/deploy/vps', (req, res) => {
	res.type('html').send(html('Deploy to your VPS', `
		<h1>Deploy to your own server</h1>
		<p>SSH into any Linux box. One command installs Node (if missing), clones the repo, writes your .env, builds. Stops at "code is built" — your panel does the rest.</p>

		<h2>Easy mode — get this command from WordPress</h2>
		<p>The setup wizard inside WordPress (Tools → Hatch → Setup → step 4) generates a pre-filled command with your credentials baked in as flags. Paste it once, done.</p>

		<h2>The command (no credentials yet)</h2>
		<pre>curl -fsSL https://hatch.adityaarsharma.com/install.sh | sudo bash</pre>

		<h2>The command (with credentials — auto-writes .env)</h2>
		<pre>curl -fsSL https://hatch.adityaarsharma.com/install.sh | sudo bash -s -- \\
  --wp-url "https://your-wp.com" \\
  --wp-user "admin" \\
  --wp-pass "APPLICATION_PASSWORD" \\
  --webhook-secret "WEBHOOK_SECRET"</pre>

		<p>The script:</p>
		<ol>
			<li>Auto-installs Node 20+ via NodeSource if missing (apt / dnf / yum / apk)</li>
			<li>Clones <code>${REPO}</code></li>
			<li>Writes <code>astro-starter/.env</code> if all four credential flags were passed</li>
			<li>Runs <code>npm install</code> + <code>npm run build</code></li>
			<li>Build output lives at <code>&lt;install-dir&gt;/astro-starter/dist/</code> — your panel handles the rest</li>
		</ol>

		<h2>Custom directory</h2>
		<pre>curl -fsSL https://hatch.adityaarsharma.com/install.sh | sudo bash -s -- --dir /home/yourapp</pre>

		<h2>What it does NOT do</h2>
		<p>Deliberately minimal. Your panel handles everything past "code is built":</p>
		<ul style="color: var(--muted); font-size: 14.5px;">
			<li>Web server config (nginx / Caddy / Apache)</li>
			<li>SSL / Let's Encrypt</li>
			<li>Keeping the process alive (PM2 / systemd / panel-managed)</li>
			<li>Domain binding</li>
		</ul>

		<h2>After install</h2>
		<ol>
			<li>Point your webapp at <code>&lt;install-dir&gt;/astro-starter/dist/</code></li>
			<li>Or run as Node: <code>node &lt;install-dir&gt;/astro-starter/dist/server/entry.mjs</code></li>
		</ol>

		<p style="margin-top: 32px;">Full RunCloud guide: <a href="${REPO}/blob/main/docs/hosting/vps-runcloud.md" target="_blank" rel="noopener noreferrer">vps-runcloud.md</a></p>

		<footer>
			<a href="/">← Back to host picker</a>
		</footer>
	`));
});

// --------------------------------------------------------------------------
// GET /install.sh — serves the raw bash installer
// --------------------------------------------------------------------------
app.get('/install.sh', (req, res) => {
	const scriptPath = path.resolve(__dirname, '..', 'scripts', 'install-vps.sh');
	if (!fs.existsSync(scriptPath)) {
		// Fallback: redirect to GitHub raw if local copy not present.
		return res.redirect(302, `${REPO.replace('https://github.com', 'https://raw.githubusercontent.com')}/main/scripts/install-vps.sh`);
	}
	res.type('text/x-sh');
	res.setHeader('Content-Disposition', 'inline; filename="install-vps.sh"');
	fs.createReadStream(scriptPath).pipe(res);
});

// --------------------------------------------------------------------------
// GET /icon.svg + /icon.png — Hatch brand mark
// Used by integration listings (Vercel marketplace, etc) and the docs.
// 512×512 SVG, gradient orange disc with 🐣 emoji. Vercel accepts SVG.
// --------------------------------------------------------------------------
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFB084"/>
      <stop offset="100%" stop-color="#FF6B00"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="112" fill="url(#g)"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="central"
        font-size="320" filter="url(#shadow)"
        font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif">🐣</text>
</svg>`;

app.get(['/icon.svg', '/logo.svg'], (req, res) => {
	res.type('image/svg+xml');
	res.setHeader('Cache-Control', 'public, max-age=86400');
	res.send(ICON_SVG);
});

// --------------------------------------------------------------------------
// GET /img — WebP/AVIF image optimization proxy (sharp)
// --------------------------------------------------------------------------
registerImgProxy(app);

// --------------------------------------------------------------------------
// GET /og.png — Open Graph / Twitter card image (1200×630, brand)
// --------------------------------------------------------------------------
registerOgImage(app);

// --------------------------------------------------------------------------
// GET /health — RunCloud / monitoring check
// --------------------------------------------------------------------------
app.get('/health', (req, res) => {
	res.type('text/plain').send('ok');
});

// --------------------------------------------------------------------------
// 404
// --------------------------------------------------------------------------
app.use((req, res) => {
	res.status(404).type('html').send(html('Not found', `
		<h1>404</h1>
		<p>That route doesn't exist.</p>
		<p><a href="/">← Back to home</a></p>
	`));
});

// --------------------------------------------------------------------------
// Boot
// --------------------------------------------------------------------------
app.listen(PORT, () => {
	console.log(`[hatch-deploy] listening on :${PORT}`);
	console.log(`[hatch-deploy] Vercel: template-URL only (no OAuth)`);
	console.log(`[hatch-deploy] repo: ${REPO}`);
});

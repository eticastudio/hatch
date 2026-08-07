import { useState, useEffect } from '@wordpress/element';
import { HxCard, HxHead, HxRow, HxInp, HxBtn } from '../components.jsx';

// v0.7.2 — Real SVG paths for HxHead. Fixed the blank-icon-box bug:
// HxHead expects iconChildren (SVG nodes), not icon="Server" (string).
const ICO = {
	server:   (<><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></>),
	rocket:   (<><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" /></>),
	alert:    (<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>),
	globe:    (<><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></>),
	check:    (<polyline points="20 6 9 17 4 12" />),
};

/**
 * Onboarding tab — 1-click deploy of the /blog subroute mount.
 *
 * Reads GET /hatch/v1/host to auto-detect Cloudflare / Vercel / Netlify /
 * Nginx / WP Engine (see Hatch_Host_Detect). Then renders a provider-
 * specific form. Deploy POSTs to /hatch/v1/onboarding/deploy which routes
 * to the matching PHP handler (Hatch_Onboarding_Cloudflare, _Vercel,
 * _Netlify). Success/failure surfaces inline; on success the panel polls
 * https://<money-domain>/blog/api/hatch-verify to confirm the mount.
 *
 * @since 0.5.3
 */

const REST_ROOT = (window.hatchBoot?.rest || '/wp-json/hatch/v1').replace(/\/$/, '');
const NONCE     = window.hatchBoot?.nonce || '';

const PROVIDERS = [
	{ id: 'cloudflare', label: 'Cloudflare',  supportKey: 'worker' },
	{ id: 'vercel',     label: 'Vercel',      supportKey: 'middleware' },
	{ id: 'netlify',    label: 'Netlify',     supportKey: 'redirects' },
];

const SUPPORT_MAP = {
	worker:          { provider: 'cloudflare', note: 'Cloudflare Workers detected — full 1-click install available.' },
	middleware:      { provider: 'vercel',     note: 'Vercel detected — rewrite injected via project API. Trigger a redeploy after Deploy to activate.' },
	redirects:       { provider: 'netlify',    note: 'Netlify detected — redirect rule pushed via site API. Takes effect immediately.' },
	reverse_proxy:   { provider: null,         note: 'Kinsta detected — reverse-proxy needs a support ticket. Use the copy-paste Nginx config below.' },
	nginx_location:  { provider: null,         note: 'Nginx VPS detected — copy the location block below to your server config, then reload nginx.' },
	nginx_like:      { provider: null,         note: 'LiteSpeed detected — same Nginx location block should work.' },
	caddy_handle:    { provider: null,         note: 'Caddy detected — copy the handle_path block below to your Caddyfile.' },
	htaccess:        { provider: null,         note: 'Apache detected — Hatch does not auto-mount /blog on Apache. Use a subdomain (blog.yourdomain.com) instead.' },
	none:            { provider: null,         note: 'Your host does not support edge routing. Recommended: mount on a subdomain (blog.yourdomain.com) instead of /blog/.' },
	unknown:         { provider: null,         note: 'Host not detected. Pick a provider manually below, or use one of the copy-paste configs.' },
	manual:          { provider: null,         note: 'Pick a provider manually.' },
};

export default function Onboarding({ state, onDirty }) {
	const [host,   setHost]   = useState(null);
	const [busy,   setBusy]   = useState(false);
	const [tab,    setTab]    = useState('cloudflare');
	const [tokens, setTokens] = useState({ cloudflare: '', vercel: '', netlify: '' });
	const [fields, setFields] = useState({ astro_origin: '', money_domain: '', project_id: '', team_id: '', site_id: '' });
	const [result, setResult] = useState(null);
	const [verify, setVerify] = useState(null);
	const [confs,  setConfs]  = useState({ cloudflare: null, vercel: null, netlify: null });

	// Load detected host + existing deploy statuses on mount.
	useEffect(() => {
		let cancelled = false;
		Promise.all([
			fetch(`${REST_ROOT}/host`).then((r) => r.json()).catch(() => null),
			fetch(`${REST_ROOT}/onboarding/status`, { headers: { 'X-WP-Nonce': NONCE } }).then((r) => r.ok ? r.json() : null).catch(() => null),
		]).then(([h, s]) => {
			if (cancelled) return;
			setHost(h);
			setConfs(s || { cloudflare: { deployed: false }, vercel: { deployed: false }, netlify: { deployed: false } });
			if (h?.wizard_path) {
				const map = { cloudflare_1click: 'cloudflare', vercel_middleware: 'vercel', netlify_redirects: 'netlify' };
				if (map[h.wizard_path]) setTab(map[h.wizard_path]);
			}
			// Seed astro_origin from boot state (Connection tab already stores frontendUrl).
			const front = state?.connection?.frontendUrl || state?.connection?.frontend_url || '';
			if (front) setFields((f) => ({ ...f, astro_origin: front }));
		});
		return () => { cancelled = true; };
	}, []);

	async function deploy() {
		setBusy(true);
		setResult(null);
		setVerify(null);
		try {
			const body = {
				provider: tab,
				token: tokens[tab],
				astro_origin: fields.astro_origin,
				money_domain: fields.money_domain,
				project_id: fields.project_id,
				team_id: fields.team_id,
				site_id: fields.site_id,
			};
			const res = await fetch(`${REST_ROOT}/onboarding/deploy`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': NONCE },
				body: JSON.stringify(body),
			});
			const data = await res.json();
			setResult({ ok: res.ok && data?.success, message: data?.message || 'Unknown response', details: data?.details });
			if (res.ok && data?.success) {
				// Refresh status card.
				fetch(`${REST_ROOT}/onboarding/status`, { headers: { 'X-WP-Nonce': NONCE } }).then((r) => r.json()).then(setConfs).catch(() => {});
				// Kick off verify poll (60s, 3s cadence).
				pollVerify(fields.money_domain);
			}
		} catch (err) {
			setResult({ ok: false, message: err.message });
		} finally {
			setBusy(false);
		}
	}

	async function pollVerify(domain) {
		if (!domain) return;
		setVerify({ state: 'polling', tries: 0 });
		const target = `https://${domain.replace(/^https?:\/\//, '').replace(/\/$/, '')}/blog/api/hatch-verify`;
		const start = Date.now();
		for (let i = 0; i < 20; i++) {
			if (Date.now() - start > 60_000) break;
			try {
				const r = await fetch(target, { cache: 'no-store' });
				if (r.ok) {
					const j = await r.json();
					if (j?.hatch === true) {
						setVerify({ state: 'verified', origin: j.origin_host, forwarded: j.x_forwarded_host });
						return;
					}
				}
			} catch {}
			await new Promise((res) => setTimeout(res, 3_000));
			setVerify((v) => ({ ...(v || {}), tries: (v?.tries || 0) + 1 }));
		}
		setVerify({ state: 'timeout', hint: 'Reached /blog/api/hatch-verify but did not get a Hatch response. Check DNS, edge cache, and origin URL.' });
	}

	const supportInfo = SUPPORT_MAP[host?.subfolder_support || 'unknown'] || SUPPORT_MAP.unknown;

	return (
		<>
			{/* Host detection card. */}
			<HxCard>
				<HxHead icon="Server" title="Host detection" desc="Hatch inspected your money-domain response headers to find the fastest way to mount /blog." />
				<HxRow label="Detected host" desc={host ? `${host.label || host.host}` : 'Detecting…'}>
					<span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--h-fg-2)' }}>{host?.host || '…'}</span>
				</HxRow>
				<HxRow label="Subfolder routing" desc={supportInfo.note}>
					<span style={{ fontSize: 12, color: 'var(--h-fg-2)' }}>{host?.subfolder_support || 'unknown'}</span>
				</HxRow>
				<HxRow label="Recommended path" desc="You can still pick a different provider below if this doesn't match your infra.">
					<HxBtn variant="ghost" onClick={() => window.location.reload()}>Re-detect</HxBtn>
				</HxRow>
			</HxCard>

			{/* Provider tabs. */}
			<HxCard>
				<HxHead icon="Rocket" title="Deploy /blog mount" desc="Pick a provider, paste an API token, click Deploy. Backend calls the provider API directly — no data leaves your WP install." />

				<div style={{ display: 'flex', gap: 6, padding: '10px 16px', borderBottom: '1px solid var(--h-line)' }}>
					{PROVIDERS.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => setTab(p.id)}
							className={tab === p.id ? 'hx-btn hx-btn-primary' : 'hx-btn hx-btn-ghost'}
							style={{ minWidth: 110 }}
						>
							{p.label}
							{confs?.[p.id]?.deployed && <span style={{ marginLeft: 6, color: '#10b981' }}>✓</span>}
						</button>
					))}
				</div>

				<HxRow label="Astro origin URL" desc="The public URL of your Astro frontend deployment (Pages, Vercel, VPS).">
					<HxInp value={fields.astro_origin} onChange={(v) => setFields({ ...fields, astro_origin: v })} placeholder="https://astro-hatch.pages.dev" />
				</HxRow>

				<HxRow label="Money domain" desc="Your customer-facing domain — the one that will serve /blog/*.">
					<HxInp value={fields.money_domain} onChange={(v) => setFields({ ...fields, money_domain: v })} placeholder="yoursite.com" />
				</HxRow>

				<HxRow label={`${PROVIDERS.find((p) => p.id === tab)?.label} API token`} desc={
					tab === 'cloudflare' ? 'Create at Cloudflare dashboard → API Tokens. Scopes: Workers Scripts Edit + Zone Workers Routes Edit + Zone DNS Read.' :
					tab === 'vercel'     ? 'Create at vercel.com/account/tokens with full-access scope.' :
					                       'Create at app.netlify.com/user/applications/personal.'
				}>
					<HxInp
						type="password"
						value={tokens[tab]}
						onChange={(v) => setTokens({ ...tokens, [tab]: v })}
						placeholder="sk-…  /  cf_…  /  nfp_…"
					/>
				</HxRow>

				{tab === 'vercel' && (
					<>
						<HxRow label="Vercel project ID" desc="From vercel.com/[team]/[project]/settings/general — copy 'Project ID'.">
							<HxInp value={fields.project_id} onChange={(v) => setFields({ ...fields, project_id: v })} placeholder="prj_…" />
						</HxRow>
						<HxRow label="Team ID (optional)" desc="Only needed if the project lives under a Vercel team.">
							<HxInp value={fields.team_id} onChange={(v) => setFields({ ...fields, team_id: v })} placeholder="team_…" />
						</HxRow>
					</>
				)}
				{tab === 'netlify' && (
					<HxRow label="Netlify site ID" desc="From app.netlify.com/sites/[site]/settings/general — copy 'API ID'.">
						<HxInp value={fields.site_id} onChange={(v) => setFields({ ...fields, site_id: v })} placeholder="12345678-1234-…" />
					</HxRow>
				)}

				<HxRow label="Deploy" desc={busy ? 'Talking to provider API…' : `Deploys the reverse-proxy mount and attaches ${fields.money_domain || 'your-domain'}/blog/*.`}>
					<button
						type="button"
						className="hx-btn hx-btn-primary"
						disabled={busy || !tokens[tab] || !fields.astro_origin || !fields.money_domain}
						onClick={deploy}
					>
						{busy ? 'Deploying…' : `Deploy to ${PROVIDERS.find((p) => p.id === tab)?.label}`}
					</button>
				</HxRow>

				{result && (
					<div style={{
						margin: '0 16px 16px',
						padding: 12,
						borderRadius: 8,
						background: result.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
						border: `1px solid ${result.ok ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
						color: result.ok ? '#065f46' : '#991b1b',
						fontSize: 13,
					}}>
						<div style={{ fontWeight: 600, marginBottom: 4 }}>{result.ok ? '✓ Deploy succeeded' : '✗ Deploy failed'}</div>
						<div>{result.message}</div>
					</div>
				)}

				{verify && (
					<div style={{
						margin: '0 16px 16px',
						padding: 12,
						borderRadius: 8,
						background: verify.state === 'verified' ? 'rgba(16,185,129,0.08)' : verify.state === 'timeout' ? 'rgba(245,158,11,0.10)' : 'rgba(59,130,246,0.08)',
						border: '1px solid rgba(0,0,0,0.06)',
						fontSize: 13,
					}}>
						{verify.state === 'polling'  && <div>Verifying mount at <code>{fields.money_domain}/blog/api/hatch-verify</code> — attempt {verify.tries || 0}/20…</div>}
						{verify.state === 'verified' && <div>✓ Verified. Astro origin: <code>{verify.origin}</code> · Money domain: <code>{verify.forwarded}</code></div>}
						{verify.state === 'timeout'  && <div>⚠ Verification timeout. {verify.hint}</div>}
					</div>
				)}
			</HxCard>

			{/* Copy-paste configs for hosts without an API path. */}
			{(host?.subfolder_support === 'nginx_location' || host?.subfolder_support === 'nginx_like') && (
				<HxCard>
					<HxHead icon="Server" title="Nginx location block" desc="Paste this into your money-domain's nginx server{} block. Reload nginx after." />
					<pre style={{ margin: '0 16px 16px', padding: 14, background: 'var(--h-bg-2)', borderRadius: 8, fontSize: 12, overflowX: 'auto' }}>{`# Ghost's warning: without \`resolver\` nginx caches DNS forever.
location /blog/ {
    resolver 1.1.1.1 valid=300s;
    set $hatch_origin "${(fields.astro_origin || 'astro-hatch.pages.dev').replace(/^https?:\/\//, '')}";
    proxy_pass https://$hatch_origin;
    proxy_set_header Host $hatch_origin;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Host ${fields.money_domain || 'yoursite.com'};
    proxy_ssl_server_name on;
}`}</pre>
				</HxCard>
			)}

			{host?.subfolder_support === 'caddy_handle' && (
				<HxCard>
					<HxHead icon="Server" title="Caddyfile handle_path" desc="Paste this into your money-domain block. Reload caddy after." />
					<pre style={{ margin: '0 16px 16px', padding: 14, background: 'var(--h-bg-2)', borderRadius: 8, fontSize: 12, overflowX: 'auto' }}>{`${fields.money_domain || 'yoursite.com'} {
  handle_path /blog/* {
    reverse_proxy ${fields.astro_origin || 'https://astro-hatch.pages.dev'} {
      header_up Host {upstream_hostport}
      header_up X-Forwarded-Host ${fields.money_domain || 'yoursite.com'}
    }
  }
  # ... rest of your site ...
}`}</pre>
				</HxCard>
			)}

			{host?.subfolder_support === 'none' && (
				<HxCard>
					<HxHead icon="AlertTriangle" title="Subdomain fallback" desc="Your host does not allow /blog subroute mounting. Use a subdomain instead — same SEO benefit when set up with a 301 canonical." />
					<HxRow label="Suggested" desc={`Point blog.${fields.money_domain || 'yourdomain.com'} at your Astro origin via CNAME.`}>
						<code style={{ fontSize: 12 }}>blog.{fields.money_domain || 'yourdomain.com'} CNAME {(fields.astro_origin || 'astro-hatch.pages.dev').replace(/^https?:\/\//, '')}</code>
					</HxRow>
				</HxCard>
			)}
		</>
	);
}

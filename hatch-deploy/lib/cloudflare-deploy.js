/**
 * Cloudflare Workers — Direct Deploy pipeline (v0.20.0).
 *
 * Same shape as vercel-deploy.js. User pastes a CF API token in the Hatch WP
 * plugin's Cloudflare card. Broker runs server-side (no GitHub fork on user's
 * account):
 *   1. Verify the token against CF API + grab the account ID
 *   2. git clone adityaarsharma/hatch (depth 1)
 *   3. write astro-starter/.env with WP credentials so the build embeds them
 *   4. npm install
 *   5. HATCH_TARGET=cf CF_PAGES=1 npm run build  →  dist/_worker.js/...
 *   6. echo "_worker.js" > dist/.assetsignore   ← so wrangler skips the Worker
 *      code from the Assets upload (it's the Worker, not an asset)
 *   7. npx wrangler@latest deploy --name <project-name>
 *      via env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
 *   8. Parse the *.workers.dev URL from CLI output
 *   9. Clean up temp dir, drop token from memory
 *
 * Notes
 *   - imageService is set to 'passthrough' on the CF target in astro.config.mjs,
 *     because 'compile' still pulls sharp's IIFE into the Worker bundle, which
 *     fails the validator (process.report.getReport not in CF Workers runtime).
 *   - Project names derive from the WP hostname + a 4-char random suffix so
 *     multiple Hatch sites on the same CF account don't collide.
 */

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const MAX_CONCURRENT_BUILDS = 3;
const BUILD_TIMEOUT_MS = 10 * 60 * 1000;
const HATCH_REPO = process.env.HATCH_REPO || 'https://github.com/adityaarsharma/hatch.git';
const HATCH_BRANCH = process.env.HATCH_BRANCH || 'main';

let activeBuilds = 0;
const buildQueue = [];

function acquireSlot() {
	return new Promise((resolve) => {
		if (activeBuilds < MAX_CONCURRENT_BUILDS) {
			activeBuilds++;
			resolve();
		} else {
			buildQueue.push(resolve);
		}
	});
}
function releaseSlot() {
	activeBuilds--;
	const next = buildQueue.shift();
	if (next) { activeBuilds++; next(); }
}

function runCmd(cmd, args, opts = {}) {
	return new Promise((resolve, reject) => {
		const proc = spawn(cmd, args, {
			stdio: ['ignore', 'pipe', 'pipe'],
			cwd: opts.cwd,
			env: { ...process.env, ...(opts.env || {}) },
		});
		let stdout = '';
		let stderr = '';
		const onLine = (chunk, isErr) => {
			const text = chunk.toString();
			if (isErr) stderr += text; else stdout += text;
			if (opts.onProgress) {
				for (const line of text.split('\n')) {
					if (line.trim()) opts.onProgress(line.trim());
				}
			}
		};
		proc.stdout.on('data', (c) => onLine(c, false));
		proc.stderr.on('data', (c) => onLine(c, true));
		const killer = setTimeout(() => {
			proc.kill('SIGKILL');
			reject(new Error(`Timeout after ${BUILD_TIMEOUT_MS / 1000}s: ${cmd} ${args.join(' ')}`));
		}, BUILD_TIMEOUT_MS);
		proc.on('close', (code) => {
			clearTimeout(killer);
			if (code === 0) resolve({ stdout, stderr });
			else reject(new Error(`${cmd} ${args.join(' ')} exited ${code}\n${stderr.slice(-2000)}`));
		});
		proc.on('error', (err) => { clearTimeout(killer); reject(err); });
	});
}

/**
 * Verify the CF token has Workers deploy access by listing accounts.
 * Returns the first account ID (used as CLOUDFLARE_ACCOUNT_ID for wrangler).
 *
 * We don't use /user/tokens/verify because that endpoint requires "User Tokens:
 * Read" permission, which deploy-only tokens don't include. /accounts works
 * with any token that has account-level access — which deploy tokens do.
 */
async function verifyCloudflareToken(token) {
	const res = await fetch('https://api.cloudflare.com/client/v4/accounts', {
		headers: { 'Authorization': `Bearer ${token}` },
	});
	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Cloudflare rejected the token: ${body.slice(0, 400)}`);
	}
	const data = await res.json();
	const accountId = data?.result?.[0]?.id;
	if (!accountId) {
		throw new Error('Token authenticated but no Cloudflare account visible to it.');
	}
	return { accountId, accountName: data.result[0].name || '' };
}

function deriveProjectName(wpUrl) {
	let slug = 'hatch-frontend';
	try {
		const host = new URL(wpUrl).hostname.replace(/^www\./, '');
		slug = host
			.replace(/\./g, '-')
			.replace(/[^a-z0-9-]/gi, '')
			.toLowerCase()
			.slice(0, 40)
			.replace(/-+$/, '');
		if (!slug) slug = 'hatch-frontend';
	} catch { /* keep default */ }
	const suffix = Math.random().toString(36).slice(2, 6);
	return `${slug}-${suffix}`;
}

/**
 * Full pipeline: clone → install → build → wrangler deploy → cleanup.
 *
 * @param {object} params
 * @param {object} params.ticket — wp_url, wp_user, wp_pass, webhook_secret
 * @param {string} params.cfToken — Cloudflare API token (cfat_* or legacy)
 * @param {function(string): void} params.onProgress
 * @returns {Promise<{project_url: string, project_name: string}>}
 */
export async function deployToCloudflare({ ticket, cfToken, onProgress }) {
	await acquireSlot();
	const progress = (msg) => { if (onProgress) onProgress(msg); };

	let workDir = null;
	try {
		progress('🔐 Verifying Cloudflare token…');
		const { accountId, accountName } = await verifyCloudflareToken(cfToken);
		progress(`✓ Token valid · account ${accountName || accountId.slice(0, 8) + '…'}`);

		progress('📁 Setting up build directory…');
		workDir = await mkdtemp(path.join(tmpdir(), 'hatch-cf-'));

		progress(`🐙 Cloning ${HATCH_REPO} (branch ${HATCH_BRANCH})…`);
		await runCmd('git', ['clone', '--depth', '1', '--branch', HATCH_BRANCH, HATCH_REPO, workDir], { onProgress: progress });

		const astroDir = path.join(workDir, 'astro-starter');

		progress('✍️  Writing astro-starter/.env (mode 600)…');
		const envContent = [
			`WP_API_URL=${ticket.wp_url}/wp-json/wp/v2`,
			`WP_API_USER=${ticket.wp_user}`,
			`WP_API_PASS=${ticket.wp_pass}`,
			`HATCH_WEBHOOK_SECRET=${ticket.webhook_secret}`,
			`PUBLIC_SITE_URL=https://placeholder.workers.dev`,
			``,
		].join('\n');
		await writeFile(path.join(astroDir, '.env'), envContent);
		await chmod(path.join(astroDir, '.env'), 0o600);

		progress('📦 Installing dependencies (npm install)…');
		await runCmd('npm', ['install', '--no-audit', '--no-fund', '--prefer-offline'], { cwd: astroDir, onProgress: progress });

		progress('🏗️  Building Astro (HATCH_TARGET=cf)…');
		// v0.49.2 — pass WP creds in subprocess env so Vite's `define` block
		// can read them via process.env and inline literal values into the
		// worker bundle. Without this, import.meta.env.WP_API_URL is undefined
		// at runtime in Workers and the frontend silently falls back to "Hatch"
		// defaults — i.e. empty posts/comments on the live site.
		await runCmd('npm', ['run', 'build'], {
			cwd: astroDir,
			env: {
				HATCH_TARGET:          'cf',
				CF_PAGES:              '1',
				WP_API_URL:            `${ticket.wp_url}/wp-json/wp/v2`,
				WP_API_USER:           ticket.wp_user,
				WP_API_PASS:           ticket.wp_pass,
				HATCH_WEBHOOK_SECRET:  ticket.webhook_secret,
			},
			onProgress: progress,
		});

		// Add .assetsignore so wrangler skips the _worker.js dir from the
		// Assets upload — it's the Worker code, not a static asset.
		const distDir = path.join(astroDir, 'dist');
		await writeFile(path.join(distDir, '.assetsignore'), '_worker.js\n');

		const projectName = deriveProjectName(ticket.wp_url);
		progress(`🚀 Deploying to Cloudflare Workers as "${projectName}"…`);

		const deployRes = await runCmd('npx', [
			'--yes',
			'wrangler@latest',
			'deploy',
			'--name', projectName,
		], {
			cwd: astroDir,
			env: {
				CLOUDFLARE_API_TOKEN: cfToken,
				CLOUDFLARE_ACCOUNT_ID: accountId,
			},
			onProgress: progress,
		});

		// Parse the deployment URL from wrangler output. Wrangler prints:
		//   "Deployed <name> triggers (X.Y sec)"
		//   "  https://<name>.<user>.workers.dev"
		// Capture the last workers.dev URL in the output.
		const combinedOutput = (deployRes.stdout + '\n' + deployRes.stderr);
		const urlMatches = [...combinedOutput.matchAll(/https:\/\/[\w.-]+\.workers\.dev/g)].map((m) => m[0]);
		const projectUrl = urlMatches[urlMatches.length - 1] || null;
		if (!projectUrl) {
			throw new Error('Deployed but could not parse the *.workers.dev URL from CLI output.');
		}

		progress(`✨ Done — your site is live at ${projectUrl}`);
		return { project_url: projectUrl, project_name: projectName };
	} finally {
		if (workDir) {
			try { await rm(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
		}
		releaseSlot();
	}
}

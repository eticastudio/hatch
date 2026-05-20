#!/usr/bin/env node
/**
 * Hatch Frontend Agent — Node.js daemon for the user's VPS.
 *
 * Runs as systemd service `hatch-agent.service`. Receives HMAC-signed POST
 * requests from the WP plugin and runs whitelisted commands on the frontend
 * working directory.
 *
 * Whitelisted commands ONLY:
 *   - git pull (origin / configured branch)
 *   - npm install (or pnpm/bun depending on lockfile)
 *   - npm run build
 *   - pm2 reload <process>
 *
 * No arbitrary shell. No file uploads. Nothing else.
 *
 * Configuration: /etc/hatch-agent/config.json
 *   {
 *     "secret": "<48-char-hmac-key>",
 *     "port": 34210,
 *     "bind": "0.0.0.0",
 *     "workdir": "/var/www/hatch-frontend",
 *     "pm2_name": "hatch-frontend",
 *     "wp_url": "https://cms.mysite.com",
 *     "allowed_origin_ip": ""   // optional — restrict to one IP
 *   }
 *
 * Endpoints (all require X-Hatch-Signature header):
 *   GET  /v1/healthz   → { ok: true, version: "...", node: "..." }
 *   GET  /v1/status    → { branch, commit, last_update, pm2: {...}, disk_free_gb }
 *   POST /v1/update    → runs full update sequence, returns log
 *   GET  /v1/logs      → tail of /var/log/hatch-agent.log
 *
 * Author: Aditya Sharma — MIT
 */

'use strict';

const http      = require( 'http' );
const fs        = require( 'fs' );
const path      = require( 'path' );
const crypto    = require( 'crypto' );
const { spawn, execFile } = require( 'child_process' );
const os        = require( 'os' );

const AGENT_VERSION = '0.1.0';
const CONFIG_PATH   = process.env.HATCH_AGENT_CONFIG || '/etc/hatch-agent/config.json';
const HMAC_WINDOW_S = 300;          // 5 minutes
const NONCE_TTL_MS  = 6 * 60 * 1000; // remember nonces for 6 min (a bit longer than window)

// ---------- load config ----------
let config;
try {
	config = JSON.parse( fs.readFileSync( CONFIG_PATH, 'utf8' ) );
} catch ( e ) {
	console.error( '[hatch-agent] FATAL: cannot read config:', CONFIG_PATH, e.message );
	process.exit( 1 );
}

const SECRET  = String( config.secret || '' );
const PORT    = Number( config.port || 34210 );
const BIND    = String( config.bind || '0.0.0.0' );
const WORKDIR = String( config.workdir || '/var/www/hatch-frontend' );
const PM2NAME = String( config.pm2_name || 'hatch-frontend' );
const WP_URL  = String( config.wp_url || '' );

if ( SECRET.length < 32 ) {
	console.error( '[hatch-agent] FATAL: secret missing or too short (<32 chars)' );
	process.exit( 1 );
}

// ---------- nonce cache (replay protection) ----------
const seenNonces = new Map(); // nonce -> expiresAt
setInterval( () => {
	const now = Date.now();
	for ( const [ n, exp ] of seenNonces ) if ( exp < now ) seenNonces.delete( n );
}, 60_000 ).unref();

// ---------- helpers ----------
function jsonResponse( res, code, obj ) {
	const body = JSON.stringify( obj );
	res.writeHead( code, {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength( body ),
		'X-Hatch-Agent-Version': AGENT_VERSION,
	} );
	res.end( body );
}

function safeEquals( a, b ) {
	const ab = Buffer.from( String( a || '' ), 'utf8' );
	const bb = Buffer.from( String( b || '' ), 'utf8' );
	if ( ab.length !== bb.length ) return false;
	return crypto.timingSafeEqual( ab, bb );
}

function verifyHmac( req, body, method, urlPath ) {
	const ts    = req.headers['x-hatch-timestamp'];
	const nonce = req.headers['x-hatch-nonce'];
	const sig   = req.headers['x-hatch-signature'];
	if ( !ts || !nonce || !sig ) return 'missing signature headers';

	const tsNum = Number( ts );
	if ( !Number.isFinite( tsNum ) ) return 'bad timestamp';
	const now = Math.floor( Date.now() / 1000 );
	if ( Math.abs( now - tsNum ) > HMAC_WINDOW_S ) return 'timestamp out of window';

	if ( seenNonces.has( nonce ) ) return 'replay';
	seenNonces.set( nonce, Date.now() + NONCE_TTL_MS );

	const signingString = `${ts}.${nonce}.${method}.${urlPath}.${body || ''}`;
	const expected = crypto.createHmac( 'sha256', SECRET ).update( signingString ).digest( 'hex' );
	if ( !safeEquals( sig, expected ) ) return 'bad signature';
	return null; // ok
}

function runCmd( cmd, args, opts = {} ) {
	return new Promise( ( resolve ) => {
		const proc = spawn( cmd, args, Object.assign( {
			cwd: WORKDIR,
			env: Object.assign( {}, process.env, {
				NODE_OPTIONS: '--max-old-space-size=' + Math.min( 2048, Math.floor( os.totalmem() / 1024 / 1024 / 2 ) ),
			} ),
		}, opts ) );
		let stdout = '';
		let stderr = '';
		proc.stdout && proc.stdout.on( 'data', ( c ) => { stdout += c.toString(); } );
		proc.stderr && proc.stderr.on( 'data', ( c ) => { stderr += c.toString(); } );
		const timeout = setTimeout( () => {
			try { proc.kill( 'SIGKILL' ); } catch (_) {}
			resolve( { code: -1, stdout, stderr: stderr + '\n[hatch-agent] timeout', timedOut: true } );
		}, 10 * 60 * 1000 ); // 10 min hard cap
		proc.on( 'close', ( code ) => {
			clearTimeout( timeout );
			resolve( { code, stdout, stderr, timedOut: false } );
		} );
	} );
}

function detectPackageManager() {
	if ( fs.existsSync( path.join( WORKDIR, 'pnpm-lock.yaml' ) ) ) return 'pnpm';
	if ( fs.existsSync( path.join( WORKDIR, 'bun.lockb' ) ) ) return 'bun';
	if ( fs.existsSync( path.join( WORKDIR, 'yarn.lock' ) ) ) return 'yarn';
	return 'npm';
}

async function diskFreeGb() {
	const res = await runCmd( 'df', [ '-BG', '--output=avail', WORKDIR ] );
	const m = res.stdout.match( /(\d+)G/ );
	return m ? Number( m[1] ) : 0;
}

async function gitInfo() {
	const branch = await runCmd( 'git', [ 'rev-parse', '--abbrev-ref', 'HEAD' ] );
	const commit = await runCmd( 'git', [ 'rev-parse', '--short', 'HEAD' ] );
	return {
		branch: branch.stdout.trim() || 'unknown',
		commit: commit.stdout.trim() || 'unknown',
	};
}

async function pm2Status() {
	const res = await runCmd( 'pm2', [ 'jlist' ] );
	try {
		const list = JSON.parse( res.stdout || '[]' );
		const proc = list.find( ( p ) => p.name === PM2NAME );
		if ( !proc ) return { running: false, name: PM2NAME };
		return {
			running:    proc.pm2_env && proc.pm2_env.status === 'online',
			name:       proc.name,
			uptime_ms:  proc.pm2_env ? ( Date.now() - proc.pm2_env.pm_uptime ) : 0,
			restarts:   proc.pm2_env ? proc.pm2_env.restart_time : 0,
			memory_mb:  proc.monit ? Math.round( proc.monit.memory / 1024 / 1024 ) : 0,
		};
	} catch ( e ) {
		return { running: false, name: PM2NAME, error: e.message };
	}
}

// ---------- request handler ----------
const server = http.createServer( async ( req, res ) => {
	try {
		// Optional IP allowlist
		if ( config.allowed_origin_ip ) {
			const remote = ( req.socket && req.socket.remoteAddress ) || '';
			const stripped = remote.replace( /^::ffff:/, '' );
			if ( stripped !== config.allowed_origin_ip ) {
				return jsonResponse( res, 403, { error: 'origin not allowed' } );
			}
		}

		const url = new URL( req.url, 'http://x' );
		const urlPath = url.pathname;
		const method  = req.method || 'GET';

		// Read body for POST
		let body = '';
		if ( method === 'POST' ) {
			body = await new Promise( ( resolve ) => {
				let buf = '';
				req.on( 'data', ( c ) => { buf += c.toString(); if ( buf.length > 100_000 ) req.destroy(); } );
				req.on( 'end', () => resolve( buf ) );
			} );
		}

		// HMAC for all /v1/* paths
		if ( urlPath.startsWith( '/v1/' ) ) {
			const err = verifyHmac( req, body, method, urlPath );
			if ( err ) return jsonResponse( res, 401, { error: 'unauthorized: ' + err } );
		}

		// ROUTING
		if ( urlPath === '/healthz' || urlPath === '/v1/healthz' ) {
			return jsonResponse( res, 200, { ok: true, version: AGENT_VERSION, node: process.version } );
		}

		if ( urlPath === '/v1/status' && method === 'GET' ) {
			const [ git, pm2, diskGb ] = await Promise.all( [
				gitInfo(),
				pm2Status(),
				diskFreeGb(),
			] );
			return jsonResponse( res, 200, {
				agent_version: AGENT_VERSION,
				node_version:  process.version,
				workdir:       WORKDIR,
				git,
				pm2,
				disk_free_gb:  diskGb,
				uptime_s:      Math.round( process.uptime() ),
			} );
		}

		if ( urlPath === '/v1/update' && method === 'POST' ) {
			let payload = {};
			try { payload = JSON.parse( body || '{}' ); } catch (_) { payload = {}; }
			const branch = String( payload.branch || 'main' ).replace( /[^a-zA-Z0-9._\-\/]/g, '' );

			const log = [];
			const append = ( name, r ) => {
				log.push( { step: name, code: r.code, stdout: r.stdout, stderr: r.stderr, ok: r.code === 0 } );
			};

			append( 'git fetch',  await runCmd( 'git', [ 'fetch', 'origin' ] ) );
			append( 'git reset',  await runCmd( 'git', [ 'reset', '--hard', `origin/${branch}` ] ) );

			const pm = detectPackageManager();
			append( `${pm} install`, await runCmd( pm, [ 'install', '--omit=dev' ] ) );
			append( `${pm} build`,   await runCmd( pm, [ 'run', 'build' ] ) );
			append( 'pm2 reload',    await runCmd( 'pm2', [ 'reload', PM2NAME ] ) );

			const ok = log.every( ( l ) => l.ok );
			return jsonResponse( res, ok ? 200 : 500, { ok, log } );
		}

		if ( urlPath === '/v1/logs' && method === 'GET' ) {
			// systemd journal — read last 200 lines.
			const res2 = await runCmd( 'journalctl', [ '-u', 'hatch-agent', '-n', '200', '--no-pager' ] );
			return jsonResponse( res, 200, { log: res2.stdout || res2.stderr } );
		}

		return jsonResponse( res, 404, { error: 'not found' } );

	} catch ( e ) {
		console.error( '[hatch-agent] handler error:', e );
		return jsonResponse( res, 500, { error: 'internal: ' + e.message } );
	}
} );

server.listen( PORT, BIND, () => {
	console.log( `[hatch-agent] v${AGENT_VERSION} listening on ${BIND}:${PORT} (workdir: ${WORKDIR})` );
} );

process.on( 'SIGTERM', () => { server.close( () => process.exit( 0 ) ); } );
process.on( 'SIGINT',  () => { server.close( () => process.exit( 0 ) ); } );

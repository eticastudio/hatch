/**
 * img-proxy — WebP/AVIF image optimization proxy for Hatch.
 *
 * Route: GET /img?url=<encoded>&w=<px>&h=<px>&format=webp|avif&q=1-100
 *
 * - Fetches the source image from the WP media origin
 * - Converts to WebP or AVIF using sharp (libvips — zero custom algo)
 * - Resizes if w/h given, never upscales
 * - Caches to disk keyed by content hash → immutable CDN-friendly responses
 * - Security: only proxies URLs from explicitly allowed origins (ALLOWED_IMG_ORIGINS env)
 */

import sharp from 'sharp';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '..', '.img-cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

// v0.50 — LRU eviction. Cap cache to MAX_CACHE_BYTES; evict oldest atime first
// when we exceed it. Runs after every successful cache write (cheap: a single
// readdir + statSync loop). Without this, .img-cache/ grew forever on busy
// brokers — multi-GB after a few thousand image variants.
const MAX_CACHE_BYTES = parseInt(process.env.IMG_CACHE_MAX_BYTES || '524288000', 10); // default 500 MB
function evictOldestIfOverLimit() {
  try {
    const entries = fs.readdirSync(CACHE_DIR, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => {
        const full = path.join(CACHE_DIR, e.name);
        const st = fs.statSync(full);
        return { full, size: st.size, atimeMs: st.atimeMs };
      });
    let totalBytes = entries.reduce((acc, e) => acc + e.size, 0);
    if (totalBytes <= MAX_CACHE_BYTES) return;
    entries.sort((a, b) => a.atimeMs - b.atimeMs); // oldest accessed first
    for (const e of entries) {
      if (totalBytes <= MAX_CACHE_BYTES) break;
      try { fs.unlinkSync(e.full); totalBytes -= e.size; } catch { /* ignore */ }
    }
  } catch { /* never let LRU bring down the proxy */ }
}

const ALLOWED_ORIGINS = (process.env.ALLOWED_IMG_ORIGINS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase().replace(/\/$/, ''))
  .filter(Boolean);

function isAllowedUrl(rawUrl) {
  if (!rawUrl) return false;
  let parsed;
  try { parsed = new URL(rawUrl); } catch { return false; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  if (ALLOWED_ORIGINS.length === 0) return true; // open if not configured
  const origin = `${parsed.protocol}//${parsed.hostname}`.toLowerCase();
  return ALLOWED_ORIGINS.some((o) => origin === o || origin.endsWith('.' + o.replace(/^https?:\/\//, '')));
}

const MIME = { webp: 'image/webp', avif: 'image/avif' };

export function registerImgProxy(app) {
  app.get('/img', async (req, res) => {
    const { url, w, h, format = 'webp', q = '80' } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url required' });
    }

    const fmt = format === 'avif' ? 'avif' : 'webp';
    const quality = Math.min(100, Math.max(1, parseInt(q, 10) || 80));
    const width  = w ? Math.min(4096, parseInt(w, 10)) || undefined : undefined;
    const height = h ? Math.min(4096, parseInt(h, 10)) || undefined : undefined;

    if (!isAllowedUrl(url)) {
      return res.status(403).json({ error: 'origin not allowed' });
    }

    const cacheKey = crypto
      .createHash('sha256')
      .update(`${url}|${width ?? ''}|${height ?? ''}|${fmt}|${quality}`)
      .digest('hex');
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.${fmt}`);

    if (fs.existsSync(cachePath)) {
      res.setHeader('Content-Type', MIME[fmt]);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Img-Cache', 'HIT');
      return res.sendFile(cachePath);
    }

    let upstream;
    try {
      upstream = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    } catch {
      return res.status(504).json({ error: 'upstream timeout' });
    }
    if (!upstream.ok) {
      return res.status(502).json({ error: `upstream ${upstream.status}` });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    let pipeline = sharp(buffer).rotate(); // auto-orient via EXIF
    if (width || height) {
      pipeline = pipeline.resize(width ?? null, height ?? null, {
        withoutEnlargement: true,
        fit: 'inside',
      });
    }
    pipeline = fmt === 'avif'
      ? pipeline.avif({ quality })
      : pipeline.webp({ quality });

    let output;
    try {
      output = await pipeline.toBuffer();
    } catch {
      return res.status(422).json({ error: 'conversion failed' });
    }

    fs.writeFileSync(cachePath, output);
    evictOldestIfOverLimit();

    res.setHeader('Content-Type', MIME[fmt]);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Img-Cache', 'MISS');
    res.send(output);
  });
}

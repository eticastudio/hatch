/**
 * Same-origin image proxy. Forwards /img?url=…&w=…&format=webp to the
 * configured backend (HATCH_IMG_BACKEND). On timeout/error, 302 to the
 * original image so the page never shows a broken icon.
 *
 * Catch-all path segment is unused — the proxy keys on query params — but
 * a [...path] segment lets `/img` and `/img/anything` both route here.
 */
import { NextRequest, NextResponse } from 'next/server';

const BACKEND = (process.env.HATCH_IMG_BACKEND || 'https://hatch.adityaarsharma.com').replace(/\/$/, '');

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const src = url.searchParams.get('url');
  const w = url.searchParams.get('w');
  const h = url.searchParams.get('h');
  const format = (url.searchParams.get('format') || 'webp').toLowerCase();
  const q = url.searchParams.get('q') || '80';
  if (!src) return NextResponse.json({ error: 'url required' }, { status: 400 });

  const backendUrl = new URL(BACKEND + '/img');
  backendUrl.searchParams.set('url', src);
  if (w) backendUrl.searchParams.set('w', w);
  if (h) backendUrl.searchParams.set('h', h);
  backendUrl.searchParams.set('format', format === 'avif' ? 'avif' : 'webp');
  backendUrl.searchParams.set('q', q);

  try {
    const upstream = await fetch(backendUrl, {
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'Hatch-img-proxy-next/1.0' },
    });
    if (!upstream.ok) return NextResponse.redirect(src, 302);
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || (format === 'avif' ? 'image/avif' : 'image/webp'),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Img-Backend': BACKEND,
      },
    });
  } catch {
    return NextResponse.redirect(src, 302);
  }
}

/**
 * Revalidation webhook. Accepts GET or POST; secret in `?secret=` or
 * `x-hatch-secret` header. Mirrors the Astro starter contract.
 */
import { NextRequest, NextResponse } from 'next/server';
import { clearFeaturesCache } from '@/lib/features';
import { revalidatePath } from 'next/cache';

async function handle(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') || req.headers.get('x-hatch-secret') || '';
  const expected = process.env.HATCH_WEBHOOK_SECRET || '';
  if (!expected || secret !== expected) {
    return NextResponse.json({ ok: false, error: 'Invalid secret' }, { status: 401 });
  }
  let payload: any = {};
  if (req.method === 'POST') {
    try { payload = await req.json(); } catch { payload = {}; }
  }
  clearFeaturesCache();
  // Best-effort path purges. Specific slug purge can be passed in payload.
  try {
    revalidatePath('/', 'layout');
    if (payload?.slug) {
      revalidatePath(`/blog/${payload.slug}`);
      revalidatePath(`/${payload.slug}`);
    }
  } catch {}
  console.log('[hatch] revalidate received — features cache cleared', payload);
  return NextResponse.json({ ok: true, payload });
}

export const GET = handle;
export const POST = handle;

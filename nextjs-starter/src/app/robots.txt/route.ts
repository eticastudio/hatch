import { wpJsonBase } from '@/lib/hatch';

export const revalidate = 300;

export async function GET() {
  const fallback = 'User-agent: *\nDisallow:\n';
  const base = wpJsonBase();
  if (!base) {
    return new Response(fallback, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  try {
    const res = await fetch(`${base}/hatch/v1/seo-meta`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return new Response(fallback, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    const data = (await res.json()) as { robots_txt?: string };
    const body = (data?.robots_txt && data.robots_txt.trim()) || fallback;
    return new Response(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    });
  } catch {
    return new Response(fallback, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

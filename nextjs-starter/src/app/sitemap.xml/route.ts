import { getPosts, getPages } from '@/lib/hatch';
import { getFeatures } from '@/lib/features';

export const revalidate = 300;

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET() {
  const [features, postsRes, pages] = await Promise.all([
    getFeatures(),
    getPosts({ page: 1, perPage: 100 }),
    getPages(),
  ]);
  const site = (process.env.NEXT_PUBLIC_SITE_URL || features.site.url || '').replace(/\/$/, '');
  const entries: { loc: string; lastmod: string }[] = [
    { loc: `${site}/`, lastmod: new Date().toISOString() },
    { loc: `${site}/blog`, lastmod: new Date().toISOString() },
  ];
  for (const p of postsRes.posts) entries.push({ loc: `${site}/blog/${p.slug}`, lastmod: p.modifiedAt });
  for (const p of pages) entries.push({ loc: `${site}/${p.slug}`, lastmod: p.modifiedAt });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url><loc>${escapeXml(e.loc)}</loc><lastmod>${e.lastmod}</lastmod></url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}

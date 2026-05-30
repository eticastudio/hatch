import { getPosts } from '@/lib/hatch';
import { getFeatures } from '@/lib/features';

export const revalidate = 300;

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

export async function GET() {
  const [features, { posts }] = await Promise.all([getFeatures(), getPosts({ page: 1, perPage: 25 })]);
  const site = process.env.NEXT_PUBLIC_SITE_URL || features.site.url || '';
  const title = escapeXml(features.site.name || 'Hatch');
  const description = escapeXml(features.site.description || '');
  const buildDate = new Date().toUTCString();

  const items = posts.map((p) => {
    const link = `${site}/blog/${p.slug}`;
    return `    <item>
      <title>${escapeXml(stripHtml(p.title))}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      ${p.author ? `<dc:creator><![CDATA[${p.author.name}]]></dc:creator>` : ''}
      ${p.category ? `<category>${escapeXml(p.category)}</category>` : ''}
      <description><![CDATA[${stripHtml(p.excerpt)}]]></description>
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${title}</title>
    <link>${site}</link>
    <description>${description}</description>
    <language>${features.site.language || 'en-US'}</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
    },
  });
}

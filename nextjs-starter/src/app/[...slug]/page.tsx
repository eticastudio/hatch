/**
 * Catch-all — any WP page or CPT by slug. Uses /hatch/v1/content to walk
 * every public post type. 404s if no match.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getFeatures, rewriteContentImages } from '@/lib/features';
import { getPageBySlug, getContentBySlug } from '@/lib/hatch';
import HatchImage from '@/components/HatchImage';

export const revalidate = 60;

async function resolve(slug: string) {
  const page = await getPageBySlug(slug);
  if (page) return page;
  const cpt = await getContentBySlug(slug);
  if (!cpt) return null;
  let excerpt = (cpt.excerpt || '').trim();
  if (!excerpt && cpt.content) {
    excerpt = cpt.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 155);
    if (excerpt.length === 155) excerpt += '…';
  }
  return {
    id: cpt.id, slug: cpt.slug, title: cpt.title, content: cpt.content, excerpt,
    featuredImage: cpt.featured_media_url || null,
    featuredImageAlt: cpt.featured_media_alt || '',
    modifiedAt: cpt.modified, publishedAt: cpt.published,
    category: null, categorySlug: null, categoryId: null,
    author: null, tags: [], readMinutes: 0,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const slugStr = (slug || []).join('/');
  if (!slugStr) return {};
  const page = await resolve(slugStr);
  if (!page) return { title: 'Not found' };
  return { title: page.title, description: page.excerpt };
}

export default async function CatchAllPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const slugStr = (slug || []).join('/');
  if (!slugStr) notFound();

  const [page, features] = await Promise.all([resolve(slugStr), getFeatures()]);
  if (!page) notFound();

  return (
    <article className="hatch-page-main">
      {page.featuredImage && (
        <div style={{ aspectRatio: '2/1', borderRadius: 12, overflow: 'hidden', marginBottom: 40, background: 'var(--hatch-bg-3)' }}>
          <HatchImage features={features} src={page.featuredImage} alt={page.featuredImageAlt || ''} width={1600} height={800} loading="eager" />
        </div>
      )}
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 48, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>{page.title}</h1>
        {page.modifiedAt && (
          <p style={{ marginTop: 16, fontSize: 13, color: 'var(--hatch-fg-subtle)' }}>
            Updated <time dateTime={page.modifiedAt}>{new Date(page.modifiedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
          </p>
        )}
      </header>
      <div className="hatch-prose" style={{ maxWidth: '100%' }} dangerouslySetInnerHTML={{ __html: rewriteContentImages(page.content, features) }} />
    </article>
  );
}

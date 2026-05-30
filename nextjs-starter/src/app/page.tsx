/**
 * Homepage — three modes:
 *   1) WP "static page" set in Reading → render that Page
 *   2) Default blog hero + latest grid
 *   3) Empty WP → onboarding placeholder
 */
import { getFeatures, rewriteContentImages } from '@/lib/features';
import { getPosts, getCategories, getPageById } from '@/lib/hatch';
import PostCard from '@/components/PostCard';
import HatchImage from '@/components/HatchImage';
import type { Metadata } from 'next';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const features = await getFeatures();
  return { title: features.site.name || 'Hatch', description: features.site.description };
}

export default async function HomePage() {
  const features = await getFeatures();

  // Mode 1 — static WP page as homepage.
  if (features.home.mode === 'page' && features.home.static_page_id) {
    const staticPage = await getPageById(features.home.static_page_id);
    if (staticPage) {
      return (
        <article className="hatch-page-main">
          {staticPage.featuredImage && (
            <div style={{ aspectRatio: '2/1', borderRadius: 12, overflow: 'hidden', marginBottom: 40, background: 'var(--hatch-bg-3)' }}>
              <HatchImage features={features} src={staticPage.featuredImage} alt={staticPage.featuredImageAlt || ''} width={1600} height={800} loading="eager" />
            </div>
          )}
          <h1 style={{ fontSize: 48, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 24px' }}>{staticPage.title}</h1>
          <div className="hatch-prose" style={{ maxWidth: '100%' }} dangerouslySetInnerHTML={{ __html: rewriteContentImages(staticPage.content, features) }} />
        </article>
      );
    }
  }

  const { posts: latest, total } = await getPosts({ perPage: 7 });
  const categories = (await getCategories()).slice(0, 8);
  const siteName = features.site.name;
  const tagline = features.site.description;

  if (latest.length === 0) {
    return (
      <main className="hatch-page-main" style={{ textAlign: 'center', paddingTop: 128 }}>
        <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--hatch-primary)', fontWeight: 500, marginBottom: 16 }}>🐣 Hatch</p>
        <h1 style={{ fontSize: 56, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.05, margin: '0 0 20px' }}>{siteName}</h1>
        <p style={{ fontSize: 18, color: 'var(--hatch-fg-muted)', maxWidth: 600, margin: '0 auto 40px' }}>
          {tagline || 'A blazing-fast Next.js frontend for your headless WordPress site.'}
        </p>
        <div style={{ borderRadius: 8, border: '1px dashed var(--hatch-border)', background: 'var(--hatch-bg-2)', padding: 32, maxWidth: 420, margin: '0 auto', textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--hatch-fg-muted)' }}>
            Publish your first post in WordPress and it'll appear here automatically (within ~60 seconds via ISR).
          </p>
        </div>
      </main>
    );
  }

  const [featured, ...recent] = latest;

  return (
    <main className="hatch-page-main">
      <section className="hatch-hero hatch-section">
        <h1>{siteName}</h1>
        {tagline && <p>{tagline}</p>}
      </section>

      {featured && (
        <section className="hatch-section">
          <PostCard post={featured} features={features} variant="feature" />
        </section>
      )}

      {recent.length > 0 && (
        <section className="hatch-section">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>Latest posts</h2>
            {total > 7 && <a href="/blog" style={{ fontSize: 13.5, color: 'var(--hatch-fg-muted)' }}>See all {total} →</a>}
          </div>
          <div className="hatch-grid hatch-grid-3">
            {recent.map((post) => <PostCard key={post.id} post={post} features={features} />)}
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="hatch-section">
          <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 24 }}>Topics</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {categories.map((cat) => (
              <a key={cat.id} href={`/blog?category=${cat.slug}`} className="hatch-chip">
                <span>{cat.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--hatch-fg-subtle)' }}>{cat.count}</span>
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

/**
 * Single post. Renders WP raw HTML (which may contain Hatch block markup that
 * the runtime hydrates on the client) with token-driven chrome around it.
 */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getFeatures, rewriteContentImages, hasFeature } from '@/lib/features';
import { getPostBySlug, getPosts } from '@/lib/hatch';
import PostCard from '@/components/PostCard';
import HatchImage from '@/components/HatchImage';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: 'Not found' };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, images: post.featuredImage ? [post.featuredImage] : undefined, type: 'article' },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const features = await getFeatures();
  const showBreadcrumb = hasFeature(features, 'breadcrumb');
  const showReadingTime = hasFeature(features, 'reading_time') && features.aesthetic.reading.reading_time_label !== 'hidden';
  const showUpdated = hasFeature(features, 'last_updated');
  const showRelated = hasFeature(features, 'related_posts');
  const showAuthorBio = hasFeature(features, 'author_bio');

  const reading = features.aesthetic.reading;
  const sep = reading.breadcrumb_separator === 'chevron' ? '›' : reading.breadcrumb_separator === 'arrow' ? '→' : '/';
  const rtLabel = reading.reading_time_label === 'mins' ? `${post.readMinutes} mins` : `${post.readMinutes} min read`;
  const dateLabel = formatDate(post.publishedAt, reading.date_format);
  const updatedDifferent = post.modifiedAt && new Date(post.modifiedAt).toDateString() !== new Date(post.publishedAt).toDateString();

  let related: Awaited<ReturnType<typeof getPosts>>['posts'] = [];
  if (showRelated && post.categoryId) {
    const r = await getPosts({ perPage: features.aesthetic.post_navigation.related_count, category: post.categoryId });
    related = r.posts.filter((p) => p.id !== post.id).slice(0, features.aesthetic.post_navigation.related_count);
  }

  return (
    <article className="hatch-page-main">
      {showBreadcrumb && (
        <nav aria-label="Breadcrumb" style={{ marginBottom: 24, fontSize: 13, color: 'var(--hatch-fg-subtle)' }}>
          <a href="/" style={{ color: 'inherit' }}>Home</a> <span style={{ margin: '0 6px' }}>{sep}</span>
          <a href="/blog" style={{ color: 'inherit' }}>Blog</a> {post.category && <><span style={{ margin: '0 6px' }}>{sep}</span><a href={`/blog?category=${post.categorySlug}`} style={{ color: 'inherit' }}>{post.category}</a></>}
        </nav>
      )}

      {post.featuredImage && (
        <div style={{ aspectRatio: '2/1', borderRadius: 12, overflow: 'hidden', marginBottom: 32, background: 'var(--hatch-bg-3)' }}>
          <HatchImage features={features} src={post.featuredImage} alt={post.featuredImageAlt || ''} width={1600} height={800} loading="eager" />
        </div>
      )}

      <header style={{ marginBottom: 40 }}>
        {post.category && <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--hatch-primary)', fontWeight: 500 }}>{post.category}</span>}
        <h1 style={{ fontSize: 48, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '12px 0 16px' }}>{post.title}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13.5, color: 'var(--hatch-fg-subtle)' }}>
          {post.author && <span>{post.author.name}</span>}
          <span>·</span>
          <time dateTime={post.publishedAt}>{dateLabel}</time>
          {showReadingTime && <><span>·</span><span>{rtLabel}</span></>}
          {showUpdated && updatedDifferent && <><span>·</span><span>Updated {formatDate(post.modifiedAt, reading.date_format)}</span></>}
        </div>
      </header>

      <div className="hatch-prose" dangerouslySetInnerHTML={{ __html: rewriteContentImages(post.content, features) }} />

      {showAuthorBio && post.author && (
        <section style={{ marginTop: 64, padding: '32px 0', borderTop: '1px solid var(--hatch-border)', borderBottom: '1px solid var(--hatch-border)', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {post.author.avatar && <img src={post.author.avatar} alt={post.author.name} width={64} height={64} style={{ borderRadius: '50%', flexShrink: 0 }} />}
          <div>
            <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--hatch-fg-subtle)', margin: 0 }}>Written by</p>
            <p style={{ fontSize: 18, fontWeight: 600, margin: '4px 0' }}>{post.author.name}</p>
            {post.author.description && <p style={{ fontSize: 14, color: 'var(--hatch-fg-muted)', margin: 0 }}>{post.author.description}</p>}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section style={{ marginTop: 64 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Related posts</h2>
          <div className="hatch-grid hatch-grid-3">
            {related.map((p) => <PostCard key={p.id} post={p} features={features} />)}
          </div>
        </section>
      )}
    </article>
  );
}

function formatDate(iso: string, fmt: string): string {
  const d = new Date(iso);
  if (fmt === 'short') return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (fmt === 'relative') {
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
    if (diff < 365) return `${Math.floor(diff / 30)} months ago`;
    return `${Math.floor(diff / 365)} years ago`;
  }
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

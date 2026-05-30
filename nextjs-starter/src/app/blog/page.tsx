/**
 * /blog — archive of posts. Honors aesthetic.blog_index controls + the
 * design.archive_grid template setting.
 */
import { getFeatures, hasFeature } from '@/lib/features';
import { getPosts, getCategories } from '@/lib/hatch';
import PostCard from '@/components/PostCard';
import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = { title: 'Blog' };

export default async function BlogIndex({ searchParams }: { searchParams: Promise<{ page?: string; category?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const categorySlug = sp.category;

  const [features, categories] = await Promise.all([getFeatures(), getCategories()]);
  const activeCategory = categorySlug ? categories.find((c) => c.slug === categorySlug) ?? null : null;
  const showCategoryTabs = hasFeature(features, 'category_tabs');
  const blogIdx = features.aesthetic.blog_index;
  const tmpl = features.design?.templates;
  const aGrid = String(blogIdx.archive_grid || tmpl?.archive_grid || '3');
  const gridClass = `hatch-grid hatch-grid-${aGrid === '1' ? '1' : aGrid === '2' ? '2' : aGrid === '4' ? '4' : '3'}`;
  const showExcerpt = tmpl?.archive_excerpt !== 'false';
  const showHero = blogIdx.show_hero;
  const showTopics = blogIdx.show_topics;
  const paginationStyle = blogIdx.pagination_style;

  const { posts, total, hasMore } = await getPosts({ page, perPage: 12, category: activeCategory?.id ?? null });
  const totalPages = Math.max(1, Math.ceil(total / 12));

  return (
    <main className="hatch-page-main">
      <header style={{ marginBottom: 48, paddingBottom: 32, borderBottom: '1px solid var(--hatch-border)' }}>
        <h1 style={{ fontSize: 48, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.05, margin: 0 }}>{activeCategory ? activeCategory.name : 'Blog'}</h1>
        <p style={{ marginTop: 12, fontSize: 14.5, color: 'var(--hatch-fg-muted)' }}>
          {total} {total === 1 ? 'post' : 'posts'}
          {activeCategory && <> in <strong style={{ color: 'var(--hatch-fg)', fontWeight: 500 }}>{activeCategory.name}</strong></>}
        </p>
      </header>

      {showCategoryTabs && showTopics && categories.length > 0 && (
        <nav aria-label="Categories" style={{ marginBottom: 40, display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
          <a href="/blog" className={`hatch-chip ${!activeCategory ? 'is-active' : ''}`}>All</a>
          {categories.map((cat) => (
            <a key={cat.id} href={`/blog?category=${cat.slug}`} className={`hatch-chip ${activeCategory?.id === cat.id ? 'is-active' : ''}`}>
              <span>{cat.name}</span><span style={{ fontSize: 11 }}>{cat.count}</span>
            </a>
          ))}
        </nav>
      )}

      {posts.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--hatch-fg-muted)', padding: '96px 0' }}>No posts yet.</p>
      ) : (
        <>
          {showHero && page === 1 && !activeCategory && posts[0] && (
            <div style={{ marginBottom: 48 }}>
              <PostCard post={posts[0]} features={features} variant="feature" />
            </div>
          )}
          <div className={gridClass}>
            {(showHero && page === 1 && !activeCategory ? posts.slice(1) : posts).map((p) => (
              <PostCard key={p.id} post={p} features={features} showExcerpt={showExcerpt} />
            ))}
          </div>
        </>
      )}

      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 56 }}>
          {paginationStyle === 'numbered' ? (
            <nav style={{ display: 'flex', gap: 8 }} aria-label="Pagination">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <a key={n} href={`/blog?page=${n}${activeCategory ? `&category=${activeCategory.slug}` : ''}`} className={`hatch-chip ${n === page ? 'is-active' : ''}`} style={{ borderRadius: 6, padding: '6px 14px' }}>{n}</a>
              ))}
            </nav>
          ) : (
            <a href={`/blog?page=${page + 1}${activeCategory ? `&category=${activeCategory.slug}` : ''}`} className="hatch-btn">Load more →</a>
          )}
        </div>
      )}
    </main>
  );
}

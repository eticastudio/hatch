import type { Metadata } from 'next';
import { searchPosts } from '@/lib/hatch';
import { getFeatures } from '@/lib/features';
import PostCard from '@/components/PostCard';

export const revalidate = 30;
export const metadata: Metadata = { title: 'Search' };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const query = (sp.q ?? '').trim();
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const features = await getFeatures();
  const { posts, total, hasMore } = await searchPosts(query, { page, perPage: 12 });

  return (
    <main className="hatch-page-main">
      <header style={{ marginBottom: 48, paddingBottom: 32, borderBottom: '1px solid var(--hatch-border)' }}>
        <h1 style={{ fontSize: 48, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.05, margin: '0 0 24px' }}>Search</h1>
        <form action="/search" method="get" className="hatch-search-form">
          <input type="search" name="q" defaultValue={query} placeholder="Search posts…" autoFocus />
          <button type="submit">Search</button>
        </form>
        {query && (
          <p style={{ marginTop: 16, fontSize: 14, color: 'var(--hatch-fg-muted)' }}>
            {total} {total === 1 ? 'result' : 'results'} for <strong style={{ color: 'var(--hatch-fg)', fontWeight: 500 }}>&quot;{query}&quot;</strong>
          </p>
        )}
      </header>

      {!query ? (
        <p style={{ color: 'var(--hatch-fg-muted)', padding: '48px 0' }}>Type a query above to search posts.</p>
      ) : posts.length === 0 ? (
        <div style={{ padding: '64px 0', textAlign: 'center' }}>
          <p style={{ color: 'var(--hatch-fg-muted)', fontSize: 15 }}>No results for &quot;{query}&quot;.</p>
        </div>
      ) : (
        <div className="hatch-grid hatch-grid-3">
          {posts.map((p) => <PostCard key={p.id} post={p} features={features} />)}
        </div>
      )}

      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 56 }}>
          <a href={`/search?q=${encodeURIComponent(query)}&page=${page + 1}`} className="hatch-btn">Load more →</a>
        </div>
      )}
    </main>
  );
}

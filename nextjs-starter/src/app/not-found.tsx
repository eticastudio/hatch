import { getFeatures } from '@/lib/features';
import { getPosts } from '@/lib/hatch';

export const revalidate = 60;

export default async function NotFound() {
  const features = await getFeatures();
  const showSearch = (features.design?.templates?.not_found_search ?? 'true') !== 'false';
  const { posts: recent } = await getPosts({ page: 1, perPage: 4 });
  return (
    <main className="hatch-page-main">
      <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--hatch-fg-subtle)', fontWeight: 500, marginBottom: 12 }}>Error 404</p>
      <h1 style={{ fontSize: 48, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.05, margin: 0 }}>This page doesn&rsquo;t exist.</h1>
      <p style={{ marginTop: 16, fontSize: 15, color: 'var(--hatch-fg-muted)', maxWidth: 600 }}>
        The URL you tried may have moved, been deleted, or never existed in the first place.
      </p>
      {showSearch && (
        <form action="/search" method="get" className="hatch-search-form" style={{ marginTop: 32 }}>
          <input type="search" name="q" placeholder="Search the site…" required />
          <button type="submit">Search</button>
        </form>
      )}
      <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <a href="/" className="hatch-btn">← Home</a>
        <a href="/blog" className="hatch-btn">All posts</a>
      </div>
      {recent.length > 0 && (
        <section style={{ marginTop: 80, paddingTop: 40, borderTop: '1px solid var(--hatch-border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>Recent posts</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recent.map((p) => (
              <li key={p.id}>
                <a href={`/blog/${p.slug}`} style={{ display: 'block', padding: '8px 0' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.4, margin: 0 }}>{p.title}</h3>
                  <p style={{ marginTop: 4, fontSize: 12.5, color: 'var(--hatch-fg-subtle)' }}>
                    {new Date(p.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {p.category && ` · ${p.category}`}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

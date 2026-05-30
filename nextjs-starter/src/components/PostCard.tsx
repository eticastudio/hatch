import type { HatchFeatures, Post } from './types';
import HatchImage from './HatchImage';

interface Props {
  post: Post;
  features: HatchFeatures;
  variant?: 'default' | 'compact' | 'feature';
  showExcerpt?: boolean;
}

export default function PostCard({ post, features, variant = 'default', showExcerpt = true }: Props) {
  const href = `/blog/${post.slug}`;
  const aes = features.aesthetic;
  const showRtPill = aes.reading.reading_time_label !== 'hidden';
  const rt = (m: number) => aes.reading.reading_time_label === 'mins' ? `${m} mins` : `${m} min read`;
  const dateLabel = formatDate(post.publishedAt, aes.reading.date_format);

  if (variant === 'compact') {
    return (
      <a href={href} className="hatch-card hatch-card-compact" style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--hatch-border)' }}>
        {post.featuredImage && (
          <div style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 6, overflow: 'hidden', background: 'var(--hatch-bg-3)' }}>
            <HatchImage features={features} src={post.featuredImage} alt="" width={128} height={128} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.35, margin: 0 }}>{post.title}</h3>
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--hatch-fg-subtle)' }}>
            <time dateTime={post.publishedAt}>{dateLabel}</time>
            {showRtPill && post.readMinutes > 0 && ` · ${rt(post.readMinutes)}`}
          </div>
        </div>
      </a>
    );
  }

  if (variant === 'feature') {
    return (
      <a href={href} className="hatch-card hatch-card-feature">
        {post.featuredImage && (
          <div className="hatch-card-media">
            <HatchImage features={features} src={post.featuredImage} alt={post.featuredImageAlt || ''} width={1200} height={600} />
          </div>
        )}
        <div className="hatch-card-body">
          {post.category && <span className="hatch-card-cat">{post.category}</span>}
          <h2 className="hatch-card-title" style={{ fontSize: 30 }}>{post.title}</h2>
          {showExcerpt && post.excerpt && <p className="hatch-card-excerpt">{post.excerpt}</p>}
          <div className="hatch-card-meta">
            {post.author && <span>{post.author.name}</span>}
            <span>·</span>
            <time dateTime={post.publishedAt}>{dateLabel}</time>
            {showRtPill && <><span>·</span><span>{rt(post.readMinutes)}</span></>}
          </div>
        </div>
      </a>
    );
  }

  return (
    <a href={href} className="hatch-card">
      <div className="hatch-card-media">
        {post.featuredImage
          ? <HatchImage features={features} src={post.featuredImage} alt={post.featuredImageAlt || ''} width={800} height={500} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, color-mix(in srgb, var(--hatch-primary) 20%, transparent), var(--hatch-bg-3))' }} />}
      </div>
      {post.category && <span className="hatch-card-cat">{post.category}</span>}
      <h3 className="hatch-card-title">{post.title}</h3>
      {showExcerpt && post.excerpt && <p className="hatch-card-excerpt">{post.excerpt}</p>}
      <div className="hatch-card-meta">
        {post.author && <><span>{post.author.name}</span><span>·</span></>}
        <time dateTime={post.publishedAt}>{dateLabel}</time>
        {showRtPill && post.readMinutes > 0 && <><span>·</span><span>{rt(post.readMinutes)}</span></>}
      </div>
    </a>
  );
}

function formatDate(iso: string, fmt: string): string {
  const d = new Date(iso);
  if (fmt === 'short') return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  if (fmt === 'relative') {
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
    if (diff < 365) return `${Math.floor(diff / 30)} months ago`;
    return `${Math.floor(diff / 365)} years ago`;
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

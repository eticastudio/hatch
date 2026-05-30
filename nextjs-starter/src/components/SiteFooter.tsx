import type { HatchFeatures, HatchMenuItem } from './types';

export default function SiteFooter({ features, menuItems }: { features: HatchFeatures; menuItems: HatchMenuItem[] }) {
  const siteName = features.site.name || 'Hatch';
  const year = new Date().getFullYear();
  const items = menuItems.filter((i) => i.parent === 0).sort((a, b) => a.order - b.order);
  const showCredit = features.features?.built_by_hatch !== false;
  return (
    <footer className="hatch-footer">
      <div className="hatch-footer-inner">
        <div>
          <span className="hatch-footer-name">© {year} {siteName}</span>
          {features.site.description && <span className="hatch-footer-tagline" style={{ marginLeft: 12, color: 'var(--hatch-fg-subtle)' }}>{features.site.description}</span>}
        </div>
        {items.length > 0 && (
          <nav className="hatch-footer-nav" aria-label="Footer">
            {items.map((i) => (
              <a key={i.id} href={i.url} target={i.target || undefined}>{i.title}</a>
            ))}
          </nav>
        )}
        {showCredit && (
          <p className="hatch-footer-credit">
            Built with <a href="https://github.com/adityaarsharma/hatch" rel="noopener">Hatch</a>
          </p>
        )}
      </div>
    </footer>
  );
}

/**
 * SiteHeader — server component. Reads features + menu, renders a
 * theme-token-driven header that adapts visually via the theme CSS files.
 *
 * Mobile drawer toggle is a small client island (MobileDrawer.tsx).
 */
import type { HatchFeatures, HatchMenuItem } from './types';
import MobileDrawer from './MobileDrawer';

type Item = { href: string; label: string; target: string; children: { href: string; label: string; target: string }[] };

export default function SiteHeader({ features, menuItems, pathname }: { features: HatchFeatures; menuItems: HatchMenuItem[]; pathname: string }) {
  const siteName = features.site.name || 'Hatch';
  const logoUrl = (features.site.logo_url || '').trim();
  const headerCfg = features.aesthetic.header;
  const brandDisplay = headerCfg.brand_display || 'auto';
  const showLogo = !!logoUrl && (brandDisplay === 'logo' || brandDisplay === 'both' || (brandDisplay === 'auto' && !!logoUrl));
  const showText = brandDisplay === 'text' || brandDisplay === 'both' || (brandDisplay === 'auto' && !logoUrl);

  const topItems = menuItems.filter((i) => i.parent === 0).sort((a, b) => a.order - b.order);
  const childrenOf = (id: number) => menuItems.filter((i) => i.parent === id).sort((a, b) => a.order - b.order);
  const navItems: Item[] = topItems.length > 0
    ? topItems.map((i) => ({ href: i.url, label: i.title, target: i.target, children: childrenOf(i.id).map((c) => ({ href: c.url, label: c.title, target: c.target })) }))
    : [{ href: '/blog', label: 'Blog', target: '', children: [] }];

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
  const theme = features.theme || 'blog';

  return (
    <header className={`hatch-header hatch-header-${theme}`} data-hatch-theme-header={theme}>
      <div className="hatch-header-inner">
        <a href="/" className="hatch-brand">
          {showLogo && <img src={logoUrl} alt={siteName} loading="eager" />}
          {showText && (
            <>
              {headerCfg.brand_mark === 'icon_text' && <span className="hatch-brand-emoji" aria-hidden>🐣</span>}
              <span className="hatch-brand-name">{siteName}</span>
            </>
          )}
        </a>
        <nav className="hatch-nav" aria-label="Primary">
          {navItems.map((item) => (
            <a key={item.href + item.label} href={item.href} target={item.target || undefined} className={isActive(item.href) ? 'is-active' : ''}>
              {item.label}
            </a>
          ))}
        </nav>
        <MobileDrawer items={navItems} />
      </div>
    </header>
  );
}

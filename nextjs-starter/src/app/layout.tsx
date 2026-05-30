import type { Metadata } from 'next';
import { Inter, Lora, Playfair_Display, JetBrains_Mono, Source_Serif_4 } from 'next/font/google';
import { headers } from 'next/headers';
import Script from 'next/script';
import '../styles/globals.css';

import { getFeatures, designToCssVars } from '@/lib/features';
import { getMenus } from '@/lib/hatch';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
const sourceSerif = Source_Serif_4({ subsets: ['latin'], variable: '--font-source-serif', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const features = await getFeatures();
  return {
    title: { default: features.site.name || 'Hatch', template: `%s — ${features.site.name || 'Hatch'}` },
    description: features.site.description || 'Headless WordPress, powered by Hatch.',
    icons: features.site.icon_url
      ? { icon: features.site.icon_url }
      : { icon: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><text x="50%" y="55%" font-size="56" text-anchor="middle" dominant-baseline="middle">🐣</text></svg>') },
    alternates: { types: { 'application/rss+xml': '/rss.xml' } },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [features, primaryMenu, footerMenu] = await Promise.all([
    getFeatures(),
    getMenus('primary'),
    getMenus('footer'),
  ]);

  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || '/';

  const theme = features.theme || 'blog';
  const lang = (features.site.language || 'en-US').split('-')[0];
  const colorMode = features.design?.brand?.mode || 'light';
  const cssVars = designToCssVars(features.design);
  const wpBase = (features.site.url || process.env.HATCH_WP_API_URL || '').replace(/\/$/, '');

  const fontClasses = [inter.variable, lora.variable, playfair.variable, mono.variable, sourceSerif.variable].join(' ');

  return (
    <html lang={lang} data-hatch-theme={theme} data-hatch-mode={colorMode} className={fontClasses}>
      <head>
        <link rel="stylesheet" href="/hatch-blocks.css" />
        {/* Inline style tag to apply CSS custom properties from features.design. */}
        {cssVars && <style dangerouslySetInnerHTML={{ __html: `:root{${cssVars}}` }} />}
      </head>
      <body>
        <div className="hatch-site-shell">
          <SiteHeader features={features} menuItems={primaryMenu} pathname={pathname} />
          <main>{children}</main>
          <SiteFooter features={features} menuItems={footerMenu} />
        </div>
        {/* Hatch Blocks runtime — vanilla JS, hydrates dynamic blocks on first paint. */}
        <Script id="hatch-wp-base" strategy="beforeInteractive">
          {`window.HATCH_WP_BASE=${JSON.stringify(wpBase)};`}
        </Script>
        <Script src="/hatch-blocks.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}

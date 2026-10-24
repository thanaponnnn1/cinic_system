import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai, Playfair_Display } from 'next/font/google';
import { SiteFooter } from '@/components/site-footer';
import { FloatingBook, SiteHeader } from '@/components/site-header';
import { JsonLd } from '@/components/page-chrome';
import { bookingHref, SITE_URL } from '@/config';
import { content } from '@/content/load';
import { businessJsonLd } from '@/seo/jsonld';
import { robotsForMode } from '@/seo/metadata';
import './globals.css';

const notoThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-noto-thai',
  display: 'swap',
});

// serif ให้เข้ากับโลโก้ THNP ที่เป็นตัว serif สีทอง
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: content.pages.home.title,
  description: content.pages.home.description,
  robots: robotsForMode,
  applicationName: content.site.name,
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: '#060d15',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${notoThai.variable} ${playfair.variable}`}>
      <body>
        <a
          href="#main"
          className="skip-link rounded-full bg-gold-300 px-5 py-3 font-medium text-navy-950"
        >
          ข้ามไปเนื้อหาหลัก
        </a>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <SiteFooter />
        <FloatingBook href={bookingHref()} />
        <JsonLd data={businessJsonLd(content.site, SITE_URL)} />
      </body>
    </html>
  );
}

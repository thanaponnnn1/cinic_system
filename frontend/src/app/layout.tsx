import type { Metadata } from 'next';
import { Noto_Sans_Thai, Playfair_Display } from 'next/font/google';
import { BRAND_INFO } from '@clinicq/shared';
import { Providers } from '@/components/providers';
import './globals.css';

const notoThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-thai',
  display: 'swap',
});

// ตัวอักษร serif ให้เข้ากับโลโก้ THNP ที่เป็น serif ทอง
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${BRAND_INFO.productName} — ${BRAND_INFO.name}`,
  description: BRAND_INFO.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${notoThai.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-navy-950 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

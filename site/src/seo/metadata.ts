import type { Metadata } from 'next';
import { absoluteUrl, SITE_MODE } from '@/config';
import type { Seo } from '@/content/schema';

/**
 * โหมดเดโมมีข้อมูลร้านสมมติ ต้องไม่ให้ Google เก็บ จึงใส่ noindex, nofollow ทุกหน้า
 * (robots.txt ก็ปิดทั้งเว็บด้วย ดู app/robots.ts)
 */
export const robotsForMode: Metadata['robots'] =
  SITE_MODE === 'demo'
    ? { index: false, follow: false, googleBot: { index: false, follow: false } }
    : { index: true, follow: true };

/** metadata ต่อหน้า title/description ผ่านกฎความยาวใน schema มาแล้ว */
export function pageMetadata(
  seo: Seo,
  path: string,
  options: { type?: 'website' | 'article'; image?: string } = {},
): Metadata {
  const url = absoluteUrl(path);
  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: url },
    robots: robotsForMode,
    openGraph: {
      type: options.type ?? 'website',
      url,
      title: seo.title,
      description: seo.description,
      siteName: 'THNP Clinic',
      locale: 'th_TH',
      // ใส่ openGraph ในหน้าแล้วภาพแชร์ของ layout จะหายไป จึงชี้ภาพแชร์หลักของเว็บไว้เป็นค่าปริยาย
      // หน้าที่มีไฟล์ opengraph-image ของตัวเอง (หน้าบริการ) ต้องส่ง path ของไฟล์นั้นมาใน options.image
      images: [
        options.image
          ? { url: options.image }
          : { url: '/opengraph-image', width: 1200, height: 630 },
      ],
    },
    twitter: { card: 'summary_large_image', title: seo.title, description: seo.description },
  };
}

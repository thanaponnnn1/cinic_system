import type { MetadataRoute } from 'next';
import { absoluteUrl, SITE_MODE } from '@/config';

/** โหมดเดโมปิดทั้งเว็บ (ข้อมูลร้านสมมติห้ามเข้า index) โหมดจริงเปิดทั้งเว็บและชี้ sitemap */
export default function robots(): MetadataRoute.Robots {
  if (SITE_MODE === 'demo') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}

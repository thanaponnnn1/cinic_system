import type { Metadata, Viewport } from 'next';
import { BRAND_INFO } from '@clinicq/shared';
import { PortalShell } from '@/components/customer/portal-shell';
import { SPLASH_SEEN_KEY } from '@/components/customer/splash-key';

export const metadata: Metadata = {
  title: `${BRAND_INFO.name} — จองคิวออนไลน์`,
  description: `จองคิว ดูนัด และดูคอร์สคงเหลือของ ${BRAND_INFO.name}`,
  // หน้าแอปจองไม่ควรไปแย่งอันดับกับหน้าบริการของเว็บร้าน next.config.ts ใส่ X-Robots-Tag ซ้ำไว้อีกชั้น
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // สีแถบสถานะของมือถือให้ตรงกับพื้นครีม ไม่งั้นดึงหน้าเลยขอบบนแล้วเห็นแถบ navy ของ dashboard
  themeColor: '#FBF8F1',
  // ให้ env(safe-area-inset-*) มีค่าจริงบน iPhone แถบเมนูล่างจะได้ไม่จมใต้แถบโฮม
  viewportFit: 'cover',
};

/**
 * ซ่อน splash ก่อนวาดหน้าแรกถ้าเคยเห็นแล้วในรอบนี้ — ถ้ารอให้ React ตัดสินหลังโหลด
 * ลูกค้าที่กดรีเฟรชจะเห็นจอ navy กะพริบหนึ่งทีทุกครั้ง
 * ใส่เป็น <style> ใน head แทนการแก้ attribute ของ <html> ซึ่ง React จะเตือนว่าไม่ตรงกับตอน render
 */
const HIDE_SEEN_SPLASH = `try{if(sessionStorage.getItem(${JSON.stringify(SPLASH_SEEN_KEY)})){var s=document.createElement('style');s.textContent='.portal-splash{display:none}';document.head.appendChild(s)}}catch(e){}`;

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: HIDE_SEEN_SPLASH }} />
      <PortalShell>{children}</PortalShell>
    </>
  );
}

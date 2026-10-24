import type { ReactNode } from 'react';
import { Photo } from '@/components/photo';
import type { Image } from '@/content/schema';

/**
 * (2) กรอบรูปที่ขยายจนเกือบเต็มจอเมื่อเลื่อนเข้าส่วน "เกี่ยวกับเรา" (เดสก์ท็อป)
 *
 * ส่วนนี้สูง 240vh ข้างในติดจอ (sticky) แล้ว CSS scroll timeline ขยายกรอบจาก 0.42 ถึง 0.94 เท่า
 * ด้วย transform อย่างเดียว ทำงานบน compositor ไม่ต้องรอ JavaScript สุดทางหยุดที่ 0.94
 * รูปกว้าง 1472px บนจอ 1920 จึงขยายราว 1.23 เท่า ไม่เกินเกณฑ์ 1.3 มือถือเป็นแค่กรอบรูปที่ค่อย ๆ ปรากฏ
 * เบราว์เซอร์ที่ไม่รองรับ scroll timeline เห็นกรอบขนาดสุดท้ายพร้อมข้อความครบ
 */
export function ZoomStage({ image, children }: { image: Image; children: ReactNode }) {
  return (
    <section aria-labelledby="about-title" className="zoom-stage relative bg-navy-950 lg:h-[240vh]">
      <div className="relative lg:sticky lg:top-0 lg:h-screen lg:overflow-hidden">
        <div className="px-4 pt-4 sm:px-6 lg:absolute lg:inset-0 lg:p-0">
          <div className="zoom-frame grain relative aspect-[4/5] overflow-hidden rounded-[28px] sm:aspect-[16/10] lg:absolute lg:inset-0 lg:aspect-auto lg:rounded-[40px]">
            <Photo image={image} sizes="(min-width: 1024px) 98vw, 100vw" decorative />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/35 to-navy-950/10 lg:bg-gradient-to-r lg:from-navy-950/92 lg:via-navy-950/60 lg:to-navy-950/5" />
          </div>
        </div>
        <div className="zoom-copy relative px-4 pt-10 pb-20 sm:px-6 lg:absolute lg:inset-0 lg:flex lg:items-center lg:p-0">
          {children}
        </div>
      </div>
    </section>
  );
}

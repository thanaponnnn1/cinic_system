import type { ReactNode } from 'react';

/**
 * (6) แถบเลื่อนต่อเนื่อง CSS ล้วน: เนื้อหาซ้ำสองชุดแล้วเลื่อนไปครึ่งหนึ่งวนซ้ำ ชุดที่สองซ่อนจาก screen reader
 * หยุดเมื่อเอาเมาส์ชี้ เครื่องที่ตั้งลดการเคลื่อนไหวได้แถบนิ่งที่เลื่อนด้วยมือได้
 */
export function Marquee({ children, reverse }: { children: ReactNode; reverse?: boolean }) {
  return (
    <div className="marquee overflow-hidden">
      <div className="marquee-track" data-reverse={reverse ? '' : undefined}>
        <div className="flex shrink-0 gap-4 pr-4">{children}</div>
        <div aria-hidden className="flex shrink-0 gap-4 pr-4">
          {children}
        </div>
      </div>
    </div>
  );
}

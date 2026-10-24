'use client';

import { lazy, Suspense, useState, type MouseEvent, type ReactNode } from 'react';
import type { LightboxItem } from './lightbox-dialog';

const LightboxDialog = lazy(() => import('./lightbox-dialog'));

/**
 * (8) ตัวเสริมของแกลเลอรี: กดรูปแล้วเปิดดูเต็มจอ
 *
 * รูปทุกใบเป็น <a href="ไฟล์รูป" data-lightbox> ที่ server render ไว้ ปิด JavaScript ก็กดเปิดไฟล์รูปได้
 * ตัวนี้ดักการกด อ่านรายการรูปจาก data-* ของลิงก์ในกลุ่มเดียวกัน แล้วโหลดหน้าต่างดูรูป
 * (ใช้ motion) ตอนกดครั้งแรกเท่านั้น โค้ดส่วนนั้นจึงไม่อยู่ใน JavaScript ตอนโหลดหน้า
 */
export function Lightbox({ children, className }: { children: ReactNode; className?: string }) {
  const [open, setOpen] = useState<{ items: LightboxItem[]; index: number } | null>(null);

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-lightbox]');
    if (!link) return;
    event.preventDefault();
    const links = [...event.currentTarget.querySelectorAll<HTMLAnchorElement>('a[data-lightbox]')];
    const items = links.map((a) => ({
      src: a.getAttribute('href') ?? '',
      alt: a.dataset.alt ?? '',
      width: Number(a.dataset.width),
      height: Number(a.dataset.height),
      sourceWidth: Number(a.dataset.sourceWidth),
    }));
    setOpen({ items, index: links.indexOf(link) });
  }

  return (
    <div className={className} onClick={onClick}>
      {children}
      {open && (
        <Suspense fallback={null}>
          <LightboxDialog items={open.items} start={open.index} onClose={() => setOpen(null)} />
        </Suspense>
      )}
    </div>
  );
}

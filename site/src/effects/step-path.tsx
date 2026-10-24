'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * (5) ขั้นตอนบริการแบบ accordion: รูปข้าง ๆ เปลี่ยนตามขั้นที่เปิด และมีเส้นประวาดตามการเลื่อน
 *
 * accordion คือ <details name="..."> ของเบราว์เซอร์ (เปิดได้ทีละขั้นโดยไม่ต้องใช้ JavaScript)
 * ตัวนี้แค่ฟัง toggle แล้วตั้ง data-active ให้ CSS สลับรูปด้วย opacity
 * เส้นประวาดด้วย CSS scroll timeline (.path-cover) ปิด JavaScript ก็ยังเปิดอ่านทุกขั้นได้
 */
export function StepPath({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // toggle ไม่ bubble ต้องฟังแบบ capture
    const onToggle = (event: Event) => {
      const details = event.target as HTMLDetailsElement;
      if (details.open && details.dataset.step) el.dataset.active = details.dataset.step;
    };
    el.addEventListener('toggle', onToggle, true);
    return () => el.removeEventListener('toggle', onToggle, true);
  }, []);

  return (
    <div ref={root} data-active="0" className={`steps ${className ?? ''}`}>
      {children}
    </div>
  );
}

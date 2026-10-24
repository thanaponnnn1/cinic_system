'use client';

import { useRef, type PointerEvent, type ReactNode } from 'react';

/**
 * (3) ตัวเสริมของ bento: รูปในกล่องที่เมาส์ชี้ขยับสวนทางเมาส์เล็กน้อย
 *
 * ไม่ render อะไรเพิ่ม แค่ฟังเมาส์ที่กล่องลูก [data-parallax] แล้วตั้งตัวแปร --px --py (-0.5 ถึง 0.5)
 * CSS (.parallax-media) แปลงเป็น transform และทำให้นุ่มด้วย transition
 * หน้าจอสัมผัสและเครื่องที่ตั้งลดการเคลื่อนไหวไม่ทำอะไร เนื้อหาเป็น HTML จาก server ทั้งหมด
 */
export function PointerParallax({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const active = useRef<HTMLElement | null>(null);

  function reset() {
    active.current?.style.removeProperty('--px');
    active.current?.style.removeProperty('--py');
    active.current = null;
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse') return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tile = (event.target as Element).closest<HTMLElement>('[data-parallax]');
    if (tile !== active.current) reset();
    if (!tile) return;
    active.current = tile;
    const box = tile.getBoundingClientRect();
    tile.style.setProperty('--px', ((event.clientX - box.left) / box.width - 0.5).toFixed(3));
    tile.style.setProperty('--py', ((event.clientY - box.top) / box.height - 0.5).toFixed(3));
  }

  return (
    <div className={className} onPointerMove={onPointerMove} onPointerLeave={reset}>
      {children}
    </div>
  );
}

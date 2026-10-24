'use client';

import { useEffect, useRef, useState } from 'react';
import { useNearViewport } from './use-near-viewport';

/**
 * (12) กระจกลายร่องในส่วนชวนจอง ทางเลือกเสริม เดสก์ท็อปเท่านั้น CSS ล้วน ไม่ใช้ WebGL
 *
 * ใส่ชั้นกระจกเมื่อส่วนนี้เข้าใกล้จอ บนจอกว้าง 1024px ขึ้นไป เครื่องมี CPU 4 แกนขึ้นไป
 * ไม่ได้ตั้งลดการเคลื่อนไหวหรือประหยัดข้อมูล ชั้นกระจกนิ่ง ไม่มีแอนิเมชันต่อเนื่อง
 * blur แค่ 5px เพื่อไม่ให้หนักตอนเลื่อนหน้า ไม่ผ่านเงื่อนไขก็ไม่มีชั้นนี้เลย หน้ายังครบ
 */
export function FlutedGlass({ className = '' }: { className?: string }) {
  const anchor = useRef<HTMLDivElement>(null);
  const near = useNearViewport(anchor, '200px');
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    setAllowed(
      matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)').matches &&
        (navigator.hardwareConcurrency ?? 4) >= 4 &&
        !connection?.saveData,
    );
  }, []);

  return (
    <div ref={anchor} aria-hidden className={`pointer-events-none ${className}`}>
      {near && allowed && <div className="fluted-glass absolute inset-0" />}
    </div>
  );
}

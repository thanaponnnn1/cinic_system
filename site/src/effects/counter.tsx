'use client';

import { useEffect, useRef } from 'react';

const DURATION_MS = 1400;

const format = (n: number, decimals: number) => n.toFixed(decimals);

/**
 * (4) ตัวเลขนับขึ้นเมื่อเลื่อนถึง
 *
 * HTML จาก server มีตัวเลขจริงอยู่แล้ว (ปิด JavaScript ก็อ่านได้ Google ก็เห็น)
 * จะนับใหม่จาก 0 เฉพาะเมื่อตัวเลขยังอยู่นอกจอตอนโหลด และเครื่องไม่ได้ตั้งลดการเคลื่อนไหว
 * เขียนค่าลง textContent ตรง ๆ ทุกเฟรม ไม่ทำให้ React render ใหม่
 */
export function Counter({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < innerHeight) return;

    el.textContent = format(0, decimals);
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION_MS);
          el.textContent = format(value * (1 - (1 - t) ** 3), decimals);
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = format(value, decimals);
    };
  }, [value, decimals]);

  return (
    <span ref={ref} className="tabular-nums">
      {format(value, decimals)}
    </span>
  );
}

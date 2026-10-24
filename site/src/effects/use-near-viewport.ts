'use client';

import { useEffect, useState, type RefObject } from 'react';

/** true เมื่อ element เข้าใกล้จอในระยะ margin ครั้งแรก แล้วค้างเป็น true ใช้เลื่อนโหลดเอฟเฟกต์หนัก */
export function useNearViewport(ref: RefObject<Element | null>, margin = '400px'): boolean {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: margin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, margin, near]);

  return near;
}

'use client';

import { useEffect, useRef } from 'react';
import type { GlPreset } from './shaders';
import { fxTier, parseFxQuery } from './tier';

/**
 * พื้นหลัง shader แบบ WebGL ของ section สีเข้ม วางเป็นชั้นล่างสุดของ section ที่ตั้ง relative ไว้
 *
 * HTML จาก server มีแค่พื้นหลัง CSS (.gl-fallback-<preset>) และเกรน จึงสวยตั้งแต่เฟรมแรกและตอนปิด JavaScript
 * โค้ด GL อยู่ใน chunk แยก โหลดเมื่อหน้าว่างแล้ว และกรอบนี้เข้ามาใกล้จอในระยะหนึ่งจอ
 * canvas ค่อย ๆ ปรากฏหลังวาดเฟรมแรกเสร็จ (runtime ตั้ง data-gl) วาดไม่ได้ก็เห็นพื้นหลัง CSS ต่อไป
 * ซ่อนกรอบด้วย className (เช่น hidden md:block) แล้ว observer จะไม่เห็นมัน โค้ด GL จึงไม่ถูกโหลด
 */
export function GlBackdrop({
  preset,
  intensity = 1,
  className = '',
}: {
  preset: GlPreset;
  intensity?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tier = fxTier({
      search: location.search,
      reducedMotion,
      webgl: 'WebGLRenderingContext' in window,
      deviceMemory: nav.deviceMemory,
      hardwareConcurrency: nav.hardwareConcurrency,
      coarsePointer: matchMedia('(pointer: coarse)').matches,
      viewportWidth: innerWidth,
    });
    if (tier === 'off') return;

    let detach: (() => void) | undefined;
    let cancelled = false;
    let cancelIdle = () => {};
    const load = () => {
      import('./runtime').then(({ attach }) => {
        if (cancelled) return;
        detach = attach(el, {
          preset,
          intensity,
          tier,
          still: reducedMotion,
          forced: parseFxQuery(location.search) !== null,
        });
      });
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        // Safari ไม่มี requestIdleCallback
        if (typeof requestIdleCallback === 'function') {
          const handle = requestIdleCallback(load, { timeout: 2500 });
          cancelIdle = () => cancelIdleCallback(handle);
        } else {
          const handle = setTimeout(load, 1200);
          cancelIdle = () => clearTimeout(handle);
        }
      },
      { rootMargin: '100% 0px' },
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
      cancelIdle();
      detach?.();
    };
  }, [preset, intensity]);

  return (
    <div
      ref={ref}
      aria-hidden
      data-gl-preset={preset}
      className={`gl-backdrop grain pointer-events-none ${className}`}
    >
      <div className={`gl-fallback gl-fallback-${preset}`} />
    </div>
  );
}

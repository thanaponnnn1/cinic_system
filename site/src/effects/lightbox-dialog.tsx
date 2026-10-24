'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export type LightboxItem = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** ความกว้างต้นฉบับก่อนขยาย 2 เท่า */
  sourceWidth: number;
};

/**
 * หน้าต่างนี้แสดงรูปใหญ่ที่สุดในเว็บ จึงคุมเข้มกว่ากฎ 1.3 เท่าของไฟล์:
 * ไม่เกิน 1.4 เท่าของต้นฉบับก่อนขยาย (ต้นฉบับ 736px แสดงได้ราว 1030px) รูปที่ขยายมาจะไม่ดูเบลอบนจอใหญ่
 */
const MAX_SOURCE_SCALE = 1.4;

/**
 * หน้าต่างดูรูปเต็มจอ ใช้ <dialog> ของเบราว์เซอร์ (โฟกัสอยู่ข้างใน กด Esc ปิดได้เอง)
 * ปัดซ้ายขวาหรือกดลูกศรเพื่อเปลี่ยนรูป รูปเลื่อนเข้าออกด้วย motion ขยับแค่ transform กับ opacity
 */
export default function LightboxDialog({
  items,
  start,
  onClose,
}: {
  items: LightboxItem[];
  start: number;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const reduceMotion = useReducedMotion();
  const [{ index, direction }, setView] = useState({ index: start, direction: 0 });
  const item = items[index];

  const go = (step: number) =>
    setView((view) => ({
      index: (view.index + step + items.length) % items.length,
      direction: step,
    }));

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    el.showModal();
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = previous;
      if (el.open) el.close();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const distance = reduceMotion ? 0 : 80;

  return (
    <dialog
      ref={dialog}
      aria-label="ดูรูปเต็มจอ"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-navy-950/95 p-0 text-gold-100 backdrop:bg-transparent"
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 sm:p-12">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.figure
            key={item.src}
            custom={direction}
            initial={{ opacity: 0, x: direction * distance }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -distance }}
            transition={{ type: 'spring', stiffness: 260, damping: 32 }}
            drag={reduceMotion ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.35}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > 80) go(info.offset.x < 0 ? 1 : -1);
            }}
            className="pointer-events-auto flex max-h-full flex-col items-center"
          >
            <Image
              src={item.src}
              alt={item.alt}
              width={item.width}
              height={item.height}
              quality={85}
              sizes={`min(92vw, ${Math.round(Math.min(item.width, item.sourceWidth * MAX_SOURCE_SCALE))}px)`}
              draggable={false}
              className="h-auto max-h-[82dvh] w-auto rounded-xl object-contain select-none"
              style={{
                maxWidth: `min(92vw, ${Math.round(Math.min(item.width, item.sourceWidth * MAX_SOURCE_SCALE))}px)`,
              }}
            />
            <figcaption className="mt-4 max-w-2xl px-4 text-center text-sm text-gold-100/80">
              {item.alt} · {index + 1}/{items.length}
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="ปิด"
        className="absolute top-4 right-4 grid size-12 place-items-center rounded-full border border-gold-300/30 bg-navy-950/60 hover:border-gold-300"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="รูปก่อนหน้า"
            className="absolute top-1/2 left-4 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-gold-300/30 bg-navy-950/60 hover:border-gold-300 sm:grid"
          >
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="size-5 rotate-180"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M4 10h11M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="รูปถัดไป"
            className="absolute top-1/2 right-4 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-gold-300/30 bg-navy-950/60 hover:border-gold-300 sm:grid"
          >
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M4 10h11M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}
    </dialog>
  );
}

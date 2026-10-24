'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';

/**
 * พฤติกรรมของหน้าต่างซ้อนทุกแบบในหน้าลูกค้า: ล็อกการเลื่อนหน้าข้างหลัง ปิดด้วย Esc
 * และคืนโฟกัสให้ปุ่มที่เปิดมันเมื่อปิด คนที่ใช้คีย์บอร์ดจึงไม่หลงตำแหน่ง
 */
export function useModalBehaviour(
  open: boolean,
  onClose: () => void,
  panel: RefObject<HTMLElement | null>,
): void {
  // เก็บ onClose ล่าสุดไว้ใน ref ผู้เรียกจะส่งฟังก์ชันใหม่ทุก render ก็ได้ โดยโฟกัสไม่กระโดด
  const close = useRef(onClose);

  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const opener = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    // ไม่ล็อกแล้วปัดในแผ่นจะลากหน้าร้านข้างหลังเลื่อนตามไปด้วย
    root.style.overflow = 'hidden';
    panel.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      root.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [open, panel]);
}

/** ปัดลงเกินระยะนี้หรือเร็วเกินนี้ = ปิด — ใกล้เคียงกับแผ่นของ iOS ที่ลูกค้าคุ้นมือ */
export function shouldDismiss(offsetY: number, velocityY: number): boolean {
  return offsetY > 90 || velocityY > 600;
}

/**
 * แผ่นเลื่อนขึ้นจากขอบล่าง — ใช้แทน confirm/alert ของเบราว์เซอร์ทุกที่ในหน้าลูกค้า
 *
 * กล่องของเบราว์เซอร์ใน LINE แสดงชื่อโดเมนตัวโต ๆ และหน้าตาไม่เหมือนแอป ส่วนแผ่นนี้ปัดลงเพื่อปิดได้
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  useModalBehaviour(open, onClose, panel);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40">
          <motion.div
            className="absolute inset-0 bg-navy-950/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] max-w-[430px] overflow-y-auto rounded-t-3xl bg-ivory-50 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl outline-none"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (shouldDismiss(info.offset.y, info.velocity.y)) onClose();
            }}
          >
            <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-ivory-300" />
            <h2 id={titleId} className="mb-4 font-display text-xl text-navy-700">
              {title}
            </h2>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

'use client';

import { motion } from 'motion/react';
import { useState } from 'react';

const PHOTOS = [
  { src: '/demo/space-1.webp', alt: 'ล็อบบี้ของร้าน' },
  { src: '/demo/space-2.webp', alt: 'มุมพักรอ' },
  { src: '/demo/space-3.webp', alt: 'ห้องทรีตเมนต์' },
  { src: '/demo/space-4.webp', alt: 'มุมแต่งผม' },
  { src: '/demo/space-5.webp', alt: 'บรรยากาศในร้าน' },
];

/** มุมเอียงคงที่ต่อรูป — สุ่มทุกครั้งจะทำให้ตอน render บน server กับในเครื่องไม่ตรงกัน */
const TILT = [-3, 4, -5, 2, -2];

/** วาดแค่รูปบนสุดไม่กี่ใบ รูปที่จมอยู่ใต้กองมองไม่เห็นอยู่แล้ว ไม่ต้องให้เครื่องแบกไว้ */
const VISIBLE = 3;

/**
 * กองรูปบรรยากาศร้าน: แตะหรือปัดรูปบนสุดแล้วรูปเหวี่ยงออกไปเข้าท้ายกอง
 *
 * ทุกการขยับเป็น transform กับ opacity ล้วน — แต่ละรูปรู้แค่ลำดับของตัวเองในกอง แล้ว motion
 * พาไปที่ตำแหน่งของลำดับนั้น จึงไม่มีสถานะแอนิเมชันกระจายอยู่หลายที่
 */
export function PhotoStack() {
  const [order, setOrder] = useState(() => PHOTOS.map((_, index) => index));
  const [flung, setFlung] = useState<{ index: number; direction: 1 | -1 } | null>(null);

  function fling(direction: 1 | -1) {
    if (flung) return;
    setFlung({ index: order[0], direction });
  }

  function settle() {
    setOrder((current) => [...current.slice(1), current[0]]);
    setFlung(null);
  }

  return (
    <div className="px-5">
      <div className="relative mx-auto aspect-[4/5] w-full max-w-[300px]">
        {order
          .map((photoIndex, depth) => ({ photoIndex, depth }))
          .reverse()
          .map(({ photoIndex, depth }) => {
            const photo = PHOTOS[photoIndex];
            const isTop = depth === 0;
            const isFlung = flung?.index === photoIndex;
            const hidden = depth >= VISIBLE;

            return (
              <motion.button
                key={photo.src}
                type="button"
                aria-label={isTop ? `${photo.alt} — แตะเพื่อดูรูปถัดไป` : undefined}
                tabIndex={isTop ? 0 : -1}
                aria-hidden={!isTop}
                onClick={() => isTop && fling(1)}
                drag={isTop && !flung ? 'x' : false}
                dragSnapToOrigin
                onDragEnd={(_, info) => {
                  if (Math.abs(info.offset.x) > 70) fling(info.offset.x > 0 ? 1 : -1);
                }}
                initial={false}
                animate={
                  isFlung
                    ? { x: flung.direction * 340, rotate: flung.direction * 22, opacity: 0 }
                    : {
                        // ใบที่จมอยู่เยื้องซ้ายขวาสลับกันและเอียง ขอบรูปจึงโผล่พ้นใบบนให้เห็นว่าเป็นกอง
                        x: isTop ? 0 : (photoIndex % 2 === 0 ? -1 : 1) * depth * 12,
                        y: depth * 14,
                        rotate: isTop ? 0 : TILT[photoIndex] * 1.6,
                        scale: 1 - depth * 0.03,
                        opacity: hidden ? 0 : 1,
                      }
                }
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                onAnimationComplete={() => {
                  if (isFlung) settle();
                }}
                className="absolute inset-0 overflow-hidden rounded-3xl border-4 border-white bg-ivory-200 shadow-[0_10px_30px_-12px_rgb(20_33_50/0.35)] focus-visible:ring-2 focus-visible:ring-gold-600 focus-visible:outline-none"
              >
                {!hidden && (
                  <img
                    src={photo.src}
                    alt={isTop ? photo.alt : ''}
                    loading="lazy"
                    draggable={false}
                    className="size-full object-cover"
                  />
                )}
              </motion.button>
            );
          })}
      </div>
      <p className="mt-9 text-center text-sm text-navy-400">แตะหรือปัดรูปเพื่อดูรูปถัดไป</p>
    </div>
  );
}

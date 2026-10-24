'use client';

import { motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

/**
 * รีวิวตัวอย่างสำหรับเดโมเท่านั้น — ข้อความแต่งขึ้น ไม่ใช่รีวิวจากลูกค้าจริง
 * หน้าจอติดป้าย "ตัวอย่างเดโม" ไว้เสมอ ส่งมอบร้านจริงต้องเปลี่ยนเป็นรีวิวของร้านเอง
 */
const DEMO_REVIEWS = [
  {
    name: 'คุณมายด์',
    avatar: '/demo/review-1.webp',
    text: 'จองผ่าน LINE ตอนดึกได้เลย ไม่ต้องรอแอดมินตอบ พอถึงวันมีข้อความเตือนก่อนหนึ่งวันด้วย',
  },
  {
    name: 'คุณแพรว',
    avatar: '/demo/review-2.webp',
    text: 'เห็นเองว่าคอร์สเหลือกี่ครั้ง หมดอายุวันไหน ไม่ต้องทักไปถามร้านทุกรอบ',
  },
  {
    name: 'คุณจูน',
    avatar: null,
    text: 'เลือกช่างคนเดิมได้ เห็นเวลาว่างจริง กดจองเสร็จในไม่กี่แตะ',
  },
];

const ADVANCE_MS = 4_500;

/**
 * การ์ดรีวิวซ้อนกัน เลื่อนใบบนสุดไปท้ายกองเองทุกไม่กี่วินาที แตะเพื่อเลื่อนเองก็ได้
 *
 * เลื่อนเองเฉพาะตอนกองอยู่บนจอ และหยุดเมื่อเครื่องตั้งลดการเคลื่อนไหว — ข้อความที่เปลี่ยน
 * เองขณะกำลังอ่านคือปัญหาของคนอ่านช้า ส่วนการแตะยังใช้ได้เหมือนเดิม
 */
export function ReviewDeck() {
  const deck = useRef<HTMLDivElement>(null);
  const inView = useInView(deck, { amount: 0.6 });
  const reduceMotion = useReducedMotion();
  const [front, setFront] = useState(0);

  useEffect(() => {
    if (!inView || reduceMotion) return;
    const timer = setInterval(() => setFront((i) => (i + 1) % DEMO_REVIEWS.length), ADVANCE_MS);
    return () => clearInterval(timer);
  }, [inView, reduceMotion, front]);

  return (
    <div className="px-5">
      <div
        ref={deck}
        className="grid cursor-pointer pb-6"
        onClick={() => setFront((i) => (i + 1) % DEMO_REVIEWS.length)}
        role="button"
        tabIndex={0}
        aria-label="รีวิวถัดไป"
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setFront((i) => (i + 1) % DEMO_REVIEWS.length);
          }
        }}
      >
        {DEMO_REVIEWS.map((review, index) => {
          const depth = (index - front + DEMO_REVIEWS.length) % DEMO_REVIEWS.length;

          return (
            <motion.figure
              key={review.name}
              aria-hidden={depth !== 0}
              initial={false}
              animate={{ y: depth * 14, scale: 1 - depth * 0.05, opacity: 1 - depth * 0.3 }}
              transition={{ type: 'spring', stiffness: 240, damping: 30 }}
              style={{
                zIndex: DEMO_REVIEWS.length - depth,
                transformOrigin: 'top center',
                gridArea: '1 / 1',
              }}
              className="rounded-3xl border border-ivory-200 bg-white p-5 shadow-[0_8px_24px_-14px_rgb(20_33_50/0.35)]"
            >
              <div className="mb-3 flex items-center gap-3">
                {review.avatar ? (
                  <img
                    src={review.avatar}
                    alt=""
                    loading="lazy"
                    className="size-10 rounded-full object-cover ring-1 ring-gold-500/60"
                  />
                ) : (
                  <span className="grid size-10 place-items-center rounded-full bg-ivory-200 text-sm font-medium text-navy-700 ring-1 ring-gold-500/60">
                    {review.name.replace('คุณ', '').slice(0, 1)}
                  </span>
                )}
                <figcaption className="text-[15px] font-medium text-navy-700">
                  {review.name}
                </figcaption>
                <span aria-label="5 ดาว" className="ml-auto text-sm tracking-widest text-gold-600">
                  ★★★★★
                </span>
              </div>
              <blockquote className="text-[15px] leading-relaxed text-navy-700">
                {review.text}
              </blockquote>
            </motion.figure>
          );
        })}
      </div>
    </div>
  );
}

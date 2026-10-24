'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { SPLASH_SEEN_KEY } from './splash-key';

/** คำในบรรทัดใต้โลโก้ แยกเป็นคำไว้เผยทีละคำ — ภาษาไทยไม่เว้นวรรคระหว่างคำ จึงตัดเองไม่ได้ */
const TAGLINE = ['จองคิว', 'ดูนัด', 'ดูคอร์ส', 'ใน LINE'];

/** จังหวะทั้งหมดรวมไม่เกิน 1.2 วินาที — นานกว่านี้ลูกค้าที่รีบจองจะรู้สึกว่าโดนขวาง */
const SPLIT_AT = 0.78;
const SPLIT_DURATION = 0.38;

/**
 * หน้าเปิดแอป: โลโก้ทองบนพื้น navy คำใต้โลโก้เผยทีละคำ แล้วแยกบนล่างเผยหน้าร้าน
 *
 * เล่นครั้งเดียวต่อการเปิดหนึ่งรอบ (sessionStorage) แตะเพื่อข้ามได้ และไม่เล่นเลยเมื่อเครื่อง
 * ตั้งลดการเคลื่อนไหวไว้ — หน้านี้ไม่มีเนื้อหาอะไรที่ลูกค้าจะพลาด
 * ขยับแค่ transform กับ opacity เพื่อให้ลื่นใน LINE บน Android รุ่นล่าง
 */
export function Splash() {
  const reduceMotion = useReducedMotion();
  const [done, setDone] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SPLASH_SEEN_KEY) !== null;
      sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
    } catch {
      // โหมดส่วนตัวบางเบราว์เซอร์ห้ามใช้ storage — เล่น splash ทุกครั้งดีกว่าพังทั้งหน้า
    }
    if (seen || reduceMotion) setDone(true);
  }, [reduceMotion]);

  if (done) return null;

  const ease = [0.7, 0, 0.2, 1] as const;

  return (
    <div
      className="portal-splash fixed inset-0 z-50 cursor-pointer"
      onClick={() => setDone(true)}
      aria-hidden
    >
      <motion.div
        className="absolute inset-x-0 top-0 h-1/2 bg-navy-700"
        initial={{ y: 0 }}
        animate={{ y: '-100%' }}
        transition={{ delay: SPLIT_AT, duration: SPLIT_DURATION, ease }}
      />
      <motion.div
        className="absolute inset-x-0 bottom-0 h-1/2 bg-navy-700"
        initial={{ y: 0 }}
        animate={{ y: '100%' }}
        transition={{ delay: SPLIT_AT, duration: SPLIT_DURATION, ease }}
        onAnimationComplete={() => setDone(true)}
      />

      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: SPLIT_AT - 0.06, duration: 0.16 }}
      >
        <motion.img
          src="/brand/logo.jpg"
          alt=""
          width={1408}
          height={768}
          className="w-[min(78vw,340px)] [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_72%)]"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
        <p className="mt-1 flex gap-2 text-sm tracking-wide text-gold-200">
          {TAGLINE.map((word, index) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 + index * 0.1, duration: 0.24 }}
            >
              {word}
            </motion.span>
          ))}
        </p>
      </motion.div>
    </div>
  );
}

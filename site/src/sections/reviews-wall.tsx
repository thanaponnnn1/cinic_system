'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { ReviewCard, type CardReview } from '@/components/review-card';

type WallReview = CardReview & { serviceSlug: string };

/**
 * กำแพงรีวิวแบบ masonry กรองตามบริการและคะแนน
 * HTML จาก server มีรีวิวครบทุกชิ้น (ตัวกรองเริ่มที่ "ทั้งหมด") ปิด JavaScript ก็อ่านได้ครบ
 * ตอนกรอง การ์ดที่เหลือเลื่อนเข้าที่ด้วย motion layout ขยับแค่ transform กับ opacity
 */
export function ReviewsWall({
  reviews,
  services,
}: {
  reviews: WallReview[];
  services: { slug: string; name: string }[];
}) {
  const reduceMotion = useReducedMotion();
  const [service, setService] = useState<string>('all');
  const [minRating, setMinRating] = useState(0);
  const shown = reviews.filter(
    (review) => (service === 'all' || review.serviceSlug === service) && review.rating >= minRating,
  );

  return (
    <div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <div
          role="group"
          aria-label="กรองตามบริการ"
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0"
        >
          {[{ slug: 'all', name: 'ทั้งหมด' }, ...services].map((option) => (
            <button
              key={option.slug}
              type="button"
              aria-pressed={service === option.slug}
              onClick={() => setService(option.slug)}
              className="shrink-0 rounded-full border border-navy-700/20 px-4 py-2 text-sm text-navy-700 transition-colors hover:border-navy-700 aria-pressed:border-navy-800 aria-pressed:bg-navy-800 aria-pressed:text-gold-100"
            >
              {option.name}
            </button>
          ))}
        </div>
        <label className="flex shrink-0 items-center gap-3 text-sm text-navy-700">
          คะแนน
          <select
            value={minRating}
            onChange={(event) => setMinRating(Number(event.target.value))}
            className="rounded-full border border-navy-700/20 bg-white px-4 py-2"
          >
            <option value={0}>ทุกคะแนน</option>
            <option value={5}>5 ดาวเท่านั้น</option>
            <option value={4}>4 ดาวขึ้นไป</option>
          </select>
        </label>
      </div>

      <p className="text-ink-600 mt-6 text-sm" aria-live="polite">
        แสดง {shown.length} จาก {reviews.length} รีวิว
      </p>

      <ul className="mt-6 columns-1 gap-6 md:columns-2 xl:columns-3">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((review) => (
            <motion.li
              key={review.id}
              layout={reduceMotion ? false : 'position'}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
              className="mb-6 break-inside-avoid"
            >
              <ReviewCard review={review} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

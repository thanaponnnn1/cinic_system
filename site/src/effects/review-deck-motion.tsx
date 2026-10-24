'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { ReviewCard, type CardReview } from '@/components/review-card';
import { deckPose } from './deck-pose';
import { DeckHint } from './review-deck';

const FLING_PX = 90;

/**
 * กองการ์ดที่ปัดได้: ลากใบบนสุดเกินระยะแล้วปล่อย การ์ดเหวี่ยงออกแล้วไปต่อท้ายกอง
 * การ์ดแต่ละใบรู้แค่ลำดับของตัวเองในกอง motion พาไปที่ท่าของลำดับนั้น (deckPose)
 * ขยับแค่ transform กับ opacity
 */
export default function ReviewDeckMotion({ reviews }: { reviews: CardReview[] }) {
  const reduceMotion = useReducedMotion();
  const [order, setOrder] = useState(() => reviews.map((_, index) => index));
  const [flung, setFlung] = useState<{ id: string; direction: 1 | -1 } | null>(null);

  function fling(direction: 1 | -1) {
    if (flung) return;
    if (reduceMotion) {
      setOrder((current) => [...current.slice(1), current[0]]);
      return;
    }
    setFlung({ id: reviews[order[0]].id, direction });
  }

  function settle() {
    setOrder((current) => [...current.slice(1), current[0]]);
    setFlung(null);
  }

  return (
    <div>
      <div className="grid pb-12" aria-live="polite">
        {order.map((reviewIndex, depth) => {
          const review = reviews[reviewIndex];
          const isTop = depth === 0;
          const isFlung = flung?.id === review.id;
          const pose = deckPose(depth);
          return (
            <motion.div
              key={review.id}
              aria-hidden={!isTop}
              initial={false}
              animate={
                isFlung
                  ? {
                      x: flung.direction * 520,
                      rotate: flung.direction * 14,
                      opacity: 0,
                      y: 0,
                      scale: 1,
                    }
                  : { x: 0, rotate: 0, ...pose }
              }
              transition={{ type: 'spring', stiffness: 240, damping: 30 }}
              drag={isTop && !flung && !reduceMotion ? 'x' : false}
              dragSnapToOrigin
              dragElastic={0.6}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > FLING_PX) fling(info.offset.x > 0 ? 1 : -1);
              }}
              onAnimationComplete={() => {
                if (isFlung) settle();
              }}
              style={{
                gridArea: '1 / 1',
                zIndex: reviews.length - depth,
                transformOrigin: 'top center',
                touchAction: 'pan-y',
              }}
              className={isTop ? 'cursor-grab active:cursor-grabbing' : undefined}
            >
              <ReviewCard review={review} className="min-h-[300px] select-none" />
            </motion.div>
          );
        })}
      </div>
      <DeckHint onNext={() => fling(1)} />
    </div>
  );
}

'use client';

import { lazy, startTransition, Suspense, useEffect, useRef, useState } from 'react';
import { ReviewCard, type CardReview } from '@/components/review-card';
import { deckPose } from './deck-pose';
import { useNearViewport } from './use-near-viewport';

const loadMotionDeck = () => import('./review-deck-motion');
const MotionDeck = lazy(loadMotionDeck);

/**
 * (6) กองการ์ดรีวิวที่ปัดทิ้งได้
 *
 * ตอนโหลดหน้าเป็นกองนิ่ง (HTML + CSS) ข้อความรีวิวใบบนอยู่ในหน้าตั้งแต่แรก
 * เมื่อกองเข้าใกล้จอจึงโหลดเวอร์ชันที่ปัดได้ (motion drag) มาแทน โค้ด motion จึงไม่อยู่ใน JavaScript ตอนเปิดหน้า
 * เริ่มโหลดล่วงหน้าราวหนึ่งจอ แล้วสลับด้วย startTransition ให้ React แบ่งงาน render ไม่ขวางการเลื่อน
 * (วัดด้วย CPU ช้าลง 4 เท่า: สลับทันทีแบบเดิมทำให้มีเฟรมยาว 200ms กลางการเลื่อน)
 */
export function ReviewDeck({ reviews }: { reviews: CardReview[] }) {
  const root = useRef<HTMLDivElement>(null);
  const near = useNearViewport(root, '1200px');
  const [ready, setReady] = useState(false);
  const fallback = <StaticDeck reviews={reviews} />;

  useEffect(() => {
    if (!near) return;
    let alive = true;
    loadMotionDeck().then(() => {
      if (alive) startTransition(() => setReady(true));
    });
    return () => {
      alive = false;
    };
  }, [near]);

  return (
    <div ref={root}>
      {ready ? (
        <Suspense fallback={fallback}>
          <MotionDeck reviews={reviews} />
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
}

function StaticDeck({ reviews }: { reviews: CardReview[] }) {
  return (
    <div>
      <div className="grid pb-12">
        {reviews.map((review, depth) => {
          const pose = deckPose(depth);
          return (
            <div
              key={review.id}
              aria-hidden={depth !== 0}
              style={{
                gridArea: '1 / 1',
                zIndex: reviews.length - depth,
                transformOrigin: 'top center',
                transform: `translateY(${pose.y}px) scale(${pose.scale})`,
                opacity: pose.opacity,
              }}
            >
              <ReviewCard review={review} className="min-h-[300px]" />
            </div>
          );
        })}
      </div>
      <DeckHint />
    </div>
  );
}

export function DeckHint({ onNext }: { onNext?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm text-gold-100/70">
      <span>ปัดการ์ดหรือกดถัดไปเพื่ออ่านรีวิวอื่น</span>
      <button
        type="button"
        onClick={onNext}
        disabled={!onNext}
        className="rounded-full border border-gold-300/40 px-5 py-2 text-gold-100 transition-colors hover:border-gold-300 disabled:opacity-60"
      >
        ถัดไป
      </button>
    </div>
  );
}
